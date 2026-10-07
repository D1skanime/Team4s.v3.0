---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 06
subsystem: ui
tags: [react, nextjs, permissions, fansub-admin, tdd]

# Dependency graph
requires:
  - phase: 176-04
    provides: Permission-Matrix closure patterns for other fansub-edit capability gaps in the same directory
provides:
  - "NotesTab canEditNotes prop gating all group-note add/edit/delete mutation controls"
  - "FansubEditSecondaryTabs capability derivation mirroring GroupHistorySection's foundingOnly pattern"
affects: [fansub-admin-edit, permission-matrix-followups]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "canEditNotes derived in the parent (FansubEditSecondaryTabs) from isPlatformAdmin || can_edit_group || can_edit_notes, passed down as a prop -- same shape as the existing foundingOnly derivation for GroupHistorySection"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx

key-decisions:
  - "canEditNotes defaults to true on NotesTab/GroupNoteEditor/GroupNotePreview for backward compatibility with any other existing caller, matching the plan's stated acceptance criteria"

patterns-established:
  - "Mutation-control gating via a boolean prop threaded from a capability-derivation site through a tab component into its child editor/preview sub-components, suppressing only action buttons while preserving read access to body content"

requirements-completed: []

# Metrics
duration: ~15min (Task 1 only; plan paused at mandatory human-verify checkpoint)
completed: 2026-10-07
---

# Phase 176 Plan 06: NotesTab canEditNotes gating (D-18) Summary

**NotesTab's group-note add/edit/delete controls are now gated by a `canEditNotes` prop computed from `isPlatformAdmin || can_edit_group || can_edit_notes`, closing Permission-Matrix rows 6.1/6.2 so a founding-history-only editor keeps read access to group notes but loses unrestricted CRUD rights they were never granted.**

## Status

**1 of 2 tasks complete.** Task 1 (TDD) is implemented, tested, and committed. Task 2 is a mandatory `checkpoint:human-verify` (live-UAT) — execution paused there per the plan's blocking gate; no further automated work remains for this plan until the human verification step is performed.

## Performance

- **Duration:** ~15 min (Task 1 only)
- **Tasks:** 1 of 2 completed (checkpoint awaiting human verification)
- **Files modified:** 4

## Accomplishments
- `NotesTab` accepts a `canEditNotes: boolean` prop (default `true`) that hides the "Neue Gruppennotiz hinzufügen" add button when `false`, while still rendering existing notes' read-only content.
- `GroupNoteEditor`/`GroupNotePreview` (in `NotesTab.helpers.tsx`) each accept the same prop and suppress their edit/delete/save action buttons when `false`, leaving note title/body visible either way.
- `FansubEditSecondaryTabs.tsx` computes `canEditNotes = isPlatformAdmin || Boolean(capabilities?.can_edit_group) || Boolean(capabilities?.can_edit_notes)` and passes it to `<NotesTab>`, mirroring the exact derivation style already used for the adjacent `GroupHistorySection`'s `foundingOnly` flag.
- Proven by two new real render-and-query behavior tests (RED before implementation, GREEN after) plus the 4 pre-existing `NotesTab.test.tsx` tests, all passing.

## Task Commits

Task 1 followed the mandatory RED/GREEN TDD cycle:

1. **Task 1 (RED): add failing canEditNotes gating tests** - `b457d24b` (test)
2. **Task 1 (GREEN): gate NotesTab group-note CRUD behind canEditNotes** - `eac02214` (feat)

No REFACTOR commit was needed (implementation was minimal and clean on first pass).

**Plan metadata:** pending (will be added if/when the plan closes after checkpoint approval)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` - added `canEditNotes` prop (default `true`), wraps the add button and passes the prop to `GroupNoteEditor`/`GroupNotePreview`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx` - `GroupNoteEditor`/`GroupNotePreview` accept `canEditNotes` (default `true`) and conditionally render their action bars
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx` - computes `canEditNotes` from capabilities/isPlatformAdmin and passes it to `<NotesTab>`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx` - added 2 new tests covering `canEditNotes={false}` (read-only, no mutation controls) and `canEditNotes={true}` (full rights preserved)

## Decisions Made
- `canEditNotes` defaults to `true` on all three components for backward compatibility with any other existing caller, as explicitly permitted by the plan's acceptance criteria.
- No REFACTOR step was performed — the GREEN implementation was already minimal (three small, additive conditional-render changes mirroring an existing in-repo pattern).

## Deviations from Plan

None - plan executed exactly as written for Task 1.

## TDD Gate Compliance

Both gates present in git log, in correct order:
- RED (`test(176-06): ...`): `b457d24b`
- GREEN (`feat(176-06): ...`): `eac02214`

No REFACTOR commit — not needed.

## Issues Encountered

None. Local `node_modules` is not installed on the host; tests were run inside the running `team4sv30-frontend` Docker container (`docker compose exec team4sv30-frontend npx vitest run ...`) per the project's Docker-Compose-centric dev workflow. `tsc --noEmit` was also run in-container; pre-existing, unrelated errors in `ReleaseDetailHero.test.tsx` and a Next.js generated route-types file were observed but are out of this plan's scope (Scope Boundary rule) and were not touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Task 1's automated work is complete and verified (6/6 `NotesTab.test.tsx` tests green, no TypeScript errors introduced, both touched files well under the 450-line cap, no new native `<button>`/`<input>` elements introduced).

**Blocker:** Task 2 is a mandatory `checkpoint:human-verify` (`gate="blocking"`) requiring live browser verification of both capability tiers against `http://127.0.0.1:3300/admin/fansubs/{id}/edit` (Notizen tab). This plan cannot be marked complete, and STATE.md/ROADMAP.md position should not advance past 176-06, until that checkpoint is resolved ("approved" or issues reported) by a human.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Status as of this summary: In progress — paused at checkpoint, task 1/2 complete*
