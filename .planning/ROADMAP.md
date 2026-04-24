# Roadmap: Team4s Admin Anime Intake

## Milestones

> Current planning note: Phase 21 is now complete; Phase 22 is the next slice to replace the stale anime edit UI with a create-flow-based editing surface.

- [x] **v1.0 Admin Anime Intake** - Phases 1, 2, 3, 4.1, 4, and 5 shipped on 2026-04-01. Details: [v1.0-ROADMAP.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Asset Lifecycle Hardening** - Phases 6 through 16 are complete or verified, and Phase 17 is the current next slice for the `/admin/anime/create` UX/UI follow-through. (completed 2026-04-17)

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
- [x] **Phase 13: AniSearch Relation Follow-Through Repair** - Repair the still-broken AniSearch relation persistence and follow-through after the create-flow reintroduction shipped.
- [x] **Phase 14: Create Provider Search Separation And Result Selection** - Split create-page provider search from final form data so Jellyfin and AniSearch each get their own search flow, candidate selection, and controlled data handoff.
- [x] **Phase 15: Asset-Specific Online Search And Selection For Create-Page Anime Assets** - Let admins search external asset sources per slot, review found images with source visibility, and adopt selected cover/banner/logo/background assets into the create draft without leaving the page.
- [x] **Phase 16: Hide Already Imported AniSearch Candidates On Create** - Keep AniSearch title search on `/admin/anime/create` focused on still-creatable entries by hiding candidates whose `anisearch:{id}` source already exists locally. (completed and browser-verified 2026-04-16)
- [x] **Phase 17: Anime Create UX/UI Follow-Through** - Rework `/admin/anime/create` to follow the finalized Phase-14 UX contract: AniSearch as metadata source, Jellyfin as source/folder matcher first, and asset suggestions only after explicit Jellyfin adoption. (completed 2026-04-17)

- [x] **Phase 18: Episode Import And Mapping Builder** - Add AniSearch canonical episode import, Jellyfin media scanning, and manual mapping/apply baseline.
- [x] **Phase 19: Episode Import Operator Workbench** - Make the import workbench readable and practical for real parallel releases and bulk confirmation.
- [x] **Phase 20.1: DB Schema v2 Physical Cutover** - Build the documented DB Schema v2 as real tables and remove legacy episode-version tables before more episode features.
- [x] **Phase 20: Release-Native Episode Import Schema** - Move episode import persistence onto the normalized release graph with filler, multilingual titles, and multi-episode file coverage. (verified complete 2026-04-23)
- [x] **Phase 21: Fansub Group Chips And Collaboration Wiring** - Let operators select existing or new fansub groups as chips during import/manual version work, and build deterministic collaborations plus anime-group linkage behind that UI. (completed 2026-04-23)
- [ ] **Phase 22: Anime Edit On Create-Flow Foundation** - Replace the divergent anime edit workspace with a shared create-style editor, keeping AniSearch identity fixed while Jellyfin can be re-searched and re-synced.

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
**Status**: Implemented and closed in the active milestone baseline
**Plans:** 3/3 plans complete
Plans:
- [x] `13-01-PLAN.md` - Repair the backend AniSearch relation follow-through write path and preserve approved create-time relation semantics.
- [x] `13-02-PLAN.md` - Align create/save follow-through feedback and persistence handling with the repaired relation baseline.
- [x] `13-03-PLAN.md` - Close verification and human-UAT follow-through for repaired AniSearch create relations.

### Phase 14: Create Provider Search Separation And Result Selection
**Goal:** Admins can search Jellyfin and AniSearch from separate create-page search controls, select an explicit provider result, and load that result into the draft without reusing the final title field as temporary search text.
**Requirements**: TBD
**Depends on:** Phase 13
**Status**: Implemented; UI contract refreshed on 2026-04-16 to capture the finalized product UX for the page
**Plans:** 3/3 plans complete
**Success Criteria** (what must be TRUE):
  1. Jellyfin and AniSearch no longer reuse the final anime title field as shared search state on `/admin/anime/create`.
  2. Jellyfin has its own dedicated search input and result-selection flow inside the Jellyfin create surface.
  3. AniSearch keeps exact-ID entry and also supports title-based search that returns multiple selectable candidates before enrichment is loaded.
  4. Selecting a Jellyfin or AniSearch candidate writes the chosen provider data, including the resolved title, into the actual create draft only after explicit user selection.
  5. AniSearch title search avoids aggressive fan-out crawling by loading only a candidate list first and fetching full detail only for the chosen entry.
  6. The provider search UX stays visually and logically consistent, with clear source boundaries and operator-visible step transitions.

Plans:
- [x] `14-01-PLAN.md` - Separate provider-local search state from final create fields and define the guarded AniSearch title-search contract.
- [x] `14-02-PLAN.md` - Implement AniSearch candidate search/select plus dedicated Jellyfin search state in the create controller and API seams.
- [x] `14-03-PLAN.md` - Ship the create-page provider UI separation and operator-visible result-selection flow.

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

### Phase 16: Hide Already Imported AniSearch Candidates On Create
**Goal:** Admins using AniSearch title search on `/admin/anime/create` only see candidates that can still begin a new local draft instead of entries already owned by an existing local anime.
**Requirements**: TBD
**Depends on:** Phase 15
**Status**: Completed and browser-verified on 2026-04-16
**Plans:** 2/2 plans complete
**Success Criteria** (what must be TRUE):
  1. AniSearch title search no longer shows candidates whose `anisearch:{id}` source already belongs to a local anime.
  2. The filtering lives in the authoritative backend AniSearch search seam so every caller receives the same duplicate-safe candidate list.
  3. The create UI distinguishes between "AniSearch found no hits" and "AniSearch hits existed but were hidden because those anime are already captured locally."

Plans:
- [x] `16-01-PLAN.md` - Filter AniSearch search candidates against existing local `anisearch:{id}` ownership in the backend seam and lock that behavior in handler/service tests.
- [x] `16-02-PLAN.md` - Surface the filtered-result contract in the create AniSearch UI and add regressions for hidden duplicates plus the clarified empty-state copy.

### Phase 17: Anime Create UX/UI Follow-Through
**Goal:** Bring `/admin/anime/create` onto the finalized UX model so the page reads as one productive admin flow: `Anime finden` -> `Assets` -> `Details` -> `Pruefen & Anlegen`.
**Requirements**: TBD
**Depends on:** Phase 16
**Status**: Completed and Docker-deployed on 2026-04-18
**Success Criteria** (what must be TRUE):
  1. The page no longer implies any saveable draft concept and uses `Anime erstellen` as the single final create action.
  2. AniSearch is clearly framed and implemented as the metadata/description source for the create flow.
  3. Jellyfin search initially shows only enough source context to choose the right local folder match: name, path, and preview.
  4. Jellyfin-derived banner/logo/background/video suggestions appear only after explicit `Jellyfin uebernehmen`.
  5. All asset suggestions are reviewed in the shared asset area as visual, removable, and replaceable cards without damaging existing create/save seams.

### Phase 18: Episode Import And Mapping Builder
**Goal:** Admins can import a canonical episode list from AniSearch, scan Jellyfin files for the linked anime folder, and manually map files to one or more canonical episodes before creating episodes and episode versions.
**Requirements**: P18-SC1, P18-SC2, P18-SC3, P18-SC4, P18-SC5
**Depends on:** Phase 17
**Status**: Implemented and Docker-deployed on 2026-04-18, but live UAT remained blocked on operator-readability and real multi-release handling; follow-through continues in Phase 19
**Plans:** 4 plans
Plans:
- [x] `18-01-PLAN.md` - Establish Wave 0 contracts and red tests for canonical episodes, media candidates, mapping rows, and preview/apply behavior.
- [x] `18-02-PLAN.md` - Add authoritative `episode_version_episodes` coverage persistence while preserving `episode_versions.episode_number` compatibility.
- [x] `18-03-PLAN.md` - Implement backend AniSearch/Jellyfin preview and manual apply API contracts.
- [x] `18-04-PLAN.md` - Build the frontend mapping builder UI and episode overview entry point.
**Success Criteria** (what must be TRUE):
  1. AniSearch is the canonical source for anime episode numbers/titles instead of Jellyfin/TVDB season grouping.
  2. Jellyfin is treated as the media/file source and exposes season/episode/file candidates such as `S03E11` without redefining canonical episode numbers.
  3. The mapping preview can suggest a canonical episode number from Jellyfin season/episode data using configurable offsets or imported AniSearch episode order.
  4. Admins can manually correct mappings, including one Jellyfin file covering multiple canonical episodes such as Naruto episode 9+10.
  5. Applying the preview creates missing `episodes` and links media into `episode_versions` without overwriting existing manually curated episode data.

### Phase 19: Episode Import Operator Workbench
**Goal:** Make the episode-import flow practical for real Jellyfin libraries by showing readable file evidence, treating parallel releases as version choices instead of false conflicts, and reducing manual skip work before apply.
**Requirements**: P19-SC1, P19-SC2, P19-SC3, P19-SC4, P19-SC5
**Depends on:** Phase 18
**Status**: Planned on 2026-04-20 from blocked Phase-18 live UAT
**Success Criteria** (what must be TRUE):
  1. Mapping rows identify each Jellyfin candidate with readable file evidence such as file name and folder path instead of opaque media IDs.
  2. Multiple real releases of the same canonical episode can coexist as separate episode versions without being treated as unresolved conflicts.
  3. The operator can resolve or intentionally skip large candidate sets without repetitive one-row-at-a-time clicking for every alternate release.
  4. The import surface shows the linked AniSearch source, Jellyfin series, and folder path clearly enough to diagnose wrong linkage before apply.
  5. Live UAT can complete the import flow end-to-end on a real anime library without crashing or becoming impractical to operate.

### Phase 20.1: DB Schema v2 Physical Cutover
**Goal:** Build the full documented `docs/architecture/db-schema-v2.md` target schema as physical database tables, then remove the legacy `episode_versions` table family so future feature work cannot keep writing to the old flat episode-version model.
**Requirements**: P20.1-SC1, P20.1-SC2, P20.1-SC3, P20.1-SC4, P20.1-SC5
**Depends on:** Phase 19
**Status**: Completed and Docker-deployed on 2026-04-21; Phase 20 is unblocked for release-native import writes
**Plans:** 3/4 plans executed
Plans:
- [x] `20.1-01-PLAN.md` - Inventory live-vs-target schema, add controlled local reset, and lock the deletion boundary.
- [x] `20.1-02-PLAN.md` - Create/reconcile every documented DB Schema v2 target table, column, constraint, index, and lookup value.
- [x] `20.1-03-PLAN.md` - Drop `episode_version_episodes`, `episode_version_images`, and `episode_versions`, then remove code/test dependencies.
- [x] `20.1-04-PLAN.md` - Verify clean migration, schema audit, Docker rebuild, and handoff for Phase 20.
**Success Criteria** (what must be TRUE):
  1. A clean local DB can migrate to the full documented DB Schema v2 target.
  2. `EpisodeFillerType`, episode filler fields, and `ReleaseVariantEpisode` exist physically.
  3. Legacy `episode_version_episodes`, `episode_version_images`, and `episode_versions` are absent after migration.
  4. Backend/frontend code and tests no longer require the dropped tables.
  5. Phase 20 can start on the normalized schema without preserving old test episode data.

### Phase 20: Release-Native Episode Import Schema
**Goal:** Align episode import persistence with the normalized episode/release schema so real libraries store canonical episodes, multilingual titles, filler metadata, releases, versions, variants, streams, and multi-episode file coverage without relying on legacy `episode_versions` as the only source of truth.
**Requirements**: P20-SC1, P20-SC2, P20-SC3, P20-SC4, P20-SC5
**Depends on:** Phase 20.1
**Status**: Verified complete on 2026-04-23 with live Docker replay and normalized-table SQL evidence
**Plans:** 4/4 plans executed
Plans:
- [x] `20-01-PLAN.md` - Add the controlled local reset and missing schema pieces, including filler fields and normalized release coverage for multi-episode files.
- [x] `20-02-PLAN.md` - Move backend episode import apply to the normalized release graph and persist multilingual titles plus filler metadata.
- [x] `20-03-PLAN.md` - Expose release-native mapping fields, filler status, and multi-target correction in the operator workbench.
- [x] `20-04-PLAN.md` - Verify on a clean local Naruto import with filler, multiple releases, and combined episode coverage, then Docker-deploy.
**Success Criteria** (what must be TRUE):
  1. Local dev anime/episode/import state can be reset reproducibly before verification so old rows do not hide schema bugs.
  2. `docs/architecture/db-schema-v2.md` is treated as the canonical schema source and is updated for filler metadata plus multi-episode release coverage before migrations are written.
  3. The database contains every required normalized table/column/constraint for episodes, titles, languages, episode types, releases, versions, variants, release groups, stream sources, release streams, and filler metadata.
  4. A single real media file can cover more than one canonical episode through normalized release coverage, for example Naruto episode 9+10.
  5. Episode import apply writes the normalized release graph as the authoritative model while keeping legacy compatibility deliberate and documented.
  6. Naruto-style verification proves canonical AniSearch numbering, filler persistence, multiple releases per episode, and season-to-canonical mapping correction.

### Phase 21: Fansub Group Chips And Collaboration Wiring
**Goal:** Replace flat fansub-group text entry in episode import and manual version editing with reusable group chips, while keeping backend authority over new-group creation, deterministic collaboration building, and anime-level group linkage.
**Requirements**: P21-SC1, P21-SC2, P21-SC3, P21-SC4, P21-SC5
**Depends on:** Phase 20
**Status**: Planned on 2026-04-23 from Phase-20 follow-up discussion and live `11eyes` collaboration verification
**Plans:** 3/3 plans complete
**Success Criteria** (what must be TRUE):
  1. Episode-import mapping rows can reuse existing fansub groups through chip-style search/select instead of relying only on a flat text field.
  2. Operators can still type a new group name in the same flow, and apply persists that new group without leaving the workbench.
  3. Selecting more than one group in import or manual version editing creates or reuses one deterministic collaboration group in the backend, rather than requiring an explicit collaboration chip in the UI.
  4. Episode-level patch actions such as `Episode` and `Ab hier` copy the selected group chips as a set, not just one text string.
  5. Persisted release-version group links and `anime_fansub_groups` stay consistent with the effective group/collaboration chosen by the operator.

### Phase 23: OP/ED Theme Verwaltung
**Goal:** Admins können Opening- und Ending-Themes pro Anime anlegen, Episodenbereiche definieren (z.B. OP1 läuft Episode 1–25), und theme_types seeden (OP1, OP2, ED1, ED2, Insert, Outro).
**Requirements**: P23-SC1, P23-SC2, P23-SC3, P23-SC4
**Depends on:** Phase 22
**Plans:** 3 plans
Plans:
- [ ] `23-01-PLAN.md` -- Migration 0048 + Backend CRUD fuer Anime-Themes (5 Endpunkte)
- [ ] `23-02-PLAN.md` -- Backend Segment-CRUD (3 Endpunkte) + Frontend AnimeThemesSection
- [ ] `23-03-PLAN.md` -- Unit-Tests, Human UAT, Verification und Planning-State-Update
**Success Criteria** (what must be TRUE):
  1. Admin kann auf der Anime-Edit-Seite OP/ED-Themes anlegen, bearbeiten und löschen.
  2. Pro Theme kann ein Episodenbereich (von Episode X bis Episode Y) definiert werden.
  3. theme_types sind geseedet (OP1, OP2, ED1, ED2, Insert, Outro) und auswählbar.
  4. Bestehende Themes werden beim Öffnen der Edit-Seite korrekt geladen und angezeigt.

### Phase 22: Anime Edit On Create-Flow Foundation
**Goal:** Replace the stale, divergent anime edit route with a create-flow-based editor that reuses the modern admin anime workspace while preserving edit-specific identity rules.
**Requirements**: P22-SC1, P22-SC2, P22-SC3, P22-SC4, P22-SC5
**Depends on:** Phase 21
**Status**: Planned on 2026-04-23 from post-Phase-21 product direction
**Success Criteria** (what must be TRUE):
  1. `/admin/anime/[id]/edit` no longer uses the old standalone edit workspace and instead renders through the same core UI foundation as `/admin/anime/create`.
  2. The edit route loads existing anime data into that shared workspace so title, localized titles, type, content type, status, year, max episodes, description, genres, tags, and assets can all be reviewed and changed from one consistent surface.
  3. AniSearch identity is visible on the edit route but not freely rewritable once an anime already has an AniSearch source linked.
  4. Jellyfin linkage remains operator-controlled: admins can re-search, relink, or re-sync Jellyfin from edit without silently replacing manual values or asset choices.
  5. Legacy edit-only UI code that duplicates the old form structure is removed or reduced to thin compatibility shells so create and edit stop drifting again.

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Admin Anime Intake | 6 | 23 | Complete | 2026-04-01 |
| v1.1 Asset Lifecycle Hardening | 20 | 44+ | Phases 6-21 complete; Phase 22 edit unification und Phase 23 OP/ED-Verwaltung geplant | - |
