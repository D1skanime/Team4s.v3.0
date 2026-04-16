---
status: partial
phase: 16-hide-already-imported-anisearch-candidates-on-create
source:
  - 16-VERIFICATION.md
started: 2026-04-16T09:39:48.6411838+02:00
updated: 2026-04-16T09:39:48.6411838+02:00
---

## Current Test

awaiting human testing

## Tests

### 1. Mixed AniSearch search on /admin/anime/create
expected: A title search with one already-imported AniSearch ID and one new ID only shows the new draftable candidate.
result: pending

### 2. Filtered-empty AniSearch search on /admin/anime/create
expected: When AniSearch returns only already-imported hits, the create card explains they were hidden instead of showing the generic no-hits state.
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
