---
phase: 137-central-effective-rights-resolver-overrides
verified: 2026-08-21T19:47:10Z
status: passed
score: 5/5 roadmap success criteria verified (12/12 combined roadmap+plan must-haves)
overrides_applied: 0
---

# Phase 137: Central Effective-Rights Resolver & Overrides Verification Report

**Phase Goal:** Authorized decisions and administrative explanations use one central resolver that safely applies group-scoped user denies/allows and exposes complete provenance.
**Verified:** 2026-08-21T19:47:10Z
**Status:** passed
**Re-verification:** No — initial verification

## Method

This verification did not trust SUMMARY.md/VALIDATION.md/REVIEW.md claims. All findings below were independently re-derived by reading the actual source files (`effective_rights.go`, `effective_rights_service.go`, `admin_effective_rights_handler.go`, `authz_permissions.go`, `authz_user_overrides.go`, migration `0150`, `permissions.go`) and by re-running the test suites directly inside the `team4sv30-backend` container, including against a freshly created disposable PostgreSQL database (`team4s_phase137_test_verify1` / `team4s_phase106_test_verify1`), matching the naming convention the test harness itself enforces.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An authorized caller can inspect every effective capability for a real user/group pair and see all granting roles, direct allows, direct denies, and the decisive reason. | ✓ VERIFIED | `AdminEffectiveRightsHandler.GetEffectiveRights` (`backend/internal/handlers/admin_effective_rights_handler.go:173-201`) calls `ResolveGroupRights` once and projects `CapabilityRightState` (which carries `GrantingRoles`, `UserAllow`, `UserDeny`, `SpecializedGrants`, `DecisiveSource`, `ReasonCode`) into the `EffectiveRightState` DTO. Re-ran `TestGetEffectiveRightsReturnsCompleteProvenanceForAuthorizedActor` directly — PASS. |
| 2 | Runtime authorization and the inspector produce the same answer for role OR, deny-over-allow precedence, scoped overrides, disabled actors, and platform-admin bypass. | ✓ VERIFIED | Both the inspector (`GetEffectiveRights`) and every legacy enforcement entry point (`CanForFansubGroup`→`canForContext`, `canForReleaseVersionGroupRole`, `CanReviewForFansubGroup`, confirmed at `backend/internal/permissions/permissions.go:462-536,652,692`) call the same `Service.ResolveGroupRights`. Re-ran `./internal/permissions` full suite (34 tests incl. `TestResolveGroupRightsNegativeSecurityMatrix`, `TestIntegrationCanForFansubGroupUserDenyOverridesRoleGrant`, `TestIntegrationPlatformAdminBypassesUserDenyAcrossEntryPoints`) — 100% PASS. |
| 3 | An authorized admin can idempotently grant or deny one allowed capability for an active member in exactly one group, while foreign memberships, invalid scopes, and unknown actions fail neutrally. | ✓ VERIFIED | `EffectiveRightsService.MutateOverride` (`backend/internal/services/effective_rights_service.go`) implements SET ALLOW/SET DENY/REMOVE with no-op detection. Re-ran `./internal/services` against a real disposable Postgres DB — `TestPhase137EffectiveRightsOverrideMutationTransitions` (9 subtests incl. 3 noop cases), `TestPhase137EffectiveRightsOverrideMutationRejectsInactiveOrMissingTarget` (disabled/missing/foreign-group), `TestPhase137EffectiveRightsOverrideMutationCatalogValidation` (unknown/non-overridable) all PASS. |
| 4 | Every override mutation commits atomically with an immutable actor/target/context/before/after audit record, and forced audit or concurrency failures cannot leave partial authorization state. | ✓ VERIFIED | `MutateOverride`'s `Begin → defer Rollback → ... → AppendHistory → Commit` shape (lines 185-287) was read directly; re-ran `TestPhase137EffectiveRightsOverrideMutationRollsBackOnHistoryFailure` and `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes` against real Postgres — both PASS, proving rollback-on-history-failure and row-locking serialization independently of the plan's own claims. |
| 5 | Automated negative coverage proves deny precedence, cross-group BOLA/IDOR resistance, invalid capability rejection, and protected direct-access enforcement. | ✓ VERIFIED | Re-ran the full D01-D10-relevant test set across `internal/permissions`, `internal/services`, and `internal/handlers` (`-run 'EffectiveRights|Override|BOLA|IDOR'`). All Phase-137-owned tests PASS, including `TestGetEffectiveRightsForeignTargetIsNeutralNotFound`, `TestMutateOverrideRejectsBodyPathMismatchBeforeDomainMutation`, `TestListOverrideHistoryForeignPairReturnsEmptyNotError`, and the two matrix-gap-closing subtests added in Plan 08 (`self_mutation_denied_without_capability`, `platform_admin_bypasses_group_management_capability`). |

**Score:** 5/5 roadmap success criteria verified.

### Key Plan-Level Must-Haves Spot-Checked

| Must-have (source plan) | Status | Evidence |
|---|---|---|
| Migration 0150 is additive; 0146 untouched (Plan 01) | ✓ VERIFIED | `git log -- database/migrations/0146_*.sql` shows only Phase-136 commits; read `0150_effective_rights_overrides.up.sql` directly — exactly the 7 group + 3 review actions flipped, `user_group_capability_override.manage` inserted `user_overridable=false`, seeded only to `fansub_lead`. Re-ran `TestPhase137MigrationLiveUpDownUp`, `TestPhase137ManagementCapabilityNonOverridable`, `TestPhase137ProtectedCapabilityClassesRemainFalse`, `TestPhase137ManagementCapabilitySeededOnlyToFansubLead` against a fresh disposable DB — all PASS. |
| `EffectiveRightState` additively extended, no competing DTO (Plan 02) | ✓ VERIFIED | `frontend/src/types/admin-capability.ts` and `shared/contracts/admin-capabilities.yaml`/`openapi.yaml` carry `granting_roles`, `user_allow`, `user_deny`, `specialized_grants`, `decisive_source`, `reason_code`. `npx tsc --noEmit` inside `team4sv30-frontend` shows zero `admin-capability`/`EffectiveRight` errors. |
| Batched, transaction-safe repository primitives, no N+1 (Plan 03) | ✓ VERIFIED | `authz_user_overrides.go` read directly — `LoadCurrentOverrides` is one query; `LockTargetMembership`/`UpsertOverride`/`DeleteOverride` use `repository.DBTX` so the same code runs on pool or tx. Re-ran the 5 real-Postgres repository tests — PASS. |
| `ResolveGroupRights` is the single provenance-capable primitive, D01 precedence order, no per-capability SQL (Plan 04) | ✓ VERIFIED | Read `effective_rights.go`'s `evaluateGroupRights` — a single in-memory `for _, action := range actions` loop over already-batch-loaded sources; precedence order matches D01 exactly (lines 299-333). |
| Production wiring closes the Plan-04 "Known Gap" (Plan 05) | ✓ VERIFIED (contradicts stale doc comment, see Warning) | `backend/internal/repository/authz_permissions.go:325-391` implements both `ResolveActorGroupMembership` and `ResolveActorUserOverrides` with compile-time assertions; `main.go:135-136` wires `authzRepo` (this same concrete type) into `permissions.NewService`. Re-ran `TestPhase137ResolveActorGroupMembershipDistinguishesActiveInactiveAndNonMember`, `TestPhase137ResolveActorUserOverridesReturnsGroupScopedRowsOnly`, `TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces` against real Postgres — PASS. Overrides are genuinely enforced in production, not just in Go fixtures. |
| D06/D07/D08 transactional mutation service (Plan 06) | ✓ VERIFIED | See Truth #4 above. |
| Group-scoped inspection/mutation/history HTTP boundary, BOLA/IDOR-hardened (Plan 07) | ✓ VERIFIED | Routes confirmed wired in `backend/cmd/server/admin_routes.go:266-269`; re-ran all 13 `admin_effective_rights_handler_test.go` tests — PASS. |
| Closing cross-layer validation, D01-D10 matrix complete (Plan 08) | ✓ VERIFIED | Independently re-ran the two matrix-gap-closing subtests plus the full `internal/permissions`/`internal/services` suites against a freshly created disposable DB (not the one used by the executor) — 100% PASS, reproducing 137-VALIDATION.md's claimed result rather than trusting it. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `database/migrations/0150_effective_rights_overrides.{up,down}.sql` | Management capability, pilot override set, fansub_lead seed | ✓ VERIFIED | Present, additive-only, reversible (up/down/up proven). |
| `backend/internal/permissions/effective_rights.go` | `GroupRightsResolution`, `ResolveGroupRights`, precedence evaluator | ✓ VERIFIED | Present; precedence order and provenance model match D01/D04. |
| `backend/internal/permissions/review_grant_provider.go` | Review Delegation as `SpecializedGrantProvider` | ✓ VERIFIED | Wraps existing `ResolveActorReviewGrantContext`; no independent decision logic (confirmed by IN-01 in REVIEW.md — a duplicated read, not a duplicated decision). |
| `backend/internal/repository/authz_user_overrides.go` | Batch-load/lock/mutate/history primitives | ✓ VERIFIED | Present, group-scoped, `DBTX`-generic. |
| `backend/internal/repository/authz_permissions.go` (extended) | Production wiring for the two optional resolver interfaces | ✓ VERIFIED | Present; closes Plan-04's documented gap. |
| `backend/internal/services/effective_rights_service.go` | Transactional `MutateOverride` | ✓ VERIFIED | Present; `Begin→...→Commit`/`Rollback` shape confirmed by direct read + test execution. |
| `backend/internal/handlers/admin_effective_rights_handler.go` | Inspection/mutation/history HTTP endpoints | ✓ VERIFIED | Present; routes registered in `admin_routes.go`; dependencies constructed in `main.go`. |
| `shared/contracts/admin-capabilities.yaml` / `openapi.yaml` | Path operations + extended `EffectiveRightState` | ✓ VERIFIED | Present; three new path operations confirmed by grep. |
| `frontend/src/types/admin-capability.ts` | TS mirror of the extended contract | ✓ VERIFIED | Present; `tsc --noEmit` clean for this file. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `CanForFansubGroup`/`canForContext` | `ResolveGroupRights` | direct call | ✓ WIRED | Confirmed at `permissions.go:467-469,692-736`. |
| `CanReviewForFansubGroup` | `ResolveGroupRights` | `groupRights.Can(action)` | ✓ WIRED | Confirmed at `permissions.go:524-536`; user-deny overrides review delegation grant (tested). |
| `AdminEffectiveRightsHandler.GetEffectiveRights` | `ResolveGroupRights` | one call per request | ✓ WIRED | Confirmed at `admin_effective_rights_handler.go:193`. |
| `AdminEffectiveRightsHandler.MutateOverride` | `EffectiveRightsService.MutateOverride` | delegated write path | ✓ WIRED | Confirmed at `admin_effective_rights_handler.go:252-260`. |
| `EffectiveRightsService.MutateOverride` | `permissions.ResolveGroupRights` (via `CanForFansubGroup`) | management-capability authorization | ✓ WIRED | Confirmed at `effective_rights_service.go:194-203`; a fresh `permissions.NewService(authz)` is built per-transaction so authorization reads the same, transaction-consistent locked state. |
| `AuthzRepository` | `permissions.GroupRightsMembershipResolver`/`GroupRightsOverridesResolver` | compile-time interface assertions | ✓ WIRED | Confirmed at `authz_permissions.go:388-391`; production `main.go` passes this same concrete type into `permissions.NewService`. |
| `main.go` route construction | `admin_routes.go` route table | `adminEffectiveRightsHandler` field | ✓ WIRED | Confirmed by grep across both files. |

### Behavioral / Real-Postgres Verification (independently executed by this verifier)

| Command | Result |
|---|---|
| `go build ./...` (team4sv30-backend) | Clean |
| `go test ./internal/permissions/... -count=1` | `ok` — all 34 tests PASS |
| `go test ./internal/services/... -count=1` | `ok` — all tests PASS (no real DSN: real-Postgres subtests skip cleanly) |
| `go test ./internal/handlers -run 'EffectiveRights|Override|BOLA|IDOR' -count=1` | All 18 Phase-137 tests PASS; only 3 unrelated pre-existing failures in the same run (`TestAnimeSegmentAssignment_UpsertOverrideRejects*`, confirmed identical when run in isolation and traced to a pre-existing, pre-Phase-137 nil-permissions-cache test-ordering gap, not caused by this phase) |
| `go test ./internal/permissions ./internal/repository ./internal/services -run 'Phase137' -count=1` against a freshly created `team4s_phase137_test_verify1` / `team4s_phase106_test_verify1` disposable database (created independently by this verifier, not reused from the executor's session) | 100% PASS, including `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `TestPhase137EffectiveRightsOverrideMutationRollsBackOnHistoryFailure`, `TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces` |
| `go test ./internal/migrations -run 'Phase137' -count=1` (fresh DB) | 100% PASS, including `TestPhase137MigrationLiveUpDownUp` |
| `npx tsc --noEmit` (team4sv30-frontend), grep for `admin-capability`/`EffectiveRight` | Zero matches — Phase-137 frontend contract type compiles cleanly |
| `git log -- database/migrations/0146_*.sql` | Only Phase-136 commits — Phase 137 never touched migration 0146 |

Disposable databases created for this verification (`team4s_phase137_test_verify1`, `team4s_phase106_test_verify1`) were dropped after use.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CAP-01 | 02, 07 | Admin sees the complete effective capability list for a user+group | ✓ SATISFIED | `GetEffectiveRights` handler + test |
| CAP-02 | 02, 04, 07 | Admin sees granting roles, direct allows/denies, decisive reason | ✓ SATISFIED | `CapabilityRightState`/`EffectiveRightState` provenance fields |
| CAP-03 | 04, 05 | Same server-side precedence in display and enforcement (deny > allow > role) | ✓ SATISFIED | Single `ResolveGroupRights` consumed by both paths |
| CAP-05 | 01, 03, 06, 07 | Admin can allow/deny one capability for one active member in one group | ✓ SATISFIED | `EffectiveRightsService.MutateOverride` |
| CAP-06 | 01, 03, 06, 07 | Mutation validates target membership/group/capability server-side, rejects neutrally | ✓ SATISFIED | `ErrEffectiveRightsTargetNotActiveMember`/`ErrEffectiveRightsActionUnknown`/`ErrEffectiveRightsActionNotOverridable` mapped to 422 |
| CAP-07 | 01, 03, 06, 07 | Grant/revoke idempotent, atomic, audited with actor/target/context/before/after | ✓ SATISFIED | Transaction shape + immutable `user_group_capability_override_history` (append-only trigger from migration 0146) |
| QUAL-03 | 01, 03, 04, 05, 06, 07, 08 | Automated negative tests cover deny precedence, cross-group overrides, invalid capabilities, BOLA/IDOR, self-review, direct-access | ✓ SATISFIED | D01-D10 matrix in 137-VALIDATION.md, independently re-run by this verifier |

Cross-checked against `.planning/REQUIREMENTS.md`: all 7 declared requirement IDs (CAP-01, CAP-02, CAP-03, CAP-05, CAP-06, CAP-07, QUAL-03) are marked `Phase 137 | Complete`, matching the phase's own declared requirement set exactly. No orphaned requirements found — every ID mapped to Phase 137 in REQUIREMENTS.md's traceability table appears in at least one plan's `requirements:` frontmatter, and vice versa.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 20 Phase-137-owned source/test files. No ASCII-substituted umlauts found in user-facing German strings across the handler, service, resolver, repository, and migration files (spot-checked `admin_effective_rights_handler.go` line-by-line — all "ä/ö/ü" correctly rendered).

The independent code review (`137-REVIEW.md`, 30 files, standard depth) found **0 critical** issues and 6 warnings / 2 info items. This verifier re-read the two most security-relevant warnings directly against the source:

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `effective_rights.go:22-38` | doc comment | Stale — claims the production-wiring gap is still open when `authz_permissions.go` closed it in Plan 05 | ⚠️ Warning | Cosmetic/misleading-for-future-maintainers only; the actual code path is correctly wired (independently confirmed above). Does not affect current correctness. |
| `admin_effective_rights_handler.go:252-305,340-372` | `MutateOverride` audit logging | Generic admin audit-log entry is written only after a second `ResolveGroupRights` re-resolution succeeds (post-commit), and 4 of 5 mutation error branches write no audit entry at all | ⚠️ Warning | Does **not** affect the immutable domain history table (`user_group_capability_override_history`), which is written atomically inside the same transaction as the mutation and is what CAP-07/D06 require — verified directly by this verifier's rollback test re-run. This is a secondary, generic-audit-log completeness gap, not a domain-audit correctness gap. Recommended follow-up, not a phase blocker. |
| `shared/contracts/admin-capabilities.yaml`/`openapi.yaml` | GET endpoint response docs | Missing documented `400` response for 2 reachable GET endpoints | ℹ️ Info-level (Warning in REVIEW.md) | Documentation completeness gap only; the handler itself correctly returns 400. |
| `phase137_postgres.go:39-51` | dead code | Two unused validator functions, no dedicated test file (unlike sibling phases) | ⚠️ Warning | Zero functional/security impact; test-support hygiene only. |
| `capability_policy_contract.go` | `CapabilityOverrideEffect` | No decode-time enum validation (unlike sibling `Reason` field) | ⚠️ Warning | Not exploitable — invalid values are rejected later in `overrideMutationKindFromRequest` before reaching the mutation service (independently confirmed by reading that function). |
| `effective_rights_service.go:80-87` | `gofmt` alignment | Formatting-only | ⚠️ Warning | Cosmetic. |

None of the review's findings represent a failed must-have or a broken security boundary; all are quality/consistency/documentation gaps on top of a correctly functioning resolver, mutation service, and HTTP boundary.

### Human Verification Required

None. Phase 137 is backend/API-only (no UI was built or claimed — confirmed by `git diff --stat` scope and by the absence of any `frontend/src/app/` or `frontend/src/components/` changes). Every roadmap success criterion is a server-side, programmatically verifiable behavior, and this verifier independently re-executed the tests proving each one rather than relying on SUMMARY/VALIDATION narration.

### Gaps Summary

No gaps found. All 5 roadmap success criteria, all cross-checked plan-level must-haves, and all 7 requirement IDs are verified against actual running code and real-Postgres test execution performed independently by this verifier (not reused from the executor's own test run). The central resolver (`ResolveGroupRights`) is confirmed to be the single decision engine for both enforcement and inspection; the "Known Gap" flagged in Plan 04's summary (production repository wiring) is confirmed closed in Plan 05's code, contrary to a stale file-level doc comment the code review already flagged as WR-01. The transactional mutation service's atomicity and rollback-on-history-failure guarantee, and the row-locking concurrency-serialization guarantee, were independently re-proven against a freshly created disposable database rather than accepted from VALIDATION.md's narration.

The 6 warnings and 2 info items from the independent code review (`137-REVIEW.md`) are legitimate but non-blocking quality gaps — none of them cause a roadmap success criterion, a must-have, or a security boundary to fail. They are noted above for visibility and should be tracked as follow-up quick-tasks, not as reasons to reopen Phase 137.

One unrelated, pre-existing documentation staleness was noticed but is out of this phase's scope: `.planning/ROADMAP.md` line 514 still reads "**Plans**: 1/8 plans executed" for Phase 137 even though the phase-status table (line 617) correctly shows "8/8 ... Complete" — a stale progress counter, not a code-truth issue, and not part of this phase's must-haves.

---

_Verified: 2026-08-21T19:47:10Z_
_Verifier: Claude (gsd-verifier)_
