# RISKS

## Top 3 Risks

### 1. Single-Episode Sync Not Yet Smoke-Tested
- **Impact:** Medium
- **Likelihood:** Medium
- **Status:** Endpoint and UI implemented, needs live Jellyfin validation
- **Mitigation:** Run smoke-test with configured Jellyfin instance

### 2. Handler File Size Growing
- **Impact:** Low
- **Likelihood:** High
- **Status:** jellyfin_sync.go now ~600 lines (limit is 150)
- **Mitigation:** Extract SyncEpisodeFromJellyfin to separate file after stabilization

### 3. Duplicate Jellyfin Title Matches
- **Impact:** Medium
- **Likelihood:** Low
- **Status:** Manual comparison required when multiple series match
- **Mitigation:** UI shows all candidates, operator picks correct one

## Current Blockers
- None

## If Nothing Changes
- New sync/edit features work but lack live validation
- Handler files continue growing without modularization
- Test coverage gaps remain for Jellyfin feedback states
