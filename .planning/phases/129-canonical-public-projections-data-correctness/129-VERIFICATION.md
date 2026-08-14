# Phase 129 Verification — Canonical Public Projections & Data Correctness

**Verified:** 2026-08-14 · **Verdict:** PASS (automated gate) · authoritative live sign-off deferred to the bundled Phase-134 UAT (DECISIONS 2026-08-14 / CONTEXT V-02).

## Goal check
"Users see only correct, publicly permissible profile facts assembled from existing canonical
domain and release-native ownership seams." — achieved: every projection defect found in
`129-RESEARCH.md §1` is corrected and locked by a passing PostgreSQL contract test.

## Requirement coverage (all GREEN)
| Req | Plan | Contract test |
|---|---|---|
| PMDA-01 year-only precision | 129-09 | TestPhase129PublicProfileExposesYearOnlyActivePeriod |
| PMDA-02 current vs historical | 129-10 | TestPhase129PublicMembershipsExposeApprovedHistoricalRoles |
| PMDA-03 confirmed+public | 129-07 | (endpoint removed; leak surface deleted) |
| PMDA-04 role code+label | 129-08 | TestPhase129CurrentProjectRolesCarryCodeAndLabel |
| PMDA-05 dedupe | 129-10 | membership dedupe covered in the membership test |
| PMDA-06 public-facts progress | 129-05 | TestPhase129BadgeProgressExcludesPrivateConfirmedContributions, TestPhase129ArchivistCountExcludesUnapprovedPrivateMedia |
| PMDA-07 media filters | 129-06 | TestPhase129PublicRecentMediaExcludesUnapprovedPrivateMedia |
| PMDA-08 totals match rows | 129-04 | TestPhase129CurrentProjectsCountMatchesListedRows |
| PMDA-09 dead legacy removed | 129-06, 129-07 | recent_* dropped from public DTO; /contributions removed |
| PMDA-10 all roles / no internal | 129-08, 129-10 | membership all-roles + no raw internal codes |
| PMDA-11 one dataset + load-more | 129-04 | count/rows parity terminates load-more |
| PMPR-06 no internal leakage | 129-05/06/07/10 | covered by the above |

## Automated gate results
- **Backend build+vet:** `go build ./...` clean; `go vet ./internal/repository/...` clean.
- **Phase-129 contract tests:** `go test -run Phase129 ./internal/repository/` → `ok` (all GREEN) against the final code, run in a `golang:1.25-alpine` container on the compose network using the live DB credentials pointed at the dedicated `team4s_phase129_test` fixture DB.
- **Full repository suite:** 30 remaining failures are ALL pre-existing and infra-gated (missing `TEAM4S_PHASE128_TEST_DSN` + unmounted `/database/migrations` in the throwaway container) — unrelated to Phase 129; count unchanged from the pre-phase baseline.
- **450-line gate:** every `member_profile_*.go` production file ≤450 (largest 366) after the 129-03 split.
- **Frontend:** Phase-129-touched files (MemberCurrentProjectsSection, MemberProfileHero, PreviousContributionsSection, MembershipsSection, members/[slug]/page, profile types/tests) pass tsc + vitest. The tree carries pre-existing uncommitted foreign WIP (MemberBadgeChain, FocalCarousel, memberBadgeLabels, ReleaseGallery, etc.) whose tsc/vitest failures pre-date this phase and are OUT OF SCOPE; the Phase-129 changes did not grow the failing set.

## Wave-1 seed (fixture for live UAT / Phase 134)
`scripts/seed-member-profile-fixtures.mjs` runs idempotently (13/13 scenario assertions PASS on
two consecutive runs) and is the reusable Phase-134 clean-reset fixture. Runs via
`docker exec team4sv30-frontend node …` (VM has no host Node).

## Deviations recorded (from execution)
- 129-04: count parity via "exclude in both" (added `EXISTS(anime_contribution_roles)` to the count).
- 129-05: archivist count gated by visibility/review but intentionally NOT by `media_files status` (the metric counts upload events).
- 129-08: shared role-type change propagated to all consumers for an atomic compiling commit; `frontend/src/lib/roleColors.ts` (fansub project-member surfaces, not member profile) left untouched — flagged for any broader D-06 cleanup.
- 129-10: TS `is_current`/`roles` typed optional (server + OpenAPI required) to avoid growing tsc failures in unrelated in-flight test files; component defaults defensively.

## Not done here (by design)
- Live browser UAT on rebuilt containers — deferred to the bundled cross-phase Phase-134 run per CONTEXT V-02.
- The degenerate year-only-null-date DB row — out of scope (PMDA-01 fix makes the year observable from the API-set period).

*Phase status: implementation complete, automated gate PASS.*
