---
created: 2026-06-06T00:00:00+02:00
title: fansubs/[id]/edit/page.tsx aufteilen (450-Zeilen-Limit, CR-04 Phase 78)
area: admin-fansub-workspace
files:
  - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
---

## Problem

`frontend/src/app/admin/fansubs/[id]/edit/page.tsx` hat ~3943 Zeilen und verletzt das
CLAUDE.md-450-Zeilen-Limit um ~9×. Code-Review CR-04 (Phase 78). Die Datei ist ein
vorbestehender Monolith; Phase 78 hat nur Tab-Wiring (Import + bedingtes Render) ergänzt,
das Problem aber nicht verursacht.

## Desired Outcome

Eigener Refactor-Slice, der den Edit-Workspace in handhabbare Tab-/Section-Module aufteilt
(z. B. pro MainTab eine Komponente + Hook für Drawer-/Release-State), ohne Verhalten zu
ändern. Reine Strukturierung; keine neuen Datenmodelle. Tests/Typecheck müssen grün bleiben.
