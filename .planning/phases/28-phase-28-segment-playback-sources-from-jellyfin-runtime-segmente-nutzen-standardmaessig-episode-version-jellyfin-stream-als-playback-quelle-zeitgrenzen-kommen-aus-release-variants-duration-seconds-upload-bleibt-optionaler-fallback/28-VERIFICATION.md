# Phase 28 Verification

Status: Planned

## Scope

- Default segment playback resolves to the current episode-version/Jellyfin stream when available.
- Runtime validation uses `release_variants.duration_seconds` when known.
- Runtime-null segment editing remains allowed.
- Uploaded segment assets remain explicit fallback behavior.

## Automated Checks

- [ ] `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npm.cmd run build`

## API / SQL Evidence To Capture

- [ ] Segment create without upload on runtime-known release variant
- [ ] Segment patch with valid timings on runtime-known release variant
- [ ] Rejected over-runtime timing save with clear validation response
- [ ] Segment create/save on runtime-null release variant
- [ ] Uploaded fallback selected explicitly and reflected in playback row
- [ ] Fallback removed or default restored without stale playback row

### Suggested SQL

```sql
SELECT
  ts.id,
  ts.source_type,
  ts.source_ref,
  ts.source_label,
  ps.source_kind,
  ps.release_variant_id,
  ps.jellyfin_item_id,
  ps.media_asset_id,
  ps.source_label AS playback_source_label,
  ps.start_offset_seconds,
  ps.end_offset_seconds,
  ps.duration_seconds
FROM theme_segments ts
LEFT JOIN theme_segment_playback_sources ps ON ps.theme_segment_id = ts.id
WHERE ts.id IN (...);
```

## Live UAT

### Scenario A: Runtime Known

- [ ] Default playback shown as episode-version/Jellyfin stream
- [ ] Save works without uploaded asset
- [ ] Over-runtime end time is clamped or rejected visibly
- [ ] Reload still shows resolved episode-version playback

### Scenario B: Runtime Null

- [ ] Save works without uploaded asset
- [ ] UI explains missing runtime honestly
- [ ] Timeline/editor stays usable

### Scenario C: Explicit Upload Fallback

- [ ] Uploaded segment asset can be selected as fallback
- [ ] Fallback persists across reload
- [ ] Default can be restored or fallback removed cleanly

## Notes

- Record exact tested release-variant IDs and segment IDs here during execution.
- Record any mismatch between `source_type` and `playback_source_kind` explicitly; that distinction is part of the Phase 28 contract.
