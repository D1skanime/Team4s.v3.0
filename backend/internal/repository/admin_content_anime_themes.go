package repository

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	themeSegmentSourceTypeNone         = "none"
	themeSegmentSourceTypeJellyfin     = "jellyfin_theme"
	themeSegmentSourceTypeReleaseAsset = "release_asset"
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

// ListThemeTypes gibt alle Theme-Typen geordnet nach ID zurück.
func (r *AdminContentRepository) ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name FROM theme_types ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list theme types: %w", err)
	}
	defer rows.Close()

	types := make([]models.AdminThemeType, 0)
	for rows.Next() {
		var tt models.AdminThemeType
		if err := rows.Scan(&tt.ID, &tt.Name); err != nil {
			return nil, fmt.Errorf("scan theme type: %w", err)
		}
		types = append(types, tt)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate theme types: %w", err)
	}

	return types, nil
}

// ListAdminAnimeThemes gibt alle Themes eines Anime zurück, mit aufgelöstem theme_type_name.
func (r *AdminContentRepository) ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error) {
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

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id,
			t.anime_id,
			t.theme_type_id,
			tt.name AS theme_type_name,
			t.title,
			t.created_at
		FROM themes t
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE t.anime_id = $1
		ORDER BY t.theme_type_id, t.id
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("list admin anime themes anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	themes := make([]models.AdminAnimeTheme, 0)
	for rows.Next() {
		var theme models.AdminAnimeTheme
		if err := rows.Scan(
			&theme.ID,
			&theme.AnimeID,
			&theme.ThemeTypeID,
			&theme.ThemeTypeName,
			&theme.Title,
			&theme.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin anime theme anime=%d: %w", animeID, err)
		}
		themes = append(themes, theme)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime themes anime=%d: %w", animeID, err)
	}

	return themes, nil
}

// CreateAdminAnimeTheme legt ein neues Theme an und gibt den erstellten Datensatz zurück.
func (r *AdminContentRepository) CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error) {
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

	var theme models.AdminAnimeTheme
	err = r.db.QueryRow(ctx, `
		INSERT INTO themes (anime_id, theme_type_id, title)
		VALUES ($1, $2, $3)
		RETURNING id, anime_id, theme_type_id, title, created_at
	`, animeID, input.ThemeTypeID, input.Title).Scan(
		&theme.ID,
		&theme.AnimeID,
		&theme.ThemeTypeID,
		&theme.Title,
		&theme.CreatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create admin anime theme anime=%d: %w", animeID, err)
	}

	// theme_type_name per Follow-up-SELECT auflösen
	if err := r.db.QueryRow(ctx, `SELECT name FROM theme_types WHERE id = $1`, theme.ThemeTypeID).Scan(&theme.ThemeTypeName); err != nil {
		return nil, fmt.Errorf("resolve theme type name id=%d: %w", theme.ThemeTypeID, err)
	}

	return &theme, nil
}

// UpdateAdminAnimeTheme aktualisiert theme_type_id und/oder title eines Themes (partieller Patch).
func (r *AdminContentRepository) UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error {
	if themeID <= 0 {
		return ErrNotFound
	}

	setClauses := make([]string, 0, 2)
	args := make([]interface{}, 0, 3)
	argIdx := 1

	if input.ThemeTypeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("theme_type_id = $%d", argIdx))
		args = append(args, *input.ThemeTypeID)
		argIdx++
	}
	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}

	if len(setClauses) == 0 {
		// Nichts zu aktualisieren — prüfen ob Theme existiert
		var exists bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM themes WHERE id = $1)`, themeID).Scan(&exists); err != nil {
			return fmt.Errorf("check theme existence id=%d: %w", themeID, err)
		}
		if !exists {
			return ErrNotFound
		}
		return nil
	}

	args = append(args, themeID)
	query := fmt.Sprintf("UPDATE themes SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)

	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrConflict
		}
		return fmt.Errorf("update admin anime theme id=%d: %w", themeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteAdminAnimeTheme löscht ein Theme anhand seiner ID.
func (r *AdminContentRepository) DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error {
	if themeID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `DELETE FROM themes WHERE id = $1`, themeID)
	if err != nil {
		return fmt.Errorf("delete admin anime theme id=%d: %w", themeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// ListAnimeSegments gibt alle Segmente eines Anime gefiltert nach group_id und version zurueck.
// groupID=0 und version="" bedeutet: kein Filter (alle Segmente des Anime).
func (r *AdminContentRepository) ListAnimeSegments(ctx context.Context, animeID int64, groupID int64, version string) ([]models.AdminThemeSegment, error) {
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
			return nil, fmt.Errorf("scan anime segment anime=%d: %w", animeID, err)
		}
		segments = append(segments, seg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime segments anime=%d: %w", animeID, err)
	}
	if err := r.hydrateSegmentLibraryMetadataList(ctx, segments); err != nil {
		return nil, err
	}

	return segments, nil
}

// CreateAnimeSegment legt ein neues Segment an.
// Prueft ob das Theme zum animeID gehoert.
func (r *AdminContentRepository) CreateAnimeSegment(ctx context.Context, animeID int64, input models.AdminThemeSegmentCreateInput) (*models.AdminThemeSegment, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	// Sicherstellen dass Theme existiert und zum Anime gehoert
	var themeAnimeID int64
	if err := r.db.QueryRow(ctx, `SELECT anime_id FROM themes WHERE id = $1`, input.ThemeID).Scan(&themeAnimeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("check theme anime id theme=%d: %w", input.ThemeID, err)
	}
	if themeAnimeID != animeID {
		return nil, ErrNotFound
	}

	var segID int64
	encodedSource := encodeThemeSegmentSource(input.SourceType, input.SourceRef, input.SourceLabel, input.SourceJellyfinItemID)
	err := r.db.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id, source_type, source_ref, source_label)
		VALUES ($1, $2, $3, $4, $5, $6::interval, $7::interval, $8, $9, $10, $11)
		RETURNING id
	`, input.ThemeID, input.FansubGroupID, input.Version, input.StartEpisode, input.EndEpisode,
		input.StartTime, input.EndTime, encodedSource, input.SourceType, input.SourceRef, input.SourceLabel).Scan(&segID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23503" {
				return nil, ErrConflict
			}
			if pgErr.Code == "23514" {
				return nil, ErrConflict
			}
		}
		return nil, fmt.Errorf("create anime segment anime=%d: %w", animeID, err)
	}

	return loadSegmentByID(ctx, r, segID)
}

// UpdateAnimeSegment aktualisiert ein Segment (partieller Patch).
func (r *AdminContentRepository) UpdateAnimeSegment(ctx context.Context, segmentID int64, input models.AdminThemeSegmentPatchInput) error {
	if segmentID <= 0 {
		return ErrNotFound
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

	if len(setClauses) == 0 {
		// Nichts zu aktualisieren — pruefen ob Segment existiert
		var exists bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM theme_segments WHERE id = $1)`, segmentID).Scan(&exists); err != nil {
			return fmt.Errorf("check segment existence id=%d: %w", segmentID, err)
		}
		if !exists {
			return ErrNotFound
		}
		return nil
	}

	args = append(args, segmentID)
	query := fmt.Sprintf("UPDATE theme_segments SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)

	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			return ErrConflict
		}
		return fmt.Errorf("update anime segment id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
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

func (r *AdminContentRepository) ListSegmentLibraryCandidates(
	ctx context.Context,
	animeID int64,
	fansubGroupID int64,
	segmentKind string,
	segmentName string,
) ([]models.SegmentLibraryCandidate, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}
	if fansubGroupID <= 0 {
		return []models.SegmentLibraryCandidate{}, nil
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []models.SegmentLibraryCandidate{}, nil
	}

	source, err := r.loadStableSegmentAnimeSource(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return []models.SegmentLibraryCandidate{}, nil
	}

	normalizedKind := normalizeSegmentLibraryKind(segmentKind)
	normalizedName := normalizeSegmentLibraryName(segmentName)
	rows, err := r.db.Query(ctx, `
		SELECT
			sld.id,
			sla.id,
			sla.media_asset_id,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.fansub_group_id,
			sld.segment_kind,
			sld.segment_name,
			sld.identity_status,
			sld.ownership_scope,
			sla.source_ref,
			sla.source_label,
			sla.attach_source,
			(
				SELECT sla2.attach_source
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
				  AND sla2.detached_at IS NULL
				ORDER BY sla2.attached_at DESC, sla2.id DESC
				LIMIT 1
			) AS current_attach_source,
			(
				SELECT COUNT(*)::INTEGER
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
				  AND sla2.detached_at IS NULL
			) AS active_assignment_count,
			(
				SELECT MAX(sla2.attached_at)
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
			) AS last_attached_at
		FROM segment_library_definitions sld
		JOIN segment_library_assets sla ON sla.definition_id = sld.id
		WHERE sld.anime_source_provider = $1
		  AND sld.anime_source_external_id = $2
		  AND sld.fansub_group_id = $3
		  AND sld.ownership_scope = 'reusable'
		  AND sld.segment_kind = $4
		  AND ($5 = '' OR sld.normalized_segment_name = $5)
		ORDER BY
			sla.is_primary DESC,
			last_attached_at DESC NULLS LAST,
			sla.id DESC
	`, source.Provider, source.ExternalID, fansubGroupID, normalizedKind, normalizedName)
	if err != nil {
		return nil, fmt.Errorf("list segment library candidates anime=%d group=%d: %w", animeID, fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]models.SegmentLibraryCandidate, 0)
	for rows.Next() {
		var item models.SegmentLibraryCandidate
		if err := rows.Scan(
			&item.DefinitionID,
			&item.AssetID,
			&item.MediaAssetID,
			&item.AnimeSourceProvider,
			&item.AnimeSourceExternalID,
			&item.FansubGroupID,
			&item.SegmentKind,
			&item.SegmentName,
			&item.IdentityStatus,
			&item.OwnershipScope,
			&item.SourceRef,
			&item.SourceLabel,
			&item.AssetAttachSource,
			&item.CurrentAttachSource,
			&item.ActiveAssignmentCount,
			&item.LastAttachedAt,
		); err != nil {
			return nil, fmt.Errorf("scan segment library candidate anime=%d group=%d: %w", animeID, fansubGroupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate segment library candidates anime=%d group=%d: %w", animeID, fansubGroupID, err)
	}

	return items, nil
}

func (r *AdminContentRepository) AttachSegmentLibraryAsset(
	ctx context.Context,
	animeID int64,
	segmentID int64,
	input models.SegmentLibraryAttachInput,
) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 || input.AssetID <= 0 {
		return nil, ErrNotFound
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin attach segment library asset tx anime=%d segment=%d: %w", animeID, segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	ok, err := hasTableTx(ctx, tx, "segment_library_assignments")
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}

	segment, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID)
	if err != nil {
		return nil, err
	}

	source, err := r.loadStableSegmentAnimeSourceTx(ctx, tx, animeID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return nil, ErrConflict
	}

	var (
		definitionID          int64
		assetDefinitionID     int64
		sourceRef             string
		sourceLabel           *string
		fansubGroupID         int64
		animeSourceProvider   string
		animeSourceExternalID string
		reusableOwnership     string
	)
	if err := tx.QueryRow(ctx, `
		SELECT
			sla.id,
			sla.definition_id,
			sla.source_ref,
			sla.source_label,
			sld.fansub_group_id,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.ownership_scope
		FROM segment_library_assets sla
		JOIN segment_library_definitions sld ON sld.id = sla.definition_id
		WHERE sla.id = $1
	`, input.AssetID).Scan(
		&input.AssetID,
		&assetDefinitionID,
		&sourceRef,
		&sourceLabel,
		&fansubGroupID,
		&animeSourceProvider,
		&animeSourceExternalID,
		&reusableOwnership,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load segment library asset %d: %w", input.AssetID, err)
	}
	definitionID = assetDefinitionID

	if animeSourceProvider != source.Provider || animeSourceExternalID != source.ExternalID {
		return nil, ErrConflict
	}
	if reusableOwnership != string(models.SegmentLibraryOwnershipScopeReusable) {
		return nil, ErrConflict
	}
	if segment.FansubGroupID != nil && *segment.FansubGroupID > 0 && fansubGroupID != *segment.FansubGroupID {
		return nil, ErrConflict
	}

	sourceType := themeSegmentSourceTypeReleaseAsset
	encodedSource := encodeThemeSegmentSource(&sourceType, &sourceRef, sourceLabel, nil)
	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments
		SET source_jellyfin_item_id = $1,
		    source_type = $2,
		    source_ref = $3,
		    source_label = $4
		WHERE id = $5
	`, encodedSource, sourceType, sourceRef, sourceLabel, segmentID); err != nil {
		return nil, fmt.Errorf("attach segment library asset segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE segment_library_assignments
		SET detached_at = NOW()
		WHERE theme_segment_id = $1
		  AND asset_id IS DISTINCT FROM $2
		  AND detached_at IS NULL
	`, segmentID, input.AssetID); err != nil {
		return nil, fmt.Errorf("detach previous segment library assignments segment=%d: %w", segmentID, err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO segment_library_assignments (
			definition_id,
			asset_id,
			anime_id,
			theme_segment_id,
			release_version,
			attach_source,
			attached_at,
			detached_at
		)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), 'reuse_attach', NOW(), NULL)
		ON CONFLICT (theme_segment_id) WHERE theme_segment_id IS NOT NULL
		DO UPDATE SET
			definition_id = EXCLUDED.definition_id,
			asset_id = EXCLUDED.asset_id,
			anime_id = EXCLUDED.anime_id,
			release_version = EXCLUDED.release_version,
			attach_source = EXCLUDED.attach_source,
			attached_at = EXCLUDED.attached_at,
			detached_at = NULL
	`, definitionID, input.AssetID, animeID, segmentID, strings.TrimSpace(segment.Version)); err != nil {
		return nil, fmt.Errorf("upsert segment library assignment segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit attach segment library asset segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}

	return loadSegmentByID(ctx, r, segmentID)
}

func (r *AdminContentRepository) IsReusableSegmentAsset(ctx context.Context, sourceRef string) (bool, error) {
	trimmed := strings.TrimSpace(filepath.ToSlash(sourceRef))
	if trimmed == "" {
		return false, nil
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil || !ok {
		return false, err
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM segment_library_assets sla
			JOIN segment_library_definitions sld ON sld.id = sla.definition_id
			WHERE sla.source_ref = $1
			  AND sld.ownership_scope = 'reusable'
		)
	`, trimmed).Scan(&exists); err != nil {
		return false, fmt.Errorf("check reusable segment asset ref=%q: %w", trimmed, err)
	}
	return exists, nil
}

// loadSegmentByID laedt ein vollstaendiges Segment per ID.
func loadSegmentByID(ctx context.Context, r *AdminContentRepository, segID int64) (*models.AdminThemeSegment, error) {
	var seg models.AdminThemeSegment
	if err := r.db.QueryRow(ctx, `
		SELECT
			ts.id,
			ts.theme_id,
			t.anime_id,
			t.title AS theme_title,
			tt.name AS theme_type_name,
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
		WHERE ts.id = $1
	`, segID).Scan(
		&seg.ID,
		&seg.ThemeID,
		&seg.AnimeID,
		&seg.ThemeTitle,
		&seg.ThemeTypeName,
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("load segment by id=%d: %w", segID, err)
	}
	if err := r.hydrateSegmentLibraryMetadata(ctx, &seg); err != nil {
		return nil, err
	}
	return &seg, nil
}

// GetAnimeSegmentByID laedt ein Segment und prueft, dass es zum angegebenen Anime gehoert.
func (r *AdminContentRepository) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 {
		return nil, ErrNotFound
	}
	seg, err := loadSegmentByID(ctx, r, segmentID)
	if err != nil {
		return nil, err
	}
	if seg.AnimeID != animeID {
		return nil, ErrNotFound
	}
	return seg, nil
}

func (r *AdminContentRepository) hydrateSegmentLibraryMetadataList(ctx context.Context, segments []models.AdminThemeSegment) error {
	for i := range segments {
		if err := r.hydrateSegmentLibraryMetadata(ctx, &segments[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *AdminContentRepository) hydrateSegmentLibraryMetadata(ctx context.Context, seg *models.AdminThemeSegment) error {
	if seg == nil || seg.ID <= 0 {
		return nil
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	if err := r.db.QueryRow(ctx, `
		SELECT
			sld.id,
			sla.id,
			sld.segment_kind,
			sld.segment_name,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.identity_status,
			sld.ownership_scope,
			sla2.attach_source
		FROM segment_library_assignments sla2
		JOIN segment_library_definitions sld ON sld.id = sla2.definition_id
		LEFT JOIN segment_library_assets sla ON sla.id = sla2.asset_id
		WHERE sla2.theme_segment_id = $1
		  AND sla2.detached_at IS NULL
		ORDER BY sla2.attached_at DESC, sla2.id DESC
		LIMIT 1
	`, seg.ID).Scan(
		&seg.LibraryDefinitionID,
		&seg.LibraryAssetID,
		&seg.LibrarySegmentKind,
		&seg.LibrarySegmentName,
		&seg.LibraryAnimeProvider,
		&seg.LibraryAnimeExternal,
		&seg.LibraryIdentity,
		&seg.LibraryOwnership,
		&seg.LibraryAttachSource,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("hydrate segment library metadata segment=%d: %w", seg.ID, err)
	}

	return nil
}

func (r *AdminContentRepository) segmentLibraryTablesAvailable(ctx context.Context) (bool, error) {
	hasDefinitions, err := r.hasTable(ctx, "segment_library_definitions")
	if err != nil || !hasDefinitions {
		return hasDefinitions, err
	}
	hasAssets, err := r.hasTable(ctx, "segment_library_assets")
	if err != nil || !hasAssets {
		return hasAssets, err
	}
	return r.hasTable(ctx, "segment_library_assignments")
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

func (r *AdminContentRepository) BindUploadedSegmentAsset(
	ctx context.Context,
	animeID int64,
	segmentID int64,
	mediaAssetID int64,
	sourceRef string,
	sourceLabel *string,
) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 || mediaAssetID <= 0 {
		return nil, ErrNotFound
	}

	segment, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID)
	if err != nil {
		return nil, err
	}

	trimmedRef := strings.TrimSpace(filepath.ToSlash(sourceRef))
	if trimmedRef == "" {
		return nil, ErrConflict
	}
	trimmedLabel := strings.TrimSpace(derefString(sourceLabel))

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin bind uploaded segment asset tx anime=%d segment=%d: %w", animeID, segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	sourceType := themeSegmentSourceTypeReleaseAsset
	encodedSource := encodeThemeSegmentSource(&sourceType, &trimmedRef, sourceLabel, nil)
	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments
		SET source_jellyfin_item_id = $1,
		    source_type = $2,
		    source_ref = $3,
		    source_label = NULLIF($4, '')
		WHERE id = $5
	`, encodedSource, sourceType, trimmedRef, trimmedLabel, segmentID); err != nil {
		return nil, fmt.Errorf("update uploaded segment asset source anime=%d segment=%d: %w", animeID, segmentID, err)
	}

	hasAssignments, err := hasTableTx(ctx, tx, "segment_library_assignments")
	if err != nil {
		return nil, fmt.Errorf("detect segment library assignments table: %w", err)
	}
	if hasAssignments {
		stableSource, err := r.loadStableSegmentAnimeSourceTx(ctx, tx, animeID)
		if err != nil {
			return nil, err
		}
		if stableSource != nil && segment.FansubGroupID != nil && *segment.FansubGroupID > 0 {
			row := segmentDeleteMirrorRow{
				ThemeSegmentID: segment.ID,
				AnimeID:        segment.AnimeID,
				FansubGroupID:  segment.FansubGroupID,
				Version:        segment.Version,
				ThemeTitle:     segment.ThemeTitle,
				ThemeTypeName:  segment.ThemeTypeName,
				SourceRef:      &trimmedRef,
				SourceLabel:    sourceLabel,
			}

			definitionID, err := findOrCreateSegmentLibraryDefinitionForDelete(ctx, tx, *stableSource, row)
			if err != nil {
				return nil, err
			}

			var assetID int64
			if err := tx.QueryRow(ctx, `
				WITH inserted AS (
					INSERT INTO segment_library_assets (
						definition_id,
						media_asset_id,
						source_ref,
						source_label,
						attach_source,
						is_primary,
						created_at
					)
					VALUES ($1, $2, $3, NULLIF($4, ''), 'upload', TRUE, NOW())
					ON CONFLICT (definition_id, source_ref)
					DO UPDATE SET
						media_asset_id = EXCLUDED.media_asset_id,
						source_label = COALESCE(EXCLUDED.source_label, segment_library_assets.source_label),
						attach_source = 'upload',
						is_primary = TRUE
					RETURNING id
				)
				SELECT id FROM inserted
				UNION ALL
				SELECT id
				FROM segment_library_assets
				WHERE definition_id = $1
				  AND source_ref = $3
				LIMIT 1
			`, definitionID, mediaAssetID, trimmedRef, trimmedLabel).Scan(&assetID); err != nil {
				return nil, fmt.Errorf("upsert uploaded segment library asset definition=%d ref=%q: %w", definitionID, trimmedRef, err)
			}

			if _, err := tx.Exec(ctx, `
				UPDATE segment_library_assignments
				SET detached_at = NOW()
				WHERE theme_segment_id = $1
				  AND asset_id IS DISTINCT FROM $2
				  AND detached_at IS NULL
			`, segmentID, assetID); err != nil {
				return nil, fmt.Errorf("detach previous uploaded segment library assignments segment=%d: %w", segmentID, err)
			}

			if _, err := tx.Exec(ctx, `
				INSERT INTO segment_library_assignments (
					definition_id,
					asset_id,
					anime_id,
					theme_segment_id,
					release_version,
					attach_source,
					attached_at,
					detached_at
				)
				VALUES ($1, $2, $3, $4, NULLIF($5, ''), 'upload', NOW(), NULL)
				ON CONFLICT (theme_segment_id) WHERE theme_segment_id IS NOT NULL
				DO UPDATE SET
					definition_id = EXCLUDED.definition_id,
					asset_id = EXCLUDED.asset_id,
					anime_id = EXCLUDED.anime_id,
					release_version = EXCLUDED.release_version,
					attach_source = EXCLUDED.attach_source,
					attached_at = EXCLUDED.attached_at,
					detached_at = NULL
			`, definitionID, assetID, animeID, segmentID, strings.TrimSpace(segment.Version)); err != nil {
				return nil, fmt.Errorf("upsert uploaded segment library assignment segment=%d asset=%d: %w", segmentID, assetID, err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit uploaded segment asset anime=%d segment=%d: %w", animeID, segmentID, err)
	}

	return loadSegmentByID(ctx, r, segmentID)
}

// ClearSegmentAsset setzt source_type, source_ref und source_label auf NULL und
// gibt den vorherigen source_ref-Wert zurueck (relativer Pfad des Assets).
func (r *AdminContentRepository) ClearSegmentAsset(ctx context.Context, animeID int64, segmentID int64) (*string, error) {
	if animeID <= 0 || segmentID <= 0 {
		return nil, ErrNotFound
	}

	// Sicherstellen, dass das Segment zum Anime gehoert, und alten source_ref lesen
	seg, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID)
	if err != nil {
		return nil, err
	}
	previousRef := seg.SourceRef

	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segments
		SET source_type = NULL, source_ref = NULL, source_label = NULL
		WHERE id = $1
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("clear segment asset id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	return previousRef, nil
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

	return segments, nil
}

// GetCanonicalFansubAnimeRelease liefert den fruehesten realen Release-Anker fuer Gruppe+Anime.
func (r *AdminContentRepository) GetCanonicalFansubAnimeRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		SELECT fr.id
		FROM fansub_releases fr
		JOIN episodes e ON e.id = fr.episode_id
		WHERE e.anime_id = $2
		  AND EXISTS (
			SELECT 1
			FROM release_versions rv
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE rv.release_id = fr.id
			  AND rvg.fansub_group_id = $1
		  )
		ORDER BY COALESCE(e.sort_index, 2147483647), e.id, fr.id
		LIMIT 1
	`, fansubGroupID, animeID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get canonical fansub anime release fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}

	return &id, nil
}

// GetFansubRelease liefert den kanonischen Release-Anker fuer Gruppe+Anime, falls er existiert.
func (r *AdminContentRepository) GetFansubRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error) {
	return r.GetCanonicalFansubAnimeRelease(ctx, fansubGroupID, animeID)
}

// ListFansubAnime liefert alle Anime, die einer Fansub-Gruppe bereits zugeordnet sind.
func (r *AdminContentRepository) ListFansubAnime(ctx context.Context, fansubGroupID int64) ([]models.AdminFansubAnimeEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT a.id, a.title
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		WHERE afg.fansub_group_id = $1
		ORDER BY a.title ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list fansub anime fansub=%d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]models.AdminFansubAnimeEntry, 0)
	for rows.Next() {
		var item models.AdminFansubAnimeEntry
		if err := rows.Scan(&item.ID, &item.Title); err != nil {
			return nil, fmt.Errorf("scan fansub anime fansub=%d: %w", fansubGroupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub anime fansub=%d: %w", fansubGroupID, err)
	}

	return items, nil
}

// ListReleaseThemeAssets gibt alle Theme-Videos eines Releases mit Theme- und Media-Metadaten zurueck.
func (r *AdminContentRepository) ListReleaseThemeAssets(ctx context.Context, releaseID int64) ([]models.AdminReleaseThemeAsset, error) {
	if releaseID <= 0 {
		return nil, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_releases WHERE id = $1)`, releaseID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("check release existence id=%d: %w", releaseID, err)
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			rta.release_id,
			rta.theme_id,
			tt.name,
			t.title,
			rta.media_id,
			ma.mime_type,
			ma.file_path,
			COALESCE((
				SELECT mf.size
				FROM media_files mf
				WHERE mf.media_id = ma.id
				ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id
				LIMIT 1
			), 0) AS size_bytes,
			rta.created_at
		FROM release_theme_assets rta
		JOIN themes t ON t.id = rta.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		JOIN media_assets ma ON ma.id = rta.media_id
		WHERE rta.release_id = $1
		ORDER BY rta.created_at ASC
	`, releaseID)
	if err != nil {
		return nil, fmt.Errorf("list release theme assets release=%d: %w", releaseID, err)
	}
	defer rows.Close()

	items := make([]models.AdminReleaseThemeAsset, 0)
	for rows.Next() {
		var item models.AdminReleaseThemeAsset
		if err := rows.Scan(
			&item.ReleaseID,
			&item.ThemeID,
			&item.ThemeTypeName,
			&item.ThemeTitle,
			&item.MediaID,
			&item.MimeType,
			&item.PublicURL,
			&item.SizeBytes,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan release theme asset release=%d: %w", releaseID, err)
		}
		item.PublicURL = buildThemeAssetPublicURL(item.PublicURL)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release theme assets release=%d: %w", releaseID, err)
	}

	return items, nil
}

// ListReleaseThemeAssetsByFansubAnime liefert Release-ID und Theme-Videos fuer eine konkrete Fansub-Anime-Kombination.
func (r *AdminContentRepository) ListReleaseThemeAssetsByFansubAnime(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
) (*int64, []models.AdminReleaseThemeAsset, error) {
	releaseID, err := r.GetCanonicalFansubAnimeRelease(ctx, fansubGroupID, animeID)
	if err != nil {
		return nil, nil, err
	}
	if releaseID == nil {
		return nil, []models.AdminReleaseThemeAsset{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			rta.release_id,
			rta.theme_id,
			tt.name,
			t.title,
			rta.media_id,
			ma.mime_type,
			ma.file_path,
			COALESCE((
				SELECT mf.size
				FROM media_files mf
				WHERE mf.media_id = ma.id
				ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id
				LIMIT 1
			), 0) AS size_bytes,
			rta.created_at
		FROM release_theme_assets rta
		JOIN fansub_releases fr ON fr.id = rta.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN themes t ON t.id = rta.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		JOIN media_assets ma ON ma.id = rta.media_id
		WHERE e.anime_id = $2
		  AND EXISTS (
			SELECT 1
			FROM release_versions rv
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE rv.release_id = fr.id
			  AND rvg.fansub_group_id = $1
		  )
		ORDER BY rta.created_at ASC, rta.release_id ASC, rta.media_id ASC
	`, fansubGroupID, animeID)
	if err != nil {
		return nil, nil, fmt.Errorf("list release theme assets by fansub/anime fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}
	defer rows.Close()

	items := make([]models.AdminReleaseThemeAsset, 0)
	for rows.Next() {
		var item models.AdminReleaseThemeAsset
		if err := rows.Scan(
			&item.ReleaseID,
			&item.ThemeID,
			&item.ThemeTypeName,
			&item.ThemeTitle,
			&item.MediaID,
			&item.MimeType,
			&item.PublicURL,
			&item.SizeBytes,
			&item.CreatedAt,
		); err != nil {
			return nil, nil, fmt.Errorf("scan release theme asset by fansub/anime fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
		}
		item.PublicURL = buildThemeAssetPublicURL(item.PublicURL)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate release theme assets by fansub/anime fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}

	return releaseID, items, nil
}

// CreateReleaseThemeAsset legt die Release-Theme-Zuordnung an und liefert den neuen Datensatz zurueck.
func (r *AdminContentRepository) CreateReleaseThemeAsset(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error) {
	var releaseAnimeID int64
	if err := r.db.QueryRow(ctx, `
		SELECT e.anime_id
		FROM fansub_releases fr
		JOIN episodes e ON e.id = fr.episode_id
		WHERE fr.id = $1
	`, input.ReleaseID).Scan(&releaseAnimeID); err != nil {
		return nil, fmt.Errorf("load release anime id release=%d: %w", input.ReleaseID, err)
	}

	var themeAnimeID int64
	if err := r.db.QueryRow(ctx, `SELECT anime_id FROM themes WHERE id = $1`, input.ThemeID).Scan(&themeAnimeID); err != nil {
		return nil, fmt.Errorf("load theme anime id theme=%d: %w", input.ThemeID, err)
	}
	if releaseAnimeID != themeAnimeID {
		return nil, ErrConflict
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO release_theme_assets (release_id, theme_id, media_id)
		VALUES ($1, $2, $3)
	`, input.ReleaseID, input.ThemeID, input.MediaID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && (pgErr.Code == "23503" || pgErr.Code == "23505") {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create release theme asset release=%d theme=%d media=%d: %w", input.ReleaseID, input.ThemeID, input.MediaID, err)
	}

	items, err := r.ListReleaseThemeAssets(ctx, input.ReleaseID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if item.ThemeID == input.ThemeID && item.MediaID == input.MediaID {
			result := item
			return &result, nil
		}
	}

	return nil, ErrNotFound
}

// DeleteReleaseThemeAsset entfernt genau ein Theme-Video eines Releases.
func (r *AdminContentRepository) DeleteReleaseThemeAsset(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM release_theme_assets WHERE release_id = $1 AND theme_id = $2 AND media_id = $3`, releaseID, themeID, mediaID)
	if err != nil {
		return fmt.Errorf("delete release theme asset release=%d theme=%d media=%d: %w", releaseID, themeID, mediaID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func buildThemeAssetPublicURL(filePath string) string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return ""
	}
	filename := filepath.Base(trimmed)
	if filename == "." || filename == string(filepath.Separator) {
		return ""
	}
	return "/api/v1/media/files/" + url.PathEscape(filename)
}
