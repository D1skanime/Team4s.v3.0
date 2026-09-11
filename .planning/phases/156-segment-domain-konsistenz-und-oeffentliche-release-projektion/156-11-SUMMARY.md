---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 11
subsystem: ui
tags: [nextjs, react, typescript, admin, segments]

# Dependency graph
requires:
  - phase: 156-04
    provides: "PUT /api/v1/admin/anime/:id/segments/:segmentId/origin backend endpoint + AdminThemeSegment.OriginReleaseVersionID projection"
provides:
  - "Frontend origin_release_version_id type field on AdminThemeSegment"
  - "setAnimeSegmentOrigin(animeId, segmentId, releaseVersionId) API client function"
  - "Minimal Select-based origin display/correction control in SegmentEditPanel, gated to shared segments with >=1 assigned episode"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Origin-correction control reuses the assigned_episodes list already rendered as 'Folge N' chips as the exclusive Select option source -- structurally cannot offer an unassigned release version"

key-files:
  created: []
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx

key-decisions:
  - "Task 2's live-browser checkpoint is NOT claimed as passed or failed -- it is deferred; see deferred-items.md and the 'Task 2 Status' section below"

requirements-completed: []  # P156-18 NOT marked complete -- see Requirements Note below; the plan's checkpoint (live-UAT) that P156-18 depends on for verification is still open

# Metrics
duration: N/A (Task 1 executed in a prior session; this session closes documentation/tracking only)
completed: 2026-09-11
---

# Phase 156 Plan 11: Admin Segment-Origin Correction Control Summary

**Select-based origin display/correction control added to the admin segment editor (Task 1, committed); the plan's live-browser verification gate (Task 2) is executed but not yet verified by a human operator.**

## Performance

- **Tasks:** 1 of 2 complete and committed; 1 of 2 (`checkpoint:human-verify`) executed but open pending operator action
- **Files modified:** 5 (Task 1)

## Accomplishments

- `AdminThemeSegment.origin_release_version_id` (`number | null | undefined`) added to `frontend/src/types/admin.ts`, matching the existing field-grouping/comment style near `assigned_release_version_ids`/`is_shared`.
- `setAnimeSegmentOrigin(animeId, segmentId, releaseVersionId)` added to `frontend/src/lib/api.ts` immediately after `assignAnimeSegment`, copying its exact `PUT`/`credentials: 'include'`/error-throwing shape, targeting `PUT /api/v1/admin/anime/:id/segments/:segmentId/origin`.
- `SegmentEditPanel.tsx` gained a new, compact `FormField` + `@/components/ui` `Select` block ("Segment-Origin (Quelle der Credits)"), rendered only when `isSharedSegment && assigned_episodes.length > 0`, sourced exclusively from the segment's own `assigned_episodes` list, and never included in `saveDisabled`'s computation -- the main Save action is unaffected by origin state.
- German helper copy under the Select uses the correct umlaut ("mitgeändert"), not an ASCII substitution, per CLAUDE.md's Sprachqualität rule.
- `SegmenteTab.tsx` wires `onSetOrigin`/`isSettingOrigin`/an inline error state into the panel, calling `setAnimeSegmentOrigin`, reloading the segment list on success, and surfacing fetch errors inline -- mirroring the existing `onSaveOverride`/`onRemoveOverride` wiring pattern already in the file.
- `SegmenteTab.test.tsx` updated two pre-existing direct `SegmentEditPanel` prop fixtures for the two new required props (`onSetOrigin`, `isSettingOrigin`).

## Task Commits

1. **Task 1: Type field, API client function, and minimal origin control in SegmentEditPanel** - `d6edc718` (feat)

**Plan metadata:** this commit (docs: close automatable scope, defer live-UAT of origin-select to operator)

_Note: this plan's SUMMARY/tracking work is being finalized in a separate session from Task 1's implementation; Task 1's own commit predates this SUMMARY._

## Files Created/Modified

- `frontend/src/types/admin.ts` - Adds `origin_release_version_id?: number | null` to `AdminThemeSegment`
- `frontend/src/lib/api.ts` - Adds `setAnimeSegmentOrigin(animeId, segmentId, releaseVersionId)`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` - New Select-based origin display/correction block, gated to shared segments with assigned episodes; new `onSetOrigin`/`isSettingOrigin` props
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` - Wires the new props to `setAnimeSegmentOrigin`, reload-on-success, inline error surfacing
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - Updated two existing direct-render fixtures for the two new required `SegmentEditPanel` props

## Decisions Made

- The live-browser checkpoint (Task 2) is tracked as an explicitly open item rather than claimed as passed or failed, per direct operator instruction (no platform-admin Keycloak session is available in this execution environment). See "Task 2 Status" below and `deferred-items.md`.

## Deviations from Plan

None on Task 1 -- plan executed exactly as written for the automatable scope. Task 2 was not skipped by choice; it is a `checkpoint:human-verify` gate that structurally cannot be performed without a live, authenticated admin browser session, which does not exist in this environment.

## Task 2 Status: ausgefuehrt, Live-UAT durch den Auftraggeber ausstehend

Task 2 (`Live verification -- admin origin-correction control`) is **executed** in the sense
that the implementation it verifies is built, committed, and passes every automated check
available. It is **not verified as passed**, and it is **not failed** -- it is deferred. No
"verified" or "live bestätigt" claim is made anywhere in this document, in `deferred-items.md`,
or in any prior VERIFICATION artifact for this plan, because no live admin browser session was
available in this execution environment to actually walk the five manual checks in
`156-11-PLAN.md`'s `<how-to-verify>` block.

The concrete, ready-to-run test recipe (including a usable test dataset --
`theme_segment_id 3`, which has 3 assignments in the dev database) is recorded in
`deferred-items.md` under "156-11: Task 2 (`checkpoint:human-verify`) not executable in this
environment -- live-UAT outstanding". The repo owner (Auftraggeber) is expected to run that
recipe directly against `http://127.0.0.1:3300` and record the outcome.

## Automated Verification (Task 1, already passed)

- `npx tsc --noEmit` on the changed files: clean, no new type errors.
- Vitest: 83/83 tests passing (including the two updated `SegmenteTab.test.tsx` fixtures).
- ESLint: 0 new warnings introduced by this plan's diff.
- Umlaut check: the new German helper copy ("mitgeändert") uses the correct umlaut; no ASCII
  substitution (`mitgeaendert`) present anywhere in the diff.
- Grep-confirmed: no new native `<select>`/`<input>`/`<textarea>` introduced -- the origin
  control uses only the `@/components/ui` `Select` primitive.

## Requirements Note

This plan's frontmatter lists `requirements: [P156-18]`. `P156-18` ("Admin-Segmentverwaltung
kann Origin sauber setzen ohne unnötige Pflichtinteraktion") is **not** marked complete via
`requirements.mark-complete` in this session, because the plan that carries this requirement
still has an open live-UAT item (Task 2) -- marking the requirement complete would overstate
what has actually been established. `requirements.mark-complete P156-18` should be run once the
operator's live-UAT pass (see `deferred-items.md`) confirms the five manual checks pass.

## Issues Encountered

None beyond the environment constraint documented above (no platform-admin Keycloak credentials
available to open an authenticated admin browser session for Task 2).

## User Setup Required

None -- no external service configuration required. The outstanding item is a manual
verification pass by the repo owner, not a setup/configuration step; see `deferred-items.md` for
the exact recipe.

## Next Phase Readiness

Task 1's implementation is complete, committed, and passes all automatable checks -- the
backend endpoint from Plan 156-04 now has an admin-reachable frontend surface. The plan is
**not** fully closed: Plan 156-10 (full test matrix / migration verification / before-after
audit) can proceed independently, but P156-18's requirement-completeness and this plan's own
full closure remain blocked on the operator's live-UAT pass documented in `deferred-items.md`.

## Self-Check

The automatable/testable surface of this plan (Task 1: type field, API client function,
Select-based UI control, and their TypeScript/Vitest/ESLint/umlaut checks) is **PASSED** --
verified below. The plan as a whole is **NOT fully closed**: the live-UAT truth that Task 2's
`checkpoint:human-verify` gate exists to establish is outstanding, pending the repo owner's
manual verification pass per `deferred-items.md`. This is not a "Self-Check: PASSED" for the
entire plan -- only for the portion that could actually be automated and checked in this
session.

- Commit `d6edc718` exists: confirmed via `git log --oneline` (see below).
- `frontend/src/types/admin.ts`, `frontend/src/lib/api.ts`,
  `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`,
  `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`,
  `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` all exist and
  contain the changes described above (confirmed via `git show --stat d6edc718`).
- `deferred-items.md` in this phase directory has a new dated entry for the outstanding Task 2
  item with the concrete test recipe and `theme_segment_id 3` dataset pointer.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11 (automatable scope only; live-UAT outstanding)*
