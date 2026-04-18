# RISKS

## Top 3 Risks

### 1. Final visual density may still need operator tuning
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** the asset layout now matches the requested reference much more closely, but final judgment is visual and screen-size dependent.
- **Mitigation:** run one short browser pass after push and keep any follow-up as CSS-only polish unless a functional regression appears.

### 2. Additive background-video behavior must stay aligned across create, edit, and runtime playback
- **Impact:** Medium
- **Likelihood:** Low
- **Why it matters:** create now supports multiple background videos, while older code paths historically treated `background_video` as singular.
- **Mitigation:** keep the plural backend route and runtime `BackgroundVideos` list as the canonical multi-video path; preserve singular fallback only for compatibility.

### 3. Temporary local artifacts could accidentally pollute future commits
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** local screenshot files, Edge profile folders, root `node_modules`, and build caches exist in the working tree.
- **Mitigation:** do not stage `tmp-*.png`, `frontend/tmp-edge-profile-*`, root `node_modules`, or generated build/cache files unless deliberately needed.

## Current Blockers
- No known product blocker remains for Anime Create.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
