---
title: "Generische Anime-Medienendpunkte auf Plattform-Admin begrenzen"
created: 2026-07-22
priority: high
status: completed
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

## Ergebnis (2026-09-05)

### Root Cause

`MediaUploadHandler.Upload` und `MediaUploadHandler.Delete` haben die Identity nur
über `middleware.CommentAuthIdentityFromContext` gelesen und bei Erfolg direkt
weitergearbeitet. Die Route-Registrierung in `backend/cmd/server/admin_routes.go`
hängt — wie alle Admin-Routen — nur die allgemeine Auth-Middleware ein; die
Autorisierung liegt im Projekt konsequent im Handler
(`requirePlatformAdminIdentity`). Beide Handler waren die einzigen Admin-Media-
Handler ohne diesen Guard, weil ihnen die `authzRepo`-Abhängigkeit fehlte. Jeder
authentifizierte Benutzer konnte damit Anime-Medien hochladen und über eine
beliebige Media-ID beliebige Medien-Assets löschen (BOLA).

### Fix

- `MediaUploadHandler` erhält `authzRepo` + `adminRoleName` über den neuen Builder
  `WithAdminAuthz(...)` und den Handler-lokalen `requireAdmin(...)`, der den
  bestehenden zentralen Guard `requirePlatformAdminIdentity` aufruft
  (401 ohne Identity, 403 für authentifizierte Nicht-Admins). Keine parallele
  Authorization-Logik.
- Ohne verdrahtete Abhängigkeit bleibt der Guard fail-closed (500 statt Zugriff).
- `Delete` prüft nach dem Guard zusätzlich, dass das Asset zum Anime-Stammdaten-
  kontext gehört; Gruppen-, Release- und Profilmedien werden hier mit 400
  abgelehnt und behalten ihre eigenen Endpunkte samt eigener Autorisierung.
- Produktionsgraph in `backend/cmd/server/main.go` verdrahtet den geteilten
  `authzRepo` samt `cfg.AuthAdminRoleName`.

### Tests

`backend/internal/handlers/media_upload_authz_test.go` (neu, 10 Tests):
anonym → 401, authentifizierter Nicht-Admin (App-User und Legacy-Pfad) → 403 ohne
Seiteneffekt, Plattform-Admin → 200, DELETE mit fremder Media-ID (anime,
fansub_group, member) → 403 mit unversehrtem Asset und unversehrter Datei,
unbekannte Media-ID → 403 vor dem Repository-Lookup (keine Enumeration),
Nicht-Anime-Asset für Admin → 400, Fail-closed ohne Wiring → 500.
`backend/cmd/server/admin_media_authz_wiring_test.go` sichert die Verdrahtung.

### Status

Erledigt. Rest-Gap: `DELETE /api/v1/admin/media/{id}` ist weiterhin nicht in
`shared/contracts/openapi.yaml` beschrieben (der Endpunkt hat aktuell keinen
Frontend-Consumer).
