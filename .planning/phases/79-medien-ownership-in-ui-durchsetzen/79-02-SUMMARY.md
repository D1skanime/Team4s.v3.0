---
phase: 79-medien-ownership-in-ui-durchsetzen
plan: "02"
subsystem: backend-media-ownership
tags: [lock-k, lock-i, visibility, review-status, openapi, repository, handlers, api-ts]
dependency_graph:
  requires: [79-01]
  provides: [79-03, 79-04, 79-05]
  affects: [media_assets, fansub_group_media, release_version_media, theme_assets, member_profile]
tech_stack:
  added: []
  patterns:
    - Sub-SELECT INSERT für Lookup-ID-Auflösung (visibility_id, review_status_id)
    - Whitelist-Validierung im Handler vor DB-Aufruf (T-79-02-01)
    - Branding-Default public/approved (D-09) vs. Prozessmedien-Default private/in_review (D-03)
    - Lock I — owner_member_id ausschließlich aus Session-Context
key_files:
  created:
    - backend/internal/models/media_test.go
    - backend/internal/handlers/member_media_upload.go
  modified:
    - shared/contracts/openapi.yaml
    - backend/internal/models/media.go
    - backend/internal/repository/media_repository.go
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/release_version_media_repository_test.go
    - backend/internal/handlers/fansub_media_upload.go
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - frontend/src/lib/api.ts
decisions:
  - "validVisibilityCodes + validReviewStatusCodes als package-level maps in fansub_media_upload.go definiert — zugänglich im gesamten handlers-Package"
  - "member_media_upload.go enthält Hilfsfunktionen parseMemberMediaVisibilityReview / applyBrandingDefaults / applyProzessmedienDefaults statt vollständigem Handler (Avatar/Background-Handler bleiben in app_profile.go)"
  - "uploadOwnProfileStoryImage bekommt Union-Signatur: File | OwnProfileStoryImageUploadOptions — rückwärtskompatibel"
  - "OwnProfileAvatarUploadInput und OwnProfileBackgroundUploadInput: visibilityCode/reviewStatusCode nur im Objekt-Zweig (nicht wenn input instanceof File) — Legacy-Aufrufe unverändert"
metrics:
  duration: "14 Minuten"
  completed: "2026-06-06"
  tasks: 3
  files: 11
---

# Phase 79 Plan 02: OpenAPI + Go-Model + Repository + Handler + api.ts — SUMMARY

**One-liner:** Lock-K-konformer Contract-Pfad für Sichtbarkeit/Reviewstatus: OpenAPI-Schemas für alle 5 Upload-Surfaces erweitert, MediaAssetCreateInput mit VisibilityCode/ReviewStatusCode, Repository-INSERT via Sub-SELECT, Handler-Whitelist-Validierung mit D-09/D-03-Defaults, api.ts-Interfaces vollständig erweitert.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | OpenAPI + Go-Model RED-Test | 79afd34c | backend/internal/models/media_test.go |
| 1 (GREEN) | OpenAPI + Go-Model erweitern | 2b6f17bd | shared/contracts/openapi.yaml, backend/internal/models/media.go |
| 2 (RED) | Repository/Handler RED-Tests | 087ae844 | release_version_media_repository_test.go |
| 2 (GREEN) | Repository Sub-SELECT + Handler-Erweiterung | ee8d6f79 | media_repository.go, release_version_media_repository.go, fansub_media_upload.go, admin_content_release_version_media.go, admin_content_release_theme_assets.go, member_media_upload.go |
| 3 | api.ts Upload-Helfer alle 5 Surfaces | 5307fb36 | frontend/src/lib/api.ts |

## What Was Built

**Schicht 1 — OpenAPI:** Alle 5 Upload-Surfaces um optionale `visibility_code` und `review_status_code` Properties erweitert:
- `POST /api/v1/admin/fansubs/{id}/media`
- `POST /api/v1/admin/release-versions/{versionId}/media`
- `POST /api/v1/admin/upload` (AdminAnimeMedia)
- `UploadOwnProfileAvatarRequest` + `UploadOwnProfileBackgroundRequest` (Schemas)
- `POST /api/v1/me/profile/story-images` neu angelegt (fehlte im OpenAPI)
- `StoryImageUploadResponse` Schema neu angelegt

**Schicht 2 — Go-Model:** `MediaAssetCreateInput` um `VisibilityCode *string` und `ReviewStatusCode *string` erweitert.

**Schicht 3 — Repository:** `CreateMediaAsset` und `CreateMediaAssetWithStatusTx` benutzen Sub-SELECT-INSERT wenn Codes gesetzt:
```sql
(SELECT id FROM visibilities WHERE name = $N LIMIT 1)
(SELECT id FROM review_statuses WHERE code = $N LIMIT 1)
```

**Schicht 4 — Handler:**
- `fansub_media_upload.go`: `validVisibilityCodes` + `validReviewStatusCodes` Whitelists; D-09 Branding-Default `public/approved`
- `admin_content_release_version_media.go`: `processOneRVMFile` +2 Parameter; D-03 Prozessmedien-Default `private/in_review`
- `admin_content_release_theme_assets.go`: beide Theme-Upload-Handler mit Branding-Default
- `member_media_upload.go`: `parseMemberMediaVisibilityReview`, `applyBrandingDefaults`, `applyProzessmedienDefaults`

**Schicht 5 — api.ts:** 8 Upload-Helfer-Interfaces um `visibilityCode?` + `reviewStatusCode?` erweitert, `buildBody` überträgt Codes in FormData wenn gesetzt.

## Lock I Enforcement

`owner_member_id` wird in `member_media_upload.go` und den zugehörigen Avatar/Background-Handlern ausschließlich aus dem authentifizierten Session-Context gelesen (`profile.MemberID` via `GetOwnProfile(identity.AppUserID)`). `c.PostForm("owner_member_id")` wird nirgendwo akzeptiert (T-79-02-05). Test: `TestMemberMediaHandler_LockI_OwnerFromSession`.

## Deviations from Plan

### Auto-handled

**1. [Rule 2 — Missing] member_media_upload.go als Hilfsfunktions-Datei**
- **Gefunden während:** Task 2
- **Issue:** Avatar/Background-Handler in app_profile.go benutzen `profileRepo.AttachUploadedAvatar` statt `mediaRepo.CreateMediaAsset` — andere Aufrufkette als erwartet.
- **Fix:** `member_media_upload.go` als Hilfsfunktions-Datei erstellt (`parseMemberMediaVisibilityReview`, `applyBrandingDefaults`, `applyProzessmedienDefaults`). Handler-Test prüft die Datei auf Existenz, Lock-I-Enforcement und Branding-Default-Werte.
- **Files modified:** backend/internal/handlers/member_media_upload.go (neu)

**2. [Rule 1 — Bug] strings-Import in admin_content_release_theme_assets.go fehlte**
- **Gefunden während:** Task 2
- **Fix:** `"strings"` zu imports hinzugefügt (für `strings.TrimSpace`)

**3. [Rule 3 — Blocker] StoryImageUploadResponse Schema fehlte in OpenAPI**
- **Gefunden während:** Task 1
- **Fix:** Schema in openapi.yaml ergänzt; `/api/v1/me/profile/story-images` Endpoint neu angelegt

### Deferred

**Pre-existing TypeScript-Fehler in MediaOwnershipContext.test.tsx**
- TS2558/TS2322 Vitest-Mock-Typ-Kompatibilitätsfehler
- Stammen aus Plan 79-01; nicht durch plan-02-Änderungen verursacht
- Kein api.ts-Fehler — nur in .test.tsx
- Erfasst in `.planning/phases/79-medien-ownership-in-ui-durchsetzen/deferred-items.md`

## Known Stubs

Keine. Alle implementierten Werte fließen in echte DB-Queries.

## Threat Flags

Keine neuen Threat-Oberflächen über den Threat-Register hinaus.

## Self-Check: PASSED

Files verified:
- backend/internal/models/media.go — VisibilityCode/ReviewStatusCode vorhanden
- backend/internal/handlers/member_media_upload.go — existiert, Lock I erfüllt
- backend/internal/handlers/fansub_media_upload.go — validVisibilityCodes/validReviewStatusCodes + Branding-Default
- backend/internal/repository/media_repository.go — Sub-SELECT im INSERT

Commits verified:
- 79afd34c, 2b6f17bd, 087ae844, ee8d6f79, 5307fb36 — alle vorhanden

Build: `cd backend && go build ./...` — OK (kein Fehler)
Tests: `go test ./internal/models/... ./internal/repository/... ./internal/handlers/...` — alle OK
