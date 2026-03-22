package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MediaUploadRepo interface for dependency injection and testing
type MediaUploadRepo interface {
	CreateMediaAsset(ctx context.Context, asset *models.UploadMediaAsset) error
	CreateMediaFile(ctx context.Context, file *models.UploadMediaFile) error
	CreateAnimeMedia(ctx context.Context, animeID int64, mediaID string, sortOrder int) error
	CreateEpisodeMedia(ctx context.Context, episodeID int64, mediaID string, sortOrder int) error
	CreateFansubGroupMedia(ctx context.Context, groupID int64, mediaID string) error
	CreateReleaseMedia(ctx context.Context, releaseID int64, mediaID string, sortOrder int) error
	GetMediaAsset(ctx context.Context, id string) (*models.UploadMediaAsset, error)
	GetMediaFiles(ctx context.Context, mediaID string) ([]models.UploadMediaFile, error)
	DeleteMediaAsset(ctx context.Context, id string) error
}

// MediaUploadRepoTx extends MediaUploadRepo with transaction support
type MediaUploadRepoTx interface {
	MediaUploadRepo
	WithTx(ctx context.Context, fn func(repo MediaUploadRepo) error) error
}

type MediaUploadRepository struct {
	db *pgxpool.Pool
	tx pgx.Tx
}

func NewMediaUploadRepository(db *pgxpool.Pool) *MediaUploadRepository {
	return &MediaUploadRepository{db: db}
}

// DBConn interface for both pool and transaction
type DBConn interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
}

// getConn returns the appropriate DB connection (transaction or pool)
func (r *MediaUploadRepository) getConn() DBConn {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// WithTx executes a function within a database transaction
func (r *MediaUploadRepository) WithTx(ctx context.Context, fn func(repo MediaUploadRepo) error) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txRepo := &MediaUploadRepository{
		db: r.db,
		tx: tx,
	}

	if err := fn(txRepo); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// CreateMediaAsset creates a new media asset record
func (r *MediaUploadRepository) CreateMediaAsset(ctx context.Context, asset *models.UploadMediaAsset) error {
	query := `
		INSERT INTO media_assets (id, entity_type, entity_id, asset_type, format, mime_type, uploaded_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.getConn().Exec(ctx, query,
		asset.ID,
		asset.EntityType,
		asset.EntityID,
		asset.AssetType,
		asset.Format,
		asset.MimeType,
		asset.UploadedBy,
		asset.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create media asset: %w", err)
	}

	return nil
}

// CreateMediaFile creates a new media file record
func (r *MediaUploadRepository) CreateMediaFile(ctx context.Context, file *models.UploadMediaFile) error {
	query := `
		INSERT INTO media_files (media_id, variant, path, width, height, size)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	err := r.getConn().QueryRow(ctx, query,
		file.MediaID,
		file.Variant,
		file.Path,
		file.Width,
		file.Height,
		file.Size,
	).Scan(&file.ID)
	if err != nil {
		return fmt.Errorf("create media file: %w", err)
	}

	return nil
}

// CreateAnimeMedia creates a join table entry for anime
func (r *MediaUploadRepository) CreateAnimeMedia(ctx context.Context, animeID int64, mediaID string, sortOrder int) error {
	query := `
		INSERT INTO anime_media (anime_id, media_id, sort_order)
		VALUES ($1, $2, $3)
	`

	_, err := r.getConn().Exec(ctx, query, animeID, mediaID, sortOrder)
	if err != nil {
		return fmt.Errorf("create anime media: %w", err)
	}

	return nil
}

// CreateEpisodeMedia creates a join table entry for episode
func (r *MediaUploadRepository) CreateEpisodeMedia(ctx context.Context, episodeID int64, mediaID string, sortOrder int) error {
	query := `
		INSERT INTO episode_media (episode_id, media_id, sort_order)
		VALUES ($1, $2, $3)
	`

	_, err := r.getConn().Exec(ctx, query, episodeID, mediaID, sortOrder)
	if err != nil {
		return fmt.Errorf("create episode media: %w", err)
	}

	return nil
}

// CreateFansubGroupMedia creates a join table entry for fansub group
func (r *MediaUploadRepository) CreateFansubGroupMedia(ctx context.Context, groupID int64, mediaID string) error {
	query := `
		INSERT INTO fansub_group_media (group_id, media_id)
		VALUES ($1, $2)
	`

	_, err := r.getConn().Exec(ctx, query, groupID, mediaID)
	if err != nil {
		return fmt.Errorf("create fansub group media: %w", err)
	}

	return nil
}

// CreateReleaseMedia creates a join table entry for release
func (r *MediaUploadRepository) CreateReleaseMedia(ctx context.Context, releaseID int64, mediaID string, sortOrder int) error {
	query := `
		INSERT INTO release_media (release_id, media_id, sort_order)
		VALUES ($1, $2, $3)
	`

	_, err := r.getConn().Exec(ctx, query, releaseID, mediaID, sortOrder)
	if err != nil {
		return fmt.Errorf("create release media: %w", err)
	}

	return nil
}

// GetMediaAsset retrieves a media asset by ID
func (r *MediaUploadRepository) GetMediaAsset(ctx context.Context, id string) (*models.UploadMediaAsset, error) {
	query := `
		SELECT id, entity_type, entity_id, asset_type, format, mime_type, uploaded_by, created_at
		FROM media_assets
		WHERE id = $1
	`

	var asset models.UploadMediaAsset
	err := r.getConn().QueryRow(ctx, query, id).Scan(
		&asset.ID,
		&asset.EntityType,
		&asset.EntityID,
		&asset.AssetType,
		&asset.Format,
		&asset.MimeType,
		&asset.UploadedBy,
		&asset.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get media asset: %w", err)
	}

	return &asset, nil
}

// GetMediaFiles retrieves all file variants for a media asset
func (r *MediaUploadRepository) GetMediaFiles(ctx context.Context, mediaID string) ([]models.UploadMediaFile, error) {
	query := `
		SELECT id, media_id, variant, path, width, height, size
		FROM media_files
		WHERE media_id = $1
		ORDER BY variant
	`

	rows, err := r.getConn().Query(ctx, query, mediaID)
	if err != nil {
		return nil, fmt.Errorf("get media files: %w", err)
	}
	defer rows.Close()

	var files []models.UploadMediaFile
	for rows.Next() {
		var file models.UploadMediaFile
		err := rows.Scan(
			&file.ID,
			&file.MediaID,
			&file.Variant,
			&file.Path,
			&file.Width,
			&file.Height,
			&file.Size,
		)
		if err != nil {
			return nil, fmt.Errorf("scan media file: %w", err)
		}
		files = append(files, file)
	}

	return files, nil
}

// DeleteMediaAsset deletes a media asset and all its files
func (r *MediaUploadRepository) DeleteMediaAsset(ctx context.Context, id string) error {
	// Delete join table entries first
	joinTables := []string{
		"anime_media",
		"episode_media",
		"fansub_group_media",
		"release_media",
	}

	for _, table := range joinTables {
		query := fmt.Sprintf("DELETE FROM %s WHERE media_id = $1", table)
		_, err := r.db.Exec(ctx, query, id)
		if err != nil {
			return fmt.Errorf("delete from %s: %w", table, err)
		}
	}

	// Delete media files
	_, err := r.db.Exec(ctx, "DELETE FROM media_files WHERE media_id = $1", id)
	if err != nil {
		return fmt.Errorf("delete media files: %w", err)
	}

	// Delete media asset
	_, err = r.db.Exec(ctx, "DELETE FROM media_assets WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete media asset: %w", err)
	}

	return nil
}
