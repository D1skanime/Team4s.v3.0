# RISKS

## Top Risks

### 1. Broad dirty worktree causes an accidental mega-commit
- **Impact:** High
- **Likelihood:** High
- **Why it matters:** Audit files, runtime fixes, backend/auth/infra changes, generated files, and unrelated planning work are dirty at once.
- **Mitigation:** Stage by explicit path only. Do not use `git add .`.

### Phase 51 Note
- The Phase 51 auth slice is verified and should be committed separately from the broader audit/UI/domain work.
- Safe cleanup path: explicit-path commit for Phase 51, then stash or split unrelated dirty work.

### Agent Hygiene Rule
- When multiple agents work on page code, use separate branches/worktrees per agent and require each agent to start from `git status --short --branch`, commit its own slice, and leave generated/cache files unstaged.

### 2. Future agents reintroduce the old release-media assumption
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Versioned Admin/Fansub process media belongs to `release_version_media.release_version_id`; using `release_id` or `release_media` here breaks domain ownership.
- **Mitigation:** Keep `AGENTS.md`, `DECISIONS.md`, domain docs, contracts, and tests aligned. Add domain guardrail tests next.

### 3. New upload flows duplicate existing domain flows
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Parallel upload logic makes media ownership, progress state, and API contracts drift.
- **Mitigation:** Before any new upload work, inspect `MediaUpload`, `ReleaseVersionMediaSection`/`useReleaseVersionMedia`, anime upload planning, and `api.ts` upload helpers.

### 4. Legacy route deletion misses a hidden link
- **Impact:** Medium
- **Likelihood:** Low/Medium
- **Why it matters:** Removed routes should not be linked from active admin screens.
- **Mitigation:** Keep `rg` checks in the audit notes and test active route replacements before committing.

### 5. Larger UI convergence gets attempted too broadly
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Drawer, Upload, and Card convergence can create UX/domain regressions if done as one large refactor.
- **Mitigation:** Keep future UI work as small adoption slices with targeted tests.

## Current Blockers
- No product blocker for the completed audit slices.
- Main blocker is commit hygiene in a broad dirty worktree.
- Existing `next/image` mock warning remains harmless but noisy.
