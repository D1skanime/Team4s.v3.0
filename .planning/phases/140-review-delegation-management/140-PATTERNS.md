# Phase 140: Review Delegation Management - Pattern Map

**Mapped:** 2026-08-25
**Files analyzed:** 13 (7 new, 6 modified)
**Analogs found:** 13 / 13

All research claims in `140-RESEARCH.md` were re-verified directly against the current
codebase (line counts, exact code, route registration, test-harness pattern) during this
mapping pass — no drift found. All quoted line numbers below are current as of this mapping.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/internal/handlers/admin_review_delegation_handler.go` (NEW) | controller/handler | request-response | `backend/internal/handlers/admin_effective_rights_handler.go` | exact (same pair-scoped GET/PUT shape, same D08 target-resolution pattern) |
| `backend/internal/handlers/review_delegation_contract.go` (NEW) | model (wire DTOs) | transform | `backend/internal/handlers/capability_policy_contract.go` | role-match (transport-only DTO file, no domain behavior) |
| `backend/internal/repository/review_delegation_repository.go` (EXTEND — add read method) | repository | CRUD | itself (extend in place) — non-locking read shape mirrors `backend/internal/repository/authz_user_overrides.go`'s `LockTargetMembership`/history queries | exact |
| `backend/internal/testsupport/phase140_postgres.go` (NOT BUILT — see note below) | test fixture/utility | batch | `backend/internal/testsupport/phase137_postgres.go` (composes 0085/0100/0108/0112/0146/0150) | superseded — 140-01-PLAN.md deliberately reuses the existing `openPhase107ReviewRepositoryPool` helper instead; see 140-VALIDATION.md Wave 0 note |
| `backend/internal/handlers/admin_review_delegation_handler_test.go` (NEW) | test | request-response | `backend/internal/handlers/admin_effective_rights_handler_test.go` (if present) else `contribution_review_handler_test.go` | role-match |
| `backend/cmd/server/admin_routes.go` (EXTEND) | route | request-response | itself — existing `adminEffectiveRightsHandler` block (lines 295-302) | exact |
| `backend/cmd/server/main.go` (EXTEND — construct new handler) | config/wiring | request-response | itself — existing `adminEffectiveRightsHandler := handlers.NewAdminEffectiveRightsHandler(...)` construction (line 528) reusing `releaseReviewService` (line 517) | exact |
| `shared/contracts/admin-capabilities.yaml` (EXTEND) | config (OpenAPI contract) | transform | itself — existing `effective-rights`/`capability-overrides` path definitions | exact |
| `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx` (NEW) | component | request-response | `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx` | exact (sibling-section structural template per UI-SPEC Pattern 3) |
| `frontend/src/app/admin/users/tabs/GroupSection.tsx` (EDIT — mount new section) | component | request-response | itself (extend in place) | exact |
| `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` (EDIT — grant-affordance removal for 3 review actions) | component | request-response | itself (extend in place) | exact |
| `frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts` (EDIT — add `isReviewDelegationAction`) | utility | transform | itself (extend in place) | exact |
| `frontend/src/app/admin/users/tabs/GuidedGrantFlow.tsx` (EDIT — exclude 3 review actions from grant path) | component | request-response | itself (extend in place); contrast with `GuidedRevokeFlow.tsx` (unaffected, do not copy its shape into the new section) | exact |
| `frontend/src/lib/api.ts` (EXTEND — `getReviewDelegations`/`mutateReviewDelegation`) | service (API client) | request-response | `getEffectiveRights`/`mutateCapabilityOverride` (same file, lines 10152-10199) | exact |
| `frontend/src/types/admin-review-delegation.ts` (NEW, or extend `admin-capability.ts`) | model (DTOs) | transform | `EffectiveRightState`/`CapabilityOverrideMutationRequest`/`CapabilityOverrideMutationResult` in `frontend/src/types/admin-capability.ts` (lines 151-255) | role-match (keep visually distinct per RESEARCH.md's naming guidance — do not literally reuse these types) |
| `frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` (NEW) | test | request-response | `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` (uses `getErrorStateCopy`-driven ErrorState pattern) or any existing `UserGroupRightsTab`-adjacent test | role-match |

## Pattern Assignments

### `backend/internal/handlers/admin_review_delegation_handler.go` (controller, request-response)

**Analog:** `backend/internal/handlers/admin_effective_rights_handler.go` (624 lines — DO NOT add to this file; new file required per CLAUDE.md's 450-line cap)

**Imports pattern** (lines 1-19):
```go
package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)
```

**Path-scoped target resolution (D08 BOLA guard)** (lines 94-108):
```go
func (h *AdminEffectiveRightsHandler) parseGroupAndTarget(c *gin.Context) (int64, int64, bool) {
	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return 0, 0, false
	}
	targetAppUserID, err := strconv.ParseInt(c.Param("appUserId"), 10, 64)
	if err != nil || targetAppUserID <= 0 {
		badRequest(c, "ungültige app_user_id")
		return 0, 0, false
	}
	return fansubGroupID, targetAppUserID, true
}
```
Copy this exactly (same two path params: `:id`, `:appUserId`).

**Auth pattern — MUST use `ActionFansubGroupMembersManage`, NOT `ActionUserGroupCapabilityOverrideManage`** (structural shape, lines 110-133; actual action code per RESEARCH.md Pitfall 2 / review_service.go:106-107):
```go
func (h *AdminEffectiveRightsHandler) authorizeManagement(
	c *gin.Context, identity middleware.AuthIdentity, actor permissions.Actor,
	fansubGroupID int64, targetAppUserID int64, eventType string, targetType string,
) bool {
	result, err := h.permissionSvc.CanForFansubGroup(
		c.Request.Context(), actor, permissions.ActionUserGroupCapabilityOverrideManage, fansubGroupID,
	)
	// ...
}
```
**Critical deviation from the analog:** the new handler's `authorizeManagement` must pass
`permissions.ActionFansubGroupMembersManage` (matching what `services.ReviewService.changeDelegation`
itself checks at `review_service.go:106-107`), not `ActionUserGroupCapabilityOverrideManage`. Copying
the analog's action code verbatim is the single most likely mistake here (Pitfall 2 in RESEARCH.md).

**Target-membership resolution to feed the service a `TargetMembershipID`:** this handler does NOT
call `LockTargetMembership` itself for the mutation path — `services.ReviewService.changeDelegation`
already does its own `delegations.LockMembership(ctx, cmd.TargetMembershipID)` inside its own
transaction (see review_service.go:100-104). The handler's job is only to resolve
`fansub_group_member_id` from `(appUserID, fansubGroupID)` **once, read-only**, to pass as
`TargetMembershipID` into the command — reuse the exact query shape of
`AuthzUserOverridesRepository.LockTargetMembership` (see below) but as a plain non-locking SELECT
(or accept the existing locking version is safe to call outside an explicit transaction, per
RESEARCH.md's "Alternatives Considered" — auto-commits and releases immediately). Do not have the
handler open its own transaction.

**Thin-handler-delegates-to-service pattern (PUT)** (lines 232-358, condensed to the parts to mirror):
```go
func (h *AdminEffectiveRightsHandler) MutateOverride(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}
	var req CapabilityOverrideMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	// D08: path params are the authorization-bearing scope; body mismatch -> 422, own audit call
	if req.GroupID != fansubGroupID || req.TargetUserID != targetAppUserID {
		// ... auditMutationRejected + 422
	}
	result, err := h.mutationSvc.MutateOverride(c.Request.Context(), services.EffectiveRightsOverrideMutationCommand{ /* ... */ })
	if err != nil {
		h.writeMutationError(c, identity, fansubGroupID, targetAppUserID, permissions.Action(req.ActionCode), err)
		return
	}
	// ... build response, write audit, c.JSON(http.StatusOK, gin.H{"data": response})
}
```
For the new PUT handler: bind `{action_code, grant: bool}`, resolve `TargetMembershipID` (see above),
build `services.ReviewDelegationCommand{Actor: actor, TargetMembershipID: resolvedID, Action:
permissions.Action(req.ActionCode)}`, call `GrantDelegation` if `req.Grant` else `RevokeDelegation`,
then map errors via a new `writeMutationError`-style switch (see below) and respond
`c.JSON(http.StatusOK, gin.H{"data": response})`.

**Error handling / typed-error-to-HTTP-status mapping pattern** (lines 393-441):
```go
func (h *AdminEffectiveRightsHandler) writeMutationError(
	c *gin.Context, identity middleware.AuthIdentity, fansubGroupID int64, targetAppUserID int64,
	action permissions.Action, err error,
) {
	switch {
	case errors.Is(err, services.ErrEffectiveRightsCapabilityDenied):
		// ... 403
	case errors.Is(err, services.ErrEffectiveRightsTargetNotActiveMember):
		// ... 422
	case errors.Is(err, services.ErrEffectiveRightsActionUnknown):
		// ... 422
	// ...
	default:
		log.Printf("effective rights mutate: service error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
	}
}
```
Map this exact shape onto the review-delegation domain's own typed errors from
`backend/internal/services/review_service.go:16-29`:
- `services.ErrReviewCapabilityDenied` → 403 (`errors.Is`, mirrors `ErrEffectiveRightsCapabilityDenied`)
- `services.ErrReviewDelegationTargetIneligible` → 422 (grant-only; mirrors `ErrEffectiveRightsTargetNotActiveMember`)
- `services.ErrReviewActionInvalid` → 400 (an out-of-catalog `action_code` — reject BEFORE calling
  the service too, per ASVS V5 in RESEARCH.md, using `isDelegableReviewAction`-equivalent validation
  at the handler boundary as defense in depth)
- `repository.ErrNotFound` (from the target-resolution step, foreign/nonexistent pair) → 404, same as
  `resolveTargetActor`'s `errors.Is(err, repository.ErrNotFound)` branch at
  `admin_effective_rights_handler.go:147-150`
- default → 500 `internalError(c, "interner serverfehler")`

---

### `backend/internal/services/review_service.go` (EXISTING — reuse verbatim, DO NOT MODIFY, already 448/450 lines)

**Confirmed exact code to call from the new handler** (lines 82-146):
```go
type ReviewDelegationCommand struct {
	Actor              permissions.Actor
	TargetMembershipID int64
	Action             permissions.Action
}

func (s *ReviewService) GrantDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, true)
}
func (s *ReviewService) RevokeDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, false)
}
```
`changeDelegation` (lines 88-146) itself: begins its own tx, calls
`delegations.LockMembership(ctx, cmd.TargetMembershipID)`, authorizes via
`permissions.NewService(authz).CanForFansubGroup(ctx, cmd.Actor, permissions.ActionFansubGroupMembersManage, target.FansubGroupID)`,
gates grant-only eligibility via `eligibleDelegationTarget(target)`, calls
`delegations.GrantAction`/`RevokeAction`, writes a `ReviewAuditRepository.InsertEvent` inside the same
tx only if the mutation was non-no-op, then commits. The handler must not duplicate any of this.

**Eligibility/validity helpers not to reimplement** (lines 413-423):
```go
func eligibleDelegationTarget(target *repository.ReviewDelegationMembership) bool {
	return target != nil && target.MembershipID > 0 && target.FansubGroupID > 0 &&
		target.AppUserID > 0 && target.MemberID != nil && *target.MemberID > 0 &&
		strings.TrimSpace(target.MembershipStatus) == "active" &&
		strings.TrimSpace(target.AppUserStatus) == "active" && target.HasVerifiedMemberClaim
}
func isDelegableReviewAction(action permissions.Action) bool {
	return action == permissions.ActionReviewTextDecide ||
		action == permissions.ActionReviewImageDecide ||
		action == permissions.ActionReviewContributionDecide
}
```
`isDelegableReviewAction` is unexported (package `services`) — the new handler needs its own local
input-validation check against the same three action codes for the 400 rejection described above
(it cannot import this unexported function); mirror its exact three-way check.

**Instance already constructed in `main.go` — reuse, do not reconstruct** (main.go:517):
```go
releaseReviewService := services.NewReviewService(dbPool, services.ReleaseReviewAdapters())
```
Pass this exact instance into the new handler's constructor in `main.go`, alongside the existing
`adminEffectiveRightsHandler := handlers.NewAdminEffectiveRightsHandler(...)` construction at line 528
(mirror that construction call's shape for the new `AdminReviewDelegationHandler`).

---

### `backend/internal/repository/review_delegation_repository.go` (repository, CRUD — EXTEND, currently 146 lines)

**Existing methods, confirmed unchanged, reuse as-is:**
```go
func (r *ReviewDelegationRepository) LockMembership(ctx context.Context, fansubGroupMemberID int64) (*ReviewDelegationMembership, error)
func (r *ReviewDelegationRepository) GrantAction(ctx context.Context, fansubGroupMemberID int64, actionCode string) (bool, error)
func (r *ReviewDelegationRepository) RevokeAction(ctx context.Context, fansubGroupMemberID int64, actionCode string) (bool, error)
```

**New read method to add** — model it on `LockMembership`'s exact query shape (lines 42-86) but as a
non-locking SELECT plus a join out to `fansub_group_member_review_capabilities` for the granted set:
```go
// LockMembership's query, to mirror structurally (drop FOR UPDATE for the new read method):
var membership ReviewDelegationMembership
err := r.db.QueryRow(ctx, `
	SELECT
		fgm.id, fgm.fansub_group_id, fgm.app_user_id, fgm.member_id, fgm.status, au.status,
		EXISTS (
			SELECT 1 FROM member_claims mc
			WHERE mc.app_user_id = fgm.app_user_id AND mc.member_id = fgm.member_id
			  AND mc.claim_status = 'verified'
		)
	FROM fansub_group_members fgm
	JOIN app_users au ON au.id = fgm.app_user_id
	WHERE fgm.id = $1
	FOR UPDATE OF fgm
`, fansubGroupMemberID).Scan(/* ... */)
```
Return `repository.ErrNotFound` on `pgx.ErrNoRows`, exactly as `LockMembership` does (line 79-81) and
as `AuthzUserOverridesRepository.LockTargetMembership` does (line 197-199) — same sentinel error
convention project-wide.

**Target-membership resolution from `(appUserID, fansubGroupID)` — pattern to mirror for the handler's
own resolution step (not this repository's job to add, but the query shape to copy for whatever
resolves `TargetMembershipID` before calling the service):**
```go
// Source: backend/internal/repository/authz_user_overrides.go:173-204
func (r *AuthzUserOverridesRepository) LockTargetMembership(
	ctx context.Context, appUserID int64, fansubGroupID int64,
) (*TargetMembership, error) {
	// SELECT fgm.id, fgm.app_user_id, fgm.fansub_group_id, fgm.member_id, fgm.status, au.status
	// FROM fansub_group_members fgm JOIN app_users au ON au.id = fgm.app_user_id
	// WHERE fgm.app_user_id = $1 AND fgm.fansub_group_id = $2 FOR UPDATE OF fgm
	// -> ErrNotFound on no match (covers "foreign pair" rejection at the handler boundary,
	//    BOLA/IDOR-safe by construction per its own doc comment)
}
```

---

### `backend/internal/testsupport/phase140_postgres.go` (test fixture, batch — NOT BUILT)

**Superseded:** `140-01-PLAN.md` deliberately does not build this file. The handler layer
(140-01 Task 2) is stub-tested, not real-Postgres-integration-tested, mirroring
`admin_effective_rights_handler_test.go`'s established convention — and the one new
repository read method (140-01 Task 1) is fully coverable by the existing
`openPhase107ReviewRepositoryPool` helper already present in
`review_delegation_repository_test.go` (which already composes `OpenPhase107Postgres` +
a manual migration-0134 apply). This entry is retained below for its analog/structural
research value, not as an instruction to build a new file — see `140-VALIDATION.md`'s
Wave 0 section for the decision record.

**Analog:** `backend/internal/testsupport/phase137_postgres.go` (confirmed current: composes
0085/0100/0108/0112/0146/0150 plus hand-rolled `members`/`app_users` stand-in tables)

**Structural pattern** (lines 1-36 read in full):
```go
package testsupport

import (
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase137DSNEnv = "TEAM4S_PHASE137_TEST_DSN"

var (
	phase137DatabasePattern = regexp.MustCompile(`^team4s_phase137_test_[a-z0-9]+$`)
	phase137SchemaPattern   = regexp.MustCompile(`^phase137_[a-z0-9_]+$`)
)

func OpenPhase137Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t, phase137DSNEnv, phase137DatabasePattern, "phase137_", phase137SchemaPattern,
		createPhase137Prerequisites,
	)
}
```
Copy this exact shape for `OpenPhase140Postgres`/`TEAM4S_PHASE140_TEST_DSN`, but the migration set
applied inside `createPhase140Prerequisites` (or equivalent) must additionally include migration
`0134_review_foundation.up.sql` (review tables + audit trigger), which Phase 137's harness does not
apply. Per RESEARCH.md Pitfall 1, this is a real, verified gap — neither existing harness alone
covers both `fansub_group_member_review_capabilities` and the real capability-override catalog chain.

---

### `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx` (component, request-response — NEW)

**Analog:** `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx` (structural sibling-section
pattern, NOT literal code — this is a different interaction model per UI-SPEC: `Switch` toggles, not
`Button` verbs)

**Imports pattern to mirror** (lines 1-7):
```tsx
import { useState } from 'react'

import { Badge, Button, SectionHeader, Select } from '@/components/ui'
import { resolveRoleLink } from '../resolveRoleLink'
import { assignableFansubGroupRoles, roleLabelFor } from './userGroupRightsHelpers'
import type { AdminGroupMembershipSummary } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'
```
For the new component, swap in `Switch`, `EmptyState`, `ErrorState` from `@/components/ui` (per
UI-SPEC's mandatory primitive list) and the new `getReviewDelegations`/`mutateReviewDelegation` from
`@/lib/api` plus new DTO types (do not import `EffectiveRightState`/`RoleCapabilityMatrix` — keep
visually distinct per RESEARCH.md's naming guidance).

**Sibling-section, own `SectionHeader`, own state, own gap-based layout pattern** (lines 9-23):
```tsx
export function GroupRolesSection({ membership, matrix, onOpenRoleAssignment }: {...}) {
  const [selectedRoleCode, setSelectedRoleCode] = useState('')
  const assignableRoles = assignableFansubGroupRoles(matrix, membership.roles)
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <SectionHeader level={3} title="Rollen in dieser Gruppe" />
      {/* ... */}
    </div>
  )
}
```
Mirror this exact shape: `<div style={{ marginBottom: 'var(--space-3)' }}><SectionHeader level={3}
title="Prüf-/Freigabe-Rechte" description="..." />` then the fixed 3-row list per UI-SPEC's Row
anatomy section (Switch + label + status/error text per row, `gap: var(--space-2)` within a row,
`gap: var(--space-3)` between rows).

**Error-state pattern to reuse for the section-level GET failure** (per UI-SPEC — mirror
`GroupMediaReviewSection.tsx`'s `getErrorStateCopy` usage rather than hand-rolling error copy):
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx:15, 206, 253
import { getErrorStateCopy } from '@/components/ui'
const [loadError, setLoadError] = useState<ReturnType<typeof getErrorStateCopy> | null>(null)
// ... on fetch failure:
setLoadError(getErrorStateCopy(err, { defaultDescription: 'Die Prüf-/Freigabe-Rechte konnten nicht geladen werden.' }))
```

**`Switch` primitive contract to build the 3 toggle rows against** (full file,
`frontend/src/components/ui/Switch.tsx`):
```tsx
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'onClick' | 'type'> {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}
```
Use `checked={row.granted}`, `onCheckedChange={(next) => handleToggle(row.action_code, next)}`,
`disabled={!row.granted && !row.eligible_for_grant}` per UI-SPEC's ineligible-row rule.

**File-size note:** UI-SPEC expects ~90-140 lines; if fetch/mutate logic pushes it over, extract a
`useReviewDelegations` hook mirroring `useGroupMembersClaimActions.ts`'s precedent (per UI-SPEC File
Size Note) — do not let this file approach 450 lines before splitting.

---

### `frontend/src/app/admin/users/tabs/GroupSection.tsx` (component — EDIT, currently 105 lines)

**Mount point pattern** (full file read; lines 1-9 imports, lines 86-92 mount call):
```tsx
import { GroupRolesSection } from './GroupRolesSection'
// ...
<GroupRolesSection
  membership={membership}
  matrix={matrix}
  onOpenRoleAssignment={(roleCode, roleLabel, change) =>
    onOpenRoleAssignment(membership.fansub_group_id, membership.fansub_group_name, roleCode, roleLabel, change)
  }
/>
{accordionItems.length === 0 ? (
  <EmptyState variant="inline" title="Keine Rechte in dieser Gruppe." />
) : (
  <Accordion items={accordionItems} mode="multi" openIds={openCategoryIds} onOpenChange={onOpenCategoryIdsChange} />
)}
```
Add `<ReviewDelegationSection membership={membership} appUserId={appUserId} />` (or whatever prop
shape the new component needs) directly after `<GroupRolesSection .../>` and before the
`accordionItems.length === 0 ? ... : <Accordion .../>` block — this ordering matches UI-SPEC's
locked reading order (group name → roles → Prüf-/Freigabe-Rechte → generic capability categories).

---

### `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` (component — EDIT, currently 98 lines)

**Current grant/revoke condition to modify** (lines 23-26):
```tsx
const showRevoke = state.allowed && !state.non_deniable
const showGrant = !state.allowed
const showRemoveOverride = state.user_allow || state.user_deny
```
Change `showGrant` to `!state.allowed && !isReviewDelegationAction(state.action_code)`. Where the
grant button used to render (lines 70-74):
```tsx
{showGrant && (
  <Button variant="secondary" size="sm" onClick={() => onOpenGrant(state, label)}>
    Recht zusätzlich erlauben
  </Button>
)}
```
add an `else if` branch (when `!state.allowed && isReviewDelegationAction(state.action_code)`)
rendering the static explanatory line + jump-link button per UI-SPEC's exact copy:
```tsx
{!state.allowed && isReviewDelegationAction(state.action_code) && (
  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
    Gewähren nur über „Prüf-/Freigabe-Rechte" oben.
    <Button
      variant="ghost"
      size="sm"
      onClick={() => document.getElementById('review-delegation-section')?.scrollIntoView({ behavior: 'smooth' })}
    >
      Zu Prüf-/Freigabe-Rechte springen
    </Button>
  </div>
)}
```
`showRevoke`/`showRemoveOverride` and their button blocks (lines 65-69, 75-84) are unaffected — do
not touch the deny/revoke side per the CONTEXT.md binding decision.

---

### `frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts` (utility — EDIT, currently 101 lines)

**Existing predicate pattern to mirror** (lines 75-77, `roleLabelFor`) and (lines 80-82, `actionLabelFor`):
```ts
export function roleLabelFor(roleCode: string, matrix: RoleCapabilityMatrix | null): string {
  return matrix?.roles.find((entry) => entry.role_code === roleCode)?.label_de ?? roleCode
}
```
Add a new, simple, matrix-independent pure predicate (per UI-SPEC, hardcoded triad, NOT catalog-driven):
```ts
const REVIEW_DELEGATION_ACTION_CODES = new Set([
  'review.image.decide',
  'review.text.decide',
  'review.contribution.decide',
])

export function isReviewDelegationAction(actionCode: string): boolean {
  return REVIEW_DELEGATION_ACTION_CODES.has(actionCode)
}
```
`CATEGORY_ORDER` (lines 13-21) already includes `'review'` — per the binding decision this stays
unchanged (Option (a)/asymmetric split territory; the category itself is not filtered).

---

### `frontend/src/app/admin/users/tabs/GuidedGrantFlow.tsx` (component — EDIT, currently 195 lines)

**Confirmed current shape:** `GuidedGrantFlow` is a generic modal that calls `mutateCapabilityOverride`
for ANY `actionCode`/`state` passed to it (props: `actionCode`, `actionLabel`, `state`,
`onMutated` — lines 34-54) — it has no action-code filtering of its own today; the exclusion must
happen at the call site.

**Where to apply the exclusion:** since `CapabilityDetailRow.tsx`'s `showGrant` now already
never renders the "Recht zusätzlich erlauben" button for the three review actions (see above),
`onOpenGrant` (which is what ultimately opens `GuidedGrantFlow`) can never be invoked for these
action codes through the normal UI path anymore. Per RESEARCH.md's requirement ("GuidedGrantFlow
must no longer offer these three actions, OR the category must be excluded from whatever UI path
leads to a grant-shaped override"), the `CapabilityDetailRow` change above is sufficient and is the
recommended, smaller-footprint fix — do not additionally add a redundant guard inside
`GuidedGrantFlow.tsx` itself unless the planner finds another call site that can still reach it with
one of these three action codes (grep for all `onOpenGrant`/`GuidedGrantFlow` call sites during
planning to confirm no other path exists).

**`GuidedRevokeFlow.tsx` (291 lines) is explicitly unaffected** — do not modify it; it remains the
deny/revoke path for these three actions per the binding decision.

---

### `frontend/src/lib/api.ts` (service/API client — EXTEND, file is 10613 lines total; only append 2 new functions, do not touch the rest)

**Analog: `getEffectiveRights`** (lines 10146-10169):
```ts
/**
 * Lädt den vollständigen provenienzfähigen Effective-Rights-Katalog eines Nutzers in EINER
 * Fansub-Gruppe (Phase 137 Resolver, Plan 138-06/UADM-01).
 * GET /api/v1/admin/fansubs/:id/app-members/:appUserId/effective-rights
 */
export async function getEffectiveRights(
  fansubGroupId: number,
  appUserId: number,
): Promise<EffectiveRightState[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/effective-rights`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: EffectiveRightState[] }
  return resp.data
}
```
Mirror exactly for `getReviewDelegations(fansubGroupId, appUserId): Promise<ReviewDelegationRow[]>`
hitting `GET /api/v1/admin/fansubs/:id/app-members/:appUserId/review-delegations`.

**Analog: `mutateCapabilityOverride`** (lines 10171-10199):
```ts
/**
 * Setzt/entfernt einen persönlichen Capability-Override ...
 * PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides
 */
export async function mutateCapabilityOverride(
  fansubGroupId: number,
  appUserId: number,
  body: CapabilityOverrideMutationRequest,
): Promise<CapabilityOverrideMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/capability-overrides`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: CapabilityOverrideMutationResult }
  return resp.data
}
```
Mirror exactly for `mutateReviewDelegation(fansubGroupId, appUserId, { action_code, grant }):
Promise<ReviewDelegationMutationResult>` hitting `PUT
/api/v1/admin/fansubs/:id/app-members/:appUserId/review-delegations`. Note: unlike
`mutateCapabilityOverride`'s body (`group_id`/`target_user_id`/`action_code`/`effect`/`reason`), the
new body per CONTEXT.md/RESEARCH.md is only `{action_code, grant: boolean}` — no `reason` field
(Pitfall 4), and per D08 the handler resolves target/group from the path, not the body, so the body
does not need to (and should not) duplicate `group_id`/`target_user_id` either — follow whatever the
backend contract file actually settles on, but do not add a reason field.

---

### `frontend/src/types/admin-review-delegation.ts` (NEW, or extend `admin-capability.ts`)

**Analog shapes to mirror the style of** (from `frontend/src/types/admin-capability.ts`, confirmed
lines 151-255 contain `EffectiveRightState`, `CapabilityOverrideReason`,
`CapabilityOverrideMutationRequest`, `CapabilityOverrideMutationResult`): use the same
interface-per-DTO style (snake_case field names matching the Go JSON tags, one exported interface per
wire shape), but keep the new types under distinct names (`ReviewDelegationRow`,
`ReviewDelegationMutationRequest`, `ReviewDelegationMutationResult`) per RESEARCH.md's explicit
guidance to keep this domain's wire types "visually distinct" from `EffectiveRightState`/
`CapabilityOverride*` even if colocated in the same file.

---

## Shared Patterns

### D08 path-scoped target resolution (BOLA/IDOR guard)
**Source:** `backend/internal/handlers/admin_effective_rights_handler.go:96-108, 143-196` and
`backend/internal/repository/authz_user_overrides.go:173-204`
**Apply to:** the new `admin_review_delegation_handler.go` (both GET and PUT) — always resolve
`fansub_group_member_id` server-side from `:id`/`:appUserId`, never accept a client-supplied
`membership_id`/`fansub_group_member_id` in the request body.

### Thin handler delegating to an existing transactional service (no handler-owned transactions)
**Source:** `backend/internal/services/review_service.go:82-146` (already exists, do not modify)
**Apply to:** the new handler's PUT — construct `services.ReviewDelegationCommand` and call
`GrantDelegation`/`RevokeDelegation`; never begin a transaction or re-implement eligibility/idempotency
in the handler.

### Typed-error-to-HTTP-status mapping (`writeMutationError`-style switch)
**Source:** `backend/internal/handlers/admin_effective_rights_handler.go:393-441`
**Apply to:** the new handler's PUT error path, mapped onto `services.ErrReviewCapabilityDenied` (403),
`services.ErrReviewDelegationTargetIneligible` (422), `services.ErrReviewActionInvalid` (400),
`repository.ErrNotFound` (404), default (500).

### Route registration guarded by nil-handler check
**Source:** `backend/cmd/server/admin_routes.go:295-302`
```go
if deps.adminEffectiveRightsHandler != nil {
	v1.GET("/admin/fansubs/:id/app-members/:appUserId/effective-rights", auth, deps.adminEffectiveRightsHandler.GetEffectiveRights)
	v1.PUT("/admin/fansubs/:id/app-members/:appUserId/capability-overrides", auth, deps.adminEffectiveRightsHandler.MutateOverride)
	v1.GET("/admin/fansubs/:id/app-members/:appUserId/capability-overrides/history", auth, deps.adminEffectiveRightsHandler.ListOverrideHistory)
}
```
**Apply to:** register the new `GET .../review-delegations` and `PUT .../review-delegations` routes
the same way, gated on `deps.adminReviewDelegationHandler != nil`.

### Fetch client pattern (`apiClientFetch`/`authorizedFetch` + `parseApiErrorPayload` + `ApiError`)
**Source:** `frontend/src/lib/api.ts:10152-10199`
**Apply to:** both new `getReviewDelegations`/`mutateReviewDelegation` functions — GET uses
`apiClientFetch(path, { cache: "no-store" })`, PUT uses `authorizedFetch(fullUrl, { method, headers,
body })`; both throw `ApiError` from `parseApiErrorPayload` on non-ok response, both unwrap
`{ data: ... }`.

### `getErrorStateCopy` for section-level fetch failure (frontend)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx:15, 206, 253`
**Apply to:** `ReviewDelegationSection.tsx`'s section-level GET-failure branch — do not hand-roll new
error copy logic, reuse `getErrorStateCopy(err, { defaultDescription: '...' })`.

### German umlaut correctness in all new user-facing strings (Sprachqualität)
**Source:** CLAUDE.md's binding Sprachqualität rule + UI-SPEC's Copywriting Contract (verbatim
strings already specified: "Prüf-/Freigabe-Rechte", "Gewähren nur über „Prüf-/Freigabe-Rechte" oben.",
etc.)
**Apply to:** every new/edited JSX text node, button label, aria-label, and Go response string touched
by this phase — no ASCII substitutes (ae/oe/ue/ss).

## No Analog Found

None — every file in this phase's scope has a strong, directly-verified analog already in the
codebase (this phase is explicitly an "HTTP + UI exposure" phase over an already-built domain
mechanism, per RESEARCH.md's Summary).

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/services/`, `backend/internal/testsupport/`, `backend/cmd/server/`,
`frontend/src/app/admin/users/tabs/`, `frontend/src/lib/api.ts`, `frontend/src/types/`,
`frontend/src/components/ui/`
**Files scanned:** 20 (all read in full or via targeted non-overlapping line-range reads; no file
over 2,000 lines needed range-splitting except `frontend/src/lib/api.ts`, which was grepped first
then read only at the relevant ~90-line window)
**Pattern extraction date:** 2026-08-25
**Verification note:** All line numbers, file lengths, and code excerpts in this document were
re-read directly from the current repository state during this mapping pass (not copied unverified
from 140-RESEARCH.md) — no drift was found between RESEARCH.md's claims and the current codebase.
