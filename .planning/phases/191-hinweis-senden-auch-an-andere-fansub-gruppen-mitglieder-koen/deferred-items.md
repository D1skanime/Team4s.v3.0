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

## Reconfirmed during Plan 191-37 Task 2 (2026-10-24, same-day re-run)

The full regression gate was re-run against a freshly rebuilt backend/frontend as part of this
round's close. Same two pre-existing, unrelated conditions reproduced identically, confirming
they are a stable baseline state rather than something this round introduced:

- `npm run lint` inside `team4sv30-frontend`: still exactly the same 5 errors in the same 4 files
  listed above (`capture-responsive.cjs`, `useReleaseVersionMedia.ts:249`,
  `CapabilityDetailRow.tsx:77`, `ReleasesFilterBar.tsx:69`) — none of them touched by any 191-32
  through 191-37 commit (`git log --oneline -3` on each file still shows no Phase-191 commit).
  DECISIONS.md (the only file Task 2 of 191-37 modifies) is not eslint-linted at all.
- `npm run test` inside `team4sv30-frontend`: full run showed `DefaultCrewManager.test.tsx` fail
  once (1 failed / 417 passed / 1 skipped), then pass 6/6 in isolation, then pass in a second full
  re-run (418 passed / 1 skipped, 0 failed) — same flaky, test-order-sensitive, pre-existing
  condition as before, not a regression.
- All three other 191-36-documented false failures (`badgeArtwork.test.ts`,
  `ResponsiveImage.config.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`) were
  reproduced on the HOST (`npm --prefix frontend run test`, not inside the container) and
  confirmed to pass cleanly once re-run inside `team4sv30-frontend` — these three are purely a
  host-vs-container environment artifact (missing `API_INTERNAL_URL` and the `/backend` mount on
  the host), not a real failure, and not specific to this round.
