# Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 10 explicitly named files/edits + ~20 Block-2 candidate test files (sampled 4)
**Analogs found:** 10 / 10 (Block 1 + representative Block 2 sample); ratchet-guard file has no
in-repo Go precedent (frontend-only analog, documented below)

Every file/line reference below was re-read from the current working tree during this pass (not
copied from RESEARCH.md) — line numbers match the tree as of 2026-09-04.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/admin_capability_handler.go` (`RevokeCapability` guard extension, Criterion 1) | handler | request-response (mutation guard) | same file, existing D-07 lockout-guard block (lines 245-262) | exact — extend in place |
| `backend/internal/handlers/admin_capability_handler.go` (`GrantCapability` new action-specific guard, D-16) | handler | request-response (mutation guard) | same file, `RevokeCapability`'s `IsCapabilityBearingRole` 422 block (lines 170-178) for shape; new logic is genuinely new (action-specific, not role-blanket) | role-match |
| `backend/internal/handlers/admin_capability_handler_test.go` (new tests, both guards) | test (handler, httptest+fake-repo) | request-response | same file, `TestRevokeCapabilityLastActionGuard` (lines 148-195) | exact |
| `backend/internal/repository/hist_group_member_roles_repository.go` (`ListGroupHistoryRoleDefinitions`, Criterion 3) | repository | CRUD (read query) | same file, `ListFansubGroupRoleDefinitions` (lines 292-303, already has `AND NOT rd.reserved`) | exact — sibling query, same file |
| `backend/internal/repository/authz_permissions.go` (`LoadCapabilityRoles`, D-17 investigation — do NOT blanket-filter) | repository | CRUD (read query, cache-feeding) | same file, `LoadFansubGroupRoles` (lines 431-467, has the filter — but is the wrong model here per D-17's trap) | anti-pattern warning, not a copy target |
| `backend/internal/repository/membership_baseline_registry_test.go` (extend: Criterion 3's 4th query + Criterion 4 anti-drift) | test (repository, real Postgres) | integration | same file, `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix` (lines 231-266) | exact |
| `backend/internal/permissions/permissions.go` (extract baseline-action-codes literal into exported `var`, Criterion 4) | utility/config (package-level constant) | n/a | same file, `validateMembershipBaselineRegistryPresence` (lines 423-431) and the existing `RoleMembershipBaseline` const (line 89) | exact — refactor in place |
| `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` (badge/lock/aria-describedby + `configurableActions` filter fix, D-15) | component | request-response (renders server state, dispatches mutation intent) | same file, existing `configurableActions` ternary (lines 53-55) and `!isEditable`/`inlineError` blocks (lines 150-160, 193-209) | exact — extend in place |
| `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` (rewrite "keine Sonderbehandlung"; new real-38-action fixture test, D-19) | test (RTL) | request-response | same file, existing `reservedBaselineRole` fixture + its two `145-03` tests (lines 87-117, 243-269) | exact |
| New Go file for Criterion 7's ratchet guard (no in-repo precedent) | test (meta/self-test, AST/regex scanner) | batch (scans `_test.go` files) | `frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` (lines 28-111) — cross-language analog only | no same-language analog — see "No Analog Found" |
| Next migration after `0160_*` (Criterion 4 seed source) | migration | batch (DDL/DML) | `database/migrations/0160_membership_baseline_pseudo_role.{up,down}.sql` | exact — naming/format convention |
| Block-2 sample: `backend/internal/repository/release_version_media_repository_test.go` (33 `strings.Contains`, 18 funcs) | test (repository) | CRUD | `backend/internal/repository/membership_baseline_registry_test.go` (real-Postgres pattern already used in-package-family) | role-match (remediation target → real-Postgres replacement) |
| Block-2 sample: `backend/internal/handlers/admin_content_release_version_media_test.go` (25 contains, 40 funcs) | test (handler) | request-response | `backend/internal/handlers/admin_capability_handler_test.go` (httptest + fake-repo pattern) | role-match (remediation target → httptest replacement) |
| Block-2 sample: `backend/internal/handlers/admin_content_release_theme_assets_test.go` (7 contains, 4 funcs — 100% substring, zero real calls) | test (handler) | request-response | `backend/internal/handlers/admin_capability_handler_test.go` | role-match (remediation target → httptest replacement) |
| Block-2 sample: `backend/internal/repository/hist_group_member_roles_whitelist_test.go` (5 contains, 2 funcs — mixed absence+presence in one func, Pitfall 5) | test (repository) | CRUD | `backend/internal/repository/membership_baseline_registry_test.go` for the presence half; keep the absence-check half as-is (CLAUDE.md exception 1) | role-match (partial remediation — split, don't delete) |

## Pattern Assignments

### `backend/internal/handlers/admin_capability_handler.go` — Criterion 1 (RevokeCapability guard)

**Analog:** same file, the existing D-07 lockout-guard block.

**Imports** (lines 1-12, unchanged — no new imports needed if `slices.Contains` + the new
`permissions.MembershipBaselineActionCodes` var from Criterion 4 are used):
```go
package handlers

import (
	"context"
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```
Note: `slices` is not currently imported in this file — add `"slices"` to the import block if the
new guard uses `slices.Contains` (mirrors the RESEARCH.md code example). Alternative: reuse
`permissions.IsMembershipBaselineAction(permissions.Action(actionCode))` (already exported,
`effective_rights.go:76-78`) to avoid the new import entirely — see Pitfall 3 tradeoff in
RESEARCH.md (cache-dependency vs. static `var`); Criterion 4's exported `var` is the safer choice
per D-05.

**Existing IsCapabilityBearingRole guard shape to mirror for the new block's JSON error shape**
(lines 233-243, `RevokeCapability`):
```go
	// Derselbe Guard gilt für beide Mutationspfade: Nur Fansub-Gruppenrollen tragen
	// konfigurierbare Standardrechte.
	if !permissions.IsCapabilityBearingRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_capability_bearing",
				"message": "Diese Beitrags- oder historische Rolle kann keine Standardrechte erhalten.",
			},
		})
		return
	}
```

**Existing D-07 lockout-guard block to insert the new, unconditional check alongside** (lines
245-262, `RevokeCapability`) — **insert the new membership-baseline guard BEFORE this block, not
inside it** (D-02's "Bestandsschutz" requires `CountRolesWithAction` itself stays untouched):
```go
	// D-07: Lockout-Guard — VOR der DB-Mutation prüfen.
	count, err := h.mutationRepo.CountRolesWithAction(c.Request.Context(), actionCode)
	if err != nil {
		log.Printf("capability revoke: CountRolesWithAction error (action=%q): %v", actionCode, err)
		internalError(c, "Lockout-Prüfung fehlgeschlagen.")
		return
	}

	// Guard: Wenn nur noch 1 Rolle diese Action hat und sie kein Standalone ist → 409.
	if count <= 1 && !permissions.IsStandaloneAction(permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "lockout_guard",
				"message": "Diese Berechtigung kann nicht entzogen werden, da sonst keine Rolle mehr über sie verfügt.",
			},
		})
		return
	}
```

**New guard to add (recommended shape, from RESEARCH.md Code Examples, verified against the
live handler)** — place immediately after the `IsCapabilityBearingRole` check (line 243) and
before the `CountRolesWithAction` call (line 246):
```go
	if roleCode == permissions.RoleMembershipBaseline &&
		slices.Contains(permissions.MembershipBaselineActionCodes, permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "membership_baseline_guard",
				"message": "Dieses Recht gehört zur Mitgliedschafts-Grundausstattung und kann nicht entzogen werden. Jedes aktive Mitglied benötigt es automatisch — die Änderung wurde nicht gespeichert.",
			},
		})
		return
	}
```
The `message` string is the exact, locked Copywriting Contract string from `146-UI-SPEC.md`
("Rejection message shown after a blocked revoke attempt") — copy verbatim, do not paraphrase.
`permissions.MembershipBaselineActionCodes` is the Criterion-4 exported `var` to be extracted from
`permissions.go:425`'s inline `[]Action{...}` literal (see that file's Pattern Assignment below) —
this guard is one of its two consumers (the other is `validateMembershipBaselineRegistryPresence`).

### `backend/internal/handlers/admin_capability_handler.go` — D-16 (GrantCapability action-specific guard)

**Critical constraint (D-17's trap):** do **not** add `AND NOT reserved` to
`authz_permissions.go`'s `LoadCapabilityRoles` query (lines 470-476) — that feeds
`capabilityRoleCatalog` / `IsCapabilityBearingRole`, shared by both `GrantCapability` and
`RevokeCapability`. Filtering there would make `group_member` fail
`IsCapabilityBearingRole` entirely, breaking BOTH mutation directions with the generic, wrong
422 ("Diese Beitrags- oder historische Rolle kann keine Standardrechte erhalten.") — contradicting
Criterion 2's requirement that the 3 baseline rows stay interactive with the baseline-specific
rejection message.

**Correct shape:** add a new, action-specific guard to `GrantCapability` mirroring the Revoke-side
new guard's structure but with inverted logic (reject granting a NON-baseline action, not
revoking a baseline one) — insert after the existing `IsCapabilityBearingRole` check (currently
lines 170-178) and before `GrantRoleCapability` (line 180):
```go
	if roleCode == permissions.RoleMembershipBaseline &&
		!slices.Contains(permissions.MembershipBaselineActionCodes, permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "membership_baseline_guard",
				"message": "<rejection message for the grant direction — new German copy, not locked by 146-UI-SPEC.md (Claude's Discretion per D-19's scope note); keep the same error.code so RoleCapabilityImpactPreviewModal's mutationError path renders it identically>",
			},
		})
		return
	}
```
Same `error.code` ("membership_baseline_guard") as the revoke-side guard is recommended so the
frontend's existing generic `mutationError` rendering handles both directions with zero new
frontend logic — only the `message` text differs between grant-rejection and revoke-rejection.

### `backend/internal/handlers/admin_capability_handler_test.go` — new tests for both guards

**Analog:** same file, `TestRevokeCapabilityLastActionGuard` (lines 148-195) and
`TestGrantCapabilityAssignableGuardRejectsHistoricalRole` (lines 202+) for structure; the existing
`stubCapabilityAuthzRepo` (lines 23-75) and `makeCapabilityTestContext` (lines 99-107) helpers are
reused unchanged — no new stub struct needed, just new field values in the test bodies.

**Imports** (lines 1-17, unchanged):
```go
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```

**Full test-body pattern to copy** (lines 148-195, `TestRevokeCapabilityLastActionGuard` — copy
this shape verbatim for the new membership-baseline-revoke test, swapping `roleCode` to
`"group_member"`, `actionCode` to one of the 3 baseline codes, `countRolesWithAction` to a HIGH
value like 16 (RESEARCH.md's own recommendation — proves the new guard fires independent of/despite
the lockout guard saying "safe"), and asserting `error.code == "membership_baseline_guard"` instead
of `"lockout_guard"`):
```go
func TestRevokeCapabilityLastActionGuard(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, rec := makeCapabilityTestContext(http.MethodDelete, "/admin/role-capabilities/fansub_lead/release.view",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: "fansub_lead"},
		{Key: "actionCode", Value: "release.view"},
	}

	// CountRolesWithAction gibt 1 zurück → Lockout-Guard soll 409 auslösen
	// permissions.IsStandaloneAction("release.view") = false
	authzStub := &stubCapabilityAuthzRepo{
		isPlatformAdmin:      true,
		countRolesWithAction: 1,
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.RevokeCapability(c)

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet 409, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body parsen fehlgeschlagen: %v", err)
	}
	if body.Error.Code != "lockout_guard" {
		t.Fatalf("erwartet error.code='lockout_guard', erhalten %q", body.Error.Code)
	}
	// Kein Audit bei Lockout-Ablehnung
	if len(auditStub.entries) != 0 {
		t.Fatalf("kein Audit-Eintrag bei 409 erwartet, erhalten %d", len(auditStub.entries))
	}
}
```
Note: the `stubCapabilityAuthzRepo.CountRolesWithAction` stub (lines 61-63) already exists and
needs no changes — just set `countRolesWithAction: 16` (or any value > 1) in the new test's struct
literal to prove the new guard is independent of the lockout count.

### `backend/internal/repository/hist_group_member_roles_repository.go` — Criterion 3

**Analog:** same file, `ListFansubGroupRoleDefinitions` (lines 292-303) — the already-fixed sibling
query in the exact same file/package.

**Before** (`ListGroupHistoryRoleDefinitions`, lines 248-255):
```go
func (r *HistGroupMemberRolesRepository) ListGroupHistoryRoleDefinitions(ctx context.Context) ([]RoleDefinitionOption, error) {
	rows, err := r.db.Query(ctx, `
		SELECT rd.code, rd.label_de, rd.contexts, rd.sort_order, rd.assignable, rd.color_key, rd.icon_key,
		       COUNT(rc.action_code)::integer
		FROM role_definitions rd LEFT JOIN role_capabilities rc ON rc.role_code = rd.code
		WHERE 'group_history' = ANY(rd.contexts)
		GROUP BY rd.code ORDER BY rd.sort_order, rd.code
	`)
```

**After — mirror the sibling's predicate exactly** (per `ListFansubGroupRoleDefinitions`, line
297: `WHERE ('fansub_group' = ANY(rd.contexts) OR 'group_history' = ANY(rd.contexts)) AND NOT
rd.reserved`):
```go
		WHERE 'group_history' = ANY(rd.contexts) AND NOT rd.reserved
```
One-line change, no other part of the function/scan logic touched. `RoleDefinitionOption` struct
(lines 233-243) and the rest of the scan loop (lines 261-273) stay byte-identical.

### `backend/internal/repository/membership_baseline_registry_test.go` — extend for Criterion 3 (4th query) + Criterion 4 (anti-drift)

**Analog:** same file, `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix`
(lines 231-266) — this is the exact test to extend with a 4th assertion block, or the shape to
clone into a new sibling test.

**Fixture/harness pattern already established in this file** (lines 138-152, migration apply +
pool setup — reuse verbatim):
```go
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()
	testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))
```
`phase145MigrationPath` (lines 24-31) already resolves `database/migrations/<name>` relative to
this test file — reuse for the new Criterion-4 migration file too (see migration entry below).

**New assertion to add to the existing 4-query test (or a new sibling `TestXxx` function)** —
mirror the existing `ListFansubGroupRoleDefinitions` assertion block (lines 253-258) exactly for
`ListGroupHistoryRoleDefinitions`:
```go
	histRepo := NewHistGroupMemberRolesRepository(pool)
	historyOptions, err := histRepo.ListGroupHistoryRoleDefinitions(ctx)
	require.NoError(t, err)
	for _, opt := range historyOptions {
		assert.NotEqual(t, "group_member", opt.Code, "the group-history role picker must never return the reserved pseudo-role")
	}
```

**Criterion 4 anti-drift pattern** — the existing migration-seed assertion (lines 151-169) already
proves the migration seeds exactly the 3 expected action codes as a hardcoded `[]string{...}`
literal in the TEST. Once `permissions.MembershipBaselineActionCodes` exists (Criterion 4's new
exported `var`), change this literal to compare against that var instead of a second hardcoded
copy:
```go
	require.Len(t, actionCodes, 3, "migration 0160 must seed exactly 3 baseline actions, no more, no fewer")
	// AFTER Criterion 4: compare against the single Go source instead of a 4th hardcoded literal
	wantCodes := make([]string, 0, len(permissions.MembershipBaselineActionCodes))
	for _, a := range permissions.MembershipBaselineActionCodes {
		wantCodes = append(wantCodes, string(a))
	}
	assert.ElementsMatch(t, wantCodes, actionCodes, "migration 0160's seed must never drift from permissions.MembershipBaselineActionCodes")
```

### `backend/internal/permissions/permissions.go` — Criterion 4 (extract exported var)

**Analog:** same file, the existing `RoleMembershipBaseline` const (line 89) for placement/naming
convention, and the inline literal to extract (line 425).

**Imports** (lines 1-9, unchanged):
```go
package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
)
```

**Before** (`validateMembershipBaselineRegistryPresence`, lines 423-431):
```go
func validateMembershipBaselineRegistryPresence(m map[string][]Action) error {
	baseline := m[RoleMembershipBaseline]
	for _, a := range []Action{ActionFansubGroupMembersView, ActionFansubGroupMediaView, ActionFansubGroupMediaUpload} {
		if !slices.Contains(baseline, a) {
			return fmt.Errorf("permission cache: Rolle %q (Mitgliedschafts-Grundausstattung) fehlt Action %q in role_capabilities — Startup abgebrochen", RoleMembershipBaseline, a)
		}
	}
	return nil
}
```

**After — extract the literal into a package-level exported var** (near `RoleMembershipBaseline`,
line 89, or immediately above `validateMembershipBaselineRegistryPresence`):
```go
// MembershipBaselineActionCodes (Criterion 4, Phase 146) is the single Go source for the 3
// membership-baseline action codes. Consumed by validateMembershipBaselineRegistryPresence
// (startup fail-closed check) AND by AdminCapabilityHandler's new membership-baseline mutation
// guards (Criterion 1 revoke-side, D-16 grant-side) — one literal, multiple consumers, per D-05.
var MembershipBaselineActionCodes = []Action{
	ActionFansubGroupMembersView,
	ActionFansubGroupMediaView,
	ActionFansubGroupMediaUpload,
}

func validateMembershipBaselineRegistryPresence(m map[string][]Action) error {
	baseline := m[RoleMembershipBaseline]
	for _, a := range MembershipBaselineActionCodes {
		if !slices.Contains(baseline, a) {
			return fmt.Errorf("permission cache: Rolle %q (Mitgliedschafts-Grundausstattung) fehlt Action %q in role_capabilities — Startup abgebrochen", RoleMembershipBaseline, a)
		}
	}
	return nil
}
```
`RoleMembershipBaseline` const declaration (unchanged, line 89) for reference/placement style:
```go
// RoleMembershipBaseline (Phase 145) is the reserved, non-assignable pseudo-role sourcing
// the active-membership baseline via IsMembershipBaselineAction (effective_rights.go) --
const RoleMembershipBaseline = "group_member"
```

### `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` — Criterion 2 (badge/lock/aria-describedby, per UI-SPEC) + D-15 (`configurableActions` filter fix)

**Analog:** same file — this is an additive edit to an existing, fully-read component; UI-SPEC's
Interaction Contract (steps 1-6, `146-UI-SPEC.md` lines 185-251) is the locked, verbatim
implementation contract — do not re-derive, copy exactly.

**Imports to add** (top of file, after line 8's existing imports):
```tsx
import { Badge } from '@/components/ui/Badge'
import { Lock } from 'lucide-react'
```

**D-15 fix — the `configurableActions` line to change** (lines 53-55, current, unfiltered for the
reserved branch — this is the prerequisite bugfix RESEARCH.md's Critical Additional Finding
identified, now locked in by D-15):
```tsx
  const configurableActions = isReservedBaseline
    ? role.actions
    : role.actions.filter((action) => !membershipBaselineCodes.has(action.code))
```
**After:**
```tsx
  const configurableActions = isReservedBaseline
    ? role.actions.filter((action) => membershipBaselineCodes.has(action.code))
    : role.actions.filter((action) => !membershipBaselineCodes.has(action.code))
```
`membershipBaselineCodes` (lines 10-14) is Phase 145's own existing constant — reused unchanged,
not duplicated:
```tsx
const membershipBaselineCodes = new Set([
  "fansub_group.members.view",
  "fansub_group_media.view",
  "fansub_group_media.upload",
])
```
Per Criterion 4/D-05, consider whether this Set should eventually be anti-drift-tested against
`permissions.MembershipBaselineActionCodes` rather than staying a 3rd independent hardcoded copy —
RESEARCH.md Pitfall 3/A2 leaves the exact mechanism (derive-from-API vs. drift-test) as
implementation discretion.

**Row-rendering insertion point** (inside the existing action `.map()`, lines 76-123) — the
`146-UI-SPEC.md` Interaction Contract step 2 (verbatim, lines 197-208) is the exact JSX to insert
between the label `span` (lines 89-97) and the `standalone`/`Switch` conditional (lines 98-121):
```tsx
{isReservedBaseline && membershipBaselineCodes.has(action.code) && (
  <Badge variant="info" id={`baseline-protected-${action.code}`}>
    <Lock size={16} aria-hidden="true" />
    {' '}Geschützt
    <span className="visually-hidden">
      {' '}– Teil der Mitgliedschafts-Grundausstattung. Entziehen wird serverseitig abgelehnt,
      da jedes aktive Mitglied dieses Recht automatisch benötigt.
    </span>
  </Badge>
)}
```

**`Switch` element to extend with `aria-describedby`** (current, lines 109-120):
```tsx
                  <Switch
                    checked={action.granted}
                    disabled={!isEditable}
                    aria-label={action.label_de}
                    onCheckedChange={(next) => {
                      if (!isEditable) return
                      onRequestChange(action.code, next)
                    }}
                  />
```
Add one prop (UI-SPEC step 3): `aria-describedby={\`baseline-protected-${action.code}\`}` — only
for the 3 baseline rows; the simplest correct implementation adds this prop unconditionally since
the `id` only exists on those 3 rows' `Badge` (a dangling `aria-describedby` pointing at a
nonexistent id is otherwise harmless, but UI-SPEC step 3 implies conditioning it on the same
`isReservedBaseline && membershipBaselineCodes.has(action.code)` predicate as step 2 — mirror that
guard).

**Do NOT touch** (UI-SPEC step 4-6, explicit): `disabled={!isEditable}` stays exactly as-is (no
new disabled condition); `onRequestChange`, the accordion, categories, the caution paragraph
(current lines 163-169) and the "other roles" deep-link sentence (current lines 171-191) all stay
byte-identical; `RoleCapabilityImpactPreviewModal.tsx` is not touched at all (its existing
`mutationError` catch-and-render path already surfaces the backend's rejection message).

### `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` — rewrite "keine Sonderbehandlung" + new real-action-count test (D-19)

**Analog:** same file, the existing `reservedBaselineRole` fixture (lines 87-117) and its `145-03`
test pair (lines 243-269).

**Imports** (lines 1-16, unchanged):
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'
import type { RoleEntry } from '@/types/admin-capability'
```

**Test to rewrite** (currently lines 243-257, named `"145-03: rendert für die reservierte
Pseudo-Rolle alle 3 Grundausstattungs-Aktionen als normale Switch-Zeilen (keine
Sonderbehandlung) mit Hinweistext statt Deep-Link"`):
```tsx
  it('145-03: rendert für die reservierte Pseudo-Rolle alle 3 Grundausstattungs-Aktionen als normale Switch-Zeilen (keine Sonderbehandlung) mit Hinweistext statt Deep-Link', () => {
    render(<DetailHarness role={reservedBaselineRole} initialOpen={['gruppe', 'gruppenmedien']} />)

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
    const checkedSwitches = switches.filter((s) => s.getAttribute('aria-checked') === 'true')
    expect(checkedSwitches).toHaveLength(3)

    expect(
      screen.getByText(
        'Diese drei Rechte erhält jedes aktive Gruppenmitglied automatisch, unabhängig von seiner Rolle. Änderungen hier wirken sich sofort auf alle aktiven Mitglieder aller Fansub-Gruppen aus.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Grundausstattung öffnen' })).toBeNull()
  })
```
Per UI-SPEC step 7 (`146-UI-SPEC.md` lines 242-251), rename this test (the "keine
Sonderbehandlung" framing is now false) and add the badge assertion — the UI-SPEC's own
recommendation: keep the 3-switches/3-checked/hint-text/no-deep-link assertions (all still true),
add `expect(screen.getAllByText('Geschützt')).toHaveLength(3)` (or equivalent query for the
visible badge text) as a new assertion in the same test.

**New D-19 test — real 38-action fixture, all 8 categories, proving exactly 3 switches render
across ALL categories (not just the 2 the old 3-action fixture happened to open):** build a
fixture with the real per-D-18 shape (38 total actions for `group_member`, 3 granted/baseline, 34
non-baseline as live switches across 6 other categories, 1 standalone
`fansub_group.invitations.accept` rendered as inert text) and assert, with **all 8 categories
opened** (not just 2), that `screen.getAllByRole('switch')` still has length 3 post-D-15-fix. This
is a genuinely new fixture (the existing `reservedBaselineRole`, lines 87-117, only has 3 actions
total and cannot expose the bug D-19 describes) — no direct in-file analog exists for the fixture
shape itself; the harness (`DetailHarness`, lines 21-44) and the `initialOpen` prop (already
supports arbitrary category-ID arrays) are reused unchanged. Open ALL category ids present in the
fixture's `actions` array via `initialOpen` to defeat the `Accordion`'s lazy-mount behavior
(`frontend/src/components/ui/Accordion.tsx`'s `isMounted = isOpen || keepMountedIds?.has(id)` —
this is exactly the mechanism that hid the bug during Phase 145 UAT per RESEARCH.md).

### Next migration file (Criterion 4 seed source, if a Go-var-to-DB direction needs a migration touch)

**Analog:** `database/migrations/0160_membership_baseline_pseudo_role.up.sql` /
`0160_membership_baseline_pseudo_role.down.sql` — naming convention: `NNNN_snake_case_name.{up,down}.sql`,
sequential 4-digit zero-padded number, append-only (never edit a shipped migration).

**Next free number:** `0161` (0160 is the current highest, confirmed via `ls
database/migrations/ | tail -5`). Whether Criterion 4 actually needs a new migration (vs. treating
0160's existing seed as already the DB-side "derivation," with only Go/TS needing the
single-source refactor) is a planning-time call — RESEARCH.md's Architecture Patterns table lists
"migration is DB seed of record" as the intended role, i.e. 0160 likely stays untouched and no new
migration file is needed for Criterion 4 unless the planner decides otherwise. If a new migration
IS needed, copy 0160's exact structure/header-comment style before writing SQL.

### Block 2 — sample remediation targets and their replacement analogs

**Anti-pattern source files sampled (representative of the ~17-20 security-relevant Block-2
set):**

1. `backend/internal/repository/release_version_media_repository_test.go` — 33 `strings.Contains`
   calls across 18 test funcs. Confirmed anti-pattern (lines 62-73, `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`):
   ```go
   func TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle(t *testing.T) {
       repoSrc, err := os.ReadFile("release_version_media_repository.go")
       require.NoError(t, err)
       content := string(repoSrc)

       assert.Contains(t, content, "release_version_media_review_lifecycle")
       assert.Contains(t, content, "lifecycle.source_revision")
       // ... 4 more raw SQL-fragment presence checks, zero real DB calls
   }
   ```
   Also contains pure compile-time signature checks that are NOT the forbidden pattern and can
   stay (lines 78-98, 101-107, 115-121 — `var repo *MediaRepository; _ = repo.MethodName` is a
   compile-time existence check, not a source-substring behavioral claim; CLAUDE.md's Teststil
   rule targets substring-based behavioral assertions specifically, not method-existence checks).

2. `backend/internal/handlers/admin_content_release_version_media_test.go` — 25 `strings.Contains`
   across 40 funcs. Same anti-pattern shape (e.g. lines 92-107,
   `TestUploadReleaseVersionMediaHandlerExists` reads the handler's own `.go` source and asserts
   substrings like `form.File["files[]"]` exist, never calling the handler).

3. `backend/internal/handlers/admin_content_release_theme_assets_test.go` — 7 `strings.Contains`
   across 4 funcs, **100% substring, zero real calls in the whole file** (full file read above) —
   the cleanest, smallest representative case: `TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete`
   reads the handler source and checks 3 permission-check strings are present, never executing a
   single request through the handler to prove the permission check actually rejects/allows.

4. `backend/internal/repository/hist_group_member_roles_whitelist_test.go` — 5 `strings.Contains`
   across 2 funcs, **mixed pattern per Pitfall 5**: one test function combines an allowed absence
   loop (`for _, forbidden := range [...] { assert.False(t, strings.Contains(source, forbidden)) }`
   — CLAUDE.md exception 1, keep) immediately followed by presence assertions claiming SQL
   parameterization exists (forbidden, replace). Remediate at the assertion level inside this one
   function, not by deleting/rewriting the whole function.

**Replacement analog for repository-layer files (real Postgres, already established
in-package-family):** `backend/internal/repository/membership_baseline_registry_test.go` — see
its full pattern above (`testsupport.OpenPhase145Postgres`, real query calls, real `assert`/
`require` on returned data). This is the shape target for replacing files like
`release_version_media_repository_test.go`'s and `hist_group_member_roles_whitelist_test.go`'s
substring assertions with real calls into the repository methods against a migrated schema.

**Replacement analog for handler-layer files (httptest + fake repo, already established
in-package-family):** `backend/internal/handlers/admin_capability_handler_test.go` — see its full
pattern above (`stubXxxRepo` struct literal, `makeCapabilityTestContext`, real
`h.MethodName(c)` call, `rec.Code`/`json.Unmarshal(rec.Body...)` assertions). This is the shape
target for replacing files like `admin_content_release_version_media_test.go`'s and
`admin_content_release_theme_assets_test.go`'s substring assertions — build a small
`fakeMediaRepo`/`stubXxxRepo` per file (mirroring `stubCapabilityAuthzRepo`'s minimal-interface
style, only implementing what the specific handler under test needs) rather than reusing
`stubCapabilityAuthzRepo` itself (different interface).

## Shared Patterns

### Real-Postgres repository test harness (Criterion 3, Criterion 4 anti-drift, Block-2 repository-layer remediations)
**Source:** `backend/internal/repository/membership_baseline_registry_test.go` (lines 1-31, 138-152)
**Apply to:** all repository-layer Block-1 and Block-2 test work
```go
pool := testsupport.OpenPhase145Postgres(t)     // SKIP-not-FAIL if TEAM4S_PHASE145_TEST_DSN unset
ctx := context.Background()
testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))
```
`phase145MigrationPath` is a local per-file helper (not exported from `testsupport` — re-declare
per file if a new `_test.go` file needs it and isn't already in the `repository` package).

### `httptest` + fake-repository handler test (Criterion 1, D-16, Block-2 handler-layer remediations)
**Source:** `backend/internal/handlers/admin_capability_handler_test.go` (lines 21-107)
**Apply to:** all handler-layer Block-1 and Block-2 test work
```go
authzStub := &stubCapabilityAuthzRepo{
    isPlatformAdmin:      true,
    countRolesWithAction: 16,
}
c, rec := makeCapabilityTestContext(http.MethodDelete,
    "/admin/role-capabilities/group_member/fansub_group_media.upload", identity)
c.Params = gin.Params{{Key: "roleCode", Value: "group_member"}, {Key: "actionCode", Value: "fansub_group_media.upload"}}
h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
h.RevokeCapability(c)
assert.Equal(t, http.StatusConflict, rec.Code)
```
Struct-literal test doubles, no mock framework, real method call, real status-code + JSON-body
assertion — this is the CLAUDE.md Teststil-compliant shape for every Block-2 handler file.

### German error-response JSON shape (all mutation guards)
**Source:** `backend/internal/handlers/admin_capability_handler.go` (lines 171-177, 236-242,
255-261 — three existing examples of the same shape)
**Apply to:** the two new Criterion-1/D-16 guards
```go
c.JSON(http.StatusConflict /* or StatusUnprocessableEntity */, gin.H{
    "error": gin.H{
        "code":    "<stable_snake_case_code>",
        "message": "<sprechende deutsche Meldung mit korrekten Umlauten>",
    },
})
```

### Frozen, shrink-only ratchet-list convention (Criterion 7)
**Source:** `frontend/eslint.config.mjs` (lines 28-111, `LEGACY_NO_RESTRICTED_SYNTAX_FILES`)
**Apply to:** the new Go ratchet-guard test file (cross-language pattern, not a code copy)
```js
// RATCHET — diese Liste darf nur SCHRUMPFEN, nie wachsen.
// Gemessen am <date> ...: <N> Verstoesse in genau diesen <M> Dateien ...
// FROZEN EXPLICIT FILE LIST, keine Glob-Regel — ein Directory-Glob wuerde auch morgen neu
// angelegte Dateien in denselben Ordnern stillschweigend mit-exemptieren.
const LEGACY_NO_RESTRICTED_SYNTAX_FILES = [ /* ...explicit relative paths... */ ]
```
The Go equivalent (no existing Go precedent — see "No Analog Found") should mirror this shape as a
plain `[]string` slice literal with an identical "RATCHET — may only shrink" comment, listing the
final, locked set of Block-2 remainder files (Criterion 8's documented-with-reason list), asserted
by a `go test`-executed scanner (per RESEARCH.md's Don't-Hand-Roll section) rather than a lint
rule, since no CI/lint config exists in this repo.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| New Go file for Criterion 7's ratchet-guard test (e.g. `backend/internal/testquality/source_substring_guard_test.go`, name TBD by planner) | test (meta/self-test, AST/regex scanner over `_test.go` files) | batch | No Go-language precedent anywhere in this repo — confirmed no `.golangci.yml`, no custom AST-walking test in `backend/`. The only analog is cross-language: `frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` ratchet-list pattern (documented above under Shared Patterns) — its *shape* (frozen `[]string`/array literal + "may only shrink" comment + explicit paths, not globs) should be mirrored, but its *enforcement mechanism* (ESLint rule invoked via `npm run lint`) cannot be reused — the Go guard must be a `go test`-executed function using `os.ReadFile`+regex or `go/parser`+`go/ast` to scan `backend/**/*_test.go` for `os.ReadFile(...).go)` patterns, failing the test if a new, non-listed file is found. `.planning/notes/measure-substring-tests.py`'s regex logic (already proven correct against this exact codebase, cross-checked at 53 files/302 funcs matching the roadmap figure) is the recommended detection-logic source to port into Go, per RESEARCH.md's Don't-Hand-Roll table. |

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/permissions/`, `frontend/src/app/admin/roles/`, `frontend/eslint.config.mjs`,
`database/migrations/`
**Files scanned:** 10 explicitly named target files (full reads) + 4 sampled Block-2 anti-pattern
files (targeted `grep`+`Read`) + `.planning/notes/2026-09-04-messung-substring-tests.md` (full
20-file/33-file candidate list)
**Pattern extraction date:** 2026-09-04
