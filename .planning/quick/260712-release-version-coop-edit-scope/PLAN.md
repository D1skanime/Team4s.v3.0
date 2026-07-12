---
status: complete
date: 2026-07-12
---

# Quick Fix: Release-Version Coop Edit Scope

## Ziel

Im Admin-Editbereich fuer Release-Versionen duerfen Gruppenleitungen gemeinsame Coop-Beitraege sehen, aber nur Bilder und Texte bearbeiten oder loeschen, die ihrer eigenen Fansubgruppe zugeordnet sind.

## Read First

- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/handlers/admin_content_release_version_notes.go`
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/repository/release_version_notes_repository.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`

## Plan

1. Media-Items pro Relation auf die beitragende Fansubgruppe zurueckfuehren.
2. Update/Delete/Reorder fuer Release-Version-Media serverseitig gruppenscharf blockieren.
3. Release-Version-Notizen pro Member/Rolle auf die beitragende Fansubgruppe zurueckfuehren.
4. Bulk-Upsert und Delete fuer Notizen serverseitig gruppenscharf blockieren.
5. Frontend-Listen unveraendert sichtbar lassen, aber fremde Media/Notiz-Rollen readonly markieren.
6. Shared Contracts und fokussierte Backend-/Frontend-Tests aktualisieren.

## Acceptance Criteria

- Honto-Leitung sieht ZSubs/CSubs-Bilder und -Texte in einer gemeinsamen Release-Version.
- Honto-Leitung kann fremde Gruppenbeitraege dort nicht bearbeiten, loeschen oder umsortieren.
- Eigene Honto-Beitraege bleiben editierbar und loeschbar.
- Plattform-Admins behalten volle Bearbeitungsrechte.
- Backend gibt fuer gruppenfremde Mutationen 403 zurueck.
- UI zeigt fremde Beitraege als Ansicht statt als editierbare Felder.
