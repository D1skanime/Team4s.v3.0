---
phase: 20-release-native-episode-import-schema
plan: 02
subsystem: backend
tags: [go, postgres, episode-import, release-graph, anisearch, jellyfin]
requires:
  - phase: 20.1-db-schema-v2-physical-cutover
    provides: release-native tables, filler metadata columns, release_variant_episodes, and legacy episode-version table removal
  - phase: 20-release-native-episode-import-schema
    provides: plan 01 schema verification and release-native contract alignment
provides:
  - Release-native episode import apply writes for canonical episodes, titles, filler metadata, streams, variants, groups, and coverage joins
  - AniSearch preview DTO metadata for multilingual episode titles and filler fields
  - Backend tests guarding multi-release, combined-file coverage, idempotent media identity, and legacy table avoidance
affects: [episode-import, release-graph, admin-content, anisearch-preview, jellyfin-apply]
tech-stack:
  added: []
  patterns:
    - Idempotent Jellyfin apply keyed by stream_sources provider/external_id
    - German > English > Japanese > generated episode display fallback
    - Release graph helpers split from transaction orchestration to keep repository files under 450 lines
key-files:
  created:
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/services/anisearch_episode_import.go
    - backend/internal/services/anisearch_episode_import_test.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/repository/episode_import_repository.go
    - backend/internal/repository/episode_import_repository_test.go
key-decisions:
  - "Episode import apply locates existing Jellyfin-backed release variants through `stream_sources(provider_type='jellyfin', external_id=media_item_id)` so repeated apply updates coverage instead of duplicating releases."
  - "Canonical episode display cache follows German, English, Japanese, then generated `Episode N`, while all parsed language titles are persisted through `episode_titles`."
  - "Fansub group joins are created from explicit apply overrides when present, otherwise conservatively derived from bracketed file/path evidence."
patterns-established:
  - "Release-native import apply should write `release_streams` and `release_variant_episodes`; legacy `episode_versions` tables remain forbidden."
  - "Preview/apply DTOs may carry optional operator release hints without requiring every file to have a group match."
requirements-completed: [P20-SC2, P20-SC3, P20-SC4, P20-SC5]
duration: 8min 38sec
completed: 2026-04-21
---

# Phase 20 Plan 02: Release-Native Episode Import Apply Summary

**Episode import apply now persists AniSearch canonical metadata and Jellyfin media mappings into the release-native graph without recreating legacy episode-version tables**

## Performance

- **Duration:** 8min 38sec
- **Started:** 2026-04-21T14:35:06Z
- **Completed:** 2026-04-21T14:43:44Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Extended AniSearch episode parsing and admin preview/apply DTOs with multilingual `titles_by_language`, filler type/source/note fields, and German > English > Japanese display fallback.
- Replaced the Phase 20 deferred apply stub with a transaction that upserts canonical `episodes`, `episode_titles`, `release_sources`, `fansub_releases`, `release_versions`, `release_variants`, `stream_sources`, `release_streams`, `release_version_groups`, and `release_variant_episodes`.
- Made repeated apply idempotent for the same Jellyfin media item by resolving existing variants through `stream_sources.external_id` before creating release rows.
- Added tests for multilingual/filler parsing, title fallback, multiple releases for one episode, one file covering 9 and 10, duplicate media rejection, and release-native table coverage.

## Task Commits

1. **Task 1: Parse and carry multilingual titles plus filler fields** - `1a19432` (`feat`)
2. **Task 2: Persist canonical episode records and titles** - `3680be1` (`feat`)
3. **Task 3: Persist release-native media graph** - `82b4820` (`test`)

## Files Created/Modified

- `backend/internal/models/episode_import.go` - Adds title-language, filler, release version, and optional fansub-group apply fields.
- `backend/internal/services/anisearch_episode_import.go` - Parses multilingual episode title cells and filler/canon metadata.
- `backend/internal/services/anisearch_episode_import_test.go` - Covers multilingual title and filler parsing.
- `backend/internal/handlers/admin_episode_import.go` - Carries AniSearch episode metadata into preview payloads.
- `backend/internal/repository/episode_import_repository.go` - Routes apply to the release-native transaction.
- `backend/internal/repository/episode_import_repository_apply.go` - Owns transaction orchestration, episode upserts, title persistence, and lookup setup.
- `backend/internal/repository/episode_import_repository_release_helpers.go` - Owns release/source/version/variant/stream/group/coverage helper writes.
- `backend/internal/repository/episode_import_repository_test.go` - Guards fallback behavior, combined coverage, parallel releases, duplicate media rejection, and no legacy table references.

## Query Examples

Canonical episode and multilingual titles:

```sql
SELECT e.id, e.episode_number, e.title, eft.name AS filler_type, e.filler_source, e.filler_note,
       l.code, et.title AS localized_title
FROM episodes e
LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id
LEFT JOIN episode_titles et ON et.episode_id = e.id
LEFT JOIN languages l ON l.id = et.language_id
WHERE e.anime_id = $1
ORDER BY e.number, l.code;
```

Release, variant, stream, and combined-file coverage rows:

```sql
SELECT fr.id AS release_id, rev.id AS version_id, rv.id AS variant_id,
       rv.filename, ss.provider_type, ss.external_id AS jellyfin_item_id,
       ARRAY_AGG(e.episode_number ORDER BY rve.position) AS covered_episodes
FROM release_variants rv
JOIN release_versions rev ON rev.id = rv.release_version_id
JOIN fansub_releases fr ON fr.id = rev.release_id
JOIN release_variant_episodes rve ON rve.release_variant_id = rv.id
JOIN episodes e ON e.id = rve.episode_id
JOIN release_streams rs ON rs.variant_id = rv.id
JOIN stream_sources ss ON ss.id = rs.stream_source_id
WHERE e.anime_id = $1
GROUP BY fr.id, rev.id, rv.id, rv.filename, ss.provider_type, ss.external_id
ORDER BY MIN(e.number), rv.id;
```

Release version group joins derived from file evidence or explicit apply overrides:

```sql
SELECT rev.id AS version_id, fg.id AS group_id, fg.name
FROM release_versions rev
JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
WHERE rev.id = $1
ORDER BY fg.name;
```

## Decisions Made

- Idempotency is keyed by Jellyfin media identity in `stream_sources` rather than filename, because filenames can be edited while Jellyfin item IDs remain the stable imported media identity.
- `episodes.title` remains a compatibility display cache, but `episode_titles` is the normalized multilingual storage target.
- Missing group evidence does not block import; `release_version_groups` is written when an override or bracketed file/path group can be resolved.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The new repository implementation initially exceeded the project 450-line file guardrail. It was split into transaction orchestration and release-helper files before committing.
- PowerShell `Get-Date -AsUTC` was unavailable in this environment, so timing used `(Get-Date).ToUniversalTime()` instead.

## Known Stubs

None found in files created or modified by this plan. The only legacy `episode_versions` string in touched files is a regression-test assertion that apply code must not reference legacy tables.

## Verification

Commands run:

```powershell
cd backend
go test ./internal/services ./internal/handlers ./internal/repository -count=1
go test ./internal/... -count=1
```

Results:

- Focused services/handlers/repository tests passed.
- Full backend `./internal/...` tests passed.
- Source scan of touched files found no production references to `episode_versions` or `episode_version_episodes`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can query release-native imports directly through `episodes`, `episode_titles`, `release_variants`, `release_streams`, and `release_variant_episodes`. The backend no longer returns the Phase 20 deferred apply error for confirmed episode import mappings.

## Self-Check: PASSED

- Verified created/modified files exist.
- Verified task commits exist: `1a19432`, `3680be1`, `82b4820`.

---
*Phase: 20-release-native-episode-import-schema*
*Completed: 2026-04-21*
