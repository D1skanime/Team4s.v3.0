# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** Post-Phase-20 closeout from the verified `release-native-episode-import-schema` baseline

## Current State

### What Finished In This Pass
- Wave-3 code check caught a real mismatch: the frontend reducer still treated parallel releases for the same canonical episode as conflicts.
- That reducer mismatch was fixed in `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts`.
- The related frontend mapping tests were updated and now pass.
- Targeted backend tests, targeted frontend tests, frontend production build, Docker rebuild/redeploy, and route smokes are current again.
- `20-UAT.md` now contains live Docker evidence from a disposable `3×3 Eyes` replay, including normalized-table SQL proof and dual-provider source persistence.

### What Works
- Phase 20 backend writes the normalized release graph instead of falling back to legacy `episode_versions`.
- Preview payloads carry multilingual titles and filler metadata.
- The import workbench exposes filler badges, preferred title fallback, release group/version overrides, bulk confirm/skip, and multi-target mappings.
- Parallel releases per canonical episode are allowed in both backend and frontend handling.
- The local backend and frontend are serving on ports `8092` and `3002`.
- Phase 20 live replay is complete and verified against normalized release-native tables.

### What Is Open
- Phase 20 no longer has an open live-UAT blocker.
- The main remaining post-phase note is a UX follow-up: the workbench still stays actionable after a successful idempotent apply.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `20-release-native-episode-import-schema` is verified complete
- Current plan position: awaiting the next narrow slice selection
- Immediate next step: choose the next scoped follow-up from the now-verified import baseline

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables are the authoritative persistence target for Phase 20.
- Parallel releases for the same canonical episode are valid and must not be surfaced as frontend conflicts.
- Combined-file mappings such as `9,10` must survive preview, operator edits, and apply.
- Handoff files should stay honest about live-UAT gaps instead of inferring completion from passing unit tests.
- Jellyfin rename detection is not identity-stable enough to treat a filesystem rename as the same imported release; already imported rename corrections should use targeted version/episode resync flows instead of broad re-import expectations.
- 2026-04-22: Anime create now keeps an explicitly selected Jellyfin series as authoritative `source=jellyfin:<id>` on save and additionally persists all provider tags in `anime_source_links`, so AniSearch and Jellyfin are both retained durably for later duplicate checks, relation lookups, and import context.
