---
phase: 101-meilensteine-zeitmanagement-und-anzeige-der-meilensteine-ver
reviewed: 2026-07-13T09:54:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - frontend/src/components/groups/GroupHistorySection.tsx
  - frontend/src/components/groups/GroupHistorySection.test.ts
  - frontend/src/components/groups/GroupHistoryForm.tsx
  - frontend/src/components/groups/GroupHistoryForm.test.tsx
  - backend/internal/handlers/fansub_group_history_handler.go
  - backend/internal/repository/fansub_group_history_repository.go
  - backend/internal/handlers/fansub_group_history_handler_test.go
  - backend/database/migrations/002_group_history_single_use_events.up.sql
  - backend/database/migrations/002_group_history_single_use_events.down.sql
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 101: Code Review Report

**Reviewed:** 2026-07-13T09:54:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the final working-tree state after the CR-02 fix, limited to the requested group-history frontend, backend, test, and migration files. No blocker remains in the reviewed implementation.

Previous CR-01 remains resolved. The add form initializes from the visible option set at `GroupHistorySection.tsx:97-104`, and submit rejects missing or disabled selected event types before transport at `GroupHistorySection.tsx:377-381`.

The latest quick fix remains correct. Project-count and release-count achievements now stay visible as disabled select options until their thresholds are reached at `GroupHistorySection.tsx:212-219` and `GroupHistorySection.tsx:238-245`, with regression coverage for below-threshold, boundary, and unlocked cases.

CR-02 is resolved. `founding` is now included in the server single-use set at `fansub_group_history_handler.go:54-70`, create/update map repository unique violations to the duplicate milestone message at `fansub_group_history_handler.go:357-358` and `fansub_group_history_handler.go:475-476`, repository writes translate PostgreSQL unique violations to `ErrValidation` at `fansub_group_history_repository.go:563-565` and `fansub_group_history_repository.go:610-612`, and the new partial unique index enforces duplicate/race protection in `002_group_history_single_use_events.up.sql:1-19`.

## Resolved Blocker Checks

### CR-01: Hidden milestone type can still be saved before a founding year exists

**Classification:** BLOCKER - resolved

**File:** `frontend/src/components/groups/GroupHistorySection.tsx:97`

**Resolution:** The form default is derived from computed options rather than the legacy `milestone` fallback, and disabled/missing selected options are rejected on submit. The regression test at `GroupHistorySection.test.ts:76-90` verifies no create request is sent before a founding year exists.

### CR-02: Single-use milestone events can still be duplicated server-side

**Classification:** BLOCKER - resolved

**File:** `backend/database/migrations/002_group_history_single_use_events.up.sql:1`

**Resolution:** The handler and database now agree on the single-use event family, including `founding`, and the partial unique index closes the read-before-write race that the handler-only guard could not prevent.

## Warnings

### WR-01: Admin group-history CRUD behavior is still not documented in shared API contracts

**Classification:** WARNING

**File:** `backend/internal/handlers/fansub_group_history_handler.go:308`

**Issue:** The handler exposes admin group-history list/create/update/delete behavior and now returns 422 for invalid event types, locked achievements, duplicate single-use events, pre-founding years, and future years, but the shared contract search still finds no admin CRUD path for `/api/v1/admin/fansubs/{id}/history`. Per `AGENTS.md` and `docs/api/api-contracts.md`, endpoint behavior and error statuses should be reflected in the canonical contract source.

**Fix:** Add the admin group-history CRUD paths to `shared/contracts/openapi.yaml` or the focused admin contract, including request/response DTOs, auth requirement, and 422 responses for invalid event type, duplicate single-use event, locked achievement, and invalid year.

### WR-02: Backend guard tests are still source-inspection tests, not behavior tests

**Classification:** WARNING

**File:** `backend/internal/handlers/fansub_group_history_handler_test.go:82`

**Issue:** The group-history guard tests inspect source strings instead of exercising HTTP requests or repository/database behavior. This already produces a false-positive shape: `TestCreateGroupHistory_TitleRequired` says a missing title should return 422, but it only searches the function body for `http.StatusUnprocessableEntity` and would pass even though the title branch currently calls `badRequest`. The new single-use database-constraint test similarly checks source text rather than proving duplicate create/update requests return 422 or that the partial unique index rejects concurrent duplicates.

**Fix:** Add table-driven handler or repository-backed behavior tests for missing title, duplicate founding, duplicate count achievement, locked project-count/release-count events, below-founded year, future year, and explicit `{"year": null}` update. If the concrete repository type blocks mocking, extract a minimal interface for the handler or use the existing test database setup.

## Checks

- `npm test -- GroupHistorySection GroupHistoryForm` - passed, 49 tests
- `go test ./internal/handlers -run GroupHistory` - passed
- `git diff --check` - passed with Git line-ending warnings only

---

_Reviewed: 2026-07-13T09:54:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
