---
phase: 155-fansub-projektseite-read-model-und-query-budget
verified: 2026-09-11T16:36:42Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 155: Public-Fansub-Projektseite: Read-Model, Drill-down-Navigation und Query-Budget Verification Report

**Phase Goal:** Die oeffentliche Fansub-Projektseite liefert dieselben sichtbaren Informationen wie
heute, laedt sie aber ueber einen gezielten Project Resolver, eine schlanke Contributor-Summary und
entflochtene Release-Pfade — ohne doppelten Profil-Load, ohne Vollinventar-Abfragen und ohne Fetches
ohne sichtbaren Consumer; Member-Klicks fuehren kanonisch auf die Projekt-Member-Route.

**Verified:** 2026-09-11T16:36:42Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `groupSlug+animeSlug` resolves without loading the full public fansub profile (P155-01) | ✓ VERIFIED | `backend/internal/repository/fansub_project_resolver_repository.go` has `ResolveProject`/`ListProjectNavigationProjects`, parameterized (`$1`/`$2`, no string concat), reusing `publicAnimeSlugSQL` + `a.status <> 'disabled'`. Route registered `main.go:436`. Handler test suite (4 tests) run directly via `go test` in this session — all PASS, including byte-identical-404 assertion. |
| 2 | No double public-profile load in the normal project request (P155-02) | ✓ VERIFIED | All three pretty routes (`page.tsx`, `mitwirkende/[memberSlug]/page.tsx`, `releases/[releaseVersionId]/page.tsx`) grep-confirmed to call `resolveFansubProject`, zero calls to `getPublicFansubProfileBySlug` in the actual route source (only in test mocks/absence-assertions). `projectPageData.ts`'s `precomputed` param confirmed present (`releaseVersionCount`/`precomputed` grep) and used by the project page to skip the loader's internal profile fetch. |
| 3 | Contributor Summary contains no member detail data (P155-03/P155-04) | ✓ VERIFIED | `GetProjectContributors`'s two queries (external/team) unchanged; new query-budget test proves constant 2-query cost at 2+2 vs 30+20 contributor scale. Re-ran `TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors` directly against a freshly-provisioned `team4s_phase155_test` DB in this session — **PASS**, confirms 2 queries at both scales, matching the SUMMARY's claimed measurement. |
| 4 | Member click in project context leads canonically to the Project-Member route (P155-05/P155-06) | ✓ VERIFIED | `ProjectMemberRows.tsx` builds `${canonicalProjectPath}/mitwirkende/${slug}`, only falling back to `/members/[slug]` when `canonicalProjectPath` is absent. `canonicalProjectPath` is now always resolver-derived (precomputed) for the pretty route. Chain traced: resolver → `precomputed.canonicalProjectPath` → `ProjectPage.tsx` → `TeamSection` → `ProjectMemberRows`. |
| 5 | Release data paths disentangled: Latest Preview / History / Counts (P155-07/P155-08/P155-09) | ✓ VERIFIED | `projectPageData.ts` grep-confirmed zero occurrences of `getGroupThemes`, `getGroupReleaseMedia`, `per_page: 100`, `hasThemes`, `hasMedia`, `releaseEpisodes`; `releaseVersionCount` present (interface + assignment). New standalone `GetGroupReleaseVersionCount` + `/releases/count` endpoint exist and are wired. Re-ran `TestGetGroupReleaseVersionCount_MatchesLegacyRowCountForMultiVersionEpisode`/`_MatchesSingleVersionCase` in isolation against a fresh DB in this session — **PASS** (new count byte-identical to legacy row count, explicitly not equal to the rejected distinct-episode count). |
| 6 | Non-rendered data (Themes/Media) no longer fetched initially (P155-10) | ✓ VERIFIED | Same grep as above — zero `getGroupThemes`/`getGroupReleaseMedia`/`hasThemes`/`hasMedia` in `projectPageData.ts`. `ThemesSection.tsx`/`MediaSection.tsx` deliberately left in place, unrendered (documented, matches CONTEXT.md's "no silent deletion" instruction). |
| 7 | Existing information architecture preserved, incl. "Neuestes Fansub-Release" block, no redesign (P155-11) | ✓ VERIFIED | `ProjectPage.tsx`/`ReleasesSection.tsx` render tree unchanged in structure; `ReleasesSection.test.tsx` (2 tests) pass, confirming the block still renders when a release preview exists. |
| 8 | No new table/materialization/duplication; indices only with query-plan evidence (P155-12) | ✓ VERIFIED | No new migration files in `database/migrations/` for this phase; both new repository methods reuse existing tables/predicates. |
| 9 | Resolver/Summary expose only public data; visibility filters unchanged; not-found documented (P155-13) | ✓ VERIFIED | `ResolveProject` reuses `a.status <> 'disabled'` predicate; handler collapses both negative branches into one neutral 404 (`fansubprojekt nicht gefunden`), proven byte-identical by a real httptest assertion re-run in this session. |
| 10 | Before/after measurement of requests/queries/payload/TTFB documented (P155-14) | ✓ VERIFIED | `docs/audits/2026-09-11-fansub-project-performance/{REPORT,TABLES,REPRODUCE,VALIDATION}.md` all exist on disk with concrete Vorher/Nachher numbers, three explicitly-documented deliberate non-fixes, and a live Playwright measurement against the running dev stack. |
| 11 | Backend/frontend tests green, contract parity Go/OpenAPI/TS/api.ts, clean working tree (P155-15) | ✓ VERIFIED (with one documented non-blocking caveat — see Gaps Summary) | `go build`/`go vet` clean (re-run in this session). New handler tests (4/4) and new query-budget tests (individually re-run: all PASS) pass. `tsc --noEmit` clean. Targeted `vitest run` across all touched files (22 files / 136 tests) — all PASS. `openapi.yaml` contains `FansubProjectResolution` (schema + $ref) and `GroupReleaseCountResponse` (schema + $ref). `git status --short` is clean. **Caveat:** when `TEAM4S_PHASE155_TEST_DSN` is set and the FULL `internal/repository` package test suite is run in one process (not scoped by `-run`), two of Plan 155-02's tests (`TestGetGroupReleaseVersionCount_Matches*`) collide with Plan 155-03's contributor test on a hardcoded `fansub_groups` id (`1550400`/`1550500` used by both files) and fail with a duplicate-key error. Each test passes cleanly in isolation (verified in this session on a freshly reset DB); the collision only manifests when the DSN is actually set for a *combined* run, which none of the phase's own `<verify>` blocks ever did (each scoped its own test by name). Since `TEAM4S_PHASE155_TEST_DSN` is unset by default (skip-if-unset), this does not affect the default/CI `go test ./...` result reported by 155-07's SUMMARY, which is accurate as stated. This is a real, narrow test-fixture hygiene defect (not a production-code defect) — documented here as a non-blocking follow-up, consistent with how WR-02/WR-03 from the code review were treated. |
| 12 | Post-execution code review WR-01 regression fix applied (getGroupDetail error handling in member route) | ✓ VERIFIED | `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx:44-50` wraps `getGroupDetail` in the same try/catch-404-else-throw shape as its sibling calls; commit `c6678752` confirmed at `HEAD`. |
| 13 | Requirement traceability: all 15 `P155-*` IDs closed in REQUIREMENTS.md, matching plans' declared IDs | ✓ VERIFIED | Union of `requirements:` frontmatter across all seven plans covers P155-01 through P155-15 with no gaps. `.planning/REQUIREMENTS.md:220-260` has a "Phase 155 — Additive scope" section with all 15 IDs checked `[x]` and a 15-row traceability table, all "Complete" — confirmed by direct file read, not by trusting 155-07-SUMMARY.md's claim alone. |

**Score:** 15/15 truths verified (1 truth carries a documented, non-blocking test-hygiene caveat)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/fansub_project_resolver_repository.go` | ResolveProject + ListProjectNavigationProjects, parameterized | ✓ VERIFIED | Confirmed by direct read; both methods exist, use `$1`/`$2`, reuse `publicAnimeSlugSQL`/`a.status <> 'disabled'` |
| `backend/internal/handlers/fansub_project_resolver_handler.go` | ResolveFansubProject handler + WithProjectResolverRepo builder | ✓ VERIFIED | Confirmed by direct read; neutral 404 via shared `notFound()` helper, non-fatal navigation fallback |
| `backend/internal/repository/group_repository.go` | GetGroupReleaseVersionCount, extracted from GetGroupReleases's internal countQuery | ✓ VERIFIED | Confirmed present; `GetGroupReleases` itself unchanged (only new method appended) |
| `backend/internal/handlers/group_contributors_handler.go` | GetGroupReleaseCount handler | ✓ VERIFIED | Route registered `main.go:385` |
| `shared/contracts/openapi.yaml` | FansubProjectResolution + GroupReleaseCountResponse schemas | ✓ VERIFIED | Both schemas + $ref usage confirmed via grep |
| `frontend/src/lib/api.ts` | resolveFansubProject + getGroupReleaseCount client functions | ✓ VERIFIED | Both exported functions confirmed via grep, lines 1795/6614 |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` | releaseVersionCount replaces releaseEpisodes/themesData/releaseMediaData/hasThemes/hasMedia; precomputed param | ✓ VERIFIED | Confirmed by direct read/grep; 357 lines (under 450 ceiling) |
| Three pretty-route files (project/member/release) | resolveFansubProject wiring | ✓ VERIFIED | Confirmed by direct grep of the actual route source (not test mocks) |
| `docs/audits/2026-09-11-fansub-project-performance/{REPORT,TABLES,REPRODUCE,VALIDATION}.md` | Before/after audit | ✓ VERIFIED | All four files exist with concrete numbers and three named deliberate non-fixes |
| `.planning/REQUIREMENTS.md` Phase 155 section | 15 requirements marked complete | ✓ VERIFIED | Confirmed by direct read, not by trusting the SUMMARY claim |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `backend/cmd/server/main.go` | `fansubHandler.ResolveFansubProject` | route registration | ✓ WIRED | `main.go:436` |
| `backend/cmd/server/main.go` | `groupPublicHandler.GetGroupReleaseCount` | route registration | ✓ WIRED | `main.go:385` |
| `frontend/src/lib/api.ts#resolveFansubProject` | project pretty route | direct call | ✓ WIRED | Confirmed in route source |
| `frontend/src/lib/api.ts#resolveFansubProject` | project-member pretty route | direct call | ✓ WIRED | Confirmed in route source, incl. WR-01-fixed `getGroupDetail` |
| `frontend/src/lib/api.ts#resolveFansubProject` | release-detail pretty route | direct call | ✓ WIRED | Confirmed in route source |
| resolver `precomputed` | `loadPublicFansubProjectPageData` | project page → loader param | ✓ WIRED | Confirmed by grep + passing `projectPageData.test.ts` (7 tests) |
| `data.canonicalProjectPath` | `ProjectMemberRows` member link | prop chain via `TeamSection` | ✓ WIRED | Confirmed by direct read of the full chain |
| `getGroupReleaseCount` | `releaseVersionCount` → `HeroSection`/`ProjectStats` | loader → component prop | ✓ WIRED | Confirmed via grep + `ProjectStats.test.tsx`/`page.test.tsx` passing |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend build/vet | `go build ./... && go vet ./...` (golang:1.25-alpine container) | Clean, no errors | ✓ PASS |
| Resolver handler behavioral tests | `go test ./internal/handlers/... -run 'ResolveFansubProject\|ProjectResolver' -v` | 4/4 PASS | ✓ PASS |
| Resolver query-budget test (fresh DB) | `go test ./internal/repository/... -run TestFansubProjectResolverQueryBudgetIsConstant` | PASS, 2 queries at 1-project and 6-project scale | ✓ PASS |
| Resolver not-found test (fresh DB) | `go test ./internal/repository/... -run TestResolveProject_NotFound` | PASS | ✓ PASS |
| Contributor query-budget test (fresh DB) | `go test ./internal/repository/... -run TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors` | PASS, 2 queries at 2+2 and 30+20 scale | ✓ PASS |
| Release-count parity test (fresh DB, isolated) | `go test ./internal/repository/... -run TestGetGroupReleaseVersionCount` | PASS (fails only when run in the same process as the contributor test, due to a hardcoded id collision — see Gaps Summary) | ✓ PASS (isolated) / ⚠️ collision when combined |
| Frontend typecheck | `npx tsc --noEmit` | Clean | ✓ PASS |
| Frontend targeted vitest | `npx vitest run` across all 22 touched-area test files | 136/136 PASS | ✓ PASS |
| Frontend eslint (touched files) | `npx eslint api.ts fansubProjectNavigation.ts GroupAssetsExperience.tsx ProjectMemberRows.tsx` | 0 errors, 3 pre-existing `<img>` warnings | ✓ PASS |
| Route registration | grep `main.go` | `WithProjectResolverRepo`, `releases/count`, `projects/:animeSlug/resolve` all present | ✓ PASS |
| Working tree clean | `git status --short` | empty | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|--------------|----------------|--------------|--------|----------|
| P155-01 | 01, 06 | Resolver replaces full-profile resolution | ✓ SATISFIED | Code + tests confirmed above |
| P155-02 | 04, 06 | No double profile load | ✓ SATISFIED | `precomputed` seam + grep confirmed |
| P155-03 | 03 | Contributor projection has no detail data | ✓ SATISFIED | Query-budget test confirmed |
| P155-04 | 03, 07 | No per-member fan-out; 30-50 load test | ✓ SATISFIED | Test re-run, PASS |
| P155-05 | 06 | Canonical member-route linking | ✓ SATISFIED | `ProjectMemberRows.tsx` chain confirmed |
| P155-06 | 06 | Project-member page unchanged | ✓ SATISFIED | Only resolution call changed, tests preserved |
| P155-07 | 02, 04 | Latest/History/Counts disentangled | ✓ SATISFIED | Code confirmed |
| P155-08 | 02, 04, 05 | per_page:100 removed, count byte-identical | ✓ SATISFIED | Test re-run, PASS |
| P155-09 | 02, 04, 05 | Separate projections allowed | ✓ SATISFIED | Distinct DTOs confirmed |
| P155-10 | 04, 05 | No fetches without render consumer | ✓ SATISFIED | grep confirmed zero themes/media fetches |
| P155-11 | 05, 06, 07 | Info architecture preserved | ✓ SATISFIED | Render-tree structure unchanged, tests pass |
| P155-12 | 02, 07 | No new table/materialization | ✓ SATISFIED | No new migrations |
| P155-13 | 01, 07 | Public-only data, visibility unchanged | ✓ SATISFIED | Predicate reuse confirmed |
| P155-14 | 07 | Before/after audit | ✓ SATISFIED | Audit files confirmed |
| P155-15 | 01, 02, 07 | Tests green, contract parity, clean tree | ✓ SATISFIED (with documented caveat) | See Truth #11 |

No orphaned requirements found — `.planning/ROADMAP.md`'s Phase 155 requirement list (P155-01…15) is fully covered by the union of all seven plans' `requirements:` frontmatter, and REQUIREMENTS.md's Phase 155 section matches exactly.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/repository/group_release_version_count_test.go` / `group_contributors_repository_test.go` | fixed IDs `1550400`/`1550500` | Hardcoded test-fixture ID collision across two plans' test files | Warning | Both tests pass in isolation; fail with a duplicate-key error only when run together in one process with `TEAM4S_PHASE155_TEST_DSN` set (not the default/CI configuration). Discovered by direct re-execution in this verification, not previously caught by any plan's own `<verify>` step (each scoped its run by test name) or by 155-REVIEW.md (a static code review). Non-blocking; recommend re-namespacing one of the two id ranges as a follow-up. |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:49,269-271,340` | `hasTeamContent` | Dead computed field survives in the loader's public contract | Warning | Already documented in 155-REVIEW.md (WR-03); accepted as non-blocking per task instructions. |
| `frontend/src/lib/api.ts:6614-6635` | `getGroupReleaseCount` uses `authorizedFetch` instead of plain `fetch` | Convention deviation from documented numeric-ID fetch pattern | Warning | Already documented in 155-REVIEW.md (WR-02); accepted as non-blocking per task instructions. |
| `backend/internal/repository/group_contributors_repository.go` | `role_definitions.code = contributor_roles.name` | Case-sensitive join defect discovered during 155-03, pre-existing in production data | Info | Documented, correctly out-of-scope per 155-03-SUMMARY.md; not a Phase 155 regression. |

### Human Verification Required

None. All truths, artifacts, and key links were verifiable programmatically (grep, direct file read, `go build`/`go vet`/`go test`, `tsc --noEmit`, targeted `vitest run`, and route-registration checks), and the phase's own live Playwright audit (`docs/audits/2026-09-11-fansub-project-performance/`) already exercised the real dev-stack page load, satisfying the "visual/real-time behavior" verification concern for what is explicitly a non-UI-redesign, read-model/performance phase.

### Gaps Summary

No blocking gaps. All 15 `P155-*` must-haves are verified true in the codebase, not merely claimed in SUMMARY.md. Direct re-execution in this session (rather than trusting prior summaries) reproduced the exact query-budget numbers claimed by Plans 155-01/155-02/155-03 (2 queries, constant across scale) and confirmed the WR-01 code-review fix is present at `HEAD` (commit `c6678752`).

One previously-undiscovered, non-blocking defect was found during this verification: `group_release_version_count_test.go` (Plan 155-02) and `group_contributors_repository_test.go` (Plan 155-03) both hardcode `fansub_groups` ids `1550400`/`1550500`. When `TEAM4S_PHASE155_TEST_DSN` is set and the full `internal/repository` package test suite is run in a single process (as opposed to each plan's own `-run`-scoped invocation), the second-seeded test collides on `fansub_groups_pkey` and fails. This does not affect the default/skip-if-unset CI path 155-07-SUMMARY.md actually exercised (accurately reported as green), and does not indicate any production-code defect — both underlying repository methods are proven correct when their tests run in isolation (re-verified in this session against a freshly reset database). Recommended as a low-priority follow-up: re-namespace one of the two id ranges (e.g. move Plan 155-03's contributor fixture off `1550400`/`1550500`).

The three items already surfaced by 155-REVIEW.md (WR-01 fixed; WR-02, WR-03 accepted) and the one already-documented latent production-data defect from 155-03 (`contributor_roles.name`/`role_definitions.code` case mismatch) are carried forward here for completeness, consistent with the task's instruction to treat them as non-blocking.

---

_Verified: 2026-09-11T16:36:42Z_
_Verifier: Claude (gsd-verifier)_
