# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** Phase 4 implementation and closeout after verified Phase 3 completion
- **Current slice:** provenance-aware anime asset persistence and safe resync behavior on the admin edit route

## Current State

### What Finished Recently
- The `04-03` edit-route asset slice now covers persisted `cover`, `banner`, and `backgrounds`.
- Migration `0040_add_anime_cover_asset_slots` extends the same slot/ownership model to `cover`.
- Existing `cover_image` rows were backfilled into the new cover slot model as `manual`.
- `cover_image` is still mirrored so older read paths stay compatible.
- Docker runtime was brought up and migration status is clean at `Applied: 40, Pending: 0`.
- A real browser smoke confirmed:
  - existing manual cover visible
  - remove cover clears persisted slot
  - upload cover restores persisted slot
  - preview still shows manual protection

### What Is Working
- Admin Jellyfin context/preview/apply routes are live in Docker.
- Persisted anime assets override Jellyfin fallback at runtime.
- Manual ownership survives provider apply for `cover`, `banner`, and `backgrounds`.
- Edit route UI exposes provenance and explicit operator actions for the persisted slots.
- Cover UI flow now has end-to-end evidence across:
  - schema
  - repository/handler tests
  - runtime API
  - DB state
  - real browser interaction

### What Is In Progress
- Formal closeout of `04-03` in planning/handoff files.
- Decision on whether the temporary Playwright cover smoke should be promoted into a maintained regression path.
- Repo-local closeout/resume tooling alignment with the actual Team4s slice.

### What Is Still Pending
- Mark the remaining Phase 4 planning state accurately now that cover is no longer the open architectural gap.
- Decide whether to keep or discard the temporary browser smoke script after phase closeout.

## Active Planning Context
- Current focus: `Phase 04 - Provenance, Assets, And Safe Resync`
- Most active sub-slice: `04-03 Asset Provenance And Protected Slot Actions`
- Core rules in force:
  - manual persisted assets remain authoritative
  - provider-owned assets refresh only on explicit apply/resync
  - persisted anime assets beat Jellyfin fallback at runtime
  - background/theme videos stay provider-only

## Key Decisions In Force
- Phase 3 is closed as verified complete.
- Anime image assets are DB-backed, not loose provider URLs.
- `cover`, `banner`, and `backgrounds` belong to the same ownership-aware persistence model.
- `cover_image` remains as a compatibility mirror while the slot model becomes authoritative.
- Background/theme videos are not part of local persistence in this phase.

## Quality Bar
- Do not claim Phase 4 complete until planning files reflect the actually verified slice.
- Runtime precedence must stay deterministic: persisted first, Jellyfin fallback second.
- Migration changes must remain reversible and runnable in Docker.
- Handoff files should point tomorrow-you at the next planning/verification action, not at already-finished cover work.
