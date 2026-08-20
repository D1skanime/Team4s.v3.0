---
phase: 136-capability-policy-catalog-schema-contract
status: planned
nyquist: enabled
wave_0_complete: false
---

# Phase 136 Validation

## Validation objective

Prove that the fresh schema, canonical catalog projections, synchronized contracts, exact handler enforcement, and all inventoried role consumers are testable at the task where each behavior is introduced. Runtime per-user Allow/Deny precedence remains Phase 137 and is not claimed here.

## Wave-0 ownership

| Artifact | Owning plan/task | Requirement/decision | Must fail before implementation |
|---|---|---|---|
| `backend/internal/migrations/phase136_capability_policy_catalog_test.go` | 136-01 Task 1 | CAP-04, CAP-12–14, QUAL-04; D-01–D-12, D-14–D-21 | yes: migration 0146 absent |
| `backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go` | 136-09 Task 1 | CAP-13; D-15–D-19 | yes: narrow constants/guards absent |
| `backend/internal/handlers/phase136_contract_parity_test.go` | 136-03 Task 1 | QUAL-01, CAP-04, CAP-11–13 | yes: enriched fields/parity absent |
| `frontend/src/lib/roleCatalog.test.ts` | 136-03 Task 2 | CAP-11, CAP-13; D-20–D-23 | yes: adapter absent |
| Existing focused repository/handler tests extended in 136-02 | 136-02 Task 1 | CAP-11–14, QUAL-01 | yes: member projection lacks metadata |
| Cross-surface component/repository tests | 136-04 through 136-08 | CAP-11, CAP-13, QUAL-01; D-13, D-20–D-23 | yes per owning surface |

## Requirement and task map

| Requirement | Primary proof | Supporting proof |
|---|---|---|
| CAP-04 | 136-01 migration invariant; 136-02/03 DTO and contract tests | non-deniable IdP provenance assertions |
| CAP-11 | 136-02 member-scoped repository/handler projection | 136-04–08 consumers use injected catalog rows |
| CAP-12 | 136-01 catalog schema/seed assertions | 136-02 matrix DTO completeness |
| CAP-13 | 136-09 exact seed-to-handler enforcement | 136-01 seed/zero-right and 136-04 contextual notice |
| CAP-14 | 136-01 index existence and representative `EXPLAIN` proof | phase gate fresh schema run |
| QUAL-01 | `phase136_contract_parity_test.go` | frontend typecheck and exact handler JSON tests |
| QUAL-04 | 136-01 clean down/up/up test | phase gate on disposable database |

CAP-03 is intentionally excluded: Phase 137 owns server-side Deny > Allow > role Allow evaluation and enforcement.

## Per-task and per-wave commands

- Per task commit: run the task's focused `<automated>` command and `git diff --check`.
- Wave 1: `docker compose exec -T team4sv30-backend go test ./internal/migrations -run Phase136 -count=1`.
- Wave 2: `docker compose exec -T team4sv30-backend go test ./internal/handlers ./internal/repository ./internal/permissions -run 'Phase136|Capability|Catalog' -count=1`.
- Wave 3: `docker compose exec -T team4sv30-backend go test ./internal/handlers -run Phase136ContractParity -count=1` plus frontend role-catalog Vitest and typecheck.
- Waves 4–5: run the exact component/repository suites named in Plans 04–08.

## Fresh gates

1. Migration: fresh disposable DB applies 0146, verifies constraints/seeds/indexes, reverses 0146, reapplies it, and reruns the same assertions. No historical migration edits or row preservation.
2. Enforcement: parse every D-15–D-19 seed mapping and require an exact handler guard/denial test before mutation. Explicit negatives cover deletion, member/role/capability administration, mixed patches, and foreign groups.
3. Contract parity: `docker compose exec -T team4sv30-backend go test ./internal/handlers -run Phase136ContractParity -count=1` compares `shared/contracts/admin-capabilities.yaml`, root `shared/contracts/openapi.yaml`, actual Go DTO JSON keys, frontend DTO field requiredness, and central API-helper parsing fixtures.
4. Cross-surface: inject `karaoke_fx` and an invented future role through catalog fixtures across members, contributions/credits, historical/archive filters, profiles/projects, badges/points, selectors, and filters. Unknown roles remain neutral; no consumer-local valid-role list is allowed.

## Sampling and phase gate

- Sampling: every task commit uses its focused tests; every wave runs all packages/surfaces changed in that wave; phase completion runs the full gate below.
- Full gate: backend permissions/repository/handlers/migrations tests; frontend Vitest, typecheck, lint and build; named parity test; fresh down/up proof; residual hardcode inventory; `git diff --check`.
- Manual sampling: inspect one member selector, one profile/release credit surface, and one badge/points surface only to confirm existing layout remains unchanged. This is not a substitute for automated gates and is not a Finding #34 redesign.

## Deferred validation

- Phase 137: runtime resolver equivalence, Deny > Allow > role Allow, idempotent override writes, audit transactionality, BOLA negatives.
- Phase 138: rights inspector, mutation UI and impact preview.
- Finding #33 and general badge redesign Finding #34 remain out of scope.
