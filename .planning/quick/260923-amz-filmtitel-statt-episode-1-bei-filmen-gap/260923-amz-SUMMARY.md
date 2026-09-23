---
phase: quick-260923-amz
plan: 01
subsystem: episode-import-and-public-release-naming
tags: [go, postgres, nextjs, typescript, vitest, episode-import, release-name, film-type]

# Dependency graph
requires:
  - phase: 165-library-discovery-assisted-anime-creation
    provides: episode_import_repository_apply.go's mapAnimeTypeToEpisodeType (GAP-12), public_release_name.go's publicReleaseNameSQL (GAP-02)
provides:
  - Centralized film-episode-title fallback (episodeImportDisplayTitle, single decision point for Anime-Typ+Titel)
  - filmEpisodeSQL/filmTitleSQL in public_release_name.go, wired into publicReleaseNameSQL
  - Admin editor placeholder parity (defaultReleaseTitle uses anime_title for movie episodes)
affects: [165-library-discovery-assisted-anime-creation, future-episode-import-work, future-release-name-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-decision-point fallback: only episodeImportDisplayTitle (DB-write layer, knows anime.type+title) synthesizes the final episode-title fallback; the AniSearch-HTML-parser layer (episodeDisplayTitle) never invents a numbered fallback anymore, returns \"\" instead."
    - "SQL CASE-based film detection: filmEpisodeSQL treats anime.type='film' OR episode_types.name='movie' as independently sufficient signals, self-contained scalar subqueries requiring no new JOIN in either caller."
    - "One rule, not two: the Go backend SQL (public_release_name.go) and the TypeScript admin placeholder (episodeVersionEditorUtils.ts) implement the identical film-vs-series first-component decision, kept in sync via inline cross-references in both files' doc comments."

key-files:
  created: []
  modified:
    - backend/internal/services/anisearch_episode_import.go
    - backend/internal/services/anisearch_episode_import_test.go
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/episode_import_repository_test.go
    - backend/internal/repository/episode_classification_postgres_test.go
    - backend/internal/repository/public_release_name.go
    - backend/internal/repository/release_detail_public_repository_test.go
    - backend/internal/repository/episode_version_public_group_filter_test.go
    - backend/internal/repository/episode_version_public_scale_fixture_test.go
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/repository/episode_import_source_integration_test.go
    - backend/internal/repository/public_note_role_code_integration_test.go
    - backend/internal/repository/episode_version_dates_integration_test.go
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts"
    - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

key-decisions:
  - "Fallback decision centralized in episode_import_repository_apply.go's episodeImportDisplayTitle, the only place that knows both anime.type and anime.title; the AniSearch parser layer (anisearch_episode_import.go) was simplified to never invent a synthetic 'Episode N' string."
  - "filmEpisodeSQL checks anime.type='film' OR episode_types.name='movie' (either signal sufficient) so both freshly-imported rows (which will carry both, going forward) and older/hand-classified rows (which may carry only one) are recognized."
  - "Existing (pre-fix) data is intentionally NOT migrated/backfilled, per the plan's explicit constraint -- affected films must be re-imported or manually re-titled to pick up the fix."

patterns-established:
  - "Two-signal film detection (anime.type + episode_types.name) as the durable pattern for any future film-aware backend logic that must tolerate both freshly-imported and legacy-classified rows."

requirements-completed: [GAP-22, GAP-23]

# Metrics
duration: 60min
completed: 2026-09-23
---

# Quick Task 260923-amz: Filmtitel statt "Episode 1" bei Filmen Summary

**Centralized the film-episode-title fallback across three surfaces (AniSearch import, public release-name SQL, admin editor placeholder) so a film's own title replaces the literal "Episode 1"/"Folge 1" fallback everywhere, verified live against anime #6 ".hack//G.U. Trilogy".**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-09-23T07:55:00Z (approx, first backend edit)
- **Completed:** 2026-09-23T08:35:00Z
- **Tasks:** 4/4 completed
- **Files modified:** 16 (13 backend Go, 2 frontend TS, 1 docs)

## Accomplishments

- **GAP-22 (episode title on import):** `episode_import_repository_apply.go`'s `episodeImportDisplayTitle` is now the single place deciding the final episode-title fallback for newly imported/applied episodes: real scraped title > anime/film title (for `anime.type=film`/`episode.episode_type=movie`) > "Episode N" (series, unchanged). The AniSearch HTML-parser layer (`anisearch_episode_import.go`'s `episodeDisplayTitle`) no longer synthesizes any fallback itself -- it returns `""` (which `normalizeStringPtr` turns into `nil`) when there is no real scraped title, since that layer has no access to anime type/title.
- **GAP-23 (public release name):** `public_release_name.go` gained `filmEpisodeSQL` (true when `anime.type='film'` OR the episode's `episode_types.name='movie'`) and `filmTitleSQL` (`anime.title`), wired into `publicReleaseNameSQL`'s first name component via a `CASE` branch. A group-entered title (`titleEnteredByGroupSQL`) keeps unconditional priority; series are unaffected.
- **GAP-23 (admin placeholder parity):** `episodeVersionEditorUtils.ts`'s `defaultReleaseTitle` now uses `context.anime_title` as the first component when `context.episode?.episode_type === 'movie'` (with a defensive fallback to the existing "Episode NNN" placeholder if `anime_title` is blank/whitespace) -- the identical rule as the backend SQL, documented in both files' doc comments as "one rule, not two".
- **Fallback-display audit:** re-ran the grep sweep across `frontend/src` for `Folge N`/`Episode N` literal patterns. Every finding falls into one of two safe categories: (a) already title-first-with-fallback (e.g. `episode.title ?? \`Folge ${episode.episode_number}\``, `resolveEpisodeTitle` in `episodePreviewFormat.ts`) -- these automatically pick up the real film title now that Task 1 fixed the backend source of `episode.title`; or (b) pure row/identifier labels without a title claim (aria-labels for expand/collapse, breadcrumb segments, toast confirmations, select-option labels, segment-assignment chip labels, project-card range labels like "Folge 3-7"). The one deliberate exception -- `episodes/import/page.tsx`'s textarea `placeholder`/`aria-label` template literals (`` `Episode ${group.episodeNumber}` ``) -- was left unchanged per the plan's explicit rationale: it is a pure placeholder hint (no `value`), does not affect the actually-stored title, and the page has no anime-type/title in its current data model (no new data wiring in this quick task).
- **Live verification against anime #6:** the real `team4s_v2` `release_versions` row for anime #6's single release (group "Generation: Anime Xtreme", `v1`, blank group title) now computes to `.hack//G.U. Trilogy · (Generation: Anime Xtreme) · v1` via a read-only re-execution of the exact `publicReleaseNameSQL` expression against the live database (no data was written). The stored `episodes.title` for anime #6 remains the pre-fix `"Episode 1"` string, as expected -- the plan explicitly excludes migrating existing data; a re-import or manual edit would now produce the film title.
- **Full verification:** backend `go build`/`go vet` clean; `go test ./...` and frontend `test`/`typecheck`/`lint` show only pre-existing, previously-documented failures (see Deviations below), none caused by this task. Backend rebuilt (`docker compose up -d --build team4sv30-backend`), frontend restarted (`docker restart team4sv30-frontend`); both healthy.

## Task Commits

1. **Task 1: GAP-22 -- centralize film episode-title fallback on import** - `51a9bfc2` (feat)
2. **Task 2: GAP-23 -- standard-release-name SQL for films** - `d2a80450` (feat)
3. **Task 3: GAP-23 -- admin placeholder parity** - `6b6bfa07` (feat)
4. **Task 4: 165-UAT.md entries + full verification + rebuild/restart** - `b841704c` (docs)

_No plan-metadata commit created in this session -- the orchestrator handles the docs commit (SUMMARY.md/STATE.md) separately, per this session's explicit constraints._

## Files Created/Modified

- `backend/internal/services/anisearch_episode_import.go` - `episodeDisplayTitle` simplified to two params, no more synthetic "Episode N"
- `backend/internal/services/anisearch_episode_import_test.go` - new titleless-row test proving `nil` not `"Episode 1"`
- `backend/internal/repository/episode_import_repository_apply.go` - `applyReleaseNative` derives `isFilm`+`animeTitle`; `upsertImportEpisode`/`episodeImportDisplayTitle` gain those params, single fallback decision point
- `backend/internal/repository/episode_import_repository_test.go` - 4 existing calls updated (`false, ""`), new film-fallback test (4 sub-cases)
- `backend/internal/repository/episode_classification_postgres_test.go` - compile-break fix for `upsertImportEpisode`'s new signature (out-of-plan, Rule 3)
- `backend/internal/repository/public_release_name.go` - new `filmEpisodeSQL`/`filmTitleSQL`, wired into `publicReleaseNameSQL`'s first component
- `backend/internal/repository/release_detail_public_repository_test.go` - new `TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat` (5 cases) + schema columns added to the existing GAP-02 fixture (Rule 3)
- `backend/internal/repository/episode_version_public_group_filter_test.go`, `episode_version_public_scale_fixture_test.go`, `episode_version_public_integration_test.go`, `episode_import_source_integration_test.go`, `public_note_role_code_integration_test.go`, `episode_version_dates_integration_test.go` - fixture schema fixes (anime.type/anime.title/episode_types columns) so the now-unconditional `filmEpisodeSQL`/`filmTitleSQL` references resolve against every Phase-117 fixture that reaches `publicReleaseNameSQL`/`publicEpisodeQuery` (Rule 3, out-of-plan)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts` - `defaultReleaseTitle` uses `anime_title` for movie episodes
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` - 3 new GAP-23 cases
- `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` - GAP-22/GAP-23 `status: resolved` entries appended, LF-only preserved

## Decisions Made

- Centralized the fallback decision in the DB-write layer (`episode_import_repository_apply.go`), not the AniSearch-parser layer, because only the former already resolves `anime.type` (existing GAP-12 logic) and could cheaply also read `anime.title` in the same query.
- `filmEpisodeSQL` treats `anime.type='film'` and `episode_types.name='movie'` as independently sufficient (OR, not AND) so both freshly-imported rows (which will now carry both consistently) and legacy/hand-classified rows (which may carry only one) are recognized as films.
- Did not migrate existing/stored data (explicit plan constraint) -- anime #6's stored `episodes.title` remains `"Episode 1"` until the anime is re-imported or the episode is manually re-titled; the *computed* release name already reflects the fix on every read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed compile break in `episode_classification_postgres_test.go`**
- **Found during:** Task 1 verification
- **Issue:** `upsertImportEpisode`'s new `isFilm bool, animeTitle string` parameters broke an existing call site in this test file (not listed in the plan's `files_modified`).
- **Fix:** Updated the call to pass `false, ""` (non-film, matching prior series-only behavior of this test).
- **Files modified:** `backend/internal/repository/episode_classification_postgres_test.go`
- **Verification:** `go build ./... && go vet ./...` clean; the file's own tests unaffected.
- **Committed in:** `51a9bfc2` (Task 1 commit)

**2. [Rule 3 - Blocking] Backend source is not live-bind-mounted; used `docker cp` to sync edited files for iterative verification**
- **Found during:** Task 1, first verify attempt
- **Issue:** `docker-compose.override.yml` only live-syncs `./backend` into the container via `docker compose watch` (not running in this session); `docker exec ... go test` was silently running against the stale image-baked copy.
- **Fix:** Used `docker cp` to push each edited backend file into the running container before each `go build`/`go test` verify step during Tasks 1-2; Task 4's `docker compose up -d --build` performs the real, permanent rebuild that this session's final verification and the live containers now run against.
- **Files modified:** none (operational workaround only)
- **Verification:** post-rebuild re-run of `TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat`/`TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat` against the freshly built container passed.

**3. [Rule 3 - Blocking] Widened fixture schema fix beyond the plan's `files_modified` list**
- **Found during:** Task 2, full-suite verification
- **Issue:** `filmEpisodeSQL`/`filmTitleSQL` unconditionally reference `anime.type`, `anime.title`, `episodes.episode_type_id`, and `episode_types` -- Postgres requires these columns/tables to *exist* even on the `ELSE` (series) branch of the `CASE`. Six Phase-117 test fixtures not listed in the plan's `files_modified` (`episode_version_public_group_filter_test.go`, `episode_version_public_scale_fixture_test.go`, `episode_version_public_integration_test.go`, `episode_import_source_integration_test.go`, `public_note_role_code_integration_test.go`, `episode_version_dates_integration_test.go`) reach `publicReleaseNameSQL`/`publicEpisodeQuery` and lacked one or more of these columns, causing `column ... does not exist` errors.
- **Fix:** Added the missing series-only-safe columns (`ALTER TABLE anime ADD COLUMN type TEXT [NOT NULL DEFAULT 'tv']`, `ADD COLUMN title TEXT NOT NULL DEFAULT ''`, `ALTER TABLE episodes ADD COLUMN episode_type_id BIGINT`, `CREATE TABLE episode_types (...)` where missing) to each fixture; resolved one duplicate-column conflict (`episode_version_dates_integration_test.go` already added its own `anime.title`) by switching to `ALTER COLUMN ... SET DEFAULT`.
- **Files modified:** the six files listed above.
- **Verification:** targeted re-run of every previously-broken test (`TestEpisodeVersionDeletePreservesSiblingSource` unrelated pre-existing failure aside, see Issues Encountered) passed; `go build`/`go vet` clean.
- **Committed in:** `d2a80450` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 -- blocking-issue fixes directly caused by this task's own schema/signature changes). No architectural changes, no scope creep beyond making the plan's own production changes actually compile and test-pass.

## Issues Encountered

- **Stale `.next/dev/types` artifact broke `npm run typecheck`** with an unrelated `admin/anime/create/page.tsx` type error not caused by this task (matches a previously-documented pattern in `STATE.md`). Removed `/app/.next/dev/types` (regenerable build artifact, not source) before re-running; typecheck then passed with 0 errors.
- **Two concurrent `npm run test` invocations** were accidentally started in the same frontend container during background-task orchestration, causing resource contention and 4 extra flaky timeout failures (`AchievementBadgesCard`, `AchievementBadgeShowcase`, `DiscoveryLibraryPanel`) in that noisy run. A subsequent clean single-process run confirmed the authoritative result: only the 2 pre-existing `cssCustomProperties.guard.test.ts` failures remain (documented below), matching `STATE.md`'s established history exactly.
- **Pre-existing, out-of-scope test failures** observed during full-suite verification (all confirmed via `git diff --stat` to be in files untouched by this quick task, or matching `STATE.md`'s already-documented list): `TestEpisodeVersionDeletePreservesSiblingSource`/`TestEpisodeVersionDeleteKeepsReferencedStreamSource` and 7 `TestEpisodeImportSource*` tests (all share `openEpisodeImportSourceFixture`, which never added an `episode_type_source` column to its stub `episodes` table -- confirmed via `git diff` that `upsertImportEpisode`'s INSERT column list is unchanged by this task); `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure` (`episode_classification.go`'s unrelated `filler_source` column, same root cause class, untouched file); `TestEvaluateMemberMutationConflictBlocksLastActiveManager`/`TestFansubRepository_PublicProfileSourceInvariants` (untouched files); all `TestPhase128*` (missing `TEAM4S_PHASE128_TEST_DSN`), all `TestPhase134Matrix*` (no server on port 18093 / keycloak creds), 3 `11eyes-*` fixture tests (missing `docs/audits/.../fixtures/*.json` in the Docker build context), 2 `cssCustomProperties.guard.test.ts` failures, 3 pre-existing lint errors -- all match `STATE.md`'s previously-documented pre-existing-failure list. Full detail in `deferred-items.md` alongside this SUMMARY.
- **Health-check port mismatch:** the plan's verify command (`curl http://192.168.235.196:8092/health`) targets container-internal port 8092, but `.env`'s `BACKEND_PORT=18092` maps the actual host-exposed port to 18092. Verified `200` against the correct host port (`http://192.168.235.196:18092/health` and `http://127.0.0.1:18092/health`) instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-22 and GAP-23 are fully closed for new/re-imported data and for every read (public release name, admin placeholder). Existing stored episode titles (e.g. anime #6's `"Episode 1"`) are intentionally left as-is per the plan; the Auftraggeber can re-import or manually retitle affected films if desired.
- No outstanding blockers. `165-UAT.md` reflects both GAPs as resolved with the fix commit trail.

---
*Phase: quick-260923-amz*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 18 claimed files found on disk; all 4 claimed commit hashes (`51a9bfc2`, `d2a80450`, `6b6bfa07`, `b841704c`) found in `git log`.
