package repository

import (
	"context"
	"fmt"
	"log"
	"time"

	"team4s.v3/backend/internal/permissions"

	"github.com/jackc/pgx/v5"
)

// ResolvePendingRolesToActive übernimmt offene historische Gruppenrollen nach
// einem bestätigten Claim in die aktive App-Mitgliedschaft. Der Pfad ist
// absichtlich fail-open: Ein erfolgreicher Claim darf nicht durch nachgelagerte
// Rollen-Aktivierung zurückfallen.
func (r *MemberClaimsRepository) ResolvePendingRolesToActive(ctx context.Context, memberID int64, fansubGroupID int64, actorAppUserID int64) error {
	if memberID <= 0 || fansubGroupID <= 0 || actorAppUserID <= 0 {
		return fmt.Errorf("resolve pending roles to active: invalid ids")
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT r.role_code
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		WHERE hfgm.member_id = $1
		  AND hfgm.fansub_group_id = $2
		  AND r.ended_date IS NULL
		  AND r.role_code NOT IN ('fansub_lead', 'founder')
		ORDER BY r.role_code
	`, memberID, fansubGroupID)
	if err != nil {
		log.Printf("resolve pending roles to active: list roles failed (member_id=%d, fansub_group_id=%d): %v", memberID, fansubGroupID, err)
		return nil
	}
	defer rows.Close()

	historyRoles := NewHistGroupMemberRolesRepository(r.db)
	roleCodes := make([]string, 0)
	for rows.Next() {
		var roleCode string
		if err := rows.Scan(&roleCode); err != nil {
			log.Printf("resolve pending roles to active: scan role failed (member_id=%d, fansub_group_id=%d): %v", memberID, fansubGroupID, err)
			return nil
		}
		if !historyRoles.IsGroupHistoryWhitelistRole(roleCode) || !permissions.IsKnownFansubGroupRole(roleCode) {
			continue
		}
		roleCodes = append(roleCodes, roleCode)
	}
	if err := rows.Err(); err != nil {
		log.Printf("resolve pending roles to active: iterate roles failed (member_id=%d, fansub_group_id=%d): %v", memberID, fansubGroupID, err)
		return nil
	}
	if len(roleCodes) == 0 {
		return nil
	}

	var fansubGroupMemberID int64
	err = r.db.QueryRow(ctx, `
		SELECT fgm.id
		FROM fansub_group_members fgm
		JOIN member_claims mc ON mc.app_user_id = fgm.app_user_id
		WHERE mc.member_id = $1
		  AND mc.claim_status = 'verified'
		  AND fgm.fansub_group_id = $2
		  AND fgm.status = 'active'
		ORDER BY mc.verified_at DESC NULLS LAST, mc.updated_at DESC, fgm.id DESC
		LIMIT 1
	`, memberID, fansubGroupID).Scan(&fansubGroupMemberID)
	if err != nil {
		if err != pgx.ErrNoRows {
			log.Printf("resolve pending roles to active: lookup app membership failed (member_id=%d, fansub_group_id=%d): %v", memberID, fansubGroupID, err)
		}
		return nil
	}

	tenureStartedOn := time.Now().UTC().Truncate(24 * time.Hour)
	for _, roleCode := range roleCodes {
		if _, err := r.db.Exec(ctx, `
			INSERT INTO fansub_group_member_roles
				(fansub_group_member_id, role, created_by_app_user_id, tenure_started_on, created_at)
			VALUES ($1, $2, $3, $4, NOW())
			ON CONFLICT (fansub_group_member_id, role) DO NOTHING
		`, fansubGroupMemberID, roleCode, actorAppUserID, tenureStartedOn); err != nil {
			log.Printf("resolve pending roles to active: insert role failed (fansub_group_member_id=%d, role=%s): %v", fansubGroupMemberID, roleCode, err)
		}
	}

	return nil
}
