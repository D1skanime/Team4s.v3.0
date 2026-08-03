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

// RoleVolumeCount ist die Rohzahl-Variante der pro-Rolle-Netto-Zaehlung, die
// loadRoleVolumeBadges vor Plan 116-02 nach der Tier-Ableitung verwarf. Wird von
// GetOwnDashboard (D-03/D-04) wiederverwendet, um sowohl die "Rollen-Volumen"-Tabelle
// als auch das "noch X bis naechste Stufe" ohne zweite Query zu befuellen.
type RoleVolumeCount struct {
	RoleCode string
	Count    int64
}

// loadRoleVolumeCounts laedt die rollen-gefilterte Netto-Zaehlung der
// release_role_credit_lifecycles-Buchungen eines Members -- exakt dieselbe SQL, die
// zuvor inline in loadRoleVolumeBadges lag (verhaltenserhaltende Extraktion, Plan
// 116-02 Task 1).
func (r *MemberProfileRepository) loadRoleVolumeCounts(ctx context.Context, memberID int64) ([]RoleVolumeCount, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role_code, COUNT(*) AS credit_count
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		GROUP BY role_code
		ORDER BY role_code
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load role-volume counts for member %d: %w", memberID, err)
	}
	defer rows.Close()

	counts := make([]RoleVolumeCount, 0)
	for rows.Next() {
		var entry RoleVolumeCount
		if err := rows.Scan(&entry.RoleCode, &entry.Count); err != nil {
			return nil, fmt.Errorf("scan role-volume count row for member %d: %w", memberID, err)
		}
		counts = append(counts, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role-volume counts for member %d: %w", memberID, err)
	}

	return counts, nil
}

func roleVolumeProgressBadge(roleCode string, count int64) *models.PublicMemberBadge {
	if count <= 0 {
		return nil
	}

	currentTier := "entry"
	nextTier := "bronze"
	nextThreshold := int64(12)
	switch {
	case count >= 510:
		currentTier = "platinum"
		nextTier = ""
		nextThreshold = 510
	case count >= 320:
		currentTier = "gold"
		nextTier = "platinum"
		nextThreshold = 510
	case count >= 108:
		currentTier = "silver"
		nextTier = "gold"
		nextThreshold = 320
	case count >= 12:
		currentTier = "bronze"
		nextTier = "silver"
		nextThreshold = 108
	}
	remaining := nextThreshold - count
	if remaining < 0 {
		remaining = 0
	}

	badgeCode := "role_entry_" + roleCode
	badgeCategory := "role_entry"
	if currentTier != "entry" {
		badgeCode = "role_volume_" + roleCode + "_" + currentTier
		badgeCategory = "role_volume"
	}
	badge := &models.PublicMemberBadge{
		ID:             0,
		BadgeCode:      badgeCode,
		BadgeCategory:  badgeCategory,
		CurrentCount:   &count,
		CurrentTier:    &currentTier,
		NextThreshold:  &nextThreshold,
		RemainingCount: &remaining,
	}
	if nextTier != "" {
		badge.NextTier = &nextTier
	}
	return badge
}

// loadRoleVolumeBadges laedt eine rollen-gefilterte Netto-Zaehlung der
// release_role_credit_lifecycles-Buchungen eines Members und emittiert pro Rolle nur die
// hoechste erreichte Volumenstufe als synthetisches PublicMemberBadge (Typ 3, D-04). Storniert
// (lifecycle_status != 'awarded') zaehlt nicht (D-02). Diese Badges werden NIE persistiert --
// sie werden bei jedem Read live neu berechnet (GAM-04), analog zu den role_entry_*-Badges in
// loadPublicBadges. ID bleibt 0. Ab Plan 116-02 delegiert die Funktion die Zaehlung an
// loadRoleVolumeCounts (verhaltenserhaltend, keine SQL-Aenderung).
func (r *MemberProfileRepository) loadRoleVolumeBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	counts, err := r.loadRoleVolumeCounts(ctx, memberID)
	if err != nil {
		return nil, err
	}

	items := make([]models.PublicMemberBadge, 0)
	for _, entry := range counts {
		progressBadge := roleVolumeProgressBadge(entry.RoleCode, entry.Count)
		if progressBadge == nil {
			continue
		}
		if *progressBadge.CurrentTier != "entry" {
			entryBadge := *progressBadge
			entryBadge.BadgeCode = "role_entry_" + entry.RoleCode
			entryBadge.BadgeCategory = "role_entry"
			items = append(items, entryBadge)
		}
		items = append(items, *progressBadge)
	}

	return items, nil
}
