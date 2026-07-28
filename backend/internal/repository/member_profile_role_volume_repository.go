package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// highestRoleVolumeTier liefert die hoechste erreichte Rollen-Volumen-Stufe fuer eine
// Netto-Anzahl awarded release_role_credit_lifecycles-Buchungen in einer Rolle. Tier-Tokens
// sind intern-englisch (bronze/silver/gold/platinum) -- konsistent mit dem bestehenden
// productive_bronze/silver/gold-Code-Praezedenzfall. Das deutsche Label wird clientseitig
// aufgeloest (Plan 112-02); count < 12 liefert "" (keine Stufe erreicht).
func highestRoleVolumeTier(count int) string {
	switch {
	case count >= 510:
		return "platinum"
	case count >= 320:
		return "gold"
	case count >= 108:
		return "silver"
	case count >= 12:
		return "bronze"
	default:
		return ""
	}
}

// loadRoleVolumeBadges laedt eine rollen-gefilterte Netto-Zaehlung der
// release_role_credit_lifecycles-Buchungen eines Members und emittiert pro Rolle nur die
// hoechste erreichte Volumenstufe als synthetisches PublicMemberBadge (Typ 3, D-04). Storniert
// (lifecycle_status != 'awarded') zaehlt nicht (D-02). Diese Badges werden NIE persistiert --
// sie werden bei jedem Read live neu berechnet (GAM-04), analog zu den role_entry_*-Badges in
// loadPublicBadges. ID bleibt 0.
func (r *MemberProfileRepository) loadRoleVolumeBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role_code, COUNT(*) AS credit_count
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		GROUP BY role_code
		ORDER BY role_code
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load role-volume badges for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberBadge, 0)
	for rows.Next() {
		var roleCode string
		var count int
		if err := rows.Scan(&roleCode, &count); err != nil {
			return nil, fmt.Errorf("scan role-volume badge row for member %d: %w", memberID, err)
		}
		if tier := highestRoleVolumeTier(count); tier != "" {
			items = append(items, models.PublicMemberBadge{
				ID:            0,
				BadgeCode:     "role_volume_" + roleCode + "_" + tier,
				BadgeCategory: "role_volume",
			})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role-volume badges for member %d: %w", memberID, err)
	}

	return items, nil
}
