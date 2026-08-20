# Phase 136: Capability Policy, Catalog & Schema Contract - Research

**Researched:** 2026-08-20
**Domain:** PostgreSQL-backed authorization/catalog contracts and canonical role presentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Individually overridable capabilities
- **D-01:** Per-user overrides are group-scoped. An override for a user in one fansub group never grants or denies rights in another group.
- **D-02:** A capability is individually overridable only when the canonical capability catalog explicitly marks it, for example with `user_overridable=true`.
- **D-03:** New capabilities are fail-closed for individual overrides: they are not overridable until the catalog metadata and its contract/tests explicitly opt them in.
- **D-04:** Every capability opted into individual overrides supports both personal Allow and personal Deny. Deny has precedence over role-derived and personal Allow decisions.
- **D-05:** Platform/global capabilities and capability-, role-, delegation-, security-, and audit-administration capabilities can never be overridden by group-scoped per-user controls.
- **D-06:** The IdP-owned platform-admin bypass remains non-deniable by group controls.

#### Reason and audit policy
- **D-07:** Non-platform administrators must provide a reason when creating an Allow or Deny and when removing an override.
- **D-08:** Platform administrators may mutate overrides without a reason. Actor, timestamp, target, group, capability, before/after state, and the mutation itself are still always audited.
- **D-09:** Reasons use structured categories such as task substitution, security measure, role gap, and other. Selecting `other` requires explanatory free text.
- **D-10:** Platform administrators may see the complete override audit history. Authorized group administrators may see only the history for their own group. Affected users see their current effective rights and provenance, but not the internal audit history.
- **D-11:** Exact idempotent re-submission creates no additional domain audit record. Only real state transitions enter the override history; unauthorized attempts belong in the security/operational log.

#### Assignable roles and operative rights
- **D-12:** Role identity and operative capability assignment remain separate. A role may be assignable even if it currently grants no operative capabilities.
- **D-13:** Role selectors stay compact. Only after a zero-right role is selected does the UI show a short contextual message that it currently grants no additional rights; detailed effective rights remain in the separate collapsible rights inspector delivered later.
- **D-14:** Confirmed role defaults are seeded deliberately; the system must not infer broad permissions from a role name.
- **D-15:** `gfxler` receives group-scoped defaults to upload, edit, and reorder group images, logos, and banners.
- **D-16:** `techadmin` receives the same group-media defaults plus permission to edit the fansub page's technical links.
- **D-17:** `founder` receives the same group-media defaults plus permission to edit the founding date and historical group data.
- **D-18:** `co_leader` receives the same group-media defaults plus permission to edit general fansub-page content and links.
- **D-19:** These defaults do not implicitly grant role/capability administration, member administration, or media deletion. Additional exceptions use the normal role-capability mapping or an explicitly permitted per-user override.

#### Canonical Karaoke-FX role
- **D-20:** `karaoke_fx` is a distinct, assignable fansub-scene role and must not be merged with `typer` or Typesetting. Its stable role key, German label, ordering, assignability, catalog metadata, and initial capability state are defined centrally in Phase 136.
- **D-21:** `karaoke_fx` initially grants no group-administration capability merely from its role name. Future workflow capabilities can be mapped deliberately when the Karaoke workflow exists.
- **D-22:** `karaoke_fx` is a cross-surface canonical role, not a local UI patch. The same catalog source must feed fansub members, member profiles, release participants/credits, role badges, role points, admin selectors, filters, API contracts, fixtures, and tests.
- **D-23:** Existing role-badge and role-point behavior must recognize `karaoke_fx` everywhere roles are rendered or counted. Hard-coded parallel labels, colors, badge entries, or role lists are not acceptable when the canonical registry can own the data.

### the agent's Discretion
- Exact database column names, enum/check-constraint shape, normalized metadata representation, and reason-category identifiers, provided they preserve the locked behavior above and the reversible fresh-database requirement.
- Exact concise wording and presentation of the contextual zero-right notice, provided it does not overload the existing role selector.
- Exact capability keys used for the confirmed media and fansub-page field permissions, after reconciling them with the existing capability registry and ownership boundaries.

### Deferred Ideas (OUT OF SCOPE)
- The interactive effective-rights resolver and enforcement are Phase 137.
- The compact rights inspector, override editor, impact preview, and contextual role UI are Phase 138.
- Scalable user-administration projections and filtering are Phase 139.
- General badge-UI unification from Finding #34 remains deferred to a later milestone. This does not permit `karaoke_fx` to be omitted from the current existing badge/point system.
- The platform-wide document/initiative library from Finding #33 remains deferred to a later milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAP-03 | Phase-137-only contract context: Deny > Allow > role Allow | Phase 136 may publish the already-decided vocabulary/schema shape, but CAP-03 requirement ownership, runtime evaluation and enforcement belong exclusively to Phase 137. |
| CAP-04 | Platform-admin bypass above group precedence | Contract provenance includes IdP global source and non-deniable state. |
| CAP-11 | One assignability source | Query `role_definitions.assignable`; remove static picker/type unions as runtime catalogs. |
| CAP-12 | Canonical capability metadata | Extend `action_definitions` with help text and override policy; return all metadata from matrix/catalog DTOs. |
| CAP-13 | Confirmed defaults or explicit zero-right state | Seed confirmed mappings and expose `has_operative_capabilities`/count derived from mappings. |
| CAP-14 | Performant reverse lookup | Add `role_capabilities(action_code, role_code)` and override subject/action indexes. |
| QUAL-01 | Synchronized contracts | Update focused and root OpenAPI, Go DTOs, TS types, and central helpers together. |
| QUAL-04 | Reversible fresh schema | Add the next paired up/down migration and fresh up/down proof; no backfill/compatibility path. |
</phase_requirements>

## Summary

Team4s already has the correct authorization backbone: `action_definitions`, `role_capabilities`, a DB-loaded permission cache, `role_definitions.assignable`, repository-backed role endpoints, and an admin capability matrix. [VERIFIED: `database/migrations/0108_capability_registry.up.sql`, `backend/internal/permissions/permissions.go`, `backend/internal/repository/authz_permissions.go`] Phase 136 should extend those seams, not introduce a second permission or presentation registry. [VERIFIED: `136-CONTEXT.md` D-02/D-23 and `docs/engineering/implementation-contract.md`]

The main brownfield risk is catalog fragmentation. Runtime roles are still duplicated in `frontend/src/types/fansub.ts`, contribution-role modules, role-label maps, color aliases, archive filters, profile badge presentation, a Go whitelist, and Go global-role labels. [VERIFIED: codebase `git grep` inventory, 2026-08-20] `karaoke_fx` will remain incomplete unless Phase 136 supplies a catalog DTO rich enough for all consumers and migrates the affected consumers to one shared frontend adapter with a neutral unknown-role fallback. [VERIFIED: `136-CONTEXT.md` D-20–D-23]

**Primary recommendation:** add one reversible schema migration that enriches the existing catalogs and creates constrained override/audit foundations; publish one canonical role/capability catalog contract and shared frontend adapter; seed only confirmed mappings; then prove every `karaoke_fx` surface and every contract layer from a fresh database. [VERIFIED: phase context, requirements, and current code]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capability/role policy metadata | Database / Storage | API / Backend | DB is already the Go/SQL-readable canonical source. [VERIFIED: migration 0108] |
| Scoped override integrity | Database / Storage | API / Backend | FK/check/unique constraints protect scope before Phase 137 implements mutation logic. [CITED: https://www.postgresql.org/docs/16/ddl-constraints.html] |
| Catalog projection/contracts | API / Backend | Browser / Client | Backend must expose server-authoritative labels/order/assignability/presentation metadata. [VERIFIED: current handler/repository DTO seams] |
| Role rendering adapter | Browser / Client | API / Backend | One shared adapter consumes the server catalog and supplies neutral fallback; pages render, not redefine. [VERIFIED: D-22/D-23] |
| Role badge/point eligibility | API / Backend | Browser / Client | Backend already derives `role_entry_*`/`role_volume_*`; frontend presents them. [VERIFIED: member profile repositories and `memberBadgeLabels.ts`] |
| Platform-admin provenance | API / Backend | Browser / Client | IdP-backed bypass is enforced server-side and merely explained client-side. [VERIFIED: D-06] |

## Project Constraints (from AGENTS.md)

- Work, Git, builds, tests, migrations, and Compose only in `/home/d1sk/team4s`; use Docker Compose and `./scripts/gsd-linux.sh`. [VERIFIED: `AGENTS.md`]
- Inspect status and Compose before editing; preserve `.env`, media, volumes, DB contents, unrelated dirty files, and tracked badge assets. [VERIFIED: `AGENTS.md`]
- Use fresh reversible migrations; never edit historical migrations; data is disposable, so add no preservation/backfill/compatibility work. [VERIFIED: `AGENTS.md`]
- Search and reuse existing components, DTOs, repositories, endpoints and helpers; do not create parallel auth/API/media logic. [VERIFIED: `AGENTS.md`, implementation contract]
- Keep `shared/contracts/openapi.yaml`, focused contracts, backend DTOs, frontend types and central API helpers synchronized. [VERIFIED: `AGENTS.md`]
- Protected UI uses the central refresh-capable API client and tests access-token-missing/refresh-valid behavior. [VERIFIED: `docs/frontend/auth-api-client.md`]
- Preserve group-media ownership; do not attach group media to release or episode seams. [VERIFIED: `AGENTS.md`]
- Use correct German umlauts, progressive disclosure, existing UI primitives, small scoped diffs, and relevant typecheck/lint/tests/build plus `git diff --check`. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Library/System | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| PostgreSQL | 16 Compose image | Catalog, constraints, indexes, override/audit schema | Existing project datastore; FK/check/unique/index features cover this phase. [VERIFIED: Compose runtime; PostgreSQL docs] |
| Go | 1.25 module | Repository, DTO, handler and startup catalog validation | Existing backend stack. [VERIFIED: `backend/go.mod`] |
| pgx | 5.7.1 | Parameterized DB access | Existing repository boundary. [VERIFIED: `backend/go.mod`] |
| Gin | 1.10.0 | HTTP catalog endpoints | Existing handler/router boundary. [VERIFIED: `backend/go.mod`] |
| Next.js / React / TypeScript | 16.1.6 / 18.3.1 / 5.7.x | Shared catalog adapter and affected consumers | Existing frontend stack. [VERIFIED: `frontend/package.json`] |
| Vitest / Go test | 3.2.4 / Go toolchain | Contract/adapter/repository/migration coverage | Existing test infrastructure. [VERIFIED: package/module files] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenAPI 3.0.3 YAML | current repository contract | Cross-surface shapes | Update both `admin-capabilities.yaml` and referenced/root `openapi.yaml`. [VERIFIED: contract files] |
| Lucide React | 0.469.0 | Role badge icon identifiers resolved by frontend adapter | Keep icon components client-side; store stable presentation keys, not React components, in DB. [VERIFIED: current badge code/package] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing DB catalog | Static TS/Go role library | Recreates the exact split-brain failure prohibited by D-23. [VERIFIED: current duplicates] |
| Text effect with CHECK | PostgreSQL enum | Enum changes add schema ceremony; constrained text matches existing project style and reversible migration needs. [ASSUMED] |
| Existing endpoints expanded | New per-page catalog endpoints | More endpoints multiply caching, auth and contract drift. [VERIFIED: implementation contract] |

**Installation:** none. No new dependency is needed. [VERIFIED: existing stack provides all required primitives]

## Architecture Patterns

### System Architecture Diagram

```text
Fresh migration/seed
  -> role_definitions + action_definitions + role_capabilities
  -> user capability override + immutable override history schema
  -> indexed FK/check/unique invariants

Catalog request
  -> central authenticated API client
  -> existing catalog handler/repository
  -> canonical DB metadata
  -> RoleCatalogEntry / CapabilityCatalogEntry DTO
  -> shared frontend role-catalog adapter
     -> member/profile/release-credit/admin-picker/filter/badge consumers
     -> unknown role? -> neutral fallback (never crash, never invent authority)

Future authorization request (Phase 137)
  -> platform admin? -> IdP bypass + provenance
  -> normal actor -> role allows + user allow + user deny
  -> deny wins -> effective result + provenance
```

### Recommended Project Structure

```text
database/migrations/0146_*                 # next new paired migration only
backend/internal/permissions/              # policy constants and catalog validation
backend/internal/repository/               # catalog projection + schema tests
backend/internal/handlers/                 # existing catalog DTO endpoints
shared/contracts/admin-capabilities.yaml   # focused source
shared/contracts/openapi.yaml              # cross-surface source
frontend/src/types/admin-capability.ts      # mirrored DTOs
frontend/src/lib/roleCatalog.ts             # one presentation/query adapter
frontend/src/lib/api.ts                     # central fetch helpers
```

### Pattern 1: Enrich Existing Catalog Rows

Add to `action_definitions`: `description_de`, `user_overridable NOT NULL DEFAULT false`, and stable override-policy metadata if needed. Add to `role_definitions` stable presentation keys needed across surfaces (for example `presentation_key`, `color_key`, `badge_role_key`) only when they cannot be derived safely from `code`. [ASSUMED] Do not store component names, CSS class names, or translated per-page prose as authority. [VERIFIED: D-23 and existing CSS/icon split]

### Pattern 2: One Current Override Row, Append-only History

Use a current-state table keyed by `(app_user_id, fansub_group_id, action_code)` with `effect CHECK (effect IN ('allow','deny'))`, actor/reason fields and timestamps. [ASSUMED] Reference active membership semantics at service time in Phase 137; the schema should reference the target `app_user` and `fansub_group` directly so membership replacement does not silently change ownership. [ASSUMED] Use a separate immutable history table containing before/after nullable effects, actor, reason category/text and timestamp. [ASSUMED]

### Pattern 3: Contract-first Future Shapes

Define now, implement consumers later: catalog entries, effective-right item with all sources and decisive source, override mutation request/result with `persisted|active|pending|failed` activation status, impact preview, and audit item. [VERIFIED: roadmap success criterion 4] Add a discriminator/provenance kind for `idp_global_role`, `group_role`, `user_allow`, and `user_deny`; platform bypass must be explicit and non-deniable. [ASSUMED]

### Pattern 4: Catalog-backed Frontend Adapter

The adapter accepts catalog rows and exposes `getRole`, `labelForRole`, ordered context filters, `presentationForRole`, and a neutral unknown-role fallback. [ASSUMED] Components receive catalog data or a scoped provider; they must not import static runtime role arrays. [VERIFIED: D-22/D-23] Compile-time types should use `string`/branded strings for server catalog codes instead of a closed union that rejects newly seeded roles. [ASSUMED]

### Exact Hard-code Migration Inventory

| Concern | Confirmed consumers to migrate or explicitly classify |
|---------|--------------------------------------------------------|
| Closed role type/options | `frontend/src/types/fansub.ts`; `MemberBadgeChain.tsx`; `MemberCurrentProjectsSection.tsx`; `CategoryProgressTable.tsx`; `profileLabels.ts`; `roleColors.ts` [VERIFIED: codebase grep] |
| Duplicate contribution lists/labels | `frontend/src/components/contributions/contributionRoles.ts`; `ContributionCard.tsx`; `AnimeGroupCard.tsx`; `frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.ts`; `UserContributionsTab.tsx` [VERIFIED: codebase grep] |
| Picker/filter lists | `frontend/src/app/archiv/page.tsx`; `MemberSearchCard.tsx`; `GroupMembersTab.tsx` static fallback; `useGroupMembersTab.ts`; admin member editor files [VERIFIED: codebase grep] |
| Badge/points | `memberBadgeLabels.ts`; `MemberBadgeChain.tsx`; `member_profile_public_repository.go`; `member_profile_role_volume_repository.go`; dashboard repository/tests [VERIFIED: codebase grep] |
| Backend static role knowledge | `permissions.go` role constants/fallback `roleMatrix`; `hist_group_member_roles_repository.go` whitelist; `admin_capability_handler.go` global label map [VERIFIED: codebase grep] |
| Existing catalog/API seams to extend | `authz_capability_mutations.go`; `authz_permissions.go`; `admin_group_roles_handler.go`; history-role definitions endpoint; `frontend/src/lib/api.ts`; `admin-capability.ts` [VERIFIED: inspected files] |

### Anti-Patterns to Avoid

- **A second static role truth:** a shared TS constant is still wrong if DB/catalog remains canonical. [VERIFIED: D-23]
- **Label-to-code authorization:** `roleColors.ts` currently reverse-maps localized labels; stable code/presentation keys must drive output. [VERIFIED: inspected file]
- **Over-broad `fansub_group.edit`:** locked defaults require field/media-specific grants; this action would grant more than links/date/history. [VERIFIED: D-15–D-19]
- **Treating assignable as capability-bearing:** these are intentionally separate concepts. [VERIFIED: D-12 and current `capability_editable` seam]
- **Embedding dynamic user overrides in the role cache:** per-user state is not catalog state. [VERIFIED: milestone research pitfalls]
- **Silent audit errors:** current role-capability handler ignores audit write errors; override mutation in Phase 137 must be atomic. [VERIFIED: `admin_capability_handler.go`; D-08/D-11]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Catalog source | Per-page maps/unions | Existing DB catalogs + repository/API projection | Prevents cross-surface drift. [VERIFIED] |
| Integrity | Go-only validation | PostgreSQL FK, UNIQUE, NOT NULL and CHECK constraints | Invalid states are rejected for every writer. [CITED: https://www.postgresql.org/docs/16/ddl-constraints.html] |
| Auth transport | token/header helper | `authorizedFetch`/central API client | Preserves refresh-session behavior. [VERIFIED: auth client docs] |
| Badge thresholds | another karaoke-specific calculator | Existing generic `role_entry_${code}` / `role_volume_${code}_${tier}` backend logic | Current backend derivation is already role-code generic. [VERIFIED: member profile repositories] |
| Group media actions | new upload ownership flow | Existing `fansub_group_media.*` actions and group media seam | Preserves canonical group ownership. [VERIFIED: AGENTS and permissions constants] |

**Key insight:** build a catalog adapter, not another catalog. The adapter translates server-owned metadata into frontend presentation while retaining a neutral fallback. [VERIFIED: D-22/D-23]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | PostgreSQL role/action/mapping rows and future override rows | Fresh reset/reseed only; no row preservation or backfill. [VERIFIED: project rule] |
| Live service config | Keycloak owns global roles and platform-admin provenance | No realm mutation in this phase; contract it read-only/non-deniable. [VERIFIED: D-06] |
| OS-registered state | None relevant; Compose owns runtime. [VERIFIED: AGENTS/Compose inspection] | None |
| Secrets/env vars | None required for catalog/schema changes. [VERIFIED: inspected scope] | None |
| Build artifacts | Frontend `.next` and Docker images may be stale after implementation | Rebuild via Compose; do not treat artifacts as source. [VERIFIED: runtime structure] |

## Common Pitfalls

### Pitfall 1: `karaoke_fx` exists in DB but disappears elsewhere
**What goes wrong:** picker works while credits, filter, badge, points or profile fallback does not. [VERIFIED: current duplicate lists]
**How to avoid:** add a parameterized cross-surface contract test that injects a new catalog role without editing consumers; separately assert `karaoke_fx` in fresh seed. [ASSUMED]

### Pitfall 2: Confirmed defaults use capabilities that do not match requested granularity
**What goes wrong:** `founder` or `techadmin` receives full group edit/delete authority. [VERIFIED: current action set is coarse]
**How to avoid:** inventory handler fields and introduce narrowly named action definitions before seeding; never grant `fansub_group_media.delete`, member admin or role admin under D-19. [VERIFIED: D-15–D-19]

### Pitfall 3: Schema permits overrides of protected capabilities
**What goes wrong:** a raw SQL writer persists an impossible platform/admin override. [ASSUMED]
**How to avoid:** `action_definitions.user_overridable=false` by default plus service validation; add database enforcement through a trigger only if cross-table invariants must be guaranteed at storage level, because PostgreSQL CHECK cannot safely reference other table rows. [CITED: https://www.postgresql.org/docs/16/ddl-constraints.html]

### Pitfall 4: Index order does not match reverse lookups
**What goes wrong:** existing PK `(role_code, action_code)` does not efficiently answer “roles granting action X”. [VERIFIED: schema]
**How to avoid:** add `(action_code, role_code)`; add override indexes for `(fansub_group_id, app_user_id)` and `(action_code, fansub_group_id)` based on provenance/impact queries. [ASSUMED]

### Pitfall 5: Static fallback remains authoritative
**What goes wrong:** permission service silently uses stale Go `roleMatrix` before cache initialization. [VERIFIED: `AllowedActionsForRole` fallback]
**How to avoid:** plan whether Phase 136 can fail closed after startup load; at minimum extend consistency tests and never add `karaoke_fx` to a second Go matrix. [ASSUMED]

### Pitfall 6: Contract drift and wrong endpoint audience
**What goes wrong:** platform-only `/admin/fansub-group-roles` is reused on a group-leader surface and returns 403; focused OpenAPI already overstates its DTO as label/order although handler returns only code. [VERIFIED: handler, types and contract mismatch]
**How to avoid:** converge on the member-scoped role-definition endpoint for group surfaces, expand DTO metadata, and add handler JSON contract tests. [ASSUMED]

## Code Examples

### Recommended constrained override state

```sql
-- Source: PostgreSQL 16 constraint documentation + Team4s schema conventions
CREATE TABLE user_group_capability_overrides (
  app_user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  fansub_group_id bigint NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
  action_code text NOT NULL REFERENCES action_definitions(code) ON DELETE RESTRICT,
  effect text NOT NULL CHECK (effect IN ('allow', 'deny')),
  updated_by_app_user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  reason_category text,
  reason_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app_user_id, fansub_group_id, action_code),
  CHECK (reason_category <> 'other' OR nullif(btrim(reason_text), '') IS NOT NULL)
);
CREATE INDEX role_capabilities_action_role_idx
  ON role_capabilities(action_code, role_code);
```

The platform-admin reason exemption cannot be proven by this row-local CHECK because actor authority is external state; Phase 137 must enforce it transactionally and test it. [VERIFIED: PostgreSQL CHECK limitation; D-07/D-08]

### Catalog adapter fallback

```typescript
// Source: existing Team4s DTO/API patterns
export function rolePresentation(catalog: readonly RoleCatalogEntry[], code: string) {
  const item = catalog.find((entry) => entry.code === code)
  return item ?? {
    code,
    label_de: code,
    sort_order: Number.MAX_SAFE_INTEGER,
    presentation_key: 'other',
    assignable: false,
    has_operative_capabilities: false,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Go `roleMatrix` authority | DB `role_capabilities` loaded into cache | Migration 0108 / Phase 86 | Extend DB registry; do not add new matrix rows. [VERIFIED] |
| Go-derived assignability | `role_definitions.assignable` catalog | Migration 0112 / Phase 135 correction | API must project the DB column directly. [VERIFIED] |
| Page-local role maps | Canonical catalog + shared adapter | Phase 136 target | New roles become cross-surface data additions. [VERIFIED: locked decision] |

**Deprecated/outdated:** `FANSUB_GROUP_ROLE_OPTIONS` as runtime authority, contribution-local role lists, label-to-code color mapping, and static backend role whitelists are migration targets, not extension points. [VERIFIED: inventory]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Use constrained text rather than PostgreSQL enum for effects/reasons. | Stack | Low; planner can choose enum/check shape under discretion. |
| A2 | Store optional stable role presentation keys in `role_definitions`. | Pattern 1 | Medium; exact existing CSS/badge asset naming may support pure code derivation. |
| A3 | Current override row references app user + group directly, with separate append-only history. | Pattern 2 | Medium; membership FK could be chosen after repository ownership review. |
| A4 | Future DTO discriminator/status names. | Pattern 3 | Low; exact naming is discretionary if semantics remain. |
| A5 | Shared adapter/provider shape and branded string role codes. | Pattern 4 | Low; implementation shape can vary. |
| A6 | Proposed secondary indexes match Phase 137/138 queries. | Pitfall 4 | Medium; validate with final SQL and EXPLAIN. |

## Open Questions (RESOLVED)

1. **Which existing actions are sufficiently narrow for confirmed defaults? — RESOLVED**
   - What we know: media upload/update/view exist; group edit and links manage are broader; no explicit reorder, founding-date-only or history-data-only actions were found. [VERIFIED: `permissions.go`]
   - Resolution: narrow action keys are wired to the exact media, page-field, link, and history mutation handlers with focused enforcement tests before confirmed role defaults are accepted; broad `fansub_group.edit`, deletion, member administration, and role administration are excluded. Phase 137 still owns per-user override precedence evaluation.
2. **Should catalog presentation metadata live entirely in DB? — RESOLVED**
   - What we know: labels/order/contexts/assignability already do; React icons and CSS tokens are client artifacts. [VERIFIED]
   - Resolution: the database owns stable semantic presentation keys; the shared frontend adapter allowlists and maps those keys to Lucide components/tokens with a neutral fallback. CSS classes and component identities do not become database data.
3. **Does `karaoke_fx` participate in both `fansub_group` and `anime_contribution` contexts initially? — RESOLVED**
   - What we know: D-22 requires membership and release/credit surfaces, which rely on those two contexts. [VERIFIED]
   - Resolution: seed both `fansub_group` and `anime_contribution`, set `assignable=true`, and seed no initial administration capabilities.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker / Compose | Runtime, DB and tests | ✓ | Docker 29.6.2 / Compose 5.3.1 | — [VERIFIED: command output] |
| PostgreSQL | migration proof | ✓ | 16, healthy Compose service | — [VERIFIED: Compose] |
| Backend/Frontend services | contract smoke | ✓ | running | — [VERIFIED: Compose] |
| Native Node on Linux | GSD/project tooling | not required | wrapper policy | `./scripts/gsd-linux.sh` and Compose [VERIFIED: AGENTS] |

**Missing dependencies with no fallback:** none. [VERIFIED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Go test + testify; Vitest 3.2.4 + Testing Library |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `docker compose exec -T team4sv30-backend go test ./internal/permissions ./internal/repository ./internal/handlers ./internal/migrations` |
| Full suite command | backend `go test ./...`; frontend `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` inside Compose |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAP-04 | non-deniable platform provenance contract | contract/unit | focused Go + OpenAPI shape tests | ❌ Wave 0 |
| CAP-11 | DB assignability is projected consistently | repository/handler/frontend | existing role handler tests + new adapter tests | partial |
| CAP-12 | category/order/label/help/review metadata complete | migration/repository/contract | permission registry + matrix tests | partial |
| CAP-13 | confirmed mappings and explicit zero-right state | migration/handler | fresh DB catalog assertions | ❌ Wave 0 |
| CAP-14 | reverse indexes present and useful | migration/Postgres | catalog/index test + `EXPLAIN` fixture check | ❌ Wave 0 |
| QUAL-01 | focused/root OpenAPI, Go JSON DTO, TS DTO requiredness and central helper parsing agree | named cross-layer contract test | `docker compose exec -T team4sv30-backend go test ./internal/handlers -run Phase136ContractParity -count=1` | ❌ Wave 0: `backend/internal/handlers/phase136_contract_parity_test.go` |
| QUAL-04 | migration fresh up/down | Postgres integration | extend fresh proof pattern | partial |

### Sampling Rate
- **Per task commit:** focused package/test file plus `git diff --check`.
- **Per wave merge:** backend relevant packages and frontend targeted Vitest/typecheck.
- **Phase gate:** fresh up/down, full backend/frontend checks, build, and cross-surface `karaoke_fx` catalog test.

### Wave 0 Gaps
- [ ] New migration contract/fresh proof test for next migration.
- [ ] Catalog completeness test covering every action including `review.*` and every role context.
- [ ] Shared role adapter test proving an injected unknown/new role renders without per-consumer edits.
- [ ] Contract parity test/fixtures for focused OpenAPI, root OpenAPI, Go JSON and TS types.
- [ ] Cross-surface `karaoke_fx` tests for members, profiles, credits, badges, role points, selectors and filters.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | indirect | Preserve existing validated Keycloak identity and central auth seam. [VERIFIED: project docs] |
| V3 Session Management | indirect | Refresh-valid protected requests use central client. [VERIFIED: auth docs] |
| V4 Access Control | yes | Server-side default-deny, scope by group, deny precedence, non-deniable platform bypass, BOLA negatives. [VERIFIED: phase decisions] |
| V5 Input Validation | yes | Go request validation plus DB FK/CHECK/UNIQUE. [VERIFIED/CITED: project patterns; PostgreSQL docs] |
| V6 Cryptography | no new crypto | Use Keycloak/JWT stack unchanged; never hand-roll. [VERIFIED: scope] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-group override by foreign IDs | Elevation/Tampering | Scope target membership/group server-side; composite keys/FKs; negative tests. [VERIFIED: milestone pitfalls] |
| Override of protected admin capability | Elevation | fail-closed catalog flag + server validation + platform bypass invariant. [VERIFIED: D-02–D-06] |
| Audit omission or partial commit | Repudiation | Phase-137 transaction couples state change and immutable audit. [VERIFIED: D-08/D-11] |
| Catalog metadata injection | Spoofing/XSS | Return data as JSON and render text; stable allowlisted semantic presentation keys. [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- Team4s source files and migrations listed in the inventory — inspected 2026-08-20.
- `136-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, project research and engineering/auth/API/UI docs.
- https://www.postgresql.org/docs/16/ddl-constraints.html — FK, CHECK, UNIQUE and indexing constraints.
- https://www.postgresql.org/docs/16/indexes-unique.html — unique-index behavior.

### Secondary (MEDIUM confidence)
- None required; project-local implementation evidence is primary for the brownfield architecture.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions and runtime verified from repository and Compose.
- Architecture: HIGH - existing seams and duplicates directly inspected.
- Pitfalls: HIGH - tied to current code, locked decisions, and official PostgreSQL behavior.

**Research date:** 2026-08-20
**Valid until:** 2026-09-19
