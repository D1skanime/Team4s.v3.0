---
status: complete
phase: 90
kind: add-on
completed_at: 2026-06-29
---

# Summary

## Geändert

- `ReleaseVersionMediaSection` ersetzt die alte Inline-Uploadfläche durch:
  - Segmented Control für Kategorien,
  - aktive Kategorie statt vier dauerhaft gerenderter Abschnitte,
  - kompaktes Medien-Grid,
  - Upload-Sheet mit Dropzone und statischem Hinweis „In Prüfung“,
  - Edit-Sheet mit Beschreibung, Statusauswahl, Löschen und Speichern,
  - Toast nach Upload und Speichern.
- `release_version_media` List-Readmodel liefert jetzt zusätzlich `visibility` und `review_status` aus `media_assets`.
- Frontend-Typen und OpenAPI/Admin-Content-Contract wurden additiv nachgezogen.
- Frontend-Tests wurden auf das neue Phase-90-Add-on-Verhalten umgestellt.

## Checks

- `npm run typecheck -- --pretty false`
- `npm test -- --run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"`
- `go test ./internal/repository ./internal/handlers -run ReleaseVersionMedia -count=1`

## Hinweise

- Keine neue Upload-Transportlogik eingeführt; `useReleaseVersionMedia.startUpload` bleibt die Upload-Seam.
- Der sichtbare Status „Öffentlich“ mappt auf `visibility=oeffentlich` und `review_status=freigegeben`.
- Der sichtbare Status „Intern“ mappt auf `visibility=intern` und `review_status=freigegeben`.
