# RISKS

## Top 3 Risks

### 1. Duplicate Jellyfin Matches Still Need Manual Disambiguation
- **Impact:** High
- **Likelihood:** Medium
- **Status:** Live search works, but multiple same-title candidates can still appear for the same anime
- **Mitigation:** Always compare preview output and path before first sync on a title with duplicates

### 2. Real Preview/Sync Path Is Not Yet Fully Documented
- **Impact:** High
- **Likelihood:** Medium
- **Status:** Failure paths are validated, but one representative successful preview+sync still needs a written reference flow
- **Mitigation:** Run and document one clean preview path before broad operator use

### 3. Episode-Version Context Is Still Not Integrated In Admin Episodes
- **Impact:** Medium
- **Likelihood:** High
- **Status:** Backend and UI scaffolding exist, but the route is not wired yet
- **Mitigation:** Integrate the new episodes overview component next

## Current Blockers
- None

## If Nothing Changes
- Operators can search Jellyfin reliably, but ambiguous title matches may still lead to wrong manual choices
- The admin episodes route will continue to hide too much version/fansub context
