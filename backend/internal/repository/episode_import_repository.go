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
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeImportRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeImportRepository(db *pgxpool.Pool) *EpisodeImportRepository {
	return &EpisodeImportRepository{db: db}
}

func (r *EpisodeImportRepository) Apply(
	ctx context.Context,
	input models.EpisodeImportApplyInput,
) (*models.EpisodeImportApplyResult, error) {
	if r == nil || r.db == nil {
		return nil, fmt.Errorf("episode import repository is not configured")
	}
	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin episode import apply tx anime=%d: %w", input.AnimeID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	result := &models.EpisodeImportApplyResult{AnimeID: input.AnimeID}
	episodeIDsByNumber := make(map[int32]int64, len(plan.canonicalByNumber))

	for _, episodeNumber := range sortedEpisodeImportNumbers(plan.canonicalByNumber) {
		canonical := plan.canonicalByNumber[episodeNumber]
		episodeID, created, err := upsertImportEpisode(ctx, tx, input.AnimeID, canonical)
		if err != nil {
			return nil, err
		}
		episodeIDsByNumber[episodeNumber] = episodeID
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
		primaryEpisodeNumber := mapping.TargetEpisodeNumbers[0]
		versionID, created, err := upsertImportEpisodeVersion(ctx, tx, input.AnimeID, primaryEpisodeNumber, plan.mediaByID[mapping.MediaItemID])
		if err != nil {
			return nil, err
		}
		if created {
			result.VersionsCreated++
		} else {
			result.VersionsUpdated++
		}
		if err := replaceImportCoverage(ctx, tx, versionID, mapping.TargetEpisodeNumbers, episodeIDsByNumber); err != nil {
			return nil, err
		}
		result.MappingsApplied++
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit episode import apply tx anime=%d: %w", input.AnimeID, err)
	}

	return result, nil
}

func (r *EpisodeImportRepository) PreviewExistingCoverage(
	ctx context.Context,
	animeID int64,
) (models.EpisodeImportExistingCoverage, error) {
	if r == nil || r.db == nil {
		return models.EpisodeImportExistingCoverage{}, fmt.Errorf("episode import repository is not configured")
	}

	rows, err := r.db.Query(ctx, `
		SELECT ev.media_item_id, COALESCE(
			ARRAY_AGG(CAST(e.episode_number AS INTEGER) ORDER BY eve.coverage_order, CAST(e.episode_number AS INTEGER))
				FILTER (WHERE e.episode_number ~ '^[0-9]+$'),
			ARRAY[ev.episode_number]
		)
		FROM episode_versions ev
		LEFT JOIN episode_version_episodes eve ON eve.episode_version_id = ev.id
		LEFT JOIN episodes e ON e.id = eve.episode_id
		WHERE ev.anime_id = $1
		GROUP BY ev.id
		ORDER BY ev.episode_number, ev.id
	`, animeID)
	if err != nil {
		return models.EpisodeImportExistingCoverage{}, fmt.Errorf("query existing episode import coverage anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	result := models.EpisodeImportExistingCoverage{AnimeID: animeID}
	for rows.Next() {
		var row models.EpisodeImportMappingRow
		if err := rows.Scan(&row.MediaItemID, &row.TargetEpisodeNumbers); err != nil {
			return models.EpisodeImportExistingCoverage{}, fmt.Errorf("scan existing episode import coverage anime=%d: %w", animeID, err)
		}
		row.SuggestedEpisodeNumbers = append([]int32(nil), row.TargetEpisodeNumbers...)
		row.Status = models.EpisodeImportMappingStatusConfirmed
		result.Mappings = append(result.Mappings, row)
	}
	if err := rows.Err(); err != nil {
		return models.EpisodeImportExistingCoverage{}, fmt.Errorf("iterate existing episode import coverage anime=%d: %w", animeID, err)
	}

	return result, nil
}

type episodeImportApplyPlan struct {
	canonicalByNumber map[int32]models.EpisodeImportCanonicalEpisode
	mediaByID         map[string]models.EpisodeImportMediaCandidate
	mappings          []models.EpisodeImportMappingRow
}

func buildEpisodeImportApplyPlan(input models.EpisodeImportApplyInput) (episodeImportApplyPlan, error) {
	if input.AnimeID <= 0 {
		return episodeImportApplyPlan{}, fmt.Errorf("anime_id is required")
	}

	plan := episodeImportApplyPlan{
		canonicalByNumber: make(map[int32]models.EpisodeImportCanonicalEpisode, len(input.CanonicalEpisodes)),
		mediaByID:         make(map[string]models.EpisodeImportMediaCandidate, len(input.MediaCandidates)),
	}
	for _, canonical := range input.CanonicalEpisodes {
		if canonical.EpisodeNumber <= 0 {
			return episodeImportApplyPlan{}, fmt.Errorf("canonical episode number must be positive")
		}
		plan.canonicalByNumber[canonical.EpisodeNumber] = canonical
	}
	for _, media := range input.MediaCandidates {
		mediaID := strings.TrimSpace(media.MediaItemID)
		if mediaID == "" {
			return episodeImportApplyPlan{}, fmt.Errorf("media_item_id is required")
		}
		media.MediaItemID = mediaID
		plan.mediaByID[mediaID] = media
	}

	claimed := make(map[int32]string, len(input.Mappings))
	for _, mapping := range input.Mappings {
		mapping.MediaItemID = strings.TrimSpace(mapping.MediaItemID)
		switch mapping.Status {
		case models.EpisodeImportMappingStatusSkipped:
			plan.mappings = append(plan.mappings, mapping)
			continue
		case models.EpisodeImportMappingStatusConfirmed:
		case models.EpisodeImportMappingStatusSuggested, models.EpisodeImportMappingStatusConflict:
			return episodeImportApplyPlan{}, fmt.Errorf("mapping %s must be confirmed or skipped before apply", mapping.MediaItemID)
		default:
			return episodeImportApplyPlan{}, fmt.Errorf("mapping %s has unsupported status %q", mapping.MediaItemID, mapping.Status)
		}
		if mapping.MediaItemID == "" {
			return episodeImportApplyPlan{}, fmt.Errorf("media_item_id is required")
		}
		if len(mapping.TargetEpisodeNumbers) == 0 {
			return episodeImportApplyPlan{}, fmt.Errorf("mapping %s requires at least one target episode", mapping.MediaItemID)
		}
		targets, err := normalizeEpisodeImportTargets(mapping.TargetEpisodeNumbers)
		if err != nil {
			return episodeImportApplyPlan{}, fmt.Errorf("mapping %s: %w", mapping.MediaItemID, err)
		}
		mapping.TargetEpisodeNumbers = targets
		if _, ok := plan.mediaByID[mapping.MediaItemID]; !ok {
			plan.mediaByID[mapping.MediaItemID] = models.EpisodeImportMediaCandidate{MediaItemID: mapping.MediaItemID}
		}
		for _, episodeNumber := range targets {
			if _, ok := plan.canonicalByNumber[episodeNumber]; !ok {
				plan.canonicalByNumber[episodeNumber] = models.EpisodeImportCanonicalEpisode{EpisodeNumber: episodeNumber}
			}
			if previousMediaID, exists := claimed[episodeNumber]; exists && previousMediaID != mapping.MediaItemID {
				return episodeImportApplyPlan{}, fmt.Errorf("episode %d is claimed by both %s and %s", episodeNumber, previousMediaID, mapping.MediaItemID)
			}
			claimed[episodeNumber] = mapping.MediaItemID
		}
		plan.mappings = append(plan.mappings, mapping)
	}

	return plan, nil
}

func normalizeEpisodeImportTargets(targets []int32) ([]int32, error) {
	seen := make(map[int32]struct{}, len(targets))
	normalized := make([]int32, 0, len(targets))
	for _, target := range targets {
		if target <= 0 {
			return nil, fmt.Errorf("target episode numbers must be positive")
		}
		if _, ok := seen[target]; ok {
			continue
		}
		seen[target] = struct{}{}
		normalized = append(normalized, target)
	}
	sort.Slice(normalized, func(i, j int) bool {
		return normalized[i] < normalized[j]
	})
	return normalized, nil
}

func sortedEpisodeImportNumbers(items map[int32]models.EpisodeImportCanonicalEpisode) []int32 {
	numbers := make([]int32, 0, len(items))
	for number := range items {
		numbers = append(numbers, number)
	}
	sort.Slice(numbers, func(i, j int) bool {
		return numbers[i] < numbers[j]
	})
	return numbers
}

func upsertImportEpisode(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	canonical models.EpisodeImportCanonicalEpisode,
) (int64, bool, error) {
	episodeNumber := strconv.Itoa(int(canonical.EpisodeNumber))
	var existingID int64
	err := tx.QueryRow(ctx, `
		SELECT id
		FROM episodes
		WHERE anime_id = $1 AND episode_number = $2
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, episodeNumber).Scan(&existingID)
	if errors.Is(err, pgx.ErrNoRows) {
		var createdID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO episodes (anime_id, episode_number, title, status, number, sort_index)
			VALUES ($1, $2, $3, 'disabled', $4, $4)
			RETURNING id
		`, animeID, episodeNumber, canonical.Title, canonical.EpisodeNumber).Scan(&createdID); err != nil {
			return 0, false, fmt.Errorf("create canonical episode anime=%d number=%s: %w", animeID, episodeNumber, err)
		}
		return createdID, true, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("query canonical episode anime=%d number=%s: %w", animeID, episodeNumber, err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE episodes
		SET title = COALESCE(NULLIF(BTRIM(title), ''), $1), updated_at = NOW()
		WHERE id = $2
	`, canonical.Title, existingID); err != nil {
		return 0, false, fmt.Errorf("fill canonical episode title id=%d: %w", existingID, err)
	}
	return existingID, false, nil
}

func upsertImportEpisodeVersion(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	primaryEpisodeNumber int32,
	media models.EpisodeImportMediaCandidate,
) (int64, bool, error) {
	var existingID int64
	err := tx.QueryRow(ctx, `
		SELECT id
		FROM episode_versions
		WHERE anime_id = $1 AND media_provider = 'jellyfin' AND media_item_id = $2
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, media.MediaItemID).Scan(&existingID)
	if errors.Is(err, pgx.ErrNoRows) {
		var createdID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO episode_versions (
				anime_id, episode_number, title, media_provider, media_item_id,
				video_quality, stream_url
			)
			VALUES ($1, $2, NULL, 'jellyfin', $3, $4, $5)
			RETURNING id
		`, animeID, primaryEpisodeNumber, media.MediaItemID, media.VideoQuality, media.StreamURL).Scan(&createdID); err != nil {
			return 0, false, fmt.Errorf("create episode version anime=%d media=%s: %w", animeID, media.MediaItemID, err)
		}
		return createdID, true, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("query episode version anime=%d media=%s: %w", animeID, media.MediaItemID, err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE episode_versions
		SET
			episode_number = $2,
			video_quality = COALESCE(video_quality, $3),
			stream_url = COALESCE(stream_url, $4),
			updated_at = NOW()
		WHERE id = $1
	`, existingID, primaryEpisodeNumber, media.VideoQuality, media.StreamURL); err != nil {
		return 0, false, fmt.Errorf("update episode version id=%d media=%s: %w", existingID, media.MediaItemID, err)
	}
	return existingID, false, nil
}

func replaceImportCoverage(
	ctx context.Context,
	tx pgx.Tx,
	versionID int64,
	targetEpisodeNumbers []int32,
	episodeIDsByNumber map[int32]int64,
) error {
	if _, err := tx.Exec(ctx, `DELETE FROM episode_version_episodes WHERE episode_version_id = $1`, versionID); err != nil {
		return fmt.Errorf("delete episode version coverage version=%d: %w", versionID, err)
	}
	for index, episodeNumber := range targetEpisodeNumbers {
		episodeID, ok := episodeIDsByNumber[episodeNumber]
		if !ok {
			return fmt.Errorf("missing episode id for coverage episode %d", episodeNumber)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO episode_version_episodes (episode_version_id, episode_id, coverage_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (episode_version_id, episode_id)
			DO UPDATE SET coverage_order = EXCLUDED.coverage_order
		`, versionID, episodeID, index+1); err != nil {
			return fmt.Errorf("insert episode version coverage version=%d episode=%d: %w", versionID, episodeID, err)
		}
	}
	return nil
}
