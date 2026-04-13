# Roadmap: Team4s Admin Anime Intake

## Milestones

- [x] **v1.0 Admin Anime Intake** - Phases 1, 2, 3, 4.1, 4, and 5 shipped on 2026-04-01. Details: [v1.0-ROADMAP.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.0-ROADMAP.md)
- [ ] **v1.1 Asset Lifecycle Hardening** - Phases 6 through 12 are complete or verified, and Phase 13 is queued to repair AniSearch relation follow-through.

## Current Direction

v1.1 focuses on the anime manual-create and upload path first: V2-first media lifecycle behavior, consistent provisioning, and operator-safe asset handling without Jellyfin dependence.

## Phases

- [x] **Phase 6: Provisioning And Lifecycle Foundations** - Establish the anime-first V2 provisioning contract, validation, auditability, and storage-safe lifecycle rules.
- [x] **Phase 7: Generic Upload And Linking** - Build the reusable anime upload and V2 linking path for multiple asset types in manual create and edit flows.
- [x] **Phase 8: Replace/Delete Cleanup And Operator UX** - Finish anime asset replace and delete cleanup semantics and the operator-facing lifecycle controls.
- [x] **Phase 9: Controlled AniSearch ID enrichment before create with fill-only Jellysync follow-up** - Add guarded create-time AniSearch enrichment before persistence without breaking manual authority.
- [x] **Phase 10: Create Tags And Metadata Card Refactor** - Add normalized tags to anime create and refactor create metadata UI into a maintainable card-based structure.
- [x] **Phase 11: AniSearch Edit Enrichment And Relation Persistence** - Add AniSearch enrichment to the edit route and persist AniSearch relations once create metadata is stable. (executed 2026-04-09; verification gaps ENR-08 and ENR-10 closed by 11-04 and 11-05)
- [x] **Phase 12: Create AniSearch Intake Reintroduction And Draft Merge Control** - Restore AniSearch as a first-class create action, preserve `manual > AniSearch > Jellyfin`, and redirect duplicates straight to edit.
- [ ] **Phase 13: AniSearch Relation Follow-Through Repair** - Repair the still-broken AniSearch relation persistence and follow-through after the create-flow reintroduction shipped.
- [ ] **Phase 14: Create Provider Search Separation And Result Selection** - Split create-page provider search from final form data so Jellyfin and AniSearch each get their own search flow, candidate selection, and controlled data handoff.
- [x] **Phase 15: Asset-Specific Online Search And Selection For Create-Page Anime Assets** - Let admins search external asset sources per slot, review found images with source visibility, and adopt selected cover/banner/logo/background assets into the create draft without leaving the page.

## Phase Details

### Phase 6: Provisioning And Lifecycle Foundations
**Goal**: Admins can provision canonical anime media folders safely and rely on one validated V2 lifecycle contract before broader upload work begins.
**Depends on**: v1.0 shipped state
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, LIFE-02, LIFE-03, LIFE-04
**Success Criteria** (what must be TRUE):
  1. Manual anime create and upload can provision canonical anime asset folders through the V2-first lifecycle seam without Jellyfin input.
  2. Re-running provisioning is idempotent and reports whether folders already existed or were created.
  3. Unsafe anime references and unsafe paths are rejected before any filesystem mutation occurs.
  4. Lifecycle and provisioning failures return operator-usable validation and storage details and remain attributable to the acting admin.

### Phase 7: Generic Upload And Linking
**Goal**: Admins can upload and link multiple anime asset types through one reusable V2 contract instead of slot-specific special cases.
**Depends on**: Phase 6
**Requirements**: UPLD-01, UPLD-02, UPLD-03
**Status**: Verified and human-approved on 2026-04-05
**Plans**: 4 plans
Plans:
- [x] `07-01-PLAN.md` - Generalize the backend upload and link contract for all supported anime asset kinds.
- [x] `07-02-PLAN.md` - Generalize the frontend typed helpers and asset-kind mutation seam.
- [x] `07-03-PLAN.md` - Close edit-route UI reachability for `logo` and `background_video` using the existing generic seam.
- [x] `07-04-PLAN.md` - Close create-route UI reachability for staged non-cover manual uploads and linking.
**Success Criteria** (what must be TRUE):
  1. Admin can upload supported anime asset types through one generic admin upload seam.
  2. The upload seam supports at least cover, banner, logo, background, and background video.
  3. Uploaded assets are linked to the correct anime and slot through one reusable V2 persistence path.

### Phase 8: Replace/Delete Cleanup And Operator UX
**Goal**: Admins can replace or remove persisted anime assets confidently, with defined cleanup behavior and clear UI feedback.
**Depends on**: Phase 7
**Requirements**: UPLD-04, UPLD-05, LIFE-01
**Success Criteria** (what must be TRUE):
  1. Admin can replace an existing asset and immediately see the new asset as the active persisted slot value.
  2. Admin can remove an existing asset from an anime slot without damaging the owning record or leaving broken active state.
  3. Replacing or deleting an asset follows a defined cleanup rule so old files do not remain as silent orphans.

### Phase 9: Controlled AniSearch ID enrichment before create with fill-only Jellysync follow-up
**Goal**: Admins can enrich a create draft from an explicit AniSearch ID before persistence, let Jellysync fill only remaining gaps, and avoid duplicate anime creation.
**Depends on**: Phase 7
**Requirements**: ENR-01, ENR-02, ENR-03, ENR-04, ENR-05
**Status**: Verified and human-approved on 2026-04-07
**Plans**: 3 plans
Plans:
- [x] `09-01-PLAN.md` - Resolve Phase 09 requirement mapping debt and define the exact create-time enrichment contract.
- [x] `09-02-PLAN.md` - Implement the backend AniSearch fetch, rate-limit, duplicate guard, and fill-only enrichment orchestration.
- [x] `09-03-PLAN.md` - Integrate the create-form AniSearch UX, draft merge presentation, and browser verification flow.
**Success Criteria** (what must be TRUE):
  1. Admin can enter an explicit AniSearch ID, load enrichment synchronously, and review the resulting draft before saving.
  2. Manual values remain authoritative, AniSearch fills only unset metadata, and Jellysync fills only values and media still missing after AniSearch.
  3. If the AniSearch ID already belongs to an existing local anime, the create flow redirects to that anime instead of creating a duplicate.
  4. AniSearch relation imports write only resolvable local relations and skip unresolved relations without blocking create.
  5. AniSearch failures are visible to the operator but do not destroy the draft or block manual save.

### Phase 10: Create Tags And Metadata Card Refactor
**Goal**: Admins can manage tags on the anime create route through a visible metadata card, while the create-page metadata structure is refactored to stay maintainable.
**Depends on**: Phase 9
**Requirements**: TAG-01, TAG-02, TAG-03, TAG-04, TAG-05
**Status**: Executed on 2026-04-08; UAT completed on 2026-04-09 after gap closure 10-04
**Plans**: 4 plans
Plans:
- [x] `10-01-PLAN.md` - Formalize Phase 10 requirement mapping and define the shared tag endpoint contract.
- [x] `10-02-PLAN.md` - Implement normalized tag persistence, backend write semantics, and delete cleanup.
- [x] `10-03-PLAN.md` - Integrate the dedicated create tags card and refactor the create page under the line-count guardrail.
- [x] `10-04-PLAN.md` - Repair already-migrated runtimes with a forward tag migration and re-verify persisted tag create.
**Success Criteria** (what must be TRUE):
  1. The database persists create-route tags through normalized `tags` and `anime_tags` tables analogous to the existing genre model.
  2. Admin can edit tags on `/admin/anime/create` through a dedicated visible card that supports both manual entry and suggestion-based filling.
  3. Create persistence writes tags authoritatively, deduplicates normalized values, and delete cleanup removes linked tag rows correctly.
  4. The create-page metadata implementation is refactored so no single page file exceeds 700 lines after the tags work lands.
  5. New or substantially touched create metadata helpers and sections include short purpose comments explaining why they exist.

### Phase 11: AniSearch Edit Enrichment And Relation Persistence
**Goal**: Admins can run AniSearch enrichment from the edit route to update existing anime metadata, and relations scraped by AniSearch are written to the database on anime create.
**Depends on**: Phase 10
**Requirements**: ENR-06, ENR-07, ENR-08, ENR-09, ENR-10
**Wave 0 contract decisions**: Duplicate edit AniSearch IDs return `409` with redirect metadata, and persisted AniSearch provenance continues through the normal PATCH save seam as `source='anisearch:{id}'`.
**Status**: Complete on 2026-04-09; verification gaps ENR-08 and ENR-10 were closed by 11-04, 11-05, and the create-route placeholder cleanup in 11-06
**Plans**: 6 plans
Plans:
- [x] `11-01-PLAN.md` - Formalize Phase 11 requirement mapping, Wave 0 decisions, and shared AniSearch contract/test scaffolds.
- [x] `11-02-PLAN.md` - Implement backend edit AniSearch enrichment, idempotent relation apply, and persisted create-time relation follow-through.
- [x] `11-03-PLAN.md` - Integrate edit-route AniSearch UI and shared frontend helpers against the approved Phase 11 UI contract.
- [x] `11-04-PLAN.md` - Parse and surface edit-route AniSearch duplicate redirect metadata through the shared helper and edit workspace.
- [x] `11-05-PLAN.md` - Align create AniSearch summary contracts and surface follow-through warnings before redirect.
- [x] `11-06-PLAN.md` - Remove the stale create-route AniSearch placeholder and align regression and verification artifacts to the live UI.
**Success Criteria** (what must be TRUE):
  1. Admin can open an existing anime in the edit route, enter an AniSearch ID, click Load, and have metadata fields updated from AniSearch while preserving explicit field protections.
  2. Relations resolved from AniSearch during anime create are persisted to the `anime_relations` table instead of remaining draft-only data.
  3. AniSearch enrichment in the edit route follows the same source-ID-based relation resolution as the create route (`anisearch:{id}` lookup first, title fallback).

### Phase 12: Create AniSearch Intake Reintroduction And Draft Merge Control
**Goal:** Admins can explicitly load AniSearch into the create route again, keep `manual > AniSearch > Jellyfin` draft precedence in both load orders, and switch directly to edit when an AniSearch ID already belongs to an existing anime.
**Requirements**: ENR-01, ENR-02, ENR-03, ENR-04, ENR-05
**Depends on:** Phase 11
**Status**: Verified and human-approved on 2026-04-10 after gap closures 12-04 and 12-05
**Plans:** 5/5 plans complete
Plans:
- [x] `12-01-PLAN.md` - Define the create AniSearch helper/contracts and Wave 0 regression scaffolds.
- [x] `12-02-PLAN.md` - Implement AniSearch-aware create-controller precedence, duplicate redirect handling, and source ownership rules.
- [x] `12-03-PLAN.md` - Reintroduce the visible create AniSearch card above Jellyfin and verify the operator-facing status flow.
- [x] `12-04-PLAN.md` - Register the missing backend create AniSearch route and close the live 404 gap confirmed by browser UAT.
- [x] `12-05-PLAN.md` - Harden AniSearch create success handling against missing `warnings` metadata and close the save-flow crash found in browser UAT.
**Success Criteria** (what must be TRUE):
  1. AniSearch is visible again on `/admin/anime/create` as an explicit exact-ID action above Jellyfin.
  2. Create-side merge precedence remains `manual > AniSearch > Jellyfin` in both load orders.
  3. Duplicate AniSearch IDs in create redirect directly to the existing edit route.
  4. AniSearch draft-time feedback is visible, local to the create controls, and clearly unsaved.

### Phase 13: AniSearch Relation Follow-Through Repair
**Goal:** Repair AniSearch relation persistence and follow-through after create so resolvable approved relations are actually written and operator feedback matches reality.
**Requirements**: ENR-05, ENR-10
**Depends on:** Phase 12
**Plans:** 0 plans
Plans:
- [ ] TBD (run `$gsd-plan-phase 13` to break down)

### Phase 14: Create Provider Search Separation And Result Selection
**Goal:** Admins can search Jellyfin and AniSearch from separate create-page search controls, select an explicit provider result, and load that result into the draft without reusing the final title field as temporary search text.
**Requirements**: TBD
**Depends on:** Phase 13
**Plans:** 0 plans
**Success Criteria** (what must be TRUE):
  1. Jellyfin and AniSearch no longer reuse the final anime title field as shared search state on `/admin/anime/create`.
  2. Jellyfin has its own dedicated search input and result-selection flow inside the Jellyfin create surface.
  3. AniSearch keeps exact-ID entry and also supports title-based search that returns multiple selectable candidates before enrichment is loaded.
  4. Selecting a Jellyfin or AniSearch candidate writes the chosen provider data, including the resolved title, into the actual create draft only after explicit user selection.
  5. AniSearch title search avoids aggressive fan-out crawling by loading only a candidate list first and fetching full detail only for the chosen entry.
  6. The provider search UX stays visually and logically consistent, with clear source boundaries and operator-visible step transitions.

Plans:
- [ ] TBD (run `$gsd-plan-phase 14` to break down)

### Phase 15: Asset-Specific Online Search And Selection For Create-Page Anime Assets
**Goal:** Admins can search external image sources per asset slot on `/admin/anime/create`, compare found results with visible source metadata, and adopt one cover/banner/logo or multiple backgrounds into the draft while manual upload remains available.
**Requirements**: TBD
**Depends on:** Phase 14
**Status**: Executed on 2026-04-13; automated verification passed and live browser follow-up remains recommended for remote-host image adoption
**Plans:** 3/3 plans complete
**Success Criteria** (what must be TRUE):
  1. The create route keeps the current manual upload flow and adds an `Online suchen` path for at least `cover`, `banner`, `logo`, and `background`.
  2. Search results are shown in an operator-driven chooser with the asset source clearly visible on each result instead of one blind mixed image wall.
  3. Cover, banner, and logo stay single-select assets, while backgrounds support selecting more than one result before save.
  4. Asset search shows a busy/loading state during crawl work so operators can see that requests are in progress and avoid repeated clicks.
  5. The backend source strategy stays request-disciplined, uses a curated initial provider set, and does not force one external media-server taxonomy onto AniSearch-specific OVA/bonus entries.

Plans:
- [x] `15-01-PLAN.md` - Define the source matrix, asset-search contracts, and request-discipline rules before wiring crawlers.
- [x] `15-02-PLAN.md` - Implement the backend asset-search orchestrator and initial source adapters for per-slot candidate discovery.
- [x] `15-03-PLAN.md` - Add the create-page asset search dialogs, source-aware result chooser, busy states, and draft adoption flow.

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Admin Anime Intake | 6 | 23 | Complete | 2026-04-01 |
| v1.1 Asset Lifecycle Hardening | 10 | 19+ | Phases 6-15 complete, verified, or executed with targeted follow-up notes | - |
