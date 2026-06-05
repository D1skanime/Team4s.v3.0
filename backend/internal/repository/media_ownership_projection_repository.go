package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MediaOwnershipRow is one read-only media ownership projection row.
type MediaOwnershipRow struct {
	ID                int64   `json:"id"`
	OwnerType         string  `json:"owner_type"`
	OwnerID           int64   `json:"owner_id"`
	MediaCategory     string  `json:"media_category"`
	Visibility        *string `json:"visibility"`
	ReviewStatus      *string `json:"review_status"`
	ReviewStatusLabel *string `json:"review_status_label"`
	FilePath          string  `json:"file_path"`
	OriginalFilePath  *string `json:"original_file_path"`
	Caption           *string `json:"caption"`
	MimeType          string  `json:"mime_type"`
}

// MediaOwnershipProjectionRepository reads media ownership rows across canonical junction contexts.
type MediaOwnershipProjectionRepository struct {
	db *pgxpool.Pool
}

// NewMediaOwnershipProjectionRepository creates a new media ownership projection repository.
func NewMediaOwnershipProjectionRepository(db *pgxpool.Pool) *MediaOwnershipProjectionRepository {
	return &MediaOwnershipProjectionRepository{db: db}
}

// GetMediaOwnershipProjection returns media assets for a supported owner context.
// It composes owner_type and owner_id from the owning junction instead of reading a
// central owner-type column from media_assets.
func (r *MediaOwnershipProjectionRepository) GetMediaOwnershipProjection(
	ctx context.Context,
	ownerType string,
	ownerID int64,
) ([]MediaOwnershipRow, error) {
	rows, err := r.db.Query(ctx, `
		WITH projected AS (
			SELECT
				ma.id,
				'member'::text AS owner_type,
				ma.owner_member_id AS owner_id,
				COALESCE(mt.name, 'member_media') AS media_category,
				v.name AS visibility,
				rs.code AS review_status,
				rs.label_de AS review_status_label,
				ma.file_path,
				mf.path AS original_file_path,
				ma.caption,
				ma.mime_type
			FROM media_assets ma
			LEFT JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN media_files mf ON mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL)
			LEFT JOIN visibilities v ON v.id = ma.visibility_id
			LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE $1 = 'member'
			  AND ma.owner_member_id = $2

			UNION ALL

			SELECT
				ma.id,
				'fansub_group'::text AS owner_type,
				fgm.group_id AS owner_id,
				COALESCE(mt.name, 'group_media') AS media_category,
				v.name AS visibility,
				rs.code AS review_status,
				rs.label_de AS review_status_label,
				ma.file_path,
				mf.path AS original_file_path,
				ma.caption,
				ma.mime_type
			FROM fansub_group_media fgm
			JOIN media_assets ma ON ma.id = fgm.media_id
			LEFT JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN media_files mf ON mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL)
			LEFT JOIN visibilities v ON v.id = ma.visibility_id
			LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE $1 = 'fansub_group'
			  AND fgm.group_id = $2

			UNION ALL

			SELECT
				ma.id,
				'release_version'::text AS owner_type,
				rvm.release_version_id AS owner_id,
				rvm.category AS media_category,
				v.name AS visibility,
				rs.code AS review_status,
				rs.label_de AS review_status_label,
				ma.file_path,
				mf.path AS original_file_path,
				ma.caption,
				ma.mime_type
			FROM release_version_media rvm
			JOIN media_assets ma ON ma.id = rvm.media_asset_id
			LEFT JOIN media_files mf ON mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL)
			LEFT JOIN visibilities v ON v.id = ma.visibility_id
			LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE $1 = 'release_version'
			  AND rvm.release_version_id = $2
			  AND rvm.deleted_at IS NULL

			UNION ALL

			SELECT
				ma.id,
				'release_theme'::text AS owner_type,
				rta.theme_id AS owner_id,
				'release_theme_asset'::text AS media_category,
				v.name AS visibility,
				rs.code AS review_status,
				rs.label_de AS review_status_label,
				ma.file_path,
				mf.path AS original_file_path,
				ma.caption,
				ma.mime_type
			FROM release_theme_assets rta
			JOIN media_assets ma ON ma.id = rta.media_id
			LEFT JOIN media_files mf ON mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL)
			LEFT JOIN visibilities v ON v.id = ma.visibility_id
			LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE $1 = 'release_theme'
			  AND rta.theme_id = $2
		)
		SELECT
			id, owner_type, owner_id, media_category, visibility, review_status,
			review_status_label, file_path, original_file_path, caption, mime_type
		FROM projected
		WHERE visibility = 'public'
		  AND review_status = 'approved'
		ORDER BY media_category ASC, id ASC
	`, ownerType, ownerID)
	if err != nil {
		return nil, fmt.Errorf("media ownership projection: query: %w", err)
	}
	defer rows.Close()

	result := make([]MediaOwnershipRow, 0)
	for rows.Next() {
		var row MediaOwnershipRow
		if err := rows.Scan(
			&row.ID,
			&row.OwnerType,
			&row.OwnerID,
			&row.MediaCategory,
			&row.Visibility,
			&row.ReviewStatus,
			&row.ReviewStatusLabel,
			&row.FilePath,
			&row.OriginalFilePath,
			&row.Caption,
			&row.MimeType,
		); err != nil {
			return nil, fmt.Errorf("media ownership projection: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("media ownership projection: iterate: %w", err)
	}

	return result, nil
}
