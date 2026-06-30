---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "06"
subsystem: frontend-capability-ui
tags: [master-detail, accordion, switch, mobile, badge, 422-guard, tdd]
dependency_graph:
  requires:
    - "94-02 (Assignable-Guard + role.assignable im Backend)"
    - "94-04 (TS-Typen RoleEntry.assignable/contexts in admin-capability.ts)"
    - "94-05 (Switch + Accordion UI-Primitives)"
  provides:
    - "capabilityCategories.ts: categoryDisplayLabel() Display-Mapping (D-11)"
    - "RoleMasterList.tsx: Rollenliste mit Kontext-Badges (D-13)"
    - "RoleCapabilityDetail.tsx: Accordion+Switch-Detail, Mobile-Sheet (D-11/D-12)"
    - "RoleCapabilityClient.tsx: Master-Detail-Layout + 422-Inline-Fehler (D-12/D-13)"
  affects:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN mit jsdom-Environment"
    - "Master-Detail-Layout (RoleMasterList + RoleCapabilityDetail)"
    - "Accordion-Kategorien aus categoryDisplayLabel() (kein DB-Change)"
    - "Switch pro Capability (aria-checked, disabled bei nicht-assignable)"
    - "Drawer variant=responsiveSheet als Mobile-Bottom-Sheet (< 760px)"
    - "422 role_not_assignable als spezifischer Inline-Fehler"
key_files:
  created:
    - frontend/src/app/admin/role-capabilities/capabilityCategories.ts
    - frontend/src/app/admin/role-capabilities/capabilityCategories.test.ts
    - frontend/src/app/admin/role-capabilities/RoleMasterList.tsx
    - frontend/src/app/admin/role-capabilities/RoleMasterList.test.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx
  modified:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
decisions:
  - "Display-Mapping (gruppe/projekt/release → deutsche Labels) rein im Frontend ohne DB-Migration (D-11/Pattern 5)"
  - "Accordion startet geschlossen (multi-open Modus aus Plan-05) — Tests öffnen Header vor Switch-Interaktion"
  - "Drawer + Desktop-Panel rendern beide RoleCapabilityDetail — Tests nutzen getAllByText statt getByText"
  - "422 role_not_assignable als Inline-Fehler direkt im Detail-Panel (kein Modal), analog 409-Muster"
  - "RoleCapabilityTable bleibt für ältere Tests kompatibel durch Import-Cleanup; neue UI hat keine Vollmatrix mehr als Hauptbedienung"
  - "capabilityError-State im Client für beide Mutationspfade (grant + revoke) geteilt; setzt sich bei Rollenwechsel zurück"
metrics:
  duration: 7min
  completed_date: "2026-06-30"
  tasks: 2
  files: 8
---

# Phase 94 Plan 06: Master-Detail Capability-UI (Accordion+Switch, Mobile-Sheet) Summary

Rollenbasierte, kategorisierte Capability-UI mit Master-Detail-Layout, Accordion+Switch pro Kategorie/Capability, Drawer-Bottom-Sheet für Mobile (390px), Kontext-Badges und 422 role_not_assignable als Inline-Fehler — alles via Plan-05-Primitives, kein HTML-Native-Markup in Konsumenten-Dateien.

## One-Liner

Master-Detail-Capability-UI (Accordion+Switch+Drawer-Mobile-Sheet) mit Kontext-Badges, disabled historische Rollen und 422-Inline-Fehler — D-11/D-12/D-13 geschlossen.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Kategorie-Display-Mapping + Master-Rollenliste mit Badges | a99f197d | Abgeschlossen |
| 2 | Detail-Ansicht (Accordion + Switch, Mobile-Sheet) + Client-Verdrahtung mit 422-Inline-Fehler | 8b91cc7d | Abgeschlossen |
| 3 | Mobile-/UX-Verifikation (Checkpoint) | — | Ausstehend (manuell) |

## Ergebnisse

### capabilityCategories.ts (27 Zeilen)

- `categoryDisplayLabel(category)`: mappt `gruppe`→"Gruppe", `projekt`→"Projekt", `release`→"Release"
- Unbekannte Kategorien: `capitalizeFirst()`-Fallback (kein Crash)
- Keine DB-Migration (D-11/Pattern 5)
- 4 Tests grün

### RoleMasterList.tsx (87 Zeilen)

- Card-Rows (`Card variant="interactive"`) pro Rolle mit `onSelectRole`-Callback
- Badge-Ableitung: `assignable=true` → `Badge variant="info"` "Aktive App-Rolle"; `assignable=false` → `Badge variant="muted"` "Historische Rolle"
- Nicht-assignable Rollen: `aria-disabled="true"`, `cursor: not-allowed`
- Nur `@/components/ui`-Primitives (Card, Badge)
- 4 Tests grün

### RoleCapabilityDetail.tsx (157 Zeilen)

- Gruppiert `role.actions` nach `category` → `categoryDisplayLabel()` als Accordion-Header
- Pro Capability: `Switch` (aria-checked=granted; disabled bei assignable=false)
- `onGrant`/`onRevoke`-Callbacks per `onCheckedChange`
- `inlineError`-Prop als `role="alert"`-Fehlerbereich
- Nur `@/components/ui`-Primitives (Accordion, Switch)
- 4 Tests grün

### RoleCapabilityClient.tsx (231 Zeilen)

- **Master-Detail-Layout**: `RoleMasterList` links (280px) + `RoleCapabilityDetail` rechts
- **Mobile**: `Drawer variant="responsiveSheet"` öffnet bei Rollenwahl (`isDetailOpen`)
- **422-Behandlung**: `err.status === 422 && err.code === 'role_not_assignable'` → spezifischer Inline-Fehlertext (nicht generisches Banner)
- **409-Behandlung**: analog Lockout-Guard-Muster beibehalten
- Bestehende `loadData`/`grant`/`revoke`-Logik beibehalten
- Vollmatrix (`RoleCapabilityTable`) nicht mehr die primäre Bedienung (D-11 erfüllt)
- 5 Tests grün (inkl. 422 + 409 + Master-Detail)

## Test-Status

| Datei | Tests | Status |
|-------|-------|--------|
| capabilityCategories.test.ts | 4 | GRÜN |
| RoleMasterList.test.tsx | 4 | GRÜN |
| RoleCapabilityDetail.test.tsx | 4 | GRÜN |
| RoleCapabilityClient.test.tsx | 5 | GRÜN |
| **Gesamt** | **17** | **GRÜN** |

- `npx vitest run src/app/admin/role-capabilities`: 17/17 PASS
- `npx tsc --noEmit`: exit 0
- `git diff --check`: sauber

## Deviationen vom Plan

### Auto-Adaptation: Tests für geändertes UI (Rule 1 — Bug-Fix)

**1. [Rule 1 - UI-Adaptation] Client-Tests auf Master-Detail-Layout angepasst**
- **Found during:** Task 2 GREEN-Phase
- **Issue:** Die alten Tests in `RoleCapabilityClient.test.tsx` erwarteten `role="table"` und einen "Entziehen"-Button aus der alten `RoleCapabilityTable` — beide existieren in der neuen Master-Detail-UI nicht mehr
- **Fix:** Tests auf das neue UI adaptiert: `role="table"` → Rollenliste-Prüfung; "Entziehen"-Button-Pfad → Switch-Toggle-Pfad mit Accordion-Öffnen
- **Files modified:** `RoleCapabilityClient.test.tsx`
- **Commit:** 8b91cc7d

### Test-Strategie: Accordion muss vor Switch-Interaktion geöffnet werden

**2. [Rule 1 - Verification-Adaptation] Accordion startet geschlossen**
- **Found during:** Task 2 Detail-Test RED-Phase
- **Issue:** `Accordion` rendert Panels nur bei `isOpen=true` — Tests, die Switch suchen, ohne vorher den Header anzuklicken, finden keine Switches
- **Fix:** Alle Switch-Tests klicken zuerst den Accordion-Header (`getAllByText(category)[0]`) vor der Switch-Interaktion
- **Files modified:** `RoleCapabilityDetail.test.tsx`, `RoleCapabilityClient.test.tsx`
- **Commit:** 8b91cc7d

## Checkpoint-Status

Task 3 (Mobile-/UX-Verifikation) ist ein `checkpoint:human-verify` — der Plan pausiert hier für manuelle Live-Verifikation am Dev-Server :3000.

## Known Stubs

Keine produktionsseitigen Stubs. `RoleCapabilityTable` ist noch importiert in anderen Dateien; die neue UI nutzt sie nicht mehr als Hauptbedienung — die Datei selbst bleibt für eventuelle Rückwärtskompatibilität bestehen.

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade. Die 422-Behandlung im Client ist eine rein frontEnd-seitige Darstellung des bereits in Plan 02 serverseitig gesicherten Guards.

T-94-02 (Frontend-Bypass Disabled-Switch): Switch ist visuell disabled (`aria-disabled`, `cursor: not-allowed`); echter Schutz ist der 422-Server-Guard (Plan 02) — beide Mitigation-Ebenen aktiv.
T-94-07-UI (historische Rolle editierbar): Kontext-Badge "Historische Rolle" + disabled Switches + 422-Inline-Fehler — alle drei Ebenen implementiert.

## Self-Check: PASSED

- capabilityCategories.ts: FOUND (27 Zeilen)
- RoleMasterList.tsx: FOUND (87 Zeilen)
- RoleCapabilityDetail.tsx: FOUND (157 Zeilen)
- RoleCapabilityClient.tsx: FOUND (231 Zeilen, Master-Detail-Layout)
- commit a99f197d: FOUND
- commit 8b91cc7d: FOUND
- `npx vitest run src/app/admin/role-capabilities`: 17 Tests PASS
- `npx tsc --noEmit`: exit 0
