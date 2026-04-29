# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 28 runtime playback/duration follow-through is implemented and redeployed locally; automated verification is green again, while human UAT is still open.
- **Current branch:** `main`
- **Current focus:** finish the honest Phase-28 live browser/UAT pass for runtime playback/fallback behavior and the new duration-input shorthand.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 release-native import baseline remains verified complete.
- Phase 21 fansub group chips and deterministic collaboration wiring are complete and UAT-approved.
- The old anime themes page is retired from the active flow; segment work happens on episode-version edit.
- Segment editing on `/admin/episode-versions/:id/edit` supports generic types (`OP`, `ED`, `Insert`, `Outro`) plus free names.
- Same-release segments reappear on covered episodes, while foreign-release segments show as adoptable suggestions.
- Segment source assets can be uploaded, persisted, replaced, and deleted for `release_asset` segments.
- The segment table now surfaces the uploaded file name instead of only a generic source label.
- The grouped episode overview now surfaces segment presence and uploaded-file presence per version row.
- Reusable segment-library definitions/assets now survive anime delete and can be rediscovered by the same AniSearch identity plus fansub-group context.
- The segment editor now exposes reusable library candidates and marks reused assets with provenance metadata.
- Runtime metadata now carries `duration_seconds` through the episode-version edit backend/frontend seam.
- The duration input accepts raw seconds, `m:ss`, `hh:mm:ss`, `2m`, `1m30`, and `1m30s`.
- Invalid duration text is blocked before save instead of silently writing `duration_seconds: null`.
- The episode overview no longer shows the obsolete `Korrektur-Sync` action.
- Deleting an episode version now works through the backend release-native delete path instead of returning `500`.
- The default fansub admin list hides collaboration records so the everyday list only shows real groups.

## What Is Not Done Yet
- The Phase-28 live runtime playback/fallback browser evidence is still missing.
- The new duration-input shorthand has not yet been captured in a real browser/UAT pass.
- The Phase-27 runtime migration state was inconsistent once: migration `52` appeared applied before the `segment_library_*` tables physically existed.
- The future fansub-self-service upload route for segment files is still a product direction, not an implemented surface.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Some local temp/cache/debug directories and screenshots are still present in the worktree and are not part of the intended code/history.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go build ./...`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd frontend && npx vitest run --reporter=verbose src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts`
- `cd frontend && npm.cmd run build`
- `cd frontend && npx tsc --noEmit`
- `http://localhost:3002/admin/episode-versions/47/edit`

## Verification Evidence
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-29.
- `cd frontend && npx vitest run --reporter=verbose src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` passed on 2026-04-29.
- `cd frontend && npm.cmd run build` passed on 2026-04-29.
- `cd frontend && npx tsc --noEmit` passed on 2026-04-29 after a fresh build regenerated stale `.next/types`.
- Docker rebuild/redeploy passed on 2026-04-29 after the duration/runtime follow-through.
- Smoke checks returned `200` on 2026-04-29 for:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:3002/admin/episode-versions/47/edit`
- Prior live Phase-27 reuse UAT still stands as the current library baseline.

## Top 3 Next
1. Run the live `/admin/episode-versions/47/edit` UAT pass for duration input and Phase-28 runtime/fallback behavior.
2. Capture that evidence in the Phase-28 verification artifact so the open human-UAT tail is explicit and honest.
3. Audit why migration `52` was marked applied before `segment_library_*` tables physically existed in the DB.

## Risks / Blockers
- Phase 28 can still be overstated if the missing live runtime/fallback browser pass is not captured explicitly.
- Migration bookkeeping for Phase 27 needs follow-up because runtime state and schema_migration state diverged once.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Untracked local temp/cache/debug artifacts still clutter the worktree and should stay out of history.
