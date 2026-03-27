# WORKING_NOTES

## Current Workflow Phase
- Phase: 04 - Provenance, Assets, And Safe Resync
- Focus: finish the formal closeout of the now-verified asset-slot slice instead of reopening already-solved cover work

## Project State
- Done:
  - Phase 3 verification and planning closeout
  - Phase 4 planning refinement for DB-backed anime image assets
  - migration-number cleanup for conflicting `0034`/`0035` lines
  - backend groundwork for anime asset slots with `manual|provider` ownership
  - runtime precedence update for persisted anime cover/banner/background assets
  - Phase 4 edit-route UI for provenance, preview/apply, persisted cover/banner/background controls, and operator feedback
  - runtime verification for metadata preview/apply and protected manual ownership
  - browser verification for `/admin/anime/25/edit` cover remove/upload/preview flow
  - preview host fix so provider media now loads from `localhost:8092` instead of `localhost:3002`
  - global installation of `ui-ux-pro-max`
- In progress:
  - phase-plan/status closeout so `04-03` reflects the real verified implementation
  - decision on whether the temporary Playwright cover smoke should become durable automation
  - `day-closeout` skill/worker packaging for Codex
- Blocked:
  - no product blocker
  - repository-wide lint/type noise is still outside this task slice

## Key Decisions & Context
- Persisted anime image assets must be first-class backend data, not just provider URLs.
- `cover`, `banner`, and `backgrounds` belong to the same ownership-aware persistence layer.
- Manual assets always win until explicitly removed.
- `cover_image` remains a compatibility mirror while the slot model becomes authoritative.
- Background/theme videos stay Jellyfin-only in this phase.
- Phase 4 should not stay "open" because of old plan text when runtime and browser evidence already closed the implementation gap.

## 04-03 Plan Audit

### Audit Verdict
- `ASST-01` verify-done for `cover`, `banner`, and `backgrounds`
- `ASST-02` verify-done for explicit replace on `cover`/`banner` and append-style manual add for `backgrounds`
- `ASST-03` verify-done for explicit remove on `cover`, `banner`, and `backgrounds`
- `ASST-05` verify-done for `cover`, `banner`, and `backgrounds`
- `OWNR-02` verify-done for visible provenance on edit plus ownership surfaced in API/context payloads
- `RLY-02` verify-done for runtime fallback, explicit apply gating, German operator feedback, and protected manual cover behavior

### Done
- Migration `0039_add_anime_asset_slots` adds persisted anime-owned `banner` state plus ordered `anime_background_assets` with `manual|provider` ownership.
- Migration `0040_add_anime_cover_asset_slots` extends the same ownership model to `cover` and backfills existing `cover_image` rows into the persisted slot layer.
- Repository layer resolves persisted assets, keeps manual ownership explicit, appends provider backgrounds safely, and preserves manual background ordering/identity during provider refresh.
- Repository layer mirrors persisted `cover` changes back into `cover_image` so existing public/admin cover reads stay compatible while the new slot model becomes authoritative.
- Public anime backdrops runtime reads persisted cover/banner/background assets before Jellyfin fallback where applicable.
- Admin actions exist for explicit manual cover/banner assign/remove and manual background add/remove.
- Jellyfin metadata apply path only updates cover/banner/backgrounds when explicitly requested and does not overwrite manual persisted assets.
- Edit route exposes provenance, provider preview, explicit apply toggles, persisted cover/banner/background state, and destructive actions with German operator copy.
- Focused verification exists for:
- repository reconcile logic and local-path precedence
- handler mapping/preview protection rules
- runtime smoke for preview/apply/delete/fallback behavior
- browser smoke for edit-route cover remove/upload/preview rendering

### Still Open
- Decide whether the temporary Playwright smoke in `frontend/tmp-playwright-phase4` should be promoted into a maintained regression test.
- Update formal phase/progress docs so the verified cover path is no longer treated as still-open work.

## Assumptions
- Existing untracked repository files are intentional user/worktree state and must not be cleaned up implicitly.
- The backend groundwork already present in untracked files was meant to be integrated, not discarded.
- The user wants repo-local handoff files to reflect the real Team4s work even if broader root `.planning` state says something else.

## Parking Lot
- Logo persistence remains out of this specific slice.
- Karaoke/video-specific asset management belongs to later work, not this phase.
- A cleaner global convention for repo-local worker agents might be useful after `day-closeout`.
