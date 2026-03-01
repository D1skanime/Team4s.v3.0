# RISKS

## Top 3 Risks

### 1. Provider Sync Workflow Is Opaque
- **Impact:** High (operators cannot trust whether search or sync actually ran)
- **Status:** The search action currently provides no visible feedback, no preview, and no explicit failure states
- **Mitigation:** Split search from sync, enforce preview-first confirmation, and add loading/empty/error UI states

### 2. Jellyfin Folder Discovery Is Unreliable
- **Impact:** High (candidate anime folders cannot be verified before sync)
- **Status:** JellySync does not surface possible anime folders; current failure mode is effectively silent
- **Mitigation:** Validate credentials, base URL, `/Items?IncludeItemTypes=Series`, folder mapping, path normalization, and structured error JSON

### 3. Episode-Version Context Is Hidden
- **Impact:** Medium (operators may edit the wrong version or miss fansub assignments)
- **Status:** The episodes overview does not show version details or per-version fansub groups clearly enough
- **Mitigation:** Extend the episodes endpoint joins and render expandable version details with badges and edit entry points

## Current Blockers
- No hard repo blocker, but the current sync workflow is effectively blocked by missing diagnostics and operator-visible feedback

## If Nothing Changes
- Provider sync will remain unsafe and difficult to trust
- Jellyfin mapping issues will stay hard to diagnose and easy to miss
- Episode version and fansub assignments will remain cumbersome to verify before edits
