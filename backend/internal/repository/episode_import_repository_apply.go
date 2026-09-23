package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
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

	if err := lockSegmentAssignmentAnimeTx(ctx, tx, input.AnimeID); err != nil {
		return nil, err
	}

	// Acquire every physical-source lock before any graph/variant write. Sorted
	// ordering also serializes cross-anime batches submitted in opposite orders.
	sourceIDs := make([]string, 0, len(plan.mappings))
	for _, mapping := range plan.mappings {
		if mapping.Status == models.EpisodeImportMappingStatusConfirmed {
			sourceIDs = append(sourceIDs, mapping.MediaSourceID)
		}
	}
	sort.Strings(sourceIDs)
	for _, id := range sourceIDs {
		if err := lockJellyfinSource(ctx, tx, id); err != nil {
			return nil, err
		}
	}

	// GAP-22, 165-UAT.md: wiederverwendet dieselbe "film"->"movie"-Zuordnung wie
	// episodeTypeID direkt darunter, bleibt dadurch automatisch konsistent.
	var animeType, animeTitle string
	if err := tx.QueryRow(ctx, "SELECT type, title FROM anime WHERE id = $1", input.AnimeID).Scan(&animeType, &animeTitle); err != nil {
		return nil, fmt.Errorf("lookup anime type anime=%d: %w", input.AnimeID, err)
	}
	isFilm := mapAnimeTypeToEpisodeType(animeType) == "movie"
	episodeTypeID, err := lookupIDByName(ctx, tx, "episode_types", mapAnimeTypeToEpisodeType(animeType))
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
		episodeID, created, err := upsertImportEpisode(ctx, tx, input.AnimeID, episodeTypeID, isFilm, animeTitle, plan.canonicalByNumber[number])
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
		media := plan.mediaByID[models.JellyfinSourceKey{ItemID: mapping.MediaItemID, SourceID: mapping.MediaSourceID}]
		releaseIDs := episodeImportReleaseIDs{
			AnimeID:          input.AnimeID,
			PrimaryEpisodeID: episodeIDsByNumber[mapping.TargetEpisodeNumbers[0]],
			ReleaseSourceID:  releaseSourceID,
			StreamTypeID:     streamTypeID,
		}
		created, err := upsertImportReleaseGraph(ctx, tx, r.crewSeeder, releaseIDs, mapping, media, episodeIDsByNumber)
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
	AnimeID          int64
	PrimaryEpisodeID int64
	ReleaseSourceID  int64
	StreamTypeID     int64
}

// mapAnimeTypeToEpisodeType leitet den Standard-Episodentyp für neu
// importierte Episoden aus dem Anime-Typ ab (GAP-12: OVA/ONA/Movie/Special
// wurden vorher immer fest auf "episode" gesetzt). Unbekannte oder leere
// Werte fallen sicher auf "episode" zurück -- entspricht dem bisherigen Verhalten.
func mapAnimeTypeToEpisodeType(animeType string) string {
	switch animeType {
	case "ova":
		return "ova"
	case "ona":
		return "ona"
	case "film":
		return "movie"
	case "special":
		return "special"
	default:
		return "episode"
	}
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
	isFilm bool,
	animeTitle string,
	canonical models.EpisodeImportCanonicalEpisode,
) (int64, bool, error) {
	episodeNumber := strconv.Itoa(int(canonical.EpisodeNumber))
	displayTitle := episodeImportDisplayTitle(canonical, isFilm, animeTitle)
	fillerTypeID, err := lookupEpisodeFillerType(ctx, tx, canonical.FillerType)
	if err != nil {
		return 0, false, err
	}

	// CR-02 (164 code review): match the existing episode on (anime_id, number)
	// alone. episodeTypeID is now derived per-anime from anime.type (GAP-12), so
	// it can legitimately differ from what was stored the first time this anime
	// was imported -- matching on it too would cause a second, duplicate row to
	// be INSERTed instead of the pre-existing one being UPDATEd. There can only
	// ever be one canonical episode per (anime_id, number); whether the derived
	// type actually gets written is decided below, gated on episode_type_source.
	var existingID int64
	err = tx.QueryRow(ctx, `
		SELECT id
		FROM episodes
		WHERE anime_id = $1 AND number = $2
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, canonical.EpisodeNumber).Scan(&existingID)
	if errors.Is(err, pgx.ErrNoRows) {
		var createdID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO episodes (
				anime_id, episode_number, title, status, episode_type_id, episode_type_source,
				number, number_decimal, number_text, sort_index,
				filler_type_id, filler_source, filler_note, modified_at
			)
			VALUES ($1, $2, $3, 'disabled', $4, $11, $5, $6, $2, $7, $8, $9, $10, NOW())
			RETURNING id
		`, animeID, episodeNumber, displayTitle, episodeTypeID, canonical.EpisodeNumber, float64(canonical.EpisodeNumber), canonical.EpisodeNumber, fillerTypeID, canonical.FillerSource, canonical.FillerNote, models.EpisodeMetadataSourceImport).Scan(&createdID); err != nil {
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
		    episode_type_id = CASE WHEN episode_type_source = $9 THEN episode_type_id ELSE $2 END,
		    episode_type_source = CASE WHEN episode_type_source = $9 THEN episode_type_source ELSE $10 END,
		    number = COALESCE(number, $3),
		    number_decimal = COALESCE(number_decimal, $3),
		    number_text = COALESCE(NULLIF(BTRIM(number_text), ''), $4),
		    sort_index = COALESCE(sort_index, $3),
		    filler_type_id = CASE WHEN filler_source = $9 THEN filler_type_id ELSE COALESCE($5, filler_type_id) END,
		    filler_note = CASE WHEN filler_source = $9 THEN filler_note ELSE COALESCE($7, filler_note) END,
		    filler_source = CASE WHEN filler_source = $9 THEN filler_source ELSE COALESCE($6, filler_source) END,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $8
	`, displayTitle, episodeTypeID, canonical.EpisodeNumber, episodeNumber, fillerTypeID, canonical.FillerSource, canonical.FillerNote, existingID, models.EpisodeMetadataSourceManual, models.EpisodeMetadataSourceImport); err != nil {
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

// episodeImportDisplayTitle (GAP-22, 165-UAT.md, Auftraggeber-Entscheidung
// 2026-09-23) ist die EINZIGE Stelle, die den finalen Fallback-Episodentitel
// synthetisiert. Ein echter gescrapter Titel hat immer Vorrang vor dem
// Filmtitel-Fallback; der Filmtitel-Fallback (isFilm) hat wiederum Vorrang
// vor dem literalen "Episode N"-Fallback für Serien.
func episodeImportDisplayTitle(canonical models.EpisodeImportCanonicalEpisode, isFilm bool, animeTitle string) string {
	for _, lang := range []string{"de", "en", "ja"} {
		if title := strings.TrimSpace(canonical.TitlesByLanguage[lang]); title != "" {
			return title
		}
	}
	if canonical.Title != nil && strings.TrimSpace(*canonical.Title) != "" {
		return strings.TrimSpace(*canonical.Title)
	}
	if isFilm {
		if trimmed := strings.TrimSpace(animeTitle); trimmed != "" {
			return trimmed
		}
	}
	return fmt.Sprintf("Episode %d", canonical.EpisodeNumber)
}
