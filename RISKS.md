# RISKS

## Top 3 Risks

### 1. Admin anime update is still on the legacy write model
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** create/read/delete already target `team4s_v2`, but edit/update still writes flat anime columns. That is the next most likely source of broken admin behavior or confusing partial saves.
- **Mitigation:** migrate `UpdateAnime(...)` next and verify it against the running v2 DB before extending more admin features.

### 2. Partial v2 cutover can hide route-by-route schema mismatches
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** the anime vertical is partly on v2 and partly still on legacy assumptions. Untested adjacent routes may compile but still fail at runtime if they touch removed columns.
- **Mitigation:** continue pulling routes through one by one and verify each migrated endpoint live in Docker.

### 3. Broad push scope increases regression attribution cost
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** this worktree now combines UI simplification, delete/audit fixes, v2 DB/runtime cutover, backend route migration, and public media rendering fixes. If a regression appears, the search space is wider than a single narrow slice.
- **Mitigation:** keep commit notes and handoff files explicit about what changed and prefer focused verification when pulling the next v2 route.

## Current Blockers
- No hard product blocker.
- Main engineering blocker is the remaining admin update/edit migration to v2.

## If Nothing Changes, What Fails Next Week?
- Admin edits can drift out of sync with the now-live v2 create/read/delete path.
- Additional anime routes may keep failing one at a time if the remaining legacy schema assumptions are not surfaced and scheduled deliberately.
- The team may keep wasting time debugging old-schema behavior if the runtime target (`team4s_v2`) is not treated as the new source of truth.
