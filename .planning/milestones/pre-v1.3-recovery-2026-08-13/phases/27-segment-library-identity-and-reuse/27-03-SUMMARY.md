# Phase 27.03 Summary

- Updated the episode-version segment editor to show explicit reuse-vs-upload choices for `release_asset`.
- Added candidate rendering in the panel with AniSearch/group provenance and attach actions.
- Added provenance display in the segment table so reused assets are visibly marked as library-backed.
- Live UAT confirmed:
  - upload on seed anime
  - delete preserving reusable asset
  - recreate with same AniSearch identity
  - candidate rediscovery
  - reuse attach onto the recreated anime
- Remaining follow-up:
  - investigate why migration `52` appeared applied before the tables physically existed.
