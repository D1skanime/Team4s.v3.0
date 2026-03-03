# RISKS

## Top 3 Risks

### 1. Migration 0018 Not Yet Applied
- **Impact:** High (Screenshot Gallery won't work)
- **Likelihood:** High (new migration from today)
- **Mitigation:** Run `0018_episode_version_images.up.sql` before testing

### 2. Mock Data in MediaAssetsSection
- **Impact:** Medium (Assets show placeholder data)
- **Likelihood:** High (EPIC 8 API not implemented)
- **Mitigation:** EPIC 8 will implement real assets API; mock data is temporary

### 3. Stream Proxy Requires Jellyfin Config
- **Impact:** Medium (Playback fails without provider)
- **Likelihood:** Medium
- **Mitigation:** Ensure JELLYFIN_* env vars are set; error states implemented

## Current Blockers
- None

## Technical Debt
- Component tests removed (need @testing-library/react)
- Some admin upload flows still need image proxy integration
