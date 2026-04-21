package repository

import (
	"context"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeVersionImageRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeVersionImageRepository(db *pgxpool.Pool) *EpisodeVersionImageRepository {
	return &EpisodeVersionImageRepository{db: db}
}

func (r *EpisodeVersionImageRepository) GetByEpisodeVersionID(
	ctx context.Context,
	versionID int64,
	cursor *string,
	limit int32,
) ([]models.EpisodeVersionImage, *string, error) {
	return nil, nil, phase20ReleaseImportDeferred("list release images", versionID)
}

func (r *EpisodeVersionImageRepository) Create(
	ctx context.Context,
	input models.EpisodeVersionImageCreateInput,
) (*models.EpisodeVersionImage, error) {
	return nil, phase20ReleaseImportDeferred("create release image", input.EpisodeVersionID)
}

func (r *EpisodeVersionImageRepository) Update(
	ctx context.Context,
	imageID int64,
	input models.EpisodeVersionImageUpdateInput,
) (*models.EpisodeVersionImage, error) {
	return nil, phase20ReleaseImportDeferred("update release image", imageID)
}

func (r *EpisodeVersionImageRepository) Delete(ctx context.Context, imageID int64) error {
	return phase20ReleaseImportDeferred("delete release image", imageID)
}
