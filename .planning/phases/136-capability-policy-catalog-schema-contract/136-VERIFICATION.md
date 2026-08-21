---
phase: 136-capability-policy-catalog-schema-contract
verified: 2026-08-21T15:15:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 7/7
  gaps_closed:
    - "Canonical role labels, ordering and exact 15-role palette now flow across active surfaces."
    - "All established fansub work roles are catalog-driven and assignable while excluded roles remain excluded."
    - "Contributor release workspace now includes capability-gated segments and project-scoped adjacent navigation."
    - "Founder and Co-Leader can reach only their narrow permitted group-edit operations."
    - "Migration 0148 now restores exact pre-migration role and contributor-role state."
    - "Focused and canonical capability contracts now have structural schema and route parity."
    - "Technical-link-only users now receive a usable field-limited edit path."
    - "Technical URL validation no longer blocks unrelated authorized saves."
  gaps_remaining: []
  regressions: []
---

# Phase 136: Capability Policy, Catalog & Schema Contract Verification Report

**Phase Goal:** Team4s has one documented, enforceable capability policy and one canonical data/contract foundation for scoped user overrides, provenance, impact, and reliable catalog behavior.
**Verified:** 2026-08-21T15:15:00Z
**Status:** passed
**Re-verification:** Yes — final adversarial pass after fixes e6c326a9, fa5ba918, c07c8619 and e213ae9c.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | IdP platform-admin provenance remains non-deniable by group controls. | VERIFIED | Group override schema/catalog excludes IdP authority; focused Phase136 migration, handler and contract tests pass. Runtime resolver precedence remains correctly owned by Phase 137. |
| 2 | Assignability and presentation come from one canonical catalog. | VERIFIED | Public DB-backed projection returns the exact 15-role group catalog; consumers use the root provider/shared adapter and legacy repositories project `role_definitions.label_de`, not `contributor_roles.label`. |
| 3 | Every capability, including `review.*`, has canonical metadata. | VERIFIED | Migration/catalog assertions and focused Phase136 backend suites pass; action projection remains sourced from `action_definitions`. |
| 4 | Assignable roles have narrow defaults or an explicit zero-right state. | VERIFIED | Live catalog reports Karaoke-FX assignable with `operative_capability_count: 0` and `has_operative_capabilities: false`; narrow Founder/Co-Leader/media enforcement tests pass. |
| 5 | Reverse lookups have suitable indexes and executable query-plan proof. | VERIFIED | Fresh migration tests cover the action/role and override reverse indexes and pass independently. |
| 6 | OpenAPI, Go DTOs, TypeScript types and central helpers share the policy contract. | VERIFIED | Phase136 contract/parity suites pass; root provider loads all three contexts and keeps failures context-scoped. |
| 7 | Required schema changes are reversible and applied without historical edits or compatibility/backfill logic. | VERIFIED | Focused migration suites pass; live ledger records 146, 147, 148 and 149 in order. |
| 8 | Canonical labels, ordering and the exact 15-role palette reach active role surfaces. | VERIFIED | Migration 0149 owns all 15 values; public catalog returns 15 distinct keys with Typesetting `#7B3C4E` and Karaoke-FX `#A16207`; 36 focused presentation tests and deterministic contrast tests pass; UAT Test 5 is approved. |
| 9 | All established work roles are assignable in the group member picker while contribution-only/platform exclusions remain excluded. | VERIFIED | Live projection contains the expected 15 group roles; picker tests prove context/assignable filtering, zero-right notice and exclusions; UAT Test 4 passes. |
| 10 | Contributor release workspace exposes capability-gated segments and project-scoped adjacent release navigation. | VERIFIED | `workspace/page.tsx` consumes `can_manage_segments`, loads the project release set and renders `AdjacentNavigation`; its 10 focused tests and UAT Test 8 pass. |
| 11 | Founder and Co-Leader receive only the intended narrow group-edit authority. | VERIFIED | Capability projection, tab/field gating and founding-only history wiring exist; request-level handler tests prove forbidden lifecycle/history/member/link mutations remain denied; UAT Test 6 passes. |

**Score:** 11/11 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `database/migrations/0146_capability_policy_catalog.*.sql` | Base policy/catalog/override schema | VERIFIED | Substantive, reversible and exercised by focused migration tests. |
| `database/migrations/0147_role_artwork_semantic_correction.*.sql` | Artwork convergence | VERIFIED | Live ledger applied; migration tests pass. |
| `database/migrations/0148_role_catalog_uat_corrections.*.sql` | Assignable role and UAT corrections | VERIFIED | Guarded disposable PostgreSQL Up/Down/Up passed. The migration snapshots all ten changed role rows plus pre-existing `karaoke_fx` contributor metadata; Down restores the exact snapshot before dropping the backup table. |
| `database/migrations/0149_role_catalog_palette_correction.*.sql` | Canonical Typesetting label and exact palette | VERIFIED | Guarded disposable PostgreSQL Up/Down/Up passed. Down restores the 0148 semantic keys/label and constraint without changing authorization rows. |
| `frontend/src/providers/RoleCatalogProvider.tsx` + `frontend/src/app/layout.tsx` | One root-loaded context-scoped catalog | VERIFIED | All contexts loaded independently; errors and successful contexts remain isolated. |
| `frontend/src/lib/roleCatalog.ts` + `frontend/src/styles/globals.css` | Bounded semantic presentation seam | VERIFIED | Exactly 15 allowed palette keys plus neutral malformed/unknown fallback; no role-code CSS palette. |
| `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` | Contributor segments/navigation | VERIFIED | Substantive, wired to capabilities/project data, and behavior-tested. |
| Group edit capability/gating/history components | Narrow Founder/Co-Leader access | VERIFIED | Backend projection and server authorization connect to field/tab/founding-only UI gates. |

### Key Link and Data-Flow Verification

| From | To | Status | Details |
|---|---|---|---|
| PostgreSQL `role_definitions` | public role catalog | WIRED / FLOWING | Live endpoint returns real database rows, ordered with metadata and operative counts. |
| Public catalog | root provider | WIRED | `app/layout.tsx` loads three contexts once and injects `RoleCatalogProvider`. |
| Provider | active role consumers | WIRED | Member picker, project cards, default crew and release notes consume shared labels/presentation. |
| Contributor project API | workspace navigation | WIRED / FLOWING | Project releases are filtered to the current project and converted to adjacent targets. |
| Capability API | group edit UI and handlers | WIRED | Narrow booleans expose permitted controls while server handlers remain authoritative. |
| `can_edit_technical_links` | Basic-info technical URL controls and PATCH mapping | WIRED / FLOWING | Website, Discord and IRC are enabled independently of broad edit; only those fields enter the narrow PATCH while name/status/type remain disabled and excluded. |
| canonical OpenAPI | focused contract, Go response and TypeScript type | WIRED | The focused contract exposes the route and the same 25 required booleans; structural parity tests pass. |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|---|---|---|
| Focused backend migration/repository/handler suites | 3 packages passed | PASS |
| Guarded 0148/0149 migration cycle | Focused migration tests passed against disposable `team4s_phase106_test_verify136`; database removed afterward | PASS |
| Backend Phase136 handler/contract suite | `go test ./internal/handlers -run Phase136 -count=1`: passed | PASS |
| Focused catalog/workspace/basic-info frontend suites | 4 files, 21 tests passed | PASS |
| Technical-link regression subset | 3 tests passed, including narrow PATCH and invalid stored URL behavior | PASS |
| Live public `fansub_group` catalog | 15 roles; 15 distinct locked keys; Typesetting/Karaoke-FX distinct | PASS |
| Live migration ledger | 146–149 present in order | PASS |
| Source exclusion gates | No production `Typesetting / FX`, `cr.label`, role-code palette, or unreferenced debt markers in checked phase artifacts | PASS |
| `git diff --check` | Clean | PASS |

No phase-declared probe scripts exist; the guarded PostgreSQL migration tests are the executable database probes.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| CAP-04 | SATISFIED | Non-deniable IdP provenance contract and negatives. |
| CAP-11 | SATISFIED | One assignability/presentation catalog across API and active consumers. |
| CAP-12 | SATISFIED | Complete capability metadata, including review actions. |
| CAP-13 | SATISFIED | Narrow defaults plus explicit Karaoke-FX zero-right state. |
| CAP-14 | SATISFIED | Indexed reverse lookups with migration query-plan proof. |
| QUAL-01 | SATISFIED | OpenAPI/Go/TypeScript/helper parity tests. |
| QUAL-04 | SATISFIED | New reversible 0146–0149 migrations and fresh-cycle tests. |

### Blocked UAT Test 7 Decision

Test 7 does **not** block the phase goal. Taking the entire backend offline also removes account/project prerequisites and therefore cannot isolate a single catalog-context failure; that manual technique is not a valid discriminating test. The exact required behavior is directly executable without external dependencies: `RoleCatalogProvider.test.tsx` proves one failed context exposes `Rollenkatalog konnte nicht geladen werden.` while another remains usable, and `app/layout.test.tsx` proves both partial and total failure produce no invented static role fallback. Those tests passed in this verification. This resolves the truth as VERIFIED, not UNCERTAIN; the blocked UAT row should remain as honest provenance about the unavailable manual fault-injection method.

### Anti-Patterns Found

No blocker anti-patterns were found in the phase migrations or inspected active consumers. No unreferenced `TBD`, `FIXME`, or `XXX` marker was found. The expected neutral fallback applies only to unknown/malformed catalog presentation and does not invent assignable roles.

The final UI audit scored 17/24 and reported real, non-blocking warnings: `DefaultCrewManager` swallows removal failures and uses a local raw table/inline spacing; two tab implementations lack complete roving-keyboard/tabpanel semantics; notes errors use a generic title; and some new workspace typography/spacing values bypass tokens. These do not falsify a Phase 136 must-have or any repaired UAT flow, but remain quality debt for a later UI-hardening slice.

The broad `admin/fansubs/[id]/edit/page.test.tsx` file is not green as a whole: 12 existing tests fail, primarily because fixtures render `AnimeReleasesCockpit` without the now-required root `RoleCatalogProvider`; one stale assertion expects `Release-Screenshot` while the UI renders `Fansub Screenshot`. This is test-harness debt rather than a runtime wiring failure: the app root supplies the provider, live UAT passed, the focused technical-link subset passes, and all directly relevant catalog/workspace/basic-info suites pass. It should be repaired, but it does not block the Phase 136 goal.

### Human Verification Required

None. The visual/responsive/keyboard aspects were already completed and explicitly approved in UAT Tests 4–6 and 8 plus Plan 136-31. The remaining isolated error behavior is deterministically covered as described above.

### Scope and Exclusions

Phase 137 still owns runtime personal Allow/Deny resolution and override mutation behavior. Phase 138 owns administration/impact UX. The unused `/anime/[id]/group/[groupId]/releases` route, Finding #33 document work and Finding #34 broad badge redesign remain untouched; no later-phase deliverable was incorrectly claimed by Phase 136.

### Gaps Summary

No gaps remain. All four original UAT gaps are closed in code, focused tests and approved live evidence, and the original seven technical must-haves have no regression.

---

_Verified: 2026-08-21T15:15:00Z_
_Verifier: the agent (gsd-verifier)_
