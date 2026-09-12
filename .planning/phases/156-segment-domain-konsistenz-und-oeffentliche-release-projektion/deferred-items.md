# Phase 156 — Deferred Items

Out-of-scope discoveries logged during plan execution, per the executor's Scope Boundary rule
(only auto-fix issues directly caused by the current task's changes).

## 156-02: pre-existing test-isolation-order dependency in RangeAutoAssign handler tests

**Found during:** Task 2 verification (`go test ./internal/handlers/... -run RangeAutoAssign -v`).

**Symptom:** When `TestCreateAnimeSegment_RangeAutoAssignsAllEpisodesInRange`,
`TestCreateAnimeSegment_RangeAutoAssignIdempotentSkipsReload`,
`TestCreateAnimeSegment_RangeAutoAssignFailureIsNonFatal`, and
`TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues` are run in isolation via
`-run RangeAutoAssign`, `requireSegmentManage` denies the request (`403 insufficient_role`)
even though the test's `releasePermissionResolverStub` grants `RoleFansubLead` for every
group. When the SAME tests run as part of the full `./internal/handlers/...` package suite
(no `-run` filter), they pass. This points to a test-order/shared-state dependency somewhere
in the `permissions.Service.CanForReleaseVersion` -> `ResolveGroupRights` path (introduced in
Phase 137/138), not to anything this plan changed.

**Confirmed pre-existing:** Reproduced identically on a clean `git worktree add` checkout of
the commit immediately preceding this plan's first commit (`4fa8da5c`, i.e. before any 156-02
edits). The isolated `-run RangeAutoAssign` failure and the full-suite pass are both present
on that baseline, byte-for-byte the same as after this plan's changes.

**Why not fixed here:** Out of this plan's scope (Scope Boundary rule) — the root cause lives
in the shared `permissions` package's group-rights resolution path, not in
`AssignThemeSegmentToEpisodeRange` or its callers, and fixing a test-order dependency in a
different subsystem's test suite is a distinct, unrelated investigation.

**Verification used instead:** `go test ./internal/handlers/... -count=1` (the full handlers
package, no `-run` filter) — all tests including the four RangeAutoAssign tests pass. This is
the command actually used to confirm Task 2's behavioral correctness for this plan.

**Suggested follow-up:** A future maintenance pass should investigate why
`permissions.Service.CanForReleaseVersion` behaves differently when
`TestCreateAnimeSegment_Range*`/`TestUpdateAnimeSegment_Range*` run in isolation versus as
part of the full `internal/handlers` suite (likely some package-level `sync.Once`/cache
population by an earlier test in suite order that these tests implicitly depend on).

## 156-11: Task 2 (`checkpoint:human-verify`) not executable in this environment — live-UAT outstanding

**Found during:** Task 2 (`Live verification -- admin origin-correction control`), 2026-09-11.

**Symptom:** Task 2 of `156-11-PLAN.md` is a `type="checkpoint:human-verify"` gate that requires
logging into the admin UI as a platform admin via the SSH-tunnel path
(`http://127.0.0.1:3300`, per `CLAUDE.md`) and walking through five manual browser checks on a
real shared theme segment. This execution environment has no platform-admin Keycloak
credentials and cannot open an authenticated admin browser session — the checkpoint cannot be
resolved automatically or claimed as passed or failed. Task 1 (the actual implementation) is
complete, committed (`d6edc718`), and its own automated checks (TypeScript, Vitest, ESLint,
umlaut check) are green — see `156-11-SUMMARY.md`. Only the live-browser verification that Task
2 exists to perform is outstanding.

**Why not fixed here:** No auto-fix applies — this is not a bug, missing functionality, or
blocking technical issue (Rules 1-3), and it is not an architectural question (Rule 4). It is a
human-action gate that structurally requires a live, authenticated admin browser session, which
this environment does not have. Per explicit operator instruction, this open item is tracked
here rather than claimed as verified.

**Concrete test recipe for the operator:**

1. Open `http://127.0.0.1:3300` (SSH tunnel) and log in as a platform admin.
2. Navigate to an anime with a shared theme segment (assigned to 2+ release versions) -> its
   episode-versions edit page -> open the segment editor for that segment. A ready-made test
   dataset already exists: `theme_segment_id 3` has 3 assignments in the dev database.
3. Confirm a "Segment-Origin" `Select` field appears (it must appear ONLY for shared segments
   with at least one assigned episode), listing the assigned "Folge N" options as choices.
4. Change the selection to a different assigned episode; confirm it saves immediately —
   WITHOUT requiring the main "Speichern" button — and without any error.
5. Reopen the segment editor; confirm the newly-selected origin is shown as the current value
   (i.e. it persisted).
6. Confirm the main segment Save button still works normally and is never blocked by the
   origin field being empty/unset.

**Suggested follow-up:** The repo owner performs this live-UAT pass directly (no platform-admin
credentials exist in the automated execution environment) and records the outcome — pass or
fail — as a dated note in this file or in a `156-11-UAT.md`, mirroring the precedent set by
`133-12-SUMMARY.md`/Phase 133's deferred live-UAT closure.

## 156-15 Task 1: Full Phase 156 regression re-run — result (2026-09-12)

**Found during:** Plan 156-15 Task 1 (full backend/frontend regression + migration round-trip),
2026-09-12.

**Result: GREEN, no new regression.** Full detail:

- `go build ./...` and `go vet ./...` (whole `backend/`, inside `golang:1.25-alpine` on
  `team4s_default`): clean, exit 0.
- `go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1`
  with `TEAM4S_PHASE117_TEST_DSN` pointing at a freshly created, correctly-named
  `team4s_phase117_test_ct3yv8fk` database (matching
  `^team4s_phase117_test_[a-z0-9]+$`), password derived from the LIVE backend container's own
  `DATABASE_URL` (`docker compose exec -T team4sv30-backend printenv DATABASE_URL`), never from
  the host `.env`:
  - `internal/handlers`: **all green** (`ok`).
  - `internal/permissions`: **all green** (`ok`).
  - `internal/repository`: **exactly 49 `--- FAIL` lines**, byte-identical in name and root cause
    to the baseline documented across 156-05/06/07/09/10/12/13-SUMMARY.md. Confirmed by name and
    error text, not by count alone:
    - ~30 tests across `member_archive_repository_test.go`,
      `member_point_totals_repository_test.go`, `member_public_access_repository_test.go`,
      `member_profile_*_test.go` fail with `TEAM4S_PHASE128_TEST_DSN is required for Phase-128
      PostgreSQL tests` (env var not set in this execution environment).
    - 9 `TestPhase134Matrix*` tests fail (Keycloak/live-endpoint dependent — same class of finding
      as prior plans).
    - `TestEvaluateMemberMutationConflictBlocksLastActiveManager`
      (`fansub_group_app_members_repository_test.go`) and
      `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
      (`member_claims_repository_test.go`) — completely untouched files by any Phase-156 plan,
      matching the exact finding already documented in `156-07-SUMMARY.md`.
    - Zero new failures beyond this named set. All 11 explicitly-named Phase-156 tests from the
      plan's Task 1 (`TestAssignThemeSegmentToEpisodeRange*`, `TestSetThemeSegmentOrigin`,
      `TestSetThemeSegmentContributors`, `TestListThemeSegmentContributorCandidates`,
      `TestResolvePublicEffectiveContributors*`, `TestReleaseDetailPublicSegmentOriginCredits`,
      `TestSegmentContributorSubsetMatrix`, `TestSegmentCreditRoleFilter`,
      `TestSegmentCreditRoleCodes`, `TestLoadReleaseSegmentsQueryBudgetIsConstant`, and the
      project-page timeline test — actually named `TestAttachReleaseTimelineSegments` in
      `group_repository_cursor_timeline_test.go`, not `TestGroupRepositoryCursorTimeline*` as the
      plan text approximated) are present and `PASS`.
  - 203 `--- SKIP` lines, all gated by other unrelated env vars/fixtures (`TEAM4S_PHASE107_TEST_DSN`,
    `TEAM4S_PHASE137_TEST_DSN`, "Integration tests require test database setup", etc.) — none of
    these skips is a Phase-156-named test; confirmed by grepping the skip list for
    segment/theme/origin/contributor/karaoke naming and manually checking every match (all
    unrelated: badge/points/project-contributor/media-upload tests).
- Backend rebuilt (`docker compose up -d --build team4sv30-backend`) and confirmed healthy
  (`/health` → `{"status":"ok"}`).
- Frontend, full suite inside `team4sv30-frontend` container (`cd /app && ...`):
  - `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.
  - `npx eslint .`: **13 errors / 331 warnings**, byte-identical count to the documented
    Phase-155 baseline (`156-10-SUMMARY.md`). All 13 errors are in files untouched by any
    Phase-156 plan (`useEpisodeNeighborNavigation.ts`, `useReleaseVersionMedia.ts`,
    `GroupMemberFormModals.tsx`, `GroupRolesTab.tsx`, `AdminGroupsClient.tsx`,
    `RoleCapabilityDetail.tsx`, `CapabilityDetailRow.tsx`, `CapabilityHistoryPanel.tsx`,
    `capture-responsive.cjs`). The only segment-related warnings
    (`SegmentAssetSection.tsx`/`SegmentBasicFieldsSection.tsx`, native `<select>`/`<input>`) are
    the deliberate, documented 156-14 ratchet-list carry-forwards — `warning`, not `error`.
  - No dedicated umlaut-check npm script exists (`dev`/`build`/`start`/`lint`/`test`/`typecheck`
    only) — same finding already documented in `156-14-SUMMARY.md`; not re-litigated here.
  - `npx vitest run`: **299/300 files passed, 1 skipped** (`VerifiedBadge.test.tsx` — a pre-existing
    Phase-66 `it.todo()` stub, unrelated to Phase 156); **2314/2317 tests passed, 3 todo** (the
    same 3 `it.todo()` stubs). All segment-related test files pass:
    `SegmenteTab.test.tsx` (87 tests), `segment-contributors.test.ts` (5 tests),
    `src/app/api/segments/[id]/stream/route.test.ts` (3 tests).
- Migration round-trip, whole chain: `go run ./cmd/migrate down -steps 2` (rolls back 0162 then
  0161) → confirmed both `theme_segments.origin_release_version_id` column AND
  `theme_segment_contributors` table are gone (`\d theme_segments`, `\dt
  theme_segment_contributors` against live `team4s_v2`) → `go run ./cmd/migrate up` (reapplies
  both) → `theme_segment_contributors` table recreated cleanly (still empty, matching its
  pre-rollback empty state) → `theme_segments.origin_release_version_id` values
  byte-identical before/after (`27/27/29` for segment ids 1/2/3, `diff` confirms no data loss).

**Conclusion:** No GAP-01 change (Plans 156-12/13/14) silently regressed any already-shipped
Phase 156 behavior. All environment-conditional exceptions are the same pre-existing,
phase-unrelated set documented since 156-05 through 156-13 — no new name added to either bucket.
