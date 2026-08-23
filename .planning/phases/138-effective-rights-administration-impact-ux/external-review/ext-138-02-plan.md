---
phase: 138-effective-rights-administration-impact-ux
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/lib/api.ts
  - frontend/src/lib/api.auth-refresh.test.ts
  - frontend/src/types/admin-capability.ts
  - frontend/src/app/admin/users/tabs/effectiveRightsViewModel.ts
  - frontend/src/app/admin/users/tabs/effectiveRightsViewModel.test.ts
autonomous: true
requirements: [CAP-08, UADM-01]
must_haves:
  truths:
    - "The frontend can inspect, mutate and read history from the existing Phase-137 effective-rights endpoints through the central refresh-capable API client."
    - "No component reads tokens or constructs Authorization headers."
    - "A deterministic view-model maps resolver provenance to concise German UI labels without changing authorization semantics."
---

<objective>
Expose the Phase-137 effective-rights contract to the frontend and create a pure presentation adapter.

Purpose: the user-in-group editor must consume the canonical resolver directly, not the old two-boolean group-rights summary.
Output: typed API helpers and tested view-model utilities.
</objective>

<context>
@138-CONTEXT.md
@138-RESEARCH.md
@frontend/src/lib/api.ts
@frontend/src/types/admin-capability.ts
@backend/internal/handlers/admin_effective_rights_handler.go
@shared/contracts/admin-capabilities.yaml
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add central API helpers for Phase-137 effective-rights endpoints</name>
  <read_first>frontend/src/lib/api.ts protected API helper seam; backend/internal/handlers/admin_effective_rights_handler.go; frontend/src/types/admin-capability.ts</read_first>
  <files>frontend/src/lib/api.ts, frontend/src/lib/api.auth-refresh.test.ts</files>
  <behavior>
    - `getAdminUserEffectiveRights(groupId, userId)` calls GET `/api/v1/admin/fansubs/{groupId}/app-members/{userId}/effective-rights`.
    - `mutateAdminUserCapabilityOverride(groupId, userId, request)` calls PUT `/api/v1/admin/fansubs/{groupId}/app-members/{userId}/capability-overrides`.
    - `getAdminUserCapabilityOverrideHistory(groupId, userId, limit?, offset?)` calls the history endpoint.
    - All calls use the existing refresh-capable protected request seam.
    - Responses unwrap the backend `{data: ...}` envelopes into the existing frontend types.
  </behavior>
  <action>Add the three typed helpers beside other protected admin helpers. Reuse `EffectiveRightState`, `CapabilityOverrideMutationRequest`, `CapabilityOverrideMutationResult` and `CapabilityOverrideAuditItem`; do not fork equivalent types.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/lib/api.auth-refresh.test.ts --reporter=dot</automated></verify>
  <done>The frontend can use every Phase-137 effective-rights endpoint without bypassing central auth refresh.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build a pure effective-rights presentation model</name>
  <read_first>frontend/src/types/admin-capability.ts; 138-CONTEXT.md</read_first>
  <files>frontend/src/app/admin/users/tabs/effectiveRightsViewModel.ts, frontend/src/app/admin/users/tabs/effectiveRightsViewModel.test.ts</files>
  <behavior>
    - Group actions by canonical `category` metadata supplied by the capability matrix/catalog, never by hard-coded action-code prefixes.
    - Produce concise effective labels: Erlaubt, Nicht erlaubt, Persönlich entzogen, Persönlich zusätzlich erlaubt.
    - Produce source labels from `decisive_source` and all `granting_roles`.
    - Preserve all raw resolver fields for detail expansion.
    - Mark `non_deniable` as non-revokable.
    - Translate known provenance enum values to German labels while leaving unknown reason codes visible in a technical-details fallback.
  </behavior>
  <action>Implement only pure functions. Do not compute authorization outcomes; map the resolver result to UI text and grouping metadata.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/effectiveRightsViewModel.test.ts --reporter=dot</automated></verify>
  <done>Presentation helpers are deterministic and cannot diverge from resolver decisions.</done>
</task>

</tasks>

<verification>Focused API/auth-refresh and pure view-model tests.</verification>
<success_criteria>All Phase-137 rights data is reachable from the frontend through one typed and testable seam.</success_criteria>
<output>After completion, create `138-02-SUMMARY.md`.</output>
