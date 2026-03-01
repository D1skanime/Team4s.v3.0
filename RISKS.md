# RISKS

## Top 3 Risks

### 1. Provider Sync Workflow Is Opaque
- **Impact:** High
- **Status:** Search provides no visible feedback, no preview, no explicit failure states
- **Mitigation:** Add structured error JSON responses to backend, improve frontend error display

### 2. Jellyfin Folder Discovery Is Unreliable
- **Impact:** High
- **Status:** JellySync does not surface possible anime folders; failures are silent
- **Mitigation:** Validate credentials, base URL, implement structured error responses

### 3. Episode-Version Context Is Hidden (PARTIALLY MITIGATED)
- **Impact:** Medium
- **Status:** Backend endpoint now supports `includeVersions`/`includeFansubs` params
- **Remaining:** Frontend UI needs Accordion-Expansion and Fansub-Badges

## Current Blockers
- None

## If Nothing Changes
- Provider sync will remain opaque and hard to trust
- Episode version/fansub visibility depends on pending frontend work
