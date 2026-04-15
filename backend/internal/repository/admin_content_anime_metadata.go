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
	TagsSet    bool
	Tags       []string
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
		TagsSet:   true,
		Tags:      normalizeTagList(input.Tags),
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
	if input.Tags.Set {
		write.TagsSet = true
		write.Tags = normalizeTagList(input.Tags.Value)
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

// normalizeTagList trims whitespace, collapses internal spacing, dedupes
// case-insensitively (first-seen casing wins), and sorts the final slice so
// stored tag names are canonical and deterministic. Returns nil for empty input.
func normalizeTagList(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}

	seen := make(map[string]string, len(raw))
	for _, part := range raw {
		trimmed := strings.Join(strings.Fields(part), " ")
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

	tags := make([]string, 0, len(seen))
	for _, value := range seen {
		tags = append(tags, value)
	}
	sort.Strings(tags)

	return tags
}

func applyAuthoritativeAnimeMetadataWrite(
	titleRecords []normalizedAnimeTitleRecord,
	genres []string,
	write authoritativeAnimeMetadataWrite,
) ([]normalizedAnimeTitleRecord, []string) {
	updatedTitles := append([]normalizedAnimeTitleRecord(nil), titleRecords...)
	for _, slot := range write.TitleSlots {
		if !slot.Set {
			continue
		}

		replaced := false
		for idx := range updatedTitles {
			record := &updatedTitles[idx]
			if record.LanguageCode != slot.LanguageCode || record.TitleType != slot.TitleType {
				continue
			}

			replaced = true
			if slot.Title == nil {
				updatedTitles = append(updatedTitles[:idx], updatedTitles[idx+1:]...)
			} else {
				record.Title = *slot.Title
			}
			break
		}

		if !replaced && slot.Title != nil {
			updatedTitles = append(updatedTitles, normalizedAnimeTitleRecord{
				LanguageCode: slot.LanguageCode,
				TitleType:    slot.TitleType,
				Title:        *slot.Title,
			})
		}
	}

	updatedGenres := append([]string(nil), genres...)
	if write.GenresSet {
		updatedGenres = append([]string(nil), write.Genres...)
	}

	return updatedTitles, updatedGenres
}

func (r *AdminContentRepository) CreateAnime(
	ctx context.Context,
	input models.AdminAnimeCreateInput,
	actorUserID int64,
) (*models.AdminAnimeItem, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin create anime tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	useV2Schema, err := hasV2AnimeCreateSchema(ctx, tx)
	if err != nil {
		return nil, err
	}

	var item *models.AdminAnimeItem
	if useV2Schema {
		item, err = r.createAnimeV2(ctx, tx, input, actorUserID)
	} else {
		item, err = r.createAnimeLegacy(ctx, tx, input)
		if err == nil {
			err = syncAuthoritativeAnimeMetadata(ctx, tx, item.ID, buildAuthoritativeAnimeMetadataCreate(input))
		}
		if err == nil {
			var actorPtr *int64
			if actorUserID > 0 {
				actorPtr = &actorUserID
			}
			if err = attachAnimeCoverMediaV2(ctx, tx, item.ID, input, actorPtr); err == nil {
				if err = attachAnimeBannerMediaV2(ctx, tx, item.ID, input, actorPtr); err == nil {
					if err = attachAnimeLogoMediaV2(ctx, tx, item.ID, input, actorPtr); err == nil {
						if err = attachAnimeBackgroundVideoMediaV2(ctx, tx, item.ID, input, actorPtr); err == nil {
							err = attachAnimeBackgroundImageURLsMediaV2(ctx, tx, item.ID, input, actorPtr)
						}
					}
				}
			}
		}
	}
	if err != nil {
		return nil, err
	}

	auditEntry, err := buildAdminAnimeAuditEntryForCreate(actorUserID, item.ID, input)
	if err != nil {
		return nil, err
	}
	if err := insertAdminAnimeAuditEntry(ctx, tx, auditEntry); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create anime tx: %w", err)
	}

	return item, nil
}

func (r *AdminContentRepository) UpdateAnime(
	ctx context.Context,
	id int64,
	input models.AdminAnimePatchInput,
	actorUserID int64,
) (*models.AdminAnimeItem, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin update anime tx %d: %w", id, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return nil, err
	}
	if schema.HasSlug {
		item, err := r.updateAnimeV2(ctx, tx, id, input, actorUserID, schema)
		if err != nil {
			return nil, err
		}

		auditEntry, err := buildAdminAnimeAuditEntryForPatch(actorUserID, item.ID, input)
		if err != nil {
			return nil, err
		}
		if err := insertAdminAnimeAuditEntry(ctx, tx, auditEntry); err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("commit update anime tx %d: %w", id, err)
		}

		return item, nil
	}

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
	auditEntry, err := buildAdminAnimeAuditEntryForPatch(actorUserID, item.ID, input)
	if err != nil {
		return nil, err
	}
	if err := insertAdminAnimeAuditEntry(ctx, tx, auditEntry); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit update anime tx %d: %w", id, err)
	}

	return &item, nil
}
