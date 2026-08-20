# Phase 136: Capability Policy, Catalog & Schema Contract - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 136 defines the single policy, catalog, schema, and API-contract foundation for group-scoped per-user capability overrides and canonical assignable roles. It locks precedence, scope, provenance, audit, catalog metadata, role defaults, and cross-surface role contracts before the resolver, administration UI, projections, and review workflows are implemented in later phases. It does not build the effective-rights resolver or the final administration UI.

</domain>

<decisions>
## Implementation Decisions

### Individually overridable capabilities
- **D-01:** Per-user overrides are group-scoped. An override for a user in one fansub group never grants or denies rights in another group.
- **D-02:** A capability is individually overridable only when the canonical capability catalog explicitly marks it, for example with `user_overridable=true`.
- **D-03:** New capabilities are fail-closed for individual overrides: they are not overridable until the catalog metadata and its contract/tests explicitly opt them in.
- **D-04:** Every capability opted into individual overrides supports both personal Allow and personal Deny. Deny has precedence over role-derived and personal Allow decisions.
- **D-05:** Platform/global capabilities and capability-, role-, delegation-, security-, and audit-administration capabilities can never be overridden by group-scoped per-user controls.
- **D-06:** The IdP-owned platform-admin bypass remains non-deniable by group controls.

### Reason and audit policy
- **D-07:** Non-platform administrators must provide a reason when creating an Allow or Deny and when removing an override.
- **D-08:** Platform administrators may mutate overrides without a reason. Actor, timestamp, target, group, capability, before/after state, and the mutation itself are still always audited.
- **D-09:** Reasons use structured categories such as task substitution, security measure, role gap, and other. Selecting `other` requires explanatory free text.
- **D-10:** Platform administrators may see the complete override audit history. Authorized group administrators may see only the history for their own group. Affected users see their current effective rights and provenance, but not the internal audit history.
- **D-11:** Exact idempotent re-submission creates no additional domain audit record. Only real state transitions enter the override history; unauthorized attempts belong in the security/operational log.

### Assignable roles and operative rights
- **D-12:** Role identity and operative capability assignment remain separate. A role may be assignable even if it currently grants no operative capabilities.
- **D-13:** Role selectors stay compact. Only after a zero-right role is selected does the UI show a short contextual message that it currently grants no additional rights; detailed effective rights remain in the separate collapsible rights inspector delivered later.
- **D-14:** Confirmed role defaults are seeded deliberately; the system must not infer broad permissions from a role name.
- **D-15:** `gfxler` receives group-scoped defaults to upload, edit, and reorder group images, logos, and banners.
- **D-16:** `techadmin` receives the same group-media defaults plus permission to edit the fansub page's technical links.
- **D-17:** `founder` receives the same group-media defaults plus permission to edit the founding date and historical group data.
- **D-18:** `co_leader` receives the same group-media defaults plus permission to edit general fansub-page content and links.
- **D-19:** These defaults do not implicitly grant role/capability administration, member administration, or media deletion. Additional exceptions use the normal role-capability mapping or an explicitly permitted per-user override.

### Canonical Karaoke-FX role
- **D-20:** `karaoke_fx` is a distinct, assignable fansub-scene role and must not be merged with `typer` or Typesetting. Its stable role key, German label, ordering, assignability, catalog metadata, and initial capability state are defined centrally in Phase 136.
- **D-21:** `karaoke_fx` initially grants no group-administration capability merely from its role name. Future workflow capabilities can be mapped deliberately when the Karaoke workflow exists.
- **D-22:** `karaoke_fx` is a cross-surface canonical role, not a local UI patch. The same catalog source must feed fansub members, member profiles, release participants/credits, role badges, role points, admin selectors, filters, API contracts, fixtures, and tests.
- **D-23:** Existing role-badge and role-point behavior must recognize `karaoke_fx` everywhere roles are rendered or counted. Hard-coded parallel labels, colors, badge entries, or role lists are not acceptable when the canonical registry can own the data.

### the agent's Discretion
- Exact database column names, enum/check-constraint shape, normalized metadata representation, and reason-category identifiers, provided they preserve the locked behavior above and the reversible fresh-database requirement.
- Exact concise wording and presentation of the contextual zero-right notice, provided it does not overload the existing role selector.
- Exact capability keys used for the confirmed media and fansub-page field permissions, after reconciling them with the existing capability registry and ownership boundaries.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.4 milestone intent and non-goals.
- `.planning/REQUIREMENTS.md` — CAP-03, CAP-04, CAP-11 through CAP-14, QUAL-01, and QUAL-04 requirements assigned to Phase 136.
- `.planning/ROADMAP.md` — Phase 136 boundary, success criteria, and downstream phase ownership.
- `.planning/research/SUMMARY.md` — synthesized current-state findings and recommended sequencing.
- `.planning/research/ARCHITECTURE.md` — existing authorization seams, central resolver direction, and integration boundaries.
- `.planning/research/FEATURES.md` — findings-to-feature comparison and expected inspector/override behavior.
- `.planning/research/STACK.md` — implemented registry/cache baseline and no-new-dependency recommendation.
- `.planning/research/PITFALLS.md` — precedence, scope, BOLA, audit, cache, pagination, and contract-drift gates.

### Product decisions and findings
- `.planning/notes/capability-registry-design.md` — prior capability-registry analysis beyond access rights, including code and architecture improvements.
- `.planning/notes/milestone-intent-rechte-benutzerverwaltung.md` — v1.4 intent and identified zero-right-role data gap.
- `.planning/notes/live-uat-ux-findings.md` — Finding #29 source; user-owned dirty file, reference only and do not modify.

### Authorization and contracts
- `docs/frontend/auth-api-client.md` — protected UI and central refresh-session boundary.
- `shared/contracts/openapi.yaml` — canonical cross-surface OpenAPI contract.
- `shared/contracts/admin-capabilities.yaml` — focused capability/role administration contract.
- `database/migrations/0108_capability_registry.up.sql` — current database-driven capability registry.
- `database/migrations/0112_role_model_cleanup.up.sql` — current assignability and `techadmin`/`gfxler` role baseline; historical migration must not be edited.
- `database/migrations/0121_neutral_role_labels.up.sql` — current canonical German role labels; historical migration must not be edited.

### Engineering boundaries
- `docs/engineering/implementation-contract.md` — reuse-first and no-parallel-contract rules.
- `docs/api/api-contracts.md` — API contract workflow and synchronized surface requirements.
- `docs/agent-guidelines-ui.md` — progressive disclosure and semantic UI control requirements.
- `docs/frontend/ui-system.md` — existing UI-system ownership and reusable patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/permissions/permissions.go`: existing role/capability constants and permission service seam; extend or replace hard-coded role knowledge through the canonical registry rather than adding another permission system.
- `backend/internal/repository/authz_permissions.go`: existing registry-backed permission data access and effective-rights integration seam.
- `backend/internal/handlers/admin_capability_handler.go`: existing capability/role administration handler patterns and DTO boundary.
- `backend/internal/repository/authz_capability_mutations.go`: existing catalog mutation and audit-adjacent repository patterns.
- `frontend/src/app/admin/role-capabilities/`: current catalog administration surface and role detail/master-list patterns.
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`: existing effective-rights inspector seam for later Phase 138 consumers.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx`: existing group-member role selection and grouping seam.
- `frontend/src/components/profile/MemberBadgeChain.tsx`: current role-entry badge/points presentation that the canonical `karaoke_fx` role contract must reach.
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx`, `frontend/src/components/contributions/ContributionCard.tsx`, and `frontend/src/components/contributions/AnimeGroupCard.tsx`: current hard-coded role label/color consumers that demonstrate the required cross-surface catalog migration.

### Established Patterns
- Capability definitions are database-driven and cached; Phase 136 extends this catalog instead of introducing a static Go allowlist.
- `role_definitions.assignable` is the canonical source of assignability from Phase 135.
- Global roles remain Keycloak/IdP-owned and read-only; group-scoped controls cannot deny platform-admin authority.
- Test data is disposable. Add new reversible migrations and fresh fixtures; do not edit historical migrations or build compatibility/backfill logic.
- The existing code contains multiple hard-coded role unions, labels, colors, lists, and tests. Planning must enumerate and converge these consumers so `karaoke_fx` is not fixed on only one page.

### Integration Points
- New catalog metadata and override/audit schema connect to the central permissions service and repository layer used by all authorization consumers.
- OpenAPI, focused admin-capability contracts, backend DTOs, frontend types, and central API helpers must agree before Phase 137/138 consumers are built.
- Role metadata must flow through fansub members, profiles, releases/credits, badge/point calculation, selectors, and filters using one canonical source or generated/shared projection.

</code_context>

<specifics>
## Specific Ideas

- Example of the intended override model: Sorata may hold the professional role `gfxler` and receive personal Allow overrides for editing a particular fansub page and reviewing images in that one group; this must not grant those rights to every `gfxler` or in other groups.
- The user considers the existing role/member UI fragile and overloaded. Phase 136 contracts must enable progressive disclosure rather than adding permanent explanatory text beside every role.
- `typer`/Typesetting and Karaoke FX are two distinct real-world fansub-scene responsibilities. Naming, badges, points, credits, and membership displays must preserve that distinction.

</specifics>

<deferred>
## Deferred Ideas

- The interactive effective-rights resolver and enforcement are Phase 137.
- The compact rights inspector, override editor, impact preview, and contextual role UI are Phase 138.
- Scalable user-administration projections and filtering are Phase 139.
- General badge-UI unification from Finding #34 remains deferred to a later milestone. This does not permit `karaoke_fx` to be omitted from the current existing badge/point system.
- The platform-wide document/initiative library from Finding #33 remains deferred to a later milestone.

</deferred>

---

*Phase: 136-capability-policy-catalog-schema-contract*
*Context gathered: 2026-08-20*
