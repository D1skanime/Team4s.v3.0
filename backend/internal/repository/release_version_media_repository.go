package repository

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// ErrOwnershipMismatch is returned when relation IDs exist but belong to a different release version.
var ErrOwnershipMismatch = errors.New("ownership mismatch")

// ReleaseVersionMediaCreateInput holds the data required to create a release_version_media row.
type ReleaseVersionMediaCreateInput struct {
	ReleaseVersionID   int64
	MediaAssetID       int64
	Category           string
	Caption            *string
	SortOrder          int
	IsPreviewCandidate bool
	UploadedByUserID   *int64
}

// ReleaseVersionMediaPatchInput holds the patchable fields for a release_version_media row.
// A nil pointer means "do not change this field".
// CaptionSet=true with Caption=nil means explicitly clear the caption to NULL.
// Visibility and ReviewStatus target media_assets (the owner row) — nil = do not change (D-05/Lock G).
type ReleaseVersionMediaPatchInput struct {
	Caption            *string
	CaptionSet         bool
	IsPreviewCandidate *bool
	// Review-Felder (Phase 78, additiv): nur gesetzt wenn Key im Request vorhanden war.
	Visibility   *string // kanonischer API-Wert (intern/oeffentlich), nil = nicht ändern
	ReviewStatus *string // kanonischer API-Wert (in_pruefung/...), nil = nicht ändern
}

// ReleaseVersionMediaReorderItem pairs a relation ID with its new sort_order.
type ReleaseVersionMediaReorderItem struct {
	RelationID int64
	SortOrder  int
}

// ReleaseVersionMediaItem is the read model returned by ListReleaseVersionMedia.
// OriginalFilePath and ThumbFilePath are storage-relative paths populated by the JOIN query.
// The handler is responsible for converting them to ThumbnailURL and OriginalURL.
type ReleaseVersionMediaItem struct {
	ID                 int64      `json:"id"`
	ReleaseVersionID   int64      `json:"release_version_id"`
	MediaAssetID       int64      `json:"media_asset_id"`
	Category           string     `json:"category"`
	Caption            *string    `json:"caption"`
	SortOrder          int        `json:"sort_order"`
	IsPreviewCandidate bool       `json:"is_preview_candidate"`
	UploadedByUserID   *int64     `json:"uploaded_by_user_id"`
	Visibility         *string    `json:"visibility,omitempty"`
	ReviewStatus       *string    `json:"review_status,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          *time.Time `json:"updated_at,omitempty"`
	OriginalFilePath   string     `json:"-"` // storage path of the original file (from media_files JOIN)
	ThumbFilePath      string     `json:"-"` // storage path of the thumb file (from media_files JOIN)
	// Populated by handler from OriginalFilePath / ThumbFilePath:
	ThumbnailURL string `json:"thumbnail_url"`
	OriginalURL  string `json:"original_url"`
}

// ReleaseVersionMediaRelationMeta holds the owning release_version_id and category for one relation.
type ReleaseVersionMediaRelationMeta struct {
	RelationID       int64
	ReleaseVersionID int64
	Category         string
	UploadedByUserID *int64
}

// BeginTx starts a new database transaction on the MediaRepository pool.
// Follows the MediaUploadRepoTx encapsulation pattern from media_upload.go:
// the pool is the single source of truth; the caller is responsible for
// calling defer tx.Rollback(ctx) and tx.Commit(ctx).
// Used by handlers that need per-file or multi-step transactions.
func (r *MediaRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin rvm transaction: %w", err)
	}
	return tx, nil
}

// CreateReleaseVersionMediaAsset inserts a release_version_media row and returns the new relation ID.
// The caller is responsible for managing the transaction (begin, commit, rollback).
func (r *MediaRepository) CreateReleaseVersionMediaAsset(
	ctx context.Context,
	tx pgx.Tx,
	input ReleaseVersionMediaCreateInput,
) (int64, error) {
	var uploadedByUserID interface{}
	if input.UploadedByUserID != nil {
		uploadedByUserID = *input.UploadedByUserID
	}

	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO release_version_media
			(release_version_id, media_asset_id, category, caption, sort_order,
			 is_preview_candidate, uploaded_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM users WHERE id = $7), NOW())
		RETURNING id
	`, input.ReleaseVersionID, input.MediaAssetID, input.Category, input.Caption,
		input.SortOrder, input.IsPreviewCandidate, uploadedByUserID,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("create release_version_media: %w", err)
	}
	return id, nil
}

// CreateMediaAssetWithStatusTx mirrors CreateMediaAssetWithStatus but writes inside the caller transaction.
// Upload handlers must use this method instead of a pool-level insert so rollback removes the asset row too
// if later media_files or release_version_media writes fail.
func (r *MediaRepository) CreateMediaAssetWithStatusTx(
	ctx context.Context,
	tx pgx.Tx,
	input models.MediaAssetCreateInput,
	status string,
) (*models.MediaAsset, error) {
	mediaTypeName, err := mediaTypeNameForKind(input.Kind, input.MimeType)
	if err != nil {
		return nil, err
	}
	var mediaTypeID int64
	if err := tx.QueryRow(ctx,
		`SELECT id FROM media_types WHERE name = $1 LIMIT 1`, mediaTypeName,
	).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("create media asset with status tx: load media type %q: %w", mediaTypeName, err)
	}
	filename := strings.TrimSpace(input.Filename)
	if filename == "" {
		filename = filepath.Base(input.StoragePath)
	}
	var item models.MediaAsset
	if input.VisibilityCode != nil && input.ReviewStatusCode != nil {
		// Sub-SELECT-INSERT: visibility_id und review_status_id per Lookup-Tabellen aufgelöst (Lock K)
		if err := tx.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format, status,
				visibility_id, review_status_id, created_at)
			VALUES ($1, $2, $3, $4, $5,
				(SELECT id FROM visibilities WHERE name = $6 LIMIT 1),
				(SELECT id FROM review_statuses WHERE code = $7 LIMIT 1),
				NOW())
			RETURNING id, file_path, mime_type, created_at
		`, mediaTypeID, input.StoragePath, input.MimeType, mediaFormatForKind(input.Kind), status,
			*input.VisibilityCode, *input.ReviewStatusCode).Scan(
			&item.ID, &item.StoragePath, &item.MimeType, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("create media asset with status tx: %w", err)
		}
	} else {
		if err := tx.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format, status, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
			RETURNING id, file_path, mime_type, created_at
		`, mediaTypeID, input.StoragePath, input.MimeType, mediaFormatForKind(input.Kind), status).Scan(
			&item.ID, &item.StoragePath, &item.MimeType, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("create media asset with status tx: %w", err)
		}
	}
	item.Filename = filename
	item.SizeBytes = input.SizeBytes
	return &item, nil
}

// UpdateMediaAssetStatusRVMTx updates media_assets.status for a single asset inside the caller tx.
// Handlers use this before COMMIT so "ready" is never returned unless the status write commits too.
func (r *MediaRepository) UpdateMediaAssetStatusRVMTx(ctx context.Context, tx pgx.Tx, assetID int64, status string) error {
	_, err := tx.Exec(ctx, `UPDATE media_assets SET status = $1 WHERE id = $2`, status, assetID)
	if err != nil {
		return fmt.Errorf("update media_assets status for %d: %w", assetID, err)
	}
	return nil
}

// UpdateMediaFileStatusRVMTx updates media_files.status for all files belonging to a media asset inside tx.
func (r *MediaRepository) UpdateMediaFileStatusRVMTx(ctx context.Context, tx pgx.Tx, assetID int64, status string) error {
	_, err := tx.Exec(ctx, `UPDATE media_files SET status = $1 WHERE media_id = $2`, status, assetID)
	if err != nil {
		return fmt.Errorf("update media_files status for asset %d: %w", assetID, err)
	}
	return nil
}

// ListReleaseVersionMedia returns all non-deleted media for a release version, ordered by sort_order ASC.
// Joins media_files to populate OriginalFilePath and ThumbFilePath for URL building by the handler.
func (r *MediaRepository) ListReleaseVersionMedia(
	ctx context.Context,
	releaseVersionID int64,
) ([]ReleaseVersionMediaItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvm.id,
			rvm.release_version_id,
			rvm.media_asset_id,
			rvm.category,
			rvm.caption,
			rvm.sort_order,
			rvm.is_preview_candidate,
			rvm.uploaded_by_user_id,
			v.name,
			rs.code,
			rvm.created_at,
			rvm.updated_at,
			COALESCE(mf_orig.path, ''),
			COALESCE(mf_thumb.path, '')
		FROM release_version_media rvm
		LEFT JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN visibilities v ON v.id = ma.visibility_id
		LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
		LEFT JOIN media_files mf_orig  ON mf_orig.media_id  = rvm.media_asset_id AND mf_orig.variant  = 'original'
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb'
		WHERE rvm.release_version_id = $1
		  AND rvm.deleted_at IS NULL
		ORDER BY rvm.sort_order ASC, rvm.id ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("list release_version_media for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var items []ReleaseVersionMediaItem
	for rows.Next() {
		var item ReleaseVersionMediaItem
		var visibilityName *string
		var reviewStatusCode *string
		if err := rows.Scan(
			&item.ID, &item.ReleaseVersionID, &item.MediaAssetID,
			&item.Category, &item.Caption, &item.SortOrder,
			&item.IsPreviewCandidate, &item.UploadedByUserID,
			&visibilityName, &reviewStatusCode,
			&item.CreatedAt, &item.UpdatedAt,
			&item.OriginalFilePath, &item.ThumbFilePath,
		); err != nil {
			return nil, fmt.Errorf("scan release_version_media row: %w", err)
		}
		if visibilityName != nil {
			trimmed := strings.TrimSpace(*visibilityName)
			if apiVal, ok := visibilityDBToAPI[trimmed]; ok {
				item.Visibility = &apiVal
			} else if trimmed != "" {
				item.Visibility = &trimmed
			}
		}
		if reviewStatusCode != nil {
			trimmed := strings.TrimSpace(*reviewStatusCode)
			if apiVal, ok := reviewStatusDBToAPI[trimmed]; ok {
				item.ReviewStatus = &apiVal
			} else if trimmed != "" {
				item.ReviewStatus = &trimmed
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release_version_media rows: %w", err)
	}
	return items, nil
}

// PatchReleaseVersionMedia updates caption and/or is_preview_candidate for a relation.
// Category cannot be changed (enforced by handler before calling this).
// Uses a transaction so the caller can combine with ClearPreviewCandidateForVersion.
func (r *MediaRepository) PatchReleaseVersionMedia(
	ctx context.Context,
	tx pgx.Tx,
	relationID int64,
	input ReleaseVersionMediaPatchInput,
) error {
	tag, err := tx.Exec(ctx, `
		UPDATE release_version_media
		SET
			caption              = CASE WHEN $2 THEN $3 ELSE caption END,
			is_preview_candidate = COALESCE($4, is_preview_candidate),
			updated_at           = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
	`, relationID, input.CaptionSet, input.Caption, input.IsPreviewCandidate)
	if err != nil {
		return fmt.Errorf("patch release_version_media %d: %w", relationID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SoftDeleteReleaseVersionMedia marks a relation as deleted without removing the media_asset row.
// The media_asset is retained (ON DELETE RESTRICT prevents removal while the soft-deleted row exists).
func (r *MediaRepository) SoftDeleteReleaseVersionMedia(
	ctx context.Context,
	relationID int64,
	deletedByUserID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE release_version_media
		SET deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id = $2)
		WHERE id = $1
		  AND deleted_at IS NULL
	`, relationID, deletedByUserID)
	if err != nil {
		return fmt.Errorf("soft delete release_version_media %d: %w", relationID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ReorderReleaseVersionMedia updates sort_order for a list of relation IDs in a single transaction.
// The caller provides the full ordered list; this method does NOT validate ownership.
func (r *MediaRepository) ReorderReleaseVersionMedia(
	ctx context.Context,
	tx pgx.Tx,
	items []ReleaseVersionMediaReorderItem,
) error {
	for _, item := range items {
		_, err := tx.Exec(ctx, `
			UPDATE release_version_media
			SET sort_order = $2, updated_at = NOW()
			WHERE id = $1 AND deleted_at IS NULL
		`, item.RelationID, item.SortOrder)
		if err != nil {
			return fmt.Errorf("reorder release_version_media %d: %w", item.RelationID, err)
		}
	}
	return nil
}

// ClearPreviewCandidateForVersion sets is_preview_candidate=false for all non-deleted relations
// of a release_version except the one identified by excludeRelationID.
// Must be called inside a transaction before setting a new preview candidate.
// Enforces the max-one-preview rule (D-15).
func (r *MediaRepository) ClearPreviewCandidateForVersion(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	excludeRelationID int64,
) error {
	_, err := tx.Exec(ctx, `
		UPDATE release_version_media
		SET is_preview_candidate = false, updated_at = NOW()
		WHERE release_version_id = $1
		  AND id != $2
		  AND deleted_at IS NULL
		  AND is_preview_candidate = true
	`, releaseVersionID, excludeRelationID)
	if err != nil {
		return fmt.Errorf("clear preview candidate for version %d (exclude %d): %w",
			releaseVersionID, excludeRelationID, err)
	}
	return nil
}

// CreateMediaAssetWithStatus creates a media_asset with an explicit status.
// Used by the release-version-media upload flow which requires 'processing' as initial status.
// This is a variant of CreateMediaAsset that includes status in the INSERT.
// input.Kind must be a valid MediaKind — mediaTypeNameForKind will return an error otherwise.
func (r *MediaRepository) CreateMediaAssetWithStatus(
	ctx context.Context,
	input models.MediaAssetCreateInput,
	status string,
) (*models.MediaAsset, error) {
	mediaTypeName, err := mediaTypeNameForKind(input.Kind, input.MimeType)
	if err != nil {
		return nil, err
	}
	var mediaTypeID int64
	if err := r.db.QueryRow(ctx,
		`SELECT id FROM media_types WHERE name = $1 LIMIT 1`, mediaTypeName,
	).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("create media asset with status: load media type %q: %w", mediaTypeName, err)
	}
	filename := strings.TrimSpace(input.Filename)
	if filename == "" {
		filename = filepath.Base(input.StoragePath)
	}
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type, format, status, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, file_path, mime_type, created_at
	`, mediaTypeID, input.StoragePath, input.MimeType, mediaFormatForKind(input.Kind), status).Scan(
		&item.ID, &item.StoragePath, &item.MimeType, &item.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("create media asset with status: %w", err)
	}
	item.Filename = filename
	item.SizeBytes = input.SizeBytes
	return &item, nil
}

// InsertMediaFileWithStatus inserts a media_files row with an explicit status column.
// Requires a transaction (tx) — caller commits after all files are inserted.
func (r *MediaRepository) InsertMediaFileWithStatus(
	ctx context.Context,
	tx pgx.Tx,
	mediaID int64,
	variant string,
	path string,
	width int,
	height int,
	size int64,
	status string,
) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO media_files (media_id, variant, path, width, height, size, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, mediaID, variant, path, width, height, size, status)
	if err != nil {
		return fmt.Errorf("insert media file with status for asset %d: %w", mediaID, err)
	}
	return nil
}

// GetMaxRVMSortOrder returns the current maximum sort_order for a release_version's media.
// Returns 0 if no media exists for the version. Used by upload handler to assign sequential sort_order.
func (r *MediaRepository) GetMaxRVMSortOrder(ctx context.Context, releaseVersionID int64) (int, error) {
	var maxOrder int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(sort_order), 0)
		FROM release_version_media
		WHERE release_version_id = $1 AND deleted_at IS NULL
	`, releaseVersionID).Scan(&maxOrder)
	if err != nil {
		return 0, fmt.Errorf("get max sort_order for version %d: %w", releaseVersionID, err)
	}
	return maxOrder, nil
}

// ReleaseVersionExistsForRVM checks if a release_version row exists.
// Used by upload handler to return RELEASE_VERSION_NOT_FOUND before processing files.
func (r *MediaRepository) ReleaseVersionExistsForRVM(ctx context.Context, versionID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM release_versions WHERE id = $1)`, versionID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check release_version exists %d: %w", versionID, err)
	}
	return exists, nil
}

// GetRVMCategory returns the category of a non-deleted release_version_media relation.
// Used by the PATCH handler to enforce preview category rules (D-16).
// Returns ErrNotFound if the relation does not exist or is soft-deleted.
func (r *MediaRepository) GetRVMCategory(ctx context.Context, relationID int64) (string, error) {
	var category string
	err := r.db.QueryRow(ctx, `
		SELECT category FROM release_version_media
		WHERE id = $1 AND deleted_at IS NULL
	`, relationID).Scan(&category)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get rvm category %d: %w", relationID, err)
	}
	return category, nil
}

// GetReleaseVersionMediaRelation returns the owning release_version_id and category for one non-deleted relation.
// Used by PATCH and DELETE to validate that route relationId belongs to route versionId before side effects run.
func (r *MediaRepository) GetReleaseVersionMediaRelation(ctx context.Context, relationID int64) (*ReleaseVersionMediaRelationMeta, error) {
	var meta ReleaseVersionMediaRelationMeta
	err := r.db.QueryRow(ctx, `
		SELECT id, release_version_id, category, uploaded_by_user_id
		FROM release_version_media
		WHERE id = $1 AND deleted_at IS NULL
	`, relationID).Scan(&meta.RelationID, &meta.ReleaseVersionID, &meta.Category, &meta.UploadedByUserID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get release_version_media relation %d: %w", relationID, err)
	}
	return &meta, nil
}

// ValidateReleaseVersionMediaOwnership ensures all provided relation IDs belong to the routed release version
// and are not soft-deleted. Used by REORDER before any UPDATE runs.
func (r *MediaRepository) ValidateReleaseVersionMediaOwnership(ctx context.Context, releaseVersionID int64, relationIDs []int64) error {
	if len(relationIDs) == 0 {
		return nil
	}
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media
		WHERE release_version_id = $1
		  AND id = ANY($2)
		  AND deleted_at IS NULL
	`, releaseVersionID, relationIDs).Scan(&count)
	if err != nil {
		return fmt.Errorf("validate rvm ownership for version %d: %w", releaseVersionID, err)
	}
	if count == int64(len(relationIDs)) {
		return nil
	}
	// Some IDs are missing or belong to a different version — check which case.
	var totalCount int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media
		WHERE id = ANY($1)
		  AND deleted_at IS NULL
	`, relationIDs).Scan(&totalCount); err != nil {
		return fmt.Errorf("validate rvm ownership total count for version %d: %w", releaseVersionID, err)
	}
	if totalCount < int64(len(relationIDs)) {
		return ErrNotFound
	}
	return ErrOwnershipMismatch
}

// ValidateReleaseVersionMediaUploader ensures all provided relation IDs belong to the routed release version
// and were uploaded by the current legacy user. Used by contributor-scoped reorder requests.
func (r *MediaRepository) ValidateReleaseVersionMediaUploader(ctx context.Context, releaseVersionID int64, relationIDs []int64, uploadedByUserID int64) error {
	if len(relationIDs) == 0 {
		return nil
	}
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media
		WHERE release_version_id = $1
		  AND id = ANY($2)
		  AND uploaded_by_user_id = $3
		  AND deleted_at IS NULL
	`, releaseVersionID, relationIDs, uploadedByUserID).Scan(&count)
	if err != nil {
		return fmt.Errorf("validate rvm uploader for version %d: %w", releaseVersionID, err)
	}
	if count == int64(len(relationIDs)) {
		return nil
	}
	return ErrOwnershipMismatch
}
