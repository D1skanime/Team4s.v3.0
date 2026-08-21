---
phase: 137-central-effective-rights-resolver-overrides
plan: 08
subsystem: testing
tags: [go, postgres, authorization, capability-overrides, negative-security-testing, validation]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 01
    provides: Migration 0150 (management capability + ten-action pilot user_overridable=true set)
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 04
    provides: permissions.GroupRightsResolution/ResolveGroupRights D01 precedence engine
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 06
    provides: services.EffectiveRightsService.MutateOverride D06/D07/D08 transactional write path
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 07
    provides: AdminEffectiveRightsHandler (inspection/mutation/history HTTP boundary)
provides:
  - Two closed D01-D10 negative-matrix coverage holes (self-modification without management capability; platform-admin bypass at the mutation/service boundary), proven against real Postgres
  - .planning/phases/137-central-effective-rights-resolver-overrides/137-VALIDATION.md — full command/results evidence, D01-D10 matrix-to-test traceability table, six-bucket pre-existing-failure triage (65 tests), and explicit non-functional invariant checks
affects: [138]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closing-plan triage pattern: cross-check every failing test name against the phase's own full diff-stat (git diff --stat <first-phase-commit>~1..HEAD) plus prior plans' documented deferred-items, bucket by root cause, and prove the failing-test set is byte-identical with vs. without the phase's own real-Postgres DSN supplied."

key-files:
  created:
    - .planning/phases/137-central-effective-rights-resolver-overrides/137-VALIDATION.md
  modified:
    - backend/internal/services/effective_rights_service_test.go

key-decisions:
  - "Supplied a real TEAM4S_PHASE137_TEST_DSN (disposable team4s_phase137_test_08 database, created and dropped for this session) for both the focused and full go test ./... runs, rather than accepting SKIP-guarded Phase-137 real-Postgres tests as sufficient closing evidence -- this is the phase's own closing validation plan, so its own tests should run for real, not skip."
  - "Two genuine D01-D10 matrix coverage holes were identified by literally re-reading 137-CONTEXT.md Section 7 row-by-row against every existing Phase-137 test function name, not by re-running the tests and looking for red: 'self-modification without management capability -> blocked' (137-06's authorization tests only proved capability-denial for a different-user target, never a self target) and 'Platform-Admin path -- separately verified' at the mutation/service boundary (D07 explicitly promises a non-deniable platform-admin bypass for override management, but no test exercised MutateOverride with an IsPlatformAdmin actor). Both were closed with minimal, non-duplicate additions to the existing TestPhase137EffectiveRightsOverrideMutationAuthorization subtest table."
  - "All 65 non-Phase-137 test failures across internal/repository/internal/handlers/internal/migrations were triaged into six root-cause buckets (missing TEAM4S_PHASE128_TEST_DSN/TEAM4S_PHASE134_MIGRATION_DSN env vars; an unreachable live UAT-matrix server on port 18093; one unrelated pre-existing assertion failure; the documented internal/handlers nil-permissions-cache gap; one unrelated source-inspection naming-drift failure) rather than accepted as an unexamined blanket 'pre-existing' claim -- every bucket's test-name list sums to exactly 65, and none of the 65 failing tests live in any of the 31 files Phase 137's own commits touched."

patterns-established:
  - "Cross-reference a phase-closing validation plan's own pre-existing-failure claims against the phase's full git diff --stat range, not just the most recent plan's summary, to make the 'not caused by this phase' claim independently re-derivable rather than trusted on faith."

requirements-completed: [CAP-01, CAP-02, CAP-03, CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~20min
completed: 2026-08-21
---

# Phase 137 Plan 08: Closing Cross-Layer Validation Summary

**Closed the last two D01-D10 negative-security-matrix coverage holes (self-mutation without capability; platform-admin bypass at the mutation boundary) and produced 137-VALIDATION.md: full command/results evidence proving internal/permissions and internal/services are 100% green against real Postgres, with all 65 remaining failures elsewhere in the backend triaged into six pre-existing, Phase-137-unrelated buckets.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-21 (following 137-07)
- **Completed:** 2026-08-21T19:34:00Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 test file extended, 1 new validation doc)

## Accomplishments

- Re-read `137-CONTEXT.md` Section 7's full 24-row negative security matrix against every existing Phase-137 test function name across `effective_rights_test.go`, `effective_rights_service_test.go`, `effective_rights_concurrency_test.go`, and `admin_effective_rights_handler_test.go`, and found exactly two genuine, non-duplicate coverage holes.
- Added `self_mutation_denied_without_capability` to `TestPhase137EffectiveRightsOverrideMutationAuthorization`: app_user 12 (no group roles, active membership) attempting to mutate its own override is denied with `ErrEffectiveRightsCapabilityDenied`, closing the matrix row 137-06 only proved for a different-user target.
- Added `platform_admin_bypasses_group_management_capability`: a platform-admin actor with zero group roles/membership can still mutate an override in that group via the resolver's non-deniable bypass, proving D07's explicit text ("Platform Admin may manage them through the non-deniable global bypass") at the mutation/service boundary, not just the resolver read path.
- Extended the existing `self_mutation_allowed_via_capability_not_special_casing` test with an explicit history-row-count assertion, closing the "audited" half of "self-modification with legitimate management capability | allowed, audited".
- Ran the full backend suite (`go test ./...`) against a real disposable `team4s_phase137_test_08` Postgres database (`TEAM4S_PHASE137_TEST_DSN` supplied) so every Phase-137 real-Postgres test executed for real rather than skipping: `internal/permissions` and `internal/services` are both fully green.
- Triaged all 65 failures elsewhere in the backend (`internal/repository`, `internal/handlers`, `internal/migrations`) into six root-cause buckets (missing `TEAM4S_PHASE128_TEST_DSN`/`TEAM4S_PHASE134_MIGRATION_DSN` env vars, an unreachable live UAT-matrix server on port 18093, one unrelated pre-existing assertion failure, the documented `internal/handlers` nil-permissions-cache gap, one unrelated naming-drift failure), verified none live in any of Phase 137's own 31 touched files, and confirmed the failing-test set is byte-identical whether or not `TEAM4S_PHASE137_TEST_DSN` is supplied.
- Confirmed `git diff --check`, `go build ./...`, `go vet ./...` clean; the frontend `admin-capability.ts` contract type compiles cleanly under `tsc --noEmit` (zero `admin-capability`/`EffectiveRight` errors); the one `npm test -- --run src/types` failure (`v12-projection-contract.test.ts`'s `PublicMemberBadge` tier enum) is byte-identical to the pre-Phase-137 baseline file.
- Verified the explicit non-functional invariants by source inspection: no per-capability SQL loop, no inspector N+1, no second review-decision engine, no Redis/process-wide cache, no Phase-138 UI file touched, migration 0146 last touched only by Phase-136 commits.
- Wrote `137-VALIDATION.md` with the full command/results evidence, the D01-D10 matrix-to-test traceability table, the six-bucket failure triage, and the non-functional invariant checklist.

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete the cross-layer negative and compatibility matrix** - `d497329e` (test) - GREEN confirmed against real Postgres (`TEAM4S_PHASE137_TEST_DSN`): both new subtests pass immediately (proving the existing production code already implements both behaviors correctly; only test coverage was missing), full focused matrix re-run shows the identical pre-existing 65-failure set as before the edit (only timing differs), `git diff --check`/`go vet` clean.
2. **Task 2: Run full backend/contract gate and document validation** - `593f97c9` (docs) - `go test ./...` (real Postgres), frontend `npm test -- --run src/types`, `tsc --noEmit`, `git diff --check` all run and recorded in `137-VALIDATION.md`.

## Files Created/Modified

- `backend/internal/services/effective_rights_service_test.go` - Two new subtests closing the last two D01-D10 negative-matrix coverage holes; one extended assertion (audit history) on an existing subtest; `gofmt -w` applied (pre-existing alignment drift in the file, unrelated to this change).
- `.planning/phases/137-central-effective-rights-resolver-overrides/137-VALIDATION.md` - New: full command/results evidence, D01-D10 matrix traceability table, six-bucket pre-existing-failure triage (65 tests accounted for), non-functional invariant checklist, and closing conclusion.

## Decisions Made

See `key-decisions` in the frontmatter for full rationale on: supplying a real Phase-137 test DSN for closing evidence rather than accepting skip-guarded coverage, how the two genuine matrix gaps were identified (row-by-row re-reading, not red-test hunting), and the six-bucket triage methodology.

## Deviations from Plan

None beyond the plan's own explicitly anticipated actions (the plan's Task 1 action text says "Fill any coverage holes discovered after Plans 01-07" and Task 2's action text says "Record concise command/results and any intentionally deferred Phase-138 concerns" — both closing-plan test additions and the validation document are exactly what the plan asked for, not unplanned scope).

## Known Stubs

None — this plan is pure test-coverage and validation-documentation work; no application code, no UI, no partial data wiring.

## Threat Flags

None — no new network endpoint, auth path, schema change, or trust-boundary surface was introduced. Both new tests exercise existing, already-shipped production authorization code paths (`EffectiveRightsService.MutateOverride`'s D07 authorization check) with new input combinations; they do not add new behavior.

## Issues Encountered

The first draft of the platform-admin mutation test failed with a Postgres foreign-key violation (`user_group_capability_overrides_created_by_app_user_id_fkey`) because the chosen platform-admin actor ID (900) did not exist in the fixture's `app_users` table (the `created_by_app_user_id`/`updated_by_app_user_id` columns carry a real FK). Fixed by inserting a real `app_users` row for id 900 inline in the subtest before invoking `MutateOverride` — a one-line, test-fixture-local addition, not a production code change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 137 is implementation-complete at the backend/API boundary: one central resolver (`permissions.ResolveGroupRights`) is the sole decision engine for every production enforcement entry point and the effective-rights inspection endpoint; per-user overrides are atomically mutated, audited, and BOLA/IDOR-hardened end-to-end against real PostgreSQL; the complete D01-D10 negative security matrix from `137-CONTEXT.md` now passes through the resolver, service, and HTTP layers with zero remaining coverage holes.
- Phase 138 (the admin UI) can build directly on `GET .../effective-rights`, `PUT .../capability-overrides`, and `GET .../capability-overrides/history` against the already-locked `EffectiveRightState`/`CapabilityOverrideMutationRequest`/`CapabilityOverrideMutationResult`/`CapabilityOverrideAuditItem` DTOs — no further backend contract work is needed for the inspection/mutation/history surface itself.
- The pre-existing `internal/handlers` nil-permissions-cache test-ordering gap (bucket E, 23 of the 65 failures) remains open, unrelated to Phase 137, and is recommended in `137-VALIDATION.md` and `deferred-items.md` as a small, dedicated future quick-task (a package-level `TestMain` mirroring `internal/repository/testmain_test.go`'s existing precedent) — not required before Phase 138 begins.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 08*
*Completed: 2026-08-21*

## Self-Check: PASSED

Both created files verified present on disk (`137-VALIDATION.md`, this summary); both
task commit hashes (`d497329e`, `593f97c9`) verified present in `git log`.
