package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type AnimeRepository struct {
	db *pgxpool.Pool
}

type normalizedAnimeMetadata struct {
	Title   string
	TitleDE *string
	TitleEN *string
	Genres  []string
}

type normalizedAnimeTitleRecord struct {
	LanguageCode string
	TitleType    string
	Title        string
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
		SELECT id, %s AS display_title, type, status, year, cover_image, max_episodes
		FROM anime
		%s
		ORDER BY display_title ASC
		LIMIT $%d OFFSET $%d
	`, primaryNormalizedTitleSQL("anime.id", "title"), whereSQL, limitPos, offsetPos)

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

	if normalized, normalizedErr := r.loadNormalizedAnimeMetadata(ctx, anime.ID); normalizedErr != nil {
		return nil, normalizedErr
	} else if normalized != nil {
		if normalized.Title != "" {
			anime.Title = normalized.Title
		}
		if normalized.TitleDE != nil {
			anime.TitleDE = normalized.TitleDE
		}
		if normalized.TitleEN != nil {
			anime.TitleEN = normalized.TitleEN
		}
		if len(normalized.Genres) > 0 {
			anime.Genres = normalized.Genres
			joinedGenres := strings.Join(normalized.Genres, ", ")
			anime.Genre = animeStringPtr(joinedGenres)
		}
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

	if normalized, normalizedErr := r.loadNormalizedAnimeMetadata(ctx, id); normalizedErr != nil {
		return nil, normalizedErr
	} else if normalized != nil {
		if normalized.Title != "" {
			lookup.Title = normalized.Title
		}
		if normalized.TitleDE != nil {
			lookup.TitleDE = normalized.TitleDE
		}
		if normalized.TitleEN != nil {
			lookup.TitleEN = normalized.TitleEN
		}
	}

	return &lookup, nil
}

func (r *AnimeRepository) loadNormalizedAnimeMetadata(ctx context.Context, animeID int64) (*normalizedAnimeMetadata, error) {
	titleRows, err := r.db.Query(
		ctx,
		`
		SELECT l.code, tt.name, at.title
		FROM anime_titles at
		JOIN languages l ON l.id = at.language_id
		JOIN title_types tt ON tt.id = at.title_type_id
		WHERE at.anime_id = $1
		`,
		animeID,
	)
	if err != nil {
		return nil, fmt.Errorf("query normalized anime titles %d: %w", animeID, err)
	}
	defer titleRows.Close()

	titleRecords := make([]normalizedAnimeTitleRecord, 0)
	for titleRows.Next() {
		var record normalizedAnimeTitleRecord
		if err := titleRows.Scan(&record.LanguageCode, &record.TitleType, &record.Title); err != nil {
			return nil, fmt.Errorf("scan normalized anime title %d: %w", animeID, err)
		}
		titleRecords = append(titleRecords, record)
	}
	if err := titleRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate normalized anime titles %d: %w", animeID, err)
	}

	genreRows, err := r.db.Query(
		ctx,
		`
		SELECT g.name
		FROM anime_genres ag
		JOIN genres g ON g.id = ag.genre_id
		WHERE ag.anime_id = $1
		ORDER BY g.name ASC
		`,
		animeID,
	)
	if err != nil {
		return nil, fmt.Errorf("query normalized anime genres %d: %w", animeID, err)
	}
	defer genreRows.Close()

	genres := make([]string, 0)
	for genreRows.Next() {
		var genre string
		if err := genreRows.Scan(&genre); err != nil {
			return nil, fmt.Errorf("scan normalized anime genre %d: %w", animeID, err)
		}
		trimmed := strings.TrimSpace(genre)
		if trimmed != "" {
			genres = append(genres, trimmed)
		}
	}
	if err := genreRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate normalized anime genres %d: %w", animeID, err)
	}

	metadata := mergeNormalizedAnimeMetadata(titleRecords, genres)
	if metadata == nil {
		return nil, nil
	}

	return metadata, nil
}

func mergeNormalizedAnimeMetadata(titleRecords []normalizedAnimeTitleRecord, genres []string) *normalizedAnimeMetadata {
	metadata := &normalizedAnimeMetadata{}

	if title := pickNormalizedTitle(titleRecords, []string{"ja", "romaji"}, []string{"main", "romaji", "official"}); title != "" {
		metadata.Title = title
	} else if title := pickNormalizedTitle(titleRecords, []string{"en", "de"}, []string{"main", "official"}); title != "" {
		metadata.Title = title
	}

	if titleDE := pickNormalizedTitle(titleRecords, []string{"de"}, []string{"main", "official", "synonym", "short"}); titleDE != "" {
		metadata.TitleDE = animeStringPtr(titleDE)
	}
	if titleEN := pickNormalizedTitle(titleRecords, []string{"en"}, []string{"official", "main", "synonym", "short"}); titleEN != "" {
		metadata.TitleEN = animeStringPtr(titleEN)
	}

	if len(genres) > 0 {
		metadata.Genres = uniqueSortedGenres(genres)
	}

	if metadata.Title == "" && metadata.TitleDE == nil && metadata.TitleEN == nil && len(metadata.Genres) == 0 {
		return nil
	}

	return metadata
}

func pickNormalizedTitle(records []normalizedAnimeTitleRecord, languagePriority []string, typePriority []string) string {
	if len(records) == 0 {
		return ""
	}

	languageRank := make(map[string]int, len(languagePriority))
	for idx, code := range languagePriority {
		languageRank[strings.ToLower(strings.TrimSpace(code))] = idx
	}

	typeRank := make(map[string]int, len(typePriority))
	for idx, name := range typePriority {
		typeRank[strings.ToLower(strings.TrimSpace(name))] = idx
	}

	candidates := make([]normalizedAnimeTitleRecord, 0, len(records))
	for _, record := range records {
		title := strings.TrimSpace(record.Title)
		lang := strings.ToLower(strings.TrimSpace(record.LanguageCode))
		typ := strings.ToLower(strings.TrimSpace(record.TitleType))
		if title == "" {
			continue
		}
		if _, ok := languageRank[lang]; !ok {
			continue
		}
		if _, ok := typeRank[typ]; !ok {
			continue
		}

		record.Title = title
		record.LanguageCode = lang
		record.TitleType = typ
		candidates = append(candidates, record)
	}

	if len(candidates) == 0 {
		return ""
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		left := candidates[i]
		right := candidates[j]

		if languageRank[left.LanguageCode] != languageRank[right.LanguageCode] {
			return languageRank[left.LanguageCode] < languageRank[right.LanguageCode]
		}
		if typeRank[left.TitleType] != typeRank[right.TitleType] {
			return typeRank[left.TitleType] < typeRank[right.TitleType]
		}
		return left.Title < right.Title
	})

	return candidates[0].Title
}

func uniqueSortedGenres(genres []string) []string {
	if len(genres) == 0 {
		return nil
	}

	seen := make(map[string]string, len(genres))
	for _, genre := range genres {
		trimmed := strings.TrimSpace(genre)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; !exists {
			seen[key] = trimmed
		}
	}

	if len(seen) == 0 {
		return nil
	}

	items := make([]string, 0, len(seen))
	for _, value := range seen {
		items = append(items, value)
	}
	sort.Strings(items)

	return items
}

func animeStringPtr(value string) *string {
	return &value
}

func primaryNormalizedTitleSQL(animeIDRef string, fallbackColumn string) string {
	return fmt.Sprintf(
		`COALESCE((
			SELECT at.title
			FROM anime_titles at
			JOIN languages l ON l.id = at.language_id
			JOIN title_types tt ON tt.id = at.title_type_id
			WHERE at.anime_id = %s
			ORDER BY
				CASE l.code
					WHEN 'ja' THEN 0
					WHEN 'romaji' THEN 1
					WHEN 'en' THEN 2
					WHEN 'de' THEN 3
					ELSE 10
				END,
				CASE tt.name
					WHEN 'main' THEN 0
					WHEN 'romaji' THEN 1
					WHEN 'official' THEN 2
					WHEN 'synonym' THEN 3
					WHEN 'short' THEN 4
					ELSE 10
				END,
				at.title ASC
			LIMIT 1
		), %s)`,
		animeIDRef,
		fallbackColumn,
	)
}

func buildAnimeListWhere(filter models.AnimeFilter) (string, []any) {
	conditions := make([]string, 0, 3)
	args := make([]any, 0, 3)
	argPos := 1
	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "title")

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
			fmt.Sprintf("(%s ILIKE $%d OR title_de ILIKE $%d OR title_en ILIKE $%d OR EXISTS (SELECT 1 FROM anime_titles at WHERE at.anime_id = anime.id AND at.title ILIKE $%d))", displayTitleExpr, argPos, argPos, argPos, argPos),
		)
		args = append(args, "%"+filter.Q+"%")
		argPos++
	}

	if filter.Letter != "" {
		if filter.Letter == "0" {
			conditions = append(conditions, fmt.Sprintf("%s ~ '^[0-9]'", displayTitleExpr))
		} else {
			conditions = append(conditions, fmt.Sprintf("UPPER(LEFT(%s, 1)) = $%d", displayTitleExpr, argPos))
			args = append(args, strings.ToUpper(filter.Letter))
			argPos++
		}
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}
