# Phase 137 — Central Effective-Rights Resolver & User Overrides

## Status

Discussion completed externally on 2026-08-21.

This document is the authoritative discussion/context result for Phase 137 and is intended to be used by GSD as the basis for research and planning.

Do **not** reopen the product discussion unless code research reveals a hard contradiction with an already documented Phase-136 decision.

---

## Phase Goal

Phase 137 makes the permission policy prepared in Phase 136 executable.

The phase introduces one central, provenance-capable effective-rights resolver for group-scoped permissions and integrates:

- role-based grants,
- per-user group-specific Allow/Deny overrides,
- specialized grant providers such as review delegation,
- runtime enforcement,
- effective-rights inspection,
- secure override mutations,
- immutable audit/history,
- strict group scoping and BOLA/IDOR protection.

The key architectural rule is:

> Enforcement and inspection must use the same central resolution logic.

There must not be a second permission engine for admin/inspection purposes.

---

# 1. Phase Boundary

## In scope for Phase 137

Phase 137 includes:

- central Effective-Rights Resolver,
- group-wide rights resolution for one user + one fansub group,
- integration of role grants,
- integration of per-user Allow/Deny overrides,
- specialized grant provider abstraction,
- review-delegation integration through a specialized provider,
- provenance for effective rights,
- decisive-source calculation,
- runtime-enforcement integration,
- Effective-Rights Inspection API,
- User-Override Mutation API,
- Override-History API,
- atomic mutation + audit,
- idempotent mutation behavior,
- strict BOLA/IDOR protection,
- negative security tests,
- batched repository/query access,
- request-local reuse of an already-built resolution,
- DTO/contracts needed by the backend/API.

## Explicitly out of scope

Do not build the administrative UX in Phase 137.

The following belong to Phase 138 or later:

- admin rights-management UI,
- guided revoke flow,
- impact visualization,
- filters/sorting/presentation behavior,
- human-friendly explanatory UI texts,
- cache/freshness UX,
- broader user-admin projections,
- review-delegation management UI.

Phase 137 ends at the backend/API contract and enforcement boundary.

---

# 2. Existing Phase-136 Policy That Must Remain Binding

Phase 136 is complete and its decisions must not be redefined.

The following rules remain authoritative:

1. Per-user overrides are always **fansub-group-specific**.
2. A capability may only be individually overridden if the canonical capability catalog explicitly marks it with `user_overridable=true`.
3. New capabilities are non-overridable by default.
4. Individual overrides support both `allow` and `deny`.
5. Platform/global administration, rights administration, role administration, delegation administration, security administration and audit administration must not become individually overridable through group-specific user overrides.
6. The IdP/Keycloak-based Platform-Admin bypass cannot be revoked by group-level controls.
7. Real override changes are recorded in immutable history/audit.
8. Exact idempotent repetitions do not create an additional domain audit/history entry.
9. Review delegation remains a specialized membership seam and is **not** migrated into generic user overrides.

---

# 3. Binding Discussion Decisions

## D01 — Permission precedence

Final precedence:

1. **Platform Admin**
   - Effective result: `ALLOW`
   - Group-specific controls cannot revoke this.
   - Mark as non-deniable.

2. **Disabled actor**
   - Effective result: `DENY`

3. **No active membership in target fansub group**
   - Effective result: `DENY`
   - Existing overrides may remain stored but are dormant and have no effect.

4. **User DENY override**
   - Effective result: `DENY`
   - Overrides normal group-scoped grant sources.
   - Also overrides a specialized Review Delegation grant.

5. **User ALLOW override**
   - Effective result: `ALLOW`

6. **Role-based grant**
   - Effective result: `ALLOW`
   - Grants from multiple roles are OR-combined.

7. **Specialized grant**
   - Effective result: `ALLOW`
   - Example: Review Delegation.

8. **No grant**
   - Effective result: `DENY`

Important:

> A personal User-Deny also overrides an existing Review-Delegation grant.

The Review Delegation model itself remains specialized and is not migrated into the generic override table.

---

## D02 — Membership lifecycle and dormant overrides

Chosen model: **retain overrides, but make them ineffective without an active membership**.

Rules:

- A User-Allow never replaces membership.
- New overrides may only be created for a currently active membership in the target fansub group.
- If a membership becomes inactive or is removed:
  - existing overrides are not automatically deleted,
  - audit/history remains unchanged,
  - the resolver ignores those overrides,
  - effective result is denied because active membership is missing.
- If the membership is later reactivated:
  - retained overrides become effective again under normal precedence.

This preserves history and prior configuration without allowing membership bypass.

---

## D03 — Group-wide resolution instead of per-capability database reads

Chosen model: **group-wide Effective-Rights Resolution**.

The resolver should conceptually operate as:

```text
ResolveGroupRights(actor, fansubGroupID)
```

rather than querying the database independently for every capability.

The resolution should load the relevant source data in batches:

- membership,
- group roles,
- role-capabilities,
- user overrides,
- specialized grants,
- capability metadata/catalog data as required.

After loading, capability results are calculated in memory.

Individual runtime checks such as:

```text
Can(actionCode)
```

are projections of the already built group resolution.

Goals:

- avoid repeated database queries,
- avoid N+1 behavior,
- allow runtime enforcement and inspector to share one data model,
- reduce load.

---

## D04 — Provenance model for the inspector

The resolver must not return only a boolean.

For every relevant capability, the result should preserve all relevant sources plus the source that ultimately decided the effective result.

Minimum conceptual data:

```text
Capability
├── action_code
├── allowed
├── granting_roles[]
├── user_allow
├── user_deny
├── specialized_grants[]
├── decisive_source
├── non_deniable
└── reason_code
```

Rules:

- `granting_roles[]` includes all roles that grant the capability.
- User-Allow and User-Deny presence must remain visible.
- Specialized grants must remain visible.
- `decisive_source` identifies what won according to precedence.
- `reason_code` must be machine-readable.
- Do not add human-facing German explanation texts in Phase 137.
- Denied capabilities must also be inspectable when relevant.
- Provenance must not be reconstructed separately by an admin endpoint.

Example:

```text
Capability: fansub_group_media.upload
Allowed: false

granting_roles:
- founder
- gfxler

user_deny: true
user_allow: false

specialized_grants: []

decisive_source: user_deny
non_deniable: false
```

Another example:

```text
Capability: review.image.decide
Allowed: false

granting_roles:
- reviewer

user_deny: true
user_allow: false

specialized_grants:
- review_delegation

decisive_source: user_deny
```

---

## D05 — Specialized Grant Provider

Chosen model: use a **small specialized grant-provider abstraction**.

Do not hard-wire Review-specific branching throughout the central resolver.

Conceptual architecture:

```text
Role Grants ───────────────┐
User Overrides ────────────┼──> Central Resolver ──> Effective Rights
Specialized Grant Provider ┘
          │
          └── Review Delegation
```

A minimal conceptual interface may resemble:

```go
type SpecializedGrantProvider interface {
    ResolveGroupGrants(ctx context.Context, actorID, fansubGroupID int64) ([]SpecializedGrant, error)
}
```

This is an architectural direction, not a requirement to build a large plugin framework.

Requirements:

- Review Delegation remains its own domain mechanism.
- It contributes grants to the central resolver.
- A User-Deny may override such a grant.
- The resolver should remain open to additional specialized grant sources later without becoming a collection of domain-specific `if` statements.

---

## D06 — Override mutation, idempotency and audit

Allowed logical mutation operations:

```text
SET ALLOW
SET DENY
REMOVE OVERRIDE
```

Do not implement a generic toggle operation.

### Real changes

The following are real changes and must create audit/history:

```text
none  -> allow
none  -> deny
allow -> deny
deny  -> allow
allow -> none
deny  -> none
```

### Exact idempotent repetitions

The following are true NO-OPs:

```text
allow -> allow
deny  -> deny
none  -> none
```

For a NO-OP:

- do not create another domain history/audit entry,
- do not fake a change timestamp,
- return a machine-readable `no_op` result/status.

### Atomicity

Every real change must be atomic with its audit/history entry.

Conceptually:

```text
BEGIN

  authorize actor
  validate target membership
  validate capability
  validate user_overridable
  read/lock current override state consistently
  apply override mutation
  append immutable history/audit

COMMIT
```

If audit/history persistence fails:

```text
ROLLBACK
```

There must never be an effective override change without the corresponding history record.

### Concurrency

Research must inspect the correct transactional strategy for concurrent override mutations.

Example race:

```text
Admin A: allow -> deny
Admin B: allow -> remove
```

The stored history must describe the actual previous state and actual committed transition.

Use appropriate database constraints, locking and/or serialization based on the existing persistence architecture.

### Reason

Every real override mutation must carry a reason.

The reason may later be entered through UI, but Phase 137 service/API contracts must support and require it according to Phase-136 rules.

---

## D07 — Who may manage per-user overrides

Do not hard-code role names such as Founder or Admin into mutation authorization.

Override administration must be authorized through a **dedicated group-scoped management capability** from the canonical permission model.

Conceptually:

```text
user_group_capability_override.manage
```

Use the actual canonical action code defined by Phase 136/current code if it differs.

Rules:

- an actor with the required effective management capability for the target group may manage overrides in that group,
- Platform Admin may manage them through the non-deniable global bypass,
- ordinary role names do not receive hard-coded special treatment,
- no generic self-override prohibition is required,
- self-modification is allowed only if the actor legitimately has the management capability,
- `user_overridable=false` can never be bypassed,
- excluded platform/security/delegation/audit capability classes remain outside this override mechanism.

---

## D08 — BOLA / IDOR and strict group scoping

All override and inspection operations are strictly group-scoped.

A caller authorized for Fansub Group A must not gain information about or modify Fansub Group B by manipulating IDs.

Server-side validation must cover at least:

- `fansub_group_id`,
- `membership_id`,
- `user_id`,
- target override,
- override history,
- effective-rights inspection.

Required rules:

1. Actor must have the required management/inspection authorization for the **target group**.
2. Target user must resolve to an active membership in that same target group for new mutations.
3. Capability must exist in the canonical catalog.
4. Capability must have `user_overridable=true` for mutations.
5. Group scope must be validated server-side rather than trusted from request identifiers.
6. Inspector/history endpoints must enforce equivalent scope boundaries.

For foreign-scoped resources, prefer neutral `not_found` behavior where compatible with existing API conventions.

Do not disclose unnecessary information such as:

```text
"This user exists but belongs to another group."
```

Negative security tests must explicitly cover manipulated identifiers and foreign resources.

---

## D09 — Performance and caching

Phase 137 must reduce repeated permission lookups.

Required:

- batched repository/database reads,
- one group-wide resolution per user + group context,
- reuse of that resolution within the current request,
- no per-capability SQL loop,
- no N+1 behavior in Effective-Rights Inspection.

Chosen cache boundary:

### Required

**Request-local reuse**.

Within one request, if the same actor + target group needs multiple permission decisions, the existing resolution should be reused rather than rebuilt.

### Not part of Phase 137

Do **not** introduce a long-lived Redis or process-wide effective-rights cache in this phase.

Reason:

- permission cache invalidation adds security-sensitive complexity,
- stale permission results are more dangerous than additional correct DB reads,
- cache/freshness UX belongs to later work.

Research should inspect how existing repository calls can be combined so membership, roles and other sources are not loaded repeatedly.

---

## D10 — API boundary vs Phase 138

Phase 137 delivers backend APIs/contracts required for enforcement and later administration.

Expected API capabilities include the semantic equivalent of:

```text
GET effective rights for one user + fansub group
SET user capability override to ALLOW
SET user capability override to DENY
REMOVE user capability override
GET override history
```

Exact route structure must follow the existing Team4s API conventions found during research.

The Effective-Rights Inspection endpoint should expose a group-wide rights resolution or equivalent complete capability list rather than forcing a separate request per capability.

Phase 137 must not implement the final admin UI.

---

# 4. Central Resolver Architecture

The target architecture is:

```text
Actor + Fansub Group
        │
        ▼
Central Effective-Rights Resolver
        │
        ├── Membership
        ├── Role Grants
        ├── User Overrides
        ├── Specialized Grant Providers
        │       └── Review Delegation
        └── Capability Metadata
                │
                ▼
      GroupRightsResolution
                │
        ┌───────┼─────────┐
        │       │         │
        ▼       ▼         ▼
      Can()  Enforcement  Inspector
```

Critical rule:

> There must be one decision engine and multiple consumers, not multiple decision engines.

Existing runtime methods such as `CanForFansubGroup`, `CanForRelease`, `CanForReleaseVersion`, review authorization and similar permission entry points should ultimately derive decisions from the same central resolution logic where the resource context maps to a fansub group.

Research must identify the safest migration path without breaking existing behavior.

---

# 5. Effective Resolution Flow

Conceptually:

```text
1. Platform Admin?
   yes -> ALLOW, non-deniable

2. Disabled actor?
   yes -> DENY

3. Active membership in target group?
   no -> DENY
         stored overrides remain dormant

4. User DENY override?
   yes -> DENY

5. User ALLOW override?
   yes -> ALLOW

6. Any role grant?
   yes -> ALLOW

7. Any specialized grant?
   yes -> ALLOW

8. Otherwise
   -> DENY
```

Provenance still records grant sources that lost to a higher-precedence source.

Example:

```text
Role grant exists
Review delegation exists
User DENY exists

Effective result = DENY

Provenance still includes:
- role grant
- review delegation
- user deny

Decisive source = user_deny
```

---

# 6. Data / Persistence Expectations

Phase 136 already introduced the persistence basis for user-specific capability overrides and history.

Research must inspect the actual migrations/schema and use them as the source of truth.

Expected concepts include:

```text
user_group_capability_overrides
user_group_capability_override_history
```

The logical uniqueness of an override is expected to be equivalent to:

```text
(app_user_id, fansub_group_id, action_code)
```

with effect:

```text
allow | deny
```

Do not create a competing persistence model unless research proves the existing Phase-136 schema cannot satisfy the approved behavior.

---

# 7. Negative Security Test Matrix

Phase 137 must explicitly test denial and abuse paths, not only happy paths.

At minimum cover:

| Case | Expected |
|---|---|
| one role grants capability | ALLOW |
| multiple roles, one grants | ALLOW |
| role grant + User Allow | ALLOW |
| role grant + User Deny | DENY |
| no role grant + User Allow | ALLOW |
| User Allow + User Deny condition cannot result in ambiguous effective state | deterministic precedence / DENY if both representations can exist |
| Platform Admin + User Deny | ALLOW |
| disabled user + role grant | DENY |
| inactive membership + stored User Allow | DENY |
| reactivated membership + retained override | override becomes effective again |
| Review Delegation + User Deny | DENY |
| override intended for another group | no effect |
| mutate foreign group's user/membership | blocked |
| inspect foreign group's rights | blocked |
| read foreign group's override history | blocked |
| unknown capability | rejected |
| `user_overridable=false` | rejected |
| mutation against inactive/non-member target | rejected |
| manipulated target IDs | BOLA/IDOR blocked |
| audit/history insert fails | override mutation rolled back |
| exact repeat of existing state | NO-OP, no new audit |
| concurrent conflicting mutations | one consistent committed state/history |
| self-modification without management capability | blocked |
| self-modification with legitimate management capability | allowed, audited |
| Platform-Admin path | separately verified |

---

# 8. Performance Acceptance Principles

Research and plans must preserve these constraints:

- no SQL query per capability,
- no inspector N+1 behavior,
- no repeated membership load in the same resolution,
- no repeated role load in the same resolution,
- no repeated override load in the same resolution,
- specialized grants should be obtained in a batch-oriented way,
- request-local resolution reuse should prevent rebuilding the same group context repeatedly.

Do not introduce Redis/process cache as a shortcut.

---

# 9. Research Instructions

Claude/GSD should now perform technical research against the actual Linux checkout.

Research must inspect at least:

- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- all relevant Phase-136 context/research/pattern/verification/plans/summaries
- `backend/internal/permissions`
- current permission service entry points
- capability catalog/repository
- role-capability repository
- group membership loading
- review delegation / review grant resolution
- admin/capability endpoints
- Phase-136 override/history migrations
- transaction patterns already used in the backend
- existing API error/not-found conventions
- existing request-context/request-local caching patterns, if any
- current tests around permissions/review/admin security.

Research should answer:

1. What is the least disruptive way to make one central group-wide resolution the source of truth?
2. Which existing permission methods should delegate to it?
3. Which current repository calls are redundant and can be batched?
4. What exact specialized Review Grant seam already exists and how should it implement the provider abstraction?
5. What exact canonical management capability from Phase 136 should protect override mutations?
6. What existing DTOs/contracts can be extended instead of duplicated?
7. What transaction/locking pattern best guarantees atomic override + history behavior?
8. What existing API convention should be used for foreign-scoped `not_found` responses?
9. How should request-local reuse be implemented consistently with the current Go HTTP architecture?
10. Which existing tests can be extended and which new negative security tests are necessary?

---

# 10. Instructions to GSD / Claude

The product discussion for Phase 137 is complete.

Do **not** run `/gsd:discuss-phase 137` again.

Use this document as the Phase-137 discussion/context input.

Next step:

```text
/gsd:research-phase 137
```

Research may refine implementation mechanics, names and code-level structure, but must not silently change the product decisions D01-D10.

If technical research discovers a genuine contradiction that makes one of the approved decisions unsafe or impossible, stop and report the conflict explicitly instead of silently choosing a different behavior.

No implementation during research.

After research, return the findings for review before planning/execution.
