---
phase: 79-medien-ownership-in-ui-durchsetzen
plan: "01"
subsystem: frontend-admin-media
tags: [tdd, media-ownership, status-mapping, ui-components, d07]
dependency_graph:
  requires: []
  provides:
    - mediaStatusMapping (D-01/D-02 Mapping-Konstante)
    - MediaOwnershipContext (gemeinsame Pflichtfeld-Komponente D-07)
  affects:
    - alle 5 Upload-Surfaces (Pläne 79-03 bis 79-05 integrieren diese Bausteine)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN Zyklus mit @vitest-environment jsdom
    - CSS-Module mit globalen --space-* / --surface-* Tokens
    - Nur @/components/ui Primitives (Select, Badge, Card, ErrorState, FormField)
key_files:
  created:
    - frontend/src/components/admin/media/mediaStatusMapping.ts
    - frontend/src/components/admin/media/mediaStatusMapping.test.ts
    - frontend/src/components/admin/media/MediaOwnershipContext.tsx
    - frontend/src/components/admin/media/MediaOwnershipContext.module.css
    - frontend/src/components/admin/media/MediaOwnershipContext.test.tsx
  modified:
    - .gitignore
decisions:
  - "STATUS_LABELS_ORDERED: Reihenfolge intern → in Prüfung → öffentlich → abgelehnt → archiviert → entfernt (UI-SPEC)"
  - "onContextChange wird via useEffect bei Owner-Guard und bei jeder Status-/Kategorie-Änderung aufgerufen"
  - "jsdom-Environment via @vitest-environment jsdom Direktive (Datei-Ebene, nicht global)"
metrics:
  duration: "6 Minuten"
  completed_date: "2026-06-06"
  tasks: 2
  files: 6
---

# Phase 79 Plan 01: mediaStatusMapping + MediaOwnershipContext Summary

**One-liner:** TDD-implementierter D-02-Status-Mapping-Layer und gemeinsame D-07-Pflichtfeld-Komponente als Foundation aller 5 Upload-Surfaces — 6-Label-Mapping, D-06-Owner-Guard, D-09/D-03-Branding/Prozessmedien-Unterscheidung.

## What Was Built

### mediaStatusMapping.ts
Exportiert `StatusLabel` (Union-Typ mit 6 deutschen Labels), `StatusAxes` (Interface mit `visibilityCode`/`reviewStatusCode`), `STATUS_LABEL_MAPPING` (vollständiges D-02-Mapping) und `STATUS_LABELS_ORDERED` (UI-SPEC-Reihenfolge). Kein runtime-Lookup nötig — Frontend übergibt nur Code-Strings; ID-Auflösung bleibt im Backend.

### MediaOwnershipContext.tsx (217 Zeilen)
Gemeinsame Pflichtfeld-/Owner-Kontext-Komponente (D-07):
- **D-06 Owner-Guard:** Bei `ownerID` null oder ≤ 0 wird `ErrorState` "Upload nicht möglich" gerendert; `onContextChange` liefert `ownerResolved: false`.
- **D-05 Owner-Chip:** `Badge variant="info"` mit `ownerLabel` — read-only, nicht editierbar.
- **D-08 categoryMode:** `slot` = read-only `Badge`; `dropdown` = `Select` in `FormField`.
- **D-09/D-03 statusPolicy:** `immediate` = kein Status-Dropdown, `approved/public`; `in_review` = `Select` mit Default „in Prüfung", `in_review/private`.
- Nur `@/components/ui` Primitives — kein natives `<select>/<input>/<textarea>/<button>`.

### MediaOwnershipContext.module.css
CSS-Modul mit `ownerContextCard`, `ownerChipRow`, `ownerHint`, `fieldStack` — ausschließlich `--space-*`/`--surface-*`/`--text-muted` Tokens.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `2f4f05a5` | Beide Test-Dateien committed, alle Tests schlugen fehl (Module nicht gefunden) |
| GREEN (feat) | `df1f7cb4` | Implementierung committed, 16/16 Tests grün |
| REFACTOR | nicht nötig — keine Refaktorierung erforderlich | — |

## Test Results

```
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > hat exakt 6 Einträge
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > öffentlich mappt auf public + approved
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > intern mappt auf private + approved
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > in Prüfung mappt auf private + in_review
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > abgelehnt mappt auf private + rejected
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > archiviert mappt auf private + archived
 ✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > entfernt mappt auf private + removed
 ✓ mediaStatusMapping.test.ts > STATUS_LABELS_ORDERED > enthält alle 6 Labels
 ✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=null → ErrorState sichtbar
 ✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=0 → ownerResolved=false
 ✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=5 → ownerResolved=true; ErrorState NICHT gerendert
 ✓ MediaOwnershipContext.test.tsx > D-03/D-09 > statusPolicy=in_review → reviewStatusCode=in_review + visibilityCode=private
 ✓ MediaOwnershipContext.test.tsx > D-03/D-09 > statusPolicy=immediate → reviewStatusCode=approved + visibilityCode=public
 ✓ MediaOwnershipContext.test.tsx > D-05 > ownerLabel=Gruppe X als read-only Text
 ✓ MediaOwnershipContext.test.tsx > D-08 > categoryMode=slot → Badge; kein Select
 ✓ MediaOwnershipContext.test.tsx > D-08 > categoryMode=dropdown → Select gerendert
Test Files: 2 passed | Tests: 16 passed
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .gitignore blockierte frontend/src/components/admin/media/**

- **Found during:** RED-Phase Commit — `git status` zeigte keine neuen Dateien
- **Issue:** Die `.gitignore`-Regel `media/` traf rekursiv auf `frontend/src/components/admin/media/`, analog zur bestehenden Exception `!frontend/src/components/media/`
- **Fix:** `.gitignore` um `!frontend/src/components/admin/media/` und `!frontend/src/components/admin/media/**` erweitert
- **Files modified:** `.gitignore`
- **Commit:** `2f4f05a5` (Teil des RED-Commits)

**2. [Rule 3 - Blocking] Vitest-Umgebung für React-Komponenten-Tests fehlte**

- **Found during:** Erster Testlauf — `document is not defined` in allen 8 Komponenten-Tests
- **Issue:** `vitest.config.ts` hat keine globale `environment: 'jsdom'` Einstellung; React-Komponenttests brauchen jsdom
- **Fix:** `// @vitest-environment jsdom` Direktive oben in `MediaOwnershipContext.test.tsx` eingefügt (analog zu `MediaUpload.test.tsx`)
- **Files modified:** `MediaOwnershipContext.test.tsx`
- **Commit:** `2f4f05a5` (Teil des RED-Commits)

## Known Stubs

Keine. Alle Interfaces und Exports sind vollständig implementiert und von Tests abgedeckt.

## Threat Flags

Keine neuen Netzwerk-Endpunkte, Auth-Pfade oder Datenbankzugriffe in diesem Plan. Die in `79-01-PLAN.md` definierten Threats T-79-01-01 bis T-79-01-03 werden durch Plan 79-02 (Backend-Absicherung) adressiert.

## Self-Check: PASSED

Erstellte Dateien vorhanden:
- frontend/src/components/admin/media/mediaStatusMapping.ts ✓
- frontend/src/components/admin/media/mediaStatusMapping.test.ts ✓
- frontend/src/components/admin/media/MediaOwnershipContext.tsx ✓
- frontend/src/components/admin/media/MediaOwnershipContext.module.css ✓
- frontend/src/components/admin/media/MediaOwnershipContext.test.tsx ✓

Commits vorhanden:
- 2f4f05a5 (RED: test(79-01)) ✓
- df1f7cb4 (GREEN: feat(79-01)) ✓
