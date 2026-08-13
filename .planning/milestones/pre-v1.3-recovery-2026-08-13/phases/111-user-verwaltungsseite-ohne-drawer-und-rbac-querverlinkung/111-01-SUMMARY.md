---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
plan: 01
subsystem: api
tags: [go, rbac, postgres, openapi, typescript]

# Dependency graph
requires:
  - phase: 87-03 (RBAC Capability Matrix)
    provides: ListCapabilityMatrix()/RoleEntry-Contract, den dieser Plan additiv erweitert
provides:
  - "CapabilityMatrixRoleEntry (Go)/RoleEntry (OpenAPI+TS) mit global_assignment_count/role_kind"
  - "CountGlobalRoleAssignments()-Aggregat-Query gegen app_user_global_roles"
  - "ListCapabilityMatrix-Handler liefert 3 synthetische, nicht-editierbare global_app_role-Zeilen (platform_admin/content_admin/user) mit korrektem Impact-Count"
affects: [111-05 (RoleMasterList Impact-Count-UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synthetische, schreibgeschützte Rollen-Zeilen werden im Handler (nicht im Repository) vor matrix.Roles vorangestellt — Repository bleibt permissions-frei"
    - "Fail-open bei Aggregat-Fehlern: CountGlobalRoleAssignments-Fehler wird nur geloggt, Zählwerte fallen auf 0 zurück (analog ReloadCache-Fail-Safe)"

key-files:
  created: []
  modified:
    - backend/internal/repository/authz_capability_mutations.go
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts

key-decisions:
  - "Impact-Count zählt AUSSCHLIESSLICH globale Rollenzuweisungen aus app_user_global_roles (GROUP BY role) — NICHT über RoleEntry.assignable gefiltert, da dieses Feld die 6 fansub-group-zuweisbaren Rollen markiert (111-RESEARCH.md Pitfall 1)."
  - "Die drei synthetischen globalen App-Rollen-Zeilen werden matrix.Roles vorangestellt (RESEARCH Open Question 2, RESOLVED in Plan 111-01)."
  - "GlobalAssignmentCount ist *int (Pointer), damit role_definitions-Zeilen weiterhin null/fehlend liefern statt fälschlich 0."

patterns-established:
  - "role_kind='global_app_role' als eigene Kategorie statt Wiederverwendung von capability_editable/assignable für die 3 globalen App-Rollen"

requirements-completed: [D-05]

# Metrics
duration: 25min
completed: 2026-07-28
---

# Phase 111 Plan 01: RBAC-Backend-Fundament fuer D-05 Impact-Count Summary

**`ListCapabilityMatrix()` liefert jetzt drei synthetische, nicht-editierbare `global_app_role`-Zeilen (platform_admin/content_admin/user) mit einem per `CountGlobalRoleAssignments()` aggregierten `global_assignment_count`, wodurch die in 111-RESEARCH.md Pitfall 1 dokumentierte Datenmodell-Lücke (globale App-Rollen existieren nicht in `role_definitions`) geschlossen wird.**

## Performance

- **Duration:** ca. 25 min
- **Completed:** 2026-07-28T13:38:44Z
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 5

## Accomplishments
- `CapabilityMatrixRoleEntry` (Go), OpenAPI-Schema `RoleEntry` und TS-Interface `RoleEntry` tragen synchron `global_assignment_count`/`role_kind` mit gegenseitigen Kommentarverweisen.
- Neue Repository-Methode `CountGlobalRoleAssignments()` aggregiert `app_user_global_roles GROUP BY role` in eine `map[string]int`.
- `ListCapabilityMatrix`-Handler stellt drei synthetische Rollen-Zeilen (`platform_admin`/`content_admin`/`user`) mit `role_kind="global_app_role"`, `assignable=false`, `capability_editable=false` und korrektem `global_assignment_count` voran — fail-open bei Aggregat-Fehler.
- Deutsche Labels (`Plattform-Admin`/`Content-Admin`/`Benutzer`) im Backend hartkodiert, synchron zu `UserGlobalRolesTab.tsx roleLabel()` (Pitfall 2), mit Kommentar-Gegenverweis.

## Task Commits

Jeder Task wurde atomar committet (Task 2 als RED/GREEN TDD-Paar):

1. **Task 1: Contracts erweitern (Go-Struct, OpenAPI, TS-Typ)** - `f5b51044` (feat)
2. **Task 2 RED: Test fuer synthetische globale Rollen-Zeilen** - `37ba9b40` (test)
2. **Task 2 GREEN: CountGlobalRoleAssignments + Handler-Merge** - `d943773c` (feat)

_Hinweis: Die bestehende Regression `TestListCapabilityMatrixAssignableEnrichment` wurde im RED-Commit von 2 auf 5 erwartete Rollen angepasst, da `ListCapabilityMatrix` seit diesem Plan unconditionally 3 synthetische Zeilen voranstellt (siehe Deviations)._

**Plan metadata:** folgt (dieser Commit)

## Files Created/Modified
- `backend/internal/repository/authz_capability_mutations.go` - `GlobalAssignmentCount`/`RoleKind`-Felder auf `CapabilityMatrixRoleEntry`, neue Methode `CountGlobalRoleAssignments()`
- `backend/internal/handlers/admin_capability_handler.go` - `capabilityMutationRepo`-Interface erweitert, `globalAppRoleCodes`/`globalAppRoleLabels`, Handler-Merge synthetischer Zeilen in `ListCapabilityMatrix`
- `backend/internal/handlers/admin_capability_handler_test.go` - Stub um `CountGlobalRoleAssignments` ergaenzt, neuer Test `TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries`, Zaehl-Erwartung in `TestListCapabilityMatrixAssignableEnrichment` angepasst
- `shared/contracts/admin-capabilities.yaml` - `RoleEntry`-Schema um `global_assignment_count`/`role_kind` ergaenzt
- `frontend/src/types/admin-capability.ts` - `RoleEntry`-Interface synchron ergaenzt

## Decisions Made
- Impact-Count zaehlt ausschliesslich globale Rollenzuweisungen (D-05), nicht ueber `assignable` gefiltert (Pitfall 1 vermieden).
- Synthetische Zeilen stehen am Anfang der `roles`-Liste (RESEARCH Open Question 2, RESOLVED).
- `GlobalAssignmentCount` als Pointer, damit bestehende `role_definitions`-Zeilen weiterhin `null`/fehlend statt `0` liefern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Regression] Bestehender Test `TestListCapabilityMatrixAssignableEnrichment` erwartete exakt 2 Rollen**
- **Found during:** Task 2 (GREEN-Verifikation)
- **Issue:** Nach der GREEN-Implementierung stellt `ListCapabilityMatrix` unconditionally 3 synthetische globale Rollen-Zeilen voran. Der bestehende Test prüfte `len(response.Roles) != 2` gegen die 2 Stub-Rollen und schlug mit 5 tatsächlichen Rollen fehl.
- **Fix:** Erwartung auf 5 Rollen (2 Stub + 3 synthetisch) angepasst; die Pro-Rolle-Assignable-Prüfung bleibt unverändert korrekt, da `permissions.IsKnownFansubGroupRole` für die drei globalen Rollen ebenfalls `false` liefert.
- **Files modified:** `backend/internal/handlers/admin_capability_handler_test.go`
- **Verification:** `go test ./internal/handlers/... -run "TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries|TestListCapabilityMatrixAssignableEnrichment" -v` → beide PASS
- **Committed in:** `37ba9b40` (Task 2 RED-Commit)

**2. [Rule 3 - Blocking] Stale `.git/index.lock` bei `git add -p`**
- **Found during:** Commit-Vorbereitung für Task 1
- **Issue:** Ein interaktiver `git add -p`-Aufruf (zum sauberen Splitten der zwei Go-Hunks in `authz_capability_mutations.go` auf Task 1/Task 2) wurde durch unzureichende Stdin-Eingabe unterbrochen und hinterließ ein verwaistes `.git/index.lock`.
- **Fix:** Verifiziert, dass kein `git.exe`-Prozess mehr läuft (`ps aux`, `tasklist`), dann ausschließlich die stale Lock-Datei entfernt (kein `git clean`/`reset --hard`/`stash`) und `git add -p` mit vollständiger Eingabe wiederholt.
- **Verification:** `git status --short` zeigte danach keine Staged-Reste; Hunk-Split war korrekt (13 Zeilen Struct-Felder in Task 1, Rest in Task 2).
- **Committed in:** n/a (reine Tooling-Wiederherstellung vor `f5b51044`)

---

**Total deviations:** 2 auto-fixed (1 Bug/Regression, 1 Blocking/Tooling)
**Impact on plan:** Beide Anpassungen waren notwendig, um die vom Plan selbst geforderte GREEN-Verifikation ("TestListCapabilityMatrixAssignableEnrichment bleibt grün") korrekt zu erfüllen bzw. um überhaupt sauber committen zu können. Kein Scope-Creep.

## Issues Encountered
- Docker Desktop war in dieser Session nicht erreichbar (`docker ps` → 500 Internal Server Error für die Docker-Engine-API). Die im Plan vorgesehene Live-Verifikation ("Nach Docker-Rebuild: `GET /api/v1/admin/role-capabilities` liefert drei `role_kind=\"global_app_role\"`-Einträge") konnte daher **nicht** durchgeführt werden. Alle code-seitigen Verifikationen (Go-Build, Go-Tests inkl. neuem Test, `tsc --noEmit`) sind grün; die Live-API-Bestätigung gegen den echten Docker-Container bleibt für die finale Phase-111-UAT offen (analog zu bereits dokumentierten Docker-Nichtverfügbarkeits-Fällen in früheren Phasen-Summaries).

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- Backend-Contract (`global_assignment_count`/`role_kind`) und Repository-/Handler-Logik sind vollständig für Plan 111-05 (Frontend-Darstellung des Impact-Counts in `RoleMasterList`) nutzbar.
- Offener Punkt: Live-Bestätigung gegen den echten Backend-Container (Docker war in dieser Session nicht erreichbar) sollte vor/während der finalen Phase-111-UAT nachgeholt werden.
- D-04 (User→Rolle-Link) ist nicht Teil dieses Plans und bleibt für einen späteren Plan (Frontend-Matching gegen `RoleEntry[]`) offen.

---
*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: `.planning/phases/111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung/111-01-SUMMARY.md`
- FOUND: Commit `f5b51044` (feat: Contracts erweitern)
- FOUND: Commit `37ba9b40` (test: RED)
- FOUND: Commit `d943773c` (feat: GREEN)
- FOUND: `CountGlobalRoleAssignments` in `backend/internal/repository/authz_capability_mutations.go`
- FOUND: `globalAppRoleCodes` in `backend/internal/handlers/admin_capability_handler.go`
