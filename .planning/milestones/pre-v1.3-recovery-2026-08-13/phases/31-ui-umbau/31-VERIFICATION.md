---
status: passed
phase: 31-ui-umbau
verified: 2026-04-30
---

# Phase 31 Verification

## Automated Checks

Passed:

- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm.cmd run build`
- `cd backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1`
- `docker compose build team4sv30-frontend`
- `docker compose up -d team4sv30-frontend`
- `curl.exe -I --max-time 20 http://127.0.0.1:3002/admin/fansubs/17/edit` returned `HTTP/1.1 200 OK`

## Must-Have Coverage

- P31-SC1: Implemented. `Anime & Releases` is a top-level tab and no visible `Releases neu laden` button was added.
- P31-SC2: Implemented. Release rows have inline expand/collapse state.
- P31-SC3: Implemented. Expanded releases show Theme-/Segment-Karten with `Global gesetzt`, `Release-spezifisch`, and `Fehlt noch`.
- P31-SC4: Partially implemented. Segment clicks open a release-specific editor surface; direct release-id upload is documented as next backend slice.
- P31-SC5: Implemented as guardrail. Generic `release_media` remains separated from Theme-/Segment assets.

## Human Verification Required

1. Open `http://127.0.0.1:3002/admin/fansubs/17/edit`.
2. Click tab `Anime & Releases`.
3. Confirm `11eyes` and `11eyes: Pink Phantasmagoria` are visible.
4. Expand `Release #92`.
5. Confirm Theme-/Segment cards render.
6. Click one card and confirm `Segment bearbeiten` appears.

## Residual Risk

The direct upload action for a selected release segment is not yet wired for arbitrary concrete `release_id`; the existing upload flow still resolves a canonical release from Fansub+Anime. This should become the next narrow backend/frontend slice before claiming full write capability for non-canonical releases.
