package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GroupThemesRepository liefert öffentliche Themes (OP/ED/Middle) für eine Gruppe+Anime.
type GroupThemesRepository struct {
	db *pgxpool.Pool
}

// NewGroupThemesRepository erstellt ein neues GroupThemesRepository.
func NewGroupThemesRepository(db *pgxpool.Pool) *GroupThemesRepository {
	return &GroupThemesRepository{db: db}
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

	// Verbindet themes → release_theme_assets → fansub_releases → episodes (anime_id)
	// mit release_version_groups scope auf groupID.
	// Sichtbarkeits-Gate: media_assets.status = 'ready'
	query := `
		SELECT DISTINCT
			t.id AS theme_id,
			t.theme_type,
			COALESCE(t.title, '') AS title,
			rta.id AS asset_id,
			mf.storage_path AS thumbnail_storage_path
		FROM themes t
		JOIN release_theme_assets rta ON rta.theme_id = t.id
		JOIN fansub_releases fr ON fr.id = rta.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_versions rv ON rv.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN media_assets ma ON ma.id = rta.media_asset_id
		LEFT JOIN media_files mf ON mf.media_asset_id = ma.id AND mf.variant = 'thumbnail'
		WHERE e.anime_id = $1
		  AND rvg.fansub_group_id = $2
		  AND ma.status = 'ready'
		ORDER BY t.id, rta.id
	`

	rows, err := r.db.Query(ctx, query, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group themes: query: %w", err)
	}
	defer rows.Close()

	themeIndex := make(map[int64]int)

	for rows.Next() {
		var (
			themeID             int64
			themeType           string
			title               string
			assetID             int64
			thumbnailStoragePath *string
		)
		if err := rows.Scan(&themeID, &themeType, &title, &assetID, &thumbnailStoragePath); err != nil {
			return nil, fmt.Errorf("group themes: scan: %w", err)
		}

		var thumbnailURL *string
		if thumbnailStoragePath != nil && *thumbnailStoragePath != "" {
			url := "/media/" + *thumbnailStoragePath
			thumbnailURL = &url
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
