# RISKS

## Top 3 Risks

### 1. Handler File Size Growing
- **Impact:** Low
- **Likelihood:** High
- **Status:** `jellyfin_sync.go` exceeds 150-line handler limit
- **Mitigation:** Extract `SyncEpisodeFromJellyfin` to separate file `jellyfin_episode_sync.go` (next session)

### 2. Missing Sync Workflow UI Copy
- **Impact:** Low
- **Likelihood:** Medium
- **Status:** No explicit UI copy yet to distinguish bulk season-wide sync from corrective single-episode sync
- **Mitigation:** Add clear operator-facing labels and help text to both sync buttons in admin episodes UI

### 3. Legacy Image Components
- **Impact:** Low
- **Likelihood:** Low
- **Status:** Some older admin routes still use `img` tags instead of Next.js Image component
- **Mitigation:** Replace remaining `img` usage during next refactor pass

## Current Blockers
- None

## If Nothing Changes
- Handler files continue growing without modularization, making maintenance harder
- Operators may remain confused about the difference between bulk sync and corrective single-episode sync
- Older admin routes keep using `img` tags and trigger linter warnings
