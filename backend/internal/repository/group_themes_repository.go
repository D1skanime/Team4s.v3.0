package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GroupThemesRepository liefert öffentliche Themes (OP/ED/Middle) für eine Gruppe+Anime.
type GroupThemesRepository struct {
	db              *pgxpool.Pool
	mediaStorageDir string
}

// NewGroupThemesRepository erstellt ein neues GroupThemesRepository.
func NewGroupThemesRepository(db *pgxpool.Pool, mediaStorageDir ...string) *GroupThemesRepository {
	storageDir := ""
	if len(mediaStorageDir) > 0 {
		storageDir = mediaStorageDir[0]
	}
	return &GroupThemesRepository{db: db, mediaStorageDir: storageDir}
}

// --- DTOs ---

// PublicThemeAsset ist ein sichtbares Asset eines Themes.
type PublicThemeAsset struct {
	ID           int64   `json:"id"`
	ThumbnailURL *string `json:"thumbnail_url"`
}

// PublicGroupTheme ist ein einzelnes Theme (OP/ED/Middle) mit sichtbaren Assets.
type PublicGroupTheme struct {
	ID        int64              `json:"id"`
	ThemeType string             `json:"type"`
	Title     string             `json:"title"`
	Assets    []PublicThemeAsset `json:"assets"`
}

// GroupThemesResponse ist die Antwort für GET /anime/:id/group/:groupId/themes.
type GroupThemesResponse struct {
	Themes []PublicGroupTheme `json:"themes"`
}

// GetPublicGroupThemes gibt Themes zurück, die mit Releases dieser Gruppe+Anime verknüpft sind.
// Sichtbarkeits-Gate: nur media_assets mit status='ready' (Phase-72-Fallback per RESEARCH Befund 3).
// Themes-Slice ist niemals nil (leerer Slice bei keinen Daten).
func (r *GroupThemesRepository) GetPublicGroupThemes(ctx context.Context, animeID, groupID int64) (*GroupThemesResponse, error) {
	resp := &GroupThemesResponse{
		Themes: make([]PublicGroupTheme, 0),
	}

	// Joins themes -> release_theme_assets -> fansub_releases -> episodes and
	// scopes the release through release_version_groups.fansub_group_id.
	query := `
		SELECT DISTINCT
			t.id AS theme_id,
			CASE tt.name
				WHEN 'opening' THEN 'OP'
				WHEN 'ending' THEN 'ED'
				WHEN 'insert_song' THEN 'MIDDLE'
				ELSE UPPER(tt.name)
			END AS theme_type,
			COALESCE(t.title, '') AS title,
			ma.id AS asset_id,
			COALESCE(mf_thumb.path, mf_orig.path, ma.file_path) AS thumbnail_path
		FROM themes t
		JOIN theme_types tt ON tt.id = t.theme_type_id
		JOIN release_theme_assets rta ON rta.theme_id = t.id
		JOIN fansub_releases fr ON fr.id = rta.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_versions rv ON rv.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN media_assets ma ON ma.id = rta.media_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE e.anime_id = $1
		  AND rvg.fansub_group_id = $2
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		ORDER BY t.id, ma.id
	`

	rows, err := r.db.Query(ctx, query, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group themes: query: %w", err)
	}
	defer rows.Close()

	themeIndex := make(map[int64]int)

	for rows.Next() {
		var (
			themeID       int64
			themeType     string
			title         string
			assetID       int64
			thumbnailPath *string
		)
		if err := rows.Scan(&themeID, &themeType, &title, &assetID, &thumbnailPath); err != nil {
			return nil, fmt.Errorf("group themes: scan: %w", err)
		}

		var thumbnailURL *string
		if thumbnailPath != nil {
			thumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}

		asset := PublicThemeAsset{
			ID:           assetID,
			ThumbnailURL: thumbnailURL,
		}

		idx, ok := themeIndex[themeID]
		if !ok {
			resp.Themes = append(resp.Themes, PublicGroupTheme{
				ID:        themeID,
				ThemeType: themeType,
				Title:     title,
				Assets:    make([]PublicThemeAsset, 0),
			})
			idx = len(resp.Themes) - 1
			themeIndex[themeID] = idx
		}
		resp.Themes[idx].Assets = append(resp.Themes[idx].Assets, asset)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("group themes: iterate: %w", err)
	}

	return resp, nil
}
