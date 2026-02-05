package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type AnimeRepository struct {
	db *pgxpool.Pool
}

func NewAnimeRepository(db *pgxpool.Pool) *AnimeRepository {
	return &AnimeRepository{db: db}
}

// List returns a paginated list of anime with filters
func (r *AnimeRepository) List(ctx context.Context, f models.AnimeFilter) ([]models.AnimeListItem, int64, error) {
	// Build WHERE conditions
	conditions := []string{"1=1"}
	args := []any{}
	argNum := 1

	// Content type filter (default: anime)
	if f.ContentType == "" {
		f.ContentType = "anime"
	}
	conditions = append(conditions, fmt.Sprintf("content_type = $%d", argNum))
	args = append(args, f.ContentType)
	argNum++

	// Letter filter
	if f.Letter != "" {
		if f.Letter == "0" {
			// Numbers: title starts with 0-9
			conditions = append(conditions, fmt.Sprintf("title ~ $%d", argNum))
			args = append(args, "^[0-9]")
		} else {
			// Letter: title starts with specific letter (case insensitive)
			conditions = append(conditions, fmt.Sprintf("UPPER(LEFT(title, 1)) = $%d", argNum))
			args = append(args, strings.ToUpper(f.Letter))
		}
		argNum++
	}

	// Status filter
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argNum))
		args = append(args, f.Status)
		argNum++
	}

	// Type filter
	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argNum))
		args = append(args, f.Type)
		argNum++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM anime WHERE %s", whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count anime: %w", err)
	}

	// Pagination defaults
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 24
	}
	if f.PerPage > 100 {
		f.PerPage = 100
	}

	offset := (f.Page - 1) * f.PerPage

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT id, title, type, status, year, cover_image, max_episodes
		FROM anime
		WHERE %s
		ORDER BY title
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	args = append(args, f.PerPage, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query anime list: %w", err)
	}
	defer rows.Close()

	var items []models.AnimeListItem
	for rows.Next() {
		var item models.AnimeListItem
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Type,
			&item.Status,
			&item.Year,
			&item.CoverImage,
			&item.MaxEpisodes,
		); err != nil {
			return nil, 0, fmt.Errorf("scan anime: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate anime: %w", err)
	}

	return items, total, nil
}

// GetByID returns a single anime by ID
func (r *AnimeRepository) GetByID(ctx context.Context, id int64) (*models.Anime, error) {
	query := `
		SELECT id, anisearch_id, title, title_de, title_en, type, content_type,
		       status, year, max_episodes, genre, source, description,
		       cover_image, folder_name, sub_comment, stream_comment,
		       is_self_subbed, view_count, created_at, updated_at
		FROM anime
		WHERE id = $1
	`

	var a models.Anime
	err := r.db.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.AnisearchID, &a.Title, &a.TitleDE, &a.TitleEN,
		&a.Type, &a.ContentType, &a.Status, &a.Year, &a.MaxEpisodes,
		&a.Genre, &a.Source, &a.Description, &a.CoverImage, &a.FolderName,
		&a.SubComment, &a.StreamComment, &a.IsSelfSubbed, &a.ViewCount,
		&a.CreatedAt, &a.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query anime %d: %w", id, err)
	}

	return &a, nil
}
