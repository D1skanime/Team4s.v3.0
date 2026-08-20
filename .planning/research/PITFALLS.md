# Domain Pitfalls

**Domain:** Team4s v1.4 Capability-, Review- und Benutzerverwaltung
**Researched:** 2026-08-20
**Overall confidence:** HIGH for current-code findings; MEDIUM for the not-yet-designed override schema

## Current Baseline

Two historical warnings are already resolved: the capability registry is DB-driven and atomically cached (`backend/internal/permissions/permissions.go`), and global roles are synchronized from validated Keycloak realm roles (`backend/internal/repository/authz_keycloak_sync.go`). Do not plan a second registry or global-role authority path.

## Critical Pitfalls

### Pitfall 1: Deny precedence or scope is wrong
**What goes wrong:** A deny intended for one group/resource blocks globally or is bypassed by another role/context.
**Why it happens:** Current permission methods return early on platform admin and the first matching group/contribution allow; no override layer exists.
**Consequences:** Privilege leakage, lockout, and UI/enforcement disagreement.
**Prevention:** Decide one canonical order before schema work: invalid/disabled actor -> platform-admin rule -> applicable user deny -> user allow -> role/delegation allow -> deny. Define global/group/anime/release-version scopes and whether platform admin is non-deniable. Resolve canonical resource IDs before matching. Use the same evaluator for inspector and enforcement.
**Detection:** Matrix tests for multiple groups/roles, allow+deny, unmatched scopes, disabled actors, contribution fallback, and platform admin.

### Pitfall 2: The effective-rights inspector becomes a second auth engine
**What goes wrong:** The inspector derives rights from role rows while handlers use membership status, verified claims, contribution fallback, direct review grants, owner checks and platform bypass.
**Why it happens:** `GetUserGroupRights` in `backend/internal/repository/admin_users_tab_repository.go` explicitly uses display heuristics and hard-coded roles; `UserGroupRightsTab.tsx` shows only two booleans.
**Consequences:** Admins revoke the wrong source or receive false assurance.
**Prevention:** Produce capability, result, scope and all provenance sources through canonical backend policy primitives. Mark resource-dependent capabilities as such rather than false.
**Detection:** Contract tests compare inspector output with real `Can*` results for identical actor/resource fixtures.

### Pitfall 3: Override/delegation endpoints allow BOLA/IDOR
**What goes wrong:** A group manager mutates a membership/user/resource from another group by supplying its ID.
**Why it happens:** Browser IDs are trusted without server-side ownership resolution.
**Prevention:** Reuse `ReviewService.changeDelegation`: it locks membership, derives group server-side, checks `fansub_group.members.manage`, validates active membership/user/verified claim, mutates and audits transactionally. Never expose `ReviewDelegationRepository` directly. Resolve override targets and scopes server-side; platform-only mutations must consistently require platform admin.
**Detection:** Cross-group membership, mismatched user, inactive/disabled/pending target, missing claim, unknown action and unauthorized actor tests.

### Pitfall 4: Review queue filtering exists only partly or only in UI
**What goes wrong:** Users see/enumerate entries they cannot decide; counts and next navigation disagree.
**Why it happens:** `ReleaseReviewHandler.authorizedKinds` already filters text/image kinds server-side, but `releaseReviewQueuePredicates`, `Counts`, `Detail` and `Next` receive no actor identity and do not exclude self-submissions. Self-review is rejected only by `ReviewService.Decide`, using both app-user and verified beneficiary-member identity. Contribution count is currently hard-coded to zero.
**Prevention:** Apply the same server-side identity/capability predicate to list, counts, cursor pagination, next and detail. Keep own items in a separately named waiting view if desired. Retain transactional decision enforcement as defense in depth.
**Detection:** Postgres tests for self by app user, beneficiary claim or both; mixed rights/delegations; consistent counts/pages/next; platform override with reason.

### Pitfall 5: Platform-admin bypass and IdP ownership are misrepresented
**What goes wrong:** UI claims an override revokes platform admin, or app-side global-role edits are overwritten at next authenticated request.
**Why it happens:** Global roles are synthetic capability rows, but Keycloak is authoritative and permission methods explicitly bypass normal scope checks.
**Prevention:** Show global roles read-only with Keycloak provenance, explain bypass in previews, and reject impossible denies. Reconcile legacy app global-role mutation endpoints with the IdP-authoritative decision.
**Detection:** JIT grant/revoke tests plus UI/policy tests for the chosen bypass rule.

### Pitfall 6: DB mutation succeeds while permission state remains stale
**What goes wrong:** One or more processes enforce old role capabilities.
**Why it happens:** Current handlers reload an in-process cache after DB mutation; reload failure is logged and the old cache retained. Per-user overrides/review grants are dynamic DB state and should not be folded into that cache.
**Prevention:** Separate cached role catalog from user state. Surface degraded reload status, instrument cache version/last success, and define multi-instance invalidation before scaling.
**Detection:** Reload failure injection and mutate-then-exercise live checks without restart.

### Pitfall 7: Lost updates or unaudited authorization changes
**What goes wrong:** Concurrent admins overwrite rights, or mutation commits without trustworthy audit.
**Why it happens:** Full-set toggle saves invite races. Current role-capability audit writes ignore errors, while the review service correctly locks and audits in one transaction.
**Prevention:** Prefer idempotent single-capability PUT/DELETE plus revision/ETag conflicts. Commit override/delegation mutation and immutable audit atomically; record actor, target, capability, scope, old/new state and reason.
**Detection:** Concurrent/idempotency tests and forced audit-failure rollback.

## Moderate Pitfalls

### Pitfall 8: Invalid or hollow role/capability data
**Prevention:** Keep FK/check/startup consistency validation. Re-check the old claim that `founder`, `co_leader`, `techadmin`, `gfxler` have zero mappings on a fresh DB before choosing grants. Add reverse index on `role_capabilities(action_code)` only when the inspector query plan warrants it.

### Pitfall 9: Flat tabs become N+1 or unbounded payloads
**Prevention:** Server-side grouping/filtering/cursor pagination and set-based provenance. An identical release role is not an override. Add high-volume fixtures, query-count assertions and `EXPLAIN` review.

### Pitfall 10: Desktop-first becomes narrow-screen breakage
**Prevention:** Current `AGENTS.md` supersedes the older blanket desktop-first note: new UI is mobile-first, reusable components use container queries, wide tables own horizontal scrolling, and keyboard/A11y remain intact. Avoid JS breakpoint layout forks.
**Detection:** Live UAT at 390x844, 768x1024, 1440x900, keyboard and 400% zoom.

### Pitfall 11: Refresh-session regression
**Prevention:** Gate protected UI on `hasAccessToken || hasRefreshToken` and use central `api.ts`; never read tokens/build headers. `ReleaseReviewsSection` and `PlatformAdminGate.test.tsx` are existing analogs.
**Detection:** Access token absent, refresh valid: view and mutation still proceed without logout UI.

### Pitfall 12: Migration/seed strategy conflicts
**Prevention:** Inspect status and `database/migrations` before numbering; stop on multiple untracked migrations; add reversible migrations, never edit history. Data is disposable, so reset/reseed instead of compatibility code. Retire Phase-134 fixtures only via an explicit committed replacement. Build v1.4 fixtures first: two groups, lead, delegate, ordinary member, own/foreign submissions, platform admin, allow+deny conflict.
**Detection:** Fresh/up/down proof, idempotent seed, protected-asset hash and real exit-code green gate.

## Minor Pitfalls

### Pitfall 13: Duplicated capability metadata
**Prevention:** Make DB action metadata the source for category/order/description; do not add another frontend category map. Preserve correct German umlauts.

### Pitfall 14: Revocation UX hides blast radius
**Prevention:** Default guided revoke to scoped user deny. Show every granting source, affected users/scopes, platform bypass, and distinguish role mutation, membership removal, direct review delegation and user override.

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Required gate |
|---|---|---|
| 1. Policy contract/schema | Precedence, scope, platform bypass | Durable policy decision, threat model, scope matrix, OpenAPI/DTO, clean migration chain |
| 2. Resolver/overrides | BOLA, drift, stale state | Postgres matrix, cross-group negatives, inspector/enforcement parity, audit/concurrency tests |
| 3. User-detail projections | N+1, false overrides | Set-based query plan, cursor pagination, high-volume fixture |
| 4. Review delegation API/UI | Foreign/ineligible target, lost audit | Existing service reused; route/contracts; transactional audit proof |
| 5. Decidable queue | UI-only/self filtering | Identical list/count/detail/next predicates; self matrix; final guard retained |
| 6. UX integration | Responsive/auth/revoke regression | 390/768/1440 UAT, keyboard, 400% zoom, refresh-only session, impact preview |
| 7. Reset/rollout | Seed conflict/false green | Fresh/up/down, idempotent fixtures, asset hash, exit-code typecheck/lint/tests/build |

## Sources

- `.planning/notes/capability-registry-design.md`
- `.planning/notes/milestone-intent-rechte-benutzerverwaltung.md`
- `.planning/notes/live-uat-ux-findings.md` #29-#32
- `backend/internal/permissions/permissions.go` and `permissions_reload_test.go`
- `backend/internal/repository/authz_permissions.go`, `authz_keycloak_sync.go`, `admin_users_tab_repository.go`
- `backend/internal/repository/review_delegation_repository.go`, `release_review_query_repository.go`
- `backend/internal/services/review_service.go`
- `backend/internal/handlers/admin_capability_handler.go`, `release_review_handler.go`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx`
- `docs/frontend/auth-api-client.md`; `AGENTS.md`
