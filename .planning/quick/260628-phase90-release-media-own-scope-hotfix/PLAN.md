---
status: complete
phase: 90
kind: add-on-hotfix
created_at: 2026-06-28
---

# Phase 90 Add-on: Release-Version-Medien auf eigene Uploads begrenzen

## Kontext

Auf `/admin/episode-versions/1/edit?tab=notizen` kann ein normales beteiligtes Mitglied im Tab `Media / Assets` fremde Uploads sehen und potenziell bearbeiten oder löschen. Erwartet ist: normale Contributors sehen nur eigene Uploads und dürfen nur eigene Uploads löschen. Vollzugriff bleibt Platform Admin, Fansub Lead und Project Lead vorbehalten.

## Read First

- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/permissions/permissions.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/types/releaseVersionMedia.ts`
- `shared/contracts/openapi.yaml`

## Umsetzung

- `GET /api/v1/admin/release-versions/{versionId}/media` filtert normale Rollen auf `uploaded_by_user_id == current legacy user`.
- Patch/Delete/Reorder prüfen bei normalen Rollen zusätzlich die Upload-Eigentümerschaft.
- `can_delete_own_media` ergänzt die Capabilities-Antwort, damit eigene Uploads löschbar bleiben, ohne `can_delete_media` als Vollrecht zu missbrauchen.
- OpenAPI-Contract und Frontend-Typen wurden nachgezogen.

## Akzeptanz

- Normale Contributors sehen im Media-Tab nur eigene Uploads.
- Normale Contributors können fremde Media-Relationen auch per direkter API-ID nicht löschen, patchen oder reordern.
- Eigene Uploads bleiben löschbar, wenn die Rolle `release_version_media.delete_own` erlaubt.
- Platform Admin, Fansub Lead und Project Lead behalten Vollsicht und Vollmutation.
