---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 12
subsystem: database, api
tags: [postgres, pgx, gin, segment-contributors, gap-01]

# Dependency graph
requires:
  - phase: 156 (Plan 156-01/156-04/156-05/156-07/156-09)
    provides: theme_segments.origin_release_version_id (Migration 0161), SetThemeSegmentOrigin,
      loadPublicEffectiveContributors, permissions.SegmentCreditRoleCodes, the public
      segment-credit read projection that filters on it
provides:
  - theme_segment_contributors table (theme_segment_id + member_id + created_at,
    UNIQUE on the pair, no role_code, no release_version_id)
  - SetThemeSegmentContributors/ListThemeSegmentContributorCandidates/GetThemeSegmentContributorMemberIDs
    repository methods, validated against the EFFECTIVE contributor resolution
  - permissions.SegmentCreditRoleCodes extended to 6 entries (adds editor, quality_checker)
  - transactional SetThemeSegmentOrigin with atomic now-invalid-contributor cleanup on
    Origin change, reporting removedContributorCount
  - pgxQuerier interface narrowing on loadPublicEffectiveContributors (pool- and
    tx-compatible)
affects: [156-13, 156-14, 156-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pgxQuerier structural interface (Query-only) lets one resolution function run
      transparently against *pgxpool.Pool or pgx.Tx -- reused by 156-13/beyond for any
      other future transactional contributor-resolution need"
    - "All-or-nothing validated reconcile against a live-resolved effective set (not a raw
      FK), following the same insert-missing/delete-excess shape as
      AssignThemeSegmentToEpisodeRange/syncThemeSegmentPlaybackSourceTx"

key-files:
  created:
    - database/migrations/0162_theme_segment_contributors.up.sql
    - database/migrations/0162_theme_segment_contributors.down.sql
    - backend/internal/repository/theme_segment_contributors.go
    - backend/internal/repository/theme_segment_contributors_integration_test.go
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/segment_credit_roles_test.go
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/repository/public_effective_contributors.go
    - backend/internal/repository/theme_segment_origin.go
    - backend/internal/repository/theme_segment_origin_integration_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_theme_segment_origin.go
    - backend/internal/handlers/admin_content_anime_theme_segment_origin_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go

key-decisions:
  - "theme_segment_contributors has NO role_code and NO release_version_id column -- locked by
    156-UAT.md Nachtrag 2026-09-12 (bestaetigter Datenmodell-Entscheid), matching the orchestrator's
    mandatory directive #1 exactly. Eligibility/role are resolved live via
    loadPublicEffectiveContributors at both write-time and read-time, never stored."
  - "Reused ErrValidation (already existing in errors.go, used elsewhere in the repository
    package for malformed input) instead of introducing a new ErrInvalidInput sentinel --
    the plan explicitly allowed reuse of an existing suitable sentinel."
  - "SetThemeSegmentContributors is all-or-nothing: a single invalid memberID anywhere in the
    input rejects the ENTIRE call with ErrConflict and writes nothing (T-156-20)."
  - "SetThemeSegmentOrigin's cleanup runs the identical DELETE ... WHERE segment=$1 AND NOT
    (member_id = ANY($2)) shape unconditionally after every successful UPDATE -- not
    special-cased on 'did the origin change', since running it on a same-value set produces
    an equivalent, harmless no-op result (0 removed) and avoids a second code path (T-156-21)."

patterns-established:
  - "pgxQuerier (Query-only structural interface) for transaction-transparent read helpers"

requirements-completed: [GAP-01]

# Metrics
duration: ~70min
completed: 2026-09-12
---

# Phase 156, Plan 12: theme_segment_contributors data model + validated write path Summary

**New theme_segment_contributors join table (person-only, no role, no release binding) with an
all-or-nothing write path validated against the live effective-contributor resolution, plus an
atomic origin-change cleanup that never leaves a stale contributor selection behind.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2
- **Files modified:** 12 (4 created, 8 modified)

## Accomplishments

- Migration 0162 creates `theme_segment_contributors` with exactly `theme_segment_id` +
  `member_id` + `created_at`, `UNIQUE(theme_segment_id, member_id)` -- no `role_code`, no
  `release_version_id`, verified both directions (up/down/up) against the live `team4s_v2`
  database via `cmd/migrate`.
- `permissions.SegmentCreditRoleCodes` grows from 4 to 6 entries: adds `editor`/`quality_checker`,
  keeps `encoder` as the sole permanent exclusion.
- `theme_segment_contributors.go` implements `SetThemeSegmentContributors` (validated
  insert-missing/delete-excess reconcile, all-or-nothing against
  `loadPublicEffectiveContributors`), `ListThemeSegmentContributorCandidates` (unfiltered
  candidate list including encoder-only contributors, with `Selected` flags), and
  `GetThemeSegmentContributorMemberIDs`.
- `loadPublicEffectiveContributors` now takes a minimal `pgxQuerier` interface instead of
  `*pgxpool.Pool`, so it runs unmodified inside a transaction -- zero behavior change for the
  four+ existing pool-based callers.
- `SetThemeSegmentOrigin` now runs atomically in one transaction and returns
  `(removedContributorCount int, err error)`: an Origin change deletes, in the same commit as the
  `origin_release_version_id` UPDATE, every `theme_segment_contributors` row whose `member_id` is
  no longer an effective contributor of the new Origin (Case H, proven against real Postgres).
- Admin handler surfaces the new count additively as
  `"contributor_selection_changes_removed"` in the existing 200 response -- no existing field or
  status code changed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0162 + role catalog extension + theme_segment_contributors repository** -
   `f912c2b8` (feat)
2. **Task 2: Transactional loadPublicEffectiveContributors + atomic Origin-change contributor
   cleanup** - `a87867ae` (feat)

_Note: both tasks were delivered with their tests in the same commit (implementation + integration
test together), not as separate RED/GREEN commits -- see TDD Gate note below._

## Files Created/Modified

- `database/migrations/0162_theme_segment_contributors.up.sql` / `.down.sql` - new join table,
  verified up/down/up against live `team4s_v2`
- `backend/internal/repository/theme_segment_contributors.go` - `SetThemeSegmentContributors`,
  `ListThemeSegmentContributorCandidates`, `GetThemeSegmentContributorMemberIDs`
- `backend/internal/repository/theme_segment_contributors_integration_test.go` - 9 integration
  test cases (7 required + 2 extra) against real, isolated Postgres
- `backend/internal/permissions/permissions.go` - `SegmentCreditRoleCodes` now 6 entries
- `backend/internal/permissions/segment_credit_roles_test.go` - updated assertions for the new set
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegmentContributorCandidate`
- `backend/internal/testsupport/phase117_postgres.go` - migration 0162 added to the isolated
  fixture's applied-migrations list
- `backend/internal/repository/public_effective_contributors.go` - `pgxQuerier` interface,
  `loadPublicEffectiveContributors`'s `db` parameter narrowed from `*pgxpool.Pool` to `pgxQuerier`
- `backend/internal/repository/theme_segment_origin.go` - `SetThemeSegmentOrigin` now
  transactional, returns `(int, error)`, atomic contributor cleanup
- `backend/internal/repository/theme_segment_origin_integration_test.go` - existing calls updated
  for the new signature, plus a local `anime_contributions`/`anime_contribution_roles`/
  `visibilities` fixture addendum (needed unconditionally now, not just for Case H) and the new
  Case H subtest
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository` interface:
  `SetThemeSegmentOrigin` signature change, two new methods added
- `backend/internal/handlers/admin_content_anime_theme_segment_origin.go` - captures
  `removedContributorCount`, adds it to the JSON response
- `backend/internal/handlers/admin_content_anime_theme_segment_origin_test.go` - fake repo updated
  for the new return shape
- `backend/internal/handlers/admin_content_fansub_releases_test.go` /
  `admin_content_release_theme_assets_test.go` - two full-manual interface stubs updated for the
  new signature plus no-op implementations of the two new interface methods (mirrors Plan 156-04's
  precedent for these same two files)

## Decisions Made

See `key-decisions` in frontmatter. Additionally: `ListThemeSegmentContributorCandidates` and
`SetThemeSegmentContributors` both resolve the segment's Origin via a small shared unexported
helper (`loadThemeSegmentOriginForContributors`) instead of duplicating the
`SELECT origin_release_version_id FROM theme_segments WHERE id=$1` + `ErrNoRows`-to-`ErrNotFound`
translation twice.

## Deviations from Plan

**1. [Rule 1 - Correctness] Migration comment rewritten to avoid literal `role_code`/
`release_version_id` substrings**
- **Found during:** Task 1 acceptance-criteria check
- **Issue:** The plan's own acceptance criterion is
  `grep -c "role_code\|release_version_id" 0162....up.sql` returning 0. My first draft's
  explanatory comment (correctly) discussed *why* those columns are absent, but literally
  contained the strings `role_code` and `release_version_id`, so the grep returned 5 instead of 0.
- **Fix:** Reworded the comment to describe the same rationale without using the literal column
  name strings (e.g. "Spalte fuer die Mitwirkungs-Rolle" instead of "role_code-Spalte").
- **Files modified:** `database/migrations/0162_theme_segment_contributors.up.sql`
- **Verification:** `grep -c "role_code\|release_version_id" ...up.sql` now returns 0; migration
  still applies/rolls back cleanly.
- **Committed in:** `f912c2b8` (Task 1 commit)

**2. [Rule 1 - Correctness] `theme_segment_origin_integration_test.go`'s shared fixture needed the
`anime_contributions`/`anime_contribution_roles`/`visibilities` local schema addendum
unconditionally, not just for the new Case H subtest**
- **Found during:** Task 2 test run
- **Issue:** `SetThemeSegmentOrigin` now unconditionally calls `loadPublicEffectiveContributors`
  on every successful origin UPDATE (not only when a contributor cleanup is expected). The
  pre-existing subtests ("Setzen auf eine zugewiesene release_version_id...", "...NICHT
  zugewiesene...") started failing with `relation "anime_contributions" does not exist` because
  they ran before my new Case H subtest, which was the only place that created those tables.
- **Fix:** Moved the local schema addendum (mirrors `release_detail_public_repository_segment_credits_test.go`
  / Plan 156-03's precedent of a per-test-file fixture addendum) to the top of
  `TestSetThemeSegmentOrigin`, before any subtest runs.
- **Files modified:** `backend/internal/repository/theme_segment_origin_integration_test.go`
- **Verification:** `TestSetThemeSegmentOrigin` (all 6 subtests including Case H) passes against
  real, isolated Postgres.
- **Committed in:** `a87867ae` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Correctness). No scope creep; both were needed
for the plan's own acceptance criteria / tests to pass as specified.

## Issues Encountered

**Known, plan-documented interim regression in two PRE-EXISTING, out-of-scope tests (not part of
this plan's file list) -- explicitly anticipated by this plan's own objective text, not a bug in
this plan's work:**

Plan 156-12's objective states: *"Also extends the single central
`permissions.SegmentCreditRoleCodes` catalog with `editor`/`quality_checker` (role catalog only --
the actual 'only appears if explicitly selected' behavior is Plan 156-13's job)."*

`SegmentCreditRoleCodes` is the SAME central list consumed both by this plan's new write-path
validation AND by the pre-existing PUBLIC segment-credit read projection
(`loadReleaseSegments`/`applySegmentOriginCredits`, built in Plan 156-07/156-09) -- "exactly one
central definition, no second list" is itself a mandatory directive. Extending it to include
`quality_checker`/`editor` therefore ALSO widens what the public release page currently shows as a
segment credit, purely because someone holds that role on the Origin -- until Plan 156-13 adds the
explicit-selection gate this plan's objective text defers to it. As a direct, foreseen consequence,
running the full `internal/repository` package (not the plan's own scoped `-run` verification
command) shows two now-red pre-existing tests:

- `TestReleaseDetailPublicSegmentOriginCredits/Test5:_Encoder_und_Quality-Checker_erscheinen_NIE_als_Segment-Credit`
  (`release_detail_public_repository_segment_credits_test.go`)
- `TestSegmentCreditRoleFilter/quality_checker-only_is_excluded_exactly_like_encoder`
  (`segment_credit_role_filter_test.go`)

Both assert the OLD rule ("encoder AND quality_checker never appear as a segment credit"), which
mandatory directive #5 explicitly says is to be CORRECTED (quality_checker is no longer
permanently excluded; only encoder remains permanently excluded) rather than deleted. Neither file
is in this plan's `files_modified` list, and the plan's own `<verification>` section only runs a
scoped `-run 'TestSetThemeSegmentContributors|TestListThemeSegmentContributorCandidates|TestSetThemeSegmentOrigin'`
filter plus `TestSegmentCreditRoleCodes` -- both of which are fully green. These two tests are
expected to be fixed by Plan 156-13 when it implements the explicit-selection gate on the public
projection. Not touched here to avoid pre-empting 156-13's actual behavior-change scope.

**Separately, pre-existing/environment-conditional failures NOT caused by this plan** (reproduced
identically before any 156-12 change, per the same pattern documented in 156-02/156-05/156-07
SUMMARYs):
- ~30 tests across `member_archive_repository_test.go`, `member_point_totals_repository_test.go`,
  `member_profile_*_test.go`, `member_public_access_repository_test.go`,
  `member_public_slug_test.go` fail with `TEAM4S_PHASE128_TEST_DSN is required for Phase-128
  PostgreSQL tests` -- that env var was not set in this execution environment; unrelated to this
  plan's `TEAM4S_PHASE117_TEST_DSN`-based tests, which all pass.
- `phase134_verification_matrix*_test.go` (7 tests) fail with `dial tcp 192.168.235.196:18093:
  connect: connection refused` / Keycloak password-grant errors -- these need a live, separately
  reachable backend+Keycloak endpoint that this execution environment does not expose that way;
  unrelated to any file this plan touched.
- `TestEvaluateMemberMutationConflictBlocksLastActiveManager`
  (`fansub_group_app_members_repository_test.go`) and
  `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
  (`member_claims_repository_test.go`) and the three `member_claims_memorial_guard_test.go`
  failures -- completely untouched files, matching the exact "komplett unberuehrte Dateien dieses
  Plans" finding already documented in `156-07-SUMMARY.md`.

None of the above three unrelated buckets are new; all reproduce on files this plan never opened.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `theme_segment_contributors` table, validated write path, and candidate-list read path exist and
  are proven against real Postgres -- ready for Plan 156-13 to wire the public projection's
  explicit-selection gate and any admin HTTP handlers/routes (this plan intentionally adds zero new
  HTTP surface, per its own threat model T-156-23).
- Plan 156-13 MUST resolve the two now-red tests named above as part of implementing the
  explicit-selection behavior -- they are not incidental breakage to silently work around, they are
  the exact acceptance signal that the gate is missing.
- Backend rebuilt (`docker compose up -d --build team4sv30-backend`) and confirmed healthy
  (`/health` returns 200, `docker compose ps` shows `Up`).
- git push was NOT run, per this execution's explicit instruction (main remains ahead of
  origin/main, reported only in the phase-level final report).

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-12*
