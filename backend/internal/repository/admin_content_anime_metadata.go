package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type authoritativeAnimeTitleSlotWrite struct {
	Set          bool
	LanguageCode string
	TitleType    string
	Title        *string
}

type authoritativeAnimeMetadataWrite struct {
	TitleSlots []authoritativeAnimeTitleSlotWrite
	GenresSet  bool
	Genres     []string
}

func (m authoritativeAnimeMetadataWrite) normalizedTitleRecords() []normalizedAnimeTitleRecord {
	records := make([]normalizedAnimeTitleRecord, 0, len(m.TitleSlots))
	for _, slot := range m.TitleSlots {
		if slot.Title == nil {
			continue
		}
		records = append(records, normalizedAnimeTitleRecord{
			LanguageCode: slot.LanguageCode,
			TitleType:    slot.TitleType,
			Title:        *slot.Title,
		})
	}

	return records
}

func buildAuthoritativeAnimeMetadataCreate(input models.AdminAnimeCreateInput) authoritativeAnimeMetadataWrite {
	return authoritativeAnimeMetadataWrite{
		TitleSlots: []authoritativeAnimeTitleSlotWrite{
			{
				Set:          true,
				LanguageCode: "romaji",
				TitleType:    "main",
				Title:        trimOptionalStringPtr(&input.Title),
			},
			{
				Set:          true,
				LanguageCode: "de",
				TitleType:    "main",
				Title:        trimOptionalStringPtr(input.TitleDE),
			},
			{
				Set:          true,
				LanguageCode: "en",
				TitleType:    "official",
				Title:        trimOptionalStringPtr(input.TitleEN),
			},
		},
		GenresSet: true,
		Genres:    normalizeGenreList(input.Genre),
	}
}

func buildAuthoritativeAnimeMetadataPatch(input models.AdminAnimePatchInput) authoritativeAnimeMetadataWrite {
	write := authoritativeAnimeMetadataWrite{
		TitleSlots: make([]authoritativeAnimeTitleSlotWrite, 0, 3),
	}

	if input.Title.Set {
		write.TitleSlots = append(write.TitleSlots, authoritativeAnimeTitleSlotWrite{
			Set:          true,
			LanguageCode: "romaji",
			TitleType:    "main",
			Title:        trimOptionalStringPtr(input.Title.Value),
		})
	}
	if input.TitleDE.Set {
		write.TitleSlots = append(write.TitleSlots, authoritativeAnimeTitleSlotWrite{
			Set:          true,
			LanguageCode: "de",
			TitleType:    "main",
			Title:        trimOptionalStringPtr(input.TitleDE.Value),
		})
	}
	if input.TitleEN.Set {
		write.TitleSlots = append(write.TitleSlots, authoritativeAnimeTitleSlotWrite{
			Set:          true,
			LanguageCode: "en",
			TitleType:    "official",
			Title:        trimOptionalStringPtr(input.TitleEN.Value),
		})
	}
	if input.Genre.Set {
		write.GenresSet = true
		write.Genres = normalizeGenreList(input.Genre.Value)
	}

	return write
}

func trimOptionalStringPtr(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func normalizeGenreList(raw *string) []string {
	if raw == nil {
		return nil
	}

	parts := strings.Split(*raw, ",")
	seen := make(map[string]string, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
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

	genres := make([]string, 0, len(seen))
	for _, value := range seen {
		genres = append(genres, value)
	}
	sort.Strings(genres)

	return genres
}

func (r *AdminContentRepository) CreateAnime(
	ctx context.Context,
	input models.AdminAnimeCreateInput,
) (*models.AdminAnimeItem, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin create anime tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := `
		INSERT INTO anime (
			title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING
			id, title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
	`

	var item models.AdminAnimeItem
	if err := tx.QueryRow(
		ctx,
		query,
		input.Title,
		input.TitleDE,
		input.TitleEN,
		input.Type,
		input.ContentType,
		input.Status,
		input.Year,
		input.MaxEpisodes,
		input.Genre,
		input.Description,
		input.CoverImage,
	).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Type,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Genre,
		&item.Description,
		&item.CoverImage,
	); err != nil {
		return nil, fmt.Errorf("create anime: %w", err)
	}

	if err := syncAuthoritativeAnimeMetadata(ctx, tx, item.ID, buildAuthoritativeAnimeMetadataCreate(input)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create anime tx: %w", err)
	}

	return &item, nil
}

func (r *AdminContentRepository) UpdateAnime(
	ctx context.Context,
	id int64,
	input models.AdminAnimePatchInput,
) (*models.AdminAnimeItem, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin update anime tx %d: %w", id, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	assignments := make([]string, 0, 11)
	args := make([]any, 0, 11)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Title.Set {
		assignments = append(assignments, fmt.Sprintf("title = $%d", argPos))
		args = append(args, input.Title.Value)
		argPos++
	}
	if input.TitleDE.Set {
		assignments = append(assignments, fmt.Sprintf("title_de = $%d", argPos))
		args = append(args, input.TitleDE.Value)
		argPos++
	}
	if input.TitleEN.Set {
		assignments = append(assignments, fmt.Sprintf("title_en = $%d", argPos))
		args = append(args, input.TitleEN.Value)
		argPos++
	}
	if input.Type.Set {
		assignments = append(assignments, fmt.Sprintf("type = $%d", argPos))
		args = append(args, input.Type.Value)
		argPos++
	}
	if input.ContentType.Set {
		assignments = append(assignments, fmt.Sprintf("content_type = $%d", argPos))
		args = append(args, input.ContentType.Value)
		argPos++
	}
	if input.Status.Set {
		assignments = append(assignments, fmt.Sprintf("status = $%d", argPos))
		args = append(args, input.Status.Value)
		argPos++
	}
	if input.Year.Set {
		assignments = append(assignments, fmt.Sprintf("year = $%d", argPos))
		args = append(args, input.Year.Value)
		argPos++
	}
	if input.MaxEpisodes.Set {
		assignments = append(assignments, fmt.Sprintf("max_episodes = $%d", argPos))
		args = append(args, input.MaxEpisodes.Value)
		argPos++
	}
	if input.Genre.Set {
		assignments = append(assignments, fmt.Sprintf("genre = $%d", argPos))
		args = append(args, input.Genre.Value)
		argPos++
	}
	if input.Description.Set {
		assignments = append(assignments, fmt.Sprintf("description = $%d", argPos))
		args = append(args, input.Description.Value)
		argPos++
	}
	if input.CoverImage.Set {
		assignments = append(assignments, fmt.Sprintf("cover_image = $%d", argPos))
		args = append(args, input.CoverImage.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update anime %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE anime
		SET %s
		WHERE id = $%d
		RETURNING
			id, title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, id)

	var item models.AdminAnimeItem
	if err := tx.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Type,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Genre,
		&item.Description,
		&item.CoverImage,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("update anime %d: %w", id, err)
	}

	if err := syncAuthoritativeAnimeMetadata(ctx, tx, item.ID, buildAuthoritativeAnimeMetadataPatch(input)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit update anime tx %d: %w", id, err)
	}

	return &item, nil
}

func syncAuthoritativeAnimeMetadata(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	write authoritativeAnimeMetadataWrite,
) error {
	for _, slot := range write.TitleSlots {
		if !slot.Set {
			continue
		}
		if err := upsertAuthoritativeAnimeTitle(ctx, tx, animeID, slot); err != nil {
			return err
		}
	}

	if write.GenresSet {
		if err := replaceAuthoritativeAnimeGenres(ctx, tx, animeID, write.Genres); err != nil {
			return err
		}
	}

	return nil
}

func upsertAuthoritativeAnimeTitle(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	slot authoritativeAnimeTitleSlotWrite,
) error {
	if slot.Title == nil {
		_, err := tx.Exec(
			ctx,
			`
			DELETE FROM anime_titles
			WHERE anime_id = $1
			  AND language_id = (SELECT id FROM languages WHERE code = $2)
			  AND title_type_id = (SELECT id FROM title_types WHERE name = $3)
			`,
			animeID,
			slot.LanguageCode,
			slot.TitleType,
		)
		if err != nil {
			return fmt.Errorf(
				"delete authoritative anime title anime=%d language=%s type=%s: %w",
				animeID,
				slot.LanguageCode,
				slot.TitleType,
				err,
			)
		}

		return nil
	}

	_, err := tx.Exec(
		ctx,
		`
		INSERT INTO anime_titles (anime_id, language_id, title, title_type_id)
		SELECT $1, l.id, $4, tt.id
		FROM languages l
		JOIN title_types tt ON tt.name = $3
		WHERE l.code = $2
		ON CONFLICT (anime_id, language_id, title_type_id)
		DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
		`,
		animeID,
		slot.LanguageCode,
		slot.TitleType,
		*slot.Title,
	)
	if err != nil {
		return fmt.Errorf(
			"upsert authoritative anime title anime=%d language=%s type=%s: %w",
			animeID,
			slot.LanguageCode,
			slot.TitleType,
			err,
		)
	}

	return nil
}

func replaceAuthoritativeAnimeGenres(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	genres []string,
) error {
	if _, err := tx.Exec(ctx, `DELETE FROM anime_genres WHERE anime_id = $1`, animeID); err != nil {
		return fmt.Errorf("clear authoritative anime genres anime=%d: %w", animeID, err)
	}

	for _, genre := range genres {
		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO genres (name)
			VALUES ($1)
			ON CONFLICT (name) DO NOTHING
			`,
			genre,
		); err != nil {
			return fmt.Errorf("ensure authoritative genre %q: %w", genre, err)
		}

		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO anime_genres (anime_id, genre_id)
			SELECT $1, g.id
			FROM genres g
			WHERE g.name = $2
			ON CONFLICT (anime_id, genre_id) DO NOTHING
			`,
			animeID,
			genre,
		); err != nil {
			return fmt.Errorf("attach authoritative genre anime=%d genre=%q: %w", animeID, genre, err)
		}
	}

	return nil
}

func buildAuthoritativeGenreTokensQuery() string {
	return `
		SELECT g.name, COUNT(*) AS usage_count
		FROM anime_genres ag
		JOIN genres g ON g.id = ag.genre_id
		GROUP BY g.name
	`
}

func (r *AdminContentRepository) ListGenreTokens(
	ctx context.Context,
	query string,
	limit int,
) ([]models.GenreToken, error) {
	rows, err := r.db.Query(ctx, buildAuthoritativeGenreTokensQuery())
	if err != nil {
		return nil, fmt.Errorf("query authoritative genres: %w", err)
	}
	defer rows.Close()

	q := strings.ToLower(strings.TrimSpace(query))
	tokens := make([]models.GenreToken, 0)
	for rows.Next() {
		var token models.GenreToken
		if err := rows.Scan(&token.Name, &token.Count); err != nil {
			return nil, fmt.Errorf("scan authoritative genre token: %w", err)
		}
		if q != "" && !strings.Contains(strings.ToLower(token.Name), q) {
			continue
		}
		tokens = append(tokens, token)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate authoritative genre tokens: %w", err)
	}

	sort.Slice(tokens, func(i, j int) bool {
		leftName := strings.ToLower(tokens[i].Name)
		rightName := strings.ToLower(tokens[j].Name)

		if q != "" {
			leftPrefix := strings.HasPrefix(leftName, q)
			rightPrefix := strings.HasPrefix(rightName, q)
			if leftPrefix != rightPrefix {
				return leftPrefix
			}
		}

		if leftName != rightName {
			return leftName < rightName
		}

		return tokens[i].Count > tokens[j].Count
	})

	if limit > 0 && len(tokens) > limit {
		tokens = tokens[:limit]
	}

	return tokens, nil
}
