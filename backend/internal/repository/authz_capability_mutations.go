package repository

import (
	"context"
	"fmt"
)

// CapabilityMatrixRoleRow repräsentiert eine Zeile in der Capability-Matrix (Rolle × Action).
type CapabilityMatrixRoleRow struct {
	RoleCode, RoleLabel, RoleColorKey, RoleIconKey string
	RoleContexts []string
	RoleSortOrder, OperativeCapabilityCount int
	RoleAssignable bool
	ActionCode, ActionLabel, Category string
	ActionSortOrder int
	ActionDescription, ActionHelpText *string
	UserOverridable, Granted, Standalone bool
}

// CapabilityMatrixActionState ist der serialisierbare Zustand einer Action in einer Rolle.
type CapabilityMatrixActionState struct {
	Code       string `json:"code"`
	LabelDE    string `json:"label_de"`
	Category   string `json:"category"`
	SortOrder int `json:"sort_order"`
	DescriptionDE *string `json:"description_de"`
	HelpTextDE *string `json:"help_text_de"`
	UserOverridable bool `json:"user_overridable"`
	Granted    bool   `json:"granted"`
	Standalone bool   `json:"standalone"`
}

// CapabilityMatrixRoleEntry ist eine Rolle mit ihren Action-Zuständen.
type CapabilityMatrixRoleEntry struct {
	RoleCode           string                        `json:"role_code"`
	LabelDE            string                        `json:"label_de"`
	Actions            []CapabilityMatrixActionState `json:"actions"`
	Assignable         bool                          `json:"assignable"`          // Im Gruppen-Add-Picker zuweisbar (permissions.IsKnownFansubGroupRole)
	CapabilityEditable bool                          `json:"capability_editable"` // Capabilities editierbar (permissions.IsCapabilityBearingRole) — G4
	Contexts           []string                      `json:"contexts,omitempty"`  // Aus role_definitions.contexts
	SortOrder int `json:"sort_order"`
	ColorKey string `json:"color_key"`
	IconKey string `json:"icon_key"`
	OperativeCapabilityCount int `json:"operative_capability_count"`
	HasOperativeCapabilities bool `json:"has_operative_capabilities"`
	// GlobalAssignmentCount zählt aktive Zuweisungen aus app_user_global_roles.
	// NUR für die drei synthetischen globalen App-Rollen-Zeilen (platform_admin/content_admin/
	// user) gesetzt — role_definitions-Zeilen bekommen dieses Feld NIE gesetzt (Pointer bleibt
	// nil → JSON "null"/fehlend). Grund: diese drei Rollen existieren strukturell nicht in
	// role_definitions (111-RESEARCH.md Pitfall 1). Gegenstücke, die synchron gehalten werden
	// müssen: shared/contracts/admin-capabilities.yaml (RoleEntry.global_assignment_count) und
	// frontend/src/types/admin-capability.ts (RoleEntry.global_assignment_count).
	GlobalAssignmentCount *int `json:"global_assignment_count,omitempty"`
	// GroupHolderCount zählt aktive Zuweisungen aus fansub_group_member_roles. NUR für
	// role_definitions-Zeilen gesetzt, die permissions.IsKnownFansubGroupRole erfüllen (echte
	// Gruppenrollen) — für die drei synthetischen globalen Zeilen und für Rollen außerhalb dieses
	// Katalogs bleibt der Pointer nil → JSON "null"/fehlend. Grund: 260824-ike Defekt 2 (Rail
	// zeigte für Gruppenrollen durchgehend "-", obwohl das Detail-Panel echte Zahlen zeigt).
	// Gegenstücke, die synchron gehalten werden müssen: shared/contracts/admin-capabilities.yaml
	// (RoleEntry.group_holder_count) und frontend/src/types/admin-capability.ts
	// (RoleEntry.group_holder_count).
	GroupHolderCount *int `json:"group_holder_count,omitempty"`
	// RoleKind ist "global_app_role" nur für die drei synthetischen globalen App-Rollen-Zeilen
	// (Handler-Merge in admin_capability_handler.go), sonst leer für alle bestehenden
	// role_definitions-Zeilen. Gegenstücke: admin-capabilities.yaml RoleEntry.role_kind,
	// frontend/src/types/admin-capability.ts RoleEntry.role_kind (111-RESEARCH.md Pitfall 1/2).
	RoleKind string `json:"role_kind,omitempty"`
}

// CapabilityMatrixActionEntry ist eine Action-Definition (für all_actions-Liste).
type CapabilityMatrixActionEntry struct {
	Code      string `json:"code"`
	LabelDE   string `json:"label_de"`
	Category  string `json:"category"`
	SortOrder int    `json:"sort_order"`
	DescriptionDE *string `json:"description_de"`
	HelpTextDE *string `json:"help_text_de"`
	UserOverridable bool `json:"user_overridable"`
}

// CapabilityMatrix ist die vollständige Capability-Matrix (Antwort-DTO).
type CapabilityMatrix struct {
	Roles      []CapabilityMatrixRoleEntry   `json:"roles"`
	AllActions []CapabilityMatrixActionEntry `json:"all_actions"`
}

// standaloneActionCodes sind Actions, die in action_definitions existieren,
// aber keinen role_capabilities-Eintrag haben müssen.
// Repository-interne Konstante — das Repository darf nicht vom permissions-Paket abhängen.
var standaloneActionCodes = []string{"fansub_group.invitations.accept"}

// ListCapabilityMatrix gibt die vollständige Capability-Matrix zurück:
// Alle Rollen (auch ohne Einträge) × alle Actions (mit granted=false wenn kein Eintrag).
// Standalone-Actions haben standalone=true, granted=false.
func (r *AuthzRepository) ListCapabilityMatrix(ctx context.Context) (*CapabilityMatrix, error) {
	query := `
		SELECT
			ad.code           AS action_code,
			ad.label_de       AS action_label,
			ad.category       AS action_category,
			ad.sort_order, ad.description_de, ad.help_text_de, ad.user_overridable,
			rd.code           AS role_code,
			rd.label_de       AS role_label,
			rd.sort_order, rd.assignable, rd.color_key, rd.icon_key,
			COUNT(rc.action_code) OVER (PARTITION BY rd.code)::integer,
			(rc.action_code IS NOT NULL) AS granted,
			(ad.code = ANY($1)) AS standalone,
			COALESCE(rd.contexts, '{}') AS role_contexts
		FROM action_definitions ad
		CROSS JOIN role_definitions rd
		LEFT JOIN role_capabilities rc
			ON rc.action_code = ad.code AND rc.role_code = rd.code
		ORDER BY rd.sort_order, rd.code, ad.sort_order, ad.code
	`

	rows, err := r.db.Query(ctx, query, standaloneActionCodes)
	if err != nil {
		return nil, fmt.Errorf("list capability matrix: query: %w", err)
	}
	defer rows.Close()

	// Sammle Daten in geordneten Strukturen
	roleOrder := make([]string, 0)
	roleLabels := make(map[string]string)
	roleRows := make(map[string]CapabilityMatrixRoleRow)
	roleActions := make(map[string][]CapabilityMatrixActionState)
	actionOrder := make([]string, 0)
	actionEntries := make(map[string]CapabilityMatrixActionEntry)

	for rows.Next() {
		var row CapabilityMatrixRoleRow
		var contexts []string
		if err := rows.Scan(
			&row.ActionCode,
			&row.ActionLabel,
			&row.Category,
			&row.ActionSortOrder, &row.ActionDescription, &row.ActionHelpText, &row.UserOverridable,
			&row.RoleCode,
			&row.RoleLabel,
			&row.RoleSortOrder, &row.RoleAssignable, &row.RoleColorKey, &row.RoleIconKey,
			&row.OperativeCapabilityCount,
			&row.Granted,
			&row.Standalone,
			&contexts,
		); err != nil {
			return nil, fmt.Errorf("list capability matrix: scan: %w", err)
		}

		// Action-Eintrag merken (einmalig)
		if _, seen := actionEntries[row.ActionCode]; !seen {
			actionOrder = append(actionOrder, row.ActionCode)
			actionEntries[row.ActionCode] = CapabilityMatrixActionEntry{
				Code:      row.ActionCode,
				LabelDE:   row.ActionLabel,
				Category:  row.Category,
				SortOrder: row.ActionSortOrder, DescriptionDE: row.ActionDescription,
				HelpTextDE: row.ActionHelpText, UserOverridable: row.UserOverridable,
			}
		}

		// Rollen-Reihenfolge merken
		if _, seen := roleLabels[row.RoleCode]; !seen {
			roleOrder = append(roleOrder, row.RoleCode)
			roleLabels[row.RoleCode] = row.RoleLabel
			row.RoleContexts = contexts
			roleRows[row.RoleCode] = row
		}

		// Action-Zustand für Rolle
		roleActions[row.RoleCode] = append(roleActions[row.RoleCode], CapabilityMatrixActionState{
			Code:       row.ActionCode,
			LabelDE:    row.ActionLabel,
			Category:   row.Category,
			SortOrder: row.ActionSortOrder, DescriptionDE: row.ActionDescription,
			HelpTextDE: row.ActionHelpText, UserOverridable: row.UserOverridable,
			Granted:    row.Granted,
			Standalone: row.Standalone,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list capability matrix: iterate: %w", err)
	}

	// Rollen-Liste aufbauen (Assignable bleibt Go-Zero-Wert false — wird im Handler gesetzt)
	roles := make([]CapabilityMatrixRoleEntry, 0, len(roleOrder))
	for _, roleCode := range roleOrder {
		row := roleRows[roleCode]
		roles = append(roles, CapabilityMatrixRoleEntry{
			RoleCode: roleCode,
			LabelDE:  roleLabels[roleCode],
			Actions:  roleActions[roleCode],
			Contexts: row.RoleContexts, SortOrder: row.RoleSortOrder, Assignable: row.RoleAssignable,
			CapabilityEditable: len(row.RoleContexts) > 0, ColorKey: row.RoleColorKey, IconKey: row.RoleIconKey,
			OperativeCapabilityCount: row.OperativeCapabilityCount,
			HasOperativeCapabilities: row.OperativeCapabilityCount > 0,
		})
	}

	// Action-Liste aufbauen (für all_actions)
	allActions := make([]CapabilityMatrixActionEntry, 0, len(actionOrder))
	for _, code := range actionOrder {
		allActions = append(allActions, actionEntries[code])
	}

	return &CapabilityMatrix{
		Roles:      roles,
		AllActions: allActions,
	}, nil
}

// GrantRoleCapability fügt eine Capability-Zuweisung (role_code → action_code) ein.
// ON CONFLICT DO NOTHING — idempotent.
func (r *AuthzRepository) GrantRoleCapability(ctx context.Context, roleCode, actionCode string) error {
	if roleCode == "" {
		return fmt.Errorf("grant role capability: role_code ist erforderlich")
	}
	if actionCode == "" {
		return fmt.Errorf("grant role capability: action_code ist erforderlich")
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO role_capabilities (role_code, action_code)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, roleCode, actionCode)
	if err != nil {
		return fmt.Errorf("grant role capability (role=%q, action=%q): %w", roleCode, actionCode, err)
	}
	return nil
}

// RevokeRoleCapability entfernt eine Capability-Zuweisung (idempotent).
func (r *AuthzRepository) RevokeRoleCapability(ctx context.Context, roleCode, actionCode string) error {
	if roleCode == "" {
		return fmt.Errorf("revoke role capability: role_code ist erforderlich")
	}
	if actionCode == "" {
		return fmt.Errorf("revoke role capability: action_code ist erforderlich")
	}

	_, err := r.db.Exec(ctx, `
		DELETE FROM role_capabilities
		WHERE role_code = $1 AND action_code = $2
	`, roleCode, actionCode)
	if err != nil {
		return fmt.Errorf("revoke role capability (role=%q, action=%q): %w", roleCode, actionCode, err)
	}
	return nil
}

// CountGlobalRoleAssignments aggregiert die aktiven Zuweisungen der drei globalen App-Rollen
// (platform_admin/content_admin/user) aus app_user_global_roles. Wird vom Handler genutzt, um
// den synthetischen globalen App-Rollen-Zeilen (D-05, 111-RESEARCH.md Pitfall 1) einen korrekten
// global_assignment_count zuzuweisen. Rollen ohne Zuweisung fehlen im Ergebnis (Go-Zero-Value 0
// im Handler beim Map-Zugriff).
func (r *AuthzRepository) CountGlobalRoleAssignments(ctx context.Context) (map[string]int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role, COUNT(*) AS cnt
		FROM app_user_global_roles
		GROUP BY role
	`)
	if err != nil {
		return nil, fmt.Errorf("count global role assignments: query: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var role string
		var count int
		if err := rows.Scan(&role, &count); err != nil {
			return nil, fmt.Errorf("count global role assignments: scan: %w", err)
		}
		counts[role] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("count global role assignments: iterate: %w", err)
	}

	return counts, nil
}

// CountGroupRoleHolders aggregiert die aktiven Zuweisungen aus fansub_group_member_roles ("wer
// besitzt diese Gruppenrolle, wie oft?" — D-05-analog für Gruppenrollen). Wird vom Handler
// genutzt, um role_definitions-Zeilen mit permissions.IsKnownFansubGroupRole einen korrekten
// group_holder_count zuzuweisen (260824-ike Defekt 2). Rollen ohne Zuweisung fehlen im Ergebnis
// (Go-Zero-Value 0 im Handler beim Map-Zugriff). ListRoleHolders bleibt die einzige Quelle für
// die vollen Pro-Rolle-Inhaberdetails (Name/Gruppe/Status/Overrides) — diese Methode liefert
// bewusst nur Zahlen, keine Zeilen.
func (r *AuthzRepository) CountGroupRoleHolders(ctx context.Context) (map[string]int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT fgmr.role, COUNT(*) AS cnt
		FROM fansub_group_member_roles fgmr
		GROUP BY fgmr.role
	`)
	if err != nil {
		return nil, fmt.Errorf("count group role holders: query: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var role string
		var count int
		if err := rows.Scan(&role, &count); err != nil {
			return nil, fmt.Errorf("count group role holders: scan: %w", err)
		}
		counts[role] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("count group role holders: iterate: %w", err)
	}

	return counts, nil
}

// CountRolesWithAction gibt die Anzahl der Rollen zurück, denen eine Action zugewiesen ist.
// Wird vom Lockout-Guard vor DELETE genutzt.
func (r *AuthzRepository) CountRolesWithAction(ctx context.Context, actionCode string) (int64, error) {
	if actionCode == "" {
		return 0, fmt.Errorf("count roles with action: action_code ist erforderlich")
	}

	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT role_code)
		FROM role_capabilities
		WHERE action_code = $1
	`, actionCode).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count roles with action (action=%q): %w", actionCode, err)
	}
	return count, nil
}
