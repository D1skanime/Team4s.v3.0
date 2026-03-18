# RISKS

## Top 3 Risks

### 1. Documentation Inconsistency May Cause Future Confusion (NEW)
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** Previous UX handoff documents incorrectly described Related section as standalone post-hero block, when it actually belongs inside infoCard. This could mislead future developers or cause unnecessary rework.
- **Mitigation:** Review and archive/correct outdated documentation tomorrow, add notes explaining the correction.

### 2. Repo-Wide Frontend Lint Debt Masks Slice-Level Regressions
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `frontend npm run lint` still fails outside this scope, so it cannot currently serve as a clean gate for local slice validation.
- **Mitigation:** Inventory lint failures tomorrow and create separate cleanup plan. Continue using build/runtime validation as primary gates.

### 3. Dirty Worktree Increases Commit/Deploy Risk
- **Impact:** Low (reduced from Medium)
- **Likelihood:** Medium (reduced from High)
- **Why it matters:** Foreign changes exist in `backend/server.exe` and `frontend/tsconfig.tsbuildinfo`. Careless staging could include unrelated files in commits.
- **Mitigation:** Continue using explicit file staging. Today's commit demonstrates safe staging practice.

## Current Blockers
- **None.** All technical blockers resolved as of 2026-03-18.

## If Nothing Changes, What Fails Next Week?
- Documentation inconsistency will persist and potentially confuse future work
- Frontend lint will continue producing noisy failures unrelated to current work
- No technical failures expected - all core functionality is working and tested
