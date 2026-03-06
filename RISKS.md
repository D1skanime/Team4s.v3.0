# RISKS

## Top 3 Risks

### 1. Release Assets Still Have No Persisted Data Source
- **Impact:** High (EPIC 4/5 remain visually empty despite the live public API contract)
- **Likelihood:** Medium
- **Mitigation:** Add dedicated release-asset persistence/admin curation, seed at least one release, then rerun media-assets/player validation

### 2. Screenshot Data Not Yet Seeded
- **Impact:** Medium (screenshot flow stays invisible without data)
- **Likelihood:** Medium
- **Mitigation:** Seed real screenshot rows after migration checks and rerun gallery validation

### 3. Stream Proxy Requires Jellyfin Config
- **Impact:** Medium (Playback fails without provider)
- **Likelihood:** Medium
- **Mitigation:** Ensure `JELLYFIN_*` env vars are set; error states remain implemented

## Current Blockers
- No persisted release-asset storage behind the now-live public assets contract

## Technical Debt
- Component tests removed (need `@testing-library/react`)
- Some admin upload flows still need image proxy integration
- `EpisodeReleaseSummary.id` still represents release identity, so future clients must keep using `episode_id` for `/episodes/[id]`
- The public assets endpoint currently returns a stable empty list for existing releases until asset storage lands
