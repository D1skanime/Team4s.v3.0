# Phase 50 Research: Platform Admin Boundaries und Contributor-Scope-Governance

**Date:** 2026-05-22
**Status:** Completed inline due unavailable GSD agents

## Findings

### Current Runtime Behavior

- `phase43-member` has no global `platform_admin` role.
- `phase43-member` has an active `fansub_lead` role for Fansub-Gruppe `88 / AnimeOwnage`.
- `/admin/fansubs` currently renders a global management table for that lead.
- The page calls the generic list endpoint `GET /api/v1/fansubs?page=1&per_page=500`, then loads aliases/members for many groups.
- The UI exposes platform-admin actions such as create, merge, delete, bulk select, and edit links for all groups.
- Backend mutation guards still use `requirePlatformAdminIdentity` in many global admin handlers, so several UI actions would likely fail server-side. The bad state is UX and route ownership first, with security gaps possible wherever backend scoping is incomplete.

### Existing Guard And Capability Seams

- `backend/internal/handlers/platform_admin_authz.go` is the existing platform-admin guard.
- `backend/internal/permissions/permissions.go` already models `platform_admin`, `fansub_lead`, actions, scopes, and context-based checks.
- `GET /api/v1/admin/fansubs/:id/capabilities` and app-member endpoints already exist for group-scoped management.
- `GET /api/v1/me` exposes `is_platform_admin`.
- `GET /api/v1/me/fansub-groups` and related contributor surfaces exist from Phase 48, but the current `/admin/my-groups` UX is not accepted as the target workspace.

### Route Ownership Decision

`/admin` should mean Team4s platform administration. It should not be the lead/contributor namespace.

Accepted target split:

- Platform admin:
  - `/admin`
  - `/admin/fansubs`
  - `/admin/fansubs/create`
  - `/admin/fansubs/merge`
  - `/admin/anime`
  - `/admin/anime/create`
  - `/admin/episodes`
- Fansub lead/contributor management:
  - a new non-admin management route, e.g. `/manage/fansubs/:id`
  - backed by group capabilities and direct backend permission checks
  - can reuse existing fansub edit components internally after capability cleanup
- Public group surface:
  - separate future product area, e.g. existing `/fansubs/:slug`
  - public-safe data only
  - no management affordances

### Implementation Shape

The safest implementation is not to delete all existing `/admin/fansubs/:id/edit` code immediately. Instead:

1. Preserve `/admin/fansubs/:id/edit` for platform admins.
2. Add a new group-management route outside `/admin`.
3. Extract or wrap reusable fansub edit sections behind a capability-aware shell.
4. Route leads to the new management route.
5. Block non-platform users from global admin routes.
6. Retire or redirect `/admin/my-groups` so it no longer pretends to be the real lead workspace.

### Test Matrix

Required UAT/test accounts:

- `phase43-admin` / `Team4s123!`
  - `platform_admin`
  - can see global admin areas
- `phase43-member` / `Team4s123!`
  - `fansub_lead` for group 88
  - cannot see global admin areas
  - can manage group 88 through scoped route
  - cannot manage foreign group 108

## Recommendation

Plan Phase 50 as a security/product boundary phase in four slices:

1. Contract and route taxonomy.
2. Backend capability and route enforcement.
3. Frontend route separation and workspace migration.
4. Regression tests, docs, and live UAT.
