# Phase 172 - Deferred Items

## 172-02: `release_detail_public_repository_helpers.go` exceeds the 450-line modularity limit (pre-existing)

- **Found during:** Plan 172-02, Task 1.
- **Status:** Pre-existing violation, NOT introduced by this plan. The file was already at 558
  lines before Plan 172-02 touched it (verified via `git show HEAD~1` at the start of this
  plan, prior to any edits). This plan's net change is +16 lines (moved the bulk of the new
  preview-resolution glue into `theme_segment_preview.go`'s new `applyThemeSegmentPreviewURLs`
  to minimize growth), bringing the file to 574 lines.
- **Why not fixed here:** Splitting this file is a structural refactor affecting many existing
  functions (`loadReleaseGroups`, `loadReleaseTechnical`, `countImagesByCategory`,
  `loadReleaseSegments`, `applyAppliesThroughEpisode`, `loadAdjacentReleases`,
  `loadContributors`, `loadImages`, `countImages`, `imagesQuery`, `loadNotes`, `countNotes`,
  `loadPublicReleaseStory`) that are out of this plan's scope (`files_modified` in the
  172-02-PLAN.md frontmatter names only this file and its test file, for the single, narrow
  purpose of swapping `loadReleaseSegments`' preview-resolution source). Per the scope-boundary
  rule ("Only auto-fix issues DIRECTLY caused by the current task's changes"), this is logged,
  not fixed.
- **Recommendation:** A future dedicated plan should split
  `release_detail_public_repository_helpers.go` by concern (e.g., segments/credits into their
  own file, images/notes into another), following the same pattern already used for
  `release_detail_public_repository_segment_credits.go`.
