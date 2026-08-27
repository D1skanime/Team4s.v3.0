# Quick Task 260827-bhp: Bulk Fansub Group Assignment

## Goal

Allow an admin to add one selected fansub group to every existing release version of selected episodes without replacing existing group links or creating episode-owned links.

## Plan

1. Resolve selected canonical episodes to their existing release versions and construct additive, deduplicated `fansub_groups` PATCH payloads. Report selected episodes that have no release version.
2. Reuse `updateEpisodeVersion` in the existing bulk mutation hook for progress, refresh, and partial-failure handling.
3. Extend the existing bulk action bar with the shared `Select` primitive, focused unit coverage, lint, typecheck, and live-admin verification.

## Verification

- Unit tests prove additive group preservation, skipped versionless episodes, mutation payloads, and the enabled bulk control.
- A logged-in admin manually verifies the control on `/admin/anime/[id]/edit`.

## Constraints

- No new API endpoint, migration, or episode-direct fansub relation.
- `release_version_groups.fansub_group_id` remains the canonical ownership seam.
