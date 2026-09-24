---
phase: quick-260924-cgg
plan: 01
subsystem: ui
tags: [react, nextjs, forms, hydration, testing-library, vitest]

# Dependency graph
requires:
  - phase: quick-260924-b7s
    provides: GAP-01..GAP-03 fixes on 167-UAT.md and the admin fansub/episode-import frontend surfaces
provides:
  - FansubAliasSection.tsx with no nested <form> element inside the outer FansubDetailsTab.tsx form
  - Enter-to-create and click-to-create alias behavior preserved without any outer form submission
  - 167-UAT.md GAP-04 entry (status: resolved)
affects: [167-fansub-gruppenerkennung-beim-import, admin-fansubs-edit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Replace nested <form onSubmit> sub-sections with a plain container element; trigger the action via onKeyDown (Enter, with preventDefault + stopPropagation) and onClick (type=\"button\"), never via a second <form onSubmit>."

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

key-decisions:
  - "Removed the inner <form onSubmit={handleCreate}> entirely (replaced with <div>) instead of e.g. wrapping it differently, per plan Rule 4 boundary avoidance — no architectural change needed, just markup/event-handling."
  - "Enter-key handling uses both preventDefault() and stopPropagation() to guarantee the keydown never bubbles to the outer <form onSubmit={save}> in FansubDetailsTab.tsx, matching the plan's threat mitigation T-QUICK260924-CGG-01."
  - "handleCreate's guard condition on Enter (!creating && newAliasText.trim()) mirrors the Button's existing disabled condition exactly, so behavior stays identical between the two trigger paths."

patterns-established:
  - "Nested-<form> avoidance pattern for sub-sections embedded inside a larger page-level <form>: container element + onClick(type=\"button\") + onKeyDown Enter with preventDefault/stopPropagation."

requirements-completed: [QUICK-260924-CGG-01, QUICK-260924-CGG-02]

# Metrics
duration: ~25min
completed: 2026-09-24
---

# Phase quick-260924-cgg: GAP-04 verschachteltes Formular Summary

**FansubAliasSection.tsx rendert kein eigenes `<form>` mehr innerhalb des äußeren
Gruppen-Formulars; Alias-Anlegen per Enter oder Button-Klick funktioniert unverändert, ohne
je das äußere `<form onSubmit={save}>` auszulösen.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-24
- **Tasks:** 2
- **Files modified:** 3 (2 code, 1 docs/UAT)

## Accomplishments
- Entfernt das verschachtelte `<form onSubmit={handleCreate}>` in `FansubAliasSection.tsx`
  (Ursache des Next.js-Hydration-Fehlers "In HTML, `<form>` cannot be a descendant of `<form>`")
  und ersetzt es durch ein neutrales `<div>`.
- Button "Alias hinzufügen" wechselt von `type="submit"` zu `type="button"` mit
  `onClick={() => void handleCreate()}`; Eingabefeld erhält `onKeyDown`, das bei Enter
  `preventDefault()` + `stopPropagation()` aufruft, bevor `handleCreate()` ausgeführt wird — Enter
  legt weiterhin einen Alias an, sendet aber nie das äußere Formular ab.
- 3 neue Testfälle decken das Verhalten ab: kein `<form>`-Element im Render-Output, Enter im
  Feld triggert Anlegen ohne äußeres Submit, Button-Klick triggert Anlegen ohne äußeres Submit.
  Alle 12 Tests in `FansubAliasSection.test.tsx` grün.
- Grep-Sweep über `frontend/src --include="*.tsx"` bestätigt: außer dem jetzt gefixten
  `FansubAliasSection.tsx` und dem unveränderten, korrekten äußeren
  `FansubDetailsTab.tsx`-Formular enthält kein weiteres Phase-167-Frontend-File ein `<form>`.
- `167-UAT.md` GAP-04-Eintrag mit `status: resolved`, LF-Zeilenenden, GAP-01..03 unverändert.
- `team4sv30-frontend` neu gestartet, bestätigt neuere Startzeit
  (`2026-09-24T08:35:09Z` → `2026-09-24T09:08:11Z`), Container-Status "Up".

## Task Commits

Each task was committed atomically:

1. **Task 1: Verschachteltes `<form>` in FansubAliasSection.tsx entfernen (GAP-04)** - `a80d6e95` (fix)
2. **Task 2: Grep-Sweep, 167-UAT.md-Eintrag, Frontend-Verifikation und Container-Neustart** - `2d345fad` (docs)

_No TDD RED/GREEN split was used — this is a single `type="auto" tdd="true"` task where the plan
prescribed the test file changes and implementation changes together within Task 1's single commit
(the plan's own `<action>` block does not call for a separate failing-test-first commit; both
files were verified together via the automated vitest run before committing)._

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` - Removed nested `<form>`,
  removed `type FormEvent` import, `handleCreate` no longer takes an event param, Button is now
  `type="button"` with `onClick`, Input gets `onKeyDown` Enter handling with
  `preventDefault`/`stopPropagation`.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx` - Added
  `renderSectionInsideOuterForm` helper and a new `describe("FansubAliasSection — GAP-04: kein
  verschachteltes Formular", ...)` block with 3 new test cases.
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` - Appended GAP-04 entry
  (`status: resolved`) after the existing GAP-03 entry; GAP-01..03 untouched.

## Decisions Made
- No architectural changes needed (Rule 4 not triggered) — purely a markup/event-handling fix,
  as anticipated by the plan's threat model.
- Kept the guard condition on the Enter-key path (`!creating && newAliasText.trim()`) identical to
  the Button's `disabled` condition so both trigger paths behave identically under all states
  (loading, empty input, disabled `canManage`).

## Deviations from Plan

None - plan executed exactly as written. Task 1's `<action>` steps 1-6 and Task 2's steps 1-5 were
followed as specified; no Rule 1-4 auto-fixes were needed.

## Issues Encountered

- The full `npm run test` suite (Task 2 step 3) surfaced 2 pre-existing, out-of-scope failures in
  `src/lib/cssCustomProperties.guard.test.ts` (a `--surface-muted` dead-custom-property reference
  found at `lib/roleCatalog.accessibility.test.ts:268`). These are unrelated to this plan's files
  (last touched in commits from phases 149/151/157, long before this quick task) and were not
  fixed, per the plan's scope-boundary instruction to document rather than silently fix
  out-of-scope failures.
- The combined `npm run typecheck && npm run lint` verify command (Task 2's automated verify)
  exits non-zero due to 3 pre-existing lint `error`s unrelated to this plan: 2
  `@typescript-eslint/no-require-imports` errors in `capture-responsive.cjs` (last touched in
  commit `10e6d216`, phase 140) and 1 `react/no-unescaped-entities` error in
  `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` (last touched in a pre-existing
  profile-work commit). `npm run typecheck` alone passes clean. No lint errors or warnings were
  reported against `FansubAliasSection.tsx` or `FansubAliasSection.test.tsx` — the files this plan
  touched are lint-clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GAP-04 from the 2026-09-24 Live-UAT is closed; `167-UAT.md` now has all four gaps (GAP-01..04)
  marked `status: resolved`.
- The pre-existing `cssCustomProperties.guard.test.ts` failures and the pre-existing lint errors in
  `capture-responsive.cjs` / `CapabilityDetailRow.tsx` remain open and unrelated to Phase 167 — they
  should be tracked separately if they need fixing (out of scope for this quick task).

---
*Phase: quick-260924-cgg*
*Completed: 2026-09-24*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx`
- FOUND: `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md`
- FOUND: `.planning/quick/260924-cgg-gap-04-verschachteltes-form-element-im-a/260924-cgg-PLAN.md`
- FOUND commit `a80d6e95` (Task 1)
- FOUND commit `2d345fad` (Task 2)
