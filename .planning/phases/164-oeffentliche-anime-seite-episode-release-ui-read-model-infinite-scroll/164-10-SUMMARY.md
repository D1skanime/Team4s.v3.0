---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 10
subsystem: api
tags: [go, postgres, sql, public-read-model, admin-api, gap-closure]

# Dependency graph
requires:
  - phase: 164-08
    provides: publicEpisodeQuery's inventory CTE / eft/et LEFT JOINs and PublicGroupedEpisode/PublicEpisodeVersion model shape this plan extends
provides:
  - "Migration 0169: episode_filler_types.label / episode_types.label, additive, backfilled with the 2026-09-18 Auftraggeber-approved display names"
  - "publicEpisodeQuery emits filler_type_label/episode_type_label via the existing eft/et LEFT JOINs, zero new queries"
  - "GET /api/v1/admin/episode-classification-options (admin-gated), for the wave-3 frontend consumption plan (164-13)"
affects: [164-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive lookup-table label column (name=stable code, label=display name),
      resolved through an already-existing LEFT JOIN with a matching COALESCE
      fallback pair -- same pattern as GAP-02's release_name, no N+1"
    - "Lean admin lookup-list endpoint (ListEpisodeClassificationOptions) following
      the existing ListGenreTokens/ListTagTokens/ListEpisodeClassifications
      AdminContentHandler+AdminContentRepository precedent"

key-files:
  created:
    - database/migrations/0169_episode_classification_labels.up.sql
    - database/migrations/0169_episode_classification_labels.down.sql
    - backend/internal/repository/episode_version_public_writes_test.go
  modified:
    - backend/internal/repository/episode_version_public_query.go
    - backend/internal/models/episode_version.go
    - backend/internal/models/episode_classification.go
    - backend/internal/repository/episode_classification.go
    - backend/internal/handlers/admin_content_episode_classification.go
    - backend/internal/handlers/admin_content_episode_classification_test.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/episodeVersion.ts
    - shared/contracts/openapi.yaml
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/repository/episode_version_public_group_filter_test.go
    - backend/internal/repository/episode_version_public_scale_fixture_test.go

key-decisions:
  - "EpisodeClassificationOption/EpisodeClassificationOptions types were placed in
    backend/internal/models/episode_classification.go (the models package file of
    that name), not backend/internal/repository/episode_classification.go, matching
    the plan wording 'in episode_classification.go (models package)' literally and
    the project's existing convention that all JSON-serialized DTOs live in models/"
  - "Handler test for the new endpoint follows admin_content_tag_genre_names_test.go's
    precedent exactly: a real *repository.AdminContentRepository against a real,
    schema-isolated OpenPhase106Postgres fixture, not a hand-rolled interface fake --
    AdminContentHandler.repo is a concrete *repository.AdminContentRepository field
    (not an interface), so a real isolated-DB repo is both the closest working
    precedent in this codebase and fully compliant with CLAUDE.md's Teststil rule
    (real handler execution, real status code, real response body)"
  - "All go build/go vet/go test verification ran via a throwaway golang:1.25-alpine
    container with the host backend/ and database/ source bind-mounted directly
    (not via 'docker compose exec team4sv30-backend'), because team4sv30-backend's
    /app is baked into its image at build time (no live source bind mount) --
    running go build/test inside that container would silently validate the
    pre-existing image, not this plan's edits. This also matches the operational
    constraint requiring test-DB isolation from team4s_v2/DATABASE_URL."
  - "Split the write-path, raw-query-compatibility, and release-name-default tests
    out of episode_version_public_integration_test.go into a new sibling file
    (episode_version_public_writes_test.go) once this task's additions pushed the
    original file to 512 lines, exceeding CLAUDE.md's 450-line production-file cap
    (Rule 2 -- correctness/maintainability requirement, not scope creep: the file
    was already at exactly 500 lines pre-existing before this task's edits)"
  - "Frontend TS/tsc verification and any fixture updates for the two new required
    PublicGroupedEpisode fields (filler_type_label/episode_type_label) were
    deliberately NOT run in this plan, per this run's explicit operational
    constraint ('Frontend files are NOT in this plan's scope ... do not run
    frontend tooling'). Object-literal fixtures constructing PublicGroupedEpisode
    directly (episode-windowing-preview/page.tsx, several FansubVersionBrowser*.test.tsx)
    will very likely need the same kind of one-line fixture addition 164-08 needed
    for release_name -- flagged here as a known, expected follow-up for 164-13
    (the wave-3 plan that wires this endpoint's data into the frontend), not fixed
    in this plan."

patterns-established:
  - "GAP-11 label resolution: eft.label/et.label read through the same LEFT JOINs
    as eft.name/et.name, COALESCE('Unbekannt')/COALESCE('Episode') mirroring the
    existing code fallback exactly -- reusable template for any future lookup-table
    display-name addition on this query"

requirements-completed: [REQ-164-02, REQ-164-03, REQ-164-04]

# Metrics
duration: 55min
completed: 2026-09-18
---

# Phase 164 Plan 10: GAP-11 DB-Backed Episode Classification Labels (Backend) Summary

**Migration 0169 adds and backfills `episode_filler_types.label`/`episode_types.label` with the Auftraggeber's approved German/admin display names; `publicEpisodeQuery` now emits `filler_type_label`/`episode_type_label` through the existing lookup JOINs at zero extra query cost, and a new admin-gated `GET /api/v1/admin/episode-classification-options` endpoint gives the admin frontend a DB-sourced replacement for its hardcoded label map.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-18T08:40:00Z (approx, first file reads)
- **Completed:** 2026-09-18T09:04:00Z
- **Tasks:** 3 (Task 1 auto/tdd, Task 1b auto/[BLOCKING] DB apply, Task 2 auto/tdd)
- **Files modified:** 15 (3 created, 12 modified)

## Accomplishments
- GAP-11 (backend half): `episode_filler_types`/`episode_types` now carry a real, additively-migrated `label` column, backfilled with the exact 2026-09-18 Auftraggeber-approved strings (Unbekannt/Haupthandlung/Zusatzfolge/Teilweise Zusatzfolge/Rückblick; Episode/Special/OVA/ONA/Movie/Recap/Preview/Prologue/Epilogue/Bonus) — applied and verified against the live `team4s_v2` database (5+10 rows, all non-null, `episodes` row count unchanged at 246 before/after).
- The public episode list (`publicEpisodeQuery`) resolves `filler_type_label`/`episode_type_label` through the exact same `eft`/`et` LEFT JOINs already used for the stable codes — no additional SQL statement, verified live against Naruto (`/anime/4`) and by an unchanged 3-query/4-query budget assertion in the repository tests.
- A new lean admin-gated endpoint `GET /api/v1/admin/episode-classification-options` returns both lookup tables' code+label pairs ordered by `id`, following the existing `ListGenreTokens`/`ListEpisodeClassifications` `AdminContentHandler`+`AdminContentRepository` pattern exactly; verified 401 live against the running backend and 200-with-real-data via a real-Postgres httptest.

## Task Commits

1. **Task 1: Additive migration 0169** — `c37bb42a` (feat)
2. **Task 1b: [BLOCKING] Apply migration 0169 against team4s_v2** — no file changes (DB-apply-only task, no commit per plan spec); verified via `go run ./cmd/migrate status/up` and `psql` SELECT checks (see Verification)
3. **Task 2: Expose labels through the public query + admin lookup endpoint** — `b0fb28ec` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `database/migrations/0169_episode_classification_labels.up.sql` / `.down.sql` — additive `label` columns + backfill on both lookup tables
- `backend/internal/repository/episode_version_public_query.go` — inventory CTE selects `eft.label`/`et.label`, outer SELECT/Scan propagate the two new columns
- `backend/internal/models/episode_version.go` — `PublicGroupedEpisode.FillerTypeLabel`/`EpisodeTypeLabel` (JSON `filler_type_label`/`episode_type_label`)
- `backend/internal/models/episode_classification.go` — `EpisodeClassificationOption`/`EpisodeClassificationOptions` DTOs
- `backend/internal/repository/episode_classification.go` — `ListEpisodeClassificationOptions` (two simple ordered SELECTs)
- `backend/internal/handlers/admin_content_episode_classification.go` — `ListEpisodeClassificationOptions` handler (requireAdmin + `{"data": options}`)
- `backend/cmd/server/admin_routes.go` — `GET /admin/episode-classification-options` route registration
- `frontend/src/types/episodeVersion.ts` — `PublicGroupedEpisode.filler_type_label`/`episode_type_label: string`
- `shared/contracts/openapi.yaml` — `PublicGroupedEpisode` schema gains both new required properties
- `backend/internal/repository/episode_version_public_integration_test.go`, `episode_version_public_group_filter_test.go`, `episode_version_public_scale_fixture_test.go` — fixture `episode_filler_types`/`episode_types` tables extended with a `label TEXT` column matching migration 0169's backfill; new GAP-11 label assertions added
- `backend/internal/repository/episode_version_public_writes_test.go` — new file: write-path/raw-query-compatibility/release-name tests split out of the integration test file to respect the 450-line cap
- `backend/internal/handlers/admin_content_episode_classification_test.go` — new real-Postgres httptest coverage for the new endpoint (401 without admin, 200 with ordered code+label data)

## Decisions Made
See `key-decisions` in the frontmatter above (option-type placement, real-repo-over-fake-interface handler test precedent, throwaway-container verification strategy, file-size-cap split, and the deliberate frontend-tooling exclusion per this run's operational constraints).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `episode_version_public_integration_test.go` exceeded the 450-line cap after this task's additions**
- **Found during:** Task 2, post-implementation line-count check
- **Issue:** The file was already at 500 lines before this task (pre-existing, not caused by this plan); adding the GAP-11 fixture/assertions pushed it to 512, over CLAUDE.md's 450-line production-file limit.
- **Fix:** Moved `TestEpisodeVersionPublicFullAssignmentAndWrites`, `TestEpisodeVersionPublicRawQueryCompatibility`, and `TestEpisodeVersionPublicReleaseNameDefaultFormat` into a new sibling file `episode_version_public_writes_test.go` (same package, shared helpers untouched); removed now-unused `time`/`models` imports from the original file.
- **Files modified:** `backend/internal/repository/episode_version_public_integration_test.go` (410 lines after split), `backend/internal/repository/episode_version_public_writes_test.go` (new, 123 lines)
- **Commit:** `b0fb28ec`

**2. [Rule 3 - Blocking] `episode_version_public_scale_fixture_test.go` also creates its own `episode_filler_types`/`episode_types` fixture tables without a `label` column**
- **Found during:** Task 2, before the first test run
- **Issue:** This sibling fixture (used by `TestEpisodeVersionPublicScaleBudgetAndPagination`) independently builds `episode_filler_types`/`episode_types` without the new `label` column; `publicEpisodeQuery`'s new `eft.label`/`et.label` SELECT columns would fail with `column eft.label does not exist`.
- **Fix:** Added `label TEXT` column + backfilled values matching migration 0169 exactly (same values as the two other fixtures).
- **Files modified:** `backend/internal/repository/episode_version_public_scale_fixture_test.go`
- **Commit:** `b0fb28ec`

**3. [Rule 3 - Blocking] Backend model struct-tag alignment drift introduced by the new fields**
- **Found during:** Task 2, gofmt check before committing
- **Issue:** `gofmt -d` flagged the newly-added `FillerTypeLabel`/`EpisodeTypeLabel` struct fields as misaligned (copied indentation from the wrong alignment group).
- **Fix:** Removed the extra padding so the new two-field group is self-consistently aligned per gofmt; left the surrounding pre-existing struct's unrelated, already-drifted alignment untouched (out of scope, matches this repo's documented pre-existing gofmt-drift baseline affecting ~80+ files repo-wide).
- **Files modified:** `backend/internal/models/episode_version.go`
- **Commit:** `b0fb28ec`

---

**Total deviations:** 3 auto-fixed (1 missing-critical file-size-cap split, 2 blocking test-fixture/formatting fixes)
**Impact on plan:** All auto-fixes are direct, unavoidable consequences of this plan's own additions (new SQL columns needing fixture parity, new struct fields needing gofmt alignment, and a pre-existing near-cap file being pushed over the limit). No scope creep — no unrelated file was touched, and the pre-existing repo-wide gofmt drift outside these files was explicitly left alone.

## Issues Encountered
- `docker compose exec team4sv30-backend go build/go test` initially appeared to succeed, but `team4sv30-backend`'s `/app` source is baked into its Docker image (no live bind mount of `backend/`) — those commands were silently validating the pre-existing image, not this plan's edits. Re-verified all build/vet/test steps via a throwaway `golang:1.25-alpine` container with the host `backend/` and `database/` directories bind-mounted directly, matching the operational constraint's own guidance for isolated, source-accurate test execution. No impact on outcome once caught — all builds/tests then genuinely passed against the real edited source.

## User Setup Required
None — no external service configuration required.

## Verification

- **Migration apply (Task 1b, [BLOCKING]):** `docker compose exec team4sv30-backend go run ./cmd/migrate status` confirmed `169 pending` before, `169 applied` after `go run ./cmd/migrate up`. `psql` against `team4s_v2`: `episode_filler_types` returns exactly 5 rows (unknown/Unbekannt, canon/Haupthandlung, filler/Zusatzfolge, mixed/Teilweise Zusatzfolge, recap/Rückblick), `episode_types` returns exactly 10 rows, all matching the locked mapping verbatim. `SELECT COUNT(*) FROM episodes` = 246 both before and after — no episode data touched.
- **Build/vet:** `go build ./...` and `go vet ./...` clean, run via a throwaway `golang:1.25-alpine` container with the real host source bind-mounted (see Issues Encountered).
- **Targeted tests (via the same throwaway-container strategy, against disposable `team4s_phase117_test_164`/`team4s_phase106_test_164` databases, never `team4s_v2`):**
  - `go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1` — all pass, including the new GAP-11 label assertions and the unchanged 3/4-query budget.
  - `go test ./internal/handlers/... -run TestListEpisodeClassificationOptions` — both new tests pass (401 without admin, 200 with the exact 5+10 ordered code+label pairs).
  - Full `go test ./internal/repository/... ./internal/handlers/... ./internal/models/...` — 0 new regressions; remaining failures match the pre-existing documented baseline exactly (`TEAM4S_PHASE128_TEST_DSN`-gated tests, live-Keycloak `Phase134Matrix*` network tests, and the pre-existing `filler_source`/`episode_type_source` schema-drift failure in `episode_version_dates_integration_test.go`, all previously documented in 164-01-SUMMARY.md/164-08-SUMMARY.md).
  - `gofmt -l` on every file touched by this plan: clean, except the pre-existing (not this-plan-caused) drift already present in `episode_version.go` before this task's edits.
- **Runtime verification (post `docker compose up -d --build team4sv30-backend`):**
  - `GET /api/v1/anime/4/episodes?projection=public&limit=2` (Naruto, live `team4s_v2`) — episode 1 returns `"filler_type":"canon","episode_type":"episode","filler_type_label":"Haupthandlung","episode_type_label":"Episode"`, proving the live end-to-end path.
  - `GET /api/v1/admin/episode-classification-options` (no token) — `401 Unauthorized`, matching the sibling `episode-classifications` route's own unauthenticated behavior.
- Disposable test database `team4s_phase106_test_164` (created for this plan's handler test) was dropped after use; the pre-existing `team4s_phase117_test_164` database (already present from earlier 164-* plans, schema-isolated per-test via `OpenPhase117Postgres`) was left in place, unmodified beyond the ephemeral per-test schemas it always creates/drops itself.
- No writes to `team4s_v2` beyond the explicitly authorized, additive, reviewed migration 0169.

## Next Phase Readiness
- `filler_type_label`/`episode_type_label` are live on the public episode list and `GET /api/v1/admin/episode-classification-options` is live and admin-gated — 164-13 (the wave-3 frontend consumption plan) can now replace the hardcoded `episodeClassification.ts`/`episodePreviewFormat.ts` label maps with real DB reads.
- **Known follow-up for 164-13:** per this plan's explicit operational constraint, frontend TypeScript compilation was not run. `PublicGroupedEpisode`'s two new required fields will very likely need the same kind of one-line fixture addition that GAP-02's `release_name` needed in 164-08 (`episode-windowing-preview/page.tsx`'s mock builder and the `FansubVersionBrowser*.test.tsx` object literals) — 164-13 should run `npx tsc --noEmit` early and add the two fields to any fixture that fails.
- A live human UAT re-check of GAP-11 (Canon/Filler and Episodentyp display names sourced from the DB) is still required before this closes the loop with the 2026-09-18 UAT report — this plan only proves the automated backend portion, per the operational constraints for this run ("Do not mark anything as human-accepted").

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 15 created/modified files listed above verified present on disk; both task-commit hashes (`c37bb42a`, `b0fb28ec`) verified present in `git log`.
