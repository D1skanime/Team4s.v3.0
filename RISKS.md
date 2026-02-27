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

### 3. Admin Episode Versions Route Size / Test Gap
- **Impact:** Medium (slower UI iteration, easier regressions)
- **Status:** Visual redesign shipped, but route file is still oversized and lacks focused UI regression coverage
- **Mitigation:** Split the page into smaller presentational components and add one focused regression path

## Current Blockers
- None

## If Nothing Changes
- Playback remains softer than desired under abuse
- Oversized admin files keep frontend changes harder to review
- The redesigned page can regress visually without focused test coverage
