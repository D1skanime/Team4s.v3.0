# DAYLOG

## 2026-03-15
- Project: `Team4s.v3.0`
- Milestone: `Phase 5 - Reference and Metadata Groundwork`
- Today's focus: related-slider and layout fix on `/anime/[id]`, lane coordination, critical re-review, frontend deploy
- Repo-local project files live in `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0`

### Workstreams Touched
- Frontend UX/layout fix for `Related` on `/anime/[id]`
- Lane handoff and UX freeze alignment via `docs/ux-related-section-handoff-2026-03-15.md`
- Critical re-review and closeout evidence
- Frontend service rebuild/deploy plus runtime verification

### Goals Intended vs Achieved
- Intended: move `Related` out of the hero card, fix slider behavior, close the review loop, and deploy the frontend safely
- Achieved: `Related` now renders as the first standalone section below the hero, arrows are overflow-aware, the critical re-review ended with `APPROVE`, and the frontend service redeployed successfully

### Problems Solved
- Root cause: the previous redesign mounted `Related` inside the hero info card and kept arrows always visible, which conflicted with the UX handoff
- Fix: moved the mount into a standalone post-hero rail, added native-scroll-first slider behavior with measured button visibility, and kept whole-card navigation as the only card action

### Open Follow-ups
- Backend still exposes `genre: string` instead of a `genres: string[]` contract, so the genre-chip follow-up remains separate from this slider fix
- Global `frontend npm run lint` still fails on pre-existing repo-wide issues outside this scope

### Evidence / References
- UX handoff: `docs/ux-related-section-handoff-2026-03-15.md`
- Critical review artifact: `docs/reviews/2026-03-15-related-slider-fix-critical-review.md`
- Frontend files: `frontend/src/components/anime/AnimeRelations.tsx`, `frontend/src/components/anime/AnimeRelations.module.css`, `frontend/src/app/anime/[id]/page.tsx`, `frontend/src/app/anime/[id]/page.module.css`
- Deploy verification: `http://localhost:8092/health` returned `{"status":"ok"}` and `http://localhost:3002/anime/25` returned HTTP 200 after `docker compose up -d --build team4sv30-frontend`

## 2026-03-14
- Detected that Package 2 had drifted away from the canonical Phase A metadata scope in `docs/architecture/db-schema-v2.md`.
- Corrected the migration lane back to anime metadata only.
- Reduced migration `0019` to `genres` and migration `0022` to `anime_genres`.
- Added backend support for Phase A metadata backfill:
  - `backend/internal/repository/anime_metadata.go`
  - `backend/internal/services/anime_metadata_backfill.go`
  - `go run ./cmd/migrate backfill-phase-a-metadata`
- Fixed legacy title mapping rules:
  - `anime.title` -> `ja/main`
  - `anime.title_de` -> `de/main`
  - `anime.title_en` -> `en/official`
- Added focused migration/service tests and re-ran `go test ./...` successfully in `backend`.
- Confirmed that the installed Navicat version cannot connect to local Postgres because it does not support SCRAM auth.

## 2026-03-13
- Installed GSD locally for Codex under workspace `.codex/` as a planning pilot rather than a repo-wide workflow replacement.
- Ran the brownfield mapping flow and generated `.planning/codebase/STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`.
- Reviewed the proposed normalized DB schema against the current production tables and confirmed it should be treated as a phased target architecture instead of a big-bang migration.
- Stored the schema draft canonically in `Team4s.v3.0/docs/architecture/db-schema-v2.md` so future restarts can resume from files, not chat history.
- Executed GSD Phase 3 and turned the schema draft into a phased migration brief with blocker audit, impact mapping, rollout slices, and validation gates.
- Executed GSD Phase 4 and created ownership/routing rules plus a migration-lane handoff so `.planning/` can guide the next migration action without replacing Team4s repo-local day-state docs.

## 2026-03-26
- Project: `Team4s.v3.0`
- Milestone: `Admin anime intake and edit-flow hardening`
- Today's focus: make local anime create/edit/public flows easier to test and easier to trust
- Repo-local project files live in `C:\Users\admin\Documents\Team4s`

### Workstreams Touched
- Public/admin cover URL consistency
- Edit poster upload repair
- Admin anime overview and post-create verification flow
- Codex skill support for local day closeout

### Goals Intended vs Achieved
- Intended: understand why the newly created anime was not clearly visible in admin flow, repair the remaining cover/upload friction, and leave a better restart point
- Achieved: public cover handling now supports absolute Jellyfin/media URLs, edit poster upload works through the safe local route, the admin overview shows persisted anime, and create now returns to that overview

### Problems Solved
- Root cause: the anime create flow itself persisted correctly, but `/admin/anime` was not functioning as a real overview and therefore failed as a verification surface
- Fix: converted `/admin/anime` into a runtime-rendered overview with real anime entries and changed create redirect back to the overview
- Root cause: edit poster upload still used the broken generic backend media upload path against a newer schema
- Fix: rerouted current poster edit uploads through the working local cover upload endpoint
- Root cause: public cover helper treated some values like legacy local filenames only
- Fix: extended public cover resolution to accept absolute URLs and reused that in related cards

### Open Follow-ups
- Edit save semantics still need a clean product/UX definition
- Generic backend media upload remains schema-broken for richer asset types
- Relations management is still upcoming work

### Evidence / References
- Skill added: `C:\Users\admin\Documents\Team4s\.codex\skills\day-closeout\SKILL.md`
- Overview route: `frontend/src/app/admin/anime/page.tsx`
- Create route: `frontend/src/app/admin/anime/create/page.tsx`
- Edit upload seam: `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`
- Public cover helper: `frontend/src/lib/utils.ts`
- Public relations cards: `frontend/src/components/anime/AnimeRelations.tsx`
