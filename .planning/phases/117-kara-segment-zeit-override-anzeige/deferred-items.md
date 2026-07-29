# Deferred Items — Phase 117

## Plan 117-04

- **`backend/internal/handlers/admin_content_anime_theme_segments.go` exceeds the 450-line
  CLAUDE.md guideline (905 lines after this plan; was already 858 lines before this plan
  started).** This is pre-existing debt (the file already violated the limit before Plan 117-04
  touched it) that this plan modestly grew (+47 lines) via necessary, targeted changes (fan-out
  call-sites, `release_variant_id`/`currentReleaseVersionID` reordering across five CRUD/asset
  handlers). Splitting this file further (e.g. separating the segment-asset-upload handlers from
  the segment-CRUD handlers into their own file, following the existing
  `segment_stream.go`/`segment_render_worker.go`/`segment_render_refresh.go`/
  `segment_render_fanout.go` split convention already used for the render-cache side) is
  out of scope for Plan 117-04 (SCOPE BOUNDARY rule — only auto-fix issues directly caused by
  the current task) and risks unrelated churn across five handler functions this plan already
  touched for a different reason. Recommended as a follow-up quick task or as part of a future
  Phase-117 plan that already touches this file (e.g. Plan 117-05/117-07).
