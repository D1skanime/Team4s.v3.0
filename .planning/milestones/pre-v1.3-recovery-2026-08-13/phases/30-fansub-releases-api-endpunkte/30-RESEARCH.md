# Phase 30 Research: Fansub-Releases API-Endpunkte

## Objective

Plan Phase 30 so `fansub_releases` becomes an explicit admin API seam, grounded in the already-running release model, without inventing a new media path or treating schema-only tables as product truth.

## Current Code/DB Reality

### Database reality

The normalized release model already exists physically:

- `fansub_releases`
- `release_versions`
- `release_variants`
- `release_version_groups`
- supporting release/media-related tables layered around them

`fansub_releases` is not isolated.
It is already the root release anchor underneath:

- episode linkage
- version rows
- variant rows
- group participation
- release-bound theme assets

### Backend reality

The backend already uses `fansub_releases` in production-oriented repository code:

- `backend/internal/repository/episode_version_repository.go`
  - creates releases as part of episode-version create
  - updates release source metadata during version patch
  - deletes empty releases when the last dependent version disappears
- `backend/internal/repository/admin_content_anime_themes.go`
  - resolves canonical `fansub + anime` release anchors
  - lists release theme assets
  - uploads/deletes release theme assets
- `backend/internal/repository/group_repository.go`
  - reads release-backed group statistics and release lists

Important finding:

- there is already meaningful repository behavior around releases
- but there is no dedicated admin release resource contract that exposes this behavior directly

### Handler/API reality

The admin router currently exposes release-adjacent APIs, but not a general fansub-release resource:

- `GET /admin/releases/:releaseId/theme-assets`
- `DELETE /admin/releases/:releaseId/theme-assets/:themeId/:mediaId`
- `GET /admin/fansubs/:id/anime`
- `GET /admin/fansubs/:id/anime/:animeId/theme-assets`
- episode-version CRUD endpoints that create/update/delete release internals indirectly

What is missing is a clean release API such as:

- resolve/list releases for a `fansub + anime` scope
- fetch a release summary directly by `releaseId`
- patch release-level metadata directly where that is product-safe

### Frontend reality

The current fansub edit flow already depends on release anchors indirectly.

`ReleaseThemeAssetsSection` on the fansub edit page:

- loads theme assets via `/admin/fansubs/:id/anime/:animeId/theme-assets`
- receives `release_id` as helper metadata
- uses that discovered ID for later delete operations

This proves a real product need:

- the UI needs release identity
- but the current contract hides that identity inside a theme-assets helper response instead of a release API

### Relation/media seam reality

Three release-adjacent facts are now important planning guardrails:

1. `anime_fansub_groups` is active product wiring.
   - It is a safe scope seam for querying releases by `anime + fansub`.

2. `media_assets` is active product wiring.
   - Release theme videos and other admin-managed assets already use this seam.

3. `fansub_group_media` is not the active fansub-media seam.
   - It exists in schema and some generic media repository helpers, but it is not the actual authoritative path for current fansub admin media behavior.

Planning implication:

- Phase 30 must not misread `fansub_group_media` existence as proof that release/fansub media should be routed through it.

## Key Findings

### 1. Releases are already product-real, just not API-first

This is the core finding.
`fansub_releases` is already used by code that matters, especially:

- episode-version persistence
- fansub-theme asset anchoring
- group/anime release reads

Planning implication:

- Phase 30 should expose an explicit admin resource for releases
- not invent release meaning from scratch

### 2. Theme-assets currently double as hidden release discovery

The current fansub edit flow gets `release_id` as a side effect of loading theme assets.
That makes the UI workable, but the seam is wrong.

Planning implication:

- release discovery must move into an explicit release endpoint
- theme-asset endpoints should remain about theme assets only

### 3. A release should not be freely creatable as an empty shell

The current repository behavior strongly suggests that a release becomes meaningful only together with:

- an episode anchor
- at least one release version / variant context
- group membership and/or stream context

Planning implication:

- do not plan standalone blank release creation as the first API surface
- keep create/delete controlled through the existing episode-version lifecycle unless a later phase proves otherwise

### 4. `anime_fansub_groups` is the correct scoping seam

The audit already confirmed that `anime_fansub_groups` is fully wired in code.
That gives Phase 30 a stable way to answer:

- which anime a fansub works on
- which release anchor belongs to a fansub-anime context

Planning implication:

- release lookup endpoints should use fansub+anime scope confidently

### 5. `media_assets` is the real media seam; `fansub_group_media` is not

Release theme videos already use `media_assets`.
The current product does not rely on `fansub_group_media` for active fansub-media behavior.

Planning implication:

- Phase 30 must keep release/media work on the existing `media_assets` seam
- it must explicitly avoid deepening `fansub_group_media` as if it were current product truth

## Recommended Canonical Shape

### Canonical read seams

Phase 30 should expose at least these admin release reads:

- release resolution for `fansub + anime`
- direct release fetch by `releaseId`
- release collections scoped to a `fansub + anime` context where more than one release may exist

### Canonical release payload

A release-facing DTO should make these concerns visible:

- `release_id`
- anime identity
- fansub/group context
- episode anchor
- source/provider metadata
- release date if available
- version/variant counts or summaries
- whether theme assets exist

The payload should be enough for admin UIs to understand "what release am I touching?" without first loading another entity.

### Controlled write boundary

Safe first-write scope for this phase:

- patch release-level metadata that already lives on `fansub_releases` or tightly adjacent tables

Out of scope for this phase:

- create naked releases directly
- delete releases independently of dependent versions/variants

## Recommended Plan Shape

### Slice 1: backend contract and explicit read/resolve endpoints

Files that matter immediately:

- `backend/cmd/server/admin_routes.go`
- `backend/internal/handlers/admin_content_handler.go`
- `backend/internal/handlers/admin_content_release_theme_assets.go`
- `backend/internal/models/*release*.go`
- `backend/internal/repository/admin_content_anime_themes.go`

Expected work:

- add explicit admin release DTOs
- add repository methods for release summary / scoped release resolution
- add handlers/routes such as:
  - `GET /admin/fansubs/:id/anime/:animeId/releases`
  - `GET /admin/fansubs/:id/anime/:animeId/releases/canonical`
  - `GET /admin/releases/:releaseId`

### Slice 2: controlled release metadata patch seam

Files that matter immediately:

- `backend/internal/handlers/*release*.go`
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/admin_content_anime_themes.go`
- `backend/internal/models/*release*.go`

Expected work:

- extract or add a safe repository seam for release-level metadata patching
- expose a dedicated admin route such as `PATCH /admin/releases/:releaseId`
- keep writes limited to fields that truly belong at release scope
- avoid opening free create/delete of empty releases

### Slice 3: frontend adoption, docs, and verification

Files that matter immediately:

- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
- `docs/architecture/*.md`
- verification/handoff docs

Expected work:

- stop using theme-assets responses as the hidden release-discovery seam
- use explicit release endpoints for release identity/context
- document that `media_assets` is the active release-media seam
- document that `fansub_group_media` remains schema-only / non-authoritative here

## Validation Architecture

### Automated checks needed

- `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm.cmd run build`

### Manual checks needed

- open a fansub edit page with theme assets and confirm the UI can load release context through the explicit release seam
- verify a fansub-anime pair with no canonical release returns a clear empty/not-found state instead of leaking through theme-assets behavior
- verify release theme asset upload/delete still works after the UI stops depending on helper-only release discovery

## Common Pitfalls

- treating `fansub_releases` like a fully independent CRUD root when current product behavior ties it to versions/variants
- keeping `release_id` discovery hidden inside theme-asset responses even after adding release endpoints
- accidentally routing release/fansub media planning through `fansub_group_media`
- exposing write operations on fields that really belong to `release_versions` or `release_variants`
- assuming one fansub-anime pair can never need more than one release-facing response shape

## Don't Hand-Roll

- do not invent a new release-media join model for this phase
- do not model release discovery as another "helper-only" side effect response
- do not add blank `POST /admin/releases` without a proven product need
- do not make `fansub_group_media` the implied source of truth for release/fansub media behavior

## Code References

- `backend/cmd/server/admin_routes.go`
- `backend/internal/handlers/admin_content_handler.go`
- `backend/internal/handlers/admin_content_release_theme_assets.go`
- `backend/internal/repository/admin_content_anime_themes.go`
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/group_repository.go`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
- `frontend/src/lib/api.ts`
- `database/migrations/0035_add_release_tables.up.sql`
- `database/migrations/0037_add_release_decomposition_tables.up.sql`

## Bottom Line

Phase 30 should not "introduce" releases.
Releases already exist and already matter.

The real work is:

- exposing them as explicit admin APIs
- removing hidden release discovery from theme-asset helpers
- reusing `anime_fansub_groups` as the real scoping seam
- staying on `media_assets` for release-adjacent media
- and explicitly not mistaking `fansub_group_media` table existence for active product truth
