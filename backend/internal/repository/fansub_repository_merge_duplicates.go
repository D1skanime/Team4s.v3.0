package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

func (r *FansubRepository) populateAliasMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	rows, err := r.db.Query(ctx, `
		SELECT slug
		FROM fansub_groups
		WHERE id = ANY($1)
		ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview source groups: %w", err)
	}
	defer rows.Close()

	sourceSlugs := make([]string, 0, len(sourceIDs))
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return fmt.Errorf("scan merge preview source group: %w", err)
		}
		sourceSlugs = append(sourceSlugs, slug)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview source groups: %w", err)
	}

	normalizedInputs := make([]string, 0, len(sourceSlugs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		normalizedInputs = append(normalizedInputs, normalized)
	}

	existingNormalized := make(map[string]struct{}, len(normalizedInputs)+2)
	if len(normalizedInputs) > 0 {
		aliasRows, err := r.db.Query(ctx, `
			SELECT normalized_alias
			FROM fansub_group_aliases
			WHERE normalized_alias = ANY($1)
		`, normalizedInputs)
		if err != nil {
			return fmt.Errorf("query merge preview alias collisions: %w", err)
		}
		for aliasRows.Next() {
			var normalized string
			if err := aliasRows.Scan(&normalized); err != nil {
				aliasRows.Close()
				return fmt.Errorf("scan merge preview alias collision: %w", err)
			}
			existingNormalized[normalized] = struct{}{}
		}
		aliasRows.Close()
		if err := aliasRows.Err(); err != nil {
			return fmt.Errorf("iterate merge preview alias collisions: %w", err)
		}
	}

	acceptedNormalized := make(map[string]struct{}, len(normalizedInputs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := existingNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := acceptedNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		acceptedNormalized[normalized] = struct{}{}
		result.AliasesAdded = append(result.AliasesAdded, slug)
	}

	duplicateAliases := make([]string, 0, len(result.AliasesSkipped))
	seenDuplicateAlias := make(map[string]struct{}, len(result.AliasesSkipped))
	for _, slug := range result.AliasesSkipped {
		if _, exists := seenDuplicateAlias[slug]; exists {
			continue
		}
		seenDuplicateAlias[slug] = struct{}{}
		duplicateAliases = append(duplicateAliases, slug)
	}
	result.Conflicts.DuplicateAliases = duplicateAliases
	result.Conflicts.DuplicateAliasesCount = len(duplicateAliases)

	return nil
}

func (r *FansubRepository) populateMergeMemberDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH duplicate_members AS (
			SELECT
				lower(btrim(handle)) AS handle_key,
				lower(btrim(role)) AS role_key,
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_members
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateMembersCount); err != nil {
		return fmt.Errorf("count merge preview duplicate members: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH duplicate_members AS (
			SELECT
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT display_handle, display_role, duplicate_count
		FROM duplicate_members
		ORDER BY duplicate_count DESC, display_handle ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate members: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var handle string
		var role string
		var count int
		if err := rows.Scan(&handle, &role, &count); err != nil {
			return fmt.Errorf("scan merge preview duplicate member: %w", err)
		}
		result.Conflicts.DuplicateMembers = append(result.Conflicts.DuplicateMembers, fmt.Sprintf("%s (%s) x%d", handle, role, count))
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate members: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeRelationDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT COUNT(*) FROM duplicate_rel
	`, sourceIDs, targetID).Scan(&result.Conflicts.DuplicateRelationsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate relations: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT anime_id
		FROM duplicate_rel
		ORDER BY anime_id ASC
		LIMIT 25
	`, sourceIDs, targetID)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate relations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var animeID int64
		if err := rows.Scan(&animeID); err != nil {
			return fmt.Errorf("scan merge preview duplicate relation: %w", err)
		}
		result.Conflicts.DuplicateRelationAnimeIDs = append(result.Conflicts.DuplicateRelationAnimeIDs, animeID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate relations: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeNameSlugCollisions(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug))
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_slugs
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateSlugsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate slugs: %w", err)
	}

	slugRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug)) AS slug_key, MIN(slug) AS slug_label
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT slug_label
		FROM duplicate_slugs
		ORDER BY slug_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate slugs: %w", err)
	}
	for slugRows.Next() {
		var slug string
		if err := slugRows.Scan(&slug); err != nil {
			slugRows.Close()
			return fmt.Errorf("scan merge preview duplicate slug: %w", err)
		}
		result.Conflicts.DuplicateSlugs = append(result.Conflicts.DuplicateSlugs, slug)
	}
	slugRows.Close()
	if err := slugRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate slugs: %w", err)
	}

	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name))
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_names
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateNamesCount); err != nil {
		return fmt.Errorf("count merge preview duplicate names: %w", err)
	}

	nameRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name)) AS name_key, MIN(name) AS name_label
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT name_label
		FROM duplicate_names
		ORDER BY name_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate names: %w", err)
	}
	for nameRows.Next() {
		var name string
		if err := nameRows.Scan(&name); err != nil {
			nameRows.Close()
			return fmt.Errorf("scan merge preview duplicate name: %w", err)
		}
		result.Conflicts.DuplicateNames = append(result.Conflicts.DuplicateNames, name)
	}
	nameRows.Close()
	if err := nameRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate names: %w", err)
	}

	return nil
}

func (r *FansubRepository) countExistingFansubGroups(ctx context.Context, ids []int64) (int, error) {
	var count int
	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM fansub_groups WHERE id = ANY($1)`,
		ids,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("count existing fansub groups: %w", err)
	}

	return count, nil
}

func (r *FansubRepository) countMergeVersionConflicts(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (int, error) {
	var conflicts int
	if err := r.db.QueryRow(ctx, `
		WITH candidate_versions AS (
			SELECT
				fr.episode_id,
				rev.id AS release_version_id,
				COALESCE(rv.video_quality, rv.resolution, '') AS video_quality_key,
				COALESCE(rv.subtitle_type, '') AS subtitle_type_key,
				CASE
					WHEN rvg.fansub_group_id = ANY($1) THEN $2
					ELSE rvg.fansub_group_id
				END AS target_group_id
			FROM release_version_groups rvg
			JOIN release_versions rev ON rev.id = rvg.release_version_id
			JOIN fansub_releases fr ON fr.id = rev.release_id
			LEFT JOIN release_variants rv ON rv.release_version_id = rev.id
			WHERE rvg.fansub_group_id = $2
			   OR rvg.fansub_group_id = ANY($1)
		)
		SELECT COUNT(*)
		FROM (
			SELECT 1
			FROM candidate_versions
			GROUP BY episode_id, release_version_id, target_group_id, video_quality_key, subtitle_type_key
			HAVING COUNT(*) > 1
		) conflicts
	`, sourceIDs, targetID).Scan(&conflicts); err != nil {
		return 0, fmt.Errorf("count merge conflicts: %w", err)
	}

	return conflicts, nil
}
