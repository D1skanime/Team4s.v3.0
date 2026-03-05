# RISKS

## Top 3 Risks

### 1. Folder Provisioning Gap for Anime/Group Assets
- Impact: High (manual folder setup does not scale)
- Likelihood: High
- Mitigation:
  - Next action: define canonical path schema + validation rules
  - Owner: Team4s backend/dev
  - Due: 2026-03-06

### 2. Filesystem Permission Mismatch on Media Host
- Impact: High (automation fails at runtime)
- Likelihood: Medium
- Mitigation:
  - Next action: verify service account write permissions on target media roots in staging/local
  - Owner: infra/dev
  - Due: 2026-03-06

### 3. Naming Inconsistency Across Existing Anime Folders
- Impact: Medium (duplicates, hard-to-find assets, broken assumptions)
- Likelihood: Medium
- Mitigation:
  - Next action: define and enforce normalization policy (slug, season format, episode format)
  - Owner: product + dev
  - Due: 2026-03-07

## Current Blockers
- Missing one-click folder creation path in app/backend.
- No documented direct mkdir endpoint in Jellyfin/Emby REST APIs.

## If Nothing Changes, What Fails Next Week?
- New anime/group asset onboarding will stay manual and slow.
- Error rate from inconsistent folder structures will increase.
- Work on group-asset features will be delayed by operational overhead.
