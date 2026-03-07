# RISKS

## Top 3 Risks

### 1. OpenAPI Contract Drift on Group Assets
- **Impact:** High (frontend/backend work is live, but docs and future clients can implement the wrong payload)
- **Likelihood:** High
- **Mitigation:** Update `shared/contracts/openapi.yaml` first tomorrow and smoke the generated schema against the live endpoint, including `thumb_url` and `banner_url`

### 2. Groups/Subgroups Library Discovery Stops at 500 Root Folders
- **Impact:** High (group asset pages will fail to resolve once the library grows past the first page)
- **Likelihood:** Medium
- **Mitigation:** Add provider pagination/iteration for group root discovery and re-test against the current naming rules

### 3. Jellyfin Config Failures Still Masquerade as Missing Folders
- **Impact:** Medium (operators will debug the wrong thing and lose time on incidents)
- **Likelihood:** Medium
- **Mitigation:** Distinguish missing `JELLYFIN_*` / auth / connectivity failures from true group-folder misses in the handler response/logging

## Current Blockers
- None for the local deploy; the current blockers are correctness and operability, not startup/runtime

## Technical Debt
- Group-detail episode linking is still derived from the currently loaded release list
- The live group-assets contract is only partially documented outside the code
- Visual tuning on the group page is still iterative; hero/info contrast can still be over- or under-tuned without screenshot validation
- Existing release-assets persistence work is still pending for the separate `/api/v1/releases/:releaseId/assets` lane

## If Nothing Changes, What Fails Next Week?
- The next client or docs consumer will integrate the wrong group-assets contract
- Larger Jellyfin group libraries will start producing false "not found" results for valid anime/group pages
- Configuration outages will be misdiagnosed as content/data issues
