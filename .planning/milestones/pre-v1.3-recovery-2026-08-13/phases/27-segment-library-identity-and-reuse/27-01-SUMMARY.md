# Phase 27.01 Summary

- Added additive schema for `segment_library_definitions`, `segment_library_assets`, and `segment_library_assignments`.
- Documented the three-layer model in `docs/architecture/db-schema-v2.md`:
  - definition
  - asset
  - assignment
- Added delete-side preservation logic so reusable segment assets can survive anime deletion.
- Added reusable-cleanup protection so library-backed files are not treated like ordinary orphaned anime media.

## Note

- Live verification later exposed that migration `0052` was recorded as applied but the tables were missing in the running DB until the SQL was applied directly. The schema itself is correct; runtime migration bookkeeping needs separate follow-up.
