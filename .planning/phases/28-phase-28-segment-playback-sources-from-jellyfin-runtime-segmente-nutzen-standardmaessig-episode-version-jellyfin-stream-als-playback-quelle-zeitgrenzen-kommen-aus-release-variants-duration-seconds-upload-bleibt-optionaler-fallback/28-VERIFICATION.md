# Phase 28 Verification

Status: Task 1 Complete (automated checks passed) — UAT pending

## Scope

- Default segment playback resolves to the current episode-version/Jellyfin stream when available.
- Runtime validation uses `release_variants.duration_seconds` when known.
- Runtime-null segment editing remains allowed.
- Uploaded segment assets remain explicit fallback behavior.

## Automated Checks

### Backend Tests

Command:
```
cd backend && go test ./internal/repository/... ./internal/handlers/... -count=1 -timeout 60s
```

Result:
```
ok  team4s.v3/backend/internal/repository  0.669s
ok  team4s.v3/backend/internal/handlers    0.358s
```

Status: PASSED

Note: `TestEpisodeImportApply_UsesReleaseNativeTablesOnly` was failing because the test
only scanned `episode_import_repository_release_helpers.go` for `INSERT INTO release_streams`,
but that SQL was refactored into `release_stream_repository_helpers.go` in Phase 26.
Fixed: added `release_stream_repository_helpers.go` to the scanned source set.
(Deviation Rule 1 — pre-existing bug from Phase 26 refactoring)

### Frontend Type Check

Command:
```
cd frontend && npx tsc --noEmit
```

Result: TypeScript errors exist only in `*.test.ts` / `*.test.tsx` files (stale test fixtures
from previous phases — missing `source`, `folderName`, `draft`, `hasMore`, `already_imported`
properties in test mock objects). Zero errors in production source files.

Phase-28-specific files checked (no errors):
- `src/components/admin/segments/SegmentEditPanel.tsx` — no TS errors
- `src/hooks/useReleaseSegments.ts` — no TS errors
- `src/types/adminAnime.ts` — no TS errors

Status: PASSED (production code clean; test-fixture errors are pre-existing / out of scope)

### Frontend Build

Not run in CI context (Docker Compose provides the built container). tsc --noEmit covers
type correctness for production code.

## SQL Evidence

### Table Schema

`theme_segment_playback_sources` confirmed present with correct columns:

| Column | Type | Notes |
|---|---|---|
| `source_kind` | varchar(32) | CHECK IN ('episode_version', 'jellyfin_theme', 'uploaded_asset') |
| `release_variant_id` | bigint | FK → release_variants, used for episode_version path |
| `jellyfin_item_id` | text | resolved at snapshot time |
| `media_asset_id` | bigint | FK → media_assets, used for uploaded_asset fallback |
| `duration_seconds` | integer | from release_variants at snapshot time |
| `start_offset_seconds` | integer | segment start in seconds |
| `end_offset_seconds` | integer | segment end in seconds |

### Current State of theme_segment_playback_sources

Command:
```sql
SELECT
  ts.id AS segment_id,
  ts.source_type,
  ts.start_time,
  ts.end_time,
  tsps.source_kind AS playback_source_kind,
  tsps.release_variant_id AS playback_release_variant_id,
  tsps.jellyfin_item_id AS playback_jellyfin_item_id,
  tsps.duration_seconds AS playback_duration_seconds,
  tsps.start_offset_seconds,
  tsps.end_offset_seconds
FROM theme_segments ts
LEFT JOIN theme_segment_playback_sources tsps ON tsps.theme_segment_id = ts.id
LIMIT 20;
```

Result (before UAT):
```
 segment_id | source_type    | start_time | end_time | playback_source_kind | playback_release_variant_id | playback_jellyfin_item_id | playback_duration_seconds | start_offset_seconds | end_offset_seconds
 5          |                |            |          |                      |                             |                           |                           |                      |
 3          | release_asset  |            |          |                      |                             |                           |                           |                      |
 10         | release_asset  | 00:00:00   | 00:01:20 |                      |                             |                           |                           |                      |
 11         | jellyfin_theme | 00:23:40   | 00:24:55 |                      |                             |                           |                           |                      |
(4 rows)
```

`theme_segment_playback_sources` currently has 0 rows — all existing segments predate
Phase 28 and have no playback row yet. The UAT will create the first `episode_version`
playback rows via the new default path.

### Runtime-Known Release Variant (for UAT Scenario A)

```sql
SELECT rv.id as variant_id, rv.duration_seconds, rs.jellyfin_item_id
FROM release_variants rv
LEFT JOIN release_streams rs ON rs.variant_id = rv.id
WHERE rv.duration_seconds IS NOT NULL
LIMIT 5;
```

Result:
```
 variant_id | duration_seconds | jellyfin_item_id
 89         | 1529             | 784bcddf47e35fb4d0ba911903002f17
```

Variant 89 has `duration_seconds = 1529` (25m 29s) and a Jellyfin item ID.
This is the runtime-known variant to use for UAT Scenario A (over-runtime validation).

### Runtime-Null Release Variants (for UAT Scenario B)

```sql
SELECT id, duration_seconds, filename FROM release_variants WHERE duration_seconds IS NULL LIMIT 5;
```

Any variant with `duration_seconds IS NULL` can be used for UAT Scenario B.

## API / SQL Evidence To Capture

- [ ] Segment create without upload on runtime-known release variant → `playback_source_kind = 'episode_version'`
- [ ] Segment patch with valid timings on runtime-known release variant
- [ ] Rejected over-runtime timing save with clear validation response
- [ ] Segment create/save on runtime-null release variant
- [ ] Uploaded fallback selected explicitly and reflected in playback row (`source_kind = 'uploaded_asset'`)
- [ ] Fallback removed or default restored without stale playback row

## Live UAT

### Scenario A: Runtime Known (variant_id=89, duration=1529s / 25:29)

- [ ] Default playback shown as "Episode-Version / Jellyfin-Stream (Standard)"
- [ ] Save works without uploaded asset
- [ ] Over-runtime end time (>25:29) is clamped or rejected visibly
- [ ] Reload still shows resolved episode-version playback
- [ ] SQL confirms `source_kind = 'episode_version'` and `playback_release_variant_id = 89`

### Scenario B: Runtime Null

- [ ] Save works without uploaded asset
- [ ] UI explains missing runtime honestly
- [ ] Timeline/editor stays usable

### Scenario C: Explicit Upload Fallback

- [ ] Uploaded segment asset can be selected as fallback
- [ ] Fallback persists across reload
- [ ] Default can be restored or fallback removed cleanly
- [ ] SQL confirms `source_kind = 'uploaded_asset'` for explicit fallback

## Post-UAT SQL Check Template

After UAT run this to confirm resolved playback rows:

```sql
SELECT
  ts.id AS segment_id,
  ts.source_type,
  ts.start_time,
  ts.end_time,
  tsps.source_kind AS playback_source_kind,
  tsps.release_variant_id AS playback_release_variant_id,
  tsps.jellyfin_item_id AS playback_jellyfin_item_id,
  tsps.duration_seconds AS playback_duration_seconds,
  tsps.start_offset_seconds,
  tsps.end_offset_seconds
FROM theme_segments ts
LEFT JOIN theme_segment_playback_sources tsps ON tsps.theme_segment_id = ts.id
ORDER BY ts.id DESC
LIMIT 10;
```

## Notes

- `theme_segment_playback_sources.source_kind` uses the values `episode_version`, `jellyfin_theme`, `uploaded_asset` — NOT `playback_source_kind` as a column name (the column is `source_kind`).
- The plan's suggested SQL used legacy column names from early design; actual schema uses `source_kind`, `release_variant_id`, `jellyfin_item_id`, `duration_seconds` without `playback_` prefix.
- All 4 existing `theme_segments` rows lack playback rows; they were created before Phase 28 landed.
- Record exact tested segment IDs and variant IDs here during UAT execution.
