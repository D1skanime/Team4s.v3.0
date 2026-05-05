# WORKING_NOTES

## Current Workflow Phase
- Phase 32 release-side drawer work is in the dirty worktree; live asset round-trip verification is done and the next useful step is migration-boundary audit plus remaining drawer-state cleanup.

## Useful Facts To Keep
- `docs/architecture/db-schema-fansub-domain.md` is now the first domain-reference stop for fansub/anime/release persistence questions.
- `release_version_groups.fansub_group_id` is the canonical runtime group column; `fansubgroup_id` is legacy cleanup territory only.
- Anime and episodes stay neutral; release/process media must not get attached directly to those neutral entities.
- Phase 30 moved release identity onto explicit admin endpoints; theme-asset responses are no longer supposed to smuggle `release_id`.
- Phase 31 made `Anime & Releases` the main release-context workspace on fansub edit.
- Phase 32 already completed two honest browser round-trips on `/admin/fansubs/88/edit` (Release 41 and Release 42).
- Release-theme uploads now store under `media/release-theme-assets/release_<releaseId>/theme_<themeId>/...`.
- Release-theme deletes now remove the physical file too, not just the DB/link state.
- Global/admin episode-range theme segments now block conflicting release-specific uploads at backend level.
- The worktree currently mixes product changes with repo-local GSD/Codex tooling changes; do not assume one clean commit boundary exists yet.

## Verification Memory
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-29.
- `cd frontend && npm.cmd run build` passed on 2026-04-29.
- `cd frontend && npx tsc --noEmit` passed on 2026-04-29.
- Phase 30 verification artifact was completed on 2026-04-30; human UAT remains pending there.
- `http://127.0.0.1:8092/health` returned `200` on 2026-05-05.
- `http://127.0.0.1:3002/admin/fansubs/7/edit` returned `200` on 2026-05-05.
- `cd frontend && npx tsc --noEmit` passed on 2026-05-05 after the upload-trigger and drawer-reset fixes.
- `cd backend && go test ./internal/handlers ./internal/repository -count=1` passed on 2026-05-05 after storage cleanup and theme-lock guardrail changes.

## Mental Unload
- The big practical risk now is less the upload seam itself and more stale UI state plus schema/migration drift in a very mixed dirty worktree.
- Tomorrow should start with the migration-boundary audit, not another first-principles UAT run.
