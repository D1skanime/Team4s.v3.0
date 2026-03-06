# Critical Review - Release Assets Contract

Date: 2026-03-06
Scope: Public release-assets contract, episode-detail integration, and release-feed hardening

## Findings

- medium - `GET /api/v1/releases/:id/assets` is live but still returns an empty list for existing releases because no persisted release-asset data exists yet - `backend/internal/handlers/release_assets_handler.go:26`
  - Impact: the public episode route is contract-stable, but EPIC 4/5 remain visually empty until asset persistence/admin curation lands.
- low - Group release counters now surface real screenshot counts, but OP/ED/Karaoke counters remain placeholder false/zero values until release-asset storage exists - `backend/internal/repository/group_repository.go:188`
  - Impact: releases feed metadata is partially real and can still be misread as complete EPIC 3 asset coverage.

## Blockers

- none

## Merge

- approve

## Validation Evidence

- `go test ./...` in `backend` passed
- `npm run test -- groupNavigation mediaUploadCropMath commentSectionState themeVideoAudio` in `frontend` passed
- `npm run build` in `frontend` passed
- `docker compose up -d --build team4sv30-backend` passed
- live API validation passed:
  - `GET /api/v1/releases/311/assets` -> `200` with `{"data":{"release_id":311,"assets":[]}}`
  - `GET /api/v1/anime/25/group/75/releases` -> `200` with canonical `episode_id` values
- live route validation passed:
  - `http://localhost:3002/episodes/106?releaseId=311&animeId=25&groupId=75`
  - back-link resolves to `/anime/25/group/75/releases`

## Residual Risk

- The route and contract are now stable, but non-empty asset playback still depends on implementing persisted release-asset data and a write path for that data.
