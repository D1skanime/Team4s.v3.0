# RISKS

## Top 3 Risks

### 1. Generic media upload path is not aligned with the live schema
- **Impact:** High
- **Likelihood:** High
- **Why it matters:** richer uploads for banner/logo/background will trip over the same backend mismatch that broke edit poster upload through `/api/v1/admin/upload`
- **Mitigation:** either patch repository/handler to current `media_assets` schema or explicitly keep using the local cover route until the broader media lane is redesigned

### 2. Edit save behavior is still semantically muddy
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** create flow is now understandable, but edit still mixes immediate mutations and save-bar-driven changes, which can confuse both users and future implementation work
- **Mitigation:** define the save contract first, then implement against that spec instead of continuing ad hoc UI tweaks

### 3. Planning/state drift between old milestone docs and actual active work
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** older docs still describe the media-upload milestone as the current center of gravity, while real work has moved into anime intake and edit flow hardening
- **Mitigation:** keep repo-local status/context files aligned with the actual active slice and use them tomorrow instead of older milestone summaries

## Current Blockers
- No hard blocker for resuming tomorrow
- Main design blocker: final edit-save semantics are not yet fully decided
- Operational note: the local Docker stack currently contains created verification entries (`Bleach`, `Air`) and uploaded local cover assets

## If Nothing Changes, What Fails Next Week?
- richer media uploads beyond poster will keep failing on the backend schema mismatch
- edit behavior will become harder to reason about as more fields and sync sources are added
- roadmap discussions may become noisy because old status docs point at the wrong center of work
