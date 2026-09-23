---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 03
subsystem: api
tags: [go, gin, pgx, permissions, idor, fansub-alias, audit-log]

# Dependency graph
requires: []
provides:
  - "FansubRepository.ReassignAlias(ctx, fansubID, aliasID, targetGroupID) (*models.FansubAlias, error) — single atomic UPDATE, ErrNotFound/ErrConflict mapping matching CreateAlias/DeleteAlias"
  - "PATCH /fansubs/:id/aliases/:aliasId/reassign — FansubHandler.ReassignFansubAlias, dual source+destination CanForFansubGroup check (T-167-IDOR mitigation), single fansub_group_alias.reassigned audit event"
  - "fansubAliasReassignRequest / validateFansubAliasReassignRequest — target_fansub_group_id validation ('ungültige ziel-gruppe')"
  - "h.reassignFansubAlias func-field seam on FansubHandler, wired to fansubRepo.ReassignAlias in NewFansubHandler"
affects: [167-07, 167-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual independent CanForFansubGroup calls (source, then destination) inside one handler as the IDOR mitigation for any future cross-group mutation endpoint, instead of a single ambient check"
    - "httptest+fake permission-resolver test pattern: a Resolver whose ResolveFansubGroup only recognizes an allow-listed set of group IDs, driving each CanForFansubGroup call to allow/deny independently through the REAL permissions.Service evaluation path (ResolveActorGroupMembership + ResolveActorUserOverrides user_allow), not a handler-level permission stub"

key-files:
  created:
    - backend/internal/handlers/phase167_fansub_reassign_test.go
  modified:
    - backend/internal/repository/fansub_repository.go
    - backend/internal/handlers/fansub_admin.go
    - backend/internal/handlers/fansub_group_aliases.go
    - backend/internal/handlers/fansub_requests.go
    - backend/internal/handlers/fansub_alias_validation.go
    - backend/cmd/server/admin_routes.go

key-decisions:
  - "Dual permission check implemented as two sequential calls to the existing requireFansubAliasWriteAccess helper (source using :id, destination using the request body's target_fansub_group_id) rather than a new combined helper — keeps the IDOR mitigation trivially greppable/auditable as '2 calls in one function body'"
  - "Left h.auditLogRepo unset (nil) in all Task-3 tests rather than constructing a fake DBTX — repository.AuditLogRepository.Write has a nil-receiver-safe no-op guard, so a nil auditLogRepo behaves identically to a real one for every test's success/failure assertions without adding a fake DB dependency"

requirements-completed: [REQ-167-14, REQ-167-15, REQ-167-16, REQ-167-17, REQ-167-23]

# Metrics
duration: ~35min
completed: 2026-09-23
---

# Phase 167 Plan 03: Fansub-Alias-Umhängen (Reassign) Summary

**New `PATCH /fansubs/:id/aliases/:aliasId/reassign` endpoint moves an alias between fansub groups via one atomic `UPDATE`, gated by two independent `CanForFansubGroup` permission checks (source and destination) that close the IDOR gap a naive single-check implementation would have left open.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-23T14:10:00Z (approx, first file read)
- **Completed:** 2026-09-23T14:29:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `FansubRepository.ReassignAlias` performs one atomic `UPDATE fansub_group_aliases SET fansub_group_id = $1, updated_at = NOW() WHERE id = $2 AND fansub_group_id = $3 RETURNING ...` — no delete-then-create window where the alias does not exist. Error mapping (`pgx.ErrNoRows` -> `ErrNotFound`, unique-violation -> `ErrConflict`) matches `CreateAlias`/`DeleteAlias`'s existing convention exactly.
- `FansubHandler.ReassignFansubAlias` is reachable over HTTP (`PATCH /fansubs/:id/aliases/:aliasId/reassign`) and checks `CanForFansubGroup` against **both** the source group (`:id`) and the destination group (`target_fansub_group_id` from the body) before any write — the concrete fix for T-167-IDOR (RESEARCH.md's Security Domain finding that a naive implementation would only check the destination).
- A no-op reassign (`target_fansub_group_id == :id`) is rejected with `400 ziel-gruppe entspricht der aktuellen gruppe` rather than silently succeeding.
- On success, exactly one audit event (`fansub_group_alias.reassigned`) is written with `from_group_id`/`to_group_id` in the payload, matching the create/delete alias audit shape.
- `phase167_fansub_reassign_test.go` proves all 6 documented behaviors via real `httptest`-shaped requests against the real `FansubHandler.ReassignFansubAlias` method and a fake `permissions.Resolver` — including the literal IDOR-mitigation proof (source-group-only-authorized caller cannot move an alias into a group they don't manage; the repository func-field call counter stays at 0).

## Task Commits

1. **Task 1: ReassignAlias repository method** - `61b3c1af` (feat)
2. **Task 2: ReassignFansubAlias handler, request/validation, route, dual permission check** - `e109d82f` (feat)
3. **Task 3: httptest+fake handler tests** - `3d9f7bb1` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `backend/internal/repository/fansub_repository.go` (+39 lines) — `ReassignAlias`, placed directly after `DeleteAlias`.
- `backend/internal/handlers/fansub_admin.go` (+2 lines) — `reassignFansubAlias` func-field on `FansubHandler`; wired in `NewFansubHandler`.
- `backend/internal/handlers/fansub_group_aliases.go` (+84 lines) — `ReassignFansubAlias` handler.
- `backend/internal/handlers/fansub_requests.go` (+6 lines) — `fansubAliasReassignRequest`.
- `backend/internal/handlers/fansub_alias_validation.go` (+9 lines) — `validateFansubAliasReassignRequest`.
- `backend/cmd/server/admin_routes.go` (+1 line) — route registration, immediately after the existing `DELETE /fansubs/:id/aliases/:aliasId` line.
- `backend/internal/handlers/phase167_fansub_reassign_test.go` (225 lines, new) — 6 httptest+fake behavior tests plus the `fakeReassignPermResolver` test double.

All new/modified handler and repository files stay well under the CLAUDE.md 450-line ceiling on their own diffs. `backend/internal/repository/fansub_repository.go` itself is a pre-existing large file (2535 lines total after this change) that already exceeded 450 lines before this plan touched it — this plan only appended one 39-line method to it and did not create or worsen that condition; splitting that file is out of this plan's scope (see Issues Encountered).

## Decisions Made

- Reused the existing `requireFansubAliasWriteAccess` helper for both the source and destination checks (rather than writing a new dual-group helper), per the plan's explicit interface guidance — makes the mitigation directly greppable (`grep -c requireFansubAliasWriteAccess` inside the function body == 2).
- Left `h.auditLogRepo` as its zero value (`nil`) in every Task-3 test. `repository.(*AuditLogRepository).Write` is nil-receiver-safe (`if r == nil || r.db == nil { return nil }`), so this avoids needing a fake `DBTX`/audit spy while still exercising the real success/audit code path without a panic.
- Test permission fake (`fakeReassignPermResolver`) drives both `CanForFansubGroup` calls through the **real** `permissions.Service.canForContext`/`ResolveGroupRights` evaluation (via `ResolveActorGroupMembership` + a `user_allow` `ResolveActorUserOverrides` override) rather than short-circuiting at the handler layer — this means the destination-denied test (`TestReassignFansubAlias_DestinationPermissionDenied`) is a genuine proof that the second permission check is load-bearing, not just a mocked return value.

## Deviations from Plan

None — plan executed exactly as written. All three tasks matched their `<action>`/`<acceptance_criteria>` sections with no auto-fixes required.

## Issues Encountered

- `backend/internal/repository/fansub_repository.go` is a pre-existing 2535-line file, already well over CLAUDE.md's 450-line production-file ceiling before this plan started (confirmed via `git log` — the file's size predates this session by many prior phases). This plan appended one 39-line method (`ReassignAlias`) to it, consistent with the plan's own explicit instruction to place it "adjacent to `DeleteAlias` (same file section)". Splitting this file is a pre-existing, out-of-scope condition (SCOPE BOUNDARY rule) — logged here rather than fixed, since a file split was not part of this plan's task list and would be a significant unplanned architectural change (Rule 4 territory, not something to auto-apply headlessly).
- `gofmt -l` flags many pre-existing files across the repo (including `fansub_alias_validation.go`, which this plan modified) due to a BOM (`\xef\xbb\xbf`) at the start of the file — confirmed via `git show` on a commit from 2026-06-xx (`be5a8cf8`) that this BOM predates this plan by months and is not something this plan introduced or worsened. Not fixed (out of scope, SCOPE BOUNDARY rule); `go build`/`go vet` are unaffected by the BOM.

## User Setup Required

None — no external service configuration required. No `.env`/compose changes, no data changes to `team4s_v2`.

## Next Phase Readiness

`PATCH /fansubs/:id/aliases/:aliasId/reassign` is live and ready for:
- Plan 07's import-mapping "Trotzdem umhängen" conflict action (D-02) to call directly.
- Plan 08's frontend alias-management UI to wire a reassign control against.

No blockers. `models.FansubGroupMatch.MatchedAliasID` (from Plan 02) is ready to feed this endpoint's `aliasId` path parameter once Plan 07/08 build the calling UI/flow.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 3 task commit hashes
(`61b3c1af`, `e109d82f`, `3d9f7bb1`) verified present in `git log`.
