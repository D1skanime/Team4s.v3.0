---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "05"
subsystem: frontend-ui-primitives
tags: [ui-primitives, switch, accordion, accessibility, touch-target, tdd]
dependency_graph:
  requires: []
  provides: [Switch, Accordion]
  affects:
    - frontend/src/components/ui/index.ts
    - frontend/src/app/dev/ui-system/page.tsx
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN mit jsdom-Environment
    - Tabs.tsx-Konvention (use client, classNames, ui.module.css, Props-Interface)
    - role=switch + aria-checked (W3C-ARIA)
    - aria-expanded + useId für stabile Panel-IDs
key_files:
  created:
    - frontend/src/components/ui/Switch.tsx
    - frontend/src/components/ui/Switch.test.tsx
    - frontend/src/components/ui/Accordion.tsx
    - frontend/src/components/ui/Accordion.test.tsx
  modified:
    - frontend/src/components/ui/index.ts
    - frontend/src/components/ui/ui.module.css
    - frontend/src/app/dev/ui-system/page.tsx
decisions:
  - "Switch-Primitiv kapselt nativen <button role=switch> — Konsumenten duerfen kein natives <input type=checkbox> bauen (CLAUDE.md-Ausnahme gilt nur fuer Primitive-Definitionen)"
  - "Accordion nutzt multi-open Modus als Standard; single-open per mode='single' Prop moeglich — dokumentiert in AccordionProps"
  - "ui-system/page.tsx war bereits 1177 Zeilen vor Ausfuehrung (pre-existing) — Dev-Playground ist kein Produktionscode, 450-Zeilen-Limit gilt fuer Produktionscode"
metrics:
  duration: 8min
  completed_date: "2026-06-30"
  tasks: 2
  files: 7
---

# Phase 94 Plan 05: Switch- und Accordion-Primitiv Summary

Switch und Accordion als globale UI-Primitives gebaut (TDD, 8/8 Tests gruen), Touch-Ziele >= 44 px via CSS, ARIA korrekt, Barrel-Export ergaenzt, Showcase in /dev/ui-system hinzugefuegt.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Switch-Primitiv unter @/components/ui | 0e7430ba | Abgeschlossen |
| 2 | Accordion-Primitiv + ui-system-Showcase | 57ae76ab | Abgeschlossen |

## Ergebnisse

### Switch.tsx

- `role="switch"`, `aria-checked={checked}`, `aria-disabled={disabled}` korrekt gesetzt
- `onCheckedChange(!checked)` wird bei Klick aufgerufen; bei `disabled` No-op
- CSS-Klassen `switchRoot` (min-width/min-height 44px), `switchThumb`, `switchLabel` in `ui.module.css`
- Barrel-Export: `export * from './Switch'` in `index.ts` (alphabetisch eingeordnet)
- 4 Tests: aria-checked, toggle, disabled, aria-label — alle gruen

### Accordion.tsx

- Header als `<button type="button" aria-expanded={isOpen} aria-controls={panelId}>`
- `useId` fuer stabile, eindeutige Header-/Panel-IDs
- `mode='multi'` (Standard): mehrere Items unabhaengig auf-/zuklappbar
- `mode='single'`: nur ein Item gleichzeitig offen (alternativ nutzbar)
- CSS-Klassen `accordionHeader` (min-height 44px), `accordionPanel`, Chevron-Rotation
- Barrel-Export: `export * from './Accordion'` in `index.ts`
- 4 Tests: aria-expanded, toggle+Sichtbarkeit, multi-open, Touch-Ziel-CSS — alle gruen

### /dev/ui-system Showcase (Abschnitt 08)

- Neuer Showcase-Block "Switch & Accordion" mit deutschen, umlautkorrekten Demo-Labels
- Switch-Demo: Benachrichtigungen, oeffentliche Sichtbarkeit, gesperrte Option (disabled)
- Accordion-Demo: 3 aufklappbare Kategorien (Uebersetzung, Bearbeitung, Veroeffentlichung)

## Deviationen

**Keine** — Plan wurde exakt wie beschrieben ausgefuehrt.

### Bekannte Einschraenkung

**ui-system/page.tsx: 1251 Zeilen** — Diese Datei hatte bereits 1177 Zeilen vor Ausfuehrung dieses Plans. Die 74 hinzugefuegten Zeilen (Showcase-Block) sind minimal. Die Datei ist eine interne Dev-Route (`/dev/ui-system`) ohne Produktionslogik; das 450-Zeilen-Limit gilt laut CLAUDE.md fuer Produktionscode-Dateien. Pre-existing Ueberschreitung bleibt dokumentiert; ein Split dieser Dev-Route liegt ausserhalb des Scope dieses Plans.

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte, Auth-Pfade oder Trust-Boundary-Aenderungen eingefuehrt. Rein frontend-seitige Primitive ohne API-Seams.

## Self-Check: PASSED

- Switch.tsx: FOUND
- Accordion.tsx: FOUND
- Switch.test.tsx: FOUND
- Accordion.test.tsx: FOUND
- commit 0e7430ba: FOUND
- commit 57ae76ab: FOUND
