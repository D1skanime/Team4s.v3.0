# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 32 fansub release timeline/upload follow-through`

## Current State

### What Finished In This Pass
- Phase 32 fansub release timeline/upload follow-through (2026-05-06): duration, Fehlt-status, upload-state.
- Phase 33 (2026-05-07): `InsertMediaFile` on `MediaRepository` — release-theme uploads now persist `size_bytes` correctly in `media_files`. UAT confirmed: media_id 90 = 10906996 bytes.
- Debugger fix (2026-05-06): PNG logo upload now preserves source format via `imageExtFromMime()` in `media_upload_image.go` — no more silent JPG downgrade.
- Quick task 260507-de2 (2026-05-07): Theme types renamed OP→OP Kara, ED→ED Kara, Insert→Insert Kara. DB migration 0058 + live UPDATE + frontend labels in `useReleaseSegments.ts`.
- Docker rebuilt and verified for all changes.

### What Works
- Phase 20 remains the verified release-native import baseline.
- Phase 21 fansub chip/collaboration wiring remains part of the baseline.
- Phase 28 runtime playback/fallback behavior remains live-verified.
- Phase 30 explicit release endpoints are the release context source instead of hidden theme-asset side effects.
- Phase 31 `Anime & Releases` is the main fansub release workspace.
- Phase 32 release drawer can upload/delete release-theme assets through existing `release_theme_assets` APIs.
- Phase 33 release-theme uploads now write `media_files` (variant='original') so `size_bytes` is non-zero in list responses.
- PNG logo uploads preserve transparency (no JPEG downgrade).
- Theme type names in DB and frontend: OP Kara, ED Kara, Insert Kara, Outro.

### What Is Open
- `npm run lint` passes but still reports 26 unrelated pre-existing warnings.
- `main` is ahead of `origin/main` by 28 commits — push pending.
- Many scratch/cache files remain untracked; not intended product changes.
- Cross-AI review still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `32-fansub-release-side-drawer`
- Current plan position: Phase 32 release-native fansub timeline/upload path is implemented, committed, deployed locally, and browser-verified on real Release 41 data.
- Immediate next step: smoke-test delete/re-upload of one Release 41 theme asset, then decide whether to fix release-theme asset `size_bytes` metadata.

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Fansub links are authored canonically through `fansub_group_links`; fixed URL columns are compatibility projections only.
- Collaboration-member management is explicit and separate from ordinary group profile editing.
- `release_version_groups.fansub_group_id` is the runtime truth; legacy `fansubgroup_id` is cleanup-only.
- Anime and episodes stay neutral; release and group media must stay on their existing release/group seams.
- The release side drawer must reuse existing `release_theme_assets` and release-native APIs instead of inventing new media tables or hidden release discovery.
- Global/admin theme segments that cover an episode range must lock out conflicting release-specific uploads for the covered releases.
- In the fansub UI, `release_asset` means release-specific/upload-required until a concrete release-scoped asset exists.
- Fansub timelines use `release_variants.duration_seconds` as the first duration source.
