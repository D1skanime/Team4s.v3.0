# Phase 44: App Permission Engine fuer Fansub-, Release- und Media-Kontexte - Research

**Researched:** 2026-05-13
**Domain:** Team4s backend authorization, fansub release/media domain boundaries, capability-driven admin UI
**Confidence:** High for branch-reality findings, medium for Phase-43 dependency because the required auth foundation is planned but not visible in the current branch

---

## Existing Team4s Seams

### 0. Phase 44 needs a deliberate schema/codebase pre-analysis before implementation

The phase brief now explicitly requires a bestandsanalyse before any new permission package, migration, or audit structure is implemented.

That means the execution pass must first document:
- which user/app-user tables really exist
- which Keycloak mapping columns really exist
- which fansub membership and role tables really exist
- which owner columns exist on media/release resources
- which auth middleware, admin seams, repositories, and frontend API/UI seams already exist

Planning implication:
- Phase 44 should prefer extending existing tables/services/repositories/middleware over introducing a parallel user, role, membership, audit, or media-context model
- only a minimal migration is justified when the analysis proves a required seam is genuinely missing
- if the analysis leaves a business ambiguity, execution should stop with a blocker question instead of guessing

### 1. Current auth/authz is still legacy and duplicated

The currently visible branch still uses:
- signed Team4s-issued bearer tokens
- Redis-backed session and revoke state
- `CommentAuthMiddlewareWithState(...)` for authenticated requests
- duplicated `requireAdmin(...)` helpers in:
  - `backend/internal/handlers/admin_content_authz.go`
  - `backend/internal/handlers/fansub_admin.go`

The current admin gate is global-only:
- load identity from middleware
- check one role name through `backend/internal/repository/authz.go`
- allow or deny

Implication for Phase 44:
- the phase should replace duplicated global-admin checks with one central authorizer seam
- the new seam must be composable enough to answer group-scoped release/media questions

### 2. The branch does not currently expose the planned Phase-43 app-user tables

Codebase inspection did not find:
- `app_users`
- `app_user_global_roles`
- `fansub_group_members`
- `fansub_group_member_roles`
- `CurrentUser` resolved from Keycloak
- `/api/me`
- Keycloak/JWKS validation code

This matters because the Phase-44 permission engine is defined against those seams, not against the legacy `users` + `user_roles` model.

Planning implication:
- Phase 44 execution needs a pre-flight check that the Phase-43 auth foundation is present
- if the branch is still on legacy auth when execution starts, treat that as a blocker to merge/rebase/fetch the missing seam, not as permission to silently widen scope

### 3. Release/media/notes endpoints already exist and are good first adopters

Priority backend surfaces already present in the codebase:
- fansub group CRUD and members management via `FansubHandler`
- admin release reads via `admin_content_fansub_releases_handlers.go`
- release-version media CRUD via `admin_content_release_version_media.go`
- fansub-group notes and release-version notes handlers under `AdminContentHandler`

These are good adoption targets because:
- they already have strong domain anchors (`fansubID`, `releaseId`, `versionId`, media relation IDs)
- they are close to the fansub/release/media boundaries the user explicitly cares about
- they currently rely on global admin only, so Phase 44 can create obvious value without redesigning the routes first

### 4. Audit exists only in a narrow anime-specific form

Current durable DB audit example:
- `admin_anime_mutation_audit`
- helper builder/insert seam in `backend/internal/repository/admin_content_anime_audit.go`

Other audit-like logic exists only as runtime/security helpers, e.g. playback Redis audit keys.

Planning implication:
- there is no existing generic, reusable audit log table for release/media/role/description mutations
- a minimal generic `audit_logs` table is justified for Phase 44 unless a hidden app-auth audit seam appears with Phase 43

### 5. The release/media domain already gives the right truth source for context resolution

The inspected repository and handler seams already indicate the correct direction for permission context resolution:
- release and release-version handlers already pivot around stable resource IDs
- release media is already anchored in the release-native media stack rather than episode-bound media
- the domain schema document makes it clear that fansub context must be derived through release/release-version group relations, not by trusting request payload hints

Planning implication:
- context resolvers should be built as a reuse layer over the existing release/media repositories first
- handler-local authz joins would be a regression because they duplicate domain truth and risk resolving the wrong group

---

## Architecture Recommendation

### Recommendation 1: Add one dedicated backend permission package

Create a dedicated package, e.g.:
- `backend/internal/permissions`
- or `backend/internal/authz`

That package should own:
- action constants
- role constants
- static role matrix
- permission context types
- decision result type
- context resolution helpers
- `Can(...)`
- `RequirePermission(...)`
- a documented pre-flight analysis seam or checklist used before deciding whether any new migration is needed

Why:
- today role checks are duplicated inside handlers
- moving checks into a package keeps both handlers and future services honest
- capability endpoints can reuse the same authorizer instead of inventing separate frontend booleans

### Recommendation 2: Model actions as constants, not ad-hoc strings

The user explicitly wants centralized permission codes. In Go, that should become:
- typed string constants or a dedicated `type Action string`

Good pattern:
- one authoritative action registry file
- grouped constants by domain
- helper lists only where needed for tests/docs

Avoid:
- free-form `"release_media.upload"` strings spread through handlers
- frontend-generated action names

### Recommendation 3: PermissionContext must be sparse but resolvable

The requested context fields are correct:
- `fansub_group_id`
- `anime_id`
- `episode_id`
- `release_id`
- `release_version_id`
- `release_media_id`
- `target_user_id`
- `resource_owner_user_id`

Recommended behavior:
- handlers pass the narrowest truthful identifier they already have
- the permission layer resolves the rest via repository queries
- context resolution is not left to the frontend
- frontend-supplied context fields are advisory at best and must lose against DB truth
- resolver code must be centralized; handlers must not reconstruct authz context privately

Examples:
- `release_version_id` -> load `release_id`, `episode_id`, `anime_id`, `fansub_group_id`
- `release_media_id` -> load `release_id` then the upstream release/group context
- member-role description mutation -> carry `target_user_id` or resource owner info if delete-own/own-edit semantics matter
- description targets must also resolve through one central path so note/description handlers cannot diverge

Precondition before implementation:
- inspect the existing repository layer for reusable queries before adding new permission-specific repositories
- if the existing repository shape is insufficient, add the smallest extension necessary instead of a second parallel lookup stack

### Recommendation 4: Split evaluation into resolution + matrix + special rules

The cleanest mental model is:

1. Resolve actor
2. Resolve resource context
3. Short-circuit for unauthenticated / disabled / platform_admin
4. Load relevant group membership + roles
5. Evaluate role matrix
6. Apply special rules like `delete_own`
7. Return a structured decision

That structure will make tests much easier than embedding all logic in one giant handler helper.

### Recommendation 5: Use structured decisions, not only `bool`

The user asked for `Can(...) bool/result` and `RequirePermission(...)`.

Prefer:
- `Can(...) (Decision, error)` or `Decision` with reason codes
- `RequirePermission(...)` translating that into:
  - 401 when not authenticated
  - 403 when authenticated but unauthorized
  - 404 when the resource truly does not exist
  - 403 or 404 for invalid/mismatched context per project convention
  - 500 on internal failures only

Useful decision metadata:
- `allowed`
- `reason`
- `reason_code`
- `resolved_context`
- `matched_role`
- `matched_scope`

That metadata can power:
- better logs
- better tests
- capability endpoints

### Recommendation 6: Start with group-scope production support, but shape for future scopes

The phase only needs productive `scope_type = group`.

Good Phase-44 compromise:
- store scope-related enums/constants for `group`, `anime`, `release`, `release_version`
- fully implement resolution/evaluation only for `group`
- keep the matrix and role grants shaped so future scopes can slot in later

Avoid:
- pretending future scopes work when only their enum values exist
- half-implemented scope inheritance that would silently grant wrong access

### Recommendation 6b: Encode the coop rule centrally

For release-version and release-media contexts, a single resource may belong to multiple fansub groups through coop relations.

Phase-44 rule:
- resolve all participating `fansub_group_id`s
- allow when the actor has at least one active participating-group role that grants the action
- never derive `fansub_group.members.manage` from coop participation

This rule belongs in the permission engine, not in route-specific conditionals.

### Recommendation 7: Capability endpoints should be resource-specific facades over the same authorizer

Do not build a second policy layer for capabilities.

Instead:
- resolve the same resource context
- evaluate the same actions
- shape the response into frontend-friendly booleans

Example:
- `canViewGroup` -> `fansub_group.read`
- `canEditGroup` -> `fansub_group.update_basic`
- `canUploadMedia` -> `release_media.upload`

This keeps backend enforcement and UI affordance aligned.

Additional invariants:
- if the actor cannot read the underlying resource, the capability endpoint itself returns 403
- capability responses must not be globally cached per user
- capability reload triggers should include role changes, context switches, drawer open, and relevant mutations
- frontend capability adoption should reuse existing admin API client and page/drawer seams instead of introducing a standalone client-side permission store

### Recommendation 8: Frontend integration should stay intentionally thin

The frontend currently pulls raw data through `frontend/src/lib/api.ts` and renders large admin pages.

For Phase 44 MVP:
- add typed capability DTOs to `api.ts`
- fetch capabilities near the relevant page/drawer state
- hide/disable CTA buttons and tabs based on those booleans
- surface 403 responses with specific, understandable error copy

Do not:
- introduce a global client-side policy engine
- infer permissions from role names in React state
- block backend work on a larger auth store refactor

---

## Priority Endpoint Map

### Fansub group and membership

Current relevant surfaces:
- `FansubHandler` edit/create/delete group flows
- `fansub_group_members.go`
- public list/read routes should stay separate from admin mutation checks

Phase-44 priority mapping:
- `fansub_group.read`
- `fansub_group.update_basic`
- `fansub_group.members.view`
- `fansub_group.members.manage`

### Releases and release versions

Current relevant surfaces:
- `admin_content_fansub_releases_handlers.go`
- release drawer and release fetch APIs in frontend/admin fansub edit flow

Phase-44 priority mapping:
- `release.read`
- `release.create`
- `release.update`
- `release.delete`
- `release_version.read`
- `release_version.create`
- `release_version.update`
- `release_version.delete`

### Release media

Current relevant surfaces:
- `admin_content_release_version_media.go`
- `frontend/src/lib/api.ts` release-version media helpers
- release drawer summary and release-version editor media flows

Phase-44 priority mapping:
- `release_media.read`
- `release_media.upload`
- `release_media.update`
- `release_media.delete`
- `release_media.delete_own`

### Descriptions and notes

Current relevant surfaces:
- fansub group notes
- anime fansub project notes
- release version notes

The user's action names mention release/member-role/translation/qc descriptions. In the current codebase, those likely map first onto notes/note-like write endpoints rather than classical `description` columns only.

Planning implication:
- the permission layer should use action names from the brief
- endpoint adoption should document which concrete handler maps to which action

---

## Audit Recommendation

### Why a generic audit table is warranted

The existing anime audit table is too narrow:
- one entity family
- one mutation taxonomy
- not reusable for role assignments or release-media actions

Phase 44 needs at minimum:
- actor
- action
- scope/resource identifiers
- target user if applicable
- payload snapshot or summary
- timestamp

Suggested shape:
- `audit_logs`
- columns such as `id`, `actor_app_user_id`, `action`, `resource_type`, `resource_id`, `fansub_group_id`, `release_id`, `release_version_id`, `target_app_user_id`, `payload_json`, `created_at`

Keep it intentionally small and append-only.

But only after pre-analysis:
- if Phase 43 or other unseen work already introduced a generic audit seam, reuse it
- do not create a second audit model only because the anime-specific helper was the first visible one

Additional recommendation:
- successful critical mutations must be audited durably
- denied critical mutation attempts should also be logged with `reason_code` whenever the audit seam exists or can minimally support it
- this is especially useful for permission debugging once group-scoped self-service is introduced

---

## Testing Recommendation

### Permission engine tests

Must cover:
- `platform_admin` always allowed
- disabled user denied
- non-member denied for group-scoped action
- `fansub_lead` allowed for own group but denied for other group
- `designer` allowed for media upload but denied member management
- `editor` allowed for description editing
- `delete_own` only when actor matches owner
- manipulated `fansub_group_id` from a request is ignored or rejected in favor of DB truth
- `release_version_id` resolves the correct fansub-group set
- `release_media_id` resolves the correct release/release-version/fansub-group context
- coop release allows a qualified actor from any participating group
- coop release denies actors from non-participating groups
- ownership comes from DB owner fields only; `modified_by_user_id` never qualifies as ownership

### Pre-analysis output requirement

The final implementation report for Phase 44 should start with a compact "Ist-Analyse" section that states:
- relevant DB tables found
- relevant columns found
- relevant auth/user middleware found
- existing role/admin logic found
- existing API/frontend conventions found
- which existing structures were reused
- whether new migrations were needed or not

### Handler tests

Add focused handler regression tests that prove:
- protected route returns 403 when actor lacks permission
- same route succeeds when allowed
- capability endpoint matches backend enforcement for the same resource

### Frontend tests

Keep minimal but useful:
- button hidden/disabled when capability false
- 403 error shown with user-facing message
- no hard-coded role-name checks remain in touched screens

---

## Risks

### Biggest risk: Phase-43 dependency drift

If execution starts on a branch that still only has:
- legacy `user_roles`
- no `CurrentUser`
- no app-user tables

then implementers will be tempted to retrofit Phase 44 onto the wrong seam. That would create another permission migration later.

Mitigation:
- explicit pre-flight gate in Plan 44-01
- if Phase-43 auth seams are absent, stop and merge/rebase that work first

### Biggest security risk: leaking wrong group context from release/resource resolution

The permission engine is only correct if:
- `release_version_id`
- `release_media_id`
- note IDs

resolve to the correct canonical fansub group. Any shortcut here risks attaching permissions to the wrong group.

Mitigation:
- central context resolvers
- repository tests for ownership/context resolution
- no duplicate ad-hoc SQL in handlers

### Biggest product risk: frontend/backed divergence

If capability booleans diverge from backend enforcement, the UI will become misleading.

Mitigation:
- capability endpoints call the same authorizer
- handler tests and capability tests share the same action mapping list

---

## Recommended Plan Shape

1. Permission foundation and dependency gate
2. Backend adoption, capability endpoints, audit wiring
3. Thin frontend capability integration
4. Tests, docs, live verification, Ist-Analyse summary, and Phase-45 handoff
