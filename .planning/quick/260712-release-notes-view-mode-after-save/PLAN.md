---
status: complete
date: 2026-07-12
---

# Quick Fix: Release Notes View Mode After Save

## Ziel

Gespeicherte Release-Version-Notizen sollen beim erneuten Oeffnen des Notizen-Tabs als Ansicht erscheinen und nicht sofort wieder im Edit-Modus stehen.

## Read First

- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx`

## Plan

1. Pro Rolle einen lokalen Edit-State einfuehren.
2. Gespeicherte Notizen initial als Preview rendern.
3. Leere editierbare Rollen direkt im Editor lassen.
4. Bearbeiten-Button fuer gespeicherte editierbare Notizen ergaenzen.
5. Nach Speichern oder Abbrechen wieder in die Preview wechseln.
6. Regressionstest fuer gespeicherte Notiz: Ansicht -> Bearbeiten -> Speichern -> Ansicht.

## Acceptance Criteria

- Nach Tab-Wechsel oder Reload startet eine gespeicherte Notiz nicht automatisch im Editor.
- Ein Klick auf Bearbeiten oeffnet den Editor.
- Nach Speichern erscheint wieder die Ansicht.
- Fremde Coop-Notizen bleiben sichtbar, aber ohne Editor.
