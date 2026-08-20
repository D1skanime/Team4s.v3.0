# Project Research Summary

**Project:** Team4s v1.4 Capability-, Review- und Benutzerverwaltung
**Domain:** Brownfield authorization, review workflow, and administrative user projections
**Researched:** 2026-08-20
**Confidence:** HIGH

## Executive Summary

Team4s v1.4 is not a new authorization system. It completes an existing Go/PostgreSQL permission service, Keycloak-owned global roles, data-driven role capabilities, membership-bound review delegations, and Next.js admin surfaces. Historical analyses remain valuable intent and risk evidence, but current-code validation changes the baseline: the DB registry/cache, editable role matrix, Keycloak JIT, read-only global roles, review lifecycle, and review-kind filtering already exist. Build only the missing seams.

Add one group-scoped per-user allow/deny layer to the central resolver and expose the same inputs as provenance-rich effective-rights projections. Extend the existing user-detail, role-capability, group-member, and review-queue surfaces. Keep review delegation specialized, global roles Keycloak-owned, role capabilities as the cached base allow layer, and contribution/media ownership unchanged. Group and paginate large projections on the server.

The main risks are inspector/enforcement drift, incorrect deny/platform-admin semantics, cross-group mutation vulnerabilities, inconsistent queue predicates, and misleading success while the role cache is stale. Mitigate them with an explicit precedence contract, shared resolver/provenance primitives, exact atomically audited mutations, actor-aware predicates, truthful cache activation status, synchronized contracts, and fixture-backed security plus live UAT.

## Key Findings

### Recommended Stack

No new dependency or parallel application is needed.

**Core technologies:**

- **Go 1.25 + Gin 1.10:** central policy, projections, services, and authenticated APIs.
- **PostgreSQL 16 / current migrations:** canonical capability, override, delegation, audit, and projection data; reversible additions only.
- **Next.js 16.1.6, React 18.3.1, TypeScript 5.7:** existing admin UI, typed DTOs, and refresh-aware central API client.
- **Keycloak 26 / OIDC:** authoritative global roles; platform-admin bypass explicit and global roles read-only.
- **Existing pgx, Go/Vitest/Testing Library/axe tests and UI primitives:** reuse established seams.

Do not combine security changes with stack upgrades.

### Expected Features

**Must have:**

- Effective capabilities per user/group with all sources, winning reason, and platform-admin bypass.
- Group-scoped allow/deny overrides; deny wins for normal users; exact scope, audit, guided revoke.
- Role-matrix impact preview and truthful persisted-versus-cache-active feedback.
- Anime/project-grouped user tabs with true release deviations, server filters, and stable pagination.
- Existing review delegation exposed through typed list/grant/revoke API and canonical member editor.
- Server-side actionable review filtering shared by list/count/detail/next; self-submissions separate.
- Refresh-session, accessibility, responsive, security, migration, fixture, and live-UAT coverage.

**Should have:**

- “Benutzer X soll Y nicht können” assistant recommending a narrow deny.
- Before/after effective diffs, including no-op outcomes from other granting sources.
- Compact standard/deviation summaries and correct workspace links.
- Metadata-driven capability categories/order/descriptions without frontend duplicates.

**Defer:**

- **#33:** platform-wide document/initiative library.
- **#34:** unified badge-progress UI until representative data exists.
- Full role-taxonomy redesign, global overrides, bulk editing, recommendations, or new review domains.

### Architecture Approach

Keep verified Keycloak identity → current-user middleware/JIT → `permissions.Actor` → central `permissions.Service` → protected operation. For normal group checks: exact user deny, exact user allow, then existing role/contribution/delegation grants; platform-admin bypass remains separately displayed above these rules. Enforcement and inspector share primitives. Never persist effective rows.

**Major components:**

1. **Identity boundary** — OIDC validation and Keycloak global-role reconciliation only.
2. **Central resolver/repositories** — scoped overrides, cached role capabilities, canonical roles, specialized review grants, provenance.
3. **Exact mutation/audit APIs** — one target/membership, action, and group with authorization, idempotency, atomic audit.
4. **Admin projections/UI** — extend `/admin/users/{id}`, `/admin/role-capabilities`, `/admin/fansubs/{id}/edit` through OpenAPI, DTOs, and `api.ts`.
5. **Review queue** — one actor-aware predicate set for list/count/detail/next and a distinct own-submissions lane if retained.

### Historical Analysis vs Current Validation

| Earlier proposal | Current validated status | Consequence |
|---|---|---|
| DB registry/cache | Implemented (migration 0108/cache) | Extend; no second registry |
| Editable role matrix | Implemented with API/UI/audit/reload | Add impact/cache outcome and remove duplicate metadata |
| Keycloak JIT/read-only globals | Implemented | Preserve IdP authority |
| Generic user allow/deny | Missing | Foundational new schema/resolver/contracts/UI |
| Direct review grants | Model/service/enforcement exist; management missing | Wire existing service to API/UI |
| Queue kind authorization | Present for text/image | Fix actor/self semantics across all reads |
| Grouped/paginated user tabs | Missing or heuristic | Build server projections; heuristics are not auth truth |

### Critical Pitfalls

1. **Inspector/enforcement drift** — shared resolution only; no React or handler-SQL evaluator.
2. **Wrong deny/bypass semantics** — exact group scope, deny wins for normal users, platform bypass explicit.
3. **BOLA/IDOR** — trusted actor, target/group/action validation, exact authority, cross-group negatives.
4. **Partial queue relevance** — identical predicates for list/count/detail/next/cursors/direct access; retain decision guard.
5. **Persisted ≠ active** — dynamic user overrides; role-matrix APIs surface cache activation outcome.
6. **Lost update/audit** — one-capability idempotent mutations, transactional immutable audit, concurrency tests.
7. **N+1 tabs** — aggregate and compare before stable parent pagination; validate fixtures/query plans.

## Implications for Roadmap

### Phase 1: Policy Contract and Scoped Override Schema

**Rationale:** Lock precedence, scope, provenance, bypass, and authority first.
**Delivers:** group override schema, constraints/indexes/audit, provenance DTOs, exact endpoints, cache outcome, catalog decisions, threat model.
**Addresses:** Finding #29 foundation.
**Avoids:** ambiguous deny, global-role drift, BOLA, parallel registries.
**Research flag:** targeted policy/cache/audit research required.

### Phase 2: Central Resolution and Effective-Rights API

**Rationale:** Enforcement and explanation must share code before UI.
**Delivers:** override repository/service, provenance resolution, exact mutations, effective post-state, security, migrations, replacement of heuristic rights output.
**Addresses:** Finding #29 backend.
**Avoids:** drift, persisted effective rows, global user-state caching.
**Research flag:** established brownfield patterns; skip broad research after Phase 1.

### Phase 3: User-Centered Rights Administration

**Rationale:** Make the policy usable and broad role changes safe.
**Delivers:** inspector, allow/deny, guided revoke, effective diff, platform explanation, role impact preview, cache state, accessible responsive UI.
**Addresses:** Finding #29 end to end.
**Avoids:** global mutation as default revoke, false bypass promises, JS breakpoints, refresh regression.
**Research flag:** phase UI contract required.

### Phase 4: Grouped and Actionable User Projections

**Rationale:** Finding #30 is a separate read-model/performance concern.
**Delivers:** server Anime/project grouping, default-versus-release deviation, filters/cursor pagination, compact summaries, correct links.
**Addresses:** Finding #30.
**Avoids:** false overrides, client aggregation after pagination, N+1, unbounded tabs.
**Research flag:** focused repository/query research and `EXPLAIN` evidence.

### Phase 5: Review Delegation Management

**Rationale:** Existing transactional model/service should be exposed before queue UAT.
**Delivers:** membership-keyed list/grant/revoke API, types/helpers, member-editor controls.
**Addresses:** Finding #31.
**Avoids:** genericized grants, free user/group pairs, unaudited changes, parallel routes.
**Research flag:** established pattern; skip broad research.

### Phase 6: Actually Decidable Review Work

**Rationale:** Kind filtering exists; fix trusted actor/self semantics consistently.
**Delivers:** actor/member queue options, shared list/count/detail/next predicates, lane cursors, self exclusion, optional waiting lane.
**Addresses:** Finding #32.
**Avoids:** UI filters, inconsistent counts/next, direct leaks, contribution-queue scope creep.
**Research flag:** decide beneficiary identity and platform-admin self-review lane.

### Phase 7: Security, Fixtures, and Live Rollout Gate

**Rationale:** Prove realistic identities, conflicts, lifecycle changes, and viewports.
**Delivers:** OR/deny/allow/bypass/cache/delegation/self-review fixtures/tests; migration fresh/up/down; contracts/typecheck/lint/tests/build; refresh-only auth; 390×844, 768×1024, 1440×900, keyboard, 400% zoom UAT.
**Addresses:** integrated #29–#32 acceptance.
**Avoids:** false green, seed conflicts, auth/layout regressions, false counts.
**Research flag:** reuse Phase 134 patterns; skip research.

### Phase Ordering Rationale

- Lock security semantics/schema before implementation.
- Build one resolver/API before UI.
- Keep #30 projections separate from authorization.
- Complete #31 before final #32 UAT because delegated non-lead behavior is decisive.
- Finish with integrated security/live evidence.
- #33 and #34 remain outside every v1.4 phase.

### Research Flags

Deeper planning research: Phase 1 (policy), Phase 3 (UI contract), Phase 4 (queries/performance), Phase 6 (identity/self-review lane).

Standard patterns: Phase 2 (permission seams), Phase 5 (delegation service/editor), Phase 7 (Phase 134 gate/fixtures).

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Versions, Compose, migrations, seams validated on canonical Linux repo. |
| Features | HIGH | #29–#32 from live UAT, user-approved, matched to current gaps. |
| Architecture | HIGH | Auth, permission, cache, delegation, queue, contracts, UI inspected. |
| Pitfalls | HIGH | Grounded in current paths, historical audits, project rules. |

**Overall confidence:** HIGH

### Gaps to Address

- Override action eligibility, inactive targets, membership-loss cleanup, and reason rules; default group scope only.
- Platform-admin self-review: separate override lane or exclusion.
- Contribution review is outside the current text/image release queue absent a separate decision.
- Validate fresh seeded mappings before changing historically “hollow” roles.
- Decide multi-instance cache invalidation before scaling; report local activation now.
- Choose page sizes/indexes after representative fixtures/query plans.
- Specify final labels, density, drawer/table behavior, and destructive copy per UI phase.
- Build fixtures without overwriting host data or protected badge assets.

## Sources

### Primary (HIGH confidence)

- [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md).
- [PROJECT.md](../PROJECT.md) — approved scope, constraints, deferrals.
- `.planning/notes/live-uat-ux-findings.md` #29–#32.
- Historical milestone/capability notes, reconciled against current canonical code.
- Repository evidence listed in the detailed research files.

### Secondary (MEDIUM confidence)

- Historical claims not reproduced against current data, especially mappings for assignable roles; validation inputs, not present facts.

---
*Research completed: 2026-08-20*
*Ready for roadmap: yes*
