# Team4s Backend-Architektur

Architekturüberblick des Go-Backends: Einstiegspunkte, Schichten, Datenflüsse, zentrale Abstraktionen und die aktuell gültigen Verträge für Auth, Rechte, Medien und Hintergrundjobs.

## Systemüberblick

Das Backend ist ein monolithischer Go-1.25-Dienst auf Basis von Gin, der über eine REST-Schnittstelle unter `/api/v1` sowohl die öffentliche Anime-Plattform als auch den Admin-Bereich bedient. Es spricht Postgres 16 über `pgx/v5` und Redis 7 über `go-redis/v9`; Next.js ist der einzige vorgesehene Client.

```
Browser (Next.js, App Router)
        |
        v
Next.js BFF-Routen (frontend/src/app/api/**, /api/v1/[...path]-Proxy)
        |
        v  HTTP
Gin-Router  — gin.New() + gin.Logger() + gin.Recovery() + corsMiddleware
        |
        +--> /health                         (Liveness, keine Auth)
        +--> /media  (StaticFS + Security-Header)
        +--> /api/v1  (Gin-Gruppe)
                |
                +--> öffentliche Routen direkt auf v1-Gruppe
                |        (Anime-Katalog, Episoden, Kommentare, Watchlist, Auth-Issue/Refresh/Revoke, /me)
                |
                +--> Middleware-Kette
                |        CurrentUserMiddleware (Keycloak) ODER
                |        CommentAuthMiddlewareWithState + ConfigureLocalAuthBypass (Legacy/Lokal)
                |        + CommentCreateRateLimitMiddleware (Redis)
                |
                +--> /api/v1/admin/*  (registerAdminRoutes, admin_routes.go)
                         |
                         v
                     Handler-Schicht (backend/internal/handlers)
                         |
                         v
                     Service-Schicht (backend/internal/services)  [nur für ausgewählte Workflows]
                         |
                         v
                     Repository-Schicht (backend/internal/repository)
                         |
                         v
                 +-------+--------+
                 |                |
            Postgres 16       Redis 7
         (pgx/v5-Pool)    (Sessions, Rate-Limits,
                           Caches, Playback-Grants)
```

Die Eigentumsgrenzen folgen strikt der Schichtung: Handler kennen HTTP (Request/Response, Statuscodes, DTO-Validierung), Repositories kennen SQL und Persistenz, Services bündeln fokussierte, mehrschrittige Workflows (Medienverarbeitung, Mailversand, Segment-Rendering). Die Verdrahtung zwischen den Schichten ist vollständig manuell in `backend/cmd/server/main.go` und `backend/cmd/server/admin_routes.go` festgelegt — es gibt keinen DI-Container und keine Reflection-basierte Injektion.

## Verantwortlichkeiten der Komponenten

| Komponente | Verantwortung | Datei(en) |
| --- | --- | --- |
| Prozess-Start | Config laden, Pool/Redis aufbauen, Router verdrahten, Hintergrund-Worker starten, Graceful Shutdown | `backend/cmd/server/main.go` |
| Admin-Routing | Registrierung aller `/admin/*`-Routen inkl. Middleware-Zuordnung | `backend/cmd/server/admin_routes.go` |
| Bootstrap-Helfer | Admin-Rollen-Bootstrap, tolerante Startprüfungen | `backend/cmd/server/bootstrap_helpers.go` |
| Konfiguration | Einmaliges Einlesen aller Env-Werte in einen `Config`-Struct | `backend/internal/config/config.go` |
| Handler-Schicht | HTTP-Contracts, Request-Validierung, Response-Formung | `backend/internal/handlers/` (~250 Dateien) |
| Service-Schicht | Fokussierte Mehrschritt-Workflows (Medien, Mail, Segment-Rendering, Rechte-Auswertung) | `backend/internal/services/` (~65 Dateien) |
| Repository-Schicht | SQL-Zugriff und Persistenzlogik, strikt nach Domäne getrennt | `backend/internal/repository/` (~250 Dateien) |
| Middleware | Auth-Identität, Kommentar-Rate-Limiting | `backend/internal/middleware/` (6 Dateien) |
| Auth/OIDC | Keycloak-JWT-Verifikation, Claims-Extraktion | `backend/internal/auth/oidc.go` |
| Rechte/Capabilities | Effective-Rights-Auswertung, Plattform-Admin-Vorrang | `backend/internal/permissions/` |
| Migrationen | Append-only SQL-Schemaentwicklung, CLI-Runner | `database/migrations/`, `backend/internal/migrations/`, `backend/cmd/migrate/main.go` |
| Geteilte Verträge | Cross-Layer-Referenz zwischen Backend-Response und Frontend-Konsument | `shared/contracts/` |
| Medienverarbeitung | Upload-Varianten (`source_original`/`display`), GIF-Größenheuristik | `backend/internal/services/media_service.go`, `media_service_segment.go`, `media_service_display_variant.go` |
| Jellyfin-Client und -Import | Serien-/Episoden-Discovery, Preview/Apply/Sync | `backend/internal/handlers/jellyfin_client*.go`, `jellyfin_intake_preview.go`, `jellyfin_sync*.go`, `jellyfin_discovery*.go` |
| AniSearch-Import | HTML-Scraping-Client, Episoden-/Relations-Import | `backend/internal/services/anisearch_client.go`, `anisearch_episode_import.go`, `anisearch_relation_labels.go` |
| Segment-Rendering | Asynchrones OP/ED-Rendering, Worker-Fanout, Untertitel | `backend/internal/services/segment_render_service.go`, `backend/internal/handlers/segment_render_worker.go`, `segment_render_fanout.go` |
| Mailversand | SMTP vs. No-op, Transaktionsmails | `backend/internal/services/mailer.go` |
| Effective-Rights-Service | Rechte-Auflösung für UI-seitige Capability-Previews | `backend/internal/services/effective_rights_service.go` |

## Muster

Das Backend folgt durchgängig einem dreischichtigen Layered-Pattern: Handler → (optional Service) → Repository. Die Service-Schicht ist bewusst dünn und nicht für jede Domäne vorhanden — sie existiert dort, wo ein Workflow mehrere Schritte, externe Prozesse (ffmpeg, SMTP) oder Querschnittslogik (Rechte-Auswertung) kapselt. Für reine CRUD-Domänen rufen Handler Repositories direkt auf.

Verdrahtung ist explizit und manuell: In `main.go` entstehen Repository-Instanzen über `repository.New*(dbPool, ...)`, darauf aufbauend Services über `services.New*(...)`, darauf aufbauend Handler über `handlers.New*(repo, service, ...)`. Für Handler mit vielen Abhängigkeiten (etwa den zentralen `AdminContentHandler`) wird eine fluent Builder-Kette aus `.With*Deps(...)`-Methoden verwendet, zum Beispiel `adminContentHandler.WithMediaDeps(...).WithNoteDeps(...).WithSegmentStreamDeps(...)`. Es gibt keinen DI-Container, kein Reflection-basiertes Auto-Wiring und keine Service-Locator-Struktur — jede Abhängigkeit ist an genau einer Stelle im Code sichtbar erzeugt und weitergegeben.

Eine Besonderheit der Schichtung: Der Jellyfin-API-Client liegt unter `backend/internal/handlers/jellyfin_client*.go` und nicht unter `services/`, obwohl er fachlich eher eine Service-Rolle einnimmt. Das ist eine historisch gewachsene Abweichung vom Muster und beim Lesen des Codes zu beachten.

## Schichten

### Handler-Schicht

Handler besitzen den HTTP-Vertrag: Sie parsen und validieren Requests, rufen Services oder Repositories auf und formen die Response inklusive Statuscode. Die rund 250 Dateien unter `backend/internal/handlers/` sind nach Domäne benannt und bewusst schmal gehalten (Namensdisziplin statt strikter Subpackage-Trennung — das gesamte Paket ist ein einziges großes `handlers`-Package). Zentrale Aggregator-Handler wie `admin_content_handler.go` sammeln über `_deps.go`-Dateien und `With*Deps`-Builder die Abhängigkeiten vieler kleinerer, fachlich zusammengehöriger Dateien (Episoden, Medien, Segmente, Genres, Tags).

Die Domänengruppen im Überblick:

- **Anime-Kern:** `anime.go`, `anime_backdrops_*.go`, `admin_content_anime*.go`.
- **Admin/Content:** `admin_content_handler.go` + `_deps.go` als zentraler Aggregator, `admin_content_episode*.go`, `admin_content_genres.go`, `admin_content_tags.go`.
- **Jellyfin-Import:** `jellyfin_client.go`, `jellyfin_client_series.go`, `jellyfin_discovery*.go`, `jellyfin_intake_preview.go`, `jellyfin_sync*.go`, `jellyfin_episode_sync*.go`, `jellyfin_preview.go`, `jellyfin_metadata_resync.go`, `jellyfin_source_*.go`, `jellyfin_owned_sources.go`, `jellyfin_search.go`, `jellyfin_folder_display_names.go`.
- **AniSearch-Import (Handler-Seite):** `admin_content_anime_enrichment_*.go` (Client-seitig in `services/anisearch_client.go`).
- **Medien/Episoden-Version-Medien:** `media_upload*.go`, `admin_content_release_version_media*.go` (Liste/Upload/Patch/Replace/Reorder/Delete/Highlight/Kategorie/Berechtigungen).
- **Episoden-Version-Editor:** `admin_content_episode_version_editor.go`, `_helpers.go`, `_scan.go`, `episode_version_*.go`.
- **Segmente/Kara:** `admin_content_segments.go`, `admin_content_anime_theme_segments*.go`, `segment_render_*.go`, `segment_stream.go`, `segment_preview_auto.go`.
- **Auth:** `auth_handler.go`, `auth_issue*.go`, `auth_refresh.go`, `auth_revoke.go`, `app_auth*.go`, `platform_admin_authz.go`, `permission_authz.go`.
- **Kommentare/Watchlist:** `comment.go`, `watchlist.go`.
- **Fansubs/Gruppen/Aliase/Mitglieder:** `fansub_*.go`, `group_*.go`, `admin_group_roles_handler.go`, `fansub_hist_*.go`.

### Service-Schicht

Die rund 65 Dateien unter `backend/internal/services/` kapseln Workflows, die über reines CRUD hinausgehen: `media_service.go` verarbeitet Uploads inklusive Varianten-Erzeugung, `anisearch_client.go` scrapt externe HTML-Seiten, `mailer.go` abstrahiert SMTP vs. No-op, `segment_render_service.go` steuert Video-Rendering, `effective_rights_service.go` wertet Rechte aus. Services werden von mehreren Handlern wiederverwendet und sind der richtige Ort für Logik, die nicht an einen einzelnen HTTP-Endpunkt gebunden ist.

### Repository-Schicht

Die rund 250 Dateien unter `backend/internal/repository/` sind strikt nach Domäne gesplittet (Anime, Episode, Fansub, Group, Member, Authz, Audit, Segment/Theme, Release-Review, Badge, Point, Search). Konstruktoren erhalten den geteilten DB-Pool-Handle sowie gelegentlich zusätzliche Config-Werte, etwa `repository.NewFansubRepository(dbPool, cfg.MediaStorageDir)`. Schmale Interfaces wie das `DBTX`-Interface in `audit_logs.go` (nur `Exec`/`QueryRow`) halten Repositories testbar, ohne den vollen Pool-Typ vorauszusetzen.

## Datenflüsse

### Haupt-Request-Pfad

Ein eingehender Request durchläuft `gin.Logger()` → `gin.Recovery()` → `corsMiddleware` → (bei geschützten Routen) Auth-Middleware → (bei Kommentar-Erstellung zusätzlich) Rate-Limit-Middleware → Handler → ggf. Service → Repository → Postgres/Redis. Öffentliche Routen (Anime-Katalog, Episoden-Detail, Kommentare lesen, Watchlist für eingeloggte Mitglieder) hängen direkt an der `/api/v1`-Gruppe. Admin-Routen werden gesondert über `registerAdminRoutes(v1, authMiddleware, adminRouteHandlers{...})` in `admin_routes.go` registriert und erhalten dadurch konsistent dieselbe Auth-Middleware-Instanz.

### Medien-Upload und -Prüfung

Admin-Uploads (Anime-Cover, Fansub-Branding, Release-Version-Medien, Segment-Assets) laufen über `MediaService`. Der Service persistiert pro Upload mindestens eine `source_original`-Variante und erzeugt zusätzlich automatisch eine `display`-Variante (Downscaling/Normalisierung); bei GIFs wird zusätzlich eine Größen-Heuristik angewendet. Das Ergebnis (`MediaSaveResult`, `MediaVariantSaveResult`) wird vom aufrufenden Handler in die passende Owner-Tabelle verdrahtet (`media_assets` + `anime_media`/`fansub_group_media`/`release_version_media` je nach Kontext). Medien werden grundsätzlich nicht direkt an Episoden gehängt — jede Medienart hat eine eigene, klar dokumentierte Owner-Tabelle (siehe „Medienspeicher" unten).

### Jellyfin-Import

Der Import folgt konsequent dem Projekt-Constraint „Import nie ohne editierbares Zwischenformular". Für Serien-Intake liefert `POST /admin/jellyfin/intake/preview` (Handler `PreviewAnimeIntakeFromJellyfin`) eine Vorschau zur Durchsicht, ohne einen Datensatz anzulegen. Für bereits bestehende Anime-Datensätze gibt es getrennte Preview- und Apply-/Sync-Endpunkte: `GET /admin/anime/:id/jellyfin/context`, `POST /admin/anime/:id/jellyfin/metadata/preview` → `POST .../metadata/apply`, sowie `POST /admin/anime/:id/jellyfin/sync` und `POST /admin/anime/:id/episodes/:episodeId/sync`. Erst der explizite Apply-/Sync-Call persistiert Daten; bis dahin bleibt jede Jellyfin-Antwort reine Vorschau, die der Admin im Formular noch verändern kann. Bibliotheks-Discovery (`GET/POST/DELETE /admin/jellyfin/discovery*`) läuft über einen separaten, Redis-gestützten Cache mit 5 Minuten TTL (`jellyfin_discovery_cache_redis.go`). Die Konfiguration (API-Key, Basis-URL, Stream-Pfad-Template, erlaubte Library-IDs) liegt in `AdminContentJellyfinConfig`.

### AniSearch-Import

Analog zu Jellyfin läuft der AniSearch-Import über einen HTML-scrapenden Client (`services/anisearch_client.go`, Typen `AniSearchAnime`, `AniSearchAnimeRelation`) plus `anisearch_episode_import.go` für Episodendaten inklusive Filler-Metadaten und `anisearch_relation_labels.go` für die vier erlaubten Relations-Label. Handler-seitig stellen `admin_content_anime_enrichment_*.go` die Endpunkte `POST /admin/anime/enrichment/anisearch`, `GET /admin/anime/enrichment/anisearch/search` und `POST /admin/anime/:id/enrichment/anisearch` bereit; Persistenz läuft über `admin_content_anisearch.go`. Auch hier gilt: Suche und Vorschau sind von der tatsächlichen Übernahme ins Anime-Formular getrennt.

### Segmente und Kara (OP/ED)

Segmente (Karaoke-/OP-/ED-Abschnitte) haben den umfangreichsten Admin-Routenbaum (`admin_routes.go`, rund 25 Zeilen Routendefinitionen): CRUD unter `/admin/anime/:id/segments`, Wiederverwendung aus einer Segment-Bibliothek, Asset-Upload/-Löschung, Vorschaubild-Zuweisung (manuell, per Kandidaten-Attach, per Auto-Reset), gruppenübergreifende Zuweisung über `/assignments`, Episoden-Overrides und Herkunfts-Korrektur. Die Rendering-Pipeline läuft asynchron: `segment_render_service.go` (Service) orchestriert `segment_render_worker.go`, `segment_render_fanout.go`, `segment_render_subtitles.go` und `segment_render_refresh.go` (Handler-Paket). Der persistente Render-Worker wird beim Start aus `main.go` als Goroutine gestartet, sofern `cfg.SegmentRenderEnabled` gesetzt ist; eine Recovery nicht abgeschlossener Renderjobs läuft beim Boot synchron.

### Episoden-Versionen und Release-Editor

Für die konkrete Bearbeitung einzelner Veröffentlichungs-Versionen existiert ein eigener Editor-Datenfluss: `GET /admin/episode-versions/:versionId/editor-context` (Handler `AdminContentHandler.GetEpisodeVersionEditorContext`, aufgeteilt in `admin_content_episode_version_editor.go` plus die Helfer-Dateien `_helpers.go` und `_scan.go`) liefert den vollständigen Bearbeitungskontext einer Version, `POST .../folder-scan` scannt das zugehörige Dateisystem-Verzeichnis neu ein. Episoden-Version-CRUD selbst läuft über separate, nicht-admin-geschützte Routen auf dem `FansubHandler` (`POST /anime/:id/episodes/:episodeNumber/versions`, `PATCH`/`DELETE /episode-versions/:versionId`), da Fansub-Leiter mit entsprechender Capability dieselben Versionen pflegen können wie globale Admins. Dieser Datenfluss bedient im Frontend die Route `/admin/episode-versions/[versionId]/edit`.

### Hinweise an Fansub-Gruppen (Datenmodell-Fundament)

Tabelle `fansub_group_hints` (Migration 0187) und `FansubGroupHintsRepository` bilden die Persistenzschicht für Hinweise, die ein Mitglied an eine eigene ODER fremde Fansub-Gruppe schickt — entweder ein Korrektur-Hinweis zu einem Projekt-Eintrag (`hint_type='correction'`, zwingend mit `related_anime_id`) oder eine Anfrage auf Mitgliedschaft mit optionalem Rollenwunsch (`hint_type='membership_request'`, `requested_role_code` nullable). Anders als beim regulären Beitrags-Vorschlag (`anime_contributions_proposal_repository.go`, mit Ownership-Check `MemberBelongsToFansub`) gibt es hier bewusst keinen Ownership-Zwang — ein Hinweis ist reine Information, keine Behauptung tatsächlicher Mitwirkung. Ein Partial-Unique-Index (`uq_fansub_group_hints_open_topic`) erzwingt auf DB-Ebene höchstens einen offenen Hinweis pro Absender+Zielgruppe+Thema. Die Routing-Entscheidung, ob der Leader der Zielgruppe oder der Plattform-Admin einen Hinweis entscheidet, liest sich aus `requested_role_code = 'fansub_lead'` ab (`ListForFansubLeadRole` vs. gruppen-gescopte `ListByTargetGroup`) — kein eigenes Routing-Feld. Dieser Datenfluss ist aktuell nur das Persistenz-Fundament; Handler, Rate-Limit und Frontend-Formular folgen in den nachfolgenden Phasen-Plänen.

## Zentrale Abstraktionen

**Anime-Aggregat (Episoden/Versionen).** Anime und Episoden sind in der aktuellen Modellierung bewusst „neutral" — sie gehören keiner einzelnen Fansub-Gruppe. Fansub-Kontext entsteht erst über `anime_fansub_groups` (kanonische Zuordnungstabelle Anime↔Gruppe) und die darunterliegende Release-Kette: `fansub_releases` gehört zu einer Episode (`fansub_releases.episode_id`), `release_versions` gehört zu einer `fansub_releases`-Zeile, und `release_version_groups` bindet die beteiligte(n) Fansub-Gruppe(n) an eine Version (`release_version_groups.fansub_group_id` ist die kanonische Spalte; die Legacy-Spalte `fansubgroup_id` darf nicht wieder eingeführt werden). Diese Kette ersetzt ein älteres, inzwischen entferntes `episode_versions`/`episode_version_episodes`-Modell (siehe Migrationen 0043/0046 — Tabellen angelegt und im selben Migrationspaar wieder fallengelassen, als der normalisierte Release-Graph aus Migration 0035 produktiv wurde).

**Medienassets-Modell.** Medien sind generisch über `media_assets` (Go-seitig `models.MediaAsset` mit `PublicURL`, `SourceOriginalURL`, `DisplayURL` für mehrere gespeicherte Varianten pro Asset) und `media_types` (Art-Katalog, etwa „poster") modelliert. Die Verknüpfung zu einem konkreten Besitzer läuft über domänenspezifische Join-Tabellen — für Anime-Cover etwa `anime_media` (Anime↔`media_assets` nach Typ). `models.MediaKind` definiert die Kind-Enum (`logo`, `banner`, `theme_video`, `segment_asset`, `image`). Jede Medienart hat genau eine kanonische Owner-Tabelle; das Vermischen von Owner-Tabellen (z. B. Release-Version-Medien über `fansub_group_media` hochladen) ist ein dokumentierter Anti-Pattern-Fall.

**Effective-Rights-Auflösung.** `backend/internal/permissions/effective_rights.go` wertet pro Aktion eine feste Präzedenzkette aus (siehe Querschnittsthema Rechte unten). Das Ergebnis ist nicht nur ein Bool, sondern trägt Provenienz (`Provenance`, `Reason`) mit — jede Allow/Deny-Entscheidung ist dadurch im Audit-Log nachvollziehbar begründbar.

**Audit-Log.** `AuditLogRepository.Write(ctx, AuditLogEntry)` (in `backend/internal/repository/audit_logs.go`) ist der einzige vorgesehene Pfad, um admin-relevante Zustandsänderungen revisionssicher festzuhalten. Ein `AuditLogEntry` trägt `ActorAppUserID`/`ActorLegacyUserID`, `EventType`, `ScopeType`/`ScopeID`, `TargetType`/`TargetID`, `Action`, `Outcome`, `ReasonCode` und ein freies JSON-`Payload`. Diese Struktur ist breit in fast jedem admin-mutierenden Handler aus `main.go` heraus verdrahtet. `admin_changes_handler.go` stellt zusätzlich eine dedizierte „Änderungen"-API bereit, die auf denselben Audit-Daten eine Review-Oberfläche aufbaut.

## Einstiegspunkte

**`backend/cmd/server/main.go` (697 Zeilen).** Ablauf: `config.Load()` → `validateRuntimeConfig(cfg)` → `database.NewPool` (pgx/v5, 10 s Kontext-Timeout) → `database.NewRedisClient` → nicht-fatale Verfügbarkeitsprüfungen für `ffmpeg`/`vipsthumbnail` → Gin-Router-Aufbau (`gin.New()`, `gin.Logger()`, `gin.Recovery()`, eigene `corsMiddleware`) → `/health`-Route → `/media`-StaticFS mit Security-Headern. Die gesamte Repository→Service→Handler-Kette wird hier manuell verdrahtet. Beim Boot wird zusätzlich die Capability-Registry geladen: `permissionSvc.LoadCache(ctx, authzRepo)`, danach — per Kommentar ausdrücklich in dieser Reihenfolge — `permissionSvc.LoadFansubGroupCatalog(ctx, authzRepo)` (beide fatal bei Fehler). `bootstrapAdminRoleAssignments(...)` ist tolerant gegenüber fehlenden Tabellen, aber sonst fatal. Aus `main.go` werden außerdem Hintergrund-Goroutinen gestartet (Segment-Render-Worker, Cleanup-Ticker für verwaiste Untertitel, Cleanup-Ticker für Release-Version-Medien/Release-Reviews). Graceful Shutdown läuft über `signal.Notify` (`SIGINT`/`SIGTERM`) mit 10 s `server.Shutdown`-Timeout.

**`backend/cmd/server/admin_routes.go` (348 Zeilen).** Registriert ausschließlich `/api/v1/admin/*`-Routen über `registerAdminRoutes(v1, authMiddleware, adminRouteHandlers{...})` — ein einziger Einstiegspunkt, der die Admin-Oberfläche konsistent an dieselbe Middleware bindet.

**`backend/cmd/migrate/main.go` (226 Zeilen).** CLI mit den Subkommandos `up`, `down [-steps n]`, `status`, `backfill-phase-a-metadata`, `backfill-badges`, implementiert über `internal/migrations.Runner`. Die Backfill-Subkommandos sind manuell auszulösende Einmal-Operationen, keine geplanten Jobs.

## Architektur-Leitplanken

- **Manuelle Verdrahtung ist Pflicht, kein Mangel.** Jede neue Abhängigkeit zwischen Repository, Service und Handler wird explizit in `main.go`/`admin_routes.go` sichtbar gemacht. Kein Reflection-basiertes Auto-Wiring, kein Service-Locator.
- **Migrationen sind append-only.** Schemaänderungen entstehen immer als neues, nummeriertes `up`/`down`-Paar unter `database/migrations/` (aktuell 368 Dateien, 184 Paare, `NNNN_description.{up,down}.sql`). Bestehende Migrationsdateien werden nicht nachträglich verändert. Down-Migrationen dürfen dokumentiert verlustbehaftet sein (Beispiel: Migration 0184 stellt im Down-Pfad nur die leere Spaltenform wieder her, nicht die Daten — das ist beabsichtigt).
- **Plattform-Admin-Vorrang ist nicht aushebelbar.** `platform_admin` steht an erster Stelle der Rechte-Präzedenzkette und überschreibt selbst einen gespeicherten `user_deny` (siehe Querschnittsthema Rechte). Das ist eine bewusste Sicherheits-/Betriebsentscheidung, keine Lücke.
- **Storage-Verzeichnisgrenzen sind verbindlich.** Medien werden ausschließlich unterhalb des konfigurierten `MediaStorageDir` abgelegt und über `/media`-StaticFS mit Security-Headern ausgeliefert; es gibt keinen zweiten Serving-Pfad.
- **Owner-Tabellen pro Medienart sind kanonisch und dürfen nicht vermischt werden.** Anime-Medien, Fansub-Branding, Release-Version-Prozessmedien und Segment-Assets haben getrennte Owner-Tabellen; eine Medienart niemals über die Owner-Tabelle einer anderen Medienart hochladen.
- **Manuelle Edits bleiben gegenüber Importen autoritativ.** Jellyfin- und AniSearch-Importe laufen immer über Preview-/Apply-Trennung; kein Importpfad darf Daten ohne explizite Admin-Bestätigung direkt persistieren.
- **Produktionscode bleibt modular.** Dateien sollen bei bzw. unter 450 Zeilen bleiben; größere Implementierungen werden vor dem Anwachsen zu Monolithen aufgeteilt (sichtbar etwa an der Aufteilung von `admin_content_handler.go` in viele fokussierte `_deps`-/Feature-Dateien).

## Anti-Muster

**1. Rechte aus Keycloak-Rollenclaims ableiten.**
*Was passiert:* Ein Handler liest `realm_access.roles` aus dem JWT und entscheidet daraus direkt über eine fachliche Berechtigung wie `fansub_lead` oder eine Capability.
*Warum falsch:* Identität und fachliche Autorisierung sind laut Phase-43-Entscheidung strikt getrennt. Keycloak besitzt ausschließlich Login, Token und Session-Lifecycle; `fansub_lead` und alle Capability-Entscheidungen leben ausschließlich in Team4s-eigenen Tabellen (`app_user_global_roles`, `fansub_group_member_roles`). Das Team4s-Backend liest `realm_access`/`resource_access` bewusst nicht für Autorisierungszwecke aus.
*Richtig wäre:* Autorisierung immer über `permissions.ResolveGroupRights`/die Effective-Rights-Services gegen `app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles` auflösen.

**2. Eine neue Owner-Tabelle für eine bereits existierende Medienart erfinden, statt die kanonische zu benutzen.**
*Was passiert:* Release-Version-Prozessmedien werden versehentlich über `release_media` oder `fansub_group_media` statt über `release_version_media` hochgeladen, weil die Zieltabelle „naheliegend" erscheint.
*Warum falsch:* Jede Medienart hat eine dokumentierte, kanonische Owner-Tabelle; `release_media` ist ein separater öffentlicher/Legacy-Pfad, kein Ersatz für release-version-gebundene Admin-/Fansub-Medien. Falsches Owner-Mapping bricht die Lösch-/Berechtigungs- und Anzeigelogik der jeweils anderen Medienart.
*Richtig wäre:* Vor jedem neuen Medien-Feature die Media-Ownership-Zuordnung (Anime-Assets, Fansub-Branding, Release-Theme-Assets, Release-Version-Prozessmedien, Segment-Assets, Mitgliedsprofil-Medien) prüfen und exakt die passende Tabelle sowie den passenden Upload-Pfad (`MediaService`) wiederverwenden.

**3. Eine zweite Episoden- oder Import-Verwaltungsoberfläche parallel zur bestehenden bauen.**
*Was passiert:* Für einen neuen Anwendungsfall entsteht ein zusätzlicher Satz Episoden-/Versions-Endpunkte oder ein zweiter Jellyfin-/AniSearch-Client, statt die bestehenden Preview-/Apply-Endpunkte und Clients zu erweitern.
*Warum falsch:* Das verdoppelt Zustand (zwei Quellen der Wahrheit für denselben Datensatz), unterläuft die Preview-vor-Persistenz-Garantie des Import-Workflows und erschwert Audit-Nachvollziehbarkeit, weil Mutationen dann an zwei Stellen entstehen können.
*Richtig wäre:* Bestehende Endpunkte (`/admin/anime/:id/episodes/...`, `/admin/jellyfin/...`, `/admin/anime/enrichment/anisearch`) und bestehende Service-/Client-Strukturen erweitern, statt parallele Strukturen zu schaffen.

## Fehlerbehandlung

Go-Code im Backend bevorzugt explizite Fehlerbehandlung über `error`-Rückgabewerte gegenüber Exception-artigen Mustern; Panics werden nur durch `gin.Recovery()` als letzte Sicherheitsnetz-Schicht abgefangen, nicht als reguläre Kontrollflusstechnik verwendet. Handler übersetzen Repository-/Service-Fehler in HTTP-Statuscodes und JSON-Fehlerkörper; dabei wird zwischen erwarteten fachlichen Ablehnungen (z. B. `409 Conflict` bei Selbstaussperr-Schutz in der Mitgliederverwaltung) und unerwarteten technischen Fehlern unterschieden. Die Projekt-Vorgabe „Observability: Admin-Aktionen brauchen Audit-Attribution, operative Fehler müssen sofort in der UI sichtbar sein, ohne dauerhafte Fehler-Persistenz" spiegelt sich darin, dass Fehler primär über Response-Body und Logger sichtbar werden und nicht in einer separaten, dauerhaften Fehler-Tabelle landen — die dauerhafte Aufzeichnung ist dem Audit-Log für erfolgreiche/abgelehnte Admin-Aktionen vorbehalten, nicht allen Laufzeitfehlern. Defensive Validierung ist beim Start besonders ausgeprägt: `validateRuntimeConfig(cfg)` in `main.go` bricht den Prozessstart bei inkonsistenter Konfiguration frühzeitig ab (fail-fast), während einzelne Boot-Schritte wie der Admin-Rollen-Bootstrap bewusst tolerant gegenüber fehlenden (aber nicht gegenüber fehlerhaften) Tabellen sind.

## Querschnittsthemen

### Auth/Keycloak

Team4s trennt Identität und fachliche Autorisierung bewusst in zwei unabhängige Zuständigkeiten. Keycloak besitzt ausschließlich Login, OIDC-Tokens, Session-Ende/Backchannel-Logout und das lokale Realm-/Client-Bootstrapping. Team4s selbst bleibt die alleinige fachliche Autorität für `app_users`, globale App-Rollen (`app_user_global_roles`) und Fansub-Rollen (`fansub_group_members`, `fansub_group_member_roles`); `fansub_lead` existiert ausdrücklich nie als Keycloak-Rolle, sondern ausschließlich in Team4s-eigenen Tabellen.

Zwei Auth-Modi sind in `main.go` verdrahtet: Ist `cfg.KeycloakEnabled` gesetzt, baut der Prozess einen `auth.NewKeycloakVerifier` (kapselt `github.com/coreos/go-oidc/v3/oidc`) plus `middleware.NewKeycloakCurrentUserResolver` in die `middleware.CurrentUserMiddleware` ein; `KeycloakVerifier` validiert das JWT gegen Issuer/Discovery/Audience und parst `KeycloakTokenClaims` inklusive `realm_access.roles` über `extractRealmRoles` — dieses Claim wird für Team4s-Autorisierungsentscheidungen jedoch bewusst nicht ausgewertet, es dient nur der Keycloak-eigenen Identitätsprüfung. Ist Keycloak deaktiviert, greift der Legacy-Pfad: `middleware.CommentAuthMiddlewareWithState` (HMAC-Token) plus `middleware.ConfigureLocalAuthBypass` für lokale Entwicklung. Legacy-Issue/Refresh/Revoke-Endpunkte (`auth_handler.go`) existieren weiterhin, gestützt auf einen Redis-Session-Store (`repository/auth.go`, Schlüsselräume `auth:refresh:`, `auth:session:`, `auth:access:revoked:`, `auth:oidc:revoked:sid:`/`sub:`).

`GET /api/v1/me` ist die stabile Session-Prüfnaht: Ein erfolgreicher Keycloak-Login mit `access_token.aud = team4s-api` löst beim ersten `/me`-Zugriff die Anlage eines Team4s-`app_user` aus. Das `id_token` bleibt reines Client-Identitätsartefakt und wird nie als API-Bearer akzeptiert. Pending-Benutzer dürfen `/me` lesen, aber keine geschützten Admin-Mutationen auslösen. Backchannel-Logout läuft über `POST /api/v1/auth/keycloak/backchannel-logout`: Keycloak liefert ein `logout_token`, Team4s invalidiert die lokale Session über die `sid`-/`sub`-Redis-Schlüssel und setzt zusätzlich `app_users.last_logout_at`.

### Rechte/Capabilities

Die Effective-Rights-Auswertung (`backend/internal/permissions/`, zentral `effective_rights.go` sowie die begleitenden `effective_rights_batch_summary.go`, `effective_rights_capability_impact_preview.go`, `effective_rights_role_assignment_preview.go`) wertet pro Aktion eine dokumentierte, feste Präzedenzkette aus (Kommentar in `effective_rights.go`, Zeilen 15 und 287):

```
platform_admin > disabled_actor > no_active_membership > user_deny > user_allow > ...
```

`Actor.IsPlatformAdmin` ist dabei explizit nicht aushebelbar — ein Test (`TestResolveGroupRightsPlatformAdminAlwaysAllowsNonDeniable`) verifiziert, dass ein Plattform-Admin selbst einen gespeicherten `user_deny` überschreibt. Die zugehörigen Konstanten sind `RolePlatformAdmin = "platform_admin"` sowie `ProvenancePlatformAdmin`/`ReasonPlatformAdmin = "platform_admin"`, sodass jede per Plattform-Admin-Bypass getroffene Entscheidung im Audit-Log als solche erkennbar bleibt.

Der HTTP-seitige Gate-Mechanismus liegt in `backend/internal/handlers/platform_admin_authz.go`: `requirePlatformAdminIdentity(c, roleChecker, fallbackRoleName)` prüft für App-User zunächst Disabled-/Pending-Status, danach `AppUserHasGlobalRole(ctx, appUserID, models.AppGlobalRolePlatformAdmin)`; für nicht-App-User-Identitäten greift ein Fallback auf die Legacy-`UserHasRole`-Prüfung.

Für die Fansub-Mitgliederverwaltung gelten zwei zusätzliche Capability-Schlüssel (`fansub_group.members.view`, `fansub_group.members.manage`) sowie ein fest definierter Rollenkatalog (`fansub_lead`, `project_lead`, `translator`, `timer`, `typesetter`, `editor`, `encoder`, `raw_provider`, `quality_checker`, `designer`) — nur Rollen aus der zentralen Permission-Matrix dürfen gespeichert werden. Das Backend schützt dabei zwei Selbstaussperr-Invarianten: Der letzte aktive `fansub_lead` einer Gruppe darf nicht entfernt oder deaktiviert werden, ebenso wenig die letzte aktive Mitgliedschaft mit `fansub_group.members.manage`. Verletzungen liefern `409 Conflict` mit einer verständlichen Fehlermeldung. Die UI wertet ausschließlich Capabilities aus und leitet Sichtbarkeit nie aus Rollennamen ab.

### Fansub-Mitgliederverwaltung (app-user-basiert)

Die app-user-basierte Mitgliederverwaltung pro Fansub-Gruppe ist der kanonische Admin-Seam für Gruppenzugehörigkeit. `fansub_members` bleibt dabei bewusst eine reine Legacy-/Contributor-Struktur für historische/archivarische Zwecke und ist keine Quelle für aktuelle App-Berechtigungen — aktuelle Mitgliedschaft und Rollen laufen ausschließlich über `fansub_group_members`/`fansub_group_member_roles`. Die zugehörige Admin-API:

| Endpunkt | Zweck |
| --- | --- |
| `GET /api/v1/admin/fansubs/:id/app-members` | Aktuelle Mitgliederliste einer Gruppe |
| `GET /api/v1/admin/fansubs/:id/app-member-candidates?q=...` | Suche nach einladbaren App-Usern |
| `POST /api/v1/admin/fansubs/:id/app-members` | Mitglied zur Gruppe hinzufügen |
| `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/roles` | Gruppenrollen eines Mitglieds setzen |
| `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/status` | Mitglied (de)aktivieren |

### Audit

Audit-Attribution ist ein hartes Projekt-Constraint. `AuditLogRepository.Write` persistiert jede relevante Admin-Mutation mit Actor-, Scope-, Target-, Action- und Outcome-Information plus freiem JSON-Payload in `audit_logs`. Für die Fansub-Mitgliederverwaltung existieren dokumentierte Event-Typen wie `fansub_group_member.created`, `fansub_group_member_role.updated`, `fansub_group_member.deactivated`, `fansub_group_member.reactivated`, `fansub_group_member_role.blocked` sowie Deny-Events bei fehlender Gruppenberechtigung. `admin_changes_handler.go` stellt auf Basis derselben Audit-Daten eine dedizierte „Änderungen"-Review-API bereit.

### Mail

`backend/internal/services/mailer.go` definiert ein schmales `Mailer`-Interface (`Send(ctx, MailMessage)`) mit zwei Implementierungen: `SMTPMailer` für echten Versand (STARTTLS/Implicit-TLS) und `NoopMailer` (`services.NewNoopMailer()`) für Umgebungen ohne Mailversand. `cfg.SMTPEnabled` entscheidet beim Boot, welche Implementierung verdrahtet wird. Lokal fängt der Compose-Service `team4sv30-mailpit` sämtliche ausgehenden Mails ab (`SMTP_HOST=team4sv30-mailpit`, Port 1025, Web-UI auf Port 8025), ohne real zu versenden; Keycloak nutzt lokal denselben Mailpit-Server für Account-Mails. In Produktion übernimmt Mailjet als SMTP-Relay (`SMTP_HOST=in-v3.mailjet.com`, Port 587) — Zugangsdaten werden ausschließlich über Umgebungsvariablen gesetzt, niemals ins Repository committed.

## Backendspezifische aktuelle Verträge

### API und Downloads

Geteilte Contracts liegen als YAML unter `shared/contracts/`, mit `openapi.yaml` als Umbrella-Vertrag (Titel „Team4s v3 API") und domänenspezifischen Dateien (`admin-capabilities.yaml`, `admin-content.yaml`, `anime-backdrops.yaml`, `anime-detail.yaml`, `anime-list.yaml`, `asset-stream.yaml`, `auth.yaml`, `comments.yaml`, `contributions.yaml`, `episodes.yaml`, `episode-versions.yaml`, `fansubs.yaml`, `watchlist.yaml`). Vor jeder Endpunktänderung ist die Reihenfolge: Umbrella-Contract prüfen → ggf. domänenspezifischen Contract prüfen → Routenregistrierung in `main.go`/`admin_routes.go` prüfen → Handler/Repository-Form prüfen → Frontend-API-Helfer (`frontend/src/lib/api.ts`) und Typen abgleichen. Browser-Zugriffe laufen ausschließlich über den Next.js-Catch-all-Proxy `/api/v1/[...path]`; Medien werden über `/media`-StaticFS mit Security-Headern ausgeliefert, niemals über einen zweiten Serving-Pfad.

### Auth und Rechte

Aktive Modi: Keycloak-OIDC (Produktionsmodus, `KEYCLOAK_ENABLED=true`) und Legacy-HMAC mit lokalem Bypass (Entwicklungsmodus). Kanonische Autorisierungstabellen sind `app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles`; `fansub_members` ist eine reine Legacy-/Contributor-Struktur und keine Quelle für App-Berechtigungen. Legacy `users`/`roles`/`user_roles` existieren noch parallel in einer älteren Migrationslinie (`backend/database/migrations/`), sind aber nicht kanonisch — kanonisch sind ausschließlich die `app_*`-Tabellen. Die Rechte-Präzedenzkette (`platform_admin > disabled_actor > no_active_membership > user_deny > user_allow > ...`) ist nicht verhandelbar und muss bei jeder neuen Capability-Prüfung respektiert werden.

### Datenbank, Redis und Speicher

Primäre Migrationen liegen unter `database/migrations/` (368 Dateien, 184 nummerierte `up`/`down`-Paare, `NNNN_description.{up,down}.sql`); zusätzlich existiert eine ältere, nicht kanonische Parallelwelt unter `backend/database/migrations/` mit abweichendem Schema für dieselben Medien-Tabellennamen (`media_assets`, `media_files`, `anime_media`, `episode_media`, `fansub_group_media`, `release_media`) — bei Unsicherheit über die „echte" Tabelle gilt immer `database/migrations/` als Quelle der Wahrheit. Zentrale Tabellengruppen: Anime-Kern (`anime`, `episodes`, Relationstabellen), Fansub-Zuordnung und Releases (`anime_fansub_groups`, `fansub_releases`, `release_versions`, `release_version_groups`, `release_variants`, `release_streams` als kanonischer Stream-Graph gegenüber dem Legacy-`streams`), Medien-Kern (`media_assets`, `media_types`), App-User-/Rechte-Tabellen (`app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles`, `fansub_group_invitations`), Audit (`audit_logs`, `admin_anime_mutation_audit`). Redis wird für vier getrennte Zwecke genutzt: Session-/Token-Store (`repository/auth.go`), Kommentar-Rate-Limiting (`middleware/comment_rate_limit.go`), Episoden-Playback-Grants/-Konkurrenz (`handlers/episode_playback_rate_limit.go`, `episode_playback_grant_store.go`, `episode_playback_audit.go`) und Jellyfin-Discovery-Caching mit 5-Minuten-TTL (`handlers/jellyfin_discovery_cache_redis.go`). Dateispeicher liegt unterhalb des konfigurierten `MediaStorageDir` und wird ausschließlich über `/media`-StaticFS mit Security-Headern ausgeliefert.

Die zentrale Beziehungsstruktur zwischen Anime, Fansub-Zuordnung, Release-Kette und Medien lässt sich so zusammenfassen:

```
anime (neutral) ──┬──> episodes (neutral)
                   └──> anime_fansub_groups <── fansub_groups
episodes ──> fansub_releases ──> release_versions ──> release_version_groups <── fansub_groups
release_versions ──> release_version_media ──> media_assets ──> media_types
fansub_groups ──> fansub_group_media ──> media_assets
anime ──> anime_contributions <── members
app_users ──> fansub_group_members ──> fansub_group_member_roles
```

### Medienspeicher (aktuelles Modell)

Das aktuelle Medienmodell ist nicht in einer einzigen Datei definiert, sondern ergibt sich aus einer Tabellen- und Namenskonvention: generische Asset-Zeilen in `media_assets`, ein Art-Katalog in `media_types`, sowie domänenspezifische Join-Tabellen pro Owner (`anime_media` für Anime-Cover, analoge Tabellen für Fansub-Branding, Release-Theme-Assets, Release-Version-Prozessmedien, Segment-Assets, Mitgliedsprofil-Medien). Go-seitig modelliert `backend/internal/models/media.go` die `MediaKind`-Enum (`logo`, `banner`, `theme_video`, `segment_asset`, `image`) sowie `MediaAsset` mit mehreren URL-Varianten pro Asset (`PublicURL`, `SourceOriginalURL`, `DisplayURL`). Dateien mit `_v2`-Suffix (`anime_v2.go`, `admin_content_anime_create_v2.go`, `admin_content_anime_update_v2.go`, `media_upload_v2_compat.go`) markieren im Code den „V2-first"-Übergang: Seit Phase 6+ müssen Anime-Cover-Uploads immer einen echten `media_assets`-Eintrag erzeugen, nicht nur eine Legacy-Spalte befüllen. Migration `0184_drop_anime_cover_image` entfernt konsequenterweise die Legacy-Spalte `anime.cover_image`; ihr Pre-Flight-Guard brach den Migrationslauf ab, falls noch ein Anime-Datensatz einen nur-Legacy-Cover ohne gespiegelte V2-Poster-Zeile (`anime_media` → `media_assets` → `media_types` mit `name = 'poster'`) besaß. Die Down-Migration stellt bewusst nur die leere Spaltenform wieder her, nicht die Daten. Upload-Varianten: `MediaService` persistiert pro Upload mindestens `source_original` und erzeugt automatisch eine `display`-Variante.

Die Owner-Zuordnung je Medienart im Überblick:

| Medienart | Kanonische DB-Owner-Tabellen | Nicht verwechseln mit |
| --- | --- | --- |
| Fansub-Branding/Gruppenmedien | `fansub_group_media`, `fansub_groups.logo_id`/`banner_id`, `media_assets`, `media_files` | Anime-Assets oder Release-Version-Prozessmedien |
| Anime-Cover/Banner/Logo/Hintergrund/Video | Anime-Slot-Spalten, `anime_background_assets`, `media_assets`, `media_files` | Fansub-spezifisches Projekt-Branding |
| Release-Theme-Asset (OP/ED/Theme-Video) | `release_theme_assets`, `themes`, `theme_segments`, `media_assets`, `media_files` | Release-Version-Prozess-Screenshots/-Dateien |
| Release-Version-Prozessmedien | `release_version_media`, `media_assets`, `media_files` | `episode_media`, `release_media` oder direkte Episoden-Anhänge |
| Segment-Asset | Segment-Bibliothek-/Playback-Tabellen, Medien-Asset-/Datei-Tabellen | Allgemeine Release-Uploads |
| Mitgliedsprofil-Medien (Avatar/Hintergrund/Story) | `members`, `media_assets.owner_member_id`, Mediendateien | Fansub-Gruppen-Mitgliedsdatensätze oder historische Mitgliedsdaten |
| Legacy/öffentliche Release-Medien | `release_media`, `media_assets`, `media_files` | Admin-/Fansub-release-version-gebundene Prozessmedien |

### Hintergrundjobs

Alle asynchronen Arbeiten laufen als In-Prozess-Goroutinen, die beim Start aus `main.go` erzeugt werden — es gibt weder ein separates Worker-Binary noch ein externes Queue-System. Dauerhaft laufend: der Segment-Render-Worker (`adminContentHandler.StartSegmentRenderWorker`, nur falls `cfg.SegmentRenderEnabled`). Periodisch per Ticker: Cleanup verwaister Segment-Untertitel sowie Cleanup für Release-Version-Medien und Release-Reviews (Intervall ca. 10 Minuten, `services.ReleaseReviewCleanupInterval`). Synchron beim Boot: Recovery nicht abgeschlossener Segment-Renderjobs. Ergänzend bietet `cmd/migrate` einmalig manuell auszuführende Backfill-Subkommandos (`backfill-phase-a-metadata`, `backfill-badges`) — diese sind CLI-Operationen, keine geplanten Jobs.

### Rollen-Capability-Zusammenfassung

| Rolle | Kann | Kann nicht / sollte nicht |
| --- | --- | --- |
| Öffentlicher Besucher | Öffentliche Anime-/Fansub-/Mitgliedsprofile, Archiv, öffentliche Releases und bewusst öffentliche Medien durchsuchen. | Keine Mutation von Profil-, Watchlist-, Kommentar-, Admin-, Release-, Review- oder Upload-Daten. |
| Eingeloggtes Mitglied | Eigenes Profil, Avatar/Hintergrund/Story-Bilder, eigene Noindex-/Badge-Sichtbarkeit, Watchlist/Kommentare, eigene Claims/Einladungen, erlaubte Contribution-Proposals verwalten. | Keine Verwaltung fremder Nutzer, globaler Anime-Daten, Fansub-Admin-Daten, Release-Medien oder Review-Queues ohne entsprechende Rolle/Capability. |
| Fansub-Mitglied | Hat Gruppenkontext; je zugewiesener Rolle/Capability Einsicht in oder Beitrag zu gruppeneigenen Admin-Oberflächen. | Capability muss pro Gruppe/Release/Release-Version geprüft werden — reine Mitgliedschaft hebelt Autorisierung nicht aus. |
| Fansub-Leiter (`fansub_lead`) | Nutzt den kanonischen internen Workspace `/admin/fansubs/[id]/edit` für die eigene Gruppe; kann erlaubte Gruppendaten (Medien, App-Mitglieder, Projekte, Releases, Notizen, Proposals/Reviews, Rollen) je Server-Capability-Prüfung verwalten. | Darf Leiter-Review-/Admin-Verhalten nicht über einen zweiten, parallelen Workspace abbilden; darf Medien nicht in die falsche Owner-Tabelle schreiben. |
| Plattform-Admin (`platform_admin`) | Umfassende Admin-Rechte: Anime erstellen/bearbeiten, AniSearch/Jellyfin, Fansub-CRUD, Nutzer/App-Mitglieder, Releases, Claims, Archiv-/Contribution-Verwaltung, Theme-/Segment-Verwaltung; überschreibt jede fachliche Deny-Entscheidung nicht-deniable. | Muss trotz Vorrangs weiterhin Domänen-Ownership und Contract-Dateien respektieren — Plattform-Admin-Macht rechtfertigt keinen Bruch der kanonischen Seams. |

### Konfiguration und Verifikation

`backend/internal/config/config.go` (272 Zeilen) liest beim Start einmalig alle relevanten Env-Bereiche in einen einzigen `Config`-Struct: HTTP-Port/Runtime-Profil, Postgres-URL, Auth (HMAC-Secret, Keycloak-Toggle mit Issuer/Discovery/Client-ID/Audience/Account-URL, Legacy-Admin-Rollenname, veraltete `AuthAdminBootstrapUserIDs`), Emby/Jellyfin-Stream-Konfiguration, Redis-Adresse/Passwort/DB, Dev-Token-Flags, Release-Stream-Grant-Secret/TTL, Episoden-Playback-Rate-Limit/-Konkurrenz, Medien-Storage-Verzeichnis und öffentliche Basis-URL, ffmpeg-/vipsthumbnail-Pfade, Segment-Render-Konfiguration (aktiviert, Verzeichnis, Max-Sekunden, ffmpeg-/ffprobe-Pfade, Konkurrenz), TMDB-/fanart.tv-API-Keys, SMTP-Mailer-Konfiguration, `AppPublicURL`, sowie eine CORS-Allowlist (`CORSAllowedOrigins`). `validateRuntimeConfig(cfg)` prüft diese Werte beim Start fail-fast. Für lokale Keycloak-Verifikation existiert `scripts/verify-keycloak-config.ps1`, das idempotent gegen eine laufende Keycloak-Instanz prüft/korrigiert (fehlender `roles`-Client-Scope, Default-Scope-Zuordnung auf `account`/`account-console`) und per echtem PKCE-Login beweist, dass die Account-Console ohne `403` funktioniert — sowohl bei frischem Realm-Import als auch bei einem bereits bestehenden Keycloak-Datenvolume.
