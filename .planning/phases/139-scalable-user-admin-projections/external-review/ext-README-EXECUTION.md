# Phase 139 — GSD Plan / Execute Pack

## Placement

Copy this pack into:

`.planning/phases/139-scalable-user-admin-projections/`

## Do not run another broad discuss-phase

The approved decisions are already in:
- `139-DISCUSS.md`
- `139-CONTEXT.md`
- `139-UI-SPEC.md`

Claude should read current code and may refine exact SQL/interface details during execution, but must not expand Phase 139 beyond the roadmap scope.

## Execution waves

### Wave 1 — backend projections in parallel
- `139-01-PLAN.md` — contribution server projection
- `139-03-PLAN.md` — media server projection

### Wave 2
- `139-02-PLAN.md` — contribution UI, depends on 01
- `139-04-PLAN.md` — media UI, depends on 03
- `139-05-PLAN.md` — UADM-06 rights scaling only, independent of contribution/media projection

### Wave 3
- `139-06-PLAN.md` — integrated performance/regression/UAT gate, depends on 02+04+05

## Non-negotiable scope boundaries

- Contributions/media projection only plus UADM-06 rights scaling.
- No Claims/Audit/role/capability redesign.
- No new permission semantics.
- No media editing in user-admin.
- No Metabase implementation in Phase 139.
- No deep storage/path/derivative diagnostics in Team4s Phase 139.
- No client-side regrouping after pagination.
- Counts and page items must refer to the same filtered projection.
- Run execute and verification on `team4s-linux`.

## Expected artifacts after execute

- `139-01-SUMMARY.md` … `139-06-SUMMARY.md`
- `139-UAT.md`
- `139-VERIFICATION.md`
- `scripts/phase139-green-gate.sh`
