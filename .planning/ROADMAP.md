# Roadmap: Team4s Admin Anime Intake

## Milestones

> Current planning note: Phase 21 is now complete; Phase 22 is the next slice to replace the stale anime edit UI with a create-flow-based editing surface.

- [x] **v1.0 Admin Anime Intake** - Phases 1, 2, 3, 4.1, 4, and 5 shipped on 2026-04-01. Details: [v1.0-ROADMAP.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Asset Lifecycle Hardening** - Phases 6 through 16 are complete or verified, and Phase 17 is the current next slice for the `/admin/anime/create` UX/UI follow-through. (completed 2026-04-17)

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
- [x] **Phase 17: Anime Create UX/UI Follow-Through** - Rework `/admin/anime/create` to follow the finalized Phase-14 UX contract: AniSearch as metadata source, Jellyfin as source/folder matcher first, and asset suggestions only after explicit Jellyfin adoption. (completed 2026-04-17)

- [x] **Phase 18: Episode Import And Mapping Builder** - Add AniSearch canonical episode import, Jellyfin media scanning, and manual mapping/apply baseline.
- [x] **Phase 19: Episode Import Operator Workbench** - Make the import workbench readable and practical for real parallel releases and bulk confirmation.
- [x] **Phase 20.1: DB Schema v2 Physical Cutover** - Build the documented DB Schema v2 as real tables and remove legacy episode-version tables before more episode features.
- [x] **Phase 20: Release-Native Episode Import Schema** - Move episode import persistence onto the normalized release graph with filler, multilingual titles, and multi-episode file coverage. (verified complete 2026-04-23)
- [x] **Phase 21: Fansub Group Chips And Collaboration Wiring** - Let operators select existing or new fansub groups as chips during import/manual version work, and build deterministic collaborations plus anime-group linkage behind that UI. (completed 2026-04-23)
- [x] **Phase 22: Anime Edit On Create-Flow Foundation** - Replace the divergent anime edit workspace with a shared create-style editor, keeping AniSearch identity fixed while Jellyfin can be re-searched and re-synced. (code verified complete 2026-05-10)
- [x] **Phase 23: OP/ED Theme Verwaltung** - Admins können Opening- und Ending-Themes pro Anime anlegen, Episodenbereiche definieren, theme_types seeden, und Fansub-Gruppen können OP/ED-Videos hochladen. (Foundation durch Phasen 24–28 überholt und vollständig ersetzt; Unit-Tests 2026-05-11)
- [x] **Phase 24: Release-Segmente (OP/ED Timing)** - Admins können auf der Episode-Version-Edit-Seite OP/ED-Segmente (Typ, Name, Episodenbereich, Zeitbereich im Video, Jellyfin-Quelle) pro Fansub-Gruppe und Version verwalten. UI wie Mockup: Tab "Segmente" mit Tabelle, Seitenleisten-Formular und Timeline-Visualisierung. (UAT bestanden 2026-04-26)
- [x] **Phase 25: Segmente UI Mockup-Alignment** - Segmente-Seite vollständig an Mockup angeglichen: Breadcrumb-Navigation, 5-Tab-Layout, Typ-Badge mit Kurzcode, Zeitbereich mit Dauer in Klammern, Vorschläge-Leiste aus anderen Releases, dual-Spur-Timeline mit Hauptinhalt-Label, expliziter Source-Type-Selector. (UAT bestanden 2026-04-27)
- [x] **Phase 26: Segment Source Asset Upload And Persistence** - Segmente koennen echte Team4s-Assets als Quelle hinterlegen: Upload, benannter Zielpfad, Asset-Referenz am Segment und kontrolliertes Entfernen ohne Playback-Pflicht. (implementiert 2026-04-28)
- [x] **Phase 27: Segment Library Identity And Reuse** - Segmentdateien werden fachlich ueber stabile Anime-/Gruppen-Identitaet statt lokaler Anime-IDs verwaltet, koennen nach Reimport wiedergefunden werden, und Anime-Delete entkoppelt nur noch statt wiederverwendbare OP/ED-Assets blind zu vernichten. (implementiert und UAT bestanden 2026-04-28)
- [x] **Phase 28: Segment Playback Sources From Jellyfin Runtime** - Segmente nutzen standardmaessig die aktuelle Episode-Version bzw. deren Jellyfin-Stream als Playback-Quelle, respektieren reale `release_variants.duration_seconds` Laufzeitgrenzen wenn vorhanden, und behalten Upload-Dateien nur als expliziten Fallback. (live UAT bestanden 2026-04-29)
- [x] **Phase 30: Fansub-Releases API-Endpunkte** - Explizite Admin-Endpunkte fuer Fansub-Releases, kanonischer Release-Anker, Release-Kontext-API fuer Theme-Asset-Flow. (UAT bestanden 2026-05-11)
- [x] **Phase 31: UI Umbau fuer Fansub-Releases und Theme-Kontext** - Fansub-Edit Anime & Releases Tab mit ausklappbaren Release-Zeilen, Theme-/Segment-Kontext im aufgeklappten Release, release-spezifische Bearbeitung. (UAT bestanden 2026-05-11)
- [x] **Phase 32: Fansub Release Side Drawer** - Rechter Side-Drawer fuer Release-Theme-Asset-Upload und -Verwaltung ueber bestehende release_theme_assets/media_assets Seams ohne neue DB-Tabellen. (UAT bestanden 2026-04-30)
- [x] **Phase 33: Release-Theme-Asset size_bytes Persistence Fix** - InsertMediaFile nach CreateMediaAsset in beiden Upload-Handlern, Rollback bei Fehler. (implementiert 2026-05-07)
- [x] **Phase 34: Release-Version Media Schema Foundation** - Migration 0059: release_version_media Tabelle, status-Spalten in media_assets/media_files, Constraints und Indexe. (implementiert 2026-05-01)
- [x] **Phase 35: Release-Version Media Backend Upload Service und API** - Go-Backend mit govips-Thumbnail, GIF-Sonderfall, DB-Transaktion/Rollback, alle 5 Admin-API-Endpunkte. (UAT bestanden 2026-05-11)
- [x] **Phase 36: Release-Version Media Frontend Upload UI und Galerie** - Kategorie-zuerst-Upload, Per-File-Progress, Preview-Schalter, kategorisierte Galerie, Detail-Panel, Drawer-Summary. (UAT bestanden 2026-05-11)
- [x] **Phase 37: Release-Version Media Cleanup Job und Tests** - Periodischer Cleanup-Worker, Backend- und Frontend-Regressionstests. (Tests gruen 2026-05-11)
- [x] **Phase 38: Release-Version Media Gallery UX Hover-Preview und Drag-and-Drop-Reorder** - Floating Preview Card, GIF src-Swap, DnD-Reorder innerhalb Kategorie, Live-Re-Sort-Fix. (UAT bestanden 2026-04-30)
- [x] **Phase 39: Deutsche Umlaute durchgängig korrigieren** - Alle user-sichtbaren deutschen Texte im Frontend und Backend auf korrekte Umlaute umgestellt. CLAUDE.md + AGENTS.md Regel verankert.
- [ ] **Phase 40: Text- und Notizsystem für Fansub-Plattform** - Fansub-Gruppen-Texte, Member-Geschichten, Fansubprojekt-Texte, Release-Version-Notizen mit Rollenmodell und Public-Darstellung.

- [x] **Phase 29: Fansub Group Model Normalization And Generic Links** - Fansub-Gruppen werden auf ein kanonisches Profilmodell mit generischen `fansub_group_links` ausgerichtet, Kollaborationen werden explizit administrierbar, und Legacy-Doppelfelder erhalten einen klaren Cleanup-Pfad. (SC1/SC2/SC4/SC5 UAT bestanden 2026-05-11; SC3 Collaboration-Workflow als impraktikabel eingestuft, wird durch Phase 39 ersetzt)

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
**Goal:** Admins können Opening- und Ending-Themes pro Anime anlegen, Episodenbereiche definieren (z.B. OP1 läuft Episode 1–25), theme_types seeden (OP1, OP2, ED1, ED2, Insert, Outro), und Fansub-Gruppen können OP/ED-Videos zu ihren Releases hochladen.
**Requirements**: P23-SC1, P23-SC2, P23-SC3, P23-SC4
**Depends on:** Phase 22
**Plans:** 4/4 plans complete
**Status:** superseded-complete 2026-05-11 — UAT nicht separat durchgeführt, Substanz durch Phasen 24–28 UAT-Sessions bestätigt
Plans:
- [x] `23-01-PLAN.md` -- Migration 0048 + Backend CRUD fuer Anime-Themes (5 Endpunkte)
- [x] `23-02-PLAN.md` -- Backend Segment-CRUD (3 Endpunkte) + Frontend AnimeThemesSection auf Edit-Seite
- [x] `23-03-PLAN.md` -- Backend release_theme_assets (Video-Upload + Theme-Zuweisung) + Frontend Fansub-Edit-Seite Upload-UI
- [x] `23-04-PLAN.md` -- Unit-Tests (11/11 grün), Verification, Phase-Close
**Success Criteria** (what must be TRUE):
  1. Admin kann auf der Anime-Edit-Seite OP/ED-Themes anlegen, bearbeiten und löschen.
  2. Pro Theme kann ein Episodenbereich (von Episode X bis Episode Y) definiert werden.
  3. theme_types sind geseedet (OP1, OP2, ED1, ED2, Insert, Outro) und auswählbar.
  4. Bestehende Themes werden beim Öffnen der Edit-Seite korrekt geladen und angezeigt.

### Phase 24: Release-Segmente (OP/ED Timing)
**Goal:** Admins können auf der Episode-Version-Edit-Seite OP/ED-Segmente für eine Fansub-Gruppe und Version verwalten: Typ (OP/ED/IN/PV), Name, Episodenbereich (plain integers), Zeitbereich im Video (HH:MM:SS), optionale Jellyfin-Quelle. Migration: theme_segments um fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id erweitern. UI wie Mockup: Tab "Segmente" mit Tabelle (Typ-Badges), Seitenleisten-Formular und Timeline-Visualisierung.
**Requirements**: P24-SC1, P24-SC2, P24-SC3, P24-SC4
**Depends on:** Phase 23
**Status**: UAT bestanden 2026-04-26; alle 4 Success Criteria auf live Docker-Umgebung bestätigt
**Plans:** 3/3 plans complete
Plans:
- [x] `24-01-PLAN.md` -- Migration 0049 + Backend Segment-CRUD (4 Endpunkte, alte FK-Handler ersetzen)
- [x] `24-02-PLAN.md` -- Frontend Typen/API-Helpers + useReleaseSegments Hook + SegmenteTab Komponente + Tab-Integration
- [x] `24-03-PLAN.md` -- Verification, Backend-Smoke-Tests, Human UAT
**Success Criteria** (what must be TRUE):
  1. Admin sieht auf `/admin/episode-versions/:id/edit` einen Tab "Segmente" mit Tabelle (Typ-Badge, Name, Episodenbereich, Zeitbereich, Quelle) und Aktions-Buttons.
  2. Segmente können angelegt, bearbeitet und gelöscht werden; Episodenbereich sind plain integers (keine FK auf episodes).
  3. Die Timeline-Vorschau zeigt Segmente als farbige Blöcke proportional zum Zeitbereich.
  4. Query-Seam für Playback: `WHERE series = (anime, group, version) AND episode BETWEEN start AND end` liefert korrekte Segmente.

### Phase 25: Segmente UI Mockup-Alignment
**Goal:** Die Segmente-Verwaltungsseite auf der Episode-Version-Edit-Seite wird vollständig an das Mockup angeglichen — mit Breadcrumb-Navigation, 5-Tab-Layout, poliertem Typ-Dropdown, Vorschläge-System, verbesserter Timeline und eingebettetem Video-Vorschau-Player.
**Requirements**: P25-SC1, P25-SC2, P25-SC3, P25-SC4, P25-SC5
**Depends on:** Phase 24
**Success Criteria** (what must be TRUE):
  1. Breadcrumb zeigt "Anime › [Name] › Episode [N] › [Gruppe] v[X]" und alle Links funktionieren.
  2. Seite hat 5 Tabs (Übersicht, Dateien, Informationen, Segmente, Changelog); Segmente-Tab zeigt die Tabelle mit Typ-Badge "Opening (OP)", Dauer in Klammern und Quelle mit Jellyfin-Icon.
  3. Vorschläge-Leiste erscheint wenn andere Releases desselben Anime Segmente haben; "Übernehmen"-Button kopiert das Segment in die aktuelle Release-Version.
  4. Timeline zeigt Hauptinhalt-Label zwischen OP und ED, Insert Songs erscheinen als schwebendes Element oberhalb der Hauptlinie.
  5. Formular-Seitenleiste hat Jellyfin-Item-Suche (klickbar, zeigt Suchergebnisse) und einen eingebetteten Video-Vorschau-Player der das ausgewählte Item abspielt.
**Plans:** 3/3 plans complete
Plans:
- [x] `25-01-PLAN.md` — Backend: Vorschlaege-Endpunkt + Jellyfin-Item-Suche
- [x] `25-02-PLAN.md` — Frontend: Breadcrumb, 5 Tabs, SegmenteTab-Verbesserungen, JellyfinItemPicker
- [x] `25-03-PLAN.md` — Tests + UAT

### Phase 26: Segment Source Asset Upload And Persistence
**Goal:** Segmente erhalten echte Team4s-Asset-Quellen statt nur symbolischer Source-Typen: Admins koennen Segment-Dateien hochladen, kontrolliert benennen, unter einem deterministischen Team4s-Pfad speichern und dem Segment als `release_asset` zuordnen. Playback bleibt ausser Scope.
**Requirements**: P26-SC1, P26-SC2, P26-SC3, P26-SC4, P26-SC5
**Depends on:** Phase 25
**Success Criteria** (what must be TRUE):
  1. Ein Segment kann im Episode-Version-Kontext eine echte Asset-Datei als Quelle erhalten, ohne dass dafuer Playback oder Jellyfin noetig ist.
  2. Der Upload nutzt die bestehende Team4s-Media-Seam und speichert Dateien unter einem deterministischen Pfad auf Basis von Anime, Fansub, Version und Segment-Typ.
  3. Das Segment speichert die Asset-Referenz autoritativ als `source_type=release_asset` plus lesbare Label-/Ref-Daten.
  4. Bereits hinterlegte Segment-Assets koennen sichtbar gemacht und kontrolliert wieder entfernt werden, inklusive Dateisystem-/DB-Aufraeumen ueber die bestehende projektkontrollierte Upload-Loesch-Seam.
  5. Die Umsetzung bleibt rechtebereit fuer spaetere Fansub-Selbstpflege: Upload-/Link-Logik ist release-/gruppenkontextbezogen und nicht an eine breite Fansub-Stammdaten-Seite gebunden.
**Plans:** 2/3 plans executed
Plans:
- [ ] `26-01-PLAN.md` - Backend-Segment-Asset-Contract, Zielpfadgenerator und Upload-/Delete-Verdrahtung auf die bestehende Media-Seam.
- [ ] `26-02-PLAN.md` - Segment-Editor-UI fuer Asset-Upload, Anzeigename/Dateiname, vorhandene Asset-Auswahl und Entfernen im Episode-Version-Kontext.
- [ ] `26-03-PLAN.md` - Verifikation, Docker-Live-Test und Rechte-/Handoff-Notizen fuer spaetere Fansub-Selbstpflege.

### Phase 27: Segment Library Identity And Reuse
**Goal:** Segment-Definitionen und ihre Assets werden an stabile fachliche Identitaet gebunden, damit OP/ED-Dateien nach Anime-Reimport oder lokaler Neuanlage wiederverwendbar bleiben und Delete-Workflows nur ungenutzte oder ausdruecklich lokale Reste vernichten.
**Requirements**: P27-SC1, P27-SC2, P27-SC3, P27-SC4, P27-SC5
**Depends on:** Phase 26
**Success Criteria** (what must be TRUE):
  1. Ein Segment wird fachlich ueber stabile Identitaet gefunden: AniSearch-Quelle plus AniSearch-ID fuer den Anime, Fansub-Gruppe, Segment-Typ und optionalen Segmentnamen; die lokale `anime.id` ist nicht mehr die einzige Wiederfindungsachse.
  2. Ein Admin kann fuer dieselbe fachliche Segmentidentitaet entweder ein bestehendes Asset wiederzuordnen oder ein neues Asset hochladen, ohne bewusst doppelte OP/ED-Dateien fuer denselben Anime/Gruppenkontext erzeugen zu muessen.
  3. Wenn ein lokaler Anime geloescht und spaeter ueber dieselbe AniSearch-Identitaet neu angelegt oder reimportiert wird, bleiben wiederverwendbare Segmentdefinitionen und Segment-Assets auffindbar und koennen erneut zugeordnet werden.
  4. Anime-Delete loescht wiederverwendbare Segmentbibliotheksdaten nicht blind mit; stattdessen wird zwischen lokaler Entkopplung und echtem Asset-/Definition-Cleanup unterschieden.
  5. Die UI macht klar, ob ein Segment-Asset neu hochgeladen, aus der Bibliothek wiederverwendet oder nur lokal verknuepft ist, inklusive nachvollziehbarer Provenance-Daten fuer spaetere Fansub-Selbstpflege.
**Plans:** 0/3 plans complete
Plans:
- [ ] `27-01-PLAN.md` - Datenmodell, Delete-Grenzen und Migrationspfad fuer fachlich stabile Segmentdefinitionen und wiederverwendbare Asset-Zuordnung.
- [ ] `27-02-PLAN.md` - Backend- und Query-Seams fuer Reuse, Wiederanbindung per AniSearch-ID und kontrollierte Cleanup-Regeln.
- [ ] `27-03-PLAN.md` - Admin-UX fuer Upload-vs-Reuse, Provenance-Anzeige und Live-Verifikation auf Reimport-/Delete-Szenarien.

### Phase 22: Anime Edit On Create-Flow Foundation
**Goal:** Replace the stale, divergent anime edit route with a create-flow-based editor that reuses the modern admin anime workspace while preserving edit-specific identity rules.
**Requirements**: P22-SC1, P22-SC2, P22-SC3, P22-SC4, P22-SC5
**Depends on:** Phase 21
**Status**: Complete — SharedAnimeEditorWorkspace + AnimeEditorShell used by both create and edit routes. Code verified 2026-05-10.
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
| v1.1 Asset Lifecycle Hardening | 21 | 44+ | Phases 6-21 complete; Phase 22 edit unification, Phase 23 OP/ED-Verwaltung, Phase 24 Release-Segmente geplant | - |

### Phase 28: Segment Playback Sources From Jellyfin Runtime — Segmente nutzen standardmaessig Episode-Version/Jellyfin-Stream als Playback-Quelle, Zeitgrenzen kommen aus release_variants.duration_seconds, Upload bleibt optionaler Fallback

**Goal:** Segmente auf der Episode-Version-Edit-Seite standardmaessig gegen den aktuellen Release-Variant-/Jellyfin-Stream aufloesen, reale Laufzeitgrenzen aus `release_variants.duration_seconds` nutzen und hochgeladene Segmentdateien als expliziten Fallback statt als stillen Default behandeln.
**Requirements**: P28-SC1, P28-SC2, P28-SC3, P28-SC4, P28-SC5
**Depends on:** Phase 27
**Status**: Live UAT bestanden am 2026-04-29; Phase aus verified baseline geschlossen
**Plans:** 3/3 plans complete

Plans:
- [x] `28-01-PLAN.md` - Backend playback-resolution contract, current release-variant snapshot joins, and runtime-aware validation.
- [x] `28-02-PLAN.md` - Frontend segment editor and API contract for default episode-version playback, explicit upload fallback, and runtime-aware UX.
- [x] `28-03-PLAN.md` - Verification and live UAT for runtime-known, runtime-null, and fallback-preservation paths.
**Success Criteria** (what must be TRUE):
  1. Ein Segment kann auf `/admin/episode-versions/:id/edit` ohne vorherigen Upload gespeichert werden, und die aufgeloeste Playback-Quelle zeigt standardmaessig auf die aktuelle Episode-Version bzw. deren Jellyfin-Stream.
  2. `theme_segment_playback_sources` speichert fuer diesen Default-Pfad die aktuelle `playback_release_variant_id`, Jellyfin-Identitaet und Offset-/Dauer-Felder autoritativ aus dem aktuellen Editor-Kontext.
  3. Wenn `release_variants.duration_seconds` bekannt ist, verhindern Frontend und Backend gemeinsam, dass `end_time` ueber die reale Laufzeit hinaus gespeichert wird; wenn die Runtime `NULL` ist, bleibt Segmentbearbeitung weiter moeglich.
  4. Hochgeladene Segmentdateien bleiben erhalten, werden aber nur durch explizite Operator-Entscheidung zur aktiven Fallback-Playback-Quelle und ersetzen den Episode-Version-Default nicht stillschweigend.
  5. Verifikation deckt mindestens einen runtime-bekannten Pfad, einen runtime-null Pfad und den expliziten Upload-Fallback mit API- oder SQL-Evidenz ab.

### Phase 29: Fansub Group Model Normalization And Generic Links

**Goal:** Fansub-Gruppen fachlich auf ein kanonisches Profilmodell konsolidieren, generische Community-Links ueber `fansub_group_links` statt fester Einzelspalten verwalten, Kollaborationen explizit administrierbar machen, und Legacy-Doppelfelder kontrolliert in einen Cleanup-Pfad ueberfuehren.
**Requirements**: P29-SC1, P29-SC2, P29-SC3, P29-SC4, P29-SC5
**Depends on:** Phase 28
**Status**: UAT bestanden 2026-05-11; SC3 als impraktikabel eingestuft und an Phase 39 delegiert
**Plans:** implementiert ohne formale PLAN.md-Dateien (Code bereits live)

**Success Criteria** (what must be TRUE):
  1. Fansub-CRUD arbeitet fachlich auf einem kanonischen Gruppenprofil und fuehrt keine neuen Produktabhaengigkeiten auf `closed_year`, `history_description` oder Alias-`group_id` ein.
  2. Community-Links werden autoritativ ueber `fansub_group_links` mit `link_type` verwaltet und unterstuetzen mindestens `website`, `discord`, `twitter`, `github` und `irc`.
  3. Kollaborationsgruppen (`group_type='collaboration'`) koennen im Admin explizit mit ihren Mitgliedsgruppen gepflegt werden, statt nur indirekt durch Import-/Version-Wiring zu existieren.
  4. Die Fansub-Create/Edit-Oberflaechen koennen generische Linkzeilen anzeigen, hinzufuegen, bearbeiten und loeschen, ohne auf drei fest eingebaute Linkfelder beschraenkt zu bleiben.
  5. Legacy-Doppelfelder und Reconcile-Spalten haben einen dokumentierten, verifizierten Cleanup-Pfad, der das aktuelle Produktverhalten nicht heimlich bricht.

### Phase 30: Fansub-Releases API-Endpunkte

**Goal:** `fansub_releases` als explizite Admin-Ressource sichtbar machen, den kanonischen Release-Anker fuer `fansub + anime` direkt aufloesbar machen, und release-nahe Flows wie Theme-Assets von versteckter Release-Discovery entkoppeln.
**Requirements**: P30-SC1, P30-SC2, P30-SC3, P30-SC4, P30-SC5
**Depends on:** Phase 29
**Status**: Planned on 2026-04-30 aus Code-/DB-Audit zu Release-Ankern, `anime_fansub_groups`, `media_assets` und der nicht-aktiven `fansub_group_media`-Seam
**Plans:** 3/3 plans complete

Plans:
- [ ] `30-01-PLAN.md` - Backend-DTOs, Repository-Seams und explizite Admin-Read-/Resolve-Endpunkte fuer Fansub-Releases.
- [ ] `30-02-PLAN.md` - Frontend-Fansub-Edit und Theme-Asset-Flow auf explizite Release-Context-API umstellen statt versteckter `release_id`-Discovery.
- [ ] `30-03-PLAN.md` - Authority-Map, Media-/Scope-Grenzen, Verifikation und UAT fuer den neuen Release-API-Pfad absichern.

**Success Criteria** (what must be TRUE):
  1. Admin kann fuer eine Fansub-Anime-Kombination Releases bzw. den kanonischen Release-Anker explizit ueber einen Release-Endpunkt laden, statt ihn nur indirekt aus Theme-Asset- oder Episode-Version-Nebenpfaden zu erhalten.
  2. Die Release-API gibt einen klaren, typisierten Contract fuer Release-Identitaet, Episode-/Anime-Kontext, Gruppenbezug und zentrale Release-Metadaten zurueck.
  3. Release-nahe UIs wie der Theme-Asset-Flow beziehen `release_id` und Kontext ueber explizite Release-Endpunkte und verwenden Theme-Asset-Endpunkte nur noch fuer Theme-Assets selbst.
  4. Die Phase vertieft keine falsche Fansub-Media-Achse: release-nahe Medien bleiben auf dem aktiven `media_assets`-Seam statt `fansub_group_media` zur Produktwahrheit zu machen.
  5. Dokumentation und Verifikation halten fest, dass `anime_fansub_groups` bereits aktive Scope-Logik ist, `media_assets` die reale Media-Seam bleibt, und `fansub_group_media` hier kein autoritativer Runtime-Pfad ist.

### Phase 31: UI Umbau fuer Fansub-Releases und Theme-Kontext

**Goal:** Die Fansub-Edit-Seite wird zur nutzbaren Arbeitsflaeche fuer Anime-Releases: Releases werden im Tab `Anime & Releases` ausklappbar, zeigen ihren Theme-/Segment-Kontext direkt im Release, und fuehren in eine release-spezifische Bearbeitung fuer fehlende Theme-/Segment-Assets und spaetere Prozess-Media, ohne OP/ED/Karaoke/Insert mit generischem Release-Media zu vermischen.
**Requirements**: P31-SC1, P31-SC2, P31-SC3, P31-SC4, P31-SC5
**Depends on:** Phase 30
**Status**: Planned on 2026-04-30 aus UI-Mockup und Produktentscheidung fuer ausklappbare Release-Zeilen statt globalem Release-Drawer
**Plans:** 3/3 plans executed

Plans:
- [x] `31-01-PLAN.md` - Fansub-Edit `Anime & Releases` als tabbare Release-Arbeitsflaeche mit ausklappbaren Release-Zeilen und ohne sichtbaren `Releases neu laden`-Button.
- [x] `31-02-PLAN.md` - Theme-/Segment-Kontext im ausgeklappten Release sichtbar machen, inklusive geerbter Admin-Werte, release-spezifischer Werte und klickbarer Segment-Karten.
- [x] `31-03-PLAN.md` - Release-spezifische Segment-Bearbeitung und Media-Verdrahtung vorbereiten: bestehende Theme-Asset-Flows wiederverwenden, Prozess-Media sauber auf `release_media`/`media_assets` abgrenzen, Verifikation und UAT.

**Success Criteria** (what must be TRUE):
  1. `/admin/fansubs/:id/edit` hat einen echten `Anime & Releases`-Tab, der verknuepfte Anime und ihre Releases aus den Phase-30-Endpunkten laedt und ohne separaten `Releases neu laden`-Hauptbutton bedienbar ist.
  2. Jede Release-Zeile kann aufgeklappt werden und zeigt eine kompakte, release-bezogene Arbeitsansicht statt nur Navigationslinks.
  3. Im aufgeklappten Release-Bereich werden Theme-/Segment-Karten angezeigt, die sichtbar unterscheiden, ob Daten global/admin gesetzt, fuer diese Release gesetzt oder noch fehlend sind.
  4. Klick auf ein Theme-/Segment fuehrt in eine release-spezifische Bearbeitung, die bestehende Theme-/Segment- und Release-Theme-Asset-Seams wiederverwendet, statt eine neue parallele Media-Wahrheit zu erfinden.
  5. Generisches Release-Prozess-Media bleibt fachlich getrennt von OP/ED/Karaoke/Insert: Prozessbilder, GIFs, Screenshots, Toolbilder und Notizen duerfen an `release_media`/`media_assets` haengen, waehrend Theme-Segment-Assets ueber die bestehende Theme-/Segment-Asset-Strecke laufen.

### Phase 32: Fansub Release Side Drawer aus Phase 31: Edit-Drawer fuer Release-Theme-Assets mit vorhandenen DB-Tabellen und APIs, ohne neue Datenmodelle; DB/UI-Differenzen vor Umsetzung diskutieren

**Goal:** Build the Phase 31 Fansub Release edit entry into a right Side Drawer that edits release Theme assets for the concrete selected release using existing `release_theme_assets`/`media_assets` seams, without adding new DB tables or treating `fansub_group_media` as runtime authority.
**Requirements**: TBD
**Depends on:** Phase 31
**Plans:** 2 plans (executed; human UAT pending)

Plans:
- [x] 32-01 Direct release Theme asset upload API
- [x] 32-02 Fansub Release Side Drawer UI and upload/delete wiring

**Success Criteria:**
  1. The release row `Edit` button opens a right Side Drawer; the row chevron remains the subtle preview expander.
  2. The drawer shows concrete release context without exposing Anime edit actions or making internal release IDs the primary UI label.
  3. The drawer uses existing Theme/Segment data and does not allow timeline timing edits.
  4. Missing or release-specific Theme asset slots can upload/delete through a release-scoped API writing to `release_theme_assets`.
  5. No new DB tables are added, and `fansub_group_media` is not used as authoritative release Theme media state.

### Phase 33: Release-Theme-Asset size_bytes Persistence Fix

**Goal:** Release-Theme-Asset-Uploads persistieren die tatsaechliche Dateigroesse in media_files, sodass die List-API size_bytes mit dem echten Wert zurueckgibt statt immer 0. Kein DB-Schema-Change, kein Frontend-Touch, kein Backfill.
**Requirements**: FIX-01, FIX-02, FIX-03
**Depends on:** Phase 32
**Plans:** 1/1 plans complete

Plans:
- [x] `33-01-PLAN.md` - InsertMediaFile-Methode auf MediaRepository hinzufuegen und beide Upload-Handler (fansub-Route + release-Route) nach CreateMediaAsset damit erweitern, mit Rollback bei Fehler.

**Success Criteria** (what must be TRUE):
  1. Nach einem Release-Theme-Asset-Upload gibt die List-API size_bytes mit dem echten Dateiwert zurueck statt 0.
  2. InsertMediaFile-Methode existiert auf *MediaRepository mit SQL: INSERT INTO media_files (media_id, variant, path, width, height, size) VALUES ($1, $2, $3, 0, 0, $4).
  3. Beide Handler (UploadReleaseThemeAsset und UploadReleaseThemeAssetForRelease) rufen InsertMediaFile nach CreateMediaAsset auf.
  4. Bei InsertMediaFile-Fehler erfolgt Rollback via DeleteMediaAsset + removeFileQuietly.
  5. Kein Backfill bestehender Assets (nur Testdaten betroffen), kein DB-Schema-Change.

### Phase 34: Release-Version Media — Schema Foundation

**Goal:** Datenbankgrundlage fuer das Release-Version-Media-Upload-System legen: neue release_version_media-Tabelle, status-Felder in media_assets und media_files, alle Constraints und Indexe. Kein Backend, kein Frontend in dieser Phase.
**Requirements**: RVM-SCHEMA-01
**Depends on:** Phase 33
**Plans:** 1/1 plans complete

Plans:
- [ ] `34-01-PLAN.md` — Migration 0059: CREATE TABLE release_version_media + status-Spalten in media_assets/media_files + Constraints + Indexe

**Success Criteria** (what must be TRUE):
  1. Tabelle release_version_media existiert mit: id, release_version_id (FK release_versions), media_asset_id (FK media_assets), category (CHECK IN screenshot,typesetting_karaoke,fun_outtake,other), caption, sort_order, is_preview_candidate, uploaded_by_user_id, created_at, updated_at, deleted_at, deleted_by_user_id.
  2. media_assets hat Spalte status (VARCHAR NOT NULL DEFAULT ready).
  3. media_files hat Spalte status (VARCHAR NOT NULL DEFAULT ready).
  4. Index auf release_version_media(release_version_id), (media_asset_id), (category), (deleted_at) existieren.
  5. Alle bestehenden media_assets- und media_files-Eintraege haben status=ready nach Migration.
  6. Down-Migration setzt alle Aenderungen sauber zurueck.

### Phase 35: Release-Version Media — Backend Upload Service und API

**Goal:** Go-Backend-Service fuer Release-Version-Media-Uploads implementieren: Validierung, Staging, libvips-basierte Thumbnail-Erzeugung (bimg/govips), GIF-Sonderfall, DB-Transaktion, Rollback. Alle 5 Admin-API-Endpunkte (Upload, List, Patch, Delete, Reorder). Vorerst Admin-only-Berechtigungspruefung.
**Requirements**: RVM-BACKEND-01
**Depends on:** Phase 34
**Plans:** 3/4 plans executed

Plans:
- [ ] `35-01-PLAN.md` — Dockerfile CGO-Fix + govips Dependency + vips.Startup in main.go
- [ ] `35-02-PLAN.md` — Repository-Methoden (8 Methoden auf MediaRepository fuer release_version_media CRUD)
- [ ] `35-03-PLAN.md` — Upload-Handler (POST) mit govips-Thumbnail, GIF-Sonderfall, DB-Transaktion, Rollback
- [ ] `35-04-PLAN.md` — List/Patch/Delete/Reorder-Handler + Route-Registrierung in admin_routes.go

**Success Criteria** (what must be TRUE):
  1. POST /admin/release-versions/{id}/media akzeptiert multipart/form-data mit category + files[]. Liefert pro Datei {client_file_name, status, media_asset_id, release_version_media_id, thumbnail_url} oder {status:failed, error_code}.
  2. Jede Datei wird isoliert verarbeitet — Fehler bei Datei A beeinflusst Datei B nicht.
  3. Animated-GIF-Original bleibt animiert gespeichert; Thumbnail ist statisches Frame-1-Bild via govips.
  4. Bei Fehler nach Staging: DB rollback + Staging-Dateien werden geloescht, kein status=ready entsteht.
  5. GET /admin/release-versions/{id}/media, PATCH, DELETE (soft), POST reorder existieren und antworten korrekt.
  6. Kategorie-Aenderung via PATCH ist nicht erlaubt (HTTP 422 CATEGORY_CHANGE_NOT_ALLOWED).
  7. is_preview_candidate=true wird bei category=fun_outtake oder other abgelehnt (HTTP 422 PREVIEW_NOT_ALLOWED_FOR_CATEGORY).
  8. Maximal ein aktives Vorschaubild pro release_version_id (neues Preview deaktiviert bestehendes transaktionssicher).

### Phase 36: Release-Version Media — Frontend Upload UI und Galerie

**Goal:** Release-Version-Media im bestehenden Admin-Produktfluss nutzbar machen: kompakter Einstieg im Fansub-Release-Drawer und vollstaendige Verwaltung im Release-Version-Editor (/admin/episode-versions/[versionId]/edit/) mit Kategorie-zuerst-Upload-Flow, Drag-and-Drop, Per-File-Progress, Retry und Galerie-/Detailbearbeitung.
**Requirements**: RVM-FRONTEND-01
**Depends on:** Phase 35
**Plans:** 1/4 plans executed

Plans:
- [ ] `36-01-PLAN.md` - Shared Release-Version-Media-Foundations plus kompakte Drawer-Zusammenfassung und Media/Assets-Tab im Editor verdrahten.
- [ ] `36-02-PLAN.md` - Kategorie-zuerst-Uploadflow mit Mehrfach-Upload, Per-File-Status und Retry in die vollstaendige Editor-Media-Sektion bringen.
- [ ] `36-03-PLAN.md` - Kategorisierte Galerie plus kompakte Karten und Detail-/Edit-Flaeche fuer Release-Version-Media aufbauen.
- [ ] `36-04-PLAN.md` - Frontend-Regressionen, Drawer/Editor-Verifikation und handoff-sichere UI-Abschlusspruefung fuer den Release-Version-Media-Flow abschliessen.

**Success Criteria** (what must be TRUE):
  1. /admin/fansubs/[id]/edit zeigt im Release-Drawer eine kompakte Release-Version-Media-Zusammenfassung mit klarer Aktion `Media verwalten`.
  2. /admin/episode-versions/[versionId]/edit/ zeigt einen Media/Assets Tab als vollstaendige Arbeitsflaeche.
  3. Upload-Flow: Kategorie-Dropdown zuerst, dann Datei-Auswahl/Drag-and-Drop, dann Upload-Button.
  4. Jede Datei zeigt individuellen Fortschritt, Status (ready/failed) und Retry-Button bei Fehler.
  5. Preview-Schalter ist nur bei screenshot und typesetting_karaoke sichtbar/aktiv.
  6. Galerie zeigt hochgeladene Bilder mit Thumbnail; Klick zeigt Original; Kategorien bleiben als sichtbare Abschnitte getrennt statt hinter Tabs versteckt.
  7. Caption, Sortierung und Preview-Flag sind ueber eine kompakte Detail-/Edit-Flaeche bearbeitbar statt als dichte Voll-Inline-Galerie.
  8. Delete-Aktion entfernt Asset aus der Galerie-Ansicht erst nach Backend-Erfolg (soft delete im Backend), und keine Business-Regeln werden ausschliesslich im Frontend erzwungen — Backend-Fehlercodes werden verstaendlich angezeigt.

### Phase 37: Release-Version Media — Cleanup Job und Tests

**Goal:** Periodischer Cleanup-Job fuer verwaiste Staging-Dateien, stale-processing-Assets, fehlende Dateien und Soft-Delete-physisch-Cleanup. Backend- und Frontend-Tests fuer den gesamten Upload-Flow inklusive GIF-Sonderfall und parallele Uploads.
**Requirements**: RVM-CLEANUP-01
**Depends on:** Phase 36
**Plans:** 4/4 plans complete

Plans:
- [ ] `37-01-PLAN.md` - Periodischen Cleanup-Worker fuer stale processing assets, orphan staging files, missing files und soft-deleted release-version media aufbauen.
- [ ] `37-02-PLAN.md` - Backend-Regressionstests fuer Release-Version-Media-Upload, GIF-Sonderfall, Teilerfolge und Preview-Regeln vervollstaendigen.
- [ ] `37-03-PLAN.md` - Frontend-Regressionstests fuer Kategorie-zuerst-Upload, Retry, Preview-Sichtbarkeit und Galerie-Refresh aufbauen.
- [ ] `37-04-PLAN.md` - Integrations-, Parallelitaets- und Cleanup-Verifikation zusammenziehen und als handoff-sichere Abschlusspruefung dokumentieren.

**Success Criteria** (what must be TRUE):
  1. Cleanup-Job existiert und erkennt: (a) media_assets mit status=processing aelter als N Minuten, (b) Staging-Dateien ohne DB-Eintrag, (c) media_files-Eintraege ohne physische Datei.
  2. Job setzt betroffene Assets auf status=failed und loescht Staging-Dateien physisch.
  3. Soft-deleted Assets werden nach definierter Retention physisch geloescht — nur wenn keine andere Relation dasselbe Asset referenziert.
  4. Backend-Tests decken ab: gueltiger JPEG/PNG/WebP/GIF Upload, GIF-Original animiert, GIF-Thumbnail statisch, SVG abgelehnt, falscher MIME-Type abgelehnt, zu grosse Datei abgelehnt, Preview-Regel verletzt, Teilfehler bei Mehrfach-Upload.
  5. Frontend-Tests: Kategorie-Pflicht, Per-File-Retry, Preview-Schalter-Sichtbarkeit, Galerie-Update nach Upload.

### Phase 38: Release-Version Media — Gallery UX: Hover-Preview und Drag-and-Drop-Reorder

**Goal:** Professionelle Galerie-UX fuer Release-Version-Media: Floating Preview Card beim Hover (grosses Bild + Caption, GIF-Animation via src-Swap), Drag-and-Drop-Reorder innerhalb einer Kategorie (ersetzt sort_order-Zahlenfeld), Live-Re-Sort-Bug-Fix.
**Requirements**: RVM-FRONTEND-01
**Depends on:** Phase 36, Phase 37
**Plans:** 2/2 plans complete

Plans:
- [ ] `38-01-PLAN.md` - Live-Re-Sort-Bug-Fix und Drag-and-Drop-Reorder innerhalb einer Kategorie implementieren.
- [ ] `38-02-PLAN.md` - Floating Preview Card mit Hover-Trigger und GIF-Animation via src-Swap aufbauen.

**Success Criteria** (what must be TRUE):
  1. sort_order-Zahlenfeld ist aus dem Detail-Panel entfernt; Drag-and-Drop innerhalb einer Kategorie funktioniert und persistiert die neue Reihenfolge.
  2. Nach einem sort_order-Patch sortiert sich die Galerie-Liste sofort neu ohne Reload.
  3. Hover ueber eine Galerie-Karte zeigt eine Floating Preview Card mit grossem Bild und Caption.
  4. GIF-Items zeigen beim Hover das animierte Original (original_url) statt dem statischen Thumbnail.
  5. Cross-Category-Drag ist gesperrt; die Reorder-Aktion bleibt auf die aktuelle Kategorie begrenzt.

### Phase 39: Deutsche Umlaute durchgaengig korrigieren

**Goal:** Alle user-sichtbaren deutschen Texte im Frontend (TSX/TS) und im Backend (Go-Strings) verwenden korrekte Schweizer/deutsche Standardschrift mit Umlauten (ä, ö, ü, Ä, Ö, Ü). ASCII-Ersetzungen wie ae/oe/ue in UI-Text werden eliminiert. Eine verbindliche CLAUDE.md-Regel stellt sicher dass neu geschriebener Code die Regel von Anfang an einhält.

**Scope:** Nur user-facing Strings (JSX-Text, Button-Labels, Fehlermeldungen, Toast-Nachrichten, Placeholder). Code-Bezeichner (Variablennamen, Funktionsnamen, CSS-Klassen) bleiben unveraendert.

**Depends on:** -
**Status**: Geplant 2026-05-11

Plans:
- [ ] `39-01-PLAN.md` - CLAUDE.md Regel + systematische Umlaut-Korrektur in Frontend TSX/TS user-facing Strings.
- [ ] `39-02-PLAN.md` - Umlaut-Korrektur in Go Backend String-Literals (Fehlermeldungen, Response-Texte, Toast/UI-Strings).

**Success Criteria** (what must be TRUE):
  1. Kein user-sichtbarer deutscher Text im Frontend enthaelt ae/oe/ue/ss als Umlaut-Ersatz.
  2. Kein Go-Backend-String der an den User geht enthaelt ae/oe/ue als Umlaut-Ersatz.
  3. CLAUDE.md enthaelt eine explizite Regel: Deutscher UI-Text verwendet immer korrekte Umlaute.
  4. Nach der Aenderung laufen alle bestehenden Tests weiterhin gruen.
  5. Code-Bezeichner (Variablennamen, CSS-Klassen, Funktionsnamen) sind unveraendert.

### Phase 40: Text- und Notizsystem für Fansub-Plattform

**Goal:** Ein sauberes, fachlich abgegrenztes Text-/Notizsystem für vier Ebenen: Fansub-Gruppen-Texte (fansub_group_notes), persönliche Member-Geschichten (member_group_stories), Fansubprojekt-Texte zu einem Anime (anime_fansub_project_notes) und rollenbezogene Release-Version-Notizen (release_version_notes). Vor jeder Implementierung wird die bestehende DB/API/UI-Struktur geprüft und vorhandenes wiederverwendet. Kein Doppelbau. Kein Übermodellieren. Texte in DB, nicht extern.

**Scope:** DB-Migrationen (nur wenn nötig), Go-Backend (Repository, Handler, API), Next.js-Frontend (Admin-Bereiche, Public-Darstellung). Kein Episode-Text. Kein Segment-Text. Kein fansub_group_member_notes.

**Depends on:** 39

**Status**: Geplant 2026-05-11

Plans:
- [ ] TBD — wird nach Bestandsanalyse definiert

**Success Criteria** (what must be TRUE):
  1. Bestehende DB/API/UI-Struktur wurde vor Implementierung vollständig geprüft.
  2. fansub_group_notes existiert (neu oder vorhanden) und wird für offizielle Gruppentexte verwendet.
  3. member_group_stories existiert (neu oder vorhanden) und wird für persönliche Member-Geschichten verwendet.
  4. anime_fansub_project_notes existiert (neu oder vorhanden) und wird für Fansubprojekt-Texte verwendet.
  5. release_version_notes existiert (neu oder vorhanden) und hängt an release_version_id + member_id + role_id.
  6. Pro Release-Version-Rolle werden passende Hilfetexte und Placeholder angezeigt.
  7. Public-Ausgabe zeigt nur status=published, visibility=public, deleted_at IS NULL, body nicht leer.
  8. Rollenmodell ist auf die 11 Kernrollen reduziert; alte Spezialrollen sind gemappt.
  9. Markdown/HTML wird sicher gerendert und sanitisiert.
  10. Backend-Tests und Frontend-Tests laufen grün.
