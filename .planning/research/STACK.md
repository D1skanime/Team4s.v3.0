# Technology Stack

**Project:** Team4s v1.4 Capability-, Review- und Benutzerverwaltung
**Researched:** 2026-08-20
**Mode:** Brownfield validation against the current canonical Linux repository

## Recommended Stack

### Core Framework

| Technology | Current version | Purpose | Why |
|------------|-----------------|---------|-----|
| Go | 1.25.0 | Permission resolution, admin/review handlers and services | Keep the existing `permissions.Service`, repository and Gin-handler seams. The capability registry and review policy already live here; a second authorization framework would split policy truth. |
| Gin | 1.10.0 | HTTP routing and authenticated admin APIs | Add narrow endpoints to the existing `/api/v1/admin/...` route family and keep authorization in handlers/services. No router change is warranted. |
| PostgreSQL | Existing Compose service/migration chain through 0145 | Canonical capability, role, override, delegation and review data | The earlier registry design is already implemented as relational data with foreign keys. Add only the missing user-override schema and focused indexes through new reversible migrations. |
| Next.js / React / TypeScript | Next.js 16.1.6, React 18.3.1, TypeScript 5.7.x | Existing admin user, role-capability, group-member and review UI | Extend the established pages, typed DTOs and central `api.ts`; do not add a separate admin application or client state framework. |
| Keycloak / OIDC | Existing Docker Compose realm | Authoritative global roles and authenticated identity | `platform_admin`, `content_admin`, and `user` realm roles are already emitted in `realm_access.roles` and reconciled JIT. Preserve this boundary: global roles are IdP-managed; fine-grained roles/overrides stay in Team4s. |

**Dependency decision:** No new runtime or frontend dependency is needed for v1.4. The missing work is domain modeling, contracts, queries, UI composition, and test coverage—not library capability.

### Database

| Existing / minimal addition | Status | Purpose | Recommendation |
|-----------------------------|--------|---------|----------------|
| `action_definitions` + `role_capabilities` | Implemented | Data-driven action catalog and role-to-action grants | Reuse unchanged as the base allow layer. Migration `0108_capability_registry.up.sql` already supplies labels, categories, ordering and FK integrity. |
| `role_definitions.assignable` + `contexts` | Implemented but presentation semantics remain confusing | Separates group-picker eligibility from active capability-bearing contexts | Treat the DB columns as canonical facts. Keep `capability_editable` derived from active contexts, but stop using the broadened `FansubGroupRoles()` result as if it meant `assignable=true`. Name APIs/DTOs for their actual meaning. |
| `user_capability_overrides` (new) | Missing | Targeted per-user `allow`/`deny` without mutating roles | Add one canonical table keyed by user + scope + action, with an explicit effect enum/check and audit attribution. Deny must win over role/delegation allow; platform-admin bypass must remain explicit and visible. Do not encode overrides in JSON or reuse review delegation for general rights. |
| `fansub_group_member_review_capabilities` | Implemented | Direct per-membership review delegation for three review actions | Reuse it for Finding #31. It is membership-scoped and deliberately narrower than general user overrides. Add list/grant/revoke API wiring rather than another table. |
| Review lifecycle tables/views | Implemented | Queue, decisions, immutable audit and reasons | Extend queue predicates with actor identity/self-submission handling; do not replace the Phase-107/108 lifecycle. |

### Infrastructure

| Technology | Status | Purpose | Why |
|------------|--------|---------|-----|
| Docker Compose on `team4s-linux` | Existing | Backend, frontend, PostgreSQL, Redis, Keycloak and Mailpit runtime | Keep all development and verification in the canonical `/home/d1sk/team4s` tree. No host-installed service is required. |
| Shared OpenAPI contracts | Existing | Backend/frontend contract truth | Update `shared/contracts/openapi.yaml` and focused admin contracts together with handlers, DTOs, TS types and `frontend/src/lib/api.ts`. |
| In-memory permission cache | Implemented | Hot-path role capability lookup | Keep startup load and post-mutation reload. Improve mutation responses/observability so a successful DB write with failed cache reload is not presented as immediately effective. |

### Supporting Libraries and Existing Seams

| Library / seam | Current version or file | Purpose | When to use |
|----------------|-------------------------|---------|-------------|
| pgx | 5.7.1 | Transactional repositories and PostgreSQL queries | Override mutations, effective-right projection, delegation wiring and queue filtering. |
| go-oidc | 3.18.0 | Verified Keycloak token claims | Preserve `realm_access.roles` extraction; do not parse JWTs in handlers. |
| Existing UI primitives | `frontend/src/components/ui` | Tables, drawers, cards, badges, loading/error/empty states | Reuse for the desktop-first admin layout with graceful narrow-screen overflow. |
| Vitest + Testing Library + axe | Vitest 3.2.4 and current dev dependencies | Frontend behavior, accessibility and responsive-state coverage | Add focused tests for provenance, deny precedence, delegation toggles and queue separation. |
| Go unit/Postgres migration tests | Existing backend test structure | Resolver, repository, migration and authorization contracts | Mirror `capability_registry_test.go`, review service/repository tests, and migrated-schema test support. |

## Current Analysis Reconciliation

### Already implemented

- **Capability registry and cache:** `database/migrations/0108_capability_registry.up.sql` creates and seeds `action_definitions` and `role_capabilities`. `backend/internal/repository/authz_permissions.go` loads the matrix, while `backend/internal/permissions/permissions.go` performs the startup consistency check and serves cached lookups. The historical claim that the Go `roleMatrix` is the only truth is stale. The map remains only as a pre-load/test fallback and is therefore still a drift hazard, not the live steady-state source.
- **Editable capability administration:** `backend/internal/handlers/admin_capability_handler.go`, `backend/internal/repository/authz_capability_mutations.go`, `shared/contracts/admin-capabilities.yaml`, `frontend/src/lib/api.ts`, and `frontend/src/app/admin/role-capabilities/*` already provide matrix read and role grant/revoke with audit and cache reload.
- **Action metadata:** labels, categories and sort order are DB-backed. Migration `0134_review_foundation.up.sql` adds the `review` category. The remaining stale part is frontend presentation: `capabilityCategories.ts` and `RoleCapabilityDetail.tsx` still duplicate a three-category map/order and rely on fallback for `review`.
- **IdP global-role synchronization:** `infra/keycloak/realm-team4s.json` defines and maps `platform_admin`, `content_admin`, and `user`; `backend/internal/auth/oidc.go` extracts verified realm roles; `backend/internal/middleware/current_user_auth.go` invokes `SyncGlobalRolesFromKeycloak` on each authenticated request; `backend/internal/repository/authz_keycloak_sync.go` reconciles the three managed roles bidirectionally. The proposed “Phase 0” is already shipped. `AUTH_ADMIN_BOOTSTRAP_USER_IDS` remains a documented deprecated fallback in config/bootstrap code.
- **Review policy foundation:** migration `0134_review_foundation.up.sql`, `review_delegation_repository.go`, and `review_service.go` already implement constrained direct delegations, transactional grant/revoke, eligibility checks and audit. `CanReviewForFansubGroup` consumes persisted grants.
- **Queue filtering by review kind:** `release_review_handler.go` derives allowed text/image kinds server-side with `CanReviewForFansubGroup`, and `release_review_query_repository.go` applies `source.review_kind = ANY(...)`. Thus Finding #32 is partial, not wholly missing.

### Still needed or partially implemented

- **Per-user effective rights and overrides:** no `user_capability_overrides` schema, repository, service, handler, contract or UI exists. `UserGroupRightsTab.tsx` is only a two-boolean read-only summary. Its repository query explicitly calls the booleans heuristics and still hardcodes `('fansub_lead','editor','contributor')`; it is unsuitable as an authorization source. Replace the projection with the full capability list plus provenance, then layer explicit user effects into central resolution.
- **Assignable truth cleanup:** `role_definitions.assignable` exists, but `LoadFansubGroupRoles` includes `assignable=true OR fansub_group context OR anime_contribution context`. The handler then calculates `Assignable` through `IsKnownFansubGroupRole`, so the API field does not strictly mean the DB column. The later `capability_editable` split fixed part of the problem, but the naming/source ambiguity remains. Prefer repository-returned DB `assignable` for the DTO and a separately named active-context catalog for validation/editability.
- **Cache outcome contract:** capability grant/revoke persists first and logs reload failures while returning success. `RoleCapabilityClient.tsx` says changes become effective “typically within seconds”, but no retry or status exists. Since reload is synchronous and there is no background reloader shown, this copy is misleading. Return/record an `effective_immediately` or cache-generation outcome, or fail with an explicit “saved, activation pending” response and operational retry path.
- **Delegation endpoints and UI:** no route or handler calls `ReviewService.GrantDelegation`/`RevokeDelegation`; only tests and service code do. `FansubAppMemberEditorPanel.tsx` has no review delegation controls. Add typed list + idempotent grant/revoke endpoints under the existing group-member ownership seam, and a fourth focused section/tab in that editor.
- **Self-submission queue policy:** queue predicates filter group, allowed kind and status but receive no actor ID and do not exclude `submitter_app_user_id`. The decision service blocks self-review later, producing the observed non-actionable rows. Add actor ID to queue options and server predicates. If own pending submissions remain visible, return them through an explicit separate view/section and exclude them from actionable counts and “next”.
- **Contribution review kind:** the generic permission model includes `review.contribution.decide`, but the current release-review queue validates only `text` and `image`. Treat contribution review as its existing separate domain surface unless roadmap scope explicitly consolidates it; do not silently broaden this queue contract.
- **Admin responsive architecture:** `RoleCapabilityClient.tsx` still owns a JS `matchMedia('(max-width: 759px)')` hook and substantial inline layout styles, while `roleCapabilities.module.css` switches at 860px. The old warning remains current. Use the existing CSS module and container/media queries for layout; use JS state only for true interaction, not viewport classification. Preserve desktop-first master/detail and make narrow screens non-breaking through overflow/drawer primitives.
- **Dead UI:** `RoleCapabilityTable.tsx`, `GrantCapabilityModal.tsx`, and `RevokeCapabilityModal.tsx` still exist and have no imports. Remove them in the UI cleanup phase after confirming no dynamic use.
- **Indexes:** PKs cover `role_capabilities(role_code, action_code)` and delegation lookups by `(fansub_group_member_id, action_code)`. Current live schema has no reverse `role_capabilities(action_code, role_code)` index, although lockout/impact queries count by action; add it if `EXPLAIN` on representative seeded volume justifies it. Queue source tables already have Phase-108 queue indexes. Add actor/self filters with matching indexes only after query-plan validation—avoid speculative indexing of tiny catalogs.
- **Fixtures/tests:** retain Phase-134 reference profiles only where they cover public behavior. v1.4 needs a dedicated reset/seed matrix with at least platform admin, content admin, group lead, delegated reviewer, non-reviewer, self-submitter, multi-role user, allow override and deny override. Do not retire known-good fixtures until the replacement is versioned, idempotent and proves migration fresh/up/down plus the expired-access/valid-refresh browser path.

## Effective Permission Resolution Order

Use one central resolver and expose its provenance in the user inspector:

1. Disabled user → deny.
2. Platform-admin bypass → allow with explicit `platform_admin` reason (not editable as a normal override).
3. Matching per-user deny override → deny.
4. Matching per-user allow override → allow.
5. Narrow review delegation for review actions → allow.
6. Role-derived capability from the DB-backed cache → allow, retaining every granting role as provenance.
7. Otherwise → deny.

Scope keys must reuse real domain identifiers (at minimum group membership/group context); do not make a global user override accidentally grant rights in every fansub group. Define the exact supported scopes in the phase contract before migration.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Authorization engine | Extend Team4s `permissions.Service` | Casbin, OPA, Cedar or another generic policy engine | Existing tables, resolver contexts, audit and review rules already encode the domain. A second engine adds translation and two-policy drift without solving the UI/provenance work. |
| General user exceptions | New canonical relational override table | Put exceptions into Keycloak roles or reuse member review delegation | Keycloak owns global roles, not group-scoped fine rights. Review delegation accepts only three review actions and has different eligibility/audit semantics. |
| Review delegation | Wire existing service/repository | Fold into general overrides immediately | The direct membership-scoped mechanism is already implemented and audited; replacing it adds migration risk and loses its narrow invariant. |
| Client data | Existing central API helpers and local page state | New global state/cache library | Admin tabs are entity-scoped and already have loading/error boundaries. Server pagination and grouped DTOs solve scale without a client framework. |
| Responsive UI | CSS modules/container or media queries plus existing Drawer/Table primitives | JS viewport hook | Avoids hydration flash, resize listeners and the current 759px/860px split. |

## Installation

No package installation is recommended.

```bash
# Use the existing Compose/runtime and lockfiles; add no dependency for this milestone.
docker compose ps
```

## Verification Baseline

- Migration fresh/up/down tests for the override table, constraints and indexes.
- Resolver table tests proving deny precedence, scoped allow, role provenance, review delegation, disabled user, and platform-admin bypass.
- Contract tests keeping Go DTOs, OpenAPI, TypeScript types and `api.ts` aligned.
- Repository tests proving actionable queue excludes self-submissions and unauthorized kinds from list, counts and next navigation.
- Frontend tests for the effective-right inspector, guided revoke impact, delegation toggles, grouped user data, CSS-responsive structure and keyboard/axe behavior.
- Live UAT through `127.0.0.1:3300`, including expired/absent access token with valid refresh session.

## Sources and Confidence

All claims are based on the current repository and live migrated schema on 2026-08-20; confidence is **HIGH** for implementation status and **MEDIUM** for proposed index additions pending representative `EXPLAIN (ANALYZE, BUFFERS)` results.

- `.planning/PROJECT.md`
- `.planning/notes/capability-registry-design.md`
- `.planning/notes/milestone-intent-rechte-benutzerverwaltung.md`
- `.planning/notes/live-uat-ux-findings.md` Findings #29–#32
- `database/migrations/0108_capability_registry.up.sql`
- `database/migrations/0112_role_model_cleanup.up.sql`
- `database/migrations/0134_review_foundation.up.sql`
- `database/migrations/0135_release_review_lifecycle.up.sql`
- `backend/internal/permissions/permissions.go`
- `backend/internal/repository/authz_permissions.go`
- `backend/internal/repository/authz_capability_mutations.go`
- `backend/internal/handlers/admin_capability_handler.go`
- `backend/internal/repository/authz_keycloak_sync.go`
- `backend/internal/middleware/current_user_auth.go`
- `backend/internal/services/review_service.go`
- `backend/internal/repository/review_delegation_repository.go`
- `backend/internal/handlers/release_review_handler.go`
- `backend/internal/repository/release_review_query_repository.go`
- `frontend/src/app/admin/role-capabilities/*`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx`
- `shared/contracts/admin-capabilities.yaml`
- `shared/contracts/openapi.yaml`
