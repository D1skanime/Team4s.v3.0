package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// resolveMemberGroupsForSync löst Fansub-Gruppen-Eingaben für den Editor-Sync auf.
// Delegiert an resolveImportFansubMemberGroups aus episode_import_repository_fansub_helpers.go.
func resolveMemberGroupsForSync(
	ctx context.Context,
	tx pgx.Tx,
	fansubGroups []models.SelectedFansubGroupInput,
	fansubGroupID *int64,
) ([]resolvedImportFansubGroup, error) {
	if len(fansubGroups) > 0 {
		return resolveImportFansubMemberGroups(ctx, tx, fansubGroups)
	}
	if fansubGroupID != nil && *fansubGroupID > 0 {
		group, err := lookupImportFansubGroupByID(ctx, tx, *fansubGroupID)
		if err != nil {
			return nil, err
		}
		return []resolvedImportFansubGroup{*group}, nil
	}
	return nil, nil
}

// upsertReleaseVersionGroupsForSync schreibt N Junction-Zeilen für N echte Gruppen
// in release_version_groups. Überzählige Einträge werden gelöscht (D-05).
func upsertReleaseVersionGroupsForSync(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	memberGroups []resolvedImportFansubGroup,
) error {
	newIDs := make([]int64, len(memberGroups))
	for i, g := range memberGroups {
		newIDs[i] = g.ID
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND fansub_group_id <> ALL($2::bigint[])
	`, releaseVersionID, newIDs); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}
	for _, group := range memberGroups {
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id)
			VALUES ($1, $2)
			ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
		`, releaseVersionID, group.ID); err != nil {
			return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
		}
	}
	return nil
}

func syncEpisodeVersionSelectedGroups(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	animeID int64,
	fansubGroups []models.SelectedFansubGroupInput,
	fansubGroupID *int64,
	reset bool,
) error {
	if !reset {
		return nil
	}

	memberGroups, err := resolveMemberGroupsForSync(ctx, tx, fansubGroups, fansubGroupID)
	if err != nil {
		return err
	}
	if len(memberGroups) == 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("clear release version groups version=%d: %w", releaseVersionID, err)
		}
		return nil
	}

	if err := upsertReleaseVersionGroupsForSync(ctx, tx, releaseVersionID, memberGroups); err != nil {
		return err
	}
	return ensureAnimeFansubGroupLinksForMembers(ctx, tx, animeID, memberGroups)
}
