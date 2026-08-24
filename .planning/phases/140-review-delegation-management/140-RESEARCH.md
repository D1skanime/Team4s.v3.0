# Phase 140: Review Delegation Management - Research

**Researched:** 2026-08-24
**Domain:** Go/Gin backend authorization + Next.js admin member editor (specialized review-delegation surface)
**Confidence:** HIGH (the domain mechanism, its data model, and its transactional/audit seam are already fully implemented and tested from Phase 107/137; this phase is an HTTP + UI exposure phase, not new domain design)

## Summary

Phase 140 does **not** need to invent review delegation from scratch. `services.ReviewService.GrantDelegation`/`RevokeDelegation` (backend/internal/services/review_service.go, shipped in Phase 107) already implement the full idempotent, transactional, audited, eligibility-checked mutation that RDEL-04 asks for, backed by `repository.ReviewDelegationRepository` (backend/internal/repository/review_delegation_repository.go) and the `fansub_group_member_review_capabilities` table (migration `0134_review_foundation.up.sql`). What is genuinely missing is the **HTTP boundary**: no route, handler, OpenAPI/TS contract, or frontend UI exists yet for either reading (RDEL-01) or mutating (RDEL-02) a target member's delegations. This phase is almost entirely "wire the existing service to a new admin surface," following the exact template Phase 137/138 already established for `AdminEffectiveRightsHandler` (backend/internal/handlers/admin_effective_rights_handler.go) and `UserGroupRightsTab`/`GroupSection` (frontend/src/app/admin/users/tabs/).

The one piece that must be newly built at the repository layer is a **read query** for a target member's currently granted delegations (RDEL-01) — today's only read path, `AuthzRepository.ResolveActorReviewGrantContext`, is scoped to the acting user's own verified membership and is not usable to inspect an arbitrary target. A new, narrowly-scoped read method on `ReviewDelegationRepository` (or a sibling file) is needed, plus resolution of the target's `fansub_group_member_id` from the (appUserId, fansubGroupId) path pair the way `AuthzUserOverridesRepository.LockTargetMembership` already does for the effective-rights handler.

**A significant, must-flag contradiction was found during this research** (see "Contradiction Found" below): migration `0150_effective_rights_overrides.up.sql` flipped `review.text.decide`/`review.image.decide`/`review.contribution.decide` to `user_overridable = true`, and the already-shipped (Phase 138) generic capability-override UI (`UserGroupRightsTab` → `GroupSection` → `CategoryTable` Accordion, category `"review"`) **already lets an admin with `user_group_capability_override.manage` grant/deny these exact three actions today**, through the generic `mutateCapabilityOverride`/`GuidedGrantFlow`/`GuidedRevokeFlow` path — a parallel, already-live mechanism for the same three actions RDEL-02 is about to add a second, dedicated control surface for. This directly bears on RDEL-03's requirement that delegation stay "visibly and technically separate from roles and generic user overrides," and needs an explicit planning decision (see Open Questions).

**Primary recommendation:** Build one new backend handler file + a small new repository read method + route registration, wire an `admin-capabilities.yaml`-style OpenAPI addition, and add one new frontend section component (`ReviewDelegationSection.tsx`, mirroring `GroupRolesSection.tsx`'s pattern, NOT reusing `GuidedGrantFlow`/`GuidedRevokeFlow`, which are hard-wired to the incompatible generic-override contract). Reuse `services.ReviewService` (already constructed in `main.go` as `releaseReviewService`) unchanged for mutation; add no new domain logic to `review_service.go` (already at 448/450 lines).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read target member's current delegations (RDEL-01) | API / Backend (new handler + new repo read query) | Database (fansub_group_member_review_capabilities) | Must be server-computed and group-scoped like every other admin inspection endpoint (D08 pattern) |
| Grant/revoke one delegable review right (RDEL-02) | API / Backend (new handler → existing `services.ReviewService`) | Database (transactional write + append-only audit) | Domain mutation logic already lives in the service/repository tier; handler is a thin HTTP projection only |
| "Prüf-/Freigabe-Rechte" section in member editor (RDEL-03) | Frontend Server (SSR shell) / Browser (client component) | API / Backend (dedicated endpoints, not shared with capability-overrides) | UserGroupRightsTab's tab/section tree already lives in `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (App Router client component under the `roles-rights` tab) |
| Idempotency + audit reuse (RDEL-04) | API / Backend (services.ReviewService) | Database (review_audit_events, append-only triggers) | Already fully implemented; this phase must not re-implement or duplicate it |
| Eligibility gating (foreign/inactive/disabled/pending) | API / Backend (services.ReviewService.eligibleDelegationTarget + CanForFansubGroup) | Database (constraint-level status checks) | Already implemented for grant; revoke intentionally bypasses eligibility (documented, tested behavior) |

## Standard Stack

This phase introduces **no new external packages** — it is pure extension of the existing Go/Gin + Next.js/React stack already in use project-wide (see CLAUDE.md Technology Stack). No package legitimacy audit is required.

### Core (existing, reused as-is)
| Component | Location | Purpose | Why standard here |
|-----------|----------|---------|--------------------|
| `services.ReviewService.GrantDelegation`/`RevokeDelegation` | `backend/internal/services/review_service.go:82-146` | Transactional, idempotent, audited grant/revoke | Already implements 100% of RDEL-04; do not reimplement |
| `repository.ReviewDelegationRepository` | `backend/internal/repository/review_delegation_repository.go` | `LockMembership`, `GrantAction`, `RevokeAction` on `fansub_group_member_review_capabilities` | Already implements the persistence primitives |
| `permissions.ReviewGrantContext` / `ResolveActorReviewGrantContext` | `backend/internal/permissions/permissions.go:305-319`, `backend/internal/repository/authz_permissions.go:197-276` | Feeds specialized ALLOW-shaped facts into the central resolver (actor-scoped only) | Confirms the resolver-side separation from `user_group_capability_overrides` (Phase 137 D05) |
| `AuthzUserOverridesRepository.LockTargetMembership` | `backend/internal/repository/authz_user_overrides.go:173-204` | Resolves (appUserId, fansubGroupId) → membership row, no status filter | Exact pattern to copy/reuse for resolving `fansub_group_member_id` from path params before calling the review-delegation service |
| `AdminEffectiveRightsHandler` | `backend/internal/handlers/admin_effective_rights_handler.go` | GET/PUT/GET-history triad for one (group, appUser) pair | Direct structural template for the new delegation handler (parseGroupAndTarget, authorizeManagement, resolveTargetActor, writeMutationError patterns) |
| `UserGroupRightsTab` / `GroupSection` / `GroupRolesSection` | `frontend/src/app/admin/users/tabs/*.tsx` | Canonical member editor "Rollen & Rechte" tab | RDEL-03's "existing member editor" — the new section is added here, not a new route |

### Supporting (new, small additions)
| Component | Purpose | When to use |
|-----------|---------|-------------|
| New repository read method (e.g. `ReviewDelegationRepository.ListGrantedActions` or a sibling non-locking query) | RDEL-01's read path | Given a resolved `fansub_group_member_id`, returns currently granted `action_code`s (and ideally eligibility flags) |
| New `backend/internal/handlers/admin_review_delegation_handler.go` | HTTP boundary for RDEL-01/RDEL-02 | Do not add to `admin_effective_rights_handler.go` (already 624 lines, over the 450-line cap) or `review_service.go` (already 448 lines) |
| New `backend/internal/handlers/review_delegation_contract.go` (or extend `capability_policy_contract.go`, currently 225 lines) | Wire DTOs (`ReviewDelegationState`, mutation request/result) | Keep the new domain's wire types visually distinct from `EffectiveRightState`/`CapabilityOverride*` types even if colocated |
| New frontend `ReviewDelegationSection.tsx` | The "Prüf-/Freigabe-Rechte" UI section | Mirrors `GroupRolesSection.tsx`'s `SectionHeader`-based pattern; must NOT reuse `GuidedGrantFlow`/`GuidedRevokeFlow` (see Anti-Patterns) |
| New frontend `getReviewDelegations`/`mutateReviewDelegation` in `frontend/src/lib/api.ts` | New API client functions | Mirror `getEffectiveRights`/`mutateCapabilityOverride`'s exact fetch/error-handling shape (lines ~10152-10199) |

### Alternatives Considered
| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| New dedicated handler file | Extending `AdminEffectiveRightsHandler` | Rejected: file already exceeds the 450-line cap (624 lines); mixing two domains in one file also blurs the technical separation RDEL-03 requires |
| New dedicated frontend section | Adding delegation rows into the existing `CategoryTable`/Accordion | Rejected: would use `GuidedGrantFlow`/`GuidedRevokeFlow`, which POST to `mutateCapabilityOverride` with a mandatory `reason` field the review-delegation domain does not have (`ReviewDelegationCommand` carries no reason at all) — would either fabricate a fake reason or require changing the locked `ReviewDelegationCommand` contract |
| Locking read (`LockMembership`) reused for GET | New non-locking `SELECT` for read-only listing | A `FOR UPDATE` read outside an explicit transaction auto-commits and releases immediately, so reusing `LockMembership` for GET is technically safe, but issuing an unnecessary row lock on every read is wasteful under load; prefer a dedicated non-locking read query |

**Installation:** None — no new dependencies.

## Package Legitimacy Audit

Not applicable. This phase adds no new third-party packages to `go.mod` or `package.json`.

## Architecture Patterns

### System Architecture Diagram

```
[Browser: Mitglied-Editor, Tab "Rollen & Rechte"]
        |
        |  GET  /admin/fansubs/:id/app-members/:appUserId/review-delegations
        |  PUT  /admin/fansubs/:id/app-members/:appUserId/review-delegations
        v
[Gin route (admin_routes.go)] --auth middleware--> [AdminReviewDelegationHandler (NEW)]
        |                                                   |
        |  parseGroupAndTarget (:id, :appUserId)             |
        |  authorizeManagement (ActionFansubGroupMembersManage) -- MUST match
        |     the capability services.ReviewService.changeDelegation itself checks
        v
   [resolve fansub_group_member_id from (appUserId, groupId)]
        |            (mirrors AuthzUserOverridesRepository.LockTargetMembership)
        v
   +----+-----------------------------+
   |                                  |
   v (GET)                            v (PUT)
[NEW read query:                 [services.ReviewService.GrantDelegation /
 ReviewDelegationRepository       RevokeDelegation]  (EXISTING, unchanged)
 .ListGrantedActions]                   |
   |                                    |  begins tx -> LockMembership (real, FOR UPDATE)
   |                                    |  -> CanForFansubGroup(ActionFansubGroupMembersManage)
   |                                    |  -> eligibleDelegationTarget (grant only)
   |                                    |  -> GrantAction/RevokeAction (ON CONFLICT DO NOTHING / DELETE)
   |                                    |  -> ReviewAuditRepository.InsertEvent (delegation.granted/revoked)
   |                                    |  -> tx.Commit
   v                                    v
[fansub_group_member_review_capabilities]  [review_audit_events]
   |
   v (read side-effect, separate call path)
[permissions.ResolveGroupRights -> reviewGrantProvider -> SpecializedGrant]
   (used by RUNTIME authorization elsewhere, e.g. CanReviewForFansubGroup —
    NOT re-queried synchronously by this handler; RDEL-05's "immediate effect
    on queue/counters" is explicitly Phase 141 scope, not this phase's)
```

### Recommended Project Structure
```
backend/internal/handlers/
├── admin_review_delegation_handler.go   # NEW — GET/PUT delegation endpoints
├── review_delegation_contract.go        # NEW — wire DTOs (or append to capability_policy_contract.go if it stays under 450 lines)
backend/internal/repository/
├── review_delegation_repository.go      # EXTEND — add a read method (146 -> still well under 450)
backend/internal/testsupport/
├── phase140_postgres.go                 # NEW (likely) — see Pitfall 1: neither OpenPhase137Postgres nor
│                                         #   OpenPhase107Postgres alone carries every table this handler needs
frontend/src/app/admin/users/tabs/
├── ReviewDelegationSection.tsx           # NEW — the "Prüf-/Freigabe-Rechte" section
├── GroupSection.tsx                      # EDIT — mount ReviewDelegationSection alongside GroupRolesSection
frontend/src/lib/api.ts
├── getReviewDelegations()                # NEW
├── mutateReviewDelegation()              # NEW
frontend/src/types/
├── admin-capability.ts (or new admin-review-delegation.ts)  # NEW DTOs, kept visually distinct from EffectiveRightState
shared/contracts/
├── admin-capabilities.yaml               # EXTEND — new paths/schemas (existing precedent file for this domain,
│                                         #   note: not currently $ref'd from openapi.yaml — pre-existing doc gap, not new)
```

### Pattern 1: Path-scoped target resolution before service mutation (D08-style BOLA guard)
**What:** Every admin mutation/inspection endpoint for a (group, target user) pair resolves the target's membership strictly from the `:id`/`:appUserId` path parameters, never from a client-supplied body field, and returns a neutral 404/422 for a foreign or non-existent pair — established in `AdminEffectiveRightsHandler` (Phase 137-07, D08) and `AdminRoleAssignmentImpactHandler` (Phase 138-04).
**When to use:** The new delegation handler must follow this exactly: parse `:id`/`:appUserId`, resolve `fansub_group_member_id` server-side, never accept a raw `membership_id`/`fansub_group_member_id` in the request body.
**Example:**
```go
// Source: backend/internal/handlers/admin_effective_rights_handler.go:96-108, 143-196
func (h *AdminEffectiveRightsHandler) parseGroupAndTarget(c *gin.Context) (int64, int64, bool) {
	fansubGroupID, err := parseFansubID(c.Param("id"))
	// ...
	targetAppUserID, err := strconv.ParseInt(c.Param("appUserId"), 10, 64)
	// ...
	return fansubGroupID, targetAppUserID, true
}
```

### Pattern 2: Thin handler delegating entirely to an existing transactional service
**What:** The handler never begins its own transaction or re-implements eligibility/idempotency; it maps HTTP request → command struct → service call → HTTP response.
**When to use:** The new PUT handler must construct `services.ReviewDelegationCommand{Actor, TargetMembershipID, Action}` and call `GrantDelegation`/`RevokeDelegation`, translating the service's typed errors (`ErrReviewCapabilityDenied`, `ErrReviewDelegationTargetIneligible`, `ErrReviewActionInvalid`) into the same 403/422/400 HTTP mapping style `writeMutationError` already uses in `admin_effective_rights_handler.go:393-441`.
**Example:**
```go
// Source: backend/internal/services/review_service.go:82-146 (existing, do not modify)
func (s *ReviewService) GrantDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, true)
}
```

### Pattern 3: Dedicated, visually distinct member-editor section (not a shared Accordion row)
**What:** `GroupRolesSection.tsx` demonstrates the exact shape a new, small, clearly-labeled section takes inside `GroupSection.tsx` — its own `SectionHeader`, its own state, mounted as a sibling to (not inside) the generic effective-rights Accordion.
**When to use:** RDEL-03's "Prüf-/Freigabe-Rechte" section should be built the same way: a new sibling component in `GroupSection.tsx`, with its own three fixed rows (Medien/Bilder, Notizen/Texte, Mitwirkungen), each with an independent grant/revoke control — not folded into `CategoryTable`'s generic per-action row rendering.
**Example:**
```tsx
// Source: frontend/src/app/admin/users/tabs/GroupRolesSection.tsx:1-21 (pattern, not literal code to copy)
export function GroupRolesSection({ membership, matrix, onOpenRoleAssignment }: {...}) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <SectionHeader level={3} title="Rollen in dieser Gruppe" />
      {/* ... */}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Reusing `GuidedGrantFlow`/`GuidedRevokeFlow` for delegation mutations:** These components are hard-wired to `mutateCapabilityOverride` (PUT `.../capability-overrides`), require a `CapabilityOverrideReason` the review-delegation domain's `ReviewDelegationCommand` does not have, and render `ActivationStatusIndicator` with a `path: 'override'` prop tied to `CapabilityActivationStatus` (a vocabulary describing post-commit cache-enrichment pending states that do not exist for delegation, since `GrantAction`/`RevokeAction` commit synchronously with no async cache window). Forcing reuse would either fabricate a fake reason value or require changing a locked service contract — both wrong. Build new, smaller modal/inline components instead.
- **Adding delegation rows into the existing `CategoryTable` Accordion:** The `'review'` category is already a real, rendered category there (see Contradiction below) using the generic override mechanism. Adding a *second* rendering of the same three actions inside the same Accordion (now via delegation) would compound the existing ambiguity, not fix it.
- **Editing `review_service.go` further:** It is already at 448/450 lines (CLAUDE.md's file-size cap). Any new domain logic belongs in a new file.
- **Editing `admin_effective_rights_handler.go`:** Already 624 lines, pre-existing debt beyond the cap; do not add more.
- **Trusting a client-supplied `fansub_group_member_id`/`membership_id` in the request body:** Always resolve it server-side from path `:id`/`:appUserId`, mirroring D08.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transactional grant/revoke with audit | A new mutation function | `services.ReviewService.GrantDelegation`/`RevokeDelegation` | Already implements idempotency (ON CONFLICT DO NOTHING / DELETE), cross-group denial, eligibility gating, and audit-in-same-tx with rollback-on-audit-failure (tested: `TestPhase107ReviewServiceDelegationRollbackOnMandatoryAuditFailure`) |
| Target eligibility checks (active/verified/disabled) | New status-check SQL | `eligibleDelegationTarget` (review_service.go:413-418), invoked automatically inside `changeDelegation` | Already covers membership status, app-user status, and verified member-claim in one function; do not duplicate this logic in the handler |
| Audit event codes/shape | New audit table or ad-hoc log write | `repository.ReviewAuditRepository.InsertEvent` with `ReviewAuditEventDelegationGranted`/`Revoked` | Schema-enforced append-only table with a DB-level trigger validating field-shape per event code (migration 0134) |
| Cross-group/BOLA target resolution | Hand-rolled WHERE clause in the new handler | `AuthzUserOverridesRepository.LockTargetMembership`-style query (copy the pattern, reusing or adding a sibling method) | Established, tested pattern; the existing method lives on a different repository type but the query shape is exactly what's needed |

**Key insight:** Every substantive "hard part" of RDEL-04 was already solved in Phase 107/137. The risk in this phase is *duplicating* that logic in the new HTTP layer rather than delegating to it.

## Common Pitfalls

### Pitfall 1: No single existing Postgres test harness carries every table this phase needs
**What goes wrong:** `testsupport.OpenPhase107Postgres` (used by `review_service_test.go`) applies migration 0134 manually and then hand-rolls its own ad-hoc `fansub_group_member_roles` table — it does NOT include the real `user_group_capability_overrides`/`action_definitions` catalog chain (0108/0146/0150) that a handler test exercising `permissions.CanForFansubGroup`/`ResolveGroupRights` alongside real review tables would need. `testsupport.OpenPhase137Postgres` applies 0085/0100/0108/0112/0146/0150 (the real production `fansub_group_member_roles`, capability catalog, overrides) but does NOT apply 0134 (review foundation: `review_decisions`, `review_audit_events`, `fansub_group_member_review_capabilities`).
**Why it happens:** These two harnesses were built by different phases (107 and 137) for their own narrow scope; nobody has needed both migration sets in one fixture until now.
**How to avoid:** Build a small `testsupport.OpenPhase140Postgres` that composes both migration sets (0085/0100/0108/0112/0134/0146/0150), following 138-01's precedent of extending an existing harness additively rather than hand-assembling stand-in tables when the real production shape is testable.
**Warning signs:** A handler test that compiles but silently uses a fixture missing `fansub_group_member_review_capabilities` or `action_definitions` will fail at `INSERT`/`FOR UPDATE`/FK-violation time, not at compile time.

### Pitfall 2: Authorization mismatch between the new handler's gate and the service's internal gate
**What goes wrong:** `AdminEffectiveRightsHandler.authorizeManagement` gates on `permissions.ActionUserGroupCapabilityOverrideManage`. `services.ReviewService.changeDelegation` internally gates on `permissions.ActionFansubGroupMembersManage` (a different action code — see review_service.go:106-107). If the new delegation handler is authorized with the wrong action code (e.g. copy-pasting the effective-rights handler's `ActionUserGroupCapabilityOverrideManage` check), a caller could pass the handler's gate and then get rejected inside the service (confusing but not unsafe), or — worse — the reverse could desync if role catalogs diverge later.
**Why it happens:** `AdminEffectiveRightsHandler` is the closest template to copy from, but it authorizes a *different* capability than the one `ReviewService` actually checks.
**How to avoid:** Authorize the new handler's GET and PUT both with `permissions.ActionFansubGroupMembersManage`, matching exactly what `changeDelegation` checks, so a 200 from the authorization gate always implies the service call would also succeed on that axis.
**Warning signs:** A grant attempt that returns 403 for an "unexpected" reason after having passed the handler's own permission check.

### Pitfall 3: Revoke intentionally skips the eligibility gate — do not "fix" this
**What goes wrong:** A naive read of RDEL-04's "rejects foreign, inactive, disabled, pending, or otherwise ineligible targets server-side" might lead someone to add an eligibility check to the revoke path too.
**Why it happens:** `changeDelegation` only calls `eligibleDelegationTarget` `if grant && !eligibleDelegationTarget(target)` — revoke is deliberately allowed even against an inactive/disabled target, and this is locked behavior with its own test: `TestPhase107ReviewServicePlatformAdminDelegationAndInactiveTarget` explicitly asserts `"inactive target revoke must remain allowed"`.
**How to avoid:** Do not add eligibility gating to revoke. "Foreign" (cross-group) rejection IS still enforced for both grant and revoke via the `CanForFansubGroup` check against the target's real group — only the active/verified/disabled eligibility check is grant-only.
**Warning signs:** A new test asserting revoke should fail against an inactive target would be testing against already-decided, intentional behavior — flag it as a contradiction with the existing test suite rather than "fixing" it unilaterally.

### Pitfall 4: `ReviewDelegationCommand` has no reason field — do not force one into the new UI
**What goes wrong:** Every other admin mutation UI in this codebase (`GuidedGrantFlow`, `GuidedRevokeFlow`, `RoleAssignmentImpactModal`) collects a `reason` because their underlying services (`EffectiveRightsService.MutateOverride`) require one. `ReviewDelegationCommand{Actor, TargetMembershipID, Action}` has no reason field at all, and the audit event schema for `delegation.granted`/`delegation.revoked` explicitly forbids `has_reason`/`reason_count` being non-zero (migration 0134's `validate_review_audit_event_contract` trigger raises an exception otherwise).
**Why it happens:** Copying the "guided flow" pattern reflexively (reason dropdown + confirm step) would not match this domain's actual contract, and worse, would be pure UI-side fiction with nowhere to send the value.
**How to avoid:** Design the new section's confirm interaction (if any) without a reason field; a simple confirm-and-mutate (possibly even optimistic toggle + inline error) is the honest contract here.
**Warning signs:** A PUT request body with a `reason` field that the new backend DTO silently drops.

## Contradiction Found — RDEL-03 vs. already-shipped Phase 138 UI

**The verified seam** (Phase 137, restated in the task brief) says review delegation is "intentionally a separate domain mechanism... NOT migrated into `user_group_capability_overrides`." This is accurate at the **data-model** level: `fansub_group_member_review_capabilities` is a distinct table, and `ResolveGroupRights`'s precedence (`platform_admin > disabled > no-membership > user_deny > user_allow > role_grant > specialized_grant > no_grant`) keeps `specialized_grant` and `user_allow`/`user_deny` as genuinely distinct provenance entries.

**However**, migration `0150_effective_rights_overrides.up.sql` (lines 40-56) flips `review.text.decide`, `review.image.decide`, and `review.contribution.decide` to `user_overridable = true` — the exact same pilot batch as seven ordinary group-media/page actions. Because of this:

1. `action_definitions.category` for all three review actions is `'review'` (set in migration 0134), and `frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts`'s `CATEGORY_ORDER` list explicitly includes `'review'` (line 18-20) with **no filtering anywhere** in `groupStatesByCategory`/`CategoryTable`/`GroupSection` that excludes it.
2. This means the **already-shipped** (Phase 138) `UserGroupRightsTab` → `GroupSection` → Accordion → `CategoryTable` UI, under category "Review", **already renders these exact three actions today** as ordinary overridable capability rows, each with a working "Recht zusätzlich erlauben" / "Zugriff entziehen" control that calls `mutateCapabilityOverride` (the generic `user_group_capability_overrides` mechanism) via `GuidedGrantFlow`/`GuidedRevokeFlow`.
3. Any admin holding `user_group_capability_override.manage` (today: only `fansub_lead`, seeded in migration 0150) can **already** grant or deny a personal `user_allow`/`user_deny` override for `review.image.decide` etc. on any active member, through a mechanism that is a completely different code path than the one Phase 140 is about to add, achieving a highly similar effective-allow outcome (with different `decisive_source`: `user_allow` instead of `specialized_grant`).

This means RDEL-03's "remain visibly and technically separate from roles and generic user overrides" success criterion is **already at risk today, independent of Phase 140's own new code** — the generic override surface exposes the same three action codes review delegation is meant to own exclusively as a UX concept. This was not something Phase 140 introduces; it is pre-existing (Phase 138) behavior that Phase 140's new, dedicated section will now sit *alongside*.

**This needs an explicit human/planning decision** before or during Phase 140 planning (following the exact precedent of Phase 137's own GAP-06, which was "dispositioned... as DECISION REQUIRED for a human decision-maker rather than resolved unilaterally" per `.planning/STATE.md`'s Phase 137 entry). Options, not a recommendation:
- **(a)** Leave migration 0150 as-is and accept both paths exist; Phase 140 only adds the new, clearly-labeled dedicated section, and the pre-existing generic-override row for `'review'` category remains available as a secondary, lower-visibility path (accepts a UX/security-surface overlap as pre-existing debt, log to `deferred-items.md`).
- **(b)** Filter the `'review'` category out of the generic Accordion (a small `groupStatesByCategory`/`CATEGORY_ORDER`-adjacent change) so the *only* UI surface for these three actions becomes the new dedicated section — closer to what RDEL-03 literally asks for, but changes already-shipped, tested Phase 138 UI behavior (regression risk against `UserGroupRightsTab.test.tsx`/`CategoryTable` tests) and does not touch the still-live backend capability (an admin could still hit the raw API directly).
- **(c)** A follow-up migration reverting `user_overridable = false` for the three review actions, closing the backend capability entirely and making delegation the sole path — this is the option structurally closest to Phase 137-CONTEXT's original "own domain mechanism" intent, but is a schema/behavior change outside RDEL-01..04's literal text and would need its own review.

## Code Examples

### Existing service call this phase must reuse verbatim (no changes needed)
```go
// Source: backend/internal/services/review_service.go:82-146
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

### Existing service instance already available in main.go — reuse, do not reconstruct
```go
// Source: backend/cmd/server/main.go:517
releaseReviewService := services.NewReviewService(dbPool, services.ReleaseReviewAdapters())
// GrantDelegation/RevokeDelegation ignore the adapters map entirely (see changeDelegation,
// review_service.go:88-146) -- this exact instance can be passed to the new
// AdminReviewDelegationHandler constructor with zero additional wiring.
```

### Existing target-resolution pattern to mirror for (appUserId, groupId) -> membership
```go
// Source: backend/internal/repository/authz_user_overrides.go:173-204
func (r *AuthzUserOverridesRepository) LockTargetMembership(
	ctx context.Context, appUserID int64, fansubGroupID int64,
) (*TargetMembership, error) {
	// SELECT fgm.id, fgm.app_user_id, fgm.fansub_group_id, fgm.member_id, fgm.status, au.status
	// FROM fansub_group_members fgm JOIN app_users au ON au.id = fgm.app_user_id
	// WHERE fgm.app_user_id = $1 AND fgm.fansub_group_id = $2 FOR UPDATE OF fgm
	// -> ErrNotFound on no match (covers the "foreign" rejection at the handler boundary)
}
```

### Existing eligibility function that must NOT be reimplemented
```go
// Source: backend/internal/services/review_service.go:413-423
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| No HTTP surface for review delegation at all | This phase adds GET/PUT for one (group, appUser) pair | Phase 140 (this phase) | Closes RDEL-01/RDEL-02's actual gap |
| Actor-only review-grant read (`ResolveActorReviewGrantContext`) | Still actor-only; a NEW, separate target-read query is required for admin inspection | N/A — no change to the existing method, just an addition alongside it | Do not repurpose `ResolveActorReviewGrantContext` for admin reads of an arbitrary target — its `reviewContext.AppUserID != actorAppUserID` guard in `review_grant_provider.go:52` exists specifically because it's actor-scoped |

**Deprecated/outdated:** None — nothing in this domain is deprecated; it is simply unexposed over HTTP yet.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The new handler's authorization should use `ActionFansubGroupMembersManage` (matching `changeDelegation`'s internal check) rather than `ActionUserGroupCapabilityOverrideManage` (matching the effective-rights handler's check) | Pitfall 2 | If wrong, either an over-permissive or under-permissive gate is exposed at the HTTP boundary relative to what the service itself enforces; low risk since the service's own check is authoritative regardless (worst case: a confusing 403 after a 200 gate, not a security hole) |
| A2 | A new `testsupport.OpenPhase140Postgres` combining the 0134 + 0108/0146/0150 migration chains is the right test-fixture strategy, rather than extending `OpenPhase107Postgres` or `OpenPhase137Postgres` in place | Pitfall 1 | If wrong (e.g. team prefers extending one of the two existing harnesses additively instead of adding a third), only test-infrastructure organization changes, not production code |
| A3 | Read response for RDEL-01 should include eligibility flags (e.g., `eligible_for_grant: bool`) computed from the same logic as `eligibleDelegationTarget`, not just the three granted-action booleans | Recommended read DTO, Architecture Patterns | If wrong/unwanted, the frontend would only learn ineligibility reactively from a 422 on attempted grant, which is a materially worse UX but not incorrect per the literal requirements text |

## Open Questions

1. **Should the pre-existing generic-override path for `review.*.decide` be restricted as part of this phase?**
   - What we know: migration 0150 already made these three actions `user_overridable = true`, and the Phase 138 UI already renders/mutates them via the generic mechanism, in production, today.
   - What's unclear: whether RDEL-03's "technically separate from generic user overrides" success criterion is meant to be satisfied purely by adding a new, additional dedicated surface (leaving the old path alone) or whether it requires closing/hiding the old path too.
   - Recommendation: Surface this explicitly to the user/planner as a DECISION REQUIRED item (see "Contradiction Found") before locking Phase 140's task list — this is a product/security decision, not something to resolve unilaterally during planning.

2. **Exact shape of the RDEL-01 read response.**
   - What we know: the three delegable actions are fixed (`review.text.decide`, `review.image.decide`, `review.contribution.decide`); `fansub_group_member_review_capabilities` stores exactly which are currently granted for a membership.
   - What's unclear: whether the read response should also carry eligibility context (target's membership/app-user status, verified-claim flag) so the UI can pre-emptively grey out grant controls, or stay minimal (just the three booleans) and let a grant attempt's 422 communicate ineligibility.
   - Recommendation: Given the project's explicit "UX quality" constraint (CLAUDE.md), lean toward including eligibility context in the read response — but this is a planner-level DTO design choice, not a blocking unknown.

3. **Route naming/shape for the mutation endpoint.**
   - What we know: existing precedent uses one PUT endpoint per concern (`.../capability-overrides`) with a body describing the desired effect, not separate grant/revoke endpoints.
   - What's unclear: whether the new endpoint should be a single `PUT .../review-delegations` with `{action_code, grant: bool}` (mirrors the override-endpoint shape) or two endpoints/verbs (`POST`.../grant, `POST .../revoke`) mirroring the service's own two distinct methods.
   - Recommendation: A single PUT with an explicit boolean intent field most closely matches the existing `capability-overrides` precedent and keeps the route count minimal; either is workable, this is a planner-level API design choice.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Docker Compose stack (`team4sv30-backend`, `team4sv30-db`, `team4sv30-frontend`) | All backend/frontend verification | ✓ | backend/frontend/db all `Up`, db `healthy` | — |
| Go toolchain (in-container) | Backend build/test | ✓ (via container) | Go 1.25 per `backend/go.mod` | — |
| Node/npm (in-container) | Frontend build/test/typecheck | ✓ (via container) | Next.js 16 / React 18.3.1 per `frontend/package.json` | — |
| PostgreSQL 16 | Repository/handler tests (`TEAM4S_PHASE1xx_TEST_DSN`) | ✓ (`team4sv30-db` healthy) | Postgres 16 | — |

No missing dependencies — this phase is pure application-layer work on an already-running, fully-provisioned stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify` (stretchr/testify), real-Postgres integration style established by `testsupport.OpenPhase107Postgres`/`OpenPhase137Postgres` |
| Backend config file | none (env-var gated: `TEAM4S_PHASE1xx_TEST_DSN`) |
| Frontend framework | Vitest 3 (`frontend/vitest.config.ts`), React Testing Library |
| Quick run command (backend) | `docker compose exec -T team4sv30-backend go test ./internal/services/... ./internal/repository/... ./internal/handlers/... -run ReviewDelegation` |
| Quick run command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/ReviewDelegationSection.test.tsx"` |
| Full suite command (backend) | `docker compose exec -T team4sv30-backend go test ./...` (with `TEAM4S_PHASE1xx_TEST_DSN` set) |
| Full suite command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| RDEL-01 | GET returns real target's granted delegations, group-scoped, 404/empty on foreign pair | integration (real Postgres) | `go test ./internal/handlers/... -run TestAdminReviewDelegationHandler_Get` | ❌ Wave 0 — new handler + new test file |
| RDEL-02 | Leader can grant/revoke each of the three delegable actions independently | integration (real Postgres) | `go test ./internal/handlers/... -run TestAdminReviewDelegationHandler_Mutate` | ❌ Wave 0 — new handler + new test file |
| RDEL-03 | New section renders distinctly from Accordion/roles; no shared mutation call to `mutateCapabilityOverride` | frontend unit (Vitest + RTL) | `npx vitest run src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` | ❌ Wave 0 — new component + test file |
| RDEL-04 | Idempotent grant/revoke, audit event written, cross-group/ineligible-target rejection | integration (real Postgres) — **already exists** for the service layer | `go test ./internal/services/... -run TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit` (and 3 sibling tests) | ✅ Already exists (`backend/internal/services/review_service_test.go:86-215`) — new tests only needed at the HTTP boundary (auth wiring, request/response mapping), not the domain logic itself |

### Sampling Rate
- **Per task commit:** run the quick backend/frontend commands scoped to the new files.
- **Per wave merge:** full backend suite (`go test ./...`) + full frontend suite (`npx vitest run`), diffed against the Phase-139 baseline (see below) to isolate new regressions.
- **Phase gate:** Full suite green (modulo the pre-existing baseline) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/testsupport/phase140_postgres.go` — new composed migration-chain fixture (see Pitfall 1), or a documented decision to extend an existing one instead
- [ ] `backend/internal/handlers/admin_review_delegation_handler_test.go` — new handler-level integration tests (auth, BOLA/cross-group, eligibility-rejection surfaced as HTTP status)
- [ ] `frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` — new component test
- [ ] `frontend/src/lib/api.ts` new function tests (mirrors existing `getEffectiveRights`/`mutateCapabilityOverride` test coverage conventions, if any exist for those — verify during planning)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V4 Access Control | yes | Server-side `CanForFansubGroup(ActionFansubGroupMembersManage)` check inside `services.ReviewService.changeDelegation` (already implemented); handler-level gate must mirror it (Pitfall 2) |
| V5 Input Validation | yes | `isDelegableReviewAction` restricts `Action` to exactly the three catalog-defined review actions; handler must reject any other `action_code` with 400 before calling the service |
| V6 Cryptography | no | Not applicable — no new secrets/crypto in this phase |
| V13 API and Web Service | yes | Path-scoped resource addressing (D08 pattern) prevents body-supplied `membership_id`/cross-group BOLA; mirrors the existing `req.GroupID != fansubGroupID` body/path-mismatch guard pattern in `admin_effective_rights_handler.go:258-268` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| BOLA/IDOR via a client-supplied `membership_id`/`fansub_group_member_id` that belongs to a foreign group | Elevation of Privilege | Never accept membership/target IDs in the request body; always resolve server-side from `:id`/`:appUserId` path params (Pattern 1) |
| Privilege confusion between the handler's own authorization gate and the service's internal gate | Elevation of Privilege | Use `ActionFansubGroupMembersManage` at both layers (Pitfall 2) |
| Granting an ineligible (foreign/inactive/disabled/unverified-claim) target | Elevation of Privilege | Already enforced server-side by `eligibleDelegationTarget` inside the existing service — do not bypass by adding a client-trusted eligibility flag |
| Cross-domain confusion enabling the same effective right via two mechanisms (generic override vs. specialized delegation) | Elevation of Privilege / Repudiation (unclear which mechanism produced the effective allow) | See "Contradiction Found" — requires an explicit decision, not a mitigation this research can prescribe unilaterally |

## Sources

### Primary (HIGH confidence — direct code inspection in this repository)
- `backend/internal/services/review_service.go` — full read of `GrantDelegation`/`RevokeDelegation`/`changeDelegation`/`eligibleDelegationTarget`/`isDelegableReviewAction`
- `backend/internal/services/review_service_test.go` — full read of all four delegation-specific test functions (lines 20-215), confirms idempotency, cross-group denial, inactive-target grant-denial/revoke-allowed, and audit-rollback-on-failure behavior
- `backend/internal/repository/review_delegation_repository.go` — full read of `LockMembership`/`GrantAction`/`RevokeAction`
- `backend/internal/permissions/review_grant_provider.go` and `permissions.go:290-336` — confirms actor-scoped `ResolveActorReviewGrantContext`/`ReviewGrantContext` and the `SpecializedGrantProvider` resolver-integration seam
- `backend/internal/repository/authz_permissions.go:197-276` — exact SQL for `ResolveActorReviewGrantContext`
- `backend/internal/handlers/admin_effective_rights_handler.go` — full read, structural template for the new handler
- `backend/internal/repository/authz_user_overrides.go:173-204` — `LockTargetMembership` pattern to mirror
- `database/migrations/0134_review_foundation.up.sql` — full read: table shapes, action-namespace seed, audit-event contract triggers
- `database/migrations/0150_effective_rights_overrides.up.sql` — full read: confirms `user_overridable=true` for all three review actions and `user_group_capability_override.manage` seeded only to `fansub_lead` (the Contradiction Found finding)
- `database/migrations/0108_capability_registry.up.sql`, `0072_keycloak_app_users_foundation.up.sql`, `0073_fansub_group_app_memberships.up.sql`, `0081_historical_members_identity.up.sql` — status enum values (`app_users.status`, `fansub_group_members.status`, `member_claims.claim_status`)
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`, `GroupSection.tsx`, `GroupRolesSection.tsx`, `CategoryTable.tsx`, `GuidedGrantFlow.tsx`, `userGroupRightsHelpers.ts` — full reads confirming the member-editor mount point, the `'review'` category rendering gap, and why `GuidedGrantFlow`/`GuidedRevokeFlow` are unsuitable for reuse
- `frontend/src/components/ui/ActivationStatusIndicator.tsx` — confirms its two-path discriminated union has no slot for a third (delegation) domain
- `frontend/src/lib/api.ts:10152-10230` — `getEffectiveRights`/`mutateCapabilityOverride`/`listOverrideHistory` client patterns to mirror
- `backend/cmd/server/main.go:500-573`, `backend/cmd/server/admin_routes.go` — confirms `releaseReviewService` instance reuse and the route-registration pattern
- `backend/internal/testsupport/phase107_postgres.go`, `phase137_postgres.go` — confirms the migration-chain gap described in Pitfall 1
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 137/138/139/140/141 sections), `.planning/STATE.md` (Phase 137/138 decision log) — requirement text, phase sequencing, and historical decisions (including the GAP-06 "DECISION REQUIRED" precedent cited above)

### Secondary / Tertiary
None used — every claim in this document was verified directly against the repository's current code, migrations, or planning documents (all HIGH confidence, direct source inspection). No WebSearch/Context7 lookups were needed since this phase extends an entirely in-repo, already-built domain mechanism.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — the entire mutation/persistence/audit stack already exists and is tested in this repository
- Architecture: HIGH — direct structural precedent (Phase 137/138 handlers and frontend components) to mirror, read in full
- Pitfalls: HIGH — each pitfall is backed by a specific line-referenced code fact (test assertion, migration content, or line-count measurement), not speculation
- Contradiction finding: HIGH confidence the facts are correct (migration content + UI code directly inspected); the *resolution* is explicitly left as an open, undecided question for the human/planner, not something this research resolves

**Research date:** 2026-08-24
**Valid until:** Effectively pinned to the current commit (this research is entirely derived from in-repo, already-implemented code, not external/version-sensitive documentation) — re-verify only if `review_service.go`, migration 0150, or the `UserGroupRightsTab` component tree changes before planning begins.
