package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	themeSegmentSourceTypeNone         = "none"
	themeSegmentSourceTypeJellyfin     = "jellyfin_theme"
	themeSegmentSourceTypeReleaseAsset = "release_asset"
	themeSegmentPlaybackEpisodeVersion = "episode_version"
	themeSegmentPlaybackJellyfinTheme  = "jellyfin_theme"
	themeSegmentPlaybackUploadedAsset  = "uploaded_asset"
)

func encodeThemeSegmentSource(sourceType, sourceRef, sourceLabel, legacy *string) *string {
	trimmedType := strings.TrimSpace(derefString(sourceType))
	trimmedRef := strings.TrimSpace(derefString(sourceRef))
	trimmedLabel := strings.TrimSpace(derefString(sourceLabel))
	trimmedLegacy := strings.TrimSpace(derefString(legacy))

	switch trimmedType {
	case "", themeSegmentSourceTypeNone:
		return nil
	case themeSegmentSourceTypeJellyfin:
		if trimmedRef != "" {
			value := themeSegmentSourceTypeJellyfin + ":" + trimmedRef
			return &value
		}
		if trimmedLegacy != "" {
			if strings.HasPrefix(trimmedLegacy, themeSegmentSourceTypeJellyfin+":") || !strings.Contains(trimmedLegacy, ":") {
				return legacy
			}
		}
		value := themeSegmentSourceTypeJellyfin
		if trimmedLabel != "" {
			value += ":" + trimmedLabel
		}
		return &value
	case themeSegmentSourceTypeReleaseAsset:
		value := themeSegmentSourceTypeReleaseAsset
		if trimmedRef != "" {
			value += ":" + trimmedRef
		} else if trimmedLabel != "" {
			value += ":" + trimmedLabel
		}
		return &value
	default:
		if trimmedLegacy == "" {
			return nil
		}
		return legacy
	}
}

func hydrateThemeSegmentSource(seg *models.AdminThemeSegment) {
	if seg == nil {
		return
	}
	raw := strings.TrimSpace(derefString(seg.SourceJellyfinItemID))
	if raw == "" {
		value := themeSegmentSourceTypeNone
		seg.SourceType = &value
		seg.SourceRef = nil
		seg.SourceLabel = nil
		return
	}
	if strings.HasPrefix(raw, themeSegmentSourceTypeReleaseAsset+":") {
		value := themeSegmentSourceTypeReleaseAsset
		ref := strings.TrimSpace(strings.TrimPrefix(raw, themeSegmentSourceTypeReleaseAsset+":"))
		seg.SourceType = &value
		if ref != "" {
			seg.SourceRef = &ref
			label := ref
			seg.SourceLabel = &label
		}
		return
	}
	if raw == themeSegmentSourceTypeReleaseAsset {
		value := themeSegmentSourceTypeReleaseAsset
		seg.SourceType = &value
		return
	}
	if strings.HasPrefix(raw, themeSegmentSourceTypeJellyfin+":") {
		value := themeSegmentSourceTypeJellyfin
		ref := strings.TrimSpace(strings.TrimPrefix(raw, themeSegmentSourceTypeJellyfin+":"))
		seg.SourceType = &value
		if ref != "" {
			seg.SourceRef = &ref
		}
		return
	}
	if raw == themeSegmentSourceTypeJellyfin {
		value := themeSegmentSourceTypeJellyfin
		seg.SourceType = &value
		return
	}
	value := themeSegmentSourceTypeJellyfin
	ref := raw
	seg.SourceType = &value
	seg.SourceRef = &ref
}

// ListAnimeSegments gibt alle Segmente eines Anime gefiltert nach group_id und version zurueck.
// groupID=0 und version="" bedeutet: kein Filter (alle Segmente des Anime). currentReleaseVersionID
// (Phase 117, D-03/Plan 117-04) steuert, welche theme_segment_playback_sources-Zeile eines geteilten
// Segments in die Top-Level-Playback*-Felder hydriert wird -- 0 bedeutet "kein Editor-Kontext bekannt"
// und behaelt das bisherige (arbitraere) Fallback-Verhalten bei.
func (r *AdminContentRepository) ListAnimeSegments(ctx context.Context, animeID int64, groupID int64, version string, currentReleaseVersionID int64) ([]models.AdminThemeSegment, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	query := `
		SELECT
			ts.id,
			ts.theme_id,
			t.anime_id,
			t.title AS theme_title,
			tt.name AS theme_type_name,
			COALESCE(tt.kuerzel, '') AS theme_type_kuerzel,
			ts.fansub_group_id,
			ts.version,
			ts.start_episode,
			ts.end_episode,
			ts.start_time::text,
			ts.end_time::text,
			ts.source_jellyfin_item_id,
			ts.source_type,
			ts.source_ref,
			ts.source_label,
			ts.created_at,
			ts.origin_release_version_id
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE t.anime_id = $1`

	args := []interface{}{animeID}
	argIdx := 2

	if groupID > 0 {
		query += fmt.Sprintf(" AND ts.fansub_group_id = $%d", argIdx)
		args = append(args, groupID)
		argIdx++
	}
	if version != "" {
		query += fmt.Sprintf(" AND ts.version = $%d", argIdx)
		args = append(args, version)
		argIdx++
	}
	if currentReleaseVersionID > 0 {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM theme_segment_assignments tsa WHERE tsa.theme_segment_id = ts.id AND tsa.release_version_id = $%d)", argIdx)
		args = append(args, currentReleaseVersionID)
		argIdx++
	}

	query += " ORDER BY ts.id"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list anime segments anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	segments := make([]models.AdminThemeSegment, 0)
	for rows.Next() {
		var seg models.AdminThemeSegment
		if err := rows.Scan(
			&seg.ID,
			&seg.ThemeID,
			&seg.AnimeID,
			&seg.ThemeTitle,
			&seg.ThemeTypeName,
			&seg.ThemeTypeKuerzel,
			&seg.FansubGroupID,
			&seg.Version,
			&seg.StartEpisode,
			&seg.EndEpisode,
			&seg.StartTime,
			&seg.EndTime,
			&seg.SourceJellyfinItemID,
			&seg.SourceType,
			&seg.SourceRef,
			&seg.SourceLabel,
			&seg.CreatedAt,
			&seg.OriginReleaseVersionID,
		); err != nil {
			return nil, fmt.Errorf("scan anime segment anime=%d: %w", animeID, err)
		}
		segments = append(segments, seg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime segments anime=%d: %w", animeID, err)
	}
	if err := r.hydrateSegmentPlaybackMetadataList(ctx, segments, currentReleaseVersionID); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentLibraryMetadataList(ctx, segments); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentPreviewMetadataList(ctx, segments, currentReleaseVersionID); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentAssignmentMetadataList(ctx, segments); err != nil {
		return nil, err
	}

	return segments, nil
}

// CreateAnimeSegment commits metadata, free range assignments and playback sources
// atomically. A complete range determines membership; without one, the supplied
// real release version is the initial assignment. An occupied complete target set
// rolls back the new segment instead of leaving an orphan or misleading success.
func (r *AdminContentRepository) CreateAnimeSegment(ctx context.Context, animeID int64, input models.AdminThemeSegmentCreateInput, currentReleaseVersionID int64) (*models.AdminThemeSegment, *models.ThemeSegmentAssignmentSyncResult, error) {
	if animeID <= 0 {
		return nil, nil, ErrNotFound
	}

	// Sicherstellen dass Theme existiert und zum Anime gehoert
	var themeAnimeID int64
	if err := r.db.QueryRow(ctx, `SELECT anime_id FROM themes WHERE id = $1`, input.ThemeID).Scan(&themeAnimeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, fmt.Errorf("check theme anime id theme=%d: %w", input.ThemeID, err)
	}
	if themeAnimeID != animeID {
		return nil, nil, ErrNotFound
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin create anime segment anime=%d: %w", animeID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := lockSegmentAssignmentAnimeTx(ctx, tx, animeID); err != nil {
		return nil, nil, err
	}

	var segID int64
	encodedSource := encodeThemeSegmentSource(input.SourceType, input.SourceRef, input.SourceLabel, input.SourceJellyfinItemID)
	err = tx.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id, source_type, source_ref, source_label)
		VALUES ($1, $2, $3, $4, $5, $6::interval, $7::interval, $8, $9, $10, $11)
		RETURNING id
	`, input.ThemeID, input.FansubGroupID, input.Version, input.StartEpisode, input.EndEpisode,
		input.StartTime, input.EndTime, encodedSource, input.SourceType, input.SourceRef, input.SourceLabel).Scan(&segID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23503" || pgErr.Code == "23514" {
				return nil, nil, ErrConflict
			}
		}
		return nil, nil, fmt.Errorf("create anime segment anime=%d: %w", animeID, err)
	}

	// The permission gate uses the editor's real release version. Its anime must
	// match even when a complete range skips the implicit initial assignment.
	if currentReleaseVersionID > 0 {
		if err := validateSegmentAssignmentTargetTx(ctx, tx, segID, currentReleaseVersionID); err != nil {
			return nil, nil, err
		}
	}

	rangeSync, err := r.syncSegmentAssignmentRangeTx(ctx, tx, segID)
	if err != nil {
		return nil, nil, err
	}
	// With a complete range, only actual free range targets are assigned. The
	// editor release is not an extra implicit target outside that range.
	if rangeSync == nil && currentReleaseVersionID > 0 {
		if _, err := assignThemeSegmentToReleaseVersionTx(ctx, tx, segID, currentReleaseVersionID); err != nil {
			return nil, nil, err
		}
		// Plan 156-16 (GAP-05): eine neu angelegte Segment-Zuweisung ueber den impliziten
		// Einzelzuweisungs-Pfad bekommt sofort eine Origin, ohne erzwungene Admin-Interaktion.
		// Plan 156-18 (GAP-07): dieselbe Stelle liefert jetzt zusaetzlich die einmalige
		// Vorauswahl der Origin-Contributor -- preselectedCount wird unabhaengig von
		// originOutcome.Changed gemeldet (die Vorauswahl selbst ist nie an Changed gekoppelt).
		originOutcome, preselectedCount, err := ensureThemeSegmentOriginAndContributorsTx(ctx, tx, segID)
		if err != nil {
			return nil, nil, fmt.Errorf("create anime segment anime=%d segment=%d: ensure origin: %w", animeID, segID, err)
		}
		if originOutcome.Changed {
			rangeSync = &models.ThemeSegmentAssignmentSyncResult{
				OriginBefore:                originOutcome.Before,
				OriginAfter:                 originOutcome.After,
				RemovedContributorCount:     originOutcome.RemovedContributorCount,
				PreselectedContributorCount: preselectedCount,
			}
		}
	}

	if err := r.syncThemeSegmentPlaybackSourceTx(ctx, tx, segID); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit create anime segment anime=%d segment=%d: %w", animeID, segID, err)
	}

	segment, err := loadSegmentByID(ctx, r, segID, currentReleaseVersionID)
	return segment, rangeSync, err
}

// UpdateAnimeSegment aktualisiert ein Segment (partieller Patch).
func (r *AdminContentRepository) UpdateAnimeSegment(ctx context.Context, segmentID int64, input models.AdminThemeSegmentPatchInput) (*models.ThemeSegmentAssignmentSyncResult, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	setClauses := make([]string, 0, 8)
	args := make([]interface{}, 0, 9)
	argIdx := 1

	if input.ThemeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("theme_id = $%d", argIdx))
		args = append(args, *input.ThemeID)
		argIdx++
	}
	if input.FansubGroupID != nil {
		setClauses = append(setClauses, fmt.Sprintf("fansub_group_id = $%d", argIdx))
		args = append(args, *input.FansubGroupID)
		argIdx++
	}
	if input.Version != nil {
		setClauses = append(setClauses, fmt.Sprintf("version = $%d", argIdx))
		args = append(args, *input.Version)
		argIdx++
	}
	if input.StartEpisode != nil {
		setClauses = append(setClauses, fmt.Sprintf("start_episode = $%d", argIdx))
		args = append(args, *input.StartEpisode)
		argIdx++
	}
	if input.EndEpisode != nil {
		setClauses = append(setClauses, fmt.Sprintf("end_episode = $%d", argIdx))
		args = append(args, *input.EndEpisode)
		argIdx++
	}
	if input.StartTime != nil {
		setClauses = append(setClauses, fmt.Sprintf("start_time = $%d::interval", argIdx))
		args = append(args, *input.StartTime)
		argIdx++
	}
	if input.EndTime != nil {
		setClauses = append(setClauses, fmt.Sprintf("end_time = $%d::interval", argIdx))
		args = append(args, *input.EndTime)
		argIdx++
	}
	if input.SourceJellyfinItemID != nil {
		encodedSource := encodeThemeSegmentSource(input.SourceType, input.SourceRef, input.SourceLabel, input.SourceJellyfinItemID)
		setClauses = append(setClauses, fmt.Sprintf("source_jellyfin_item_id = $%d", argIdx))
		args = append(args, encodedSource)
		argIdx++
	} else if input.SourceType != nil || input.SourceRef != nil || input.SourceLabel != nil {
		encodedSource := encodeThemeSegmentSource(input.SourceType, input.SourceRef, input.SourceLabel, nil)
		setClauses = append(setClauses, fmt.Sprintf("source_jellyfin_item_id = $%d", argIdx))
		args = append(args, encodedSource)
		argIdx++
	}
	if input.SourceType != nil {
		trimmed := strings.TrimSpace(*input.SourceType)
		if trimmed == "" {
			setClauses = append(setClauses, "source_type = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("source_type = $%d", argIdx))
			args = append(args, trimmed)
			argIdx++
		}
	}
	if input.SourceRef != nil {
		trimmed := strings.TrimSpace(*input.SourceRef)
		if trimmed == "" {
			setClauses = append(setClauses, "source_ref = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("source_ref = $%d", argIdx))
			args = append(args, trimmed)
			argIdx++
		}
	}
	if input.SourceLabel != nil {
		trimmed := strings.TrimSpace(*input.SourceLabel)
		if trimmed == "" {
			setClauses = append(setClauses, "source_label = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("source_label = $%d", argIdx))
			args = append(args, trimmed)
			argIdx++
		}
	}

	// Even an empty patch must reconcile the saved range in the same atomic
	// path. The neutral no-op assignment keeps SQL construction deterministic.
	if len(setClauses) == 0 {
		setClauses = append(setClauses, "id = id")
	}

	args = append(args, segmentID)
	query := fmt.Sprintf("UPDATE theme_segments SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin update anime segment id=%d: %w", segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	animeID, err := lockSegmentAssignmentDomainTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	oldType, err := segmentAssignmentTypeTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	if input.ThemeID != nil {
		var targetAnimeID int64
		if err := tx.QueryRow(ctx, `SELECT anime_id FROM themes WHERE id=$1`, *input.ThemeID).Scan(&targetAnimeID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrNotFound
			}
			return nil, err
		}
		if targetAnimeID != animeID {
			return nil, ErrConflict
		}
	}
	tag, err := tx.Exec(ctx, query, args...)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("update anime segment id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	rangeSync, err := r.syncSegmentAssignmentRangeTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	newType, err := segmentAssignmentTypeTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	if oldType != newType {
		if err := validateSegmentAssignmentTypeChangeTx(ctx, tx, []int64{segmentID}, newType); err != nil {
			return nil, err
		}
	}

	if err := r.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit update anime segment id=%d: %w", segmentID, err)
	}

	return rangeSync, nil
}

// DeleteAnimeSegment loescht ein Segment anhand seiner ID.
func (r *AdminContentRepository) DeleteAnimeSegment(ctx context.Context, segmentID int64) error {
	if segmentID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `DELETE FROM theme_segments WHERE id = $1`, segmentID)
	if err != nil {
		return fmt.Errorf("delete anime segment id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// loadSegmentByID laedt ein vollstaendiges Segment per ID. currentReleaseVersionID (Phase 117,
// D-03/Plan 117-04) steuert die Playback-Hydration, s. hydrateSegmentPlaybackMetadata.
func loadSegmentByID(ctx context.Context, r *AdminContentRepository, segID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	var seg models.AdminThemeSegment
	if err := r.db.QueryRow(ctx, `
		SELECT
			ts.id,
			ts.theme_id,
			t.anime_id,
			t.title AS theme_title,
			tt.name AS theme_type_name,
			COALESCE(tt.kuerzel, '') AS theme_type_kuerzel,
			ts.fansub_group_id,
			ts.version,
			ts.start_episode,
			ts.end_episode,
			ts.start_time::text,
			ts.end_time::text,
			ts.source_jellyfin_item_id,
			ts.source_type,
			ts.source_ref,
			ts.source_label,
			ts.created_at,
			ts.origin_release_version_id
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE ts.id = $1
	`, segID).Scan(
		&seg.ID,
		&seg.ThemeID,
		&seg.AnimeID,
		&seg.ThemeTitle,
		&seg.ThemeTypeName,
		&seg.ThemeTypeKuerzel,
		&seg.FansubGroupID,
		&seg.Version,
		&seg.StartEpisode,
		&seg.EndEpisode,
		&seg.StartTime,
		&seg.EndTime,
		&seg.SourceJellyfinItemID,
		&seg.SourceType,
		&seg.SourceRef,
		&seg.SourceLabel,
		&seg.CreatedAt,
		&seg.OriginReleaseVersionID,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("load segment by id=%d: %w", segID, err)
	}
	if err := r.hydrateSegmentPlaybackMetadata(ctx, &seg, currentReleaseVersionID); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentLibraryMetadata(ctx, &seg); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentPreviewMetadata(ctx, &seg, currentReleaseVersionID); err != nil {
		return nil, err
	}
	// Single-item writes/readbacks need the same authoritative sparse assignment
	// projection as the list; ranges are not a substitute for actual membership.
	segments := []models.AdminThemeSegment{seg}
	if err := r.hydrateSegmentAssignmentMetadataList(ctx, segments); err != nil {
		return nil, err
	}
	return &segments[0], nil
}

// GetAnimeSegmentByID laedt ein Segment und prueft, dass es zum angegebenen Anime gehoert.
// currentReleaseVersionID (Phase 117, D-03/Plan 117-04) steuert die Playback-Hydration, s.
// hydrateSegmentPlaybackMetadata; 0 behaelt das bisherige (arbitraere) Fallback-Verhalten bei.
func (r *AdminContentRepository) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 {
		return nil, ErrNotFound
	}
	seg, err := loadSegmentByID(ctx, r, segmentID, currentReleaseVersionID)
	if err != nil {
		return nil, err
	}
	if seg.AnimeID != animeID {
		return nil, ErrNotFound
	}
	return seg, nil
}

// ListAnimeSegmentSuggestions gibt Segmente eines Anime zurueck, die den episodeNumber-Bereich abdecken,
// jedoch nicht die aktuelle (excludeGroupID, excludeVersion)-Kombination.
// excludeGroupID=0 und excludeVersion="" bedeutet: nichts ausschliessen.
func (r *AdminContentRepository) ListAnimeSegmentSuggestions(
	ctx context.Context,
	animeID int64,
	episodeNumber int,
	excludeGroupID int64,
	excludeVersion string,
) ([]models.AdminThemeSegment, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	query := `
		SELECT
			ts.id,
			ts.theme_id,
			t.anime_id,
			t.title AS theme_title,
			tt.name AS theme_type_name,
			COALESCE(tt.kuerzel, '') AS theme_type_kuerzel,
			ts.fansub_group_id,
			ts.version,
			ts.start_episode,
			ts.end_episode,
			ts.start_time::text,
			ts.end_time::text,
			ts.source_jellyfin_item_id,
			ts.source_type,
			ts.source_ref,
			ts.source_label,
			ts.created_at
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE t.anime_id = $1
		  AND (ts.start_episode IS NULL OR ts.start_episode <= $2)
		  AND (ts.end_episode IS NULL OR ts.end_episode >= $2)`

	args := []interface{}{animeID, episodeNumber}
	argIdx := 3

	if excludeGroupID > 0 && excludeVersion != "" {
		query += fmt.Sprintf(" AND NOT (ts.fansub_group_id = $%d AND ts.version = $%d)", argIdx, argIdx+1)
		args = append(args, excludeGroupID, excludeVersion)
		argIdx += 2
	} else if excludeGroupID > 0 {
		query += fmt.Sprintf(" AND ts.fansub_group_id != $%d", argIdx)
		args = append(args, excludeGroupID)
		argIdx++
	} else if excludeVersion != "" {
		query += fmt.Sprintf(" AND ts.version != $%d", argIdx)
		args = append(args, excludeVersion)
		argIdx++
	}

	_ = argIdx // used above
	query += " ORDER BY ts.id"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list anime segment suggestions anime=%d episode=%d: %w", animeID, episodeNumber, err)
	}
	defer rows.Close()

	segments := make([]models.AdminThemeSegment, 0)
	for rows.Next() {
		var seg models.AdminThemeSegment
		if err := rows.Scan(
			&seg.ID,
			&seg.ThemeID,
			&seg.AnimeID,
			&seg.ThemeTitle,
			&seg.ThemeTypeName,
			&seg.ThemeTypeKuerzel,
			&seg.FansubGroupID,
			&seg.Version,
			&seg.StartEpisode,
			&seg.EndEpisode,
			&seg.StartTime,
			&seg.EndTime,
			&seg.SourceJellyfinItemID,
			&seg.SourceType,
			&seg.SourceRef,
			&seg.SourceLabel,
			&seg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan anime segment suggestion anime=%d episode=%d: %w", animeID, episodeNumber, err)
		}
		segments = append(segments, seg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime segment suggestions anime=%d episode=%d: %w", animeID, episodeNumber, err)
	}
	if err := r.hydrateSegmentPlaybackMetadataList(ctx, segments, 0); err != nil {
		return nil, err
	}

	return segments, nil
}
