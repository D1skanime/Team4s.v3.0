package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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

// Search searches for anime by title, title_de, and title_en
func (r *AnimeRepository) Search(ctx context.Context, query string, limit int) ([]models.AnimeListItem, int64, error) {
	// Validate and set defaults
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	// Prepare search pattern for ILIKE
	searchPattern := "%" + query + "%"

	// Count total matches
	countQuery := `
		SELECT COUNT(*) FROM anime
		WHERE content_type = 'anime'
		AND (
			title ILIKE $1
			OR title_de ILIKE $1
			OR title_en ILIKE $1
		)
	`

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, searchPattern).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count search results: %w", err)
	}

	// Data query with relevance ordering (exact matches first, then by title)
	dataQuery := `
		SELECT id, title, type, status, year, cover_image, max_episodes
		FROM anime
		WHERE content_type = 'anime'
		AND (
			title ILIKE $1
			OR title_de ILIKE $1
			OR title_en ILIKE $1
		)
		ORDER BY
			CASE WHEN LOWER(title) = LOWER($2) THEN 0
			     WHEN LOWER(title) LIKE LOWER($2) || '%' THEN 1
			     ELSE 2
			END,
			title
		LIMIT $3
	`

	rows, err := r.db.Query(ctx, dataQuery, searchPattern, query, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("search anime: %w", err)
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
			return nil, 0, fmt.Errorf("scan search result: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate search results: %w", err)
	}

	return items, total, nil
}

// GetRelations returns all related anime for a given anime ID
func (r *AnimeRepository) GetRelations(ctx context.Context, animeID int64) ([]models.RelatedAnime, error) {
	query := `
		SELECT
			a.id, a.title, a.type, a.status, a.year, a.cover_image,
			ar.relation_type
		FROM anime_relations ar
		JOIN anime a ON a.id = ar.related_anime_id
		WHERE ar.anime_id = $1
		ORDER BY ar.relation_type, a.title
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime relations: %w", err)
	}
	defer rows.Close()

	var relations []models.RelatedAnime
	for rows.Next() {
		var rel models.RelatedAnime
		if err := rows.Scan(
			&rel.ID,
			&rel.Title,
			&rel.Type,
			&rel.Status,
			&rel.Year,
			&rel.CoverImage,
			&rel.RelationType,
		); err != nil {
			return nil, fmt.Errorf("scan relation: %w", err)
		}
		relations = append(relations, rel)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate relations: %w", err)
	}

	return relations, nil
}

// Create creates a new anime record
func (r *AnimeRepository) Create(ctx context.Context, req models.CreateAnimeRequest) (*models.Anime, error) {
	query := `
		INSERT INTO anime (
			title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, source, description, cover_image,
			folder_name, sub_comment, stream_comment, is_self_subbed,
			anisearch_id, view_count, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, 0, $18, $18
		)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	anime := &models.Anime{
		Title:         req.Title,
		TitleDE:       req.TitleDE,
		TitleEN:       req.TitleEN,
		Type:          req.Type,
		ContentType:   req.ContentType,
		Status:        req.Status,
		Year:          req.Year,
		MaxEpisodes:   req.MaxEpisodes,
		Genre:         req.Genre,
		Source:        req.Source,
		Description:   req.Description,
		CoverImage:    req.CoverImage,
		FolderName:    req.FolderName,
		SubComment:    req.SubComment,
		StreamComment: req.StreamComment,
		IsSelfSubbed:  req.IsSelfSubbed,
		AnisearchID:   req.AnisearchID,
		ViewCount:     0,
	}

	err := r.db.QueryRow(ctx, query,
		req.Title, req.TitleDE, req.TitleEN, req.Type, req.ContentType, req.Status,
		req.Year, req.MaxEpisodes, req.Genre, req.Source, req.Description, req.CoverImage,
		req.FolderName, req.SubComment, req.StreamComment, req.IsSelfSubbed,
		req.AnisearchID, now,
	).Scan(&anime.ID, &anime.CreatedAt, &anime.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("create anime: %w", err)
	}

	return anime, nil
}

// Update updates an existing anime record
func (r *AnimeRepository) Update(ctx context.Context, id int64, req models.UpdateAnimeRequest) (*models.Anime, error) {
	// Build dynamic update query
	setClauses := []string{}
	args := []any{}
	argNum := 1

	if req.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argNum))
		args = append(args, *req.Title)
		argNum++
	}
	if req.TitleDE != nil {
		setClauses = append(setClauses, fmt.Sprintf("title_de = $%d", argNum))
		args = append(args, *req.TitleDE)
		argNum++
	}
	if req.TitleEN != nil {
		setClauses = append(setClauses, fmt.Sprintf("title_en = $%d", argNum))
		args = append(args, *req.TitleEN)
		argNum++
	}
	if req.Type != nil {
		setClauses = append(setClauses, fmt.Sprintf("type = $%d", argNum))
		args = append(args, *req.Type)
		argNum++
	}
	if req.ContentType != nil {
		setClauses = append(setClauses, fmt.Sprintf("content_type = $%d", argNum))
		args = append(args, *req.ContentType)
		argNum++
	}
	if req.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argNum))
		args = append(args, *req.Status)
		argNum++
	}
	if req.Year != nil {
		setClauses = append(setClauses, fmt.Sprintf("year = $%d", argNum))
		args = append(args, *req.Year)
		argNum++
	}
	if req.MaxEpisodes != nil {
		setClauses = append(setClauses, fmt.Sprintf("max_episodes = $%d", argNum))
		args = append(args, *req.MaxEpisodes)
		argNum++
	}
	if req.Genre != nil {
		setClauses = append(setClauses, fmt.Sprintf("genre = $%d", argNum))
		args = append(args, *req.Genre)
		argNum++
	}
	if req.Source != nil {
		setClauses = append(setClauses, fmt.Sprintf("source = $%d", argNum))
		args = append(args, *req.Source)
		argNum++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argNum))
		args = append(args, *req.Description)
		argNum++
	}
	if req.CoverImage != nil {
		setClauses = append(setClauses, fmt.Sprintf("cover_image = $%d", argNum))
		args = append(args, *req.CoverImage)
		argNum++
	}
	if req.FolderName != nil {
		setClauses = append(setClauses, fmt.Sprintf("folder_name = $%d", argNum))
		args = append(args, *req.FolderName)
		argNum++
	}
	if req.SubComment != nil {
		setClauses = append(setClauses, fmt.Sprintf("sub_comment = $%d", argNum))
		args = append(args, *req.SubComment)
		argNum++
	}
	if req.StreamComment != nil {
		setClauses = append(setClauses, fmt.Sprintf("stream_comment = $%d", argNum))
		args = append(args, *req.StreamComment)
		argNum++
	}
	if req.IsSelfSubbed != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_self_subbed = $%d", argNum))
		args = append(args, *req.IsSelfSubbed)
		argNum++
	}
	if req.AnisearchID != nil {
		setClauses = append(setClauses, fmt.Sprintf("anisearch_id = $%d", argNum))
		args = append(args, *req.AnisearchID)
		argNum++
	}

	if len(setClauses) == 0 {
		// No fields to update, just return the existing anime
		return r.GetByID(ctx, id)
	}

	// Always update updated_at
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argNum))
	args = append(args, time.Now())
	argNum++

	// Add ID as the last argument
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE anime
		SET %s
		WHERE id = $%d
	`, strings.Join(setClauses, ", "), argNum)

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update anime: %w", err)
	}

	if result.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	return r.GetByID(ctx, id)
}

// Delete deletes an anime by ID
func (r *AnimeRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM anime WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete anime: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
