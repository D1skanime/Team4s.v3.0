---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 08
subsystem: testing
tags: [vitest, tsc, openapi, yaml, react, css-modules, episode-import, release-detail]

# Dependency graph
requires:
  - phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
    provides: 176-05/176-06's prior frontend baseline fixes and openapi.yaml edits in this phase
provides:
  - "6 previously known-red frontend baseline tests fixed and passing (D-05)"
  - "ReleaseDetailHero.test.tsx type-checks cleanly with zero tsc errors"
  - "shared/contracts/openapi.yaml has zero duplicate YAML mapping keys"
  - "EpisodeImportMappingRowCard renders row.display_path again (restored real regression)"
affects: [176-09, 176-10, 176-11, 176-12, 176-13, 176-14, 176-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Root-cause-before-fix for stale tests: git-blame the commit that broke the assertion, confirm via DOM inspection/tsc/YAML scan whether the test or the production code is wrong, document which, then apply the narrow fix."

key-files:
  created: []
  modified:
    - frontend/src/lib/cssCustomProperties.guard.test.ts
    - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - shared/contracts/openapi.yaml
    - frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css

key-decisions:
  - "cssCustomProperties.guard.test.ts allow-list line number re-verified live (confirmed still 275, matching the plan's prediction) rather than blindly copied from the plan text."
  - "PublicReleaseSurfacesShowcase assertion rewritten to name the actual per-episode aria-labels ('Folge 12 öffnen' / 'Folge 11 öffnen') instead of a vague regex, per the plan's precision requirement."
  - "EpisodeImportEpisodeGroup GAP-13 tests: removed only the stale header-consolidation assertion (test-only fix); display_path rendering was a genuine missing regression restored in production code, not a test weakening."
  - "openapi.yaml duplicate description merged into a single YAML block-scalar (|-) preserving both German and English sentences, rather than dropping either."

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-10-08
---

# Phase 176 Plan 08: Close D-05 Frontend Baseline Red Tests Summary

**Fixed all 6 known-red frontend baseline tests (stale line numbers, stale assertions after deliberate redesigns, a missing required type field, and a real dropped `display_path` render), plus deduplicated `openapi.yaml`'s one duplicate `description` key — every fix root-caused via git-blame/DOM inspection/tsc/YAML scan before touching code, per D-05's "not just grün biegen" requirement.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-08T07:01:55Z (per STATE.md `last_updated` at plan start)
- **Completed:** 2026-10-08T07:09:00Z (approx.)
- **Tasks:** 3 (Task 3 executed as TDD: RED commit then GREEN commit)
- **Files modified:** 8

## Accomplishments
- All 6 previously known-red frontend tests now pass: `cssCustomProperties.guard.test.ts` (both failing tests), `PublicReleaseSurfacesShowcase.test.tsx`, `EpisodeImportEpisodeGroup.test.tsx` (both GAP-13 tests), and the `mitwirkende/[memberSlug]/page.test.tsx` integration test.
- `ReleaseDetailHero.test.tsx` type-checks cleanly: `npx tsc --noEmit` returns exit code 0 with zero output (confirmed the pre-existing, out-of-scope `admin/anime/create/page.ts` error is no longer present either, but that file was not touched by this plan).
- `shared/contracts/openapi.yaml` has zero duplicate YAML mapping keys, confirmed via a Python duplicate-key-raising loader run against the full file (not just the known operation).
- A genuine regression was restored: `EpisodeImportMappingRowCard` renders `row.display_path` again (new `.filePath` CSS class), matching the component's own documented three-region-layout contract.
- Full frontend suite run after all fixes: **364 test files passed (1 skipped), 3249 tests passed (3 todo)** — zero regressions introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix the stale-reference/config fixes (guard line number, mitwirkende text, ReleaseDetailHero fixture, openapi dedupe)** - `a5cfb218` (fix)
2. **Task 2: Fix PublicReleaseSurfacesShowcase's stale assertion** - `915df328` (test)
3. **Task 3: Fix EpisodeImportEpisodeGroup** - split into TDD RED/GREEN:
   - RED: `4a0805aa` (test) — removed stale header-consolidation assertion; remaining display_path assertions confirmed failing
   - GREEN: `9a07c692` (feat) — restored `display_path` rendering, both GAP-13 tests pass

**Plan metadata:** (this commit, docs: complete plan)

_Note: Task 3 used the TDD RED/GREEN cycle because it mixed one test-only fix with one genuine production-code regression restoration._

## Files Created/Modified
- `frontend/src/lib/cssCustomProperties.guard.test.ts` - Updated `KNOWN_NON_CSS_TEXTUAL_MENTIONS` allow-list entry's `line` from 282 to 275 (re-verified live against `roleCatalog.accessibility.test.ts`, which had drifted after an unrelated earlier edit).
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` - Updated stale `toContain('Vollständiges Memberprofil')` to `toContain('Vollständiges Fansubberprofil')`, matching commit `fe1772b7`'s rename of `ProjectMemberHero`'s action aria-label (verified live against the component).
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` - Added `previous: null` to the shared `base` fixture; `ReleaseDetailResponse.previous` is a required (nullable) field the fixture never set, breaking the `Pick<...>` type constraint.
- `shared/contracts/openapi.yaml` - Merged the two `description` values on the `PUT /api/v1/admin/anime/{id}/segments/{segmentId}/preview-image` operation into one YAML block-scalar `description:` (both the German and English sentences preserved), removing the duplicate key.
- `frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx` - Replaced the stale `'Release öffnen'` literal-text assertion (removed by the `c01b41af` redesign) with precise per-episode aria-label assertions (`'Folge 12 öffnen'` / `'Folge 11 öffnen'`, 2 links each: image link + arrow link).
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` - Removed the stale `[class*="episodeSingleFileInfoName"]` assertion (feature deliberately removed by commit `8964f200`); kept the per-row filename/display_path assertions.
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - Restored `row.display_path` rendering in `EpisodeImportMappingRowCard`, guarded by the existing `!hideFileInfo` condition, right after the filename `<strong>`.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - Added `.filePath` class (muted small text, styled consistently with the existing `.multiEpisodeHint` convention).

## Decisions Made
- Re-verified every "current line/text" claim in the plan's `<interfaces>` against the live tree before applying (per the plan's own instruction not to blindly trust the snapshot) — all matched exactly what the plan predicted (line 275, `Vollständiges Fansubberprofil`, `previous` still required, single duplicate key).
- Used a YAML block scalar (`|-`) rather than a folded (`>`) string for the merged `openapi.yaml` description, to keep the two distinct sentences visually separated as two lines while merging them under one key.
- Task 3 treated as a TDD task per plan frontmatter (`tdd="true"`): committed the stale-assertion removal first (RED — confirmed remaining assertions fail for a real reason), then the production fix (GREEN — confirmed both tests pass).

## Deviations from Plan

None - plan executed exactly as written. Every fix matched the plan's `<interfaces>` predictions after live re-verification; no new architectural changes, no scope creep, no package installs.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-05 (176-CONTEXT.md F-06) is closed: all 6 previously known-red frontend tests pass, `ReleaseDetailHero.test.tsx` type-checks cleanly, `openapi.yaml` has zero duplicate keys.
- Full frontend suite (364 files / 3249 tests) passes with no regressions from this plan's changes, giving a clean baseline for subsequent wave-6 plans (176-09..176-15) that may also touch frontend test files.
- `npx tsc --noEmit` returns exit code 0 project-wide at the time of this plan's completion (no outstanding tsc errors, including the previously-flagged-as-out-of-scope `admin/anime/create/page.ts` Next.js route-type error, which was not present in this run).

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*

## Self-Check: PASSED

All 8 modified/created files confirmed present on disk; all 4 task commit hashes
(`a5cfb218`, `915df328`, `4a0805aa`, `9a07c692`) confirmed present in `git log --oneline --all`.
