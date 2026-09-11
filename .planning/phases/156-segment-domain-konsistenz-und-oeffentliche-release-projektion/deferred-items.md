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
