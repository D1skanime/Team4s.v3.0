# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** Admin anime intake and public/admin parity hardening
- **Status:** Manual create flow, Jellyfin-assisted intake, runtime UI-review on localhost, overview confirmation after create, and server-prefetched edit route are working; edit semantics and richer metadata/media ownership still need follow-up
- **Rough completion:** ~78% for the current admin anime intake track

## What Works Now
- Docker stack starts and serves:
  - `http://localhost:3002`
  - `http://localhost:8092/health`
- Local dev auth friction is reduced for this environment:
  - admin routes can be exercised locally without the previous token lifecycle blocking every test
- Admin anime create flow works with:
  - title + cover as required fields
  - Jellyfin search from title input
  - Jellyfin preview/draft hydration
  - multiple Jellyfin backgrounds in the draft
- Public anime detail accepts both:
  - manual/local cover paths
  - absolute Jellyfin/media proxy URLs
- Admin anime overview now shows persisted anime entries and links to:
  - edit
  - public detail
- Create flow now returns to `/admin/anime?created=<id>#anime-<id>`, where the new anime is visible immediately and explicitly confirmed
- Edit cover upload works again through the local cover upload route
- `/admin/anime/[id]/edit` now server-renders with initial anime data instead of starting from the old client-only loading shell
- Local UI-review can use runtime screenshots from the live Docker stack

## Verification
- `frontend npm test -- src/app/admin/anime/page.test.tsx src/app/admin/anime/create/page.test.tsx` -> passing
- `frontend npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx` -> passing
- `frontend npm run build` -> passing
- `docker compose up -d --build team4sv30-frontend` -> passing
- Admin overview runtime render verified on Docker:
  - `/admin/anime?created=3` shows explicit confirmation for `Air`
  - `/admin/anime/3/edit` renders with real content
- Public anime detail verified:
  - `/anime/1` loads and resolves cover correctly

## Top 3 Next
1. Define and implement the remaining edit-save behavior cleanly:
   - what saves immediately
   - what saves through the main save bar
   - what should redirect or stay in context
2. Continue the edit screen improvements:
   - smoother edit UX
   - clearer save semantics
   - better post-save feedback
3. Reconcile the generic backend media upload path with the current DB schema before banner/logo/background uploads are expanded

## Known Risks / Blockers
- **Generic backend media upload is schema-broken:** `/api/v1/admin/upload` still expects old `media_assets(entity_type, entity_id, asset_type, ...)` columns and cannot currently be trusted for the newer media workflow
- **Edit flow semantics are not fully settled:** create flow is now clearer, but edit still has mixed immediate-vs-save-bar behavior
- **Planning/docs drift exists:** old media-upload milestone notes are no longer the best description of the active anime-intake work
- **Dirty worktree is intentional:** current working changes and `.planning` artifacts are not fully closed out into commits yet
- **Docker runtime is currently part of verification state:** local screenshots, created test anime, and uploaded covers are part of the live working context

## Valid Commands
- Start stack: `docker compose up -d --build`
- Stop stack: `docker compose down`
- Frontend tests: `cd frontend && npm test`
- Frontend build: `cd frontend && npm run build`
- Backend health check: `http://localhost:8092/health`

## Owner Focus
- Frontend/admin lane: anime create/edit flow hardening
- Backend lane: media/schema alignment and future ownership sync rules
- Planning lane: GSD phase continuation from the anime intake roadmap plus runtime UI-review support
