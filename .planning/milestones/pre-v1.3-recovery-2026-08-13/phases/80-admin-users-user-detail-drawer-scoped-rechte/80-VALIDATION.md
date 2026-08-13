---
phase: 80
slug: admin-users-user-detail-drawer-scoped-rechte
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
amended: 2026-06-15
---

# Phase 80 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Amended after Phase 82/83 planning changes and checker revision (2026-06-15).

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Backend Go `testing` with testify; frontend Vitest 3.2.4 |
| Config file | `frontend/vitest.config.ts`; backend package tests use Go defaults |
| Quick run command | `cd backend && go test ./internal/repository -run "AdminUsers|AnimeContributionsMe|MemberIDAnchor" -count=1`; `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` |
| Full suite command | `cd backend && go test ./...`; `cd frontend && npm test && npm run typecheck && npm run lint` |
| Estimated runtime | ~180 seconds for focused checks; full suite depends on local DB/service state |

## Sampling Rate

- After every task commit: run the narrow backend/frontend command for the touched seam.
- After every plan wave: run backend package tests for handlers/repository/permissions plus frontend tests for `admin/users`, API helpers, and `PlatformAdminGate`.
- Before `$gsd-verify-work`: full backend tests, frontend tests, typecheck, lint, build if feasible, and `git diff --check` must be green or documented.
- Max feedback latency: 180 seconds for focused checks.

## Per-Task Verification Map

| Task ID | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|-------------|-----------------|-----------|-------------------|--------|
| 80-W0-01 | Contract discipline | DTOs, `api.ts`, backend response, OpenAPI and UI expectations stay aligned | contract + frontend helper | `cd frontend && npm run typecheck && npm test -- src/lib/api.no-token-boundary.test.ts` | pending |
| 80-W0-02 | Platform-admin gate | Non-platform-admin cannot enumerate users or call detail/mutation endpoints | backend handler | `cd backend && go test ./internal/handlers -run AdminUsers -count=1` | pending |
| 80-W0-03 | Scoped rights read-only | Scoped rights, claims, contributions, media, and memorial context remain display/deep-link data, not global edit grants | backend repository + UI render | `cd backend && go test ./internal/repository -run AdminUsers -count=1` | pending |
| 80-W0-04 | Global role/status mutation safety | Mutations validate input, audit allowed/denied outcomes, and prevent final active platform-admin lockout via both Revoke and Disable paths | backend handler + repository | `cd backend && go test ./internal/handlers ./internal/repository -run "AdminUsers|Authz" -count=1` — tests include: TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409 AND TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409 | pending |
| 80-W0-05 | Auth session boundary | Protected UI accepts valid refresh session and delegates refresh to central API client | frontend component/API | `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` | pending |
| 80-W0-06 | Drawer/UI behavior + Memorial read-only | `/admin/users` table and drawer expose columns/tabs, lazy-load tab data, keep scoped tabs read-only with deep links; UserClaimsTab shows Gedenkprofil-Badge when profile_status=memorial and has no mutation controls (D-J) | frontend UI | `cd frontend && npm test -- src/app/admin/users/page.test.tsx src/app/admin/users/UserDetailDrawer.test.tsx src/app/admin/users/tabs/UserClaimsTab.test.tsx` | pending |
| 80-W0-07 | Phase-82 member anchor | User contribution aggregates read `anime_contributions.member_id` first and legacy historical-member link only as fallback | backend repository | `cd backend && go test ./internal/repository -run "MemberIDAnchor|AdminUsers" -count=1` | pending |
| 80-W0-08 | Phase-83 default/override projection | User drawer resolves project-default contributions plus release overrides without materializing every release row | backend repository + frontend render | `cd backend && go test ./internal/repository -run "AdminUsers.*Release|Contribution.*Override" -count=1` | pending |
| 80-W0-09 | `/me` workspace activity visibility | Media/notes tabs show release-version-scoped `/me` workspace activity read-only and link to canonical workspaces | frontend UI + backend repository | `cd frontend && npm test -- src/app/admin/users/UserDetailDrawer.test.tsx` | pending |
| 80-W0-10 | New conflict types | Invalid release override, default/override contradiction, and media/notes-without-resolved-rights are counted and explained | backend repository + UI render | `cd backend && go test ./internal/repository -run "AdminUsers.*Conflict" -count=1` | pending |

## Wave 0 Requirements

- [ ] `backend/internal/repository/admin_users_repository_test.go` - aggregate SQL behavior, page-first ownership, conflict counts, no UI-driven N+1, canonical `member_id` anchor fallback.
- [ ] `backend/internal/handlers/admin_users_handler_test.go` - platform-admin gate, role/status mutation audits, denied audits, last-admin guard for both Revoke (TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409) and Disable (TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409).
- [ ] `frontend/src/types/admin-users.ts` - typed DTO owner for Phase 80 list/detail/tab responses, including Phase-83 default/override projections.
- [ ] `frontend/src/lib/api.admin-users.test.ts` - query serialization, response parsing, non-200 branches.
- [ ] `frontend/src/app/admin/users/page.test.tsx` - table columns, filters, sorting, pagination controls, conflict badge, drawer open path.
- [ ] `frontend/src/app/admin/users/UserDetailDrawer.test.tsx` - tab order, lazy tab calls, scoped read-only sections, role/status controls, audit feedback, release workspace activity.
- [ ] `frontend/src/components/auth/PlatformAdminGate.test.tsx` - refresh-token-only platform-admin access regression.
- [ ] `frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx` - renders Gedenkprofil-Badge when profile_status=memorial; no Edit-/Mutations-Control present (D-J read-only).

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live admin center routing and information scent | scoped admin overview | Browser validates discoverability better than isolated tests | Log in as platform admin, open `http://127.0.0.1:3000/admin/users`, verify list loads, filters work, and a user row opens the drawer. |
| Scoped rights are visible but not editable in global drawer | route ownership | Product-fit check: complete view without duplicating `/admin/fansubs/[id]/edit` | Open Aki; verify group/release/contribution/media tabs show complete data and deep links, but no scoped grant/revoke controls. |
| Phase-82 member anchor | member visibility | Regression was found live with Aki | Open Aki; verify Naruto Projektleitung appears even when the row is anchored through `anime_contributions.member_id`. |
| Phase-83 default/override projection | release workspace derivation | Needs real local Naruto fixture | Verify Aki's project-wide Naruto contribution derives concrete release workspace availability; release-specific "not dabei" override removes only that release. |
| Non-admin denial copy | platform-admin gate | User-facing German copy and route behavior need shared browser review | Log in as normal user, open `/admin/users`, verify clear denial/redirect and no data flash. |
| Audit trace review | mutation safety | Requires local DB inspection or admin audit UI | Assign/revoke a non-baseline global role and disable/reactivate a non-admin user; verify audit entries include actor, target, event type, scope, and outcome. |

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers Phase 82 `member_id` anchor and Phase 83 default/override semantics.
- [ ] Wave 0 covers Last-Admin-Guard for both Revoke and Disable paths.
- [ ] Wave 0 covers Memorial read-only (D-J) via UserClaimsTab.test.tsx.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s for focused checks.
- [ ] `nyquist_compliant: true` set after Wave 0 tests exist and pass.

**Approval:** pending
