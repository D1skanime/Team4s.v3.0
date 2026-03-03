package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeVersionImageRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeVersionImageRepository(db *pgxpool.Pool) *EpisodeVersionImageRepository {
	return &EpisodeVersionImageRepository{db: db}
}

// GetByEpisodeVersionID retrieves images for an episode version with cursor-based pagination.
// Cursor is ID-based (last seen image ID).
// Default limit is 12 if not specified or if limit exceeds 100.
func (r *EpisodeVersionImageRepository) GetByEpisodeVersionID(
	ctx context.Context,
	versionID int64,
	cursor *string,
	limit int32,
) ([]models.EpisodeVersionImage, *string, error) {
	exists, err := r.episodeVersionExists(ctx, versionID)
	if err != nil {
		return nil, nil, err
	}
	if !exists {
		return nil, nil, ErrNotFound
	}

	if limit <= 0 || limit > 100 {
		limit = 12
	}

	var lastSeenID int64
	if cursor != nil && *cursor != "" {
		parsed, parseErr := strconv.ParseInt(*cursor, 10, 64)
		if parseErr != nil {
			return nil, nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		lastSeenID = parsed
	}

	query := `
		SELECT id, episode_version_id, url, thumbnail_url, width, height, caption, display_order, created_at, updated_at
		FROM episode_version_images
		WHERE episode_version_id = $1
	`
	args := []any{versionID}
	argPos := 2

	if lastSeenID > 0 {
		query += fmt.Sprintf(" AND id > $%d", argPos)
		args = append(args, lastSeenID)
		argPos++
	}

	query += fmt.Sprintf(`
		ORDER BY display_order ASC, id ASC
		LIMIT $%d
	`, argPos)
	args = append(args, limit+1)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("query episode version images for version %d: %w", versionID, err)
	}
	defer rows.Close()

	images := make([]models.EpisodeVersionImage, 0, limit)
	for rows.Next() {
		var img models.EpisodeVersionImage
		if err := rows.Scan(
			&img.ID,
			&img.EpisodeVersionID,
			&img.URL,
			&img.ThumbnailURL,
			&img.Width,
			&img.Height,
			&img.Caption,
			&img.DisplayOrder,
			&img.CreatedAt,
			&img.UpdatedAt,
		); err != nil {
			return nil, nil, fmt.Errorf("scan episode version image row: %w", err)
		}
		images = append(images, img)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate episode version image rows: %w", err)
	}

	var nextCursor *string
	if int32(len(images)) > limit {
		images = images[:limit]
		lastID := images[len(images)-1].ID
		cursorStr := strconv.FormatInt(lastID, 10)
		nextCursor = &cursorStr
	}

	return images, nextCursor, nil
}

// Create creates a new image entry.
func (r *EpisodeVersionImageRepository) Create(
	ctx context.Context,
	input models.EpisodeVersionImageCreateInput,
) (*models.EpisodeVersionImage, error) {
	query := `
		INSERT INTO episode_version_images (
			episode_version_id, url, thumbnail_url, width, height, caption, display_order
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, episode_version_id, url, thumbnail_url, width, height, caption, display_order, created_at, updated_at
	`

	var img models.EpisodeVersionImage
	err := r.db.QueryRow(
		ctx,
		query,
		input.EpisodeVersionID,
		input.URL,
		input.ThumbnailURL,
		input.Width,
		input.Height,
		input.Caption,
		input.DisplayOrder,
	).Scan(
		&img.ID,
		&img.EpisodeVersionID,
		&img.URL,
		&img.ThumbnailURL,
		&img.Width,
		&img.Height,
		&img.Caption,
		&img.DisplayOrder,
		&img.CreatedAt,
		&img.UpdatedAt,
	)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create episode version image: %w", err)
	}

	return &img, nil
}

// Update updates an existing image entry.
func (r *EpisodeVersionImageRepository) Update(
	ctx context.Context,
	imageID int64,
	input models.EpisodeVersionImageUpdateInput,
) (*models.EpisodeVersionImage, error) {
	assignments := make([]string, 0, 7)
	args := make([]any, 0, 7)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.URL.Set {
		assignments = append(assignments, fmt.Sprintf("url = $%d", argPos))
		args = append(args, input.URL.Value)
		argPos++
	}
	if input.ThumbnailURL.Set {
		assignments = append(assignments, fmt.Sprintf("thumbnail_url = $%d", argPos))
		args = append(args, input.ThumbnailURL.Value)
		argPos++
	}
	if input.Width.Set {
		assignments = append(assignments, fmt.Sprintf("width = $%d", argPos))
		args = append(args, input.Width.Value)
		argPos++
	}
	if input.Height.Set {
		assignments = append(assignments, fmt.Sprintf("height = $%d", argPos))
		args = append(args, input.Height.Value)
		argPos++
	}
	if input.Caption.Set {
		assignments = append(assignments, fmt.Sprintf("caption = $%d", argPos))
		args = append(args, input.Caption.Value)
		argPos++
	}
	if input.DisplayOrder.Set {
		assignments = append(assignments, fmt.Sprintf("display_order = $%d", argPos))
		args = append(args, input.DisplayOrder.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update episode version image %d: no patch fields provided", imageID)
	}

	query := fmt.Sprintf(`
		UPDATE episode_version_images
		SET %s
		WHERE id = $%d
		RETURNING id, episode_version_id, url, thumbnail_url, width, height, caption, display_order, created_at, updated_at
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, imageID)

	var img models.EpisodeVersionImage
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&img.ID,
		&img.EpisodeVersionID,
		&img.URL,
		&img.ThumbnailURL,
		&img.Width,
		&img.Height,
		&img.Caption,
		&img.DisplayOrder,
		&img.CreatedAt,
		&img.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update episode version image %d: %w", imageID, err)
	}

	return &img, nil
}

// Delete deletes an image entry.
func (r *EpisodeVersionImageRepository) Delete(ctx context.Context, imageID int64) error {
	commandTag, err := r.db.Exec(ctx, `DELETE FROM episode_version_images WHERE id = $1`, imageID)
	if err != nil {
		return fmt.Errorf("delete episode version image %d: %w", imageID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *EpisodeVersionImageRepository) episodeVersionExists(ctx context.Context, versionID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM episode_versions WHERE id = $1)`,
		versionID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check episode version existence %d: %w", versionID, err)
	}

	return exists, nil
}
