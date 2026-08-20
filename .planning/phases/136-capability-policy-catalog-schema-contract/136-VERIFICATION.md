---
phase: 136-capability-policy-catalog-schema-contract
verified: 2026-08-20T21:08:24Z
status: gaps_found
score: 6/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/7
  gaps_closed:
    - "Founder history and co-leader lifecycle authorization are event/field specific."
    - "Allowed link audit records follow committed changed transitions only."
    - "Capability metadata and Karaoke-FX semantic keys are synchronized in source."
    - "OpenAPI, Go and TypeScript publish one policy contract vocabulary."
    - "Role artwork selection is catalog-metadata driven without a role-code authority."
    - "Malformed public catalog responses fail visibly and context-locally."
  gaps_remaining:
    - "The required fresh migration proof fails and the running disposable DB has stale established-role artwork metadata."
  regressions: []
gaps:
  - truth: "A fresh disposable database applies, reverses and reapplies migration 0146 with all catalog seeds and reverse-index proofs passing."
    status: failed
    reason: "The independently run isolated PostgreSQL suite fails in TestPhase136MigrationLiveUpDownUp: expected 11 established contribution roles with icon_key=user, actual 0. Its fixture seeds only four group roles, so the asserted contribution roles do not exist and the test never reaches its EXPLAIN assertions. The running disposable application DB also still returns icon_key=other for established roles because 0146 was already applied before that UPDATE was added."
    artifacts:
      - path: "backend/internal/migrations/phase136_capability_policy_catalog_test.go"
        issue: "createPhase136Prerequisites omits the 11 roles asserted by assertPhase136Catalog."
      - path: "database/migrations/0146_capability_policy_catalog.up.sql"
        issue: "Correct source UPDATE is not reflected in the already-applied disposable runtime."
    missing:
      - "Seed the established contribution-role prerequisites and rerun the complete migration suite without SKIP/failure."
      - "Reset/reseed disposable runtime data, or use a new migration if reset is not chosen, so established artwork roles receive icon_key=user."
---

# Phase 136 Verification Report

**Goal:** One enforceable capability policy and one canonical schema/contract foundation for scoped overrides, provenance, impact and reliable catalog behavior.
**Status:** gaps_found
**Re-verification:** After gap plans 136-14–20 and review fixes through `50989fa8`.

## Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | IdP platform-admin provenance is non-deniable (CAP-04; D-01–D-06). | VERIFIED | SQL excludes IdP authority from group override state; semantic parity and external-provenance-negative tests pass. Resolver precedence remains correctly deferred to Phase 137. |
| 2 | Assignability/presentation come from one catalog across active consumers (CAP-11; D-12/D-13/D-20–D-23). | VERIFIED | DB-backed public projection, root provider and catalog-injected active consumers are wired; focused tests pass. |
| 3 | All capabilities, including every `review.*`, have canonical metadata (CAP-12). | VERIFIED | Explicit review metadata and inventory-wide non-empty fills exist; source/parity tests pass. |
| 4 | Assignable roles have narrow defaults or explicit zero-right state (CAP-13; D-14–D-21). | VERIFIED | Seed-to-handler, event-type, lifecycle/mixed-patch and Karaoke-FX zero-right tests pass. |
| 5 | Reverse lookups have indexes and representative plan proof (CAP-14). | FAILED | DDL exists, but the required live suite fails before its EXPLAIN assertions execute. |
| 6 | OpenAPI, Go, TypeScript and helpers share one policy contract (QUAL-01; D-07–D-11). | VERIFIED | YAML↔TS and YAML/Go/TS parity suites pass, including reason/provenance/optionality negatives. |
| 7 | Migration 0146 has a successful fresh Up/Down/Up proof (QUAL-04). | FAILED | Isolated PostgreSQL run fails with expected artwork-role count 11, actual 0. |

**Score:** 6/7 consolidated must-haves verified. Truths 5 and 7 share one migration-proof root gap.

## Original Gap Closure

| Prior gap | Status | Evidence |
|---|---|---|
| Founder/co-leader over-grant | CLOSED | Event type, lifecycle, mixed patch and pre-probe authorization tests pass. |
| Premature allowed link audit | CLOSED | All handler/repository changed/no-op/failure/rollback cases pass. |
| Karaoke-FX semantic mismatch | CLOSED IN SOURCE | Migration is `creative/image`; adapter accepts it. |
| Missing/drifting policy contracts | CLOSED | Focused/root YAML, Go and TypeScript semantic parity passes. |
| Closed role-code artwork authority | CLOSED | Bounded artwork-key registry; future/absent role tests pass. |
| Malformed catalog accepted as empty | CLOSED | 24 API validation tests and provider error propagation pass. |
| CAP-12 completeness | CLOSED IN SOURCE | Review actions explicit; inventory metadata filled. |

## Artifact, Wiring and Data Flow

| Artifact/link | Status | Details |
|---|---|---|
| `0146_capability_policy_catalog.{up,down}.sql` | PARTIAL | Substantive/reversible SQL; automated fresh proof fails and current disposable DB was not reset after later migration edits. |
| History and group patch authorization | VERIFIED | Stored/requested types and each lifecycle field are authorized before probes/mutation. |
| Link repository transaction → allowed audit | VERIFIED | Only committed changed transitions emit allowed audit. |
| Focused/root OpenAPI → Go → TypeScript | VERIFIED | Full policy family and enums/requiredness align. |
| Public API → strict helper → root provider | VERIFIED | Real DB rows flow; malformed rows throw context-scoped errors. |
| Catalog metadata → badge artwork | PARTIAL RUNTIME | Source wiring is correct; live API has Karaoke-FX, but established roles still expose stale `icon_key=other`. |

## Behavioral Checks

| Check | Result |
|---|---|
| Backend focused Phase136 handler/repository/catalog suites | PASS |
| Frontend catalog/API/provider/artwork and Phase136 badge assertions | PASS |
| Frontend typecheck | PASS |
| Isolated PostgreSQL migration suite | FAIL: LiveUpDownUp 11 expected / 0 actual |
| Scope inventory | PASS: no legacy releases route, #33, #34 or Phase137 runtime work |
| Anti-pattern scan | No unreferenced TBD/FIXME/XXX in changed source |

Four older Phase-119/120 `MemberBadgeChain` tests and one Phase-99 profile heading test remain failing while Phase-136-specific assertions in those files pass. One trailing blank/whitespace line exists in committed `136-14-SUMMARY.md`. These are unrelated residual warnings.

## Requirements

| Requirement | Status |
|---|---|
| CAP-04 | SATISFIED |
| CAP-11 | SATISFIED |
| CAP-12 | SATISFIED |
| CAP-13 | SATISFIED |
| CAP-14 | BLOCKED by migration proof |
| QUAL-01 | SATISFIED |
| QUAL-04 | BLOCKED by failing fresh suite |

No human verification is needed: the remaining gap is reproducible automatically.

---
_Verified: 2026-08-20T21:08:24Z_
_Verifier: the agent (gsd-verifier)_
