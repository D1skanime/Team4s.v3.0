---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 02
subsystem: ui
tags: [go, pgx, nextjs, typescript, vitest, segments, migration]

# Dependency graph
requires:
  - phase: 176-01
    provides: completed Member-Group-Story Altlast removal (no functional dependency, same phase/sequencing)
provides:
  - "theme_types.kuerzel (Migration 0179), seeded OP/ED/IN/OUT for ids 4/6/8/9"
  - "AdminThemeSegment.ThemeTypeKuerzel (Go) / theme_type_kuerzel (TS) end-to-end through the segment API"
  - "DB-driven (not name-guessed) segment badge/color/upper-spur derivation in SegmenteTab.helpers.tsx"
affects: [admin-episode-versions-edit, segment-editor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed enum-like DB column (theme_types.kuerzel) as the single source of truth for UI badge classification, replacing name-guessing on a free-text display column -- analogous to Migration 0171's fansub_groups.kuerzel pattern"

key-files:
  created:
    - database/migrations/0179_theme_types_kuerzel.up.sql
    - database/migrations/0179_theme_types_kuerzel.down.sql
    - .planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/deferred-items.md
    - backend/internal/repository/theme_segment_assignment_slots_outro_kuerzel_integration_test.go
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content_anime_segments_crud.go
    - backend/internal/repository/admin_content_anime_themes_core.go
    - backend/internal/repository/episode_import_repository_release_autoassign.go
    - backend/internal/repository/group_repository_cursor_timeline.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/theme_segment_assignment_slots.go
    - backend/internal/repository/theme_segment_type.go
    - backend/internal/testsupport/phase117_postgres.go
    - frontend/src/types/admin.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx

key-decisions:
  - "Rewrote getTypeBadgeClass/getTypeBadgeLabel/getTypeColor/isUpperSpur to switch on the exact kuerzel value (OP/ED/IN/OUT) rather than keep a .toUpperCase().includes() fallback, per the plan's must_haves.truths; this required rewriting most of the pre-existing getTypeBadgeLabel test cases (display-name-style inputs no longer apply once the function only receives real kuerzel values), beyond the single Outro assertion the plan's action text called out explicitly"
  - "Updated SegmentsListSection.tsx (not in the plan's files_modified list) to pass theme_type_kuerzel instead of theme_type_name -- it is a second production caller of the same shared helpers in SegmenteTab.helpers.tsx and would otherwise keep using the old, now name-guessing-free function incorrectly (Rule 3 - blocking/correctness fix)"
  - "Live-UAT checkpoint fix (2026-10-07, Rule 1): the backend still derived segment type from theme_types.name via substring-guessing (CanonicalSegmentType), which mapped Outro onto the ED slot and caused a real 409 on save. Added CanonicalSegmentTypeFromKuerzel and routed every backend classification call site through it; per the user's binding decision, OP/ED/OUT are each their own exclusive per-release-version slot while IN stays unrestricted"

requirements-completed: []

# Metrics
duration: ~19min (Tasks 1-2) + ~45min (Live-UAT checkpoint fix round)
completed: 2026-10-07
---

# Phase 176 Plan 02: Theme-Segment-Badge aus DB-Kuerzel Summary

**theme_types.kuerzel (Migration 0179) ersetzt Name-Guessing fuer OP/ED/IN/OUT-Segment-Badges durchgaengig von DB ueber Go/JSON bis zur React-Badge-Logik; toter segmenteTabUtils.ts-Code entfernt.**

## Performance

- **Duration:** ~19 min (Tasks 1-2)
- **Started:** 2026-10-07T13:10:26Z
- **Completed:** 2026-10-07T13:28:48Z (Tasks 1-2; Task 3 checkpoint still open)
- **Tasks:** 3 of 3 completed (Task 3's blocking human-verify checkpoint approved 2026-10-07)
- **Files modified:** 13 (4 backend/migration, 9 frontend/test)

## Accomplishments

- `theme_types.kuerzel VARCHAR(8)` added and seeded (OP/ED/IN/OUT for ids 4/6/8/9) via Migration 0179, applied against the live dev DB and verified with a direct `psql` query
- `AdminThemeSegment.ThemeTypeKuerzel` (Go) / `theme_type_kuerzel` (TS) now flow end to end: all 3 segment SELECT/Scan sites in `admin_content_anime_segments_crud.go`, through the unchanged JSON-passthrough handlers, into the frontend type
- `SegmenteTab.helpers.tsx`'s `getTypeBadgeClass`/`getTypeBadgeLabel`/`getTypeColor`/`isUpperSpur` now switch on the exact `kuerzel` value instead of `.toUpperCase().includes(...)` guessing on `theme_type_name`; both internal call sites (`SegmentTimeline`, `UntimedSegmentList`) and the second production caller (`SegmentsListSection.tsx`) updated to pass `theme_type_kuerzel`
- Dead `segmenteTabUtils.ts` deleted (zero production importers, confirmed via grep both before and after); `SegmenteTab.test.tsx` repoints its imports to the live `SegmenteTab.helpers` equivalents
- The stale `Outro -> "PV"` test assertion is corrected to `"OUT"` (the deliberate D-01 behavior fix, not a green-bend)

## Task Commits

1. **Task 1: Add theme_types.kuerzel and wire it through the segment repository/model** - `d1672bd7` (feat)
2. **Task 2: Switch SegmenteTab badge/color/spur derivation to the DB kuerzel and delete the dead utils file** - `81d7e491` (feat)
3. **Live-UAT checkpoint fix: give Outro its own backend slot, derive segment type from kuerzel** - `5f8966b4` (fix, Rule 1 deviation)

**Plan metadata commit:** follows this SUMMARY commit, per sequential-executor protocol.

_Task 3 ("Checkpoint: Live-UAT segment badge labels (D-01)") is a blocking `checkpoint:human-verify` gate. It was first presented after Tasks 1-2 and returned NOT approved with a real defect (see Deviations below); the fix was committed and the checkpoint was re-presented — the user approved it on 2026-10-07 (see "Checkpoint Approval" above)._

## Files Created/Modified

- `database/migrations/0179_theme_types_kuerzel.up.sql` - adds `theme_types.kuerzel`, seeds OP/ED/IN/OUT for ids 4/6/8/9
- `database/migrations/0179_theme_types_kuerzel.down.sql` - drops the column
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegment.ThemeTypeKuerzel string \`json:"theme_type_kuerzel"\``
- `backend/internal/repository/admin_content_anime_segments_crud.go` - 3 SELECT/Scan sites (`ListAnimeSegments`, `loadSegmentByID`, `ListAnimeSegmentSuggestions`) extended with `tt.kuerzel AS theme_type_kuerzel`
- `frontend/src/types/admin.ts` - `AdminThemeSegment.theme_type_kuerzel: string`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` - badge/color/spur helpers rewritten to exact-match on kuerzel; internal call sites updated
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx` - 2 call sites updated to pass `theme_type_kuerzel` (deviation, see below)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts` - deleted (dead code)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - import repoint, `calcDuration` tests removed, `getTypeBadgeLabel`/`resolveSourceLabel` assertions corrected, `makeSegment()` fixture gains `theme_type_kuerzel`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.assignment-conflicts.test.tsx` - local `segment()` fixture gains `theme_type_kuerzel`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImageSection.test.tsx` - local `segment()` fixture gains `theme_type_kuerzel`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.test.ts` - local `segment()` fixture gains `theme_type_kuerzel`
- `.planning/phases/176-.../deferred-items.md` - logs 6 unrelated, pre-existing frontend test failures discovered while running the full suite

**Live-UAT checkpoint fix round (commit `5f8966b4`):**

- `backend/internal/repository/theme_segment_type.go` - adds `CanonicalSegmentTypeFromKuerzel(kuerzel, themeTypeName string) string`, the new kuerzel-driven classifier (OP/ED/IN->INSERT/OUT, falling back to the legacy `CanonicalSegmentType` name-guess when kuerzel is unset)
- `backend/internal/repository/theme_segment_assignment_slots.go` - `segmentAssignmentSlotType` now takes `(kuerzel, name string)` and returns OP/ED/OUT as independent slots (previously only OP/ED); `segmentAssignmentTypeTx` and `segmentAssignmentConflictsTx` select/scan `COALESCE(tt.kuerzel, '')` alongside `tt.name`
- `backend/internal/repository/admin_content_anime_themes_core.go` - the theme type-change conflict check (`UpdateAdminAnimeTheme`) now reads and compares kuerzel-derived old/new slot types, not name-derived ones
- `backend/internal/repository/episode_import_repository_release_autoassign.go` - `autoAssignThemeSegmentsForNewReleaseVersion`'s candidate/occupancy queries and slot classification now use kuerzel
- `backend/internal/repository/group_repository_cursor_timeline.go` - `attachReleaseTimelineSegments`'s public project-timeline `Type` field now derives via `CanonicalSegmentTypeFromKuerzel`
- `backend/internal/repository/release_detail_public_repository_helpers.go` - `loadReleaseSegments`'s public release-detail `Type` field now derives via `CanonicalSegmentTypeFromKuerzel`
- `backend/internal/repository/admin_content_anime_segments_crud.go` - fixed a latent NULL-scan crash: the 3 `theme_type_kuerzel` SELECTs added by Task 1 now use `COALESCE(tt.kuerzel, '')` (a plain, non-pointer `string` destination cannot scan a NULL kuerzel)
- `backend/internal/testsupport/phase117_postgres.go` - added a nullable `kuerzel` column to the shared Phase-117 test fixture's `theme_types` table so production queries selecting `tt.kuerzel` compile and run against the test schema
- `backend/internal/repository/theme_segment_assignment_slots_outro_kuerzel_integration_test.go` (new) - 6 integration tests for the Outro/ED independence, Outro's own 409, IN's unrestricted slot, the ED->Outro retype conflict check, and both public projections reporting "OUT"

## Decisions Made

- Rewrote the 4 badge helper functions to do exact-value matching on `kuerzel` (no `.includes()` fallback), satisfying the plan's `must_haves.truths` ("derived from theme_types.kuerzel, not from name-guessing"). This is a stricter reading than the plan's test-file action text, which called out only the Outro assertion as needing a fix — see Deviations.
- Updated `SegmentsListSection.tsx`, a second production caller of the same shared helpers that was not in the plan's `files_modified` list, to keep the full UI consistent (Rule 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/Rule 3 - Test-file scope expansion] Rewrote all `getTypeBadgeLabel` test cases, not just the Outro one**
- **Found during:** Task 2
- **Issue:** The plan's action text for the test file said only to correct the `Outro -> "PV"` assertion to `"OUT"`, keeping the rest of the `getTypeBadgeLabel` describe block's display-name-style inputs (`'OP1'`, `'Opening 1'`, `'ED2'`, `'Insert'`) unchanged. But the plan's `must_haves.truths` and acceptance criteria also require the function to "no longer contain `.toUpperCase().includes(` name-guessing logic for OP/ED/IN/OUT" — which is incompatible with those display-name-style test inputs continuing to resolve correctly once the function only exact-matches kuerzel values.
- **Fix:** Rewrote the function to exact-match on kuerzel, and rewrote the `getTypeBadgeLabel` test cases to use the real kuerzel inputs (`'OP'`, `'ED'`, `'IN'`, `'OUT'`) plus one `'Special'` unknown-fallback case, reducing 8 cases (including an accidental exact duplicate) to 5.
- **Files modified:** `SegmenteTab.helpers.tsx`, `SegmenteTab.test.tsx`
- **Verification:** `npx vitest run` on the folder - all 15 files / 331 tests pass.
- **Committed in:** `81d7e491`

**2. [Rule 1 - Bug] Corrected one `resolveSourceLabel` test assertion to match the live (correct) implementation**
- **Found during:** Task 2
- **Issue:** Repointing the test's `resolveSourceLabel` import from the dead `segmenteTabUtils.ts` to the live `SegmenteTab.helpers.tsx` implementation changes behavior for exactly one case: a `release_asset` segment with no `source_ref`/`source_label` set. The dead code returned `'Release-Asset'`; the live code (which also handles filename extraction and provenance prefixing) returns the more accurate `'Release-Asset (Upload fehlt)'`.
- **Fix:** Updated the test's expected value and description to match the live, more precise wording.
- **Files modified:** `SegmenteTab.test.tsx`
- **Verification:** `npx vitest run` - test passes with corrected expectation.
- **Committed in:** `81d7e491`

**3. [Rule 3 - Blocking] Updated `SegmentsListSection.tsx`, a second production caller not in the plan's files_modified list**
- **Found during:** Task 2
- **Issue:** `SegmentsListSection.tsx` also calls `getTypeBadgeClass`/`getTypeBadgeLabel` with `segment.theme_type_name` / `s.theme_type_name`. Once those functions stopped doing name-guessing, feeding them a free-text display name there would silently mis-render all badges on the main segment table and the suggestions bar.
- **Fix:** Updated both call sites to pass `theme_type_kuerzel` instead.
- **Files modified:** `SegmentsListSection.tsx`
- **Verification:** `npx vitest run` on the folder passes; ESLint clean.
- **Committed in:** `81d7e491`

**4. [Rule 3 - Blocking] Added `theme_type_kuerzel` to 3 sibling test fixtures outside the plan's files_modified list**
- **Found during:** Task 2
- **Issue:** `SegmenteTab.assignment-conflicts.test.tsx`, `SegmentPreviewImageSection.test.tsx`, and `useSegmentPreviewImageHandlers.test.ts` each define a local `segment()`/fixture function typed as the full `AdminThemeSegment` interface. Adding the new required `theme_type_kuerzel` field to that interface made these three fixtures fail TypeScript compilation.
- **Fix:** Added `theme_type_kuerzel: 'OP'` to each fixture's defaults.
- **Files modified:** `SegmenteTab.assignment-conflicts.test.tsx`, `SegmentPreviewImageSection.test.tsx`, `useSegmentPreviewImageHandlers.test.ts`
- **Verification:** `npx tsc --noEmit` shows no errors related to `AdminThemeSegment`/`theme_type_kuerzel`; `npx vitest run` on the folder passes (19 + 11 + 9 tests).
- **Committed in:** `81d7e491`

**5. [Rule 1 - Bug, found via Live-UAT checkpoint] Backend still derived segment type from `theme_types.name`, causing a real 409 when saving a new Outro segment**
- **Found during:** Task 3's checkpoint (first presentation) — the human tester attempted to save a new Outro-type segment on a release version that already had an ED segment, via `http://127.0.0.1:3300`, and got `409 "Für die gewählten Folgen ist bereits ein Segment desselben Typs zugewiesen."` The user had already diagnosed the root cause before reporting it back.
- **Issue:** This plan's Tasks 1-2 only switched the *frontend* badge/color/spur derivation to `theme_types.kuerzel` (D-01's stated scope). The *backend* classification function, `CanonicalSegmentType` (`theme_segment_type.go`), was out of this plan's original `files_modified` list and continued deriving type by substring-guessing on `theme_types.name` — its existing precedence rule mapped any name containing `"outro"` onto `"ED"` (same bucket as Ending themes), so `segmentAssignmentSlotType` treated a new Outro segment as if it were an ED segment and correctly-but-wrongly reported an ED-slot conflict against the real ED segment on the same release version. The same name-guessing also meant the two public projections (project timeline, release detail page) would have shown Outro's public `Type` as `"ED"`, not `"OUT"`.
- **Fix:** Added `CanonicalSegmentTypeFromKuerzel(kuerzel, themeTypeName string) string` as the new kuerzel-driven classifier (OP/ED/IN->`"INSERT"`/OUT->`"OUT"`, falling back to the legacy name-guess only when kuerzel is unset — preserving behavior for any theme_types row without a seeded kuerzel) and routed every backend call site through it: `segmentAssignmentSlotType`/`segmentAssignmentTypeTx`/`segmentAssignmentConflictsTx` (the 409 conflict check itself), the theme type-change conflict check in `admin_content_anime_themes_core.go`, release-version auto-assignment in `episode_import_repository_release_autoassign.go`, and both public projections (`group_repository_cursor_timeline.go`, `release_detail_public_repository_helpers.go`). Per the user's binding 2026-10-07 decision, also changed the exclusivity rule itself: OP, ED, and OUT (Outro) are now each their OWN exclusive slot (max 1 per release version, independent of each other) instead of Outro sharing ED's slot; IN (Insert) remains unrestricted (multiple per release version), unchanged. Along the way, also fixed a latent NULL-scan crash in `admin_content_anime_segments_crud.go`'s `theme_type_kuerzel` SELECTs (added by Task 1; a plain non-pointer Go `string` destination cannot scan a NULL `kuerzel` column, which surfaced once integration tests were actually run against a real Postgres instance) and added a nullable `kuerzel` column to the shared Phase-117 test fixture schema so production queries selecting `tt.kuerzel` compile and run against it.
- **Files modified:** `theme_segment_type.go`, `theme_segment_assignment_slots.go`, `admin_content_anime_themes_core.go`, `episode_import_repository_release_autoassign.go`, `group_repository_cursor_timeline.go`, `release_detail_public_repository_helpers.go`, `admin_content_anime_segments_crud.go`, `testsupport/phase117_postgres.go`, plus a new integration test file (`theme_segment_assignment_slots_outro_kuerzel_integration_test.go`)
- **Verification:** `go build ./... && go vet ./...` clean; `go test ./internal/repository/...` with `TEAM4S_PHASE117_TEST_DSN` set against the live backend container's DB passes for all segment/theme/auto-assign tests plus the 6 new Outro-specific tests (0 new failures vs. the documented pre-existing baseline of unrelated schema-drift/missing-DSN/unreachable-Keycloak failures); `npx vitest run` on the folder still passes (15 files / 331 tests, unaffected since this was a backend-only fix); backend container rebuilt (`docker compose up -d --build team4sv30-backend`) and frontend container restarted (`docker restart team4sv30-frontend`), both confirmed healthy; live `psql` re-confirms `theme_types.kuerzel` is still `OP`/`ED`/`IN`/`OUT` for ids 4/6/8/9.
- **Committed in:** `5f8966b4`

---

**Total deviations:** 5 auto-fixed (3 Rule 1 bug/test-correctness, 2 Rule 3 blocking/consistency)
**Impact on plan:** All auto-fixes were necessary to keep the build and test suite green while faithfully implementing the plan's stated `must_haves.truths` (full removal of name-guessing) and, after the Live-UAT checkpoint, to close the backend half of the same D-01 scope that the original plan's `files_modified` list did not cover. No scope creep beyond what was required for correctness, compilation, and the user's explicit checkpoint-reported defect.

## Issues Encountered

None blocking. While running the full (not folder-scoped) `npx vitest run` suite for a final sanity check, 6 pre-existing failures were found in files unrelated to this plan's scope (CSS custom-property guard, episode-import grouping, fansub member page copy) — logged to `deferred-items.md`, not fixed.

## Known Stubs

None introduced by this plan.

## Threat Flags

None — this plan's threat model (`T-176-02-01`/`T-176-02-02`/`T-176-SC`, all `accept`) covers the actual surface touched; no new network endpoints, auth paths, or trust-boundary-relevant schema changes were introduced beyond the planned `theme_types.kuerzel` column.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All 3 tasks are complete, committed, and verified: Tasks 1-2 (`go build`/`go vet`/`go test ./internal/repository/... -run Segment`, live-DB `psql` check, `npx tsc --noEmit`, `npx vitest run` on the folder — 15 files / 331 tests passing), the Live-UAT checkpoint fix (commit `5f8966b4`, see Deviations #5), and Task 3's blocking `checkpoint:human-verify` gate (approved by the human user 2026-10-07 on the re-presented round, confirming both OP/ED/IN unchanged + Outro -> "OUT" and the new Outro-save/second-Outro-conflict backend behavior). Phase 176 can proceed to plan 176-03.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-07*

## Self-Check: PASSED

All 9 files listed under "Files Created/Modified" for the Live-UAT checkpoint fix round were confirmed present on disk, and all 3 referenced commit hashes (`d1672bd7`, `81d7e491`, `5f8966b4`) were confirmed present in `git log --oneline --all`.

## Checkpoint Approval

**Task 3 ("Checkpoint: Live-UAT segment badge labels (D-01)") — APPROVED by the human user on 2026-10-07**, on the re-presented round (after the Rule 1 backend fix in commit `5f8966b4`).

User response: "approved — Live-UAT 176-02 bestanden (Nutzer 2026-10-07): OP/ED/IN unverändert, Outro speicherbar neben ED mit Badge OUT, zweites Outro wird abgelehnt."

Confirmed via live browser verification at `http://127.0.0.1:3300/admin/episode-versions/{versionId}/edit` (Segmente tab):
- OP/ED/IN segment badges render unchanged (no visual regression for the 3 pre-existing types).
- A new Outro segment can now be saved alongside an existing ED segment on the same release version, rendering badge "OUT" (previously blocked by the backend's name-guessed ED-slot conflict, fixed by commit `5f8966b4`).
- A second Outro segment on the same release version is correctly rejected (OUT now has its own exclusive per-release-version slot, per the user's binding decision recorded in Deviation #5).

This closes the plan. All 3 tasks (2 auto + 1 checkpoint) are now complete.

## Plan Status: COMPLETE

Completed: 2026-10-07
