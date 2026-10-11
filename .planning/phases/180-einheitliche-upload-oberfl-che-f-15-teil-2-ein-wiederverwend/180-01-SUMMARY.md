---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 01
subsystem: ui
tags: [react, nextjs, upload, dropzone, design-system, vitest, testing-library]

# Dependency graph
requires:
  - phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
    provides: capability-registry-backed upload rights that per-way adoption plans will consume (unchanged by this plan)
provides:
  - "UploadDropzone presentation primitive (click + drag&drop + keyboard, single-slot slicing, density, disabled)"
  - "UploadFileRow presentation primitive (local preview, optional Titel/Beschreibung, status badge, retry/remove)"
  - "Both primitives barrel-exported from @/components/ui and demoed in /dev/ui-system"
affects: [180-02, 180-03, 180-04, 180-05, 180-06, 180-07, 180-08, 180-09, 180-10, 180-11, 180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation-only upload primitives with zero @/lib/api imports, consumed by a separate orchestration hook (180-02, under frontend/src/hooks/)"
    - "sliceToSingleFileIfNeeded co-located pure helper for single-slot multi-drop guard (D-16/D-17), testable without DOM simulation"
    - "statusBadgeVariant/statusLabel pure helpers replace hand-rolled per-status CSS classes with shared Badge variants"
    - "Visually-hidden file input via clip-rect technique (not display:none) to keep the control in the accessibility tree"

key-files:
  created:
    - frontend/src/components/ui/UploadDropzone.tsx
    - frontend/src/components/ui/UploadDropzone.module.css
    - frontend/src/components/ui/UploadDropzone.test.tsx
    - frontend/src/components/ui/UploadFileRow.tsx
    - frontend/src/components/ui/UploadFileRow.module.css
    - frontend/src/components/ui/UploadFileRow.test.tsx
    - frontend/src/app/dev/ui-system/showcase/UploadPrimitivesShowcase.tsx
  modified:
    - frontend/src/components/ui/index.ts
    - frontend/src/app/dev/ui-system/page.tsx

key-decisions:
  - "allowDrop keeps its false branch and test coverage per D-17's note — no caller sets it false yet, but the branch stays testable/working; 180-12 decides removal once every way's final props are visible"
  - "onRemove renders unconditionally on UploadFileRow whenever provided (not gated by status), matching this plan's explicit action/acceptance-criteria text rather than 180-UI-SPEC's general 'hidden once upload has started/finished' note — the calling page controls visibility by omitting the prop"

patterns-established:
  - "UploadDropzone/UploadFileRow: pure-function exports (sliceToSingleFileIfNeeded, statusBadgeVariant, statusLabel) tested directly without DOM simulation, consistent with project's existing helpers-file pattern"

requirements-completed: [D-02, D-04, D-05, D-06, D-09, D-11, D-12, D-13, D-17]

# Metrics
duration: 15min
completed: 2026-10-11
---

# Phase 180 Plan 01: Upload Primitives Foundation Summary

**Two presentation-only primitives (`UploadDropzone`, `UploadFileRow`) built from the existing Weg-1/Weg-2 upload markup, barrel-exported, and demoed in `/dev/ui-system` — zero `@/lib/api` imports, ready for every later per-way adoption plan to import instead of re-implementing dropzone/file-row markup six more times.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-11T18:43:00Z
- **Completed:** 2026-10-11T18:53:42Z
- **Tasks:** 3
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments
- `UploadDropzone`: click-to-pick, drag&drop, and keyboard (Enter/Space) all open the same native file picker; `disabled` no-ops all three paths; `allowDrop={false}` disables drag while click-only still works; `sliceToSingleFileIfNeeded` pure helper enforces the D-16/D-17 single-slot guard and the locked German warning sentence.
- `UploadFileRow`: local object-URL preview (revoked on unmount/file change), `Titel`/`Beschreibung` `FormField`s gated fully off via `showMetadataFields={false}`, shared `Badge` variants for status instead of hand-rolled CSS classes, `<progress>` only while `uploading`, retry only while `failed`, remove with no `ConfirmDialog`.
- Both primitives exported from `@/components/ui` and rendered in a new self-contained `UploadPrimitivesShowcase` on `/dev/ui-system`, next to the existing Switch/Accordion showcase section.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build UploadDropzone primitive + tests** - `8d12de87` (feat)
2. **Task 2: Build UploadFileRow primitive + tests** - `f0e4d57e` (feat)
3. **Task 3: Export both primitives and register the /dev/ui-system showcase** - `40d37335` (feat)

_No TDD RED/GREEN split was used — both primitives were net-new components with tests written and run together per task, matching the plan's `tdd="true"` tasks' acceptance-criteria-as-tests structure rather than a separate failing-test-first commit._

## Files Created/Modified
- `frontend/src/components/ui/UploadDropzone.tsx` - Presentation-only dropzone primitive; exports `UploadDropzone` + `sliceToSingleFileIfNeeded`
- `frontend/src/components/ui/UploadDropzone.module.css` - Density/drag-state/disabled styling, visually-hidden input via clip-rect
- `frontend/src/components/ui/UploadDropzone.test.tsx` - 10 tests: slicing helper, click/keyboard/drop open paths, allowDrop=false no-op, disabled no-op, single-slot warning
- `frontend/src/components/ui/UploadFileRow.tsx` - Presentation-only per-file row primitive; exports `UploadFileRow` + `statusBadgeVariant` + `statusLabel`
- `frontend/src/components/ui/UploadFileRow.module.css` - Container-query layout (32rem breakpoint), roomy/compact preview sizing
- `frontend/src/components/ui/UploadFileRow.test.tsx` - 11 tests: status→variant/label mapping, metadata field gating, progress rendering, retry/remove behavior
- `frontend/src/components/ui/index.ts` - Added `export * from './UploadDropzone'` / `'./UploadFileRow'`
- `frontend/src/app/dev/ui-system/showcase/UploadPrimitivesShowcase.tsx` - Self-contained demo (local queue state, no API calls)
- `frontend/src/app/dev/ui-system/page.tsx` - Import + render `<UploadPrimitivesShowcase />`

## Decisions Made
- Kept `allowDrop`'s `false` branch and its test coverage per D-17's explicit note in the plan objective — it remains a legitimate, documented part of the public API even though no caller currently passes `false`; removal is deferred to 180-12 once every way's final prop values are visible.
- `onRemove` on `UploadFileRow` renders unconditionally whenever the prop is provided (not gated by `status`), following this plan's own action/acceptance-criteria text literally rather than 180-UI-SPEC's more general "hidden once upload has started/finished" note — the calling page is expected to control visibility by omitting the prop once upload begins, keeping the primitive itself simple and testable.
- Gave the outer `UploadDropzone` wrapper an `aria-label` equal to `promptLabel` so it has a distinct accessible name from the secondary "Dateien auswählen" `Button` inside it — needed for both real screen-reader clarity and to make `role="button"` queries in tests unambiguous (there are two `role="button"` elements in the tree: the wrapper and the secondary trigger).

## Deviations from Plan

None - plan executed as written. Two implementation details not explicitly dictated by the plan were resolved by cross-referencing the project's existing test conventions (documented above under "Decisions Made" and "Issues Encountered") rather than treated as scope changes.

## Issues Encountered
- `expect(...).toHaveAttribute(...)` / `.toBeInTheDocument()` (jest-dom matchers) are not available in this project's Vitest setup (no `jest-dom` extend in `src/test/axeSetup.ts`, confirmed no other `components/ui/*.test.tsx` file uses them) — rewrote both new test files to use the project's existing `.getAttribute(...)` / `.not.toBeNull()` convention instead, matching e.g. `Switch.test.tsx` and `ActivationStatusIndicator.test.tsx`.
- jsdom does not implement `URL.createObjectURL`, which `UploadFileRow`'s local preview effect calls on mount — added the same `vi.stubGlobal('URL', ...)` stub pattern already used in `ReleaseVersionMediaSection.test.tsx` / `GroupMediaReviewSection.test.tsx` / `Team4sCropper.test.tsx` to `UploadFileRow.test.tsx`'s `beforeEach`.

## Next Phase Readiness
- Both primitives are ready for 180-02's `useUploadQueue` orchestration hook to wire real upload state into, and for every per-way adoption plan (180-03 through 180-11) to import directly from `@/components/ui`.
- No blockers. `npm --prefix frontend run typecheck` is clean; both new test files are green (21/21 tests); ESLint reports no issues on any touched file.

## Self-Check: PASSED

All 10 claimed files exist on disk; all 4 claimed commit hashes (8d12de87, f0e4d57e, 40d37335, 90f869c2) exist in git history.

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
