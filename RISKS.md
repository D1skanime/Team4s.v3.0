# RISKS

## Top 3 Risks

### 1. The next AniSearch phase could reopen the now-verified create relation seam without a real regression
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** the chosen next slice is edit-route relation UX, but it sits directly beside the now-verified create relation seam; a casual refactor could turn a clean baseline back into a moving target.
- **Mitigation:** treat Phase 13 as closed, keep create-side relation persistence as a regression baseline, and scope edit-route UX changes separately before implementation.

### 2. Future AniSearch relation-label expansion could blur product meaning if done ad hoc
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** now that edit-route relation UX is the chosen next slice, it will be tempting to fold label normalization into the same work. Each added mapping changes product semantics and can become hard to reason about if not recorded deliberately.
- **Mitigation:** keep taxonomy expansion out of the edit-route UX slice, record any new AniSearch-to-local relation mapping in `DECISIONS.md` before implementation, and regression-test the concrete examples that motivated it.

### 3. Local environment drift can still waste time if the wrong workspace or runtime is used
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** there is now a clean canonical repo plus older dirty handoff/planning files; using the wrong folder, stale backend process, or wrong startup path can create fake AniSearch failures.
- **Mitigation:** work only from `C:\Users\admin\Documents\Team4s` and use the documented Docker/local startup commands in `STATUS.md`.

## Current Blockers
- No product blocker on the current `main` baseline.
- Procedural blocker: the edit-route relation UX slice is chosen, but its exact scope is not written down yet.
- Process blocker: no independent reviewer CLI for true `$gsd-review`.
