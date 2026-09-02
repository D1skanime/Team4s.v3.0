---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 19
subsystem: fullstack
tags: [go, postgresql, pgx, react, nextjs, typescript, vitest, review-lifecycle]

# Dependency graph
requires:
  - phase: 143
    provides: "143-17's has_own_rejected_notes backend/contract pattern and 143-18's frontend badge/button unification pattern (the exact mirror-image case for notes)"
provides:
  - "has_own_media EXISTS subquery no longer counts a rejected-only media row as done, mirroring the already-fixed has_own_notes subquery"
  - "has_own_rejected_media boolean signal flowing from the repository through openapi.yaml and contributions.ts"
  - "Unified hasOwnArtifacts/needsRework logic in page.tsx treating a rejected note and rejected media identically via one OR"
affects: [dashboard, me-projects, release-review-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "has_own_media's rejection-exclusion fix uses a LEFT JOIN (not INNER) to release_version_media_review_lifecycle, mirroring has_own_notes' shape exactly, since a media row with no lifecycle row at all must still count as done."
    - "has_own_rejected_media uses an INNER JOIN (mirroring has_own_rejected_notes), since a 'rejected' state is only representable when a lifecycle row exists."
    - "Frontend needsRework/hasOwnArtifacts unify multiple artifact-type rejection signals via a single boolean OR rather than per-artifact-type precedence or separate badges."

key-files:
  created:
    - backend/internal/repository/anime_contributions_member_project_repository_has_own_media_test.go
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.rejected-artifacts.test.tsx"
  modified:
    - backend/internal/repository/anime_contributions_member_project_repository.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/contributions.ts
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"

key-decisions:
  - "has_own_media's fix uses LEFT JOIN + '(lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')', exactly mirroring has_own_notes' shape, since a media row with no lifecycle row must still count as has_own_media=true (unchanged pre-existing behavior for the non-rejected case)."
  - "has_own_rejected_media uses an INNER JOIN (not LEFT), mirroring has_own_rejected_notes -- a rejected state is only representable when a lifecycle row exists."
  - "New backend tests live in a new sibling file (..._has_own_media_test.go) reusing openMemberProjectHasOwnNotesFixture and all seed helpers from the sibling ..._has_own_notes_test.go file verbatim (same package, no import needed), since that file is already at the 450-line cap."
  - "Frontend hasOwnArtifacts/needsRework unify has_own_rejected_notes and has_own_rejected_media via one OR each, rather than introducing per-artifact-type precedence or a second badge -- per the plan's explicit requirement that a release needing rework for either or both reasons shows exactly one badge."
  - "New frontend regression tests live in a new sibling file (page.rejected-artifacts.test.tsx) replicating page.test.tsx's full module-mock/fixture setup verbatim, since page.test.tsx is already over the 450-line cap and Vitest's per-file vi.mock/vi.hoisted hoisting means none of that setup is importable across files."

patterns-established: []

requirements-completed: ["UAT-05"]

# Metrics
duration: ~20min
completed: 2026-09-02
---

# Phase 143 Plan 19: Close UAT-05 (has_own_media Rejected-Media Parity) Summary

**Fixed the exact mirror-image defect of UAT-02 for media instead of notes: `has_own_media` no longer counts a rejected-only media upload as "done", a new `has_own_rejected_media` signal flows end to end through the repository/contract/TS-type chain, and `page.tsx`'s badge/button logic now treats a rejected note and rejected media identically via one unified OR.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-02T09:35:00Z (approx.)
- **Completed:** 2026-09-02T09:39:00Z
- **Tasks:** 3 completed
- **Files modified:** 5 modified, 2 created

## Accomplishments
- `anime_contributions_member_project_repository.go`'s `has_own_media` `EXISTS` subquery gained a `LEFT JOIN` to `release_version_media_review_lifecycle` with a `review_state <> 'rejected'` exclusion, exactly mirroring the already-fixed `has_own_notes` subquery
- A new `has_own_rejected_media` `EXISTS` subquery (`INNER JOIN`, `review_state = 'rejected'`) was added alongside it, plus the matching `HasOwnRejectedMedia` struct field and `Scan` target
- 3 new proving tests in a new sibling file confirm: a rejected-only media row sets `has_own_rejected_media=true` and `has_own_media=false`; a confirmed media row sets `has_own_rejected_media=false` and keeps `has_own_media=true`; a tombstoned media row (via the pre-existing `deleted_at IS NULL` clause) sets both flags `false`
- `shared/contracts/openapi.yaml` and `frontend/src/types/contributions.ts` both declare `has_own_rejected_media` as a required boolean; `tsc --noEmit` stays clean
- `page.tsx`'s `hasOwnArtifacts`/`needsRework` now OR in `has_own_rejected_media` alongside `has_own_rejected_notes`, so a rejected-media-only release gets the identical "Überarbeitung nötig" danger badge and primary "Notizen & Medien" button as a rejected-note-only release; `isDone()`, `filterReleases()`, and the offen/erledigt counters are byte-identical to before this plan
- A new sibling test file (`page.rejected-artifacts.test.tsx`, 5 tests) covers: rejected-media-only badge/button, exactly-one-badge when both rejected signals are true, `isDone()`'s precedence over the rejected-media signal, a `has_own_media`-only regression guard, and the offen counter/filter classification — `page.test.tsx`'s 22 pre-existing tests pass unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix has_own_media exclusion and add has_own_rejected_media to the repository query, struct, and a new sibling test file** - `1a9a8d7a` (feat)
2. **Task 2: Sync the OpenAPI contract and TypeScript type** - `1e0cfe82` (docs)
3. **Task 3: Unify hasOwnArtifacts/needsRework across notes and media in page.tsx, with regression tests in a new sibling test file** - `e20b8615` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_member_project_repository.go` - `has_own_media` subquery gained a `LEFT JOIN` exclusion for rejected media; new `has_own_rejected_media` `EXISTS` subquery (`INNER JOIN`); new `HasOwnRejectedMedia` struct field and scan target
- `backend/internal/repository/anime_contributions_member_project_repository_has_own_media_test.go` (new) - two seed helpers (`seedPhase143ReleaseVersionMedia`, `seedPhase143MediaReviewLifecycle`) plus 3 proving tests, reusing the sibling notes-test file's fixture/helpers with fresh 117xxx/118xxx/119xxx ID ranges
- `shared/contracts/openapi.yaml` - `MeProjectReleaseVersion.required` gained `has_own_rejected_media`; new `has_own_rejected_media: { type: boolean }` property
- `frontend/src/types/contributions.ts` - `MeProjectReleaseVersion` interface gained `has_own_rejected_media: boolean;`
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - `makeRelease`'s default object gained `has_own_rejected_media: overrides.has_own_rejected_media ?? false,` (exactly one line added, per plan)
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - `hasOwnArtifacts` and `needsRework` now also OR in `release.has_own_rejected_media`
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.rejected-artifacts.test.tsx` (new) - 5 regression tests for the unified rejected-artifact rendering behavior

## Decisions Made
- Used a `LEFT JOIN` (not `INNER`) for `has_own_media`'s rejection-exclusion fix, mirroring `has_own_notes` exactly, so a media row with no lifecycle row at all still counts as `has_own_media=true` (unchanged pre-existing behavior).
- Used an `INNER JOIN` for `has_own_rejected_media`, mirroring `has_own_rejected_notes`, since a rejected state is only representable when a lifecycle row exists.
- Reused the sibling `..._has_own_notes_test.go` file's fixture and seed helpers verbatim rather than duplicating schema setup, per the plan's explicit instruction and the 450-line cap already hit by that file.
- Frontend badge/button logic unifies both artifact types' rejection signals via a single boolean OR (no per-artifact-type precedence, no second badge), per the plan's explicit requirement.
- New regression tests for both backend and frontend live in new sibling files rather than growing already-at-cap files (`..._has_own_notes_test.go` at 455 lines, `page.test.tsx` at 510 lines before this plan).

## Deviations from Plan

None - plan executed exactly as written. Backend files required the same `docker compose cp` sync workaround already documented in 143-17's SUMMARY (the backend container has no live source bind-mount); this is an operational workaround, not a deviation in behavior, and did not require its own commit since the synced content matched the host files exactly.

## Issues Encountered
None beyond the pre-known backend container file-sync gap (worked around via `docker compose cp`, matching prior plans in this phase).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT-05 is now fully closed end to end: the repository fix, contract sync, and frontend unification all landed in this single combined plan.
- This closes the gap-closure work for Phase 143's re-verification finding (has_own_media parity). No further plans are known to be pending in this phase as of this plan's completion; check `.planning/phases/143-.../143-UAT.md` and `STATE.md` for the phase's overall closure status.
- No blockers.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: backend/internal/repository/anime_contributions_member_project_repository_has_own_media_test.go
- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.rejected-artifacts.test.tsx
- FOUND: backend/internal/repository/anime_contributions_member_project_repository.go
- FOUND: shared/contracts/openapi.yaml
- FOUND: frontend/src/types/contributions.ts
- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
- FOUND commit: 1a9a8d7a
- FOUND commit: 1e0cfe82
- FOUND commit: e20b8615
