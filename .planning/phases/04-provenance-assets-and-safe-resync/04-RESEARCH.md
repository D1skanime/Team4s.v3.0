# Phase 04 Research - Provenance, Assets, And Safe Resync

## Existing Phase 03 Baseline

Phase 03 already delivered:
- Jellyfin search and candidate review on the create route
- draft hydration without hidden persistence
- explicit save-only linkage
- normalized create-time validation for `source` and `folder_name`

That means Phase 04 does not need to solve discovery. It needs to solve post-create maintenance.

## Relevant Existing Seams

### Backend

- `backend/internal/repository/admin_content_sync.go`
  - already exposes sync-source lookup for persisted anime
  - already contains `ApplyJellyfinSyncMetadata(...)`
  - current behavior is close to fill-only metadata application
- `backend/internal/handlers/admin_content_anime_validation.go`
  - already enforces create-time `source` / `folder_name` invariants
- `backend/internal/handlers/admin_content_handler.go`
  - already owns admin content handler wiring and is the correct place for persisted resync endpoints

### Frontend

- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
  - already composes the persisted anime edit experience
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
  - already shows ownership state, editable fields, and cover management
- `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx`
  - already provides a working preview-before-apply interaction model for episode sync
- `frontend/src/app/admin/anime/utils/anime-editor-ownership.ts`
  - currently provides only binary ownership messaging
- `frontend/src/types/admin.ts`
  - already contains create and Jellyfin intake request/response types
- `frontend/src/types/anime.ts`
  - currently does not expose the persisted provenance needed by the edit route

## Main Gaps

1. Persisted provenance is not modeled cleanly enough in frontend types.
2. The edit route cannot show a trustworthy linked-source summary.
3. Existing ownership messaging is too coarse to explain mixed manual/provider state.
4. Persisted metadata refresh lacks an explicit preview/apply contract comparable to the episode sync flow.
5. Asset editing behavior needs explicit provenance semantics so manual replacement is not accidentally lost.

## Constraints

- Reuse existing storage where possible. Phase 04 should not invent a new source-of-truth model when `source` and `folder_name` already exist.
- Prefer narrow admin-only contracts over broad public model expansion unless public runtime truly needs the data.
- Follow the proven preview/apply interaction model rather than introducing implicit sync-on-open or sync-on-save.
- Keep asset scope pragmatic. Cover, banner, and backdrop provenance is useful; a generic media library is not required here.

## Planning Implications

- Split backend contract work from UI composition work so each slice has a clear verification target.
- Keep asset provenance as a dedicated plan item because it adds lifecycle rules beyond plain metadata fields.
- Require phase validation to include both automated gates and one focused edit-route smoke pass.

## Asset Persistence Direction

The phase discussion locked a stronger direction than the initial draft:

- anime image assets must move to a DB-backed persistence model
- covered persisted slots are `cover`, `banner`, and `backgrounds`
- `banner` and `backgrounds` ship together in the persistence slice
- background/theme videos remain Jellyfin-only and are explicitly excluded from local persistence

This means the implementation should not stop at preview copy or provider URL exposure. It needs a real local source-of-truth for persisted anime image assets with ownership semantics.

## Reuse And Limits From Existing Media Patterns

- Fansub media already proves the `media_assets` + entity reference pattern for single-slot logo/banner assignment.
- That pattern is reusable for anime `cover` and likely `banner`, but not sufficient by itself for ordered multi-background storage.
- Anime runtime backdrop handling already has provider fallback behavior in the public route, but it currently lacks persisted-asset precedence rules.

## Concrete Planning Consequences

- The persistence slice needs both:
  - reference-based storage for single slots like `cover` and `banner`
  - an ordered slot/link table for plural `backgrounds`
- Ownership must be explicit per slot entry:
  - `manual`
  - `provider`
- Runtime reads must prefer persisted anime assets first and only fall back to Jellyfin when a persisted slot is absent.
- Resync behavior must distinguish:
  - manual slot -> protect
  - provider slot -> refresh allowed on explicit resync
  - missing slot -> fill allowed
