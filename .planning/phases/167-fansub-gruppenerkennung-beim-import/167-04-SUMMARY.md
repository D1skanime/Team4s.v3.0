---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 04
subsystem: api
tags: [typescript, contracts, episode-import, fansub-alias, admin-content-yaml]

# Dependency graph
requires:
  - phase: 167 (Plan 05, backend, not yet executed)
    provides: Go DTO fields on EpisodeImportMappingRow that must match these TS/contract field names byte-for-byte
  - phase: 167 (Plan 03, backend, not yet executed)
    provides: PATCH /fansubs/:id/aliases/:aliasId/reassign endpoint that reassignFansubAlias calls
provides:
  - Additive EpisodeImportMappingRow TS fields (fansub_group_match_origin, fansub_group_suggestions, release_version_source) matching 167-UI-SPEC.md's data contract
  - Matching admin-content.yaml contract entries for the same three fields
  - FansubAliasReassignRequest TS type
  - reassignFansubAlias(fansubID, aliasID, payload, authToken?) API client function
affects: [167-05 (backend DTO), 167-07 (UI import wizard), 167-08 (alias management UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Display-only, never-persisted-on-apply fields on EpisodeImportMappingRow (follows existing fansub_group_name precedent)"
    - "reassignFansubAlias mirrors createFansubAlias's exact authorizedFetch/withAuthHeader/ApiError/parseApiError idiom"

key-files:
  created: []
  modified:
    - frontend/src/types/episodeImport.ts
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - shared/contracts/admin-content.yaml

key-decisions:
  - "Conflict state (fansub_alias_conflict from UI-SPEC) intentionally NOT added as a contract field — derived client-side in Plan 07 by comparing fansub_group_match_origin.group_id against the admin's current selection, per Plan 05's explicit note that no server-side conflict field is needed."
  - "fansub_group_match_origin carries group_id (not just group_name) so Plan 07 can detect conflicts by ID comparison, and an optional alias_id (present only when matched_via==='alias') so Plan 07/08 can call reassignFansubAlias without a second lookup."

requirements-completed: [REQ-167-08, REQ-167-09, REQ-167-11, REQ-167-12, REQ-167-15, REQ-167-16, REQ-167-18]

# Metrics
duration: 9min
completed: 2026-09-23
---

# Phase 167 Plan 04: Frontend Episode-Import/Fansub-Alias Contract Summary

**Additive EpisodeImportMappingRow TS/contract fields (match origin, suggestions, version source) and a typed reassignFansubAlias API client function, ahead of the backend and UI plans that consume them.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-23T14:26:00Z
- **Completed:** 2026-09-23T14:34:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `EpisodeImportMappingRow` gained three additive, optional, display-only fields (`fansub_group_match_origin`, `fansub_group_suggestions`, `release_version_source`) matching the UI-SPEC's data contract exactly
- `shared/contracts/admin-content.yaml` synced with the same three keys immediately after the existing `release_version` entry
- `reassignFansubAlias` API client function added, calling `PATCH /api/v1/fansubs/:id/aliases/:aliasId/reassign`, mirroring `createFansubAlias`'s exact idiom (authorizedFetch, withAuthHeader, ApiError, parseApiError)
- `FansubAliasReassignRequest { target_fansub_group_id: number }` type added next to `FansubAliasCreateRequest`

## Task Commits

Each task was committed atomically:

1. **Task 1: EpisodeImportMappingRow additive fields + contract sync** - `e92cb2ac` (feat)
2. **Task 2: reassignFansubAlias API client function + type** - `bc9316e6` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified
- `frontend/src/types/episodeImport.ts` - Added `fansub_group_match_origin`, `fansub_group_suggestions`, `release_version_source` to `EpisodeImportMappingRow`
- `shared/contracts/admin-content.yaml` - Added matching three keys to the `EpisodeImportMappingRow:` schema block
- `frontend/src/types/fansub.ts` - Added `FansubAliasReassignRequest` interface
- `frontend/src/lib/api.ts` - Added `reassignFansubAlias` export and its type import

## Decisions Made
- Followed the plan's `<interfaces>` section over the UI-SPEC's slightly looser table where they diverged (the plan's `group_id`/`alias_id`-bearing `fansub_group_match_origin` shape and the deliberate omission of a `fansub_alias_conflict` field are the plan's explicit, more specific instructions, reconciling the UI-SPEC's earlier draft with Plan 05's backend decision).
- No headless-mode gate/decision points were encountered — plan was unambiguous and fully specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 (backend) can now implement the matching Go DTO fields with an exact byte-for-byte field-name reference already in place.
- Plan 07 (import wizard UI) and Plan 08 (alias management UI) can build against `fansub_group_match_origin`, `fansub_group_suggestions`, `release_version_source`, and `reassignFansubAlias` immediately without waiting on backend implementation timing.
- No blockers. `npx tsc --noEmit` and `npx vitest run src/lib/api.test.ts` both pass inside the frontend container after these changes.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 4 modified/touched files and both task commit hashes (`e92cb2ac`, `bc9316e6`) verified present.
