---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 07
subsystem: documentation
tags: [inventory, duplication-audit, admin-ui, permissions, refactor-planning]

# Dependency graph
requires:
  - phase: 175-01..175-06
    provides: 12 Fachaufgaben-Fragmente (`data/01-*.md` bis `data/12-*.md`) mit D-03-(a)-(f)-Erhebung und D-04-Klassifikation je Fund
provides:
  - "175-INVENTORY.md: eine zusammengeführte, pro-Fachaufgabe gegliederte Gesamt-Inventur (D-07-Artefakt 1 von 3)"
  - "Bestätigung, dass keine 13. Fachaufgabe über die D-02-Liste hinaus identifiziert wurde"
affects: [175-08-permission-matrix, 175-09-roadmap-proposal]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Merge-only-Zusammenführung: keine neuen Zahlen, nur Reorganisation bereits erhobener Belege aus Welle 1"]

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md
  modified: []

key-decisions:
  - "Keine zusätzliche (13.) Fachaufgabe ergänzt — fünf quergeprüfte Kandidaten (Fansub-Gruppen-CRUD, Episoden-Anlegen, Rollenmatrix, Mail/Toast, searchArchive) sind bereits Teil einer der 12 D-02-Fachaufgaben, kein eigenständiger Parallel-Build-Fund."

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-10-07
---

# Phase 175 Plan 07: Fachaufgaben-Inventur zusammenführen Summary

**12 Welle-1-Fragmente zu einer einzigen, pro Fachaufgabe gegliederten `175-INVENTORY.md` (D-07-Artefakt 1) zusammengeführt — ohne neue Zahlen, nur mit vollständig referenzierten D-03/D-04-Belegen aus den Vorplänen.**

## Performance

- **Duration:** ~15min
- **Completed:** 2026-10-07
- **Tasks:** 1/1 completed
- **Files modified:** 1 created

## Accomplishments
- `175-INVENTORY.md` erstellt mit genau 12 `## Fachaufgabe N: <Name>`-Abschnitten, Nummerierung/Benennung exakt aus D-02 übernommen.
- Jeder Abschnitt enthält mindestens eine D-03-(a)-(f)-Tabelle mit Datei:Zeile-Belegen je Zeile sowie die D-04-Klassifikation (Duplikat mit Vorbild/Altlast-Benennung, Variante, oder legitim getrennt) je Fund.
- "Zusätzliche Fachaufgaben"-Abschnitt dokumentiert explizit, dass keine 13. Fachaufgabe identifiziert wurde, mit Begründung für jeden der 5 geprüften Kandidaten.

## Task Commits

Each task was committed atomically:

1. **Task 1: 175-INVENTORY.md aus den 12 Fragmenten zusammenführen** - `23581c45` (docs)

**Plan metadata:** (dieser Commit, siehe unten)

## Files Created/Modified
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md` - zusammengeführte Gesamt-Inventur aller 12 Fachaufgaben plus "Zusätzliche Fachaufgaben"-Abschnitt

## Decisions Made
- Keine zusätzliche Fachaufgabe ergänzt (siehe `key-decisions` oben) — alle fünf Kandidaten sind bereits durch eine der 12 bestehenden Fachaufgaben abgedeckt, kein eigenständiger Parallel-Build-Charakter.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `grep -c "^## Fachaufgabe" 175-INVENTORY.md` → **12** (erwartet: mindestens 12 — erfüllt).
- `wc -l 175-INVENTORY.md` → **300** Zeilen (erwartet: mindestens 150 laut `min_lines`-Artefakt-Anforderung — erfüllt).
- `git status --short` innerhalb des Phasenverzeichnisses zeigt ausschließlich `175-INVENTORY.md` als neue Datei (keine weiteren unerwarteten Änderungen durch diesen Plan).
- Jede Zahl in `175-INVENTORY.md` ist wörtlich aus dem jeweiligen `data/NN-*.md`-Fragment übernommen; jeder Abschnitt zitiert die Fragment-Datei und ihr `scripts/count-NN-*.sh`-Reproduktionsskript.
- `.planning/sketches/010-galerie-detailansicht` wurde in diesem Plan nicht gelesen, nicht editiert, nicht committed (nur im INVENTORY-Text referenziert, wie bereits in `data/02-bild-ansehen.md` dokumentiert).

## Self-Check: PASSED

- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
- FOUND: commit `23581c45` in `git log --oneline --all`

## Known Stubs

None — this plan produces a documentation artifact only, no runtime code, no UI components, no data wiring.

## Threat Flags

None — pure Markdown merge of already-reviewed fragments (D-01); no new network endpoint, auth path, file access pattern, or schema change was introduced. Matches the plan's threat model (`T-175-07`, disposition `accept`).
