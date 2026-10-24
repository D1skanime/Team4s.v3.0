# Deferred Items (out of scope for 191-31, 191-36)

## `RoleCapabilityDetail.membershipBaselineDrift.test.ts` fails with an absolute host path (191-36)

Full `npm run test` run (419 files, 3850 tests) during 191-36 shows 2 failed / 3842 passed / 3
skipped / 3 todo. The 2 failures are both inside
`src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (introduced in Phase
188-05, `git log` confirms its most recent touch predates Phase 191): it reads
`BACKEND_PERMISSIONS_GO_PATHS` via `readFileSync` against an absolute path starting with
`/backend/...`, which only resolves inside the `team4sv30-backend`/`team4sv30-frontend`
containers' mount layout, not against this host checkout's `/home/d1sk/team4s/backend/...`
path. No file this plan touches (`MyProposalsSection.tsx`, `FansubGroupHintsReviewSection.tsx`,
`FansubGroupHintsAdminClient.tsx`, their tests, `docs/FRONTEND_ARCHITEKTUR.md`) is anywhere near
this anti-drift test's scope. Confirmed in-scope cleanliness: the three targeted test files for
this plan (`MyProposalsSection FansubGroupHintsReviewSection FansubGroupHintsAdminClient`) pass
43/43. Per the scope-boundary rule, left untouched — a future cleanup should either run the full
suite only inside the container or make the anti-drift test resolve its path relative to the
repo root instead of a hardcoded absolute mount path.

## Repo-wide `npm run lint` is red for reasons unrelated to this plan

`npm --prefix frontend run lint` exits non-zero on `main` (5 errors, 216 warnings as of
2026-10-24). All 5 errors are in files this plan's `files_modified` list never touches:

- `frontend/capture-responsive.cjs` (2x `@typescript-eslint/no-require-imports`)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249`
  (React Compiler "memoization could not be preserved")
- `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx:77` (`react/no-unescaped-entities`)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx:69`
  (native `<input>` forbidden by the UI-system ESLint rule)

`git log --oneline -3` on each of these files shows their most recent touch predates Phase 191
entirely (phases 97, 140, 189). This is pre-existing lint debt, not something introduced or
worsened by plan 191-27/191-31's CSS-module split or import repoint.

Confirmed in-scope cleanliness: `npx eslint` run directly against all 13 files this plan's
`files_modified` list covers (the 12 repointed `.tsx` files + `docs/FRONTEND_ARCHITEKTUR.md`,
which eslint does not lint) returns zero errors and zero warnings.

Per the executor's scope-boundary rule ("Only auto-fix issues DIRECTLY caused by the current
task's changes"), these 5 pre-existing errors were left untouched and are logged here instead
of being fixed inline. A future plan/quick-task should address them as their own, independently
scoped cleanup.

## One flaky, unrelated test observed during the full-suite run

`src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx` failed once in a full
`npm run test` run inside the `team4sv30-frontend` container (full-suite run: 1 failed | 415
passed | 1 skipped). Re-run in isolation (`npx vitest run
src/app/admin/fansubs/\[id\]/edit/DefaultCrewManager.test.tsx`) immediately afterward: 6/6
passed. This file is untouched by plan 191-27/191-31 and the failure did not reproduce in
isolation -- logged as a pre-existing flaky test (likely full-suite test-order/timing
sensitivity), not a regression from this plan's CSS-module repoint.
