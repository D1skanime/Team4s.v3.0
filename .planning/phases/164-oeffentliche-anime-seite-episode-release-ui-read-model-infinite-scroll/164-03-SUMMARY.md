---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 03
subsystem: testing
tags: [go, pgx, postgresql, public-read-model, integration-test, query-budget, fixture]

# Dependency graph
requires:
  - phase: 164-01
    provides: Extended publicEpisodeQuery/ListPublicGroupedByAnimeID (filler_type, episode_type, container, video_codec, has_images/has_notes/has_karaoke), exact 3/4-statement query-budget assertions
provides:
  - A 52-episode isolated-schema Postgres fixture (anime_id=9) reaching scale no anime in the live database reaches today (max 13 episodes-with-releases; Naruto has 5)
  - Automated proof that the 3-statement (unfiltered) / 4-statement (group-filtered) query budget from 164-01 holds across multiple cursor pages at this scale
  - A live-measured full-page (24 episodes) JSON response byte size assertion (<25KB), replacing 164-RESEARCH.md's ≈15.9KB prose extrapolation
  - Reusable large/varied fixture data (5 filler types, 4 episode types, logo/date/image/note/karaoke/Coop variety) for later 164-xx frontend and UAT plans to reference
affects: [164-05, 164-06, 164-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generate_series-based bulk fixture scale padding layered with a handful of individually assertable, hand-classified rows (same technique as episode_version_public_group_filter_test.go's anime_id=8 29-episode padding fixture)"

key-files:
  created:
    - backend/internal/repository/episode_version_public_scale_fixture_test.go
  modified: []

key-decisions:
  - "Reused the existing team4s_phase117_test_164 isolated test database created by plan 164-01 instead of provisioning a new one - same TEAM4S_PHASE117_TEST_DSN-gated convention, no new operational surface"
  - "Chose anime_id=9 (unused by any sibling fixture in this package, which use 1-8) and release/version/variant ids in the 900-90099 range to guarantee zero collision with sibling fixtures' own isolated-schema data"
  - "Layered classification/extras variety onto only the first 5 of 52 episodes (901-905), leaving 906-952 as pure generate_series defaults - keeps the fixture SQL block small while still covering every D-48 matrix value (5 filler types, 4 episode types, image/note/karaoke/Coop/date/container presence and absence)"

requirements-completed: [REQ-164-22, REQ-164-23, REQ-164-46, REQ-164-47]

# Metrics
duration: ~10min
completed: 2026-09-17
---

# Phase 164 Plan 03: Public Episode Scale/Variety Fixture Summary

**A 52-episode isolated-schema Postgres fixture (anime_id=9) proves the exact 3/4-statement query budget from plan 164-01 stays constant across multiple cursor pages and live-measures a full 24-episode page response at under 25KB, replacing 164-RESEARCH.md's prose-only ≈15.9KB estimate.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-17T22:02:26Z (immediately after 164-02's completion commit)
- **Completed:** 2026-09-17T22:11:39Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- New `episode_version_public_scale_fixture_test.go` (package `repository_test`, same isolated-schema `testsupport.OpenPhase117Postgres` convention as its two sibling fixture files) builds a dedicated `anime_id=9` fixture with 52 episodes, each carrying exactly one public release — closing the scale gap 164-RESEARCH.md flagged (no anime in the live database reaches 24+ episodes-with-releases; Naruto's 220 episodes only carry releases on episodes 1-5).
- `TestEpisodeVersionPublicScaleBudgetAndPagination` walks the full unfiltered cursor chain at `limit=24` (3 pages: 24/24/4) asserting `assertPublicBudget(t, tr, 24)` — exactly 3 SQL statements — on every page, and a parallel group-filtered walk asserting `assertPublicBudgetWithGroupFilter(t, tr, 24, true)` — exactly 4 statements — proving the budget from plan 164-01 does not grow with page count at this scale (D-46 gate 4).
- Both walks use a seen-episode-ID map to prove zero duplicate/overlapping rows across pages (mirroring `TestEpisodeVersionPublicAtomicPages`'s existing technique).
- The fixture covers every value in D-48's classification matrix: all 5 `filler_type` values (canon/filler/mixed/recap/unknown) and 4 `episode_type` values (episode/special/ova/movie) are proven present via a grouped-value-seen assertion across the full unfiltered walk.
- Targeted field assertions on 5 individually-classified fixture episodes (901-905) prove `has_images`/`has_notes`/`has_karaoke` resolve independently per release (one true flag each, not a single row accidentally satisfying all three), a Coop release exposes `fansub_groups` length 2, and a plain default episode (910) shows the correct all-`false`/1-group/omitempty-absent baseline.
- On the very first (page 1, unfiltered) request, the raw response body length is asserted `< 25*1024` bytes via `require.Less` — a real, live measurement against the 52-episode fixture, replacing 164-RESEARCH.md's MEDIUM-confidence ≈15.9KB extrapolation with concrete evidence (closes 164-USER-REQUEST.md §52 item 4).

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the 50+ episode scale/variety fixture, prove constant query budget across multiple cursor pages, and measure the full-page response byte size** - `de97e83e` (test)

## Files Created/Modified
- `backend/internal/repository/episode_version_public_scale_fixture_test.go` - New: `openEpisodeVersionPublicScaleFixture` (52-episode isolated-schema fixture, anime_id=9) and `TestEpisodeVersionPublicScaleBudgetAndPagination` (247 lines)

## Decisions Made
See `key-decisions` in frontmatter (test-database reuse, fixture ID scoping, variety-layering strategy).

## Deviations from Plan

None - plan executed exactly as written. One presentational adjustment made proactively during self-review (not a deviation from behavior/acceptance criteria): the plan's own `<verification>` block requires "No reference to team4s_v2 or `os.Getenv("DATABASE_URL")` appears anywhere in the new file" — my first draft's doc comments mentioned both terms in prose (explaining what the fixture does *not* do), which would have failed a literal grep even though no actual SQL/code referenced them. Reworded the comments to describe the same guarantee without using either literal string, verified via `grep -n "team4s_v2\|DATABASE_URL"` returning zero matches before committing.

## Issues Encountered
None. No local Go toolchain on the execution host; ran `go build`, `go vet`, and `go test` inside a throwaway `golang:1.25-alpine` container attached to the `team4s_default` Docker network (full repo bind-mounted for `testsupport`'s relative migration-file path resolution), with `TEAM4S_PHASE117_TEST_DSN` pointed at the existing isolated `team4s_phase117_test_164` database on `team4sv30-db` (created by plan 164-01, reused here) — `team4s_v2` was never read from or written to. Ran the new test alone (`-run TestEpisodeVersionPublicScale`, 3 passing runs across iterations) and the full `TestEpisodeVersionPublic*` suite in this package (10 tests, all pass) to confirm zero regressions from the new sibling fixture.

## User Setup Required

None - no external service configuration required. The reused `team4s_phase117_test_164` database is local dev-only isolated test infrastructure, not a production dependency.

## Next Phase Readiness
- Frontend windowing/infinite-scroll plans (164-05, 164-06) and the final UAT/gate plan (164-07) now have a reusable, reproducible 52-episode fixture pattern (`anime_id=9` in this isolated test schema) they can point automated performance assertions at, instead of relying only on the small real Naruto dataset.
- The 25KB full-page response-size bound is now a live, asserted fact rather than an estimate, closing the specific measurement gap 164-RESEARCH.md flagged for this plan to resolve.
- No blockers for downstream plans in this phase.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-17*

## Self-Check: PASSED

`backend/internal/repository/episode_version_public_scale_fixture_test.go` verified present on disk; commit hash `de97e83e` verified present in `git log --oneline --all`.
