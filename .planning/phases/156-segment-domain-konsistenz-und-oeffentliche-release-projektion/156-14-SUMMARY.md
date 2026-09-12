---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 14
subsystem: ui
tags: [react, nextjs, typescript, vitest, admin-ui, segment-contributors, gap-01]

# Dependency graph
requires:
  - phase: 156 (Plan 156-13)
    provides: GET/PUT /api/v1/admin/anime/:id/segments/:segmentId/contributors
      (admin_content_anime_theme_segment_contributors.go), gated by the same
      requireSegmentManage capability as every other segment-write endpoint;
      AdminThemeSegmentContributorCandidate backend shape.
provides:
  - SegmentEditPanel.tsx and SegmenteTab.tsx both brought under the 450-line
    limit via pure code-motion refactors BEFORE any GAP-01 feature code was
    added (156-UAT.md's explicit blocking rule).
  - "Mitwirkende am Segment" admin UI: a Switch-per-candidate multi-select of
    Origin-release contributors (people only, never roles), wired to Plan
    156-13's GET/PUT endpoints via a dedicated frontend/src/lib/api/segment-contributors.ts
    module.
  - "Keine Auswahl" (deselecting every candidate) is a first-class, distinctly
    saveable state -- an explicit PUT with an empty member_ids array, never
    conflated with "leave unchanged".
affects: [156-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated feature API module under frontend/src/lib/api/<feature>.ts, importing
      ApiError/apiClientFetch/parseApiErrorPayload from @/lib/api and never the
      reverse -- api.ts gains zero lines (mirrors admin-anime-intake.ts precedent)."
    - "Hook-owns-its-fetch-and-save-state pattern (useSegmentContributors) mirroring
      useSegmentOverrideHandlers: local isLoading/isSaving/error, always replaces
      local state with the server's authoritative response after a write, never an
      optimistic guess."
    - "Extraction-before-feature-code: when a target file already exceeds the
      450-line ceiling, all extraction commits land in their own tasks/commits
      BEFORE any new feature JSX/logic touches that file."

key-files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentOverrideField.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPlaybackPreviewSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.formHelpers.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentContributorsField.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentContributors.ts
    - frontend/src/lib/api/segment-contributors.ts
    - frontend/src/lib/api/segment-contributors.test.ts
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
    - frontend/src/types/admin.ts
    - frontend/eslint.config.mjs

key-decisions:
  - "SegmentEditPanel.tsx needed a 4th extraction (SegmentBasicFieldsSection.tsx)
    beyond the plan's 3 named components -- the 3 named extractions alone left the
    file at 479 lines, still over budget. Extracted the Typ/Name fields plus the
    Episoden-/Zeitbereich inputs and their validation messages as a 4th pure
    display component. Documented as a deviation from the plan's exact
    files_modified list, justified by the hard 450-line acceptance criterion
    taking priority over matching the plan's file count exactly."
  - "The two newly extracted files that carry forward pre-existing native
    <select>/<input> elements (SegmentAssetSection.tsx, SegmentBasicFieldsSection.tsx)
    were added to eslint.config.mjs's frozen LEGACY_NO_RESTRICTED_SYNTAX_FILES
    ratchet list, since SegmentEditPanel.tsx (their source) was already on that
    list. This is pure code relocation, not new violations, and is a deliberate,
    documented addition per the ratchet's own review requirement -- not a silent
    edit. The genuinely NEW component (SegmentContributorsField.tsx) was NOT
    added to this list and uses zero native form elements, per CLAUDE.md's
    global-UI mandate."
  - "SegmentEditPanel.tsx's Segment-Origin FormField/Select block was
    deliberately NOT extracted into its own component (unlike the plan's other
    3 named extraction targets) -- Task 3 needed to render SegmentContributorsField
    immediately after it in the same file, and the plan's own must_haves.key_links
    names SegmentEditPanel.tsx as the 'from' file for that link."
  - "No dedicated npm umlaut-check script exists in frontend/package.json
    (scripts are: dev/build/start/lint/test/typecheck only) -- the plan's
    verification step 5 assumed one exists. Verified umlaut correctness via
    targeted grep instead (ASCII-substitute patterns + a manual scan of every
    quoted string literal touched in this plan), documented here as a
    plan-vs-repo discrepancy rather than silently skipped."

patterns-established:
  - "Business-logic-stays-in-parent / display-goes-to-child extraction shape:
    SegmentsListSection.tsx receives fully-bound callbacks and pre-computed data
    from SegmenteTab.tsx, owning only the one piece of state (openAssignmentsFor)
    that nothing outside the table reads."

requirements-completed: [P156-07, P156-08, P156-09, GAP-01]

# Metrics
duration: ~2h10min
completed: 2026-09-12
---

# Phase 156, Plan 14: SegmentEditPanel/SegmenteTab extraction + "Mitwirkende am Segment" UI Summary

**Two production files were extracted well under the 450-line ceiling in dedicated refactor-only commits, THEN the "Mitwirkende am Segment" multi-select -- GAP-01's only user-visible surface -- was wired to Plan 156-13's already-live GET/PUT endpoints entirely through @/components/ui primitives, with correct German umlauts and a first-class "zero selected" save state.**

## Performance

- **Duration:** ~2h10min
- **Tasks:** 3 (Task 1, Task 1b, Task 2, Task 3 -- 4 plan tasks, numbered 1/1b/2/3)
- **Files modified:** 16 (11 created, 5 modified)

## Accomplishments

- **File-size gate cleared BEFORE any feature code**, per 156-UAT.md's explicit
  blocking rule naming both files:
  - `SegmentEditPanel.tsx`: 733 -> 375 lines (after Task 3's contributor wiring),
    via 4 extractions (`SegmentOverrideField.tsx` 94, `SegmentPlaybackPreviewSection.tsx`
    75, `SegmentAssetSection.tsx` 256, `SegmentBasicFieldsSection.tsx` 214 lines).
  - `SegmenteTab.tsx`: 827 -> 412 lines (after Task 3's wiring), via 3 extractions
    (`SegmenteTab.formHelpers.ts` 137, `SegmentsListSection.tsx` 301,
    `useSegmentAssetHandlers.ts` 168 lines).
  - Both extraction tasks were pure code motion: zero new props beyond passing
    already-existing state/handlers down, zero new rendering logic, full
    `SegmenteTab` vitest suite green at 83/83 after each extraction with no
    fixture changes needed.
- **"Mitwirkende am Segment" UI built**: `SegmentContributorsField.tsx` renders
  nothing with no Origin, an inline `EmptyState` with an Origin but zero
  candidates, otherwise one `Switch` per Origin contributor (label
  `"${name} — ${role_label}"`). Zero native `<select>/<input>/<textarea>/<button>`
  -- confirmed via grep, zero matches. `useSegmentContributors.ts` fetches
  candidates whenever the segment or its `origin_release_version_id` changes
  (skipping the API call entirely with no Origin, matching the backend's own
  contract) and always replaces local state with the PUT response's fresh
  contributor list on save, never an optimistic guess.
- **"Keine Auswahl" is a real, independently saveable state**: deselecting the
  last selected candidate sends an explicit `PUT .../contributors` with
  `member_ids: []`, proven by a dedicated test
  (`erlaubt das Abwaehlen auf null Mitwirkende als eigenstaendigen,
  speicherbaren Zustand`).
- **Dedicated API module, zero lines added to `api.ts`**:
  `frontend/src/lib/api/segment-contributors.ts` (`getThemeSegmentContributorCandidates`,
  `setThemeSegmentContributors`) mirrors `admin-anime-intake.ts`'s extraction
  precedent exactly; `grep -n "segments/.*contributors" frontend/src/lib/api.ts`
  returns zero matches.
- **Test-first throughout**: `segment-contributors.test.ts` (5 cases, written
  before wiring the hook) proves the GET/PUT shapes and both documented 409
  codes (`segment_has_no_origin`, `member_not_origin_contributor`) plus an
  unparseable-body fallback all surface as usable `ApiError`s. 4 new
  `SegmenteTab.test.tsx` integration cases exercise the full render path
  (no-origin renders nothing + zero API calls; `EmptyState` on zero
  candidates; toggle-on saves the full recomputed ID list; toggle-off-to-zero
  saves an explicit empty array) plus the two pre-existing `SegmentEditPanel`
  fixtures updated with the five new props.

## Task Commits

Each task was committed atomically:

1. **Task 1: File-size extraction for SegmentEditPanel.tsx** - `fe597ea5` (refactor)
2. **Task 1b: File-size extraction for SegmenteTab.tsx** - `dbcda565` (refactor)
3. **Task 2: Dedicated segment-contributors API module + types** - `b44375bb` (feat)
4. **Task 3: SegmentContributorsField component + hook + wiring** - `7f91b35d` (feat)

## Files Created/Modified

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentOverrideField.tsx` -
  per-Folge Zeit-Override block extracted from SegmentEditPanel.tsx (Task 1)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPlaybackPreviewSection.tsx` -
  resolved playback status + segment preview, extracted (Task 1)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx` -
  source-type selector + release-asset upload/reuse block, extracted; owns the
  `fileInputRef` it is the sole consumer of (Task 1)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx` -
  Typ/Name fields + Episoden-/Zeitbereich with validation messages, extracted
  as a 4th component beyond the plan's 3 named ones (Task 1, deviation)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` -
  733 -> 375 lines; renders the 4 extracted components plus the new
  `SegmentContributorsField` (Task 1, Task 3)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.formHelpers.ts` -
  `EMPTY_FORM`/`MAX_SEGMENT_WINDOW_SECONDS`/`DEFAULT_SEGMENT_END_SECONDS`/
  `getDefaultSegmentEndSeconds`/`segmentFormFromExisting`/
  `buildSegmentPreviewStreamHref`/`renderStatusLabel` plus new
  `validateSegmentFormInput()` extracted from `handleSave` (Task 1b)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx` -
  suggestions bar, error display, segment table, timeline preview -- all
  business logic/state stays in SegmenteTab.tsx (Task 1b)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts` -
  asset upload/reuse state + handlers, mirroring `useSegmentOverrideHandlers`'s
  shape in its own file (Task 1b)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` -
  827 -> 412 lines; instantiates `useSegmentContributors` and wires it through
  (Task 1b, Task 3)
- `frontend/src/lib/api/segment-contributors.ts` - dedicated API module (Task 2)
- `frontend/src/lib/api/segment-contributors.test.ts` - 5 test cases (Task 2)
- `frontend/src/types/admin.ts` - `AdminThemeSegmentContributorCandidate`,
  `AdminThemeSegmentContributorCandidatesResponse`,
  `AdminThemeSegmentContributorsSetResponse` (Task 2)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentContributorsField.tsx` -
  the multi-select UI (Task 3)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentContributors.ts` -
  fetch/save hook (Task 3)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` -
  4 new integration tests + 2 updated `SegmentEditPanel` fixtures (Task 3)
- `frontend/eslint.config.mjs` - added the 2 new extracted files carrying
  forward pre-existing native form elements to the frozen legacy-warn list
  (Task 1)

## Decisions Made

See `key-decisions` in frontmatter for the full rationale on: the 4th
extraction beyond the plan's named 3, the `eslint.config.mjs` ratchet-list
addition, keeping the Segment-Origin block inline in `SegmentEditPanel.tsx`,
and the missing umlaut-check npm script.

No conflict was found between `156-14-PLAN.md` and `156-UAT.md`'s
2026-09-12 Nachtrag -- the plan's task text already incorporates the
Nachtrag's "keine Auswahl = keine Credits" rule verbatim in its `<behavior>`
spec for `useSegmentContributors`/`SegmentContributorsField`, so no
UAT-vs-plan reconciliation was needed for this plan.

## Deviations from Plan

1. **4th extraction in Task 1** (`SegmentBasicFieldsSection.tsx`, not named in
   the plan's 3 targets): the 3 named extractions alone left
   `SegmentEditPanel.tsx` at 479 lines, still over the 450-line ceiling. Per
   the plan's own acceptance criterion ("do not stop with a partial
   result... additionally extract... rather than leaving a partial
   extraction" -- stated for Task 1b, applied here in the same spirit since
   Task 1 had no explicit fallback clause of its own), a 4th display
   component was extracted. `git diff --stat` for Task 1 therefore shows 5
   modified/created files instead of the plan's literal 4 -- the file-size
   gate (a hard, explicitly-first-priority constraint per the mandatory
   directives) took precedence over matching the plan's exact file list.
2. **`eslint.config.mjs` change**, not in the plan's `files_modified` list:
   required because the project's `no-restricted-syntax` ratchet holds new
   files to `error` level while a frozen legacy list (including
   `SegmentEditPanel.tsx`) gets only `warn`. The two newly extracted files
   carrying forward pre-existing native elements verbatim were added to that
   list -- a deliberate, reviewed, documented decision (see key-decisions),
   not a silent edit, and not an increase in net violations.
3. **No umlaut-check npm script exists** in `frontend/package.json`
   (`dev`/`build`/`start`/`lint`/`test`/`typecheck` only) -- the plan's
   verification step 5 assumed one. Umlaut correctness was verified via
   targeted `grep` for known ASCII-substitute patterns plus a manual review
   of every quoted string literal in every file this plan touched, rather
   than a single script invocation.
4. **One pre-existing ASCII-umlaut typo fixed in passing**: `SegmenteTab.tsx`'s
   `handleSave` had `'Bitte einen gueltigen Typ auswählen.'` (present before
   this plan, carried through the Task 1b extraction verbatim). Corrected to
   `'Bitte einen gültigen Typ auswählen.'` since this plan's mandatory
   directives require correct umlauts in every string touched. No test
   asserted on the old exact string; full suite stayed green.

All other tasks executed as written.

## Issues Encountered

None blocking. One test-authoring correction during Task 3: an `EmptyState`
`variant="inline"` renders title and description as a single joined text node
(`"{title} – {description}"`), so the first attempt at
`screen.findByText('Keine Mitwirkenden der Origin gefunden')` (exact match)
failed; fixed to a partial regex match. Caught and fixed before committing --
not carried into the final commit.

## User Setup Required

None -- no external service configuration required. This plan builds UI
against Plan 156-13's already-deployed and verified backend endpoints; no
backend changes were made in this plan.

## Next Phase Readiness

- GAP-01 is now fully wired end to end: data model (156-12) -> public
  projection gate + admin API (156-13) -> admin UI (this plan). The only
  remaining GAP-01/GAP-02 item is the combined live-UAT checkpoint
  (156-11 Task 2 + the Segment-Contributors UAT matrix in 156-UAT.md's GAP-02
  section), explicitly deferred pending an authenticated Platform-Admin
  browser session -- tracked in `deferred-items.md`, not claimed as verified
  here.
- `git push` was NOT run, per this execution's explicit instruction (main
  remains ahead of `origin/main`; push status is reported only in the
  phase-level final report by the orchestrator).

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-12*
