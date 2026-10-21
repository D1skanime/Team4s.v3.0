# Deferred Items — Phase 190

Out-of-scope issues discovered during execution but not fixed (scope boundary rule:
only auto-fix issues directly caused by the current task's changes).

## 190-03

- **`frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx` — "ruft
  applyDefaultCrew auf und zeigt Ergebnis-Feedback nach Klick"**: fails on the full
  suite run (`expected true to be false` on the button's `disabled` state) and is
  unrelated to any file touched by plan 190-03 (public fansub group page team
  section). Last modified in commit `ae71aa18b` (phase 176), not part of this phase's
  scope. Logged here, not fixed.

## 190-09

- **`npm run lint` exits non-zero repo-wide (5 pre-existing errors, 216 warnings)**:
  `capture-responsive.cjs` (2x `no-require-imports`, root-level scratch script),
  `src/app/admin/users/tabs/CapabilityDetailRow.tsx` (`react/no-unescaped-entities`),
  `src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx` (native
  `<input>` instead of `@/components/ui` `Input`), and
  `src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
  (React Compiler memoization-mismatch error). None of these files were touched by
  any Phase 190 plan (verified: zero lint findings, warning or error, across all 26
  frontend files this phase modified). Pre-existing repo-wide lint debt, out of this
  phase's scope — not fixed.
