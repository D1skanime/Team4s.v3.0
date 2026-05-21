# RISKS

## Top 5 Risks

### 1. Broad dirty worktree causes an accidental mega-commit
- **Impact:** High
- **Likelihood:** High
- **Why it matters:** Product code, phase artifacts, migrations, GSD tooling, screenshots, and temp folders are all dirty at once.
- **Mitigation:** Stage by explicit path only. Never use `git add .` from this state.

### 2. Temporary screenshots and UAT artifacts leak into Git unintentionally
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `.tmp-*` and `.tmp-playwright-uat/` are useful local evidence, but noisy and not all intended for version control.
- **Mitigation:** Keep screenshots referenced in phase docs, but only commit deliberately selected evidence if the repo convention requires it.

### 3. GSD/Codex tooling updates mix with product work
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `.codex/get-shit-done`, `.codex/skills`, hooks, and agent files show many changes that deserve a separate tooling review.
- **Mitigation:** Do not combine tooling updates with Phase 48/49 product commits.

### 4. Phase 48 visual follow-ups get mistaken for blockers
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** UI review found real polish points, but the slice already passes.
- **Mitigation:** Treat long list handling, disabled capability copy, and media fallback polish as later follow-ups.

### 5. Repo-wide checks are overinterpreted from a dirty tree
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Targeted Phase 48 checks passed, but the whole repo has unrelated dirty state and historical lint noise.
- **Mitigation:** Re-run checks per staged slice and document unrelated failures separately.

## Current Blockers
- No hard runtime blocker for the current closeout push.
- The remaining blocker is commit hygiene, not product execution.
