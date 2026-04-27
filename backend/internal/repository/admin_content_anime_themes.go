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
			&seg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan anime segment anime=%d: %w", animeID, err)
		}
		segments = append(segments, seg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime segments anime=%d: %w", animeID, err)
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
	err := r.db.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id)
		VALUES ($1, $2, $3, $4, $5, $6::interval, $7::interval, $8)
		RETURNING id
	`, input.ThemeID, input.FansubGroupID, input.Version, input.StartEpisode, input.EndEpisode,
		input.StartTime, input.EndTime, input.SourceJellyfinItemID).Scan(&segID)
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

	// Vollstaendigen Datensatz per SELECT laden
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
		&seg.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("reload created anime segment id=%d: %w", segID, err)
	}

	return &seg, nil
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
		setClauses = append(setClauses, fmt.Sprintf("source_jellyfin_item_id = $%d", argIdx))
		args = append(args, *input.SourceJellyfinItemID)
		argIdx++
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
