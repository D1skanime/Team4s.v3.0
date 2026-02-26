package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MediaRepository struct {
	db *pgxpool.Pool
}

func NewMediaRepository(db *pgxpool.Pool) *MediaRepository {
	return &MediaRepository{db: db}
}

func (r *MediaRepository) CreateMediaAsset(
	ctx context.Context,
	input models.MediaAssetCreateInput,
) (*models.MediaAsset, error) {
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		INSERT INTO media_assets (filename, storage_path, public_url, mime_type, size_bytes, width, height)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, filename, storage_path, public_url, mime_type, size_bytes, width, height, created_at
	`,
		input.Filename,
		input.StoragePath,
		input.PublicURL,
		input.MimeType,
		input.SizeBytes,
		input.Width,
		input.Height,
	).Scan(
		&item.ID,
		&item.Filename,
		&item.StoragePath,
		&item.PublicURL,
		&item.MimeType,
		&item.SizeBytes,
		&item.Width,
		&item.Height,
		&item.CreatedAt,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create media asset: %w", err)
	}

	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByID(ctx context.Context, mediaID int64) (*models.MediaAsset, error) {
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, filename, storage_path, public_url, mime_type, size_bytes, width, height, created_at
		FROM media_assets
		WHERE id = $1
	`, mediaID).Scan(
		&item.ID,
		&item.Filename,
		&item.StoragePath,
		&item.PublicURL,
		&item.MimeType,
		&item.SizeBytes,
		&item.Width,
		&item.Height,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset %d: %w", mediaID, err)
	}

	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByFilename(ctx context.Context, filename string) (*models.MediaAsset, error) {
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, filename, storage_path, public_url, mime_type, size_bytes, width, height, created_at
		FROM media_assets
		WHERE filename = $1
	`, filename).Scan(
		&item.ID,
		&item.Filename,
		&item.StoragePath,
		&item.PublicURL,
		&item.MimeType,
		&item.SizeBytes,
		&item.Width,
		&item.Height,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset by filename %q: %w", filename, err)
	}

	return &item, nil
}

func (r *MediaRepository) DeleteMediaAsset(ctx context.Context, mediaID int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, mediaID)
	if err != nil {
		return fmt.Errorf("delete media asset %d: %w", mediaID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MediaRepository) IsMediaAssetReferenced(ctx context.Context, mediaID int64) (bool, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM fansub_groups
		WHERE logo_id = $1 OR banner_id = $1
	`, mediaID).Scan(&count); err != nil {
		return false, fmt.Errorf("count media references %d: %w", mediaID, err)
	}
	return count > 0, nil
}

func (r *MediaRepository) AssignFansubMedia(
	ctx context.Context,
	fansubID int64,
	kind models.MediaKind,
	mediaID int64,
	publicURL string,
) (*int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin assign fansub media tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var prevLogoID *int64
	var prevBannerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT logo_id, banner_id
		FROM fansub_groups
		WHERE id = $1
		FOR UPDATE
	`, fansubID).Scan(&prevLogoID, &prevBannerID); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("lock fansub %d for media assign: %w", fansubID, err)
	}

	trimmedURL := publicURL
	switch kind {
	case models.MediaKindLogo:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET logo_id = $1, logo_url = $2, updated_at = NOW()
			WHERE id = $3
		`, mediaID, trimmedURL, fansubID); err != nil {
			return nil, fmt.Errorf("assign logo media for fansub %d: %w", fansubID, err)
		}
	case models.MediaKindBanner:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET banner_id = $1, banner_url = $2, updated_at = NOW()
			WHERE id = $3
		`, mediaID, trimmedURL, fansubID); err != nil {
			return nil, fmt.Errorf("assign banner media for fansub %d: %w", fansubID, err)
		}
	default:
		return nil, fmt.Errorf("unsupported media kind %q", kind)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit assign fansub media tx: %w", err)
	}

	if kind == models.MediaKindLogo {
		return prevLogoID, nil
	}
	return prevBannerID, nil
}

func (r *MediaRepository) ClearFansubMedia(
	ctx context.Context,
	fansubID int64,
	kind models.MediaKind,
) (*int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin clear fansub media tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var prevLogoID *int64
	var prevBannerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT logo_id, banner_id
		FROM fansub_groups
		WHERE id = $1
		FOR UPDATE
	`, fansubID).Scan(&prevLogoID, &prevBannerID); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("lock fansub %d for media clear: %w", fansubID, err)
	}

	switch kind {
	case models.MediaKindLogo:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET logo_id = NULL, logo_url = NULL, updated_at = NOW()
			WHERE id = $1
		`, fansubID); err != nil {
			return nil, fmt.Errorf("clear logo media for fansub %d: %w", fansubID, err)
		}
	case models.MediaKindBanner:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET banner_id = NULL, banner_url = NULL, updated_at = NOW()
			WHERE id = $1
		`, fansubID); err != nil {
			return nil, fmt.Errorf("clear banner media for fansub %d: %w", fansubID, err)
		}
	default:
		return nil, fmt.Errorf("unsupported media kind %q", kind)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit clear fansub media tx: %w", err)
	}

	if kind == models.MediaKindLogo {
		return prevLogoID, nil
	}
	return prevBannerID, nil
}
