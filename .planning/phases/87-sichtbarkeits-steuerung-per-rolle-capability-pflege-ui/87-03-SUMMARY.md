---
phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
plan: "03"
subsystem: ui
tags: [permissions, capability-registry, frontend, nextjs, react, ui-primitives, admin]
dependency_graph:
  requires:
    - "87-01: TypeScript-Typen RoleCapabilityMatrix/RoleEntry/ActionEntry (frontend/src/types/admin-capability.ts)"
    - "87-02: GET/PUT/DELETE /admin/role-capabilities Backend-Endpunkte + Lockout-Guard-409"
  provides:
    - "Route /admin/role-capabilities mit PlatformAdminGate (Server Component)"
    - "RoleCapabilityClient (CSR State + Fetching + Modal-Orchestrierung)"
    - "RoleCapabilityTable (Rollen×Actions-Matrix mit Zell-Logik)"
    - "GrantCapabilityModal + RevokeCapabilityModal (Pending-State + Inline-Error)"
    - "api.ts: listRoleCapabilities, grantRoleCapability, revokeRoleCapability"
    - "Nav-Link Capability-Verwaltung auf /admin-Übersicht"
  affects:
    - "Zukünftige Capability-Registry-Erweiterungen konsumieren dieselbe Matrix-UI und api.ts-Funktionen"
tech_stack:
  added: []
  patterns:
    - "Vergeben/Entziehen-Modals mit isMutating-disabled-Guard gegen Doppel-Submit (T-87-10)"
    - "HTTP-409-Lockout als Inline-Fehler im Modal statt Toast — Modal bleibt offen (T-87-11)"
    - "Standalone-Aktionen als read-only Badge Systemaktion ohne onClick-Handler (T-87-12)"
    - "Sofort-Wirksamkeits-Hinweis als dezenter <p>-Text unter PageHeader (kein Toast)"
    - "api.ts-Client liest Matrix direkt aus Response-Body (kein data-Envelope) — Contract-konform"
key_files:
  created:
    - frontend/src/app/admin/role-capabilities/page.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx
    - frontend/src/app/admin/role-capabilities/GrantCapabilityModal.tsx
    - frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/page.tsx
decisions:
  - "RoleCapabilityClient bei 243 Zeilen gehalten — kein helpers.ts-Split nötig (Schwelle 450)"
  - "Kategorie-Filterung clientseitig via Select aus matrix.all_actions abgeleitet — kein zusätzlicher API-Aufruf"
  - "listRoleCapabilities liest Matrix direkt aus Body (kein body.data) — Handler liefert die Matrix laut Contract unverpackt"
requirements-completed: [D-04, D-05, D-06, D-07]
metrics:
  duration: "~12 Minuten Implementierung (Tasks 1-2) + Human-Verify-Checkpoint über Nacht"
  completed: "2026-06-19"
  tasks: 3
  files: 8
---

# Phase 87 Plan 03: Capability-Pflege-UI Summary

**Vollständige /admin/role-capabilities-Pflege-UI: Rollen×Actions-Matrix-Tabelle mit Vergeben/Entziehen-Modals, Lockout-Guard-409-Inline-Fehler, Systemaktion-Badges, Sofort-Wirksamkeits-Hinweis und Nav-Link — ausschließlich @/components/ui-Primitives, GREEN-Tests, Human-Verify approved.**

## Performance

- **Duration:** ~12 Min Implementierung (Tasks 1-2); Human-Verify-Checkpoint über Nacht ausstehend
- **Started:** 2026-06-18T12:36:40Z (erster Task-Commit)
- **Completed:** 2026-06-19T06:27:00Z (Checkpoint approved + Plan-Closeout)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 8 (6 erstellt, 2 modifiziert)

## Accomplishments

- Route `/admin/role-capabilities` als Server Component mit `PlatformAdminGate` (D-04, T-87-09)
- Rollen×Actions-Matrix-Tabelle: Vergeben (secondary) / Entziehen (danger) pro Zelle, Systemaktion-Badge für Standalone-Aktionen (kein Button, T-87-12)
- Vergabe- und Entzugs-Modal mit Pending-State (`isMutating`-disabled, T-87-10) und Inline-Fehler (`role="alert"`)
- HTTP-409-Lockout-Guard wird als Inline-Fehler im Modal angezeigt — Modal bleibt offen, kein Auto-Reload (D-07, T-87-11)
- Sofort-Wirksamkeits-Hinweis als dezenter `<p>`-Text unter PageHeader (D-06, kein Toast)
- Drei api.ts-Funktionen (`listRoleCapabilities`/`grantRoleCapability`/`revokeRoleCapability`) analog zum bestehenden `revokeAdminUserGlobalRole`-Muster
- Nav-Link "Capability-Verwaltung" auf der /admin-Übersicht
- Alle UI-Elemente nutzen @/components/ui-Primitives (D-05, kein natives button/select/input), korrekte deutsche Umlaute

## Task Commits

1. **Task 1: api.ts + Komponenten-Dateien + GREEN-Tests** - `84a88fc7` (feat)
2. **Task 2: Nav-Link Capability-Verwaltung** - `f3c84309` (feat)
3. **Task 3: Human-Verify-Checkpoint** - approved durch Nutzer ("pass")

**Integrationsfix während Live-Verifikation:** `baf1b7fb` (fix — Envelope-Mismatch, siehe Deviations)

## Files Created/Modified

- `frontend/src/app/admin/role-capabilities/page.tsx` (15 Zeilen) - Server Component, PlatformAdminGate wraps RoleCapabilityClient
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (243 Zeilen) - CSR State-Management, Fetching, Modal-Orchestrierung, Kategorie-Filter
- `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx` (111 Zeilen) - Rollen×Actions-Tabelle mit Zell-Logik (granted/standalone)
- `frontend/src/app/admin/role-capabilities/GrantCapabilityModal.tsx` (55 Zeilen) - Vergabe-Modal mit Pending-State + Inline-Error
- `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` (65 Zeilen) - Entzugs-Modal mit 409-Lockout-Handling + Inline-Error
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` (106 Zeilen) - GREEN-Tests: Loading, Matrix-Render, 409-Inline-Fehler
- `frontend/src/lib/api.ts` - Drei neue Capability-API-Funktionen am Dateiende
- `frontend/src/app/admin/page.tsx` - Nav-Link auf /admin/role-capabilities

## Decisions Made

- `RoleCapabilityClient.tsx` blieb bei 243 Zeilen — kein `helpers.ts`-Split nötig (Schwelle 450)
- Kategorie-Filterung clientseitig via `Select` aus `matrix.all_actions` abgeleitet — kein zusätzlicher API-Aufruf
- `listRoleCapabilities` liest die Matrix direkt aus dem Response-Body (kein `body.data`-Envelope), da der Handler die Matrix laut Contract unverpackt liefert

## Deviations from Plan

### Integrationsdefekte (während Live-Verifikation vom Orchestrator gefunden & behoben)

**1. [Rule 3 - Blocking] Stale Docker-Backend auf :8092 → API-404**
- **Found during:** Task 3 (Human-Verify, Live-Test gegen Dev-Server)
- **Issue:** Das Docker-Backend-Image war ~15h alt; die in Phase 87-02 hinzugefügten Capability-Routen waren im laufenden Container nicht enthalten → `GET /admin/role-capabilities` lieferte 404, die Matrix lud nicht.
- **Fix:** `docker compose up -d --build team4sv30-backend` — Backend neu gebaut und gestartet. **Kein Code-Defekt**; reines Laufzeit-/Deploy-Artefakt (siehe Memory: "Backend ist Docker auf :8092").
- **Files modified:** keine (Container-Rebuild)
- **Committed in:** —

**2. [Rule 1 - Bug] Envelope-Mismatch in listRoleCapabilities()**
- **Found during:** Task 3 (Human-Verify, Live-Test)
- **Issue:** `listRoleCapabilities()` in `frontend/src/lib/api.ts` entpackte fälschlich `body.data`, der Handler liefert die `RoleCapabilityMatrix` laut Contract aber direkt im Body. Folge: `matrix` blieb `undefined`, die Tabelle renderte nicht. Der Unit-Test mockte die Funktion selbst und fing den Defekt daher nicht.
- **Fix:** Client liest den Response-Body direkt als Matrix.
- **Files modified:** `frontend/src/lib/api.ts`
- **Committed in:** `baf1b7fb` (separater Fix-Commit durch Orchestrator)

---

**Total deviations:** 2 (1 Laufzeit-/Deploy-Artefakt ohne Code-Änderung, 1 Bug-Fix)
**Impact on plan:** Beide notwendig für funktionierende End-to-End-UI. Kein Scope-Creep. Lektion: API-Client-Funktionen sollten gegen den realen Envelope (nicht nur gemockt) verifiziert werden.

## Issues Encountered

- Der Human-Verify-Checkpoint erstreckte sich über Nacht (Wartezeit auf Nutzer-Verifikation). Reine Implementierungszeit für Tasks 1-2 lag bei ~12 Minuten.

## Known Stubs

None — keine Stubs im Produktionscode. Alle Komponenten sind an echte api.ts-Endpunkte verdrahtet.

## Threat Flags

Keine neue Sicherheitsoberfläche außerhalb des Plan-Threat-Models. Alle vier Frontend-Threats mitigiert:

| Threat | Status |
|--------|--------|
| T-87-09: Capability-UI ohne Auth-Check | Mitigated — PlatformAdminGate auf page.tsx + Backend-Gate |
| T-87-10: Doppel-Submit ohne disabled | Mitigated — isMutating disabled alle Modal-Buttons |
| T-87-11: Lockout-Fehler als Erfolg interpretiert | Mitigated — ApiError(409) als Inline-Fehler, Modal bleibt offen |
| T-87-12: Standalone-Aktion klickbar | Mitigated — kein Button, nur read-only Systemaktion-Badge |

## Self-Check: PASSED

- `frontend/src/app/admin/role-capabilities/page.tsx` — existiert, 15 Zeilen ✓
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` — existiert, 243 Zeilen ✓
- `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx` — existiert, 111 Zeilen ✓
- `frontend/src/app/admin/role-capabilities/GrantCapabilityModal.tsx` — existiert, 55 Zeilen ✓
- `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` — existiert, 65 Zeilen ✓
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` — existiert, 106 Zeilen ✓
- Commit `84a88fc7` — vorhanden ✓
- Commit `f3c84309` — vorhanden ✓
- Commit `baf1b7fb` (Integrationsfix) — vorhanden ✓
- Human-Verify-Checkpoint — approved ("pass") ✓

## Next Phase Readiness

- Phase 87 (Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI) ist mit Plan 03 vollständig abgeschlossen (alle 3 Pläne done).
- Capability-Pflege-UI live unter /admin/role-capabilities, Backend-Routen im Docker-Backend verfügbar.
- Hinweis für Folgephasen: nach neuen Go-Routen `docker compose up -d --build team4sv30-backend` ausführen, sonst API-404 trotz korrektem Code.

---
*Phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui*
*Completed: 2026-06-19*
