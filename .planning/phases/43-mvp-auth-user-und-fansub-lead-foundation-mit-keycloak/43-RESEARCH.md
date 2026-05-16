# Phase 43: MVP Auth-, User- und Fansub-Lead-Foundation mit Keycloak - Research

**Researched:** 2026-05-13
**Domain:** Keycloak local-dev integration, OIDC/JWT validation, Team4s auth/domain fit
**Confidence:** High

---

## Sources

Official Keycloak sources used:
- Docker getting-started: <https://www.keycloak.org/getting-started/getting-started-docker>
- Running Keycloak in containers: <https://www.keycloak.org/server/containers>
- Keycloak configuration: <https://www.keycloak.org/server/configuration>

Key takeaways from those sources:
- local development mode is supported via `start-dev`
- Keycloak can run against PostgreSQL in a dedicated container setup
- the official container image is the supported path
- development mode uses insecure defaults and should remain local/dev only
- realm import is a standard local bootstrap path, but import-on-start behavior is tied to container startup and persistent state, so docs must explain when a volume reset is needed for a fresh import pass

---

## Existing Team4s Seams

### 1. Current auth is custom and Redis-backed

The current backend already has:
- Redis-backed refresh/session handling in `backend/internal/repository/auth.go`
- a signed custom bearer-token flow
- middleware that expects Team4s-issued tokens in `backend/internal/middleware/comment_auth.go`
- a local auth bypass seam for development

This means Phase 43 is not adding auth from scratch. It is replacing the current identity origin and token validation path for authenticated app requests.

### 2. Current global roles already exist, but on the old user seam

`backend/internal/repository/authz.go` checks global roles through:
- `roles`
- `user_roles`

That seam is useful as a reference, but the phase brief explicitly asks for:
- `app_users`
- `app_user_global_roles`

So planning should avoid accidentally reusing the old `users` + `user_roles` contract as the long-term MVP authority without first deciding how it maps to the new model.

### 3. Current contributor/group membership is not the same as app auth membership

The schema already contains:
- `users`
- `members`
- `group_members`
- `release_member_roles`

Those tables model contributor identity and release/group participation from the content domain side. They are not the same thing as authenticated platform users plus admin-manageable fansub application membership.

Planning implication:
- do not blindly overload `group_members` as the new app-auth membership seam
- inspect and document whether `members` remains a separate contributor profile concept
- keep `fansub_group_members` focused on authenticated app users and group-level access

This is one of the most important Phase-43 design boundaries.

---

## Architecture Recommendation

### Recommendation 1: Introduce `app_users` as the new app-auth seam

Even though `users` already exists, the phase brief clearly wants:
- `app_users`
- `keycloak_subject`
- `status`
- login-tracking fields

That is justified because the existing `users` table appears shaped around legacy local credentials:
- `username`
- `email`
- `password_hash`

Keycloak externalizes identity and password management. Reusing that table as-is would either:
- overload a legacy credential table with new semantics
- or force fake/local password values that muddy ownership

Best planning direction:
- create `app_users` as the new canonical authenticated principal
- treat existing `users` as a legacy/internal seam until a later consolidation phase

### Recommendation 2: Keep global platform roles in Team4s DB

This matches the phase brief and keeps platform authority local.

Keycloak should answer:
- who is this user?
- is the token valid?

Team4s should answer:
- is this app user a `platform_admin`?
- which fansub groups is this app user assigned to?
- is this app user the `fansub_lead` for group X?

### Recommendation 3: Build a new `CurrentUser` seam

Phase 43 should not stop at raw token validation.

The backend needs a normalized request context with at least:
- `app_user_id`
- `keycloak_subject`
- `email`
- `display_name`
- `status`
- `global_roles`

This should become the new backend auth foundation for later permission work in Phase 44.

### Recommendation 4: Introduce `RequirePlatformAdmin()` now

Because the MVP admin surface is intentionally small, the simplest robust gate is:
- validate token
- resolve/create `app_user`
- load global roles
- apply `RequirePlatformAdmin()` on admin endpoints

This keeps the phase small while laying the permission seam for later generalization.

---

## Keycloak Fit

### Local Docker/dev

Keycloak officially supports containerized local development with `start-dev`. For Team4s this is appropriate for Phase 43 because the phase brief explicitly allows it for local development.

Recommended local shape:
- `keycloak` container
- `keycloak-db` PostgreSQL container
- isolated volume for Keycloak DB persistence
- configuration through `.env`

### Realm and client automation

The user's addendum makes automation part of the phase, not an optional convenience.

Recommended automation shape:
- keep a declarative realm baseline in `infra/keycloak/realm-team4s.json`
- optionally add an imperative idempotent helper in `scripts/keycloak/bootstrap-keycloak.sh`
- document one path as the primary local bootstrap flow so developers do not guess

Why both artifacts can be useful:
- realm import gives a fast "known baseline" for clean local setups
- a bootstrap script is better for idempotent updates on already-running local environments

Important planning invariant:
- whichever path is primary, the automation must only create:
  - realm `team4s`
  - client `team4s-frontend`
  - redirect/web-origin local defaults
  - global roles `platform_admin`, `content_admin`, `user`
- it must not create fansub-domain roles like `fansub_lead`, `editor`, `designer`, or group-specific role names

### Idempotency implications

Keycloak automation should be treated as stateful infrastructure, not a fire-and-forget seed.

Planning implications:
- bootstrap logic should check whether realm/client/roles already exist before creating them
- reruns should produce useful "already exists" style outcomes instead of hard failures
- docs must state when a realm import no longer reapplies because the Keycloak database volume already contains state
- docs must state the safe local reset path when developers intentionally want a fresh import

### Client model

The requested frontend flow is standard OIDC:
- browser login redirect
- authorization code flow
- PKCE
- frontend receives/maintains session context
- backend receives bearer access token

This is a good fit for a Next.js admin app and avoids password handling in Team4s itself.

### Backend validation

The phase brief asks for backend JWT validation against Keycloak JWKS. That is the right boundary.

The backend should at minimum validate:
- signature
- issuer
- expiry
- subject (`sub`)

Then it should resolve the app user by `keycloak_subject`.

### First platform admin remains an app concern

Even with Keycloak automation, the first effective `platform_admin` bootstrap must remain in Team4s.

Reason:
- Keycloak global identity roles and Team4s app-global roles are intentionally not the same authority seam in this phase
- the phase brief explicitly keeps business authorization local to Team4s

Planning consequence:
- documentation must include the exact SQL path for assigning the first `platform_admin` in `app_user_global_roles`
- Keycloak automation may create a convenient local test user, but that alone must not be presented as sufficient to become a Team4s platform admin

---

## Table Strategy

### New tables strongly justified

Recommended new tables:
- `app_users`
- `app_user_global_roles`
- `fansub_group_members`
- `fansub_group_member_roles`

Why this is cleaner than overloading existing contributor tables:
- app-auth users and contributor personas are not guaranteed to be the same thing
- fansub access control should attach to authenticated app users
- later permission decisions will need a clean principal model independent from release contributor modeling

### Keep `fansub_groups`

The brief explicitly says not to reinvent `fansub_groups` if it already exists. Planning should reuse it directly.

### Be careful around `members`

`members` likely remains useful for contributor/public/persona data. Phase 43 should not assume it disappears. If a future bridge is needed between `app_users` and `members`, that should be a deliberate follow-up decision, not an incidental side effect of Keycloak integration.

---

## Risk Analysis

### Biggest risk: dual-user-model confusion

There will temporarily be:
- legacy/current `users`
- new `app_users`

That is acceptable only if Phase 43 makes the boundary explicit:
- `app_users` = authenticated app principal
- `users` = legacy/internal seam still referenced by historical tables and current code

The plan must force this decision into code comments/docs/tests so later contributors do not conflate them.

### Biggest product risk: putting fansub roles into Keycloak

This would feel convenient early and become a long-term permission mess.

Mitigation:
- make it a hard plan invariant that Keycloak roles stay global/platform-level only
- group roles live in Team4s DB only

### Biggest implementation risk: trying to solve Phase 44 inside Phase 43

It would be easy to drift into:
- generic `Can(...)`
- scoped permissions across releases/media
- role matrices for every content action

That would over-expand the MVP.

Mitigation:
- Phase 43 only needs `RequirePlatformAdmin()`
- later phases can build `RequirePermission(action, context)` on top of the new `CurrentUser`

---

## Recommended Plan Shape

1. Infrastructure, Keycloak automation, and auth foundation
2. Backend `CurrentUser` and global role seam
3. Fansub membership and `fansub_lead` admin MVP
4. Docs, bootstrap, UAT, and Phase-44 handoff

---

## Inferences

These are planning inferences based on the phase brief plus current repo structure:
- `app_users` should be treated as a clean new authority seam rather than a thin alias for existing `users`
- `fansub_group_members` should be modeled on `app_users`, not on `members`
- Keycloak should replace the current local-dev-bypass-first identity path for authenticated admin work
- `platform_admin` is enough for the MVP; `content_admin` can exist in schema/docs without needing full behavior in Phase 43
- a combined realm-import plus idempotent-bootstrap approach is likely the least fragile local-dev operator experience, as long as the docs clearly state which one is authoritative on clean vs already-initialized environments
