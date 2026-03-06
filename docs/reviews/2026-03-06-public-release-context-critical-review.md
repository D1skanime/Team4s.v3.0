# Critical Review - Public Release Context Fix

Date: 2026-03-06
Scope: Epic 3-6 fix slice for group release navigation, episode release context, and release-scoped screenshot requests

## Findings

- medium - Public media assets remain intentionally hidden until a real release-assets API exists - `frontend/src/app/episodes/[id]/page.tsx`
  - Impact: the broken mock playback path is removed, but Epic 4/5 are still incomplete rather than fully live.
- low - `EpisodeReleaseSummary.id` still carries release identity while `episode_id` is additive, so consumers must keep the distinction explicit - `backend/internal/models/group.go`
  - Impact: future client work can regress if `id` is reinterpreted as an episode id again.

## Blockers

- none

## Merge

- approve

## Validation Evidence

- `go test ./...` in `backend` passed
- `npm run build` in `frontend` passed
- Live browser validation passed for:
  - `/anime/25/group/75/releases`
  - first release card -> `/episodes/106?releaseId=311&animeId=25&groupId=75`
  - no API failures in the repaired release-context flow
- Not executed:
  - end-to-end validation for a future real `/api/v1/releases/:releaseId/assets` contract
  - screenshot lightbox validation with non-empty production-like image data

## Residual Risk

- The release-context flow is fixed, but Epic 4/5 still depend on implementing the real release-assets contract before media assets and playback can be re-enabled in the public detail flow.
