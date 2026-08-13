---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: "06"
subsystem: backend-tests, frontend
tags: [go, typescript, react, test-cleanup, d02-cleanup, collaboration-removal]

requires:
  - phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
    plan: 05
    provides: Frontend-Typen bereinigt, ReleaseVersionFansubChips, alle group_type==='collaboration'-Zweige entfernt

provides:
  - Backend-Test-Suite vollständig grün (go test ./backend/... PASS)
  - D-02-Cleanup abgeschlossen: group_type-Residuen aus Frontend entfernt
  - merge/page.tsx: Typ-Filter vollständig entfernt (TypeFilter-Typ, typeFilter-State, Filterlogik, select-Block)
  - my-groups/page.tsx: bedeutungsloses {group.group_type}-Display entfernt
  - create/page.tsx + edit/page.tsx: groupType-Mapping auf hardcoded 'group' umgestellt
  - fansub.ts: group_type aus FansubGroup-Interface entfernt
  - Human-Verify-Checkpoint für Live-UAT bereit

affects:
  - Live-UAT (Phase-81-Abschluss)

tech-stack:
  added: []
  patterns:
    - "groupType hardcoded als 'group' in mapGroupToForm (kein Mapping auf Backend-Feld mehr)"

key-files:
  created: []
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/app/admin/fansubs/merge/page.tsx
    - frontend/src/app/admin/my-groups/page.tsx
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx

key-decisions:
  - "Backend-Tests waren bereits durch Plans 01-05 sauber — kein Änderungsbedarf in fansub_repository_test.go oder fansub_test.go"
  - "groupType in FormState bleibt (wird für group_type PATCH/POST genutzt), nur das group.group_type-Mapping entfernt"
  - "FansubGroupType = 'group' bleibt als Type (noch in FansubGroupCreateRequest/PatchRequest verwendet)"

requirements-completed:
  - P81-SC8

duration: 15min
completed: 2026-06-09
---

# Phase 81 Plan 06: Test-Cleanup + D-02-Frontend-Residuen-Cleanup

**Backend-Tests bereits sauber (Plans 01-05); D-02-Frontend-Cleanup: group_type-Residuen aus 5 Dateien entfernt; tsc + Vitest grün**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-09T10:27:00Z
- **Completed:** 2026-06-09T10:42:00Z
- **Tasks:** 1 (+ Orchestrator-Scope D-02-Cleanup)
- **Files modified:** 5

## Accomplishments

- Backend-Tests vollständig grün (`go test ./backend/...` PASS) — alle Test-Cleanup-Ziele aus Plans 01-05 bereits erledigt
- `grep -r "FansubGroupTypeCollaboration" backend/internal/handlers/fansub_test.go` — 0 Produktionstreffer (nur Kommentar in episode_import_repository_test.go erklärt den Wegfall)
- `grep -r "ListCollaborationMembers" backend/internal/repository/fansub_repository_test.go` — 0 Treffer
- D-02-Frontend-Cleanup abgeschlossen:
  - `fansub.ts`: `group_type: FansubGroupType` aus `FansubGroup`-Interface entfernt (Migration 0102 hat die Spalte gedroppt, Backend sendet das Feld nicht mehr)
  - `merge/page.tsx`: `TypeFilter`-Typ, `typeFilter`-State, Filterlogik `group.group_type !== typeFilter`, komplettes Typ-`<select>`-Block entfernt
  - `my-groups/page.tsx`: bedeutungsloses `{group.group_type}`-Display entfernt
  - `create/page.tsx`: `groupType: group.group_type` → `groupType: "group"` (hardcoded)
  - `edit/page.tsx`: ebenso `groupType: group.group_type` → `groupType: "group"`
- `npx tsc --noEmit` ohne Fehler
- `npx vitest run ReleaseVersionFansubChips.test.tsx my-groups/page.test.tsx` — 5/5 grün

## Task Commits

1. **Task 1 + D-02-Cleanup** - `6043c126` (feat)

## Files Created/Modified

- `frontend/src/types/fansub.ts` — group_type aus FansubGroup-Interface entfernt; FansubGroupType bleibt (CreateRequest/PatchRequest)
- `frontend/src/app/admin/fansubs/merge/page.tsx` — TypeFilter-Typ, typeFilter-State, Typ-Filterlogik und Typ-select entfernt
- `frontend/src/app/admin/my-groups/page.tsx` — {group.group_type}-Display-Span entfernt
- `frontend/src/app/admin/fansubs/create/page.tsx` — groupType: group.group_type → "group" hardcoded
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — groupType: group.group_type → "group" hardcoded

## Decisions Made

- Backend-Test-Cleanup war bereits vollständig durch Plans 01-05 erledigt: kein `ListCollaborationMembers`-Fragment in `fansub_repository_test.go`, kein `FansubGroupTypeCollaboration` in `fansub_test.go` (nur erläuternder Kommentar). Task 1 war somit eine Verifikation, keine Modifikation.
- `groupType` im `FormState` bleibt bestehen, da es für das Create/Edit-Formular weiterhin benötigt wird (wird als `group_type` in POST/PATCH-Body gesendet). Nur das Mapping `group.group_type` wurde entfernt und durch `"group"` ersetzt, da `FansubGroup.group_type` nicht mehr existiert.

## Deviations from Plan

### Prior-Wave Gap (Orchestrator-Scope)

**D-02-Frontend-Residuen-Cleanup (Wave-6-Gap — Orchestrator-Anweisung)**
- **Gefunden:** Migration 0102 hat `fansub_groups.group_type`-Spalte gedroppt, aber Frontend trug noch vestigiale Referenzen
- **Fix:** 5 Dateien bereinigt (TypeFilter in merge, group_type in FansubGroup-Interface, group.group_type-Mapping in create/edit, group_type-Display in my-groups)
- **Commit:** `6043c126`
- **tsc + Vitest:** grün

## Issues Encountered

Pre-existing Test-Fehler (14 Tests in 5 Dateien) — identisch mit den in Plan 05 dokumentierten Fehlern. Alle unabhängig von Phase-81-Änderungen:
- `api.no-token-boundary.test.ts` (2 Tests)
- `admin/anime/page.test.tsx` (3 Tests)
- `admin/anime/create/page.test.tsx` (7 Tests)
- `admin/anime/create/useAdminAnimeCreateController.test.ts` (1 Test)
- `app/fansubs/__tests__/page.test.tsx` (1 Test)

## Known Stubs

Keine. Alle Änderungen vollständig verdrahtet.

## Threat Surface Scan

Keine neuen sicherheitsrelevanten Flächen eingefügt. Typ-Filter-Entfernung reduziert die UI-Oberfläche. T-81-FIN-01 und T-81-FIN-02 unverändert.

## Next Phase Readiness

- Backend vollständig grün
- Frontend: tsc + relevante Vitest-Tests grün
- Human-Verify-Checkpoint bereit für Live-UAT

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*
