# RISKS

## Top Risks

### 1. Broad dirty worktree causes an accidental mega-commit
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Today's workspace is clean, but long GSD chains and multiple agents can quickly dirty page code, planning files, generated files, and docs at once.
- **Mitigation:** Stage by explicit path only, commit each completed GSD slice, and prefer branch/worktree isolation for parallel agents.

### Phase 51 Note
- Phase 51 auth is merged to `main` and pushed.
- The API bearer truth is now durable: Keycloak `access_token` with `team4s-api` audience, not `id_token`.

### Agent Hygiene Rule
- When multiple agents work on page code, use separate branches/worktrees per agent and require each agent to start from `git status --short --branch`, commit its own slice, and leave generated/cache files unstaged.

### 2. Future agents reintroduce the old release-media assumption
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Versioned Admin/Fansub process media belongs to `release_version_media.release_version_id`; using `release_id` or `release_media` here breaks domain ownership.
- **Mitigation:** Keep `AGENTS.md`, `DECISIONS.md`, domain docs, contracts, and tests aligned. Domain guardrail tests now cover canonical `release_version_id`, `fansub_group_id`, and migration-0057 safety.

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
- No product blocker for Phase 51, Page/Audit cleanup, or the domain guardrail tests.
- Worktree is clean and `origin/main` is current.
- Existing `next/image` mock warning remains harmless but noisy.
- Older unrelated stashes remain from prior work and should not be dropped blindly.
