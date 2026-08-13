---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, accordion, admin]

# Dependency graph
requires:
  - phase: 111-03
    provides: "AdminUsersClient.tsx navigiert per router.push zu /admin/users/{id}?from={Listen-Query-String}; Imports von UserDetailContent/UserDetailDrawer bereits entfernt"
provides:
  - "Neue, eigene Detailroute /admin/users/[id] unter PlatformAdminGate (D-01)"
  - "UserDetailPageClient.tsx: kontrollierter Accordion mode=multi mit 9 Sektionen, Default-Open fuer Uebersicht/Globale-Rollen/Gruppenmitgliedschaften/Gruppenrechte, Lazy-Load fuer die restlichen 5 (D-02/D-03)"
  - "Accordion.tsx additiv um keepMountedIds erweitert (non-breaking): geschlossene, bereits geladene Panels bleiben ueber hidden im DOM statt zu unmounten"
  - "Zurueck-Link liest ?from= und faellt ohne Parameter auf /admin/users zurueck (D-06 Teil)"
affects: ["111-01 (RBAC-Cross-Link-Contract, falls User->Rolle-Links spaeter in UserGlobalRolesTab/UserGroupRightsTab ergaenzt werden)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PlatformAdminGate-Server-Wrapper + eigenstaendige 'use client'-Komponente, die useParams/useSearchParams selbst liest (kein Props-Durchreichen von page.tsx)"
    - "openIds/loadedIds-Doppel-State fuer Accordion-Lazy-Load: openIds steuert Sichtbarkeit, loadedIds (nur wachsend) steuert einmaliges Laden UND jetzt zusaetzlich keepMountedIds fuer Re-Fetch-Schutz"
    - "Accordion.keepMountedIds (neu, optional): haelt bereits geladene Panels bei geschlossenem Zustand ueber das native hidden-Attribut im DOM, statt sie komplett zu unmounten"

key-files:
  created:
    - frontend/src/app/admin/users/[id]/page.tsx
    - frontend/src/app/admin/users/[id]/page.test.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx
  modified:
    - frontend/src/components/ui/Accordion.tsx
  deleted:
    - frontend/src/app/admin/users/UserDetailContent.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.test.tsx

key-decisions:
  - "Accordion.tsx additiv um optionales keepMountedIds erweitert statt eine neue eigene Akkordeon-Implementierung zu bauen — CLAUDE.md verlangt @/components/ui-Primitives, ein Duplikat waere ein Verstoss."
  - "UserDetailPageClient fuehrt einen eigenen, von den 9 Tab-Komponenten unabhaengigen Fetch von getAdminUserOverview nur fuer PageHeader-Titel/Status aus (kein Prop-Durchreichen an UserOverviewTab)."
  - "Fetch-on-mount fuer den Header-Status per eslint-disable-next-line react-hooks/set-state-in-effect (etabliertes Projektmuster, siehe useFansubEditGroupLoad.ts), da async setState-nach-await vom Linter trotzdem als Anti-Pattern markiert wird."

patterns-established:
  - "Accordion.keepMountedIds: wiederverwendbares Muster fuer lazy-geladene Akkordeon-Sektionen, die beim Schliessen NICHT unmounten sollen (verhindert Re-Fetch-Regressionen bei zukuenftigen Akkordeon-Hosts)."

requirements-completed: [D-01, D-02, D-03, D-06]

# Metrics
duration: 50min
completed: 2026-07-28
---

# Phase 111 Plan 02: Detailroute /admin/users/[id] ohne Tab-Leiste, mit Accordion-Lazy-Load Summary

**Neue eigene Route `/admin/users/[id]` ersetzt den User-Detail-Drawer vollstaendig durch einen kontrollierten `Accordion` mit 9 Sektionen (4 initial offen, 5 lazy); `Accordion.tsx` wurde dabei additiv um ein `keepMountedIds`-Feature erweitert, weil das Primitiv geschlossene Panels sonst komplett unmountet und jedes Wiederoeffnen einen echten Re-Fetch der Tab-Komponente ausgeloest haette.**

## Performance

- **Duration:** ca. 50 min
- **Completed:** 2026-07-28T17:41:00Z
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 8 (4 neu, 1 geaendert, 3 geloescht)

## Accomplishments
- `frontend/src/app/admin/users/[id]/page.tsx`: neue Server-Route unter `PlatformAdminGate`, `dynamic = 'force-dynamic'` (D-01) — Zugriff fuer Nicht-Admins wird serverseitig/vor-Render blockiert (T-111-03).
- `UserDetailPageClient.tsx`: `PageHeader` (Eyebrow „Benutzerverwaltung", Titel = `display_name` mit Fallback `Benutzer #{id}`, Status-`Badge` in `actions`, Zurueck-Link in `breadcrumbs`) + kontrollierter `Accordion mode="multi"` mit den 9 UI-SPEC-Sektionen in exakter Reihenfolge.
- Items 1-4 (`overview`/`roles`/`memberships`/`group-rights`) sind initial offen UND geladen; Items 5-9 laden lazy beim ersten Oeffnen.
- Zurueck-Link liest `useSearchParams().get('from')`, dekodiert und haengt ihn als Query-String an `/admin/users` an; ohne `from` faellt er auf `/admin/users` zurueck (D-06).
- Kein `role="tablist"`/`role="tab"`-Markup mehr auf dieser Seite — verifiziert per `queryAllByRole('tab')`/`queryAllByRole('tablist')` → leer.
- `UserDetailContent.tsx`, `UserDetailDrawer.tsx` und `UserDetailDrawer.test.tsx` restlos geloescht; keine verbleibenden Referenzen ausserhalb von `[id]/` (per Grep verifiziert).

## Task Commits

1. **Task 1 RED: page.test.tsx + UserDetailPageClient.test.tsx neu (Gate/Zurueck-Link/kein Tab-Markup/Default-Open/Re-Fetch-Schutz)** - `294c5813` (test)
2. **Task 2 GREEN: Route + Accordion-Host implementiert, Accordion.tsx um keepMountedIds erweitert, Drawer/Content geloescht** - `e410d957` (feat)

**Plan metadata:** folgt (dieser Commit)

## Files Created/Modified
- `frontend/src/app/admin/users/[id]/page.tsx` - Server-Route, `PlatformAdminGate`-Wrapper, `dynamic='force-dynamic'`
- `frontend/src/app/admin/users/[id]/page.test.tsx` - Gate-Tests (Admin/Nicht-Admin)
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` - Accordion-Host mit `openIds`/`loadedIds`, PageHeader, Zurueck-Link, eigener Overview-Fetch fuer Titel/Status
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx` - Zurueck-Link, kein Tab-Markup, Default-Open, Re-Fetch-Schutz
- `frontend/src/components/ui/Accordion.tsx` - additives, optionales `keepMountedIds`-Prop (non-breaking)
- `frontend/src/app/admin/users/UserDetailContent.tsx` (geloescht)
- `frontend/src/app/admin/users/UserDetailDrawer.tsx` (geloescht)
- `frontend/src/app/admin/users/UserDetailDrawer.test.tsx` (geloescht)

## Decisions Made
- `Accordion.tsx` additiv um `keepMountedIds?: Set<string>` erweitert statt eine Parallel-Implementierung zu bauen: geschlossene, aber zuvor geladene Panels bleiben ueber das native `hidden`-Attribut im DOM gemountet, statt komplett entfernt zu werden. Default-Verhalten (Prop weggelassen) bleibt unveraendert — kein Breaking Change fuer bestehende Nutzer (`RoleCapabilityDetail.tsx` u.a.).
- `UserDetailPageClient` fetcht `getAdminUserOverview` unabhaengig von `UserOverviewTab` nur fuer den Header (Titel/Status-Badge), analog dazu, dass alle 9 Tab-Komponenten bereits unabhaengig voneinander laden.
- Fetch-on-mount-Effekt nutzt das im Projekt etablierte `eslint-disable-next-line react-hooks/set-state-in-effect`-Muster (siehe `useFansubEditGroupLoad.ts`), da der Linter das async-await-dann-setState-Muster pauschal markiert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Accordion unmountete lazy-geladene Panels beim Schliessen und loeste dadurch bei jedem Wiederoeffnen einen echten Re-Fetch aus**
- **Found during:** Task 2 (GREEN-Verifikation von "no refetch on reopen")
- **Issue:** Der von 111-PATTERNS.md vorgeschlagene Ansatz (`loadedIds.has(id) ? <TabComponent/> : null`, kein zusaetzlicher Sichtbarkeits-Wrapper noetig) geht davon aus, dass `Accordion` geschlossene Panels nur visuell versteckt. Tatsaechlich entfernt `Accordion.tsx` (Zeilen 85-94, Original) das Panel bei `isOpen=false` komplett aus dem DOM (`{isOpen ? <div>...</div> : null}`). Da `loadedIds` nur steuert, WAS beim naechsten Mount gerendert wird (nicht OB gemountet bleibt), fuehrte jedes Schliessen zu einem echten Unmount und jedes Wiederoeffnen zu einem echten Remount der Tab-Komponente — inklusive erneutem internen Datenabruf. Ein isolierter Reproduktionstest (temporaer, nicht committet) bestaetigte das Verhalten unabhaengig von `UserDetailPageClient`.
- **Fix:** `Accordion.tsx` additiv um ein optionales `keepMountedIds`-Prop erweitert. Ist eine Item-ID darin enthalten, bleibt das Panel-Element bei geschlossenem Zustand ueber das native `hidden`-Attribut im DOM gemountet statt entfernt zu werden (`isMounted = isOpen || keepMountedIds?.has(item.id)`). `UserDetailPageClient` uebergibt `keepMountedIds={loadedIds}`. Verhalten ohne das neue Prop (alle bestehenden Konsumenten wie `RoleCapabilityDetail.tsx`) bleibt unveraendert.
- **Files modified:** `frontend/src/components/ui/Accordion.tsx`, `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx`
- **Verification:** Isolierter Repro-Test (vorher: 3 Mounts bei Oeffnen/Schliessen/Wiederoeffnen; nachher: 1 Mount) bestaetigte die Ursache; `npx vitest run "src/app/admin/users/[id]"` danach 7/7 gruen inkl. "no refetch on reopen".
- **Committed in:** `e410d957` (Task 2 GREEN-Commit)

**2. [Rule 1 - Bug] Eigener RED-Test zaehlte Renders statt Mounts und taeuschte dadurch selbst nach dem Accordion-Fix noch einen Re-Fetch vor**
- **Found during:** Task 2 (nach Fix #1, erneuter Testlauf zeigte weiterhin 3 statt 1 Aufruf)
- **Issue:** Die in Task 1 geschriebenen Mock-Tab-Komponenten riefen ihren Lade-Zaehler direkt im Render-Body auf (`loadCounters.claims()` bei jedem Funktionsaufruf), statt — wie die echten Tab-Komponenten — per `useEffect` nur beim tatsaechlichen Mount zu fetchen. Dadurch zaehlten zusaetzliche Render-Durchlaeufe (ohne echtes Unmount/Remount) faelschlich als Re-Fetch mit.
- **Fix:** Alle 9 Mock-Tab-Komponenten in `UserDetailPageClient.test.tsx` auf `useEffect(() => { loadCounters.X() }, [])` umgestellt (Mount-only, analog zum echten Fetch-on-mount-Verhalten der Tab-Komponenten). Die "no refetch on reopen"-Assertion wurde zusaetzlich von DOM-Entfernung (`queryByTestId(...).toBeNull()`) auf `aria-expanded`-Pruefung umgestellt, da das Panel nach Fix #1 bewusst gemountet (nur `hidden`) bleibt.
- **Files modified:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx`
- **Verification:** Isolierter Repro-Test mit `useEffect`-Zaehler bestaetigte exakt 1 Aufruf ueber den vollen Oeffnen/Schliessen/Wiederoeffnen-Zyklus; Zielsuite danach 7/7 gruen.
- **Committed in:** `e410d957` (Task 2 GREEN-Commit, da Testkorrektur direkt Teil der GREEN-Verifikation war)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 — Bug)
**Impact on plan:** Fix 1 war notwendig, damit die geforderte D-03-Eigenschaft ("ohne bei erneutem Oeffnen erneut zu fetchen") tatsaechlich erfuellt ist, nicht nur scheinbar durch eine falsche Testannahme. Fix 2 korrigiert die eigene Testmethodik entsprechend. Kein Scope-Creep: die Accordion-Erweiterung ist additiv/non-breaking, keine bestehende Nutzung wurde veraendert.

## Issues Encountered
- **Stale `.git/index.lock` (zweimal):** Wie bereits in `111-03-SUMMARY.md` dokumentiert, laufen mehrere GSD-Agenten teils parallel auf `main` (gemeinsamer Working Tree). Zwei Commit-Versuche schlugen mit "Unable to create index.lock: File exists" fehl. Beide Male via `ps -W` verifiziert, dass kein laufender `git.exe`-Prozess mehr aktiv war (nur der davor abgeschlossene parallele Agent), danach ausschliesslich die verwaiste Lock-Datei entfernt (kein `git clean`/`reset --hard`/`stash`) und der Commit erfolgreich wiederholt.
- **Volle Testsuite (`npm test`):** 5 von 211 Testdateien (11 von 1387 Tests) schlagen fehl — identisch zu den in `deferred-items.md` (Plan 111-03) dokumentierten 5 pre-existing Fehlschlaegen ausserhalb dieses Scopes (`ReportModal.test.tsx`, `admin/anime/page.test.tsx`, `publicPageWidthContract.test.ts`, `me/profile/page.test.tsx`, `useAdminAnimeCreateController.test.ts`). Keine neuen Regressionen durch diesen Plan; der gezielte Lauf `npx vitest run "src/app/admin/users/[id]" src/app/admin/users src/app/admin/role-capabilities --reporter=dot` war durchgehend 38/38 gruen (inkl. Regressionscheck fuer andere `Accordion`-Konsumenten nach der `keepMountedIds`-Erweiterung).
- **Docker Desktop nicht verifiziert:** Analog zu `111-03-SUMMARY.md` konnte die im Plan vorgesehene Live-Verifikation (`docker restart team4sv30-frontend` + Strg+F5, Direktaufruf `http://localhost:3000/admin/users/1`) in dieser Session nicht durchgefuehrt werden (kein Docker-Zugriff im Executor-Kontext). Alle code-seitigen Verifikationen (Vitest-Zielsuite 38/38 gruen, `tsc --noEmit` sauber, ESLint sauber fuer alle neuen/geaenderten Dateien) sind gruen; die Live-Browser-Bestaetigung bleibt fuer die finale Phase-111-UAT offen.

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- `/admin/users/[id]` ist eine eigenstaendige, deep-linkbare Route; `UserDetailDrawer`/`UserDetailContent` sind restlos entfernt, keine toten Referenzen.
- `Accordion.keepMountedIds` steht als wiederverwendbares, additives Muster fuer zukuenftige lazy-geladene Akkordeon-Hosts zur Verfuegung.
- Offener Punkt (wie bei 111-03): Live-Browser-Verifikation via Docker sowie die 5 bereits dokumentierten pre-existing Testfehlschlaege ausserhalb des Scopes stehen fuer die finale Phase-111-UAT bzw. eine separate Remediate-Quick-Task aus (siehe `deferred-items.md`).
- Die D-04/D-05-RBAC-Querverlinkung (User→Rolle-Link in `UserGlobalRolesTab`/`UserGroupRightsTab`, Rolle→User-Impact-Count in `RoleMasterList`) ist NICHT Teil dieses Plans und bleibt fuer einen Folge-Plan (111-01 laut Pattern-Map) offen.

---
*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/users/[id]/page.tsx`
- FOUND: `frontend/src/app/admin/users/[id]/page.test.tsx`
- FOUND: `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx`
- FOUND: `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx`
- FOUND: `frontend/src/components/ui/Accordion.tsx` (modifiziert)
- CONFIRMED DELETED: `frontend/src/app/admin/users/UserDetailContent.tsx`
- CONFIRMED DELETED: `frontend/src/app/admin/users/UserDetailDrawer.tsx`
- CONFIRMED DELETED: `frontend/src/app/admin/users/UserDetailDrawer.test.tsx`
- FOUND: Commit `294c5813` (test: RED)
- FOUND: Commit `e410d957` (feat: GREEN)
