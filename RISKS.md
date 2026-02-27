# RISKS

## Top 3 Risks

### 1. Playback Abuse-Control Gap
- **Impact:** High (resource abuse risk)
- **Status:** Auth parity done, guardrails pending
- **Mitigation:** Add rate/operational limits to /api/v1/episodes/:id/play

### 2. Remaining Handler Concentration
- **Impact:** Medium (slower changes, higher regression risk)
- **Status:** Major monoliths split, ~10 files still >150 lines
- **Mitigation:** Continue modularization sweep

### 3. Alias Coverage for Imported Tags
- **Impact:** Medium (versions appear unmapped)
- **Status:** B-SH and similar tags need mapping
- **Mitigation:** Create aliases or dedicated fansub groups

## Current Blockers
- None

## If Nothing Changes
- Playback remains softer than desired under abuse
- Handler changes stay slower than necessary
- Some imported versions show without group labels
