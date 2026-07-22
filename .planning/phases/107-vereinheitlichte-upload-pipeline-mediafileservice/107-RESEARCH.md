# Phase 107: Vereinheitlichte Upload-Pipeline (MediaFileService) - Research

**Researched:** 2026-07-22
**Domain:** Sichere, deduplizierende Dateiannahme und Übergangspersistenz für Go/PostgreSQL/Dateisystem
**Confidence:** HIGH für Code-/Schema-Inventar und Phasengrenzen; MEDIUM für die empfohlenen Video-/Audio-Profile und den Crop-Kompatibilitätsweg

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Übergang Phase 107 → 108
- **D-01:** Alle sechs Upload-Einstiege verwenden nach Abschluss von Phase 107 den neuen `MediaFileService`. Ein temporärer Kompatibilitätsadapter hält die bestehenden Relationspfade bis Phase 108 funktionsfähig, ohne Dateiinhalt oder Varianten doppelt zu verarbeiten oder zu speichern.
- **D-02:** Neuer Medienkern und alter Relationspfad bilden pro Datei eine Alles-oder-nichts-Einheit. Erst wenn Original, Varianten, neue Medienzeilen und Kompatibilitätsrelation erfolgreich sind, gilt der Upload als erfolgreich. Andernfalls werden erzeugte Dateien und DB-Zeilen kompensierend bereinigt.
- **D-03:** Die Migration erfolgt inkrementell innerhalb derselben Phase: zuerst der gemeinsame Service, danach jeder Upload-Einstieg separat mit fokussierten Tests. Jeder Zwischenschritt muss build- und uploadfähig bleiben; am Phasenende sind alle sechs Einstiege migriert.
- **D-04:** Der Adapter ist ausdrücklich Übergangscode und muss in Phase 108 entfernt werden. Phase 108 erhält ein Quellcode-/Test-Gate, das verbleibende Legacy-Schreibzugriffe verhindert.

### Deduplizierung und Uploader-Credit
- **D-05:** Der SHA-256-Hash wird aus dem tatsächlich gespeicherten, sicher bereinigten Original berechnet. Gleiche gespeicherte Bytes verweisen global auf dieselbe `media`-Zeile.
- **D-06:** Der erste Uploader bleibt globaler Eigentümer (`media.owner_user_id`) und wird durch spätere Wiederverwendungen nicht überschrieben. Der Credit späterer Nutzer gehört an die konkrete Verwendung (`relation.added_by_user_id`) und damit nicht an das globale Medium.
- **D-07:** Wiederholungen sind nach Verwendungskontext und Slot idempotent. Existieren Medium und identische Verwendung bereits, liefert der Service Erfolg mit `reused=true` und erzeugt weder eine zweite Datei noch eine zweite Relation. Andere Kontexte oder Slots dürfen dasselbe Medium verwenden.
- **D-08:** Globale Metadaten des ersten Uploads — insbesondere Eigentümer, ursprünglicher Dateiname, Quelle, Credit und Rechtehinweis — werden bei Wiederverwendung nicht still überschrieben. Änderungen benötigen einen ausdrücklich autorisierten Bearbeitungsvorgang.
- **D-09:** Die Deduplizierungsregel gilt langfristig quellenübergreifend für Uploads, Jellyfin und externe Provider. Phase 107 setzt die uploadseitige Basis um; Provider werden in ihrer dafür vorgesehenen Folgephase angeschlossen.

### Fehler, Rollback und Wiederaufnahme
- **D-10:** Ein fehlgeschlagener Nutzer-Upload hinterlässt keine Medien- oder Variantenreste. Diagnoseinformationen bleiben ausschließlich in Audit und Logs erhalten.
- **D-11:** Neue Dateien werden zuerst in einem nicht öffentlichen Staging-Bereich verarbeitet. Erst nach erfolgreicher Validierung und Persistenz werden sie atomar an den hash-basierten Zielort verschoben. Veraltete Staging-Reste werden durch eine kleine kontrollierte automatische Bereinigung entfernt.
- **D-12:** Mehrfach-Uploads sind pro Datei atomar, nicht als gesamter Stapel. Gültige Dateien bleiben erfolgreich; jede ungültige Datei wird vollständig zurückgerollt. Die API-Antwort enthält pro Datei ein Ergebnis mit Erfolg, `reused` oder einheitlichem Fehler.
- **D-13:** Geht eine Netzwerkantwort nach erfolgreicher Verarbeitung verloren, führt der Wiederholungsversuch anhand Hash und Verwendungskontext automatisch zum bestehenden Medium und zur bestehenden Relation. Er antwortet erfolgreich mit `reused=true` statt ein Duplikat oder einen Konflikt zu erzeugen.

### Varianten und Upload-Grenzen
- **D-14:** Es gibt einen gemeinsamen Validierungskern mit zentralen Profilen pro Medienart. Für Bilder gilt mindestens die heute härteste Regelmenge: maximal 15 MB, höchstens 8000 × 8000 Pixel, höchstens 40 Megapixel und höchstens 300 GIF-Frames. Video und Audio erhalten eigene zentrale MIME- und Größenprofile statt oberflächenspezifischer Regeln.
- **D-15:** `original` bedeutet ein sicheres, visuell unverändertes Original: keine Skalierung, kein Formatwechsel, Transparenz und GIF-Animation bleiben erhalten; EXIF und andere sensible Metadaten werden entfernt. Der Content-Hash bezieht sich auf diese tatsächlich gespeicherte bereinigte Datei.
- **D-16:** Bei animierten Bildern ist das Thumbnail statisch, während die größere Preview die vollständige Animation bewahrt. Transparente Bildvarianten müssen ihren Alphakanal erhalten.
- **D-17:** Varianten werden nur erzeugt, wenn sie technisch sinnvoll sind: Bilder erhalten `original`, `thumbnail` und `preview`; Videos erhalten `original` und passende Vorschaubilder; Audio erhält zunächst nur `original`. Es entstehen keine leeren Platzhalterzeilen und keine nutzlosen Dateikopien.
- **D-18:** Magic-Byte, deklarierter MIME-Typ, erlaubtes Medienartprofil und erzeugte Metadaten müssen konsistent sein. Alle Upload-Flächen verwenden dieselben Fehlercodes und dieselbe Ergebnisform.

### Agent's Discretion
- Exakte Paket- und Dateiaufteilung des Services und seiner kleinen Hilfstypen, solange vorhandene Repositories und Services erweitert, das 450-Zeilen-Limit eingehalten und keine parallelen Upload-Pipelines geschaffen werden.
- Konkrete zentrale Grenzwerte und MIME-Whitelists für Video und Audio, sofern bestehende strengere Sicherheitsgrenzen nicht still gelockert und die Werte in Tests und Vertrag dokumentiert werden.
- Konkrete Preview-/Thumbnail-Abmessungen und Encoder-Einstellungen innerhalb der festgelegten Qualitätsregeln zu Animation und Transparenz.
- Namen der Audit-Ereignisse und maschinenlesbaren Fehlercodes, sofern sie sich in die bestehenden API- und Audit-Konventionen einfügen.

### Deferred Ideas (OUT OF SCOPE)
- Endgültige Verwendungstabellen, direkte Kernmedien-FKs, kontextspezifische Permissions sowie Entfernung des Kompatibilitätsadapters → **Phase 108**.
- Vollständige Frontend-Umstellung auf die neuen Medien- und Relationsverträge → **Phase 109**.
- Datenreset, Seeds, Fixture-Zuordnung und vollständiges medienübergreifendes E2E-Gate → **Phase 110**.
- Anschluss von Jellyfin und externen Providern an die globale Hash-Deduplizierung → jeweilige vorgesehene Provider-/Folgephase; Phase 107 legt den quellenneutralen technischen Kern.

### Reviewed Todos (not folded)
- `Contribution-UI auf globale components/ui-Primitives umstellen (Phase 67 Folgearbeit)` — reine UI-Konsolidierung; gehört nicht in den technischen Upload-Kern.
- `Contributor owned media and note edit delete` — Ownership-, Edit- und Delete-Verhalten der Verwendung; gehört zu Relations-/Permission-Arbeit, insbesondere Phase 108/109.
- `fansubs/[id]/edit/page.tsx aufteilen (450-Zeilen-Limit, CR-04 Phase 78)` — unabhängiger Frontend-Refactor.
- `Phase-78 Medien-Review Code-Review-Warnings abarbeiten` — Review-/Berechtigungs- und Workspace-Folgearbeit, nicht technische Dateiverarbeitung.
- `Profile hub content activity redesign` — unabhängiges Profil-UI-Redesign.
- `Credits-UI in "Anime & Veröffentlichungen" konsolidieren + Permission-Brücke (Design)` — UI- und Permission-Thema für spätere Oberflächen-/Relationsphasen.
- `Member-Profil-Seite — UI-Politur + params.id-Korrektheitsbug` — unabhängiger Profilseiten-Bug und UI-Politur.
- `Kollaboration public handling neu loesen` — öffentliches Kollaborations- und Sichtbarkeitsmodell, nicht Upload-Technik.
- `Fansub achievement badge catalog implementieren` — unabhängige Gamification-/Fansub-UI-Arbeit.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P107-ARCH-01 | Architekturentscheid: Ebene 0 technischer Kern, §1 Upload-Vereinheitlichung. | Ein einziger erweiterter `MediaService`/`MediaFileService`, zentrale Profile, Hash/Storage, Varianten, sechs dünne Kontextadapter, deduplizierende DB-Constraints und ein Phase-108-Entfernungsgate. [VERIFIED: `.planning/ROADMAP.md:2422-2432`; `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md` §1 Ebene 0] |
</phase_requirements>

## Summary

Phase 107 darf erst nach vollständig ausgeführter und verifizierter Phase 106 geplant beziehungsweise implementiert werden. Im untersuchten Stand existieren die geplanten `0131_media_core_schema`-Dateien und die Tabellen `media`/`media_variant` noch nicht; die Live-Dev-DB meldet beide Tabellen als abwesend. Phase 106 legt `content_hash` ausdrücklich nur mit einem nicht-eindeutigen partiellen Index an. Phase 107 muss deshalb eine neue append-only Migration mit einem partiellen **UNIQUE**-Index auf `media(content_hash)` und einer Eindeutigkeit für `(media_id, variant)` besitzen, sonst sind D-05/D-07 unter Parallelität nicht beweisbar. [VERIFIED: `106-01-PLAN.md` D-05/Task 2; `database/migrations` endet bei 0130; Live-DB-Abfrage `to_regclass('public.media')`/`media_variant` am 2026-07-22]

Der existierende, in `backend/cmd/server/main.go` einmal konstruierte `services.MediaService` ist der richtige Erweiterungspunkt. Er wird bereits an Admin-Content und Fansub-Handler injiziert; Avatar/Background/Story benötigen dieselbe Instanz zusätzlich. Die derzeitigen Pfade schreiben direkt in den öffentlichen Storage, lesen teils komplette Dateien in den Speicher und duplizieren Validierung, Varianten, DB-Transaktionen und Kompensation. Die Umstellung muss diese Mechanik aus den Handlern entfernen, nicht bloß einen siebten Wrapper danebenstellen. [VERIFIED: `backend/internal/services/media_service.go`; `backend/cmd/server/main.go:85,187,232,279`; sechs Handler-Inventar unten]

Der schwerste Übergang ist nicht das Hashing, sondern die alte Lese-/Relationswelt. Empfohlen ist ein expliziter temporärer Link `media_assets.core_media_id -> media.id`: pro fachlicher Verwendung darf ein Legacy-Alias entstehen, damit alte kontextspezifische Review-/Visibility-Daten nicht globalisiert werden; physische Dateien und technische Varianten existieren aber ausschließlich in `media`/`media_variant`. Alte Reader werden während Phase 107 über diesen Link auf die neuen Varianten geführt. Das macht den Adapter lokalisierbar und in Phase 108 per Grep-/Schema-Gate entfernbar. [ASSUMED]

**Primary recommendation:** Bestehenden `MediaService` in kleine Dateien aufteilen und zum einzigen stream-basierten `MediaFileService` ausbauen; zuerst DB-Eindeutigkeit + Core-/Adapter-Interfaces, dann RVM als Referenzpfad und anschließend Fansub, Theme, Generic, Profil und Story migrieren, mit Fehlerinjektion und Auth-Refresh-Regression pro Welle. [VERIFIED: `107-CONTEXT.md` D-01–D-04; `AGENTS.md` Reuse/Auth/Validation]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Multipart-Annahme, deklarierter MIME, Dateigrößenlimit | API / Backend | Browser / Client | Server ist Vertrauensgrenze; Client liefert nur Datei und Fortschritt. [VERIFIED: bestehende Gin-Handler + `frontend/src/lib/api.ts::authorizedUploadXhr`] |
| Magic-Byte, sichere Dekodierung, Metadatenentfernung, Varianten | API / Backend | FFmpeg-Prozessgrenze | Muss für alle Oberflächen identisch und nicht umgehbar sein. [VERIFIED: `107-CONTEXT.md` D-14–D-18] |
| SHA-256, hash-basierter Schlüssel, Staging/Promotion | API / Backend | Dateisystem / Static Serving | Service besitzt technische Datei-Lebensdauer; `/media` darf Staging nie ausliefern. [VERIFIED: `backend/cmd/server/main.go:60-69`; D-05/D-11] |
| Globales Medium/Varianten und konkurrierende Deduplizierung | Database / Storage | API / Backend | UNIQUE-Index ist die einzige robuste globale Race-Barriere; Service nutzt `ON CONFLICT`. [CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| Kontext, Slot, Permission, Relation/Alias | API / Backend (dünner Kontextadapter) | Database / Storage | Permissions und Verwendung bleiben fachlich, der Dateiservice kennt keine Fansub-/Release-/Profilrechte. [VERIFIED: Architekturentscheid §1 Ebene 0 und §3] |
| Upload-Fortschritt, Session-Refresh, Retry | Browser / Client | API / Backend | `authorizedUploadXhr` besitzt Auth-Transport; Backend-Idempotenz macht Replay nach verlorener Antwort sicher. [VERIFIED: `frontend/src/lib/api.ts:2249-2380`; D-13] |
| Öffentliche Auslieferung fertiger Varianten | CDN / Static | API / Backend | Nur `ready`-Hashpfade sind öffentlich; Staging bleibt gesperrt. [VERIFIED: `backend/cmd/server/main.go:60-69`; D-11] |

## Project Constraints (from AGENTS.md)

- Phase 107 ist GSD/planning-only in diesem Auftrag; nicht implementieren. Bei späterer Umsetzung: Code zuerst inspizieren, kurze Ausführungsfolge, relevante Checks, Fehlerbehebung und Diff-Selbstreview. [VERIFIED: `AGENTS.md` Default Workflow]
- Anime und Episodes bleiben neutral. Release-Version-Media muss über eine echte `release_version_id` und den release-nativen Pfad laufen; niemals direkt an Episodes und niemals über `release_media` als Ersatz. Gruppenmedien bleiben auf `fansub_group_media`; keine parallele Medienlogik erfinden. [VERIFIED: `AGENTS.md` Project Domain Rules; `docs/architecture/db-schema-fansub-domain.md`]
- Vor neuen Services, Repositories, DTOs, Endpoints, Helpers oder Upload-Komponenten bestehende Äquivalente suchen und erweitern. Für Phase 107 ist `backend/internal/services/media_service.go` der primäre Service-Seam; `MediaUpload.tsx`, `ReleaseVersionMediaSection.tsx`, `useReleaseVersionMedia.ts` und `frontend/src/lib/api.ts` bleiben die Frontend-Seams. [VERIFIED: `AGENTS.md` Implementation Reuse And Contract Rules]
- Geänderte Endpunkt-/DTO-/Fehler-/Frontend-Helper-Verträge müssen gleichzeitig in `shared/contracts/openapi.yaml`, gegebenenfalls `shared/contracts/admin-content.yaml`, Backend-DTOs, `frontend/src/types/*` und `frontend/src/lib/api.ts` nachgezogen und fokussiert getestet werden. [VERIFIED: `AGENTS.md` API Contract Rules]
- Geschützte Upload-UI darf eine Session mit `hasAccessToken || hasRefreshToken` nicht als ausgeloggt behandeln; Browsercode konstruiert keine Bearer-Header und ruft keine Refresh-Helfer direkt. Der Fall „Access-Token fehlt/ist abgelaufen, Refresh-Token gültig, Upload läuft über zentralen Refresh-Seam“ ist Pflicht-Regression und Security-Gate. [VERIFIED: `AGENTS.md` Auth Session Rules]
- Historische Migrationen bleiben unverändert. Vor einer neuen Migration sind aktuelle Nummern und `git status` zu prüfen; bei mehreren untracked Migrationen ist zu stoppen. Up/Down ist reversibel zu halten, destruktive Schritte benötigen Referenz-/Datenprüfung. [VERIFIED: `AGENTS.md` Database And Migration Rules]
- Keine neuen UI-Flows oder sichtbare Neugestaltung in dieser technischen Phase; existierende Upload-Komponenten und zentrale API-Wrapper minimal an die einheitliche Antwort/Retry-Semantik anpassen. Deutsche UI-/HTTP-Nutzertexte verwenden korrekte Umlaute. [VERIFIED: `AGENTS.md` UI Rules; Phase-109-Abgrenzung]
- Diffs bleiben klein; kein breites Formatting und keine unrelated Refactors. Relevante Checks: Go-Build/Vet/Tests, Frontend-Typecheck/Lint/Tests/Build soweit machbar, Migration Up/Down und `git diff --check`. [VERIFIED: `AGENTS.md` Formatting And Diff Rules; Validation]
- Storage-Cleanup darf `frontend/public/history-event-badges-transparent/` niemals berühren. Staging-Cleanup muss auf einen verifizierten projektkontrollierten Media-Unterpfad begrenzt sein. [VERIFIED: `AGENTS.md` Working Rules]

## Dependency and Readiness Gate: Phase 106

| Gate vor 107 | Erwarteter Zustand | Aktueller Forschungsstand |
|---------------|--------------------|---------------------------|
| Phase-106-Ausführung abgeschlossen | `106-*-SUMMARY.md`/Verification vorhanden; `go build`, `go vet`, Tests und Medienkern-Contract grün. | Noch nicht ausgeführt; nur Pläne/Research vorhanden. [VERIFIED: Phasenverzeichnis 106 am 2026-07-22] |
| Kernschema vorhanden | `media`, `media_variant`, CHECKs/FKs aus 0131; `media_assets`/`media_files` bleiben für Übergang. | 0131-Dateien fehlen; Live-DB `media`/`media_variant` abwesend. [VERIFIED: filesystem + Live-DB] |
| Upload-Legacyabbau aus 106 | `SupportsLegacyUploadSchema`, V2-Dualdetektor und Asset-Lifecycle-Provisioning entfernt; generischer Upload-Seam bleibt funktionsfähig. | Nur in 106-Plänen spezifiziert; nach 106 erneut scannen. [VERIFIED: `106-04-PLAN.md`, `106-06-PLAN.md`] |
| Migrationsnummer frei | Nächste Nummer **nach der tatsächlich verwendeten 106-Migration** wählen. | Heute endet die Kette bei 0130; 106 plant 0131, aber 107 darf die Nummer nicht vorab fest verdrahten. [VERIFIED: `database/migrations`; `AGENTS.md`] |
| Schema-Invarianten | `content_hash` nullable und zunächst nicht unique; `media_variant` ohne `(media_id,variant)`-Unique. | Genau so in 106 geplant; 107 ergänzt die Eindeutigkeiten. [VERIFIED: `106-01-PLAN.md:114-117`] |

**Planner gate:** Plan 107 beginnt mit einem expliziten Readiness-Task: Phase-106-Verification lesen, `git status`, Migrationsende, echte 0131-DDL, Service-/Handler-Dateien und Live-DB-Contract erneut prüfen. Bei Abweichung werden Dateinamen und Migrationstasks gegen den Post-106-Stand rebasiert; niemals gegen den hier untersuchten Pre-106-Snapshot blind ausführen. [VERIFIED: `AGENTS.md` Migration/Stop Conditions]

## Exact Current Pipeline Inventory

| Upload-Einstieg | Route / Handler | Heute duplizierte technische Arbeit | Legacy-Relation / Rückgabe | Bestehende Tests | Zieladapter in 107 |
|-----------------|-----------------|------------------------------------|---------------------------|------------------|-------------------|
| Release-Version-Media | `POST /api/v1/admin/release-versions/:versionId/media`; `UploadReleaseVersionMedia` → `processOneRVMFile` | 15 MB, JPEG/PNG/WebP/GIF, 8000×8000, 40 MP, 300 GIF-Frames, 400er Thumb, direkte Pfade, eigene Tx/Kompensation. | `media_assets` + `media_files` + `release_version_media`; Ergebnis mit Asset-/Relations-ID. | `admin_content_release_version_media_test.go`, Repository-Tests. | Kontext `release_version_id + source_group + category/slot`; Permission bleibt vor Service; echter `release_version_id`, nie Episode. [VERIFIED: Handler/Repo/Migration 0059/0130] |
| Fansub-Branding + Galerie | `POST /api/v1/admin/fansubs/:id/media`; `UploadFansubMedia`, `uploadFansubGroupMedia`, `processOneFansubGroupMediaFile` | Branding nutzt `SaveUpload`/`SaveUploadSourceOriginal`; Galerie dupliziert RVM-Thumb/Tx; unterschiedliche Limits. | Logo/Banner über `fansub_groups`-FKs; Galerie über `fansub_group_media`; verschiedene Antwortformen. | `fansub_media_upload_test.go`, `fansub_media_thumbnail_test.go`, Repo-Tests. | Kontext `fansub_group_id + logo|banner|gallery:<category>`; bestehende `CanForFansubGroup`-Prüfung bleibt im Handler. [VERIFIED: Handler, `media_repository.go`, Migration 0026/0109] |
| Theme-Asset | `POST /api/v1/admin/fansubs/:id/anime/:animeId/theme-assets` und `/admin/releases/:releaseId/theme-assets`; `UploadReleaseThemeAsset*` | Unbegrenztes `io.ReadAll`, danach 500-MB-Service-Limit; MP4/WebM/MKV/AVI/MOV; direkte Datei + mehrere DB-Aufrufe mit manueller Kompensation. | `media_assets` + `media_files` + `release_theme_assets`; Domain-Aggregat als Antwort. | `admin_content_release_theme_assets_test.go`, `admin_content_fansub_releases_test.go`. | Kontext `release_id + theme_id + playback slot`; Domain-Permission/Theme-Auflösung bleiben vor Core. [VERIFIED: Handler, `media_service.go`, `admin_content_anime_themes.go`, Migration 0044] |
| Generischer Admin-Upload | `POST /api/v1/admin/upload`; `MediaUploadHandler.Upload` + `media_upload_image.go`/`media_upload_video.go` | Eigene MIME-/Bild-/Video-Logik, direkte Kontextpfade, FFmpeg/ffprobe, Varianten und Tx. | `media_assets`/`media_files` + `anime_media`/alte Slots; eigenes `{id,status,url,files}`. | `media_upload_test.go`, Bild-/Video-/Storage-Tests. | Dünner Anime-Kontextadapter; Berechtigungsneubau bleibt Phase 108, aber vorhandene Auth-Grenze wird nicht abgeschwächt. [VERIFIED: Handler/Repo/Routes; Architekturentscheid §3] |
| Avatar / Background | `POST /api/v1/me/profile/avatar`, `/background`; `UploadOwnProfileAvatar/Background` | `source_file` + `cropped_file`, eigene Image/GIF-Behandlung, direkte Pfade; Repository baut alte Assets/Files inklusive `source_original`. | `members.avatar_media_id`/`background_media_id` zeigen aktuell auf `media_assets`; Profilantwort. | `app_auth_test.go` (Typ, SVG, Crop, GIF). | Kontext `member_id + avatar|background`; AppAuthHandler erhält dieselbe Service-Instanz; Member-/Disabled-Checks bleiben vor Core. [VERIFIED: `app_profile.go`, `member_profile_repository.go`, `member_profile.go`] |
| Story-Bild | `POST /api/v1/me/profile/story-images`; `UploadOwnProfileStoryImage` | 10 MB, JPEG/PNG/WebP, 40 MP, Resize auf max. 1600, direkte Datei, eigenes Cleanup. | altes `media_asset_id` wird im TipTap-JSON referenziert und über `/media/story-images/:id` aufgelöst. | `app_profile_story_image_test.go`, Profilseiten-/Editor-Tests. | Kontext `member_id + story/body usage`; sichere unskalierte Core-Originaldatei, 1600er Preview; temporärer Alias hält die alte IDOR-/Resolver-Semantik. [VERIFIED: Handler/Repo/Frontend Story-Extension] |

### Existing seams to extend, not duplicate

- `services.NewMediaService` bleibt **einmal** in `backend/cmd/server/main.go` konstruiert. Seine Instanz wird zusätzlich in `AppAuthHandler` und `MediaUploadHandler` injiziert; kein `NewMediaFileService` neben einer weiterlebenden alten Instanz. Ein Typalias/Umbenennen ist zulässig, solange Konstruktor und alle Call-Sites in derselben inkrementellen Welle kompilieren. [VERIFIED: `backend/cmd/server/main.go`; `107-CONTEXT.md` D-01/D-03]
- Neue Core-SQL-Methoden gehören als kleine Dateien/Methoden an `repository.MediaRepository`; der generische `MediaUploadRepository` wird zum Kontextadapter zurückgebaut und darf nach Abschluss keine Datei-/Variantenpersistenz mehr besitzen. [ASSUMED]
- `SaveSegmentAsset` bleibt außerhalb des Sechs-Einstiege-Scope, weil Playback-/Segment-Streams laut LOCKED-Entscheid unberührt bleiben. Beim Split darf die Methode nicht versehentlich migriert oder gelöscht werden. [VERIFIED: Architekturentscheid §7; `media_service.go`]
- Jeder bisherige Handler behält Context-Auflösung, Permission und fachliche Slot-Validierung, übergibt dann nur einen geprüften `MediaFileRequest` plus Adapter-Callback; nach Migration darf dort kein `mimetype.Detect`, `image.Decode*`, FFmpeg-Aufruf, Hashing, Thumbnail-Encoding oder direktes `os.WriteFile` verbleiben. [VERIFIED: D-01 und Architekturentscheid Ebene 0]

## Standard Stack

### Core

| Library / Runtime | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| Go standard library | Projekt `go 1.25.0`; Host `go1.26.1` | `io.Reader`, `crypto/sha256`, sichere Pfade, Context/Timeout, Bild-Decoding | Bereits Projektbasis; SHA-256 nicht handrollen. [VERIFIED: `backend/go.mod`; `go version`; CITED: https://pkg.go.dev/crypto/sha256] |
| `github.com/gabriel-vasile/mimetype` | Projekt `v1.4.3` | Magic-Byte-Erkennung aus Datei/Reader | Bestehende zentrale Abhängigkeit; `DetectReader`/`Detect` statt Headervertrauen. [VERIFIED: `backend/go.mod`; Context7 `/gabriel-vasile/mimetype`] |
| `github.com/disintegration/imaging` | `v1.6.2` | Statische JPEG/PNG-Resizes und Encoder | Bereits genutzt; aktuelle Registry-Version entspricht Pin. [VERIFIED: `backend/go.mod`; Go proxy 2026-07-22; Context7 `/websites/pkg_go_dev_github_com_disintegration_imaging`] |
| `golang.org/x/image/webp` | Projekt `v0.37.0` | WebP-Decode/Dimensionen | Bereits gepinnt; Decoder, kein universeller WebP-Encoder. [VERIFIED: `backend/go.mod`; Go package API] |
| FFmpeg + ffprobe | Container `8.1.2` | Video/Audio-Metadaten, Preview-Frame; GIF/WebP-Animation/Alpha-sichere Re-Encodes, falls nötig | Bereits Runtime-Seam des generischen Uploads und in Dev-Container vorhanden; mit lokalen Staging-Pfaden, Timeout und Protokoll-Whitelist kapseln. [VERIFIED: Container-Probe; `backend/internal/config/config.go`; CITED: https://ffmpeg.org/ffmpeg.html] |
| PostgreSQL | Compose `16` | Transaktion, UNIQUE-Dedup, `ON CONFLICT`, Advisory Lock pro Hash/Usage | Vorhandene DB; atomare Upsert-Semantik und partielle Unique-Indizes sind offiziell unterstützt. [VERIFIED: `docker-compose.yml`; CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| `github.com/jackc/pgx/v5` | Projekt `v5.7.1` | Transaktionen und Repositoryzugriff | Projektstandard; vorhandene Begin/rollback/commit-Seams wiederverwenden. [VERIFIED: `backend/go.mod`; Context7 `/websites/pkg_go_dev_github_com_jackc_pgx_v5`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `net/http.MaxBytesReader` | Go stdlib | Harte Request-Grenze vor Multipart/Decoder | Pro Route zusätzlich zum per-file-Profil; verhindert unbegrenztes Body-Lesen. [CITED: https://pkg.go.dev/net/http#MaxBytesReader] |
| `image.DecodeConfig` / `image/gif` | Go stdlib | Dimensionen früh prüfen; GIF-Eigenschaften | Erst nach Magic-/Größengrenze; `gif.DecodeAll` nicht als erster Frame-Guard, da es alle Frames einliest. [CITED: https://pkg.go.dev/image/gif#DecodeAll] |
| `frontend/src/lib/api.ts::authorizedUploadXhr` | Projektintern | Progress, zentraler Auth-Refresh, kontrollierter Replay | Alle sechs Browser-Helfer; nach Backend-Idempotenz `retryEligibility: "idempotent"`. [VERIFIED: `frontend/src/lib/api.ts:2249-2380`] |

### Version verification

| Module | Projekt-Pin | Registry latest / publish date | Phase-107 policy |
|--------|-------------|--------------------------------|------------------|
| imaging | v1.6.2 | v1.6.2 — 2019-11-16 | Beibehalten. [VERIFIED: proxy.golang.org] |
| mimetype | v1.4.3 | v1.4.13 — 2026-02-01 | Nicht beiläufig upgraden; separater Dependency-Task nur bei belegtem Fixbedarf. [VERIFIED: proxy.golang.org] |
| pgx/v5 | v5.7.1 | v5.10.0 — 2026-06-03 | Beibehalten; SQL-Verhalten mit Projekt-Pin testen. [VERIFIED: proxy.golang.org] |
| x/image | v0.37.0 | v0.44.0 — 2026-07-08 | Beibehalten; Codec-Upgrade nicht mit Pipeline-Migration koppeln. [VERIFIED: proxy.golang.org] |

**Installation:** Keine neue Go- oder npm-Abhängigkeit ist für die empfohlene Umsetzung nötig. FFmpeg/ffprobe sind in beiden Backend-Dockerfiles beziehungsweise im laufenden Backend-Container zu verifizieren; Host-Tests verwenden einen injizierbaren Fake-Executor. [VERIFIED: `backend/go.mod`, `frontend/package.json`, Container-Probe]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bestehende Go-Encoder + FFmpeg-Seam | govips/libvips | govips kann GIF/WebP/StripMetadata, erfordert aber CGO/libvips; der laufende Dev-Container hat kein `vips`. Das würde Build-/Windows-Test-Komplexität und eine neue Runtime-Abhängigkeit in die Phase ziehen. Nicht wählen. [VERIFIED: Container-Probe; Context7 `/davidbyttow/govips`] |
| Postgres-UNIQUE + `ON CONFLICT` | Service-in-memory Hash-Lock | Prozesslokale Locks schützen weder mehrere Instanzen noch Restart/Parallelität. Nicht wählen. [CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| Bestehende zentrale XHR-Seam | neuer Fetch/Upload-Client | Würde Auth-/Progress-/Retry-Logik duplizieren und die Refresh-only-Session gefährden. Nicht wählen. [VERIFIED: `AGENTS.md`; `frontend/src/lib/api.ts`] |

## Architecture Patterns

### System Architecture Diagram

```text
Browser file(s)
  │  authorizedUploadXhr + refresh-only session support
  ▼
Context handler/service (RVM | Fansub | Theme | Generic | Profile | Story)
  │  authenticate → authorize → resolve real parent + slot
  ▼
ONE MediaFileService.ProcessOne(request, compatibilityWriter)
  │
  ├─ stream to media/.staging/<attempt>/ with hard byte ceiling
  ├─ magic MIME ↔ declared MIME ↔ profile decision
  ├─ inspect dimensions/frames/streams with time/resource limits
  ├─ sanitize safe visual original; deterministically hash stored bytes
  ├─ create only useful thumbnail/preview artifacts
  │
  ▼
PostgreSQL transaction
  ├─ advisory lock(hash) + media INSERT ... ON CONFLICT
  ├─ media_variant upsert (unique media_id + variant)
  ├─ compatibility alias/relation for context + slot
  └─ usage idempotency check / lock
  │
  ├─ reused medium + reused usage ───────────────► ready, reused=true
  │
  ▼
Promote staged files to media/sha256/aa/bb/<hash>/... (same filesystem)
  │  mark rows ready → commit
  ├─ any failure: rollback + delete only files created by this attempt
  └─ success: uniform per-file result + audit event
                         │
                         ▼
                  /media ready files only
```

[VERIFIED: D-02/D-05/D-07/D-10–D-13; current static route in `backend/cmd/server/main.go:60-69`; PostgreSQL `ON CONFLICT` docs]

### Recommended Project Structure

```text
backend/internal/services/
├── media_service.go                 # existing constructor/type + unaffected segment seam
├── media_file_service.go            # ProcessOne orchestration + request/result/errors
├── media_file_profiles.go           # image/video/audio limits + MIME tables
├── media_file_image.go              # inspect/sanitize/image variants
├── media_file_av.go                 # ffprobe/ffmpeg wrapper, video/audio variants
├── media_file_storage.go            # staging, hash keys, promote, cleanup
└── media_file_compatibility.go       # narrow callback/interface; TODO Phase 108

backend/internal/repository/
├── media_repository.go              # existing repository type/constructor
├── media_core_repository.go         # media/media_variant tx methods + hash upsert
└── media_compatibility_repository.go # temporary legacy alias mapping; TODO Phase 108

backend/internal/handlers/
├── admin_content_release_version_media.go
├── fansub_media_upload.go
├── admin_content_release_theme_assets.go
├── media_upload.go
├── app_profile.go
└── app_profile_story_image.go        # context only after migration
```

This split extends the existing service/repository instances and keeps each new Go file under the project’s 450-line limit. The exact names may change, but there must be one constructor and one orchestration path. [VERIFIED: `AGENTS.md`; current `media_service.go` is 516 lines, so it already requires a split]

### Pattern 1: Stream → inspect → sanitize → hash stored bytes

**What:** Never accept `[]byte` as the core API. Copy the multipart part through an `io.LimitedReader`/request body ceiling into a private attempt file, inspect from that seekable file, produce a sanitized original in the same attempt directory, then hash **that output**. [VERIFIED: current Theme/Generic paths use `io.ReadAll`; D-05/D-11]

**When to use:** Every one of the six upload paths, including single-file avatar/theme flows.

```go
// Sources: https://pkg.go.dev/net/http#MaxBytesReader
//          https://pkg.go.dev/crypto/sha256
func hashStoredOriginal(r io.Reader) (string, error) {
    h := sha256.New()
    if _, err := io.Copy(h, r); err != nil {
        return "", err
    }
    return hex.EncodeToString(h.Sum(nil)), nil
}
```

The production implementation also records byte count and rewinds/opens the staging file; this snippet only shows the verified standard-library hash pattern. [CITED: https://pkg.go.dev/crypto/sha256]

### Pattern 2: Database-enforced global dedup

```sql
-- Source: https://www.postgresql.org/docs/16/indexes-partial.html
CREATE UNIQUE INDEX uq_media_content_hash
    ON media (content_hash)
    WHERE content_hash IS NOT NULL;

CREATE UNIQUE INDEX uq_media_variant_kind
    ON media_variant (media_id, variant);

-- Source: https://www.postgresql.org/docs/16/sql-insert.html
INSERT INTO media (..., content_hash, owner_user_id, processing_status)
VALUES (..., $1, $2, 'processing')
ON CONFLICT (content_hash) WHERE content_hash IS NOT NULL
DO NOTHING
RETURNING id;
```

If no row is returned, select the winner by hash and do **not** update owner, original filename, source, credit or rights. Acquire a transaction advisory lock derived from the full hash before final-file promotion so two contenders cannot overwrite/delete the same target. [VERIFIED: D-06/D-08; CITED: PostgreSQL INSERT docs]

### Pattern 3: Narrow compatibility writer inside the same transaction

```go
type CompatibilityWriter interface { // TODO(phase-108): remove
    Attach(ctx context.Context, tx pgx.Tx, in CompatibilityInput) (CompatibilityIDs, bool, error)
}

type CompatibilityInput struct {
    CoreMediaID int64
    ContextType string
    ContextID   int64
    Slot        string
    AddedByUserID int64
}
```

The interface receives an already authorized, concrete context and an existing transaction; it never validates bytes, generates paths, creates variants, or decides permissions. `bool` is the “identical usage already existed” signal. [ASSUMED]

### Pattern 4: Useful variants without copies

Recommended image policy: thumbnail max 400 px; preview max 1600 px; never upscale. JPEG variants remain JPEG; PNG/WebP variants retain alpha in PNG/WebP; GIF thumbnail is a single PNG frame while preview remains animated GIF. If the sanitized original already satisfies a target bound, the corresponding `media_variant` row may reference the original `storage_key` instead of writing a byte-identical copy. [ASSUMED]

Recommended AV policy: video accepts MP4/WebM up to 300 MB and yields `original` plus a real preview image; audio accepts MP3/AAC/M4A/FLAC/Ogg up to 150 MB and yields only `original`. No placeholder rows; ffprobe/ffmpeg failure rejects the file rather than producing a black fake preview. [ASSUMED]

### Pattern 5: Technical audit sink, separate from permission audit

The one service should emit structured technical outcomes `media_file.created`, `media_file.reused`, `media_file.rejected`, and `media_file.compensated` through a small injected audit sink. Include actor, context type/ID/slot, attempt ID, resulting media ID when present, error code, byte size/MIME and cleanup outcome; never log file bytes, bearer tokens or sensitive extracted metadata. Existing handler-level permission/domain audit remains context-owned and must not duplicate file processing. [ASSUMED]

Audit failure handling must be explicit: a pre-commit audit row can participate in the DB transaction if the repository supports the same `pgx.Tx`; a post-commit audit sink failure is logged as an operational error and must not trigger deletion of an already committed shared medium. Add a test for both boundaries. [ASSUMED]

### Anti-Patterns to Avoid

- **Service wrapper over unchanged handler logic:** Calling a service after a handler has already MIME-checked/decoded/created a thumbnail leaves duplicate pipelines. Move the mechanism, then remove it from the handler. [VERIFIED: D-01]
- **`SELECT` then `INSERT` without UNIQUE:** Races create two media rows; only DB uniqueness plus `ON CONFLICT` proves D-05. [CITED: https://www.postgresql.org/docs/16/sql-insert.html]
- **`os.Rename` onto a shared target without serialization:** Go documents that rename may replace the target and is not guaranteed atomic on non-Unix platforms. Serialize by hash, require same filesystem, and never delete a target not created by the attempt. [CITED: https://pkg.go.dev/os#Rename]
- **Staging under publicly served `/media` without a deny rule:** `StaticFS` currently exposes the entire media root. A `.staging` subtree is acceptable only after the static filesystem/middleware rejects it; otherwise staging is public. [VERIFIED: `backend/cmd/server/main.go:60-69`]
- **Hashing input before sanitizing:** Violates D-05 and prevents identical stored bytes from sharing a row. [VERIFIED: D-05]
- **Globalizing context metadata into `media`:** Caption, visibility, review, category and sort are forbidden on the global medium. [VERIFIED: LOCKED architecture §1]
- **Replaying uploads while retry mode is `never`:** D-13 requires backend idempotency first, then central helpers switch to `idempotent`; no ad-hoc retry loops in components. [VERIFIED: `frontend/src/lib/api.ts`; D-13]

## Compatibility Adapter Contract

The temporary adapter must be a named, grep-able boundary, not scattered dual writes. The recommended schema bridge is an additive nullable `media_assets.core_media_id BIGINT REFERENCES media(id) ON DELETE RESTRICT` plus an index. A Legacy-Alias is per use/slot because `media_assets` still carries context-dependent visibility/review/ownership fields; sharing one legacy asset globally could leak one context’s state into another. Legacy readers are adjusted to resolve technical files through `core_media_id -> media_variant`, so no second physical file or second processing pass is created. [ASSUMED]

| Context | Usage identity for `reused=true` | Temporary legacy action | Forbidden action |
|---------|----------------------------------|-------------------------|------------------|
| Release version | `release_version_id + source_group_id + category/slot + core_media_id` | Create/reuse one Legacy-Alias and `release_version_media` for the real version; preserve legacy response IDs. [ASSUMED] | `episode_media`, direct Episode attachment, or `release_media`. [VERIFIED: `AGENTS.md`] |
| Fansub gallery | `fansub_group_id + gallery category/slot + core_media_id` | Alias + `fansub_group_media`; per-use review fields remain relation/legacy side. [ASSUMED] | Generic Anime/Group cross-owner relation. [VERIFIED: domain docs] |
| Fansub logo/banner | `fansub_group_id + logo|banner + core_media_id` | Alias + current `fansub_groups.logo_id/banner_id` until Phase 108. [ASSUMED] | New parallel branding table. [VERIFIED: Phase-108 boundary] |
| Theme | `release_id + theme_id + playback slot + core_media_id` | Alias + `release_theme_assets`; current list/delete can still address legacy IDs. [ASSUMED] | `release_media` substitution. [VERIFIED: `AGENTS.md`] |
| Generic Anime | `anime_id + asset slot + core_media_id` | Alias + current Anime slot/junction only. [ASSUMED] | Episode attachment or restoration of Phase-106 dual schema. [VERIFIED: Phase-106 decisions] |
| Avatar/background | `member_id + avatar|background + core_media_id` | Alias + current member FK; replacement cleans only the old alias/usage, not shared core bytes. [ASSUMED] | Deleting globally shared media when a member replaces a slot. [VERIFIED: D-07/D-09] |
| Story | `member_id + story document/use token + core_media_id` | Alias preserves `media_asset_id` IDOR and resolver until Phase 108/109. [ASSUMED] | Storing base64/external URL or attaching directly to unrelated member. [VERIFIED: existing Story contract/tests] |

### Adapter removal gate for Phase 108

Phase 107 must add a source/contract test that fails if legacy write tokens appear outside one allowlisted adapter file: inserts into `media_assets`, `media_files`, `release_version_media`, `fansub_group_media`, `release_theme_assets`, member legacy media FKs, and the bridge column. The test comment must say `TODO phase-108 remove compatibility adapter`. Phase 108 then changes the allowlist to empty and drops the bridge after final relations/FKs exist. [VERIFIED: D-04; ASSUMED exact gate tokens]

## Transaction, Promotion, and Recovery Contract

The database and filesystem do not share a native transaction, so “all or nothing” is a controlled saga with one open pgx transaction and attempt-owned files. The planner should make the following state machine explicit. [VERIFIED: `107-CONTEXT.md` Existing Code Insights; Context7 pgx transaction docs]

| State | DB | Filesystem | Allowed exit |
|-------|----|------------|--------------|
| `staged` | none | private `media/.staging/<attempt>/incoming` | validation failure deletes attempt dir; audit/log only. [VERIFIED: D-10/D-11] |
| `prepared` | transaction open; media/variants `processing`; compat usage prepared | sanitized original + useful variants still staged | any DB/encoder failure rolls back and removes attempt. [VERIFIED: D-02] |
| `dedup-reused` | existing ready media selected; identical usage found/created | attempt artifacts discarded | commit usage if new; return `reused=true` only when identical usage already existed or response replay is detected. [VERIFIED: D-07/D-13] |
| `promoted` | transaction still open | staged artifacts moved to absent hash targets while holding hash lock | set statuses ready, then commit. [ASSUMED] |
| `ready` | core variants and compat relation committed | hash files present | uniform success result + success/reuse audit. [VERIFIED: D-02/D-12] |
| `compensating` | rollback or compensating delete | remove only target paths recorded as created by this attempt; never shared reused paths | uniform failure; diagnostic audit/log, no failed media row. [VERIFIED: D-10] |

Crash recovery needs two narrow mechanisms: (1) a TTL sweeper for exact child directories beneath `.staging`, and (2) reconciliation of hash files created after promotion but before transaction commit. The second may compare paths against ready `media_variant` rows and delete only paths older than a conservative TTL under the verified `sha256/` root. It must not scan/delete unrelated project paths and must never touch milestone badge assets. [ASSUMED]

### Filesystem publication rules

- Use keys like `sha256/ab/cd/<64-lowercase-hex>/original.<canonical-ext>`, `thumbnail.<ext>`, `preview.<ext>`; never place user filenames in paths. Preserve only a sanitized display filename (`filepath.Base`, no control chars, bounded length) in `media.original_filename`. [ASSUMED]
- Store attempt staging inside the same mounted Media filesystem to keep rename same-device, but make the static FS wrapper reject `.staging` and dot-path traversal before `StaticFS`. `media/.staging` currently would otherwise be served. [VERIFIED: `docker-compose.yml` bind `./media:/app/media`; `main.go:69`]
- Under the transaction’s hash advisory lock, promote only if target is absent. If present, verify expected size/hash and reuse it. Track `createdByAttempt` per path; cleanup iterates that set, not inferred directory globs. [ASSUMED]
- Add injected storage operations and failpoints for stage-create, encode, DB insert, relation attach, promote, ready-update and commit. This is required to prove D-02/D-10 instead of testing only happy-path SQL. [ASSUMED]

## Uniform Validation Profiles and Result Contract

### Prescriptive profiles

| Kind | MIME / extensions | Max bytes | Structural guards | Variants |
|------|-------------------|-----------|-------------------|----------|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif`; reject SVG/AVIF until full safe codec support exists | 15 MiB | each dimension ≤8000, `int64(width)*height ≤40,000,000`, GIF ≤300 frames, decoder/encoder timeout/concurrency bounds | `original`, max-400 thumbnail, max-1600 preview; no upscale or duplicate bytes. [VERIFIED: D-14–D-17; ASSUMED dimensions/encoder details] |
| Video | `video/mp4`, `video/webm` | 300 MiB | ffprobe must find an allowed video stream and sane width/height/duration; timeout, local-file-only protocols | safe stream-copied/metadata-stripped original + real preview image. [ASSUMED] |
| Audio | MP3, AAC/M4A, FLAC, Ogg MIME set documented in contract | 150 MiB | ffprobe must find an allowed audio stream and sane duration; timeout, local-file-only protocols | original only. [ASSUMED] |

The 300-MiB video recommendation preserves the stricter current generic limit rather than the Theme path’s 500 MiB; restricting Theme from MKV/AVI/MOV to MP4/WebM avoids silently expanding less-tested formats. Audio’s 150-MiB recommendation follows the existing segment-source ceiling, but no new audio surface is introduced in Phase 107. [VERIFIED: current `media_upload_video.go`, `media_service.go::SaveReleaseThemeVideoUpload`, `SaveSegmentAsset`; ASSUMED chosen centralized profile]

### MIME consistency

Magic bytes are authoritative for identification, but D-18 also requires a consistency rule: normalize aliases; reject an explicit multipart content type that contradicts magic; treat empty or `application/octet-stream` as unspecified rather than contradictory; then require the detected type in the selected kind profile. Use one error mapper for all handlers. [ASSUMED]

Minimum shared codes: `EMPTY_FILE`, `FILE_TOO_LARGE`, `MIME_MISMATCH`, `UNSUPPORTED_MEDIA_TYPE`, `DIMENSION_LIMIT_EXCEEDED`, `PIXEL_LIMIT_EXCEEDED`, `ANIMATION_FRAME_LIMIT_EXCEEDED`, `INVALID_MEDIA_STRUCTURE`, `PROCESSING_TIMEOUT`, `VARIANT_PROCESSING_FAILED`, `STORAGE_FAILED`, `PERSISTENCE_FAILED`, `USAGE_ATTACH_FAILED`. Auth/permission/not-found codes remain context-handler concerns. [ASSUMED]

### Canonical per-file response

D-18 requires one per-file shape even though Phase 109 owns the full frontend media-model migration. Phase 107 should add one shared type and minimally adapt existing call sites; it must not redesign the UI. Keep optional compatibility IDs until Phase 108/109. [VERIFIED: D-12/D-18; Phase-109 boundary]

```json
{
  "results": [
    {
      "client_file_name": "shot.png",
      "status": "ready",
      "reused": false,
      "media_id": 123,
      "media_asset_id": 456,
      "relation_id": 789,
      "variants": {
        "original": "/media/sha256/.../original.png",
        "thumbnail": "/media/sha256/.../thumbnail.png",
        "preview": "/media/sha256/.../preview.png"
      },
      "error": null
    }
  ]
}
```

For failure, omit all IDs/variants and return `error: {"code":"MIME_MISMATCH","message":"…"}`. Single-file routes still return a one-element `results` array so the shape is literally uniform. Update both OpenAPI files where applicable, backend DTOs, `frontend/src/types/*`, `api.ts` wrappers and minimal consuming call sites in the same migration wave. [ASSUMED]

## Image and AV Processing Details

### Safe original

- JPEG/PNG: decode only after early byte/dimension checks, then re-encode in the same format without EXIF/chunks not needed for visual output; do not resize. PNG alpha remains. [ASSUMED]
- WebP/GIF: the project has decode support but no existing general WebP encoder. Use the existing FFmpeg executor behind a strict local-file wrapper for same-format sanitization and animated preview; preserve alpha/animation and strip metadata. Pin deterministic arguments and test byte-identical output for repeated fixture processing. [VERIFIED: `backend/go.mod` decoder dependencies; FFmpeg available in backend container; ASSUMED recommended encoder]
- Video/audio: run ffprobe/ffmpeg only against the service-created local staging path, with `context.WithTimeout`, `-nostdin`, explicit stream maps, metadata mapping disabled, a protocol whitelist limited to local file/pipe needs, bounded output and a small concurrency semaphore. [CITED: https://ffmpeg.org/ffmpeg.html; https://ffmpeg.org/ffmpeg-protocols.html; https://ffmpeg.org/ffprobe.html]

### GIF bomb guard

The existing RVM implementation invokes `gif.DecodeAll` and checks frame count afterward. Go documents `DecodeAll` as returning the sequential frames and timing data, so the full decode happens before the 300-frame decision. Replace this with a bounded preflight/stream inspection or time/resource-bounded ffprobe before a full decode; keep the 15-MiB, 8000-dimension and 40-MP checks as independent guards. [VERIFIED: `admin_content_release_version_media.go`; CITED: https://pkg.go.dev/image/gif#DecodeAll]

### “No useless copies” semantics

`media_variant` rows are the technical contract; they need not imply distinct bytes. If original dimensions already fit preview or thumbnail and the media is not a special animated/static pairing, a variant row may reference the original key. Cleanup must deduplicate storage keys before deletion. For GIF, thumbnail remains distinct/static; preview may point to original only if it already meets preview bounds. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hash algorithm | custom checksum/content ID | Go `crypto/sha256` | Standard, reviewed implementation. [CITED: https://pkg.go.dev/crypto/sha256] |
| MIME detection | extension/header map alone | project `mimetype` magic detection + declared-MIME consistency | Extensions and multipart headers are attacker-controlled. [VERIFIED: Context7 mimetype docs] |
| Global concurrency dedup | process mutex/map | PostgreSQL partial UNIQUE + `ON CONFLICT` | Works across processes/restarts. [CITED: PostgreSQL docs] |
| Video/audio parsing | hand-written container parsers | existing ffprobe/ffmpeg seam | Containers/codecs are complex and already a runtime dependency. [VERIFIED: current generic upload] |
| Browser auth/retry/progress | new fetch/XHR wrapper | `authorizedUploadXhr` | Preserves centralized refresh and progress behavior. [VERIFIED: `AGENTS.md`; `api.ts`] |
| Context permissions | generic `media.upload` in core | existing `CanForReleaseVersion`, `CanForFansubGroup`, own-profile checks | Ownership and permission resolution differ by domain. [VERIFIED: architecture decision §2/§3] |
| New relation model | polymorphic/new Phase-107 tables | narrow compatibility adapter over current relations | Final relations/direct FKs are Phase 108. [VERIFIED: phase boundary] |
| Duplicate encoder pipelines | handler-specific image/video helpers | one `MediaFileService` processor registry/profile | D-01 explicitly forbids parallel mechanics. [VERIFIED: D-01] |

**Key insight:** The difficult edge cases are cross-resource consistency, parser safety, deterministic sanitized bytes, and concurrent reuse. Libraries handle parsing/transactions, while the phase’s custom code should only orchestrate the project’s locked ownership and compatibility boundaries. [VERIFIED: D-02/D-05/D-14–D-18]

## Runtime State Inventory

This phase adds a schema bridge/indexes and migrates live write paths, so runtime state must be checked even though Phase 110 later resets test data. [VERIFIED: phase sequence 106→110]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Current Dev-DB has 128 `media_assets`, 218 `media_files`, 57 `release_version_media`, 4 `fansub_group_media`, 0 `release_theme_assets`; `media`/`media_variant` are absent. [VERIFIED: Docker PostgreSQL queries 2026-07-22] | Phase 107 is additive and does **not** backfill/delete old rows. New uploads dual-link through adapter; Phase 110 reset removes test legacy data. Re-run counts after Phase 106. |
| Live service config | Backend uses `MEDIA_STORAGE_DIR`, `MEDIA_PUBLIC_BASE_URL`, `FFMPEG_PATH`; `/media` serves the configured root. Media is bind-mounted at `./media:/app/media`; frontend also mounts `./media:/media`. [VERIFIED: `config.go`, `docker-compose.yml`, `main.go`] | Add/derive a staging subpath on the same filesystem and an HTTP deny guard. Do not add UI/database-only service config. |
| OS-registered state | No Windows service/task or systemd/pm2 registration is referenced for upload names; backend runs in Docker Compose. [VERIFIED: repo search + `docker compose ps`] | None; rebuild/restart backend container after implementation. |
| Secrets/env vars | No secret key rename is required. Existing media/FFmpeg env names remain. [VERIFIED: config/compose search] | None; if a staging TTL/path setting is introduced, provide a safe default and document it without secrets. |
| Build artifacts | Running backend image contains FFmpeg/ffprobe 8.1.2; host Windows has neither; Dev container has no `vips`. [VERIFIED: command probes] | Use fake executor in host unit tests; run real codec integration in backend container and rebuild images. No govips dependency. |

## Common Pitfalls

### Pitfall 1: “Dedup” without a unique arbiter
**What goes wrong:** Two simultaneous equal uploads both see no row and insert duplicates.
**Why it happens:** Phase 106 deliberately creates only a non-unique hash index. [VERIFIED: `106-01-PLAN.md`]
**How to avoid:** 107 migration adds partial unique hash index; insert with matching `ON CONFLICT ... WHERE` and concurrency test. [CITED: PostgreSQL INSERT docs]
**Warning signs:** Repository method is `FindByHash` followed by plain `INSERT`; no SQLSTATE/ON CONFLICT test.

### Pitfall 2: Losing or overwriting first-uploader metadata
**What goes wrong:** A reuse path updates owner/name/source/credit from the retrying user.
**Why it happens:** “Upsert all columns” is convenient.
**How to avoid:** Conflict branch selects existing row and only creates the context usage with later `added_by_user_id`; never update global metadata. [VERIFIED: D-06/D-08]
**Warning signs:** `DO UPDATE SET owner_user_id = EXCLUDED...`.

### Pitfall 3: Deleting a winner’s shared hash file
**What goes wrong:** A losing transaction compensates by deleting a final path another upload owns.
**Why it happens:** Cleanup infers paths instead of tracking attempt ownership.
**How to avoid:** Hash lock, absent-target promotion, explicit `createdByAttempt`, hash/size verification when target exists. [ASSUMED]
**Warning signs:** `defer os.Remove(finalPath)` registered before successful creation or recursive hash-dir deletion.

### Pitfall 4: Public staging leak
**What goes wrong:** Partially validated/malicious input becomes reachable under `/media/.staging/...`.
**Why it happens:** Current StaticFS exposes the entire storage root. [VERIFIED: `main.go:69`]
**How to avoid:** Same-filesystem hidden subtree plus explicit deny wrapper; security test requests staging URL and expects 404.
**Warning signs:** Staging path is beneath media root but no StaticFS test/middleware change.

### Pitfall 5: Memory/CPU decompression DoS before guards
**What goes wrong:** `io.ReadAll`, `gif.DecodeAll`, or ffprobe/ffmpeg consumes excessive resources before validation.
**Why it happens:** Current handlers read whole files; GIF frame count is checked after full decode. [VERIFIED: current handlers]
**How to avoid:** Body/per-file byte ceilings, stream-to-disk, dimension config first, `int64` pixel math, bounded parser timeout/concurrency, frame preflight. [CITED: Go/FFmpeg docs]
**Warning signs:** Core accepts `[]byte`; frame guard appears after `DecodeAll`; `exec.Command` lacks Context.

### Pitfall 6: Non-deterministic sanitized output defeats dedup
**What goes wrong:** Same visual/input bytes produce different hashes due encoder timestamp/metadata/default changes.
**Why it happens:** Hash is correctly computed after sanitization, but sanitization is not deterministic.
**How to avoid:** Explicit encoder settings, metadata removal, golden test processing same fixture twice and comparing bytes/hash. [ASSUMED]
**Warning signs:** Test asserts only dimensions, not byte/hash equality.

### Pitfall 7: Crop source and global dedup are conflated
**What goes wrong:** Hashing the uncropped source but storing a user-specific crop as global preview makes the same source yield conflicting variants; hashing only crop can lose recrop source.
**Why it happens:** Current Avatar/Background/Fansub branding uses `source_file` plus `cropped_file`, while new `media_variant` allows only original/thumbnail/preview. [VERIFIED: model/repository/Phase-106 schema]
**How to avoid:** Treat the safely sanitized cropped/display file as the Phase-107 core original; preserve source-original only through the explicitly temporary compatibility seam until a durable recrop-source decision is made. Never attach client crop as a variant of a hash computed from different source bytes. [ASSUMED]
**Warning signs:** One `media.content_hash` refers to source bytes while `preview` content changes per user crop.

### Pitfall 8: “Uniform” backend result but stale contracts/callers
**What goes wrong:** Backend passes while OpenAPI, frontend types or wrappers still expect legacy shapes.
**Why it happens:** Six endpoints currently return different DTOs. [VERIFIED: contracts/code inventory]
**How to avoid:** Shared DTO plus synchronized contract/type/wrapper/callsite task; focused serialization tests.
**Warning signs:** `any`, ad-hoc payload probing, undocumented optional fields.

### Pitfall 9: Auth replay remains disabled or becomes unsafe
**What goes wrong:** Refresh-only session shows logged-out/401, or browser blindly replays a non-idempotent body.
**Why it happens:** All affected helpers currently use `retryEligibility: "never"`; Avatar/Background use separate `authorizedFetch` settings. [VERIFIED: `api.ts`]
**How to avoid:** Finish backend hash+usage idempotency first; switch all helpers to the central idempotent upload path and add “no access token + valid refresh token” and “lost response + retry” tests.
**Warning signs:** Component reads tokens, builds Authorization, or retries outside `api.ts`.

### Pitfall 10: Legacy adapter becomes Phase-108 debt without a removal proof
**What goes wrong:** Old writes remain after final relations.
**Why it happens:** Adapter logic is distributed among repositories/handlers.
**How to avoid:** One named interface/file, one bridge column, allowlist test and TODO/gate owned by Phase 108. [VERIFIED: D-04; ASSUMED mechanism]
**Warning signs:** Legacy `INSERT` SQL remains in six handlers or multiple repositories.

## Code Examples

### pgx transaction discipline

```go
// Source: Context7 /websites/pkg_go_dev_github_com_jackc_pgx_v5
tx, err := pool.Begin(ctx)
if err != nil { return err }
defer tx.Rollback(ctx)

// core upsert + variants + compatibility attach + ready transition

if err := tx.Commit(ctx); err != nil { return err }
```

Rollback after commit is safe/no-op in the documented pgx pattern; filesystem cleanup still needs a separate attempt-owned defer. [VERIFIED: Context7 pgx docs]

### MIME detection from a seekable staged file

```go
// Source: Context7 /gabriel-vasile/mimetype
f, err := os.Open(stagedPath)
if err != nil { return err }
defer f.Close()

m, err := mimetype.DetectReader(f)
if err != nil { return err }
detected := m.String()
```

The staged file should be reopened/rewound before subsequent decoding; the library’s reader detection reads only the configured detection window. [VERIFIED: Context7 mimetype docs]

### Safe FFmpeg process boundary

```go
// Sources: https://ffmpeg.org/ffmpeg.html
//          https://ffmpeg.org/ffmpeg-protocols.html
ctx, cancel := context.WithTimeout(parent, processingTimeout)
defer cancel()
cmd := exec.CommandContext(ctx, ffmpegPath,
    "-nostdin", "-protocol_whitelist", "file,pipe",
    "-i", stagedInput,
    "-map_metadata", "-1",
    "-frames:v", "1", stagedPreview,
)
```

Production code must validate that both input/output resolve beneath the current attempt directory and must bound captured stderr. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Random/timestamp/context filenames written directly to final storage | Hash-derived keys from sanitized bytes with private staging and promotion | Locked for Phase 107, 2026-07-21 | Enables global reuse and safe response replay. [VERIFIED: architecture decision/D-05/D-11] |
| Per-handler MIME/limits/thumbnail code | One profile-driven stream processor | Phase 107 target | Security fixes apply to all six surfaces once. [VERIFIED: D-01/D-14] |
| Non-unique `content_hash` foundation | Partial UNIQUE + `ON CONFLICT` | Phase 106 intentionally defers to 107 | Makes concurrent dedup enforceable. [VERIFIED: 106 D-05] |
| Upload XHR marked never-retry | Idempotent central retry after backend persistence contract | Phase 107 target | Refresh/lost-response retries no longer duplicate files/usages. [VERIFIED: D-13; `api.ts`] |
| Handler-specific response payloads | Shared per-file ready/failed/reused result | Phase 107 target | Common error handling; Phase 109 can later adopt final MediaUsage model. [VERIFIED: D-12/D-18] |

**Deprecated/outdated:**

- `MediaService.SaveUpload`, `SaveUploadSourceOriginal`, `SaveReleaseThemeVideoUpload` as separate processing paths: replace their six-surface call sites with one `ProcessOne`; keep `SaveSegmentAsset` unaffected. [VERIFIED: D-01; architecture §7]
- `processOneRVMFile` and `processOneFansubGroupMediaFile` technical validation/thumbnail bodies: extract into core, leaving context/response mapping only. [VERIFIED: current code]
- `retryEligibility: "never"` comments for migrated upload helpers: change only after idempotency tests pass. [VERIFIED: D-13; `api.ts`]
- SVG logo acceptance in current `MediaService`: reject centrally because no SVG sanitizing contract exists and existing profile-avatar tests already reject SVG. [VERIFIED: current service + `app_auth_test.go`; ASSUMED centralized policy]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Temporary bridge uses `media_assets.core_media_id` and legacy readers resolve variants from the core; alias is per use/slot. | Summary / Compatibility Adapter | HIGH — a different bridge could change migration, query, rollback and Phase-108 deletion tasks. User/planner should lock before execution. |
| A2 | Cropped/display bytes become the core original; `source_original` remains compatibility-only until a durable recrop-source model is chosen. | Pitfall 7 / Open Questions | HIGH — wrong choice either loses recrop capability or corrupts global variant semantics. |
| A3 | Video is MP4/WebM ≤300 MiB; audio ≤150 MiB with documented whitelist. | Profiles | MEDIUM — limits/codecs are delegated discretion but must be confirmed against product needs. |
| A4 | Thumbnail max 400, preview max 1600, no upscale; small variants may share original storage key. | Architecture / Profiles | MEDIUM — affects UI bandwidth/quality and cleanup implementation. |
| A5 | Canonical external API becomes `{results:[...]}` for single and batch endpoints during Phase 107 with optional compatibility IDs. | Result Contract | HIGH — touches minimal frontend callers now versus deferring literal shape unification to Phase 109. D-18 favors doing it now. |
| A6 | Existing FFmpeg is used for safe WebP/GIF/video/audio transforms rather than adding libvips. | Standard Stack / Processing | MEDIUM — encoder behavior and deterministic output must be proven in container fixtures. |
| A7 | Crash recovery includes stale final hash-path reconciliation in addition to required staging cleanup. | Recovery Contract | MEDIUM — without it a crash between promotion and commit can leave an orphan file. |
| A8 | Core SQL extends the existing `MediaRepository`; `MediaUploadRepository` becomes a context-only adapter; no second repository/service owns technical persistence. | Existing Seams | MEDIUM — post-106 code may expose a cleaner existing seam that should be preferred. |
| A9 | Hash-level advisory locking, absent-target promotion and `createdByAttempt` tracking serialize final publication and compensation. | Transaction / Filesystem Rules | HIGH — a different correct no-overwrite primitive is possible, but some equivalent race proof is mandatory. |
| A10 | Storage keys use a lowercase SHA-256 directory fan-out and staging lives beneath the same mounted media filesystem behind an explicit HTTP deny wrapper. | Filesystem Rules | MEDIUM — exact path layout is discretionary; same-filesystem/private guarantees are not. |
| A11 | Declared MIME may be empty/octet-stream, explicit contradictions fail, and the listed shared machine-error namespace is adopted. | MIME Consistency | MEDIUM — exact normalization and names must be synchronized with contracts/tests. |
| A12 | Adapter removal is enforced through one allowlisted source-contract test and a grep-able `TODO phase-108` marker. | Compatibility Adapter | LOW — another equally strong structural gate is possible. |
| A13 | Image sanitization uses same-format Go encoding for JPEG/PNG and strict local-file FFmpeg execution for WebP/GIF; deterministic bytes are a required fixture invariant. | Image Processing | HIGH — codec capability or nondeterminism may require a dedicated library/runtime decision. |
| A14 | FFmpeg commands use fixed local paths, timeout, protocol whitelist, bounded stderr and resolved-root validation. | Code Examples / Security | MEDIUM — exact arguments depend on the installed FFmpeg build. |
| A15 | Suggested Wave-0 filenames, regex-focused commands and sampling cadence are the most efficient validation layout. | Validation Architecture | LOW — planner may rename/split tests while preserving every mapped behavior. |
| A16 | SVG and AVIF are rejected centrally until a tested sanitizer/encoder contract exists; no placeholder/black previews are accepted. | Profiles / Deprecated | MEDIUM — product may require AVIF, which would need explicit codec work rather than implicit acceptance. |
| A17 | The core emits four technical audit outcomes through an injected sink, while context permission/domain audit remains in handlers; post-commit audit failure does not delete committed shared media. | Audit Pattern | MEDIUM — exact audit repository transaction support and event names are delegated discretion. |

## Open Questions

1. **What is the durable contract for `source_file`/`source_original` after Phase 108?**
   - What we know: Profile avatar/background and Fansub branding currently preserve an uncropped source for recropping; `media_variant` only allows original/thumbnail/preview. [VERIFIED: current models/repository + Phase-106 schema]
   - What's unclear: Whether recrop source is a separate global medium, a private technical variant added to the schema, or intentionally temporary.
   - Recommendation: Lock A2 for Phase 107 (cropped display as core original, old source only in compatibility seam) and create an explicit Phase-108/109 decision; never hash source bytes while storing crop-specific variants under that hash. [ASSUMED]

2. **Should literal external response unification happen now or only internally?**
   - What we know: D-18 says all upload surfaces use the same result form; Phase 109 owns the complete frontend Media/MediaUsage migration. [VERIFIED: context/roadmap]
   - What's unclear: Whether PO intended D-18 to require an immediate wire-format break.
   - Recommendation: Unify wire format in 107 and perform only mechanical wrapper/callsite changes; keep full media UI/model redesign in 109. This is the only reading that fully satisfies D-18. [ASSUMED]

3. **Which FFmpeg build/features are production-contractual?**
   - What we know: Dev runtime currently has FFmpeg/ffprobe 8.1.2; host does not. [VERIFIED: probes]
   - What's unclear: Whether production image guarantees WebP/GIF encoders and exact deterministic behavior across builds.
   - Recommendation: Add startup capability probing and container integration fixtures for required demuxers/encoders; fail closed for a profile whose codec is unavailable. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Go | Backend build/tests | ✓ host/container | host 1.26.1; project 1.25.0 | Use backend container for project-consistent toolchain. [VERIFIED: probes/go.mod] |
| PostgreSQL | migration/upsert/concurrency tests | ✓ Docker | 16 | Repository fakes only for unit tests; real DB required for uniqueness/concurrency gate. [VERIFIED: compose/ps] |
| Docker Compose | DB + codec integration | ✓ | Docker 29.6.1 | None for full integration; unit tests can fake storage/executor. [VERIFIED: probe] |
| FFmpeg/ffprobe | GIF/WebP/AV processing | ✓ backend container; ✗ host | 8.1.2 container | Inject fake executor for host unit tests; run real fixtures in container. [VERIFIED: probes] |
| libvips | govips alternative | ✗ running dev container | — | Not selected; existing FFmpeg + Go codecs. [VERIFIED: probe] |
| Node/npm | frontend contract/auth tests | ✓ | Node 24.14.0, npm 11.9.0 | — [VERIFIED: probes] |

**Missing dependencies with no fallback:** None for the selected stack when Docker is available. Real PostgreSQL/FFmpeg integration cannot be proven on the host alone. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Host FFmpeg/ffprobe are missing; backend-container tests or injected fake executor cover the two test levels. libvips is missing and deliberately not selected. [VERIFIED: environment audit]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Go `testing` + `testify v1.9.0`; Frontend Vitest `^3.2.4` [VERIFIED: `backend/go.mod`, `frontend/package.json`] |
| Config file | Go module `backend/go.mod`; frontend package/Vitest defaults (`frontend/package.json`) [VERIFIED: codebase] |
| Quick run command | `cd backend && go test ./internal/services ./internal/repository ./internal/handlers -run "MediaFile|UploadReleaseVersionMedia|Fansub.*Media|ReleaseThemeAsset|MediaUpload|Profile.*(Avatar|Background|Story)"` [ASSUMED command pattern] |
| Full suite command | `cd backend && go test ./...` plus `cd frontend && npm test && npm run typecheck && npm run lint` [VERIFIED: project scripts/AGENTS] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P107-ARCH-01 / D-05–D-09 | Same sanitized bytes concurrently yield one media row; first metadata preserved; distinct usage allowed; identical usage reused. | PostgreSQL integration/concurrency | `cd backend && go test ./internal/repository -run 'MediaCore.*(Dedup|Concurrent|Owner|Usage)'` | ❌ Wave 0 |
| P107-ARCH-01 / D-10–D-13 | Each injected failure leaves no rows/files; batch partial success; lost-response retry returns reused. | service integration/failure injection | `cd backend && go test ./internal/services -run 'MediaFile.*(Rollback|Retry|Batch|Staging)'` | ❌ Wave 0 |
| P107-ARCH-01 / D-14–D-18 | MIME/profile/dimensions/40MP/GIF300, sanitize/hash determinism, animation/alpha, useful variants. | fixture unit + container codec integration | `cd backend && go test ./internal/services -run 'MediaFile.*(Image|Video|Audio|MIME|Variant|Deterministic)'` | ❌ Wave 0 |
| P107-ARCH-01 / D-01–D-04 | All six handlers delegate; no duplicate technical tokens outside core; adapter allowlist only. | source contract + handler tests | `cd backend && go test ./internal/handlers ./internal/services -run 'MediaFile|UploadDelegation|CompatibilityGate'` | ❌ Wave 0; existing endpoint tests to extend |
| P107-ARCH-01 / RVM ownership | Release media uses real version, source-group permission, never episode/release_media. | handler/repository regression | `cd backend && go test ./internal/handlers ./internal/repository -run 'ReleaseVersionMedia'` | ✅ extend existing |
| P107-ARCH-01 / contract | Same serialized per-file shape/codes on six routes; OpenAPI/types match. | contract/serialization + frontend type tests | `cd backend && go test ./internal/handlers -run 'UploadResultContract'` and `cd frontend && npm run typecheck` | ❌ Wave 0 |
| P107-ARCH-01 / auth | No access token + valid refresh token uploads via central refresh; idempotent 401/lost-response replay only once. | frontend unit/security | `cd frontend && npx vitest run src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts` | ✅ files/seam exist; add upload cases |
| P107-ARCH-01 / staging exposure | `.staging` URL is 404; ready hash path served. | router security integration | `cd backend && go test ./cmd/server -run 'MediaStatic.*Staging'` | ❌ Wave 0 |
| P107-ARCH-01 / migration | Up adds bridge/unique indexes, concurrency works; Down reverses only 107 additions. | migration content + up/down | `cd backend && go test ./internal/migrations -run 'MediaFilePipeline'` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** relevant package/file-specific command from the map; target under 30 seconds. [ASSUMED]
- **Per migration wave:** Go quick suite + exact migrated handler tests + `go build ./...` + `go vet ./...` + frontend typecheck if contracts changed. [VERIFIED: AGENTS]
- **Per wave merge:** `cd backend && go test ./...`; `cd frontend && npm test && npm run typecheck && npm run lint`; migration up/down against disposable DB; `git diff --check`. [VERIFIED: AGENTS]
- **Phase gate:** Full suite green, six delegation gate green, real Postgres concurrency green, real container codec fixtures green, refresh-only upload green before `$gsd-verify-work`. [ASSUMED]

### Wave 0 Gaps

- [ ] `backend/internal/services/media_file_service_test.go` — profiles, stored-byte hash, metadata sanitization, deterministic output, variant rules.
- [ ] `backend/internal/services/media_file_service_failure_test.go` — injected stage/encode/DB/attach/promote/commit failures and exact cleanup.
- [ ] `backend/internal/repository/media_core_repository_test.go` — UNIQUE/ON CONFLICT/first-owner/concurrent dedup and usage idempotency.
- [ ] `backend/internal/migrations/media_file_pipeline_schema_test.go` — migration content/up/down and Phase-106 readiness assumptions.
- [ ] `backend/internal/handlers/media_upload_result_contract_test.go` — shared response/error serialization across all six adapters.
- [ ] `backend/internal/handlers/media_upload_delegation_test.go` — no duplicate MIME/hash/thumbnail/storage mechanics outside core; compatibility allowlist.
- [ ] `backend/cmd/server/media_static_security_test.go` — Staging not publicly served.
- [ ] Extend `frontend/src/lib/api.auth-refresh.test.ts` and the no-token boundary suite with upload-specific refresh-only/idempotent replay cases. [VERIFIED: existing auth tests]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes at handlers/browser, no in file core | Existing auth middleware and central API session lifecycle; core receives authenticated actor ID only. [VERIFIED: routes/AGENTS] |
| V3 Session Management | yes | `hasAccessToken || hasRefreshToken`, central refresh, idempotent replay after backend persistence. [VERIFIED: `docs/frontend/auth-api-client.md`; AGENTS] |
| V4 Access Control | yes | Existing context-specific `CanForReleaseVersion`, `CanForFansubGroup`, Admin/auth and own-member checks stay before service; no generic media permission. [VERIFIED: architecture §3] |
| V5 Input Validation | yes | Request byte ceiling, Magic↔declared MIME↔profile, dimensions/pixels/frames/streams, canonical paths, structured errors. [VERIFIED: D-14/D-18] |
| V6 Cryptography | yes | Go standard `crypto/sha256`; hash used for identity/dedup, not password/security token. [CITED: https://pkg.go.dev/crypto/sha256] |
| V12 File and Resources | yes | Private staging, allowlist codecs, parser timeouts, safe names, non-public processing, cleanup/reconciliation. [VERIFIED: D-10/D-11/D-14–D-18] |
| V13 API/Web Service | yes | Uniform documented result/error shapes and server-side authorization; no undocumented ad-hoc responses. [VERIFIED: AGENTS API Contract Rules] |

### Known Threat Patterns for Go/Gin/PostgreSQL/File Uploads

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spoofed extension/Content-Type | Spoofing / Tampering | Magic detection, declared-MIME consistency, allowlist profile, re-encode. [VERIFIED: D-18] |
| Image/GIF/codec bomb | Denial of Service | Max body/file bytes, 8000/40MP/300 frames, parser timeouts/concurrency, fail closed. [VERIFIED: D-14] |
| Path traversal / command-option injection | Tampering / Elevation | Service-generated hash paths; no user path/URL passed to FFmpeg; `--`/fixed args, local protocol whitelist, resolved-root checks. [CITED: FFmpeg protocol docs; ASSUMED implementation] |
| Staging disclosure | Information Disclosure | Static deny rule for `.staging`, randomized attempt dirs, ready-only public paths. [VERIFIED: D-11/current StaticFS risk] |
| Cross-context IDOR/wrong owner | Spoofing / Elevation | Context permission before core, concrete parent lookup, real release version/member/fansub IDs, transaction-bound adapter. [VERIFIED: AGENTS/domain docs] |
| Concurrent duplicate / metadata overwrite | Tampering | Partial UNIQUE, `ON CONFLICT`, hash lock, no conflict updates to first-upload fields. [VERIFIED: D-05–D-08; PostgreSQL docs] |
| Retry duplicate after lost response | Tampering / Repudiation | Hash+usage idempotency and `reused=true`; audit distinguishes created/reused/rejected/compensated. [VERIFIED: D-07/D-13] |
| Cleanup deletes shared file | Tampering / Denial of Service | Track attempt-created paths, usage/core reference checks, no recursive broad delete. [ASSUMED] |
| Valid refresh session rejected | Spoofing / Availability | Central refresh seam, active-session gate on either token, upload regression. [VERIFIED: AGENTS/auth docs] |
| Sensitive EXIF/container metadata leaks | Information Disclosure | Same-format sanitized original, metadata disabled/stripped, hash sanitized output. [VERIFIED: D-05/D-15; FFmpeg docs] |

### Required threat-model/UAT assertions

1. Permission is denied before any staging file is created for each context. [VERIFIED: project auth boundary]
2. Access token absent/expired + valid refresh token: protected upload proceeds through `api.ts`, never displays logged-out, and creates one usage. [VERIFIED: AGENTS]
3. Lost 200 response then retry: one `media`, one identical usage, response `reused=true`, first owner unchanged. [VERIFIED: D-06/D-13]
4. Two concurrent identical uploads by different users/contexts: one `media`, first committed owner retained, two legitimate usages; neither compensation deletes shared bytes. [VERIFIED: D-05–D-08]
5. MIME mismatch, SVG, oversized, 8001px, >40MP, 301-frame GIF, malformed WebP/video and parser timeout: uniform errors, no DB/file residue. [VERIFIED: D-10/D-14/D-18]
6. HTTP request for `.staging` or traversal form returns 404; ready hash path remains accessible. [VERIFIED: D-11]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/107-vereinheitlichte-upload-pipeline-mediafileservice/107-CONTEXT.md` — locked phase decisions, discretion and deferred scope.
- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md` — locked three-tier model, technical core, permission boundary and unaffected systems.
- `.planning/phases/106-medienkern-schema-legacy-abbau/106-CONTEXT.md`, `106-01-PLAN.md`, `106-RESEARCH.md` — immediate schema dependency and deliberate non-unique hash foundation.
- `AGENTS.md`; `docs/architecture/db-schema-fansub-domain.md`; `docs/engineering/implementation-contract.md`; `docs/api/api-contracts.md`; `docs/frontend/auth-api-client.md` — project contracts.
- Current code/routes/migrations/contracts listed in “Exact Current Pipeline Inventory” — verified by codebase inspection on 2026-07-22.
- Context7 `/gabriel-vasile/mimetype` — Detect/DetectReader and reader behavior.
- Context7 `/websites/pkg_go_dev_github_com_disintegration_imaging` — decode/resize/save patterns.
- Context7 `/websites/pkg_go_dev_github_com_jackc_pgx_v5` — transaction begin/rollback/commit pattern.
- https://www.postgresql.org/docs/16/sql-insert.html — `ON CONFLICT`, unique arbiter inference and concurrency behavior.
- https://www.postgresql.org/docs/16/indexes-partial.html — partial unique index semantics.
- https://pkg.go.dev/crypto/sha256 — standard SHA-256 implementation.
- https://pkg.go.dev/net/http#MaxBytesReader — HTTP request byte limiting.
- https://pkg.go.dev/os#Rename — rename replacement/platform atomicity caveat.
- https://pkg.go.dev/image/gif#DecodeAll — full GIF frame decode contract.
- https://ffmpeg.org/ffmpeg.html; https://ffmpeg.org/ffprobe.html; https://ffmpeg.org/ffmpeg-protocols.html — stream mapping, metadata control, probing and protocol allowlisting.
- `proxy.golang.org` module `@latest` responses on 2026-07-22 — version/publish verification.

### Secondary (MEDIUM confidence)

- Context7 `/davidbyttow/govips` — capability check for rejected alternative; confirmed against missing Dev-runtime `vips` command.
- Docker/Live-DB probes on 2026-07-22 — environment versions, table presence and current row counts; re-run after Phase 106.

### Tertiary (LOW confidence)

- None. Recommendations not fixed by sources are explicitly tagged `[ASSUMED]` and listed in the Assumptions Log.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — project pins, live container runtimes, Context7 and official docs verified.
- Architecture: HIGH for one-core/context-boundary/Phase-106 dependency; MEDIUM for bridge-column and crop-source design, which are explicit assumptions.
- Pitfalls: HIGH for current duplication, StaticFS, auth/retry and DB uniqueness; MEDIUM for codec determinism/recovery recommendations pending fixture tests.
- Validation: HIGH for existing framework/seams; MEDIUM for exact new filenames/commands until post-106 code is present.

**Research date:** 2026-07-22
**Valid until:** 2026-08-21 for external technology; invalidate immediately when Phase 106 is executed or upload/schema files change, then re-run the readiness inventory before planning tasks.
