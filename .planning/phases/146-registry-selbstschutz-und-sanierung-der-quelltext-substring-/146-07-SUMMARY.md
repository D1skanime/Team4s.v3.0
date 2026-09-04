---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring
plan: 07
subsystem: testing
tags: [go, gin, httptest, postgres, permissions, audit-log, teststil]

# Dependency graph
requires:
  - phase: 146-04
    provides: "the frozen 20-file SecurityRelevantTestFiles list and the presence-vs-absence violation rule (backend/internal/testquality/security_relevant_test_files.go)"
provides:
  - "fansub_test.go's alias group-edit permission guard proven via real httptest calls into CreateFansubAlias/DeleteFansubAlias against a denying permissions.Resolver, asserting a real 403 and the exact audit event/outcome the handler writes"
  - "point_ledger_repository_test.go's redundant SQL-fragment presence loop removed; the sanctioned forbidden-SQL absence check renamed to TestPointLedgerForbidsDirectMutationSQL and kept"
affects: [146-08, 146-09, 146-10, 146-11, 146-12, 146-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deny-path handler test built from a same-package fake permissions.Resolver (phase136LinkResolver, already in package) plus a repository.DBTX-implementing fake DB that captures Exec's positional args, so the exact audit event_type/outcome INSERT parameters can be asserted without touching a real database"
    - "Retiring a redundant source-substring presence loop in favor of pointing to the same file's own pre-existing real-Postgres behavioral tests, rather than writing a new replacement assertion"

key-files:
  created: []
  modified:
    - backend/internal/handlers/fansub_test.go
    - backend/internal/repository/point_ledger_repository_test.go

key-decisions:
  - "Reused the existing phase136LinkResolver and pgconn-based fake-DB pattern already present in fansub_group_links_test.go instead of inventing a new permission-resolver double, keeping the package's test-double surface small"
  - "Captured the audit repository's raw Exec arguments (event_type at index 2, outcome at index 8, matching audit_logs.go's INSERT column order) to assert the exact fansub_group_alias.{create,delete}.denied event fired, since FansubHandler.auditLogRepo is a concrete *repository.AuditLogRepository (not an interface) and cannot be swapped for a spy struct"
  - "Kept TestPointLedgerSQLContract's 2-item forbidden-SQL absence loop but renamed the function to TestPointLedgerForbidsDirectMutationSQL to reflect what remains, per CLAUDE.md Teststil exception 1 (absence checks may stay source-based)"

patterns-established: []

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: ~20min
completed: 2026-09-04
---

# Phase 146 Plan 07: Remediate fansub_test.go and point_ledger_repository_test.go Summary

**Replaced fansub alias permission-guard's 5-item source-substring presence loop with real httptest 403 calls carrying the exact audit event codes, and deleted point-ledger's redundant 6-item SQL-fragment presence loop in favor of its own existing real-Postgres tests.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-04T16:10:00Z (approx.)
- **Completed:** 2026-09-04T16:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `TestFansubAliasMutationsUseGroupEditPermission` now exercises `CreateFansubAlias`/`DeleteFansubAlias` through real `httptest` requests against a denying `permissions.Resolver`, asserting a genuine `403 Forbidden` and the exact `fansub_group_alias.create.denied` / `fansub_group_alias.delete.denied` audit event with `outcome=denied` written via a captured-args fake `repository.DBTX`, instead of grepping the handler's own source for lowercased fragments
- `TestPointLedgerSQLContract`'s 6-item presence loop (SQL fragments like `ON CONFLICT DO NOTHING`, `FOR UPDATE`, `REVERSAL_OF_ENTRY_ID`) is removed entirely; the file's own real-Postgres tests (`TestPointLedgerPostgresAwardRetryAndLostResponse`, `TestPointLedgerPostgresConcurrentAward`, `TestPointLedgerPostgresReversalRetryConcurrentAndLostResponse`, `TestPointLedgerPostgresRollback`) already behaviorally prove that exact contract
- The 2-item forbidden-SQL absence check survives unchanged in spirit, renamed to `TestPointLedgerForbidsDirectMutationSQL` with a doc comment explaining why it legitimately stays source-based (CLAUDE.md Teststil exception 1 — there is no observable "absence of a query" response to assert)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remediate fansub_test.go's alias permission-guard claim** - `75af9bd8` (test)
2. **Task 2: Remove point_ledger_repository_test.go's redundant presence loop** - `6bd07835` (test)

**Plan metadata:** (this commit) `docs(146-07): complete plan`

## Files Created/Modified
- `backend/internal/handlers/fansub_test.go` - `TestFansubAliasMutationsUseGroupEditPermission` rewritten: kept the 2-item `requireAdmin` absence check, replaced the 5-item presence loop with two `t.Run` subtests making real `httptest` calls into `CreateFansubAlias`/`DeleteFansubAlias`, using a denying `phase136LinkResolver{found: true}` (no matching role → `ReasonNoMembership` → 403) plus a new `fansubAliasAuditCaptureDB` (implements `repository.DBTX`, records every `Exec` call's positional args) wired through `repository.NewAuditLogRepository`, asserting `recorder.Code == http.StatusForbidden` and the captured audit entry's `event_type`/`outcome` match the handler's real denial path
- `backend/internal/repository/point_ledger_repository_test.go` - `TestPointLedgerSQLContract` renamed to `TestPointLedgerForbidsDirectMutationSQL`, its 6-item presence loop deleted, its 2-item absence loop and doc comment kept; no other test in the file touched

## Decisions Made
- Reused `phase136LinkResolver` (already defined in `fansub_group_links_test.go`, same `handlers` package) as the deny-path `permissions.Resolver` double rather than defining a new one, since its `ResolveFansubGroup`/`ListActorGroupRoles` shape already produces the exact `ReasonNoMembership` → 403 path this test needs
- Built a small `fansubAliasAuditCaptureDB` implementing `repository.DBTX` (`Exec`/`QueryRow`) to capture the audit repository's raw positional arguments, since `FansubHandler.auditLogRepo` is a concrete `*repository.AuditLogRepository` field (not an interface) and cannot be replaced by a spy struct the way `permissionSvc` can
- Point-ledger's forbidden-SQL absence check was kept and only renamed (not deleted), matching CLAUDE.md's explicit Teststil exception 1 for absence-only source assertions

## Deviations from Plan

None - plan executed exactly as written. The plan's task 1 acceptance criteria described the response as "carrying the `fansub_group_alias.create.denied` error code in the JSON body" as shorthand; on reading the production code (`fansub_group_aliases.go`, `permission_authz.go`, `audit_logs.go`) that string is actually the audit log's `event_type`, not part of the HTTP JSON error body — the test asserts it via the captured audit-DB args instead, which is the behaviorally accurate location of that literal. This is a faithful implementation of the plan's intent (prove the guard fires with that exact denial code), not a deviation from what the plan needed to prove.

## Issues Encountered
- `go` is not on the host PATH; all `go build`/`go vet`/`go test` commands were run via `docker compose exec team4sv30-backend`, per this repo's canonical Docker Compose dev environment.
- `point_ledger_repository_test.go`'s real-Postgres tests require `TEAM4S_PHASE106_TEST_DSN`. Reused the existing `team4s_phase106_test_136` fixture database on the shared `team4sv30-db` container (credentials from the backend container's own `DATABASE_URL`) — no new provisioning needed. Without the DSN set, the four Postgres tests SKIP cleanly (not FAIL), confirmed both ways.

## User Setup Required

None - no external service configuration required. All commands run via `docker compose exec team4sv30-backend`.

## Next Phase Readiness
- Two more of Phase 146's 20 locked security-relevant Block-2 files (`fansub_test.go`, `point_ledger_repository_test.go`) no longer claim security-relevant behavior via source-substring inspection; Plan 146-13's ratchet-guard exception list can drop both once written.
- `backend/internal/handlers` and `backend/internal/repository` packages build and pass (`go build ./...`, `go vet ./internal/handlers/...`, `go vet ./internal/repository/...` all clean); no regressions introduced in either package's existing test suite.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/fansub_test.go
- FOUND: backend/internal/repository/point_ledger_repository_test.go
- FOUND: .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-07-SUMMARY.md
- FOUND commit: 75af9bd8 (Task 1)
- FOUND commit: 6bd07835 (Task 2)
- FOUND commit: 498a0e72 (SUMMARY)
