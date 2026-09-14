---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 16
subsystem: database
tags: [postgres, pgx, go, migrations, theme-segments, origin-consistency]

# Dependency graph
requires:
  - phase: 156 (plans 156-03/156-07/156-11/156-12)
    provides: theme_segments.origin_release_version_id (migration 0161), theme_segment_contributors (migration 0162), SetThemeSegmentOrigin's atomic contributor-cleanup precedent, and autoAssignThemeSegmentsForNewReleaseVersion
provides:
  - ensureThemeSegmentOriginTx, the single central origin-validity-check/recompute/contributor-cleanup rule
  - three wired call sites (assignThemeSegmentToEpisodeRangeTx, CreateAnimeSegment's implicit-assignment branch, autoAssignThemeSegmentsForNewReleaseVersion)
  - migration 0164, an idempotent bulk repair of the live team4s_v2 GAP-04/GAP-05 rows
affects: [156-UAT (GAP-04/GAP-05 closure), any future plan touching theme_segment_assignments/theme_segments.origin_release_version_id]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Central Go rule reused verbatim by an SQL migration (themeSegmentOriginRecomputeQuery / origin_candidate CTE), proven equal by a dedicated equivalence test rather than asserted by convention"
    - "Data-modifying CTE chain (WITH ... UPDATE ... RETURNING AS applied ... DELETE ... USING applied) for an atomic bulk-repair-plus-cleanup migration"

key-files:
  created:
    - backend/internal/repository/theme_segment_origin_sync.go
    - backend/internal/repository/theme_segment_origin_sync_integration_test.go
    - backend/internal/repository/theme_segment_origin_migration_repair_integration_test.go
    - database/migrations/0164_theme_segment_origin_repair.up.sql
    - database/migrations/0164_theme_segment_origin_repair.down.sql
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/theme_segment_assignments.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/repository/episode_import_repository_release_autoassign.go
    - backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go
    - backend/internal/repository/theme_segment_assignment_slots_integration_test.go
    - backend/internal/repository/episode_import_repository_autoassign_test.go
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/repository/project_member_public_repository_episodes_integration_test.go
    - backend/internal/repository/release_detail_public_repository_segment_credits_test.go
    - backend/internal/repository/segment_origin_query_budget_test.go
    - backend/internal/repository/theme_segment_contributors_integration_test.go

key-decisions:
  - "ensureThemeSegmentOriginTx lives in its own new ~150-line file, never inside theme_segment_assignments.go or admin_content_anime_themes.go (both already at or beyond the 450-line cap)"
  - "The anime_contributions/anime_contribution_roles/visibilities/members-profile_visibility schema shim moved into the shared testsupport/phase117_postgres.go prerequisites, because ensureThemeSegmentOriginTx now reaches loadPublicEffectiveContributors from every write path that can change an origin, not just the previously opt-in SetThemeSegmentOrigin call -- four pre-existing per-file copies were converted to IF NOT EXISTS/ON CONFLICT DO NOTHING to stay collision-free"
  - "Migration 0164's contributor cleanup mirrors loadPublicEffectiveContributors's per-(release_version,fansub_group) override-vs-default precedence in SQL rather than approximating it, so the migration's cleanup is provably as correct as the Go path, not just directionally similar"

patterns-established:
  - "A production-data repair migration paired with a same-plan Go/SQL rule-equivalence test, not just a one-off manual UPDATE"

requirements-completed: [P156-05, P156-06]

# Metrics
duration: ~35min
completed: 2026-09-14
---

# Phase 156 Plan 16: Central Origin-Validity Rule + GAP-04/GAP-05 Repair Migration Summary

**A single `ensureThemeSegmentOriginTx` function now backs all three theme-segment-assignment write paths (range sync, segment creation, release-version auto-assignment), and idempotent migration 0164 fixed the three proven-invalid live `team4s_v2` rows (segment 3: stale origin 29 → 40; segments 4/5: NULL → 28/42) with zero remaining invariant violations.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-14T14:07:38Z (first commit)
- **Completed:** 2026-09-14T14:40:56Z
- **Tasks:** 3
- **Files modified:** 17 (5 created, 12 modified)

## Accomplishments

- `ensureThemeSegmentOriginTx` (`theme_segment_origin_sync.go`) is the one central rule: a valid origin (NULL, or a currently-assigned release version) is never overwritten; an invalid/missing origin is recomputed via the exact same ORDER BY expression as migration 0161's backfill, with atomic `theme_segment_contributors` cleanup (never an INSERT) on any actual change.
- All three call sites (`assignThemeSegmentToEpisodeRangeTx`, `CreateAnimeSegment`'s implicit-assignment branch, `autoAssignThemeSegmentsForNewReleaseVersion`) invoke it inside their existing transaction, confirmed by `grep` to be exactly one call site each.
- `ThemeSegmentAssignmentSyncResult` gained `OriginBefore`/`OriginAfter`/`RemovedContributorCount`, always populated (even when unchanged).
- Migration 0164 is a single `WITH` statement chaining `origin_candidate` → `segments_needing_repair` → an `UPDATE ... RETURNING` (`applied`) → a `loadPublicEffectiveContributors`-precedence-mirroring contributor cleanup, idempotent by construction (re-evaluates current invalidity every run, no separate flag).
- Live `team4s_v2` repaired and verified via `psql`: both invariant-violation classes (dangling origin; missing origin with assignments) return 0 rows.
- Full Phase-156 regression matrix re-run after the live migration: `internal/handlers` and `internal/permissions` 100% green; `internal/repository` shows the exact same 50 pre-existing/environmental failures as before this plan's changes (byte-identical name list, diffed).

## Task Commits

1. **Task 1: Central origin-ensure function + direct behavioral tests**
   - `b936c3f8` (test): 7 failing subtests for `ensureThemeSegmentOriginTx` (confirmed RED via a build-failure check before this commit)
   - `d23e1981` (feat): `ensureThemeSegmentOriginTx` + `ThemeSegmentAssignmentSyncResult` extension — all 7 subtests green
2. **Task 2: Wire the three call sites + integration-level regression tests**
   - `6af239a4` (test): failing extensions to the reconciliation/slots/autoassign integration test files, plus moving the contributor shim into the shared Phase-117 fixture (confirmed RED via a temporary revert-and-retest of the wiring)
   - `b141b726` (feat): wired `ensureThemeSegmentOriginTx` into all three call sites — all ten behavior cases green, 50 pre-existing failures unchanged
3. **Task 3: Repair migration 0164, SQL/Go rule equivalence proof, and live verification**
   - `f9b67bf3` (test): failing migration-repair + rule-equivalence tests (confirmed RED — migration file did not exist yet)
   - `c8ac1613` (feat): migration 0164 (up + down) — both tests green; live `team4s_v2` verified via `psql`

**Plan metadata:** (this commit, `docs(156-16): complete plan`)

## Files Created/Modified

- `backend/internal/repository/theme_segment_origin_sync.go` — the central `ensureThemeSegmentOriginTx` rule and `ThemeSegmentOriginSyncOutcome`
- `backend/internal/repository/theme_segment_origin_sync_integration_test.go` — 7 direct behavioral subtests against real Postgres
- `backend/internal/models/admin_anime_themes.go` — `ThemeSegmentAssignmentSyncResult` +3 fields
- `backend/internal/repository/theme_segment_assignments.go` — wired call site 1 (range sync)
- `backend/internal/repository/admin_content_anime_themes.go` — wired call site 2 (`CreateAnimeSegment` implicit branch)
- `backend/internal/repository/episode_import_repository_release_autoassign.go` — wired call site 3 (auto-assign)
- `backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go` — shrink/empty/expand origin behavior + guard-untouched assertion
- `backend/internal/repository/theme_segment_assignment_slots_integration_test.go` — `CreateAnimeSegment` origin behavior + a fix to the pre-existing bounded-query-count test's fixture (see Deviations)
- `backend/internal/repository/episode_import_repository_autoassign_test.go` — auto-assign sets/never-overwrites origin
- `backend/internal/testsupport/phase117_postgres.go` — shared contributor schema shim (see Deviations)
- `backend/internal/repository/project_member_public_repository_episodes_integration_test.go`, `release_detail_public_repository_segment_credits_test.go`, `segment_origin_query_budget_test.go`, `theme_segment_contributors_integration_test.go` — local shim copies converted to `IF NOT EXISTS`/`ON CONFLICT DO NOTHING` so they don't collide with the now-shared fixture copy
- `database/migrations/0164_theme_segment_origin_repair.up.sql` / `.down.sql` — the repair migration
- `backend/internal/repository/theme_segment_origin_migration_repair_integration_test.go` — repair/idempotency proof + SQL/Go rule equivalence proof

## Decisions Made

- Kept `ensureThemeSegmentOriginTx` in its own new file rather than adding it to either already-oversized existing file, per the plan's explicit instruction and the project's 450-line cap.
- Moved the `anime_contributions`/`anime_contribution_roles`/`visibilities` schema shim into the shared `testsupport/phase117_postgres.go` prerequisites rather than duplicating it into every newly-affected test file, once it became clear `ensureThemeSegmentOriginTx` reaches `loadPublicEffectiveContributors` from many more call sites than the previously opt-in `SetThemeSegmentOrigin`. Converted the four pre-existing local copies to `IF NOT EXISTS`/`ON CONFLICT DO NOTHING` for collision safety.
- Migration 0164's contributor-membership CTE fully replicates `loadPublicEffectiveContributors`'s per-`(release_version, fansub_group)` override-vs-default precedence (via `group_has_override`/`bool_or(is_override)`) instead of a simplified approximation, so the mandatory SQL/Go equivalence test could hold for real fixtures, not just the trivial no-override case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shared test-fixture prerequisites needed the contributor schema shim**
- **Found during:** Task 2, first full-suite regression run
- **Issue:** Wiring `ensureThemeSegmentOriginTx` into `assignThemeSegmentToEpisodeRangeTx`/`CreateAnimeSegment`/auto-assign meant `loadPublicEffectiveContributors` (which needs `anime_contributions`/`anime_contribution_roles`/`visibilities`/`members.profile_visibility`) is now reached from many more `OpenPhase117Postgres`-based tests than before, breaking ~10 pre-existing tests across `theme_segment_assignments_integration_test.go`, `theme_segment_assignments_reconciliation_integration_test.go`, `theme_segment_assignment_slots_integration_test.go`, `admin_content_anime_theme_segments_hydration_integration_test.go`, and `theme_segment_playback_resolution_integration_test.go` with `relation "anime_contributions" does not exist`.
- **Fix:** Moved the shim into `testsupport/phase117_postgres.go`'s shared `createPhase117Prerequisites`. Four pre-existing test files (`project_member_public_repository_episodes_integration_test.go`, `release_detail_public_repository_segment_credits_test.go`, `segment_origin_query_budget_test.go`, `theme_segment_contributors_integration_test.go`) that already seeded an unguarded local copy of the same tables were converted to `CREATE TABLE IF NOT EXISTS`/`ON CONFLICT DO NOTHING` so the shared and local copies never collide.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go` plus the four files above.
- **Verification:** Full `internal/repository` suite re-run; zero new failures, same 50 pre-existing/environmental ones as before.
- **Committed in:** `6af239a4` (Task 2 test commit)

**2. [Rule 1 - Bug in test] `TestSegmentSlotRangeHasBoundedAssignmentStatements` compared two runs in different origin states**
- **Found during:** Task 2, first full-suite regression run
- **Issue:** This pre-existing query-budget test measures the query count for a 1-target range assignment versus a 100-target one, expecting equality (proving O(1) scaling). After wiring, the first call set a fresh origin (4 extra queries: recompute+update+load-effective+delete); the second call's manually-deleted-and-reinserted assignment left the origin still valid (short-circuits after 2 queries: read+membership-check), producing `15` vs `12` — a real difference caused by differing origin-validity state between the two measurement points, not by the actual range size.
- **Fix:** Added `UPDATE theme_segments SET origin_release_version_id = NULL WHERE id=$1` alongside the existing assignment-row deletion between the two measured calls, so both runs exercise the identical origin-recompute code path. The test's actual intent (constant query count regardless of target count) is preserved; it no longer accidentally also asserts state-independent branching.
- **Files modified:** `backend/internal/repository/theme_segment_assignment_slots_integration_test.go`
- **Verification:** `TestSegmentSlotRangeHasBoundedAssignmentStatements` passes with `one=15 hundred=15`.
- **Committed in:** `6af239a4` (Task 2 test commit)

---

**Total deviations:** 2 auto-fixed (1 blocking test-infrastructure fix, 1 test-fixture bug fix)
**Impact on plan:** Both were necessary consequences of wiring a single new dependency into many more call sites than existed before; neither changes production behavior. No scope creep — no production code outside the three named call sites and the new file was touched.

## Issues Encountered

None beyond the two deviations above — both diagnosed and fixed within the same task's verification loop.

## Live Verification Evidence

**Migration round-trip against `team4sv30-db`** (`team4s_v2`): the dev-container entrypoint's `go run ./cmd/migrate up` on `docker compose up -d --build team4sv30-backend` had already applied 0164; `go run ./cmd/migrate down -steps 1` rolled it back cleanly (no SQL error; the no-op `down.sql` left the already-repaired data rows untouched, only removing the `schema_migrations` row), and `go run ./cmd/migrate up` re-applied it, restoring the fixed state (`schema_migrations` row `applied_at: 2026-09-14 14:38:40`).

**Before (pre-repair, captured prior to migration 0164 ever running):**

| segment_id | origin_release_version_id | origin_still_assigned | current_assignments |
|---|---|---|---|
| 1 | 27 | true | {27} |
| 2 | 27 | true | {27} |
| 3 | 29 | **false** | {40,41} |
| 4 | NULL | — | {28,29} |
| 5 | NULL | — | {42} |

**After (post-repair, confirmed live):**

| segment_id | origin_release_version_id | current_assignments |
|---|---|---|
| 1 | 27 (unchanged) | {27} |
| 2 | 27 (unchanged) | {27} |
| 3 | **40** (was 29) | {40,41} |
| 4 | **28** (was NULL) | {28,29} |
| 5 | **42** (was NULL) | {42} |

**Live `psql` invariant checks against `team4s_v2` (both return 0 rows):**
```
Invariant 1 (dangling origin, non-NULL not a current assignment): count = 0
Invariant 2 (missing origin with assignments): count = 0
```

**Full Phase-156 regression matrix** (`golang:1.25-alpine` on `team4s_default`, `TEAM4S_PHASE117_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_156?sslmode=disable`, password taken from the live backend container's own `DATABASE_URL`):

```
go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1
```
- `internal/handlers`: **100% green**
- `internal/permissions`: **100% green**
- `internal/repository`: exactly **50** `--- FAIL` entries — byte-identical name list captured both immediately before and immediately after the live migration run (diffed, zero difference). Named breakdown:
  - **35** require `TEAM4S_PHASE128_TEST_DSN` (unset in this environment) — `TestArchive*`, `TestLoadRoleVolumeBadgesPostgres*` (incl. its 10 `ProgressBoundaries` subtests), `TestLoadContributionBadges*`, `TestGetOwnDashboardPostgres*`, `TestLoadPublicBadgesPostgres*`, `TestLoadBadgeProgressPostgres*`, `TestMemberPointTotals*`, `TestPhase128*` — the same family documented since 156-05/156-07/156-10/156-15.
  - **9** require a live Keycloak password grant + an HTTP backend reachable at `192.168.235.196:18093` — `TestPhase134Matrix*` — the same family documented since 156-05/156-06/156-10/156-15.
  - **6** are unrelated, pre-existing failures in domains this plan never touches (`fansub_group_app_members_repository_test.go`, `member_claims_*_test.go`, `fansub_repository_test.go`) — `TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` (all five already named verbatim in 156-07-SUMMARY.md's own pre-existing-failure bucket) plus `TestFansubRepository_PublicProfileSourceInvariants` (not previously named in a 156 SUMMARY, but `git log` confirms its file was last touched by unrelated Phase-114/quick-task commits, long before Phase 156 existed — genuinely pre-existing and out of this plan's scope).
  - **Zero new failure names** beyond this set.

## Explicit Non-Claim (out of scope for this plan)

The `156-UAT.md` live-UAT human checkpoint (Origin/Segment-Contributor admin-browser verification, 14 items: 5 Origin + 9 Segment-Contributors) was **NOT** run and is **NOT** claimed as passed by this plan. It remains the same, separate, still-outstanding Auftraggeber acceptance step already tracked in `deferred-items.md` since Plans 156-11/156-15. This plan's own scope was exclusively the automated GAP-04/GAP-05 code fix, migration, and regression verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `theme_segments.origin_release_version_id` now satisfies its invariant everywhere in `team4s_v2`, verified live.
- The bundled GAP-02 live-UAT checkpoint (Origin + Segment-Contributors, 14 items) remains the sole outstanding item for Phase 156's full sign-off — unchanged by this plan, tracked in `deferred-items.md`.
- No new blockers introduced.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-14*

## Self-Check: PASSED

All 14 created/modified files listed above confirmed present on disk. All 6 task commit hashes
(`b936c3f8`, `d23e1981`, `6af239a4`, `b141b726`, `f9b67bf3`, `c8ac1613`) confirmed present in
`git log`.
