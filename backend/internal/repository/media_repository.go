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
	"github.com/jackc/pgx/v5/pgxpool"
)

type MediaRepository struct {
	db            *pgxpool.Pool
	publicBaseURL string
}

func NewMediaRepository(db *pgxpool.Pool, publicBaseURL string) *MediaRepository {
	return &MediaRepository{
		db:            db,
		publicBaseURL: strings.TrimRight(strings.TrimSpace(publicBaseURL), "/"),
	}
}

func (r *MediaRepository) CreateMediaAsset(
	ctx context.Context,
	input models.MediaAssetCreateInput,
) (*models.MediaAsset, error) {
	filename := strings.TrimSpace(input.Filename)
	storagePath := strings.TrimSpace(input.StoragePath)
	if filename == "" {
		filename = filepath.Base(storagePath)
	}
	if storagePath == "" || filename == "" {
		return nil, fmt.Errorf("create media asset: filename und storage path sind erforderlich")
	}

	mediaTypeName, err := mediaTypeNameForKind(input.Kind, input.MimeType)
	if err != nil {
		return nil, err
	}

	var mediaTypeID int64
	if err := r.db.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = $1
		LIMIT 1
	`, mediaTypeName).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("create media asset: load media type %q: %w", mediaTypeName, err)
	}

	publicURL := r.buildPublicURL(filename)
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type, format, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, file_path, mime_type, created_at
	`, mediaTypeID, storagePath, input.MimeType, mediaFormatForKind(input.Kind)).Scan(
		&item.ID,
		&item.StoragePath,
		&item.MimeType,
		&item.CreatedAt,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create media asset: %w", err)
	}

	item.Filename = filename
	item.PublicURL = publicURL
	item.SizeBytes = input.SizeBytes
	item.Width = input.Width
	item.Height = input.Height

	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByID(ctx context.Context, mediaID int64) (*models.MediaAsset, error) {
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, file_path, mime_type, created_at
		FROM media_assets
		WHERE id = $1
	`, mediaID).Scan(
		&item.ID,
		&item.StoragePath,
		&item.MimeType,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset %d: %w", mediaID, err)
	}

	item.Filename = filepath.Base(item.StoragePath)
	item.PublicURL = r.buildPublicURL(item.Filename)
	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByFilename(ctx context.Context, filename string) (*models.MediaAsset, error) {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return nil, ErrNotFound
	}

	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, file_path, mime_type, created_at
		FROM media_assets
		WHERE file_path = $1
		   OR file_path LIKE $2
		   OR file_path LIKE $3
		ORDER BY id DESC
		LIMIT 1
	`, trimmed, "%/"+trimmed, "%\\"+trimmed).Scan(
		&item.ID,
		&item.StoragePath,
		&item.MimeType,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset by filename %q: %w", filename, err)
	}

	item.Filename = filepath.Base(item.StoragePath)
	item.PublicURL = r.buildPublicURL(item.Filename)
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

func (r *MediaRepository) buildPublicURL(filename string) string {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return ""
	}
	if r.publicBaseURL == "" {
		return "/api/v1/media/files/" + url.PathEscape(trimmed)
	}
	return r.publicBaseURL + "/api/v1/media/files/" + url.PathEscape(trimmed)
}

func mediaTypeNameForKind(kind models.MediaKind, mimeType string) (string, error) {
	switch kind {
	case models.MediaKindLogo:
		return "logo", nil
	case models.MediaKindBanner:
		return "banner", nil
	case models.MediaKindThemeVideo:
		return "video", nil
	case models.MediaKindSegmentAsset:
		return "video", nil
	default:
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(mimeType)), "video/") {
			return "video", nil
		}
		return "", fmt.Errorf("create media asset: unsupported media kind %q", kind)
	}
}

func mediaFormatForKind(kind models.MediaKind) string {
	switch kind {
	case models.MediaKindThemeVideo, models.MediaKindSegmentAsset:
		return "video"
	default:
		return "image"
	}
}
