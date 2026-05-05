---
status: testing
phase: 29-fansub-group-model-normalization-and-generic-links
source: 29-01-SUMMARY.md, 29-02-SUMMARY.md, 29-03-SUMMARY.md
started: 2026-04-29T17:17:56.5342766+02:00
updated: 2026-04-29T17:17:56.5342766+02:00
---

## Current Test

number: 1
name: Create Fansub With Generic Community Links
expected: |
  Open `/admin/fansubs/create`, fill a new fansub, add at least one non-legacy link type such as `twitter` or `github`, save, and land on a successful create result. After opening the new edit page, the generic link rows should still be present with the same `link_type`, optional name, and URL values instead of being collapsed into only Website/Discord/IRC fields.
awaiting: user response

## Tests

### 1. Create Fansub With Generic Community Links
expected: Open `/admin/fansubs/create`, fill a new fansub, add at least one non-legacy link type such as `twitter` or `github`, save, and land on a successful create result. After opening the new edit page, the generic link rows should still be present with the same `link_type`, optional name, and URL values instead of being collapsed into only Website/Discord/IRC fields.
result: [pending]

### 2. Edit And Reload Generic Community Links
expected: On `/admin/fansubs/:id/edit`, add, change, and remove generic link rows across multiple types (`website`, `discord`, `twitter`, `github`, `irc`), save, reload the page, and see the exact row set come back. Preview/open actions should only work for valid absolute URLs, and invalid URLs should be blocked before save.
result: [pending]

### 3. Manage Collaboration Members Explicitly
expected: Open one persisted collaboration fansub on `/admin/fansubs/:id/edit`, add one real member group from the dedicated collaboration section, save or reload as needed, and see that member listed. Removing the same member should update the list cleanly without editing the ordinary profile fields.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

