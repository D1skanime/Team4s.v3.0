---
phase: 39-deutsche-umlaute-durchgaengig-korrigieren
plan: "02"
subsystem: backend
tags: [umlaute, go, handlers, services, i18n, string-cleanup]
dependency_graph:
  requires: [39-01]
  provides: [UML-BACKEND-01]
  affects: [admin-ui-error-messages]
tech_stack:
  added: []
  patterns: [batch-string-replacement, test-expectation-update]
key_files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_anime.go
    - backend/internal/handlers/admin_content_anime_assets.go
    - backend/internal/handlers/admin_content_anime_asset_search.go
    - backend/internal/handlers/admin_content_anime_enrichment_create.go
    - backend/internal/handlers/admin_content_anime_enrichment_edit.go
    - backend/internal/handlers/admin_content_anime_enrichment_search.go
    - backend/internal/handlers/admin_content_anime_relations.go
    - backend/internal/handlers/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_anime_validation.go
    - backend/internal/handlers/admin_content_episode.go
    - backend/internal/handlers/admin_content_episode_validation.go
    - backend/internal/handlers/admin_content_episode_version_editor.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/admin_content_episode_version_editor_scan.go
    - backend/internal/handlers/admin_content_fansub_releases_handlers.go
    - backend/internal/handlers/admin_content_genres.go
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_segments.go
    - backend/internal/handlers/admin_content_tags.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_episode_import_validation.go
    - backend/internal/handlers/anime.go
    - backend/internal/handlers/anime_backdrops_handler.go
    - backend/internal/handlers/asset_stream_handler.go
    - backend/internal/handlers/auth_handler.go
    - backend/internal/handlers/auth_refresh.go
    - backend/internal/handlers/auth_revoke.go
    - backend/internal/handlers/comment.go
    - backend/internal/handlers/episode.go
    - backend/internal/handlers/episode_playback_access.go
    - backend/internal/handlers/episode_playback_grant.go
    - backend/internal/handlers/episode_playback_guardrails.go
    - backend/internal/handlers/episode_playback_stream.go
    - backend/internal/handlers/episode_version_create.go
    - backend/internal/handlers/episode_version_delete.go
    - backend/internal/handlers/episode_version_grants.go
    - backend/internal/handlers/episode_version_images_handler.go
    - backend/internal/handlers/episode_version_media_image.go
    - backend/internal/handlers/episode_version_media_video.go
    - backend/internal/handlers/episode_version_reads.go
    - backend/internal/handlers/episode_version_stream.go
    - backend/internal/handlers/episode_version_update.go
    - backend/internal/handlers/episode_version_validation.go
    - backend/internal/handlers/fansub_alias_validation.go
    - backend/internal/handlers/fansub_collaborations.go
    - backend/internal/handlers/fansub_group_aliases.go
    - backend/internal/handlers/fansub_group_anime.go
    - backend/internal/handlers/fansub_group_create_validation.go
    - backend/internal/handlers/fansub_group_links.go
    - backend/internal/handlers/fansub_group_members.go
    - backend/internal/handlers/fansub_group_patch_validation.go
    - backend/internal/handlers/fansub_groups.go
    - backend/internal/handlers/fansub_media_delete.go
    - backend/internal/handlers/fansub_media_serve.go
    - backend/internal/handlers/fansub_media_upload.go
    - backend/internal/handlers/fansub_member_validation.go
    - backend/internal/handlers/fansub_merge.go
    - backend/internal/handlers/group_assets_handler.go
    - backend/internal/handlers/group_handler.go
    - backend/internal/handlers/jellyfin_episode_sync.go
    - backend/internal/handlers/jellyfin_episode_sync_helpers.go
    - backend/internal/handlers/jellyfin_error_responses.go
    - backend/internal/handlers/jellyfin_intake_helpers.go
    - backend/internal/handlers/jellyfin_intake_preview.go
    - backend/internal/handlers/jellyfin_metadata_resync.go
    - backend/internal/handlers/jellyfin_preview.go
    - backend/internal/handlers/jellyfin_search.go
    - backend/internal/handlers/jellyfin_sync.go
    - backend/internal/handlers/jellyfin_sync_flow_helpers.go
    - backend/internal/handlers/media_upload.go
    - backend/internal/handlers/media_upload_video.go
    - backend/internal/handlers/release_assets_handler.go
    - backend/internal/handlers/watchlist.go
    - backend/internal/services/asset_lifecycle_service.go
    - backend/internal/services/media_service.go
    - backend/internal/handlers/admin_content_test.go
    - backend/internal/handlers/admin_content_anime_relations_test.go
    - backend/internal/handlers/episode_playback_test.go
    - backend/internal/handlers/fansub_merge_test.go
    - backend/internal/handlers/fansub_test.go
    - backend/internal/handlers/jellyfin_test.go
    - backend/internal/handlers/media_proxy_test.go
    - backend/internal/handlers/media_upload_test.go
decisions:
  - "Test-Erwartungen in 8 Handler-Test-Dateien wurden ebenfalls korrigiert, da sie die alten ASCII-Umlaut-Ersatz-Strings erwarteten"
  - "asset_lifecycle_service.go wurde zusaetzlich zu den geplanten Dateien angepasst, da dort MediaValidationError-Messages mit ASCII-Ersatz standen"
metrics:
  duration: "~30 Minuten"
  completed: "2026-05-11"
  tasks_completed: 2
  files_modified: 85
---

# Phase 39 Plan 02: Deutsche Umlaute im Go-Backend korrigieren — Summary

Korrekte deutsche Umlaute (ä/ö/ü/ß) in allen Go-Backend HTTP-Response-Strings durch Ersetzen der ASCII-Ersatz-Schreibweisen (ae/oe/ue/ss) in ~80 Handler- und Service-Dateien.

## Was wurde gemacht

**Task 1: Handler-Dateien — 80 Go-Handler-Dateien bereinigt**

Alle user-facing Strings in den folgenden Konstruktionen wurden korrigiert:
- `badRequest(c, "...")`
- `gin.H{"message": "..."}` und `gin.H{"error": "..."}`
- `writeInternalErrorResponse(c, "...", ...)`
- `c.JSON(statusCode, gin.H{...})`
- Konstanten wie `authIssueInvalidTokenMessage`, `episodePlaybackRateLimitUnavailableMessage`

Korrekturen umfassen: ungültig/ungültige/ungültiger, verfügbar, für, löschen/gelöscht, zurück, vorübergehend, wählen/auswählen, unterstützt, enthält u.a.

**Task 2: Service-Dateien + Tests**

- `media_service.go`: 5 `MediaValidationError{Message: "..."}` Strings korrigiert (Segment-Asset, Logo, Banner, media-typ)
- `asset_lifecycle_service.go`: 4 `AssetLifecycleError{Message: "..."}` Strings korrigiert (asset_type, anime id, entity_type, pfadangabe) — zusätzlich zur Planliste, da diese Messages ebenfalls in HTTP-Responses landen

8 Test-Dateien wurden aktualisiert, um die korrigierten Umlaut-Strings zu erwarten.

## Build und Tests

```
go build ./...    → OK (keine Fehler)
go test ./internal/handlers/... → ok
go test ./internal/services/... → ok
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Scope] asset_lifecycle_service.go korrigiert**
- **Found during:** Task 2 (Services-Check)
- **Issue:** `asset_lifecycle_service.go` enthält `AssetLifecycleError{Message: "ungueltige..."}` Strings die über `mapUploadError` in `media_upload.go` direkt in HTTP-Response-Bodies landen — nicht in der Planliste enthalten
- **Fix:** 4 Message-Strings korrigiert (ungültiger asset_type, ungültige anime id, ungültiger entity_type, ungültige pfadangabe)
- **Files modified:** `backend/internal/services/asset_lifecycle_service.go`
- **Commit:** be5a8cf8

**2. [Rule 1 - Bug] Test-Erwartungen auf alte ASCII-Strings**
- **Found during:** Task 2 (nach Build-Erfolg, Tests ausgeführt)
- **Issue:** 8 Test-Dateien erwarteten noch alte ASCII-Umlaut-Ersatz-Strings und schlugen fehl
- **Fix:** Batch-Ersetzung in allen 8 betroffenen Test-Dateien; zusätzlich "unterstuetzt" → "unterstützt" in `admin_content_test.go` (nicht vom Batch erfasst)
- **Files modified:** admin_content_test.go, admin_content_anime_relations_test.go, episode_playback_test.go, fansub_merge_test.go, fansub_test.go, jellyfin_test.go, media_proxy_test.go, media_upload_test.go
- **Commit:** be5a8cf8

## Known Stubs

Keine. Alle Änderungen sind reine String-Korrekturen ohne Placeholder-Logik.

## Self-Check: PASSED

- Commit be5a8cf8 existiert: FOUND
- 85 Dateien geändert in einem Commit
- `go build ./...` erfolgreich
- `go test ./internal/handlers/...` und `go test ./internal/services/...` grün
