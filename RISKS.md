# RISKS

## Top 3 Risks

### 1. Phase 28 could be overstated as done before the live runtime/fallback pass actually happens
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** the automated build/test lane is green again, but the real product promise for Phase 28 still depends on live playback-source and fallback behavior in the operator UI.
- **Mitigation:** run one explicit browser/UAT pass on `/admin/episode-versions/47/edit` and record the result in the verification artifact before calling the phase closed.

### 2. Migration bookkeeping around Phase 27 / `0052` is still mistrust-inducing
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** schema state once appeared inconsistent, which makes later debugging and trust in migration status harder than it should be.
- **Mitigation:** compare the physical DB tables with migration status directly and write down the explanation or repair path before the next schema-moving slice.

### 3. Local temp/cache/debug artifacts can still pollute the worktree
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** the repo currently contains untracked screenshot/tmp/cache/debug folders that are not intended history.
- **Mitigation:** keep staging selective and avoid accidental commits of local artifacts.

## Current Blockers
- No hard product blocker remains on the current duration/runtime code path.
- Live Phase-28 browser/UAT evidence is still missing.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
