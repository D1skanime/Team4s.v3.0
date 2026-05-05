# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 32 fansub release side drawer is implemented and real release-theme-asset UAT was run; the next open block is cleanup-boundary and migration audit.
- **Current branch:** `main`
- **Current focus:** keep the verified release-native fansub baseline intact while moving into migration-boundary audit and remaining drawer-state cleanup.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 release-native import baseline remains verified complete.
- Phase 21 fansub group chips and deterministic collaboration wiring are complete and UAT-approved.
- Phase 28 runtime playback/fallback behavior and duration shorthand flow remain live-verified on `/admin/episode-versions/47/edit`.
- The default fansub admin list hides collaboration records so the everyday list only shows real groups.
- Fansub create/edit now manage community links through generic `fansub_group_links` rows with `website`, `discord`, `twitter`, `github`, and `irc`.
- Fansub edit now exposes explicit collaboration-member management for `group_type='collaboration'`.
- `website_url`, `discord_url`, and `irc_url` are now compatibility projections, not the primary fansub link write seam.
- Phase 30 explicit release endpoints exist for list, canonical release, and release-by-ID reads.
- Phase 31 fansub edit is now a tabbed workspace with `Anime & Releases` as the release-context entry point.
- Phase 32 adds a release side drawer for concrete release-theme-asset editing without introducing new DB tables.
- Release-theme-asset upload now works through an explicit `Upload starten` action instead of only native file-input change behavior.
- Release-theme-asset upload/reload/delete was live-verified on `/admin/fansubs/88/edit` for Release 41 and Release 42 under real drawer context.
- Release-theme delete now removes the physical stored file as well as the release-theme link.
- New release-theme uploads now store under `media/release-theme-assets/release_<releaseId>/theme_<themeId>/...`.
- Backend upload now rejects conflicting release-specific uploads when a global/admin theme segment already covers that episode range.
- Repo-local agent guidance now points to `docs/architecture/db-schema-fansub-domain.md` as the fansub-domain source of truth and keeps the stop conditions explicit in `AGENTS.md`.

## What Is Not Done Yet
- The broader release-drawer state/race audit is not finished; one more pass on release-switching and stale detail state is still warranted.
- The cleanup-boundary migrations `0055`, `0056`, and `0057` are untracked and need deliberate migration-chain review before more schema work is added.
- The legacy `release_version_groups.fansubgroup_id` drop is not safe to assume complete until runtime references and data mismatches are checked explicitly.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Large repo-local GSD/Codex tooling changes are present in the same dirty worktree and have not been separated into a smaller reviewable batch yet.
- Some local temp/cache/debug directories and screenshots are still present in the worktree and are not part of intended history.
- The remaining fansub duplicate fields (`closed_year`, `history_description`) are still transitional and should not be mistaken for canonical truth.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go build ./...`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd frontend && npm.cmd run test -- --reporter=verbose`
- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- `cd frontend && npx tsc --noEmit`
- `http://localhost:3002/admin/fansubs/7/edit`
- `http://localhost:3002/admin/episode-versions/47/edit`

## Verification Evidence
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-29.
- `cd frontend && npx vitest run --reporter=verbose src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` passed on 2026-04-29.
- `cd frontend && npm.cmd run build` passed on 2026-04-29.
- `cd frontend && npx tsc --noEmit` passed on 2026-04-29 after a fresh build regenerated stale `.next/types`.
- Docker rebuild/redeploy passed on 2026-04-29 after the duration/runtime follow-through.
- Phase 30 verification artifact was completed on 2026-04-30; automated checks are documented, human UAT remains pending.
- Smoke checks returned `200` on 2026-05-05 for:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:3002/admin/fansubs/7/edit`
- Real browser/UAT on 2026-05-05 verified on `/admin/fansubs/88/edit`:
  - Release 41 missing `ED` upload -> persisted after reopen -> delete removed UI state and physical file
  - Release 42 missing `ED` upload -> persisted under structured `release-theme-assets` path -> delete removed UI state and physical file
- `cd backend && go test ./internal/handlers ./internal/repository -count=1` passed on 2026-05-05 after the release-theme cleanup-boundary guardrail work.
- `cd frontend && npx tsc --noEmit` passed on 2026-05-05 after the explicit upload-start and drawer-state-reset follow-through.
- Live browser/UAT on `/admin/episode-versions/47/edit` was reported successful on 2026-04-29 for runtime playback/fallback behavior plus duration-input save/reload and invalid-input blocking.
- No full backend/frontend test or build sweep was rerun in this closeout session for the current mixed Phase 29 to 32 plus tooling worktree.

## Top 3 Next
1. Audit migrations `0055` to `0057` and the `fansubgroup_id` cleanup boundary before adding any further schema work.
2. Finish the release-drawer state/race pass, especially detail/theme drawer switching between neighboring releases.
3. Separate or at least stage-review the repo-local GSD/Codex tooling churn independently from product code.

## Risks / Blockers
- Wrong-domain persistence remains the biggest product risk: release/fansub media must not drift onto neutral anime or episode entities.
- Migration-chain risk is elevated because several new cleanup migrations are untracked at once.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- The worktree mixes product code, planning files, and repo-local tooling churn, which raises review and accidental-commit risk.
