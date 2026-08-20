---
phase: 136-capability-policy-catalog-schema-contract
verified: 2026-08-20T21:17:55Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/7
  gaps_closed:
    - "Fresh isolated migration proof now passes, including corrected role prerequisites, both EXPLAIN checks and reversible 0147 runtime convergence."
  gaps_remaining: []
  regressions: []
---

# Phase 136 Verification Report

**Goal:** One enforceable capability policy and one canonical schema/contract foundation for scoped overrides, provenance, impact and reliable catalog behavior.
**Status:** passed
**Re-verification:** Yes — final closure after `c97966f2`.

## Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | IdP platform-admin provenance is non-deniable (CAP-04; D-01–D-06). | VERIFIED | SQL excludes IdP authority from group override state; semantic parity and external-provenance-negative tests pass. Runtime resolver precedence remains correctly deferred to Phase 137. |
| 2 | Assignability and presentation come from one canonical catalog across active consumers (CAP-11; D-12/D-13/D-20–D-23). | VERIFIED | DB-backed public projection, root provider and catalog-injected active consumers are wired. Runtime returns 11 established artwork roles and distinct Karaoke-FX metadata. |
| 3 | Every capability, including all `review.*` actions, has canonical metadata (CAP-12). | VERIFIED | Explicit review metadata and inventory-wide non-empty fills exist; source and live migration assertions pass. |
| 4 | Assignable roles have narrow defaults or explicit zero-right state (CAP-13; D-14–D-21). | VERIFIED | Seed-to-handler, event-type, lifecycle/mixed-patch and Karaoke-FX zero-right tests pass. |
| 5 | Reverse lookups have suitable indexes and representative query-plan proof (CAP-14). | VERIFIED | The isolated live suite reaches and passes both EXPLAIN assertions for `role_capabilities_action_role_idx` and `user_group_capability_overrides_action_group_user_idx`. |
| 6 | OpenAPI, Go, TypeScript and helpers share one policy contract (QUAL-01; D-07–D-11). | VERIFIED | YAML↔TypeScript and YAML/Go/TypeScript parity suites pass, including reason, provenance and optionality negatives. |
| 7 | Required schema changes have successful reversible fresh proof (QUAL-04). | VERIFIED | Real isolated PostgreSQL execution passes 0146 Up→Down→Up and 0147 artwork correction Up→Down→Up without compatibility/backfill logic. |

**Score:** 7/7 must-haves verified.

## Final Gap Closure

| Former blocker | Status | Independent evidence |
|---|---|---|
| Missing 11-role migration prerequisites | CLOSED | `createPhase136Prerequisites` now seeds all 11 established contribution roles; `TestPhase136MigrationLiveUpDownUp` passes. |
| 0147 runtime convergence | CLOSED | Up changes the exact 11 roles from `other` to `user`; Down restores `other`; second Up returns to `user`. `TestPhase136ArtworkCorrectionLiveUpDownUp` passes. |
| Reverse-index execution proof | CLOSED | Both representative EXPLAIN assertions execute and pass inside the successful live suite. |
| Stale runtime artwork metadata | CLOSED | Public runtime catalog reports exactly 11 `icon_key=user` rows. Typesetter is `user`; Karaoke-FX remains `color_key=creative`, `icon_key=image`, assignable and zero-right. |

## Artifact, Wiring and Data Flow

| Artifact/link | Status | Details |
|---|---|---|
| `0146_capability_policy_catalog.{up,down}.sql` | VERIFIED | Fresh apply, complete assertions, rollback and reapply pass. |
| `0147_role_artwork_semantic_correction.{up,down}.sql` | VERIFIED | New reversible convergence migration corrects already-recorded disposable runtime state without rewriting applied history. |
| History/group patch authorization | VERIFIED | Stored/requested history types and lifecycle fields are authorized before probes or mutation. |
| Link repository transaction → allowed audit | VERIFIED | Only committed changed transitions emit allowed domain audit. |
| Focused/root OpenAPI → Go → TypeScript | VERIFIED | Full policy family and enum/requiredness parity pass. |
| Public API → strict helper → root provider | VERIFIED | Real DB rows flow; malformed payloads throw context-scoped errors. |
| Catalog metadata → badge artwork | VERIFIED | Catalog owns role identity; bounded semantic registry owns assets; current runtime data selects established artwork correctly. |

## Behavioral Checks

| Check | Result | Status |
|---|---|---|
| `go test -v ./internal/migrations -run Phase136 -count=1` with guarded isolated DSN | Four tests pass: source, 0146 live cycle, 0147 live cycle, constraints/history. | PASS |
| Backend focused Phase136 handler/repository/catalog suites | Authorization, link audit/transaction and contract/catalog suites pass. | PASS |
| Frontend catalog/API/provider/artwork and Phase136 badge assertions | Phase-specific assertions pass. | PASS |
| Frontend typecheck | `tsc --noEmit` passes. | PASS |
| Runtime public catalog | 11 established `user` keys; Karaoke-FX `creative/image`, zero-right. | PASS |
| Commit diff check | `git diff --check c97966f2^..c97966f2` passes. | PASS |

No phase-declared probe scripts exist; the migration integration tests are the executable database proof.

## Requirements

| Requirement | Status |
|---|---|
| CAP-04 | SATISFIED |
| CAP-11 | SATISFIED |
| CAP-12 | SATISFIED |
| CAP-13 | SATISFIED |
| CAP-14 | SATISFIED |
| QUAL-01 | SATISFIED |
| QUAL-04 | SATISFIED |

## Decision and Scope Audit

D-01–D-23 are represented at the Phase-136 contract/schema/catalog/enforcement boundary. Runtime personal Allow/Deny resolution remains exclusively Phase 137. The Phase-136 inventory contains no modernization or testing of `/anime/[id]/group/[groupId]/releases`, no Finding #33 document/initiative work and no Finding #34 general badge redesign.

No unreferenced `TBD`, `FIXME` or `XXX` marker was found in changed source. No human verification is required for the Phase-136 goal.

## Residual Unrelated Baseline Issues

Four older Phase-119/120 `MemberBadgeChain` collection/heading tests and one Phase-99 profile heading test remain failing while all Phase-136-specific assertions in those files pass. A trailing whitespace-only final line remains in committed `136-14-SUMMARY.md`. These do not affect Phase-136 goal achievement.

---
_Verified: 2026-08-20T21:17:55Z_
_Verifier: the agent (gsd-verifier)_
