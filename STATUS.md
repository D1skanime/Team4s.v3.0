# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** `main` includes verified Phase 15 create-page asset search work (`d99fc15`), and the current worktree adds unverified Phase-15 follow-through for provider-selected create assets plus background provenance
- **Rough completion:** 7 major v1.1 slices executed/verified on `main` (`06`, `07`, `10`, `12`, `13`, `14`, `15`)

## What Works Now
- Docker stack is usable for local browser testing.
- Local dev startup also works without rebuilding app containers each time:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend-dev.ps1 -RunMigrations`
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend-dev.ps1`
- Backend health responds on `http://localhost:8092/health`.
- Frontend is live on `http://localhost:3002` in Docker and `http://localhost:3000` in local dev.
- Anime create can stage and link `cover`, `banner`, `logo`, `background`, and `background_video` through the shared V2 seam.
- Anime create exposes separate provider search flows plus `Online suchen` chooser actions for `cover`, `banner`, `logo`, and `background`.
- Remote search results are staged into the existing upload seam instead of a separate persistence path.
- Tags persist through DB-backed `tags` / `anime_tags`.
- AniSearch create relations persist through the final save seam and relation-graph parsing tolerates mixed node container types.
- Anime edit exposes manual asset controls for `banner`, `logo`, `background`, and `background_video` in the asset provenance cards.
- Cover management lives directly in the cover provenance card, and backgrounds render as a multi-image gallery.
- Full anime delete removes anime-owned linked media rows plus `media/anime/{id}`.
- Current dirty follow-through code extends create-side provider persistence beyond `cover_image` and keeps provider provenance for uploaded backgrounds, but that work was not freshly verified here.

## What Is Not Done Yet
- Live browser UAT for Phase 15 remote asset adoption is still pending.
- Today's provider-asset create follow-through needs real verification after save/persist, especially for remote `banner`, `logo`, and additive `background` selections.
- The next slice after that verification still needs an explicit decision; older notes about edit-route relation UX are no longer the current reliable resume point.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Any further UI polish still needs to stay separate from lifecycle-critical seam work.

## Valid Commands
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `docker compose up -d team4sv30-db team4sv30-redis`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd backend && go test ./cmd/server -count=1`
- `cd backend && go test ./internal/repository ./internal/handlers ./cmd/server -count=1`
- `cd backend && go test ./internal/services ./internal/handlers -count=1`
- `cd backend && go test ./internal/services -run "TestParseAniSearchRelationsPageHTML|TestDecodeAniSearchRelationsNodes|TestAnimeCreateEnrichmentService|TestMapAniSearchGraphRelation" -count=1`
- `cd frontend && npm test -- src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx`
- `cd frontend && npm test -- src/app/admin/anime/create/createAssetUploadPlan.test.ts src/app/admin/anime/create/page.test.tsx src/lib/api.admin-anime.test.ts`
- `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/app/admin/anime/create/page.test.tsx`
- `cd frontend && npm run build`
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend-dev.ps1 -RunMigrations`
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend-dev.ps1`

## Verification Evidence
- Real browser UAT passed for Phase 06 and is recorded in `.planning/phases/06-provisioning-and-lifecycle-foundations/06-UAT.md`
- Real browser UAT passed for Phase 07 and is recorded in `.planning/phases/07-generic-upload-and-linking/07-HUMAN-UAT.md`
- Phase 10 UAT is complete in `.planning/phases/10-create-tags-and-metadata-card-refactor/10-UAT.md`
- Phase 12 verification is complete in `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-VERIFICATION.md`
- Phase 13 verification artifacts exist in `.planning/phases/13-anisearch-relation-follow-through-repair/13-VERIFICATION.md` and `.planning/phases/13-anisearch-relation-follow-through-repair/13-HUMAN-UAT.md`
- Phase 14 planning/state artifacts exist under `.planning/phases/14-create-provider-search-separation-and-result-selection`
- Phase 15 verification is recorded in `.planning/phases/15-asset-specific-online-search-and-selection-for-create-page-anime-assets/15-VERIFICATION.md`
- Manual checks covered:
  - edit-route upload and visibility for `banner`, `logo`, `background`, and `background_video`
  - create-route staging plus post-create linking for non-cover assets
  - delete cleanup for uploaded manual anime assets
  - integrated cover-card management and updated asset provenance presentation
  - visible tag card, manual tag entry, provider tag hydration, persisted-tag save after schema repair
  - create/delete cleanup for test anime after Phase-10 gap closure
  - live local create-side AniSearch relation persistence and idempotent skip handling
  - live local parser confirmation for `Ace of the Diamond: Staffel 2` after the mixed-node graph fix
  - Phase 15 still has an explicit live-browser follow-up for online-search asset adoption after chooser selection

## Top 3 Next
1. Run one live create-page smoke for provider-selected `banner`/`background` persistence after save.
2. Re-run targeted backend/frontend tests for today's follow-through in an environment that can complete Go module fetches and frontend helper spawns.
3. Only after that verification, decide whether the next active slice stays in create-asset hardening or returns to relation UX planning.

## Risks / Blockers
- No product blocker on the current `main` baseline.
- Today's worktree changes are not freshly verified because the local sandbox blocked Go module download and frontend helper spawn.
- Cross-AI review is still unavailable because no independent reviewer CLI is installed locally.
- Historical notes that still point to edit-route relation UX are stale and should not override the actual Phase-15 baseline plus today's follow-through thread.
