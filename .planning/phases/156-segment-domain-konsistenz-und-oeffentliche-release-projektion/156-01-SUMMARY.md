---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 01
subsystem: database
tags: [postgresql, migrations, go, permissions, theme-segments]

# Dependency graph
requires: []
provides:
  - "theme_segments.origin_release_version_id column (nullable, correctable FK to release_versions, ON DELETE SET NULL) with deterministic assignment-based backfill"
  - "permissions.SegmentCreditRoleCodes -- the single central definition of segment-relevant contributor role codes ({translator, timer, karaoke_fx, typesetter}, excluding encoder/quality_checker)"
affects: [156-04, 156-05, 156-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nullable BIGINT FK with ON DELETE SET NULL for correctable-but-never-destructive origin references (mirrors 0131's house style)"
    - "DISTINCT ON + ORDER BY deterministic backfill for one-canonical-row-per-parent derivation (mirrors 0141's pattern)"

key-files:
  created:
    - database/migrations/0161_theme_segments_origin_release_version.up.sql
    - database/migrations/0161_theme_segments_origin_release_version.down.sql
    - backend/internal/permissions/segment_credit_roles_test.go
  modified:
    - backend/internal/permissions/permissions.go

key-decisions:
  - "origin_release_version_id uses ON DELETE SET NULL (not CASCADE) so a deleted release version never deletes the segment -- origin is correctable, not an immutable snapshot"
  - "SegmentCreditRoleCodes lives in backend/internal/permissions (domain/permissions neighborhood), not in a repository, handler, or the frontend, per 156-CONTEXT.md's explicit single-location requirement"

patterns-established:
  - "Segment-origin backfill: lowest resolved episode (COALESCE(sort_index, episode_number::int)) among a segment's existing theme_segment_assignments rows; zero-assignment segments stay NULL by construction ('Origin nicht bestimmt', not an error)"

requirements-completed: [P156-05, P156-08, P156-09]

# Metrics
duration: 8min
completed: 2026-09-11
---

# Phase 156 Plan 01: Segment-Origin Migration and Central Credit Role Catalog Summary

**Migration 0161 adds a nullable, admin-correctable `theme_segments.origin_release_version_id` column with a deterministic assignment-based backfill, and `permissions.SegmentCreditRoleCodes` becomes the single central definition of segment-relevant contributor roles, replacing the label-substring heuristic used elsewhere in the codebase.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-11T20:05:00Z
- **Completed:** 2026-09-11T20:07:32Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 new SQL, 1 new Go test, 1 modified Go source)

## Accomplishments
- `theme_segments.origin_release_version_id` schema column + index shipped, migrated up/down/up cleanly against the live `team4s_v2` dev database, and backfilled correctly (3/3 existing segments, all with assignments, all got non-NULL origins matching the deterministic lowest-resolved-episode rule)
- `permissions.SegmentCreditRoleCodes` = `{translator, timer, karaoke_fx, typesetter}` now exists as the one central, Go-code-referenced catalog of segment-relevant role codes, explicitly excluding `encoder` and `quality_checker`
- Full RED/GREEN TDD cycle for Task 2: test written and confirmed to fail to compile (constants undefined), then constants + var added and the same test suite passed

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0161 -- origin_release_version_id column, index, deterministic backfill** - `264cb657` (feat)
2. **Task 2 (RED): failing test for SegmentCreditRoleCodes** - `bd4e61cf` (test)
2. **Task 2 (GREEN): central SegmentCreditRoleCodes catalog** - `438af16b` (feat)

**Plan metadata:** (this commit) `docs(156-01): complete plan`

## Files Created/Modified
- `database/migrations/0161_theme_segments_origin_release_version.up.sql` - adds nullable `origin_release_version_id` BIGINT FK (ON DELETE SET NULL) + index, plus a stats-`RAISE NOTICE` block and the deterministic backfill
- `database/migrations/0161_theme_segments_origin_release_version.down.sql` - drops the column (index drops automatically with it)
- `backend/internal/permissions/segment_credit_roles_test.go` - table-driven test proving exact membership, explicit exclusion of encoder/quality_checker, and exact constant string values
- `backend/internal/permissions/permissions.go` - added `RoleTranslator`, `RoleTypesetter`, `RoleKaraokeFX` constants and the exported `SegmentCreditRoleCodes` var with a doc comment documenting the single-location requirement

## Decisions Made
- Followed the plan's prescribed migration shape (0143 analog for the column, 0141 analog for the backfill pattern) and the plan's prescribed catalog location (permissions.go, immediately after the existing role-code constant block) exactly as specified in `156-01-PLAN.md`. No architectural deviations were needed.

## Deviations from Plan

None — plan executed exactly as written. Both artifacts match the plan's `must_haves.truths` and `must_haves.artifacts` verbatim.

## Known Pre-Existing Debt (not introduced by this plan, flagged per CLAUDE.md's 450-line rule)

`backend/internal/permissions/permissions.go` was already 930 lines before this plan touched it (confirmed via `git show HEAD~1:.../permissions.go | wc -l`). This plan's Task 2 added 15 lines (3 constants + 1 documented var), consistent with 156-01-PLAN.md's explicit instruction to add these to this exact file and *not* touch the commented-out `roleMatrix` block or split the file. CLAUDE.md's 450-line cap applies to changes that would *push* a file over the limit; this file was already ~2x over before this plan's tiny, targeted addition, and splitting a 930-line pre-existing permissions module is a distinct architectural undertaking outside a 2-task, 8-minute plan's scope. This mirrors the accepted precedent for `MemberBadgeChain.tsx` documented in Phase 133 (`.planning/PROJECT.md` Decisions). Not fixed here; flagged for a future dedicated remediation pass, not blocking this plan's completion.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Migration 0161 was applied directly against the live `team4sv30-db` dev container as part of this plan's verification (not deferred to the user).

## Next Phase Readiness
- Plan 156-04 (segment-origin admin correction path) can now read/write `theme_segments.origin_release_version_id` and validate against `theme_segment_assignments`.
- Plans 156-05/156-07 (dynamic segment-credit projection) can now import `permissions.SegmentCreditRoleCodes` by name to filter `loadPublicEffectiveContributors`'s role-code output, replacing the `strings.Contains(label, "kara")` heuristic in `release_detail_public_repository_helpers.go`.
- No blockers identified for downstream plans.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*
