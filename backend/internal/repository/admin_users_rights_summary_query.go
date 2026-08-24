package repository

// admin_users_rights_summary_query.go enthält die eigentliche F-01-Zusammenstellungslogik
// für GetUserRightsSummary (Plan 139-05). Ausgelagert aus admin_users_tab_repository.go
// (Datei-Limit <= 450 Zeilen, CLAUDE.md).
//
// Genau EIN neuer, gebündelter Endpunkt beantwortet die kompakte Rechte-Zusammenfassung
// jeder Gruppenmitgliedschaft eines Users in einer konstanten Anzahl SQL-Roundtrips
// (unabhängig davon, wie vielen Gruppen der User angehört): 1x paginierte Mitgliedschaften
// (bereits vorhanden), 1x Actor-Status/Platform-Admin, 1x offene Claims, 1x Action-Label-
// Katalog, 1x Rollen-Label-Katalog, dann genau die 2-3 Batch-Queries, die
// permissions.Service.ResolveGroupRightsBatch selbst ausführt (Plan 139-05 Task 1) — niemals
// ein ResolveGroupRights-Aufruf pro Gruppe in einer Schleife.

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
)

// AdminUsersRightsBatchResolver ist die schmale Oberfläche, die GetUserRightsSummary von
// *permissions.Service' gebündelter Fassade (Plan 139-05 Task 1) benötigt. Als eigenes,
// schmales Interface deklariert (statt des konkreten *permissions.Service-Typs), damit
// Handler-seitige Aufrufer in Tests eine Fake-Implementierung einsetzen können — spiegelt
// die bereits etablierte effectiveRightsPermissionService-Konvention im handlers-Paket.
type AdminUsersRightsBatchResolver interface {
	ResolveGroupRightsBatch(
		ctx context.Context,
		actor permissions.Actor,
		fansubGroupIDs []int64,
		rolesByGroup map[int64][]string,
	) (map[int64]*permissions.GroupRightsResolution, error)
}

// rightsSummaryHeadlineLimit spiegelt UserOverviewTab.tsx's HEADLINE_CAPABILITY_LIMIT (3)
// exakt — die ersten 3 (nach Action-Code alphabetisch sortierten) Zustände, exakt wie
// effectiveRightStatesFromResolution die Sortierung für den Einzel-Gruppen-Endpunkt bereits
// vornimmt (admin_effective_rights_handler.go).
const rightsSummaryHeadlineLimit = 3

// listUserRightsSummary implementiert F-01/UADM-06: die Rechte-Zusammenfassung JEDER
// (paginierten) Gruppenmitgliedschaft eines Users, ohne einen ResolveGroupRights-Aufruf pro
// Gruppe -- die Batch-Auflösung passiert genau einmal über resolver.ResolveGroupRightsBatch.
func (r *AdminUsersRepository) listUserRightsSummary(
	ctx context.Context,
	appUserID int64,
	limit int,
	offset int,
	resolver AdminUsersRightsBatchResolver,
) (*models.AdminUserRightsSummaryPage, error) {
	if resolver == nil {
		return nil, fmt.Errorf("get user rights summary: %w", ErrValidation)
	}

	memberships, err := r.GetUserGroupMemberships(ctx, appUserID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: load memberships: %w", err)
	}

	page := &models.AdminUserRightsSummaryPage{
		Data: make([]models.AdminUserGroupRightsSummaryItem, 0, len(memberships.Memberships)),
		Meta: memberships.Meta,
	}
	if len(memberships.Memberships) == 0 {
		return page, nil
	}

	actor, err := r.loadRightsSummaryActor(ctx, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: load actor: %w", err)
	}

	openClaimsCount, err := r.loadOpenClaimsCount(ctx, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: load open claims: %w", err)
	}

	actionLabels, err := r.loadActionDefinitionLabels(ctx)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: load action labels: %w", err)
	}

	roleLabels, err := r.loadRoleDefinitionLabels(ctx)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: load role labels: %w", err)
	}

	fansubGroupIDs := make([]int64, 0, len(memberships.Memberships))
	rolesByGroup := make(map[int64][]string, len(memberships.Memberships))
	for _, membership := range memberships.Memberships {
		fansubGroupIDs = append(fansubGroupIDs, membership.FansubGroupID)
		rolesByGroup[membership.FansubGroupID] = membership.Roles
	}

	resolutions, err := resolver.ResolveGroupRightsBatch(ctx, actor, fansubGroupIDs, rolesByGroup)
	if err != nil {
		return nil, fmt.Errorf("get user rights summary: resolve batch: %w", err)
	}

	for _, membership := range memberships.Memberships {
		item := models.AdminUserGroupRightsSummaryItem{
			FansubGroupID:   membership.FansubGroupID,
			FansubGroupName: membership.FansubGroupName,
			RoleLabel:       rightsSummaryRoleLabel(membership.Roles, roleLabels),
			HeadlineStates:  []models.AdminHeadlineCapabilityState{},
			OpenClaimsCount: openClaimsCount,
		}
		if resolution := resolutions[membership.FansubGroupID]; resolution != nil {
			item.HeadlineStates, item.HasDeviation = rightsSummaryHeadlineFrom(resolution, actionLabels)
		}
		page.Data = append(page.Data, item)
	}

	return page, nil
}

// rightsSummaryHeadlineFrom slices the first rightsSummaryHeadlineLimit
// (alphabetically-by-action-code) states off a full GroupRightsResolution -- mirroring
// GroupSummaryCard's existing states.slice(0, HEADLINE_CAPABILITY_LIMIT) frontend logic
// byte-for-byte (same sort order effectiveRightStatesFromResolution already uses). HasDeviation
// is computed over the FULL evaluated action set, not just the headline slice (D-05 parity).
func rightsSummaryHeadlineFrom(
	resolution *permissions.GroupRightsResolution, actionLabels map[string]string,
) ([]models.AdminHeadlineCapabilityState, bool) {
	actionCodes := make([]string, 0, len(resolution.Rights))
	hasDeviation := false
	for action, state := range resolution.Rights {
		actionCodes = append(actionCodes, string(action))
		if state.UserAllow || state.UserDeny {
			hasDeviation = true
		}
	}
	sort.Strings(actionCodes)

	headlineCount := rightsSummaryHeadlineLimit
	if len(actionCodes) < headlineCount {
		headlineCount = len(actionCodes)
	}

	headline := make([]models.AdminHeadlineCapabilityState, 0, headlineCount)
	for _, code := range actionCodes[:headlineCount] {
		state := resolution.Rights[permissions.Action(code)]
		label := actionLabels[code]
		if label == "" {
			label = code
		}
		headline = append(headline, models.AdminHeadlineCapabilityState{
			ActionCode: code,
			Label:      label,
			Allowed:    state.Allowed,
		})
	}
	return headline, hasDeviation
}

// rightsSummaryRoleLabel joins every role's German label with " + ", falling back to the
// raw role code when no catalog label exists -- mirrors roleLabelFor's exact join convention
// in UserOverviewTab.tsx (frontend), including its "–" placeholder for zero roles.
func rightsSummaryRoleLabel(roles []string, roleLabels map[string]string) string {
	if len(roles) == 0 {
		return "–"
	}
	labels := make([]string, 0, len(roles))
	for _, role := range roles {
		if label, ok := roleLabels[role]; ok && label != "" {
			labels = append(labels, label)
		} else {
			labels = append(labels, role)
		}
	}
	return strings.Join(labels, " + ")
}

// loadRightsSummaryActor lädt den globalen app_users.status sowie die platform_admin-
// Zugehörigkeit EINMAL (nicht pro Gruppe) -- der permissions.Actor, den
// ResolveGroupRightsBatch für die D01-Präzedenz benötigt.
func (r *AdminUsersRepository) loadRightsSummaryActor(ctx context.Context, appUserID int64) (permissions.Actor, error) {
	var status string
	var isPlatformAdmin bool
	err := r.db.QueryRow(ctx, `
		SELECT au.status,
		       EXISTS(
		           SELECT 1 FROM app_user_global_roles
		           WHERE app_user_id = au.id AND role = 'platform_admin'
		       )
		FROM app_users au
		WHERE au.id = $1
	`, appUserID).Scan(&status, &isPlatformAdmin)
	if err != nil {
		return permissions.Actor{}, fmt.Errorf("load rights summary actor app_user=%d: %w", appUserID, err)
	}
	return permissions.Actor{
		AppUserID:       appUserID,
		Status:          status,
		IsPlatformAdmin: isPlatformAdmin,
	}, nil
}

// loadOpenClaimsCount reuses the EXACT same source AdminUserOverview.OpenClaimsCount already
// reads (adminUsersOverviewQuery's "claims" LATERAL join) -- never a second, independently
// computed open-claims count. This is a single per-user total, not scoped per group, matching
// the frontend's existing GroupRightsSummarySectionProps.openClaimsCount contract (one number
// repeated on every group card, not a per-group count).
func (r *AdminUsersRepository) loadOpenClaimsCount(ctx context.Context, appUserID int64) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FILTER (WHERE mc.claim_status = 'pending')
		FROM member_claims mc
		WHERE mc.app_user_id = $1
	`, appUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("load open claims count app_user=%d: %w", appUserID, err)
	}
	return count, nil
}

// loadActionDefinitionLabels loads the full action_code -> label_de catalog ONCE (constant
// cost regardless of how many groups/headline states are being labeled), mirroring the same
// action_definitions.label_de source ListCapabilityMatrix already reads.
func (r *AdminUsersRepository) loadActionDefinitionLabels(ctx context.Context) (map[string]string, error) {
	rows, err := r.db.Query(ctx, `SELECT code, label_de FROM action_definitions`)
	if err != nil {
		return nil, fmt.Errorf("load action definition labels: %w", err)
	}
	defer rows.Close()

	labels := make(map[string]string)
	for rows.Next() {
		var code, label string
		if err := rows.Scan(&code, &label); err != nil {
			return nil, fmt.Errorf("load action definition labels: scan: %w", err)
		}
		labels[code] = label
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load action definition labels: iterate: %w", err)
	}
	return labels, nil
}

// loadRoleDefinitionLabels loads the full role code -> label_de catalog ONCE, mirroring the
// same role_definitions.label_de source ListCapabilityMatrix/role_catalog_repository.go
// already read elsewhere.
func (r *AdminUsersRepository) loadRoleDefinitionLabels(ctx context.Context) (map[string]string, error) {
	rows, err := r.db.Query(ctx, `SELECT code, label_de FROM role_definitions`)
	if err != nil {
		return nil, fmt.Errorf("load role definition labels: %w", err)
	}
	defer rows.Close()

	labels := make(map[string]string)
	for rows.Next() {
		var code, label string
		if err := rows.Scan(&code, &label); err != nil {
			return nil, fmt.Errorf("load role definition labels: scan: %w", err)
		}
		labels[code] = label
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load role definition labels: iterate: %w", err)
	}
	return labels, nil
}
