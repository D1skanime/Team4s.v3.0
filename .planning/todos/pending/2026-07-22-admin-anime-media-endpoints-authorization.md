---
title: "Generische Anime-Medienendpunkte auf Plattform-Admin begrenzen"
created: 2026-07-22
priority: high
status: pending
---

# Generische Anime-Medienendpunkte auf Plattform-Admin begrenzen

## Befund

`POST /api/v1/admin/upload` und `DELETE /api/v1/admin/media/:id` sind in
`backend/cmd/server/admin_routes.go` nur durch die allgemeine Auth-Middleware
geschützt.

`MediaUploadHandler.Upload` verlangt zwar eine Auth-Identity und erlaubt aktuell
nur `entity_type=anime`, prüft aber keinen Plattform-Admin-Status.
`MediaUploadHandler.Delete` verlangt ebenfalls nur eine Auth-Identity und nimmt
anschließend eine beliebige Media-ID entgegen.

Der Frontend-Consumer `uploadAdminAnimeMedia` liegt in der Admin-Anime-Fläche.
Eine UI-/Routenbeschränkung ersetzt jedoch keine serverseitige Autorisierung.

## Ziel

- Anime-Stammdaten-Uploads und das zugehörige generische Löschen serverseitig auf
  Plattform-Admins begrenzen.
- Beim Löschen zusätzlich belegen, dass nur der fachlich zulässige Anime-
  Stammdatenkontext betroffen ist; kein generisches Löschen fremder
  Gruppen-/Release-/Profilmedien.
- 401 und 403 sauber unterscheiden.
- Plattform-Admin, normaler eingeloggter User und anonymer Zugriff durch Handler-/
  Routertests abdecken.
- Bestehenden zentralen Auth-/API-Client und bestehende Audit-Seams verwenden.
- Keine Änderung oder Vereinheitlichung der Medienarchitektur.

## Fundstellen

- `backend/cmd/server/admin_routes.go`
- `backend/internal/handlers/media_upload.go`
- `backend/internal/handlers/media_upload_test.go`
- `frontend/src/lib/api.ts` — `uploadAdminAnimeMedia`
- `docs/frontend/auth-api-client.md`

## Scope

Eigenständiger Security-Fix vor oder spätestens mit Phase 106. Kein Bestandteil
eines Medien-Neubaus.
