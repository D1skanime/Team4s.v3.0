# Phase 27.02 Summary

- Added repository lookup for reusable segment-library candidates via:
  - stable AniSearch provider/external ID
  - fansub group
  - segment kind
  - optional segment name
- Added attach route and handler for reusing an existing library asset without duplicating `media_assets`.
- Extended segment payloads with `library_*` provenance fields so API consumers can tell reused assets from plain uploads.
- Added reusable cleanup guard so later edits or asset removal do not blindly delete library-backed files.
