# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 07 verified and approved in human UAT
- **Rough completion:** 2 of 3 v1.1 phases verified

## What Works Now
- Docker stack is usable for local browser testing.
- Backend health responds on `http://localhost:8092/health`.
- Frontend is live on `http://localhost:3002`.
- Anime create can stage and link `cover`, `banner`, `logo`, `background`, and `background_video` through the shared V2 seam.
- Anime edit exposes manual asset controls for `banner`, `logo`, `background`, and `background_video` in the asset provenance cards.
- Cover management now lives directly in the cover provenance card instead of a separate management block.
- Backgrounds render as a multi-image gallery with separate provider and active sections.
- Full anime delete removes anime-owned linked media rows plus `media/anime/{id}`.

## What Is Not Done Yet
- Phase 08 is not planned yet.
- Broader follow-up work is now about Phase-08 planning and targeted refinement, not Phase-07 generic upload/linking gaps.
- Any further UI polish still needs to stay separate from lifecycle-critical seam work.

## Valid Commands
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd backend && go test ./cmd/server -count=1`
- `cd frontend && npm test -- src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- `cd frontend && npm run build`

## Verification Evidence
- Real browser UAT passed for Phase 06 and is recorded in `.planning/phases/06-provisioning-and-lifecycle-foundations/06-UAT.md`
- Real browser UAT passed for Phase 07 and is recorded in `.planning/phases/07-generic-upload-and-linking/07-HUMAN-UAT.md`
- Manual checks covered:
  - edit-route upload and visibility for `banner`, `logo`, `background`, and `background_video`
  - create-route staging plus post-create linking for non-cover assets
  - delete cleanup for uploaded manual anime assets
  - integrated cover-card management and updated asset provenance presentation

## Top 3 Next
1. Decide and plan Phase 08 based on the next highest-value anime/admin workflow gap.
2. Keep UI polish follow-ups separate from lifecycle-critical work so the verified seam stays stable.
3. Use the verified Phase-06/07 seam as the regression baseline for any further asset-lifecycle work.

## Risks / Blockers
- The worktree is still broadly dirty across planning, backend, frontend, and generated local artifacts.
- Cross-AI review is still unavailable because no independent reviewer CLI is installed locally.
- The next planning step is now ambiguous until the team chooses the highest-value post-Phase-07 scope.
