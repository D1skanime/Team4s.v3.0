package repository

import (
	"context"
	"fmt"
)

// RoleHolderEntry is the repository-local row shape returned by
// ListRoleHolders. Field set and json tags MUST stay identical to
// handlers.RoleHolderEntry — the handler projects this type one-to-one with
// no transformation (Plan 138-01, D-07).
type RoleHolderEntry struct {
	AppUserID        int64  `json:"app_user_id"`
	DisplayName      string `json:"display_name"`
	Email            string `json:"email"`
	FansubGroupID    int64  `json:"fansub_group_id"`
	FansubGroupName  string `json:"fansub_group_name"`
	MembershipStatus string `json:"membership_status"`
	HasOverrides     bool   `json:"has_overrides"`
}

// ListRoleHolders answers "who holds fansub-group role X, in which group,
// with what membership status and override presence" (138-RESEARCH.md R-03,
// D-07). This is the one genuinely missing query for real role_definitions
// fansub-group-context roles (fansub_lead, co_leader, encoder, ...); global
// app roles (platform_admin/content_admin/user) are explicitly out of scope
// here and already have a working answer via /admin/users?role=<code>.
//
// Callers MUST validate roleCode via permissions.IsKnownFansubGroupRole
// before calling this method — the query itself does not guard against an
// unknown role code, it simply returns zero rows.
//
// One query, no N+1: fansub_group_member_roles is joined to
// fansub_group_members, fansub_groups and app_users, with an EXISTS subquery
// against user_group_capability_overrides for the has_overrides signal
// (existence-only — D-07 does not need individual override enumeration
// here).
func (r *AuthzRepository) ListRoleHolders(ctx context.Context, roleCode string) ([]RoleHolderEntry, error) {
	query := `
		SELECT
			fgm.app_user_id,
			COALESCE(NULLIF(au.display_name, ''), NULLIF(au.preferred_username, ''), au.email) AS display_name,
			au.email,
			fgm.fansub_group_id,
			fg.name,
			fgm.status,
			EXISTS(
				SELECT 1 FROM user_group_capability_overrides ugco
				WHERE ugco.app_user_id = fgm.app_user_id
				  AND ugco.fansub_group_id = fgm.fansub_group_id
			) AS has_overrides
		FROM fansub_group_member_roles fgmr
		JOIN fansub_group_members fgm ON fgm.id = fgmr.fansub_group_member_id
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		JOIN app_users au ON au.id = fgm.app_user_id
		WHERE fgmr.role = $1
		ORDER BY fg.name, au.email
	`

	rows, err := r.db.Query(ctx, query, roleCode)
	if err != nil {
		return nil, fmt.Errorf("list role holders: query: %w", err)
	}
	defer rows.Close()

	entries := make([]RoleHolderEntry, 0)
	for rows.Next() {
		var entry RoleHolderEntry
		if err := rows.Scan(
			&entry.AppUserID,
			&entry.DisplayName,
			&entry.Email,
			&entry.FansubGroupID,
			&entry.FansubGroupName,
			&entry.MembershipStatus,
			&entry.HasOverrides,
		); err != nil {
			return nil, fmt.Errorf("list role holders: scan: %w", err)
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list role holders: rows: %w", err)
	}

	return entries, nil
}
