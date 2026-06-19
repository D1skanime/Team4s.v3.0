# RISKS

## Top Risks

### 1. Phase 83 could duplicate contribution rows unnecessarily
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Naruto-scale projects can have many releases; materializing every project-wide contributor onto every release can create churn and hard-to-debug overrides.
- **Mitigation:** Prefer deriving default release access/workspace entries from `release_version_id IS NULL` contributions, then store only explicit release overrides.

### 2. Contributor work could leak back into admin routes
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Normal editors should not have to work from `/admin/fansubs/[id]/edit`.
- **Mitigation:** Keep upload/note work in `/me/releases/[versionId]/workspace`; admin cockpit remains for leader assignment and moderation.

### 3. Release media ownership regression
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Process media must remain release-version scoped; attaching it to episodes or release-level legacy tables breaks the domain model.
- **Mitigation:** Reuse `ReleaseVersionMediaSection`, `useReleaseVersionMedia`, and existing `/admin/release-versions/:id/media` permission-checked endpoints.

### 4. Handler package tests currently do not compile
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `go test ./internal/handlers` is blocked by stale test structs using `AnimeContributionRow.FansubGroupMemberID`.
- **Mitigation:** Update `contribution_proposals_me_test.go` to the canonical `member_id` model early in Phase 83 or a small cleanup slice.

### 5. Dirty local `tmp/` could be staged accidentally
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** `tmp/` contains logs/screenshots, not product code.
- **Mitigation:** Continue staging explicit paths only; do not run `git add .`.

## Current Blockers
- No blocker remains for closing Phase 82.
- Phase 83 must define and implement default-vs-override behavior before Aki gets a concrete release workspace from a project-wide contribution.
