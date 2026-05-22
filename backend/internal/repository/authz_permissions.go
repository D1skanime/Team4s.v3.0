package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)

func (r *AuthzRepository) ResolveFansubGroup(ctx context.Context, fansubGroupID int64) (*permissions.Context, error) {
	if fansubGroupID <= 0 {
		return nil, nil
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)
	`, fansubGroupID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("resolve fansub group %d: %w", fansubGroupID, err)
	}
	if !exists {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: []int64{fansubGroupID},
	}, nil
}

func (r *AuthzRepository) ResolveRelease(ctx context.Context, releaseID int64) (*permissions.Context, error) {
	if releaseID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT rvg.fansub_group_id
		FROM release_versions rv
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rv.release_id = $1
		ORDER BY rvg.fansub_group_id
	`, releaseID)
	if err != nil {
		return nil, fmt.Errorf("resolve release %d: %w", releaseID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	for rows.Next() {
		var groupID int64
		if err := rows.Scan(&groupID); err != nil {
			return nil, fmt.Errorf("resolve release %d: scan: %w", releaseID, err)
		}
		groupIDs = append(groupIDs, groupID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release %d: iterate: %w", releaseID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
	}, nil
}

func (r *AuthzRepository) ResolveReleaseVersion(ctx context.Context, releaseVersionID int64) (*permissions.Context, error) {
	if releaseVersionID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT fansub_group_id
		FROM release_version_groups
		WHERE release_version_id = $1
		ORDER BY fansub_group_id
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("resolve release version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	for rows.Next() {
		var groupID int64
		if err := rows.Scan(&groupID); err != nil {
			return nil, fmt.Errorf("resolve release version %d: scan: %w", releaseVersionID, err)
		}
		groupIDs = append(groupIDs, groupID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release version %d: iterate: %w", releaseVersionID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
	}, nil
}

func (r *AuthzRepository) ResolveReleaseVersionMedia(ctx context.Context, relationID int64) (*permissions.Context, error) {
	if relationID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			rvg.fansub_group_id,
			au.id
		FROM release_version_media rvm
		JOIN release_version_groups rvg ON rvg.release_version_id = rvm.release_version_id
		LEFT JOIN app_users au ON au.legacy_user_id = rvm.uploaded_by_user_id
		WHERE rvm.id = $1
		  AND rvm.deleted_at IS NULL
		ORDER BY rvg.fansub_group_id
	`, relationID)
	if err != nil {
		return nil, fmt.Errorf("resolve release version media %d: %w", relationID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	var ownerAppUserID *int64
	for rows.Next() {
		var groupID int64
		var ownerID *int64
		if err := rows.Scan(&groupID, &ownerID); err != nil {
			return nil, fmt.Errorf("resolve release version media %d: scan: %w", relationID, err)
		}
		groupIDs = append(groupIDs, groupID)
		if ownerID != nil && *ownerID > 0 {
			value := *ownerID
			ownerAppUserID = &value
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release version media %d: iterate: %w", relationID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
		OwnerAppUserID: ownerAppUserID,
	}, nil
}

func (r *AuthzRepository) ListActorGroupRoles(ctx context.Context, appUserID int64, fansubGroupID int64) ([]string, error) {
	if appUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT fgr.role
		FROM fansub_group_members fgm
		JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
		WHERE fgm.app_user_id = $1
		  AND fgm.fansub_group_id = $2
		  AND fgm.status = 'active'
		ORDER BY fgr.role
	`, appUserID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	defer rows.Close()

	roles := make([]string, 0)
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: scan: %w", appUserID, fansubGroupID, err)
		}
		roles = append(roles, strings.TrimSpace(role))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: iterate: %w", appUserID, fansubGroupID, err)
	}

	return roles, nil
}
