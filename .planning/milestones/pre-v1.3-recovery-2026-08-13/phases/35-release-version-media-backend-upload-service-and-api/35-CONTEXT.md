# Phase 35: Release-Version Media — Backend Upload Service und API — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Go-Backend-Service für Release-Version-Media-Uploads: Validierung, Image Processing (govips/libvips), GIF-Sonderfall, DB-Transaktion, Rollback. Alle 5 Admin-API-Endpoints. Admin-only Berechtigungsprüfung.

Kein Frontend in dieser Phase.

</domain>

<decisions>
## Implementation Decisions

### Image Processing Library
- **D-01:** `govips` (`github.com/davidbyttow/govips`) als libvips-Wrapper — moderner als bimg, aktiv maintained, gleiche libvips-Basis
- **D-02:** Backend `Dockerfile` erhält `apt-get install libvips-dev` (oder Alpine-Äquivalent `vips-dev`) als Build-Dependency
- **D-03:** GIF-Original bleibt animiert gespeichert; Thumbnail = statisches Frame-1-Bild via govips (`vips.NewImageFromBuffer` + erstes Frame extrahieren)

### Storage-Strategie (kein physisches Staging)
- **D-04:** Datei direkt ins finale Verzeichnis schreiben: `media/release-version/{versionId}/{assetId}/`
- **D-05:** Sofort nach Dateischreibung: `media_assets.status = 'processing'`, `media_files.status = 'processing'`
- **D-06:** Nach erfolgreicher DB-Transaktion: Status auf `'ready'` setzen
- **D-07:** Bei Fehler nach Dateischreibung: Datei physisch löschen (kein DB-Eintrag hinterlassen), Fehler zurückgeben
- **Rationale:** Konsistent mit bestehendem Pattern (`media_upload_image.go`); Cleanup-Job in Phase 37 erkennt verwaiste Dateien trotzdem über Zeitstempel-Check

### Route-Struktur
- **D-08:** `/admin/release-versions/:versionId/media` als Basis-Route
- Upload: `POST /admin/release-versions/:versionId/media`
- List: `GET /admin/release-versions/:versionId/media`
- Patch: `PATCH /admin/release-versions/:versionId/media/:relationId`
- Delete: `DELETE /admin/release-versions/:versionId/media/:relationId`
- Reorder: `POST /admin/release-versions/:versionId/media/reorder`

### Handler-Organisation
- **D-09:** Neue separate Datei `backend/internal/handlers/admin_content_release_version_media.go` — analog zu `admin_content_release_theme_assets.go`
- **D-10:** Handler-Methoden gehören zum bestehenden `AdminContentHandler`-Typ (kein neuer Handler-Typ)
- **D-11:** Routen werden in `backend/cmd/server/admin_routes.go` registriert (gleiche Stelle wie Theme-Asset-Routen)

### Berechtigungsprüfung
- **D-12:** Vorerst Admin-only — bestehende `auth`-Middleware genügt
- **D-13:** `uploaded_by_user_id` wird aus Admin-Session-Context befüllt (Typ: BIGINT, aus `users.id`)

### Kategorie-Änderung
- **D-14:** PATCH darf Kategorie NICHT ändern — HTTP 422 `CATEGORY_CHANGE_NOT_ALLOWED` wenn `category` im Patch-Body enthalten ist

### Preview-Regel
- **D-15:** Maximal ein aktives Vorschaubild pro `release_version_id` — bei neuem `is_preview_candidate=true` werden bestehende Preview-Flags derselben Version transaktionssicher deaktiviert (`UPDATE release_version_media SET is_preview_candidate=false WHERE release_version_id=? AND id!=?`)
- **D-16:** Backend erzwingt Preview-Einschränkung auf Kategorie (nur screenshot/typesetting_karaoke erlaubt)

### Multi-File-Response
- **D-17:** Pro Datei isoliertes Ergebnis — Fehler bei Datei A beeinflusst Datei B nicht
- **D-18:** Response-Format:
  ```json
  { "results": [
    { "client_file_name": "scene.png", "status": "ready", "media_asset_id": 42, "release_version_media_id": 7, "thumbnail_url": "/media/..." },
    { "client_file_name": "bad.svg", "status": "failed", "error_code": "INVALID_FILE_TYPE", "message": "..." }
  ]}
  ```

### Fehlercodes
- **D-19:** Maschinenlesbare Fehlercodes: `INVALID_CATEGORY`, `PREVIEW_NOT_ALLOWED_FOR_CATEGORY`, `CATEGORY_CHANGE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `INVALID_MIME_TYPE`, `INVALID_IMAGE_SIGNATURE`, `IMAGE_DECODE_FAILED`, `IMAGE_DIMENSIONS_TOO_LARGE`, `GIF_TOO_MANY_FRAMES`, `THUMBNAIL_FAILED`, `STORAGE_FAILED`, `DB_FAILED`, `PERMISSION_DENIED`, `RELEASE_VERSION_NOT_FOUND`

### Repository-Erweiterung
- **D-20:** Neue Methoden auf `MediaRepository` (nicht neues Repository): `CreateReleaseVersionMedia`, `ListReleaseVersionMedia`, `PatchReleaseVersionMedia`, `SoftDeleteReleaseVersionMedia`, `ReorderReleaseVersionMedia`
- **D-21:** `MediaUploadRepoTx`-Interface wird für Transaktions-Support genutzt (bereits vorhanden)

### Upload-Limits (MVP)
- max_file_size: 15 MB
- max_files_per_upload: 20
- max_width: 8000 px, max_height: 8000 px
- max_gif_frames: 300

### Claude's Discretion
- Genaue govips-API-Calls für GIF-Frame-Extraktion (researcher klärt)
- Sort-Order-Vergabe bei parallelen Uploads (Advisory Lock oder COALESCE MAX+10)
- Interner Dateiname: UUID-basiert (analog bestehendem Pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestehende Upload-Handler (Pattern-Referenz)
- `backend/internal/handlers/media_upload_image.go` — Bild-Upload-Pattern: MIME-Check, Thumbnail via imaging, Pfad-Aufbau, Rollback
- `backend/internal/handlers/admin_content_release_theme_assets.go` — Admin-Handler-Pattern: CreateMediaAsset + InsertMediaFile + Rollback
- `backend/internal/handlers/media_upload_storage.go` — Storage-Hilfsfunktionen

### Repository und Interface
- `backend/internal/repository/media_repository.go` — MediaRepository-Methoden (CreateMediaAsset, InsertMediaFile, DeleteMediaAsset)
- `backend/internal/repository/media_upload.go` — MediaUploadRepoTx-Interface für Transaktionen

### Routen-Registrierung
- `backend/cmd/server/admin_routes.go` — Admin-Routen-Pattern (auth-Middleware, Handler-Aufruf)

### Schema (Phase 34)
- `database/migrations/0059_release_version_media_schema.up.sql` — release_version_media Tabelle, status-Felder, Constraints

### Fachliche Domäne
- `docs/architecture/db-schema-fansub-domain.md` — Fansub-Domain-Regeln

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MediaUploadRepoTx` — Transaction-Interface bereits vorhanden, nutzen für multi-step DB-Writes
- `imageExtFromMime()` in `media_upload_image.go` — MIME→Extension-Mapping, wiederverwenden oder analog implementieren
- `removeFileQuietly()` in `admin_content_release_theme_assets.go` — Rollback-Hilfsfunktion, Muster übernehmen
- `NewAdminContentHandler` — bestehender Handler-Typ, neue Methoden darauf

### Established Patterns
- UUID-basierte Dateinamen (kein User-Dateiname als Speichername)
- `filepath.Join(storageDir, "release-version", versionId, assetId, filename)` als Pfad-Muster
- `media_files` variant: `"original"` + `"thumb"` — Bestandskonvention beibehalten
- Admin-Auth via `auth`-Middleware (kein eigener Auth-Check im Handler nötig)

### Integration Points
- `backend/cmd/server/admin_routes.go` → neue Routen dort registrieren
- `adminContentRepo` (AdminContentRepository) für Release-Version-Lookup/Permission-Check
- `media_assets.status` + `media_files.status` sind neu (Phase 34) — alle neuen Writes müssen status setzen

</code_context>

<specifics>
## Specific Ideas

- govips: `github.com/davidbyttow/govips/v2` — v2 ist die aktuelle Version
- Dockerfile: `RUN apt-get install -y libvips-dev` (oder `vips-dev` für Alpine)
- GIF-Handling: Original als `.gif` unverändert speichern; Thumbnail als `.webp` oder `.jpg` aus Frame 0
- Sort-Order: `COALESCE((SELECT MAX(sort_order) FROM release_version_media WHERE release_version_id=? AND deleted_at IS NULL), 0) + 10`

</specifics>

<deferred>
## Deferred Ideas

- Fansub-Member-Upload ohne Admin-Rechte — Phase 38+ nach Member-Permission-Ausbau
- Medium-Variante (responsive Bilder) — spätere Phase
- Idempotency-Key für Uploads — spätere Phase
- Quotas pro Nutzer/Gruppe — spätere Phase

</deferred>

---

*Phase: 35-release-version-media-backend-upload-service-and-api*
*Context gathered: 2026-05-07 via User Discussion*
