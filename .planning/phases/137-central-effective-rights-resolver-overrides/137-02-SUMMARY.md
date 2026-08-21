---
phase: 137-central-effective-rights-resolver-overrides
plan: 02
subsystem: api
tags: [openapi, typescript, go, contracts, authorization, capability-policy]

# Dependency graph
requires:
  - phase: 136-capability-policy-catalog-schema-contract
    provides: EffectiveRightState/CapabilityOverrideState/Mutation/Audit DTOs (5-field EffectiveRightState, 4-value EffectiveRightProvenance enum), user_overridable fail-closed catalog flag
provides:
  - EffectiveRightState additively extended with granting_roles[], user_allow, user_deny, specialized_grants[], decisive_source, reason_code (D04 full provenance model)
  - EffectiveRightProvenance vocabulary extended with platform_admin, specialized_grant, no_grant (kept as the reused type for decisive_source)
  - CapabilityActivationStatus documented as Phase-137 active-only (enum values unchanged)
  - New contract-lock test proving the additive shape across focused YAML / root OpenAPI mirror / TS, and guarding against a competing "inspector" DTO
affects: [137-03, 137-04, 137-05, 137-06, 137-07, 137-08, 138]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only OpenAPI schema extension: new required fields/enum values added to an existing shipped DTO, verified via a dedicated Go contract test that also regression-checks the untouched sibling schemas (CapabilityOverrideState/Mutation/Audit) stayed byte-for-byte identical."
    - "decisive_source reuses the EffectiveRightProvenance enum type (via allOf $ref) rather than introducing a second parallel vocabulary, keeping D04's 'granting sources + the one that decided' model expressed with one enum."

key-files:
  created:
    - backend/internal/handlers/admin_capability_contract_test.go
  modified:
    - shared/contracts/admin-capabilities.yaml
    - shared/contracts/openapi.yaml
    - frontend/src/types/admin-capability.ts
    - backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go

key-decisions:
  - "decisive_source is a new field distinct from the existing provenance/decisive fields (not a replacement) — must_haves explicitly required preserving provenance/decisive/non_deniable verbatim while D04 additionally needs a field naming exactly which source won; both now coexist."
  - "New EffectiveRightProvenance value chosen as no_grant (not default_deny) to match D01/Section 5's own step label 'No grant' — the plan text offered no_grant/default_deny as alternatives and left the exact literal to this plan's discretion."
  - "All six new EffectiveRightState fields (granting_roles, user_allow, user_deny, specialized_grants, decisive_source, reason_code) were added to the schema's required list, not left optional — no production consumer exists yet (Phase 138 is the first UI consumer), so there is no backward-compatibility reason to make them optional, and requiring them lets the contract test assert their presence precisely."
  - "The Go backend DTO in backend/internal/handlers/capability_policy_contract.go was intentionally left untouched in this plan — 137-02-PLAN.md's own <files> list scopes this plan to the YAML/OpenAPI/TS contract layer only; extending the Go struct is deferred to whichever later Phase-137 plan implements the actual ResolveGroupRights resolver (per 137-RESEARCH.md's recommended new effective_rights.go file), avoiding a premature/unused Go field set in this contract-only plan."

patterns-established:
  - "When an additive schema change breaks a prior phase's shape-lock test (here: phase136_policy_yaml_ts_contract_test.go's exact expectedObjects/expectedEnums maps), update that lock test's expectations in the same commit rather than leaving it red — the lock test's job is to prevent unintentional drift, not to freeze a schema against its own phase's approved extension."

requirements-completed: [CAP-01, CAP-02, CAP-05, CAP-07]

# Metrics
duration: ~15min
completed: 2026-08-21
---

# Phase 137 Plan 02: EffectiveRightState Provenance Extension Summary

**Additively extended the Phase-136 EffectiveRightState/EffectiveRightProvenance OpenAPI contract (focused + root mirror + TypeScript) with D04's full provenance model — granting_roles, user_allow, user_deny, specialized_grants, decisive_source, reason_code, plus three new provenance enum values — closing the DTO gap before any Phase-137 backend route consumes it.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-21T17:34:37Z
- **Completed:** 2026-08-21T17:42:25Z
- **Tasks:** 1 completed
- **Files modified:** 5 (3 planned modifications + 1 planned new test file + 1 out-of-plan lock-test fix)

## Accomplishments

- `EffectiveRightState` in both `shared/contracts/admin-capabilities.yaml` (focused) and `shared/contracts/openapi.yaml` (root mirror) now carries all of D04's minimum conceptual data: `granting_roles: string[]`, `user_allow: boolean`, `user_deny: boolean`, `specialized_grants: string[]`, `decisive_source` (reusing the `EffectiveRightProvenance` enum via `allOf`), and `reason_code: string` — all six added to the schema's `required` list — while every one of Phase 136's original five fields (`action_code`, `allowed`, `provenance`, `decisive`, `non_deniable`) remains present and untouched.
- `EffectiveRightProvenance` gained `platform_admin`, `specialized_grant`, and `no_grant` on top of the original four values (`idp_global_role`, `group_role`, `user_allow`, `user_deny`), enabling full precedence-source representation without a breaking enum change.
- `CapabilityActivationStatus` keeps its exact four-value enum (`persisted`, `active`, `pending`, `failed`) unchanged but now carries a description documenting that Phase 137 mutations only ever emit `active`.
- `frontend/src/types/admin-capability.ts` mirrors both extensions exactly (union type + interface fields), matching the OpenAPI shape field-for-field.
- No competing richer "inspector" DTO was introduced — `EffectiveRightState` is the single type serving both mutation results and the future Effective-Rights Inspection endpoint, per the plan's binding constraint.
- New `backend/internal/handlers/admin_capability_contract_test.go` (`TestEffectiveRightStateProvenanceContract`, `TestCapabilityOverrideSchemasUnchangedContract`) proves: the additive shape is identical across focused/root/TS; Phase-136's original fields/values are still present; the four untouched sibling schemas (`CapabilityOverrideState`, `CapabilityOverrideAuditItem`, `CapabilityOverrideMutationResult`, `CapabilityOverrideMutationRequest`) and `CapabilityActivationStatus`'s enum are byte-for-byte stable; and no schema name contains "inspector".

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend EffectiveRightState and provenance vocabulary additively** - `32752488` (feat) - `go test ./internal/handlers -run 'Capability.*Contract|EffectiveRight' -count=1` passes; `git diff --check` clean; full `internal/handlers` package re-run after fixing the pre-existing Phase-136 lock test shows zero regressions from this plan's own files.

**Plan metadata:** (this commit, once created)

## Files Created/Modified

- `shared/contracts/admin-capabilities.yaml` - Additively extends `EffectiveRightState`/`EffectiveRightProvenance`/`CapabilityActivationStatus` per D04.
- `shared/contracts/openapi.yaml` - Byte-for-byte mirror of the same additive extension (root umbrella contract).
- `frontend/src/types/admin-capability.ts` - TypeScript mirror: extended `EffectiveRightProvenance` union and `EffectiveRightState` interface, with JSDoc comments carrying the same German documentation as the YAML.
- `backend/internal/handlers/admin_capability_contract_test.go` - New: `TestEffectiveRightStateProvenanceContract` (additive-shape proof across focused/root/TS) and `TestCapabilityOverrideSchemasUnchangedContract` (regression guard for untouched sibling schemas + activation-status documentation + no-competing-inspector-DTO guard).
- `backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go` - Updated `expectedObjects["EffectiveRightState"]` and `expectedEnums["EffectiveRightProvenance"]` to the new additive shape (see Deviations).

## Decisions Made

- **`decisive_source` field type:** reuses `EffectiveRightProvenance` via `allOf: [{ $ref }]` rather than a new enum, since D04's own examples (`decisive_source: user_deny`) use the same vocabulary as `provenance`.
- **New enum value name:** `no_grant` (not `default_deny`), matching D01/Section 5's own step-8 label "No grant" in `137-CONTEXT.md`.
- **All six new fields marked required:** no production consumer exists yet, so requiring them (rather than making them optional) lets the contract precisely lock the full D04 shape from day one.
- **Go DTO (`capability_policy_contract.go`) intentionally not touched:** out of this plan's declared `<files>` scope; deferred to the later Phase-137 plan that implements the actual resolver and will need the Go struct anyway.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed the pre-existing Phase-136 contract-lock test broken by this plan's own additive extension**
- **Found during:** Task 1 verification (`go test ./internal/handlers -run 'Phase136'`)
- **Issue:** `backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go`'s `TestPhase136PolicyYAMLTypeScriptContract` hardcodes the exact pre-Phase-137 `EffectiveRightState` required-field list (5 fields) and `EffectiveRightProvenance` enum (4 values) via `reflect.DeepEqual`/`sameStrings` assertions. Extending the schema additively per this plan's own task (correctly) turned that test red — it is not itself a bug in Phase 136's original design, but a direct, expected consequence of this plan's required work that would otherwise leave the test suite red.
- **Fix:** Updated `expectedObjects["EffectiveRightState"]` and `expectedEnums["EffectiveRightProvenance"]` in that file to the new additive shape (11 required fields, 7 enum values), with an inline comment pointing to the new dedicated `admin_capability_contract_test.go` test for the more detailed assertion.
- **Files modified:** `backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go`
- **Verification:** `go test ./internal/handlers -run 'Phase136|Capability.*Contract|EffectiveRight' -count=1` passes.
- **Committed in:** `32752488` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - regression fix)
**Impact on plan:** Necessary to keep the pre-existing test suite green after the plan's own required additive change; no scope creep — only the two expectation maps directly affected by the new fields/enum values were touched, and the fix's own diff is documented as part of Task 1 (not a separate hidden task).

## Issues Encountered

- `go test ./internal/handlers/...` (full package, unscoped) surfaces ~15 pre-existing failures across files this plan never touched (e.g. `admin_content_fansub_releases_test.go`, `app_auth_test.go`, `public_member_access_matrix_test.go`) — all involve unrelated 403/authorization behavior or DB-integration harness gaps and reproduce identically when run in isolation, with no shared state connecting them to this plan's YAML/TS/contract-test-only changes. Confirmed out of scope per the SCOPE BOUNDARY rule and the environment note's precedent (Phase 133 P11 logged an equivalent pre-existing 11-failure sweep). Not fixed; not this plan's concern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Phase-137 contract layer now has exactly one compatible, provenance-capable `EffectiveRightState` representation. Whichever later Phase-137 plan builds `permissions.GroupRightsResolution`/`ResolveGroupRights` (per `137-RESEARCH.md` Pattern 1) can populate this DTO directly — no second inspector shape needs to be invented, and no further OpenAPI/TS contract work is needed for D04 itself.
- The Go backend DTO (`backend/internal/handlers/capability_policy_contract.go`) still has the old 5-field `EffectiveRightState`/4-value `EffectiveRightProvenance` struct — the next plan that implements the resolver or the Effective-Rights Inspection/Mutation handlers must extend that Go struct to match this now-locked YAML/TS shape before wiring any real endpoint, or its own contract-parity tests (e.g. a future `TestPhase137ContractParity`) will fail.
- `CapabilityActivationStatus` is documented but not yet enforced at the Go/service layer to only emit `active` — that behavioral guarantee belongs to the mutation-service plan (Pattern 3 in `137-RESEARCH.md`), not this contract-only plan.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 02*
*Completed: 2026-08-21*

## Self-Check: PASSED

All created/modified files verified present on disk; both task/summary commit hashes
(`32752488`, `25ef9269`) verified present in `git log`.
