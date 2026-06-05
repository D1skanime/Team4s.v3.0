package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GroupReleaseMediaRepository liefert öffentliche Release-Version-Medien für eine Gruppe+Anime.
type GroupReleaseMediaRepository struct {
	db              *pgxpool.Pool
	mediaStorageDir string
}

// NewGroupReleaseMediaRepository erstellt ein neues GroupReleaseMediaRepository.
// mediaStorageDir wird für die URL-Auflösung von Thumbnails verwendet.
func NewGroupReleaseMediaRepository(db *pgxpool.Pool, mediaStorageDir string) *GroupReleaseMediaRepository {
	return &GroupReleaseMediaRepository{db: db, mediaStorageDir: mediaStorageDir}
}

// --- DTOs ---

// PublicReleaseMediaItem ist ein einzelnes öffentliches Release-Version-Medium.
type PublicReleaseMediaItem struct {
	ID           int64   `json:"id"`
	ThumbnailURL *string `json:"thumbnail_url"`
	Caption      *string `json:"caption"`
	MediaType    string  `json:"media_type"`
}

// GroupReleaseMediaResponse ist die Antwort für GET /anime/:id/group/:groupId/release-media.
type GroupReleaseMediaResponse struct {
	Items []PublicReleaseMediaItem `json:"items"`
}

// GetPublicReleaseMedia gibt öffentliche release_version_media zurück für alle
// Release-Versionen dieser Gruppe+Anime.
// Sichtbarkeits-Gate: nur media_assets mit status='ready' (Phase-72-Fallback per RESEARCH Befund 4).
// Items-Slice ist niemals nil — leerer Slice bei keinen sichtbaren Medien (D-15).
func (r *GroupReleaseMediaRepository) GetPublicReleaseMedia(ctx context.Context, animeID, groupID int64) (*GroupReleaseMediaResponse, error) {
	resp := &GroupReleaseMediaResponse{
		Items: make([]PublicReleaseMediaItem, 0),
	}

	// Verbindet release_version_media → release_versions → fansub_releases → episodes (anime_id)
	// + release_version_groups scope auf groupID.
	// Sichtbarkeits-Gate: media_assets.status = 'ready'
	query := `
		SELECT
			rvm.id AS item_id,
			ma.media_type,
			rvm.caption,
			mf.storage_path AS thumbnail_storage_path
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_files mf ON mf.media_asset_id = ma.id AND mf.variant = 'thumbnail'
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE e.anime_id = $1
		  AND rvg.fansub_group_id = $2
		  AND ma.status = 'ready'
		ORDER BY rvm.sort_order ASC, rvm.id ASC
	`

	rows, err := r.db.Query(ctx, query, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group release media: query: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			item                 PublicReleaseMediaItem
			thumbnailStoragePath *string
		)
		if err := rows.Scan(
			&item.ID,
			&item.MediaType,
			&item.Caption,
			&thumbnailStoragePath,
		); err != nil {
			return nil, fmt.Errorf("group release media: scan: %w", err)
		}

		if thumbnailStoragePath != nil && *thumbnailStoragePath != "" {
			url := "/media/" + *thumbnailStoragePath
			item.ThumbnailURL = &url
		}

		resp.Items = append(resp.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("group release media: iterate: %w", err)
	}

	return resp, nil
}
