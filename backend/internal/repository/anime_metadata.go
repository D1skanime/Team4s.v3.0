package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

type normalizedAnimeMetadataQuerier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
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

func (r *AnimeRepository) loadNormalizedAnimeMetadata(ctx context.Context, animeID int64) (*normalizedAnimeMetadata, error) {
	return loadNormalizedAnimeMetadata(ctx, r.db, animeID)
}

func (r *AdminContentRepository) loadNormalizedAnimeMetadata(ctx context.Context, animeID int64) (*normalizedAnimeMetadata, error) {
	return loadNormalizedAnimeMetadata(ctx, r.db, animeID)
}

func loadNormalizedAnimeMetadata(ctx context.Context, db normalizedAnimeMetadataQuerier, animeID int64) (*normalizedAnimeMetadata, error) {
	titleRows, err := db.Query(
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

	genreRows, err := db.Query(
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
