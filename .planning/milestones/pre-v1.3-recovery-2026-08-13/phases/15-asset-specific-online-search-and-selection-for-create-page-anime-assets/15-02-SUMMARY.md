---
phase: 15-asset-specific-online-search-and-selection-for-create-page-anime-assets
plan: 02
subsystem: backend
tags: [go, zerochan, crawler, asset-search, request-discipline]
provides:
  - "Backend asset-search orchestrator with slot-aware source ordering"
  - "Initial Zerochan adapter for cover and background candidate discovery"
  - "Request-disciplined candidate-only search without eager detail fan-out"
affects: [admin-api, backend-services, external-sources]
key-files:
  created: []
  modified:
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/services/anime_create_enrichment_test.go
    - backend/internal/handlers/admin_content_handler.go
    - .planning/phases/15-asset-specific-online-search-and-selection-for-create-page-anime-assets/15-RESEARCH.md
requirements-completed: [phase-15-backend-discovery]
completed: 2026-04-13
---

# Phase 15 Plan 02 Summary

Added the first real provider path behind the new seam and kept it disciplined: search returns candidates only, while actual adoption still happens later through the existing upload lifecycle.

## Accomplishments
- Added `AnimeAssetSearchService` with slot-aware source ordering for cover, banner, logo, and background.
- Implemented a Zerochan provider for cover/background candidate discovery using thumbnail-first search results.
- Filtered Zerochan results by aspect intent so cover and background searches do not dump the same mixed list back to the operator.

## Verification
- `cd backend && go test ./internal/services ./internal/handlers`
