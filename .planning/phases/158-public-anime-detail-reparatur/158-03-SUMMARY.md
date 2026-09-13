---
phase: 158-public-anime-detail-reparatur
plan: "03"
subsystem: ui
tags: [anime, routing, metadata, react-cache, suspense, regression]
requires:
  - phase: 158-01
    provides: Authoritative optional AnimeDetail.slug and canonical contract coverage
  - phase: 158-02
    provides: Reactive client-owned watchlist status and session handling
provides:
  - Strict public anime resource validation shared by page and metadata
  - Existing loading UI behind explicit route-local content boundaries
  - Honest anime metrics, local hero clipping and readable episode cards
  - Project links from stored anime and fansub slugs with numeric compatibility
affects: [158-04, 159]
tech-stack:
  added: []
  patterns: [request-scoped React cache, validation before Suspense, authoritative slug navigation]
key-files:
  created:
    - frontend/src/app/anime/[id]/animeDetailData.ts
    - frontend/src/app/anime/[id]/animeDetailData.test.ts
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  modified:
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/app/anime/[id]/page.performance.test.ts
    - frontend/src/app/anime/AnimeListLoading.tsx
    - frontend/src/app/anime/[id]/AnimeDetailLoading.tsx
    - frontend/src/app/anime/page.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css
key-decisions:
  - "Page and metadata share cache(getAnimeByID); only API 404 becomes Next notFound."
  - "Keep existing list/detail loading UI but validate the detail resource before its explicit Suspense."
  - "Use stored slugs and the existing project path builder; missing slugs retain numeric compatibility."
requirements-completed: [P158-01, P158-02, P158-05, P158-06, P158-07]
duration: approximately 12min
completed: 2026-09-13
---

# Phase 158 Plan 03: Public Anime Route and Presentation Repair Summary

**Strict request-shared anime loading now drives canonical metadata and pre-content validation; public rendering removes viewer-specific SSR state and invented metrics while retaining the existing layout and domain routes.**

## Execution Boundary

- Canonical repository: `/home/d1sk/team4s` via SSH; all edits, Git operations and checks ran on Linux. Frontend checks used the existing Compose service `team4sv30-frontend`.
- Audit/phase baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
- Plan starting commit: `954f6313d00d6ff3f868dfea256ecf243281b7f9`.
- Product end commit: `d0ae1f9b` at 2026-09-13T21:09:46Z.
- First recorded RED run: 2026-09-13T21:02:04Z. Initial reading began after the 20:58:39Z starting commit; approximately 12 minutes including documentation.
- Tasks: 3/3. Twelve source/test files, including two intentional loading-component renames, plus this summary.
- Requirement entries above record implementation coverage. Full production HTTP, computed geometry, RSC request counting and live runtime parity remain 158-04 gates; this summary does not close them.
- No push, backend restart, DB write, seed, migration, runtime environment change or live `.next` production build. Unrelated `frontend/scripts/shot2.mjs` remains untouched.
- STATE/ROADMAP/REQUIREMENTS are owned by the phase orchestrator.

## Task Commits

1. **Task 1: Strict resource and metadata** — `e3bbeecb` (test RED), `96be3ea9` (feat GREEN).
2. **Task 2: Loading boundaries after validation** — `482a13d8` (fix; three new boundary regressions ran RED before implementation).
3. **Task 3: Public rendering and project navigation** — `2d2ddffd` (test RED), `d0ae1f9b` (feat GREEN).

The renames from `app/anime/loading.tsx` and `app/anime/[id]/loading.tsx` are intentional. Their JSX remains available as `AnimeListLoading.tsx` and `AnimeDetailLoading.tsx`; no URL or compatibility page was deleted.

## Changed Sections and Files

- `animeDetailData.ts` rejects non-decimal, non-positive and unsafe IDs before any API call. It accepts leading zeroes but passes the numeric ID to one module-level `cache(getAnimeByID)` function. Stored slugs pass through unchanged. Only `ApiError(404)` enters `notFound()`; 401, 5xx and network failures propagate.
- `page.tsx` uses this loader for both `generateMetadata` and the page. Success title is the real anime title plus ` | Team4s`; canonical is `/anime/{numericId}` without grid parameters. Missing/invalid resources use Next's not-found mechanism, including its `noindex` handling.
- The page validates existence before rendering its explicit `Suspense`. Its async content child owns the existing parallel fansub, grouped-episode, comment and relation reads. The list similarly wraps its unchanged async content in its own explicit loading boundary. There is no global proxy, root clipping or `htmlLimitedBots` workaround.
- The old SSR cookie/static-token/watchlist read and `initiallyInWatchlist` prop are removed. The existing reactive client component from 158-02 owns status. The media manifest remains client-owned.
- The fabricated 7.8 rating, anime view metrics, unused metric CSS and empty stats wrapper disappear. Real episode counts/counters remain; Anime 22 still links to Emby item 2112 through the unchanged existing mapping.
- `page.module.css` clips only the decorative `.heroBanner`; `.heroContainer` keeps visible overflow. `FansubVersionBrowser.module.css` gives the existing white `.episodeCard` the global `--color-text-primary` token inherited by its header.
- `FansubVersionBrowser.tsx` receives `anime.slug`, uses the selected group's already-loaded summary slug and `buildPublicFansubProjectPath`, and retains the existing numeric route if either slug is missing. No profile request, slug guessing, new route or new contract is introduced.
- Tests cover strict parsing, error classification, metadata, loading boundaries, request ownership, real episode fallback data, Emby preservation, local CSS ownership, primary/secondary pretty links, encoding and numeric fallbacks. Existing numeric/pretty route and canonical tests also pass.

## Verification

All commands ran from the canonical repository using `docker compose exec -T team4sv30-frontend`:

| Check | Result |
|---|---|
| `npm test -- 'src/app/anime/[id]/animeDetailData.test.ts' 'src/app/anime/[id]/page.test.tsx'` — Task 1 RED | Page: 9 expected failures; new loader module absent as expected |
| Same command — Task 1 GREEN | 28/28 tests pass |
| Page boundary regressions — Task 2 RED then GREEN | Three expected failures; combined loader/page suite 31/31 pass after correction |
| Page, performance and browser component suites — Task 3 RED | Nine expected failures for cookies, slug, metrics/wrapper and CSS/link defects |
| Four plan suites after Task 3 implementation | 48/48 tests pass, including 19 loader, 18 page, 2 performance and 9 browser tests |
| Expanded loader whitespace/line-ending matrix | 23/23 pass; four additional cases reject newline, carriage return, U+2028 and U+2029 without requesting an anime |
| Existing `fansubProjectRoutes.test.ts`, numeric group `page.test.tsx`, pretty project `page.test.tsx` | 26/26 pass, including existing canonical behavior |
| `npm run typecheck` | Exit 0; full frontend typecheck |
| `npx eslint` on all ten affected TS/TSX files | Exit 0, no warnings or errors |
| `git diff --check` and scoped self-review | Pass |
| Per-commit deletion and untracked checks | Only intentional loading renames; unrelated shot2.mjs preserved |

The final distinct targeted test inventory is 78 passing cases: 52 across the four plan suites plus 26 existing route/builder cases. No full-suite, full-lint or production-build result is claimed here; those belong to 158-04. Phase baseline remains the recorded two old CSS guard test failures and 13 lint errors/331 warnings. The two old route type errors were already fixed in 158-01; this plan's full typecheck is clean.

React cache is deliberately a pass-through mock in Node/Vitest because those tests do not run a Server Component request dispatcher. Unit tests establish shared-loader wiring and one page/content resource call; actual Page-plus-Metadata memoization must be counted in 158-04's isolated Next fixture. React documentation was checked through the Context7 CLI in the existing frontend container; no dependency was added to the project.

## Runtime Evidence and Open Gates

The orchestrator independently reported a read-only normal-Chrome-UA smoke at `482a13d8`: `/anime/1abc`, `/anime/1.5`, `/anime/0`, `/anime/-1` and `/anime/999999999` returned actual HTTP 404 with `robots=noindex`, no canonical and the default Team4s title. This supports the boundary correction on the development runtime; it does not replace the isolated production gate.

After `d0ae1f9b`, the shared live page reportedly shows `Buddy Complex | Team4s` and no fabricated metrics. Its visible group link still used `/anime/1/group/1`; the orchestrator is investigating whether the still-running backend predates the 158-01 slug projection. This is **not a Pretty-live PASS**. Missing runtime slugs intentionally select numeric compatibility. Do not restart the backend implicitly: startup runs migrations.

Still required in 158-04: isolated production build, all required real HTTP/status/metadata cases, Page/Metadata fetch counts, normal-browser pretty/numeric navigation, runtime/source parity, responsive widths 360/390/767/768/1440, actual computed colors/scroll geometry and focus/slider behavior. Unit CSS checks are ownership guards, not browser layout measurements.

## Deviations and Issues

- Integration sequencing: Page/metadata wiring was included in Task 1 and detail Suspense in Task 2 so each task had a coherent executable regression gate. Task 3 completed the planned SSR/metric/link/CSS changes. No scope or product decision changed.
- A Vitest setup callback initially returned the mock function from `beforeEach`; Vitest interpreted it as cleanup and invoked rejected mocks after tests. Braces removed the accidental cleanup return. No product workaround was introduced.
- No new architecture or API contract changes. The route/cache, viewer-state removal and link authority changes stay within T-158-06/07/08 from the plan; no additional unmodeled trust surface was found.
- Stub scan: no new product stub. Existing empty/default values remain real error/absence branches backed by the current API calls. Test-only fixture data is intentional.
- Human-UAT 156 GAP-02 and 157-06 Task 4 remain OPEN. No automated check constitutes human sign-off.

## Self-Check: PASSED

All twelve final source/test files exist. All five task commits were found in Git. The two original automatic loading-convention files are absent by the documented rename. Only this summary is added by the metadata commit; global GSD state remains with the orchestrator.
