# RISKS

## Top 3 Risks

### 1. Post-apply UX can still mislead operators after a successful idempotent import
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** the workbench still lets the operator click `Mapping anwenden` again even after the normalized graph was already written and updated correctly.
- **Mitigation:** treat this as the next likely follow-up slice and make successful applies visually land in a clearly finished state.

### 2. Compatibility leftovers can still blur the normalized persistence story
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** the old `streams` table still exists as an allowed compatibility artifact beside `release_streams`.
- **Mitigation:** keep follow-up verification and future work anchored to `release_streams`, `release_variants`, and `release_variant_episodes`.

### 3. Cross-AI review is still unavailable locally
- **Impact:** Low
- **Likelihood:** High
- **Why it matters:** we cannot currently run the intended independent review lane on this machine.
- **Mitigation:** keep local verification strong and rerun review once a reviewer CLI is installed.

## Current Blockers
- No hard product blocker for Phase 20 remains.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
