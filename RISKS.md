# RISKS

## Top 3 Risks

### 1. Playback Abuse-Control Gap
- **Impact:** High (resource abuse risk)
- **Status:** Auth parity done, guardrails pending
- **Mitigation:** Add rate/operational limits to /api/v1/episodes/:id/play

### 2. Genre Autocomplete Still Needs Live UI Confirmation
- **Impact:** Medium (core admin edit flow still feels broken to operators)
- **Status:** Backend endpoint returns DB values, but the user-reported browser symptom was not yet re-verified after the transport change
- **Mitigation:** Hard refresh `/admin/anime/[id]/edit`, inspect the request path in the browser, and fix any remaining client render, z-index, or stale-bundle issue

### 3. New Admin Anime Routes Have Limited Regression Coverage
- **Impact:** Medium (navigation or layout regressions can slip through across the new step flow)
- **Status:** The new route split is built and reachable, but coverage is still mostly manual
- **Mitigation:** Run a focused desktop/mobile pass across all new routes and add one deterministic UI smoke/regression path

## Current Blockers
- None

## If Nothing Changes
- Playback remains softer than desired under abuse
- Operators can still see the genre field as broken even though the API now returns matches
- The new admin step flow can regress without a targeted regression pass
