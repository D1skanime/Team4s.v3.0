---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 01
subsystem: api
tags: [go, gin, pgx, postgres, member-claims, ownership-gate]

# Dependency graph
requires:
  - phase: 143
    provides: "GetMemberProjectDetail / listMemberProjectReleaseVersions repository query and its real-Postgres test fixture (anime_contributions_member_project_repository_has_own_notes_test.go)"
  - phase: 116
    provides: "GetOwnDashboard's graceful no-member-claim pattern (D-09-Kontrast), reused here for D-05"
provides:
  - "GetMyProjectDetail (GET /api/v1/me/projects/:animeId) returns 200 with real project data for a platform admin without a verified member_claims row, instead of 404"
  - "Repository-level LEFT JOIN fix proving the degrade-gracefully behavior independently of the handler"
  - "Corrected 404 contract description in contributions.yaml/openapi.yaml for this endpoint"
affects: [181-02, 181-03, later-release-editor-consolidation-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sentinel memberID=0 fallback for read-only degrade-gracefully queries (mirrors GetOwnDashboard's emptyOwnDashboardData D-09 pattern, but here the repository itself returns real data instead of a synthetic empty struct)"

key-files:
  created:
    - backend/internal/repository/anime_contributions_member_project_repository_sentinel_test.go
    - backend/internal/handlers/contributions_me_project_handler_test.go
  modified:
    - backend/internal/repository/anime_contributions_member_project_repository.go
    - backend/internal/handlers/contributions_me_project_handler.go
    - shared/contracts/contributions.yaml
    - shared/contracts/openapi.yaml

key-decisions:
  - "Fixed the bug at BOTH layers (repository JOIN->LEFT JOIN plus handler sentinel), per 181-RESEARCH.md Pattern 4/Pitfall 2 -- a handler-only fix would have only moved the 404 one level deeper, not resolved it"
  - "Sentinel memberID=0 is read-only and never participates in write authorization (identity.AppUserID remains the sole authorization source for this endpoint), documented inline and covered by the threat register (T-181-01)"
  - "Left the pre-existing, out-of-scope GetMemberProjectDetail-error-to-internalError mapping unchanged (dead notFound() branch removed because it was already unreachable code for the member-claim case, not because it should now handle the genuinely-missing-anime/group case differently)"

patterns-established:
  - "Pattern: real-Postgres regression test proves a repository JOIN-vs-LEFT-JOIN fix by asserting against BOTH the old and new SQL (temporarily reverted during verification, not committed) -- a fake-repository-based handler test alone cannot catch this class of bug"

requirements-completed: [D-05]

# Metrics
duration: ~25min
completed: 2026-10-13
---

# Phase 181 Plan 01: D-05 Backend-Fix (GetMyProjectDetail graceful statt 404) Summary

**`GetMyProjectDetail` (`GET /api/v1/me/projects/:animeId?fansub_group_id=:id`) liefert jetzt echte Projektdaten (200) statt 404 für einen Plattform-Admin ohne verifiziertes Member-Profil — behoben an zwei Stellen (SQL `LEFT JOIN` + Handler-Sentinel), nicht nur am Handler.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-13T15:48Z
- **Tasks:** 2/2
- **Files modified:** 4 (2 created, 4 modified total incl. 2 pre-existing files touched)

## Accomplishments
- Repository-Fix: `GetMemberProjectDetail`'s header query (`anime_contributions_member_project_repository.go`) nutzt jetzt `LEFT JOIN own_roles ON true` statt `JOIN` — ein `memberID` ohne eigenes `own_roles`-Match (z. B. Sentinel `0`) kollabiert die Abfrage nicht mehr auf null Zeilen.
- Handler-Fix: `ContributionsMeHandler.GetMyProjectDetail` setzt bei fehlendem verifiziertem `member_claims`-Eintrag `memberID = 0` statt sofort 404 zurückzugeben — analog zum bereits etablierten `GetOwnDashboard`/"D-09-Kontrast"-Muster.
- Beide Halbfixe sind durch echte Postgres-Regressionstests bewiesen, inklusive eines bewussten, nicht committeten Vorher/Nachher-Vergleichs (alter `JOIN` lässt die neuen Tests real fehlschlagen, `LEFT JOIN` lässt sie grün werden) — beweist, dass der Test die Lücke tatsächlich erkennt.
- Contract-Text in `contributions.yaml`/`openapi.yaml` korrigiert: der 404-Fall deckt jetzt nur noch "kein eigenes Projekt für diese Anime/Fansub-Gruppen-Kombination", nicht mehr "fehlender Member-Account".

## Task Commits

1. **Task 1: Repository LEFT JOIN fix + real-Postgres regression test** - `84eca2cd` (fix)
2. **Task 2: Handler graceful sentinel + handler test + contract text fix** - `1c548046` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_member_project_repository.go` - `JOIN own_roles ON true` → `LEFT JOIN own_roles ON true` in `GetMemberProjectDetail`'s header query
- `backend/internal/repository/anime_contributions_member_project_repository_sentinel_test.go` - new: `TestGetMemberProjectDetailWithSentinelMemberID` + `TestGetMemberProjectDetailWithNoContributionMemberIDIsNotSpecialCasedOnZero`
- `backend/internal/handlers/contributions_me_project_handler.go` - early-404 branch replaced with `memberID = 0` sentinel fallback for `repository.ErrNotFound` from `resolveVerifiedMemberID`; genuine other errors still map to `internalError`
- `backend/internal/handlers/contributions_me_project_handler_test.go` - new: `TestGetMyProjectDetailRequiresAuth` (401) + `TestGetMyProjectDetailGracefulWithoutMemberProfile` (real Postgres fixture, 200 with real data)
- `shared/contracts/contributions.yaml` - 404 description corrected (German)
- `shared/contracts/openapi.yaml` - 404 description corrected (English)

## Decisions Made
- Fixed at both the SQL and handler layer (not a handler-only shortcut), matching 181-RESEARCH.md's recommendation that a repository-only or handler-only fix would be either incomplete (handler-only) or return structurally-empty data for a case where real data exists (handler-shortcut-without-SQL-fix).
- Sentinel `memberID=0` is documented inline as read-only/never-for-write-authorization, matching threat register T-181-01's mitigation.
- Left the handler's second `GetMemberProjectDetail`-error branch (`internalError` for any error, including a genuinely non-existent anime/fansub-group combo) unchanged, per the plan's explicit instruction ("the call ... stays unchanged below it") — this is a pre-existing, out-of-scope imprecision (a truly missing anime/group combo returns 500 instead of 404), not something D-05 asked this plan to fix.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria and verify commands passed as specified.

## Issues Encountered
- Go toolchain is not on the host PATH; tests were run via `docker exec` into the already-running `team4sv30-backend` dev container (which has a live `docker compose watch` sync active, confirmed against file mtimes before running), using a disposable `team4s_phase107_test_<uuid>` database created on `team4sv30-db` and dropped again after the run (DATABASE_URL pointing at `team4s_v2` was never touched).
- As an extra validation step (not part of the plan's acceptance criteria but useful due diligence), the `LEFT JOIN` fix was temporarily reverted to the old `JOIN` to confirm both new repository tests fail against it, then restored — proving the regression tests are not vacuously true.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-05 is fully closed for `GetMyProjectDetail`; the other 9 `/me/*` handlers requiring a verified `member_claims` row remain untouched, as scoped.
- Later plans in this phase (frontend route consolidation, D-01 through D-04) can now rely on this endpoint returning real project/release-version data for a platform admin without a member profile, which the D-03 project-contextual Vor/Zurück navigation depends on.
- Backend rebuilt via `docker compose up -d --build team4sv30-backend`; `/health` returned `{"status":"ok"}` after restart.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

All 7 created/modified files found on disk; both task commits (`84eca2cd`, `1c548046`) found in git log.
