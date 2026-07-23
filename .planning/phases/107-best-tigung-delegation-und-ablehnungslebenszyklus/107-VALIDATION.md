# Phase 107 — Validation Strategy

**Phase:** Prüf- und Delegationsfundament
**Updated:** 2026-07-23
**Scope:** Backend/PostgreSQL foundation only; no HTTP, UI, concrete contribution adapter, cleanup or upload flow.

## Test Infrastructure

| Property | Contract |
|---|---|
| Framework | Go `testing` + existing testify; PostgreSQL 16 through the existing Compose service |
| Fast command | `cd backend; go test ./internal/permissions ./internal/repository ./internal/services -run 'TestPhase107' -count=1` |
| Migration command | `cd backend; go test ./internal/migrations -run 'TestPhase107' -count=1` |
| Full command | `cd backend; go test ./...; go vet ./...` |
| Live DB opt-in | Tests read only `TEAM4S_PHASE107_TEST_DSN`; absence may skip during intermediate unit work, but the phase gate provisions the disposable DB and permits no skip |
| Isolation | Database name `team4s_phase107_test_[a-z0-9]+`, schema `phase107_[a-z0-9_]+`, no `public` in effective search path |

## Sampling Rate

- After each task: run the task's focused `<automated>` command.
- After Wave 2: run the disposable migration Up→Down→Up suite.
- After Wave 3: run permission/repository Phase-107 tests once and concurrency tests with `-count=10`.
- Phase gate after Wave 4: provision a fresh disposable DB, require the exact ordinary/platform-admin target-attribution test names, run all `TestPhase107` tests with `-count=10`, then `go test ./...`, `go vet ./...`, and blocking path-scoped `git diff --check -- $phase107Paths`.
- Do not require a globally clean `git status` and do not use repository-global filename/name-prohibition gates. Sequential execution on the shared main worktree makes the exact Phase-107 path list safe as a formatting gate; static source-boundary tests still scan only explicit Phase-107 production artifacts.

## Per-Requirement Verification Map

| ID | Requirement / Decision Coverage | Test Layer | Automated Gate | Owner Plan |
|---|---|---|---|---|
| P107-SC1 | D-01..D-04: three typed actions; unchanged base Resolver contract; DB-backed same-group active verified grant; no transitive delegation; no expiry/UI duplicate | permission unit + authz/delegation PostgreSQL | Exact `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase` and `TestPhase107AuthzRepositoryDirectGrantScope`, then delegation tests | 03, 04, 06 |
| P107-SC2 | D-05..D-07: no assignment/reservation; first atomic decision wins; revoke affects future authorization only | migration boundary + repository/service concurrency | `go test ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase107.*(Boundary|FirstWins|Concurrent|Revoke)' -count=10` | 01, 02, 05, 06 |
| P107-SC3 | D-08..D-10: App-User plus membership-independent verified-claim self-review guard for every actor; every target supplies trustworthy submitter App-User and beneficiary Member attribution; platform may lack an actor Member only after complete target attribution and proven no-match; platform review point-free | authz/service unit + transaction integration | Exact AuthzRepository identity cases plus `TestPhase107ReviewServiceRejectsOrdinaryDecisionWithoutTargetAttribution` and `TestPhase107ReviewServiceRejectsPlatformAdminDecisionWithoutTargetAttribution` | 03, 06 |
| P107-SC4 | D-11..D-13: actual mutations audited; grant/revoke no-op unaudited; every Reject has structured category + nonblank reason; override reason separate; reads unaudited; invalid attribution has no side effects; immutable structured parent; deletable reasons; typed system actor | migration + audit repository + service rollback | Exact `TestPhase107AuthzRepositoryPermissionReadsCreateNoAudit`, attribution no-side-effect cases, and focused audit/rollback tests | 01, 02, 03, 04, 06 |
| P107-SC5 | D-14..D-17: PointService-only awards; fixed equal rule; source-global append-only reject/confirm cap; distinct sources independent; reviewer beneficiary | migration/repository/service PostgreSQL concurrency | `go test ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase107.*(Credit|Immutable|RejectConfirm|AcrossRevisions|Independent|PointService)' -count=10` | 01, 02, 05, 06 |
| P107-SC6 | Narrow fake adapters and full authorization/concurrency/rollback proof without source/UI wiring | service contract + artifact-local boundary | `go test ./internal/services -run 'TestPhase107.*(Adapter|Boundary|Concurrent|Rollback)' -count=10` | 01, 06 |

## Mandatory Disposable PostgreSQL Gate

Run from the repository root in PowerShell:

`docker compose up -d team4sv30-db; $dbName = 'team4s_phase107_test_' + [guid]::NewGuid().ToString('N'); try { docker compose exec -T team4sv30-db createdb -U team4s $dbName; if ($LASTEXITCODE -ne 0) { throw 'create Phase-107 test database failed' }; $port = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { '5433' }; $env:TEAM4S_PHASE107_TEST_DSN = "postgres://team4s:team4s_dev_password@127.0.0.1:$port/$dbName?sslmode=disable"; Push-Location backend; try { $required = @('TestPhase107ReviewServiceRejectsOrdinaryDecisionWithoutTargetAttribution','TestPhase107ReviewServiceRejectsPlatformAdminDecisionWithoutTargetAttribution'); $listed = go test ./internal/services -list '^TestPhase107ReviewServiceRejects.*TargetAttribution$'; if ($LASTEXITCODE -ne 0) { throw 'listing Phase-107 attribution tests failed' }; foreach ($name in $required) { if (-not ($listed -contains $name)) { throw "missing required test: $name" } }; go test ./internal/services -run '^(TestPhase107ReviewServiceRejectsOrdinaryDecisionWithoutTargetAttribution|TestPhase107ReviewServiceRejectsPlatformAdminDecisionWithoutTargetAttribution)$' -count=1; if ($LASTEXITCODE -ne 0) { throw 'Phase-107 attribution tests failed' }; go test ./internal/testsupport ./internal/migrations ./internal/permissions ./internal/repository ./internal/services -run 'TestPhase107' -count=10; if ($LASTEXITCODE -ne 0) { throw 'Phase-107 live suite failed' }; go test ./...; if ($LASTEXITCODE -ne 0) { throw 'backend suite failed' }; go vet ./...; if ($LASTEXITCODE -ne 0) { throw 'go vet failed' } } finally { Pop-Location } } finally { Remove-Item Env:TEAM4S_PHASE107_TEST_DSN -ErrorAction SilentlyContinue; if ($dbName -like 'team4s_phase107_test_*') { docker compose exec -T team4sv30-db dropdb -U team4s --force $dbName } }; $phase107Paths = @('backend/internal/testsupport/phase106_postgres.go','backend/internal/testsupport/phase106_postgres_test.go','backend/internal/testsupport/phase107_postgres.go','backend/internal/testsupport/phase107_postgres_test.go','backend/internal/migrations/phase107_review_foundation_test.go','database/migrations/0134_review_foundation.up.sql','database/migrations/0134_review_foundation.down.sql','backend/internal/permissions/permissions.go','backend/internal/permissions/permissions_test.go','backend/internal/permissions/capability_registry_test.go','backend/internal/repository/authz.go','backend/internal/repository/authz_permissions.go','backend/internal/repository/authz_permissions_test.go','backend/internal/repository/review_delegation_repository.go','backend/internal/repository/review_delegation_repository_test.go','backend/internal/repository/review_audit_repository.go','backend/internal/repository/review_audit_repository_test.go','backend/internal/repository/review_decision_repository.go','backend/internal/repository/review_decision_repository_test.go','backend/internal/repository/review_credit_repository.go','backend/internal/repository/review_credit_repository_test.go','backend/internal/services/review_service.go','backend/internal/services/review_service_test.go','backend/internal/services/review_service_boundary_test.go'); git diff --check -- $phase107Paths; if ($LASTEXITCODE -ne 0) { throw 'Phase-107 path-scoped git diff --check failed' }`

The phase is not accepted if Docker/PostgreSQL is unavailable or any live test skips.

## Required Concurrency and Rollback Scenarios

1. Confirm vs reject for the same Source+Revision: one commit, one `ErrReviewAlreadyDecided`.
2. Losing transaction: no committed adapter mutation, reason, audit, slot or ledger award.
3. Repeated reject across revisions and different reviewer members: one reject slot and one award total.
4. Reject → resubmit revision → confirm: one reject plus one confirm slot/award.
5. Two different stable source keys in one release-like fixture: independent decisions and credits.
6. Grant/revoke and a direct-grant decision on the same membership: deterministic row-lock order and future-only revocation.
7. Adapter, mandatory audit or PointService failure after tentative Decision insert: complete rollback.
8. Every Reject without category, without reason, or with Unicode-whitespace-only reason fails before mutation; a valid Reject persists structured category and a separate reason child.
9. Platform admin without Member may decide; platform admin whose membership-independent verified claim matches the beneficiary needs explicit override plus a separate nonblank reason and still gets zero review slot/credit; adapter-owned submitter work credit/reversal remains possible.
10. Ordinary and platform-admin decisions with missing, zero or invalid SubmitterAppUserID or BeneficiaryMemberID fail with `ErrReviewTargetAttributionInvalid` before Decision, adapter mutation, audit/reason, slot or PointService; platform-admin absence is never an implicit override.
11. Repeated Grant and Revoke of a missing row return no-op success and leave delegation audit count unchanged.
12. Direct SQL UPDATE/DELETE/TRUNCATE on Decision/Audit/Credit-Slot fails; Reason DELETE succeeds without changing structured parents.
13. Populated Down fails before any object/seed change; empty Up→Down→Up drops guards before tables and succeeds.

## Manual / UAT

No manual browser UAT applies. Phase 107 intentionally exposes no route, handler or UI. `$gsd-verify-work` should review the automated service contracts and absence of prohibited artifacts. Visible delegation/review flow and refresh-session UAT belong to Phase 107.1.

## Validation Sign-Off

- [ ] All focused task commands pass.
- [ ] Disposable PostgreSQL gate passes without skip.
- [ ] `go test ./...` passes.
- [ ] `go vet ./...` passes.
- [ ] Blocking path-scoped `git diff --check -- $phase107Paths` passes; no globally clean status is required.
- [ ] Artifact-local boundary tests reject every prohibited seam.
- [ ] Existing permission handler/test resolver stubs compile unchanged.
- [ ] No unrelated file is required for acceptance.
