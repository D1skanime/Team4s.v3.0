---
phase: 138-effective-rights-administration-impact-ux
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - shared/contracts/admin-capabilities.yaml
  - backend/internal/repository/authz_capability_mutations.go
  - backend/internal/repository/authz_capability_mutations_test.go
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/permissions/effective_rights.go
  - backend/internal/permissions/effective_rights_test.go
  - backend/internal/handlers/admin_capability_handler_test.go
  - backend/cmd/server/admin_routes.go
  - frontend/src/types/admin-capability.ts
autonomous: true
requirements: [CAP-09, CAP-10]
must_haves:
  truths:
    - "A platform admin can preview one role-capability grant/revoke without mutating data."
    - "Impact includes real role holders and effective before/after outcomes, including retained access through other sources."
    - "Preview uses set-based repository reads and the canonical resolver; no N+1 per-user SQL pattern is introduced."
    - "Role-capability mutation returns explicit persisted/pending/active/failed activation state instead of a generic success message."
    - "Reload failure cannot be reported as final active success."
---

<objective>
Add the backend contract needed for role-capability impact preview and truthful activation status.

Purpose: CAP-09 and CAP-10 cannot be implemented correctly in the current frontend-only contract.
Output: preview endpoint, impact DTOs, activation-aware mutation result and tests.
</objective>

<context>
@138-CONTEXT.md
@138-RESEARCH.md
@backend/internal/handlers/admin_capability_handler.go
@backend/internal/repository/authz_capability_mutations.go
@backend/internal/permissions/effective_rights.go
@backend/internal/permissions/permissions.go
@shared/contracts/admin-capabilities.yaml
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Define role-capability impact and mutation-status contracts</name>
  <read_first>shared/contracts/admin-capabilities.yaml; frontend/src/types/admin-capability.ts; Phase-136 contract conventions</read_first>
  <files>shared/contracts/admin-capabilities.yaml, frontend/src/types/admin-capability.ts, backend/internal/handlers/admin_capability_handler_test.go</files>
  <behavior>
    - Add `RoleCapabilityImpactPreview` with role/action/operation, role_holder_count, gain_count, lose_count, retain_count and items.
    - Each item includes target user id/display label, group id/name, before `EffectiveRightState`, after `EffectiveRightState`, and a machine-readable outcome `gain|lose|retain|unchanged`.
    - Add `RoleCapabilityMutationResult` with `status: changed|no_op`, `activation_status: persisted|pending|active|failed`, role_code, action_code, operation.
    - Preview operation is `grant|revoke`.
  </behavior>
  <action>Update OpenAPI/contract and mirrored frontend types first. Reuse `EffectiveRightState`; do not create a reduced competing rights DTO.</action>
  <verify><automated>cd backend &amp;&amp; go test ./internal/handlers -run Capability -count=1</automated></verify>
  <done>Cross-layer types define exactly what CAP-09/CAP-10 need.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add set-based role-holder projection and impact preview endpoint</name>
  <read_first>authz_capability_mutations.go; authz_permissions.go; fansub_group_app_members_repository.go; permissions/effective_rights.go</read_first>
  <files>backend/internal/repository/authz_capability_mutations.go, backend/internal/repository/authz_capability_mutations_test.go, backend/internal/permissions/effective_rights.go, backend/internal/permissions/effective_rights_test.go, backend/internal/handlers/admin_capability_handler.go, backend/internal/handlers/admin_capability_handler_test.go, backend/cmd/server/admin_routes.go</files>
  <behavior>
    - Repository lists active `(app_user_id, display_name, group_id, group_name)` assignments for one group role in one set query.
    - Synthetic global app roles remain analysis-only/non-editable and are rejected by preview just like mutation.
    - Preview endpoint is `POST /api/v1/admin/role-capabilities/:roleCode/:actionCode/impact` with body `{operation:"grant"|"revoke"}`.
    - Endpoint requires platform admin before target detail is disclosed.
    - For each role holder, compute canonical before rights and simulated after rights using the same resolver semantics.
    - Simulation must not mutate DB/cache. It may use an explicit in-memory role-capability overlay accepted by a dedicated preview helper in the permissions layer, but must reuse the same precedence code path.
    - Count outcomes from before/after allowed state; preserve source/provenance in both snapshots.
  </behavior>
  <action>Implement a side-effect-free preview seam. Avoid querying the database once per user. Load the impacted assignment set and supporting rights inputs in bounded set queries, then evaluate with the shared resolver logic.</action>
  <verify><automated>cd backend &amp;&amp; go test ./internal/repository ./internal/handlers ./internal/permissions -run 'Capability|Impact|Effective' -count=1</automated></verify>
  <done>Preview accurately distinguishes effective gain/loss/retain without writing role_capabilities or cache.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Return truthful activation status from grant/revoke</name>
  <read_first>AdminCapabilityHandler GrantCapability/RevokeCapability; permissions.Service.ReloadCache; existing lockout tests</read_first>
  <files>backend/internal/handlers/admin_capability_handler.go, backend/internal/handlers/admin_capability_handler_test.go</files>
  <behavior>
    - Successful DB mutation followed by successful `ReloadCache` returns `activation_status=active`.
    - Successful DB mutation followed by reload failure returns HTTP 200 with `activation_status=failed` (or `pending` only if a retry/async activation mechanism is actually implemented in this plan).
    - A no-op grant/revoke is represented as `status=no_op` if repository semantics can detect it; otherwise keep `changed` only and do not invent no-op detection.
    - Existing 409 lockout and 422 role-not-capability-bearing behavior remains unchanged.
    - Audit payload records operation and activation_status.
  </behavior>
  <action>Replace generic `{message: ...}` responses with the typed mutation result. Do not roll back a successfully persisted matrix write merely because cache reload fails; report the split state truthfully.</action>
  <verify><automated>cd backend &amp;&amp; go test ./internal/handlers -run Capability -count=1</automated></verify>
  <done>The client can distinguish persisted data from active enforcement and no false final success remains.</done>
</task>

</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| Preview leaks memberships | Require platform-admin authorization before repository reads. |
| Preview diverges from runtime | Reuse resolver semantics and `EffectiveRightState`. |
| N+1 on large roles | Set-based holder projection and bounded rights inputs. |
| Stale cache reported as success | Explicit activation_status in mutation result. |
</threat_model>

<verification>Backend handler/repository/permissions tests plus contract consistency and `git diff --check`.</verification>
<success_criteria>Backend supports truthful CAP-09 preview and CAP-10 mutation activation state.</success_criteria>
<output>After completion, create `138-04-SUMMARY.md`.</output>
