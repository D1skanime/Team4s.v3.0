---
quick_task: 260510-t7j
title: Upload Security Hardening — Security Headers, EXIF Strip, Pixel-Bomb Guard
completed: "2026-05-10"
duration: ~10min
tasks_completed: 2
files_modified:
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_content_release_version_media.go
commits:
  - hash: 77bc462c
    message: "feat(260510-t7j): add security-header middleware to /media route"
  - hash: 09afc913
    message: "feat(260510-t7j): add pixel-bomb guard and EXIF strip to RVM upload"
---

# Quick Task 260510-t7j: Upload Security Hardening Summary

**One-liner:** Security-Header-Middleware fuer /media-Route, EXIF-Strip via imaging.Save fuer JPEG/PNG/WebP, und 40-MP-Pixelzahl-Guard gegen Dekompression-Bombs im RVM-Upload-Pfad.

## Tasks Completed

### Task 1: Security-Header-Middleware fuer /media in main.go

`router.Static("/media", cfg.MediaStorageDir)` wurde durch eine Gin-Gruppe mit Middleware-Funktion ersetzt, die vor der StaticFS-Auslieferung vier Security-Header setzt:

- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: default-src 'none'`
- `X-Frame-Options: DENY`
- `Cache-Control: private, no-transform`

`net/http` war bereits importiert, kein neuer Import noetig.

**Commit:** `77bc462c`

### Task 2: EXIF-Strip und Pixel-Bomb-Guard im Upload-Handler

**Pixel-Bomb-Guard:** Nach dem bestehenden `IMAGE_DIMENSIONS_TOO_LARGE`-Check wurde ein zweiter Guard eingefuegt: `meta.Width*meta.Height > 40_000_000` schlaegt mit `IMAGE_TOO_MANY_PIXELS` fehl. Die bereits bekannten Dimensionen aus `inspectRVMImage` werden wiederverwendet, kein zweites Decode noetig.

**EXIF-Strip:** Der `os.WriteFile(originalPath, data, ...)` Block wurde durch eine Verzweigung ersetzt:
- GIF: unveraendert per `os.WriteFile` gespeichert (imaging kann Animation nicht erhalten, Kommentar erklaert dies)
- JPEG/PNG/WebP: via `image.Decode` + `imaging.Save` re-enkodiert ohne EXIF-Metadaten

Keine neuen Imports noetig — `image`, `bytes`, `imaging`, `os` waren bereits vorhanden.

**Commit:** `09afc913`

## Verification

```
go build ./...           -> OK (kein Output)
go test ./internal/handlers/... -count=1 -run ReleaseVersionMedia -> ok (0.243s)
```

## Deviations from Plan

Keine — Plan exakt wie spezifiziert umgesetzt.

## Self-Check: PASSED

- `backend/cmd/server/main.go` existiert und enthaelt `mediaGroup.StaticFS`
- `backend/internal/handlers/admin_content_release_version_media.go` enthaelt `IMAGE_TOO_MANY_PIXELS` und `imaging.Save`
- Commits `77bc462c` und `09afc913` vorhanden
