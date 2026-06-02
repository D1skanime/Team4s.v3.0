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
- [x] **Phase 40: Text- und Notizsystem für Fansub-Plattform** - Fansub-Gruppen-Texte, Member-Geschichten, Fansubprojekt-Texte, Release-Version-Notizen mit Rollenmodell und Public-Darstellung.
 (completed 2026-05-11)
- [x] **Phase 41: Globalen TipTap-Rich-Text-Editor einführen** - TipTap als globale Editor-Basis für alle vier Textbereiche; body_json JSONB-Speicherung, body_html für Public-Ausgabe, body_text für Suche, RichTextEditor- und RichTextRenderer-Komponenten, Backend-Validierung und HTML-Sanitizing. (runtime/artifacts retro-verified 2026-05-27)
- [ ] **Phase 42: TipTap Collaboration MVP fuer fansub_group_notes** - Echtzeit-Kollaboration nur fuer offizielle Gruppennotizen mit note-scope Dokument-ID, Presence-Basis und persistenter Save-Seam zur bestehenden `fansub_group_notes`-Struktur.
- [x] **Phase 43: MVP Auth-, User- und Fansub-Lead-Foundation mit Keycloak** - Keycloak als externer IdP im Dev-Stack, internes `app_user`-Modell, globale Plattformrollen, Fansub-Gruppenmitgliedschaften und `fansub_lead` als App-DB-Rolle statt Keycloak-Rolle. (runtime retro-verified 2026-05-27; API token boundary corrected by Phase 51)
- [x] **Phase 44: App Permission Engine fuer Fansub-, Release- und Media-Kontexte** - Zentrale kontextbasierte Permission Engine im Go-Backend, Capabilities fuer das Frontend, group-scope Rollenauswertung aus Team4s-DB und Absicherung der priorisierten Fansub-/Release-/Media-Endpunkte. (runtime retro-verified 2026-05-27)
- [x] **Phase 45: Fansub Member Management MVP** - App-user-basierte Mitglieder- und Rollenverwaltung pro Fansub-Gruppe mit Permission-Engine-Pruefung, Self-Lockout-Schutz, Audit und minimaler Admin-UI auf Capability-Basis. (runtime retro-verified 2026-05-27)
- [x] **Phase 46: Fansub Group Invitations & Join Requests MVP** - Token-basierte Gruppeneinladungen, Verwaltung offener Einladungen, Einladungsannahme fuer eingeloggte App-User und vorbereitende Join-Request-Seams auf Basis der Permission Engine. (runtime retro-verified 2026-05-27)
- [x] **Phase 47: Member Profile & Historical Identity** - Eigenes historisches Fansub-Profil mit Fansub-Name, Avatar, Bio, Member-Story, aktiver Zeit, Gruppenzugehoerigkeiten und Keycloak-Account-Link; strikt getrennt von Gruppenrollen und Keycloak-Accountdaten. Foundation retro-verifiziert am 2026-05-27; moderne Route/UX wird durch Phase 53 abgeloest.
- [x] **Phase 48: Meine Gruppen & Contributor Dashboard** - Contributor-Dashboard fuer eigene Gruppen mit sicher gescopten Schnellaktionen in bestehende Gruppen-, Release-, Media- und Description-Funktionen auf Basis der Permission Engine. Foundation retro-verifiziert am 2026-05-27; Route/Shell-Polish wird nach Phase 53 bzw. Contributor-Shell-Cleanup getragen.
- [x] **Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-Haertung** - Normale Frontend-API-Aufrufe laufen ueber einen zentralen Auth/API-Client mit Token-Besitz, Refresh, 401-Retry, Upload/XHR-Auth und tokenfreier Session-UI. (verified 2026-05-20; registered in active roadmap 2026-05-27)
- [x] **Phase 50: Platform-Admin Boundaries und Contributor Scope Governance** - Globale Admin-Flaechen werden platform-admin-only, Contributor-Kontexte bleiben capability- und permission-gescoped, und sensible Admin-Daten werden aus Contributor-Editor-Kontexten entfernt. (technical verification passed 2026-05-22; live Keycloak UAT pending)
- [x] **Phase 51: Keycloak Access-Token Resource-Server Boundary** - Keycloak/API-Auth von `id_token`-als-Team4s-Bearer auf echte API-`access_token`-Verifikation mit Team4s-API-Audience umstellen. (completed 2026-05-26)
- [x] **Phase 52: Profile Account Return Refresh Flow** - Keycloak-Accountaenderungen werden von der Profilseite aus verstaendlich in einem neuen Tab angestossen und Team4s-Accountkarten beim Zurueckkehren ueber zentrale Auth-/Profil-Seams aktualisiert. (automated verified 2026-05-26; live Keycloak UAT pending)
- [x] **Phase 53: Rollenübergreifendes Mein Profil als Member Identity Hub** - Die bestehende Profilseite wird als `/me/profile` zu einem modernen, rollenübergreifenden Member-Identity-Hub weiterentwickelt: rollenneutrale Route, echte Datenquellen, GDS-basierte Oberfläche, klare Keycloak-/Team4s-Datenhoheit, getrennte Rollenarten, sichere Avatar-/Rich-Text-/Sichtbarkeitsplanung und keine Mockdaten. (completed 2026-05-27)
- [x] **Phase 54: Globale Nav Drawer und Layout Verdrahtung** - Die AppShell wird zu einem seitenweiten Drawer-Navigationssystem: echter Slide-over-Drawer, hover-aktivierter Desktop-Glasrand (16px), Root-Layout-Integration für seitenweite Präsenz und Dual-State (anonym/eingeloggt) mit echtem Avatar-Bild. (completed 2026-05-28)
- [x] **Phase 55: Sichere TipTap-Persistenz fuer Profilgeschichte** - Die eigene Profilgeschichte wird von Phase-53-Plain-Text auf release-native-unabhaengige TipTap-Persistenz umgestellt: Migration, Backend-Validierung/Sanitizing, OpenAPI/frontend DTOs, Editor-State und Bestandsdaten-Migration bewegen sich gemeinsam. (completed 2026-05-29)
- [x] **Phase 56: Cropper** - Der fragile eigene Cropper wird durch eine moderne gepflegte React-Cropper-Bibliothek hinter einer gemeinsamen Team4s-Cropper-Komponente ersetzt; Profil-Avatar und Fansub-Gruppenlogo nutzen dieselbe UI-Grundlage, ohne Upload-Endpunkte oder Media-Ownership zu vermischen. (completed and security-verified 2026-05-29)
- [x] **Phase 57: Profil-Aktivzeitraum als jahrbegrenzte Datumsfelder** - `/me/profile` speichert den Fansub-Szene-Aktivzeitraum ueber echte DB-DATE-Spalten, waehrend die UI weiterhin nur Jahresauswahl fuer "von wann bis wann aktiv" erlaubt. (implemented, security-verified, and validation-approved 2026-05-29; authenticated UAT pending)

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

### Phase 41: Globalen TipTap-Rich-Text-Editor einführen

**Goal:** TipTap als globale Rich-Text-Editor-Basis für alle vier Textbereiche (fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes). Ersetzt das Markdown-System aus Phase 40 durch JSONB-basierte Speicherung (body_json), serverseitig erzeugtes und sanitisiertes HTML (body_html) sowie Plaintext für Suche/Teaser (body_text). Globale RichTextEditor- und RichTextRenderer-Komponenten. Backend-Validierung gegen erlaubtes TipTap-Schema. Farben nur über definierte Token-Palette.
**Requirements**: TIPTAP-EDITOR-01
**Depends on:** 40
**Status:** Retro-verified complete on 2026-05-27 via runtime evidence, phase summaries, UAT, validation, and security artifacts.
**Plans:** 6/6 plans retro-closed

Plans:
- [x] `41-01-PLAN.md` — DB-Migrationen 0067-0070: body_json/body_text/editor_type/content_schema_version für alle vier Texttabellen
- [x] `41-02-PLAN.md` — Go TipTap Service: Validator, HTML-Renderer, Plaintext-Extractor, IsEmpty
- [x] `41-03-PLAN.md` — Go Backend API-Anpassung: Handler-Split, DTOs auf body_json, Repository-Erweiterung
- [x] `41-04-PLAN.md` — Frontend globale Komponenten: RichTextEditor, RichTextRenderer, ColorTokenExtension
- [x] `41-05-PLAN.md` — Frontend Admin-Integration: alle vier Textbereiche auf RichTextEditor umstellen
- [x] `41-06-PLAN.md` — Frontend Tests + Integrations-Check + Browser-UAT Checkpoint

**Success Criteria** (what must be TRUE):
  1. TipTap als globale Editor-Basis eingeführt; RichTextEditor-Komponente existiert.
  2. RichTextRenderer-Komponente existiert und gibt nur sanitisiertes body_html aus.
  3. Alle vier Texttabellen haben body_json JSONB, body_html TEXT, body_text TEXT, editor_type TEXT, content_schema_version INT.
  4. Backend validiert body_json gegen erlaubte TipTap-Nodes/Marks.
  5. HTML-Sanitizing blockiert script, iframe, on*-Handler, javascript:-URLs, Base64-Bilder.
  6. Farben nur über Token-Palette (default/gray/red/orange/yellow/green/blue/purple).
  7. MVP-Toolbar: Paragraph/H1/H2/H3, Bold, Italic, BulletList, OrderedList, Blockquote, Table, Farbe, HorizontalRule, Undo/Redo.
  8. Tabellen: max. 6 Spalten / 30 Zeilen, keine verschachtelten Tabellen.
  9. Public-Ausgabe nur bei status=published, visibility=public, deleted_at IS NULL, body_text nicht leer.
  10. Phase-40-Hilfetexte und rollenbezogene release_version_notes-Texte bleiben erhalten.
  11. Leere Inhalte werden korrekt erkannt und nicht angezeigt.
  12. go test ./... und npm run typecheck/lint laufen grün.

### Phase 42: TipTap Collaboration MVP fuer fansub_group_notes

**Goal:** Einen schmalen Echtzeit-Kollaborations-MVP fuer offizielle Gruppennotizen (`fansub_group_notes`) auf der bestehenden TipTap-Basis bauen. Mehrere berechtigte Benutzer sollen denselben Gruppennotiz-Text gleichzeitig bearbeiten koennen, ohne Release-/Anime-Domainregeln zu verletzen. Persistente Fachquelle bleibt weiterhin `fansub_group_notes.body_json`; Collaboration fuehrt keinen zweiten konkurrierenden Notizspeicher ein.
**Requirements**: TIPTAP-COLLAB-01
**Depends on:** 41
**Status:** Planned/deferred after historical reconcile on 2026-05-27; no current runtime evidence was found for collaboration provider, Yjs document scope, presence, or multi-session collaboration flow.
**Plans:** 0/4 plans executed

Plans:
- [ ] `42-01-PLAN.md` - Collaboration-Architektur, Dokument-ID-Schema, Auth-Zugriff und persistente Save-Seam fuer fansub_group_notes festziehen.
- [ ] `42-02-PLAN.md` - Frontend-Integration im Fansub-Notizen-Tab: Collaboration-Provider, Presence-Basis und Editor-Umschaltung fuer bestehende Notizen.
- [ ] `42-03-PLAN.md` - Mehrbenutzer-UX, Konflikt-/Offline-Verhalten und Recovery fuer den offiziellen Gruppennotiz-Flow absichern.
- [ ] `42-04-PLAN.md` - Verifikation, Browser-UAT und Sicherheits-/Betriebscheck fuer den Collaboration-MVP abschliessen.

**Success Criteria** (what must be TRUE):
  1. Collaboration gilt nur fuer `fansub_group_notes`; `member_group_stories`, `anime_fansub_project_notes` und `release_version_notes` bleiben in Phase 42 unveraendert.
  2. Jede kollaborative Notiz hat eine stabile Dokument-ID, die eindeutig an `fansub_group_notes.id` gebunden ist und nicht an Anime-, Episode- oder Release-Entitaeten driftet.
  3. Berechtigte Benutzer koennen denselben Gruppennotiz-Text gleichzeitig bearbeiten; unberechtigte Benutzer sehen keinen Edit-Zugang.
  4. Presence-Basis ist sichtbar (mindestens "wer ist online/aktiv"); Cursor-/Caret-Feinheiten duerfen nachgeordnet sein.
  5. Persistenz bleibt release-neutral und notiz-zentriert: die fachliche Quelle nach Save/Sync ist weiterhin `fansub_group_notes.body_json`, daraus entstehen serverseitig `body_html` und `body_text`.
  6. Initialinhalt wird pro Dokument nur einmal gesetzt; Reloads oder parallele Verbindungen duplizieren keinen Inhalt.
  7. Undo/Redo kollidiert nicht mit Collaboration-History; es wird kein lokaler Verlauf eingesetzt, der fremde Edits zurueckrollt.
  8. Das Zugriffsmodell ist explizit dokumentiert (z. B. Lead/Editor/Admin edit, andere read-only oder kein Zugang).
  9. Browser-UAT zeigt eine erfolgreiche Parallelbearbeitung desselben Gruppennotiz-Dokuments in zwei Sessions.
  10. Sicherheits- und Betriebsmodus ist fuer Team4s als self-hosted/on-prem dokumentiert; ein Cloud-/Platform-Pfad ist in Phase 42 nicht vorgesehen.

### Phase 43: MVP Auth-, User- und Fansub-Lead-Foundation mit Keycloak

**Goal:** Den bisherigen festen Test-Admin-Kontext durch eine echte Authentifizierungs- und User-Grundlage ersetzen. Keycloak liefert Identitaet, Login, Sessions und globale Plattformrollen; Team4s verwaltet interne `app_users`, Fansub-Gruppenmitgliedschaften und fansub-spezifische Rollen wie `fansub_lead` in der App-Datenbank.
**Requirements**: AUTH-FOUNDATION-01
**Depends on:** -
**Status:** Runtime retro-verified complete on 2026-05-27. Phase 51 supersedes the old API-bearer wording by requiring real Keycloak access tokens with Team4s API audience.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `43-01-PLAN.md` - Docker-/Dev-Stack, automatisierte Keycloak-Realm/Client-Grundlage, JWT-Validierung und `app_users`-Foundation mit Bootstrap-Flow aufbauen.
- [x] `43-02-PLAN.md` - Globale App-Rollen, CurrentUser-/Platform-Admin-Seam und geschuetzte `/api/me`- plus Admin-User-APIs vervollstaendigen.
- [x] `43-03-PLAN.md` - Fansub-Gruppenmitgliedschaften und `fansub_lead`-Rollenmodell samt Admin-MVP fuer Zuweisung und Anzeige umsetzen.
- [x] `43-04-PLAN.md` - Developer-Doku, lokale Bootstrap-Schritte, Browser-UAT und Phase-44-Handoff fuer die spaetere Permission Engine absichern.

**Success Criteria** (what must be TRUE):
1. `docker compose up` startet zusaetzlich `keycloak` und `keycloak-db` neben dem bestehenden App-Stack.
2. Keycloak ist lokal als eigener Container erreichbar und verwendet eine eigene persistente PostgreSQL-Datenbank.
3. Die lokale Keycloak-Grundkonfiguration fuer Realm `team4s`, Client `team4s-frontend` und globale Rollen ist soweit wie praktikabel automatisiert, z. B. per Realm-Importdatei und/oder idempotentem Bootstrap-Skript.
4. Die Keycloak-Automatisierung legt keine fansub-spezifischen Rollen wie `fansub_lead`, `editor`, `designer` oder gruppenspezifische Rollen an.
5. Das Frontend kann Login, Logout und Session-Erkennung ueber Keycloak im MVP-Fluss ausfuehren.
6. API-Calls an das Go-Backend senden einen Bearer-Token; Requests ohne gueltigen Token werden mit 401 abgelehnt.
7. Das Backend validiert Keycloak-JWTs ueber den Keycloak-Issuer/JWKS-Pfad und baut daraus einen `CurrentUser`-Kontext auf.
8. Beim ersten gueltigen Login wird ein `app_user` ueber `keycloak_subject` gefunden oder kontrolliert als `pending` angelegt.
9. Globale Plattformrollen wie `platform_admin` werden in Team4s kontrolliert ausgewertet; Fansub-spezifische Rollen werden nicht in Keycloak gespeichert.
10. Ein `platform_admin` kann registrierte User sehen und einen User einer Fansub-Gruppe zuweisen.
11. Ein `platform_admin` kann einem Fansub-Gruppenmitglied fuer die Gruppe die Rolle `fansub_lead` geben und diese in der Detailansicht sehen.
12. Die Developer-Doku beschreibt `.env`, Compose-Setup, Realm-/Client-Automatisierung, wann ein Keycloak-Volume fuer einen frischen Import geloescht werden muss, ersten `platform_admin`-Bootstrap per SQL und die bewussten Grenzen zu Phase 44.

### Phase 44: App Permission Engine fuer Fansub-, Release- und Media-Kontexte

**Goal:** Eine zentrale, kontextbasierte Permission Engine fuer Team4s einziehen. Das Backend soll fuer Fansub-, Release-, Release-Version-, Media- und beschreibungsbezogene Aktionen ueber `Can(...)` und `RequirePermission(...)` entscheiden, statt verteilte Rollenpruefungen in Handlern oder Frontend-Komponenten zu behalten. Keycloak bleibt Identitaet; fachliche Rollen und Rechte bleiben in Team4s.
**Requirements**: AUTHZ-ENGINE-01
**Depends on:** 43
**Status:** Runtime retro-verified complete on 2026-05-27; execution summary artifacts are missing, but permission engine/runtime evidence exists.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `44-01-PLAN.md` - Zentrale Permission-Foundation mit Actions, Rollenmatrix, PermissionContext, group-scope Resolvern und `Can`/`RequirePermission` im Backend aufbauen.
- [x] `44-02-PLAN.md` - Priorisierte Fansub-/Release-/Release-Version-/Media-/Description-Endpunkte absichern, Capability-Responses ausliefern und ein minimales generisches Audit fuer Berechtigungs-relevante Mutationen verdrahten.
- [x] `44-03-PLAN.md` - Admin-Frontend minimal auf Capability-basierte Sichtbarkeit/Deaktivierung und verstaendliche 403-Fehlerbehandlung umstellen, ohne harte Rollenpruefungen im Client zu behalten.
- [x] `44-04-PLAN.md` - Permission-Matrix-Tests, Handler-/Capability-Regressionen, Developer-Doku und Live-Verifikation fuer die neue Engine abschliessen.

**Success Criteria** (what must be TRUE):
1. Zentrale Permission-Codes fuer Fansub-, Release-, Release-Version-, Release-Media- und Description-Aktionen existieren als Backend-Konstanten statt als verteilte Magic Strings.
2. Eine zentrale statische Rollenmatrix ordnet `platform_admin` sowie die Fansub-Rollen `fansub_lead`, `project_lead`, `translator`, `timer`, `typesetter`, `editor`, `encoder`, `raw_provider`, `quality_checker` und `designer` den Permissions zu.
3. Eine zentrale Permission-Engine bietet mindestens `Can(user, action, context)` und `RequirePermission(action, context)`.
4. `fansub_group_member_roles` ist die einzige Quelle fuer App-Berechtigungen innerhalb einer Fansub-Gruppe; fachliche Credit-/Beitragstabellen wie `release_member_roles`, `member_episode_notes` oder `member_anime_notes` werden nicht fuer Permission-Entscheidungen benutzt.
5. Team4s wertet Fansub-Rollen aus `fansub_group_member_roles` fuer `scope_type = group` korrekt aus; `platform_admin` darf alle geschuetzten Aktionen.
6. Fansub-Rollen gelten nur innerhalb ihrer Fansub-Gruppe; eine Rolle in Gruppe A gewaehrt keine Rechte in Gruppe B.
7. Das Backend kann den benoetigten PermissionContext zentral aus Release-, Release-Version-, Release-Media- und Description-Targets selbststaendig zu Release- und Fansub-Kontext aufloesen; vom Frontend gelieferte Kontextfelder werden nicht blind vertraut.
8. Coop-Release-Versionen mit mehreren beteiligten Fansub-Gruppen erlauben eine Aktion, wenn der User in mindestens einer beteiligten Gruppe eine aktive Rolle mit der benoetigten Permission besitzt; `fansub_group.members.manage` bleibt strikt gruppengebunden.
9. `Can()` liefert ein strukturiertes Ergebnisobjekt mit mindestens `Allowed`, `ReasonCode`, `Reason` und optional `MatchedRole` / `MatchedScope`; `RequirePermission()` mappt dies konsistent auf 401/403/404.
10. Ownership fuer `delete_own` wird nur aus DB-Feldern wie `uploaded_by_user_id` oder `created_by_user_id` abgeleitet; `modified_by_user_id` gilt nie als Owner.
11. Die priorisierten Backend-Endpunkte fuer Fansub-Gruppen, Fansub-Mitglieder, Releases, Release-Versionen, Release-Version-Media und beschreibungsbezogene Mutationen pruefen serverseitig die neue Permission-Engine und liefern bei fehlender Berechtigung 403.
12. Das Frontend erhaelt Capability-Responses fuer Fansub-Gruppen und Release-Versionen, die intern auf zentrale Actions gemappt sind, nicht global gecacht werden und nach Rollenwechseln, Kontextwechseln, Drawer-Open und relevanten Mutationen neu geladen werden.
13. Erfolgreiche kritische Mutationen werden auditiert; verweigerte kritische Mutationsversuche werden, soweit die Audit-Struktur es traegt, mit `ReasonCode` geloggt.
14. Tests decken neben der Rollenmatrix auch Kontextaufloesung, manipulierte Kontextfelder, Coop-Faelle und echtes DB-Ownership fuer `delete_own` ab.
15. Vor der Umsetzung wurden bestehendes Schema, bestehende Code-Struktur und bestehende Frontend-Seams analysiert; vorhandene Tabellen, Services, Repositories, Middleware und Projektkonventionen werden bevorzugt wiederverwendet.
16. Neue Migrationen werden nur dann eingefuehrt, wenn die Vorpruefung eine echte Luecke nachweist; die Ausfuehrungsdoku beginnt mit einer kurzen Ist-Analyse der gefundenen Tabellen, Spalten, Auth-Seams und Wiederverwendungsentscheidungen.

### Phase 45: Fansub Member Management MVP

**Goal:** Ein MVP fuer app-user-basierte Mitglieder- und Rollenverwaltung pro Fansub-Gruppe liefern. Berechtigte Nutzer sollen Mitglieder sehen, bestehende App-User hinzufuegen, Rollen vergeben/entziehen, Mitgliedschaften deaktivieren und Self-Lockout-Situationen verhindern. Alle Sicherheitsentscheidungen laufen ueber die Permission Engine aus Phase 44; Keycloak bleibt reine Identity-Schicht.
**Requirements**: FANSUB-MEMBER-MGMT-01
**Depends on:** 44
**Status:** Runtime retro-verified complete on 2026-05-27; execution summary artifacts are missing, but member-management runtime evidence exists.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `45-01-PLAN.md` - Vorpruefung von Schema, Code-Struktur und vorhandenen Member-Seams sowie minimale App-User-/Mitgliedschafts-Foundation fuer die Gruppenverwaltung festziehen.
- [x] `45-02-PLAN.md` - Backend-Endpunkte fuer Mitgliederliste, App-User-Suche, Hinzufuegen, Rollenmutation, Deaktivierung, Self-Lockout-Schutz und Audit/Capabilities umsetzen.
- [x] `45-03-PLAN.md` - Fansub-Admin-UI minimal auf Mitglieder-&-Rollen-MVP mit Capability-gesteuerter Sichtbarkeit, Suchflow und 401/403/409-UX anschliessen.
- [x] `45-04-PLAN.md` - Backend-/Frontend-Regressionen, Self-Lockout-Tests, Developer-Doku und Live-Verifikation abschliessen sowie Phase-46-Handoff fuer Einladungen/Join-Requests vorbereiten.

**Success Criteria** (what must be TRUE):
1. Vor der Umsetzung wurden Datenbank, Migrationen, Backend- und Frontend-Seams analysiert; die Ausfuehrungsdoku startet mit einer kurzen Ist-Analyse.
2. Es werden keine unnoetigen Parallelstrukturen gebaut; vorhandene `app_users`, `fansub_group_members`, `fansub_group_member_roles`, Audit- und Capability-Seams werden bevorzugt wiederverwendet.
3. Falls die app-user-basierte Gruppenmitgliedschaftsstruktur oder die Phase-44-Permission-Seams in der Ausfuehrungs-Branch fehlen, stoppt Phase 45 mit einem klaren BLOCKER statt auf `fansub_members` als Auth-Quelle auszuweichen.
4. Mitglieder einer Fansub-Gruppe koennen backendseitig angezeigt werden; der Zugriff ist mit `fansub_group.members.view` geschuetzt.
5. Bestehende App-User koennen zu einer Fansub-Gruppe hinzugefuegt werden; unbekannte Rollen und doppelte aktive Mitgliedschaften werden abgelehnt.
6. Rollen koennen innerhalb der zentral definierten Rollenliste hinzugefuegt, entfernt und geaendert werden, ohne Keycloak-Rollen anzufassen.
7. Mitgliedschaften koennen deaktiviert und reaktiviert werden; deaktivierte Mitglieder verlieren ihre aktiven Berechtigungen.
8. Self-Lockout wird verhindert: der letzte aktive `fansub_lead` oder die letzte aktive verwaltende Rolle kann nicht entfernt bzw. deaktiviert werden; solche Versuche liefern `409 Conflict`.
9. Fansub-Gruppen-Capabilities enthalten mindestens `canViewMembers` und `canManageMembers`; jedes Feld mappt intern auf zentrale Permission-Actions.
10. Das Frontend nutzt Capabilities statt Rollenchecks und behandelt 401/403/409 mit verstaendlichen Meldungen.
11. Audit protokolliert Mitglied hinzugefuegt, Rolle hinzugefuegt/entfernt, Mitglied deaktiviert/reaktiviert und blockierte Self-Lockout-Versuche, soweit eine bestehende oder minimale Audit-Struktur dies traegt.
12. Tests decken positive und negative Faelle fuer View/Manage-Permissions, unbekannte Rollen, doppelte aktive Mitgliedschaften, deaktivierte Mitglieder und Self-Lockout-Schutz ab.

### Phase 46: Fansub Group Invitations & Join Requests MVP

**Goal:** Ein MVP fuer token-basierte Fansub-Gruppen-Einladungen liefern: berechtigte Nutzer koennen Einladungen erstellen, offene Einladungen einsehen und abbrechen, eingeloggte App-User koennen gueltige Einladungen annehmen. Join Requests duerfen vorbereitend modelliert oder als schmaler optionaler Seam mitgeplant werden, bleiben aber hinter dem Invitation-Flow priorisiert. Alle Rechte laufen ueber die Permission Engine; Keycloak bleibt reine Identity-Schicht.
**Requirements**: FANSUB-INVITES-01
**Depends on:** 45
**Status:** Runtime retro-verified complete on 2026-05-27; execution summary artifacts are missing, but invitation runtime evidence exists.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `46-01-PLAN.md` - Vorpruefung von Invite-/Join-Request-Seams, Token-/Status-Konventionen und minimalem Datenmodell fuer Fansub-Gruppen-Einladungen.
- [x] `46-02-PLAN.md` - Backend fuer Einladung erstellen, offene Einladungen verwalten, Einladungsannahme, Permission-Codes, Capability-Erweiterung und Audit umsetzen.
- [x] `46-03-PLAN.md` - Fansub-Admin-UI fuer offene Einladungen sowie eingeloggten Accept-Flow minimal auf Capability-Basis anbinden; Join-Request-Seam optional vorbereiten.
- [x] `46-04-PLAN.md` - Regressionen, Token-/Expiry-Tests, Developer-Doku, Live-Verifikation und Phase-47-Handoff abschliessen.

**Success Criteria** (what must be TRUE):
1. Vor der Umsetzung wurden DB, Migrationen, Member-Management-Seams, Permission-Seams und Frontend-Seams analysiert; die Ausfuehrungsdoku startet mit einer kurzen Ist-Analyse.
2. Es wird keine Parallelstruktur gebaut, wenn bereits geeignete Invitation-/Audit-/Membership-Seams vorhanden sind; neue Migrationen bleiben minimal.
3. Zentrale Permission-Codes fuer `fansub_group.invitations.view`, `fansub_group.invitations.create`, `fansub_group.invitations.cancel` und `fansub_group.invitations.accept` existieren zentral; Join-Request-Codes sind optional vorbereitbar.
4. Wenn noch keine passende Tabelle existiert, gibt es eine minimale `fansub_group_invitations`-Struktur mit Hash-only Token-Speicherung, Ablaufdatum, Statusmodell und Audit-kompatiblen Benutzer-/Zeitfeldern.
5. Token werden kryptografisch sicher erzeugt, nur als Hash gespeichert und nie im Klartext persistiert.
6. Berechtigte Nutzer koennen Einladungen fuer eine Fansub-Gruppe erstellen; unberechtigte Nutzer erhalten 403.
7. Offene Einladungen koennen fuer eine Fansub-Gruppe eingesehen und abgebrochen werden; der Zugriff ist serverseitig ueber die Permission Engine geschuetzt.
8. Ein eingeloggter User kann eine gueltige Einladung annehmen; Annahme erzeugt oder aktiviert die passende Gruppenmitgliedschaft mit den eingeladenen Rollen.
9. Abgelaufene, bereits angenommene oder abgebrochene Einladungen koennen nicht erneut angenommen werden und liefern verstaendliche Fehler.
10. Capability-Felder fuer Einladungen werden zentral auf Permission-Codes gemappt; das Frontend nutzt Capabilities statt Rollenchecks.
11. Audit protokolliert Einladung erstellt, Einladung abgebrochen, Einladung angenommen und verweigerte/ungueltige Annahmeversuche soweit die Audit-Struktur es traegt.
12. Tests decken positive und negative Faelle fuer Create/View/Cancel/Accept, Expiry, invaliden Token, doppelte Mitgliedschaft und Berechtigungsfehler ab.

### Phase 47: Member Profile & Historical Identity

**Goal:** Ein echtes Member-/User-Profil fuer historische Fansub-Identitaeten schaffen. Eingeloggte User koennen ihr eigenes Archivprofil pflegen, Platform Admins koennen Profile bei Bedarf administrativ sehen/bearbeiten, und die bisher falsch platzierte Profil-/Member-Bearbeitung aus der Fansub-Gruppen-Edit-Seite wird fachlich in einen eigenen Profilbereich verschoben. Keycloak bleibt fuer E-Mail, Passwort, MFA und Account-Sicherheit verantwortlich; Team4s speichert nur archivbezogene Profildaten.
**Requirements**: MEMBER-PROFILE-01
**Depends on:** 46
**Status:** Retro-verified foundation complete on 2026-05-27 via `47-RETRO-VERIFICATION.md`. Modern route/UX follow-through is carried into Phase 53.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `47-01-PLAN.md` - Vorpruefung von User-/Member-/Media-/Story-Seams, Profilfeldern und Keycloak-Account-Link-Konventionen sowie minimale Profil-Foundation festziehen.
- [x] `47-02-PLAN.md` - Backend fuer eigenes Profil lesen/bearbeiten, Avatar-Upload, Membership-/Credit-Anzeige, optionale Admin-Profilsicht und Audit umsetzen.
- [x] `47-03-PLAN.md` - Profil-Frontend, Keycloak-Account-Button und Verschiebung des falsch platzierten Profilbezugs aus der Fansub-Edit-Seite umsetzen.
- [x] `47-04-PLAN.md` - Regressionen, Developer-Doku, Live-Verifikation und Phase-48-Handoff fuer Contributor-Dashboard / Meine Gruppen abschliessen.

**Success Criteria** (what must be TRUE):
1. Vor der Umsetzung wurden bestehende User-/Member-/Media-/Story-Strukturen analysiert; die Ausfuehrungsdoku startet mit einer kurzen Ist-Analyse.
2. Keine unnoetigen Parallelstrukturen werden gebaut; vorhandene User-, Member-, Story-, Media- und Audit-Seams werden bevorzugt wiederverwendet.
3. User koennen ihr eigenes Profil lesen und archivbezogene Felder wie Fansub-Name, Display Name, Avatar, Bio, Member Story und aktive Zeit pflegen.
4. E-Mail, Passwort, MFA, Keycloak Subject und andere Keycloak-Accountdaten werden nicht in Team4s editiert.
5. Es gibt einen Button oder Link zur Keycloak Account Console; wenn keine URL konfiguriert ist, bleibt der Button verborgen oder zeigt einen klaren Hinweis.
6. Avatar Upload nutzt die bestehende Media-Architektur und erzeugt keine verwaisten Medienzustaende.
7. Das Profil zeigt Gruppenzugehoerigkeiten, Rollen und Status aus der Gruppenmitgliedschaft, ohne diese als persoenliche Stammdaten zu vermischen.
8. Historische Credits wie `release_member_roles`, `member_episode_notes` oder `member_anime_notes` werden hoechstens read-only angezeigt oder vorbereitet und nie als App-Rechte interpretiert.
9. Der falsch platzierte Profil-/Member-Bezug auf der Fansub-Edit-Seite wird entfernt oder auf einen read-only Profil-Link reduziert; das Bearbeiten des eigenen Profils passiert in einer eigenen Profilroute.
10. Backend schuetzt eigenes/fremdes Profil korrekt; `platform_admin` kann fremde Profile optional sehen/bearbeiten, normale User nicht.
11. Profile-Capabilities und/oder saubere Auth-Seams existieren fuer eigenes Profil und Avatar-Upload.
12. Tests decken positive und negative Faelle fuer Profil lesen/bearbeiten, Avatar-Upload, Keycloak-Feldschutz, Membership-Anzeige und UI-Verschiebung ab.

### Phase 48: Meine Gruppen & Contributor Dashboard

**Goal:** Einen Contributor-Bereich `Meine Gruppen` schaffen, in dem eingeloggte User nur ihre eigenen Fansub-Gruppen, Rollen, Capabilities und relevanten Arbeitskontexte sehen. Bestehende Gruppen-, Release-, Media-, Notes- und Drawer-Funktionen sollen sicher wiederverwendet und fuer Contributor-Kontexte korrekt gescoped werden, statt neu gebaut zu werden. Global Admins behalten ihre Vollsicht.
**Requirements**: CONTRIBUTOR-DASHBOARD-01
**Depends on:** 47
**Status:** Retro-verified foundation complete on 2026-05-27 via `48-RETRO-VERIFICATION.md`. Route/shell follow-through is carried into Phase 53 or later contributor-shell cleanup.
**Plans:** 4/4 plans retro-closed

Plans:
- [x] `48-01-PLAN.md` - Vorpruefung von Membership-, Permission-, Release-, Media-, Notes- und Navigations-Seams sowie Contributor-Scoping-Strategie fuer bestehende Komponenten festziehen.
- [x] `48-02-PLAN.md` - Backend fuer `GET /api/me/fansub-groups`, Contributor-Group-Detail-Reads, korrekt gescopte Release-/Anime-Kontexte und Capability-Aggregate umsetzen.
- [x] `48-03-PLAN.md` - Frontend fuer `/admin/my-groups`, Contributor-Gruppenseite, Navigation/User-Menue und sichere Wiederverwendung bestehender Edit-/Drawer-/Media-/Notes-Komponenten umsetzen.
- [x] `48-04-PLAN.md` - Regressionen, Security-/Scoping-Tests, Developer-Doku, Live-Verifikation und Phase-49-Handoff fuer Public Archive Pages abschliessen.

**Success Criteria** (what must be TRUE):
1. Vor der Umsetzung wurden bestehende Membership-, Permission-, Release-, Media-, Notes- und UI-Seams analysiert; die Ausfuehrungsdoku startet mit einer kurzen Ist-Analyse.
2. Bestehende Funktionen und Komponenten werden bevorzugt wiederverwendet; keine unnoetigen Parallel-Editoren, Upload-Systeme oder Drawer werden gebaut.
3. Es gibt eine Seite `Meine Gruppen`, auf der der eingeloggte User nur eigene Fansub-Gruppen sieht.
4. `GET /api/me/fansub-groups` liefert pro Gruppe Rollen, Status, aktive Zeit, Capabilities und sinnvolle Counts, ohne fremde Gruppen zu leaken.
5. Disabled User sehen keine Contributor-Gruppen; `platform_admin` behaelt Vollsicht oder eine klar dokumentierte Admin-Sicht.
6. Contributor-Gruppendetailseiten oder sicher gekapselte Wiederverwendung bestehender Gruppen-Edit-Seiten zeigen nur erlaubte Bereiche und keine global-admin-spezifischen Aktionen.
7. Release-/Anime-/Release-Version-Kontexte sind strikt auf echte Gruppenmitgliedschaft bzw. Permission-Engine-Kontext gescoped; URL-/ID-Manipulationen auf fremde Gruppen oder Releases werden backendseitig blockiert.
8. Coop-Releases werden korrekt angezeigt, wenn die eigene Gruppe beteiligt ist, ohne fremde Release-Versionen zu leaken.
9. Schnellaktionen und UI-Aktionen werden ausschliesslich ueber Capabilities gesteuert, nicht ueber Rollenchecks im Frontend.
10. Navigation oder User-Menue enthalten `Mein Profil`, `Meine Gruppen`, Keycloak-Account-Link und Logout.
11. Historische Credits koennen als read-only Abschnitt `Meine Beteiligungen` angezeigt oder sauber vorbereitet werden, ohne neue grosse Datenmodelle zu bauen und ohne App-Rechte daraus abzuleiten.
12. Tests decken positive und negative Faelle fuer eigene/fremde Gruppen, Scoping, Coop-Kontexte, Capability-Anzeige und Navigation ab.

### Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-Haertung

**Goal:** Normale Frontend-API-Aufrufe laufen ueber einen zentralen Auth/API-Client. Seiten, Komponenten und Feature-Hooks konsumieren tokenfreie Session-Daten und duerfen keine Keycloak- oder App-Tokens direkt lesen, speichern, weiterreichen oder Bearer-Header bauen. Streaming/Jellyfin-Relay bleibt eine dokumentierte serverseitige Sondergrenze.
**Requirements**: AUTH-API-CLIENT-01
**Depends on:** 48
**Status:** Complete on 2026-05-20 via `49-VERIFICATION.md`; registered in the active roadmap on 2026-05-27. Phase 51 supersedes only the API token-boundary details by requiring real Keycloak access tokens with Team4s API audience.
**Plans:** 14/14 plans complete

Plans:
- [x] `49-01-PLAN.md` through `49-14-PLAN.md` - Inventory, central auth/API client, refresh/retry lifecycle, upload/XHR auth, session resync, no-token static gates, docs, and verification.

**Success Criteria** (what must be TRUE):
1. Normal protected browser API calls go through the central client boundary.
2. Pages/components/hooks do not directly read, store, pass, or construct token values for normal API calls.
3. Refresh, 401 retry, local cleanup, and auth-state resync are centralized.
4. Upload/XHR auth uses the same central lifecycle without unsafe upload replay.
5. `useAuthSession` exposes token-free session state.
6. Streaming/Jellyfin relay auth remains documented as a server-side special boundary.
7. Static tests guard against new token ownership drift outside allowed boundaries.
8. Phase 51's access-token resource-server semantics remain the current API bearer contract.

### Phase 50: Platform-Admin Boundaries und Contributor Scope Governance

**Goal:** Globale Admin-Oberflaechen strikt platform-admin-only machen und Contributor-Arbeitsflaechen auf eigene Gruppen, reale Capabilities und serverseitige Permission-Kontexte begrenzen. Contributors sollen keine globalen Admin-Tabs, deaktivierte/public-unpassende Daten oder sensible Release-/Provider-Felder sehen.
**Requirements**: PLATFORM-ADMIN-BOUNDARY-01
**Depends on:** 49
**Status:** Complete-carry-forward on technical evidence from `50-SUMMARY.md`, `50-VERIFICATION.md`, `50-SECURITY.md`, and `50-VALIDATION.md`; live Keycloak UAT remains pending.
**Plans:** 4/4 plans complete

Plans:
- [x] `50-01-PLAN.md` - Platform-admin route/data boundaries and contributor scope inventory.
- [x] `50-02-PLAN.md` - Backend permission and sanitized context hardening.
- [x] `50-03-PLAN.md` - Frontend gate and contributor workspace hardening.
- [x] `50-04-PLAN.md` - Verification, security review, validation, UAT, and handoff.

**Success Criteria** (what must be TRUE):
1. Global admin pages and nested admin data-loading children are gated by platform-admin checks.
2. Contributor routes and release editors render only capability-allowed surfaces.
3. Non-platform release-version editor context omits sensitive admin/provider/stream fields.
4. Backend permission checks protect notes, media, member stories, canonical fansub updates, and disabled anime reads.
5. Public anime endpoints do not expose disabled rows just because `include_disabled=true` is present.
6. `/manage/groups` is the preferred contributor entry, while `/admin/my-groups` remains transitional until a redirect cleanup.
7. Human UAT verifies platform-admin vs fansub lead/member behavior with real Keycloak sessions.

### Phase 51: Keycloak Access-Token Resource-Server Boundary

**Goal:** Die Keycloak-Integration von `id_token`-als-API-Bearer auf einen sauberen OIDC Resource-Server-Flow umstellen. Keycloak stellt ein API-taugliches `access_token` mit korrekter Team4s-API-Audience aus; das Frontend speichert und sendet dieses `access_token`; das Backend validiert Signatur, Issuer, Expiry und Audience/Authorized Party. `id_token` bleibt nur fuer Login-/Identitaetsabschluss.
**Requirements**: AUTH-RESOURCE-SERVER-01
**Depends on:** 49
**Plans:** 4/4 plans complete

Plans:
- [x] `51-01-PLAN.md` - Keycloak-Audience- und Client-Scope-Konfiguration fuer eine Team4s-API-Resource-Server-Audience festziehen.
- [x] `51-02-PLAN.md` - Backend-Verifier von ID-Token-semantischer Pruefung auf Access-Token-Resource-Server-Pruefung umstellen.
- [x] `51-03-PLAN.md` - Frontend-Token-Mapping, Speicherung, Refresh und API-Bearer-Versand auf echtes `access_token` umstellen.
- [x] `51-04-PLAN.md` - Regressionen, Live-UAT, Dokumentationskorrektur und Migration/Deployment-Hinweise fuer die Token-Grenze abschliessen.

**Success Criteria** (what must be TRUE):
1. Keycloak Realm/Client-Konfiguration stellt ein `access_token` mit Team4s-API-Audience aus, z. B. `team4s-api`.
2. Das Frontend speichert und sendet fuer Backend-API-Calls wirklich `access_token`, nicht `id_token`.
3. `id_token` wird nur fuer Login-/Identitaetsabschluss genutzt und nicht als `Authorization: Bearer` an Team4s APIs gesendet.
4. Das Backend validiert Access Tokens als Resource Server ueber Issuer, JWKS, Expiry und Audience/Authorized Party.
5. Backend-Tests decken ab, dass `id_token` als API-Bearer abgelehnt und ein korrektes API-`access_token` akzeptiert wird.
6. Frontend-Tests decken Login, Refresh, Cookie-/Storage-Metadaten und API-Header fuer echtes `access_token` ab.
7. Die 24h-Login-Zielsetzung bleibt erhalten: Access-Tokens bleiben kurzlebig, Refresh-/SSO-Session bleibt lokal 24 Stunden gueltig, ausser der User meldet sich ab.
8. Docs korrigieren die bisherige falsche Erwartung aus Phase 43 und beschreiben die neue Keycloak-Audience-/Resource-Server-Grenze.
9. Keycloak bleibt reine Identity- und Token-Lifecycle-Schicht; Team4s-Domainrollen und Fansub-Rechte bleiben in der App-Datenbank.
10. Bestehende Backchannel-Logout-, Session-Revocation- und `/api/v1/me`-Flows funktionieren nach der Umstellung weiterhin.

### Phase 52: Profile Account Return Refresh Flow

**Goal:** Den Profilseiten-Flow fuer externe Keycloak-Accountaenderungen klaeren: Team4s oeffnet die Keycloak-Kontoverwaltung im neuen Tab, erklaert dem User den Wechsel, aktualisiert nach Rueckkehr/Fokus die Accountkarten ueber die zentrale Auth-/Profil-Seam und zeigt nur bei echten Accountdaten-Aenderungen eine ruhige Erfolgsmeldung. Ungespeicherte Team4s-Profilfelder duerfen dabei nicht ueberschrieben werden.
**Requirements**: AUTH-PROFILE-ACCOUNT-RETURN-01
**Depends on:** Phase 51
**Status:** Complete on automated evidence; live Keycloak UAT remains pending in `52-UAT.md`.
**Plans:** 3/3 plans complete

Plans:
- [x] `52-01-PLAN.md` - Profilseite mit Fokus-/Visibility-Refresh und Regressionen fuer geaenderte/ungeaenderte Keycloak-Accountdaten absichern.
- [x] `52-02-PLAN.md` - Accountdaten-CTA, Rueckkehrhinweis und nicht-dramatische Statusmeldungen auf der Profilseite umsetzen.
- [x] `52-03-PLAN.md` - Focused Checks, Browser-UAT und Handoff-Dokumentation fuer den Keycloak-Rueckkehrflow abschliessen.

**Success Criteria** (what must be TRUE):
1. Der Keycloak-Account-Link auf `/admin/profile` oeffnet weiterhin in einem neuen Tab und bleibt hinter `can_open_keycloak_account` plus `keycloak_account_url` verborgen, wenn die Capability/URL fehlt.
2. Der sichtbare CTA macht klar, dass E-Mail, Passwort, MFA und Accountname bei Keycloak geaendert werden, nicht im Team4s-Profilformular.
3. Nach dem Klick auf den Keycloak-Account-Link zeigt Team4s auf der Profilseite einen kurzen Rueckkehrhinweis, dass Keycloak im neuen Tab geoeffnet wurde und Team4s beim Zurueckkehren aktualisiert.
4. Wenn der Team4s-Tab nach einem Keycloak-Besuch wieder fokussiert oder sichtbar wird, nutzt die Profilseite die vorhandene zentrale Auth-Seam `refreshActiveAuthSession()` und danach `getOwnProfile()`.
5. Frische Keycloak-Claims duerfen nur ueber die bestehende `/api/v1/me`/App-User-Aufloesung in Team4s landen; UI-Code liest keine Tokens und ruft keine Keycloak-Refresh-Helfer direkt auf.
6. Wenn sich `account_display_name`, `email`, `account_status` oder `account_global_roles` nach dem Rueckkehrrefresh geaendert haben, aktualisieren sich die read-only Accountkarten und es erscheint `Accountdaten aktualisiert.`
7. Wenn sich keine Accountdaten geaendert haben, erscheint keine dramatische Erfolgsmeldung und kein Fehlerzustand.
8. Ein Rueckkehrrefresh ueberschreibt keine ungespeicherten Team4s-Profilfelder wie `Anzeigename`, `Fansub-Name`, `Kurzprofil` oder `Mitgliedsgeschichte`.
9. Session-/Refresh-Fehler beim Rueckkehrrefresh werden ruhig und lokal behandelt: keine Endlosschleife, kein ungefragtes Logout, vorhandene Profilanzeige bleibt soweit moeglich stabil.
10. Tests decken neuen Tab, Rueckkehrhinweis, geaenderte Accountdaten, unveraenderte Accountdaten und Dirty-Form-Schutz ab.

### Phase 53: Rollenübergreifendes Mein Profil als Member Identity Hub

**Goal:** Die bestehende Profilseite wird zu einem modernen, rollenübergreifenden Bereich `Mein Profil` weiterentwickelt. `/me/profile` ist die Zielroute für alle eingeloggten User; `/admin/profile` darf keine eigene Admin-Profilwelt bleiben. Die Seite zeigt Team4s-/Fansub-Identität, Gruppen, Rollen, Beiträge und pflegbare Profilinformationen aus echten Datenquellen, während Login, E-Mail, Passwort, MFA und technische Account-Sicherheit bei Keycloak bleiben.
**Requirements**: MEMBER-PROFILE-HUB-01
**Depends on:** Phase 47, Phase 48, Phase 52
**Context:** `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md`
**Plans:** 2/2 plans complete

Plans:
- [x] `53-01-PLAN.md` - Phase 53A: Route `/me/profile`, wiederverwendbare globale Shell als erster Consumer, Nicht-Admin-Einstieg, Datenquellen, rollenneutrale Komponenten, Layout/GDS-Basis, Profil-Hero, Basisdaten, Account & Sicherheit, Mitgliedschaften, Beiträge-Summary und Rollenlabel-Mapping planen und umsetzen.
- [x] `53-02-PLAN.md` - Phase 53B: Avatar-Crop mit 1:1-/Circular-Geometrie, shared Crop-Primitives, serverseitige Avatar-Validierung, Varianten-/Originalbild-Entscheidung, Month-/Year-Contract, sichere TipTap-/Rich-Text-Verdrahtung, Sichtbarkeit, Dirty-State, partielle Fehler, Mobile-Shell-QA und Accessibility absichern.

**Cross-cutting constraints:**
- `/me/profile` nutzt eine globale/reusable Shell, aber 53A migriert nicht die ganze App.
- Contributions-Detailausbau und Avatar-Remove bleiben deferred, solange kein eigener Contract existiert.
- 53B-Contract-Arbeiten laufen seriell oder explizit koordiniert, damit Migrationen/OpenAPI/DTOs nicht kollidieren.

**Architecture Decisions** (must remain TRUE):
1. `/me/profile` ist die Zielroute für alle eingeloggten User.
2. `/admin/profile` darf keine eigene Admin-Profilwelt bleiben; es leitet weiter oder re-exportiert intern die rollenneutrale Seite.
3. Keycloak bleibt Quelle für Login, E-Mail, Passwort, MFA und Account-Sicherheit.
4. Team4s bleibt Quelle für Fansub-Profil, Avatar, Bio, Gruppen, Rollen und Beiträge.
5. Historische Credits erzeugen keine Berechtigungen.
6. Rollenarten bleiben getrennt: Plattformrolle, Gruppenrolle, App-Rolle, historische Credit-Rolle und Release-/Projektrolle.
7. Sichtbarkeit ist konservativ: fehlende oder unklare Sichtbarkeit bedeutet nicht öffentlich.
8. Sensible Accountdaten gelangen nicht in spätere Public-Komponenten.
9. Rich Text wird nicht unsanitized gerendert.
10. Avatar Upload wird serverseitig validiert.
11. Sidebar/App-Shell wird nicht lokal in `/me/profile` hardgecodet.

**Known Contract / Backend Gaps:**
1. OpenAPI fehlt aktuell für `/api/v1/me/profile`, `PUT /api/v1/me/profile`, `POST /api/v1/me/profile/avatar`.
2. Sichtbarkeit kennt aktuell nur `public | members_only`; eine Gruppen-Sichtbarkeit fehlt.
3. Aktivzeitraum ist aktuell nur Jahr, nicht Monat/Jahr.
4. Rich Text wird auf der Profilseite aktuell zu Plain Text konvertiert.
5. Avatar Upload hat keinen Crop-Contract und keine dokumentierten Varianten wie `avatar_256`, `avatar_96`, `avatar_48`.
6. Gruppenlogo fehlt im Profil-Membership-DTO.
7. Beiträge sind aktuell aggregiert, nicht als paginierte Anime-/Episode-/Release-Version-Detail-Liste.

**Success Criteria** (what must be TRUE):
1. `/me/profile` ist als rollenneutrale Profilroute geplant/umgesetzt und für eingeloggte User erreichbar.
2. `/admin/profile` bleibt nur Übergang/Weiterleitung/Re-Export und erzeugt keine eigene Admin-Profilwelt.
3. Die Seite nutzt reale vorhandene Datenquellen und zeigt keine dauerhaften Mockdaten oder erfundenen Felder.
4. Die UI verwendet bestehende GDS-/UI-Komponenten und lokale Styles nur für fachliche Layoutdetails.
5. Profil-Hero, Basisdaten, Profilbild, Sichtbarkeit, Account & Sicherheit, Mitgliedschaften und Beiträge sind als getrennte, verständliche Bereiche geplant.
6. Accountdaten sind read-only und klar als Keycloak-verwaltet markiert.
7. Rollenlabels sind deutsch lesbar und Rollenarten werden im UI nicht vermischt.
8. Mitgliedschaften und Beiträge zeigen Empty States, wenn Daten fehlen, statt fachlich falsche Daten abzuleiten.
9. Rich-Text-Rendering ist nur mit validierter/sanitized Ausgabe erlaubt.
10. Avatar Upload lehnt unsichere Typen serverseitig ab; SVG ist nicht erlaubt, solange kein Sanitizing-Konzept existiert.
11. Dirty-State, partielle Fehlerzustände, mobile Darstellung und Accessibility sind in Phase 53B explizit abgesichert.

### Phase 54: Globale Nav Drawer und Layout Verdrahtung

**Goal:** Die AppShell wird zu einem seitenweiten Drawer-Navigationssystem mit echtem Slide-over-Overlay, hover-aktiviertem Desktop-Glasrand-Drawer (16px Edge-Strip), Dual-State (anonym/eingeloggt) und Root-Layout-Integration für seitenweite Präsenz ohne Einzelinkludierung je Seite.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19
**Depends on:** Phase 53
**Context:** `.planning/phases/54-globale-nav-drawer-und-layout-verdrahtung/54-CONTEXT.md`
**UI hint**: yes
**Plans:** 4/4 plans complete

Plans:
**Wave 1**
- [x] `54-01-PLAN.md` — AppShell Drawer-Mechanismus: Slide-over, Edge-Strip, Dual-State, Avatar-Footer, Tests
- [x] `54-02-PLAN.md` — AppShellClientWrapper: Client-Wrapper für Server/Client-Component-Grenze

**Wave 2** *(blocked on Wave 1 completion)*
- [x] `54-03-PLAN.md` — Root-Layout-Integration + /me/profile Doppel-Shell-Bereinigung
- [x] `54-04-PLAN.md` — Playground-Demo in /dev/ui-system

**Cross-cutting constraints:**
- `AppShell` bleibt `'use client'`; Root-Layout bleibt Server Component — Client-Wrapper-Grenze darf nicht verletzt werden (D-13)
- Kein Token als Prop an Shell oder Wrapper übergeben (T-54-02, `auth-api-client.md`)

**Success Criteria** (what must be TRUE):
1. Der mobile Drawer ist ein echter Slide-over Overlay (von links über den Content) und ersetzt das bisherige Inline-Mobile-Nav-Panel.
2. Auf Desktop erscheint ein 16px breiter Glasrand am linken Bildschirmrand; Hover oder Fokus auf diesen Strip blendet den vollen Drawer ein; Verlassen schließt ihn wieder.
3. Die AppShell ist in `frontend/src/app/layout.tsx` (Root-Layout) eingebaut, sodass alle Seiten automatisch den Drawer erhalten; Doppel-Shell aus `/me/profile` wird entfernt.
4. Der Drawer zeigt im anonymen Zustand Login/Registrieren-Buttons und Public-Nav (`/anime`, `/fansubs`, Suche); im eingeloggten Zustand Nutzer-Avatar (aus `GET /api/v1/me/profile`) plus vollständige Nav-Gruppen.
5. ESC und Backdrop-Klick schließen den Drawer; Focus-Trap, `aria-expanded`, `aria-controls` und sichtbare Fokuszustände sind korrekt verdrahtet; keine reinen Hover-only-Aktionen ohne Tastaturäquivalent.

### Phase 55: Sichere TipTap-Persistenz fuer Profilgeschichte

**Goal:** Die eigene Profilgeschichte auf `/me/profile` speichert echte TipTap-Dokumente sicher und vertragsklar, statt Rich-Text im Browser in Plain Text zurueckzukonvertieren. Schema-Migration, bestehende Plain-Text-Daten, Backend-TipTap-Validierung/Sanitizing, OpenAPI/frontend DTOs, zentrale API-Helfer, Editor-State und Regressionen werden in einem schmalen Profil-Slice zusammen geplant und umgesetzt.
**Requirements**: MEMBER-PROFILE-STORY-RICH-TEXT-01
**Depends on:** Phase 53, Phase 41, Phase 49
**Plans:** 3/3 plans complete

Plans:
**Wave 1**
- [x] `55-01-PLAN.md` - Backend-, Datenbank- und OpenAPI-Contract fuer sichere TipTap-Profilgeschichte herstellen.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] `55-02-PLAN.md` - Frontend-Profilgeschichte auf TipTap-Contract und Lese-/Bearbeitungsmodus umstellen.

**Wave 3** *(blocked on Wave 1 and Wave 2 completion)*
- [x] `55-03-PLAN.md` - Phase-55-Verifikation, Security Review, UAT-Handoff und Statuspflege abschliessen.

**Cross-cutting constraints:**
- TipTap JSON bleibt Quelle der Wahrheit; Plain Text ist nur abgeleitet oder Kompatibilitaet.
- HTML wird serverseitig aus TipTap JSON erzeugt und sanitisiert; UI rendert kein unsicheres Client-HTML.
- `/me/profile` bleibt tokenfrei und nutzt die zentrale Auth/API-Seam; Refresh-Session ohne Access Token bleibt gueltiger geschuetzter UI-Zustand.
- Nach Save zeigt die Profilgeschichte Lesemodus; Editor/Toolbar erscheinen nur nach `Bearbeiten`.
- Cropper, Profil-Aktivitaetsredesign und Contributor-Edit/Delete bleiben ausserhalb von Phase 55.

**Success Criteria** (what must be TRUE):
1. `members.member_history_description` bleibt als lesbarer Plain-Text-/Kompatibilitaetswert erhalten oder wird eindeutig als `body_text`-Aequivalent weitergefuehrt; neue TipTap-Felder werden per neuer reversibler Migration ergaenzt.
2. Bestehende Plain-Text-Profilgeschichten werden kontrolliert in ein minimales TipTap-Dokument migriert, ohne Account-, Gruppenrollen- oder Fansub-Gruppen-Daten zu vermischen.
3. `GET /api/v1/me/profile` liefert die Profilgeschichte vertragsklar als TipTap JSON plus serverseitig sanitisiertes HTML und Plain Text.
4. `PUT /api/v1/me/profile` akzeptiert fuer die Profilgeschichte nur validiertes TipTap JSON, rendert HTML serverseitig ueber den bestehenden `TipTapService`, extrahiert Plain Text und lehnt nicht erlaubte Nodes/Marks ab.
5. `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts` und `frontend/src/lib/api.ts` beschreiben dieselben Request-/Response-Felder und Fehlerfaelle.
6. `/me/profile` nutzt den bestehenden `RichTextEditor`/`RichTextRenderer` und entfernt die lokale Plain-Text-Konvertierung aus der Profilseite.
7. Geschuetzte Profilansicht und Speichern funktionieren weiter, wenn das Access Token fehlt oder abgelaufen ist, aber eine Refresh-Session vorhanden ist; UI-Code bleibt tokenfrei und laeuft ueber den zentralen API-Client.
8. Dirty-State und Keycloak-Return-Refresh ueberschreiben keine ungespeicherte Profilgeschichte.
9. Backend- und Frontend-Tests decken Migration/Repository, Handler-Validierung, OpenAPI/DTO-Mapping, Profil-Save und Sanitizing-/Reject-Faelle ab.
10. Keine neue Text-/Editor-/API-Parallelstruktur entsteht neben den Phase-41-TipTap-Seams.

### Phase 56: Cropper

**Goal:** Den aktuell fragilen, projekt-eigenen Cropper fuer Profil-Avatar und Fansub-Gruppenlogo durch eine gemeinsame Team4s-Cropper-Komponente auf Basis einer gepflegten React-Cropper-Bibliothek ersetzen. Der neue Cropper muss Preview und exportiertes Ergebnis deckungsgleich machen, Mobile/Touch/Keyboard sicher abdecken und die bestehenden domain-spezifischen Upload-Endpunkte sowie Media-Ownership-Seams beibehalten.
**Requirements**: MEDIA-CROPPER-01
**Depends on:** Phase 53, Phase 49
**Context:** `.planning/phases/56-cropper/56-CONTEXT.md`
**UI hint**: yes
**Plans:** 4/4 plans complete

Plans:
**Wave 1**
- [x] `56-01-PLAN.md` - Cropper-Bibliothek auswaehlen, Dependency einfuehren und gemeinsame Team4s-Cropper-Komponente bauen.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] `56-02-PLAN.md` - Profil-Avatar-Crop auf die gemeinsame Komponente migrieren.
- [x] `56-03-PLAN.md` - Fansub-Gruppenlogo-Crop in `MediaUpload` auf die gemeinsame Komponente migrieren.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] `56-04-PLAN.md` - Alte Crop-Math-Seams entfernen, Regressionen/UAT abschliessen und Status/Todo-Handoff aktualisieren. (functional UAT and security review passed 2026-05-29)

**Cross-cutting constraints:**
- Der Cropper ist nur UI-/Client-Export-Infrastruktur; Profil-Avatar und Fansub-Gruppenmedia behalten ihre vorhandenen API-Helfer, Upload-Endpunkte, Auth-Seams und Media-Ownership.
- Kein neuer Upload-Endpoint, keine neue Media-Tabelle, kein Zusammenlegen von Profil-, Gruppen-, Release- oder Release-Version-Media.
- Profil-Avatar speichert weiterhin source original und cropped display ueber den bestehenden Avatar-Contract; Public/Profile-Anzeige darf nie das ungecroppte Source-Original verwenden.
- Fansub-Gruppenlogo bleibt Gruppenmedia/`fansub_groups.logo_id`-Kontext und darf nicht in Release- oder Anime-Media umgebogen werden.
- Die Bibliothek muss vor Merge gegen Touch/Keyboard/Responsive-Verhalten und Canvas-/Coordinate-Export verifiziert werden; bei nicht ausreichender Eignung wird die Entscheidung im Plan dokumentiert statt weiter custom crop math zu patchen.

**Success Criteria** (what must be TRUE):
1. Eine andere gepflegte React-Cropper-Bibliothek ist anhand dokumentierter Kriterien ausgewaehlt; keine Kandidatenbibliothek ist vorab gelockt, und die finale Entscheidung ist nachweisbar an Preview-/Export-Paritaet, Touch, Tastatur, Zoom und File-Export gemessen.
2. Es gibt eine gemeinsame Team4s-Cropper-Komponente oder ein kleines Cropper-Adapter-Modul ausserhalb domain-spezifischer Seiten/Admin-Komponenten.
3. Profil-Avatar-Crop nutzt die gemeinsame Komponente und sendet weiterhin `source_file` plus `cropped_file` ueber `uploadOwnProfileAvatar`.
4. Fansub-Gruppenlogo-Crop nutzt dieselbe gemeinsame Komponente und sendet weiterhin das gecroppte Logo ueber `uploadFansubMedia`; Banner-Upload bleibt unveraendert, solange kein echter Crop-Contract existiert.
5. Preview, exportiertes Blob/File und gespeicherte Anzeige sind fuer den ausgewaehlten Ausschnitt deckungsgleich genug fuer UAT; der alte Parity-Bug reproduziert nicht mehr.
6. Der Cropper funktioniert per Maus, Touch/Pointer, Tastatur, Zoom-Control, ESC/Cancel und Apply; Fokusfuehrung und sichtbare Fokuszustaende sind abgesichert.
7. Responsive/mobile Viewports zeigen keine ueberlappenden Controls, abgeschnittenen Buttons oder unbedienbaren Slider.
8. Bestehende Auth-/Refresh-Session-Regeln bleiben erhalten; geschuetzte Upload-Aktionen laufen ueber zentrale API-Seams und bauen keine Bearer-Header lokal.
9. Alte eigene Crop-Math-/A11y-Helfer werden entfernt oder klar als weiterhin benoetigt dokumentiert; keine zweite aktive Cropper-Implementierung bleibt fuer dieselbe Aufgabe zurueck.
10. Frontend-Tests und Browser-UAT decken Avatar-Crop, Existing-Avatar-Recrop, Fansub-Logo-Crop, Keyboard/Touch-Basis und Upload-Error-Pfade ab.

### Phase 57: Profil-Aktivzeitraum als jahrbegrenzte Datumsfelder

**Goal:** Die Profil-Aktivzeit auf `/me/profile` wird vom bisherigen Jahr-/Text-Contract auf einen klaren Date-Contract umgestellt: Die Datenbank speichert reale `DATE`-Werte, API/OpenAPI/Frontend verwenden dokumentierte Datumsfelder, und die UI begrenzt die Eingabe bewusst auf Jahre.
**Requirements**: MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01
**Depends on:** Phase 56
**Context:** `.planning/phases/57-profil-aktivzeitraum-als-jahrbegrenzte-datumsfelder/57-CONTEXT.md`
**UI hint**: yes
**Status:** Implemented, security-verified, and validation-approved 2026-05-29; authenticated browser UAT pending.
**Plans:** 3/3 plans complete

Plans:
**Wave 1**
- [x] `57-01-PLAN.md` - DB-, Backend- und OpenAPI-Contract fuer datumsgespeicherte Profil-Aktivzeit herstellen.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] `57-02-PLAN.md` - `/me/profile` Frontend-DTOs und jahrbegrenzte UI auf den neuen Date-Contract umstellen.

**Wave 3** *(blocked on Wave 1 and Wave 2 completion)*
- [x] `57-03-PLAN.md` - Phase-57-Regressionen, Migration-Checks, UAT-Handoff und Statuspflege abschliessen.

**Cross-cutting constraints:**
- Der persistierte neue Source-of-Truth sind `DATE`-Spalten auf `members`; alte `active_from_year`/`active_until_year` duerfen nur als Uebergangs-/Backfill-Kompatibilitaet bleiben.
- Die UI zeigt und akzeptiert nur Jahreswerte; Monat/Tag werden nicht als freie Entscheidung sichtbar.
- Protected `/me/profile` bleibt tokenfrei und laeuft ueber den zentralen Auth/API-Client; kein lokaler Bearer- oder Cookie-Zugriff.
- Accountdaten, Gruppenmitgliedschaften, historische Credits, Avatar und Profilgeschichte bleiben ausserhalb dieses schmalen Slices.

**Success Criteria** (what must be TRUE):
1. Eine neue reversible Migration fuehrt echte `DATE`-Spalten fuer den Profil-Aktivzeitraum ein und backfillt bestehende Jahreswerte verlustarm.
2. Backend-Repository, Handler, Modelle und Tests lesen/schreiben den neuen Date-Contract und validieren Jahrpraezision sowie Range-Logik.
3. `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts` und `frontend/src/lib/api.ts` beschreiben dieselben `active_from_date`/`active_until_date` Felder.
4. `/me/profile` bietet keine freie Text-/Number-Eingabe fuer den Aktivzeitraum mehr, sondern eine jahrbegrenzte semantische Auswahl.
5. "Aktuell aktiv" setzt `active_until_date` im Request auf `null` und deaktiviert die Bis-Auswahl ohne Layout- oder Dirty-State-Regressions.
6. Refresh-Session-ohne-Access-Token, Keycloak-Return-Refresh und Dirty-State-Schutz bleiben fuer das Profilformular erhalten.
7. Focused Backend-, Frontend-, Typecheck- und Migration/Diff-Checks sind dokumentiert.
### Phase 58: Profil-Hub Content, Membership Cards & Activity Preparation

**Goal:** `/me/profile` wird von einer strukturell korrekten aber inhaltlich leeren Seite zu einer echten Member-Identitaetsseite: MembershipsSection entfernt, zwei neue Content-Sections (Meine letzten Medien, Meine letzten Beitraege) eingefuehrt, Drawer mit dynamischen Gruppen-Links erweitert, alle Admin-Erklaerungstexte durch ehrliche leere Zustaende ersetzt.
**Requirements**: P58-SC1, P58-SC2, P58-SC3, P58-SC4, P58-SC5
**Depends on:** Phase 57
**Plans:** 3/3 plans complete

Plans:
- [x] `58-01-PLAN.md` -- Backend-Profil-Aggregat und TypeScript-Types um recent_media und recent_contributions erweitern
- [x] `58-02-PLAN.md` -- Neue RecentMediaSection und RecentContributionsSection; page.tsx bereinigen
- [x] `58-03-PLAN.md` -- AppShell-Drawer um dynamischen Meine-Gruppen-Abschnitt erweitern

**Success Criteria** (what must be TRUE):
  1. GET /api/v1/me/profile gibt recent_media (3 neueste release_version_media-Uploads) und recent_contributions (3 neueste release_member_roles-Eintraege) zurueck.
  2. /me/profile zeigt RecentMediaSection mit Thumbnail, Kategorie, Anime-Titel und RecentContributionsSection mit Anime-Titel, Gruppenname, Rollenbezeichnung.
  3. MembershipsSection ist vollstaendig aus /me/profile entfernt.
  4. App-Drawer zeigt dynamische Gruppen-Links (Icon und Gruppenname navigieren zu /admin/fansubs/[id]/edit) statt disabled-Platzhalter.
  5. Alle internen Admin-Erklaerungstexte sind durch ehrliche leere Zustaende ersetzt; isPublicView-Prop ist in beiden neuen Sections implementiert.

### Phase 59: �ffentliches Fansub-Member-Profil

**Goal:** �ffentlich zug�ngliche Profilseite /members/[slug] mit Hintergrundbanner-Upload, server-seitiger Sichtbarkeitspr�fung, globalisierten Profil-Komponenten und allen Phase-58-Sections mit isPublicView=true.
**Requirements**: P59-SC1, P59-SC2, P59-SC3, P59-SC4, P59-SC5, P59-SC6
**Depends on:** Phase 58
**Plans:** 6/6 plans complete

Plans:
- [ ] `59-01-PLAN.md` � Typdefinitions-Fundament: DB-Migration 0080, Go-Modell, TypeScript-Interface
- [ ] `59-02-PLAN.md` � Backend GET /api/v1/members/:slug mit Slug-Aufl�sung und Sichtbarkeitspr�fung

Wave 2 *(blocked on Wave 1 completion)*

- [ ] `59-03-PLAN.md` � Komponenten-Globalisierung nach /components/profile/ + MembershipsSection
- [ ] `59-04-PLAN.md` � �ffentliche /members/[slug]-Route (Server Component + Token-Forwarding)
- [ ] `59-05-PLAN.md` � Hintergrundbild-Upload auf /me/profile + Anzeige als Hero-Banner

Wave 4 *(blocked on Wave 3 completion)*

- [ ] `59-06-PLAN.md` � OpenAPI-Contract-Update

**Success Criteria** (what must be TRUE):
  1. GET /api/v1/members/:slug gibt public-Profil zur�ck (fansub_name, Avatar, Bio, Story, Gruppen, RecentMedia, RecentContributions, Hintergrundbild); bei members_only+anonym: {visible:false}.
  2. /members/[slug] rendert vollst�ndiges Profil mit Hero-Banner f�r public-Profile; zeigt �Dieses Profil ist nicht �ffentlich zug�nglich." f�r members_only+anonym.
  3. MemberProfileHero, RecentMediaSection, RecentContributionsSection leben in frontend/src/components/profile/ und werden von /me/profile importiert.
  4. Member kann auf /me/profile ein Hintergrundbild hochladen (Cropper 16:9, kein neues npm-Paket, globaler Upload-Flow); Bild erscheint als breites Hero-Banner auf /members/[slug].
  5. Fansub-Gruppen-Section auf /members/[slug] zeigt Gruppenlogo, -name und feste Gruppenrollen; Link zu /fansubs/[slug].
  6. Alle neuen user-facing Strings verwenden korrekte Umlaute.

### Phase 60: SMTP-Mailfluss fuer Team4s-Einladungen und Keycloak-Accountmails: lokal Mailpit als gemeinsamer SMTP-Catcher fuer Backend und Keycloak; spaeterer Produktionswechsel auf Mailjet als dokumentierter SMTP-Provider ohne Secrets im Repo.

**Goal:** Lokalen SMTP-Mailfluss fuer Team4s und Keycloak herstellen: Fansub-Gruppeneinladungen werden vom Team4s Backend per SMTP verschickt, Keycloak Account-Mails wie Passwort-Reset gehen ebenfalls ueber SMTP, lokal landen beide in Mailpit und fuer Produktion ist der spaetere Wechsel auf Mailjet als SMTP-Provider dokumentiert.
**Requirements**: P60-SC1, P60-SC2, P60-SC3, P60-SC4, P60-SC5, P60-SC6
**Depends on:** Phase 59
**Plans:** 1/3 plans executed

Plans:
- [ ] `60-01-PLAN.md` � Lokale SMTP-Infrastruktur: Mailpit, Keycloak-Mailpit-Konfiguration und Env-Doku.
- [ ] `60-02-PLAN.md` � Backend-Mailer-Service und Fansub-Einladungsversand.
- [ ] `60-03-PLAN.md` � OpenAPI/Frontend-Contract, Einladungs-UX und Mailjet-Produktionshandoff.

**Success Criteria** (what must be TRUE):
  1. `docker compose` enthaelt einen Mailpit-Service mit SMTP-Port 1025 und Web-UI-Port 8025.
  2. Keycloak kann lokale Account-Mails an Mailpit senden.
  3. Team4s Backend kann Fansub-Gruppeneinladungen per SMTP senden.
  4. Der Invitation-Contract dokumentiert Mail-/Delivery-Verhalten und bleibt zwischen Backend, OpenAPI, Frontend-DTOs und API-Helfer konsistent.
  5. Roh-Invite-Tokens werden nicht persistiert oder geloggt; Audit-Logs enthalten keinen klickbaren Token.
  6. Mailjet ist fuer spaetere Produktion als SMTP-Konfiguration dokumentiert, ohne Secrets im Repo und ohne Amazon-Abhaengigkeit.

---

## Milestone v1.3: Fansub Contributions & Gruppenhistorie

### Phase 61: Fansub Contributions Datenmodell

**Goal:** Datenbankfundament fuer Fansub-Contributions, Gruppenhistorie und Member-Identitaet legen: alle neuen Tabellen, Constraints, Indizes und Role-Definitions in reversiblen Migrationen anlegen. Kein API, kein Frontend in dieser Phase.
**Requirements**: P61-SC1, P61-SC2, P61-SC3, P61-SC4, P61-SC5
**Depends on:** Phase 60
**Plans:** 3/3 plans complete

Plans:

**Success Criteria** (what must be TRUE):
  1. Migrationen fuer members, member_claims, hist_fansub_group_members, hist_group_member_roles, fansub_group_history, anime_contributions, anime_contribution_roles, member_badges und role_definitions sind vorhanden und laufen fehlerfrei durch (up und down).
  2. role_definitions enthaelt alle Rollencodes mit context-Array; kein role_code existiert doppelt; leader, co_leader, founder sind als group_history-Rollen eingetragen.
  3. Alle Fremdschluessel-Constraints und kaskadierenden Deletes sind korrekt gesetzt.
  4. Alle BIGSERIAL-IDs; keine UUIDs ohne Begruendung.
  5. fansub_group_member_id in anime_contributions ist NOT NULL und referenziert hist_fansub_group_members(id).

### Phase 62: Fansub Contributions Admin-API

**Goal:** Backend-Repositories und Admin-API-Handler fuer Gruppenhistorie, Member-Rollen-Zeitraeume und Anime-Contributions implementieren. Public-Routen fuer Archive-Page-Daten bereitstellen.
**Requirements**: P62-SC1, P62-SC2, P62-SC3, P62-SC4, P62-SC5
**Depends on:** Phase 61
**Plans:** 4/4 plans complete

Plans:

**Success Criteria** (what must be TRUE):
  1. Admin-Routen GET/POST/PATCH/DELETE /api/v1/admin/fansubs/:id/group-members, /member-roles und /anime/:animeId/contributions sind implementiert und durch Auth-Middleware geschuetzt.
  2. GET/PATCH /api/v1/admin/fansubs/:id/history ist implementiert.
  3. Public-Routen GET /api/v1/fansubs/:id/contributions, /api/v1/anime/:id/contributions, /api/v1/members/:slug/contributions liefern nur oeffentliche Eintraege zurueck.
  4. Me-Routen GET /api/v1/me/anime-contributions und /api/v1/me/group-contributions sind implementiert.
  5. Alle neuen Handler folgen dem bestehenden Gin-Handler-Pattern; keine neue Abstraktion.

### Phase 63: Fansub Contributions Leader-Frontend

**Goal:** Admin-Frontend fuer Fansub-Leader: Mitglieder verwalten, historische Rollen und Leader-Zeitraeume pflegen, Anime-Contributions per Multi-Select zuweisen. Bestehende Admin-UI-Komponenten wiederverwenden, kein neues Design-System.
**Requirements**: P63-SC1, P63-SC2, P63-SC3, P63-SC4, P63-SC5
**Depends on:** Phase 62
**Plans:** 0 plans

Plans:

**Success Criteria** (what must be TRUE):
  1. Fansub-Admin-Seite hat neue Tabs: Mitglieder, Rollen/Timeline, Anime-Beitraege.
  2. Mitglieder koennen ohne App-User-Account eingetragen werden (historischer Member); App-User-Verknuepfung ist optional per bestehender MemberSelector-Komponente.
  3. Leader-Zeitraeume koennen pro Mitglied mit started_year/ended_year und role_code eingetragen werden.
  4. Anime-Contribution-Formular erlaubt Multi-Select aus Gruppenmitgliedern und Mehrfach-Rollenwahl per bestehenden Role-Chips.
  5. Sichtbarkeit (intern/oeffentlich) und Status (draft/confirmed/hidden) sind pro Contribution einstellbar.

### Phase 64: Fansub Contributions Member-Dashboard und Public Pages

**Goal:** Member-Dashboard fuer eigene Contributions (sehen, bestaetigen, ablehnen, Sichtbarkeit steuern). Oeffentliche Timelines fuer Gruppenprofil, Member-Profil und Anime-Seite. Einfache abgeleitete Badges.
**Requirements**: P64-SC1, P64-SC2, P64-SC3, P64-SC4, P64-SC5, P64-SC6
**Depends on:** Phase 63
**Plans:** 4/4 plans complete

Plans:

**Success Criteria** (what must be TRUE):
  1. /me/anime-contributions zeigt bestaetigte, ausstehende und eigene Eintraege; Member kann bestaetigen, ablehnen und Sichtbarkeit pro Eintrag steuern.
  2. Oeffentliches Gruppenprofil (/fansubs/:slug) zeigt Leader-Timeline aus fansub_group_member_roles und Meilensteine aus fansub_group_history.
  3. Oeffentliches Member-Profil (/members/:slug) zeigt Rollen-Timeline aus Contributions; unverifizierte Eintraege sind mit "(historisch)" markiert.
  4. Anime-Seite zeigt Contributions-Bereich mit Mitwirkenden und Rollen-Chips pro Fansub-Gruppe.
  5. member_badges-Tabelle wird befuellt fuer Gr�ndungsmitglied, Historischer Leader und Langjaehriges Mitglied; Badges sind im Member-Profil sichtbar.
  6. Member kann jeden Badge einzeln ausblenden.

### Phase 65: Member-Vorschlaege und Review-Queue (Post-MVP)

**Goal:** Member kann eigene Contributions vorschlagen. Leader sieht Review-Queue und kann bestaetigen oder ablehnen. Timeout-Handling nach 90 Tagen ohne Reaktion.
**Requirements**: P65-SC1, P65-SC2, P65-SC3
**Depends on:** Phase 64
**Plans:** 0 plans

Plans:

**Success Criteria** (what must be TRUE):
  1. POST /api/v1/me/contribution-proposals ist implementiert; Vorschlag erhaelt Status proposed.
  2. Leader sieht Review-Queue im Admin-Frontend und kann Vorschlaege bestaetigen oder ablehnen.
  3. Nach 90 Tagen ohne Reaktion ist der Vorschlag als unverified oeffentlich schaltbar oder kann an Moderation weitergeleitet werden.

### Phase 66: Claiming und Verifizierung (Post-MVP)

**Goal:** Member kann behaupten, ein historischer Nick zu sein (Claiming). Leader kann per Einladungslink bestaetigen. Verifizierungsstatus im Profil sichtbar. noindex-Steuerung per Member-Einstellung.
**Requirements**: P66-SC1, P66-SC2, P66-SC3
**Depends on:** Phase 65
**Plans:** 0 plans

Plans:

**Success Criteria** (what must be TRUE):
  1. member_claims-Tabelle unterstuetzt pending/verified/rejected; App-User kann einen Claim einreichen.
  2. Leader kann einen Einladungslink fuer einen historischen Member-Eintrag generieren; Claim wird nach Bestaetigun auf verified gesetzt.
  3. noindex-Flag ist pro Member-Profil einstellbar; verified-Status ist im oeffentlichen Profil sichtbar.

### Phase 67: Release- und Episode-Credits (Post-MVP)

**Goal:** Contributions auf Episode- und Release-Version-Ebene erweitern. Verknuepfung mit bestehenden Release-Tabellen. Erweiterte Detailansicht auf der Anime-Seite.
**Requirements**: P67-SC1, P67-SC2
**Depends on:** Phase 64
**Plans:** 0 plans

Plans:

**Success Criteria** (what must be TRUE):
  1. anime_contributions kann optional an eine episode_id oder release_version_id geknuepft werden (nullable FK, kein Breaking Change).
  2. Anime-Seite zeigt Contributions aufgeschluesselt nach Episode oder Release-Version wenn vorhanden.

### Phase 68: Badge-Engine und Archiv-Entdeckung (Post-MVP)

**Goal:** Vollstaendige Badge-Berechnung aus Contributions. Gruppen-Meilensteine manuell pflegbar. Erweiterte Archiv-Suche nach Rolle, Zeitraum und Gruppe.
**Requirements**: P68-SC1, P68-SC2, P68-SC3
**Depends on:** Phase 64
**Plans:** 0 plans

Plans:

**Success Criteria** (what must be TRUE):
  1. Badge-Engine berechnet alle definierten Badges aus Contributions und aktualisiert member_badges bei Datenaenderungen.
  2. Leader kann Meilensteine fuer die Gruppe manuell eintragen; Meilensteine erscheinen in der Gruppen-Timeline.
  3. Archiv-Suche erlaubt Filtern nach Rolle, Zeitraum und Gruppe und gibt Member-Profile zurueck.

### Phase 69: Fansub Contributions Contract- und Permission-Haertung

**Goal:** Phase 62/63 release-/live-tauglich machen. Frontend und Backend sprechen denselben Contract, der Member-Create-Flow funktioniert fachlich, Admin-Routen pruefen Gruppenberechtigung, und falscher Gruppen-/Member-Kontext sowie Duplikate werden auf DB- und Handler-Ebene verhindert.
**Requirements**: P69-SC1, P69-SC2, P69-SC3, P69-SC4, P69-SC5, P69-SC6, P69-SC7, P69-SC8, P69-SC9
**Depends on:** Phase 63
**Plans:** 5 plans

Plans:
- [ ] 69-01-PLAN.md -- Migration 0088: Unique-Constraint + Composite-FK fuer anime_contributions
- [ ] 69-02-PLAN.md -- Repository-Erweiterungen: Member-Auto-Create + Status im Contribution-Create + CreateOrUpdate
- [ ] 69-03-PLAN.md -- Backend-Handler-Haertung: Permission-Checks, Member-Auto-Create-Flow, Cross-Group-Guards, Status-Durchreichung
- [ ] 69-04-PLAN.md -- Frontend: Envelope-Korrektur (.data), listMemberRoles mit member_id, seed-konforme Rollencodes
- [ ] 69-05-PLAN.md -- OpenAPI-Contracts fuer group-members, member-roles und anime/:animeId/contributions

**Locked Decisions** (aus Discuss-Phase, nicht erneut aufrollen):
  - D1: Member-Create-Flow legt bei `display_name`-Eingabe automatisch eine `members`-Zeile an (optional mit `app_user_id`-Verknuepfung), dann die historische Mitgliedschaft. Kein Umbau auf reinen Member-Picker.
  - D2: Cross-Group-Schutz und Duplikat-Schutz werden per neuer append-only Migration 0088 auf DB-Ebene durchgesetzt (Unique-Key + Composite-FK), zusaetzlich zu Handler-Guards. (0087 ist bereits vergeben.)
  - D3: Envelope-Richtung folgt der projektweiten Konvention `{"data": ...}`; Frontend (api.ts + fansub.ts + Tabs) wird angepasst, Backend behaelt `{"data": ...}` und nutzt die bereits vorhandenen *WithDisplay-Repo-Methoden.


**Success Criteria** (what must be TRUE):
  1. Alle sechs Phase-62-Admin-Endpunkte (group-members, member-roles, anime/:animeId/contributions in List/Create/Update) liefern das projektweite `{"data": ...}`-Envelope, und das Frontend (api.ts, fansub.ts, GroupMembersTab, MemberRolesTab, AnimeContributionsTab) konsumiert `.data` korrekt; alle drei Tabs laden ohne Laufzeitfehler.
  2. POST /api/v1/admin/fansubs/:id/group-members akzeptiert `display_name` (+ optional `app_user_id`), legt bei Bedarf eine `members`-Zeile an und erstellt die historische Mitgliedschaft; GET nutzt die Display-Enrichment-Methode (ListByFansubGroupWithDisplay) statt der nicht angereicherten Liste.
  3. Der Rollen-Tab ruft GET /api/v1/admin/fansubs/:id/member-roles immer mit `?member_id=N` auf (kein 400 mehr), und die Rolleneingabe nutzt feste, seed-konforme role_codes per Auswahl statt Freitext.
  4. Alle Phase-62/63-Admin-Handler pruefen Gruppenberechtigung via `permissionSvc.CanForFansubGroup` analog der bestehenden Fansub-Flows und auditieren Denials; reine Authentifizierung genuegt nicht mehr.
  5. Contributions und Rollen mit einem `fansub_group_member_id`, das nicht zur Route-`fansubID` gehoert, werden abgelehnt (MemberBelongsToFansub), und Migration 0088 ergaenzt einen Composite-FK fuer Gruppen-/Member-Konsistenz.
  6. Migration 0088 fuegt einen Unique-Key auf (fansub_group_id, anime_id, fansub_group_member_id) hinzu; der Create-Pfad reagiert auf erneutes Speichern mit definiertem Verhalten (Konflikt oder echtes Upsert) statt Duplikaten.
  7. Der vom Contribution-Modal gesendete Status wird beim Create uebernommen; kein hartcodiertes `'draft'` mehr, wenn ein gueltiger Status uebergeben wird.
  8. Die im Frontend angebotenen role_codes stimmen mit den in der DB geseedeten Codes ueberein (z. B. `quality_checker` statt `qc`); ungueltige Codes sind nicht auswaehlbar.
  9. shared/contracts (openapi.yaml, fansubs.yaml, admin-content.yaml) enthaelt Definitionen fuer group-members, member-roles und anime/:animeId/contributions, konsistent mit fansub.ts und api.ts.

### Phase 70: TipTap-Bilder fuer Member-Profilgeschichte

**Goal:** Member koennen in ihrer eigenen Fansub-Geschichte auf `/me/profile` ein oder mehrere Bilder in den TipTap-Text einfuegen. Bilder werden nicht als Base64 oder externe URLs gespeichert, sondern ueber den bestehenden Team4s-Media-/Upload-Flow persistiert und im TipTap-Dokument per Media-Asset-Referenz eingebettet.
**Requirements**: TBD
**Depends on:** Phase 69
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 70 to break down)

**Success Criteria** (what must be TRUE):
  1. `RichTextEditor` unterstuetzt fuer die Member-Profilgeschichte eine sichere Bild-Einfuegen-Aktion mit Datei-Upload und optionalem Alt-/Caption-Text.
  2. TipTap-Image-Nodes speichern keine Base64-Daten, keine externen Bild-URLs und kein freies HTML, sondern referenzieren Team4s-Media-Assets.
  3. Der Upload nutzt bestehende zentrale Auth-/API-/Media-Seams und erzeugt keinen parallelen TipTap-Sonderweg.
  4. Backend-Validierung und HTML-Rendering erlauben nur die definierte Image-Node-Struktur und liefern weiterhin sanitisiertes HTML.
  5. Entfernen eines Bildes aus dem Text entfernt zunaechst nur die Editor-Referenz; physisches Cleanup verwaister Media-Assets ist bewusst separat geplant oder dokumentiert.
