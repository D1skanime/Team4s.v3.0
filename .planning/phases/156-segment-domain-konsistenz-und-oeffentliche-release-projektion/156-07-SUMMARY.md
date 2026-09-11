---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 07
subsystem: backend
tags: [go, pgx, postgresql, public-read-model, theme-segments, release-detail, decisions]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "01"
    provides: "permissions.SegmentCreditRoleCodes"
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "05"
    provides: "loadPublicEffectiveContributors RoleCodes/MemberSlug"
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "06"
    provides: "CanonicalSegmentType"
provides:
  - "loadReleaseSegments rewritten: origin-based bundled credit load, no suppression, canonical type, range labeling kept"
  - "DECISIONS.md entry documenting the deliberate Phase 117 D-02 supersession for the release-detail surface"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Origin-based dynamic credit projection: one bundled loadPublicEffectiveContributors call per page-load (keyed by distinct origin release version IDs), never per segment"
    - "Role-code allow-list filter via map[string]struct{} overlap check (any relevant role includes the whole contributor), no label-substring heuristic"

key-files:
  created:
    - backend/internal/repository/release_detail_public_repository_segment_credits.go
    - backend/internal/repository/release_detail_public_repository_segment_credits_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_public_segments_integration_test.go
    - DECISIONS.md

key-decisions:
  - "Split the credit-projection logic (distinct-origin collection, bundled contributor load, role-code filter) into a new sibling file release_detail_public_repository_segment_credits.go because the unsplit rewrite of helpers.go landed at 471 lines, over CLAUDE.md's 450-line cap -- mirrors Plan 156-06's identical split precedent for group_repository_cursor_timeline.go"
  - "Used a plain map[string]struct{} overlap check (hasAnySegmentRelevantRole) instead of the plan's illustrative slices.ContainsAny -- Go 1.25's stdlib slices package has no ContainsAny function; the map-based check is O(1) per role code and behaviorally identical (any overlap includes the whole contributor)"
  - "Wrote the Task 1 behavior tests (7 cases) into a NEW file release_detail_public_repository_segment_credits_test.go rather than the pre-existing release_detail_public_segments_integration_test.go, even though Task 1's <files> list did not explicitly name a test file -- this avoided fixture collisions with Task 2's suppression-removal test changes in the pre-existing file and mirrors the natural pairing with the new segment_credits.go source file"
  - "DECISIONS.md's new entry explicitly states the supersession applies to the release-detail surface ONLY -- the original Phase 117 D-02 entry is not deleted, since it remains accurate history for the decision as originally scoped"

requirements-completed: [P156-07, P156-08, P156-09, P156-13]

# Metrics
duration: 46min
completed: 2026-09-11
---

# Phase 156 Plan 07: Origin-Based Segment Credits and Release-Page Suppression Removal Summary

**`loadReleaseSegments` now projects each segment's credits live from its ORIGIN release version's current, role-code-filtered contributors instead of the viewed release's own contributors filtered by a `strings.Contains(label, "kara")` heuristic, and the release-detail page no longer suppresses a shared segment on episodes after its first appearance — a deliberate, dated supersession of Phase 117's D-02 decision for this one surface.**

## Performance

- **Duration:** 46 min
- **Started:** 2026-09-11T21:29:00Z
- **Completed:** 2026-09-11T22:15:00Z
- **Tasks:** 2 completed
- **Files modified:** 5 (2 new source/test, 1 modified source, 1 modified test, 1 modified docs)

## Accomplishments

- `loadReleaseSegments` (`release_detail_public_repository_helpers.go`) now scans `ts.origin_release_version_id` and the raw `tt.name` per segment, sets `Type` via `CanonicalSegmentType` (Plan 156-06), and calls a new `applySegmentOriginCredits` helper that batch-loads every distinct origin release version's contributors in ONE `loadPublicEffectiveContributors` call, then filters each segment's slice by `permissions.SegmentCreditRoleCodes` (Plan 156-01/156-05) — the `strings.Contains(label, "kara")`/`"typeset"` heuristic is gone entirely.
- `suppressSegmentsAlreadyVisibleOnPreviousEpisode` is deleted (not disabled) along with its single call site; `loadAdjacentReleases` is untouched and still serves `GetPublicReleaseDetail`'s Previous/Next navigation (confirmed via `grep -n "loadAdjacentReleases("`, one caller remains at `release_detail_public_repository.go:213`).
- `applySegmentOriginCredits` and `hasAnySegmentRelevantRole` were split into a new sibling file `release_detail_public_repository_segment_credits.go` (84 lines) because the unsplit rewrite pushed `release_detail_public_repository_helpers.go` to 471 lines — post-split, `helpers.go` is 410 lines and the sibling is 84, both under CLAUDE.md's 450-line cap.
- A new `release_detail_public_repository_segment_credits_test.go` proves all seven plan-mandated behavior cases against real, isolated PostgreSQL (`TEAM4S_PHASE117_TEST_DSN`): zero-contributor origin (empty, not nil, no error), translator+timer projection with intact `RoleCodes`, a live re-read reflecting a role correction made directly on the origin with NO segment edit, a newly added contributor appearing on the very next call, `encoder`/`quality_checker` never appearing even though real and public, `origin_release_version_id IS NULL` yielding an empty list with no error, and `Type` matching `CanonicalSegmentType` exactly (not a raw passthrough).
- `DECISIONS.md` gained a new dated entry ("Release detail page stops suppressing already-visible segments, supersedes Phase 117 D-02") naming the supersession explicitly, scoped to the release-detail surface only, citing `156-CONTEXT.md`'s Auftragsabschnitt 7 and Plan 156-06's project-page first-occurrence filter as the reason the two pages can now safely answer different questions.
- `release_detail_public_segments_integration_test.go`'s former D-02 subtest (which asserted a shared segment is suppressed/empty on a later episode with no override) was replaced with the opposite assertion: the segment IS shown, with correct `AppliesThroughEpisode` (nil, since release B is itself the highest assigned episode for that segment).

## Task Commits

Each task was committed atomically:

1. **Task 1: Origin-based dynamic credit projection + role-code filter** - `f6dc651e` (feat)
2. **Task 2: DECISIONS.md supersession entry + flip release-page suppression tests** - `84771323` (docs)

**Plan metadata:** (this commit) `docs(156-07): complete plan`

## Files Created/Modified

- `backend/internal/repository/release_detail_public_repository_helpers.go` - `loadReleaseSegments` rewritten (origin scan, `CanonicalSegmentType`, delegated credit projection); `suppressSegmentsAlreadyVisibleOnPreviousEpisode` and the `karaParticipants` heuristic deleted; doc comments rewritten to describe the new no-suppression, origin-based behavior
- `backend/internal/repository/release_detail_public_repository_segment_credits.go` - NEW: `applySegmentOriginCredits` (distinct-origin collection, one bundled `loadPublicEffectiveContributors` call, per-segment role-code filter) and `hasAnySegmentRelevantRole`
- `backend/internal/repository/release_detail_public_repository_segment_credits_test.go` - NEW: `TestReleaseDetailPublicSegmentOriginCredits`, 7 subtests covering all plan-mandated behavior cases against real, isolated Postgres
- `backend/internal/repository/release_detail_public_segments_integration_test.go` - header comment rewritten to describe the no-suppression behavior; the D-02 suppression subtest replaced with a proof that the shared segment IS shown on the later episode
- `DECISIONS.md` - new dated entry (`## 2026-09-11 — Release detail page stops suppressing already-visible segments (supersedes Phase 117 D-02)`)

## Decisions Made

- Followed the plan's prescribed line-budget contingency exactly: rewrite first, measure (`wc -l` -> 471), then split into a sibling file per the plan's explicit fallback instruction, mirroring Plan 156-06's identical precedent for the project-page timeline.
- Chose a map-based `hasAnySegmentRelevantRole` over the plan's illustrative `slices.ContainsAny` because that function does not exist in Go 1.25's standard `slices` package (confirmed via `go doc slices`) — behaviorally identical inclusion-by-any-relevant-role semantics, just implemented with a small lookup map instead of a nonexistent stdlib call.
- Added the Task 1 behavior tests to a NEW test file paired with the new source file, rather than the pre-existing suppression-focused integration test file, to keep the two tasks' test changes non-overlapping and avoid the pre-existing file's simpler fixture (which lacks `anime_contributions`/`visibilities`/`anime_contribution_roles`) from having to carry both concerns at once.

## Deviations from Plan

None architecturally — both `must_haves.truths` and both `must_haves.artifacts` match verbatim:
- Segment credits are projected dynamically from the segment's ORIGIN release version's current contributors, filtered by `permissions.SegmentCreditRoleCodes`, proven by the new test file's Tests 1-5.
- Encoding/QC contributors never appear as segment credits, even when real, public, and otherwise visible (Test 5).
- The release page shows every segment actually assigned to it -- `suppressSegmentsAlreadyVisibleOnPreviousEpisode` is deleted, not disabled (confirmed via `grep` returning zero matches repo-wide).
- `loadAdjacentReleases` is preserved and still serves Previous/Next navigation.
- A segment with `origin_release_version_id IS NULL` shows an empty credits list, not an error and not a guessed fallback (Test 6).
- `DECISIONS.md` documents the deliberate Phase 117 D-02 supersession for the release-page surface.
- `release_detail_public_repository_helpers.go` is at 410 lines (<=450) after the rewrite; the split into `release_detail_public_repository_segment_credits.go` (84 lines) was needed and applied exactly as the plan's contingency anticipated.

Two small, non-architectural implementation choices (documented above under Decisions Made: the map-based role-overlap check instead of a nonexistent `slices.ContainsAny`, and placing Task 1's tests in a new sibling test file) are noted for completeness, not tracked as Rule 1-4 deviations since neither changed the plan's required behavior or file-modification scope in a way that needed a decision gate.

## Known Pre-Existing Debt (not introduced by this plan)

Running the full `internal/repository` test suite (with `--network team4s_default` and `TEAM4S_PHASE117_TEST_DSN` set, but without `TEAM4S_PHASE128_TEST_DSN` or a live Keycloak/backend) surfaces 49 pre-existing failures unrelated to this plan's changes: the `TestPhase128*`/`TestLoadRoleVolumeBadgesPostgres*`/`TestArchive*`/`TestMemberPointTotals*`/`TestLoadContributionBadges*`/`TestGetOwnDashboardPostgres*`/`TestLoadPublicBadgesPostgres*`/`TestLoadBadgeProgressPostgres*` families require `TEAM4S_PHASE128_TEST_DSN` (unset in this execution environment), the `TestPhase134Matrix*` family requires a live Keycloak password grant and an HTTP backend reachable at port `18093` (documented in 156-05-SUMMARY.md and 156-06-SUMMARY.md as the same pre-existing gap), and `TestEvaluateMemberMutationConflictBlocksLastActiveManager`/`TestClaimSubmitBlockedForMemorialProfile`/`TestClaimBlockWritesDeniedAudit`/`TestClaimBlockDeniedAuditOutcomeColocated`/`TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` are unrelated, pre-existing failures in `fansub_group_app_members_repository_test.go` and `member_claims_*_test.go` (member-claims/fansub-group-manager domains entirely untouched by this plan). Confirmed via `git status --short` showing no modifications to any of these files. Not fixed here per the deviation-rules scope boundary (out-of-scope, unrelated files) — flagged, not silently ignored.

## Issues Encountered

None beyond the pre-existing debt documented above. The targeted verification actually used for this plan's correctness claim: `go build ./... && go vet ./...` (both clean), `wc -l` on both touched files (410 and 84, both <=450), and `go test ./internal/repository/... -run 'TestReleaseDetailPublicSegmentOriginCredits|TestReleaseDetailPublicSegments$' -v -count=1` against a temporary, isolated Postgres database (`team4s_phase117_test_p07` on `team4sv30-db`, dropped after use) — 10/10 subtests pass, matching the plan's own `<verify>` block.

## User Setup Required

None -- no external service configuration required. No migration needed (`theme_segments.origin_release_version_id` already exists since Plan 156-01's migration 0161). A temporary, isolated Postgres test database was created and dropped as part of this plan's own verification; the dev database (`team4s_v2`) was never touched.

## Next Phase Readiness

- Frontend consumers of `PublicReleaseSegment.Type`/`.Participants` (Plan 156-08's project-context work, if it touches the release page) can now rely on `Type` being one of `OP`/`ED`/`INSERT`/`KARA`/uppercased-fallback (never a raw theme-type string) and `Participants` being the segment's origin-based, role-filtered credit list.
- No blockers identified for downstream plans. The pre-existing Phase-128/134/member-claims/fansub-group test-fixture gaps are documented and do not block phase progress.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk (`release_detail_public_repository_segment_credits.go`, `release_detail_public_repository_segment_credits_test.go`, `release_detail_public_repository_helpers.go`, `release_detail_public_segments_integration_test.go`, `DECISIONS.md`). Both commits (`f6dc651e`, `84771323`) confirmed in `git log --oneline`. `wc -l` re-confirms `release_detail_public_repository_helpers.go` at 410 lines and `release_detail_public_repository_segment_credits.go` at 84 lines, both <=450. `grep -c "^## " DECISIONS.md` returns 41 (new entry present). `grep -rn "suppressSegmentsAlreadyVisibleOnPreviousEpisode\|karaParticipants"` across `backend/` returns zero matches.
