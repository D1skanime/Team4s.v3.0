# TODO

## Completed (2026-03-05)
- [x] Validate VS Code settings baseline for programming workflow
- [x] Install recommended extension baseline in local VS Code
- [x] Verify Jellyfin API capabilities for server-side folder creation
- [x] Verify Emby API capabilities for server-side folder creation
- [x] Execute end-of-day closeout documentation sweep

## Immediate (Next Session)
- [ ] Define canonical anime/group asset folder schema
- [ ] Implement idempotent folder provisioning action in project-owned backend/service
- [ ] Add operator-safe error mapping (permission denied, path exists, invalid name)
- [ ] Add optional dry-run mode before production writes

## Completed (2026-03-03)
- [x] Add explicit UI copy for sync workflows
  - Bulk season-wide sync vs corrective single-episode sync is now explicitly labeled in admin UI
  - Help text and clearer action labels added
- [x] Replace remaining `img` tags with Next.js Image component
  - Admin and public/frontend source files migrated to `next/image`
  - Frontend build validated after migration
- [x] Extract `SyncEpisodeFromJellyfin` from `jellyfin_sync.go` to `jellyfin_episode_sync.go`
  - Single-episode sync handler moved to dedicated file
  - Backend tests and local deploy validation passed
- [x] Add deterministic cropper parity test coverage
  - Extracted crop math utility (`mediaUploadCropMath.ts`)
  - Added focused Vitest suite (`mediaUploadCropMath.test.ts`)
- [x] Add and apply anime search `pg_trgm` migration (`0017_anime_search_trgm`)
  - Benchmarked query behavior at larger data scale
  - Migration applied in local dev DB
- [x] Remove unreferenced broken cover artifacts
  - Deleted 10 invalid binaries from `frontend/public/covers`
  - Verified no DB references before cleanup

## Immediate (Next Session)
- [x] Continue handler modularization in `jellyfin_sync.go` and `jellyfin_episode_sync.go`
  - Target: move closer to 150-line handler file limit
  - Preserve behavior and test coverage
  - `jellyfin_sync.go` reduced to 144 lines, `jellyfin_episode_sync.go` reduced to 114 lines
  - New helper files added for sync flow/import blocks
  - `go test ./...` passed after refactor
- [x] Run CI-equivalent regression pass after today's refactors/migration
  - `go test ./...`
  - `npm test`
  - `npm run build`

## Short Term (This Week)
- [x] Full code + architecture + UX review across the sync/admin surfaces
  - Review recorded in `docs/reviews/2026-03-03-sync-admin-hardening-review.md`
- [x] Stabilize Jellyfin timeout diagnostics and operator troubleshooting notes
  - Added transport-level diagnostics in `fetchJellyfinJSON`
  - Added operator runbook `docs/operations/jellyfin-timeout-diagnostics.md`
- [x] Resume handler modularization sweep for files >150 lines
  - Sync entrypoints now below target (`jellyfin_sync.go` 144, `jellyfin_episode_sync.go` 114)

## Medium Term (This Sprint)
- [x] Complete P2 hardening closeout
  - Modularization, diagnostics, review, CI-equivalent checks, and admin smoke suite all completed
- [x] Track anime search performance with growing dataset and tune index strategy if query plans drift
  - Added durable runbook + baseline in `docs/performance/anime-search-query-plan-tracking.md`
- [x] Prepare deployment hardening checklist (rollout, rollback, smoke tests)
  - Added rollout/rollback/smoke checklist in `docs/operations/deployment-hardening-checklist.md`

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements

## On Hold / Parking Lot
- Legacy parity cosmetics (deprioritized in favor of maintainability)
- Advanced search features (waiting for scale requirements)

## New Epics (Public Anime Group/Release Experience)

### Terminology (Binding)
- `fansubId`: globale Fansubgruppen-ID (Gruppenprofil, Mitgliederverwaltung, gruppenweite Inhalte)
- `groupId`: anime-spezifische Sub-Projekt-ID einer Fansubgruppe fuer genau einen Anime (Projektstory, Releases, episodenspezifische Assets/Beitraege)
- Route-Intent:
  - `/anime/:animeId/group/:groupId` = anime-spezifisches Sub-Projekt der Gruppe
  - `/anime/:animeId/fansubs/:fansubId` = globale Fansubgruppen-Seite
- Gruppen-Wechsel-UX (binding):
  - analog zum bestehenden Public-Anime-Switch (Prev/Next-Chevron-Buttons per Mausklick)
  - gleiche Klick-Logik auf Group-Story und Group-Releases
  - Modus bleibt erhalten: Story -> Story, Releases -> Releases

### EPIC 0 - Grundlagen & Routen ✓ COMPLETED (2026-03-03)
- [x] Definiere stabile Routes: `/anime/:animeId`, `/anime/:animeId/group/:groupId`, `/anime/:animeId/group/:groupId/releases`
  - Routes implementiert in Next.js App Router
  - Backend APIs: GET /api/v1/anime/{animeId}/group/{groupId}, GET .../releases
- [x] Implementiere Breadcrumbs auf allen drei Seiten (Anime -> Gruppe -> Releases)
  - Komponente: `components/navigation/Breadcrumbs.tsx`
  - Design Tokens definiert, Responsive Verhalten implementiert
- [x] Implementiere Gruppen-Wechsel (Prev/Next-Chevron per Klick) auf Gruppe-Story und Releases und halte den Modus (Story bleibt Story, Releases bleibt Releases)
  - Komponente: `components/groups/GroupEdgeNavigation.tsx`
  - Preview Cards mit Hover, Loading States, Mode Preservation
- Critical Review: docs/reviews/epic-0-critical-review.md

### EPIC 1 - Anime-Detailseite (Allgemeine Infos) ✓ COMPLETED (2026-03-03)
- [x] Passe die aktuellen Buttons an: statt direkter Fansubgruppe auf die neue Anime-Gruppen-Seite verlinken: `/anime/:animeId/group/:groupId`
  - CTA "Gruppenbereich" in FansubVersionBrowser.tsx implementiert
  - CSS-Styles für .groupCtaRow und .groupButton hinzugefügt
  - Dual-Route Pattern: Fansub-Chips → globales Profil, CTA → anime-spezifische Gruppe

### EPIC 2 - Gruppe-Storyseite (Public) ✓ COMPLETED (2026-03-03)
- [x] Baue Gruppen-Header: Logo, "Fansub des Anime <AnimeTitel> der Gruppe <Name>", Zeitraum, Stats (Mitglieder, Episoden gesubbt), Link zu `/anime/:animeId/fansubs/:fansubId`
  - Headline Format implementiert, Logo 120x120px, Stats angezeigt
- [x] Zeige Projektgeschichte nur wenn vorhanden (sonst Section komplett weglassen)
  - Conditional rendering: `{group.story ? <CollapsibleStory /> : null}`
- [x] Implementiere Projektgeschichte als collapsible (Kurzansicht + "Mehr anzeigen")
  - Neue Komponente: `components/groups/CollapsibleStory.tsx`
  - 400 Zeichen Threshold, gradient fade, aria-expanded
- [x] Implementiere CTA "Releases ansehen" zur Releases-Route (kein Scroll/Anchor)
  - Primary Button vorhanden, links zu `/anime/{id}/group/{groupId}/releases`
- [x] Implementiere Tabs/Links zu Geschichte und Mitglieder (optional), ohne Releases hier zu mischen
  - UX-Entscheidung: Keine Tabs, stattdessen "Fansub-Profil" Link zu `/fansubs/{slug}`

### EPIC 3 - Releases-Seite (Public Episodenfeed) ✓ COMPLETED (2026-03-03)
- [x] Baue kompakten Gruppen-Header auf Releases-Seite (mit `/` Gruppenwechsel und Titel "Releases")
  - Logo 60px Desktop, 48px Mobile, GroupEdgeNavigation für Gruppenwechsel
- [x] Zeige dabei auch andere Gruppen, die den Anime gesubbt haben
  - other_groups aus API Response, horizontal scrollbar
- [x] Implementiere Filterleiste: Alle | Mit OP | Mit ED | Mit Karaoke + Suche (Episode Nr./Titel)
  - Multi-select AND logic, "Alle" als Reset
  - 300ms debounced Search, URL Query Params (?has_op, ?has_ed, ?has_karaoke, ?q)
  - Sticky Filter Bar auf Scroll
- [x] Rendere Episodenliste als Cards (Feed): `Episode XX - Titel` + Badges `OP`, `ED`, `Kara xN` + Button `Details`
  - Grid Layout, Cards clickable → /episodes/[id]
  - Badges: OP, ED, K-FX {count}, Insert {count}, {count} Screenshots
- [x] Stelle sicher: bei Fansub-Merge erscheinen alte, vorher einzelne Gruppen nicht mehr separat
  - API liefert nur existierende Gruppen
- [x] Stelle sicher: bei Fansubgruppen-Loeschung sind diese hier nicht mehr verlinkt
  - API liefert nur existierende Gruppen
- [x] Stelle sicher: wenn ein Anime eine Gruppe hinzugefuegt bekommt, ist sie hier sichtbar
  - API liefert aktuelle other_groups Liste

### EPIC 4 - Episode-Card Expanded Layout (Public Detail) ✓ COMPLETED (2026-03-03)
- [x] Fuege in Expanded-View die Section `Media Assets` VOR der Screenshot-Gallery ein
  - MediaAssetsSection Komponente erstellt und in Episode Page integriert
- [x] Rendere Media Assets als Tiles (OP/ED/Kara/Insert) mit Thumbnail, Typ-Icon, Titel, Dauer, Play-Button
  - AssetTile mit 16:9 Thumbnail, Type Badge, Title, Duration, Play Overlay
  - Type Icons: OP (#FF6A3D), ED (#28A745), K (#FFC107), IN (#6B6B70)
- [x] Gruppiere Assets nach Typ: Opening, Ending, Karaoke, Zwischenvideos/Insert (nur anzeigen wenn vorhanden)
  - Conditional rendering per Type, Empty State hidden
- [x] Implementiere `+X weitere Assets` als Expand innerhalb der Assets-Section
  - Per-type Expand/Collapse, Initial 2 sichtbar, "+X weitere {Type}" Button
  - Mock-Daten für Testing (API in EPIC 8)

### EPIC 5 - Public Playback (OP/ED/Kara) ✓ COMPLETED (2026-03-03)
- [x] Implementiere Player-Modal (Overlay) fuer Asset-Playback (Play oeffnet Modal, Close-Action schliesst)
  - VideoPlayerModal Komponente mit Focus Trap, ESC/Backdrop-Close
  - Integration in MediaAssetsSection
- [x] Implementiere Backend-Endpoint `GET /api/v1/assets/:assetId/stream` als Proxy (Portal-Login required)
  - asset_stream_handler.go mit Jellyfin-Proxy
  - Range-Requests für Video-Seeking
  - Contract in asset-stream.yaml + openapi.yaml
- [x] Implementiere Frontend-Video-Player im Modal, der den Proxy-Stream abspielt
  - Native HTML5 Video mit Browser Controls
  - 16:9 Aspect-Ratio, Responsive (Mobile Fullscreen)
- [x] Implementiere Fehlerstates im Player (404 Asset, Stream unavailable, auth expired) als UI-Message
  - 401: "Authentifizierung erforderlich" + Reload
  - 404: "Asset nicht gefunden" + Close
  - 500: "Stream nicht verfuegbar" + Retry + Close
  - Timeout (15s): "Zeitueberschreitung" + Retry + Close

### EPIC 6 - Screenshot-Gallery (Public) ✓ COMPLETED (2026-03-03)
- [x] Implementiere Screenshot-Gallery unterhalb Media Assets (z. B. 4-6 Thumbnails initial)
  - ScreenshotGallery Komponente mit responsive Grid (1/2/3 Columns)
  - Backend: Migration 0018_episode_version_images, API GET /releases/:id/images
- [x] Implementiere Lightbox/Viewer fuer Screenshots (Klick auf Thumbnail)
  - Lightbox Modal mit Backdrop, Prev/Next Navigation, Image Counter
  - Keyboard: ESC close, ArrowLeft/Right navigate, Home/End
- [x] Implementiere Lazy Loading/Infinite Loading fuer weitere Bilder beim Scrollen (IntersectionObserver)
  - IntersectionObserver mit 200px rootMargin
  - Cursor-basierte Pagination, 6 initial, 12 pro Page

### EPIC 7 - Kommentare & Member-Beitraege (Public)
- [ ] Implementiere Main-Kommentar (Release-Notiz) als optionalen Block (nur wenn vorhanden)
- [ ] Implementiere Contributions-Liste (Member-Beitraege) mit Avatar, Name, Rollen-Badge, Datum, Text
- [ ] Implementiere Rollen-Filter (Chips): Alle | Editor | QC | Encode | Typeset | KaraFX | Timing | Translate | ...
- [ ] Implementiere nur die ersten N Beitraege + Button `Alle Beitraege anzeigen (X)`
- [ ] Implementiere saubere Empty-States: `Noch keine Beitraege`, `Keine Beitraege fuer Filter`

### EPIC 8 - Daten & API Contracts (Public)
- API-Version-Regel (binding): alle neuen Public-Endpoints unter `/api/v1/...`
- [ ] Implementiere API: `GET /api/v1/anime/:animeId` (Anime-Headerdaten + Gruppenliste)
- [ ] Implementiere API: `GET /api/v1/anime/:animeId/group/:groupId` (Gruppenheader + story + stats)
- [ ] Implementiere API: `GET /api/v1/anime/:animeId/group/:groupId/releases` (Episodenliste + asset counts + preview data)
- [x] Implementiere API: `GET /api/v1/releases/:releaseId/assets` (Assets pro EpisodeRelease, gruppiert/typisiert)
  - Stable Public Contract + Handler live; liefert derzeit eine echte leere Liste, bis dedizierte Release-Asset-Daten persistiert werden
- [ ] Implementiere API: `GET /api/v1/releases/:releaseId/images?cursor=` (paginiert)
- [ ] Implementiere API: `GET /api/v1/releases/:releaseId/contributions` (Beitraege + Rollen)

### EPIC 9 - UX-Polish & Robustheit (Public)
- [ ] Implementiere konsistente Loading-States (Skeletons) fuer Header, Episodenfeed, Expanded Sections
- [ ] Implementiere konsistente Error-States (Toast + Inline) fuer jede API-Section
- [ ] Implementiere responsive Layout (kein Overlap, Cards skalieren, Gallery wrappt sauber)
- [ ] Implementiere Analytics/Tracking optional (z. B. Asset Play Event) nur intern

### EPIC 10 - Vorbereitung fuer spaetere Berechtigungen (ohne UI im Public)
- [ ] Implementiere `canViewInternal` Flag am User/Session (ohne komplexes RBAC)
- [ ] Lege UI-Slots fuer spaetere Streams/Versionen an, aber im Public komplett ausgeblendet (feature flag)
- [ ] Implementiere Expand/Collapse pro Episode-Card (Accordion) ohne Seitenwechsel

## New Epics (Admin Group/Release Curation)

### Binding (Admin Datenquelle)
- Source of truth fuer Episode/Version <-> Group bleibt die bestehende Anime/Episode/Jellysync-Verwaltung.
- Im neuen Group-Admin kein doppeltes Episode-/Version-Mapping bauen.
- V1 Media-Ingest (binding): Bilder/Karaoke zuerst im Team4s-Admin hochladen/kuratieren; Auslieferung ueber `/api/v1/...`
- V2 optional: kontrollierter Direct-Ingest nach Jellyfin nur als Admin-Job (async, retry, audit), nicht als Pflicht fuer den ersten Wurf
- Group-Admin kuratiert nur:
  - Story/Projekttexte
  - Projekt-Mitglieder je Anime-Group
  - Rollen und Contributions je Release/Folge
  - Bilder/Screenshots je Release
  - Karaoke-Assets aus Jellyfin syncen und freigeben

### EPIC 11 - Admin Group Story & Team Editor
- [ ] Implementiere Admin-Edit fuer Group-Story (PATCH auf Projektgeschichte/Zeitraum/Projekt-Notizen)
- [ ] Implementiere Team-Zuordnung je Anime-Group (Mitglied hinzufuegen/entfernen)
- [ ] Implementiere Rollenpflege je Anime-Group (projektbezogene Rollen, nicht globale Fansub-Rolle ueberschreiben)
- [ ] Implementiere saubere Validierung und Fehlertexte fuer Story/Team-Edit

### EPIC 12 - Admin Release Contributions Editor
- [ ] Implementiere Contributions-Editor je Release/Folge
- [ ] Implementiere pro Folge differenzierte Rollenbearbeitung (Member kann global Rolle X haben, aber pro Folge abweichen)
- [ ] Implementiere Add/Remove von Beteiligten pro Folge (nicht beteiligte Member muessen entfernbar sein)
- [ ] Implementiere Textfelder pro Beitrag/Funktion (z. B. User, Rolle, Beitragstext zur Folge)
- [ ] Implementiere Empty-State, Konflikt-State und Save-Feedback fuer Contributions

### EPIC 13 - Admin Bilder-Editor je Release
- [ ] Implementiere Bilderverwaltung je Release (add/remove/reorder)
- [ ] Implementiere Metadatenpflege je Bild (Caption/Credits optional)
- [ ] Implementiere Preview und robuste Fehlerstates fuer defekte/fehlende Bilder

### EPIC 14 - Admin Karaoke Asset Sync/Curation
- [ ] Implementiere Sync/Import von Karaoke-Videos aus Jellyfin-Assets in den Admin-Flow
- [ ] Implementiere Mapping/Freigabe-UI fuer importierte Karaoke-Assets je Release
- [ ] Implementiere Sichtbarkeitssteuerung (draft/published) fuer Karaoke-Assets im Public
- [ ] Implementiere Fehlerdiagnose + Retry bei fehlgeschlagenem Asset-Sync
- [ ] Teste dedizierte Jellyfin Asset-Bibliothek getrennt von der normalen Anime/Episode-Bibliothek (kein Mixing)
- [ ] Teste Namensregel fuer Asset-Ordner: `anime-<animeId>-<slug>` (ID aus der Page als stabile Zuordnung)
- [ ] Teste End-to-End-Zuordnung: Assets aus der dedizierten Bibliothek werden korrekt pro Release/Folge angezeigt
- [ ] Nach erfolgreichem Test: Jellyfin-Setup und Namensregel in `README.md` dokumentieren

### EPIC 15 - Admin API Contracts (Group/Contributions/Media)
- [ ] Implementiere API: `PATCH /api/v1/admin/anime/:animeId/groups/:groupId` (Story/Projektmeta)
- [ ] Implementiere API: `POST /api/v1/admin/anime/:animeId/groups/:groupId/members` und `DELETE /api/v1/admin/anime/:animeId/groups/:groupId/members/:memberId`
- [ ] Implementiere API: `GET /api/v1/admin/releases/:releaseId/contributions`
- [ ] Implementiere API: `POST /api/v1/admin/releases/:releaseId/contributions`
- [ ] Implementiere API: `PATCH /api/v1/admin/releases/:releaseId/contributions/:contributionId`
- [ ] Implementiere API: `DELETE /api/v1/admin/releases/:releaseId/contributions/:contributionId`
- [ ] Implementiere API: `GET /api/v1/admin/releases/:releaseId/images`
- [ ] Implementiere API: `POST /api/v1/admin/releases/:releaseId/images`
- [ ] Implementiere API: `PATCH /api/v1/admin/releases/:releaseId/images/:imageId`
- [ ] Implementiere API: `DELETE /api/v1/admin/releases/:releaseId/images/:imageId`
- [ ] Implementiere API: `POST /api/v1/admin/releases/:releaseId/karaoke/sync`
