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

## 172-07: `shared/contracts/admin-content.yaml` fails strict YAML parsing (pre-existing)

- **Found during:** Plan 172-07, Task 2, while validating the new preview-image contract
  additions with `python3 -c "import yaml; yaml.safe_load(...)"`.
- **Status:** Pre-existing syntax defect, NOT introduced by this plan. Verified via
  `git show HEAD:shared/contracts/admin-content.yaml` (the version before any 172-07 edits)
  parsed with the exact same `ParserError`, at the line that is this plan's insertion offset
  (117 lines) earlier than where the error now reports (line 1250 in the pre-172-07 version vs.
  line 1367 after this plan's insertions — same content, same bug, unrelated to new content).
- **Root cause:** One `notes:` list item begins with a quoted substring followed by more
  unquoted text on the same line (e.g. `- "uninitialized" liefert eine leere ...`), which YAML's
  block-scalar grammar disallows — a plain scalar line cannot start with `"` and then continue
  past the closing quote. This is in the `admin-release-version-contributions-replace`-adjacent
  endpoint block (`EffectiveContributionsResponse` notes), unrelated to any segment/preview-image
  content.
- **Why not fixed here:** Out of this plan's `files_modified` scope
  (`admin-content.yaml`/`openapi.yaml` touched only for the 4 new preview-image endpoints and
  `AdminThemeSegment.preview_url`/`preview_source`); fixing the unrelated pre-existing quoting
  bug is a separate, scope-boundary violation per the executor's "Only auto-fix issues DIRECTLY
  caused by the current task's changes" rule.
- **Impact on this plan:** None on correctness — the new preview-image additions (paths 4x,
  `AdminSegmentPreviewImageCandidate`/`AdminSegmentPreviewImageCandidatesResponse`/
  `AdminSegmentPreviewImageAttachRequest` types, `AdminThemeSegment.preview_url`/`preview_source`
  fields) were verified independently to be syntactically well-formed by visually matching the
  established sibling-endpoint pattern exactly; `shared/contracts/openapi.yaml` (a separate,
  strict OpenAPI/YAML file) parses cleanly end-to-end including all 4 new paths and 3 new
  schemas, confirmed via `python3 -c "import yaml; yaml.safe_load(...)"`.
- **Recommendation:** A future dedicated plan should quote the offending `notes:` line(s) in
  `admin-content.yaml` fully (wrap the entire scalar in quotes, not just the leading word) and
  add a CI/pre-commit YAML-parse check for this file so a non-OpenAPI-strict custom contract
  format doesn't silently regress into unparseable YAML again.
