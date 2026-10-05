package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type themeSegmentPlaybackSnapshot struct {
	SegmentID             int64
	StartTime             *string
	EndTime               *string
	SourceJellyfinItemID  *string
	SourceType            *string
	SourceRef             *string
	SourceLabel           *string
	PlaybackVariantID     *int64
	PlaybackDuration      *int32
	ResolvedMediaAssetID  *int64
	ResolvedJellyfinItem  *string
	ResolvedPlaybackKind  *string
	ResolvedPlaybackLabel *string
}

func parseSegmentClockSeconds(raw *string) *int32 {
	trimmed := strings.TrimSpace(derefString(raw))
	if trimmed == "" {
		return nil
	}
	parts := strings.Split(trimmed, ":")
	if len(parts) == 0 || len(parts) > 3 {
		return nil
	}

	total := 0
	multiplier := 1
	for i := len(parts) - 1; i >= 0; i-- {
		part := strings.TrimSpace(parts[i])
		if part == "" {
			return nil
		}
		value, err := strconv.Atoi(part)
		if err != nil || value < 0 {
			return nil
		}
		total += value * multiplier
		multiplier *= 60
	}

	seconds := int32(total)
	return &seconds
}

func (r *AdminContentRepository) hydrateSegmentPlaybackMetadataList(ctx context.Context, segments []models.AdminThemeSegment, currentReleaseVersionID int64) error {
	for i := range segments {
		if err := r.hydrateSegmentPlaybackMetadata(ctx, &segments[i], currentReleaseVersionID); err != nil {
			return err
		}
	}
	return nil
}

// hydrateSegmentPlaybackMetadata befuellt die Top-Level-Playback*-Felder eines Segments aus
// theme_segment_playback_sources. Seit Phase 117 (D-03) kann ein geteiltes Segment mehrere
// solcher Zeilen haben (eine je zugewiesener Release-Version) -- "irgendeine Zeile" ist damit
// mehrdeutig. currentReleaseVersionID > 0 waehlt deterministisch genau die Zeile der aktuell im
// Editor geoeffneten Release-Version (Plan 117-04, RESEARCH.md Risk 1-Folgefix); 0 (kein
// bekannter Editor-Kontext) behaelt das bisherige Fallback-Verhalten bei (repraesentative Zeile
// mit der kleinsten release_version_id). Fuer die vollstaendige, release_version_id-scoped
// Auflösung ausserhalb der Editor-Hydration siehe GetThemeSegmentRenderSource
// (theme_segment_render_cache.go).
func (r *AdminContentRepository) hydrateSegmentPlaybackMetadata(ctx context.Context, seg *models.AdminThemeSegment, currentReleaseVersionID int64) error {
	if seg == nil || seg.ID <= 0 {
		return nil
	}

	ok, err := r.segmentPlaybackSourcesTableAvailable(ctx)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	query := `
		SELECT
			id,
			source_kind,
			release_variant_id,
			jellyfin_item_id,
			media_asset_id,
			source_label,
			start_offset_seconds,
			end_offset_seconds,
			duration_seconds
		FROM theme_segment_playback_sources
		WHERE theme_segment_id = $1`
	args := []interface{}{seg.ID}
	if currentReleaseVersionID > 0 {
		query += " AND release_version_id = $2 ORDER BY id ASC LIMIT 1"
		args = append(args, currentReleaseVersionID)
	} else {
		query += " ORDER BY release_version_id ASC NULLS LAST, id ASC LIMIT 1"
	}

	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&seg.PlaybackSourceID,
		&seg.PlaybackSourceKind,
		&seg.PlaybackVariantID,
		&seg.PlaybackJellyfinID,
		&seg.PlaybackMediaAssetID,
		&seg.PlaybackSourceLabel,
		&seg.PlaybackStartSeconds,
		&seg.PlaybackEndSeconds,
		&seg.PlaybackDuration,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("hydrate segment playback metadata segment=%d: %w", seg.ID, err)
	}

	if ok, err := r.hasTable(ctx, "theme_segment_render_cache"); err != nil {
		return err
	} else if ok {
		var status string
		// Render-Caches sind pro Release-Version: ohne diesen Filter zeigt der Editor den Status
		// einer fremden Release-Version (z. B. "bereit" von Folge 3 auf Folge 2).
		releaseVersionFilter := ""
		renderArgs := []interface{}{seg.ID}
		if currentReleaseVersionID > 0 {
			releaseVersionFilter = " AND release_version_id = $2"
			renderArgs = append(renderArgs, currentReleaseVersionID)
		}
		if err := r.db.QueryRow(ctx, `
			SELECT
				id,
				cache_key,
				status,
				error_message,
				duration_seconds,
				completed_at
			FROM theme_segment_render_cache
			WHERE theme_segment_id = $1
			  AND invalidated_at IS NULL`+releaseVersionFilter+`
			ORDER BY
				CASE status
					WHEN 'ready' THEN 0
					WHEN 'rendering' THEN 1
					WHEN 'queued' THEN 2
					WHEN 'failed' THEN 3
					WHEN 'stale' THEN 4
					ELSE 5
				END,
				updated_at DESC,
				id DESC
			LIMIT 1
		`, renderArgs...).Scan(
			&seg.RenderCacheID,
			&seg.RenderCacheKey,
			&status,
			&seg.RenderErrorMessage,
			&seg.RenderDuration,
			&seg.RenderCompletedAt,
		); err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("hydrate segment render metadata segment=%d: %w", seg.ID, err)
		} else if status != "" {
			seg.RenderStatus = &status
			seg.CanRetryRender = status == "failed" || status == "stale"
		}
	}

	return nil
}

func (r *AdminContentRepository) segmentPlaybackSourcesTableAvailable(ctx context.Context) (bool, error) {
	return r.hasTable(ctx, "theme_segment_playback_sources")
}

func (r *AdminContentRepository) hasTable(ctx context.Context, tableName string) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = $1
		)
	`, tableName).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect table %s: %w", tableName, err)
	}
	return exists, nil
}

// syncThemeSegmentPlaybackSourceTx synchronisiert theme_segment_playback_sources fuer
// ALLE aktuell zugewiesenen Release-Versionen eines Segments (Phase 117, D-03) --
// eine Zeile je (theme_segment_id, release_version_id) statt der frueheren einen
// globalen Zeile pro Segment. Fuer jede Zuweisung wird der bestehende
// Entscheidungsbaum (siehe syncThemeSegmentPlaybackSourceForReleaseVersionTx) gegen
// den per Release-Version geladenen Snapshot ausgefuehrt. Existiert keine Zuweisung
// mehr, werden verwaiste Zeilen geloescht (identisch zum fruehren sourceKind==nil-
// Fallback-Verhalten).
func (r *AdminContentRepository) syncThemeSegmentPlaybackSourceTx(ctx context.Context, tx pgx.Tx, segmentID int64) error {
	ok, err := hasTableTx(ctx, tx, "theme_segment_playback_sources")
	if err != nil {
		return fmt.Errorf("detect theme segment playback source table: %w", err)
	}
	if !ok {
		return nil
	}

	rows, err := tx.Query(ctx, `
		SELECT release_version_id
		FROM theme_segment_assignments
		WHERE theme_segment_id = $1
		ORDER BY release_version_id ASC
	`, segmentID)
	if err != nil {
		return fmt.Errorf("list theme segment assignments tx segment=%d: %w", segmentID, err)
	}
	releaseVersionIDs := make([]int64, 0)
	for rows.Next() {
		var releaseVersionID int64
		if err := rows.Scan(&releaseVersionID); err != nil {
			rows.Close()
			return fmt.Errorf("scan theme segment assignment tx segment=%d: %w", segmentID, err)
		}
		releaseVersionIDs = append(releaseVersionIDs, releaseVersionID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate theme segment assignments tx segment=%d: %w", segmentID, err)
	}
	rows.Close()

	if len(releaseVersionIDs) == 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM theme_segment_playback_sources WHERE theme_segment_id = $1`, segmentID); err != nil {
			return fmt.Errorf("delete orphaned theme segment playback sources segment=%d: %w", segmentID, err)
		}
		return nil
	}

	keptReleaseVersionIDs := make([]int64, 0, len(releaseVersionIDs))
	for _, releaseVersionID := range releaseVersionIDs {
		kept, err := r.syncThemeSegmentPlaybackSourceForReleaseVersionTx(ctx, tx, segmentID, releaseVersionID)
		if err != nil {
			return err
		}
		if kept {
			keptReleaseVersionIDs = append(keptReleaseVersionIDs, releaseVersionID)
		}
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM theme_segment_playback_sources
		WHERE theme_segment_id = $1
		  AND NOT (release_version_id = ANY($2))
	`, segmentID, keptReleaseVersionIDs); err != nil {
		return fmt.Errorf("delete stale theme segment playback sources segment=%d: %w", segmentID, err)
	}

	return nil
}

// syncThemeSegmentPlaybackSourceForReleaseVersionTx fuehrt den Entscheidungsbaum
// (unveraendert gegenueber der frueheren, ausschliesslich globalen Fassung) fuer
// GENAU eine Zuweisung (segmentID, releaseVersionID) aus und schreibt bei einem
// aufgeloesten sourceKind eine composite-ON-CONFLICT-Upsert-Zeile. Rueckgabe
// kept=false bedeutet: fuer diese Release-Version konnte keine Playback-Quelle
// aufgeloest werden -- die Zeile wird vom Aufrufer (syncThemeSegmentPlaybackSourceTx)
// per abschliessendem DELETE ... NOT ANY(...) aufgeraeumt.
func (r *AdminContentRepository) syncThemeSegmentPlaybackSourceForReleaseVersionTx(ctx context.Context, tx pgx.Tx, segmentID int64, releaseVersionID int64) (bool, error) {
	snapshot, err := loadThemeSegmentPlaybackSnapshotTx(ctx, tx, segmentID, releaseVersionID)
	if err != nil {
		return false, err
	}
	if snapshot == nil {
		return false, ErrNotFound
	}

	startSeconds := parseSegmentClockSeconds(snapshot.StartTime)
	endSeconds := parseSegmentClockSeconds(snapshot.EndTime)
	trimmedType := strings.TrimSpace(derefString(snapshot.SourceType))
	trimmedRef := strings.TrimSpace(derefString(snapshot.SourceRef))
	trimmedLabel := strings.TrimSpace(derefString(snapshot.SourceLabel))

	var (
		sourceKind     *string
		releaseVarID   *int64
		jellyfinItemID *string
		mediaAssetID   *int64
		sourceLabel    *string
	)

	// Explicit precedence table for playback resolution (unveraendert gegenueber der
	// vormals globalen Fassung, jetzt pro Release-Version ausgefuehrt):
	//
	// 1. release_asset source type with a concrete source_ref -> uploaded_asset
	//    (operator explicitly selected an uploaded file as fallback/primary)
	// 2. current release variant with a Jellyfin-backed stream resolved -> episode_version
	//    (default: play the segment from the episode-version stream)
	// 3. explicit jellyfin_theme with a valid item ID -> jellyfin_theme
	//    (legacy/explicit Jellyfin theme selection)
	// 4. uploaded asset discoverable via source_ref (no explicit variant) -> uploaded_asset
	//    (fallback when no episode-version stream is available)
	// 5. none -> keep no row for this release version

	switch {
	case trimmedType == themeSegmentSourceTypeReleaseAsset && trimmedRef != "":
		// Explicit operator choice: use the uploaded file as active playback source.
		if snapshot.ResolvedMediaAssetID != nil && *snapshot.ResolvedMediaAssetID > 0 {
			value := themeSegmentPlaybackUploadedAsset
			sourceKind = &value
			mediaAssetID = snapshot.ResolvedMediaAssetID
		}
		// If the media_asset record is not found yet (e.g. upload in progress),
		// fall through to episode_version if available.
		if sourceKind == nil && snapshot.PlaybackVariantID != nil && *snapshot.PlaybackVariantID > 0 {
			value := themeSegmentPlaybackEpisodeVersion
			sourceKind = &value
			releaseVarID = snapshot.PlaybackVariantID
		}

	case snapshot.PlaybackVariantID != nil && *snapshot.PlaybackVariantID > 0:
		// Default path: episode-version stream (Jellyfin runtime).
		value := themeSegmentPlaybackEpisodeVersion
		sourceKind = &value
		releaseVarID = snapshot.PlaybackVariantID

	case trimmedType == themeSegmentSourceTypeJellyfin:
		// Legacy explicit Jellyfin-theme selection.
		var item string
		if trimmedRef != "" {
			item = trimmedRef
		} else if raw := strings.TrimSpace(derefString(snapshot.SourceJellyfinItemID)); raw != "" {
			if strings.HasPrefix(raw, themeSegmentSourceTypeJellyfin+":") {
				item = strings.TrimSpace(strings.TrimPrefix(raw, themeSegmentSourceTypeJellyfin+":"))
			} else {
				item = raw
			}
		}
		if item != "" {
			value := themeSegmentPlaybackJellyfinTheme
			sourceKind = &value
			jellyfinItemID = &item
		}

	case snapshot.ResolvedMediaAssetID != nil && *snapshot.ResolvedMediaAssetID > 0:
		// Fallback: uploaded asset reachable via source_ref, no episode-version stream.
		value := themeSegmentPlaybackUploadedAsset
		sourceKind = &value
		mediaAssetID = snapshot.ResolvedMediaAssetID
	}

	if trimmedLabel != "" {
		sourceLabel = &trimmedLabel
	} else if snapshot.ResolvedPlaybackLabel != nil && strings.TrimSpace(derefString(snapshot.ResolvedPlaybackLabel)) != "" {
		label := strings.TrimSpace(*snapshot.ResolvedPlaybackLabel)
		sourceLabel = &label
	}

	if sourceKind == nil {
		return false, nil
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO theme_segment_playback_sources (
			theme_segment_id,
			release_version_id,
			source_kind,
			release_variant_id,
			jellyfin_item_id,
			media_asset_id,
			source_label,
			start_offset_seconds,
			end_offset_seconds,
			duration_seconds,
			is_primary,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, NULLIF($7, ''), $8, $9, $10, TRUE, NOW(), NOW())
		ON CONFLICT (theme_segment_id, release_version_id)
		DO UPDATE SET
			source_kind = EXCLUDED.source_kind,
			release_variant_id = EXCLUDED.release_variant_id,
			jellyfin_item_id = EXCLUDED.jellyfin_item_id,
			media_asset_id = EXCLUDED.media_asset_id,
			source_label = EXCLUDED.source_label,
			start_offset_seconds = EXCLUDED.start_offset_seconds,
			end_offset_seconds = EXCLUDED.end_offset_seconds,
			duration_seconds = EXCLUDED.duration_seconds,
			is_primary = TRUE,
			updated_at = NOW()
	`, segmentID, releaseVersionID, *sourceKind, releaseVarID, jellyfinItemID, mediaAssetID, sourceLabel, startSeconds, endSeconds, snapshot.PlaybackDuration)
	if err != nil {
		return false, fmt.Errorf("upsert theme segment playback source segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}

	return true, nil
}

// loadThemeSegmentPlaybackSnapshotTx laedt den Snapshot fuer GENAU eine Zuweisung
// (segmentID, releaseVersionID). Die Playback-Variante wird ueber
// resolveThemeSegmentReleaseVariantTx (theme_segment_playback_resolution.go,
// Nyquist-Fix W-mod) direkt anhand der bekannten release_version_id aufgeloest --
// keine Suche mehr ueber fansub_group_id/version quer ueber alle Episoden (RESEARCH.md
// Risk 3). Die effektive Zeit bevorzugt einen vorhandenen Per-Version-Override
// (theme_segment_episode_overrides) vor der Segment-Basis-Zeit (D-01).
func loadThemeSegmentPlaybackSnapshotTx(ctx context.Context, tx pgx.Tx, segmentID int64, releaseVersionID int64) (*themeSegmentPlaybackSnapshot, error) {
	resolved, err := resolveThemeSegmentReleaseVariantTx(ctx, tx, segmentID, releaseVersionID)
	if err != nil {
		return nil, err
	}

	var snapshot themeSegmentPlaybackSnapshot
	if err := tx.QueryRow(ctx, `
		SELECT
			ts.id,
			COALESCE(ov.start_time, ts.start_time)::text,
			COALESCE(ov.end_time, ts.end_time)::text,
			ts.source_jellyfin_item_id,
			ts.source_type,
			ts.source_ref,
			ts.source_label,
			(
				SELECT ma.id
				FROM media_assets ma
				WHERE NULLIF(BTRIM(ts.source_ref), '') IS NOT NULL
				  AND (
					ma.file_path = ts.source_ref OR
					ma.file_path = CONCAT('/', ts.source_ref)
				  )
				ORDER BY ma.id DESC
				LIMIT 1
			) AS resolved_media_asset_id
		FROM theme_segments ts
		LEFT JOIN theme_segment_episode_overrides ov
			ON ov.theme_segment_id = ts.id AND ov.release_version_id = $2
		WHERE ts.id = $1
	`, segmentID, releaseVersionID).Scan(
		&snapshot.SegmentID,
		&snapshot.StartTime,
		&snapshot.EndTime,
		&snapshot.SourceJellyfinItemID,
		&snapshot.SourceType,
		&snapshot.SourceRef,
		&snapshot.SourceLabel,
		&snapshot.ResolvedMediaAssetID,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("load theme segment playback snapshot segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}

	if resolved != nil {
		variantID := resolved.ReleaseVariantID
		snapshot.PlaybackVariantID = &variantID
		snapshot.PlaybackDuration = resolved.DurationSeconds
		snapshot.ResolvedJellyfinItem = resolved.JellyfinExternalID
	}

	return &snapshot, nil
}

func (r *AdminContentRepository) loadStableSegmentAnimeSource(ctx context.Context, animeID int64) (*segmentStableAnimeSource, error) {
	rows, err := r.db.Query(ctx, `
		SELECT source
		FROM anime_source_links
		WHERE anime_id = $1
		ORDER BY CASE WHEN source LIKE 'anisearch:%' THEN 0 ELSE 1 END, source ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime source links anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan anime source link anime=%d: %w", animeID, err)
		}
		if source := parseStableSegmentAnimeSource(raw); source != nil {
			return source, nil
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime source links anime=%d: %w", animeID, err)
	}

	return nil, nil
}

func (r *AdminContentRepository) GetStableSegmentAnimeSource(ctx context.Context, animeID int64) (string, string, error) {
	source, err := r.loadStableSegmentAnimeSource(ctx, animeID)
	if err != nil {
		return "", "", err
	}
	if source == nil {
		return "", "", nil
	}
	return source.Provider, source.ExternalID, nil
}

func (r *AdminContentRepository) loadStableSegmentAnimeSourceTx(ctx context.Context, tx pgx.Tx, animeID int64) (*segmentStableAnimeSource, error) {
	rows, err := tx.Query(ctx, `
		SELECT source
		FROM anime_source_links
		WHERE anime_id = $1
		ORDER BY CASE WHEN source LIKE 'anisearch:%' THEN 0 ELSE 1 END, source ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime source links anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan anime source link anime=%d: %w", animeID, err)
		}
		if source := parseStableSegmentAnimeSource(raw); source != nil {
			return source, nil
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime source links anime=%d: %w", animeID, err)
	}

	return nil, nil
}
