package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

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

func (r *AnimeRepository) List(ctx context.Context, filter models.AnimeFilter) ([]models.AnimeListItem, int64, error) {
	whereSQL, args := buildAnimeListWhere(filter)

	countQuery := "SELECT COUNT(*) FROM anime" + whereSQL
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count anime: %w", err)
	}

	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (filter.Page - 1) * filter.PerPage

	listQuery := fmt.Sprintf(`
		SELECT id, title, type, status, year, cover_image, max_episodes
		FROM anime
		%s
		ORDER BY title ASC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitPos, offsetPos)

	listArgs := append(args, filter.PerPage, offset)
	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query anime list: %w", err)
	}
	defer rows.Close()

	items := make([]models.AnimeListItem, 0, filter.PerPage)
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
			return nil, 0, fmt.Errorf("scan anime row: %w", err)
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate anime rows: %w", err)
	}

	return items, total, nil
}

func (r *AnimeRepository) GetByID(ctx context.Context, id int64, includeDisabled bool) (*models.AnimeDetail, error) {
	query := `
		SELECT id, title, title_de, title_en, type, content_type, status, year,
		       max_episodes, genre, description, cover_image, view_count
		FROM anime
		WHERE id = $1
	`
	if !includeDisabled {
		query += " AND status <> 'disabled'"
	}

	var anime models.AnimeDetail
	err := r.db.QueryRow(ctx, query, id).Scan(
		&anime.ID,
		&anime.Title,
		&anime.TitleDE,
		&anime.TitleEN,
		&anime.Type,
		&anime.ContentType,
		&anime.Status,
		&anime.Year,
		&anime.MaxEpisodes,
		&anime.Genre,
		&anime.Description,
		&anime.CoverImage,
		&anime.ViewCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query anime detail %d: %w", id, err)
	}

	// Populate Genres array from Genre string
	if anime.Genre != nil && *anime.Genre != "" {
		parts := strings.Split(*anime.Genre, ",")
		genres := make([]string, 0, len(parts))
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				genres = append(genres, trimmed)
			}
		}
		anime.Genres = genres
	}

	episodeQuery := `
		SELECT id, episode_number, title, status, view_count, download_count, stream_links, filename
		FROM episodes
		WHERE anime_id = $1
	`

	rows, err := r.db.Query(ctx, episodeQuery, id)
	if err != nil {
		return nil, fmt.Errorf("query episodes for anime %d: %w", id, err)
	}
	defer rows.Close()

	episodes := make([]models.EpisodeListItem, 0)
	for rows.Next() {
		var episode models.EpisodeListItem
		if err := rows.Scan(
			&episode.ID,
			&episode.EpisodeNumber,
			&episode.Title,
			&episode.Status,
			&episode.ViewCount,
			&episode.DownloadCount,
			&episode.StreamLinks,
			&episode.Filename,
		); err != nil {
			return nil, fmt.Errorf("scan episode row: %w", err)
		}

		episodes = append(episodes, episode)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate episode rows: %w", err)
	}

	sortEpisodeListItems(episodes)
	anime.Episodes = episodes
	return &anime, nil
}

func (r *AnimeRepository) GetMediaLookupByID(
	ctx context.Context,
	id int64,
	includeDisabled bool,
) (*models.AnimeMediaLookup, error) {
	query := `
		SELECT title, title_de, title_en, source, folder_name
		FROM anime
		WHERE id = $1
	`
	if !includeDisabled {
		query += " AND status <> 'disabled'"
	}

	var lookup models.AnimeMediaLookup
	err := r.db.QueryRow(ctx, query, id).Scan(
		&lookup.Title,
		&lookup.TitleDE,
		&lookup.TitleEN,
		&lookup.Source,
		&lookup.FolderName,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query anime media lookup %d: %w", id, err)
	}

	return &lookup, nil
}

func buildAnimeListWhere(filter models.AnimeFilter) (string, []any) {
	conditions := make([]string, 0, 3)
	args := make([]any, 0, 3)
	argPos := 1

	if filter.ContentType != "" {
		conditions = append(conditions, fmt.Sprintf("content_type = $%d", argPos))
		args = append(args, filter.ContentType)
		argPos++
	}

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, filter.Status)
		argPos++
	} else if !filter.IncludeDisabled {
		conditions = append(conditions, "status <> 'disabled'")
	}

	if filter.FansubGroupID != nil {
		conditions = append(
			conditions,
			fmt.Sprintf(
				"EXISTS (SELECT 1 FROM anime_fansub_groups afg WHERE afg.anime_id = anime.id AND afg.fansub_group_id = $%d)",
				argPos,
			),
		)
		args = append(args, *filter.FansubGroupID)
		argPos++
	}

	if filter.HasCover != nil {
		if *filter.HasCover {
			conditions = append(conditions, "(cover_image IS NOT NULL AND btrim(cover_image) <> '')")
		} else {
			conditions = append(conditions, "(cover_image IS NULL OR btrim(cover_image) = '')")
		}
	}

	if filter.Q != "" {
		conditions = append(
			conditions,
			fmt.Sprintf("(title ILIKE $%d OR title_de ILIKE $%d OR title_en ILIKE $%d)", argPos, argPos, argPos),
		)
		args = append(args, "%"+filter.Q+"%")
		argPos++
	}

	if filter.Letter != "" {
		if filter.Letter == "0" {
			conditions = append(conditions, "title ~ '^[0-9]'")
		} else {
			conditions = append(conditions, fmt.Sprintf("UPPER(LEFT(title, 1)) = $%d", argPos))
			args = append(args, strings.ToUpper(filter.Letter))
			argPos++
		}
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}
