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
| Existing protected repository/handler tests extended in 136-02 | 136-02 Task 1 | CAP-11–14, QUAL-01; D-12/D-13/D-20–D-23 | yes: member projection lacks exact metadata and zero-right state |
| `backend/internal/repository/role_catalog_repository_test.go`, `backend/internal/handlers/role_catalog_handler_test.go`, `role_catalog_router_integration_test.go` | 136-10 Tasks 1–2 | CAP-11, CAP-13, QUAL-01 | yes: exact unauthenticated public route/audience/payload absent |
| `backend/internal/handlers/phase136_contract_parity_test.go` | 136-03 Task 1 | QUAL-01, CAP-04, CAP-11–13 | yes: protected/public enriched fields/parity absent |
| `frontend/src/lib/roleCatalog.test.ts` | 136-03 Task 2 | CAP-11, CAP-13; D-20–D-23 | yes: adapter absent |
| `frontend/src/providers/RoleCatalogProvider.test.tsx`, `frontend/src/app/layout.test.tsx` | 136-11 Tasks 1–2 | CAP-11, CAP-13, QUAL-01 | yes: three root loads/provider mount/failure/no-leaf-fetch proof absent |
| Contribution transform and consumer tests | 136-05, 136-12, 136-13 | CAP-11, CAP-13, QUAL-01; D-20–D-23 | yes per transform/cards/admin surface |
| `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx` | 136-08 Task 1 | CAP-11, CAP-13; D-22/D-23 | yes: owning karaoke_fx/typer/unknown progress proof absent |
| Other cross-surface component/repository tests | 136-04, 136-06–08 | CAP-11, CAP-13, QUAL-01; D-13, D-20–D-23 | yes per owning surface |

## Requirement and task map

| Requirement | Primary proof | Supporting proof |
|---|---|---|
| CAP-04 | 136-01 migration invariant; 136-02/03 DTO and contract tests | non-deniable IdP provenance assertions |
| CAP-11 | 136-10 public `/api/v1/role-definitions?context=...` repository/handler/router projection | 136-11 root provider; 136-04–08 and 136-12–13 consumers use injected catalog rows |
| CAP-12 | 136-01 catalog schema/seed assertions | 136-02 matrix DTO completeness |
| CAP-13 | 136-09 exact seed-to-handler enforcement | 136-01 seed/zero-right and 136-04 contextual notice |
| CAP-14 | 136-01 index existence and representative `EXPLAIN` proof | phase gate fresh schema run |
| QUAL-01 | `phase136_contract_parity_test.go` | frontend typecheck and exact handler JSON tests |
| QUAL-04 | 136-01 clean down/up/up test | phase gate on disposable database |

CAP-03 is intentionally excluded: Phase 137 owns server-side Deny > Allow > role Allow evaluation and enforcement.

## Per-task and per-wave commands

- Per task commit: run the task's focused `<automated>` command and `git diff --check`.
- Wave 1: `docker compose exec -T team4sv30-backend go test ./internal/migrations -run Phase136 -count=1`.
- Wave 2: run Plan 136-09 narrow enforcement and Plan 136-10 exact public repository/handler/router suites in parallel.
- Wave 3: run protected admin/member/catalog-cache suites from Plan 136-02.
- Wave 4: run contract parity and pure roleCatalog adapter suites from Plan 136-03.
- Wave 5: run RoleCatalogProvider plus owning app/layout integration suites from Plan 136-11.
- Waves 6–8: run the exact transform/component/repository suites named in Plans 04–08 and 136-12–13.

## Fresh gates

1. Migration: fresh disposable DB applies 0146, verifies constraints/seeds/indexes, reverses 0146, reapplies it, and reruns the same assertions. No historical migration edits or row preservation.
2. Enforcement: parse every D-15–D-19 seed mapping and require an exact handler guard/denial test before mutation. Explicit negatives cover deletion, member/role/capability administration, mixed patches, and foreign groups.
3. Contract parity: `docker compose exec -T team4sv30-backend go test ./internal/handlers -run Phase136ContractParity -count=1` compares both OpenAPI files, protected/public Go DTO JSON keys, frontend DTO field requiredness, and the exact public helper contract.
4. Public route: Plan 136-10's router integration test proves unauthenticated exact registration, all three allowed contexts, invalid-context 400, ordering and forbidden sensitive fields.
5. Runtime propagation: Plan 136-11 loads all three contexts once in `app/layout.tsx` and supplies `RoleCatalogProvider`; root integration proves mounting, neutral failure and no duplicate leaf requests. Plans 136-04–08 and 136-12–13 consume it across active members, contributions/releases, archive/search, profiles, badges and points.
6. Legacy exclusion: `/anime/[id]/group/[groupId]/releases` is an unused legacy page. Phase 136 does not modernize, catalog-wire, test or delete it.

## Decision coverage audit

- D-01–D-11: 136-01 schema plus 136-03 contract vocabulary; runtime evaluation remains Phase 137 exactly as deferred.
- D-12–D-14: 136-01 assignability/schema, 136-02 exact protected metadata/zero-right projection, 136-04 compact contextual notice.
- D-15–D-19: 136-09 exact narrow seed-to-handler enforcement and explicit destructive/admin exclusions.
- D-20–D-23: 136-01 karaoke_fx seed, 136-02/10 projections, 136-03 adapter, 136-11 root supply, 136-04–08 and 136-12–13 active consumers and hardcode gate.

## Multi-source coverage audit

| Source | Item | Coverage | Disposition |
|---|---|---|---|
| GOAL | One enforceable capability policy and canonical schema/contract foundation | 136-01–03, 136-09–11 | covered |
| REQ | CAP-04, CAP-11, CAP-12, CAP-13, CAP-14, QUAL-01, QUAL-04 | Requirement map above; every ID appears in plan frontmatter | covered |
| RESEARCH | Database authority, fail-closed permission cache, no static Go/TS role catalog | 136-01/02/03/08/10 | covered |
| RESEARCH | One public presentation projection and one shared adapter/provider, with active cross-surface migrations | 136-10/03/11/04–08/12–13 | covered |
| RESEARCH | Exact narrow seed-to-handler enforcement before operative defaults | 136-09 | covered |
| CONTEXT | D-01–D-23 | Decision coverage audit above; each locked decision is named in task behavior/action or must-haves | covered |
| CONTEXT deferred | Runtime resolver/override mutation UI; document library; general badge redesign | Phase 137/138 or later; explicitly excluded from 136 tasks | valid exclusion |
| User constraint | `/anime/[id]/group/[groupId]/releases` is unused legacy | 136-07/08/10–13 explicitly avoid modernization, wiring, testing and deletion | covered |

## Sampling and phase gate

- Sampling: every task commit uses its focused tests; every wave runs all packages/surfaces changed in that wave; phase completion runs the full gate below.
- Full gate: backend permissions/repository/handlers/migrations tests; frontend Vitest, typecheck, lint and build; named parity test; fresh down/up proof; residual hardcode inventory; `git diff --check`.
- Manual sampling: inspect one member selector, one profile/release credit surface, and one badge/points surface only to confirm existing layout remains unchanged. This is not a substitute for automated gates and is not a Finding #34 redesign.

## Deferred validation

- Phase 137: runtime resolver equivalence, Deny > Allow > role Allow, idempotent override writes, audit transactionality, BOLA negatives.
- Phase 138: rights inspector, mutation UI and impact preview.
- Finding #33 and general badge redesign Finding #34 remain out of scope.
