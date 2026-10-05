package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// MergeGroups merges multiple source fansub groups into a target group.
// All release group links, anime_fansub_groups, and members are migrated.
// Source group slugs become aliases on the target.
// Source groups are then deleted.
func (r *FansubRepository) MergeGroups(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsResult, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified for merge")
	}

	// Check target exists
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	conflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}
	if conflicts > 0 {
		return nil, ErrConflict
	}

	// Start transaction
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin merge tx: %w", err)
	}
	defer tx.Rollback(ctx)

	result := &models.MergeGroupsResult{
		AliasesAdded: make([]string, 0, len(sourceIDs)),
	}

	// 1. Migrate release group links
	tag, err := tx.Exec(ctx, `
		UPDATE release_version_groups
		SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate release version groups: %w", err)
	}
	result.VersionsMigrated = int(tag.RowsAffected())

	// 2. Migrate anime_fansub_groups (ignore duplicates)
	tag, err = tx.Exec(ctx, `
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes, created_at)
		SELECT anime_id, $1, false, notes, created_at
		FROM anime_fansub_groups WHERE fansub_group_id = ANY($2)
		ON CONFLICT (anime_id, fansub_group_id) DO NOTHING
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate anime fansub relations: %w", err)
	}
	result.RelationsMigrated = int(tag.RowsAffected())

	// 3. Migrate members (basic handling - no unique constraint)
	tag, err = tx.Exec(ctx, `
		UPDATE fansub_members SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate fansub members: %w", err)
	}
	result.MembersMigrated = int(tag.RowsAffected())

	// 4. Add source slugs as aliases on target
	rows, err := tx.Query(ctx, `
		SELECT slug FROM fansub_groups WHERE id = ANY($1) ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch source slugs: %w", err)
	}
	var slugs []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan source slug: %w", err)
		}
		slugs = append(slugs, slug)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate source slugs: %w", err)
	}

	for _, slug := range slugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
			VALUES ($1, $2, $3)
			ON CONFLICT (normalized_alias) DO NOTHING
		`, targetID, slug, normalized)
		if err != nil {
			return nil, fmt.Errorf("add alias %q: %w", slug, err)
		}
		if tag.RowsAffected() > 0 {
			result.AliasesAdded = append(result.AliasesAdded, slug)
		}
	}

	// 5. Delete source groups (CASCADE handles members and anime_fansub_groups)
	tag, err = tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = ANY($1)`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("delete source groups: %w", err)
	}
	result.MergedCount = int(tag.RowsAffected())

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit merge tx: %w", err)
	}

	return result, nil
}

// normalizeAliasKey returns a lowercase alphanumeric-only version of the alias
func normalizeAliasKey(raw string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(raw) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// GetMergePreview returns statistics about what would happen if groups were merged
func (r *FansubRepository) GetMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsPreview, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified")
	}
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	versionConflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}

	result := &models.MergeGroupsPreview{
		MergedCount:    len(sourceIDs),
		AliasesAdded:   make([]string, 0, len(sourceIDs)),
		AliasesSkipped: make([]string, 0, len(sourceIDs)),
		CanMerge:       versionConflicts == 0,
		Conflicts: models.MergePreviewConflicts{
			VersionConflicts:          versionConflicts,
			DuplicateAliases:          make([]string, 0, 8),
			DuplicateMembers:          make([]string, 0, 8),
			DuplicateRelationAnimeIDs: make([]int64, 0, 16),
			DuplicateSlugs:            make([]string, 0, 4),
			DuplicateNames:            make([]string, 0, 4),
		},
	}

	// Count release version group links
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM release_version_groups
		WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.VersionsMigrated); err != nil {
		return nil, fmt.Errorf("count release version groups: %w", err)
	}

	// Count members
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_members WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.MembersMigrated); err != nil {
		return nil, fmt.Errorf("count members: %w", err)
	}

	// Count anime relations
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_fansub_groups WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.RelationsMigrated); err != nil {
		return nil, fmt.Errorf("count relations: %w", err)
	}

	if err := r.populateAliasMergePreview(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeMemberDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeRelationDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeNameSlugCollisions(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}

	return result, nil
}
