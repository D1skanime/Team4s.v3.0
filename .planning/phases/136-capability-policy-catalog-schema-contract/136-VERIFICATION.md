---
phase: 136-capability-policy-catalog-schema-contract
verified: 2026-08-20T18:33:35Z
status: gaps_found
score: 3/7 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Confirmed role defaults are narrowly enforceable and do not grant unapproved administration."
    status: failed
    reason: "founder and co_leader receive broader mutation authority than D-15 through D-19 permit."
    artifacts:
      - path: "backend/internal/handlers/fansub_group_history_handler.go"
        issue: "founding_history_edit authorizes create/update of every history event type."
      - path: "backend/internal/handlers/fansub_groups.go"
        issue: "general_edit authorizes status and group_type lifecycle changes."
    missing:
      - "Event-type-aware founding-history authorization, including existing/requested type checks on PATCH."
      - "Stronger authorization for status, group_type, and mixed patches."
      - "Negative handler tests for unrelated history events and lifecycle fields."
  - truth: "Only real successful state transitions are recorded as allowed domain audit events."
    status: failed
    reason: "The link handler records an allowed update before validation and persistence."
    artifacts:
      - path: "backend/internal/handlers/fansub_group_links.go"
        issue: "fansub_group_link.updated is written before validateFansubGroupLinkPatchRequest and UpdateGroupLink."
    missing:
      - "Write the allowed audit event only after a successful scoped repository mutation."
  - truth: "karaoke_fx uses canonical non-neutral presentation across catalog consumers."
    status: failed
    reason: "Migration keys karaoke_fx/karaoke_fx are rejected by the shared semantic allowlists and always collapse to other/user."
    artifacts:
      - path: "database/migrations/0146_capability_policy_catalog.up.sql"
        issue: "Seeds unsupported color_key and icon_key values."
      - path: "frontend/src/lib/roleCatalog.ts"
        issue: "Semantic allowlists do not contain the seeded values."
    missing:
      - "Align database semantic keys with the adapter contract and test the exact migration row."
  - truth: "OpenAPI, Go DTOs, frontend types, and helpers publish one synchronized effective-rights/override/impact/mutation contract."
    status: failed
    reason: "Only TypeScript policy vocabulary exists; neither OpenAPI file nor a Go DTO defines EffectiveRightState, override reason/result, impact, audit item, or activation status. Reason category identifiers also differ from the migration."
    artifacts:
      - path: "frontend/src/types/admin-capability.ts"
        issue: "Defines task_delegation/security_measure/role_gap while SQL permits tasksvertretung/sicherheitsmassnahme/rollenluecke."
      - path: "shared/contracts/admin-capabilities.yaml"
        issue: "Missing the planned effective-rights, override, impact, audit, and mutation-status schemas."
      - path: "shared/contracts/openapi.yaml"
        issue: "Missing the same policy schemas."
      - path: "backend/internal/handlers/phase136_contract_parity_test.go"
        issue: "Checks only catalog field-name substrings and cannot detect the missing policy contract family or optionality drift."
    missing:
      - "Add matching schemas/DTOs/types for D-01 through D-11 and exact parity tests."
      - "Use one reason-category vocabulary in SQL, OpenAPI, Go, and TypeScript."
  - truth: "Role badge artwork does not require a second hard-coded role authority."
    status: failed
    reason: "APPROVED_ROLE_ARTWORK remains a closed role-code list; karaoke_fx is absent and future catalog roles require source edits."
    artifacts:
      - path: "frontend/src/components/profile/badgeArtwork.ts"
        issue: "Static approved role-code set violates D-23 and omits karaoke_fx."
    missing:
      - "Use a bounded artwork-key registry driven by catalog presentation metadata, not a valid-role list."
  - truth: "Malformed catalog responses fail visibly instead of becoming a valid empty catalog."
    status: failed
    reason: "listRoleDefinitions returns [] for any non-array 200 body and casts incomplete rows without validation."
    artifacts:
      - path: "frontend/src/lib/api.ts"
        issue: "No runtime validation of the public catalog response."
    missing:
      - "Validate top-level and required row fields and throw a catalog/API contract error."
      - "Cover object payloads and incomplete rows."
---

# Phase 136: Capability Policy, Catalog & Schema Contract Verification Report

**Phase Goal:** Team4s has one documented, enforceable capability policy and one canonical data/contract foundation for scoped user overrides, provenance, impact, and reliable catalog behavior.
**Verified:** 2026-08-20T18:33:35Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Platform-admin provenance is IdP-owned and non-deniable by group overrides (CAP-04). | VERIFIED | Migration 0146 does not reference `app_user_global_roles`; protected capabilities are fail-closed and the override table comment records the non-deniable boundary. |
| 2 | Assignability comes from the canonical role catalog (CAP-11). | VERIFIED | Public/protected repositories query `role_definitions.assignable`; provider and active selectors consume catalog DTO rows. No change was made to the explicitly excluded legacy route. |
| 3 | Capability metadata is canonical and complete, including review capabilities (CAP-12). | FAILED | 0146 adds catalog columns but populates help/description only for seven new actions; no evidence populates all existing review capabilities as required. |
| 4 | Assignable roles have confirmed narrow defaults or explicit zero-right state (CAP-13). | FAILED | Counts/zero-right projection exist, but founder/co_leader handlers over-grant, and karaoke_fx canonical presentation is discarded. |
| 5 | Reverse lookups have suitable indexes (CAP-14). | VERIFIED | `role_capabilities_action_role_idx` plus override action/group/user indexes exist; the live migration test includes representative EXPLAIN assertions. |
| 6 | Cross-layer permission/override contracts are synchronized (QUAL-01). | FAILED | Planned policy shapes are absent from OpenAPI/Go and SQL/TS reason enums disagree. |
| 7 | Migration is reversible with fresh Up/Down proof (QUAL-04). | UNCERTAIN | Paired migration and live Up/Down/Up test are substantive. The verifier did not rerun DB tests because the caller prohibited disk-consuming suites at ~89 MB free. |

**Score:** 3/7 must-haves verified

Roadmap success criteria 1, 2, and 4 are not fully true. Criterion 3 has substantive source and test coverage but remains unrerun under the disk safety constraint.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `database/migrations/0146_capability_policy_catalog.{up,down}.sql` | Reversible schema, policy metadata, defaults, indexes | PARTIAL | Substantive and reversible in structure; defaults are not narrowly enforced by handlers. |
| `backend/internal/repository/role_catalog_repository.go` | Public presentation projection | VERIFIED | Real DB query, ordering, operative count and derived zero-right state. |
| `backend/internal/handlers/role_catalog_handler.go` | Public three-context endpoint | VERIFIED | Exact allowlisted contexts and real repository result; router registration exists. |
| `shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml` | Full synchronized policy/catalog contract | FAILED | Catalog projection exists; effective-rights/override/impact/audit/status shapes are missing. |
| `frontend/src/lib/roleCatalog.ts` | Shared injected adapter | PARTIAL | Wired and substantive, but rejects the database's karaoke_fx semantic keys. |
| `frontend/src/providers/RoleCatalogProvider.tsx`, `frontend/src/app/layout.tsx` | One root catalog supply | VERIFIED | Root loads the three contexts and provides shared state; leaf consumers are wired to hooks/transforms. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Migration role catalog | Public repository/handler | `role_definitions` query | VERIFIED | DB-backed data flows to the public DTO. |
| Public helper | Root provider | `listRoleDefinitions` / provider props | PARTIAL | Wired, but malformed JSON becomes a successful empty catalog. |
| Root provider | Members/profiles/contributions/archive | catalog hooks and pure transforms | VERIFIED | Active consumers use injected catalog rows; excluded legacy route unchanged. |
| karaoke_fx migration row | Shared presentation adapter | `color_key` / `icon_key` | FAILED | Seeded keys fail both semantic allowlists. |
| Role capability defaults | Mutation handlers | narrow permission actions | FAILED | Two handlers attach narrow actions to broader payloads. |
| Policy schema | OpenAPI/Go/TS | parity contract | FAILED | Contract family is missing outside TypeScript and enum vocabulary drifts. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `RoleCatalogProvider` | context catalog rows | public `/api/v1/role-definitions` → PostgreSQL `role_definitions` | Yes | FLOWING |
| Badge/role presentation | catalog role metadata | provider → `presentationForRole` | Yes, but canonical karaoke keys neutralized | HOLLOW for karaoke_fx |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase diff syntax | `git diff --check 0ead504f..HEAD` | Clean | PASS |
| Legacy route exclusion | phase changed-file inventory for `frontend/src/app/anime/` | No matches | PASS |
| Focused runtime suites | Not run | Prohibited by critical disk constraint | SKIP |

### Probe Execution

No phase-declared probe scripts were found. Migration behavior is covered by a Go integration test rather than a probe; it was not rerun due to the explicit disk constraint.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| CAP-04 | SATISFIED | Non-deniable IdP provenance boundary represented in schema/contract vocabulary. |
| CAP-11 | SATISFIED | DB-backed assignability and catalog-driven active pickers/projections. |
| CAP-12 | BLOCKED | Existing/review capability help metadata completeness is not established. |
| CAP-13 | BLOCKED | Narrow defaults over-grant and karaoke_fx presentation is inconsistent. |
| CAP-14 | SATISFIED | Reverse indexes and representative EXPLAIN test exist. |
| QUAL-01 | BLOCKED | Missing policy schemas/Go DTOs and SQL/TS reason-enum mismatch. |
| QUAL-04 | NEEDS RERUN | Paired migration and live Up/Down/Up test exist; execution withheld for disk safety. |

No Phase-136 requirement is orphaned from plan frontmatter.

### Decision Coverage (D-01–D-23)

| Decisions | Status | Evidence |
|---|---|---|
| D-01–D-06 | PARTIAL | Group ownership, opt-in, allow/deny, protected classes and IdP bypass are represented in SQL; the promised cross-layer policy contract is incomplete. Runtime precedence is correctly deferred to Phase 137. |
| D-07–D-11 | FAILED | SQL encodes reasons, immutable real transitions and platform-admin exemption, but contract vocabularies drift and link updates emit false successful audit events. |
| D-12–D-14 | VERIFIED | Assignability is independent, zero-right state is derived, and mappings are explicitly seeded. D-13's full inspector remains correctly deferred. |
| D-15–D-19 | FAILED | Seed mapping exists, but founder and co_leader can mutate unapproved event/lifecycle fields. |
| D-20–D-23 | FAILED | karaoke_fx is distinct and cross-surface data-driven in many consumers, but its seeded presentation is rejected and badge artwork still uses a closed role list. |

### Code Review Finding Disposition

| Finding | Independent disposition |
|---|---|
| CR-01 | CONFIRMED BLOCKER — generic create/update history handlers use `founding_history_edit` before event-specific authorization. |
| CR-02 | CONFIRMED BLOCKER — `general_edit` covers `Status` and `GroupType`. |
| CR-03 | CONFIRMED BLOCKER — allowed audit write precedes validation/repository update. |
| CR-04 | CONFIRMED BLOCKER — exact migration keys are absent from adapter allowlists. |
| WR-01 | PROMOTED TO BLOCKER — D-23 explicitly forbids this closed parallel role authority. |
| WR-02 | PROMOTED TO BLOCKER — reliable catalog behavior is a phase goal and malformed 200 payloads silently disable consumers. |

### Anti-Patterns Found

No unreferenced `TBD`, `FIXME`, or `XXX` markers were found in Phase-136 changed source files. The closed artwork role list and unsafe JSON cast are functional gaps documented above.

### Human Verification Required

None required to establish the current failure. Visual inspection cannot cure the observable authorization and contract defects.

### Gaps Summary

The phase cannot proceed to Phase 137. All four critical review findings remain present at HEAD, both warnings violate explicit phase truths, and an additional contract audit found that the planned effective-rights/override/impact/audit/status family was added only to TypeScript rather than synchronized across OpenAPI and Go. The migration rerun should be performed after disk space is restored, but that uncertainty is not the reason for the failing status.

---

_Verified: 2026-08-20T18:33:35Z_
_Verifier: the agent (gsd-verifier)_
