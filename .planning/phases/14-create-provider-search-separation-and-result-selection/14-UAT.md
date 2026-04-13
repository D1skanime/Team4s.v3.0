---
status: complete
phase: 14-create-provider-search-separation-and-result-selection
source:
  - 14-01-SUMMARY.md
  - 14-02-SUMMARY.md
  - 14-03-SUMMARY.md
started: 2026-04-13T00:00:00+02:00
updated: 2026-04-13T11:11:52+02:00
---

## Current Test

[testing complete]

## Tests

### 1. Jellyfin Uses Its Own Search Field
expected: On `/admin/anime/create`, the Jellyfin area should show its own `Jellyfin Suche` input and `Jellyfin suchen` button. Typing into the final `Titel *` field must not auto-fill or overwrite the Jellyfin query, and typing into `Jellyfin Suche` must not overwrite the final title field.
result: pass

### 2. Jellyfin Still Loads Draft Data Only After Explicit Selection
expected: Searching in Jellyfin should still show the familiar result/review flow. The draft should only update after you explicitly choose a Jellyfin result, and the page should still make clear that nothing has been saved yet.
result: pass

### 3. AniSearch Title Search Shows Candidates Before Any Draft Load
expected: In the AniSearch card, entering a title like `Bleach` and starting the title search should open a chooser with multiple candidates. Each row should show title, type, year, and AniSearch ID. The draft must not update just from opening the candidate list.
result: pass

### 4. AniSearch Candidate Selection Reuses The Existing ID Load Path
expected: After choosing one AniSearch candidate, the create draft should fill with the selected AniSearch entry, the title field should receive the resolved anime title, and the UI should still indicate that nothing is saved yet.
result: pass

### 5. AniSearch Exact ID Search Still Works As Before
expected: Entering a known AniSearch ID directly in the AniSearch ID field and clicking `AniSearch laden` should still load the draft without requiring title search first.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
