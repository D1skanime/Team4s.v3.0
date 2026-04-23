package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *EpisodeImportRepository) applyReleaseNative(
	ctx context.Context,
	input models.EpisodeImportApplyInput,
) (*models.EpisodeImportApplyResult, error) {
	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin episode import apply: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	episodeTypeID, err := lookupIDByName(ctx, tx, "episode_types", "episode")
	if err != nil {
		return nil, err
	}
	streamTypeID, err := lookupIDByName(ctx, tx, "stream_types", "episode")
	if err != nil {
		return nil, err
	}
	releaseSourceID, err := upsertReleaseSource(ctx, tx, "Jellyfin", "jellyfin")
	if err != nil {
		return nil, err
	}
	languageIDs, err := loadLanguageIDs(ctx, tx)
	if err != nil {
		return nil, err
	}

	result := &models.EpisodeImportApplyResult{AnimeID: input.AnimeID}
	episodeIDsByNumber := make(map[int32]int64, len(plan.canonicalByNumber))
	for _, number := range sortedEpisodeImportNumbers(plan.canonicalByNumber) {
		episodeID, created, err := upsertImportEpisode(ctx, tx, input.AnimeID, episodeTypeID, plan.canonicalByNumber[number])
		if err != nil {
			return nil, err
		}
		if err := upsertImportEpisodeTitles(ctx, tx, episodeID, plan.canonicalByNumber[number], languageIDs); err != nil {
			return nil, err
		}
		episodeIDsByNumber[number] = episodeID
		if created {
			result.EpisodesCreated++
		} else {
			result.EpisodesExisting++
		}
	}

	for _, mapping := range plan.mappings {
		if mapping.Status == models.EpisodeImportMappingStatusSkipped {
			result.Skipped++
			continue
		}
		media := plan.mediaByID[mapping.MediaItemID]
		releaseIDs := episodeImportReleaseIDs{
			PrimaryEpisodeID: episodeIDsByNumber[mapping.TargetEpisodeNumbers[0]],
			ReleaseSourceID:  releaseSourceID,
			StreamTypeID:     streamTypeID,
		}
		created, err := upsertImportReleaseGraph(ctx, tx, releaseIDs, mapping, media, episodeIDsByNumber)
		if err != nil {
			return nil, err
		}
		if created {
			result.VersionsCreated++
		} else {
			result.VersionsUpdated++
		}
		result.MappingsApplied++
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit episode import apply: %w", err)
	}
	return result, nil
}

type episodeImportReleaseIDs struct {
	PrimaryEpisodeID int64
	ReleaseSourceID  int64
	StreamTypeID     int64
}

func lookupIDByName(ctx context.Context, tx pgx.Tx, table string, name string) (int64, error) {
	query := fmt.Sprintf("SELECT id FROM %s WHERE name = $1", table)
	var id int64
	if err := tx.QueryRow(ctx, query, name).Scan(&id); err != nil {
		return 0, fmt.Errorf("lookup %s %q: %w", table, name, err)
	}
	return id, nil
}

func loadLanguageIDs(ctx context.Context, tx pgx.Tx) (map[string]int64, error) {
	rows, err := tx.Query(ctx, `SELECT code, id FROM languages WHERE code = ANY($1)`, []string{"de", "en", "ja"})
	if err != nil {
		return nil, fmt.Errorf("query episode title languages: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int64, 3)
	for rows.Next() {
		var code string
		var id int64
		if err := rows.Scan(&code, &id); err != nil {
			return nil, fmt.Errorf("scan episode title language: %w", err)
		}
		result[code] = id
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate episode title languages: %w", err)
	}
	return result, nil
}

func upsertReleaseSource(ctx context.Context, tx pgx.Tx, name string, sourceType string) (int64, error) {
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO release_sources (name, source_type, type)
		VALUES ($1, $2, $2)
		ON CONFLICT (name) DO UPDATE
		SET source_type = COALESCE(NULLIF(BTRIM(release_sources.source_type), ''), EXCLUDED.source_type),
		    type = COALESCE(NULLIF(BTRIM(release_sources.type), ''), EXCLUDED.type)
		RETURNING id
	`, name, sourceType).Scan(&id); err != nil {
		return 0, fmt.Errorf("upsert release source %q: %w", name, err)
	}
	return id, nil
}

func upsertImportEpisode(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	episodeTypeID int64,
	canonical models.EpisodeImportCanonicalEpisode,
) (int64, bool, error) {
	episodeNumber := strconv.Itoa(int(canonical.EpisodeNumber))
	displayTitle := episodeImportDisplayTitle(canonical)
	fillerTypeID, err := lookupEpisodeFillerType(ctx, tx, canonical.FillerType)
	if err != nil {
		return 0, false, err
	}

	var existingID int64
	err = tx.QueryRow(ctx, `
		SELECT id
		FROM episodes
		WHERE anime_id = $1 AND number = $2 AND episode_type_id = $3
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, canonical.EpisodeNumber, episodeTypeID).Scan(&existingID)
	if errors.Is(err, pgx.ErrNoRows) {
		var createdID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO episodes (
				anime_id, episode_number, title, status, episode_type_id,
				number, number_decimal, number_text, sort_index,
				filler_type_id, filler_source, filler_note, modified_at
			)
			VALUES ($1, $2, $3, 'disabled', $4, $5, $6, $2, $7, $8, $9, $10, NOW())
			RETURNING id
		`, animeID, episodeNumber, displayTitle, episodeTypeID, canonical.EpisodeNumber, float64(canonical.EpisodeNumber), canonical.EpisodeNumber, fillerTypeID, canonical.FillerSource, canonical.FillerNote).Scan(&createdID); err != nil {
			return 0, false, fmt.Errorf("create canonical episode anime=%d number=%s: %w", animeID, episodeNumber, err)
		}
		return createdID, true, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("query canonical episode anime=%d number=%s: %w", animeID, episodeNumber, err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE episodes
		SET title = COALESCE(NULLIF(BTRIM(title), ''), $1),
		    episode_type_id = COALESCE(episode_type_id, $2),
		    number = COALESCE(number, $3),
		    number_decimal = COALESCE(number_decimal, $3),
		    number_text = COALESCE(NULLIF(BTRIM(number_text), ''), $4),
		    sort_index = COALESCE(sort_index, $3),
		    filler_type_id = COALESCE($5, filler_type_id),
		    filler_source = COALESCE($6, filler_source),
		    filler_note = COALESCE($7, filler_note),
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $8
	`, displayTitle, episodeTypeID, canonical.EpisodeNumber, episodeNumber, fillerTypeID, canonical.FillerSource, canonical.FillerNote, existingID); err != nil {
		return 0, false, fmt.Errorf("update canonical episode id=%d: %w", existingID, err)
	}
	return existingID, false, nil
}

func lookupEpisodeFillerType(ctx context.Context, tx pgx.Tx, fillerType *string) (*int64, error) {
	name := strings.ToLower(strings.TrimSpace(derefString(fillerType)))
	if name == "" {
		name = "unknown"
	}
	var id int64
	if err := tx.QueryRow(ctx, `SELECT id FROM episode_filler_types WHERE name = $1`, name).Scan(&id); err != nil {
		return nil, fmt.Errorf("lookup episode filler type %q: %w", name, err)
	}
	return &id, nil
}

func upsertImportEpisodeTitles(
	ctx context.Context,
	tx pgx.Tx,
	episodeID int64,
	canonical models.EpisodeImportCanonicalEpisode,
	languageIDs map[string]int64,
) error {
	for lang, title := range canonical.TitlesByLanguage {
		title = strings.TrimSpace(title)
		languageID, ok := languageIDs[lang]
		if !ok || title == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO episode_titles (episode_id, language_id, title)
			VALUES ($1, $2, $3)
			ON CONFLICT (episode_id, language_id) DO UPDATE
			SET title = EXCLUDED.title
		`, episodeID, languageID, title); err != nil {
			return fmt.Errorf("upsert episode title episode=%d lang=%s: %w", episodeID, lang, err)
		}
	}
	return nil
}

func episodeImportDisplayTitle(canonical models.EpisodeImportCanonicalEpisode) string {
	for _, lang := range []string{"de", "en", "ja"} {
		if title := strings.TrimSpace(canonical.TitlesByLanguage[lang]); title != "" {
			return title
		}
	}
	if canonical.Title != nil && strings.TrimSpace(*canonical.Title) != "" {
		return strings.TrimSpace(*canonical.Title)
	}
	return fmt.Sprintf("Episode %d", canonical.EpisodeNumber)
}
