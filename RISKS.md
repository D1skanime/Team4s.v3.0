# RISKS

## Top 3 Risks

### 1. Wrong-domain release or fansub persistence would corrupt the intended model
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** anime and episodes must stay neutral; release media belongs on existing release-native seams, group media belongs on `fansub_group_media`, and `release_version_groups.fansub_group_id` remains the canonical group seam.
- **Mitigation:** read `docs/architecture/db-schema-fansub-domain.md` first, treat `fansub_group_id` as runtime truth.

### 2. Legacy fansub fields may block schema cleanup
- **Impact:** Low
- **Likelihood:** Low
- **Why it matters:** `fansub_groups.closed_year` and `history_description` are not used by any active UI surface but still exist in the DB schema. Leaving them creates drift between DB truth and active data model.
- **Mitigation:** audit read surfaces before dropping; schedule as explicit cleanup phase.

### 3. Scratch/cache files in worktree could be accidentally staged
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** many untracked scratch files (screenshots, tmp-*, .cache/) remain in the worktree. Staging them accidentally pollutes commits.
- **Mitigation:** always use selective `git add <file>` and run `git status --short` before every commit.

## Current Blockers
- No known runtime blockers.
- `npm run lint` passes but reports 26 pre-existing unrelated warnings.
- Cross-AI review unavailable locally.
