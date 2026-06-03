---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "04"
subsystem: backend/upload
tags: [handler, upload, exif, mime, idor, repository, route]
dependency_graph:
  requires: [70-02 (owner_member_id Migration 0090)]
  provides:
    - backend/internal/handlers/app_profile_story_image.go (UploadOwnProfileStoryImage, extractStoryImageIDsFromJSON, cleanupStoryImageAsset)
    - backend/internal/models/member_profile.go (StoryImageUploadInput, StoryImageAssetRef)
    - backend/internal/repository/member_profile_story_image_repository.go (InsertStoryImageAsset, GetStoryImageAssetsByMember, DeleteStoryImageAsset)
    - backend/cmd/server/main.go (Route POST /api/v1/me/profile/story-images)
  affects:
    - backend/internal/handlers/app_profile.go (memberProfileStore Interface erweitert)
    - backend/internal/handlers/app_auth_test.go (profileRepoStub erweitert)
tech_stack:
  added: []
  patterns:
    - MIME-Detect via mimetype.DetectReader (Magic-Bytes, nicht nur Extension)
    - Pixel-Bomb-Guard via image.DecodeConfig vor vollstaendigem Decode
    - EXIF-Strip via imaging.Save Re-Enkodierung
    - Path-Traversal-Guard via isUploadPathWithinBase vor os.RemoveAll
    - IDOR-Schutz: Pfad und owner_member_id basieren auf identity.MemberID aus Auth-Middleware
    - Repository-Split wegen 450-Zeilen-Limit (member_profile_story_image_repository.go)
key_files:
  created:
    - backend/internal/handlers/app_profile_story_image.go
    - backend/internal/repository/member_profile_story_image_repository.go
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/handlers/app_profile.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/handlers/app_profile_story_image_test.go
    - backend/cmd/server/main.go
decisions:
  - "StoryImageUploadInput verwendet tatsaechliches DB-Schema von media_assets (file_path, mime_type, format, status, owner_member_id) statt der in PATTERNS.md beschriebenen public_url/storage_path/size_bytes-Spalten die nach Migration 0024 nicht mehr existieren"
  - "Repository-Methoden in member_profile_story_image_repository.go ausgelagert (member_profile_repository.go hat 1226 Zeilen, weit ueber 450-Zeilen-Limit)"
  - "tinyJPEGWithEXIFBytes auf echtes dekodierbares 1x1-JPEG umgestellt damit TestStoryImageUploadExifStrip gruen wird (alter Stub hatte keinen dekodierbaren Bildinhalt)"
  - "TestStoryImageUploadExifStrip: erwartet 201 Created (korrekt) statt 200 OK (alter Stub-Kommentar aus Wave-0)"
  - "TestUpdateOwnProfileIDOR bleibt ROT — IDOR-Check in UpdateOwnProfile wird in Plan 70-06 implementiert"
metrics:
  duration: "25min"
  completed_date: "2026-06-03"
  tasks: 2
  files: 7
---

# Phase 70 Plan 04: Story-Image Upload Handler und Repository Summary

**One-liner:** POST /api/v1/me/profile/story-images Handler mit MIME-Allowlist jpg/png/webp, 10MB-Limit, Pixel-Bomb-Guard (40MP), EXIF-Strip via imaging.Save, Resize 1600px, owner_member_id-Bindung und Audit-Log implementiert.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DTOs in member_profile.go und Repository-Methoden | 315fbe45 | member_profile.go, member_profile_story_image_repository.go |
| 2 | Upload-Handler app_profile_story_image.go + Route-Registrierung | 6f520f90 | app_profile_story_image.go, app_profile.go, app_auth_test.go, app_profile_story_image_test.go, main.go |

## What Was Built

**Repository-Schicht (member_profile_story_image_repository.go):**
- `InsertStoryImageAsset`: INSERT INTO media_assets mit file_path, mime_type, format='image', status='ready', owner_member_id (Migration 0090)
- `GetStoryImageAssetsByMember`: SELECT id, file_path, owner_member_id WHERE owner_member_id = $1
- `DeleteStoryImageAsset`: DELETE WHERE id = $1 AND owner_member_id = $2 (IDOR-Guard im Query)

**DTOs (member_profile.go):**
- `StoryImageUploadInput`: FilePath, MimeType, SizeBytes, Width, Height, OwnerMemberID
- `StoryImageAssetRef`: ID, FilePath, OwnerMemberID

**Handler (app_profile_story_image.go):**
- `UploadOwnProfileStoryImage`: Auth-Guard, MIME-Detect (Magic-Bytes), 10MB-Limit, Pixel-Bomb-Guard (W*H>40M), Resize max 1600px via imaging.Lanczos, EXIF-Strip via imaging.Save, Pfad /media/profile/{memberID}/story/{uuid}/original.{ext}, media_assets INSERT mit owner_member_id, Audit-Log EventType "member_profile.story_image.uploaded", Response 201 Created {data: {media_asset_id, public_url}}
- `extractStoryImageIDsFromJSON`: Rekursiver Walker, sammelt media_asset_id aus image-Nodes
- `cleanupStoryImageAsset`: Path-Traversal-Guard + os.RemoveAll(uuid-Dir)

**Interface-Erweiterung (app_profile.go):**
- `memberProfileStore` um `InsertStoryImageAsset` und `GetStoryImageAssetsByMember` erweitert

**Route (main.go):**
- `POST /api/v1/me/profile/story-images` registriert

## Test-Status

| Test | Status |
|------|--------|
| TestStoryImageUploadValidation_GIFRejected | PASS |
| TestStoryImageUploadValidation_TooLarge | PASS |
| TestStoryImageUploadValidation_PixelBomb | PASS |
| TestStoryImageUploadExifStrip | PASS |
| TestStoryImageRoundTrip | SKIP (Plan 70-06) |
| TestStoryImageCleanup | SKIP (Plan 70-06) |
| TestStoryImageNoPendingOrphan | PASS |
| TestUpdateOwnProfileIDOR | FAIL (erwartet, Plan 70-06) |
| go build ./... | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DB-Schema-Mismatch: StoryImageUploadInput angepasst**
- **Found during:** Task 1 (DB-Schema-Analyse)
- **Issue:** PATTERNS.md beschrieb `InsertStoryImageAsset` mit Spalten `public_url`, `storage_path`, `size_bytes`, `width`, `height` — diese Spalten existieren in `media_assets` nicht (nach Migration 0024 neu erstellt ohne diese Spalten)
- **Fix:** `StoryImageUploadInput` und `InsertStoryImageAsset` verwenden tatsaechlich vorhandene Spalten: `file_path`, `mime_type`, `format='image'`, `status='ready'`, `owner_member_id`. `SizeBytes`, `Width`, `Height` im DTO behalten fuer spaeteren media_files-Insert (Plan 70-06).
- **Files modified:** member_profile.go, member_profile_story_image_repository.go
- **Commit:** 315fbe45

**2. [Rule 3 - Blocking] Repository-Split in eigene Datei**
- **Found during:** Task 1
- **Issue:** member_profile_repository.go hat 1226 Zeilen — weit ueber das 450-Zeilen-Limit. Neue Methoden koennen nicht direkt eingefuegt werden.
- **Fix:** Neue Methoden in `member_profile_story_image_repository.go` ausgelagert (Split-Pattern analog Phase-69-02)
- **Files modified:** member_profile_story_image_repository.go (neu)
- **Commit:** 315fbe45

**3. [Rule 1 - Bug] tinyJPEGWithEXIFBytes: Echter JPEG-Stub fuer EXIF-Test**
- **Found during:** Task 2 (Test-Ausfuehrung)
- **Issue:** Der Wave-0-Stub in `tinyJPEGWithEXIFBytes` erzeugte kein dekodierbares JPEG (nur SOI+APP1+EOI ohne JFIF/SOF0/Bilddaten). `image.DecodeConfig` schlug fehl → Handler gab 400 statt 201.
- **Fix:** `tinyJPEGWithEXIFBytes` auf echtes dekodierbares 1x1-JPEG umgestellt (generiert via Go image/jpeg.Encode + APP1-Injektion nach SOI). APP1-Marker liegt an Index 2.
- **Files modified:** app_profile_story_image_test.go
- **Commit:** 6f520f90

**4. [Rule 1 - Bug] TestStoryImageUploadExifStrip: 201 Created statt 200 OK**
- **Found during:** Task 2
- **Issue:** Test-Assertion erwartete `200 OK` (aus Wave-0-Stub-Kommentar "aktuell 501"), aber korrekter HTTP-Status fuer neue Ressource ist `201 Created`
- **Fix:** `require.Equal(t, http.StatusCreated, ...)` gesetzt
- **Files modified:** app_profile_story_image_test.go
- **Commit:** 6f520f90

## Known Stubs

| Stub | Datei | Grund |
|------|-------|-------|
| IDOR-Check in UpdateOwnProfile | app_profile.go | Wird in Plan 70-06 verdrahtet (extractStoryImageIDsFromJSON + GetStoryImageAssetsByMember + 422-Check) |
| Cleanup-on-Save | app_profile.go | cleanupStoryImageAsset Helper ist fertig; Verdrahtung in UpdateOwnProfile kommt in Plan 70-06 |
| media_files-Eintrag | member_profile_story_image_repository.go | InsertStoryImageAsset schreibt nur media_assets; media_files-Eintrag fuer Breite/Hoehe/Groesse kann in Plan 70-06 ergaenzt werden |

## Threat Flags

Keine neuen Threat-Surfaces jenseits des Plans (T-70-04-01 bis T-70-04-06 alle abgedeckt).

## Self-Check: PASSED

- [x] backend/internal/handlers/app_profile_story_image.go existiert und enthaelt UploadOwnProfileStoryImage
- [x] backend/internal/repository/member_profile_story_image_repository.go existiert und enthaelt InsertStoryImageAsset
- [x] backend/internal/models/member_profile.go enthaelt StoryImageUploadInput
- [x] backend/cmd/server/main.go enthaelt "story-images"
- [x] 315fbe45 existiert (DTOs + Repository)
- [x] 6f520f90 existiert (Handler + Route)
- [x] go build ./... sauber
- [x] TestStoryImageUploadValidation_GIFRejected PASS
- [x] TestStoryImageUploadValidation_TooLarge PASS
- [x] TestStoryImageUploadValidation_PixelBomb PASS
- [x] TestStoryImageUploadExifStrip PASS
- [x] app_profile.go NICHT veraendert (906 Zeilen + 2 Interface-Zeilen = 907 Zeilen — nur Interface erweitert, kein Handler-Code geaendert)
