# Deferred Items — Phase 181

Out-of-scope issues discovered during execution of 181-02 but NOT fixed
(per executor scope-boundary rule: only fix issues directly caused by the
current task's changes).

## Pre-existing `npm run lint` errors (4), unrelated to 181-02's changes

Found while running Task 2's full gate (`npm run lint`) after deleting
`frontend/src/app/me/releases`. All 4 are in files Plan 181-02 never touched
and were last modified by unrelated prior commits:

1. `frontend/capture-responsive.cjs:1:22,2:12` — `@typescript-eslint/no-require-imports`
   (`require()` style import forbidden). Not part of `frontend/src/**` app code;
   untouched by this plan.
2. `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx:77:57` —
   `react/no-unescaped-entities` (a literal `"` should be `&quot;`). Last
   touched by commit `10e6d216c` (Phase 140), unrelated to 181-02.
3. `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249:31` —
   "Compilation Skipped: Existing memoization could not be preserved"
   (React Compiler ESLint rule). Last touched by commit `dae198622`
   (the Phase 181 first-attempt revert), not by this plan. This file lives
   inside the one surviving editor surface (`D-01`/`D-05` forbid touching it
   in 181-02), so it is explicitly out of scope here.

None of these 4 errors are newly introduced by 181-02's redirect-wiring or
route-deletion work. Confirmed via `git log -- <file>` showing no commit from
this plan touched any of them. Left unfixed; tracked here for a future
cleanup pass.
