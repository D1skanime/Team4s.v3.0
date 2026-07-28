# Roadmap: Team4s Admin Anime Intake

## Milestones

> Current planning note: Phase 21 is now complete; Phase 22 is the next slice to replace the stale anime edit UI with a create-flow-based editing surface.

- [x] **v1.0 Admin Anime Intake** - Phases 1, 2, 3, 4.1, 4, and 5 shipped on 2026-04-01. Details: [v1.0-ROADMAP.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Asset Lifecycle Hardening** - Phases 6 through 16 are complete or verified, and Phase 17 is the current next slice for the `/admin/anime/create` UX/UI follow-through. (completed 2026-04-17)
- [ ] **v1.2 Public Experience, Historie & Scoped Rights** - Phasen 72–80: bestehende Public Pages (`/fansubs/[slug]`, `/members/[slug]`, `/anime/[id]/group/[groupId]`), `/me/contributions`, Leader-Workspace und Rechteverwaltung werden gezielt erweitert, ohne Parallelmodelle. Kanonische Diskussion/Entscheidungen (LOCKED): [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)

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
- [ ] **Phase 42: TipTap Collaboration MVP fuer fansub_group_notes** - Geparkt/deferred seit 2026-06-21: Echtzeit-Kollaboration fuer offizielle Gruppennotizen ist nicht implementiert und nicht aktueller Blocker; alter Plan 01 wurde administrativ geschlossen, nicht fachlich ausgeliefert. Siehe `42-VERIFICATION.md`.
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

### Milestone v1.2 – Public Experience, Historie & Scoped Rights (Phasen 72–80)

- [x] **Phase 72: Domänen-Projektionen & Status-Fundament** - Backend/Contract-Fundament, das Mitglied vs. Mitwirkender vs. historische Nennung in DTOs/Projektionen sauber trennt und die phasenübergreifend nötigen Statusfelder einführt (`memorial`-Profilstatus, Contribution-Status/-Sichtbarkeit, Media owner/visibility/review-Metadaten), damit 73–80 ohne doppelte DTO-Arbeit darauf aufsetzen.
- [x] **Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern** - Bestehende Public-Fansub-Seite kuratiert ausbauen (Hero, Story/Timeline, Highlights, Mitglieder vs. Mitwirkende, Medien nach Ownership, Projektkarten) durch Reuse von `FansubProfileTabs`, `GroupLeaderTimeline` und public contribution helpers.
 (completed 2026-06-07)

- [x] **Phase 74: Public Member Profile `/members/[slug]` + Memorial** - Member-Profil als dreistufige Public-Seite erweitern (Hero+Status, Geschichte/Gruppenbezug, filterbare Contributions) inkl. Gedenkprofil-Darstellung und kuratierter Badge-Anzeige; Reuse Member API, Public Member Components, `RichTextRenderer`, Badge-Service.
- [x] **Phase 75: Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]`** - Gruppenspezifischen Anime-Projektkontext stärken (Projektstory, Releases/Versionen, OP/ED/Middle, Mitwirkende, Release-Version-Medien) ohne gruppenspezifische Daten auf die neutrale Anime-Ebene zu schreiben; Reuse `GroupAssetShowcase`, `CollapsibleStory`, group/release/theme APIs.
 (completed 2026-06-05)

- [x] **Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge** - Eigene Beitragsseite zum Klärungsdashboard ausbauen (Summary, „Das war ich"/„war ich nicht", Sichtbarkeit, Filter) und registrierte-User-Beteiligungsflows (Fehler/Story/Medien/Contribution melden, Claim-Einstieg) review-gebunden integrieren; Reuse `getMyAnimeContributions`, Proposal-/Review-Strukturen. (completed 2026-06-06)
- [ ] **Phase 77: Leader Workspace – Public Preview & Readiness** - In `/admin/fansubs/[id]/edit` Public-Preview, Public-Readiness-Check und die Pflege von Story-/Projekt-/Release-Kontext ergänzen (capability-gated), ohne `/admin/my-groups/[id]` zu duplizieren.
  **Plans:** 3 plans
  Plans:

  - [ ] `77-01-PLAN.md` - Wave-0-Testgeruest: ReadinessTab.test.tsx (RED) + page.test.tsx Capability-Gating-Cases (Req F, I, K)
  - [ ] `77-02-PLAN.md` - ReadinessTab.tsx + PublicPreviewPanel.tsx implementieren (Readiness-Checkliste, Preview-Fallback, CSS)
  - [ ] `77-03-PLAN.md` - page.tsx chirurgisch verdrahten (SectionKey, MAIN_TABS, canUseMainTab, Render-Zweig) + Human-Verify
- [x] **Phase 78: Leader Workspace – Review & Pflege** - In `/admin/fansubs/[id]/edit` die Review-/Pflege-Flächen ergänzen (offene Claims, offene Contributions, historische Member, externe Mitwirkende, Medienprüfung) auf bestehenden Claim-/Contribution-/Media-Seams, capability-gated, ohne Parallel-Queues.
 (completed 2026-06-06)
  **Plans:** 5 plans
  Plans:

  - [ ] `78-01-PLAN.md` — Wave-0-Testgeruest (RED): ContributionsReviewSection/GroupMediaReviewSection.test.tsx (mockt listFansubGroupMedia) + fansub_media_review_handler_test.go (SC1/SC3/SC4, D-09)
  - [ ] `78-02-PLAN.md` — ContributionsReviewSection (GDS) + ReviewQueue-Primitives-Migration + ClaimManagementPanel offen-Filter (D-01/D-02/D-07/D-08, Lock H)
  - [ ] `78-03-PLAN.md` — Backend Gruppenmedien-Review: GET-Liste + PATCH fansub_group_media + api.ts (listFansubGroupMedia/patchFansubMediaReview, Lock K/G/I, D-05/D-06/D-09); Phase-72-Schema-Gate
  - [ ] `78-04-PLAN.md` — GroupMediaReviewSection (liest via listFansubGroupMedia) + Phase-76-Stubs (D-03/D-04) + page.tsx-Verdrahtung + Human-Verify (Lock F/SC2/SC5)
  - [ ] `78-05-PLAN.md` — Release-Version-Media-Review: release_version_media PATCH-Erweiterung + ReleaseVersionMediaReviewSection im Release-Drawer (D-06 zweite Owner-Fläche, Lock K/G/I)
- [x] **Phase 79: Medien-Ownership in UI durchsetzen** - Upload-/Zuweisungsflows über alle Surfaces zwingen Owner-Typ, Owner-ID, Medienkategorie, Sichtbarkeit und Reviewstatus sichtbar zu machen und die Media-Ownership-Matrix einzuhalten; Reuse bestehender Upload-Helfer/Transport (`authorizedUploadXhr`).
 (completed 2026-06-06)

- [x] **Phase 80:  + User Detail Drawer (scoped Rechte)** - Globale User-/Rechteübersicht starten (Userliste + Detail-Drawer mit globalen Rollen, Member-Link, Gruppenmitgliedschaften, Claims, Contributions, Medien, Audit), Rechte strikt scoped, ohne Rechte aus Contributions abzuleiten. (completed 2026-06-15)
  **Plans:** 5 plans
  Plans:

  - [ ]  — Typ-Fundament: Go-DTOs, RevokeAppUserGlobalRole/CountActivePlatformAdmins, TypeScript-Interfaces, PlatformAdminGate-Bugfix
  - [ ]  — Wave-0-Testgerüst (RED): Repository/Handler/Frontend-Tests
  - [ ]  — Backend-Kern: Repository, Handler, Routing, Contract, api.ts
  - [ ]  — Frontend-Shell: page.tsx, AdminUsersClient.tsx, UserDetailDrawer.tsx
  - [ ]  — Tab-Komponenten (8 Tabs) + Human-Verify

### Korrektur-Phase – Release-Version Mehrfach-Fansubgruppen

- [x] **Phase 81: Release-Version Mehrfach-Fansubgruppen ohne Kombigruppe** - Mehrere Fansub-Gruppen an einer Release-Version werden als N gleichberechtigte Zeilen in `release_version_groups` geführt statt als synthetische `group_type='collaboration'`-Gruppe „A & B". Kehrt P21-SC3 bewusst um; entfernt die Kollaborations-Entität, stellt Schreib-/Lesepfade auf Mehrfachzuordnung um, migriert Bestandsdaten und zeigt Kooperationen sauber auf Release- und Gruppenebene.
 (completed 2026-06-09)

- [x] **Phase 86: Daten-getriebene Capability-Registry** - Rechte zentral als Daten (action_definitions + role_capabilities) statt pro .go/SQL-Stelle hartkodiert; neues Recht = Daten-Eintraege, kein Code-Edit. Go (Cache) und SQL (Join) lesen dieselbe Quelle der Wahrheit; behavior-preserving aus der heutigen roleMatrix migriert. (completed 2026-06-18)
- [x] **Phase 87: Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI** - View-Checks an ausgewaehlten Lese-Pfaden + Admin-UI zum Pflegen von role_capabilities (Rechte pro Rolle vergeben/entziehen ohne Deploy). Baut auf Phase 86 auf; steuert daten-getrieben wer was sehen darf. (completed 2026-06-19)
  **Plans:** 3 plans
  Plans:

  - [x] 87-01-PLAN.md -- Wave-0-RED-Tests + ReloadCache (permissions.go) + OpenAPI-Contract + TypeScript-Typen
  - [x] 87-02-PLAN.md -- Repository (CRUD) + Handler (Grant/Revoke/Guard) + View-Enforcement an 3 Admin-Endpunkten + Routing
  - [x] 87-03-PLAN.md -- Frontend Capability-Pflege-UI (Rollen x Actions-Matrix) + Nav-Link + Human-Verify
- [x] **Phase 93: Projektrollen-Sichtbarkeit & Hinweis-Formular** - `/me/contributions` poliert bestätigte Projektrollen und Hinweis-Formular gemäß abgestimmtem Prototyp; Teil-A-Verifizierung hat die Gruppen-Scoping-Erwartung bestätigt, die gemeinsame Rolle+Notizen+Bilder-Sichtbarkeit nicht bestätigt, daher wurde Option 3 umgesetzt: UI-Polish ohne erklärenden Sichtbarkeits-Hilfetext zu Bildern/Notizen. (completed 2026-06-29; Docker deployed on :3000)

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
**Status:** Parked/deferred after verification on 2026-06-21; no current runtime evidence was found for collaboration provider, Yjs document scope, presence, or multi-session collaboration flow. The old May 2026 implementation plan is retired and must be replanned before any code work.
**Plans:** 1 historical plan administratively parked; 0 implementation plans executed

Plans:

- [x] `42-01-PLAN.md` - Administrativ geparkt durch `42-01-SUMMARY.md`/`42-VERIFICATION.md`; nicht implementiert, nicht als Feature-Abschluss werten.
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
**Plans:** 3/3 plans complete

Plans:

- [x] `60-01-PLAN.md` - Lokale SMTP-Infrastruktur: Mailpit, Keycloak-Mailpit-Konfiguration und Env-Doku.
- [x] `60-02-PLAN.md` - Backend-Mailer-Service und Fansub-Einladungsversand.
- [x] `60-03-PLAN.md` - OpenAPI/Frontend-Contract, Einladungs-UX und Mailjet-Produktionshandoff.

**Success Criteria** (what must be TRUE):

  1. `docker compose` enthaelt einen Mailpit-Service mit SMTP-Port 1025 und Web-UI-Port 8025.
  2. Keycloak kann lokale Account-Mails an Mailpit senden.
  3. Team4s Backend kann Fansub-Gruppeneinladungen per SMTP senden.
  4. Der Invitation-Contract dokumentiert Mail-/Delivery-Verhalten und bleibt zwischen Backend, OpenAPI, Frontend-DTOs und API-Helfer konsistent.
  5. Roh-Invite-Tokens werden nicht persistiert oder geloggt; Audit-Logs enthalten keinen klickbaren Token.
  6. Mailjet ist fuer spaetere Produktion als SMTP-Konfiguration dokumentiert, ohne Secrets im Repo und ohne Amazon-Abhaengigkeit.

### Phase 71: UI-Politur Fansub-Contributions und Member-Profil auf globales Design-System

**Goal:** Bestehende Contribution- und Member-Profil-Flaechen durchgaengig auf das globale Design-System (`@/components/ui`) bringen und Anzeige- von Bearbeiten-Kontext sauber trennen. Buendelt drei beim Live-UAT (2026-06-03) erfasste UI-Befunde; keine neuen Datenmodelle/Backends ausser kleinen Korrektheits-Fixes.
**Requirements**: P71-SC1, P71-SC2, P71-SC3, P71-SC4
**Depends on:** Phase 68
**Status:** Complete on 2026-06-22 from current-code research after Phases 82/83/88.
**Plans:** 4/4 plans complete

Plans:

**Wave 1**

- [x] `71-01-PLAN.md` - Cross-phase consolidation for already-satisfied admin/cockpit scope and durable permission-bridge documentation. (completed 2026-06-22)

**Wave 2 *(blocked on Wave 1 completion)***

- [x] `71-02-PLAN.md` - Badge display/edit separation and shared icon/color badge presentation. (completed 2026-06-22)
- [x] `71-03-PLAN.md` - Public member-profile copy, empty timeline behavior, recent media aspect verification, and `/admin/my-groups/[id]` params fix. (completed 2026-06-22)

**Wave 3 *(blocked on Wave 2 completion)***

- [x] `71-04-PLAN.md` - Focused Phase 71 verification, final summary, and deferred-scope handoff. (completed 2026-06-22)

**Cross-cutting constraints:**

- Touched user-facing German strings use correct umlauts

**Success Criteria** (what must be TRUE):

  1. Release-Version-Dropdown im `AnimeContributionModal` nutzt `Select`+`FormField` aus `@/components/ui` (kein natives `<select>`); `ReleaseVersionBreakdown` ist an die globalen Tokens/Primitives angeglichen. (Quelle-Todo: contribution-dropdown-auf-globale-ui-primitives-umstellen)
  2. Credits-Anzeige ist in "Anime & Veroeffentlichungen" konsolidiert und durchgaengig "Mitwirkende" benannt (statt "Beitraege"); die Permission-Bruecke (Credit schlaegt optionalen, separaten, widerrufbaren Permission-Grant vor) ist als Produktentscheidung geklaert und dokumentiert. (Quelle-Todo: credits-ui-konsolidierung-und-permission-bruecke)
  3. Member-Profil: `params`-Korrektheitsbug behoben (`React.use(params)`, keine sync-dynamic-API-Errors mehr); Badge-Chip-Verwaltung ("Ausblenden") nur im Owner-/Edit-Kontext, nicht auf der Anzeige; Rollen-Timeline-Kontrast/Styling gefixt; Medienbild mit korrektem Aspect-Ratio/URL. (Quelle-Todo: member-profil-ui-und-params-bug)
  4. Anzeige- vs. Bearbeiten-Trennung ist konsistent: kuenftig-oeffentliche Flaechen (z. B. `/admin/my-groups`) zeigen nur an, Bearbeiten lebt im Edit-Bereich (`/admin/fansubs/[id]/edit`). ESLint-`no-restricted-syntax`-Guard kann nach Migration der Altfaelle von `warn` auf `error` angehoben werden.

### Phase 82: Mitwirkende projektweit zuordnen und Leader-Abdeckungs-Matrix

**Goal:** Der Tab „Anime & Veröffentlichungen" wird zum Projekt-Cockpit: (1) Anime-Mitwirkende sind für jede Person der Gruppe gleichwertig zuordenbar (App- UND historische Member, Anker auf `members.id`) mit Leader-Abdeckungssicht (Projekt × Rolle), Inline-Zuweisung und Standard-Team; (2) die bisherigen „Anime-Einblicke" werden in dieselbe Projektkarte integriert (Status-Badges, Inline-Einblick, Routing/Tab-Merge). Kontext + Entscheidungen: `82-CONTEXT.md`; verbindlicher Einblicke-Auftrag: `82-EINBLICKE-AUFTRAG.md`; Design-Seed: `82-SEED.md`.
**Requirements**: D-01..D-17, EINBLICKE-AUFTRAG
**Depends on:** Phase 81
**Status:** Complete — verifiziert 2026-06-11 (Live-UAT approved; `82-VERIFICATION.md`)
**Plans:** 6/6 + Coverage-Gap-Fix (82-07)

Plans:

- [x] `82-01-PLAN.md` — DB-Migrationen 0104–0107 (members-Backfill, anime_contributions.member_id, Rollen-FK, Standard-Team-Tabelle)
- [x] `82-02-PLAN.md` — Backend: member_id-Semantik + ListUnifiedGroupMembers + /default-crew CRUD + apply (D-04)
- [x] `82-03-PLAN.md` — Frontend-Typen + API-Helper (member_id, UnifiedGroupMember, DefaultCrewEntry, default-crew-Helper)
- [x] `82-04-PLAN.md` — Komponenten: ProjectCockpitBadges, AnimeProjectNoteWorkspace, CoverageMatrix (D-07) + Altfall-Migration
- [x] `82-05-PLAN.md` — page.tsx + AnimeContributionModal + DefaultCrewManager + AnimeReleasesFilterBar; volle Verdrahtung
- [x] `82-06-PLAN.md` — Tests (parseMainTab, Badge, Standard-Team-Button) + Human-UAT (12 Prüfpunkte)
- [x] Coverage-Gap-Fix (`82-07`) — Aggregat-Endpoint für echte Badge-/Matrix-Daten (D-12-ehrlich)

### Phase 83: Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit

**Goal:** Leader können Mitwirkende/Rollen **pro Release** festlegen, nicht nur anime-weit: Default = alle Team-Mitglieder sind auf jedes Release gemappt; pro Release sind Ausnahmen möglich („dieser User war hier nicht dabei") und Rollen-Overrides („der hat hier diese Rolle gemacht") — datenseitig über `anime_contributions.release_version_id` (+ `release_version_groups`). UI als Pro-Release-Sicht im bestehenden Projekt-Cockpit. (Folge-Phase Schicht B: member-zentrischer `/me`-Einstieg zum Mitwirken an Releases.) Design-Seed: `83-SEED.md`.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16
**Depends on:** Phase 82
**Plans:** 7 plans

Plans:

- [x] `83-01-PLAN.md` — Wave-0-Testgeruest: permissions_test.go neue Faelle (RED) + authz_permissions_test.go TestListActorContributionRolesForVersion (RED)
- [x] `83-02-PLAN.md` — Permission-Umbau CanForReleaseVersion + Resolver-Interface + ListActorContributionRolesForVersion
- [x] `83-03-PLAN.md` — GetMemberRolesForVersion Migration auf anime_contributions (D-13-Konsistenz)
- [x] `83-04-PLAN.md` — Effective-Contributions-Endpoint: neues Repository + Handler + Route + Contract
- [x] `83-05-PLAN.md` — ReleaseContributionDrawer.tsx (NEU) + ContributorAvatar.tsx + api.ts-Helper + Vitest-Tests
- [x] `83-06-PLAN.md` — page.tsx Cockpit-Verdrahtung: Mitwirkende-Button + Drawer-Mount + Badge
- [x] `83-07-PLAN.md` — UI-Konsolidierung: AnimeContributionModal natives select -> Select+FormField; ReleaseVersionBreakdown Primitives/Tokens; D-16-Dokumentation

### Phase 85: `/me/contributions` UI-/Flow-Cleanup

**Goal:** Die bestehende `/me/contributions`-Flaeche wird nach UI- und Architektur-Review enger, mobiler und Team4s-konformer gemacht: Claim bleibt Identitaetsvoraussetzung, aber verschwindet als Peer-Aktion aus dem Beitrags-/Melde-Picker; Modals werden global tastaturtauglich; Header/CTA, Proposal-Form und lokale Styles folgen dem UI-System; release-version-spezifische Arbeit wird nicht als animeweiter Beitrag suggeriert oder gespeichert.
**Requirements**: D-01..D-14 aus `85-CONTEXT.md`
**Depends on:** Phase 76, Phase 82, Phase 83
**Plans:** 1 plan

Plans:

- [x] `85-01-PLAN.md` - `/me/contributions` UI-/Flow-Cleanup: Modal-A11y, Header/CTA, Claim-Entflechtung, ProposalForm-YearPicker/Release-Version-State, mobile/tokenisierte Styles, fokussierte Tests

### Phase 88: Fansubber-Workspace & Contribution-Copy bereinigen

**Goal:** Member-facing fansubber workspaces and profile/contribution copy use simple project/group language, route release actions to the member release workspace, and preserve release-native media/auth contracts without broad public/admin credit changes.
**Requirements**: D-01..D-15 from `88-CONTEXT.md`
**Depends on:** Phase 87
**Plans:** 3/3 plans complete

Plans:

- [x] 88-01 Copy/auth normalization for member contribution and group surfaces
- [x] 88-02 Profile hub identity-link copy and global UI cleanup
- [x] 88-03 Release workspace polish and focused UAT handoff

### Phase 93: Projektrollen-Sichtbarkeit & Hinweis-Formular

**Goal:** `/me/contributions` zeigt bestätigte Projektrollen pro Anime verständlicher, nutzt einen separaten Chevron-Disclosure für Rollendetails, ersetzt die native Sichtbarkeitsauswahl durch eine passende UI-System-Kontrolle und macht das Hinweis-Formular kontextklarer, ohne Gruppen-/Member-/Release-Media-Ownership zu vermischen.
**Requirements:** Phase-93 Auftrag aus `93-CONTEXT.md`; Teil A ist vor UI-Umsetzung verpflichtend.
**Depends on:** Phase 76, Phase 85, Phase 88
**Status:** Complete under Option 3 on 2026-06-29; Docker deployed on :3000. Gruppen-Scoping ist bestätigt; der aktuelle Sichtbarkeits-Toggle steuert Rolle und `anime_contributions.note`, aber nicht release-version-scoped Medien, die separat über `media_assets.visibility_id` und `review_status_id` freigegeben werden. Deshalb enthält die UI keinen erklärenden Sichtbarkeits-Hilfetext zu Bildern/Notizen.
**Plans:** 1 plan implemented

Plans:

- [x] `93-01-PLAN.md` - Projektrollen-Karte, segmentierte Sichtbarkeit und Hinweis-Formular-Breadcrumb ohne irreführenden Bilder-/Notizen-Hilfetext.

### Phase 94: Rollen-/Capability-UX fachlich entwirren und mobil nutzbar machen

**Goal:** Aktive App-Gruppenrollen, historische Gruppenrollen und Anime-Beitragsrollen werden fachlich klar getrennt: die historische Rollen-UI nutzt eine eigene `group_history`-Rollenliste (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement), die aktive Mitglieder-UI zeigt nur aktive App-Rechte mit verständlicheren Begriffen, die Capability-Verwaltung bearbeitet/zeigt nur permission-bearing Rollen (Backend-Guard blockiert Grant/Revoke an rein historische Rollen), und die Capability-Pflege wird von einer breiten Vollmatrix auf eine rollenbasierte, kategorisierte, bei 390 px ohne horizontales Scrollen bedienbare Oberfläche umgebaut.
**Requirements:** Phase-94 Auftrag aus `94-CONTEXT.md` (Acceptance Criteria 1–11).
**Depends on:** Phase 86, Phase 87, Phase 93
**Plans:** 8/8 plans complete

Plans:

- [x] `94-01-PLAN.md` — Wave-0 Go-Tests (Assignable-Guard 422, Matrix-assignable, group_history-Read)
- [x] `94-02-PLAN.md` — Backend Assignable-Guard (Grant/Revoke 422) + Matrix-Anreicherung (assignable/contexts)
- [x] `94-03-PLAN.md` — Backend group_history Read-Endpunkt (kuratierte Whitelist) + Route
- [x] `94-04-PLAN.md` — Contract/Typen/api.ts/Test synchron (assignable/contexts + group_history-Helper)
- [x] `94-05-PLAN.md` — Neue UI-Primitives Switch + Accordion (@/components/ui)
- [x] `94-06-PLAN.md` — Capability-UI Master-Detail-Umbau (Badges, Accordion+Switch, Mobile-Sheet)
- [x] `94-07-PLAN.md` — Komponenten-Splits GroupMembersTab + FansubAppMembersSection (450-Limit)
- [x] `94-08-PLAN.md` — Mitglieder-Dialoge: historische Rollenquelle (D-07/D-09) + Aktive-Rechte-Label (D-10)

---

### Phase 95: Rollenmodell entwirren — Gruppen- vs. Projekt-Ebene, Techadmin/GFXler, data-driven

**Goal:** Das Rollenmodell wird fachlich entwirrt und vereinheitlicht — zwei klare Ebenen mit gemeinsamem `role_code`-Vokabular. (a) Gruppen-Ebene (gruppenweit, rechte-tragend/assignable): Gründer/in, Gruppenleitung/Fansub-Lead (`leader`+`fansub_lead` vereint), Co-Leitung, Fansub-Projektleitung (`project_manager`+`project_lead` vereint; eigene Rolle, ungleich Gruppenleitung), NEU Techadmin (Fansub-Page/Technik) und GFXler (Gruppen-Grafik). (b) Projekt-/Anime-Ebene (Contribution): Übersetzung/Editing/Timing/Typesetting/Encoding/Raw/QC/Design, wobei GFXler und Designer dasselbe Skill in zwei Scopes sind. Lifecycle = koexistieren (aktive Rolle = jetzt; historische Rolle = Jahres-Zeitraum via `hist_group_member_roles`, bereits vorhanden). Rollen werden voll data-driven (fansubGroupRoleCatalog aus `role_definitions` laden + Frontend-Rollenoptionen per API), sodass neue Rollen nur per Migration entstehen. Zusätzlich werden die aus Phase 94 verschobenen Review-Schulden behoben: CR-01 (Schreibpfad-Whitelist-Härtung historischer Rollen), WR-02 (Cross-Group-Scope-Check), WR-01 (Capability-Tests gegen Prod-Handler), WR-03/04 (Line-Limits), WR-05 (deterministische Kategorie-Reihenfolge).
**Requirements:** D-01 bis D-17 (Entscheidungen aus 95-CONTEXT.md)
**Depends on:** Phase 94
**Plans:** 6/6 plans complete

Plans:

- [ ] `95-01-PLAN.md` — Migration 0112 + Go-Backend-SQL-Sync (D-04/D-05/D-06/D-07/D-08)
- [ ] `95-02-PLAN.md` — Data-driven Catalog: LoadFansubGroupRoles + GET /admin/fansub-group-roles (D-12)
- [ ] `95-03-PLAN.md` — Security-Fixes CR-01/WR-02 + Auto-Archivierung D-10 (D-13/D-14)
- [ ] `95-04-PLAN.md` — Interface-Refaktorierung AdminCapabilityHandler + Stub-Entfernung (D-15)
- [ ] `95-05-PLAN.md` — Frontend: Typen/API + Member-Add-Consumer-Verdrahtung + contributionRoles + RoleCapabilityDetail D-17 (D-04/D-05/D-12/D-17)
- [ ] `95-06-PLAN.md` — Datei-Splits D-16 + Backend-Rebuild + Human-Verify (D-16)

---

<!-- Phase 96 ist parallel in Arbeit (responsive/mobile Member-Management-UI) und wird von ihrem eigenen Lauf registriert — Nummer bewusst freigehalten. -->

### Phase 97: Rollen-Lifecycle — historische Rolle-Authoring, Claim-Aktivierung & tagesgenaue Historie

**Goal:** Den Rollen-Lebenszyklus in Richtung **historisch → aktiv** vervollständigen und datentechnisch korrekt abbilden. (1) Historische Rollen mit **tagesgenauen** Start-/Enddaten authoren, direkt im „Historisches Mitglied anlegen/bearbeiten"-Dialog wählbar, **mehrere Rollen pro Person**. (2) **Enddatum-Regel:** ohne Enddatum = weiterhin aktiv; mit Enddatum = beendet/historisch (kein separater „Entzug"). (3) **Claim-Aktivierung:** wenn eine historische Person sich einloggt und ihre Identität bestätigt wird, werden Rollen ohne Enddatum als aktive App-Rollen übernommen, für beendete weist der Admin ggf. neue aktive Rollen zu. (4) **Aktive Rollen zuweisen** (Admin). (5) **Capability** definiert nur Rechte aktiver Rollen (konsistent mit Phase-95-G4); historische tragen keine Rechte. (6) **Sichtbarkeit:** historische Rollen (Start+Enddatum) im Member-Profil, später public — konkrete UI nachgelagert; Priorität = korrekte DB-Abbildung. Baut auf Phase 95 auf (Auto-Archivierung aktiv→historisch/D-10 ist bereits gebaut — dies ist die Gegenrichtung). Teil des Rollenmodell-Reworks (Sheppert-Modell).
**Requirements:** siehe `97-CONTEXT.md` (D-01 bis D-08)
**Depends on:** Phase 95
**Status:** Completed 2026-07-01
**Plans:** 6/6 plans complete

Plans:

- [x] `97-00-PLAN.md` -- Wave 0: RED-Test-Gerueste (D-02/D-03/D-04/D-05)
- [x] `97-01-PLAN.md` -- Wave 1: DB-Migrationen 0114/0115 (INT->DATE) + D-10-Auto-Archiv-Fix (atomar)
- [x] `97-02-PLAN.md` -- Wave 2: Backend-Structs + Handler-DTOs auf DATE-Typen umstellen
- [x] `97-03-PLAN.md` -- Wave 3: TypeScript-Typen + Admin-Dialog-UI (Input type=date, N Rollen) + GroupMembersTab
- [x] `97-04-PLAN.md` -- Wave 4: Claim-Aktivierung (ResolvePendingRolesToActive) + D-06 ClaimManagementPanel-Zuweisung
- [x] `97-05-PLAN.md` -- Wave 5: Vollverifikation + Human-UAT

---

### Phase 98: Segmentstream: serverseitig begrenzter HLS/Jellyfin-Playback-Layer fuer OP/ED/Kara-Segmente

**Goal:** Eine segment-spezifische, serverseitig begrenzte Playback-Schicht fuer OP/ED/Kara-Segmente planen und bauen: Wiedergabe erfolgt ueber gespeicherte Segmentquellen/-zeiten, kurze Segment-Grants und vorbereitete browserfaehige Clips, damit ASS/Kara-Effekte aus Release-Versionen erhalten bleiben. HLS ist kein MVP-Zwang.
**Requirements**: Segment-ID statt freier Stream-Parameter; harte 4-Minuten-Grenze fuer automatisch abgeleitete Clips; Background-Render/Cache mit Status; bestehende Segment-Upload-Fallbacks ohne neue Media-Struktur wiederverwenden; app-user-scoped Capabilities statt Rollen-Hardcode; public-faehiger Backend/API-Schnitt.
**Depends on:** Phase 97; bestehende Segmentquellen aus Migration 0054; bestehende Release-/Episode-Playback-Auth-Seams
**Plans:** 5/6 plans executed

Plans:

- [x] 98-00-PLAN.md - Tests und Contract-Flaeche zuerst
- [x] 98-01-PLAN.md - Schema, Runtime und Derived-Cache
- [x] 98-02-PLAN.md - Render-Service und Jellyfin-Probing
- [x] 98-03-PLAN.md - Segment-Grant, Stream-API und Next-Relay
- [x] 98-04-PLAN.md - Admin/Leader Segment-UI
- [ ] 98-05-PLAN.md - E2E-Verifikation und UAT

### Phase 99: Öffentliches Fansub-Member-Profil (Redesign)

**Goal:** Das öffentliche Fansub-Member-Profil wird von der bisherigen Tab-Struktur zu einer einzelnen scrollbaren Profilseite umgebaut: Hero, Gruppenzugehörigkeit, aktuelle Projektbeteiligungen, Auszeichnungen, letzte öffentliche/veröffentlichte Beiträge, Fansub-Geschichte und eingeklappte frühere Mitwirkungen. Umsetzung nutzt bestehende Member-, Rollen-, Release-Version-, Notizen-/Beitrags-, Medien-, Badge- und Gruppen-Projektionen; keine Platzhalterdaten, keine neue Eingabeoberfläche und keine parallelen Media-/Contribution-Strukturen.
**Requirements**: siehe `99-CONTEXT.md` (D-01 bis D-20; A-01 bis A-05 vor Umsetzung klären)
**Depends on:** Phase 98
**Status:** Planned 2026-07-07
**Plans:** 26/27 plans executed

Plans:

- [ ] `99-00-PLAN.md` - Wave 0: RED-Tests und Contract-Gates für Profilstruktur, Datenfilter, Media-Ownership, Badges, Story und frühere Mitwirkungen
- [ ] `99-01-PLAN.md` - Wave 1: Backend/Public-Profile-DTO, Projektionen und OpenAPI/TypeScript-Contract
- [ ] `99-02-PLAN.md` - Wave 2: Public-Profil Top-Sections Hero, Gruppenzugehörigkeit, aktuelle Projekte und Auszeichnungen
- [ ] `99-03-PLAN.md` - Wave 3: Letzte Beiträge, Fansub-Geschichte-Clamp und eingeklappte frühere Mitwirkungen
- [ ] `99-04-PLAN.md` - Wave 4: Integration, Mobile/Desktop-Browser-UAT und Human-Verify

**Add-on 4 — Öffentliche Gruppen-, Projekt- & Release-Detailseite** (angehängt 2026-07-08)
**Requirements**: siehe `99-ADDON4-CONTEXT.md` (AO4-01 bis AO4-25; Teil A/B geklärt)

- [ ] `99-05-PLAN.md` - Wave 5: AO4-01 Mitgliederzahl-Bugfix (`getGroupStats`/`MembersCount` = aktive `fansub_group_members` + öffentlich-historische, `== countVisibleTeamMembers`)
- [ ] `99-06-PLAN.md` - Wave 5: AO4-04 OP/ED/Middle-Zeitcodes aus `theme_segments` ins `PublicGroupTheme`-DTO + OpenAPI/TS
- [ ] `99-07-PLAN.md` - Wave 5: AO4-02/AO4-05 aggregierender Public-Release-Endpoint (release_version-basiert) + OpenAPI + api.ts
- [ ] `99-08-PLAN.md` - Wave 6: AO4-03/AO4-24 additive Cursor-Pagination für genau 3 Listen (Release-Liste, Galerie, Textliste)
- [ ] `99-09-PLAN.md` - Wave 7: AO4-06/AO4-07 Fansub-Gruppenseite Reihenfolge/Stat-Zeile/Sammel-Hinweis (Verify + Nachzieh)
- [ ] `99-10-PLAN.md` - Wave 7: AO4-08/09/10/14 Projektseite: Subgroups-Fehlertext entfernen, Hero-Verlaufs-Overlay, beschriftete Navigation
- [ ] `99-11-PLAN.md` - Wave 8: AO4-11/12/13/21/22/23/25 eingebettetes neuestes Release + ältere Releases (Cursor-Infinite-Scroll + Mehr laden)
- [ ] `99-12-PLAN.md` - Wave 8: AO4-15/16/17/20/23 neue Release-Detailroute: Hero-Kennzahlen, Beteiligten-Avatarreihe, OP/ED/Middle-Timeline ohne Player
- [ ] `99-13-PLAN.md` - Wave 9: AO4-18/19/05/21/22/23/24/25 vollständige Galerie (Typ-Tag+Autor) + Textliste, Cursor-Infinite-Scroll, Lazy/Skeleton/srcset, Mehr laden
- [~] `99-14-PLAN.md` - Wave 10: Integration/UAT — ERSETZT durch 99-18 (kombinierter finaler UAT Add-on 4 + 5)

**Add-on 5 — Öffentliche Fansub-Profilseite /fansubs/[slug] vervollständigen & polieren** (angehängt 2026-07-08)
**Requirements**: siehe `99-ADDON5-CONTEXT.md` (AO5-01 bis AO5-08)

- [ ] `99-15-PLAN.md` - Wave 11: AO5-01/AO5-02 Public-DTO: community_links + media title/description/category + deleted_at-Bugfix; OpenAPI/TS/Tests
- [ ] `99-16-PLAN.md` - Wave 12: AO5-05/AO5-06/AO5-08 Community-Links-Sektion + Medien-Sektion (Titel/Beschreibung/Typ-Tag, lazy/Skeleton/srcset) + deutsche Label-Maps
- [ ] `99-17-PLAN.md` - Wave 13: AO5-03/AO5-04/AO5-07 Reihenfolge (Hero→Geschichte→Projekte→Team→Erfolge→Medien) + Geschichte-Clamp + visuelle Politur
- [ ] `99-18-PLAN.md` - Wave 14: Finaler kombinierter Live-UAT (Add-on 4 + 5), Mobile+Desktop, Human-Verify — ersetzt 99-14

**Add-on 6 — Design-Polish & Skalierung /fansubs/[slug]** (angehängt 2026-07-09)
**Requirements**: siehe `99-ADDON6-CONTEXT.md` (AO6-01 bis AO6-12)

- [ ] `99-19-PLAN.md` - Wave 15: AO6-01/02/03 Backend-DTO: banner_url je Projekt, Medien ORDER BY sort_order, story→stories[] + OpenAPI/TS/Tests
- [ ] `99-20-PLAN.md` - Wave 16: AO6-03/05 Frontend story→stories[]-Migration + mehrere Geschichts-Blöcke (Titel + Clamp)
- [ ] `99-21-PLAN.md` - Wave 16: AO6-07/08 Team zweispaltig, klickbare Mitglieder, historische Rolle+Zeitraum + Einklappen
- [ ] `99-22-PLAN.md` - Wave 16: AO6-09/10 Meilensteine farblich + einheitliche Community-Chips
- [ ] `99-23-PLAN.md` - Wave 16: AO6-06 Banner-Projektkarten + A11y-Lazy-Karussell (scroll-snap, Pfeile, Skeleton, weitere anzeigen)
- [ ] `99-24-PLAN.md` - Wave 17: AO6-11 Medien-Vorschau 5 + Überlauf/Alle anzeigen + 2-Zeilen-Snippet + Lightbox-Trigger
- [ ] `99-25-PLAN.md` - Wave 18: AO6-12 Bild-Lightbox (Original, Weiter/Zurück, voller Text, Esc/←/→, A11y)
- [ ] `99-26-PLAN.md` - Wave 19: Finaler Live-UAT Add-on 6, Mobile+Desktop, Human-Verify

### Phase 100: Fansub Erfolge Freischaltlogik und Meilenstein-Katalog

**Goal:** Die Fansub-Gruppen-Erfolge werden nicht mehr pauschal/frei als Katalog umgesetzt, sondern pro Erfolg fachlich diskutiert, einzeln freigeschaltet, einzeln implementiert und getestet. Start ist `founding` / `Gründung`; alle weiteren History-, Projekt- und Release-Erfolge bleiben als explizite Todo-Liste sichtbar, damit keiner vergessen wird.
**Requirements**: Phase 100 Context D-01 bis D-07
**Depends on:** Phase 99
**Plans:** 1 plan

Plans:

- [ ] `100-00-PLAN.md` - Wave 0: Diskussionsqueue und Umsetzungsprotokoll für alle 23 Fansub-Erfolge; erster Slice `founding` / `Gründung`

**Success Criteria** (what must be TRUE):

  1. Jeder aktuelle Erfolgscode (`founding`, `first_release`, `anniversary`, `collaboration`, `project_completed`, `team_change`, `website_launch`, `award`, `revival`, `hiatus`, `disbanding`, `rebranding`, `milestone`, `other`, `projects_10`, `projects_50`, `projects_100`, `projects_500`, `releases_100`, `releases_500`, `releases_1000`, `releases_5000`, `releases_10000`) hat einen eigenen Diskussions-/Implementierungs-/Test-Todo.
  2. Die Arbeitsweise ist strikt sequenziell: ein Erfolg diskutieren, einen Erfolg implementieren, testen, dann erst der nächste.
  3. Bereits genutzte Erfolge verschwinden aus der Admin-Auswahlliste; gesperrte, noch nicht verfügbare Erfolge bleiben sichtbar und disabled.
  4. `founding` / `Gründung` ist der erste konkrete Umsetzungs-Slice: Gründungsjahr vorhanden -> auswählbar; Gründungsjahr fehlt -> disabled; bereits genutzt -> ausgeblendet.
  5. Count-Erfolge werden erst nach eigener Quellenentscheidung aus Backend-Daten freigeschaltet; keine frei wählbaren Legendary-Zähler als Dauerzustand.

### Phase 101: Meilensteine Zeitmanagement und Anzeige der Meilensteine verbessern

**Goal:** Die Meilenstein-Auswahl folgt einer klaren zeitlichen Progression: ohne Gründungsjahr ist nur `Gründung` gesperrt sichtbar; mit Gründungsjahr erscheinen zunächst nur `Gründung`, `Erstes Projekt` und `Erstes Release`; erst nach `first_project` und `first_release` wird der restliche Katalog sichtbar. Alle Meilenstein-Jahre sind auf `founded_year <= year <= aktuelles Jahr` begrenzt, frontendseitig im YearPicker und backendseitig gegen direkte API-Schreibzugriffe.
**Requirements**: Phase 101 Context D-01 bis D-06
**Depends on:** Phase 100
**Status:** Planned 2026-07-13
**Plans:** 2/2 plans complete

Plans:

- [ ] `101-01-PLAN.md` - Wave 0: Frontend-Regelfundament und Tests für stufenweise Meilenstein-Sichtbarkeit sowie YearPicker-Grenzen
- [ ] `101-02-PLAN.md` - Wave 1: Save-Validierung im Frontend, Backend-Jahresguard und Live-UAT auf `:3000`

**Success Criteria** (what must be TRUE):

  1. Ohne `founded_year` sieht der Admin im Meilenstein-Event-Selector nur `Gründung`, disabled mit `Gründungsjahr fehlt`.
  2. Mit `founded_year`, aber ohne eingetragene `first_project`- und `first_release`-Meilensteine, sind nur `Gründung`, `Erstes Projekt` und `Erstes Release` sichtbar.
  3. Erst wenn `first_project` und `first_release` als Einträge existieren, wird der restliche Meilenstein-Katalog nach den bestehenden Phase-100-Regeln sichtbar.
  4. Der YearPicker erlaubt keine Jahre vor `founded_year` und keine Jahre nach dem aktuellen Kalenderjahr.
  5. Backend-Create und Backend-Update für `fansub_group_history` lehnen direkte API-Schreibzugriffe mit `year < founded_year` oder `year > current year` ab.

### Phase 102: Fansubprojekte UI schrittweise verbessern

**Goal:** Die öffentliche Fansubprojekt-Detailseite `/anime/[id]/group/[groupId]` wird Schritt für Schritt verbessert. Der Einstieg von der Fansub-Profilseite bleibt nur der Absprung zur Projektseite; die Phase arbeitet primär an Hero, Navigation und Detailsektionen dieser Projekt-Public-Seite. Die Phase bleibt UI-fokussiert und nutzt bestehende Public-APIs, Banner-/Medien-Seams und Komponenten statt neue Datenmodelle zu bauen.
**Requirements**: Phase 102 Context D-01 bis D-07
**Depends on:** Phase 101
**Status:** Complete 2026-07-16
**Plans:** 8/8 plans complete

Plans:

- [x] `102-00-PLAN.md` - Kontrollplan: Fansubprojekt-UI als sequenzielle Diskussions-/Implementierungs-/UAT-Schritte
- [x] `102-01-PLAN.md` - Shared public Fansub project page loader/composition extraction
- [x] `102-02-PLAN.md` - Additive pretty route, `anime_slug` contract, public profile links, canonical metadata
- [x] `102-03-PLAN.md` - Same-Fansub project navigation and hero `Coop mit ...` links
- [x] `102-04-PLAN.md` - `Geschichte des Fansub-Projekts` story block and project member row cleanup
- [x] `102-05-PLAN.md` - Public release title safety and `Releases zum Fansub` conservative section
- [x] `102-06-PLAN.md` - Remove section nav, global empty summary, standalone OP/ED/Middle, standalone Medien
- [x] `102-07-PLAN.md` - Entry-link, pretty route, technical route, release-title, and responsive UAT

**Success Criteria** (what must be TRUE):

  1. Die Fansubprojekt-Detailseite `/anime/[id]/group/[groupId]` orientiert sich visuell am öffentlichen Fansubgruppen-Hero, bleibt aber fachlich ein Anime/Fansub-Projekt.
  2. Hero und Inhaltssektionen (`Fansub-Projekttext`, `Fansub-Projektmitglieder`, `Release-Versionen`, `OP/ED/Middle`, `Medien`) werden nicht gleichzeitig umgebaut; jede Sektion wird einzeln diskutiert, umgesetzt und getestet.
  3. Öffentliche Begriffe sind fachlich klar: Projektzählungen und Releasezählungen werden bei Bedarf als Fansub-Kontext benannt, ohne Backend-Felder umzubenennen.
  4. Die primäre Public-URL folgt `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`; technische ID-Routen bleiben höchstens Kompatibilitäts-/Weiterleitungsrouten.
  5. `Weitere Projekte von [Fansub]` navigiert zu weiteren Projekten derselben Fansubgruppe oder wird ersetzt/ausgeblendet; es springt nicht zu anderen Gruppenvarianten desselben Anime.
  6. Der Fansub-Projekttext ersetzt die falsche `Anime-Ausblicke`-Sprache durch `Geschichte des Fansub-Projekts` und nutzt einen einzelnen kollabierbaren Textblock wie die Fansub-Geschichte, ohne Archiv/Mehrfachseiten.
  7. Fansub-Projektmitglieder werden im Stil der öffentlichen Fansub-Memberdarstellung gezeigt; der finale Link-Zieltyp wird separat entschieden.
  8. Die bisherige Abschnitts-/Tabliste (`Geschichte`, `Beteiligte`, `Releases`, `OP/ED/Middle`, `Medien`) wird entfernt; die Seite folgt dem Fluss der öffentlichen Fansubseite.
  9. Der separate `Neuestes Release`-Highlightblock wird entfernt; Release-Versionen werden später als normaler Abschnitt diskutiert.
  10. Der Release-Abschnitt heißt `Releases zum Fansub`; `Weitere Releases` wird nicht weiterverwendet.
  11. Der globale Hinweis `Weitere Bereiche sind noch nicht öffentlich befüllt: ...` wird entfernt.
  12. Mobile/Tablet/Desktop-Verhalten wird pro Schritt live auf `http://127.0.0.1:3000/anime/13/group/1` und später auf der schönen URL verifiziert.
  13. Der Absprung von `/fansubs/[slug]` zur Projektseite bleibt funktionsfähig, ist aber nicht der primäre Design-Gegenstand dieser Phase.
  14. Keine neuen Upload-, Medien- oder Public-API-Seams entstehen; vorhandene DTOs und Komponenten werden wiederverwendet oder gezielt erweitert.

### Phase 103: Öffentliche Release-Detailseite als Fansub-Story mit Rechte-gesteuertem Episoden- und Karaoke-Playback

**Goal:** Die öffentliche Detailseite einer konkreten Release-Version als umfassende Fansub-Story mit technischen Daten, exakt Release-gebundenen Beteiligten, skalierbaren Bild-/Textkapiteln, begrenztem Kara-Playback und zentral berechtigtem optionalem Vollfolgen-Playback bereitstellen.
**Requirements**: P103-SC1, P103-SC2, P103-SC3, P103-SC4, P103-SC5, P103-SC6
**Depends on:** Phase 102
**Plans:** 5 plans

Plans:

- [ ] 103-01-PLAN.md — Public Aggregate, Vertrag, Preview, Techniktracks und gruppentreue Navigation
- [ ] 103-02-PLAN.md — Persistierte Vollfolgen-Entitlements und zentraler Most-specific-wins-Resolver
- [ ] 103-03-PLAN.md — Responsive Release-Story-UI mit Bildkapiteln und rollenbasierten Texten
- [ ] 103-04-PLAN.md — Öffentliche Kara-Timeline und Phase-98-gebundenes Segment-Playback
- [ ] 103-05-PLAN.md — Geschütztes Vollfolgen-Playback, Dialog und vollständige Live-UAT

**Success Criteria** (what must be TRUE):

1. Der Public-Read bildet exakt eine `release_version_id` mit Preview, Techniktracks, Kooperation, Urheberschaft, Segmenten und gruppentreuer Navigation vertragskonform ab.
2. Bilder erscheinen in vier responsiv aufklappbaren In-Page-Kapiteln und Texte nach Rolle; leere Bereiche verschwinden, Text-only-Releases bleiben vollständig nutzbar.
3. Gäste sehen Kara-Informationen ohne Abspielaktion; aktive Sessions spielen nur öffentliche, bereite, serverseitig begrenzte Segmente über kurze Grants ab.
4. Vollfolgenrechte folgen global → Gruppe → Projekt → Release mit spezifischster Regel; Button, Grant und Stream verwenden denselben zentralen Resolver.
5. Der Vollfolgenplayer bleibt eine nur bei positiver Berechtigung und Streambereitschaft sichtbare sekundäre Dialogaktion.
6. Responsive Live-UAT und die Refresh-Session-Regression bestehen über den realen Einstieg von der Public-Fansub-/Projektseite.

### Phase 104: Registrierungs-, Login- und Account-Onboarding-Hardening

**Goal:** Den sichtbaren Registrierungs-, Login- und Account-Onboarding-Flow gemäß den bindenden Entscheidungen D-01 bis D-24 in `104-CONTEXT.md` reparieren: normale Accounts bleiben fachlich neutral, Projektflächen setzen eine echte Contribution-/Projektzuordnung voraus, und die bewusst permissive lokale Keycloak-Testkonfiguration bleibt erhalten.
**Requirements**: P104-REG-1, P104-REG-2, P104-AUTH-1, P104-AUTH-2, P104-ACCOUNT-1, P104-ACCOUNT-2, P104-NAV-1, P104-UAT-1
**Depends on:** Phase 43 (Keycloak + app_user Foundation), Phase 49 (zentraler Auth/API-Client), Phase 52 (Account-Console Return-Refresh), Phase 72 (Member-/Account-Projektionen), Phase 76 (`/me/contributions`), Phase 80 (globale Rollen-/User-Semantik)
**Status:** Complete 2026-07-17
**Plans:** 6/6 plans complete

Plans:

**Wave 1**

- [x] 104-01-PLAN.md — Account-Console-403, deutsche Team4s-Keycloak-Oberflächen und stale Feldvalidierung reparieren; lokale Passwort-/Direct-Grant-/E-Mail-Testhaltung unverändert lassen

**Wave 2** *(blocked on Wave 1)*

- [x] 104-02-PLAN.md — Direkte deutsche Registrierungs-/Login-CTAs über globalen Button und bestehenden PKCE-Seam sowie vertrauenswürdigen One-shot-Handoff ergänzen

**Wave 3** *(blocked on Wave 2)*

- [x] 104-03-PLAN.md — Zentrale Auth-Cookies protokollabhängig mit Secure härten sowie Auth-/Profil-Hydration, neutrale Accountseite, einmalige Bestätigung und freiwillige Fansubber-Verknüpfung konsistent machen

**Wave 4** *(blocked on Wave 3)*

- [x] 104-04-PLAN.md — Autoritative Projektberechtigung aus echter Zuordnung ergänzen, Navigation gaten und nicht berechtigte Direktaufrufe zu Mein Account umleiten

**Wave 5** *(blocked on Wave 4)*

- [x] 104-05-PLAN.md — Doppelte Accountnavigation entfernen und mobilen Drawer/Logout deterministisch machen

**Wave 6** *(blocked on Wave 5)*

- [x] 104-06-PLAN.md — Integrierte Live-UAT ab der öffentlichen Startseite auf sichtbare Folgen begrenzen und DB-/Refresh-Invarianten mit obligatorischer automatisierter Evidenz dokumentieren

**Success Criteria** (what must be TRUE):

1. Gemäß D-01 bis D-04 ist Registrierung von `http://127.0.0.1:3000/` sichtbar erreichbar, meldet automatisch an, landet auf `/me/profile` und zeigt die neutrale, vertrauenswürdig ausgelöste Bestätigung einmalig bis Schließen oder Seitenwechsel.
2. Gemäß D-10 bis D-15 erzeugt Registrierung ausschließlich einen aktiven `app_user`: keine automatische Team4s-DB-Rolle, keinen Member, keine Mitgliedschaft, Contribution oder Projekt. Lokal bleibt `123` gültig, Lockout aus, Direct Grants an und E-Mail-Verifikation aus; Produktionshärtung bleibt Phase 999.2/Folgeauftrag.
3. Fehlendes/abgelaufenes Access-Token bei gültigem Refresh-Token bleibt in Shell, Profil und Contributions eine aktive Session und wird ausschließlich über den zentralen API-Client erneuert; keine falschen Login- oder leeren Zwischenzustände entstehen.
4. Gemäß D-06, D-08 und D-09 sehen nur verifizierte Member mit mindestens einer echten Projekt-/Contribution-Zuordnung „Meine Projekte“. Angemeldete Nichtberechtigte werden beim direkten `/me/contributions`-Aufruf zu `/me/profile` umgeleitet; anonyme Aufrufe bleiben login-gated.
5. „Accountdaten verwalten“ öffnet mit derselben Realm-Session die Keycloak Account Console ohne HTTP 403; die Ursache und Lösung sind in versionierten Realm-/Compose-/Bootstrap-Artefakten reproduzierbar und der Phase-52 Return-Refresh bleibt funktionsfähig.
6. Mobile Drawer-Navigation reagiert beim ersten Tap, schließt bei Link-/Routewechsel zuverlässig und Logout läuft genau einmal mit verständlichem Übergang; die doppelte Navigation auf dasselbe Accountziel ist entfernt.
7. Login, Registrierung, Reset und Account Console sind deutsch und Team4s-gebrandet; stale Feldfehler werden isoliert aktualisiert. Der automatisierte Theme-Script-Test ist unter `frontend/src/lib/keycloakRegistrationValidation.test.ts` ausführbar; `infra/keycloak/themes/team4s/login/register.ftl` bleibt ohne belegte DOM-Notwendigkeit abwesend/unverändert.
8. Gemäß D-17 bis D-20 und D-24 gibt es nur „Mein Account“, einen neutralen Auth-/Profil-Ladezustand, Retry+Logout statt falschem Login bei aktiver Session, zentralen Refresh-only-Schutz sowie deterministische Mobile-First-Tap-/Logout-Zustände.
9. Automatisierte Auth-, Contract-, Backend- und UI-Regressionen sowie abschließende Live-UAT sichtbarer Folgen ab Homepage bestehen; DB-Invarianten und künstlich nicht per UI herstellbare Refresh-Zustände werden ehrlich durch obligatorische automatisierte Evidenz belegt. Nur `/me/contributions` darf für den expliziten Direktzugriffstest über die Adresszeile geöffnet werden.

### Phase 105: Responsive Release-Detailseite und Kara-Timeline-Redesign

**Goal:** Die bestehende öffentliche Release-Detailseite wird für Desktop, Tablet und Mobile neu geordnet und visuell vereinheitlicht: Die Teamtexte folgen unmittelbar auf den Hero; danach nutzt die Kara-Sektion auf Desktop/Tablet eine echte episodenweite Timeline mit klaren Segmentkarten und auf Mobile eine touchfreundliche vertikale Kara-Liste. Bilder, Beteiligte, optionales Episoden-Playback und Release-Navigation bleiben auf derselben Seite, verwenden die bestehende öffentliche Team4s-/Fansub-UI-Sprache und bewahren die in Phase 103 verifizierten Daten-, Auth- und Playback-Verträge.
**Requirements**: P103-D-01, P103-D-06, P103-D-15, P103-D-16, P103-D-17, P103-D-18, P103-D-19, P103-D-20, P103-D-21, P103-D-22, P103-D-33, P103-D-34, P103-D-35, P103-D-36; P102-D-03, P102-D-04, P102-D-07.
**Depends on:** Phase 103

**Success Criteria** (what must be TRUE):

  1. Die sichtbare Inhaltsreihenfolge lautet Hero → Teamtexte → Karas → Bilder → Release-Beteiligte → berechtigungsabhängige vollständige Episode → vorheriger/nächster Release; keine Sprungnavigation trennt diese redaktionellen Inhaltsblöcke.
  2. Desktop zeigt eine vollbreite, auf die Episodendauer bezogene Kara-Timeline mit Zeitmarken, unterscheidbaren OP-/ED-/IN-/Middle-/Kara-Segmenten, klarer Auswahl und polierten Segmentkarten; der gewählte Player erscheint direkt im Kara-Bereich.
  3. Tablet behält die horizontale Timeline mit reduzierten Zeitmarken und wechselt die Segmentkarten ohne Überlauf oder ungenutzte Halbseitenflächen zwischen Zwei- und Einspaltenlayout.
  4. Mobile zeigt keine zusammengedrückte horizontale Timeline, sondern die Sektion `Karas` als vertikale Karten mit Typ-Farbleiste, Name, Zeiten, Beteiligten und mindestens 48 px hoher Abspielaktion; kleine unlesbare Segmentbilder entfallen.
  5. Hero, Bilderraster, Teamtexte, Beteiligte und Release-Navigation nutzen über alle Breakpoints konsistente Breiten, Abstände, Karten, Buttons und deutsche UI-Texte; lange Texte erzeugen auf Desktop keine große ungenutzte rechte Fläche und die Navigation liegt im normalen Seitenfluss.
  6. Gäste sehen Kara-Informationen ohne Abspielaktion oder Login-Hinweis; eingeloggte Nutzer können technisch bereite Karas wie in Phase 103 abspielen, Segmentwechsel stoppen den vorherigen Stream, und bestehende Release-/Auth-/Playback-Tests plus Live-UAT bei Desktop, Tablet und Mobile bleiben grün.

**Plans:** 4/5 plans executed

Plans:
**Wave 1**

- [x] 105-01-PLAN.md — Wave-0-Regressionsverträge für Komposition, Pretty-Route, Kara-Sicherheit und Content-Seams

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 105-02-PLAN.md — Serverkomposition, Hero, Release-Beteiligte, sekundäre Vollfolge und Inline-Navigation
- [x] 105-04-PLAN.md — Gemeinsames responsives Bilderraster und rollenbasierte aufklappbare Teamtexte

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 105-03-PLAN.md — Vollbreite Kara-Timeline, mobile Karas-Liste und sessiongebundener Playerzustand

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 105-05-PLAN.md — Vollständige automatisierte Gates sowie Pretty-Route-Live-UAT bei 390/768/1024/1440 px

### Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold)

**Goal:** Drei weitere abgeleitete Badge-Familien nach dem Prinzip „Bronze/Silber/Gold = Stufen derselben zählbaren, wiederholbaren Leistung" in die erweiterbare „Auszeichnungen"-Sektion (Phase 110) einhängen. Rein abgeleitete Live-Projektionen (Rückstufung bei Storno), kein neuer Buchungspfad, Badge-Bilder vorerst Platzhalter — analog Typ 2/3 aus Phase 112. Familien:

  | Familie | Bronze | Silber | Gold | Zähl-Basis |
  |---|---|---|---|---|
  | Vollständig dokumentierte Projekte | 1 | 5 | 15 | Anzahl „vollständig dokumentierter" Projekte |
  | Chronist (Notizen) | 10 | 50 | 150 | akzeptierte Notiz-/Text-Beiträge |
  | Bildarchivar | 10 | 50 | 150 | Release-Versionen mit eigenem Bildbeitrag |

**Offene Datenquellen (in discuss/research zu klären):** (1) Definition „vollständig dokumentiert" — Flag/Status oder abgeleitete Bedingung, und wessen Projekt-Scope; (2) exakte Quelle „akzeptierte Beiträge" (review-akzeptierte Contributions/Proposals vs. alle); (3) Autor-/Ownership-Seam für Bildbeitrag pro distinct Release-Version.
**Requirements**: GAM-04 (Badges als getrennte, abgeleitete Projektion; keine Punkte für Selbstpflege)
**Depends on:** Phase 110, Phase 112
**Plans:** 2/3 plans executed

Plans:
- [ ] `113-01-PLAN.md` — Backend read-time Datenschicht: 3 Schwellenfunktionen + loadContributionBadges (Familie 1 Coverage / Familie 2 Chronist / Familie 3 Bildarchivar) im Split-File, ID:0-Emission, <=5-Zeilen-Callsite, Unit-/Integrationstests (GAM-04, D-01..D-04)
- [ ] `113-02-PLAN.md` — Frontend-Praesentation: Gruppe Beitraege + 9 earned-only Presentation-Eintraege in memberBadgeLabels.ts, Vitest-Erweiterungen (D-05, GAM-04)
- [ ] `113-03-PLAN.md` — Live-Abnahme: volle Suiten + Container-Rebuild, Human-Verify der Beitraege-Gruppe, Live-Downgrade und Toggle-Trennung (D-01/D-05, GAM-04)

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
**Plans:** 3/3 plans complete

Plans:

- [x] `63-01-PLAN.md` - TypeScript interfaces und API-Funktionen fuer group-members, member-roles und anime contributions.
- [x] `63-02-PLAN.md` - GroupMembersTab und MemberRolesTab in die Fansub-Edit-Seite integrieren.
- [x] `63-03-PLAN.md` - AnimeContributionsTab und AnimeContributionModal in die Fansub-Edit-Seite integrieren.

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
**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 65-01-PLAN.md — Migration 0089 (review_note-Spalte) und Proposal-Repository-Datei

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 65-02-PLAN.md — Backend Proposal-Me-Handler (CreateProposal + SelfPublish) mit Tests
- [x] 65-03-PLAN.md — Backend Review-Handler (ListProposals, Confirm, Reject) mit Tests

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 65-04-PLAN.md — Frontend (Typen, API-Calls, ProposalForm, MyProposalsSection, ReviewQueue, CSS-Fixes)

**Success Criteria** (what must be TRUE):

  1. POST /api/v1/me/contribution-proposals ist implementiert; Vorschlag erhält Status proposed.
  2. Leader sieht Review-Queue im Admin-Frontend und kann Vorschläge bestätigen oder ablehnen.
  3. Nach 90 Tagen ohne Reaktion ist der Vorschlag als unverified öffentlich schaltbar (Member-Selbstschaltung, kein automatisches Eskalieren).

### Phase 66: Claiming und Verifizierung (Post-MVP)

**Goal:** Member kann behaupten, ein historischer Nick zu sein (Claiming). Leader kann per Einladungslink bestaetigen. Verifizierungsstatus im Profil sichtbar. noindex-Steuerung per Member-Einstellung.
**Requirements**: P66-SC1, P66-SC2, P66-SC3
**Depends on:** Phase 65
**Plans:** 12 plans (7 complete + 5 gap-closure)

Plans:

- [x] `66-00-PLAN.md` - Wave-0 Test-Stubs (Nyquist-Validierung) anlegen
- [x] `66-01-PLAN.md` - Migration 0092 member_claim_invitations anlegen und anwenden
- [x] `66-02-PLAN.md` - Backend-Repositories: member_claims und member_claim_invitations
- [x] `66-03-PLAN.md` - Backend-Handler: Claim-Endpunkte und Einladungslink-Endpunkte
- [x] `66-04-PLAN.md` - Backend-Verdrahtung und Frontend-Typen und API-Client
- [x] `66-05-PLAN.md` - Frontend VerifiedBadge, ClaimStatusCard, noindex-Toggle, generateMetadata
- [x] `66-06-PLAN.md` - Frontend claim-invitations/accept und Leader Claim-Queue

**Success Criteria** (what must be TRUE):

  1. member_claims-Tabelle unterstuetzt pending/verified/rejected; App-User kann einen Claim einreichen.
  2. Leader kann einen Einladungslink fuer einen historischen Member-Eintrag generieren; Claim wird nach Bestaetigun auf verified gesetzt.
  3. noindex-Flag ist pro Member-Profil einstellbar; verified-Status ist im oeffentlichen Profil sichtbar.

### Phase 67: Release- und Episode-Credits (Post-MVP)

**Goal:** Contributions auf Episode- und Release-Version-Ebene erweitern. Verknuepfung mit bestehenden Release-Tabellen. Erweiterte Detailansicht auf der Anime-Seite.
**Requirements**: P67-SC1, P67-SC2
**Depends on:** Phase 64
**Plans:** 5/5 plans complete

Plans:

- [x] 67-01-PLAN.md — Migration 0090: release_version_id + erweiterter UNIQUE-Constraint + Contract-Test + [BLOCKING] Apply
- [x] 67-02-PLAN.md — Backend-Schreibpfad: GroupParticipatesInReleaseVersion, Dropdown-Lookup, vierspaltiger Upsert, Leader-Handler D-03-Validierung, Proposal-Input
- [x] 67-03-PLAN.md — Public-Query: Ebene-1-Filter (IS NULL) + Versions-Aufschluesselung (attachVersionBreakdowns), DTOs, Repo-Test
- [x] 67-04-PLAN.md — Frontend: Dropdown-Endpunkt, api.ts/Typen/OpenAPI, ReleaseVersionBreakdown-Komponente, Leader-Dropdown (Tasks 1-3 committet; Task 4 Browser-UAT durch Orchestrator)
- [x] 67-05-PLAN.md — Member-Proposal-Backend: release_version_id + D-03-Validierung im Vorschlagspfad (Pitfall 5)

**Success Criteria** (what must be TRUE):

  1. anime_contributions kann optional an eine episode_id oder release_version_id geknuepft werden (nullable FK, kein Breaking Change).
  2. Anime-Seite zeigt Contributions aufgeschluesselt nach Episode oder Release-Version wenn vorhanden.

### Phase 68: Badge-Engine und Archiv-Entdeckung (Post-MVP)

**Goal:** Vollstaendige Badge-Berechnung aus Contributions. Gruppen-Meilensteine manuell pflegbar. Erweiterte Archiv-Suche nach Rolle, Zeitraum und Gruppe.
**Requirements**: P68-SC1, P68-SC2, P68-SC3
**Depends on:** Phase 64
**Plans:** 4/4 plans complete

Plans:

**Success Criteria** (what must be TRUE):

  1. Badge-Engine berechnet alle definierten Badges aus Contributions und aktualisiert member_badges bei Datenaenderungen.
  2. Leader kann Meilensteine fuer die Gruppe manuell eintragen; Meilensteine erscheinen in der Gruppen-Timeline.
  3. Archiv-Suche erlaubt Filtern nach Rolle, Zeitraum und Gruppe und gibt Member-Profile zurueck.

### Phase 69: Fansub Contributions Contract- und Permission-Haertung

**Goal:** Phase 62/63 release-/live-tauglich machen. Frontend und Backend sprechen denselben Contract, der Member-Create-Flow funktioniert fachlich, Admin-Routen pruefen Gruppenberechtigung, und falscher Gruppen-/Member-Kontext sowie Duplikate werden auf DB- und Handler-Ebene verhindert.
**Requirements**: P69-SC1, P69-SC2, P69-SC3, P69-SC4, P69-SC5, P69-SC6, P69-SC7, P69-SC8, P69-SC9
**Depends on:** Phase 63
**Plans:** 5/5 plans complete

Plans:

- [x] 69-01-PLAN.md -- Migration 0088: Unique-Constraint + Composite-FK fuer anime_contributions
- [x] 69-02-PLAN.md -- Repository-Erweiterungen: Member-Auto-Create + Status im Contribution-Create + CreateOrUpdate
- [x] 69-03-PLAN.md -- Backend-Handler-Haertung: Permission-Checks, Member-Auto-Create-Flow, Cross-Group-Guards, Status-Durchreichung
- [x] 69-04-PLAN.md -- Frontend: Envelope-Korrektur (.data), listMemberRoles mit member_id, seed-konforme Rollencodes
- [x] 69-05-PLAN.md -- OpenAPI-Contracts fuer group-members, member-roles und anime/:animeId/contributions

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
**Requirements**: D-01..D-24 (aus 70-CONTEXT.md)
**Depends on:** Phase 69
**Plans:** 7/7 plans complete

Plans:

- [ ] `70-01-PLAN.md` — Wave-0-Teststubs (Backend-Service + Handler + Frontend-Tests, rot)
- [ ] `70-02-PLAN.md` — DB-Migration 0089: owner_member_id auf media_assets
- [ ] `70-03-PLAN.md` — Backend TipTap-Service Image-Node (Allowlist, Validator, Renderer, bluemonday-Policy)
- [ ] `70-04-PLAN.md` — Backend Upload-Handler + Repository-Methoden (POST /me/profile/story-images)
- [ ] `70-05-PLAN.md` — Frontend StoryImageExtension + NodeView + RichTextEditor-opt-in + Upload-Utility
- [ ] `70-06-PLAN.md` — Save-Flow-Verdrahtung: IDOR-Check + Cleanup-on-Save + deferred-Batch-Upload in page.tsx
- [ ] `70-07-PLAN.md` — Verifikation, UAT, ROADMAP-Korrekturen (SC1-Gap, SC5-Override)

**Success Criteria** (what must be TRUE):

  1. [Korrigiert D-05] `RichTextEditor` unterstuetzt fuer die Member-Profilgeschichte eine sichere Bild-Einfuegen-Aktion mit Datei-Upload. Alt-/Caption-Text wurde per User-Entscheidung (D-05) nicht implementiert — dokumentierter Contract-Gap, kandidiert fuer spaetere Barrierefreiheits-Erweiterung.
  2. TipTap-Image-Nodes speichern keine Base64-Daten, keine externen Bild-URLs und kein freies HTML, sondern referenzieren Team4s-Media-Assets (media_asset_id).
  3. Der Upload nutzt bestehende zentrale Auth-/API-/Media-Seams (analog UploadOwnProfileAvatar) und erzeugt keinen parallelen TipTap-Sonderweg; RichTextEditor wird nicht geforkt (opt-in per Prop).
  4. Backend-Validierung und HTML-Rendering erlauben nur die definierte Image-Node-Struktur und liefern weiterhin sanitisiertes HTML (bluemonday-Policy mit src-Regex, style nur width%, class nur story-img-align-*).
  5. [Ueberschrieben D-13] Cleanup-on-Save ist in Phase 70 implementiert: Beim Speichern der Geschichte wird jedes dereferenzierte Story-Bild sofort physisch aus Dateisystem (/media) und DB (media_assets) entfernt. Urspruenglicher deferred-Status per User-Entscheidung (D-13) ueberschrieben.

### Phase 72: Domänen-Projektionen & Status-Fundament

**Goal:** Das phasenübergreifende Backend-/Contract-Fundament für Meilenstein v1.2: Read-Projektionen/DTOs trennen Gruppenmitglied, externe Mitwirkende und historische Nennung sauber, und die übergreifend nötigen Statusfelder existieren (`memorial`-Profilstatus, Contribution-Status/-Sichtbarkeit, Media owner/visibility/review-Metadaten), sodass Phasen 73–80 ohne doppelte DTO-Arbeit darauf aufsetzen. Keine Public-UI-Arbeit in dieser Phase.
**Requirements:** Entscheidungen A, G, H, I, J, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 71

**Success Criteria** (what must be TRUE):

  1. Es existiert eine Read-Projektion/DTO-Schicht, die für eine Fansub-Gruppe Mitglieder (`fansub_group_members`/`hist_fansub_group_members` + Rollen) und Mitwirkende (`anime_contributions`/`anime_contribution_roles`/`release_member_roles`) als getrennte, klar typisierte Mengen liefert — eine Release-Beteiligung erzeugt niemals einen Mitglieds-Eintrag.
  2. Member tragen einen Profilstatus, der mindestens `active`, `historical`, `unclaimed`, `claimed` und `memorial` unterscheidet; `memorial` ist nur serverseitig durch Plattform-Admin setzbar und über die Projektion auslesbar.
  3. Contributions liefern in den Projektionen einen expliziten Status (bestätigt / zugeordnet-unbestätigt / bestritten/Konflikt) und eine öffentliche Sichtbarkeit, getrennt vom Claim-Status.
  4. Media-Assets/-Relationen liefern Owner-Typ, Owner-ID, Medienkategorie, Sichtbarkeit und Reviewstatus in einer Form, die UI-Surfaces (73–80) ohne Owner-Verwischung konsumieren können.
  5. Alle neuen/erweiterten Felder sind in `shared/contracts` (openapi.yaml, ggf. admin-content.yaml) und in `frontend/src/lib/api.ts`-Typen konsistent abgebildet; keine undocumented response fields.
  6. Migrationen sind append-only; bestehende Public/Admin-Reads brechen nicht (Runtime-Authority unverändert, keine Umstellung öffentlicher Anime-Reads).

**Plans:** 4/4 plans complete
Plans:

- [x] `72-01-PLAN.md` — Migration 0096: additive Statusfelder (memorial, dispute_state, visibility_id + review-Lookup) + Wave-0-Roundtrip-Test
- [x] `72-02-PLAN.md` — Domänen-Projektions-Repo: Mitglied/historisch/Mitwirkender getrennt + dispute_state/visibility/review-Felder (GET-only)
- [x] `72-03-PLAN.md` — Medien-Ownership-Projektions-Repo: owner/category/visibility/review pro Junction-Kontext (GET-only)
- [x] `72-04-PLAN.md` — Contract-Slice (Lock K): OpenAPI-Schemas + 1:1 TS-Typen + api.ts-Clientfunktionen + Paritäts-Test

**Cross-cutting constraints:**

- D-05: ausschließlich GET-Read-Projektion, keine Schreib-Endpunkte

### Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern

**Goal:** Die bestehende Public-Fansub-Seite wird kuratiert erweitert (keine neue Route), sodass Besucher die Gruppe als Geschichte verstehen: Hero, Kurzgeschichte, Highlights, Projekte, Mitglieder, Mitwirkende, Medien, Timeline, Deep-Dive — mit korrekter Datenherkunft und klaren Labels.
**Requirements:** Entscheidungen B, C(Teil), G, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72

**Success Criteria** (what must be TRUE):

  1. `/fansubs/[slug]` zeigt einen disziplinierten Hero (Logo, Banner, Status, Aktivitätszeitraum, Kurzbeschreibung) und kuratierte Highlights über Reuse bestehender Komponenten (`FansubProfileTabs`, `GroupLeaderTimeline`).
  2. Mitglieder und Mitwirkende werden in zwei klar getrennten Bereichen mit verständlichen Labels dargestellt; eine Contribution erscheint nie als Gruppenmitgliedschaft.
  3. Medienbereiche sind nach Ownership getrennt dargestellt (Gruppenmedien vs. Release-Einblicke vs. Member-/Erinnerungsmedien) ohne Vermischung der Quell-Tabellen.
  4. Projektkarten verlinken auf `/anime/[id]/group/[groupId]` als Deep-Dive.
  5. Keine neue Public-Fansub-Route, keine ad-hoc-Fetches, keine Token-Direktzugriffe; alle Daten über bestehende API-Seams.

**Plans:** 14/14 plans complete
Plans:

- [ ] `73-01-PLAN.md` — FansubSectionNav (Client-Komponente, IntersectionObserver) + Test-Scaffolds
- [ ] `73-02-PLAN.md` — Hero, Story, Highlights, Projekte, Deep-Dive-Section-Komponenten
- [ ] `73-03-PLAN.md` — FansubTeamSection + Sub-Komponenten + FansubContributorsSection
- [ ] `73-04-PLAN.md` — FansubMediaSection + drei Ownership-Blöcke (parallel zu Plan 03)
- [ ] `73-05-PLAN.md` — page.tsx-Umbau: paralleler Datenfetch + Section-Orchestrierung + FansubProfileTabs-Bereinigung
- [ ] `73-11-PLAN.md` — Gap-Closure R2: Projektzähler-Quelle auf projects.length; teamMemberNames + historical (UAT-12, UAT-5)
- [ ] `73-12-PLAN.md` — Gap-Closure R2: Kollaborations-Gruppen via API-Endpunkt; Lead-Fallback aus DomainProjection (UAT-16, UAT-7-Lead)

### Phase 74: Public Member Profile `/members/[slug]` + Memorial

**Goal:** Die bestehende Public-Member-Seite wird zu einem dreistufigen Profil erweitert (Identität/Highlights → Geschichte/Gruppenbezug → filterbare Contributions), inkl. Status-/Memorial-Darstellung und kuratierter Badge-Anzeige.
**Requirements:** Entscheidungen C, J, Badges(13), K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72

**Success Criteria** (what must be TRUE):

  1. Profil-Hero zeigt Nickname, Avatar, Status (active/historical/unclaimed/claimed/memorial), aktive Jahre, bekannte Gruppen, wichtigste Rollen, sichtbare Badges und „Bekannt für".
  2. Contributions sind filterbar (Anime/Gruppe/Rolle/Zeitraum/Status); Hauptrollen bleiben vereinfacht, Detail-Subtypes erscheinen nur im Detail, nicht als neue Hauptrollen.
  3. Eine Korrektur-melden-Aktion existiert und erzeugt ausschließlich einen Review-gebundenen Vorschlag (keine direkte öffentliche Änderung).
  4. Memorial-Profile haben eine eigene, würdevolle Darstellung (keine normale Aktivitätsanzeige, keine Mengen-/Gamification-Badges) und sind nicht über normale Claim-Flows beanspruchbar.
  5. Badge-State wird über den bestehenden Badge-Service bezogen, nicht ad hoc im UI berechnet; Owner-Sichtbarkeit wird respektiert. Reuse Member API/`RichTextRenderer`; keine zweite Public-Member-Implementierung.

**Plans:** 7/7 plans complete
Plans:

- [x] `74-00-PLAN.md` — Wave-0 Test-Stubs (6 RED) + Migrations-Kollisions-Notiz (0096)
- [x] `74-01-PLAN.md` — Public-Badge-Quelle + Status ins PublicMemberProfile-DTO (Contract-first, Badges-13/C/K)
- [x] `74-02-PLAN.md` — Memorial-Setter (Global-Admin) + Claim-Sperre (beide Pfade) + Audit (J/D-14..D-17)
- [x] `74-03-PLAN.md` — Korrektur-melden: eigene Tabelle (Lock H) + review-gebundener Endpoint + Audit (D-18)
- [x] `74-04-PLAN.md` — Sektions-Scroll-Seite + Sticky-Nav + Status-Pill + würdevolle Memorial-Hero (C/D-01/D-02/D-09/D-10)
- [x] `74-05-PLAN.md` — Top-N-Badge-Highlights + clientseitige Contribution-Filter + Inline-Expand + Altlast-Migration (C/Badges-13/D-06..D-08/D-11)
- [x] `74-06-PLAN.md` — Write-Action-UI: Korrektur-Modal + Memorial-Setter-Action im Leader-Workspace + Human-Verify (D-12/D-16..D-18)
- [ ] `74-07-PLAN.md` — Gap-Closure: GetPublicMemberContributions 3. UNION (App-Gruppenrollen als group_history) + notes-DTO (GAP-3/GAP-2, Lock K)
- [ ] `74-08-PLAN.md` — Gap-Closure: MemberProfile.slug end-to-end + /me/profile-Link auf Slug (GAP-9, Lock K)
- [ ] `74-09-PLAN.md` — Gap-Closure: 5 clientseitige Filter (Anime/Gruppe/Rolle/Zeitraum/Status) + Durchreichen an MemberRoleTimeline + Inline-Expand notes (GAP-1/GAP-2)
- [ ] `74-10-PLAN.md` — Gap-Closure: Memorial-Schutzkette code-level (beide Claim-Pfade 409 + denied-Audit, Setter Global-Admin, D-10) via go test (GAP-6/7)
- [ ] `74-11-PLAN.md` — Gap-Closure: Live-UAT :3000 (ballelboy/angeldust) + automatisiertes Vorab-Gate (Verifikation)

### Phase 75: Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]`

**Goal:** Die bestehende gruppenspezifische Anime-Seite wird als zentraler Deep-Dive für Fansub-Projekte gestärkt, ohne gruppenspezifische Daten auf die neutrale Anime-Ebene zu schreiben.
**Requirements:** Entscheidung D, A, G, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72
**Plans:** 3/3 plans complete

Plans:

- [x] `75-01-PLAN.md` — Backend: drei neue öffentliche Projektions-Endpoints (Mitwirkende, Themes, Release-Medien) + OpenAPI + TypeScript-Typen + api.ts-Helper (Contract-zuerst per K)
- [x] `75-02-PLAN.md` — Frontend: page.tsx Umbau zu Orchestrator-Shell + HeroSection + StorySection + GroupSectionsNav (Sticky-Nav, D-04)
- [x] `75-03-PLAN.md` — Frontend: TeamSection + ReleasesSection + ThemesSection + MediaSection + BacklinksSection + page.tsx Verdrahtung + Human-Verify (Code+Build verifiziert; Human-UAT ausstehend)

**Success Criteria** (what must be TRUE):

  1. `/anime/[id]/group/[groupId]` zeigt gruppenspezifische Projektstory, Releases und Release-Versionen klar strukturiert über bestehende group/release APIs (`anime_fansub_groups`, `fansub_releases`, `release_versions`, `release_version_groups`).
  2. OP/ED/Middle-Segmente und Release-Version-Medien sind im Gruppenkontext sauber eingebunden (Release-Version-Medien über `release_version_media`, nicht über Gruppen-/Episode-Medien).
  3. Beteiligte Member/Mitwirkende werden im Projektkontext angezeigt, getrennt nach Bedeutung.
  4. Es gibt klare Rückverlinkung zur Fansubgruppe und zum neutralen Anime; gruppenspezifische Projektstory wird nicht auf der neutralen Anime-Ebene gespeichert.
  5. Öffentliche Anime-Reads werden nicht ohne Runtime-Authority-Entscheid auf andere Tabellen umgestellt; Reuse `GroupAssetShowcase`/`CollapsibleStory`.

### Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge

**Goal:** Die eigene Beitragsseite wird zum persönlichen Beitrags- und Klärungsdashboard erweitert, und registrierte User erhalten einfache, review-gebundene Beteiligungsflows (Fehler/Story/Medien/Contribution melden, Claim-Einstieg) — ohne Claim- und Contribution-Flows zu vermischen.
**Requirements:** Entscheidungen E, Runde 6, H, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72
**Plans:** 5/5 plans complete

Plans:

- [x] `76-01-PLAN.md` — Schema/Contract/Typ-Fundament: Migration 0098, OpenAPI, Frontend-Typen, Wave-0-Tests
- [x] `76-02-PLAN.md` — Backend: member_suggestions-Repository + Handler, Reject-Reason, api.ts-Helfer (Lock K)
- [x] `76-03-PLAN.md` — Frontend-Kernkomponenten: ContributionInbox, ContributionSummary + Stat-Chips, VisibilityDropdown-Migration (C2)
- [x] `76-04-PLAN.md` — Unified Melde-Modal + RejectReasonModal + ProposalForm-Migration (D-05/D-06/D-09/C2)
- [x] `76-05-PLAN.md` — page.tsx-Verdrahtung + ContributionCard-Erweiterung + Human-Verify

**Success Criteria** (what must be TRUE):

  1. `/me/contributions` zeigt ein Summary-Aggregat (pro Status/Gruppe/Anime/Rolle) sowie Statusgruppen (bestätigt, zugeordnet-unbestätigt, bestritten) über Reuse von `getMyAnimeContributions`.
  2. „Das war ich" bestätigt eine Contribution-Zuordnung (keine Claim-Logik); „Das war ich nicht" löscht nichts, sondern setzt einen Konflikt-/Reviewstatus.
  3. Öffentliche Sichtbarkeit eigener Beiträge ist steuerbar; Filter nach Anime/Gruppe/Rolle/Zeitraum/Status existieren.
  4. Registrierte User können Fehler/Story/Medien/Contribution vorschlagen und einen Claim starten; jeder Vorschlag trägt Submitter, Zielkontext, Typ, Inhalt, Status, Reviewzuständigkeit und Audit und veröffentlicht nichts direkt.
  5. Claim-Flow ist verlinkt, aber nicht mit dem Contribution-Flow vermischt; Leader-Review entsteht nicht außerhalb von `/admin/fansubs/[id]/edit`.

### Phase 77: Leader Workspace – Public Preview & Readiness

**Goal:** Im kanonischen Workspace `/admin/fansubs/[id]/edit` erhalten Leader eine Public-Vorschau, einen Public-Readiness-Check und die Pflege von Story-/Projekt-/Release-Kontext — capability-gated, ohne einen zweiten Workspace.
**Requirements:** Entscheidung F(Teil), I, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72 (Phase 73 liefert die Preview-Zieldarstellung)

**Success Criteria** (what must be TRUE):

  1. `/admin/fansubs/[id]/edit` bietet eine Public-Preview der Fansub-Seite, damit Leader nicht blind pflegen.
  2. Ein Public-Readiness-Check listet den Pflegezustand (Logo/Banner/Kurzbeschreibung/Story vorhanden, Mitglieder/Mitwirkende geprüft, Medien kategorisiert, offene Claims/Contributions, Vorschau verfügbar).
  3. Story-/Projekt-/Release-Kontext-Pflege ist im Workspace verfügbar und schreibt in die korrekten Owner-Tabellen.
  4. Jede Aktion ist capability-gated (Gruppenmitgliedschaft allein genügt nicht); keine Review-/Adminlogik in `/admin/my-groups/[id]`.
  5. Keine zweite Medien-/Claim-/Contribution-Verwaltung; alle Daten über bestehende Seams und Contracts.

### Phase 78: Leader Workspace – Review & Pflege

**Goal:** Im kanonischen Workspace `/admin/fansubs/[id]/edit` erhalten Leader die Review-/Pflege-Flächen für offene Claims, offene Contributions, historische Member, externe Mitwirkende und Medienprüfung — auf bestehenden Seams, capability-gated, ohne Parallel-Queues.
**Requirements:** Entscheidungen F, H, I, G, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72, Phase 76 (User-Vorschläge speisen die Review-Queues)

**Success Criteria** (what must be TRUE):

  1. Offene Claims und offene Contributions werden im Workspace getrennt dargestellt und können capability-gated bestätigt/abgelehnt werden (Claim- und Contribution-Review bleiben getrennte Flows).
  2. Historische Member und externe Mitwirkende sind im Workspace pflegbar, ohne sie mit App-Mitgliedern zu vermischen.
  3. Medienprüfung (Sichtbarkeit/Reviewstatus/Owner-Korrektheit) ist im Workspace möglich und schreibt in die korrekten Owner-Tabellen.
  4. Registrierte-User-Vorschläge aus Phase 76 erscheinen als Review-Eingang im richtigen Gruppenkontext.
  5. Keine Duplizierung der Review-/Adminlogik in `/admin/my-groups/[id]`; keine generische „Request"-Vermischung; alle Mutationen auditiert.

### Phase 79: Medien-Ownership in UI durchsetzen

**Goal:** Über alle Upload-/Zuweisungs-Surfaces wird die Media-Ownership-Matrix in der UI erzwungen: der Upload ist eine fachliche Entscheidung mit Owner-Typ, Owner-ID, Kategorie, Sichtbarkeit und Reviewstatus — ohne neue Medienwelt.
**Requirements:** Entscheidung G, I, K aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72, Phase 77, Phase 78

**Success Criteria** (what must be TRUE):

  1. Jeder Upload-/Zuweisungsflow macht den Owner-Kontext sichtbar und erzwingt Owner-Typ + Owner-ID + Medienkategorie vor dem Speichern (verständliche Auswahl, nicht technisch).
  2. Sichtbarkeit und Reviewstatus sind Teil jedes Upload-/Zuweisungsflows; Medien ohne Owner-Kontext werden nicht öffentlich.
  3. Release-Version-Medien landen ausschließlich über `release_version_media`; niemals über `release_media`, `episode_media` oder direkte Episode-Zuordnung; Gruppenmedien werden nicht als Release-Medien missbraucht.
  4. Es wird kein neuer Upload-Transport gebaut; `authorizedUploadXhr` und bestehende Upload-Helfer werden wiederverwendet.
  5. Bestehende Upload-Komponenten (`MediaUpload.tsx`, `ReleaseVersionMediaSection.tsx`, Profil-Media, Theme-Asset-Upload) werden konsistent auf das erzwungene Owner-/Status-Modell gehoben.

**Plans:** 5/5 plans complete
Plans:

- [x] `79-01-PLAN.md` — TDD: mediaStatusMapping + MediaOwnershipContext-Komponente (D-01/D-02/D-03/D-06/D-07/D-09)
- [ ] `79-02-PLAN.md` — Lock-K Contract-Pfad: OpenAPI + models + Repository INSERT + Go-Handler (Branding/Prozessmedien-Defaults) + api.ts
- [ ] `79-03-PLAN.md` — Surface 1 (MediaUpload.tsx Split + MediaOwnershipContext) + Surface 3 (ReleaseThemeAssetsSection + native-select-Migration)
- [ ] `79-04-PLAN.md` — Surface 4 (ReleaseVersionMediaSection + useReleaseVersionMedia) + Surface 2 (AnimeJellyfinAssetUploadControls)
- [ ] `79-05-PLAN.md` — Surface 5 (MemberAvatarCard + ProfileBackgroundCard + page.tsx) + Human-Verify alle 5 Surfaces

### Phase 80: `/admin/users` + User Detail Drawer (scoped Rechte)

**Goal:** Eine globale User- und Rechteübersicht wird gestartet: `/admin/users`-Liste plus User-Detail-Drawer als Rechte-/Übersichtszentrale, mit strikt gescopten Rechten und vollständigem Audit — erster Ausbau, nicht jede Spezialberechtigung sofort editierbar.
**Requirements:** Entscheidung I, H, K, J(Teil) aus [v1.2-DISCUSSION.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.2-DISCUSSION.md)
**Depends on:** Phase 72

**Success Criteria** (what must be TRUE):

  1. `/admin/users` listet App User mit Accountstatus, globalen Rollen, verknüpftem Member-Profil, Gruppenmitgliedschaften, Leader-Kontexten, offenen Claims, offenen Contributions, Medienuploads, letzter Aktivität und Konflikten.
  2. Der User-Detail-Drawer hat Tabs für Übersicht, globale Rollen, Member-Profil/Claims, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien und Audit.
  3. Rechte werden scoped dargestellt/vergeben (z. B. Gruppen-/Release-Version-bezogen), nicht pauschal; Medienrechte ohne Scope werden nicht vergeben.
  4. Rechte werden nicht aus Contributions abgeleitet; Gruppenmitgliedschaft ist keine pauschale Adminfähigkeit.
  5. Alle rechte-/statusändernden Aktionen sind auditierbar; nur Plattform-Admin erreicht die globale Zentrale (Leader sehen gruppenspezifische Rechte in `/admin/fansubs/[id]/edit`).

Plans:

- [ ] `80-01-PLAN.md` — Typ-Fundament: Go-DTOs, RevokeAppUserGlobalRole/CountActivePlatformAdmins, TypeScript-Interfaces, PlatformAdminGate-Bugfix
- [ ] `80-02-PLAN.md` — Wave-0-Testgerüst (RED): Repository/Handler/Frontend-Tests
- [ ] `80-03-PLAN.md` — Backend-Kern: Repository, Handler, Routing, Contract, api.ts
- [ ] `80-04-PLAN.md` — Frontend-Shell: page.tsx, AdminUsersClient.tsx, UserDetailDrawer.tsx
- [ ] `80-05-PLAN.md` — Tab-Komponenten (8 Tabs) + Human-Verify

### Phase 81: Release-Version Mehrfach-Fansubgruppen ohne Kombigruppe

**Goal:** Eine Release-Version kann mehrere bestehende Fansub-Gruppen als gleichwertige Mitwirkende referenzieren, ohne dass dabei eine neue „Kombigruppe" (`group_type='collaboration'`, Name „A & B") in `fansub_groups` entsteht. Eine Kooperation existiert ausschließlich als N gleichberechtigte Zeilen in `release_version_groups`; Anzeige als Kooperation passiert nur in der UI.
**Requirements**: P81-SC1, P81-SC2, P81-SC3, P81-SC4, P81-SC5, P81-SC6, P81-SC7, P81-SC8
**Depends on:** Phase 21 (kehrt P21-SC3 bewusst um), Phase 72/73/75 (Public-Lesepfade konsumieren `release_version_groups`)
**Success Criteria** (what must be TRUE):

  1. Wählt ein Admin im Episode-Version-Editor ODER im Jellyfin-Import mehrere Gruppen per Chip, entstehen genau N Zeilen in `release_version_groups`; es wird KEINE neue `fansub_groups`-Zeile (Kombigruppe) erzeugt.
  2. Das Kollaborations-Konzept ist entfernt: `group_type='collaboration'` und `fansub_collaboration_members` existieren nicht mehr, und kein Code-/Schreibpfad (`upsertImportCollaborationGroup`, `buildImportCollaborationName`) erzeugt noch zusammengesetzte Gruppen.
  3. Lesepfade liefern pro Release-Version ALLE beteiligten Gruppen (kein `LIMIT 1`); das DTO trägt `FansubGroups` (Liste) statt `FansubGroup` (Singular) in allen betroffenen Repos/Models/Contracts/Frontend-Typen.
  4. Die Release-Version-Ansicht zeigt alle beteiligten Gruppen als gleichwertige Chips (stabile alphabetische Sortierung) über `@/components/ui`-Primitives, ohne eine eigene Gruppe „A & B" zu suggerieren.
  5. Eine Release-Version erscheint auf der Seite jeder beteiligten Gruppe; dort ist die Kooperation erkennbar („Kooperation mit …" / „Mitwirkende Gruppen"), die aktuelle Gruppe ist hervorgehoben, ohne Hauptgruppen-Hierarchie.
  6. Beim Speichern werden alle IDs gegen `fansub_groups` validiert, abgewählte Zuordnungen entfernt und ungültige/nicht existierende IDs abgelehnt.
  7. Bestehende falsch erzeugte Kombigruppen werden per Migration über `fansub_collaboration_members` auf ihre echten Mitglieds-IDs gemappt, in `release_version_groups` UND `anime_fansub_groups` materialisiert und anschließend deaktiviert/gelöscht, sofern keine Fremdreferenzen mehr bestehen.
  8. Backend- und Frontend-Tests decken Schreiben (N Zeilen, keine Kombigruppe), Lesen (Aggregation mehrerer Gruppen) und die Bestandsdaten-Migration ab.

### Phase 86: Daten-getriebene Capability-Registry

**Goal:** Rechte werden zentral als Daten verwaltet (`action_definitions` + `role_capabilities`) statt pro `.go`/SQL-Stelle hartkodiert. Ein neues Recht wird durch Daten-Einträge integriert, ohne Rollen-Capability-Logik im Code anzufassen; Go (Cache) und SQL (Join) lesen dieselbe Quelle der Wahrheit. Migration ist behavior-preserving aus der heutigen `roleMatrix`. Vollständiges Design: `.planning/notes/capability-registry-design.md`.
**Requirements:** Capability-Registry-Design (`.planning/notes/capability-registry-design.md`); löst die in Phase 80 sichtbar gewordene Hartkodierung (`role IN ('leader',…)`) auf.
**Depends on:** Phase 80 (liefert die ersten Rechte-Flächen, die profitieren: Gruppenrechte-Query, Rechte-Drawer)
**Success Criteria** (what must be TRUE):

  1. Zwei Tabellen `action_definitions(code, label_de, category, sort_order)` und `role_capabilities(role_code FK→role_definitions, action_code FK→action_definitions)` existieren per Migration und sind behavior-preserving aus der heutigen Go-`roleMatrix` geseedet (1:1).
  2. `backend/internal/permissions/permissions.go` lädt die Matrix beim Start aus `role_capabilities` in einen In-Memory-Cache; die öffentliche API (`RoleAllowsAction`, `AllowedActionsForRole`) und die `Action`-Konstanten bleiben unverändert, alle bestehenden Aufrufer kompilieren ohne Änderung.
  3. Ein neues Recht hinzufügen erfordert NUR Daten-Inserts (`action_definitions` + `role_capabilities`) — kein `.go`/SQL-Datei-Edit; per Test/Doku nachgewiesen.
  4. Alle hartkodierten Rollen-Capability-Checks aus der Design-Notiz (SQL `role IN (...)` in admin_users-, badge_service-, anime_contributions_public-Repos; Go `role == ...` in authz.go, app_auth.go, admin_users_mutations_handler.go) konsultieren die Registry; keine Rollen-Literale mehr in Capability-Entscheidungen.
  5. Startup-Konsistenz-Check + Test: jede im Code verwendete `Action`-Konstante existiert in `action_definitions` (FK + Test) — ersetzt die verlorene Compile-Sicherheit.
  6. Die Phase-80-Gruppenrechte-Query (`can_view_members`/`can_edit_content`) nutzt einen Join auf `role_capabilities` statt `role IN ('leader',…)`; Verhalten unverändert (bestehende Tests grün).
  7. Permission-Checks bleiben performant: kein DB-Roundtrip pro Check (Cache beim Start, Invalidierung nur bei Änderung).
  8. Backend-Tests decken ab: Seed entspricht der alten roleMatrix (Diff-Test), Registry-Lookup, Konsistenz-Check, und mindestens eine umgestellte Bypass-Stelle.

**Plans:** 3/3 plans complete
Plans:

**Wave 1**

- [x] 86-01-PLAN.md -- Migration 0108 (action_definitions + role_capabilities + Seed) + Wave-0-Tests RED

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 86-02-PLAN.md -- permissions.go Cache-Umbau + authz_permissions.go LoadRoleCapabilities + main.go Verdrahtung

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 86-03-PLAN.md -- 3 SQL-Stellen (leader_count x2, can_edit_content) auf role_capabilities-JOIN

### Phase 87: Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI

**Goal:** Plattform-Admins steuern über die Rollenverwaltung, *wer was sehen darf*: gezielte View-Capability-Checks (`CanFor*` mit `*.view`-Action) an ausgewählten, heute ungated Lese-Pfaden, plus eine Admin-UI zum Pflegen von `role_capabilities` (Rechte pro Rolle vergeben/entziehen ohne Deploy). Baut auf der Phase-86-Registry auf. Voraussetzung: Phase 86 ist ausgeführt.
**Requirements:** Folgt aus der Capability-Registry-Diskussion (siehe `.planning/notes/capability-registry-design.md`, Abschnitt „optionaler Folge-Schritt"); konkrete Flächen-Liste wird in discuss/plan-phase festgelegt.
**Depends on:** Phase 86 (liefert action_definitions + role_capabilities + permissions.go-Cache); Phase 80 (Admin-UI-Muster + Last-Admin-Guard).
**Success Criteria** (what must be TRUE):

  1. Eine in der Phase festgelegte Liste heute ungated Lese-Pfade prüft vor Auslieferung das zutreffende View-Recht über die permissions.Service-Capability-Checks (Daten-getrieben aus Phase 86); gated vs. ungated ist per Test belegt.
  2. Eine Admin-UI (nur Plattform-Admin) listet alle Rollen mit ihren Capabilities aus `role_capabilities` und erlaubt das Vergeben/Entziehen einzelner Capabilities pro Rolle — ausschließlich über `@/components/ui`-Primitives, deutscher UI-Text mit Umlauten.
  3. Vergebene/entzogene Capabilities wirken nach Cache-Reload ohne Deploy; jede Änderung ist auditierbar (Audit-Seam wie Phase 80).
  4. `platform_admin`-Bypass bleibt; ein Last-Admin/Lockout-Schutz verhindert, dass kritische Sichtbarkeit/Admin-Fähigkeit versehentlich global entzogen wird.
  5. Contract-Disziplin: neue Endpunkte über `shared/contracts/*` (OpenAPI) → Backend → `frontend/src/lib/api.ts` → Frontend-Types; <=450 Zeilen pro Datei.
  6. Backend- und Frontend-Tests decken Enforcement (gated/ungated), die UI-Mutation (vergeben/entziehen) und die Cache-Reload-Wirkung ab.

## Arbeitspaket: Mitglieder-Auszeichnungen & Gamification

> **Neu ausgerichtet am 2026-07-22.** Die zuvor unter 106–110 geplante Medienmodell-Neuentwicklung ist vollständig verworfen. Das bestehende Medienmodell bleibt bestehen. Dieses Arbeitspaket baut ein bestätigungsgebundenes Punkte-, Badge- und Ranglistensystem auf den vorhandenen Member-, Contribution-, Release-, Notiz-, Medien- und Permission-Seams auf.

### Phase 106: Beitrags- und Punktefundament

**Goal:** Einen auditierbaren, idempotenten Gamification-Kern schaffen, der bestätigte historische Fansub-Leistung und bestätigte Plattformbeiträge einer stabilen Member-Identität zurechnet, ohne ein App-Konto vorauszusetzen oder bestehende Fachsysteme umzubauen.
**Requirements:** GAM-01, GAM-02, GAM-03, GAM-04, GAM-05
**Canonical constraints:** `.planning/notes/260722-member-gamification-DECISION.md`, `docs/architecture/db-schema-fansub-domain.md`, `docs/engineering/implementation-contract.md`.
**Depends on:** Bestehende `members`-, Claim-, Contribution-, Release-Rollen- und Permission-Strukturen.
**Success Criteria** (what must be TRUE):

  1. Punkte gehören fachlich zu einer stabilen `members`-Identität; ein ausführender `app_user` ist nur optionaler Akteur. Historische Mitglieder ohne Account können Punkte besitzen, ohne dass ein künstliches öffentliches Profil entsteht.
  2. Ein unveränderliches, idempotentes Punktebuch speichert Quelle, Beitragstyp, Member, optionalen Gruppenbezug, Regelversion, Wert, Wirksamkeitszeit und nachvollziehbare Stornierungen; dieselbe Quelle kann nicht doppelt belohnt werden.
  3. Ein zentraler, versionierter Punktekatalog liefert feste Werte je Beitragstyp. Prüfer können nur bestätigen oder ablehnen und niemals die Punktzahl frei festlegen.
  4. Profilpflege erzeugt keine Punkte. Profil-Meilensteine werden später ausschließlich als automatisch berechnete Badges behandelt.
  5. Die Phase verändert weder `media_assets`/`media_files` noch bestehende Upload-, Crop-, Thumbnail-, Relations- oder Cleanup-Flows. Neue Strukturen werden nur für Gamification ergänzt und sind durch Migrations-, Repository- und Contract-Tests abgesichert.

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 106-01-PLAN.md — Sicherer Testdatenbank-Guard und kompilierbare Migrations-/Append-only-/Stornoverträge

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 106-02-PLAN.md — DB-erzwungen unveränderlicher Regelkatalog und append-only Ledger mit Cross-Row-Stornoprüfung

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 106-03-PLAN.md — Expliziter RuleRef sowie idempotente Award-/Reversal-Repositorys mit Lost-Response-Retry

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 106-04-PLAN.md — Tx-gebundener und standalone PointService für Credit/Storno ohne Consumer-Wiring

### Phase 107: Prüf- und Delegationsfundament

**Goal:** Eine wiederverwendbare, domänenneutrale Grundlage für berechtigte Vier-Augen-Entscheidungen, typisierte Review-Delegationen, atomare First-Decision-Wins-Semantik, Audit und genau begrenzte Prüfpunkte schaffen, ohne bereits Release-Texte, Release-Medien oder eine Prüfoberfläche anzubinden.
**Requirements:** P107-SC1, P107-SC2, P107-SC3, P107-SC4, P107-SC5, P107-SC6
**Depends on:** Phase 106
**Success Criteria** (what must be TRUE):

  1. Review-Rechte werden je Beitragstyp über die bestehende Permission Engine delegiert. Fansub-Admins delegieren nur in ihrer Gruppe, Plattform-Admins global; Delegierte dürfen nicht weiterdelegieren.
  2. Es gibt keine Reservierungen, Übernahmen oder Zuweisungen. Alle passend Berechtigten können dieselbe offene Prüfung sehen; genau die erste atomar erfolgreiche Entscheidung gewinnt, parallele Verlierer erhalten einen stabilen Konflikt.
  3. Eigene Beiträge dürfen nicht regulär geprüft werden. Nur Plattform-Admins dürfen mit Pflichtbegründung übersteuern; Plattform-Admins erhalten niemals Punkte, Badges oder Auszeichnungen.
  4. Jede Zustandsänderung wird mit Akteur und Zeitpunkt auditiert. Reine Lesezugriffe werden nicht protokolliert; freier Begründungstext bleibt später datenschutzkonform löschbar, während strukturierte Audit-Metadaten erhalten bleiben.
  5. Prüfpunkte werden über den PointService aus Phase 106 gebucht: je konkretem Beitrag höchstens einmal für eine Ablehnung und einmal für eine spätere Bestätigung, niemals für denselben Entscheidungsschritt doppelt und niemals für Plattform-Admin-Overrides.
  6. Der Kern stellt schmale Domain-Adapter-Verträge für spätere Quellen bereit und beweist Autorisierung, Self-Review-Schutz, Parallelität, Idempotenz und Punktelimits automatisiert; Release-Quellen und UI bleiben Phase 107.1.

**Plans:** 6/6 plans complete

Plans:

**Wave 1**

- [x] 107-01-PLAN.md — Disposable PostgreSQL-Testharness und fail-first Sicherheitsverträge

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 107-02-PLAN.md — Additive Migration 0134 für Delegation, Entscheidungen, Audit und globale Review-Credit-Slots

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 107-03-PLAN.md — Typisierte Review-Capabilities und tx-gebundene Authz-Auflösung
- [x] 107-04-PLAN.md — Tx-gebundene Delegations- und Audit-Repositories
- [x] 107-05-PLAN.md — Atomare First-Decision-Wins- und quellenweite Review-Credit-Repositories

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 107-06-PLAN.md — Atomarer, domänenneutraler ReviewService mit Self-Review- und Punkte-Schutz

### Phase 107.1: Release-Prüfworkspace und Release-Beitragslebenszyklus (INSERTED)

**Goal:** Release-Version-Texte und Release-Version-Medien ohne paralleles Upload- oder Datenmodell durch den Prüflebenszyklus führen und dafür eine skalierbare, read-only Prüfoberfläche für Tablet und Desktop bereitstellen.
**Requirements:** P1071-SC1, P1071-SC2, P1071-SC3, P1071-SC4, P1071-SC5, P1071-SC6
**Depends on:** Phase 107
**Plans:** 7/7 plans executed

Plans:

- [x] 107.1-01-PLAN.md — Phase-107 readiness gate, interface inventory, and lifecycle schema
- [x] 107.1-02-PLAN.md — Canonical note/media submission adapters and same-ID resubmission
- [x] 107.1-03-PLAN.md — Authorized cursor queue/detail API and synchronized contracts
- [x] 107.1-04-PLAN.md — Atomic decision, conflict, audit, and points orchestration
- [x] 107.1-05-PLAN.md — Retention scrub and reference-safe physical deletion retry
- [x] 107.1-06-PLAN.md — Typed review client, group queue, and read-only detail UI
- [x] 107.1-07-PLAN.md — Submitter lifecycle UI tests/implementation and live UAT

### Phase 108: Bestehende Beitragsquellen anbinden

**Goal:** Bestehende Domänendaten über schmale, kontextspezifische Adapter als bestätigte Gamification-Quellen nutzbar machen, ohne Domain-Ownership oder Uploadsysteme zu vereinheitlichen.
**Requirements:** Phasen 106–107.1; kanonische Fansub-/Release-Domain.
**Depends on:** Phase 106, Phase 107, Phase 107.1
**Plans:** 7/8 plans executed

Plans:

**Wave 1**

- [x] 108-01-PLAN.md — Canonical snapshot and credit-lifecycle schema with no-backfill migration tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 108-02-PLAN.md — Complete stored snapshots and stored-only effective-contributions reads
- [x] 108-04-PLAN.md — Atomic project-text first-author, delete, and recreate credit lifecycle

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 108-03-PLAN.md — Atomic release-crew Set-Diff, points, reversal, restoration, and replace endpoint

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 108-05-PLAN.md — Typed OpenAPI/frontend replace contract and central-auth drawer integration
- [x] 108-07-PLAN.md — Atomic release-creation seeding at both canonical creation boundaries

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 108-08-PLAN.md — Project-only mutation restrictions, inherited synchronization, and complete runtime wiring

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 108-06-PLAN.md — Cross-boundary regression gate and bounded live UAT

**Success Criteria** (what must be TRUE):

  1. Tatsächliche Fansub-Leistung wird aus bestätigten Release-/Anime-Mitwirkungen und Rollen gewonnen; weitere Plattformarbeit wird getrennt nach Projekt-/Zusatznotizen und Metadatenpflege kategorisiert. Die bereits in Phase 107.1 angebundenen Release-Texte und Release-Version-Medien werden nicht erneut verdrahtet.
  2. Für jede Quelle ist definiert: Member-Zuordnung, Gruppen-/Release-Kontext, Bestätigungsstatus, Deduplizierungsschlüssel, Wirksamkeitszeit, Stornierungsverhalten und Herkunft der Reviewer-Entscheidung.
  3. Einreicher, ursprünglicher Urheber/Fansubber und Prüfer bleiben getrennte Identitäten. Punkte werden dem fachlich berechtigten Member gutgeschrieben, nicht automatisch dem hochladenden Account.
  4. Textlänge, Copy-and-paste-Erkennung und Datei-Hash-Deduplizierung sind keine Voraussetzung für Punkte. Qualität entsteht durch Review; Doppelpunkte verhindert das Punktebuch auf fachlicher Quellenebene.
  5. Anime-Stammdatenmedien bleiben reine Plattform-Administration ohne Member-Punkte. Bestehende Medien- und Textflüsse werden wiederverwendet und nicht in ein Universalmodell gezwungen.
  6. Quellenadapter besitzen fokussierte Contract-/Repository-Tests und verändern bestehende öffentliche oder administrative Darstellung nicht unbeabsichtigt.

### Phase 109: Ranglisten und Punkteprojektionen

**Goal:** Aus dem bestehenden Punktebuch performante globale, gruppenbezogene, kategoriale und zeitbezogene Ranglisten ableiten, historische Mitglieder ohne Account gleichwertig berücksichtigen und spätere Claims identitätsstabil abbilden, ohne Import, Backfill oder Erhalt bestehender Testdaten.
**Requirements:** Phasen 106–108; kanonisches Punktebuch sowie bestehende Member- und Claim-Strukturen; keine Import-, Backfill- oder Bestandsdatenlogik.
**Depends on:** Phase 106, Phase 107, Phase 107.1, Phase 108
**Status**: Per 109-CONTEXT.md (2026-07-26, User-Entscheidung D-03/D-04) auf das globale Allzeit-Total reduziert — keine Gruppen-/Kategorie-/Zeitraum-Ranglisten, keine Aufschlüsselung, keine UI/Badges in dieser Phase; diese bleiben für Phase 110 zurückgestellt. Die Success Criteria unten spiegeln den ursprünglichen breiteren Roadmap-Rahmen; 109-CONTEXT.md ist für die Planung maßgeblich.
**Plans:** 3/3 plans complete
Plans:

- [ ] `109-01-PLAN.md` — Wave-0-Testgerüst (RED): Migrations-Contract-Test für 0139 + Repository-Concurrency-/Reversal-/Ranking-Test
- [ ] `109-02-PLAN.md` — Migration 0139 (Tabelle + AFTER-INSERT-Fortschreibungs-Trigger + Guard-Trigger) + MemberPointTotalsRepository.ListRanking (GREEN)
- [ ] `109-03-PLAN.md` — Handler + Routenregistrierung (`/api/v1/member-point-ranking`) + OpenAPI-Contract + Frontend-Typen/API-Helper

**Success Criteria** (what must be TRUE):

  1. Ranglisten basieren ausschließlich auf wirksamen Buchungen des kanonischen Punktebuchs; es entsteht keine Import-, Backfill- oder Bestandsdatenlogik.
  2. Historische Members ohne Account erscheinen über ihre stabile Member-Identität mit Name, Punkten sowie Gruppen- und Rollenkontext, jedoch ohne erfundenen Profil-Link.
  3. Ein später bestätigter Claim verbindet den Account mit derselben Member-Identität; Punkte und Ranglistenverlauf bleiben erhalten und werden weder kopiert noch neu erzeugt.
  4. Globale, gruppenbezogene und kategoriale Ranglisten unterstützen Allzeit und aktuelle Zeiträume; heute erfasste historische Arbeit wird nicht fälschlich als heutige Aktivität gewertet.
  5. Stabile Sortierung, Pagination, kontrollierte Voraggregation und Lasttests verhindern teure Vollberechnungen sowie API-Fan-out pro Ranglistenzeile.

### Phase 110: Member-Badges, Ranglisten-UI und E2E-Abnahme

**Goal:** Verdienste, Fortschritt und Wettbewerb verständlich, anime-/fansubtypisch und responsiv darstellen und das Gesamtsystem gegen Punkte-Farming, Rechtefehler und Datenverlust verifizieren.
**Requirements:** Phasen 106–109; bestehendes UI-System und vorhandene Badge-/Achievement-Muster.
**Depends on:** Phase 106, Phase 107, Phase 107.1, Phase 108, Phase 109
**Status**: Per 110-CONTEXT.md (2026-07-27, User-Entscheidung) auf drei UI-Ideen plus deren erweiterbaren Container reduziert — globale Allzeit-Rangliste + Nav-Einstieg (D-01), Punktzahl im Member-Profil-Hero (D-02), rollenbezogene einmalige Einstiegs-Badges (D-03), kategorie-gruppierter „Auszeichnungen"-Container mit erster Gruppe „Rollen" (D-04, Grundlage für Phase 112). Keine Gruppen-/Kategorie-Ranglisten, keine volle E2E/UAT-Suite, keine Security-/Abuse-Testsuite in dieser Iteration; die Success Criteria unten spiegeln den ursprünglichen breiteren Roadmap-Rahmen, 110-CONTEXT.md ist für die Planung maßgeblich.
**Plans:** 4/4 plans complete
Plans:

- [ ] `110-01-PLAN.md` — Ranglisten-Seite `/members/ranking` (SSR, Table/Pagination/Empty/ErrorState) + Rangliste-Nav-Eintrag in AppShell (D-01)
- [ ] `110-02-PLAN.md` — Backend-Projektion erweitern: total_points (Go/Repo/OpenAPI) + live-abgeleitete Rollen-Einstiegs-Badges aus release_role_credit_lifecycles (D-02/D-03 Datenschicht)
- [ ] `110-03-PLAN.md` — Frontend-Anzeige: Punktzahl im MemberProfileHero + 8 Rollen-Einstiegs-Badges im bestehenden MemberBadgeChain-Katalog (D-02/D-03 UI)
- [x] `110-04-PLAN.md` — „Auszeichnungen"-Sektion zu kategorie-gruppiertem Container umbauen (Rollen/Fortschritt/Mitgliedschaft/Besondere Auszeichnungen), bestehende + neue Badges einsortieren, generischer Rollen-Zeilen-Merge für Phase 112 (D-04)
 (completed 2026-07-28)

**Success Criteria** (what must be TRUE):

  1. Globale und gruppenbezogene Ranglisten zeigen aktive und historische Mitglieder klar unterscheidbar; Account-Mitglieder können auf vorhandene öffentliche Profile verlinken, historische Einträge ohne Profil nicht.
  2. Kategorieaufschlüsselung trennt historische Fansub-Leistung, Plattformdokumentation und Moderation, während eine nachvollziehbare Gesamtwertung den Wettbewerb ermöglicht.
  3. Member-Profile erhalten keine Punkte für Selbstpflege, können aber automatisch abgeleitete Profil-Meilenstein-Badges anzeigen. Badge-Design und Darstellung folgen dem bestehenden Anime-/Fansub-Stil, UI-System, Mobile- und Barrierefreiheitsregeln.
  4. Fortschritt, Punkteherkunft, Stornierungen und Badge-Voraussetzungen sind verständlich einsehbar; keine Seite benötigt einen API-Fan-out pro Ranglistenzeile.
  5. E2E/UAT deckt historische Rückrechnung, aktuellen Beitrag, Fremdbestätigung, abgelehnten und erneut eingereichten Beitrag, automatische Bereinigung, Claim-Verknüpfung, globale sowie Gruppenrangliste ab.
  6. Security-/Abuse-Tests belegen: keine Selbstbestätigung, kein doppeltes Buchen, keine Scope-Überschreitung, keine höheren Prüfpunkte durch Ablehnung und keine Punkte durch bloße Profiländerungen.

### Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung

**Goal:** Die User-Verwaltung auf `/admin/users` ohne User-Detail-Drawer neu strukturieren. Benutzerdetails, globale Rollen, Member-/Claim-Kontext, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien und Audit werden passend und progressiv offengelegt auf der eigentlichen Seite dargestellt, statt in einen Drawer mit vielen Tabs ausgelagert zu werden. Die fachliche Trennung zu `/admin/role-capabilities` bleibt bestehen: Von den auf der User-Seite angezeigten Rollen führt ein verständlicher Link zur jeweiligen Rollen-/Capability-Detailansicht ("Was darf diese Rolle?"); `/admin/role-capabilities` zeigt pro Rolle einen Impact-Count ("N-mal vergeben") mit Sprung zur passend gefilterten User-Ansicht. Ziel ist eine übersichtliche, direkt navigierbare Benutzerverwaltung ohne überladenen Drawer und ohne die RBAC-Regelverwaltung mit der Personenverwaltung zu verschmelzen. Eigenes UX-Anliegen, nicht Phase 94.
**Requirements:** Keine REQ-IDs (kein Phase-111-Mapping in REQUIREMENTS.md) — Coverage-Einheit sind die Kontext-Entscheidungen D-01…D-06 aus `111-CONTEXT.md`.
**Depends on:** Bestehende `/admin/users`- und `/admin/role-capabilities`-Oberflächen
**Plans:** 5/5 plans complete

Plans:

- [ ] `111-01-PLAN.md` — Backend RBAC-Impact-Count-Fundament: Go-Struct/OpenAPI/TS-Typ-Contracts + CountGlobalRoleAssignments + Handler-Merge synthetischer globaler Rollen-Zeilen (D-05)
- [ ] `111-02-PLAN.md` — /admin/users/[id] Accordion-Detailseite: neue Route unter PlatformAdminGate, Accordion statt Tab-Leiste, Default-Open/Lazy-Cache, Zurück-Link, Drawer/UserDetailContent gelöscht (D-01/D-02/D-03/D-06)
- [ ] `111-03-PLAN.md` — AdminUsersClient URL-Filter + Navigation statt Drawer: useUserListFilters-Hook, Zeilen-Navigation mit from-Parameter, FormField-Fix (D-01/D-06)
- [ ] `111-04-PLAN.md` — RBAC-Link User→Rolle: resolveRoleLink-Utility, Link auf UserGroupRightsTab, Regressionsschutz auf UserGlobalRolesTab (D-04)
- [ ] `111-05-PLAN.md` — RBAC-Link Rolle→User + URL-Vorauswahl: Impact-Count/Badge-Label auf RoleMasterList, ?role=-Vorauswahl auf RoleCapabilityClient (D-05/D-06)

### Phase 112: Member-Punkt-Meilenstein-Badges

**Goal:** Zwei abgeleitete Badge-Familien in die Profil-„Auszeichnungen"-Sektion (Phase 110) einhängen. Typ 2 (Punkt-Meilensteine): Stufen aus der Gesamtpunktzahl (1 / 50 / 200 / 500 / 1 000 / 2 500), nur der höchste erreichte Rang wird gezeigt. Typ 3 (Rollen-Volumen): Bronze/Silber/Gold/Platin pro Rolle nach Anzahl der Release-Version-Credits in dieser Rolle (12 / 108 / 320 / 510), reiht sich neben den Typ-1-Einstieg in die „Rollen"-Gruppe. Beide rein abgeleitete Live-Projektionen (Rückstufung bei Storno), keine Punkte fürs Badge, kein neuer Buchungspfad — dieselben `release_role_work`-Buchungen, für Typ 2 summiert, für Typ 3 pro Rolle gezählt. Typ 1 (Rollen-Einstiege) bleibt Phase 110.
**Requirements:** Phase 109 (persistierte Punktsumme `member_point_totals`, `release_role_work`-Ledger), Phase 110 (erweiterbare Profil-Badge-Sektion). Badge-Bilder liefert der Nutzer später; vorerst Platzhalter.
**Depends on:** Phase 109, Phase 110
**Plans:** 3/3 plans complete

Plans:

- [ ] `112-01-PLAN.md` — Backend Typ-3-Datenschicht: rollen-gefilterte Netto-Zählung der release_role_credit_lifecycles → Volumenstufen-Badges (Bronze/Silber/Gold/Platin), neues Split-File + Live-Projektions-Test (GAM-04, D-02/D-04)
- [ ] `112-02-PLAN.md` — Frontend-Katalog/Ableitung: 6 Punkt-Meilenstein-Presentations + deriveMilestoneBadge (Typ 2) und dynamischer role_volume_-Resolver + Palette (Typ 3) in memberBadgeLabels.ts (D-01/D-03/D-04)
- [ ] `112-03-PLAN.md` — Frontend-Rendering & SSR-Verdrahtung: Rollenname-Zeilen-Präfix + Tier-Paletten-CSS in MemberBadgeChain, Meilenstein-Merge in members/[slug]/page.tsx (D-01…D-04)

### Phase 114: Öffentliche Fansub-Gruppen-Übersicht

**Goal:** Den bislang toten Navigationseintrag „Fansub-Gruppen" mit einer öffentlichen Übersichts-/Landing-Seite unter `/fansubs` beleben: ein Gruppen-Directory, das alle Fansub-Gruppen mit Name, Kennzahlen (Anime-Projekte, Release-Versionen, Mitglieder) und Aktivität listet und je Zeile auf die bestehende Gruppen-Detailseite `/fansubs/[slug]` verlinkt. Nutzt die vorhandene `getFansubList()`-API und die schon berechneten Gruppen-Kennzahlen sowie das globale UI-System. Bewusst schlank: keine gruppenbezogene Punkte-/Rangliste (bleibt deferred), keine Suche/Filter über die Liste hinaus.
**Requirements:** Bestehende `getFansubList()`-API und Gruppen-Kennzahlen; globales UI-System (`@/components/ui`); AppShell-Navigation.
**Depends on:** Bestehende `/fansubs/[slug]`-Detailseite und Fansub-Listing-API
**Plans:** 3/4 plans executed

Plans:

- [ ] `114-01-PLAN.md` — Backend: additives `projects_count`-Feld (Model/Repository/OpenAPI/TS-Typ) mit Regressionstest + Docker-Rebuild (D-03)
- [ ] `114-02-PLAN.md` — AppShell-Navigation: „Fansub-Gruppen"-Eintrag in beiden Nav-Arrays (anonym + eingeloggt) aktivieren (D-01)
- [ ] `114-03-PLAN.md` — Frontend: neue Index-Seite `/fansubs` (SSR-Directory, sortierbare Tabelle, rundes Logo/Initialen) (D-02/D-04/D-05)
- [ ] `114-04-PLAN.md` — Live-Verifikation auf :3000 (Nav beide Zustände, Sortierung, Anime-Projekte-Parität)

### Phase 115: Globale Suche (PostgreSQL FTS + Trigram)

**Goal:** Die toten „Suche"-Navigationspunkte zu einer modernen, umfassenden und performanten globalen Suche ausbauen — ausdrücklich **keine** simple `LIKE`/`ILIKE`-Namenssuche. Fundament: **PostgreSQL Full-Text Search + `pg_trgm`** (Ähnlichkeit/Tippfehlertoleranz), ggf. `unaccent`, geeignete **GIN/GiST-Indizes**, **gewichtetes Relevanz-Ranking**. **Kein** OpenSearch/Elasticsearch. Backend/API so **entkoppelt** (abstraktes `SearchProvider`-Interface, erste Impl. = Postgres-Provider), dass später ein externer Provider (Meilisearch) ergänzt werden könnte; **PostgreSQL bleibt fachliche Source of Truth**. Sucht mind. über **Anime** (Haupt-/de-/en-/jp-/Romaji-Titel, Aliase, Slug, Jahr, Typ, Genre, Tags/Themen, ggf. Beschreibung) und **Fansubgruppen** (Name, Kürzel, Slug, alternative/frühere Namen, ggf. Beschreibung); Member/Releases/Projekte als **geprüfte spätere Erweiterung**. **Zwingend: zuerst Code-Analyse-Report (13 Punkte), keine Datenmodelle/Begriffe raten, nichts ohne vorherige Analyse bauen.**
**Requirements:** Bestehendes Anime-/Fansub-Datenmodell und -Begriffe (nicht raten), bereits aktivierte PostgreSQL-Extensions/Indizes, vorhandene Listen-/Filter-/Pagination-/Query-Patterns, globales UI-System. Kein Elasticsearch/OpenSearch.
**Depends on:** Bestehende Anime- und Fansub-Domäne
**Plans:** 5/8 plans executed

Plans:

- [ ] `115-01-PLAN.md` — D-12 Titel-Speicher-Fix (Mapping + AltTitles-Persistenzpfad, Romaji/Japanisch durchsuchbar machen) [Wave 1]
- [ ] `115-02-PLAN.md` — Migration 0140: unaccent + funktionale Trigram/GIN-Indizes + gewichtete tsvector-Spalten [Wave 1]
- [ ] `115-03-PLAN.md` — Such-Repository: Modelle + Anime-/Fansub-Matching, D-05-Ranking, Sichtbarkeit, schmales SearchProvider-Interface [Wave 2]
- [ ] `115-04-PLAN.md` — GET /api/v1/search (+ /suggestions): Handler, Route, OpenAPI-Kontrakt, smoke-search.ps1 [Wave 3]
- [ ] `115-05-PLAN.md` — Frontend-Datenschicht: api.ts-Helfer, Typen, useDebouncedSearch-Hook, AppShell-Nav (beide Shells) [Wave 4]
- [x] `115-06-PLAN.md` — /suche-Sucheingabefläche: Page-Shell, SearchField (Combobox), gruppierte SuggestionList [Wave 5]
- [ ] `115-07-PLAN.md` — Ergebnisfläche: URL-gebundene Tabs, Filter + Chips, mobiler Drawer, Pagination, Zustände [Wave 6]
- [ ] `115-08-PLAN.md` — Absicherung: EXPLAIN-Baseline, D-12 Re-Import, Live-Smoke-UAT, Meilisearch-Andockpunkt-Doku (D-10) [Wave 7]

### Phase 116: Personalisiertes Dashboard (eingeloggter Landing-Hub)

**Goal:** Den toten Nav-Eintrag „Dashboard" mit einer **read-only, personalisierten Startseite** für eingeloggte User beleben — ein Cockpit, das vorhandene Daten bündelt und verlinkt, **ohne eigene Datenhaltung** und **ohne Editier-Funktionen** (Bearbeiten bleibt `/me/profile`). Inhalte: (1) **„Braucht deine Aufmerksamkeit"** — kürzlich neu zugewiesene Projekte/Releases (**zeitbasiert, Variante A**, kein Backend-Zusatz) mit Direktlink zur Arbeitsfläche; (2) **5 Kennzahlen** (Punkte, Badges, Projekte, hochgeladene Bilder, geschriebene Beiträge); (3) **Fortschritt je Badge-Kategorie** („noch X bis nächste Stufe"); (4) **Meine Gruppen** mit Links; (5) **Schnellzugriffe** (Anime entdecken, Rangliste, Fansub-Gruppen, Suche, Mein Profil). Globales UI-System. Als Integrations-Hub kommt es **nach 109–115**.
**Requirements:** Vorhandene Daten aus 109 (Punkte), 110/112/113 (Badges + Kategorie-Schwellen), 114 (Gruppen-Übersicht), 115 (Suche), sowie Member-/Contribution-/Media-/Gruppen-Daten; globales UI-System. Read-only, keine eigene Persistenz.
**Depends on:** Phase 109, Phase 110, Phase 112, Phase 113, Phase 114, Phase 115
**Plans:** 6 plans

Plans:

- [ ] `116-01-PLAN.md` — Shared TS-Kontrakte + reine Helper (dashboard.ts, additive MeAnimeContribution-Felder, memberBadgeLabels.ts next-threshold-Helper, attentionHelpers.ts) (D-02/D-04)
- [ ] `116-02-PLAN.md` — Backend-Aggregation: Rohzahl-Extraktion aus Phase-112/113-Repos + GetOwnDashboard + dashboard_me_handler.go (Ownership-Gate) + Route + OpenAPI (D-03/D-04/D-08/D-09)
- [ ] `116-03-PLAN.md` — Frontend-Datenschicht (getOwnDashboard in api.ts) + Nav-Aktivierung Dashboard-Eintrag in "Mein Bereich" (D-10)
- [ ] `116-04-PLAN.md` — AttentionSection + DashboardMetrics Sektionskomponenten (D-02/D-03)
- [ ] `116-05-PLAN.md` — CategoryProgressTable + MyGroupsSection + QuickLinksSection Sektionskomponenten (D-04/D-05/D-06)
- [ ] `116-06-PLAN.md` — page.tsx-Komposition (Promise.all, kein Eligibility-Redirect) + Live-Verify auf :3000 (D-01/D-07/D-09)

### Phase 117: Kara-Segment — Zeit-Override je Folge + entdoppelte Anzeige

**Goal:** Zwei Verbesserungen am bestehenden Kara-/Segment-Subsystem, **ohne Re-Encode**: (1) Für ein über eine Episoden-Spanne **geteiltes** Kara-Segment die Startzeit einer **einzelnen** Folge als **Offset/Override** korrigieren können — rein als Metadaten, **ohne** Neu-Encodieren des Videos und **ohne** dass daraus ein eigenes/neues Segment wird (bleibt „dasselbe Segment, nur für diese Folge verschoben"). (2) Die **UI-Anzeige entdoppeln**: ein Segment nur **einmal am Spann-Beginn** zeigen und erst bei einem **echten Segment-Wechsel** erneut — ein reiner **Zeit-Offset** erzeugt **keinen** neuen Eintrag. **ZWINGEND analyse-first:** das bestehende Segment-/Timing-/Render-Cache-Modell und die Herkunft der „für jede Folge"-Anzeige zuerst gegen den echten Code analysieren; nichts raten, nichts vorschnell bauen.
**Requirements:** Bestehendes Kara-/Segment-Subsystem (Editor `admin/episode-versions/[versionId]/edit/`, `useReleaseSegments`, `theme_segment_render_cache`, `/api/segments`), Release-/Episoden-/Projekt-Struktur. Kein Re-Encode.
**Depends on:** Bestehendes Segment-Subsystem (Kara-Playback/Timeline aus Phasen 103/105)
**Plans:** 0 plans

Plans:

- [ ] TBD

## Backlog

### Phase 999.2: E-Mail-Verifikations-Policy und eindeutige App-User-E-Mail (BACKLOG)

**Goal:** Nach einer Produkt-/Security-Entscheidung E-Mail-Verifikation und E-Mail-Eindeutigkeit gemeinsam und datenverträglich durchsetzen. Phase 104 grenzt dies bewusst aus, weil der UI-Test weder einen Verifikationsfehler reproduziert hat noch eine Mailzustellungs-/Pending-Account-Policy existiert und ein Unique-Constraint ohne Bestandsdatenprüfung persistierte Accounts gefährden kann.
**Requirements:** Vor Umsetzung festlegen: Verifikationspflicht und Mailzustellung, Verhalten/Rechte für `pending` Accounts und Enforcement-Ort; vorhandene `app_users.email`-Duplikate und Null-/Case-Normalisierung auditieren; erst danach einen reversiblen Unique-Index samt Up/Down- und Konflikttests planen. Registrierungscopy darf bis dahin keine verifizierte E-Mail behaupten.
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)
