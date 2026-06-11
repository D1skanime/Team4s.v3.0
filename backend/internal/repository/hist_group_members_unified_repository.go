package repository

import (
	"context"
	"fmt"
)

// UnifiedGroupMember ist ein vereinheitlichter Personeneintrag, der sowohl historische
// als auch App-Member einer Fansub-Gruppe über members.id zusammenführt.
// Wird vom /unified-members-Endpoint genutzt (D-02, T-82-02-04).
type UnifiedGroupMember struct {
	MemberID      int64    `json:"member_id"`
	DisplayName   string   `json:"display_name"`
	Source        string   `json:"source"`         // "hist" | "app"
	HasAppAccount bool     `json:"has_app_account"`
	GroupRoles    []string `json:"group_roles"`
}

// ListUnifiedByFansub gibt alle Member einer Fansub-Gruppe zurück — historische und
// App-Member vereinheitlicht über members.id. Jeder Member erscheint einmal; bei
// Überschneidung (hist + app via member_id) wird der App-Eintrag bevorzugt (Source="app").
func (r *HistGroupMembersRepository) ListUnifiedByFansub(
	ctx context.Context,
	fansubGroupID int64,
) ([]UnifiedGroupMember, error) {
	rows, err := r.db.Query(ctx, `
		WITH hist_members AS (
			SELECT
				m.id AS member_id,
				m.nickname AS display_name,
				'hist' AS source,
				EXISTS(
					SELECT 1 FROM member_claims mc
					WHERE mc.member_id = m.id AND mc.claim_status = 'verified'
				) AS has_app_account,
				COALESCE(
					ARRAY_AGG(DISTINCT hgmr.role_code) FILTER (WHERE hgmr.role_code IS NOT NULL),
					ARRAY[]::text[]
				) AS group_roles
			FROM hist_fansub_group_members hfgm
			JOIN members m ON m.id = hfgm.member_id
			LEFT JOIN hist_group_member_roles hgmr ON hgmr.hist_fansub_group_member_id = hfgm.id
			WHERE hfgm.fansub_group_id = $1
			GROUP BY m.id, m.nickname
		),
		app_members AS (
			SELECT
				m.id AS member_id,
				COALESCE(
					NULLIF(TRIM(au.display_name), ''),
					NULLIF(TRIM(au.preferred_username), ''),
					NULLIF(TRIM(au.email), ''),
					m.nickname
				) AS display_name,
				'app' AS source,
				true AS has_app_account,
				COALESCE(
					ARRAY_AGG(DISTINCT fgmr.role) FILTER (WHERE fgmr.role IS NOT NULL),
					ARRAY[]::text[]
				) AS group_roles
			FROM fansub_group_members fgm
			JOIN app_users au ON au.id = fgm.app_user_id
			JOIN members m ON m.id = fgm.member_id
			LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
			WHERE fgm.fansub_group_id = $1
			  AND fgm.status = 'active'
			  AND fgm.member_id IS NOT NULL
			GROUP BY m.id, au.display_name, au.preferred_username, au.email, m.nickname
		),
		combined AS (
			SELECT * FROM app_members
			UNION ALL
			SELECT * FROM hist_members
			WHERE member_id NOT IN (SELECT member_id FROM app_members)
		)
		SELECT member_id, display_name, source, has_app_account, group_roles
		FROM combined
		ORDER BY display_name, member_id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list unified group members: %w", err)
	}
	defer rows.Close()

	result := make([]UnifiedGroupMember, 0)
	for rows.Next() {
		var row UnifiedGroupMember
		if err := rows.Scan(
			&row.MemberID,
			&row.DisplayName,
			&row.Source,
			&row.HasAppAccount,
			&row.GroupRoles,
		); err != nil {
			return nil, fmt.Errorf("list unified group members: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list unified group members: iterate: %w", err)
	}
	return result, nil
}
