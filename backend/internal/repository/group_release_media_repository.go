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

	// Joins release_version_media -> release_versions -> fansub_releases -> episodes
	// and scopes the version through release_version_groups.fansub_group_id.
	query := `
		SELECT
			rvm.id AS item_id,
			COALESCE(mt.name, ma.mime_type, 'media') AS media_type,
			rvm.caption,
			COALESCE(mf_thumb.path, mf_orig.path, ma.file_path) AS thumbnail_path
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE e.anime_id = $1
		  AND rvg.fansub_group_id = $2
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		ORDER BY rvm.sort_order ASC, rvm.id ASC
	`

	rows, err := r.db.Query(ctx, query, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group release media: query: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			item          PublicReleaseMediaItem
			thumbnailPath *string
		)
		if err := rows.Scan(
			&item.ID,
			&item.MediaType,
			&item.Caption,
			&thumbnailPath,
		); err != nil {
			return nil, fmt.Errorf("group release media: scan: %w", err)
		}

		if thumbnailPath != nil {
			item.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}

		resp.Items = append(resp.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("group release media: iterate: %w", err)
	}

	return resp, nil
}
