# RISKS

## Top 5 Risks

### 1. Broad dirty worktree causes an accidental mega-commit
- **Impact:** High
- **Likelihood:** High
- **Why it matters:** Product code, phase artifacts, GSD/Codex tooling, screenshots, temp folders, generated files, and tests are all dirty at once.
- **Mitigation:** Stage by explicit path only. Never use `git add .` from this state.

### 2. Phase 50 boundary tests get mixed with unrelated tooling changes
- **Impact:** High
- **Likelihood:** High
- **Why it matters:** Admin authorization changes need a clean review story. Mixing them with `.codex/` or planning churn obscures the security boundary.
- **Mitigation:** Keep the Phase 50 commit to editor/gate tests and directly related source files.

### 3. `tsconfig.tsbuildinfo` is accidentally committed or discarded without intent
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** It is dirty after local frontend verification/build and can create noisy diffs if staged casually.
- **Mitigation:** Decide explicitly tomorrow whether to leave it unstaged, restore it on request, or include it because local project convention wants it.

### 4. Contributor release editor scope regresses back into admin behavior
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Non-platform users must not see admin tabs or admin actions, even on direct `/admin/episode-versions/:id/edit?tab=...` visits.
- **Mitigation:** Keep backend capability checks as the source of truth and preserve tests for loading, media-only, notes-only, and no-capability cases.

### 5. Release/fansub media ownership is blurred during cleanup
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Current project rules require release media to stay on `media_files`, `media_assets`, and `release_media`/release-version media structures, not neutral episodes/anime.
- **Mitigation:** Future fixes should inspect `docs/architecture/db-schema-fansub-domain.md` and avoid inventing parallel media logic.

## Current Blockers
- No hard blocker for today's Phase 50 frontend boundary slice.
- Main blocker is commit hygiene in a broad dirty worktree.
- Repo-wide checks should be rerun only after slicing; targeted checks are the reliable evidence for today's changed files.
