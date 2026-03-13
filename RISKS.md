# RISKS

## Top 3 Risks

### 1. Missing/Invalid Jellyfin Config Is Still Mapped Too Loosely
- **Impact:** High (operators can misread environment/config failures as missing library content)
- **Likelihood:** Medium
- **Mitigation:** Split missing/invalid `JELLYFIN_*` handling from true missing-group results and add a focused handler test for the error mapping

### 2. Folder Matching Still Depends on Naming Stability
- **Impact:** Medium (valid group folders can still be skipped if naming drifts away from `<animeId>_<title>_<group-slug>`)
- **Likelihood:** Medium
- **Mitigation:** Document the matching assumptions and validate against at least one more real library example

### 3. Big-Bang Schema Migration Would Break Too Many Surfaces at Once
- **Impact:** High (repositories, handlers, contracts, admin flows, and release/media behavior all depend on the current flat tables)
- **Likelihood:** Medium
- **Mitigation:** Keep `docs/architecture/db-schema-v2.md` as the target model and execute only explicit post-brief migration slices with parity/cleanup gates

## Current Blockers
- None for the local deploy; the current blockers are correctness and operability, not startup/runtime
- No technical blocker for planning, but the next migration execution slice is not yet added to the roadmap

## Technical Debt
- Group-detail episode linking is still derived from the currently loaded release list
- Visual tuning on the group page is still iterative; hero/info contrast can still be over- or under-tuned without screenshot validation
- Existing release-assets persistence work is still pending for the separate `/api/v1/releases/:releaseId/assets` lane
- The current production schema still mixes release, stream, and provider concerns inside `episode_versions`

## If Nothing Changes, What Fails Next Week?
- Ops/debug sessions will still waste time distinguishing Jellyfin configuration failures from genuine content misses
- Folder naming drift can still produce false "not found" results even though pagination is fixed
- The migration effort will stall at "good brief, no first execution slice" and the pilot will not prove value beyond planning
