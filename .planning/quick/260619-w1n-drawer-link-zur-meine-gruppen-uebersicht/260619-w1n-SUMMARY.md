---
phase: quick-260619-w1n
plan: "01"
subsystem: frontend/layout
tags: [drawer, navigation, memberships, tdd]
dependency_graph:
  requires: []
  provides: [AppShell Gruppen-Übersicht-Link]
  affects: [frontend/src/components/layout/AppShell.tsx]
tech_stack:
  added: []
  patterns: [conditional myItems spread, TDD RED/GREEN]
key_files:
  created: []
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.test.tsx
decisions:
  - "groupenUebersichtItem als benanntes Zwischenkonstrukt, kein anonymes Inline-Objekt — Lesbarkeit im Array-Spread"
  - "Users-Icon wiederverwendet (bereits importiert Zeile 17) — kein neuer Import"
  - "Spread-Muster [...fixedMyItems, ...(memberships.length > 0 ? [groupenUebersichtItem] : [])] statt .filter() — explizit und typsicher"
metrics:
  duration: 8min
  completed: "2026-06-19"
  tasks: 1
  files: 2
---

# Phase quick-260619-w1n Plan 01: Gruppen-Übersicht-Link im AppShell-Drawer — Summary

**One-liner:** Bedingter `Gruppen-Übersicht`-Link auf `/manage/groups` in `myItems` (AppShellNavGroups) per TDD ergänzt — sichtbar nur bei `memberships.length > 0`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Gruppen-Übersicht-Link in AppShellNavGroups ergänzen und testen | 877b60ba | AppShell.tsx, AppShell.test.tsx |

## TDD Gate Compliance

- RED: 2 von 4 neuen Tests fehlschlugen erwartungsgemäß (Test A: Link nicht gefunden; Test C: aria-current fehlt). Test B und D passierten bereits korrekt (negativ-Assertions, die ohne Feature erfüllt sind).
- GREEN: Nach Implementierung alle 22 Tests grün (18 bestehende + 4 neue).
- Kein REFACTOR-Commit nötig — Implementierung war beim ersten Versuch sauber.

## Verification

- `npx vitest run src/components/layout/AppShell.test.tsx`: **22/22 passed**
- `npx tsc --noEmit`: **kein Output (0 Fehler)**

## Deviations from Plan

None — Plan exakt wie beschrieben umgesetzt.

## Known Stubs

None — kein Stub, kein Placeholder. Link verweist auf echte Route `/manage/groups`.

## Threat Flags

None — kein neues Netzwerk-Endpoint, keine neue Auth-Grenze. Der Link ist nur client-seitig sichtbar wenn `memberships` (aus authentifiziertem `getOwnProfile()`) vorhanden sind (T-W1N-01 und T-W1N-02 bereits im Threat-Register abgedeckt).

## Self-Check

- [x] `frontend/src/components/layout/AppShell.tsx` vorhanden
- [x] `frontend/src/components/layout/AppShell.test.tsx` vorhanden
- [x] Commit `877b60ba` existiert

## Self-Check: PASSED
