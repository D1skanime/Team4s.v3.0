# RISKS

## Top 3 Risks

### 1. Planning state is now behind the verified implementation
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** cover was the main architectural gap in `04-03`, and that gap is now closed in code/runtime/UI. If planning files stay stale, tomorrow's work will start from the wrong problem.
- **Mitigation:** update the `04-03` plan/status notes before opening new Phase 4 work.

### 2. Dirty worktree plus unrelated local changes can still blur attribution
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** many backend, frontend, docs, planning, and tooling changes are in flight beyond the verified cover-slot slice.
- **Mitigation:** keep targeted verification narrow and document clearly which parts were actually proven today.

### 3. Temporary browser smoke may be mistaken for durable automation
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** the cover UI path is verified through `frontend/tmp-playwright-phase4/cover-ui-smoke.mjs`, but that is an ad-hoc script, not yet part of a maintained test lane.
- **Mitigation:** make an explicit keep/promote/delete decision instead of letting the temp script drift.

## Current Blockers
- No hard product blocker.
- Remaining blocker is administrative/phase-management: formal closeout of the verified Phase 4 slice.

## If Nothing Changes, What Fails Next Week?
- The team may keep discussing cover as if it were still open, even though code/runtime/browser evidence says otherwise.
- Future regressions may be harder to classify if the temporary smoke script is assumed to be permanent coverage without being maintained.
- Resume quality will drift again if repo-local handoff files stop matching the actual Team4s worktree.
