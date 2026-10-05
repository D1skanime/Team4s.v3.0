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

// GetSegmentReleaseDuration liefert die bekannte Laufzeit (duration_seconds) der aktuellen
// Release-Variante fuer die angegebene Anime/Fansub-Gruppe/Version-Kombination, optional
// gefiltert auf einen Episoden-Bereich (startEpisode/endEpisode, 0 = kein Filter --
// RESEARCH.md Risk 3: die vormals ungefilterte Auflösung konnte eine Variante ausserhalb
// des tatsächlichen Segment-Bereichs liefern). Gibt nil zurueck, wenn keine (im Bereich
// liegende) Variante gefunden wurde oder duration_seconds nicht gesetzt ist.
func (r *AdminContentRepository) GetSegmentReleaseDuration(ctx context.Context, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) (*int32, error) {
	if animeID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	normalizedVersion := strings.TrimSpace(version)
	if normalizedVersion == "" {
		normalizedVersion = "v1"
	}

	var duration *int32
	err := r.db.QueryRow(ctx, `
		SELECT rv.duration_seconds
		FROM release_version_groups rvg
		JOIN release_versions rev ON rev.id = rvg.release_version_id
			AND COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1') = $3
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = $1
		JOIN release_variants rv ON rv.release_version_id = rev.id
		WHERE rvg.fansub_group_id = $2
		  AND ($4 = 0 OR COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END) >= $4)
		  AND ($5 = 0 OR COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END) <= $5)
		ORDER BY rv.duration_seconds IS NOT NULL DESC, rv.id ASC
		LIMIT 1
	`, animeID, fansubGroupID, normalizedVersion, startEpisode, endEpisode).Scan(&duration)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get segment release duration anime=%d group=%d version=%q: %w", animeID, fansubGroupID, version, err)
	}
	return duration, nil
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
		SELECT DISTINCT
			a.id,
			a.title,
			at.name AS anime_type,
			COALESCE(
				NULLIF(BTRIM(a.banner_resolved_url), ''),
				banner.file_path,
				background.file_path
			) AS header_image,
			COALESCE(
				NULLIF(BTRIM(a.cover_resolved_url), ''),
				NULLIF(BTRIM(a.cover_image), ''),
				poster.file_path,
				CASE
					WHEN a.source LIKE 'jellyfin:%' AND BTRIM(REPLACE(a.source, 'jellyfin:', '')) <> ''
					THEN '/api/v1/media/image?item_id=' || BTRIM(REPLACE(a.source, 'jellyfin:', '')) || '&kind=primary&provider=jellyfin'
					ELSE NULL
				END
			) AS cover_image
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		LEFT JOIN anime_types at ON at.id = a.anime_type_id
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'banner'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) banner ON true
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'background'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) background ON true
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'poster'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) poster ON true
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
		var animeType *string
		if err := rows.Scan(&item.ID, &item.Title, &animeType, &item.HeaderImage, &item.CoverImage); err != nil {
			return nil, fmt.Errorf("scan fansub anime fansub=%d: %w", fansubGroupID, err)
		}
		item.Type = mapAnimeTypeNameToAPI(animeType)
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

// HasGlobalThemeSegmentCoverageForRelease meldet, ob ein globales Theme-Segment mit Quelle
// den Episodenanker des Releases bereits abdeckt und damit release-spezifische Uploads sperrt.
func (r *AdminContentRepository) HasGlobalThemeSegmentCoverageForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error) {
	if releaseID <= 0 || themeID <= 0 {
		return false, ErrNotFound
	}

	var covered bool
	if err := r.db.QueryRow(ctx, `
		WITH release_anchor AS (
			SELECT
				COALESCE(
					ep.sort_index,
					CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END
				) AS episode_anchor
			FROM fansub_releases fr
			JOIN episodes ep ON ep.id = fr.episode_id
			WHERE fr.id = $1
		)
		SELECT EXISTS (
			SELECT 1
			FROM release_anchor ra
			JOIN theme_segments ts ON ts.theme_id = $2
			WHERE ra.episode_anchor IS NOT NULL
			  AND ts.fansub_group_id IS NULL
			  AND COALESCE(NULLIF(BTRIM(ts.version), ''), '') = ''
			  AND (ts.start_episode IS NULL OR ts.start_episode <= ra.episode_anchor)
				  AND (ts.end_episode IS NULL OR ts.end_episode >= ra.episode_anchor)
				  AND (
					COALESCE(NULLIF(BTRIM(ts.source_ref), ''), '') <> ''
					OR COALESCE(NULLIF(BTRIM(ts.source_jellyfin_item_id), ''), '') <> ''
					OR COALESCE(NULLIF(BTRIM(ts.source_type), ''), '') IN ('jellyfin_theme')
					OR (
						COALESCE(NULLIF(BTRIM(ts.source_type), ''), '') <> 'release_asset'
						AND COALESCE(NULLIF(BTRIM(ts.source_label), ''), '') <> ''
					)
				  )
			)
		`, releaseID, themeID).Scan(&covered); err != nil {
		return false, fmt.Errorf("check global theme segment coverage release=%d theme=%d: %w", releaseID, themeID, err)
	}

	return covered, nil
}

// HasReleaseAssetSegmentUploadBlockedForRelease meldet, ob ein Release innerhalb
// eines release_asset-Segments liegt, aber nicht dessen Start-Anker ist.
func (r *AdminContentRepository) HasReleaseAssetSegmentUploadBlockedForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error) {
	if releaseID <= 0 || themeID <= 0 {
		return false, ErrNotFound
	}

	var blocked bool
	if err := r.db.QueryRow(ctx, `
		WITH release_context AS (
			SELECT
				COALESCE(
					ep.sort_index,
					CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END
				) AS episode_anchor,
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT rvg.fansub_group_id), NULL) AS fansub_group_ids
			FROM fansub_releases fr
			JOIN episodes ep ON ep.id = fr.episode_id
			LEFT JOIN release_versions rv ON rv.release_id = fr.id
			LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE fr.id = $1
			GROUP BY ep.sort_index, ep.episode_number
		)
		SELECT EXISTS (
			SELECT 1
			FROM release_context rc
			JOIN theme_segments ts ON ts.theme_id = $2
			WHERE rc.episode_anchor IS NOT NULL
			  AND ts.source_type = 'release_asset'
			  AND (ts.start_episode IS NULL OR ts.start_episode <= rc.episode_anchor)
			  AND (ts.end_episode IS NULL OR ts.end_episode >= rc.episode_anchor)
			  AND (ts.fansub_group_id IS NULL OR ts.fansub_group_id = ANY(rc.fansub_group_ids))
			  AND (ts.start_episode IS NULL OR ts.start_episode <> rc.episode_anchor)
		)
	`, releaseID, themeID).Scan(&blocked); err != nil {
		return false, fmt.Errorf("check release asset theme segment upload lock release=%d theme=%d: %w", releaseID, themeID, err)
	}

	return blocked, nil
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
