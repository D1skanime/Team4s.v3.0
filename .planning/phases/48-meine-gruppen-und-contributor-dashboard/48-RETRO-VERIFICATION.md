# Phase 48 Retro Verification: Meine Gruppen & Contributor Dashboard

**Date:** 2026-05-27  
**Mode:** Retroactive verification from runtime evidence and focused tests.  
**Outcome:** Foundation retro-verified; route/shell polish and richer contributor workflows carry forward.

## Classification

Phase 48 delivered the contributor dashboard foundation, but not a final role-neutral app-shell experience.

- **Close as:** `retro-verified foundation complete`
- **Carry forward to:** Phase 53 for shared `Mein Bereich` navigation and `/me/*` route direction; later contributor-shell cleanup for richer group workspaces if needed.
- **Do not treat as complete for:** fully neutral route taxonomy, global app-shell integration, OpenAPI coverage, live UAT, or full reuse of every admin release/media/notes workspace.

## Runtime Evidence

### Backend Routes

- `backend/cmd/server/main.go` registers:
  - `GET /api/v1/me/fansub-groups`
  - `GET /api/v1/me/fansub-groups/:id`
- `backend/internal/handlers/app_auth.go` implements `ListMyFansubGroups` and `GetMyFansubGroupDetail`.
- Disabled app users are denied before repository access.
- Foreign or historical-only detail access is denied through `ReasonNoMembership`.
- Per-group capability booleans are hydrated from the central permission service, not from frontend role checks.

### Data Model And Repository

- `backend/internal/models/contributor_dashboard.go` defines:
  - `ContributorGroupOverview`
  - `ContributorGroupDetail`
  - release/anime/contribution summaries
  - contributor capability booleans
- `backend/internal/repository/contributor_dashboard_repository.go` uses canonical membership and release joins:
  - `fansub_group_members`
  - `fansub_group_member_roles`
  - historical `group_members`
  - `anime_fansub_groups`
  - `fansub_releases`
  - `release_versions`
  - `release_version_groups.fansub_group_id`
  - `release_version_media`
  - read-only `release_member_roles`
- Historical contributions are read-only and do not feed permission checks.
- Coop visibility is represented by release-version group participation and `is_coop`.

### Frontend

- `frontend/src/lib/api.ts` includes `getMyFansubGroups` and `getMyFansubGroupDetail`.
- `frontend/src/types/contributor.ts` mirrors the backend contributor dashboard DTOs.
- `frontend/src/app/admin/my-groups/page.tsx` implements the current `Meine Gruppen` overview.
- `frontend/src/app/admin/my-groups/[id]/page.tsx` implements the current contributor group detail page.
- `frontend/src/app/manage/groups/page.tsx` re-exports the admin overview as a transition route.
- Frontend tests cover capability-backed detail links, historical-only read-only context, release-native details, read-only historical credits, and media workspace links.

## Focused Checks Run

| Check | Result |
|---|---|
| `cd backend && go test ./internal/handlers ./internal/repository -run "Test.*MyGroups|Test.*Contributor|TestContributorDashboard"` | PASS |
| `cd frontend && npm run test -- src/app/admin/my-groups/page.test.tsx src/app/admin/my-groups/\[id\]/page.test.tsx` | PASS for overview file; detail path was not selected by Vitest because of path filtering |
| `cd frontend && npm run test -- "src/app/admin/my-groups/[id]/page.test.tsx"` | PASS, 1 test |
| `git diff --check` before docs edits | PASS |

## Success Criteria Review

| Criterion | Retro Status | Evidence / Note |
|---|---|---|
| Seam/reuse analysis exists | Satisfied | `48-CONTEXT.md`, `48-RESEARCH.md`, and runtime implementation identify reusable admin/release/media/notes seams. |
| Own groups overview exists | Satisfied | `/api/v1/me/fansub-groups`, `getMyFansubGroups`, `/admin/my-groups`. |
| Group detail exists | Satisfied for foundation | `/api/v1/me/fansub-groups/:id`, `getMyFansubGroupDetail`, `/admin/my-groups/[id]`. |
| Backend scopes to current actor | Satisfied for foundation | Handler derives `ContributorGroupQueryInput` from auth identity; detail lookup uses visible groups and denies missing/foreign scope. |
| Disabled users are blocked | Satisfied | Handler blocks disabled user before repo access; focused test exists. |
| Platform admin visibility is documented/implemented | Satisfied for foundation | Repository accepts `IsPlatformAdmin` and includes all groups when true. |
| Contributor release/anime reads are group-scoped | Satisfied for foundation | Release reads use `release_version_groups.fansub_group_id`; repository invariant test exists. |
| Coop release visibility is represented | Satisfied for foundation | `is_coop` is derived from multi-group release-version participation and surfaced in detail UI. |
| Quick actions are capability-driven | Satisfied for foundation | Handler populates capability booleans from permission service; UI gates open/detail/media actions from capabilities. |
| Navigation exposes `Mein Profil` and `Meine Gruppen` | Partially satisfied | Overview links to profile and account surfaces; broader app-shell `Mein Bereich` navigation carries forward to Phase 53. |
| Historical credits remain context only | Satisfied | Contributions read `release_member_roles` only for display; tests assert read-only/no-permission behavior. |
| Full UAT/docs closeout exists | Retro-satisfied | This artifact fills the missing GSD closeout; no live browser UAT was performed in this quick. |

## Carry-Forward Items

Phase 53 or a later contributor-shell cleanup should own these:

1. Make `Meine Gruppen` part of the same role-neutral `Mein Bereich` navigation as `/me/profile`.
2. Decide whether `/me/groups` should become the target route and whether `/admin/my-groups` / `/manage/groups` become redirects or transition re-exports.
3. Add a detail transition route for `/manage/groups/[id]` or future `/me/groups/[id]`; currently only the overview has a `/manage/groups` re-export.
4. Add OpenAPI documentation for `GET /api/v1/me/fansub-groups` and `GET /api/v1/me/fansub-groups/{id}`.
5. Broaden tests or live UAT for URL tampering, foreign group denial, disabled user behavior, platform-admin variant, and coop visibility against a real runtime dataset.
6. Verify all visible German UI text in the contributor pages uses correct encoding and umlauts in the rendered app.
7. Replace raw role/status codes in UI with centralized readable labels where Phase 53 also addresses role-label mapping.
8. Reassess whether links into `/admin/episode-versions/[id]/edit?tab=media` are acceptable long-term for non-admin contributors or need a dedicated contributor workspace wrapper.
9. Add partial failure states if group detail needs to load profile, groups, releases, media, and contributions independently.
10. Keep historical contributions read-only; they must never become permission inputs.

## Decision

Phase 48 can be marked as retro-verified/closed for the contributor dashboard foundation because the codebase contains the intended own-groups backend, detail read model, contributor DTOs, frontend overview/detail pages, capability-driven actions, read-only historical contribution context, and focused regression evidence.

The remaining product experience is not reopened in Phase 48. Route neutrality, shared shell integration, OpenAPI coverage, and deeper contributor workspaces should continue through Phase 53 or a later contributor-shell cleanup.
