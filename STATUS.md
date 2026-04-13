# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 13 AniSearch relation follow-through is complete, verified locally, and pushed on top of the valid `main`
- **Rough completion:** 5 major v1.1 slices executed/verified locally (`06`, `07`, `10`, `12`, `13`)

## What Works Now
- Docker stack is usable for local browser testing.
- Local dev startup also works without rebuilding app containers each time:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend-dev.ps1 -RunMigrations`
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend-dev.ps1`
- Backend health responds on `http://localhost:8092/health`.
- Frontend is live on `http://localhost:3002` in Docker and `http://localhost:3000` in local dev.
- Anime create can stage and link `cover`, `banner`, `logo`, `background`, and `background_video` through the shared V2 seam.
- Anime create now exposes a visible `Tags` card and persists tags through DB-backed `tags` / `anime_tags`.
- Anime create now also carries AniSearch relation rows through the final save seam and persists them after anime creation.
- Idempotent create-side relation retries are summarized correctly through `relations_applied` plus `relations_skipped_existing`.
- AniSearch relation pages with mixed graph node container types now parse correctly; the `Ace of the Diamond: Staffel 2` relation graph is no longer dropped.
- Anime edit exposes manual asset controls for `banner`, `logo`, `background`, and `background_video` in the asset provenance cards.
- Cover management now lives directly in the cover provenance card instead of a separate management block.
- Backgrounds render as a multi-image gallery with separate provider and active sections.
- Full anime delete removes anime-owned linked media rows plus `media/anime/{id}`.
- GitHub `main` now includes the validated recovery baseline plus the Phase-13 AniSearch relation fixes through `e5d934c`.

## What Is Not Done Yet
- Edit-route relation UX is the chosen next AniSearch/admin slice, but it still needs concrete scoping/planning.
- Broader relation-label normalization remains a separate follow-up after the edit-route UX slice.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Any further UI polish still needs to stay separate from lifecycle-critical seam work.

## Valid Commands
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `docker compose up -d team4sv30-db team4sv30-redis`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd backend && go test ./cmd/server -count=1`
- `cd backend && go test ./internal/repository ./internal/handlers ./cmd/server -count=1`
- `cd backend && go test ./internal/services -run "TestParseAniSearchRelationsPageHTML|TestDecodeAniSearchRelationsNodes|TestAnimeCreateEnrichmentService|TestMapAniSearchGraphRelation" -count=1`
- `cd frontend && npm test -- src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx`
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
- Manual checks covered:
  - edit-route upload and visibility for `banner`, `logo`, `background`, and `background_video`
  - create-route staging plus post-create linking for non-cover assets
  - delete cleanup for uploaded manual anime assets
  - integrated cover-card management and updated asset provenance presentation
  - visible tag card, manual tag entry, provider tag hydration, persisted-tag save after schema repair
  - create/delete cleanup for test anime after Phase-10 gap closure
  - live local create-side AniSearch relation persistence and idempotent skip handling
  - live local parser confirmation for `Ace of the Diamond: Staffel 2` after the mixed-node graph fix

## Top 3 Next
1. Scope the edit-route relation UX slice explicitly from the now-verified Phase-13 baseline.
2. Keep UI polish and relation-taxonomy expansion separate from the edit-route UX slice unless a new regression appears.
3. Use the verified Phase-06/07/10/12/13 behavior as the regression baseline for any further metadata or enrichment work.

## Risks / Blockers
- No product blocker on the current `main` baseline.
- The next slice is chosen, but the exact edit-route relation UX boundary still needs to be written down before implementation starts.
- Cross-AI review is still unavailable because no independent reviewer CLI is installed locally.
- Some root handoff files and older Phase-11 artifacts are already dirty in the worktree; do not accidentally sweep them into unrelated commits.
