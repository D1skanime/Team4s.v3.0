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
