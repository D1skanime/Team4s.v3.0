---
phase: 121-rollen-badges-visuell-und-funktional-perfektionieren
plan: 03
subsystem: ui-validation
tags: [react, carousel, responsive, visual-uat, regression]
requires:
  - phase: 121-02
    provides: Semantische Rollenkarte und responsiver Rank-Track
  - phase: 121-04
    provides: Freigegebene Wide-Desktop-Remediation
provides:
  - Reproduzierbarer 14-teiliger Rollen-Badge-Abschlussbericht
  - Vier dimensionsgeprüfte Kern-Viewport-Screenshots
  - Dokumentierte Ablehnungs-, Remediation- und Freigabekette
affects: [member-profile, role-badges, focal-carousel-consumers]
tech-stack:
  added: []
  patterns: [artifact-backed visual UAT, deterministic sharp validation]
key-files:
  created:
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/validate-uat.mjs
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/uat/roles-390.png
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/uat/roles-768.png
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/uat/roles-1024.png
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/uat/roles-1440.png
  modified:
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-UAT.md
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "Die erste Desktop-Ablehnung bleibt als UAT-Historie erhalten; erst die freigegebene Plan-121-04-Remediation schließt Plan 121-03 ab."
  - "Der planfremde /_not-found-Prerenderfehler wird dokumentiert und nicht als erfolgreicher Build dargestellt."
patterns-established:
  - "UAT-Abschlussberichte unterscheiden automatisierte Regression, sichtbare Evidence und menschliche Freigabe explizit."
requirements-completed: [D-01, D-03, D-04, D-08, D-09, D-10, D-12, D-15, D-16, D-17, D-18, D-20, D-21, D-22, D-23, D-24, D-25, D-26, D-27, D-28]
duration: 1h 35m
completed: 2026-08-10
---

# Phase 121 Plan 03: Rollen-Badge-UAT Summary

**Rollen-Badge-Abschluss mit 14-teiligem Bericht, vier exakt validierten Kern-Viewports und nachvollziehbarer Ablehnungs- bis Freigabekette**

## Performance

- **Duration:** 1h 35m aktive Ausführung über Checkpoint-Fortsetzungen
- **Completed:** 2026-08-10
- **Tasks:** 3
- **Files modified:** 8 Plan-, Evidence- und fokussierte Consumer-Dateien

## Accomplishments

- Focused Rollen-, Shared-FocalCarousel- und FansubProjectsGrid-Regressionen gemeinsam belegt.
- Vier PNG-Kernbelege für 390x844, 768x1024, 1024x768 und 1440x900 mit Signatur, Sharp-Dekodierung, Format und exakten Maßen validiert.
- 14 vorgeschriebene Berichtskapitel und fünf stabile Qualitätsantworten reproduzierbar geprüft.
- Erste Desktop-Ablehnung, Plan-121-04-Remediation und abschließende menschliche Freigabe ohne Umschreiben der Historie dokumentiert.

## Task Commits

1. **Task 1: Vollgates und Live-UAT-Evidence** — `351b6e49`, `7838c99f`, `70acd0a2`
2. **Task 2: Human verification** — zuerst abgelehnt und in `e13b5ff8` dokumentiert; nach Plan 121-04 am 2026-08-10 freigegeben
3. **Task 3: Freigegebene UAT-Artefakte final validieren** — `b136174f`

## Files Created/Modified

- `121-UAT.md` — Abschlussbericht, Gate-Ergebnisse, sichtbare Route, Ablehnung, Remediation und Approval.
- `validate-uat.mjs` — deterministisches Kapitel-, Q-ID-, Pfad-, PNG- und Maß-Gate mit Sharp aus `/app/node_modules`.
- `uat/roles-390.png`, `roles-768.png`, `roles-1024.png`, `roles-1440.png` — Kern-Viewport-Evidence.
- `MemberBadgeChain.module.css` und `MemberBadgeChain.test.tsx` — während Task 1 korrigierte und abgesicherte Status-Chip-Eindämmung.

## Decisions Made

- Shared-FocalCarousel blieb unverändert; die spätere Wide-Desktop-Remediation blieb im Rollen-Consumer.
- Die ursprüngliche Ablehnung ist Teil des Audit-Trails und wird durch das spätere Approval ergänzt, nicht ersetzt.
- Der verbleibende `/_not-found`-Prerenderfehler ist planfremd und wird ausdrücklich nicht als grüner Build gemeldet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Status-Chip bei schmalen Viewports enthalten**
- **Found during:** Task 1 Live-UAT
- **Issue:** Der aktuelle Rangstatus konnte den Track-Slot visuell verlassen.
- **Fix:** Rollenlokale CSS-Eindämmung plus fokussierter Regressionstest.
- **Committed in:** `7838c99f`

### Checkpoint-driven Remediation

**2. Desktop-Komposition zunächst nicht freigegeben**
- **Found during:** Task 2 Human verification
- **Issue:** Die aktive Desktop-Karte entsprach nicht der geforderten breiten horizontalen Hero-Komposition.
- **Resolution:** Ablehnung in `e13b5ff8` festgehalten; Plan 121-04 implementierte und validierte die Remediation. Der aktuelle Stand wurde anschließend menschlich freigegeben.

## Issues Encountered

- Das erste Plan-121-03-Gate war durch veraltete generierte Next-`PageProps`-Typen blockiert.
- Nach Plan 121-04 bestehen Typecheck und Kompilierung; der globale Build scheitert weiterhin planfremd beim Prerendern von `/_not-found` mit `Cannot read properties of null (reading 'useEffect')`.
- Lint bleibt grün mit 326 vorbestehenden Warnungen.

## Known Stubs

None.

## Threat Flags

None. Der Plan führte keine neuen Endpunkte, Auth-Pfade, Dateizugriffe oder Schemaänderungen ein.

## User Setup Required

None.

## Next Phase Readiness

- Phase 121 ist fachlich und visuell freigegeben.
- Der planfremde `/_not-found`-Prerenderfehler bleibt für eine separate Reparatur offen.

## Self-Check: PASSED

- Bericht, Validator und alle vier Kern-PNGs existieren.
- Alle aufgeführten Plan-121-03-Commits existieren.
- `validate-uat.mjs` meldet `121-UAT valide`; `git diff --check` ist grün.

---
*Phase: 121-rollen-badges-visuell-und-funktional-perfektionieren*
*Completed: 2026-08-10*
