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
	if _, err := buildEpisodeImportApplyPlan(input); err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("episode import apply is deferred until Phase 20 release-native writes are implemented")
}

func (r *EpisodeImportRepository) PreviewExistingCoverage(
	ctx context.Context,
	animeID int64,
) (models.EpisodeImportExistingCoverage, error) {
	if r == nil || r.db == nil {
		return models.EpisodeImportExistingCoverage{}, fmt.Errorf("episode import repository is not configured")
	}

	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(ss.external_id, rs.jellyfin_item_id, ''), ARRAY_AGG(CAST(e.episode_number AS INTEGER) ORDER BY rve.position, CAST(e.episode_number AS INTEGER))
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN release_variant_episodes rve ON rve.release_variant_id = rv.id
		JOIN episodes e ON e.id = rve.episode_id
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
		WHERE e.anime_id = $1
		  AND e.episode_number ~ '^[0-9]+$'
		GROUP BY rv.id, ss.external_id, rs.jellyfin_item_id
		ORDER BY MIN(CAST(e.episode_number AS INTEGER)), rv.id
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

	seenMediaIDs := make(map[string]struct{}, len(input.Mappings))
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
		if _, ok := seenMediaIDs[mapping.MediaItemID]; ok {
			return episodeImportApplyPlan{}, fmt.Errorf("duplicate media_item_id %s in mappings", mapping.MediaItemID)
		}
		seenMediaIDs[mapping.MediaItemID] = struct{}{}
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
