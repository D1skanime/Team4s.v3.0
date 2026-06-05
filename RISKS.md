# RISKS

## Top Risks

### 1. Phase 71 UAT state may be split across agents
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** The user reports Phase 71 UAT was confirmed, but this worktree currently shows only committed context/discussion/UI-spec artifacts and no local UAT artifact.
- **Mitigation:** Start next session by locating the Phase 71 UAT artifact or the other agent's commit before changing Phase 71 code or docs.

### 2. Local-only MVP summary could be accidentally staged
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** `.planning/MVP-PHASES-60-69-SUMMARY.md` is useful discussion context but the user explicitly said it does not need to go to GitHub.
- **Mitigation:** Do not use `git add .`; stage explicit paths only.

### 3. Generated TypeScript build state could enter a commit
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** `frontend/tsconfig.tsbuildinfo` is dirty local generated state and unrelated to the closeout.
- **Mitigation:** Leave it unstaged unless a separate cleanup explicitly decides otherwise.

### 4. Edit and display surfaces drift again
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Live UAT repeatedly found proposal, claim, and milestone editing in the wrong place. `/admin/my-groups/[id]` should not become a shadow edit hub.
- **Mitigation:** Keep internal mutation workflows in `/admin/fansubs/[id]/edit` unless a new documented decision redefines the route.

### 5. Credits and permissions get conflated
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** A contribution credit is historical/attribution data; a permission is an operational right. Automatically connecting them can create accidental access grants.
- **Mitigation:** Treat any credit-to-permission bridge as an explicit, separate, reversible product decision.

### 6. Media ownership regressions
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Versioned Admin/Fansub process media belongs to `release_version_media.release_version_id`; profile story images now have their own media-backed TipTap flow.
- **Mitigation:** Reuse existing upload/auth/API seams and domain-specific media tables; do not substitute `release_media`, `release_id`, or generic uploads for scoped flows.

## Current Blockers
- No known blocker remains for phases 60-70.
- Phase 71 latest UAT status must be reconciled before treating it as locally closed.
- `main` is ahead of `origin/main` by many commits; push strategy should be explicit.
