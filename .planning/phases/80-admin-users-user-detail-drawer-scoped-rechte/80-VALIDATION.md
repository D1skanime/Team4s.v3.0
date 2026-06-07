---
phase: 80
slug: admin-users-user-detail-drawer-scoped-rechte
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 80 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend Go `testing` with testify; frontend Vitest 3.2.4 |
| **Config file** | `frontend/vitest.config.ts`; backend package tests use Go defaults |
| **Quick run command** | `cd backend && go test ./internal/handlers ./internal/repository ./internal/permissions -run "AdminUsers|AppAuth|Authz|PlatformAdmin|Permissions" -count=1`; `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` |
| **Full suite command** | `cd backend && go test ./...`; `cd frontend && npm test && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~180 seconds for focused checks; full suite depends on local DB/service state |

---

## Sampling Rate

- **After every task commit:** Run the narrow backend/frontend command for the touched seam.
- **After every plan wave:** Run backend package tests for handlers/repository/permissions plus frontend tests for `admin/users`, API helpers, and `PlatformAdminGate`.
- **Before `$gsd-verify-work`:** Full backend tests, frontend tests, typecheck, lint, build if feasible, and `git diff --check` must be green or documented.
- **Max feedback latency:** 180 seconds for focused checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 80-W0-01 | 00 | 0 | Entscheidung K | T-80-01 / T-80-04 | Contract, DTOs, `api.ts`, backend response, and UI expectations stay aligned | contract + frontend helper | `cd frontend && npm test -- src/lib/api.no-token-boundary.test.ts && npm run typecheck` | Partial; admin-users helper tests missing | pending |
| 80-W0-02 | 00 | 0 | Entscheidung I | T-80-01 | Non-platform-admin cannot enumerate users or call detail/mutation endpoints | backend handler | `cd backend && go test ./internal/handlers -run AdminUsers -count=1` | Missing W0 | pending |
| 80-W0-03 | 00 | 0 | Entscheidung I/H/J | T-80-03 | Scoped rights, claims, contributions, media, and memorial/member context remain display data, not inferred permissions | backend repository + UI render | `cd backend && go test ./internal/repository -run AdminUsers -count=1` | Missing W0 | pending |
| 80-W0-04 | 00 | 0 | Entscheidung I/K | T-80-02 / T-80-05 | Role/status mutations validate input, audit allowed/denied outcomes, and prevent final active platform-admin lockout | backend handler + repository | `cd backend && go test ./internal/handlers ./internal/repository -run "AdminUsers|Authz" -count=1` | Missing W0 | pending |
| 80-W0-05 | 00 | 0 | Entscheidung I/K | T-80-06 | Protected UI accepts a valid refresh session and delegates refresh to the central API client | frontend component/API | `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` | Partial | pending |
| 80-W0-06 | 00 | 0 | Entscheidung I/H/K/J | T-80-01 / T-80-03 | `/admin/users` table and drawer expose required columns/tabs, lazy-load tab data, and keep scoped tabs read-only with deep links | frontend UI | `cd frontend && npm test -- src/app/admin/users/page.test.tsx src/app/admin/users/UserDetailDrawer.test.tsx` | Missing W0 | pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/admin_users_repository_test.go` - aggregate SQL behavior, page-first ownership, conflict counts, and no UI-driven N+1.
- [ ] `backend/internal/handlers/admin_users_handler_test.go` - platform-admin gate, role/status mutation audits, denied audits, and last-admin guard.
- [ ] `frontend/src/types/admin-users.ts` - typed DTO owner for Phase 80 list/detail/tab responses.
- [ ] `frontend/src/lib/api.admin-users.test.ts` or a focused extension of the existing API tests - query serialization, response parsing, and non-200 branches.
- [ ] `frontend/src/app/admin/users/page.test.tsx` - table columns, filters, sorting, pagination controls, conflict badge, and drawer open path.
- [ ] `frontend/src/app/admin/users/UserDetailDrawer.test.tsx` - tab order, lazy tab calls, scoped read-only sections, role/status controls, audit feedback.
- [ ] `frontend/src/components/auth/PlatformAdminGate.test.tsx` - refresh-token-only platform-admin access regression.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live admin center routing and information scent | Entscheidung I/K | Codex in-app browser validates discoverability better than isolated unit tests | In preview browser, log in as platform admin, open `http://127.0.0.1:3000/admin/users`, verify list loads, filters work, and a user row opens the drawer. |
| Scoped rights are visible but not editable in global drawer | Entscheidung I | Product-fit check: the UI must feel complete without duplicating `/admin/fansubs/[id]/edit` | In a drawer for a user with group memberships, verify group rights/contributions/media tabs show complete data and deep links, but no global scoped grant/revoke controls. |
| Non-admin denial copy | Entscheidung I/K | User-facing German copy and route behavior should be checked in the shared browser | Log in as a normal registered user, open `/admin/users`, verify a clear denial/redirect and no data flash. |
| Audit trace review | Entscheidung I/K | Requires local DB inspection or admin audit UI state after mutation | As platform admin, assign/revoke a non-baseline global role and disable/reactivate a non-admin user; verify audit entries include actor, target, event type, scope, and allowed/denied outcome. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s for focused checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 tests exist and pass.

**Approval:** pending
