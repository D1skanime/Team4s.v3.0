# RISKS

## Top 3 Risks

### 1. Intermittent Jellyfin Upstream Timeouts Remain Environment-Dependent
- **Impact:** Medium
- **Likelihood:** Medium
- **Status:** Transport diagnostics are now in place, but upstream/network variability can still trigger `server nicht erreichbar`
- **Mitigation:** Use `docs/operations/jellyfin-timeout-diagnostics.md` during incidents and track timeout log frequency over repeated runs

### 2. Timeout Diagnostics Need Ongoing Signal Validation
- **Impact:** Low
- **Likelihood:** Medium
- **Status:** Diagnostics were added centrally, but trend behavior under higher load is not yet benchmarked
- **Mitigation:** Add timeout simulation fixture and review log quality/noise weekly

### 3. Search Query Plan Drift as Dataset Grows
- **Impact:** Low
- **Likelihood:** Medium
- **Status:** `pg_trgm` baseline is documented, but plan behavior can change with cardinality and planner statistics
- **Mitigation:** Run the weekly query-plan checks in `docs/performance/anime-search-query-plan-tracking.md`

## Current Blockers
- None

## If Nothing Changes
- Jellyfin timeout incidents can recur without clear trend ownership
- Diagnostic quality may degrade if logs are not periodically reviewed
- Search latency could regress silently as dataset size changes
