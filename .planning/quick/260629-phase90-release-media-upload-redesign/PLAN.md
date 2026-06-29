---
status: complete
phase: 90
kind: add-on
created_at: 2026-06-29
---

# Phase 90 Add-on: Release-Media-Upload auf Sheet/Grid umstellen

## Kontext

Der Tab `Media / Assets` auf `/admin/episode-versions/[versionId]/edit?tab=media` nutzte noch die alte Inline-Uploadstruktur: Kategorie-Dropdown aus dem Ownership-Kontext, Status-Select beim Upload, dauerhaft sichtbare Uploadfläche, alle Kategorien untereinander und ein separates Detailpanel.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `docs/api/api-contracts.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/components/ui/Drawer.tsx`
- `backend/internal/repository/release_version_media_repository.go`
- `shared/contracts/openapi.yaml`
- `shared/contracts/admin-content.yaml`

## Plan

1. Bestehenden Upload-Hook und API-Endpunkte wiederverwenden; keine neue Upload-Logik bauen.
2. Release-Version-Media-Readmodel additiv um `visibility` und `review_status` erweitern, damit Statuschips und Edit-Sheet echte Daten verwenden.
3. Media-Tab auf Segmented Control, aktive Kategorie, kompaktes Grid, Upload-Sheet und Edit-Sheet umbauen.
4. Upload-Status im Upload-Sheet nur als statischen Hinweis anzeigen; Statusänderungen nur im Edit-Sheet erlauben.
5. Frontend-Typen, Contracts und fokussierte Tests anpassen.

## Akzeptanz

- Nur ein Kategorie-Control: Segmented Control mit Countern.
- Upload öffnet im responsive Sheet und enthält keinen Status-Select.
- Es wird nur die aktive Kategorie angezeigt.
- Assets erscheinen als kompaktes Grid mit Thumbnail und Statuschip.
- Asset-Tap öffnet ein Edit-Sheet mit Beschreibung, Status, Löschen und Speichern.
- Button-Hierarchie nutzt Accent-Filled für Primäraktionen und Ghost für Nebenaktionen.
- Bestehende Kategorien, Statuswerte, Berechtigungen und Upload-Transport bleiben erhalten.
