---
title: "DELETE /admin/media/:id läuft gegen ein nicht mehr existierendes Legacy-Schema"
created: 2026-09-05
priority: medium
status: pending
---

# DELETE /admin/media/:id läuft gegen ein nicht mehr existierendes Legacy-Schema

## Befund

Bei der Live-Verifikation der Plattform-Admin-Autorisierung (Commit 5fd1c873)
fiel auf, dass `DELETE /api/v1/admin/media/:id` gegen die aktuelle Datenbank
grundsätzlich nicht funktioniert — unabhängig von der Autorisierung.

Als Plattform-Admin gegen ein soeben über `POST /api/v1/admin/upload`
angelegtes Asset:

```
DELETE /api/v1/admin/media/411dddcf-... -> 404 {"error":"media nicht gefunden"}
```

Backend-Log:

```
media_upload: get asset failed: get media asset: ERROR: column "entity_type" does not exist (SQLSTATE 42703)
```

`media_assets` hat heute weder `entity_type` noch `entity_id` noch `uuid`
(Spalten: id, media_type_id, file_path, caption, mime_type, format, uploaded_by,
created_at, modified_at, modified_by, status, owner_member_id, visibility_id,
review_status_id). Die Zugehörigkeit läuft über Join-Tabellen (`anime_media`,
`fansub_group_media`, `release_media`, …). `GetMediaAsset` im
MediaUploadRepository selektiert dagegen noch die alten Legacy-Spalten, und der
Handler baut den Storage-Pfad aus `asset.EntityType`/`asset.EntityID`.

Der Endpunkt liefert dadurch für jede ID 404 — auch für existierende Assets.
Der Fehler wird als „media nicht gefunden" maskiert, der eigentliche SQL-Fehler
landet nur im Log.

## Auswirkung

Gering im Betrieb: der Endpunkt hat aktuell keinen Frontend-Consumer
(`frontend/src/lib/api.ts` ruft ihn nirgends auf), Löschungen laufen über die
spezifischen Endpunkte. Der Upload-Pfad ist nicht betroffen und funktioniert
(200, Asset + Dateien + `anime_media`-Verknüpfung werden korrekt geschrieben).

Relevant ist der Befund trotzdem: der Endpunkt ist registriert, autorisiert und
dokumentiert, tut aber nichts, und die Nutzung von Legacy-Spalten deutet auf
weitere ungenutzte Legacy-Pfade im MediaUploadRepository hin.

## Mögliche Richtungen

- `GetMediaAsset`/`DeleteMediaAsset` auf das aktuelle Schema heben und den
  Storage-Pfad aus `media_files.file_path` statt aus Entity-Feldern ableiten, oder
- den Endpunkt ersatzlos entfernen, wenn die spezifischen Löschendpunkte ihn
  vollständig ablösen — dann auch `shared/contracts/openapi.yaml` und
  `docs/architecture/media-upload-service-*.md` bereinigen.

Entscheidung gehört in die Medien-Architektur, nicht in einen Einzelfix.

## Fundstellen

- `backend/internal/handlers/media_upload.go` — `Delete`
- `backend/internal/repository/media_upload.go:305` — `GetMediaAsset` (Legacy-Query)
- `shared/contracts/openapi.yaml` — `/api/v1/admin/media/{id}`
- Vorgänger-Todo: `.planning/todos/completed/2026-07-22-admin-anime-media-endpoints-authorization.md`
