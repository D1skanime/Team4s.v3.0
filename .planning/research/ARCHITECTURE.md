# Architecture Patterns

**Domain:** Team4s v1.4 capability, review, and user administration
**Researched:** 2026-08-20
**Confidence:** HIGH — current Linux repository and contracts inspected

## Recommended Architecture

Extend the existing authorization pipeline with one explicit per-user override layer. Do not create a second permission or authentication system.

```text
verified Keycloak token
 -> CurrentUserMiddleware (app user + JIT global-role sync)
 -> permissions.Actor
 -> permissions.Service
      disabled/unauthenticated guard
      platform_admin bypass
      exact scoped user deny (wins for normal users)
      exact scoped user allow
      group/contribution role -> cached role_capabilities
      specialized direct review delegation for review actions
 -> protected operation
```

The effective-rights inspector must use the same resolver semantics and return provenance; it must not reproduce authorization in handler SQL or React. UI ownership stays where it already lives:

- `/admin/users/{id}` is the canonical per-user inspector and override surface.
- `/admin/role-capabilities` remains the shared role-matrix surface.
- `/admin/fansubs/{id}/edit` remains the canonical group-member and review-delegation surface.
- The release-review handler/repository remain the server-side relevance and security boundary for queues.

### Component Boundaries

| Component | Current responsibility | Narrow v1.4 extension |
|---|---|---|
| `auth/oidc.go`, `middleware/current_user_auth.go` | Validate JWT, ensure app user, reconcile Keycloak realm roles, build trusted identity | No parallel auth logic |
| `repository/authz_keycloak_sync.go` | Reconciles only `platform_admin`, `content_admin`, `user` into `app_user_global_roles` | Preserve IdP authority; app UI stays read-only |
| `permissions/permissions.go` | Central policy, platform-admin bypass, role/cache and review checks | Evaluate scoped user overrides and expose shared provenance primitives |
| `repository/authz_permissions.go` | Resource, group-role, contribution-role and verified review-context resolution | Add indexed override reads/effective projection support |
| `action_definitions` + `role_capabilities` | DB truth for actions and role grants | Reuse unchanged as base matrix |
| `permissions.LoadCache/ReloadCache` | Atomic in-memory shared role matrix | Keep user overrides out of this process-global cache |
| `fansub_group_member_review_capabilities` + `review_delegation_repository.go` | Membership-bound direct review grants; idempotent transaction-friendly mutations | Add service/handler/routes/contracts, not duplicate SQL |
| `release_review_handler.go` | Maps permitted actions to queue kinds; gates list/count/detail/next/decision | Add trusted actor exclusion for actionable rows |
| `release_review_query_repository.go` | Stable cursor queue and shared predicates | Apply actor-aware semantics consistently to list/count/detail/next |
| `admin_users_handler.go` + `admin_users_tab_repository.go` | Platform-admin user tabs; rights tab currently has two heuristics | Replace heuristics with full effective-capability/provenance projection and exact override endpoints |
| `UserGroupRightsTab.tsx` | Existing per-user rights seed | Expand, do not replace: provenance, allow/deny, guided revoke, impact preview |
| `UserContributionsTab.tsx`, `UserMediaTab.tsx` | Flat release-version lists | Consume backend-grouped, filtered, paginated projections |
| `FansubAppMemberEditorPanel.tsx` | Roles, media rights, history for exact membership | Add review-rights tab/section |
| `ReleaseReviewsSection.tsx` | Group review queue | Render server-defined actionable work; separate own submissions if retained |
| `frontend/src/lib/api.ts`, frontend types, OpenAPI | Central refresh-aware transport and contract | Add synchronized DTOs/helpers only here |

## Verified Current Model

### Global roles and platform-admin bypass

`platform_admin`, `content_admin`, and `user` are Keycloak-managed global roles, not `role_definitions` rows. `oidc.go` extracts `realm_access.roles`; `KeycloakCurrentUserResolver` calls `SyncGlobalRolesFromKeycloak` on every authenticated request; `UserGlobalRolesTab.tsx` already renders them read-only as “aus IdP”. The older IdP/JIT proposal is implemented. `AUTH_ADMIN_BOOTSTRAP_USER_IDS` is deprecated fallback and must not be expanded.

`platform_admin` deliberately bypasses scoped checks in `permissions.Service` and protects platform management handlers. Effective-rights responses must show this as `platform_admin_bypass`. Generic user denies should not silently neutralize it; changing that is a separate security decision.

### Fine-grained roles and capabilities

Group roles live in `fansub_group_member_roles`; contribution roles live in `anime_contributions` / `anime_contribution_roles`. Migration `0108` created `action_definitions` and `role_capabilities`; startup loads them into the permission cache and matrix mutations atomically reload it. The old data-driven registry proposal is implemented.

The static `roleMatrix` remains only a pre-load/unit-test fallback. Production additions must use DB definitions/cache, not extend a second hardcoded source.

`GetUserGroupRights` is explicitly only a display heuristic: it hardcodes roles into `can_edit_content` and exposes only two booleans. Replace this read model; do not add more heuristic columns.

### Proposed user overrides

No generic user override schema or resolver exists. Add a group-scoped first version:

```text
user_capability_overrides(
  app_user_id, action_code -> action_definitions.code,
  scope_type='fansub_group', scope_id,
  effect='allow'|'deny', reason,
  created_by_app_user_id, created_at, updated_at,
  UNIQUE(app_user_id, action_code, scope_type, scope_id)
)
```

All Findings #29–#32 are group-context problems, so do not introduce ambiguous global overrides yet. Resolve normal users as exact deny -> exact allow -> existing role/contribution/delegation logic. Do not persist effective rows. Project effective state from catalog, roles, overrides and delegations, returning action, effective result, scope, all granting roles, matching override, review-delegation source and platform-admin flag.

User override mutations do not reload the shared role matrix. Existing role-matrix PUT/DELETE currently return success even if `ReloadCache` fails (failure is logged and old cache retained); v1.4 UI/API feedback must truthfully distinguish persistence from immediate cache activation.

### Review delegation

Migration `0134`, `ReviewDelegationRepository`, `ResolveActorReviewGrantContext`, and `CanReviewForFansubGroup` already implement and enforce direct grants. A valid reviewer needs an active app user, active canonical membership, verified member claim, and either `fansub_lead` or an exact grant; platform admin bypasses. Missing pieces are management routes, handler/service wiring, contracts, API helper and UI.

Keep this specialized membership-bound model. It carries identity/lifecycle/audit semantics that generic user overrides do not. The effective inspector may display review delegation as provenance, but generic override endpoints must not mutate it.

### Review queue

Finding #32 is partially implemented. `ReleaseReviewHandler.authorizedKinds` already calls `CanReviewForFansubGroup` for text/image and passes allowed kinds into List, Counts, Detail and Next. The defect is actor attribution: `ReleaseReviewQueueOptions` has no actor/member exclusion, so own pending submissions remain visible.

Add trusted `ActorAppUserID`/verified member IDs to repository options, never from query parameters. Normal actionable predicates must exclude self-submissions, and Counts/Detail/Next must share the semantics. Platform-admin self-review already requires an explicit override reason; keep such work in a clearly separate admin-override lane or exclude it from the normal lane. Contribution review is not currently part of this release queue: allowed kinds validate only text/image and contribution count is hardcoded to zero.

## Data Flows

### Effective rights

```text
UserGroupRightsTab -> api.ts
 -> GET effective capabilities for user + group
 -> requirePlatformAdminIdentity
 -> shared resolver/projection
 -> action catalog + memberships/roles + role_capabilities
    + user overrides + review delegations
 -> provenance-rich DTO

PUT/DELETE one user/action/group override
 -> validate target/action/scope/effect
 -> transaction + immutable audit
 -> effective post-state/refetch
```

### Review delegation

```text
FansubAppMemberEditorPanel
 -> GET/PUT/DELETE exact membership review action
 -> group-member-manage authorization
 -> service transaction
 -> LockMembership + validate group/status/claim
 -> ReviewDelegationRepository GrantAction/RevokeAction + audit
```

Use canonical `fansub_group_member_id`, not a free user/group pair. Accept only the three known review actions. Reuse member-management authorization unless requirements explicitly add a narrower delegation-management action.

### Actionable queue

```text
ReleaseReviewsSection -> list/count
 -> handler resolves trusted actor + allowed kinds
 -> repository gets allowed kinds + actor identity
 -> one shared predicate for list/count/detail/next
 -> only actually decidable normal-lane rows
```

## Patterns to Follow

### One policy resolver, multiple projections

Authorization and explanations must share resolution inputs. Extract narrow primitives for roles, overrides and delegations usable by both `permissions.Service` and admin projections. The browser must never merge a role matrix into security truth.

### Exact scoped, audited mutations

Address one user, one action and one group. Use FK/check constraints, idempotent upsert/delete, platform-admin or group-manager authorization, immutable audit payloads and post-mutation effective state.

### Server aggregation before pagination

For Finding #30, compare release-version role sets against project defaults in backend SQL/service code, group by anime/group, and paginate stable parent groups. Do not download flat rows and collapse them in React; that breaks scalability and pagination semantics.

## Anti-Patterns to Avoid

- **Parallel evaluator:** no handler SQL or React authorization clone; extend `permissions.Service` and shared resolution seams.
- **Genericizing review grants:** do not move membership review grants into user overrides.
- **Caching user overrides globally:** batch indexed overrides per actor/scope; avoid cross-user cache invalidation/leakage.
- **Client-only queue cleanup:** otherwise counts, cursors, next and direct detail remain wrong.
- **App mutation of global roles:** Keycloak overwrites it on the next authenticated request; keep UI read-only.
- **Persisted effective permissions:** they drift from roles, overrides and membership lifecycle.

## Build Ordering

1. **Schema and contracts:** scoped override table, provenance DTOs, exact endpoints, constraints/indexes and audit semantics; document platform-admin bypass.
2. **Central resolution:** override evaluation in `permissions.Service` plus shared effective-rights projection; remove the heuristic group-rights output.
3. **Finding #29 UI:** expand `UserGroupRightsTab` with provenance, allow/deny and guided revoke/impact preview.
4. **Finding #30 projections:** server-side true-deviation detection, anime grouping, filters and stable pagination for contributions/media.
5. **Finding #31 wiring:** service/handler/routes/contracts/helpers and member-editor controls over the existing delegation repository.
6. **Finding #32 queue:** actor-aware filtering across list/count/detail/next and a deliberate own-submissions lane if required.
7. **Security/live UAT:** expired access token + valid refresh session; platform-admin explanation; deny precedence; membership loss; delegation grant/revoke; self-review exclusion; cache-reload warning; cursor stability.

#31 must precede final #32 UAT because a delegated non-lead reviewer is the representative actor needed to prove actionable filtering.

## Scalability Considerations

| Concern | Recommended approach |
|---|---|
| Shared role checks | Keep existing atomic cache and startup consistency check |
| User overrides | Index `(app_user_id, scope_type, scope_id, action_code)` and batch-load per request/context |
| Inspector | Paginate groups; filter/search action catalog server-side if needed |
| Contributions/media | Keyset-page stable anime/context groups, not expanding release-version rows |
| Review queue | Include actor-view semantics in cursor scope so cursors cannot cross actionable/own lanes |

## Status of Earlier Proposals

| Proposal | Status | Evidence |
|---|---|---|
| DB-driven capability registry | Implemented | migration `0108`, `LoadCache`, capability repository/handler/routes |
| DB-driven role catalogs | Implemented | `LoadFansubGroupCatalog`, `IsKnownFansubGroupRole`, `IsCapabilityBearingRole` |
| Keycloak global-role JIT | Implemented | `oidc.go`, `current_user_auth.go`, `authz_keycloak_sync.go` |
| Global roles read-only | Implemented | `UserGlobalRolesTab.tsx` |
| Generic user allow/deny | Missing | no schema/repository/service/contract found |
| Direct review grants | Model/enforcement present; management missing | migration `0134`, delegation repository, permission service; no routes/UI |
| Queue capability-kind filtering | Present for text/image | `ReleaseReviewHandler.authorizedKinds` |
| Queue self-submission filtering | Missing | no actor exclusion in queue options/predicates |

## Sources

HIGH-confidence repository evidence: `.planning/PROJECT.md`; the two capability/milestone notes; Findings #29–#32; migrations `0108` and `0134`; `backend/internal/{auth,permissions,middleware,repository,handlers}` files named above; `backend/cmd/server/{main.go,admin_routes.go}`; `shared/contracts/{openapi.yaml,admin-capabilities.yaml}`; `frontend/src/app/admin/{users,role-capabilities,fansubs/[id]/edit}`; `frontend/src/lib/api.ts` and associated types/tests.
