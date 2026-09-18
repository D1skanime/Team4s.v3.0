---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 08
subsystem: api
tags: [go, postgres, sql, public-read-model, media-urls, gap-closure]

# Dependency graph
requires:
  - phase: 164-01
    provides: publicEpisodeQuery / ListPublicGroupedByAnimeID public read-model this plan patches
  - phase: 164-04
    provides: ReleasePreviewRow.tsx logo/fallback rendering this plan corrects
affects: [164-09, 164-10, 164-11, 164-12, 164-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared Go SQL-fragment-building functions (public_release_name.go) reused via
      fmt.Sprintf interpolation across two independent repository query sites, keeping
      one canonical source for a cross-page display-name rule"
    - "media_assets.file_path -> /api/v1/media/files/<basename> URL-building inlined as
      a CASE expression at the two SQL sites that read fansub_groups logos, matching the
      existing Go-side convention in media_service.go/media_repository.go"

key-files:
  created:
    - backend/internal/repository/public_release_name.go
  modified:
    - backend/internal/repository/episode_version_public_query.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/models/episode_version.go
    - frontend/src/types/episodeVersion.ts
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - shared/contracts/openapi.yaml

key-decisions:
  - "release_name is a new, always-populated field alongside the existing title field
    (title keeps its old, sometimes-filename-carrying meaning at the SQL level); the
    frontend switch from title to release_name is explicitly deferred to 164-12 per
    that plan's own stated scope, confirmed by reading 164-12-PLAN.md before starting"
  - "titleEnteredByGroupSQL/publicReleaseNameSQL take releaseVersionAlias/episodeAlias
    as caller-supplied SQL identifiers and groupNamesExpr as a caller-supplied scalar
    subquery, keeping the shared function agnostic of each call site's specific
    table-alias shape (rev/e at the public-anime-page query, rv/e at the release-detail
    header query)"
  - "Fixed sibling test fixtures (episode_version_public_scale_fixture_test.go,
    public_note_role_code_integration_test.go) that lack release_variants.filename,
    a column the new titleEnteredByGroupSQL predicate now reads on every
    loadReleaseHeader/publicEpisodeQuery call, rather than defensively COALESCEing the
    column reference in SQL -- keeps the SQL fragment simple and forces every fixture
    exercising these queries to reflect the real production schema"

patterns-established:
  - "GAP-02 default release name format: '<Episodentitel> · (<Gruppe(n)>) · <Version>',
    coop groups ' × '-joined in ORDER BY fg.name, fg.id order, no primary-group concept"

requirements-completed: [REQ-164-08, REQ-164-10, REQ-164-11, REQ-164-21]

duration: 35min
completed: 2026-09-18
---

# Phase 164 Plan 08: GAP-01/GAP-02 Group Logo and Release Name Read-Model Fix Summary

**Fixed broken fansub-group logo URLs and eliminated raw-filename release names from both the public anime page and the release detail page, via one new shared Go SQL-fragment helper (`public_release_name.go`) computing the display name on every read instead of ever storing it.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-18T07:58:00Z (approx, first file reads)
- **Completed:** 2026-09-18T08:26:00Z
- **Tasks:** 3 (all `auto`, all `tdd="true"`)
- **Files modified:** 15 (1 created, 14 modified — 8 in-scope per plan frontmatter, 7 deviation fixes)

## Accomplishments
- GAP-01: `media_assets.file_path` (a server filesystem path) no longer leaks into the public `logo_url` field on either the public anime page or the release detail page; both now build a real `/api/v1/media/files/<basename>` URL when a media-asset logo exists, and fall back to the existing `fansub_groups.logo_url` column verbatim otherwise.
- GAP-01: `ReleasePreviewRow.tsx` no longer renders a letter/`?` placeholder circle when a group has no logo — nothing renders in that slot, matching 164-UI-SPEC D-10 and the UAT's explicit instruction.
- GAP-02: a single new backend function pair (`titleEnteredByGroupSQL`, `publicReleaseNameSQL`) computes the exact `"<Episodentitel> · (<Gruppe(n)>) · <Version>"` default name (coop-capable, ` × `-joined, `ORDER BY fg.name, fg.id`) whenever a group has not genuinely entered its own title — reused unmodified between `episode_version_public_query.go` (public anime page) and `release_detail_public_repository.go` (release detail page).
- GAP-02: the episode import path (`episodeImportReleaseTitle`) now always returns `nil` — a newly-imported release's `release_versions.title` is written as `NULL`, never a filename or a generated `"Episode N"` label. No backfill or migration was added; historical rows are untouched.

## Task Commits

Each task followed the RED → GREEN TDD flow with two commits:

1. **Task 1: Fix GAP-01 group logo URL bug**
   - `93124ca6` (test) — failing coverage: media-asset logo, stored-URL regression, no-logo case, across both public read paths
   - `07ac353c` (feat) — SQL fix in both files + `ReleasePreviewRow.tsx`/CSS placeholder removal + one directly-caused frontend test fix
2. **Task 2: Shared GAP-02 default release-name computation (public anime page)**
   - `44309b6f` (test) — failing fixtures/assertions for filename-as-title, empty-title, genuine-title, single-group, and coop cases
   - `f37f205c` (feat) — new `public_release_name.go`, `episode_version_public_query.go` wiring, model/TS/OpenAPI field additions
3. **Task 3: Wire the rule into the release detail page; stop import filename writes**
   - `ac3e286e` (test) — failing `loadReleaseHeader` format-parity test + real-function `episodeImportReleaseTitle` test
   - `330a0de6` (feat) — `loadReleaseHeader` switched to `publicReleaseNameSQL`, `episodeImportReleaseTitle` always returns `nil`, plus 2 directly-caused pre-existing-test fixes
   - `d4a7565a` (fix) — 3 more frontend fixtures needed the new required `release_name` TS field (tsc-must-exit-0 acceptance criterion, same precedent as 164-02)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `backend/internal/repository/public_release_name.go` — new: `titleEnteredByGroupSQL` + `publicReleaseNameSQL`, the single shared GAP-02 default-name SQL-fragment builder
- `backend/internal/repository/episode_version_public_query.go` — `publicEpisodeQuery` emits `release_name`; group-logo LATERAL builds a web-safe URL
- `backend/internal/repository/release_detail_public_repository.go` — `loadReleaseHeader`'s title now uses `publicReleaseNameSQL("rv","e",...)` instead of `publicReleaseTitleSQL`
- `backend/internal/repository/release_detail_public_repository_helpers.go` — `loadReleaseGroups` builds the same web-safe logo URL expression
- `backend/internal/repository/episode_import_repository_release_helpers.go` — `episodeImportReleaseTitle` always returns `nil`
- `backend/internal/models/episode_version.go` — `PublicEpisodeVersion.ReleaseName string` (JSON `release_name`, always populated)
- `frontend/src/types/episodeVersion.ts` — `PublicEpisodeVersion.release_name: string`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` / `.module.css` — removed the letter/`?` logo fallback and its dead CSS class
- `shared/contracts/openapi.yaml` — `PublicEpisodeVersion.release_name` added to `properties` and `required`
- `backend/internal/repository/episode_version_public_integration_test.go`, `episode_version_public_group_filter_test.go`, `release_detail_public_repository_test.go`, `episode_import_repository_release_helpers_test.go` — new real-DB / real-function behavior tests (see Deviations for the CLAUDE.md Teststil note on `release_detail_public_repository_test.go`)

## Decisions Made
- `release_name` is additive; `title` keeps its existing (sometimes filename-carrying) meaning at the SQL/JSON level. Frontend consumption of `release_name` instead of `title` is intentionally out of this plan's scope — confirmed against `164-12-PLAN.md` before starting, which already owns that switch (`resolveReleaseName` → `version.release_name`).
- Wrote all new/extended tests in `release_detail_public_repository_test.go` and `episode_import_repository_release_helpers_test.go` as real, DB-executed or function-executed behavior tests (calling `loadReleaseGroups`/`loadReleaseHeader`/`episodeImportReleaseTitle` directly), not source-string assertions — per CLAUDE.md's Teststil rule, which explicitly forbids adding new instances of the `os.ReadFile` + `strings.Contains` pattern even when neighboring tests in the same file use it. The four pre-existing source-assertion tests in `release_detail_public_repository_test.go` were left untouched (documented legacy debt, WR-02) except where their own premise became stale (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `FansubVersionBrowser.test.tsx` "Testfall 11" asserted the exact bug this task removes**
- **Found during:** Task 1
- **Issue:** A pre-existing test literally asserted "Release ohne Gruppenlogo rendert den Initialen-Fallback" (letter "A"), i.e. the GAP-01 bug behavior itself.
- **Fix:** Rewrote the test to assert no image and no letter placeholder render, only the group name text.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `07ac353c`

**2. [Rule 3 - Blocking] Two sibling test fixtures lacked `release_variants.filename`**
- **Found during:** Task 2 (`episode_version_public_scale_fixture_test.go`) and Task 3 (`public_note_role_code_integration_test.go`)
- **Issue:** The new `titleEnteredByGroupSQL` predicate reads `release_variants.filename` unconditionally; these two sibling fixtures (built against the base Phase-117 schema, which has no such column) failed with `column rvx.filename does not exist` / `column ... does not exist` once the new SQL ran against them.
- **Fix:** Added `ALTER TABLE release_variants ADD COLUMN filename TEXT;` to both fixtures.
- **Files modified:** `backend/internal/repository/episode_version_public_scale_fixture_test.go`, `backend/internal/repository/public_note_role_code_integration_test.go`
- **Commits:** `f37f205c`, `330a0de6`

**3. [Rule 1 - Bug] `group_repository_test.go`'s `TestReleaseDetailPublicTitleFallbackSource` asserted a now-removed call site**
- **Found during:** Task 3
- **Issue:** The test's source-string check required `release_detail_public_repository.go` to still contain `publicReleaseTitleSQL(` — exactly the call this task is mandated to remove (plan acceptance criterion: that grep must return 0).
- **Fix:** Removed `release_detail_public_repository.go` from the test's expected-callers map, with a comment pointing to the new real-behavior test that proves the replacement.
- **Files modified:** `backend/internal/repository/group_repository_test.go`
- **Commit:** `330a0de6`

**4. [Rule 1 - Bug] Three frontend fixtures missing the new required `release_name` field**
- **Found during:** post-Task-3 `tsc --noEmit` verification
- **Issue:** `PublicEpisodeVersion.release_name` is a required, non-optional TS field (per plan spec: "backend always populates it"); three pre-existing object-literal fixtures (`frontend/src/app/dev/episode-windowing-preview/page.tsx`'s mock builder, `FansubVersionBrowser.groupSwitch.test.tsx`, `FansubVersionBrowser.test.tsx`) predate it and failed type-checking — the identical pattern already documented and fixed in `164-02-SUMMARY.md` for `has_images`/`has_notes`/`has_karaoke`.
- **Fix:** Added a `release_name` value to each fixture (no behavior change — `ReleasePreviewRow` still reads `.title` via `resolveReleaseName` until 164-12).
- **Files modified:** `frontend/src/app/dev/episode-windowing-preview/page.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `d4a7565a`

---

**Total deviations:** 4 auto-fixed (1 Rule 1 stale-assertion x2 instances + 1 Rule 1 bug-shape test + 1 Rule 3 blocking schema gap x2 instances + 1 Rule 1 required-field fixture gap x3 instances — 7 files total)
**Impact on plan:** All auto-fixes are direct, unavoidable consequences of this plan's own mandated changes (removing the old logo/title behavior, adding a new required field). No scope creep — no unrelated file was touched.

## Issues Encountered
None beyond the deviations above. No auth gates, no checkpoints.

## User Setup Required
None — no external service configuration required.

## Verification

- `go build ./...` — passes.
- `go vet ./...` — clean.
- `go test ./internal/repository/... -run 'TestEpisodeVersionPublic|TestReleaseDetailPublic|TestEpisodeImportRepository'` — all pass, including the 3 new/extended behavior tests (`TestLoadReleaseGroupsResolvesMediaAssetLogoURL`, `TestEpisodeVersionPublicReleaseNameDefaultFormat`, `TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat`, `TestEpisodeImportReleaseTitleNeverWritesAFilename`).
- `go test ./... -count=1` (full backend suite): 67 failures, identical in count and category to the documented pre-existing baseline (164-01-SUMMARY.md: `TEAM4S_PHASE128_TEST_DSN`-gated, live-Keycloak `Phase134Matrix*`, `filler_source`/`episode_type_source` schema-drift, missing local FFmpeg) — zero new regressions after the Deviations above were fixed. Confirmed `TestPublicNoteRoleCode` (which briefly regressed before Deviation #2 was applied) is fully green.
- Frontend: `npx tsc --noEmit` — zero new errors (only the pre-existing, unrelated `.next/dev/types`/`AnimePageProps` generated-artifact errors, already documented across 164-02/164-04/164-06/164-07). `npx eslint` on all changed files — clean. `npx vitest run src/components/fansubs src/app/dev/episode-windowing-preview` — 30 files, 217 tests, all pass.
- Acceptance-criteria greps (all plan-specified) confirmed: `regexp_replace(TRIM(logo.file_path)` count 1 in both Task-1 files; `logoFallback` count 0 in both frontend files; `func titleEnteredByGroupSQL`/`func publicReleaseNameSQL` count 1 in `public_release_name.go`; `publicReleaseNameSQL("rv"` count 1 and `publicReleaseTitleSQL` count 0 in `release_detail_public_repository.go`; `episodeImportReleaseTitle` body is exactly `return nil`.
- No changes to `team4s_v2`; all tests ran against the isolated `team4s_phase117_test_164` database via a throwaway `golang:1.25-alpine` container on the `team4s_default` network. No `docker compose up -d --build` runtime redeploy was performed — the plan's tasks required only automated test verification, not live-service verification (no UAT/browser checkpoint in this plan).

## Next Phase Readiness
- Plans 164-09 through 164-13 (the remaining gap-closure plans for GAP-03..GAP-12) are unblocked and can proceed independently — none of them depend on this plan's specific SQL/field additions being wired further.
- 164-12 (frontend `resolveReleaseName` switch to `release_name`) can now proceed: the field exists, is always populated, and both public read paths agree on the exact same computed value.
- A live human UAT re-check of GAP-01/GAP-02 (broken logo image, raw filename release name) on `/anime/4` (Naruto) is still required before this closes the loop with the 2026-09-18 UAT report — this plan only proves the automated/backend portion, per the operational constraints for this run ("Do not mark anything as human-accepted").

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 9 created/modified files listed above verified present on disk; all 7 task-commit hashes (`93124ca6`, `07ac353c`, `44309b6f`, `f37f205c`, `ac3e286e`, `330a0de6`, `d4a7565a`) verified present in `git log`.
