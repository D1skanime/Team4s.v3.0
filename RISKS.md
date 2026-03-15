# RISKS

## Top 3 Risks

### 1. Genre Contract Mismatch Survives The Layout Fix
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** The page layout is shipped, but the backend still needs an explicit `genres: string[]` contract to support type-safe genre handling after the redesign.
- **Mitigation:** Patch backend anime detail serialization first tomorrow, then update the frontend type and smoke-test `/anime/[id]`.

### 2. Repo-Wide Frontend Lint Debt Masks Slice-Level Regressions
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `frontend npm run lint` still fails outside this scope, so it cannot currently serve as a clean gate for local slice validation.
- **Mitigation:** Keep using targeted build/runtime validation for this slice and schedule a separate lint-debt cleanup pass.

### 3. Dirty Worktree Increases Commit/Deploy Risk
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** Foreign changes exist in `frontend/src/components/anime/AnimeEdgeNavigation.*`, `backend/server.exe`, and `frontend/tsconfig.tsbuildinfo`; careless staging could pollute follow-up commits or revert someone else's work.
- **Mitigation:** Continue using explicit file staging and verify `git status --short` before every commit/push.

## Current Blockers
- No blocker remains for the related-slider/layout fix itself.
- Remaining blocker for the broader anime detail follow-up: backend genre contract work is still open.

## If Nothing Changes, What Fails Next Week?
- The page will remain visually fixed, but the data contract around genres will continue to be implicit and easy to break.
- Frontend lint will keep producing noisy failures unrelated to the active slice.
- Any rushed follow-up could accidentally include foreign worktree changes.
