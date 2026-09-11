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
