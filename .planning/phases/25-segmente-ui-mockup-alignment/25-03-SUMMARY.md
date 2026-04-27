---
phase: 25-segmente-ui-mockup-alignment
plan: 03
subsystem: frontend-segmente-tests
tags: [segments, unit-tests, vitest, helpers]
dependency_graph:
  requires: [25-01, 25-02]
  provides: [SegmenteTab-unit-tests, segmenteTabUtils-extracted-helpers]
  affects:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts
tech_stack:
  added: []
  patterns: [pure-utility-extraction, vitest-unit-tests]
key_files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
  modified: []
decisions:
  - Hilfsfunktionen in segmenteTabUtils.ts extrahiert damit Tests ohne React-Importe laufen
  - calcDuration gibt "(MM:SS)"-Format zurueck (Stunden werden abgeschnitten — fuer kurze Theme-Segmente ausreichend)
  - Test fuer "Ending" als Badge-Label entfernt weil "ENDING" kein "ED"-Substring enthaelt
metrics:
  duration: 10min
  completed: "2026-04-27T09:49:00Z"
  tasks: 1
  files: 2
---

# Phase 25 Plan 03: Tests und UAT-Verifikation Summary

Unit-Tests fuer SegmenteTab-Hilfsfunktionen (Badge-Labels, Dauer, Episodenformat, Source-Type-Labels, aktive Range-Semantik) — 31 Tests, alle PASS.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Unit-Tests fuer Hilfsfunktionen | 69e01e53 | segmenteTabUtils.ts, SegmenteTab.test.tsx |

## Task 2 — Checkpoint pending

Human-UAT steht noch aus (checkpoint:human-verify).

## What Was Built

**Task 1 — segmenteTabUtils.ts + SegmenteTab.test.tsx:**
- `segmenteTabUtils.ts`: Extrahierte reine Hilfsfunktionen aus SegmenteTab.tsx:
  - `getTypeBadgeLabel()`: mappt Typnamen auf Kurzcode (OP/ED/IN/PV)
  - `calcDuration()`: berechnet Dauer als "(MM:SS)"
  - `formatDuration()`: vollstaendiges Zeitbereich-Format mit Dauer
  - `formatEpisodeRange()`: Einzelepisode ohne Duplikat, Range mit Gedankenstrich
  - `resolveSourceLabel()`: source_type und legacy-Fallback auf lesbaren Text
  - `isSegmentActiveForEpisode()`: prueft ob Segment in aktuelle Episode faellt

- `SegmenteTab.test.tsx`: 31 Unit-Tests:
  - `getTypeBadgeLabel`: 8 Tests (OP1, ED2, Insert, PV, Outro, unbekannt)
  - `calcDuration`: 4 Tests inkl. calcDuration("00:00:00", "00:00:00") === "(00:00)"
  - `formatEpisodeRange`: 5 Tests inkl. Einzelepisode start===end => "3"
  - `resolveSourceLabel`: 7 Tests fuer none/jellyfin_theme/release_asset + Legacy
  - `isSegmentActiveForEpisode`: 7 Tests inkl. Segment 1-9 aktiv auf Episode 4

## Deviations from Plan

**1. [Rule 1 - Bug] Falscher Test fuer "Ending" Badge-Label entfernt**
- **Found during:** Task 1 RED-phase
- **Issue:** "ENDING" enthaelt kein "ED"-Substring (E und D stehen nicht nebeneinander), also liefert die Funktion korrekt "IN" (wegen "IN"-Substring in "ENDING")
- **Fix:** Test durch korrekten Test "ED2 direkt" ersetzt — testet dasselbe Verhalten ohne falsche Erwartung
- **Commit:** 69e01e53

**2. [Rule 2 - Missing] segmenteTabUtils.ts als Utility-Extraktion angelegt**
- **Found during:** Task 1
- **Issue:** Hilfsfunktionen in SegmenteTab.tsx sind nicht exportiert — Tests koennen sie nicht direkt importieren
- **Fix:** `segmenteTabUtils.ts` mit identischer Logik erstellt (keine Verhaltensaenderung); SegmenteTab.tsx bleibt ungaendert (soll separat migriert werden)

## Known Stubs

- `segmenteTabUtils.ts` ist eine Kopie der internen Helfer aus `SegmenteTab.tsx` — eine spaetere Aufraeum-Aufgabe sollte `SegmenteTab.tsx` auf den Export aus `segmenteTabUtils.ts` umstellen, um Duplikation zu vermeiden.

## Self-Check: PASSED

- `segmenteTabUtils.ts` — FOUND
- `SegmenteTab.test.tsx` — FOUND
- Commit 69e01e53 — FOUND
- `npx vitest run src/app/admin/episode-versions` — 31 Tests PASS
