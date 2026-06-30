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
  created:
    - frontend/src/app/admin/role-capabilities/roleCapabilities.module.css
  modified:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx
    - frontend/src/app/admin/role-capabilities/page.tsx
    - frontend/src/components/ui/Accordion.tsx
    - frontend/src/components/ui/Accordion.test.tsx
decisions:
  - "Display-Mapping (gruppe/projekt/release → deutsche Labels) rein im Frontend ohne DB-Migration (D-11/Pattern 5)"
  - "Accordion startet geschlossen (multi-open Modus aus Plan-05) — Tests öffnen Header vor Switch-Interaktion"
  - "useIsMobile-Hook (matchMedia < 760px) steuert gegenseitige Exklusivität Desktop-Panel vs. Drawer-Sheet"
  - "Drawer und Desktop-Panel nie gleichzeitig gemountet — useIsMobile entscheidet am Klick-Zeitpunkt"
  - "422 role_not_assignable als Inline-Fehler direkt im Detail-Panel (kein Modal), analog 409-Muster"
  - "RoleCapabilityTable bleibt für ältere Tests kompatibel durch Import-Cleanup; neue UI hat keine Vollmatrix mehr als Hauptbedienung"
  - "capabilityError-State im Client für beide Mutationspfade (grant + revoke) geteilt; setzt sich bei Rollenwechsel zurück"
  - "Seitencontainer (roleCapabilities.module.css) hält Inhalt vom fixierten AppShell-Edge-Strip (16px) frei — padding-left 32px"
  - "Accordion-Open-Zustand controlled im Client gehalten + loadData(false) bei Mutations-Refresh — kein LoadingState-Unmount, Kategorie bleibt offen"
metrics:
  duration: 50min
  completed_date: "2026-06-30"
  tasks: 3
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
| 3 | Mobile-/UX-Verifikation + Bug-Fix (Desktop/Mobile-Exklusivität) | 589d055a | Abgeschlossen |

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

### RoleCapabilityClient.tsx (256 Zeilen)

- **Master-Detail-Layout**: `RoleMasterList` links (280px) + `RoleCapabilityDetail` rechts
- **useIsMobile-Hook**: `matchMedia('(max-width: 759px)')` — SSR-sicher, reagiert auf Viewport-Änderungen
- **Desktop (>= 760px)**: Nur `{!isMobile && selectedRole && <div>}` — kein Drawer-Mount
- **Mobile (< 760px)**: Nur `{isMobile && selectedRole && <Drawer>}` — kein Inline-Panel-Mount
- **handleSelectRole**: `setIsSheetOpen(true)` nur wenn `isMobile === true`
- **422-Behandlung**: `err.status === 422 && err.code === 'role_not_assignable'` → spezifischer Inline-Fehlertext (nicht generisches Banner)
- **409-Behandlung**: analog Lockout-Guard-Muster beibehalten
- Bestehende `loadData`/`grant`/`revoke`-Logik beibehalten
- 7 Tests grün (inkl. Desktop-Exklusivität + Mobile-Exklusivität)

## Test-Status

| Datei | Tests | Status |
|-------|-------|--------|
| capabilityCategories.test.ts | 4 | GRÜN |
| RoleMasterList.test.tsx | 4 | GRÜN |
| RoleCapabilityDetail.test.tsx | 5 | GRÜN |
| RoleCapabilityClient.test.tsx | 8 | GRÜN |
| Accordion.test.tsx (UI-Primitive) | 6 | GRÜN |
| **Gesamt (role-capabilities + Accordion)** | **27** | **GRÜN** |

- `npx vitest run src/app/admin/role-capabilities src/components/ui/Accordion.test.tsx`: 27/27 PASS
- `npx tsc --noEmit`: exit 0
- `npx eslint` (berührte Dateien): keine Fehler
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

### Live-UAT Bug-Fix: Desktop zeigt doppelte Ansicht (Rule 1 — Bug-Fix)

**3. [Rule 1 - Bug] Desktop + Mobile-Sheet beide gleichzeitig aktiv nach Rollenklick**
- **Found during:** Task 3 Live-Verifikation auf Dev-Server :3000
- **Issue:** `handleSelectRole` setzte immer `isDetailOpen(true)`, ohne auf die Viewport-Breite zu achten. `Drawer` hatte kein CSS-Guard der Viewport-Breite — er öffnete sich auf Desktop und Mobile gleichzeitig. Kein CSS-Modul mit `capabilityDetailDesktop` war vorhanden.
- **Root cause:** Die Exklusivität Desktop/Mobile war im JSX über CSS-only geplant (`capabilityDetailDesktop`-Klasse), aber die Klasse hatte keine Media-Query-Definition und der Drawer-State war viewport-agnostisch.
- **Fix:** `useIsMobile`-Hook (matchMedia `(max-width: 759px)`) eingebaut; Inline-Panel nur wenn `!isMobile && selectedRole`; Drawer nur wenn `isMobile && selectedRole`; `handleSelectRole` öffnet Sheet nur wenn `isMobile === true`. Zwei neue Tests verifizieren gegenseitige Exklusivität (Desktop: kein dialog-Element; Mobile: Switches nur im dialog).
- **Files modified:** `RoleCapabilityClient.tsx`, `RoleCapabilityClient.test.tsx`
- **Commit:** 589d055a

### Live-UAT Bug-Fix A: Seiteninhalt links abgeschnitten (Rule 1 — Bug-Fix)

**4. [Rule 1 - Bug] Überschrift/Text werden am linken Rand unter dem AppShell-Edge-Strip abgeschnitten**
- **Found during:** Task 3 Live-Verifikation auf Dev-Server :3000 (zweite UAT-Runde)
- **Issue:** "Capability-Verwaltung" erschien als "apability-Verwaltung" — der Seiteninhalt saß zu nah am linken Rand. Der AppShell rendert einen fixierten `.edgeStrip` (16px, `position: fixed`, `left: 0`) als Drawer-Trigger; die `page.tsx` wickelte den Client ohne Container/Padding, sodass der Inhalt unter dem Edge-Strip clippte.
- **Root cause:** Fehlender Seitencontainer mit horizontalem Padding (andere Admin-Seiten nutzen `<main className={styles.page}>`); role-capabilities hatte gar keinen.
- **Fix:** `roleCapabilities.module.css` mit `.page`-Container (padding-left 32px > 16px Edge-Strip) angelegt und `page.tsx` auf `<main className={styles.page}>` umgestellt — folgt dem Admin-`.page`-Containermuster, nur Design-System-Konventionen.
- **Files modified:** `page.tsx`; **created:** `roleCapabilities.module.css`
- **Commit:** 3d4efaf5

### Live-UAT Bug-Fix B: Accordion klappt beim Switch-Toggle zu (Rule 1 — Bug-Fix)

**5. [Rule 1 - Bug] Aufgeklappte Kategorie klappt nach Capability-Toggle sofort wieder zu**
- **Found during:** Task 3 Live-Verifikation auf Dev-Server :3000 (zweite UAT-Runde)
- **Issue:** Beim Umschalten eines Switch innerhalb einer offenen Accordion-Kategorie klappte das Panel sofort zu.
- **Root cause (verifiziert, nicht geraten):** Kein Event-Bubbling (Switch-Button und Accordion-Header sind Geschwister, nicht verschachtelt). Echte Ursache: `handleGrant`/`handleRevoke` riefen `loadData()` mit `setIsLoading(true)` → die Komponente rendert den vollflächigen `LoadingState` statt des Master-Detail-Layouts → das `Accordion` (uncontrolled interner open-state) wird unmounted → nach dem Refetch startet es mit leerem open-Set.
- **Fix:** (1) `Accordion`-Primitive um abwärtskompatiblen controlled-Modus erweitert (`openIds` + `onOpenChange`). (2) `RoleCapabilityClient` hält den `openCategories`-State und reicht ihn an beide Detail-Instanzen (Desktop + Drawer) durch — übersteht Mutation + Refresh. (3) `loadData(showLoading=false)` beim Mutations-Refresh verhindert das LoadingState-Unmount komplett. Neue Tests: Accordion controlled-Modus + Re-Render-Stabilität (2), Detail open-state übersteht Toggle (1), Client uncontrolled Grant+Refresh hält Accordion offen (1).
- **Files modified:** `Accordion.tsx`, `Accordion.test.tsx`, `RoleCapabilityDetail.tsx`, `RoleCapabilityDetail.test.tsx`, `RoleCapabilityClient.tsx`, `RoleCapabilityClient.test.tsx`
- **Commit:** 56c61809

## Checkpoint-Status

Task 3 (Mobile-/UX-Verifikation): Code-Level abgeschlossen. Drei Live-UAT-Defekte behoben: Doppel-Render (`589d055a`), Links-Clipping (`3d4efaf5`), Accordion-Zuklappen (`56c61809`). Live-Re-Verifikation durch den Orchestrator nach Docker-Rebuild ausstehend.

## Known Stubs

Keine produktionsseitigen Stubs. `RoleCapabilityTable` ist noch importiert in anderen Dateien; die neue UI nutzt sie nicht mehr als Hauptbedienung — die Datei selbst bleibt für eventuelle Rückwärtskompatibilität bestehen.

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade. Die 422-Behandlung im Client ist eine rein frontEnd-seitige Darstellung des bereits in Plan 02 serverseitig gesicherten Guards.

T-94-02 (Frontend-Bypass Disabled-Switch): Switch ist visuell disabled (`aria-disabled`, `cursor: not-allowed`); echter Schutz ist der 422-Server-Guard (Plan 02) — beide Mitigation-Ebenen aktiv.
T-94-07-UI (historische Rolle editierbar): Kontext-Badge "Historische Rolle" + disabled Switches + 422-Inline-Fehler — alle drei Ebenen implementiert.

## Self-Check: PASSED

- capabilityCategories.ts: FOUND (27 Zeilen)
- RoleMasterList.tsx: FOUND (87 Zeilen)
- RoleCapabilityDetail.tsx: FOUND (171 Zeilen, controlled openCategories)
- RoleCapabilityClient.tsx: FOUND (269 Zeilen, useIsMobile-Gate, controlled Accordion-State, loadData(showLoading))
- page.tsx: FOUND (21 Zeilen, <main className={styles.page}>)
- roleCapabilities.module.css: FOUND (24 Zeilen, Container hält Edge-Strip frei)
- Accordion.tsx: FOUND (100 Zeilen, controlled-Modus additiv)
- commit a99f197d: FOUND
- commit 8b91cc7d: FOUND
- commit 589d055a: FOUND (Bug-Fix Desktop/Mobile-Exklusivität)
- commit 3d4efaf5: FOUND (Bug-Fix Links-Clipping)
- commit 56c61809: FOUND (Bug-Fix Accordion-Zuklappen)
- `npx vitest run src/app/admin/role-capabilities src/components/ui/Accordion.test.tsx`: 27 Tests PASS
- `npx tsc --noEmit`: exit 0
- `npx eslint` (berührte Dateien): keine Fehler
