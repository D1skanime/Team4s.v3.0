# 2026-03-26 - day-summary

## Focus
Phase 3 closeout verification, Phase 4 execution, and end-to-end validation of anime asset provenance for `cover`, `banner`, and `backgrounds`.

## What Changed
- Verified Phase 3 (`Jellyfin-Assisted Intake`) against tests and local runtime, then aligned the planning files to `complete/verified`.
- Planned Phase 4 (`Provenance, Assets, And Safe Resync`) and refined the 04-03 asset scope with explicit ownership and runtime fallback rules.
- Implemented backend persistence groundwork for anime asset slots with `manual|provider` ownership and runtime precedence over Jellyfin fallbacks.
- Resolved duplicate migration-number conflicts by moving the release-decomposition/admin-audit migrations to `0037` and `0038`, then added `0039_add_anime_asset_slots`.
- Wired the existing Jellyfin metadata resync flow into admin runtime routes and extended context payloads toward the edit UI.
- Implemented the Phase 4 edit-route UI slice in `AnimeJellyfinMetadataSection.tsx` and `AnimeEditWorkspace.module.css` for:
  - provenance display
  - preview-first apply controls
  - persisted banner/background management
  - clearer operator feedback and destructive actions
- Fixed a render-loop bug in the edit route by stabilizing Jellyfin-context callback usage.
- Fixed provider preview rendering by resolving `/api/v1/media/...` URLs against the backend host in `frontend/src/lib/api.ts`.
- Installed `ui-ux-pro-max` globally for Codex and prepared `day-closeout` to exist both as a skill and as a callable worker-oriented agent pattern.

## Why It Changed
- Phase 3 needed a real verification verdict before Phase 4 could be treated as the active lane.
- Asset ownership had to move from vague UI state into a durable backend model before safe resync behavior was possible.
- Public anime media needed deterministic precedence so manual assets cannot be visually overwritten by provider fallbacks.
- The migration chain had become unsafe because two different lines occupied the same numbers locally.

## Verification
- `go test ./internal/repository -run 'Test(ReconcileAnimeProviderBackgrounds|ResolveAnimeAssetURL|AnimeRepository_ReadPathUsesFlatColumnsWithNormalizedOverlay|AdminAnimeWritesTargetNormalizedMetadataTables|AdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_UsesExplicitCasts|AdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_TrimmedSourceAndNullableArgs)' -count=1` passed.
- `go test ./internal/handlers -run 'TestBuildMetadataFieldPreview|TestBuildJellyfinCoverPreview|TestMapPersistedAnimeAssets|Test.*AnimeJellyfin|Test.*AnimeAsset' -count=1` passed.
- `go test ./cmd/server -count=1` passed.
- `npm run test -- src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts` passed.
- `npm run build` passed in `frontend`.
- `./migrate up` succeeded locally after the migration renumber fix.
- Runtime smoke confirmed:
  - `POST /api/v1/admin/anime/25/jellyfin/metadata/preview` -> `200`
  - `POST /api/v1/admin/anime/25/jellyfin/metadata/apply` -> `200`
  - `DELETE /api/v1/admin/anime/25/assets/banner` -> `204`
  - persisted-banner removal restores public fallback behavior on `GET /api/v1/anime/25/backdrops`
  - manual banner upload/assign/delete works on a temporary anime
  - manual background upload/add/delete works on a temporary anime
- Browser smoke confirmed:
  - `/admin/anime/25/edit` shows provenance, preview decisions, and asset actions
  - `/admin/anime/22/edit` shows the expected manual/no-link state
  - provider cover/banner/logo/background previews now render with real image dimensions instead of blank alt-text frames
- Phase 3 runtime verification passed after rebuild:
  - `GET /health` -> `200`
  - `GET /api/v1/admin/jellyfin/series?q=11eyes` -> `200`
  - `POST /api/v1/admin/jellyfin/intake/preview` -> `200`
  - `/admin/anime/create` -> `200`

## Remaining Gaps
- Full `go test ./internal/repository` is still blocked by the existing untracked file `backend/internal/repository/runtime_authority_test.go`.
- Frontend lint/typecheck remain noisy due to broader pre-existing repo issues, so the new edit UI slice should keep using focused verification.
- The main remaining Phase 4 question is whether to add one more focused automated UI regression before treating this slice as settled.
- Background/theme videos remain provider-only by design and are not part of local persistence.

## Restart Notes
- Start from the repo root: `docker compose up -d --build`
- Active planning focus is Phase 4, especially `04-03 Asset Provenance And Protected Slot Actions`
- The first concrete resume task is to audit `.planning/phases/04-provenance-assets-and-safe-resync/04-03-PLAN.md` against what now works in runtime and browser
