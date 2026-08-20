---
phase: 136-capability-policy-catalog-schema-contract
plan: 18
subsystem: api-contracts
tags: [go, openapi, typescript, authorization, contract-parity]
requires:
  - phase: 136-17
    provides: synchronized YAML and TypeScript policy contract family
provides:
  - backend-owned transport DTOs for the complete capability policy family
  - executable OpenAPI-to-TypeScript-to-Go semantic parity gate
affects: [phase-137, phase-138, capability-policy]
tech-stack:
  added: []
  patterns: [typed string enums, transport-only DTOs, reflection-based JSON shape tests]
key-files:
  created:
    - backend/internal/handlers/capability_policy_contract.go
  modified:
    - backend/internal/handlers/phase136_contract_parity_test.go
key-decisions:
  - "Policy DTOs remain transport-only and do not introduce resolver, repository, endpoint, or domain behavior."
  - "Nullable before/after/effect fields use pointers; only the platform-admin request reason uses omitempty so omission remains distinguishable from a supplied reason."
requirements-completed: [CAP-04, QUAL-01]
duration: 9min
completed: 2026-08-20
---

# Phase 136 Plan 18: Go Policy Contract Parity Summary

**Typed Go transport DTOs for the full capability-policy family, guarded by one semantic OpenAPI, TypeScript, and Go parity suite.**

## Performance

- **Duration:** 9 min
- **Completed:** 2026-08-20
- **Tasks:** 1 TDD task
- **Files modified:** 2

## Accomplishments

- Added typed Go enums and JSON DTOs for effective rights, scoped overrides, reasons, impact previews, audit entries, activation state, and changed/no-op mutation results.
- Preserved nullable transitions with pointers and made only the platform-admin request reason omittable in JSON.
- Replaced the previous shallow source-substring check with reflected Go JSON-shape, pointer, enum, and marshal assertions.
- Extended the named parity suite to execute the semantic focused/root OpenAPI and TypeScript contract proof from Plan 136-17 in the same run.

## Task Commits

1. **RED: Failing Go policy parity gate** — `c86807b3`
2. **GREEN: Go capability policy DTO family** — `e28a0677`

## Files Created/Modified

- `backend/internal/handlers/capability_policy_contract.go` — transport-only policy DTOs and typed enum constants.
- `backend/internal/handlers/phase136_contract_parity_test.go` — combined semantic cross-layer parity gate.

## Decisions Made

- Used strings for ISO timestamps because these DTOs mirror the JSON/OpenAPI transport contract rather than persistence models.
- Kept non-platform and platform-admin mutation requests as separate Go types, matching the discriminated OpenAPI and TypeScript branches.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commit: `c86807b3`
- GREEN commit: `e28a0677`

## Verification

- `docker compose exec -T team4sv30-backend go test -v ./internal/handlers -run Phase136ContractParity -count=1` — PASS; all combined subtests executed.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — PASS.
- `git diff --check` — PASS.

## Known Stubs

None.

## Threat Review

The DTOs add no endpoint, persistence, file access, or resolver behavior. The JSON transport boundary is covered by reflected tags, pointer semantics, typed enums, and marshal assertions.

## Deferred Scope

- Effective-rights resolution and override mutations remain Phase 137.
- Override/impact UI remains Phase 138.
- The unused legacy releases route, Finding #33, and general Finding #34 badge redesign were untouched.

## Self-Check: PASSED

Both changed files and both task commits exist. The named semantic test executed rather than skipping.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
