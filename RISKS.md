# RISKS

## Top 3 Risks

### 1. Duplicate Jellyfin Matches Need Manual Disambiguation
- **Impact:** Medium
- **Likelihood:** Medium
- **Status:** Search works, operators must compare `path` field for duplicates
- **Mitigation:** Preview before sync, compare paths, select correct series ID

### 2. Real Preview/Sync Not Yet Run on Production Data
- **Impact:** Medium
- **Likelihood:** Low
- **Status:** All code paths validated, but no representative real-data run yet
- **Mitigation:** Run one clean preview+sync on a real anime tomorrow

### 3. Handler Modularization Incomplete
- **Impact:** Low
- **Likelihood:** Low
- **Status:** Some handlers still exceed 150-line limit
- **Mitigation:** Continue modularization in next session

## Current Blockers
- None

## If Nothing Changes
- Operators may choose wrong Jellyfin series without path comparison
- Code maintainability slightly reduced in oversized handlers
