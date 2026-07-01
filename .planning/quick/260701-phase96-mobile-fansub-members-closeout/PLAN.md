---
status: complete
phase: 96
kind: quick
created_at: 2026-07-01
---

# Phase 96 Quick - Mobile Fansub Members Polish

## Problem

Der Admin-Fansub-Detailbereich `/admin/fansubs/[id]/edit?tab=collaboration`
war auf Mobile zwar funktional, aber nicht sauber nutzbar:

- Die Haupt-Tabs wurden am rechten Rand abgeschnitten.
- App-Mitglieder und historische Mitglieder nutzten auf Mobile tabellarische
  Desktop-Strukturen oder zu breite Aktionsflaechen.
- Der Mitglieder-Bearbeiten-Dialog streckte Tabs und Rollen-Buttons zu gross.
- Der Mitglied-hinzufuegen-Flow hatte riesige Auswahlkacheln und zu viel
  vertikale Leerflaeche.
- Der historische Mitgliedsformular-Dialog streckte Controls im Mobile-Modal.

## Read First

- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditHeaderCard.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`

## Umsetzung

1. Header-Tabs auf Mobile horizontal scrollbar machen und aktive Auswahl beim
   Tab-Wechsel in den sichtbaren Bereich scrollen.
2. App-Mitglieder und offene Einladungen auf Mobile als kompakte Karten statt
   als Desktop-Tabelle darstellen.
3. Historische Mitglieder auf Mobile als Karten mit Rollen-, Claim- und
   Aktionsbereichen darstellen, Desktop-Tabelle beibehalten.
4. Mitglieder-Dialoge gegen Grid-/Modal-Stretching absichern.
5. Rollen-, Medienrechte-, Auswahl- und Formularcontrols auf Mobile mit
   stabilen Hoehen und Touch-Zielen darstellen.
6. Lokale Docker-Frontend-Entwicklung auf `next dev` mit Source-Mount
   umstellen, damit UI-Aenderungen lokal ohne manuelles Deploy sichtbar werden.

## Akzeptanz

- Mobile Tabs sind nicht mehr abgeschnitten und bleiben horizontal erreichbar.
- Aktiver Tab wird beim Laden/Wechsel sichtbar positioniert.
- Mobile Mitgliederlisten haben keine horizontale Tabellenbedienung.
- Bearbeiten- und Hinzufuegen-Dialoge zeigen kompakte, erwartbare Controls.
- Historische Mitgliederformulare verschwenden keine Vollbild-Hoehe.
- Lokaler Frontend-Container nimmt Codeaenderungen per Dev-Server auf.
