# Deferred Items — Phase 178

## 178-02, Task 2: Pre-existing unrelated `tsc --noEmit` failure

`cd frontend && npx tsc --noEmit -p tsconfig.json` reports one error unrelated to this
plan's changes:

```
.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts(36,29):
error TS2344: Type 'Props' does not satisfy the constraint 'PageProps'.
```

This is a Next.js dev-server-generated route type artifact under `frontend/.next/`
(gitignored, not part of the repo's source tree) for a route completely unrelated to
`frontend/src/types/fansub.ts`. Confirmed pre-existing and independent of this plan's
change: reverting the new `aliases?: string[]` field and re-running `tsc --noEmit`
reproduces the identical error. Out of scope for 178-02 per the executor scope
boundary (pre-existing failure in an unrelated, generated file). Not fixed.

## 178-03: Pre-existing unrelated `vitest run` (full-suite) failures

Running the full frontend suite (`cd frontend && npx vitest run`) after 178-03's changes shows
3 failed test files / 2 failed tests, none touching `frontend/src/app/admin/groups/` or
`frontend/src/lib/textFilter.ts`:

- `src/components/profile/badgeArtwork.test.ts` ("canonical live catalog and shipped files")
- `src/components/ui/ResponsiveImage.config.test.ts` ("allows only the configured Team4s API
  media namespace for responsive group logos")
- `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (reads a hardcoded
  absolute path `/backend/internal/permissions/permissions.go`, which does not exist outside the
  project's Docker container filesystem layout)

All three are sandbox/environment-path-dependent and unrelated to this plan's files. Confirmed
out of scope per the executor scope boundary (pre-existing failures in unrelated files). Not
fixed. The scoped test run (`npx vitest run src/app/admin/groups/`) and `npm run build` both pass
cleanly.

## 178-06: Same pre-existing unrelated `vitest run` (full-suite) failures recur

Two consecutive full-suite runs (`cd frontend && npx vitest run`) after 178-06's changes again
show 3 failed test files, none touching `frontend/src/app/admin/anime/hooks/`,
`frontend/src/app/admin/anime/create/`, or `frontend/src/app/admin/anime/components/CreatePage/`:

- Run 1: `src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` (test timeout)
- Run 2: `src/components/profile/badgeArtwork.test.ts`, `src/components/ui/ResponsiveImage.config.test.ts`,
  `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` — the exact same three
  files already logged under 178-03 above

The differing failure set between the two runs (timeout-sensitive vs. environment-path-dependent)
confirms these are flaky/sandbox-resource-contention failures in unrelated files, not a regression
introduced by this plan. The scoped test run (`npx vitest run src/app/admin/anime`, 491/491 passing)
and `npm run build` both pass cleanly. Out of scope per the executor scope boundary. Not fixed.

## 178-07, Task 1: Full-suite gate — environment findings and pre-existing unrelated failures

Running the plan's 7 gate commands surfaced that this project's `npm test` / `go test` suites are
designed to run **inside the Docker Compose dev containers** (`docker-compose.override.yml` wires
`API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, and a `./backend:/backend:ro` mount into
`team4sv30-frontend`; the host has no bare `npm`/`go` environment for these env-dependent tests —
`go` is not even installed on the host). Running on bare host vs. inside
`docker compose exec team4sv30-frontend`/`team4sv30-backend` produces different results for
env-gated tests; the container run is the correct baseline and is what's reported below.

**Frontend `npm test` (inside `team4sv30-frontend`):** 375/376 files, 3408/3411 tests green on a
clean re-run. On bare host (no `API_INTERNAL_URL`/`NEXT_PUBLIC_API_URL`/`/backend` mount), the same
3 already-logged env-path-dependent files above additionally fail — confirms they are purely
environment artifacts, not code regressions. One additional transient timeout
(`src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.test.tsx`, 5000ms limit under full-
suite CPU contention) occurred on the first in-container run and passed both in isolation (257ms)
and on a clean re-run of the full suite — same flakiness pattern already documented above for
`AchievementBadgeShowcase.test.tsx` under 178-06. Not fixed (transient, unrelated to this phase's
files).

**Frontend `npm run lint`:** 4 errors, all in files never touched by any 178-0x plan and predating
178-01 (confirmed via `git show <178-01-first-commit>^:<file>`):
- `capture-responsive.cjs:1-2` — `require()` style import forbidden (`@typescript-eslint/no-require-imports`)
- `src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:433` — "Compilation Skipped: Existing memoization could not be preserved" (React compiler)
- `src/app/admin/users/tabs/CapabilityDetailRow.tsx:77` — `react/no-unescaped-entities`

A scoped lint run limited to every file actually touched by plans 178-01..178-06
(`textFilter.ts`, `AdminGroupsClient.tsx`, `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx`,
`GroupMediaReviewSection.tsx`, the Create-flow and `useGenreTagAutocomplete` files) reports **0
errors, 35 pre-existing warnings** (native-input/select `no-restricted-syntax` warnings on fields
not yet migrated — expected at today's warning-only enforcement level per `CLAUDE.md`). Not fixed —
out of scope per the executor scope boundary (pre-existing errors in unrelated files).

**Backend `go test ./internal/repository/... ./internal/handlers/...`:** Scoped to
`-run "Fansub|Alias|Kuerzel|Group"`, every test passes (0 failures). Run unscoped with only
`TEAM4S_PHASE167_TEST_DSN` set (as the plan's action text specifies), 49 tests fail; setting the
pre-existing `TEAM4S_PHASE128_TEST_DSN` fixture too (a different, unrelated phase's live-Postgres
gate, same `team4s_phase128_test` DB already present on the shared dev Postgres) resolves 35 of
those immediately, confirming they were pure missing-env-var noise. The remaining 14, none naming
Fansub/Group/Alias/Kuerzel:
- `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` — unrelated member-claims repository, looks like shared-fixture-DB test-order/state pollution (`Should not be: -1`)
- 9x `TestPhase134Matrix*` — require a reachable live Keycloak password-grant login plus the full stack answering on `http://192.168.235.196:18093` (a port that isn't mapped by `docker-compose.yml`, which exposes the backend on `18092`); these are live-stack E2E gates for the unrelated Phase 134 UAT fixture, not reachable from this container as configured
- `TestPhase141RevokedDelegationImmediateEffect` — "Action `release_version_media.reorder` fehlt in role_capabilities" — a permission-cache seed/migration-state gap in an unrelated review-delegation test
- 3x Jellyfin `11eyes` tests (`TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`, `Test11eyesSourceSelection_AllActualItemsAndPermutations`, `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery`) — read fixture files under `docs/audits/2026-09-15-jellyfin12/fixtures/`, which exist on the host repo tree but are not volume-mounted into either backend container (`docker-compose.yml`'s backend service has no `./docs:/docs` mount, unlike the frontend dev override)

None of these 14 touch any file this phase modified. Not fixed — out of scope per the executor
scope boundary (pre-existing failures in unrelated domains/infrastructure gaps).

**`git diff --check`:** clean.

**Housekeeping:** `npm run build` regenerates `frontend/next-env.d.ts` (switches a `.next/dev/types`
reference to `.next/types`, an auto-generated artifact of build-mode vs. dev-mode compilation).
Reverted with `git checkout -- frontend/next-env.d.ts` after the gate run — not a source change,
not committed.
