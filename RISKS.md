# RISKS

## Top 3 Risks

### 1. Wrong-domain release or fansub persistence would corrupt the intended model
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** anime and episodes must stay neutral; release media belongs on `release_media`, group media belongs on `fansub_group_media`, and `release_version_groups.fansub_group_id` remains the canonical group seam.
- **Mitigation:** read `docs/architecture/db-schema-fansub-domain.md` first, treat `fansub_group_id` as runtime truth, and stop immediately if a change would attach release or fansub data to the wrong entity.

### 2. Migration-chain risk is elevated around the cleanup-boundary work
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** multiple untracked migrations (`0055` to `0057`) are present together, including legacy cleanup for `fansubgroup_id`, so adding more schema work casually could make the chain harder to trust or review.
- **Mitigation:** inspect migration files plus `git status` before adding any new migration, document the safety SQL for destructive cleanup, and stop if data mismatches appear.

### 3. Mixed worktree churn can hide real product risk
- **Impact:** Low
- **Likelihood:** High
- **Why it matters:** product changes, planning artifacts, and repo-local GSD/Codex tooling changes are all dirty at once, which makes accidental commits and shallow review more likely.
- **Mitigation:** keep staging selective, document unrelated local artifacts separately, and avoid broad formatting or cleanup commands.

## Current Blockers
- No hard runtime blocker is known for opening the Phase-32 release drawer.
- Release-theme-asset round-trip is now verified, but one more detail/theme drawer switching pass is still open to close the stale-state risk honestly.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
