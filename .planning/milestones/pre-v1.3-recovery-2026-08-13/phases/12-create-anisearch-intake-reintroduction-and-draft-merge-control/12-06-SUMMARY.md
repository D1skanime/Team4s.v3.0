---
phase: 12-create-anisearch-intake-reintroduction-and-draft-merge-control
plan: "06"
subsystem: frontend + backend
tags: [gap-closure, anisearch, create-flow, redirect, 409-conflict, graph-relations]
requires:
  - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  - frontend/src/lib/api/admin-anime-intake.ts
  - backend/internal/services/anisearch_client.go
provides:
  - Create success redirect fires correctly (no useEffect cleanup cancellation)
  - 409 Conflict parsed as redirect payload instead of ApiError
  - Incoming Sequel graph edges mapped to Hauptgeschichte
affects:
  - frontend/src/app/admin/anime/create/page.test.tsx
  - frontend/src/lib/api.admin-anime.test.ts
  - backend/internal/services/anime_create_enrichment_test.go
tech-stack:
  added: []
  patterns: [tdd-red-green, optional-field-contract, http-status-branching, go-switch-case]
key-files:
  created: []
  modified:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/lib/api.admin-anime.test.ts
    - backend/internal/services/anisearch_client.go
    - backend/internal/services/anime_create_enrichment_test.go
key-decisions:
  - decision: "Remove resetStagedCover/resetStagedAssets from handleCreateSubmit success path rather than restructuring the useEffect cleanup"
    rationale: "The component unmounts on navigation and the existing unmount cleanup revokes object URLs correctly — the two resets in the success path were the sole cause of the useEffect dep-change that cleared the redirect timeout"
  - decision: "Insert 409 branch before generic !response.ok check in loadAdminAnimeCreateAniSearchDraft"
    rationale: "Edit-route already uses the same pattern at api.ts:1281; symmetry and minimal diff"
  - decision: "Map incoming 'Sequel' to 'Hauptgeschichte' (not 'Fortsetzung')"
    rationale: "From the perspective of the anime being loaded (e.g. 6123), the parent that lists it as a Sequel is the Hauptgeschichte of the current entry"
requirements-completed: [ENR-02, ENR-03]
duration: "10 min"
completed: "2026-04-10"
---

# Phase 12 Plan 06: UAT Bug-Fix Summary

Closed three UAT-diagnosed bugs in the Phase 12 create-route AniSearch flow.

**Duration:** ~10 min | **Start:** 2026-04-10T18:20:00Z | **End:** 2026-04-10T18:30:00Z | **Tasks:** 3 | **Files:** 6

## What Was Built

Live UAT with AniSearch IDs 5468 and 6123 revealed three bugs. All three fixed by targeted, regression-covered changes.

### Task 1: Redirect timeout no longer cancelled after create

**Root cause:** `resetStagedCover()` and `resetStagedAssets()` in `handleCreateSubmit` success path created a new object reference for `stagedAssets`, changing the `[stagedAssets, stagedCover]` deps of the cleanup useEffect. That triggered `window.clearTimeout(createRedirectTimeoutRef.current)` before the 1.5 s timeout fired.

**Fix:** Removed the two reset calls from the success path. The component unmounts on navigation, and the existing unmount cleanup revokes object URLs at that point.

**Regression:** Added `buildManualCreateRedirectPath(19)` test in `page.test.tsx` documenting the redirect target.

### Task 2: 409 Conflict parsed as redirect payload

**Root cause:** `loadAdminAnimeCreateAniSearchDraft` threw `ApiError` for all `!response.ok` responses, including 409. The backend correctly returns 409 with `{"data": {"mode": "redirect", ...}}` when the AniSearch ID already exists.

**Fix:** Added `if (response.status === 409) { return response.json()... }` before the generic error throw.

**Regressions:** Two new tests in `api.admin-anime.test.ts` — one asserting 409 resolves with the redirect payload, one asserting 500 still throws ApiError.

### Task 3: Incoming Sequel graph edges map to Hauptgeschichte

**Root cause:** `mapAniSearchGraphRelation` incoming branch had no case for `"Sequel"`, so it fell through to `default: return ""` and the relation was dropped silently. When 11eyes has a "Sequel" edge pointing to 6123, parsing from 6123's perspective (outgoing=false) returned `""` for the label.

**Fix:** Added `case "Sequel": return "Hauptgeschichte"` to the incoming switch in `anisearch_client.go`.

**Regressions:** Two tests in `anime_create_enrichment_test.go` — one proving incoming Sequel → Hauptgeschichte, one confirming outgoing Sequel remains Fortsetzung.

## Task Commits

- `8dfd223` — fix(12-06): close three UAT-diagnosed create-route AniSearch bugs

## Deviations from Plan

None — all three fixes were exactly as specified in the plan interfaces/action sections.

## Issues Encountered

None. Tests went RED → GREEN as expected for all three tasks.

## Next

Re-run UAT:
1. AniSearch save flow (ID 19 or similar) — verify redirect fires after create
2. Duplicate AniSearch redirect (ID 5468 = 11eyes, already in DB) — verify redirect to `/admin/anime/{id}/edit` instead of 409 error toast
3. AniSearch 6123 relation matching — verify 11eyes appears as Hauptgeschichte relation

## Self-Check: PASSED

- [x] `useAdminAnimeCreateController.ts` no longer contains `resetStagedCover()` or `resetStagedAssets()` in the success path
- [x] `admin-anime-intake.ts` contains `response.status === 409` branch before the error throw
- [x] `anisearch_client.go` incoming switch contains `case "Sequel": return "Hauptgeschichte"`
- [x] `page.test.tsx` 32 tests green
- [x] `api.admin-anime.test.ts` 17 tests green (2 new)
- [x] `anime_create_enrichment_test.go` — backend services all pass (2 new tests green)
- [x] Commit present: 8dfd223
