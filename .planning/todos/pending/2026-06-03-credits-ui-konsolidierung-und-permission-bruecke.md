---
created: 2026-06-03T08:10:00.000Z
title: Credits-UI in "Anime & Veröffentlichungen" konsolidieren + Permission-Brücke (Design)
area: ui
files:
  - frontend/src/app/admin/fansubs/[id]/edit/ (Tabs "Anime-Beiträge" vs "Anime & Veröffentlichungen")
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
  - backend/internal/permissions/permissions.go (roleMatrix)
---

## Problem

Zwei Design-Punkte aus der Diskussion nach Phase 67 — für die spätere UI-Phase / Produktentscheidung:

### A) UI-Konsolidierung + Benennung
- „Anime-Beiträge" und „Anime & Veröffentlichungen" sind aktuell **getrennte Tabs**. Die
  versions-spezifischen Credits gehören kontextuell **dort hin, wo Episoden/Versionen schon
  mit ordentlichem UI stehen** (Anime & Veröffentlichungen). Vorschlag: Credits/Aufschlüsselung
  direkt neben der jeweiligen Release-Version anzeigen/pflegen.
- **„Beiträge" ist ein schwaches Wort.** Bessere Benennung: „Mitwirkende" (passt zur
  öffentlichen Anzeige „X Mitwirkende"), alternativ „Credits" / „Team & Rollen".

### B) Permission-Brücke (offene Produktentscheidung)
- Wunsch: Fansubber soll handeln können, sobald ein Credit/Rolle (z. B. „Editing") anime-weit
  gesetzt ist; Versions-Präzisierung kommt später.
- **Wichtig:** Credit (Attribution) ≠ Berechtigung (Permission-Engine `roleMatrix`). Credit als
  automatisches Recht wäre riskant (historische/öffentliche Credits, falscher Credit →
  Rechte-Eskalation). Der „global zuerst → Version später"-Flow für den **Credit** existiert
  bereits (Phase 67, D-10).

## Solution

### A) — UI-Phase
1. Credits-Aufschlüsselung in „Anime & Veröffentlichungen" integrieren (neben den Versionen),
   ggf. den separaten „Anime-Beiträge"-Tab auflösen oder verlinken.
2. Umbenennen „Beiträge" → „Mitwirkende" (UI-weit konsistent, inkl. öffentlicher Anime-Seite).
3. Mit der globalen-UI-Umstellung (`@/components/ui`) zusammen umsetzen.

### B) — Produktentscheidung vor Umsetzung
Empfohlene Variante: **Brücke statt Vermischung** — beim Anlegen eines Credits mit Rolle
schlägt die UI optional vor, dem App-User die passende Permission zu geben, aber als
**expliziten, separaten, widerrufbaren Grant** in der Permission-Engine. Nicht: Credit =
automatische Permission. Entscheidung mit Nutzer in discuss-phase festzurren.
