---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
plan: 03
subsystem: ui
tags: [nextjs, react, typescript, url-state, admin]

# Dependency graph
requires:
  - phase: 111-01
    provides: "RoleEntry global_assignment_count/role_kind-Contract (nicht direkt konsumiert, aber Wave-Reihenfolge-Voraussetzung)"
provides:
  - "useUserListFilters.ts: URL-Query-Sync-Hook fuer q/status/role (Analogie useFansubEditMainTab.ts)"
  - "AdminUsersClient.tsx ohne Drawer/Dual-Mode; Zeilen-Klick navigiert per router.push zu /admin/users/{id}?from={Listen-Query-String}"
  - "Entfernte Imports/Usages von UserDetailContent/UserDetailDrawer aus AdminUsersClient.tsx (Voraussetzung fuer die Loeschung dieser Dateien in Plan 111-02)"
affects: [111-02 (loescht UserDetailDrawer.tsx/UserDetailContent.tsx, baut /admin/users/[id] und konsumiert den from-Query-Contract)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams()/router.replace(path, { scroll: false }) als URL-State-Sync-Hook, extrahiert aus der Client-Komponente (Analogie useFansubEditMainTab.ts)"
    - "useMemo fuer aus URL-Params abgeleitete Objekt-Literale, die als useCallback-Dependency dienen (verhindert Endlosschleife aus Render -> neues Objekt -> useEffect -> Render)"

key-files:
  created:
    - frontend/src/app/admin/users/useUserListFilters.ts
    - frontend/src/app/admin/users/AdminUsersClient.test.tsx
  modified:
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/AdminUsers.module.css
    - frontend/src/app/admin/users/page.test.tsx

key-decisions:
  - "params-Objekt in useUserListFilters ueber useMemo(primitive Deps) stabilisiert statt bei jedem Aufruf neu zu erzeugen (Rule-1-Fix, sonst Endlosschleife)"
  - "has_conflicts bleibt bewusst lokaler State (nicht Teil von D-06) und wird erst am listAdminUsersPage-Call-Site an params angehaengt"
  - "role->global_role-Uebersetzung ausschliesslich im params-Rueckgabewert von useUserListFilters, URL-Schluessel bleibt kurz 'role'"

patterns-established:
  - "URL-Query-Sync-Hooks fuer Listen-Filter folgen demselben Muster wie Tab-State-Sync-Hooks (useFansubEditMainTab.ts): lokaler Zwischenwert nur fuer debounce-Felder, sonst direkte Ableitung aus searchParams"

requirements-completed: [D-01, D-06]

# Metrics
duration: 45min
completed: 2026-07-28
---

# Phase 111 Plan 03: Liste ohne Drawer, URL-Filter und From-Navigation Summary

**`AdminUsersClient.tsx` verliert den kompletten Drawer/Dual-Mode-Detail-Pfad (D-01) und synchronisiert Suche/Status/globale Rolle jetzt über die URL via neuem `useUserListFilters`-Hook (D-06); ein Zeilenklick navigiert per `router.push` zu `/admin/users/{id}?from={aktueller Listen-Query-String}` — die Grundlage für den exakten Zurück-Link, den Plan 111-02 als nächstes baut.**

## Performance

- **Duration:** ca. 45 min (davon ~15 min Testsuite-Laufzeit im Hintergrund)
- **Completed:** 2026-07-28T14:34:00Z
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 5 (2 neu, 3 geändert)

## Accomplishments
- Neuer Hook `useUserListFilters.ts` kapselt `q`/`status`/`role` über `useSearchParams()`/`router.replace(path, { scroll: false })`, analog zu `useFansubEditMainTab.ts`; `q` behält den 300ms-Debounce-Zwischenwert bei.
- `AdminUsersClient.tsx`: `useDesktopUserDetails`, `selectedUserId`, das Inline-Desktop-Detail-Panel und die `UserDetailDrawer`-Einbindung sind vollständig entfernt (D-01); Datei ist jetzt 327 statt vormals 395 Zeilen.
- Zeilen-Klick navigiert jetzt zu `/admin/users/{id}${currentQuery ? '?from=' + encodeURIComponent(currentQuery) : ''}` — exakt der Kontrakt, den Plan 111-02s `UserDetailPageClient.tsx` als `backHref` konsumieren wird.
- Rohes `<label htmlFor="role-filter">` durch `FormField label="Globale Rolle" htmlFor="role-filter"` ersetzt (Pitfall 5, CLAUDE.md-Pflicht-Primitive).
- `AdminUsers.module.css` bereinigt: `desktopDetailPanel`/`-Header`/`-Title`/`-Meta`, `roleFilterLabel`, `selectedRow` entfernt (nicht mehr referenziert).

## Task Commits

1. **Task 1 RED: page.test.tsx überarbeitet, AdminUsersClient.test.tsx neu (URL-Round-Trip)** - `0e6faf72` (test)
2. **Task 2 GREEN: useUserListFilters extrahiert, AdminUsersClient umgebaut, CSS bereinigt** - `6a7eaf58` (feat)

**Plan metadata:** folgt (dieser Commit)

## Files Created/Modified
- `frontend/src/app/admin/users/useUserListFilters.ts` - neuer URL-Query-Sync-Hook für q/status/role
- `frontend/src/app/admin/users/AdminUsersClient.tsx` - Drawer/Dual-Mode entfernt, Zeilen-Klick navigiert per `router.push`, `FormField`-Wrapper für Rollen-Select
- `frontend/src/app/admin/users/AdminUsers.module.css` - nicht mehr referenzierte Klassen entfernt
- `frontend/src/app/admin/users/page.test.tsx` - `clicking_row_opens_drawer`/`clicking_row_keeps_table_visible_on_desktop` ersetzt durch `clicking_row_navigates_to_detail_route`
- `frontend/src/app/admin/users/AdminUsersClient.test.tsx` (neu) - URL-Filter-Round-Trip-Tests (Schreiben/Lesen)

## Decisions Made
- `params`-Objekt in `useUserListFilters` über `useMemo` mit primitiven Abhängigkeiten (`limit`, `offset`, `q`, `role`, `status`) stabilisiert, statt bei jedem Hook-Aufruf ein neues Objektliteral zurückzugeben.
- `has_conflicts` bleibt lokaler State in `AdminUsersClient.tsx` (kein URL-Parameter, wie von D-06/UI-SPEC vorgegeben) und wird erst unmittelbar vor dem `listAdminUsersPage`-Aufruf an das Params-Objekt angehängt.
- Die Übersetzung `role` (URL) → `global_role` (API-Parameter) erfolgt ausschließlich im von `useUserListFilters` zurückgegebenen `params`-Objekt, nicht in der URL selbst.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Endlosschleife durch nicht-memoisiertes `params`-Objekt**
- **Found during:** Task 2 (GREEN-Verifikation, flakiger Test `clicking_row_navigates_to_detail_route`)
- **Issue:** `useUserListFilters` gab bei jedem Aufruf ein neues `params`-Objektliteral zurück. Der darauf referenzierende `loadUsers`-`useCallback` in `AdminUsersClient.tsx` wurde dadurch bei jedem Render neu erzeugt, was den `useEffect(() => { loadUsers() }, [loadUsers])` in eine Endlosschleife aus Render → neues `params` → neuer `loadUsers` → Effect-Rerun trieb. Sichtbar als flakiger Test, der abwechselnd im geladenen und im ladenden Zustand ("Inhalt wird vorbereitet") hing.
- **Fix:** `params` in `useUserListFilters.ts` über `useMemo` mit den primitiven Werten `limit`/`offset`/`q`/`role`/`status` als Abhängigkeiten stabilisiert.
- **Files modified:** `frontend/src/app/admin/users/useUserListFilters.ts`
- **Verification:** `npx vitest run src/app/admin/users --reporter=dot` dreimal in Folge reproduziert grün (11/11), vorher intermittierend 1 Fehlschlag.
- **Committed in:** `6a7eaf58` (Task 2 GREEN-Commit)

---

**Total deviations:** 1 auto-fixed (1 Bug)
**Impact on plan:** Der Fix war notwendig, damit die vom Plan geforderte GREEN-Verifikation zuverlässig (nicht nur zufällig) grün ist. Kein Scope-Creep — reine Korrektheits-Fix innerhalb der bereits geplanten Hook-Datei.

## Issues Encountered
- **Stale `.git/index.lock`:** Ein Commit-Versuch für Task 2 schlug mit "Unable to create index.lock: File exists" fehl. Verifiziert über `ps -W` (keine laufenden `git.exe`-Prozesse), danach ausschließlich die verwaiste Lock-Datei entfernt (kein `git clean`/`reset --hard`/`stash`) und der Commit erfolgreich wiederholt.
- **Docker Desktop nicht erreichbar:** `docker ps` lieferte `500 Internal Server Error` für die Docker-Engine-API. Die im Plan vorgesehene Live-Verifikation ("Docker: `docker restart team4sv30-frontend` + Strg+F5, Liste filtern, URL prüfen, Reload prüft Filterwerte") konnte in dieser Session **nicht** durchgeführt werden. Alle code-seitigen Verifikationen (Vitest-Zielsuite 11/11 grün, `tsc --noEmit` sauber, ESLint sauber) sind grün; die Live-Browser-Bestätigung bleibt für die finale Phase-111-UAT offen (analog zu 111-01-SUMMARY.md).
- **Volle Testsuite (`npm test`):** 5 von 210 Testdateien (11 von 1383 Tests) schlagen fehl — alle außerhalb des Scopes dieses Plans (`ReportModal.test.tsx`, `admin/anime/page.test.tsx`, `publicPageWidthContract.test.ts`, `me/profile/page.test.tsx`, `useAdminAnimeCreateController.test.ts`), über zwei unabhängige Volltest-Läufe identisch reproduziert. Der gezielte Lauf `npx vitest run src/app/admin/users` war durchgehend 11/11 grün. Vollständige Liste und Details in `deferred-items.md` (Scope Boundary, keine Code-Änderung vorgenommen).

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- Plan 111-02 kann jetzt sicher `UserDetailContent.tsx`/`UserDetailDrawer.tsx` löschen — alle Imports/Usages dieser Dateien wurden bereits aus `AdminUsersClient.tsx` entfernt.
- Der `from=`-Query-Contract (`router.push(\`/admin/users/${id}?from=${encodeURIComponent(currentQuery)}\`)`) ist implementiert und testabgesichert; Plan 111-02s `UserDetailPageClient.tsx` kann `useSearchParams().get('from')` direkt konsumieren.
- Offener Punkt: Live-Browser-Verifikation (Docker) und die vollständige Liste der 5 pre-existing fehlschlagenden Testdateien außerhalb dieses Scopes stehen für die finale Phase-111-UAT aus (siehe `deferred-items.md`).

---
*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/users/useUserListFilters.ts`
- FOUND: `frontend/src/app/admin/users/AdminUsersClient.tsx`
- FOUND: `frontend/src/app/admin/users/AdminUsersClient.test.tsx`
- FOUND: `frontend/src/app/admin/users/page.test.tsx`
- FOUND: `frontend/src/app/admin/users/AdminUsers.module.css`
- FOUND: Commit `0e6faf72` (test: RED)
- FOUND: Commit `6a7eaf58` (feat: GREEN)
