---
status: partial
phase: 02-manual-intake-baseline
source: [02-VERIFICATION.md]
started: 2026-03-24T16:36:00Z
updated: 2026-03-24T16:36:00Z
---

## Current Test

awaiting human testing

## Tests

### 1. Browser smoke for intake entry and manual create flow
expected: `/admin/anime` shows `Neu manuell`; `/admin/anime/create` starts with `Noch kein manueller Entwurf`; CTA stays disabled until title and cover exist; successful create redirects to `/admin/anime/{id}/edit`.
result: pending

### 2. Live edit-cover replacement after create handoff
expected: After create redirect, replacing the cover on the edit page still uses the persisted edit-cover flow successfully.
result: pending

### 3. Backend handler package verification after external compile blocker is fixed
expected: `cd backend && go test ./internal/handlers ./internal/repository` completes successfully once the unrelated `anime_metadata_backfill.go` issue is resolved.
result: pending

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
