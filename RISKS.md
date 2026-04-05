# RISKS

## Top 3 Risks

### 1. Next-phase scope is not chosen yet
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** with Phase 07 approved, the next planning move is ambiguous and momentum can stall without a clear target.
- **Mitigation:** pick the next highest-value phase and plan it before opening new implementation threads.

### 2. Future asset/UI polish could reintroduce lifecycle regressions
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** the seam is now verified for create/edit/delete, but more UI changes could still accidentally detach the frontend from the generic V2 contract.
- **Mitigation:** treat the current Phase-07 seam as closed and regression-test any future UI refinement against the same create/edit/delete flows.

### 3. Broad dirty worktree still increases attribution cost
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** planning, backend, frontend, test cleanup, and historical artifact changes are all mixed in one workspace.
- **Mitigation:** keep the next task narrowly scoped and avoid mixing unrelated cleanup into the next implementation pass.

## Current Blockers
- No product blocker on verified Phase 07.
- Procedural blocker: the next phase is not yet selected and planned.
- Process blocker: no independent reviewer CLI for true `$gsd-review`.
