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
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content_anime_segments_crud.go
    - frontend/src/types/admin.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx

key-decisions:
  - "Rewrote getTypeBadgeClass/getTypeBadgeLabel/getTypeColor/isUpperSpur to switch on the exact kuerzel value (OP/ED/IN/OUT) rather than keep a .toUpperCase().includes() fallback, per the plan's must_haves.truths; this required rewriting most of the pre-existing getTypeBadgeLabel test cases (display-name-style inputs no longer apply once the function only receives real kuerzel values), beyond the single Outro assertion the plan's action text called out explicitly"
  - "Updated SegmentsListSection.tsx (not in the plan's files_modified list) to pass theme_type_kuerzel instead of theme_type_name -- it is a second production caller of the same shared helpers in SegmenteTab.helpers.tsx and would otherwise keep using the old, now name-guessing-free function incorrectly (Rule 3 - blocking/correctness fix)"

requirements-completed: []

# Metrics
duration: ~19min (Tasks 1-2 only; checkpoint pending)
completed: 2026-10-07 (partial - awaiting human checkpoint)
---

# Phase 176 Plan 02: Theme-Segment-Badge aus DB-Kuerzel Summary

**theme_types.kuerzel (Migration 0179) ersetzt Name-Guessing fuer OP/ED/IN/OUT-Segment-Badges durchgaengig von DB ueber Go/JSON bis zur React-Badge-Logik; toter segmenteTabUtils.ts-Code entfernt.**

## Performance

- **Duration:** ~19 min (Tasks 1-2)
- **Started:** 2026-10-07T13:10:26Z
- **Completed:** 2026-10-07T13:28:48Z (Tasks 1-2; Task 3 checkpoint still open)
- **Tasks:** 2 of 3 completed (Task 3 is a blocking human-verify checkpoint)
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

**Plan metadata commit:** pending (will follow this SUMMARY commit, per sequential-executor protocol)

_Task 3 ("Checkpoint: Live-UAT segment badge labels (D-01)") is a blocking `checkpoint:human-verify` gate and has not been attempted — see CHECKPOINT REACHED below._

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

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bug/test-correctness, 2 Rule 3 blocking/consistency)
**Impact on plan:** All auto-fixes were necessary to keep the build and test suite green while faithfully implementing the plan's stated `must_haves.truths` (full removal of name-guessing). No scope creep beyond what was required for correctness and compilation.

## Issues Encountered

None blocking. While running the full (not folder-scoped) `npx vitest run` suite for a final sanity check, 6 pre-existing failures were found in files unrelated to this plan's scope (CSS custom-property guard, episode-import grouping, fansub member page copy) — logged to `deferred-items.md`, not fixed.

## Known Stubs

None introduced by this plan.

## Threat Flags

None — this plan's threat model (`T-176-02-01`/`T-176-02-02`/`T-176-SC`, all `accept`) covers the actual surface touched; no new network endpoints, auth paths, or trust-boundary-relevant schema changes were introduced beyond the planned `theme_types.kuerzel` column.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Tasks 1 and 2 are complete, committed, and verified (`go build`/`go vet`/`go test ./internal/repository/... -run Segment`, live-DB `psql` check, `npx tsc --noEmit`, `npx vitest run` on the folder — 15 files / 331 tests passing). **Task 3 is a blocking `checkpoint:human-verify` gate** requiring live browser UAT at `http://127.0.0.1:3300/admin/episode-versions/{versionId}/edit` (Segmente tab) to confirm OP/ED/IN badges are visually unchanged and an Outro segment now shows "OUT". This plan is NOT complete until that checkpoint is resolved by a human and a continuation agent finishes the plan (final metadata commit, STATE.md/ROADMAP.md updates).

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: partial (2/3 tasks) - 2026-10-07*
