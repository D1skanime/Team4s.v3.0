---
phase: quick-260608-jb9
plan: "01"
subsystem: frontend/startseite
tags: [ui-primitives, css-cleanup, button, globals.css]
dependency_graph:
  requires: []
  provides: [UI-PRIM-01]
  affects: [frontend/src/app/page.tsx, frontend/src/styles/globals.css]
tech_stack:
  added: []
  patterns: [Button-Primitiv mit href fuer Link-Rendering]
key_files:
  modified:
    - frontend/src/app/page.tsx
    - frontend/src/styles/globals.css
decisions:
  - "Button-Primitiv rendert als <a>-Tag via href-Prop — kein next/link mehr auf der Startseite"
  - ".hero-actions uebernimmt margin-top vom Container statt von den einzelnen Links"
metrics:
  duration: ~5min
  completed: "2026-06-08"
---

# Phase quick-260608-jb9 Plan 01: Startseite Button-Primitiv Summary

**One-liner:** Vier native `<Link className="primary-link">` auf der Startseite durch `<Button href="...">` aus `@/components/ui` ersetzt und Inline-Style-Wrapper durch benannte CSS-Klasse `.hero-actions` abgeloest.

## Task Execution

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Button-Primitiv auf Startseite einsetzen und CSS aufräumen | f1ca2d46 | frontend/src/app/page.tsx, frontend/src/styles/globals.css |

## Changes Made

### frontend/src/app/page.tsx

- `import Link from 'next/link'` entfernt
- `import { Button } from '@/components/ui'` hinzugefügt (Barrel-Export bestaetigt)
- Inline-Style-Wrapper `<div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>` durch `<div className="hero-actions">` ersetzt
- Vier `<Link href="..." className="primary-link">` durch `<Button href="...">` ersetzt

### frontend/src/styles/globals.css

- `.primary-link { ... }` und `.primary-link:hover { ... }` (Zeilen 171–183) entfernt
- `.hero-actions` mit `display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: var(--space-4)` eingefuegt

## Verification

- grep `primary-link` in `frontend/src/app/page.tsx`: 0 Treffer
- grep `style={{` in `frontend/src/app/page.tsx`: 0 Treffer
- grep `primary-link` in `frontend/src/styles/globals.css`: 0 Treffer
- grep `hero-actions` in `frontend/src/styles/globals.css`: 1 Treffer (Zeile 171)

## Deviations from Plan

Keine — Plan exakt wie beschrieben umgesetzt.

## Known Stubs

Keine.

## Threat Flags

Keine (reine Frontend-Styling-Aenderung, keine Datengrenzen betroffen).

## Self-Check: PASSED

- `frontend/src/app/page.tsx` existiert und enthaelt `Button href`
- `frontend/src/styles/globals.css` enthaelt `.hero-actions`, kein `.primary-link`
- Commit `f1ca2d46` vorhanden
