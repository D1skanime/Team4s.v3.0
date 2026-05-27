# Historical Reconcile: Phases 1-46

**Date:** 2026-05-27  
**Mode:** `$gsd-quick historical-reconcile phases 1-46 roadmap requirements contracts`  
**Execution:** Inline, because `gsd-sdk query init.quick` reported optional GSD subagents as not fully installed for the checked runtime.  
**Scope:** Planning, roadmap, requirements, and contract/documentation truth only. No product implementation.

## Reconciliation Rule

Old phase plans are treated as historical intent, not as the current source of truth. Current code, UI, DB migrations, API routes, contracts, runtime docs, and focused tests are the reconciliation sources.

For historical phases, route/API/schema drift is not automatically a bug. If a route, field, or contract from an old plan no longer exists because later phases replaced it, the planning docs should be corrected or annotated instead of forcing current code back to stale wording.

## Classification Labels

- **Complete-current:** Current runtime evidence still matches the phase outcome closely enough.
- **Complete-superseded:** The phase shipped, but later phases changed the route/schema/UI; old wording should not be enforced.
- **Complete-carry-forward:** Foundation exists, but known polish or expansion is intentionally moved to a later phase.
- **Planned-deferred:** Planning artifacts exist, but no reliable runtime evidence was found.
- **Docs-drift:** Planning status was stale relative to code/runtime evidence.

## Phase Range Summary

| Range | Reconcile result | Notes |
|-------|------------------|-------|
| 1-5 | Complete-superseded | Tracked in `.planning/milestones/v1.0-ROADMAP.md`; not duplicated in the active roadmap. |
| 6-16 | Complete-current / complete-superseded | Active roadmap already marks them complete. Requirements still had stale Pending rows and are reconciled to completed historical baseline. |
| 17-40 | Complete-current / complete-carry-forward | Active roadmap already marks them complete. Some implementation details were superseded by later release-native/media phases. |
| 41 | Complete-current | TipTap runtime, migrations, backend service, sanitizer tests, frontend editor/renderer work, and UAT/security artifacts exist. Roadmap status was stale. |
| 42 | Planned-deferred | Collaboration phase has plan/research/context artifacts but no reliable runtime evidence for Yjs/collaboration/presence. Remains open/deferred. |
| 43 | Complete-superseded | Keycloak/app-user foundation exists. Phase 51 later corrected the ID-token vs access-token boundary, so old Phase 43 auth wording must not be re-enforced where superseded. |
| 44 | Complete-current | Permission engine, actions, capability endpoints, protected handlers, and tests exist. Roadmap status was stale. |
| 45 | Complete-current | App-user based fansub member management repository, handlers, UI section, capabilities, self-lockout guard, and docs exist. Roadmap status was stale. |
| 46 | Complete-current | Token-hash invitations, accept flow, capability fields, API helpers, UI accept page, routes, and handler tests exist. Roadmap status was stale. |

## Evidence Highlights

### Phase 41 - TipTap

- DB migrations: `database/migrations/0067_fansub_group_notes_tiptap.*`, `0068_member_group_stories_tiptap.*`, `0069_anime_fansub_project_notes_tiptap.*`, `0070_release_version_notes_tiptap.*`.
- Backend: `backend/internal/services/tiptap_service.go` and `backend/internal/services/tiptap_service_test.go`.
- Frontend/runtime refs: rich text editor/renderer paths and API tests are present in the active frontend tree.
- Phase artifacts: `41-01` through `41-06` have matching summaries, plus `41-UAT.md`, `41-VALIDATION.md`, and `41-SECURITY.md`.

### Phase 42 - Collaboration

- Planning artifacts exist under `.planning/phases/42-tiptap-collaboration-mvp-fuer-fansub-group-notes/`.
- No reliable current runtime evidence was found for a collaboration provider, Yjs document scope, presence, or multi-session collaboration flow.
- Keep Phase 42 as planned/deferred rather than marking it complete from adjacent TipTap work.

### Phase 43 - Keycloak/Auth Foundation

- Runtime/docs evidence: `docs/operations/keycloak-auth-foundation-phase43.md`, `frontend/src/lib/keycloakAuth.ts`, Keycloak proxy routes, backend auth middleware, `app_users` model/repository, and migration `0072_keycloak_app_users_foundation`.
- Supersession note: Phase 51 intentionally corrected the access-token resource-server boundary. That correction is not a Phase 43 bug; it is the current auth contract.

### Phase 44 - Permission Engine

- Backend: `backend/internal/permissions/permissions.go`, `backend/internal/permissions/permissions_test.go`, `backend/internal/repository/authz_permissions.go`, handler calls to `CanForFansubGroup`, `CanForRelease`, and `CanForReleaseVersion`.
- API/UI: capability routes for fansub groups and release versions, frontend capability consumers, and contributor dashboard capability fields.
- Contract/doc evidence: `docs/architecture/fansub-member-management.md`, `docs/frontend/contributor-dashboard-phase48.md`.

### Phase 45 - Fansub Member Management

- Backend: `backend/internal/repository/fansub_group_app_members_repository.go`, `backend/internal/repository/fansub_group_app_members_repository_test.go`, member handlers in `backend/internal/handlers/app_auth.go`.
- DB: `database/migrations/0073_fansub_group_app_memberships.*` and `0074_expand_fansub_group_member_roles.*`.
- Frontend: `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx`, `frontend/src/types/fansub.ts`, and API helpers in `frontend/src/lib/api.ts`.
- Known carry-forward: OpenAPI coverage is partial; current shared OpenAPI does not fully describe all member-management endpoints.

### Phase 46 - Invitations

- Backend: `backend/internal/repository/fansub_group_invitations_repository.go`, invitation handlers in `backend/internal/handlers/app_auth.go`, tests in `backend/internal/handlers/app_auth_test.go`.
- DB: `database/migrations/0076_fansub_group_invitations.*`.
- Frontend/API: invitation types and helpers in `frontend/src/types/fansub.ts` and `frontend/src/lib/api.ts`, accept page at `frontend/src/app/invitations/accept/page.tsx`.
- Routes: `/api/v1/admin/fansubs/:id/invitations`, `/api/v1/admin/fansubs/:id/invitations/:invitationId/cancel`, `/api/v1/invitations/accept`.

## Requirements Reconcile

Stale v1 Pending rows for the completed historical baseline are reconciled:

- `PROV-01` through `PROV-04`: complete from Phase 6 lifecycle/provisioning baseline.
- `UPLD-04`, `UPLD-05`, `LIFE-01`: complete from Phase 8 replace/delete cleanup baseline.
- `LIFE-02` through `LIFE-04`: complete from Phase 6 lifecycle foundation.
- `ENR-05`: complete-superseded by Phase 13 relation follow-through repair and later create/edit enrichment rows.
- `TAG-01` through `TAG-05`: complete-superseded by Phase 10 plus later metadata/create-flow refactors.

New/previously implicit v2 requirement rows should be explicit:

- `TIPTAP-EDITOR-01`
- `TIPTAP-COLLAB-01`
- `AUTH-FOUNDATION-01`
- `AUTHZ-ENGINE-01`
- `FANSUB-MEMBER-MGMT-01`
- `FANSUB-INVITES-01`

## Contract Gaps

- `shared/contracts/openapi.yaml` contains current auth and release-version capability coverage, but does not fully cover `/api/v1/admin/fansubs/:id/members`, member candidate search, member role/status mutation, or invitations.
- The Phase 43 auth foundation was corrected by Phase 51. Future docs should refer to access-token resource-server semantics, not ID-token-as-API-bearer semantics.
- Phase 42 collaboration has no current runtime contract and should not be treated as implemented.

## Roadmap Changes Recommended

- Mark Phase 41 complete with retro-verification note.
- Keep Phase 42 open as planned/deferred.
- Mark Phase 43 complete-superseded with Phase 51 correction note.
- Mark Phases 44-46 complete from runtime evidence, with missing summary artifacts noted as docs drift.

## Remaining Follow-Ups

- Backfill or document missing execution summaries for Phases 43-46 only if the team wants complete artifact symmetry; this is not required to treat runtime work as implemented.
- Add OpenAPI coverage for member management and invitations in a future contract cleanup slice.
- Run a focused UI/live UAT for Phases 44-46 only if current product confidence needs browser-level reconfirmation.
