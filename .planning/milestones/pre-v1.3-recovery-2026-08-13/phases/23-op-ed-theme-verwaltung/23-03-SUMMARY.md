---
phase: 23-op-ed-theme-verwaltung
plan: "03"
subsystem: fansub-edit, theme-video, media-upload
tags: [backend, frontend, upload, media, themes, fansub, releases]
completed_at: "2026-04-25"
dependency_graph:
  requires:
    - 23-01-PLAN (models: themes, theme_types, theme_segments, fansub_releases)
    - 23-02-PLAN (AdminAnimeTheme types, getAdminAnimeThemes API helper)
  provides:
    - GET /api/v1/admin/fansubs/:id/anime
    - GET /api/v1/admin/fansubs/:id/anime/:animeId/theme-assets
    - POST /api/v1/admin/fansubs/:fansubId/anime/:animeId/theme-assets
    - GET /api/v1/admin/releases/:releaseId/theme-assets
    - DELETE /api/v1/admin/releases/:releaseId/theme-assets/:themeId/:mediaId
    - FansubOpEdSection UI on fansub edit page
  affects:
    - media_service.go (SaveVideoUpload added)
    - admin_content_handler.go (interface + struct fields extended)
    - media_upload.go (theme_video alias registered)
tech_stack:
  added:
    - SaveVideoUpload in MediaService (mp4/webm/mkv/avi/mov, max 500MB)
    - MediaKindThemeVideo constant
  patterns:
    - GetCanonicalFansubAnimeRelease to find existing release anchor
    - media cleanup on error via removeFileQuietly + mediaRepo.DeleteMediaAsset
    - XHR multipart upload with onProgress callback (XHR pattern from uploadFansubMedia)
key_files:
  created:
    - backend/internal/models/admin_release_theme_assets.go
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
  modified:
    - backend/internal/handlers/media_upload.go
    - backend/internal/models/media.go
    - backend/internal/services/media_service.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
key_decisions:
  - Upload requires existing release anchor (GetCanonicalFansubAnimeRelease) rather than auto-create; 409 returned if no Jellyfin sync done yet
  - ReleaseThemeAssetsSection extracted as separate component (CLAUDE.md 450-line limit)
  - Delete route uses 3-segment path (themeId/mediaId) because DB PK is composite
---

# Phase 23 Plan 03: Release Theme Asset Upload — Summary

Fansub-Edit-Seite hat einen OP/ED-Video-Upload-Abschnitt erhalten. Admins koennen ein Anime auswaehlen, ein Theme zuweisen und ein Video hochladen. Der Backend-Flow validiert, speichert und verknuepft automatisch.

## Was wurde gebaut

### Backend (Commit 41955cb)

- `theme_video` in `uploadAssetTypeAliases` eingetragen (media_upload.go)
- `MediaKindThemeVideo = "theme_video"` Konstante in models/media.go
- `SaveVideoUpload(originalName, data)` in media_service.go: MIME-Erkennung, 500MB-Limit, Datei schreiben, `MediaSaveResult` zurueck
- Neue Modelle `AdminReleaseThemeAsset`, `AdminFansubAnimeEntry`, `AdminReleaseThemeAssetCreateInput` in admin_release_theme_assets.go
- Repository-Methoden in admin_content_anime_themes.go:
  - `ListFansubAnime` — DISTINCT Anime aus anime_fansub_groups
  - `ListReleaseThemeAssets` — JOIN mit Release-Existenz-Guard
  - `ListReleaseThemeAssetsByFansubAnime` — releaseID + Assets fuer Fansub+Anime
  - `CreateReleaseThemeAsset` — INSERT mit anime_id-Konsistenz-Check, ErrConflict bei PK/FK-Fehler
  - `DeleteReleaseThemeAsset` — DELETE mit RowsAffected-Guard
- `adminThemeRepository` Interface um 5 Methoden erweitert
- `AdminContentHandler`: `mediaRepo` + `mediaService` Felder, `WithMediaDeps` Methode
- Handler-Datei `admin_content_release_theme_assets.go` (259 Zeilen) mit 4 Methoden: ListFansubAnime, ListFansubAnimeThemeAssets, UploadReleaseThemeAsset, DeleteReleaseThemeAsset
- 4 neue Routen in admin_routes.go
- main.go: `.WithMediaDeps(mediaRepo, mediaService)` beim adminContentHandler

### Frontend (Commit b625ff7)

- Types in admin.ts: `AdminFansubAnimeEntry`, `AdminReleaseThemeAsset`, Response-Wrapper-Typen
- API-Helpers in api.ts: `getAdminFansubAnime`, `getAdminFansubAnimeThemeAssets`, `getAdminReleaseThemeAssets`, `uploadAdminReleaseThemeAsset` (XHR+onProgress), `deleteAdminReleaseThemeAsset`
- `FansubOpEdSection.tsx` (102 Zeilen): Anime-Dropdown, Themes laden, delegiert an ReleaseThemeAssetsSection
- `ReleaseThemeAssetsSection.tsx` (151 Zeilen): Theme-Select + File-Input + Progress-Bar + Upload-Button + Asset-Liste + Loeschen
- `FansubOpEdSection.module.css`: alle Utility-Klassen + .select
- `FansubEdit.module.css`: `.fansubEditOpEdWrapper` (border-top, padding-top)
- `page.tsx`: Import + `<FansubOpEdSection fansubID={...} authToken={...} />` unterhalb des `</form>`-Tags

## Deviations from Plan

### [Rule 4 - architectural] GetOrCreateFansubRelease nicht implementiert

Die Plan-Spezifikation sah `INSERT ... ON CONFLICT DO UPDATE` vor (auto-create fansub_release beim ersten Upload). Die tatsaechliche Implementierung verwendet `GetCanonicalFansubAnimeRelease`, das eine bestehende fansub_release ueber Episode-Daten ermittelt. Wenn keine gefunden wird, antwortet der Endpoint mit 409 `missing_release_anchor`. Diese Aenderung war bereits vor Planumsetzung entschieden und im Code implementiert.

**Auswirkung:** Admin muss Jellyfin-Sync fuer Gruppe+Anime ausgefuehrt haben, bevor Theme-Videos hochgeladen werden koennen.

### [Rule 2 - missing] ReleaseThemeAssetsSection als separate Komponente extrahiert

FansubOpEdSection wurde aufgeteilt, um beide Dateien unter 250 Zeilen zu halten (CLAUDE.md-Grenze: 450 Zeilen, Planvorgabe: unter 250).

### [Rule 1 - bug] Delete-Route mit mediaId Segment ergaenzt

Plan-Spezifikation: `DELETE .../theme-assets/:themeId` (2-Segment).
Implementierung: `DELETE .../theme-assets/:themeId/:mediaId` (3-Segment) — notwendig, da der DB-PK aus `(release_id, theme_id, media_id)` besteht.

## Known Stubs

Keine. Alle Daten fliessen aus echten API-Calls.

## Self-Check: PASSED

- backend/internal/handlers/admin_content_release_theme_assets.go — FOUND
- backend/internal/models/admin_release_theme_assets.go — FOUND
- frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx — FOUND
- frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx — FOUND
- Commit 41955cb — FOUND (git log)
- Commit b625ff7 — FOUND (git log)
- go build ./... — PASSED (0 Fehler)
- npm run build — PASSED (0 Fehler, alle Routen gebaut)
