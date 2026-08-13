---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
plan: 04
subsystem: ui
tags: [rbac, admin-users, role-capabilities, react, cross-linking]

# Dependency graph
requires:
  - phase: 111-01
    provides: "listRoleCapabilities()-Matrix mit RoleEntry[] (role_code-basiertes Lookup)"
provides:
  - "resolveRoleLink.ts Lookup-Utility (roleCode, matrix) -> string | null"
  - "User→Rolle-Querverlinkung ('Was darf diese Rolle?') auf UserGroupRightsTab fuer auflösbare granted_roles"
  - "Regressionstest, der belegt dass UserGlobalRolesTab strukturell nie verlinkt (Pitfall 1)"
affects: [111-05, admin-role-capabilities]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-seitiges Rollen-Matching gegen bereits geladene Capability-Matrix statt Backend-Enrichment"
    - "Unabhängiger, nicht-blockierender Parallel-Fetch (listRoleCapabilities) neben dem Haupt-Datenfetch einer Tab-Komponente"

key-files:
  created:
    - frontend/src/app/admin/users/resolveRoleLink.ts
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
  modified:
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx

key-decisions:
  - "UserGlobalRolesTab.tsx bleibt bewusst unveraendert — globale App-Rollen sind laut 111-RESEARCH.md Pitfall 1 strukturell nie in listRoleCapabilities() auflösbar; ein Match-Versuch dort waere totes Coding."
  - "Capability-Matrix-Fetch in UserGroupRightsTab ist unabhaengig vom Haupt-Fetch (getAdminUserGroupRights) und schlaegt bei Fehlern lautlos fehl — Rollen bleiben dann einfach unverlinkt statt ein Fehlerbanner zu zeigen."

patterns-established:
  - "resolveRoleLink(roleCode, matrix): reine Lookup-Funktion ohne Zusatz-Request, wiederverwendbar fuer weitere RBAC-Querverlinkungen"

requirements-completed: [D-04]

# Metrics
duration: 25min
completed: 2026-07-28
---

# Phase 111 Plan 04: RBAC-Querverlinkung User→Rolle Summary

**"Was darf diese Rolle?"-Link auf UserGroupRightsTab via client-seitigem resolveRoleLink-Lookup gegen listRoleCapabilities(); UserGlobalRolesTab bewusst unverlinkt, mit Regressionstest abgesichert**

## Performance

- **Duration:** ca. 25 min
- **Started:** 2026-07-28T15:53:00Z (erster Testlauf)
- **Completed:** 2026-07-28T16:13:16Z
- **Tasks:** 2/2
- **Files modified:** 4 (1 neu: resolveRoleLink.ts, 2 neue Testdateien, 1 geändert: UserGroupRightsTab.tsx)

## Accomplishments
- `resolveRoleLink(roleCode, matrix)` als reine, wiederverwendbare Lookup-Utility implementiert
- `UserGroupRightsTab` zeigt jetzt neben jeder auflösbaren `granted_role`-Badge einen `Button variant="ghost" size="sm"` mit Text „Was darf diese Rolle?" und Link zu `/admin/role-capabilities?role={role_code}`
- Regressionstest sichert explizit ab, dass `UserGlobalRolesTab` (globale App-Rollen) niemals einen Link rendert — verhindert künftige UAT-Fehlmeldung „Link fehlt"

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Tests für auflösbare/unauflösbare Rollen-Links + Regressionsschutz** - `95ed75ad` (test)
2. **Task 2: GREEN — resolveRoleLink.ts implementieren, in UserGroupRightsTab verdrahten** - `f1a9ebeb` (feat)

**Plan metadata:** (dieser Commit, folgt direkt nach diesem SUMMARY)

## Files Created/Modified
- `frontend/src/app/admin/users/resolveRoleLink.ts` - Reine Lookup-Utility: `role_code` gegen `RoleCapabilityMatrix.roles` matchen, Link-URL oder `null` liefern
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - Paralleler `listRoleCapabilities()`-Fetch + Rollen-Link neben jeder `granted_roles`-Badge
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx` (NEU) - Regressionstest „global role never links"
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` (NEU) - Tests „resolvable role link" / „unresolvable role no link"

## Decisions Made
- `UserGlobalRolesTab.tsx` unangetastet gelassen (Pitfall 1 aus 111-RESEARCH.md): globale App-Rollen (`platform_admin`/`content_admin`/`user`) leben in einem zu `role_definitions` disjunkten Namensraum und sind daher strukturell nie in `listRoleCapabilities()` auflösbar — kein Matching-Code dort ergänzt, stattdessen durch Test abgesichert.
- Capability-Matrix wird in `UserGroupRightsTab` unabhängig vom Haupt-Datenfetch geladen (eigener `useEffect`, kein Blocking, Fehler werden lautlos verschluckt) — unkritisch, da diese Sektion laut D-03 ohnehin sofort geladen wird.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Docker nicht erreichbar:** Der Live-UAT-Schritt aus der `<verification>`-Sektion des Plans (`docker restart team4sv30-frontend` + Browser-Check auf `/admin/users/[id]`) konnte in dieser Sandbox nicht durchgeführt werden — `docker ps` liefert einen 500-Fehler (Docker Desktop Pipe nicht erreichbar). Der komplette Vitest-Scope (`src/app/admin/users` — 7 Dateien/18 Tests) ist grün verifiziert; die visuelle/funktionale Live-Bestätigung im Browser steht noch aus.

**11 vorbestehende Testfehler außerhalb des Scopes:** Der volle `npx vitest run` (1390 Tests) zeigt 11 fehlgeschlagene Tests in 5 Dateien, alle außerhalb dieses Plans (`src/app/me/profile/page.test.tsx`, `src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` — Umgebungs-URL-Diskrepanz `http://localhost:8092/...` vs. relativer Pfad, sowie Timing-Probleme in `waitFor`). Scope-Boundary-Regel angewendet: nicht gefixt, da nicht durch diesen Plan verursacht.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- D-04 vollständig geschlossen — `resolveRoleLink.ts` steht als wiederverwendbares Muster für weitere RBAC-Querverlinkungen bereit (z. B. Plan 111-05 D-05 Rolle→User-Richtung).
- Live-Browser-UAT (Docker-Restart + `/admin/users/[id]` mit echten `fansub_group_members`-Daten) steht aus und sollte im finalen Phase-111-UAT nachgeholt werden.

---
*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/users/resolveRoleLink.ts
- FOUND: frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx
- FOUND: frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
- FOUND: commit 95ed75ad (test)
- FOUND: commit f1a9ebeb (feat)
