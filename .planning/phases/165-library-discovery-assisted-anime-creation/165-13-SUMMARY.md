---
phase: 165-library-discovery-assisted-anime-creation
plan: 13
subsystem: api
tags: [go, anisearch, anime-create, enrichment, duplicate-guard]

# Dependency graph
requires:
  - phase: 165-03
    provides: "ConfirmDuplicate bypass pattern on CreateAnime (admin_content_anime.go) that this plan mirrors for the Enrich() service layer"
provides:
  - "AdminAnimeAniSearchEnrichmentRequest.ForceNew bool (json:\"force_new\") bypass field"
  - "Enrich()'s duplicate early-return gated on !req.ForceNew, letting a second 'Als neuen Anime anlegen' click load the real AniSearch draft instead of re-hitting the same conflict"
affects: [165-08]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Bool bypass field on a request DTO gates an existing early-return condition without touching the rest of the function body — same shape as 165-03's ConfirmDuplicate on CreateAnime"]

key-files:
  created: []
  modified:
    - backend/internal/models/admin_content.go
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/services/anime_create_enrichment_test.go

key-decisions:
  - "Gated only the early-return condition (duplicate != nil && !req.ForceNew) — FindAnimeBySource lookup itself stays unconditional, matching the plan's interface spec exactly"

patterns-established: []

requirements-completed: [REQ-165-02]

# Metrics
duration: 6min
completed: 2026-09-21
---

# Phase 165 Plan 13: AniSearch Enrich() ForceNew Duplicate Bypass Summary

**Enrich() now accepts `force_new: true` to skip its FindAnimeBySource duplicate redirect and load the real AniSearch draft, giving 165-08's "Als neuen Anime anlegen" button a backend that actually works instead of re-surfacing the same conflict.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-21T14:19:00Z
- **Completed:** 2026-09-21T14:25:49Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `ForceNew bool` (`json:"force_new"`) to `AdminAnimeAniSearchEnrichmentRequest`
- Changed `Enrich()`'s duplicate-branch condition from `duplicate != nil` to `duplicate != nil && !req.ForceNew` — the single line the plan specified, verified via `git diff` to be the only logic change in the function
- Added 3 new service-level tests proving: (1) the default/regression path is byte-identical to before this plan, (2) `ForceNew=true` on an actual conflict bypasses the redirect and returns the real fetched+merged AniSearch draft, (3) `ForceNew=true` with no conflict is a provable no-op (identical output to `ForceNew=false`)

## Task Commits

Each task was committed atomically:

1. **Task 1: ForceNew bypass field + Enrich() gate** - `156da3e2` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/models/admin_content.go` - added `ForceNew bool` field to `AdminAnimeAniSearchEnrichmentRequest`
- `backend/internal/services/anime_create_enrichment.go` - gated the duplicate early-return on `!req.ForceNew`
- `backend/internal/services/anime_create_enrichment_test.go` - 3 new tests (`ForceNewUnsetStillReturnsRedirectForDuplicate`, `ForceNewTrueBypassesDuplicateAndLoadsRealDraft`, `ForceNewTrueIsNoOpWithoutDuplicate`)

## Decisions Made
None - followed plan as specified. The interface block in the plan specified the exact one-line diff and field placement; implementation matched it directly with no ambiguity requiring a judgment call.

## Deviations from Plan

None - plan executed exactly as written. `admin_content_anime_enrichment_create.go` (the handler) was read per `read_first` and confirmed to need zero changes, as the plan predicted — `ShouldBindJSON` already binds the new field.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 165-08 (same wave, frontend Create-Page Integration) can now send `force_new: true` on a retried enrich request and receive the real AniSearch draft instead of a repeated 409/redirect conflict.
- No blockers for downstream plans.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All modified/created files confirmed present on disk; both commits (`156da3e2` task commit, `4a5c7b5c` docs commit) confirmed in `git log`.
