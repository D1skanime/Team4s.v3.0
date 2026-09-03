---
phase: 145
slug: mitgliedschafts-grundausstattung-in-die-rechte-registry-berf
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-03
---

# Phase 145 — Validation Strategy

> Authored directly from ROADMAP.md's six Success Criteria for this phase — no researcher spawn
> (user decision: the open points are repo-internal and answerable via the pattern-mapper pass,
> not external research). Phase 145 has no requirement IDs (`Requirements: TBD`); each block below
> cites the Success Criterion number instead of REQ-XX.
>
> **Grounding facts found in code (not restated in ROADMAP.md, load-bearing for the plans):**
> - `membershipBaselineActions` (`backend/internal/permissions/effective_rights.go:74-78`) is a
>   fixed 3-action `[]Action` slice; `IsMembershipBaselineAction` (`:80-82`) is a `slices.Contains`
>   check against it. It has exactly one call site: the precedence `switch` in
>   `ResolveGroupRights` at `:356`, positioned after `state.UserAllow` and before
>   `len(state.GrantingRoles) > 0` — this exact ordering is the precedence contract and must survive
>   the refactor unchanged.
> - `role_definitions` (`database/migrations/0085_role_definitions_seed.up.sql`) and
>   `role_capabilities` (`database/migrations/0108_capability_registry.up.sql`, PK
>   `(role_code, action_code)`, FK-cascaded to both `role_definitions` and `action_definitions`) are
>   the two tables the pseudo-role must be seeded into. All three baseline actions
>   (`fansub_group.members.view` [check exact code — ROADMAP calls it `fansub_group_media.view`/
>   `.upload`/`fansub_group.members.view`, confirm literal `Action` constants during planning],
>   `fansub_group_media.view`, `fansub_group_media.upload`) already exist in `action_definitions`
>   and are already assigned to 15 other roles via `role_capabilities` — so `action_definitions` and
>   the FK targets need no new rows, only new `role_definitions` + `role_capabilities` rows for the
>   new pseudo-role code.
> - Startup fail-closed precedent: `validateCapabilityCatalog`
>   (`backend/internal/permissions/permissions.go:387-402`) already aborts startup if any known
>   `Action` is missing from the loaded `role_capabilities` map AND not in `standaloneActions`. This
>   existing check does **not** cover Success Criterion 6 (a missing pseudo-role-specific row set) —
>   because the 3 baseline actions are already present in `role_capabilities` for other roles, the
>   existing check passes even if the *pseudo-role's own* rows are absent. A new, distinct check is
>   required, called from the same `LoadCache`/`LoadFansubGroupCatalog` startup path.
> - `fansubGroupRoleCatalog` (assignable) vs. `capabilityRoleCatalog` (capability-editable) are two
>   separately loaded/queried slices in `permissions.go` (`FansubGroupRoles()` /
>   `IsCapabilityRole()`, `:451-469`), populated by `LoadFansubGroupCatalog` from two distinct
>   repository queries. Success Criterion 5 requires the pseudo-role to appear in the
>   `capabilityRoleCatalog` query result but NOT the `fansubGroupRoleCatalog` query result — a SQL
>   filter difference, not new Go logic.
> - `RoleCapabilityDetail.tsx:9`'s `membershipBaselineCodes` constant is the second hardcode named in
>   `145-UI-SPEC.md`'s Scope Note and Interaction Contract item 6 — it must keep filtering the 3
>   codes out of every *other* role's `configurableActions`, and stop filtering them only for
>   `role.role_kind === 'reserved_baseline'`.
> - `GuidedRevokeFlow.tsx`'s `decisiveSourceFallback()` and `userGroupRightsHelpers.ts`'s
>   `decisiveSourceLabel()` already branch on `decisive_source === 'membership_baseline'` distinctly
>   from `'group_role'` — UI-SPEC's Scope Note requires these two functions to stay byte-identical;
>   the backend must keep emitting `decisive_source: 'membership_baseline'` (never `'group_role'`)
>   for these 3 actions even though they now resolve via the pseudo-role's `role_capabilities` rows
>   rather than the Go slice.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | `go test`, no separate config file |
| **Backend quick run** | `docker compose exec -T team4sv30-backend go test ./internal/permissions/... ./internal/repository/... -run <Test> -count=1 -v` |
| **Backend full build/vet gate** | `docker compose exec -T team4sv30-backend go build ./... && docker compose exec -T team4sv30-backend go vet ./...` |
| **Backend real-Postgres migration test** | requires the phase's own DSN-gated test package pattern (see prior phases' `TEAM4S_PHASE1xx_TEST_DSN` convention) — exact env var name is a planning decision, not yet fixed |
| **Frontend framework** | vitest 3.x, config `frontend/vitest.config.ts` |
| **Frontend quick run** | `docker compose exec -T team4sv30-frontend npx vitest run <path>` |
| **Frontend full suite** | `docker compose exec -T team4sv30-frontend npx vitest run` |
| **Frontend lint** | `docker compose exec -T team4sv30-frontend npx eslint .` — the touched files (`RoleRail.tsx`, `RoleDetailPanel.tsx`, `RoleCapabilityDetail.tsx`, `RolesClient.tsx`) are not on the legacy `no-restricted-syntax` exemption list; zero new native-primitive violations allowed (CLAUDE.md Frontend-UI rule) |
| **Estimated runtime** | ~60-90s scoped backend + frontend; full backend suite has known pre-existing failures unrelated to this phase (see prior phases' "Backend Gate Qualification" — re-verify current baseline before treating any failure as a regression) |

---

## Sampling Rate

- **After every task commit:** run the scoped backend test(s) for the touched package + scoped frontend test(s) for the touched component
- **After every plan wave:** `go build ./... && go vet ./...`, full frontend suite (`npx vitest run`), `npx eslint .` on touched files
- **Before `/gsd:verify-work`:** every criterion below's named command passes; frontend full suite green; no new eslint `no-restricted-syntax` violations
- **Max feedback latency:** ~90s (frontend full suite dominates)

---

## Per-Criterion Validation Strategy

### Success Criterion 1 — `membershipBaselineActions` removed as a rights source; the precedence `switch` reads from loaded `role_capabilities`

- **Measurement:** (a) a source-absence assertion — `membershipBaselineActions` (the Go slice) and
  the free-standing `IsMembershipBaselineAction` slice-membership check no longer exist in
  `effective_rights.go`; (b) a behavior assertion — a unit/integration test against
  `ResolveGroupRights` proves the 3 actions still resolve to `Allowed: true` for an active member
  with no matching role grant, sourced from the pseudo-role's loaded `role_capabilities` entry, not
  a hardcoded list.
- **Pass condition:** grep for `membershipBaselineActions` in `backend/internal/permissions/` returns
  zero matches (absence check, permitted per CLAUDE.md Teststil exception 1); the behavior test
  passes and its assertion inspects `state.Allowed`/`state.DecisiveSource` from a real
  `ResolveGroupRights` call, not a string search of the resolver's source file.
- **Automated command:** `grep -rn "membershipBaselineActions" backend/internal/permissions/ || echo CLEAN` and `docker compose exec -T team4sv30-backend go test ./internal/permissions/... -run TestResolveGroupRightsBaselineActionsSourcedFromRegistry -v -count=1`

### Success Criterion 2 — reversible migration seeds exactly the 3 actions; effective rights identical pre/post migration

- **Measurement:** a real-Postgres integration test that (a) resolves effective rights for a fixture
  active member BEFORE the new migration's seed rows exist (using the pre-migration
  `membershipBaselineActions` code path, or a snapshot fixture recorded before this phase), (b)
  applies the migration, (c) re-resolves the same fixture member's effective rights, and (d) asserts
  the resulting `Allowed`/`DecisiveSource` per action is byte-identical for all 3 baseline actions —
  and that no 4th action becomes newly granted or an existing one newly ungranted for that role_code.
- **Pass condition:** the up-migration inserts exactly 3 `role_capabilities` rows for the pseudo-role
  (query `SELECT action_code FROM role_capabilities WHERE role_code = '<pseudo_role_code>' ORDER BY
  action_code` returns exactly the 3 expected codes, no more, no fewer); the down-migration removes
  them cleanly (`DELETE ... WHERE role_code = '<pseudo_role_code>'` verified empty after rollback,
  with no FK violation); the before/after effective-rights snapshot test passes.
- **Automated command:** `docker compose exec -T team4sv30-backend go test ./internal/repository/... -run TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights -v -count=1`

### Success Criterion 3 — `membership_baseline` provenance preserved; precedence chain and contract enums unchanged; explanatory UI strings unchanged

- **Measurement:** (a) a unit test asserting the precedence `switch`'s case order in
  `ResolveGroupRights` still evaluates `user_deny > user_allow > membership_baseline > role_grant`
  in that order (e.g. a fixture actor with both a pseudo-role-sourced baseline grant AND a
  `user_deny` row on the same action resolves to denied, `DecisiveSource == "user_deny"`, not
  `"membership_baseline"`); (b) a contract-file diff check — `shared/contracts/admin-capabilities.yaml`,
  `shared/contracts/openapi.yaml`, `frontend/src/types/admin-capability.ts` are byte-unchanged by
  this phase's diff for their provenance-enum sections; (c) an absence-style check that
  `GuidedRevokeFlow.tsx` and `userGroupRightsHelpers.ts` are untouched by this phase's diff
  (UI-SPEC's explicit "no change" contract).
- **Pass condition:** precedence test passes; `git diff` (scoped to the phase's commits) shows zero
  hunks touching the provenance enum blocks in the three contract files; `git diff --stat` shows
  `GuidedRevokeFlow.tsx` and `userGroupRightsHelpers.ts` absent from the changed-files list.
- **Automated command:** `docker compose exec -T team4sv30-backend go test ./internal/permissions/... -run TestResolveGroupRightsPrecedenceOrderUnchangedAfterRegistryMigration -v -count=1` and `git diff --stat <phase-145-base>..HEAD -- frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts` (must print nothing)

### Success Criterion 4 — `user_deny` still revokes a baseline right; baseline still requires active membership

- **Measurement:** two integration tests against `ResolveGroupRights`: (a) active member + stored
  `user_deny` on one of the 3 baseline actions → `Allowed: false`, `DecisiveSource: "user_deny"`; (b)
  non-active member (no membership row, or `ActiveMembership: false`) → all 3 baseline actions
  resolve `Allowed: false` regardless of any pseudo-role `role_capabilities` row.
- **Pass condition:** both tests pass against the post-migration schema (pseudo-role rows present).
- **Automated command:** `docker compose exec -T team4sv30-backend go test ./internal/permissions/... -run "TestResolveGroupRightsUserDenyOverridesRegistrySourcedBaseline|TestResolveGroupRightsBaselineRequiresActiveMembership" -v -count=1`

### Success Criterion 5 — pseudo-role unassignable but capability-editable

- **Measurement:** two catalog-query tests: (a) `FansubGroupRoles()` (or its backing repository
  query) does NOT include the pseudo-role code; (b) `IsCapabilityRole()` (or its backing query) DOES
  include the pseudo-role code. Both asserted against the real loaded catalog after
  `LoadFansubGroupCatalog` runs against a fixture DB with the new migration applied.
- **Pass condition:** both assertions hold in the same test run against one fixture DB state — a
  test that only checks one direction is insufficient (mirrors the exact-count discipline used in
  Phase 144's validation for this reason).
- **Automated command:** `docker compose exec -T team4sv30-backend go test ./internal/permissions/... -run TestPseudoRoleCapabilityEditableButNotAssignable -v -count=1`

### Success Criterion 6 — missing pseudo-role `role_capabilities` rows abort startup fail-closed

- **Measurement:** a unit test that constructs a `LoadRoleCapabilities` result map missing the
  pseudo-role's entry entirely (or with fewer than the expected 3 actions) and asserts the new
  startup validation function returns a non-nil error whose message identifies the pseudo-role by
  code — mirroring `validateCapabilityCatalog`'s existing error-shape convention
  (`permissions.go:399`), not a generic panic or silent skip.
- **Pass condition:** the test calling `LoadCache`/`LoadFansubGroupCatalog` (or whichever function
  wires the new check) with the incomplete map returns an error and does NOT set `loadedCache`
  (verify via a subsequent read returning the pre-call state, proving the "publish only after
  successful validation" pattern noted in the existing code's comments is preserved).
- **Automated command:** `docker compose exec -T team4sv30-backend go test ./internal/permissions/... -run TestLoadCacheFailsClosedWhenPseudoRoleCapabilitiesMissing -v -count=1`

---

## Cross-Cutting: Frontend `RoleCapabilityDetail.tsx` Hardcode Removal (145-UI-SPEC.md Interaction Contract items 1-7)

- **Measurement:** a component test asserting (a) for a normal role (`role_kind !== 'reserved_baseline'`),
  the 3 baseline action codes remain filtered out of `configurableActions` and the updated static
  sentence + `Button` deep-link render; (b) for the pseudo-role
  (`role_kind === 'reserved_baseline'`), all 3 actions render as normal toggleable `Switch` rows
  through the existing accordion/category machinery — no special-cased rendering path — and the
  caution-line copy renders instead of the deep-link sentence.
- **Pass condition:** both branches asserted in the same test file; UI-SPEC's exact copy strings
  (Copywriting Contract table) are matched with correct Umlaute (CLAUDE.md Sprachqualität rule) —
  assert via `screen.getByText` exact-match, not substring/regex that would tolerate ASCII
  fallback.
- **Automated command:** `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/roles/RoleCapabilityDetail.test.tsx`
- **Global UI primitives constraint (explicit user directive, applies to every touched file in this
  phase):** no new native `<select>`/`<input>`/`<textarea>`/`<button>` or bespoke markup — only
  `@/components/ui` primitives and existing design tokens (`RoleRail.tsx`, `RoleDetailPanel.tsx`,
  `RoleCapabilityDetail.tsx`, `RolesClient.tsx` already exclusively use `Tabs`/`Accordion`/`Switch`/
  `Button` per UI-SPEC's Design System table — this phase adds zero new primitive usage, only new
  branches within existing ones). Verify: `docker compose exec -T team4sv30-frontend npx eslint . --rule '{"no-restricted-syntax":"error"}'` scoped to the 4 touched files shows zero findings.

---

## Wave 0 Requirements

- [ ] New backend test file(s) under `backend/internal/permissions/` covering Success Criteria 1, 3,
      4, 6 (no existing file currently exercises pseudo-role-sourced baseline resolution — this is
      genuinely new test surface, not an extension of an existing suite)
- [ ] New backend real-Postgres migration test under `backend/internal/repository/` covering Success
      Criterion 2 (before/after effective-rights snapshot)
- [ ] New frontend test file `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` (or
      extension of an existing one, if the planner finds `RoleCapabilityDetail.tsx` already has test
      coverage — confirm during planning, this file was not found in the pattern-mapper's remit at
      VALIDATION.md authoring time)

---

## Manual-Only Verifications

| Behavior | Success Criterion | Why Manual | Test Instructions |
|----------|--------------------|------------|--------------------|
| Admin opens `/admin/roles`, sees the pseudo-role first in "Gruppenrollen", toggles one of its 3 baseline actions off via the Capability Matrix, and confirms the change is reflected for a real active group member's effective rights | 1, 5, 6 (integration confidence) | End-to-end operator experience across DB seed → backend cache reload → frontend matrix → resolved rights is not fully provable by isolated unit tests alone | Log into `http://127.0.0.1:3300`, navigate to `/admin/roles`, locate "Mitgliedschafts-Grundausstattung" as the first row under Gruppenrollen, open its Capability Matrix tab, toggle one action, then verify a real active member of any fansub group loses/gains that specific right in the effective-rights view |

---

## Validation Sign-Off

- [ ] All 6 Success Criteria and the cross-cutting frontend item have an automated verify command
- [ ] Sampling continuity: every criterion maps to a runnable command, no gaps
- [ ] Wave 0 requirements above are satisfied before their dependent tasks are marked verified
- [ ] No watch-mode flags used anywhere above (`vitest run`, not `vitest watch`)
- [ ] Feedback latency ~90s, within budget
- [ ] `nyquist_compliant: true` — to be set once gsd-plan-checker confirms every task in every plan
      carries one of the automated verify commands above (or an equivalent it introduces with the
      same assertion strength)
- [ ] Teststil-Konvention (CLAUDE.md): every behavior assertion above executes real code via
      `httptest`/direct function calls against a fake or real repository — no `os.ReadFile` +
      `strings.Contains` substitutes for a behavior claim. The one permitted absence-style check
      above (Success Criterion 1's `grep` for `membershipBaselineActions`) is an absence check, the
      explicit CLAUDE.md exception, not a behavior claim.

**Approval:** pending
