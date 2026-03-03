# RISKS

## Top 3 Risks

### 1. Jellyfin Handler Modularization Still Incomplete
- **Impact:** Medium
- **Likelihood:** High
- **Status:** `SyncEpisodeFromJellyfin` is extracted, but remaining sync handlers/helpers still exceed the 150-line target in parts
- **Mitigation:** Continue split into focused handler/helper files while preserving API behavior and tests

### 2. Intermittent Jellyfin Upstream Timeouts
- **Impact:** Medium
- **Likelihood:** Medium
- **Status:** Operators still occasionally hit `server nicht erreichbar` despite valid config
- **Mitigation:** Add tighter timeout/error diagnostics and keep retry/resync workflow explicit in UI/runbook

### 3. Local/CI Drift Risk After Refactors + Migration
- **Impact:** Low
- **Likelihood:** Medium
- **Status:** Local validations passed, but CI regression path has not been re-run since today's handler/crop/migration changes
- **Mitigation:** Execute CI-equivalent suite next session and fix drift immediately if detected

## Current Blockers
- None

## If Nothing Changes
- Remaining sync handlers stay harder to maintain and review
- Jellyfin timeout incidents remain harder to triage under operator pressure
- A CI-only regression could slip through despite local green runs
