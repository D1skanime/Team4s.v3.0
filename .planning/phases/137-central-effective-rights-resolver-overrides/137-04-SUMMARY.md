---
phase: 137-central-effective-rights-resolver-overrides
plan: 04
subsystem: backend
tags: [authorization, precedence-engine, go, tdd, capability-overrides, review-delegation]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 02
    provides: EffectiveRightState/EffectiveRightProvenance additive D04 provenance contract (YAML/OpenAPI/TS)
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 03
    provides: AuthzUserOverridesRepository batch-load/lock/mutate primitives (read_first context only; not consumed by production wiring in this plan)
provides:
  - "permissions.GroupRightsResolution / Service.ResolveGroupRights -- the single group-wide, provenance-capable D01 precedence primitive for one actor + fansub group"
  - "permissions.CapabilityRightState -- per-action provenance projection field-compatible with the D04 EffectiveRightState shape"
  - "permissions.SpecializedGrantProvider seam + permissions.reviewGrantProvider adapting the existing Phase-107 ResolveActorReviewGrantContext query as the first specialized grant source"
  - "Two new optional Resolver interfaces (GroupRightsMembershipResolver, GroupRightsOverridesResolver) ready for a later plan to wire against real Postgres"
affects: [137-05, 137-06, 137-07, 137-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure precedence evaluator (evaluateGroupRights) separated from I/O orchestration (ResolveGroupRights) so the entire D01-D05 decision matrix is exhaustively unit-testable against in-memory fixtures with zero DB/HTTP dependency."
    - "Optional-interface type-assertion seam (GroupRightsMembershipResolver, GroupRightsOverridesResolver, SpecializedGrantProvider) mirrors the existing ReviewContextResolver convention already used by CanReviewForFansubGroup -- new data sources can be wired into ResolveGroupRights later without changing its signature or the Service struct."

key-files:
  created:
    - backend/internal/permissions/effective_rights.go
    - backend/internal/permissions/effective_rights_test.go
    - backend/internal/permissions/review_grant_provider.go
  modified: []

key-decisions:
  - "decisive_source vocabulary reuses exactly the 137-02 EffectiveRightProvenance enum values relevant to a group-scoped resolver (platform_admin, group_role, user_allow, user_deny, specialized_grant, no_grant); disabled-actor and no-membership denials both map to decisive_source=no_grant (that enum has no dedicated value for either) while a separate, more specific reason_code (disabled_user / no_membership, reusing permissions.go's existing Reason* constants) carries the finer-grained machine reason -- this is exactly why D04 specifies both fields."
  - "GroupRightsMembershipResolver/GroupRightsOverridesResolver are new OPTIONAL Resolver interfaces (type-asserted, not required), not additions to the existing Resolver interface itself -- extending Resolver directly would force every existing implementer (*repository.AuthzRepository, used in backend/cmd/server/main.go) to implement new methods immediately, which is out of this plan's declared files_modified (repository package files) and would have broken the whole backend build."
  - "When GroupRightsMembershipResolver is not implemented by the underlying resolver (the current production state, see Known Gap below), ResolveGroupRights falls back to inferring active membership from a non-empty role set (len(roles) > 0). This exactly reproduces pre-Phase-137 behavior for every existing role-based check (zero regression) since ListActorGroupRoles already only returns roles for an active membership; it only under-serves the brand-new zero-role + stored-override scenario, which did not exist before this phase's override table did."
  - "Task 2 implemented specialized-grant collection inline in effective_rights.go (via direct ReviewContextResolver type-assertion) so the full precedence/provenance test matrix, including specialized-grant cases, passed at the end of Task 2 without forward-referencing a not-yet-created file. Task 3 then extracted that exact adapter verbatim into the dedicated review_grant_provider.go artifact the plan requires, with zero behavior change (proven by the unchanged full test suite passing before and after the move)."
  - "allKnownActions (permissions.go's existing private action catalog, already covering all 29 declared Action constants including all three review.*.decide actions) is reused directly as the canonical action list ResolveGroupRights evaluates -- no new/parallel action enumeration was introduced."

patterns-established:
  - "New Phase-137 permission-package code lives in dedicated new files (effective_rights.go, review_grant_provider.go) rather than growing permissions.go/authz_permissions.go past their existing near-cap line counts, per 137-RESEARCH.md Pitfall 3."

requirements-completed: [CAP-01, CAP-02, CAP-03, QUAL-03]

# Metrics
duration: ~35min
completed: 2026-08-21
---

# Phase 137 Plan 04: Central Effective-Rights Resolver Summary

**New `permissions.GroupRightsResolution`/`ResolveGroupRights` is the single, provenance-capable D01 precedence engine (platform_admin > disabled > no-active-membership > user_deny > user_allow > role_grant > specialized_grant > no_grant) for one actor + fansub group, with Review Delegation wired in as the first `SpecializedGrantProvider` and a 20-case pure-Go precedence/provenance test matrix proving every locked negative-security-matrix row the resolver is responsible for.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-21T17:57:00Z (approx, following 137-03)
- **Completed:** 2026-08-21T18:12:43Z
- **Tasks:** 3 completed
- **Files modified:** 3 (2 new source files, 1 new test file)

## Accomplishments

- `backend/internal/permissions/effective_rights.go` defines `GroupRightsResolution`, `CapabilityRightState`, the pure `evaluateGroupRights` precedence evaluator, and `Service.ResolveGroupRights`, which batch-loads role grants (existing `ListActorGroupRoles`), active-membership state, user overrides, and specialized grants — at most one round trip per category, no per-capability SQL — then evaluates all 29 canonical actions in memory.
- Two new optional Resolver interfaces (`GroupRightsMembershipResolver`, `GroupRightsOverridesResolver`) mirror the existing `ReviewContextResolver` type-assertion convention so a later plan can wire real Postgres-backed membership/override reads without touching this file again or changing `ResolveGroupRights`' signature.
- `backend/internal/permissions/review_grant_provider.go` adapts the existing Phase-107 `ResolveActorReviewGrantContext` query as the resolver's first `SpecializedGrantProvider` (D05) — no duplicated query, no migration of review grants into the generic override table, review delegation stays its own domain mechanism.
- `backend/internal/permissions/effective_rights_test.go` proves, purely in-Go (no HTTP/DB): platform-admin non-deniable bypass, disabled-actor deny, dormant-override-denies-without-active-membership (D02), user-deny beating role grants and specialized grants simultaneously, user-allow granting without any role (only with active membership), OR-combined multi-role grants with full granting-roles visibility, specialized-grant-allows-only-absent-higher-precedence-deny, deterministic default-deny, provenance preservation of losing lower-precedence sources, reactivated-membership restoring a retained override, deterministic resolution of an adversarial ambiguous allow+deny fixture, an 8-row table-driven negative-security-matrix subset (role/multi-role/role+allow/role+deny/allow-only/platform-admin+deny/disabled+role/inactive-membership+dormant-allow), and a dedicated Review-Delegation-vs-User-Deny isolation test with zero role in play.

## Task Commits

Each task was committed atomically:

1. **Task 1: Encode D01-D05 precedence and provenance as table-driven unit tests** - `1f3df034` (test) - RED confirmed: compile failure (`undefined: UserCapabilityOverride`, `undefined: GroupMembershipState`, etc.) since `effective_rights.go` did not exist yet.
2. **Task 2: Implement GroupRightsResolution and centralized precedence** - `964ac40f` (feat) - GREEN confirmed: `go test ./internal/permissions -run 'EffectiveRights|ResolveGroupRights' -count=1` passes in full; `go build ./...` and `go vet ./internal/permissions/...` clean.
3. **Task 3: Wrap existing review delegation as SpecializedGrantProvider** - `92784aad` (feat) - GREEN confirmed: `go test ./internal/permissions -run 'EffectiveRights|Review.*Grant|ResolveGroupRights' -count=1` passes; `git diff --check` clean; full `internal/permissions` package (34 test functions including pre-existing Phase-86/107 suites) re-run shows zero regressions from the extraction.

## Files Created/Modified

- `backend/internal/permissions/effective_rights.go` - `GroupRightsResolution`/`CapabilityRightState` types, provenance/reason-code constants, the pure `evaluateGroupRights` evaluator, `Service.ResolveGroupRights` orchestration, and the two new optional membership/overrides Resolver interfaces.
- `backend/internal/permissions/review_grant_provider.go` - `reviewGrantProvider` adapter (the plan's required `SpecializedGrantProvider` artifact) wrapping `ReviewContextResolver`.
- `backend/internal/permissions/effective_rights_test.go` - Full pure-Go precedence/provenance/negative-security-matrix test suite (20 test functions/subtests).

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: the decisive_source/reason_code vocabulary split, the optional-interface (not Resolver-extension) design, the fallback active-membership inference, and the inline-then-extract sequencing across Tasks 2/3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] gofmt alignment drift in the compile-time interface-assertion `var` block**
- **Found during:** Post-Task-2 and post-Task-3 verification sweeps (`gofmt -l`)
- **Issue:** The `var (_ Resolver = ...; _ GroupRightsMembershipResolver = ...; ...)` block in `effective_rights_test.go` had manually-typed alignment spacing that did not match gofmt's canonical column alignment (recomputed whenever the longest identifier in the block changes).
- **Fix:** Ran `gofmt -w` on the file; purely whitespace, no logic change.
- **Files modified:** `backend/internal/permissions/effective_rights_test.go`
- **Verification:** `gofmt -l` clean; full test suite re-run unaffected.
- **Committed in:** `964ac40f` (Task 2) and `92784aad` (Task 3) — the drift recurred after Task 3's edit reintroduced it, so it was fixed a second time in the same commit.

No other deviations — the delivered resolver's types, precedence order, and file layout match the plan's `must_haves.truths`/`artifacts`/`key_links` exactly.

## Known Gap (flagged for the next plan, per the executor's known-deferred-item instruction)

Mirroring 137-02-SUMMARY.md's own documented Go-DTO gap, this plan surfaces one comparable, deliberately-scoped gap of its own:

**Production repository wiring for `GroupRightsMembershipResolver`/`GroupRightsOverridesResolver` does not exist yet.** `*repository.AuthzRepository` (the concrete type passed to `permissions.NewService` in `backend/cmd/server/main.go`) does not implement either new optional interface — implementing them requires adding methods to a `repository`-package file (e.g. `authz_permissions.go` or a new file), which is outside this plan's declared `files_modified` (`effective_rights.go`, `effective_rights_test.go`, `review_grant_provider.go` only). Consequences:

- **Zero regression today:** `ResolveGroupRights` falls back to inferring active membership from `len(roles) > 0`, exactly reproducing every existing role-based `Can*` decision.
- **Real per-user override enforcement is not live end-to-end yet:** until a later plan adds these two methods to `AuthzRepository`, `ResolveGroupRights` in production always sees zero user overrides and cannot distinguish "active member with no roles" from "no membership" — this is a **pure precedence-engine deliverable** in this plan (Task 1's fixtures prove the logic is correct once real data is supplied), not a production-authorization deliverable.
- **Review Delegation has no such gap** — `ReviewContextResolver` already exists and `AuthzRepository` already implements it (Phase 107), so the `SpecializedGrantProvider` seam is fully live in production today.
- **Recommendation:** Plan 137-05 (which routes existing `Can*` entry points through `ResolveGroupRights`) is the natural place to also extend `AuthzRepository` with these two methods, since that is the plan that first makes `ResolveGroupRights` reachable from real production traffic. If 137-05's own declared `files_modified` (currently `permissions.go` + a new test file only) does not get revised to include a repository file, this gap should be explicitly re-flagged again in 137-05's summary rather than silently left unresolved through to Phase 137's closing validation plan (137-08).

## Known Stubs

None — this plan is pure precedence-engine/business-logic code plus its own exhaustive pure-Go test suite; no UI, no partial data wiring, no placeholder values reaching a rendered surface.

## Threat Flags

None — this plan introduces no new network endpoint, no new auth path, and no schema change. The only new externally-observable behavior (once a later plan wires it into `canForContext`/`CanReviewForFansubGroup`) is the D01 precedence decision itself, which is exactly what `137-CONTEXT.md`'s own binding decisions specify; no surface beyond what was scoped was added.

## Issues Encountered

None beyond the gofmt alignment drift documented above under Deviations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 137-05 can now replace `canForContext`'s shared per-group role loop and `CanReviewForFansubGroup`'s independent decision path with calls to `ResolveGroupRights` + `.Can(action)`, preserving the existing `Result`/`ReviewAuthorizationResult` external shapes exactly as `137-RESEARCH.md` Pattern 1 describes.
- Plan 137-06 (override mutation service) can authorize against `ResolveGroupRights(...).Can(managementAction)` for the new `user_group_capability_override.manage` capability once that Action string is referenced (no Go constant currently exists for it in `permissions.go`; a plain `permissions.Action("user_group_capability_override.manage")` cast works today since `Action` is just a string type).
- The **Known Gap** above (production `AuthzRepository` wiring for the two new optional interfaces) should be resolved before or during whichever plan first makes `ResolveGroupRights` reachable from real production HTTP traffic, so per-user override enforcement is genuinely live, not just logically proven.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 04*
*Completed: 2026-08-21*
