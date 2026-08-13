# Phase 13 Research: AniSearch Relation Follow-Through Repair

**Date:** 2026-04-10  
**Phase:** 13  
**Requirements:** ENR-05, ENR-10

## Research Question

What do we need to know to plan Phase 13 well so AniSearch relations loaded during create actually persist after save and operator feedback matches reality?

## Verified Starting Point

- Phase 12 is verified complete for create-side AniSearch intake, duplicate redirect, and normal create redirect.
- The create route can already load AniSearch draft data and stores a draft result in the controller.
- The backend create handler already contains best-effort follow-through code in `applyAniSearchCreateFollowThrough(...)`.
- The repository already exposes idempotent relation apply through `ApplyAdminAnimeEnrichmentRelationsDetailed(...)`.

## Key Existing Seams

### Backend

- `backend/internal/services/anime_create_enrichment.go`
  - Resolves AniSearch relations through source-first lookup with title fallback.
  - Places resolved relations into `AdminAnimeCreateDraftPayload.Relations`.
- `backend/internal/handlers/admin_content_handler.go`
  - `adminAnimeCreateRequest` already accepts `relations []models.AdminAnimeRelation`.
- `backend/internal/handlers/admin_content_anime.go`
  - `CreateAnime(...)` already calls `applyAniSearchCreateFollowThrough(c, item.ID, req.Source, req.Relations)`.
- `backend/internal/repository/anime_relations_admin.go`
  - `ApplyAdminAnimeEnrichmentRelationsDetailed(...)` already inserts with `ON CONFLICT ... DO NOTHING` and returns attempted/applied/skipped counts.

### Frontend

- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`
  - Stores the AniSearch draft result after load.
- `frontend/src/app/admin/anime/create/createPageHelpers.ts`
  - `appendCreateSourceLinkageToPayload(...)` currently appends AniSearch `source` and `folder_name`.
  - It does **not** append AniSearch `relations`.
- `frontend/src/types/admin.ts`
  - The create draft payload type already supports `relations?: AdminAnimeRelation[]`.

## Most Likely Failure Mode

The create flow appears to lose AniSearch relations at final save time:

1. AniSearch draft load resolves relations and puts them in the draft result.
2. The final create request only reattaches AniSearch provenance (`source`) and optional `folder_name`.
3. `relations` never reach `CreateAnime(...)`.
4. Backend follow-through runs with `req.Relations == nil` or empty.
5. The anime is created successfully, but relation persistence never happens.

This matches the user-observed product behavior:

- AniSearch intake works.
- Create and redirect work.
- Relations still do not actually land.

## Planning Implications

Phase 13 should stay narrow and focus on the create-save seam, not reopen Phase 12 UI work.

### In Scope

- Prove where relations are lost between draft load and final create submit.
- Ensure AniSearch-owned relations are attached to the final create payload.
- Ensure follow-through counts and warnings reflect reality.
- Add targeted regression coverage at the seam where create payload is built and where backend follow-through persists.
- Re-run focused browser/UAT checks for relation persistence after save.

### Out of Scope

- AniSearch title search or broader AniSearch UX changes.
- Edit-route redesign or relation editor redesign.
- Expanding relation taxonomy beyond the four approved labels.
- Reworking duplicate redirect or create-card layout from Phase 12.

## Recommended Plan Shape

### Wave 1

Lock the regression around the create-save seam:

- frontend helper/controller tests proving AniSearch relations are included in the final create request
- backend handler/repository tests proving follow-through writes resolved relations and reports accurate counts

### Wave 2

Repair the actual create follow-through path:

- append AniSearch relations into the final create payload
- keep `manual > AniSearch > Jellyfin` intact
- ensure backend warning/summary logic stays truthful

### Wave 3

Close operator-facing verification:

- align any summary/helper expectations if counts or warnings change
- add or update browser-UAT instructions for “AniSearch load -> save -> relation exists”

## Risk Notes

- The create route already has multiple provenance paths; Phase 13 must not break the verified duplicate redirect or create redirect behavior from Phase 12.
- The relation apply helper is idempotent, so repeated create-save retries should remain safe.
- Because the user explicitly reported that relations still do not work, browser verification must confirm actual persistence, not only response metadata.

## Canonical Files For Planning

- `backend/internal/services/anime_create_enrichment.go`
- `backend/internal/handlers/admin_content_anime.go`
- `backend/internal/handlers/admin_content_handler.go`
- `backend/internal/repository/anime_relations_admin.go`
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`
- `frontend/src/app/admin/anime/create/createPageHelpers.ts`
- `frontend/src/types/admin.ts`
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-VERIFICATION.md`
- `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-02-PLAN.md`
