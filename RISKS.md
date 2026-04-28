# RISKS

## Top 3 Risks

### 1. Phase 26 could stay half-closed if the new segment-file visibility is not judged live
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** the implementation is technically in place, but the real operator value depends on whether the new file-name and badge surfaces actually read clearly in the live UI.
- **Mitigation:** do one narrow next-day review of `/admin/episode-versions/:id/edit` and `/admin/anime/:id/episodes`, then either verify Phase 26 or write down the exact remaining gap.

### 2. Local temp/cache/debug artifacts can still pollute the worktree
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** the repo currently contains untracked screenshot/tmp/cache/debug folders that are not intended history.
- **Mitigation:** keep staging selective and avoid accidental commits of local artifacts.

### 3. Cross-AI review is still unavailable locally
- **Impact:** Low
- **Likelihood:** High
- **Why it matters:** we cannot currently run the intended independent review lane on this machine.
- **Mitigation:** keep local verification strong and rerun review once a reviewer CLI is installed.

## Current Blockers
- No hard product blocker remains on the current segment/admin slice.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
