# Deferred Items (out of scope for 261019-kq9)

## Flaky test unrelated to this quick task

- **File:** `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx`
- **Test:** `DefaultCrewManager > ruft applyDefaultCrew auf und zeigt Ergebnis-Feedback nach Klick`
- **Symptom:** Fails intermittently when run as part of the full `npm run test` suite
  (`expected true to be false` on `(btn as HTMLButtonElement).disabled`), but passes
  reliably when run in isolation (`npx vitest run 'src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx'`
  -> 6/6 green).
- **Reason not fixed here:** This file is untouched by plan 261019-kq9 (theme video audio
  on the anime detail page). Per the scope boundary rule, pre-existing failures/flakiness
  in unrelated files are logged, not fixed, during this quick task.
- **Suggested follow-up:** Investigate async timing/race condition in
  `DefaultCrewManager` state updates when run in parallel with the rest of the suite.

## Pre-existing lint errors unrelated to this quick task

`npm run lint` reports 4 pre-existing errors (227 total problems, 4 errors + 223
warnings), none of which touch the 3 files modified by plan 261019-kq9
(`themeVideoAudio.ts`, `themeVideoAudio.test.ts`, `AnimeBackdropRotator.tsx` --
these three are lint-clean). Logged, not fixed, per the scope boundary rule:

- `capture-responsive.cjs:1,2` -- `@typescript-eslint/no-require-imports`
  (require() style imports in a root-level `.cjs` script)
- `src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249` --
  React Compiler "Compilation Skipped: Existing memoization could not be preserved"
  (inferred dependency `storyContext` vs. manually specified deps)
- `src/app/admin/users/tabs/CapabilityDetailRow.tsx:77` --
  `react/no-unescaped-entities` (unescaped `"` in JSX text)
