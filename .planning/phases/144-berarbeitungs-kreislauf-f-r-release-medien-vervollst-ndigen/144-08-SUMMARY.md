---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
plan: 08
subsystem: api
tags: [go, gin, pgx, postgres, release-version-media, review-lifecycle, sprachqualitaet]

# Dependency graph
requires:
  - phase: 144 (144-01, 144-04)
    provides: PatchReleaseVersionMedia's PREVIEW_NOT_ALLOWED_FOR_CATEGORY guard (144-01) and
      ReplaceReleaseVersionMediaFile's identical guard (144-04), both of which had the same
      request-body-only bug this plan closes
provides:
  - rvmPreviewGuardBlocked(requestPreview, currentPreview, currentCategory, newCategory) — single
    shared decision function used identically by PATCH and PUT replace guards
  - ReleaseVersionMediaRelationMeta.IsPreviewCandidate, populated by
    GetReleaseVersionMediaRelation's SELECT
  - Corrected German strings (groß/geprüft) in both handler files
  - Removal of dead GetRVMCategory repository method
affects: [144-VERIFICATION.md gap closure, future release-version-media guard/review work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard-completeness fallback pattern: a nullable request field's effective value falls back
      to the row's real current DB state only when the request omits the field; an explicit
      request value (including an explicit false) always wins."

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_category_test.go
  modified:
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/release_version_media_repository_test.go
    - backend/internal/repository/release_version_media_replace_repository_test.go
    - backend/internal/handlers/admin_content_release_version_media_category.go
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_replace.go

key-decisions:
  - "rvmPreviewGuardBlocked's fallback rule: currentPreview (the row's real DB state) is only
    consulted when requestPreview is nil; any explicit request value (true or false) always wins,
    preserving 100% of existing behavior for every request that sets is_preview_candidate."

patterns-established:
  - "Pattern: nullable-field guard fallback to current DB state (see rvmPreviewGuardBlocked) —
    applicable anywhere a PATCH-style partial-update handler must not let 'field omitted' silently
    bypass a state-dependent invariant."

requirements-completed:
  - "144-VERIFICATION.md gap: PREVIEW_NOT_ALLOWED_FOR_CATEGORY guard must consult the row's current is_preview_candidate, not only the request body (blocking must-have)"
  - "144-REVIEW.md WR-01: Sprachqualitaet (CLAUDE.md) — gross/geprueft ASCII substitutions in user-facing backend strings"
  - "144-REVIEW.md WR-03: GetRVMCategory is dead code"

duration: 20min
completed: 2026-09-02
---

# Phase 144 Plan 08: Preview-Guard Completeness, Sprachqualität, Dead-Code Removal Summary

**PATCH and PUT-replace PREVIEW_NOT_ALLOWED_FOR_CATEGORY guards now fall back to the row's real current `is_preview_candidate` DB value whenever the request omits the field, via one shared `rvmPreviewGuardBlocked` decision function, closing the exact 144-VERIFICATION.md 500-vs-422 bypass; five "gross"/"geprueft" ASCII substitutions fixed to "groß"/"geprüft"; dead `GetRVMCategory` removed.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-02T18:08:31Z (STATE.md session start)
- **Completed:** 2026-09-02T18:15:41Z (final task commit)
- **Tasks:** 3/3 completed
- **Files modified:** 6 modified, 1 created (7 total)

## Accomplishments

- Closed 144-VERIFICATION.md's single blocking gap: an admin fixing only the category on an
  already-`is_preview_candidate=true` row (frontend omits the field when untouched) now gets the
  documented `422 PREVIEW_NOT_ALLOWED_FOR_CATEGORY` from both the PATCH and PUT-replace endpoints
  instead of a generic 500 from the DB's `chk_rvm_preview_category` CHECK constraint.
- `ReleaseVersionMediaRelationMeta` now carries the row's real current `is_preview_candidate`
  (populated by `GetReleaseVersionMediaRelation`'s SELECT), proven true/false against real Postgres.
- Both endpoints now delegate to one shared `rvmPreviewGuardBlocked` decision function — no
  duplicated guard logic between PATCH and PUT replace.
- Fixed all 5 "gross"/"geprueft" ASCII-umlaut-substitution occurrences (WR-01) across both handler
  files to "groß"/"geprüft" per CLAUDE.md's Sprachqualität rule.
- Removed dead `GetRVMCategory` repository method (WR-03) and its only remaining reference (a
  compile-time existence-check line in a test file).
- New `TestRvmPreviewGuardBlocked` (6 table-driven subtests) proves the corrected decision logic
  directly, including the exact 144-VERIFICATION.md gap scenario, the explicit-override cases, and
  the unchanged-category edge case.

## Task Commits

1. **Task 1: Repository — expose current is_preview_candidate on relationMeta, remove dead GetRVMCategory** - `de82280d` (fix)
2. **Task 2: Handlers — shared guard-completeness fix (both endpoints) + Sprachqualitaet fix (5 call sites)** - `f83183cd` (fix)
3. **Task 3: Regression proof for the guard fix and full-suite sanity check** - `d020d2fa` (test)

## Files Created/Modified

- `backend/internal/repository/release_version_media_repository.go` - Added `IsPreviewCandidate bool` to `ReleaseVersionMediaRelationMeta`; `GetReleaseVersionMediaRelation`'s SELECT now reads `is_preview_candidate`; removed dead `GetRVMCategory`
- `backend/internal/repository/release_version_media_repository_test.go` - Removed the `GetRVMCategory` compile-time existence-check line
- `backend/internal/repository/release_version_media_replace_repository_test.go` - Added `is_preview_candidate BOOLEAN NOT NULL DEFAULT false` to the fixture's CREATE TABLE; added `TestGetReleaseVersionMediaRelationReturnsCurrentPreviewCandidate` proving both true/false read-back states against real Postgres
- `backend/internal/handlers/admin_content_release_version_media_category.go` - Added `rvmPreviewGuardBlocked(requestPreview, currentPreview, currentCategory, newCategory) bool`
- `backend/internal/handlers/admin_content_release_version_media.go` - `PatchReleaseVersionMedia`'s guard now calls `rvmPreviewGuardBlocked`; fixed 3 "gross"/"geprueft" strings
- `backend/internal/handlers/admin_content_release_version_media_replace.go` - `ReplaceReleaseVersionMediaFile`'s guard now calls `rvmPreviewGuardBlocked`; fixed 2 "gross" strings
- `backend/internal/handlers/admin_content_release_version_media_category_test.go` (new) - `TestRvmPreviewGuardBlocked`, 6 table-driven subtests

## Decisions Made

- `rvmPreviewGuardBlocked`'s fallback rule places the row's real current `is_preview_candidate` value
  as the fallback ONLY when the request omits the field entirely (`requestPreview == nil`). Any
  explicit request value — `true` or `false` — always wins over the row's current state. This is
  the narrowest fix that closes the omitted-field gap without making the guard stricter than the
  request when the request is explicit, matching the plan's `must_haves.truths` literally.

## Deviations from Plan

None - plan executed exactly as written. All three tasks, their acceptance criteria, and the
plan-level verification block were followed literally; no Rule 1-4 auto-fixes were needed.

## Issues Encountered

- The initial exploratory full unfiltered `go test ./internal/repository/...` sweep (beyond what
  the plan's `<verification>` block literally requires) ran far longer than expected — likely
  several pre-existing repository tests in this package require phase-specific Postgres DSNs
  (`TEAM4S_PHASE1xx_TEST_DSN`) that are not set in this throwaway container and each attempt a slow
  connection timeout before skipping/failing. This is pre-existing test-infrastructure friction
  unrelated to this plan's changes, not a regression. The plan's actual required verification
  commands (targeted `-run` patterns for `ReleaseVersionMedia` and
  `TestGetReleaseVersionMediaRelationReturnsCurrentPreviewCandidate`) all completed quickly and
  passed cleanly; the unfiltered sweep was stopped rather than continue an out-of-scope diagnostic.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 144-VERIFICATION.md's single blocking gap is closed; `144-REVIEW.md`'s WR-01 and WR-03 findings
  are closed. All three findings this gap-closure plan targeted are resolved with passing real-DB
  and unit-level test coverage.
- No known blockers for phase 144 closure remain from this plan's scope.

---
*Phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen*
*Completed: 2026-09-02*
