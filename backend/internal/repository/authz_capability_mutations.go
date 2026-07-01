package repository

import (
	"context"
	"fmt"
)

// CapabilityMatrixRoleRow repräsentiert eine Zeile in der Capability-Matrix (Rolle × Action).
type CapabilityMatrixRoleRow struct {
	RoleCode   string
	RoleLabel  string
	ActionCode string
	ActionLabel string
	Category   string
	SortOrder  int
	Granted    bool
	Standalone bool
}

// CapabilityMatrixActionState ist der serialisierbare Zustand einer Action in einer Rolle.
type CapabilityMatrixActionState struct {
	Code       string `json:"code"`
	LabelDE    string `json:"label_de"`
	Category   string `json:"category"`
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
}

// CapabilityMatrixActionEntry ist eine Action-Definition (für all_actions-Liste).
type CapabilityMatrixActionEntry struct {
	Code      string `json:"code"`
	LabelDE   string `json:"label_de"`
	Category  string `json:"category"`
	SortOrder int    `json:"sort_order"`
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
			ad.sort_order     AS action_sort_order,
			rd.code           AS role_code,
			rd.label_de       AS role_label,
			(rc.action_code IS NOT NULL) AS granted,
			(ad.code = ANY($1)) AS standalone,
			COALESCE(rd.contexts, '{}') AS role_contexts
		FROM action_definitions ad
		CROSS JOIN role_definitions rd
		LEFT JOIN role_capabilities rc
			ON rc.action_code = ad.code AND rc.role_code = rd.code
		ORDER BY rd.code, ad.sort_order
	`

	rows, err := r.db.Query(ctx, query, standaloneActionCodes)
	if err != nil {
		return nil, fmt.Errorf("list capability matrix: query: %w", err)
	}
	defer rows.Close()

	// Sammle Daten in geordneten Strukturen
	roleOrder := make([]string, 0)
	roleLabels := make(map[string]string)
	roleContexts := make(map[string][]string)
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
			&row.SortOrder,
			&row.RoleCode,
			&row.RoleLabel,
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
				SortOrder: row.SortOrder,
			}
		}

		// Rollen-Reihenfolge merken
		if _, seen := roleLabels[row.RoleCode]; !seen {
			roleOrder = append(roleOrder, row.RoleCode)
			roleLabels[row.RoleCode] = row.RoleLabel
			roleContexts[row.RoleCode] = contexts
		}

		// Action-Zustand für Rolle
		roleActions[row.RoleCode] = append(roleActions[row.RoleCode], CapabilityMatrixActionState{
			Code:       row.ActionCode,
			LabelDE:    row.ActionLabel,
			Category:   row.Category,
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
		roles = append(roles, CapabilityMatrixRoleEntry{
			RoleCode: roleCode,
			LabelDE:  roleLabels[roleCode],
			Actions:  roleActions[roleCode],
			Contexts: roleContexts[roleCode],
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
