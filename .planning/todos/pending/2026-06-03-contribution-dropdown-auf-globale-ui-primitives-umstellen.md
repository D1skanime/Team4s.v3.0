---
created: 2026-06-03T07:52:25.367Z
title: Contribution-UI auf globale components/ui-Primitives umstellen (Phase 67 Folgearbeit)
area: ui
files:
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
  - frontend/src/components/anime/ReleaseVersionBreakdown.tsx
  - frontend/src/components/anime/GroupContributionBlock.tsx
  - frontend/src/components/ui/ (Select, FormField, index.ts)
  - frontend/src/app/dev/ui-system/ (Showcase als Referenz)
---

## Problem

Phase 67 hat im Contribution-UI eigenes/native Markup gebaut statt das vorhandene globale
Design-System zu nutzen:
- Das Release-Version-Dropdown in `AnimeContributionModal.tsx` ist ein handgebautes natives
  `<select>` statt der globalen Primitives `Select` + `FormField` aus `@/components/ui`.
- `ReleaseVersionBreakdown.tsx` nutzt eigenes Markup/CSS statt sich an den Primitives/Tokens
  auszurichten.

Das globale UI existiert real und ist breit genutzt: `frontend/src/components/ui/`
(Button, Card, Modal, Select, FormField, Input, Textarea, Drawer, Table, Tabs, …) plus
`ui.module.css`, Barrel `index.ts` und eine Showcase-Seite `/dev/ui-system`. Es wird in
**33 Dateien** importiert — u.a. von Geschwister-Tabs im selben Ordner
(`ClaimManagementPanel`, `FansubAppMembersSection`, `GroupMembersTab`, `MemberRolesTab`).
`AnimeContributionModal.tsx` importiert selbst bereits `{ Button, Modal }` aus dem globalen UI,
hat aber fürs Dropdown trotzdem ein natives `<select>` verwendet → inkonsistentes,
„schreckliches" UI bei den Beiträgen.

## Solution

In einer eigenen UI-Phase (`/gsd:ui-phase`):
1. Dropdown in `AnimeContributionModal.tsx` auf `Select` + `FormField` aus `@/components/ui`
   umstellen, native `<select>` entfernen; Leeroption „— anime-weit lassen —", Label
   „Release-Version (optional)", Hint + 422-Feldfehler über `FormField` rendern.
2. `ReleaseVersionBreakdown.tsx` an die globalen Tokens/Primitives angleichen (Abstände,
   Chips, Disclosure-Trigger), Referenz `/dev/ui-system`.
3. Restliche Contribution-Flächen (Leader-Panel „Anime-Beiträge", öffentliche Aufschlüsselung)
   visuell prüfen und konsistent machen.

### Root cause (in die UI-Phase mitnehmen)
- **UI-SPEC zu schwach:** Die verbindliche Nutzung von `@/components/ui` war nicht als
  Pflicht-Constraint im UI-SPEC verankert → kein UI-Checker-Gate, das natives Markup blockt.
  Künftige UI-SPECs müssen „nutze die globalen Primitives aus components/ui; kein handgebautes
  `<select>`/Markup" als hartes Constraint festschreiben.
- **Executor-Fehlurteil:** Deviation-Notiz behauptete fälschlich „Bestand nutzt die Primitives
  nirgends" und stellte lokale Datei-Konsistenz über das globale Design-System. Closest-analog-
  Regel darf das globale Design-System nicht überstimmen.
