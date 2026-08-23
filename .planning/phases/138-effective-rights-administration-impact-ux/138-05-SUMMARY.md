---
phase: 138-effective-rights-administration-impact-ux
plan: 05
subsystem: api
tags: [go, gin, pgx, postgres, admin, audit, member-claims, openapi, typescript]

# Dependency graph
requires:
  - phase: 138-01
    provides: requirePlatformAdminIdentity-gated cross-group admin list pattern (AdminRoleHoldersHandler), extended testsupport.OpenPhase137Postgres fixture with display-identity columns
provides:
  - "MemberClaimsRepository.ListClaims: cross-group, filtered, paginated member_claims query (D-23)"
  - "AuditLogRepository.ListChanges: cross-group, filtered, paginated audit_logs query (D-25/D-28)"
  - "GET /admin/claims and GET /admin/changes, both platform-admin-gated"
  - "Shared ClampAdminListPage pagination-clamp helper (default 25, max 100)"
  - "Full D-35 contract chain (OpenAPI/TS/api.ts) for both new endpoints"
affects: [138-06, 138-07, later Plan-138 frontend Claims/Aenderungen workspace pages]

tech-stack:
  added: []
  patterns:
    - "Dynamic parameterized WHERE-fragment building (args []any + paramIdx + fmt.Sprintf(\"$%d\", ...)), mirroring member_archive_repository.go's existing convention"
    - "COUNT(*) OVER() window column for total count in the same query, mirroring admin_users_queries.go's ListAdminUsersPage CTE convention"
    - "ClampAdminListPage(limit, offset) shared clamp helper, exported from member_claims_list_repository.go, reused by audit_logs_query.go"
    - "auditLogsQueryDBTX local interface (DBTX + Query) type-assertion, mirroring authzUserOverridesDBTX/releaseCrewDBTX, since AuditLogRepository's shared DBTX interface only has Exec+QueryRow"

key-files:
  created:
    - backend/internal/repository/member_claims_list_repository.go
    - backend/internal/repository/member_claims_list_repository_test.go
    - backend/internal/handlers/admin_claims_list_handler.go
    - backend/internal/repository/audit_logs_query.go
    - backend/internal/repository/audit_logs_query_test.go
    - backend/internal/handlers/admin_changes_handler.go
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - backend/internal/testsupport/phase137_postgres.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-users.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "testsupport.OpenPhase137Postgres extended additively (per the 138-01 precedent) with member_claims, hist_fansub_group_members, audit_logs stand-in tables and members.nickname, since the real production shapes were never part of the applied migration chain the fixture replays."
  - "Date-range filtering on ListChanges uses an inclusive/inclusive (>=/<=) convention on both from and to, documented in-code, matching the simpler symmetric convention already used by member_archive_repository.go's year-range filters rather than inventing a half-open interval."
  - "claim_type filter on ListClaims is accepted for forward-compatibility per the plan's literal spec but only ever matches the single real literal 'claim' value — no invented claim types."

patterns-established:
  - "ClampAdminListPage as the single shared pagination-clamp source of truth for new admin cross-group list endpoints, closing the plan's 'extract a shared helper' interface note."

requirements-completed: []

# Metrics
duration: 45min
completed: 2026-08-23
---

# Phase 138 Plan 05: Cross-Group Claims and Aenderungen List Endpoints Summary

**Two new platform-admin-gated, filtered, paginated backend list endpoints (GET /admin/claims, GET /admin/changes) built from scratch over real member_claims/audit_logs vocabulary, closing the D-23/D-25 backend gap ahead of later frontend workspace pages.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-23T17:10:07Z
- **Completed:** 2026-08-23T17:55:00Z
- **Tasks:** 2 completed
- **Files modified:** 12 (6 created, 6 modified)

## Accomplishments
- `MemberClaimsRepository.ListClaims` answers D-23's central Claims workspace: cross-group, status/type/fansub_group_id/app_user_id/date filters, joins `app_users`/`hist_fansub_group_members`/`fansub_groups` for click-through identity and group context, `COUNT(*) OVER()` total, clamped pagination.
- `AuditLogRepository.ListChanges` answers D-25/D-28's central Aenderungen workspace: cross-group, benutzer (actor OR target, mirrors `GetUserAudit`'s exact OR-clause)/gruppe/target_type/zeitraum filters, raw `payload` JSONB passthrough (no interpretation), clamped pagination.
- Both new handlers (`AdminClaimsListHandler`, `AdminChangesHandler`) gate on `requirePlatformAdminIdentity` as the first action — intentionally stricter than the existing group-delegable per-group claim/audit queries, since these are cross-group aggregations.
- Full D-35 contract chain closed: `shared/contracts/admin-capabilities.yaml` gained the two paths plus `ClaimListRow`/`AdminClaimsListResponse`/`ChangeListRow`/`AdminChangesListResponse` schemas; `frontend/src/types/admin-users.ts` gained the matching TS interfaces; `frontend/src/lib/api.ts` gained `listClaims`/`listChanges` helpers using the existing `URLSearchParams` query-building convention.
- Extended `testsupport.OpenPhase137Postgres` additively with the real production shapes of `member_claims`, `hist_fansub_group_members`, `audit_logs`, and `members.nickname` — none of these were previously part of the fixture's replayed migration chain.

## Task Commits

Each task was committed atomically:

1. **Task 1: Claims — cross-group filtered list (D-23)** - `3de4eb5f` (feat)
2. **Task 2: Änderungen — cross-group filtered audit list (D-25/D-28)** - `343813e4` (feat)

_Note: no TDD tasks in this plan; each commit includes its own real-Postgres test file._

## Files Created/Modified
- `backend/internal/repository/member_claims_list_repository.go` - `ClaimListRow`/`ClaimListFilter`/`ListClaims`, plus the shared `ClampAdminListPage` helper
- `backend/internal/repository/member_claims_list_repository_test.go` - 7 real-Postgres test cases (status/group/pagination/clamp/date-range/empty-result)
- `backend/internal/handlers/admin_claims_list_handler.go` - `AdminClaimsListHandler.ListClaims`, platform-admin-gated, query-param parsing
- `backend/internal/repository/audit_logs_query.go` - `ChangeListRow`/`ChangeListFilter`/`ListChanges`, `auditLogsQueryDBTX` local interface
- `backend/internal/repository/audit_logs_query_test.go` - 5 real-Postgres test cases (benutzer OR-semantics/gruppe/target_type/date-range/pagination)
- `backend/internal/handlers/admin_changes_handler.go` - `AdminChangesHandler.ListChanges`, platform-admin-gated, query-param parsing
- `backend/cmd/server/admin_routes.go` - `adminClaimsListHandler`/`adminChangesHandler` fields + `GET /admin/claims`/`GET /admin/changes` routes
- `backend/cmd/server/main.go` - wired both new handlers reusing the existing `memberClaimsRepo`/`auditLogRepo`
- `backend/internal/testsupport/phase137_postgres.go` - additive `member_claims`/`hist_fansub_group_members`/`audit_logs` stand-in tables + `members.nickname`/`members.display_name` columns
- `shared/contracts/admin-capabilities.yaml` - two new paths, four new schemas
- `frontend/src/types/admin-users.ts` - `AdminClaimListRow`/`AdminClaimsListParams`/`AdminClaimsListResponse`/`AdminChangeEntry`/`AdminChangesListParams`/`AdminChangesListResponse`
- `frontend/src/lib/api.ts` - `listClaims`/`listChanges` helper functions

## Decisions Made
- testsupport fixture extension is additive-only (nullable columns, `CREATE TABLE IF NOT EXISTS`), following the 138-01 precedent exactly, so no existing Phase-137 test's bare inserts break.
- Date-range boundary on `ListChanges` is inclusive on both ends (`>=`/`<=`), documented in a code comment per the plan's explicit requirement to document the exact choice.
- `ClampAdminListPage` was extracted as a shared, exported helper (rather than duplicating the clamp logic in `audit_logs_query.go`) per the plan's interface note to "extract a shared helper if one does not already exist as an importable function" — no such helper existed anywhere in the codebase before this plan.

## Deviations from Plan

None - plan executed exactly as written. The one addition beyond the plan's literal task text — extending `testsupport.OpenPhase137Postgres` with `member_claims`/`hist_fansub_group_members`/`audit_logs`/`members.nickname` — is a Rule 3 (blocking) auto-fix: the plan's own `<read_first>` and query text assume these tables/columns exist in the test fixture, but the fixture (as extended by 138-01) never included them. Without this extension, the plan's own literal acceptance-criterion test commands (`go test ... -run TestListClaims`, `... -run TestListChanges`) could not run against real Postgres at all.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended testsupport.OpenPhase137Postgres with member_claims/hist_fansub_group_members/audit_logs/members.nickname**
- **Found during:** Task 1 (writing member_claims_list_repository_test.go)
- **Issue:** The plan's own acceptance criteria require a real-Postgres `TestListClaims`/`TestListChanges` run, but the shared Phase-137 fixture (extended only through 138-01's fansub-group-role-holder needs) had no `member_claims`, `hist_fansub_group_members`, or `audit_logs` tables, and `members` had no `nickname` column — all required by this plan's literal join/query text.
- **Fix:** Added the real production table shapes (from migrations 0081/0082/0075) as additive `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements in the fixture's existing post-migration-loop block, mirroring the exact precedent 138-01 established for `fansub_group_member_roles`/display columns. `audit_logs.actor_legacy_user_id` deliberately drops its production FK to a non-existent `users` stand-in table (test-only relaxation, no referential-integrity need for these tests).
- **Files modified:** backend/internal/testsupport/phase137_postgres.go
- **Verification:** `TestListRoleHolders` (138-01's existing suite) re-run and still green after the extension; `TestListClaims`/`TestListChanges` (this plan) pass against the same fixture.
- **Committed in:** 3de4eb5f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to make the plan's own literal, non-optional test-run acceptance criteria executable. No scope creep — only additive test-fixture schema, no production code path touched.

## Issues Encountered
- `AuditLogRepository`'s shared `DBTX` interface (audit_logs.go) only declares `Exec`/`QueryRow`, not `Query` — resolved by defining a local `auditLogsQueryDBTX` interface (`DBTX` + `Query`) and type-asserting `r.db` to it inside `ListChanges`, mirroring the existing `authzUserOverridesDBTX`/`releaseCrewDBTX` precedent rather than widening the shared `DBTX` interface for all callers.
- gofmt struct-literal column realignment cascaded through `backend/cmd/server/main.go`'s `adminRouteHandlers{...}` literal both times a longer field name was added (Task 1: `adminClaimsListHandler`, Task 2: `adminChangesHandler`) — resolved by running `gofmt -w` on the touched file each time; no logic changes, whitespace-only.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both `GET /admin/claims` and `GET /admin/changes` are live, tested, and contract-complete (Go DTO / OpenAPI / TS / api.ts), ready for the later Plan-138 frontend Claims/Aenderungen top-level workspace pages (D-23/D-25) to consume directly via `listClaims`/`listChanges`.
- No blockers. The `ClampAdminListPage` helper is available for any further Phase-138 admin list endpoint that needs the same pagination convention.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*
