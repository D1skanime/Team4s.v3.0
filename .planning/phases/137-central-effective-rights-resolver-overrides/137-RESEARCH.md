# Phase 137: Central Effective-Rights Resolver & Overrides - Research

**Researched:** 2026-08-21
**Domain:** Go/Postgres authorization engine — group-scoped RBAC + per-user allow/deny overrides + specialized grant providers, with provenance-capable inspection and atomic audited mutation
**Confidence:** HIGH (schema, existing enforcement code, and contract DTOs were all read directly from the live Linux checkout; a small number of naming/wiring choices are marked MEDIUM/LOW and listed in Open Questions)

## Summary

Phase 136 already shipped the full persistence and contract skeleton this phase needs: the
`user_group_capability_overrides` / `user_group_capability_override_history` tables (migration
`0146`), the `user_overridable` fail-closed catalog flag, and forward-looking OpenAPI/Go/TS DTOs
(`EffectiveRightState`, `CapabilityOverrideState`, `CapabilityOverrideMutationRequest/Result`,
`CapabilityOverrideAuditItem`). None of this is wired to any HTTP route yet, and — critically —
**no `action_definitions` row currently has `user_overridable = true`**. Phase 137 cannot ship a
testable override feature without also flipping at least one real action to overridable (almost
certainly via a new migration `0150+`), because the schema's composite FK
`(action_code, user_overridable) -> action_definitions(code, user_overridable)` will reject every
insert otherwise.

The existing runtime authorization code (`backend/internal/permissions/permissions.go`) already
has the right shape to extend rather than replace: `Service.canForContext` is a single per-group
role-check loop reused by `CanForFansubGroup`, `CanForRelease`, `CanForReleaseVersion`, and
`CanForReleaseVersionMedia`; `Service.CanReviewForFansubGroup` is a **second, parallel** decision
path for `review.*.decide` actions that duplicates the platform-admin/disabled/membership checks
and currently has **no knowledge of user overrides at all**. The least-disruptive way to satisfy
CONTEXT.md's "one decision engine" rule is to introduce a new `ResolveGroupRights(actor,
fansubGroupID)` primitive that both `canForContext`'s inner loop and `CanReviewForFansubGroup`
delegate to, preserving the external `Result`/`ReviewAuthorizationResult` shapes so no caller
signature has to change. The existing `ReviewGrantContext` resolution (direct grants from
`fansub_group_member_review_capabilities`) is the natural first implementation of the
`SpecializedGrantProvider` interface CONTEXT.md's D05 asks for.

The transaction pattern needed for D06 (atomic mutation + audit, idempotent no-op, concurrency
safety) already exists almost verbatim in `services/review_service.go`'s `Decide`/`changeDelegation`
methods: `starter.Begin(ctx)` → `defer tx.Rollback` → repositories constructed on `tx`
(`repository.DBTX`) → mutate → insert audit → `tx.Commit`. The BOLA/IDOR cross-group guard pattern
(D08) already exists in `fansub_hist_group_member_roles_handler.go`: resolve the target row,
compare its `FansubGroupID` against the path's `:id`, return a generic 404/422 on mismatch — no
new pattern needs to be invented, only applied to the new override tables.

**Primary recommendation:** Build one new `permissions.GroupRightsResolution` type + `ResolveGroupRights` method that batch-loads membership, role grants (already cached), user overrides, and specialized grants for one `(actor, fansubGroupID)` pair; make `canForContext`'s per-group loop and `CanReviewForFansubGroup` both call it; expose it directly as the Inspection API's response; and implement override mutation as a new transactional service (modeled on `ReviewService.changeDelegation`) gated by a **new** non-overridable management capability (e.g. `user_group_capability_override.manage`) that must be added via migration and seeded onto group-leadership roles, since no such capability exists in the codebase today.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Group-wide rights resolution (role OR, deny-over-allow precedence) | API / Backend (`permissions` package) | Database / Storage (source rows) | Business rule evaluation must happen in Go so enforcement and inspection share one code path; DB only supplies batched facts. |
| Membership / role-grant loading | Database / Storage | API / Backend (repository) | Existing tables (`fansub_group_members`, `fansub_group_member_roles`, `role_capabilities`) are already the source of truth; role_capabilities is already cached in-process. |
| User override current-state + history | Database / Storage | API / Backend | Migration 0146 already owns this; FK/CHECK constraints are the last line of defense against invalid override state, service code is the first. |
| Specialized grant resolution (Review Delegation) | API / Backend (new `SpecializedGrantProvider`) | Database / Storage (`fansub_group_member_review_capabilities`) | Must stay a separate domain seam per CONTEXT.md D05/D09 of Phase 136 — not migrated into generic overrides. |
| Effective-Rights Inspection API | API / Backend | — | Read-only projection of the same resolver; no separate computation. |
| User-Override Mutation API | API / Backend | Database / Storage (atomic tx) | Authorization + validation + mutation + audit must be one transaction. |
| Audit/history immutability | Database / Storage (append-only trigger) | API / Backend (writes only) | `user_group_capability_override_history` already has a `BEFORE UPDATE OR DELETE` trigger that raises an exception — DB enforces immutability, Go only appends. |
| Admin rights-management UI, guided revoke, impact preview | *(explicitly out of scope — Phase 138)* | — | CONTEXT.md boundary; `CapabilityOverrideImpactPreview` DTO exists but is not to be served by any Phase 137 endpoint. |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAP-01 | Admin can see full list of effective capabilities for a user+fansub group | `ResolveGroupRights` + Inspection endpoint returning all `action_definitions` rows relevant to the group context, not per-capability queries (see Architecture Patterns, Pattern 1). |
| CAP-02 | Admin can see granting roles, direct allows/denies, decisive reason per capability | Existing `EffectiveRightState`/`CapabilityOverrideState` DTOs must be **extended** with `granting_roles[]`, `user_allow`, `user_deny`, `specialized_grants[]`, `reason_code` fields (see Open Question 1 — current DTO shape from Phase 136 is insufficient as-is). |
| CAP-03 | Same server-side precedence in display and enforcement: user-deny > user-allow > role-allow | `ResolveGroupRights` is the single source both `Can()`/enforcement and the Inspector consume — see Summary / Architecture Patterns Pattern 1. |
| CAP-05 | Admin can grant/deny one capability for an active member within exactly one group | Override mutation service (Pattern 3), gated on the new management capability (Open Question 3) and on `user_overridable=true` (currently true for **zero** actions — Pitfall 1). |
| CAP-06 | Override mutations validate membership/group/capability server-side, reject foreign/invalid neutrally | BOLA/IDOR pattern already established in `fansub_hist_group_member_roles_handler.go` (Architecture Patterns Pattern 4); reuse `notFound`/`badRequest`/HTTP 422 conventions. |
| CAP-07 | Grant/revoke idempotent, atomic, audited with actor/target/context/before/after | `review_service.go`'s `Decide`/`changeDelegation` transaction pattern (Pattern 3); DB schema already has before/after/actor columns + no-op-suppression left to service layer per migration 0146 comment. |
| QUAL-03 | Automated negative tests: deny precedence, cross-group overrides, invalid capability codes, BOLA/IDOR | Existing `release_review_concurrency_test.go` barrier-channel pattern for concurrency; `testsupport/phaseNNN_postgres.go` harness convention for a new `testsupport/phase137_postgres.go`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Canonical environment:** All work happens on Linux host `team4s-linux` (`/home/d1sk/team4s`) via Docker Compose; do not touch the Windows checkout. Confirmed running: `team4sv30-backend`, `team4sv30-db` (Postgres 16, healthy), `team4sv30-frontend`, `team4sv30-keycloak` (healthy), `team4sv30-redis`, `team4sv30-mailpit`.
- **GSD workflow enforcement:** File edits must go through `/gsd:execute-phase` (or `/gsd:quick`/`/gsd:debug`), not ad hoc.
- **Modularity — 450-line file cap:** `backend/internal/permissions/permissions.go` is **already 781 lines** (pre-existing debt) and `authz_permissions.go` is already ~494 lines. New resolver/mutation/handler code for Phase 137 MUST go into **new files** (e.g. `permissions/effective_rights.go`, `repository/authz_user_overrides.go`, `handlers/admin_user_overrides_handler.go`) rather than further extending these two files, to stay compliant and avoid making the existing debt worse.
- **Umlaut rule:** All new user-facing German strings (error messages, reason labels) must use real umlauts (ä/ö/ü/ß), matching the existing handler message style (e.g. `"mitglied gehört nicht zu dieser fansubgruppe"`).
- **Global UI primitives:** Not applicable — Phase 137 is backend/API-contract only (no frontend consumer is built until Phase 138, per CONTEXT.md's explicit out-of-scope list).
- **Brownfield / compatibility:** Existing `Result`/`ReviewAuthorizationResult` external shapes, `Reason*` constants, and all five current `Can*` entry points must keep working for existing callers; migration must be additive, not a rewrite.
- **Data ownership / append-only migrations:** New schema changes are new migrations only (next available number is `0150`); the existing `0146` up/down pair and its append-only-history trigger must not be edited.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | 1.25.0 | Backend runtime | `backend/go.mod` line 3 [VERIFIED: repo file] |
| `github.com/gin-gonic/gin` | (pinned in go.mod) | HTTP handlers/routing | Already used by every existing handler in this domain. |
| `github.com/jackc/pgx/v5` | v5.7.1 | Postgres driver, transactions | `backend/go.mod` [VERIFIED: repo file]; `pgx.Tx` already satisfies the project's minimal `repository.DBTX` interface. |
| `github.com/stretchr/testify` | (pinned in go.mod) | Test assertions | Used throughout `backend/internal/services/*_test.go` and `repository/*_test.go`. |
| PostgreSQL | 16 | Persistence, constraints, triggers | `docker-compose` service `team4sv30-db` image `postgres:16`, confirmed healthy. |

No new external Go packages, no new npm/pip packages are required for this phase — it is a pure extension of the existing Go authorization/repository/handler layers plus new SQL migrations. **Package Legitimacy Audit is N/A** (no new third-party dependencies to vet).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github.com/jackc/pgx/v5/pgconn` | (transitive) | Error classification | Already used in `handlers/error_responses.go`'s `classifyInternalError` for Postgres error codes — reuse, don't reinvent. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Request-local resolver reuse via a struct field/param passed explicitly | `context.WithValue` request cache | The codebase has **no existing precedent** for `context.WithValue`-based request caching (searched, zero hits); passing an already-built `*GroupRightsResolution` explicitly between calls within one handler/service method is more idiomatic here and keeps the "no long-lived cache" boundary (D09) obviously true by construction. |
| New `user_group_capability_override.manage` action | Reusing `fansub_group.members.manage` | `fansub_group.members.manage` is explicitly listed in migration 0146's non-overridable exclusion list for a *different* reason (it grants membership control, not override control) and mixing the two would let ordinary member managers silently gain override-mutation rights. CONTEXT.md's D07 explicitly asks for a **dedicated** capability. |

## Package Legitimacy Audit

Not applicable — Phase 137 introduces no new external packages (Go, npm, or pip). All work extends existing vetted dependencies already declared in `backend/go.mod`.

## Architecture Patterns

### System Architecture Diagram

```text
                         ┌─────────────────────────────────────────┐
                         │        HTTP request (Gin handler)        │
                         │  permissionActorFromContext(c) -> Actor  │
                         └───────────────────┬───────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   permissions.Service.ResolveGroupRights  │  <- NEW, single entry point
                         │           (actor, fansubGroupID)          │
                         └───────────────────┬───────────────────────┘
                                              │  batched loads (one round trip each)
                    ┌─────────────────────────┼─────────────────────────────┐
                    ▼                         ▼                             ▼
        ┌───────────────────┐   ┌──────────────────────┐    ┌───────────────────────────┐
        │ Membership + Role  │   │ user_group_capability_ │    │ SpecializedGrantProvider[]│
        │ Grants             │   │ overrides (current row)│    │  - ReviewDelegation impl  │
        │ (existing repo +   │   │  (NEW repo query)      │    │  (existing fansub_group_  │
        │  in-mem role cache)│   │                        │    │  member_review_capabs)    │
        └───────────────────┘   └──────────────────────┘    └───────────────────────────┘
                    │                         │                             │
                    └─────────────────────────┼─────────────────────────────┘
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   In-memory precedence evaluation:        │
                         │   platform_admin > disabled > no-member   │
                         │   > user_deny > user_allow > role_grant   │
                         │   > specialized_grant > no_grant          │
                         └───────────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────────┐
                    ▼                         ▼                             ▼
        ┌───────────────────┐   ┌──────────────────────┐    ┌───────────────────────────┐
        │ Can(action) ->     │   │ Effective-Rights      │    │ Override Mutation Service │
        │ Result (existing   │   │ Inspection endpoint    │    │ (tx: authorize -> validate│
        │ CanForFansubGroup/ │   │ (full provenance list) │    │ -> lock -> mutate ->      │
        │ CanReviewForFansub-│   │                        │    │  audit -> commit)         │
        │ Group callers)     │   │                        │    │                           │
        └───────────────────┘   └──────────────────────┘    └───────────────────────────┘
```

A reader can trace the primary "is this action allowed" use case top-to-bottom: request → actor
resolved from auth middleware → one `ResolveGroupRights` call batches all four source categories →
precedence is evaluated once in memory → the same resolution answers `Can()` for enforcement, the
full list for the Inspector, and (as pre-mutation state) the Override Mutation Service's before/after
computation.

### Recommended Project Structure

```text
database/migrations/
├── 0150_effective_rights_management_capability.{up,down}.sql   # new mgmt capability + user_overridable flips
backend/internal/permissions/
├── permissions.go                    # unchanged external API; canForContext/CanReviewForFansubGroup start delegating
├── effective_rights.go               # NEW: GroupRightsResolution, ResolveGroupRights, SpecializedGrantProvider interface
├── effective_rights_test.go          # NEW: precedence table-driven tests (pure Go, no DB)
backend/internal/repository/
├── authz_permissions.go              # unchanged; ListActorGroupRoles etc. stay as batched loaders
├── authz_user_overrides.go           # NEW: LoadUserOverrides, LockOverrideRow, Upsert/Delete override, InsertHistory
├── authz_user_overrides_test.go      # NEW
backend/internal/services/
├── effective_rights_service.go       # NEW: transactional mutation orchestration (mirrors review_service.go)
├── effective_rights_service_test.go  # NEW: idempotency + concurrency (barrier-channel pattern)
backend/internal/handlers/
├── admin_effective_rights_handler.go # NEW: Inspection + Mutation + History endpoints
├── admin_effective_rights_handler_test.go
backend/internal/testsupport/
├── phase137_postgres.go              # NEW: real-DB harness, same convention as phase117/107
shared/contracts/
├── admin-capabilities.yaml           # extend EffectiveRightState + add path operations (schemas mostly exist)
├── openapi.yaml                      # mirror the same additions (root copy)
```

### Pattern 1: One Resolver, Two Existing Callers Delegate

**What:** Introduce `permissions.GroupRightsResolution` (a struct keyed by `action_code` containing
`Allowed bool`, `GrantingRoles []string`, `UserAllow bool`, `UserDeny bool`, `SpecializedGrants
[]string`, `DecisiveSource string`, `NonDeniable bool`, `ReasonCode string`) and a method
`(s *Service) ResolveGroupRights(ctx, actor Actor, fansubGroupID int64) (*GroupRightsResolution, error)`.

**When to use:** Any group-scoped authorization decision or inspection.

**Migration path (answers Research Instruction Q1/Q2):** `canForContext`'s inner
`for _, fansubGroupID := range resourceContext.FansubGroupIDs { roles, _ := s.resolver.ListActorGroupRoles(...); for _, role := range roles { if roleAllows(role, action) ... } }`
loop (used by `CanForFansubGroup`, `CanForRelease`, `CanForReleaseVersion`,
`CanForReleaseVersionMedia`) is replaced by one call to `ResolveGroupRights(ctx, actor,
fansubGroupID)` followed by a map lookup on `action`. `CanReviewForFansubGroup` — currently a
**second, independent** decision path with its own platform-admin/disabled/membership checks and
zero override awareness — is rewritten to call the same `ResolveGroupRights` and project the
result into `ReviewAuthorizationResult`. External types (`Result`, `ReviewAuthorizationResult`,
their JSON tags, `Reason*` constants) are preserved so no caller outside `permissions.go` needs to
change. This is the direct implementation of CONTEXT.md's rule: *"There must be one decision
engine and multiple consumers, not multiple decision engines."*

```go
// Source: existing team4s.v3/backend/internal/permissions/permissions.go, lines 444-452, 654-740
// (pattern being replaced — one per-group role loop repeated across 4 call sites)
for _, fansubGroupID := range resourceContext.FansubGroupIDs {
    roles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
    ...
    for _, role := range roles {
        if roleAllows(role, action) { /* ALLOW */ }
    }
}
```

### Pattern 2: Specialized Grant Provider (Review Delegation as first implementer)

**What:** A minimal interface matching CONTEXT.md D05:

```go
type SpecializedGrant struct {
    Action Action
    Source string // e.g. "review_delegation"
}
type SpecializedGrantProvider interface {
    ResolveGroupGrants(ctx context.Context, actorID, fansubGroupID int64) ([]SpecializedGrant, error)
}
```

**When to use:** Any grant source that is not a plain role. Review Delegation is the only current
implementer — it already has a resolved shape in `AuthzRepository.ResolveActorReviewGrantContext`
(`backend/internal/repository/authz_permissions.go` lines 197-276), which returns
`ReviewGrantContext.GrantedActions []Action` scoped to one active, verified membership. Wrap that
existing query as the first `SpecializedGrantProvider` implementation rather than writing a new
one; it already enforces "active membership + verified member claim" via its `locked_membership`
CTE with `FOR SHARE OF fgm`.

```go
// Source: existing team4s.v3/backend/internal/repository/authz_permissions.go, lines 197-276
// (already does exactly what a "review_delegation" SpecializedGrantProvider needs — reuse, wrap)
func (r *AuthzRepository) ResolveActorReviewGrantContext(
    ctx context.Context, appUserID int64, fansubGroupID int64,
) (*permissions.ReviewGrantContext, error) { /* ... */ }
```

### Pattern 3: Atomic Mutation + Audit (mirrors `ReviewService.changeDelegation`)

**What:** A transactional service method for `SET ALLOW` / `SET DENY` / `REMOVE OVERRIDE`.

**Source analog (verified, currently in production use):**
```go
// Source: team4s.v3/backend/internal/services/review_service.go, lines 88-146
tx, err := s.starter.Begin(ctx)
if err != nil { return fmt.Errorf("... begin: %w", err) }
defer func() { _ = tx.Rollback(ctx) }()
delegations := repository.NewReviewDelegationRepository(tx)
target, err := delegations.LockMembership(ctx, cmd.TargetMembershipID)   // row lock, FOR UPDATE
...
authz := repository.NewAuthzRepository(tx)
allowed, err := permissions.NewService(authz).CanForFansubGroup(ctx, cmd.Actor, ..., target.FansubGroupID)
...
if grant { allowed.Allowed, err = delegations.GrantAction(ctx, target.MembershipID, string(cmd.Action)) }
...
_, err = repository.NewReviewAuditRepository(tx).InsertEvent(ctx, repository.ReviewAuditEventInput{...})
...
if err := tx.Commit(ctx); err != nil { return fmt.Errorf("... commit: %w", err) }
```

**Applied to Phase 137:** `EffectiveRightsService.MutateOverride(ctx, cmd)` should: begin tx →
resolve+lock the target membership by `(app_user_id, fansub_group_id)` (there is no membership-ID
path param in the locked `CapabilityOverrideMutationRequest` contract, so lock via
`SELECT ... FOR UPDATE` on `fansub_group_members WHERE app_user_id=$1 AND fansub_group_id=$2` — mirrors
`ReviewDelegationRepository.LockMembership`'s `FOR UPDATE OF fgm` style) → authorize actor via the
new management capability against the *target* group (never the actor's own group) → validate
`action_code` exists and `user_overridable=true` (service-level 422 for a good error message; the
DB's composite FK is the fail-closed backstop) → `SELECT ... FOR UPDATE` (or rely on `INSERT ...
ON CONFLICT (app_user_id, fansub_group_id, action_code) DO UPDATE` row-level locking) the current
override row to get `before_effect` → compute `after_effect` from the requested effect/removal →
if `before == after`, return `{status: "no_op", changed: false}` **without** inserting a history
row (per D06/migration comment: *"Exact no-op suppression belongs to the mutation service"*) → else
upsert/delete the current-state row and insert one history row → commit.

### Pattern 4: BOLA/IDOR Cross-Group Guard (already established, reuse verbatim)

**What:** Resolve the target row, compare its group ID to the authorized path's group ID, return a
neutral error on mismatch — never trust a body/query `group_id` as authorization-bearing on its own.

```go
// Source: team4s.v3/backend/internal/handlers/fansub_hist_group_member_roles_handler.go, lines 188-212
memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), memberID)
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaftseintrag nicht gefunden"}})
    return
}
if memberRow.FansubGroupID != fansubID {
    c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "mitglied gehört nicht zu dieser fansubgruppe"}})
    return
}
```

Apply the same shape to: target user resolution (does this `target_user_id` have an active
membership in **this** `:id` group?), override lookup (does this override row belong to **this**
group?), and history listing (filter `WHERE fansub_group_id = $1`, never trust a client-supplied
group filter alone). The project already has shared `notFound`/`badRequest`/`internalError`
helpers in `handlers/group_handler.go` and `handlers/anime.go` — reuse them; do not invent a new
error envelope shape.

### Pattern 5: Request-Local Resolution Reuse (D09)

**What:** No `context.WithValue` caching precedent exists in this codebase (confirmed via
repo-wide grep — zero hits for `context.WithValue`/`RequestCache` patterns). The idiomatic
approach here is explicit parameter passing: build `*GroupRightsResolution` once at the top of a
handler/service method and pass the pointer to every subsequent `Can()`-style check within that
same request/transaction, rather than re-querying. This keeps the "no long-lived cache" boundary
(explicitly required by D09 — no Redis, no process-wide cache) true by construction, since the
struct's lifetime is bounded by the Go call stack of one request.

### Anti-Patterns to Avoid

- **A second parallel decision path for review actions:** `CanReviewForFansubGroup` as it exists
  today is exactly this anti-pattern already in production — it must be folded into the new
  resolver, not left standing beside it with its own override-blind logic.
- **Trusting `group_id`/`target_user_id` from the request body as authorization-bearing:**
  `CapabilityOverrideMutationRequest` carries `group_id`/`target_user_id` in the body, but the
  actor's authorization must be checked against the **path** `:id` (or an equivalently
  server-resolved group), with the body values cross-validated to match — never used standalone.
- **Skipping the DB-level `user_overridable` FK as "redundant" with the service check:** Both must
  exist — the FK is what makes D07's *"`user_overridable=false` can never be bypassed"* true even
  if a future writer skips the service layer.
- **N+1 role/membership queries inside the Inspector:** the Inspector must call
  `ResolveGroupRights` exactly once per `(user, group)` pair and iterate the in-memory map — never
  loop per `action_code` issuing new queries (explicit D09/QUAL-06 requirement).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row-level locking for concurrent override mutations | A custom advisory-lock or optimistic-versioning scheme | Postgres `SELECT ... FOR UPDATE` / `INSERT ... ON CONFLICT` row locks, exactly as `ReviewDelegationRepository.LockMembership` (`FOR UPDATE OF fgm`) already does | The codebase has a proven, tested pattern for this; a second locking strategy would be an unverified new risk in a security-sensitive path. [VERIFIED: repository/review_delegation_repository.go] |
| Append-only audit enforcement | Application-level "don't call UPDATE" discipline | The existing `BEFORE UPDATE OR DELETE ... RAISE EXCEPTION` trigger on `user_group_capability_override_history` (migration 0146) | Already shipped and fail-closed at the DB layer; no Go code needs to re-implement immutability. [VERIFIED: database/migrations/0146_capability_policy_catalog.up.sql] |
| Platform-admin bypass detection | A new "is this user a super-admin" check | `actor.IsPlatformAdmin` (already populated by `permissionActorFromContext` from `middleware.AuthIdentity`) feeding the existing `ReasonPlatformAdmin` path | Platform-admin is IdP/Keycloak-owned and already flows into every `Can*` method identically; re-deriving it anywhere else risks drift. [VERIFIED: handlers/permission_authz.go] |
| Neutral not-found responses for foreign-scoped resources | A new error-response type | Existing `notFound`/`badRequest`/`internalError` helpers (`handlers/group_handler.go`, `handlers/anime.go`) and the `errors.Is(err, repository.ErrNotFound)` convention | Consistent with every other admin handler in the codebase; a new shape would fragment the API's error contract. [VERIFIED: grep across handlers package] |

**Key insight:** almost everything Phase 137 needs — transaction lifecycle, row locking,
append-only audit, BOLA guards, error envelopes — already exists in the codebase in a
security-reviewed form from Phase 107/117/136 work. The actual new work is (1) the precedence
*evaluation* logic itself, (2) batching the four source categories into one resolution, and (3)
wiring that resolution into the two existing decision paths that currently diverge.

## Runtime State Inventory

Not applicable — Phase 137 is new-capability work (central resolver + override mutation API), not
a rename/refactor/migration of existing identifiers.

## Common Pitfalls

### Pitfall 1: Zero actions are currently `user_overridable = true` — the feature has no valid target to test against
**What goes wrong:** `user_group_capability_overrides` has a composite FK
`(action_code, catalog_user_overridable) REFERENCES action_definitions(code, user_overridable)`.
Since migration `0146` only added the column (`DEFAULT false`) and never flipped any row to
`true`, **every** insert attempt into `user_group_capability_overrides` will fail its FK check
today, for any action code. CAP-05/CAP-06/CAP-07/QUAL-03 cannot be implemented or tested until at
least one real action is made overridable.
**Why it happens:** Migration 0146's own header comment says *"Runtime per-user resolution and
mutation orchestration remain Phase 137 work"* — the catalog *flag* was shipped, the catalog
*data* deliberately was not.
**How to avoid:** Add a new migration (`0150+`) that `UPDATE action_definitions SET
user_overridable = true WHERE code IN (...)` for a deliberately chosen pilot set. Strong
candidates (verified eligible against the CHECK constraint's exclusion regex
`(capability|role|delegation|security|audit)` and explicit exclusion list): the seven actions
`0146` itself just added — `fansub_group_media.upload/update/reorder`,
`fansub_group_page.general_edit/technical_links_edit/founding_history_edit`,
`fansub_group_links.update` — plus, given CONTEXT.md's explicit "User-Deny also overrides Review
Delegation" scenario in the required negative-test matrix, at least one of
`review.text.decide`/`review.image.decide`/`review.contribution.decide` almost certainly needs to
become overridable too, or that specific required test case has nothing to exercise. **This is a
concrete decision the planner must make explicitly** (see Open Question 2).
**Warning signs:** Any override-mutation integration test that inserts a row for an action not yet
flipped will fail with a Postgres foreign-key-violation, not a clean 422 — this masks the intended
validation error with a raw DB error if the service-level `user_overridable` check is skipped.

### Pitfall 2: `CanReviewForFansubGroup` is a second decision engine hiding in plain sight
**What goes wrong:** `permissions.Service.CanForFansubGroup` special-cases review actions at its
very first line (`if isReviewAction(action) { return s.CanReviewForFansubGroup(...) }`), routing
them to a method with its own independent platform-admin/disabled/membership/role checks and *zero*
awareness of user overrides. If Phase 137 only patches `canForContext` and forgets this branch,
review actions will silently keep bypassing the new precedence rules — a direct violation of
CONTEXT.md's explicit "Review Delegation + User Deny → DENY" requirement.
**Why it happens:** Review delegation was built (Phase 107) before per-user overrides existed;
the isolation was correct then.
**How to avoid:** `CanReviewForFansubGroup` must also delegate to `ResolveGroupRights` (Pattern 1).
Verify via a dedicated test that a `user_deny` row for a `review.*.decide` action changes the
outcome of `CanReviewForFansubGroup`, not just `CanForFansubGroup`.
**Warning signs:** Any test asserting resolver-level override behavior that calls
`CanForFansubGroup` with a non-review action will pass while the identical scenario via
`CanReviewForFansubGroup`/a review action silently fails — always test both entry points for every
precedence case in the negative-test matrix.

### Pitfall 3: `permissions.go` and `authz_permissions.go` are already near/over the 450-line cap
**What goes wrong:** Adding the resolver, `SpecializedGrantProvider` interface, and new
`Reason*`/`decisive_source` constants directly into `permissions.go` (already 781 lines) or
`authz_permissions.go` (already ~494 lines) worsens pre-existing CLAUDE.md modularity debt and
risks review pushback.
**How to avoid:** New logic goes in new files (`effective_rights.go`,
`authz_user_overrides.go`) as listed in Recommended Project Structure; `permissions.go` only gains
the minimal call-site edits inside `canForContext`/`CanReviewForFansubGroup` to delegate.
**Warning signs:** A diff that adds >100 lines to either existing file instead of a new file.

### Pitfall 4: The pre-built `EffectiveRightState` DTO from Phase 136 is provenance-incomplete
**What goes wrong:** Phase 136 already shipped `EffectiveRightState` (OpenAPI +
`admin-capability.ts`) with only `{action_code, allowed, provenance, decisive, non_deniable}` —
one *single* `provenance` enum value (`idp_global_role|group_role|user_allow|user_deny`), not the
full "all sources plus decisive one" shape CONTEXT.md's D04 requires (`granting_roles[]`,
`user_allow`, `user_deny`, `specialized_grants[]`, `decisive_source`, `reason_code`). Implementing
CAP-02 against the *current* schema literally cannot show "all granting roles" — there's no array
field for it, and no `specialized_grant` provenance value exists at all.
**Why it happens:** Phase 136's own `136-RESEARCH.md` marks this shape `[ASSUMED]` and explicitly
defers exact discriminator naming to Phase 137's discretion (Assumption A4/Pattern 3 in that
document).
**How to avoid:** Extend (additively — do not remove existing fields/values, to avoid breaking
Phase 136's already-mirrored TS/OpenAPI/Go trio) `EffectiveRightState` with the missing fields and
extend the `EffectiveRightProvenance`/decisive-source vocabulary with `platform_admin` and
`specialized_grant` values. This is a genuine schema gap versus a hard contradiction — it needs a
planning-level decision (Open Question 1), not silent improvisation.
**Warning signs:** Any plan that tries to satisfy CAP-02 by serializing only the current 5-field
`EffectiveRightState` as-is.

### Pitfall 5: `activation_status` enum implies a caching model this phase does not have
**What goes wrong:** `CapabilityOverrideMutationResult.activation_status` is
`persisted|active|pending|failed` — states that make sense once a permission cache exists (Phase
138+ scope per CAP-10). Phase 137 explicitly has **no** cache for user overrides (D09: request-local
reuse only, no Redis/process cache) — a mutation is synchronously effective on the very next
`ResolveGroupRights` call. Emitting `pending` would be actively misleading.
**How to avoid:** Phase 137's mutation service should only ever produce `active` (or `persisted` —
planner's discretion, but pick one and use it consistently) for successful real changes; never
produce `pending`/`failed` in this phase's code paths (those values remain valid schema options for
Phase 138's different architecture, just unused here).

## Code Examples

### Existing transactional mutation + audit pattern to mirror

```go
// Source: team4s.v3/backend/internal/services/review_service.go, lines 88-146 (changeDelegation)
func (s *ReviewService) changeDelegation(ctx context.Context, cmd ReviewDelegationCommand, grant bool) error {
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return fmt.Errorf("change review delegation begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	delegations := repository.NewReviewDelegationRepository(tx)
	target, err := delegations.LockMembership(ctx, cmd.TargetMembershipID) // FOR UPDATE OF fgm
	...
	authz := repository.NewAuthzRepository(tx)
	allowed, err := permissions.NewService(authz).CanForFansubGroup(
		ctx, cmd.Actor, permissions.ActionFansubGroupMembersManage, target.FansubGroupID,
	)
	...
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("change review delegation commit: %w", err)
	}
	return nil
}
```

### Existing BOLA/IDOR cross-group guard to reuse

```go
// Source: team4s.v3/backend/internal/handlers/fansub_hist_group_member_roles_handler.go, lines 188-212
memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), memberID)
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaftseintrag nicht gefunden"}})
	return
}
if memberRow.FansubGroupID != fansubID {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "mitglied gehört nicht zu dieser fansubgruppe"}})
	return
}
```

### Existing membership-row lock pattern (verified, active claim required)

```go
// Source: team4s.v3/backend/internal/repository/review_delegation_repository.go, lines 42-86
err := r.db.QueryRow(ctx, `
	SELECT fgm.id, fgm.fansub_group_id, fgm.app_user_id, fgm.member_id,
	       fgm.status, au.status,
	       EXISTS (SELECT 1 FROM member_claims mc WHERE mc.app_user_id = fgm.app_user_id
	               AND mc.member_id = fgm.member_id AND mc.claim_status = 'verified')
	FROM fansub_group_members fgm
	JOIN app_users au ON au.id = fgm.app_user_id
	WHERE fgm.id = $1
	FOR UPDATE OF fgm
`, fansubGroupMemberID).Scan(...)
```

### Existing concurrency test pattern to extend for D06's race scenario

```go
// Source: team4s.v3/backend/internal/services/release_review_concurrency_test.go, lines 16-46
// Barrier-channel technique: force two goroutines' transactions to interleave deterministically,
// then assert exactly one committed outcome and a consistent history record.
type releaseReviewBarrierAdapter struct {
	delegate ReviewTargetAdapter
	loaded   chan struct{}
	release  <-chan struct{}
}
// ... LoadForDecision blocks on `release` after signalling `loaded`, letting the test
// control exact interleaving of two concurrent Decide() calls.
```

### Existing already-shipped DTO shapes to extend, not replace

```yaml
# Source: shared/contracts/admin-capabilities.yaml, lines 407-522 (already merged into openapi.yaml)
EffectiveRightProvenance:
  type: string
  enum: [idp_global_role, group_role, user_allow, user_deny]   # NEEDS: + specialized_grant
CapabilityOverrideMutationRequest:
  required: [group_id, target_user_id, action_code, effect]
  properties:
    effect: { $ref: "#/components/schemas/CapabilityOverrideEffect", nullable: true }  # null == REMOVE OVERRIDE
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Two independent authorization decision paths (`canForContext` role loop vs. `CanReviewForFansubGroup`) | One resolver (`ResolveGroupRights`) both paths delegate to | Phase 137 (this phase) | Review actions gain override awareness for the first time; enforcement and inspection provably agree. |
| `action_definitions.user_overridable` exists as a flag with zero `true` rows | At least one pilot set of actions flipped to `true` via a Phase 137 migration | Phase 137 | Unblocks CAP-05/06/07 end-to-end testability. |
| Static Go `roleMatrix` (already dead code, commented out since Phase 86) | DB-loaded `role_capabilities` cache (`permissions.LoadCache`) | Migration 0108 / Phase 86 | Not itself a Phase 137 change, but the resolver must read from this same cache (`AllowedActionsForRole`), not re-derive it. [VERIFIED: permissions.go lines 89-198] |

**Deprecated/outdated:** none newly deprecated by this phase; the commented-out `roleMatrix` in
`permissions.go` (lines 89-191) remains historical documentation only, per its existing comment —
do not resurrect it as a fallback for override resolution.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Pilot `user_overridable=true` action set should include the 7 media/page actions added in migration 0146 plus at least one `review.*.decide` action. | Pitfall 1 / Open Question 2 | Medium — if the planner picks a different set, negative-test-matrix cases ("Review Delegation + User Deny") may have no real action to exercise them against. |
| A2 | New management capability should be named `user_group_capability_override.manage` and excluded from `user_overridable` by virtue of containing the token `capability` (matches the existing CHECK regex automatically). | Open Question 3 | Low — naming is discretionary; the regex-based auto-exclusion is a nice property but not load-bearing if a different name is chosen deliberately with an explicit exclusion-list entry instead. |
| A3 | Override mutation should be a single endpoint keyed on `(group_id path param, target_user_id, action_code)` with `effect: allow\|deny\|null` (null = remove), matching the already-locked `CapabilityOverrideMutationRequest` shape, rather than 3 separate endpoints. | Architecture Patterns Pattern 3 | Low — REST-style separate PUT/DELETE endpoints (as `role-capabilities` already does) would also satisfy D06's three logical operations; either is compatible with the existing DTO. |
| A4 | `activation_status` should resolve to a single constant value (`active` or `persisted`) for all Phase 137 mutations, never `pending`/`failed`. | Pitfall 5 | Low — cosmetic; either constant choice is safe as long as it's consistent, since no consumer reads this field until Phase 138. |
| A5 | Request-local resolution reuse should be implemented via explicit parameter passing (no `context.WithValue`), since no such precedent exists in the codebase. | Architecture Patterns Pattern 5 | Low — a `context.WithValue`-based cache would also satisfy D09's requirement; explicit passing is simply more consistent with existing code style. |

**All entries above are extrapolations from directly-verified code/schema, not external
documentation lookups** — this phase has no third-party library research surface, so there are no
`[CITED: external URL]` claims; everything is `[VERIFIED: <repo file>]` or `[ASSUMED]` as marked.

## Open Questions

1. **How much should `EffectiveRightState`/`CapabilityOverrideState` be extended to satisfy D04's full provenance model?**
   - What we know: The current Phase-136-shipped schema has `provenance` (single enum value) and
     `decisive`/`non_deniable` booleans, but no `granting_roles[]`, no `user_allow`/`user_deny`
     booleans, no `specialized_grants[]`, and no `specialized_grant` provenance value.
   - What's unclear: Whether the planner should extend the *existing* schema names additively
     (safest, keeps Phase 136's already-mirrored OpenAPI/Go/TS trio intact) or introduce a
     parallel, richer type used only by the Inspector while keeping the thin
     `EffectiveRightState` for the mutation-result's `effective_right` field.
   - Recommendation: Extend additively. Add `granting_roles: string[]`, `user_allow: boolean`,
     `user_deny: boolean`, `specialized_grants: string[]`, `reason_code: string` to
     `EffectiveRightState` (all new fields, non-breaking), and add `specialized_grant` (and
     ideally `platform_admin`, `no_grant`) to the `EffectiveRightProvenance` enum.

2. **Which exact actions become the pilot `user_overridable=true` set?**
   - What we know: Zero actions are currently overridable; the 7 actions added in 0146 look
     purpose-built for this; CONTEXT.md's required negative-test matrix explicitly needs a
     Review-Delegation-vs-User-Deny scenario.
   - What's unclear: Whether product intent is "any of the 7 new group-admin actions" only, or
     whether at least one `review.*.decide` action must also become overridable in this phase (vs.
     deferring review-action overridability to a later phase and testing the "Review Delegation +
     User Deny" interaction with mocked/fixture data instead of a real `user_overridable=true`
     row).
   - Recommendation: Flip all 7 media/page actions **and** `review.contribution.decide` (arguably
     the lowest-risk review action to make overridable, since it does not touch text/image content
     moderation directly) to `user_overridable=true` in the new migration; confirm with the user if
     this reads as a product-scope decision rather than a technical one.

3. **What should the new management-capability action code be named, and which roles get it seeded?**
   - What we know: No such capability exists today; D07 requires a *dedicated* group-scoped
     capability, not a hard-coded role check; Platform Admin bypasses via the existing
     non-deniable path regardless.
   - What's unclear: Exact code string and which existing roles (`fansub_lead`, `founder`,
     `co_leader`?) should be seeded with it by default.
   - Recommendation: `user_group_capability_override.manage`, seeded onto `fansub_lead` and
     `founder` initially (the two roles that already hold the broadest existing group-admin
     capabilities per `role_capabilities`), added via the same migration as Open Question 2's data
     changes.

4. **Should `CanForRelease`/`CanForReleaseVersion`/`CanForReleaseVersionMedia` also route through `ResolveGroupRights` in this phase, or only `CanForFansubGroup`/`CanReviewForFansubGroup`?**
   - What we know: CONTEXT.md's architecture diagram and CAP-03 ("gilt serverseitig dieselbe
     dokumentierte Präzedenz" — applies broadly, not to one endpoint only) suggest all group-scoped
     entry points should eventually be override-aware; CONTEXT.md's in-scope list says "integration
     of role grants" and "runtime-enforcement integration" without naming individual methods.
   - What's unclear: Whether leaving `CanForRelease`/`CanForReleaseVersion`/
     `CanForReleaseVersionMedia` on their old per-group role loop (unaware of user overrides) for
     one more phase is an acceptable interim state, or whether full universality is required now.
   - Recommendation: Since `canForContext`'s inner loop is shared by all of these methods already
     (Pattern 1), swapping just that inner loop to call `ResolveGroupRights` makes **all** of them
     override-aware "for free" with no per-method rewiring — there is no extra cost to doing all of
     them in Phase 137, so the plan should include this rather than deferring it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| PostgreSQL | Migration + repository work | ✓ | 16 (Docker `postgres:16`, healthy) | — |
| Go backend container | Building/running the service | ✓ | Go 1.25.0, running (`team4sv30-backend`) | — |
| Docker Compose | Local dev orchestration | ✓ | Compose stack up, all services healthy/running | — |
| Keycloak | Platform-admin identity (read-only dependency, unchanged) | ✓ | Healthy | — |

No missing dependencies. No fallback needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Go `testing` + `testify` (assert/require) |
| Config file | none — Go's native `go test` |
| Quick run command | `docker compose exec team4sv30-backend go test ./internal/permissions/... ./internal/services/... -run <Name> -v` |
| Full suite command | `docker compose exec team4sv30-backend go test ./...` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| CAP-01 | Full effective-capability list for user+group | unit (pure Go, table-driven) | `go test ./internal/permissions/... -run TestResolveGroupRights` | ❌ Wave 0 |
| CAP-02 | Provenance (granting roles/allow/deny/decisive reason) per capability | unit | `go test ./internal/permissions/... -run TestResolveGroupRightsProvenance` | ❌ Wave 0 |
| CAP-03 | Same precedence in enforcement and inspection | integration (real Postgres) | `TEAM4S_PHASE137_TEST_DSN=... go test ./internal/repository/... -run TestPhase137` | ❌ Wave 0 |
| CAP-05 | Grant/deny one capability for active member, one group only | integration | `go test ./internal/services/... -run TestEffectiveRightsServiceMutate` | ❌ Wave 0 |
| CAP-06 | Reject foreign/invalid targets neutrally | integration + handler | `go test ./internal/handlers/... -run TestAdminEffectiveRightsHandlerBOLA` | ❌ Wave 0 |
| CAP-07 | Idempotent, atomic, audited mutation | integration | `go test ./internal/services/... -run TestEffectiveRightsServiceIdempotent` | ❌ Wave 0 |
| QUAL-03 | Full negative-security matrix (deny precedence, cross-group, invalid capability, BOLA/IDOR) | integration, table-driven | `go test ./internal/services/... ./internal/handlers/... -run TestPhase137Negative` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `go test ./internal/permissions/... ./internal/services/...` (pure-Go precedence tests run in seconds, no DB needed for the core resolver logic).
- **Per wave merge:** `TEAM4S_PHASE137_TEST_DSN=<real dsn> go test ./internal/repository/... ./internal/services/... ./internal/handlers/...` (real-Postgres tier, mirrors existing Phase 107/117 SKIP-not-FAIL convention).
- **Phase gate:** `go test ./...` full suite green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/testsupport/phase137_postgres.go` — new real-DB harness (`TEAM4S_PHASE137_TEST_DSN`), mirrors `phase117_postgres.go`/`phase107_postgres.go` pattern exactly (DSN env var, database-name regex, schema-name regex, prerequisite-table bootstrap function).
- [ ] `backend/internal/permissions/effective_rights_test.go` — pure-Go precedence table covering the full Section 7 negative-security matrix (no DB needed for the precedence-evaluation unit itself, since it can be tested against an in-memory `GroupRightsResolution` built from fixture data).
- [ ] Migration `0150` fresh up/down proof test (`backend/internal/migrations/phase137_*_test.go`), following the existing `phase136_capability_policy_catalog_test.go` / `phase128_public_identity_test.go` convention.
- [ ] Concurrency test extending the `release_review_concurrency_test.go` barrier-channel pattern for the "Admin A: allow→deny, Admin B: allow→remove" race scenario from CONTEXT.md D06.

*(No existing test file directly covers effective-rights resolution or override mutation today — this is genuinely new test surface, not an extension of an existing suite.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No (unchanged) | Existing Keycloak/`middleware.CommentAuthIdentityFromContext` — not touched by this phase. |
| V3 Session Management | No (unchanged) | Existing bearer-token middleware — not touched. |
| V4 Access Control | **Yes — core of this phase** | Central resolver with deny-over-allow precedence, platform-admin non-deniable bypass, disabled-actor/no-membership deny, group-scoped server-side validation of every mutation/inspection target (never trust client-supplied IDs alone). |
| V5 Input Validation | Yes | `action_code` must be validated against `action_definitions` (existing catalog); `effect` restricted to `allow\|deny\|null`; DB CHECK constraints as fail-closed backstop (existing pattern in migration 0146). |
| V6 Cryptography | No | Not applicable — no new crypto surface. |
| V7 Error Handling & Logging | Yes | Neutral `not_found`/422 responses for foreign-scoped resources (never leak "this user exists but belongs to another group" — CONTEXT.md D08 explicit requirement); reuse existing `internalError`/`writeInternalErrorResponse` classification helpers. |
| V9 Communications | No | Unchanged transport (existing TLS/reverse-proxy setup). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| BOLA/IDOR via manipulated `group_id`/`target_user_id`/membership IDs in mutation or inspection requests | Elevation of Privilege / Information Disclosure | Server-side re-resolution + cross-check of every ID against the authorized path's group (Pattern 4); neutral 404/422 on mismatch, never a distinguishing error message. |
| Privilege escalation via self-override without the management capability | Elevation of Privilege | Authorize the actor against the target group's management capability *before* any mutation; D07 explicitly allows self-modification only when the actor legitimately holds that capability — no special-case exemption. |
| Race condition producing an override state with no matching audit record | Repudiation / Tampering | Single transaction per mutation (Pattern 3), row-level lock on the current-state row before computing before/after, append-only history trigger as DB-level backstop. |
| Bypassing `user_overridable=false` via direct SQL/repository call that skips service validation | Tampering | Composite FK `(action_code, user_overridable) -> action_definitions(code, user_overridable)` makes this structurally impossible at the DB layer, independent of Go-layer discipline (already shipped in migration 0146). |
| Silent audit-write failure leaving an effective override change with no audit trail | Repudiation | `services/review_service.go`'s existing pattern (audit insert *inside* the same transaction as the mutation, `tx.Commit` only after both succeed) must be followed exactly — CONTEXT.md D06 explicitly requires rollback if audit persistence fails. |

## Sources

### Primary (HIGH confidence — read directly from the live Linux checkout)
- `backend/internal/permissions/permissions.go` — current `Can*` methods, `Result`/`ReviewAuthorizationResult` shapes, existing precedence logic, reason codes.
- `backend/internal/repository/authz_permissions.go` — `ListActorGroupRoles`, `ResolveActorReviewGrantContext`, `LoadRoleCapabilities`, `LoadFansubGroupRoles`/`LoadCapabilityRoles`.
- `backend/internal/repository/authz_capability_mutations.go` — `CapabilityMatrix` DTOs and query shape (analog for batched projection).
- `backend/internal/repository/review_delegation_repository.go` — membership locking pattern (`FOR UPDATE OF fgm`), grant/revoke idempotency (`ON CONFLICT DO NOTHING`).
- `backend/internal/services/review_service.go` — `Decide`/`changeDelegation` transaction + audit pattern (Begin → defer Rollback → mutate → audit → Commit).
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` — BOLA/IDOR cross-group guard pattern, existing `notFound`/`badRequest`/audit-log-write conventions.
- `backend/internal/handlers/admin_capability_handler.go`, `platform_admin_authz.go`, `permission_authz.go` — platform-admin gate (`requirePlatformAdminIdentity`), permission-denied response mapping.
- `database/migrations/0146_capability_policy_catalog.{up,down}.sql` — full override/history schema, constraints, triggers, and confirmation that zero actions currently have `user_overridable = true`.
- `database/migrations/0073_fansub_group_app_memberships.up.sql`, `0072_keycloak_app_users_foundation.up.sql` — `fansub_group_members.status` (`active`/`disabled` only) and `app_users.status` (`pending`/`active`/`disabled`) enums.
- `shared/contracts/admin-capabilities.yaml` (+ mirrored `openapi.yaml` lines 8765-8871) — already-shipped forward-looking DTOs (`EffectiveRightState`, `CapabilityOverrideState`, `CapabilityOverrideMutationRequest/Result`, `CapabilityOverrideAuditItem`).
- `frontend/src/types/admin-capability.ts` — TS mirror of the same DTOs, confirming exact field-level gaps (Pitfall 4).
- `backend/internal/services/release_review_concurrency_test.go` — barrier-channel concurrency test pattern to extend for D06.
- `backend/internal/testsupport/phase117_postgres.go` — real-Postgres test harness convention (DSN env var + name-regex safety + prerequisite bootstrap).
- `.planning/phases/136-capability-policy-catalog-schema-contract/136-RESEARCH.md`, `136-CONTEXT.md` — Phase 136's own documented assumptions (`[ASSUMED]` tags) about the DTO shapes Phase 137 inherits, and D-10's override-history visibility rule (platform admin sees all group histories; group admins see only their own group's history).
- `.planning/phases/137-central-effective-rights-resolver-overrides/137-CONTEXT.md` — binding product decisions D01-D10 for this phase (verbatim source for User Constraints section).
- `CLAUDE.md` (project root) — canonical environment, GSD workflow enforcement, 450-line modularity cap, umlaut rule.
- `docker compose ps` output — confirmed live environment state (Postgres 16 healthy, backend/frontend/Keycloak running).

### Secondary / Tertiary
- None — this phase required no external library research (pure extension of existing in-repo Go/Postgres code), so there are no WebSearch-sourced claims in this document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; versions read directly from `go.mod` and running `docker compose ps`.
- Architecture: HIGH for the "one resolver, existing callers delegate" migration path (directly traced through the actual `permissions.go` source); MEDIUM for exact new-file boundaries and route naming (implementation discretion, not verified against a locked convention).
- Pitfalls: HIGH — Pitfall 1 (zero overridable actions) and Pitfall 2 (parallel review decision path) are both directly confirmed by reading the migration SQL and the `permissions.go` source, not inferred.
- Security: HIGH — every mitigation pattern cited is already live, tested code in this repository, not a general best-practice assertion.

**Research date:** 2026-08-21
**Valid until:** Should be re-validated if Phase 136's migration/contract files are touched again before Phase 137 planning begins (unlikely, since 136 is closed), otherwise valid through Phase 137 planning and execution — this is fast-moving *within this milestone* (interacts directly with the schema/contracts Phase 136 just shipped) but stable against external drift (no third-party dependencies).
