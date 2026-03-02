# RISKS

## Top 3 Risks

### 1. Public Anime Detail Is Overloaded
- **Impact:** Medium
- **Likelihood:** High
- **Status:** All fansub descriptions/histories can render at once, which makes the page noisy and hard to scan
- **Mitigation:** Move to one active fansub-group context with explicit group switching

### 2. Public Episode Versions Can Mix Multiple Groups
- **Impact:** High
- **Likelihood:** Medium
- **Status:** The public episode area still needs a single active fansub filter so users only see one coherent public version set
- **Mitigation:** Bind the visible version list to the currently active public fansub group only

### 3. Handler File Size Growing
- **Impact:** Low
- **Likelihood:** High
- **Status:** `jellyfin_sync.go` is still far above the project's handler-size target
- **Mitigation:** Extract `SyncEpisodeFromJellyfin` to a separate file after the current UX slice stabilizes

## Current Blockers
- None

## If Nothing Changes
- The public anime page stays visually overloaded and harder to understand
- Users can keep seeing mismatched version rows from multiple fansub groups at the same time
- Handler files continue growing without modularization
