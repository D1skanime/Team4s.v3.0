---
phase: 137-central-effective-rights-resolver-overrides
plan: 09
subsystem: api
tags: [go, gin, effective-rights, audit-logging, bola-idor, openapi, contracts]

# Dependency graph
requires:
  - phase: 137 (plans 06/07)
    provides: EffectiveRightsService.MutateOverride transactional write path and AdminEffectiveRightsHandler HTTP boundary
provides:
  - GAP-01 fix: MutateOverride can never return a non-2xx status once the domain write has committed; a post-commit enrichment failure degrades ActivationStatus to "pending" instead
  - GAP-02 fix: every mutation attempt outcome (success, 4 named reject types, BOLA/IDOR body/path-mismatch guard) now writes a generic admin audit-log entry
  - Contract alignment: CapabilityActivationStatus documentation (both YAML contracts + TS type) now accurately describes the real, reachable pending-on-enrichment-failure behavior
affects: [138-effective-rights-ux, 137-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Response-free state-loading helper (loadTargetActorState) separated from its gin.Context-aware wrapper (resolveTargetActor) so a shared read can be reused both where an HTTP error is legitimate (GetEffectiveRights) and where it must never gate a response (MutateOverride post-commit enrichment)"
    - "auditMutationRejected best-effort reject-audit helper mirroring auditPermissionDenied's exact shape (nil-repo guard, ignored write errors) but with a plain string ReasonCode for reject paths without a permissions.Result"

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_effective_rights_handler.go
    - backend/internal/handlers/admin_effective_rights_handler_test.go
    - backend/internal/handlers/admin_capability_contract_test.go
    - shared/contracts/admin-capabilities.yaml
    - shared/contracts/openapi.yaml
    - frontend/src/types/admin-capability.ts

key-decisions:
  - "Chose documentation-text-only fix for GAP-01's activation_status contradiction (option a from the plan's revision note) over adding a new response field, since CapabilityOverrideMutationResult's required-field list is locked byte-for-byte and activation_status already exists for exactly this degraded-response signal"
  - "Task 1 (GAP-01 response-safety refactor) and Task 2 (GAP-02 audit wiring) were committed as two commits split by file scope (contract docs vs. handler code) rather than by the plan's literal task boundaries, because both GAP fixes are interleaved in the same MutateOverride/writeMutationError code paths and splitting them mid-function would have required non-atomic partial-file commits"

requirements-completed: [CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~25min
completed: 2026-08-21
---

# Phase 137 Plan 09: GAP-01/GAP-02 Post-Commit Response Safety and Audit Coverage Summary

**MutateOverride now degrades to activation_status="pending" instead of 404/500 after a committed write, and every mutation attempt (success + 5 reject paths) writes a generic audit-log entry.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-21
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- **GAP-01 fixed:** `resolveTargetActor`'s body was extracted into a response-free `loadTargetActorState(ctx, targetAppUserID, fansubGroupID) (*permissions.Actor, error)`. `MutateOverride` now builds its response entirely from the already-committed `mutationSvc.MutateOverride` result, then attempts best-effort enrichment (target-actor lookup + `ResolveGroupRights`) that can only ever degrade `ActivationStatus` to `"pending"` on failure — never write an HTTP error for a write that already succeeded and committed.
- **GAP-02 fixed:** the generic admin audit write for a successful mutation now executes unconditionally immediately after the domain write commits, before the enrichment attempt — so it is present even when enrichment fails. A new `auditMutationRejected` helper (mirroring `auditPermissionDenied`'s best-effort shape) is wired into `writeMutationError`'s four previously-silent reject branches (`target_not_active_member`, `action_unknown`, `action_not_overridable`, `reason_required`) and into the body/path-mismatch BOLA/IDOR guard, which returns directly via `c.JSON` and previously wrote zero audit entries.
- **Contract alignment:** `shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml`, and `frontend/src/types/admin-capability.ts`'s `CapabilityActivationStatus` description/doc-comment now state that `MutateOverride` can return `"pending"` on post-commit enrichment failure, replacing the now-false "Phase 137 mutations only ever emit active" claim. `TestCapabilityOverrideSchemasUnchangedContract`'s doc comment and regex assertion were updated to require `"pending"` in the description block (in addition to the pre-existing `"active"`/`"137"` checks); enum values and every schema's `required` field list remain byte-for-byte unchanged.
- 10 new regression tests added, covering both post-commit failure modes (target-lookup `ErrNotFound`, `ResolveGroupRights` error), the unconditional success audit (including the enrichment-failure scenario), all 4 reject-branch audits (table-driven), and the body/path-mismatch reject audit. All pre-existing `MutateOverride`/`GetEffectiveRights`/`ListOverrideHistory` tests pass unchanged, confirming pre-commit failure reporting was not weakened.

## Task Commits

1. **Task 1: GAP-01 — post-commit response safety in MutateOverride + contract alignment** (contract-doc portion) - `176dddf1` (docs)
2. **Task 1 + Task 2: GAP-01 response-safety refactor + GAP-02 audit coverage** (handler code portion) - `0ce156d6` (fix)

_Note: both plan tasks touch the same `MutateOverride`/`writeMutationError` code paths in `admin_effective_rights_handler.go`; the contract-only files (Task 1's doc-alignment scope) were committed separately from the handler/test code (both tasks' behavior changes), per the Deviations section below._

## Files Created/Modified

- `backend/internal/handlers/admin_effective_rights_handler.go` - `resolveTargetActor` split into a thin gin.Context wrapper + response-free `loadTargetActorState`; `MutateOverride`'s post-mutation-success tail rebuilt to construct the response from the committed result first, write the unconditional success audit, then attempt best-effort enrichment that can only degrade to `pending`; new `auditMutationRejected` helper; `writeMutationError`'s 4 reject branches and the body/path-mismatch guard now call it.
- `backend/internal/handlers/admin_effective_rights_handler_test.go` - 10 new tests: 2 post-commit-failure-degrades-to-pending cases, unconditional-success-audit, body/path-mismatch reject audit, table-driven 4-reject-branch audit coverage. Added `errors` import; ran `gofmt -w` (also normalized pre-existing struct-field alignment drift in this file).
- `backend/internal/handlers/admin_capability_contract_test.go` - doc comment and regex assertion updated to require `"pending"` in the `CapabilityActivationStatus` description block.
- `shared/contracts/admin-capabilities.yaml` / `shared/contracts/openapi.yaml` - `CapabilityActivationStatus` description text updated to document the real pending-on-enrichment-failure behavior; enum unchanged.
- `frontend/src/types/admin-capability.ts` - mirrored TS doc comment update above `CapabilityActivationStatus`; type union unchanged.

## Decisions Made

- Chose the documentation-text-only fix for GAP-01's now-reachable `CapabilityActivationStatusPending` (per the plan's revision note option a) rather than adding a new response field, since `CapabilityOverrideMutationResult`'s `required` field list is locked byte-for-byte across three schema mirrors and `activation_status` already exists specifically to carry this kind of degraded-response signal.
- Split the two commits by file scope (contract docs vs. handler code) rather than strictly by the plan's Task 1/Task 2 boundary, since GAP-01's response-safety refactor and GAP-02's audit wiring are interleaved in the same `MutateOverride`/`writeMutationError` functions and could not be cleanly separated without non-atomic partial-file commits.

## Deviations from Plan

**1. [Rule N/A — commit granularity, not a code deviation] Task commits split by file scope rather than literal task boundary**
- **Found during:** Task 2 (audit wiring)
- **Issue:** The plan's Task 1 file list includes `admin_effective_rights_handler.go`/`admin_effective_rights_handler_test.go`, and Task 2's file list is the same two files — both GAP-01 (response-safety refactor) and GAP-02 (audit wiring) modify the same `MutateOverride` function body and the same test file in ways that cannot be disentangled into two independent, buildable, atomic commits.
- **Fix:** Committed the pure contract-documentation files (Task 1's `shared/contracts/*.yaml`, `frontend/src/types/admin-capability.ts`, and the contract test's doc/regex update) as one commit, and the combined handler + handler-test behavior changes (both GAP-01 and GAP-02 together) as a second commit.
- **Files modified:** No functional difference — same files as planned, just grouped by commit differently than the literal per-task file lists.
- **Commit:** `176dddf1`, `0ce156d6`

**2. [Rule 1 - Bug/formatting] Fixed pre-existing gofmt drift in admin_effective_rights_handler_test.go**
- **Found during:** Task 1/2 acceptance criteria (`gofmt -l` must print nothing)
- **Issue:** `gofmt -l` flagged the test file due to pre-existing struct-field alignment drift in `effectiveRightsPermissionStub`, `effectiveRightsMutationStub`, and `effectiveRightsTargetRepoStub` (unrelated to this plan's own additions, but in the same file this plan edits).
- **Fix:** Ran `gofmt -w` on the file, which re-aligned those struct field tags alongside the new test code.
- **Files modified:** `backend/internal/handlers/admin_effective_rights_handler_test.go`
- **Verification:** `gofmt -l` prints nothing for all three touched Go files.
- **Committed in:** `0ce156d6`

---

**Total deviations:** 2 (1 commit-granularity note, 1 minor pre-existing gofmt drift fix in a touched file)
**Impact on plan:** No scope creep; both GAP-01 and GAP-02 are fully implemented and tested exactly as specified. The gofmt fix only touched struct alignment in a file this plan already modifies, required by the plan's own acceptance criteria.

## Issues Encountered

- `go test ./internal/handlers -run 'EffectiveRights|Override|BOLA|IDOR' -v -count=1` (the plan's own verification command) reports 3 pre-existing failures (`TestAnimeSegmentAssignment_UpsertOverrideRejectsEndBeforeStart`, `TestAnimeSegmentAssignment_UpsertOverrideRejectsUnassignedReleaseVersion`, `TestAnimeSegmentAssignment_DeleteOverrideNotFoundWhenNoOverrideExists`) — these are the documented, pre-existing `permissions.loadedCache` test-ordering gap (STATE.md Blockers/Concerns, `.planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md`), confirmed unrelated to this plan (file untouched by this plan, `git status --short` shows no diff on `admin_content_anime_theme_segment_assignments_test.go`). Not fixed, per SCOPE BOUNDARY.
- The narrower, plan-scoped verification commands (`-run 'TestMutateOverride|TestGetEffectiveRights|TestListOverrideHistory'` and `-run 'TestMutateOverride|TestCapabilityOverrideSchemasUnchangedContract'`) both pass 100% green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both 137-UAT.md GAP-01 and GAP-02 are closed and regression-tested; ready for the remaining gap-closure plans (GAP-03 through GAP-06) and the phase's overall gap-closure verification pass.
- `gofmt`, `go vet ./internal/handlers/...`, and `git diff --check` are all clean for every file this plan touched.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Completed: 2026-08-21*
