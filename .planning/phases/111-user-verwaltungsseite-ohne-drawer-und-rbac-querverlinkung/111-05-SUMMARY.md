---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
plan: 05
subsystem: ui
tags: [react, nextjs, rbac, capability-matrix, admin]

# Dependency graph
requires:
  - phase: 111-01
    provides: "RoleEntry.global_assignment_count/role_kind auf synthetischen globalen Rollen-Zeilen (platform_admin/content_admin/user)"
provides:
  - "RoleMasterList Impact-Count-Badge/Link ('N× vergeben' → /admin/users?role={code}) mit korrekter Zählbarkeits-Erkennung über global_assignment_count statt assignable"
  - "Badge-Label 'Globale App-Rolle' für role_kind=global_app_role"
  - "RoleCapabilityClient ?role=-URL-Vorauswahl (einmalig beim ersten Matrix-Load)"
  - "/admin/role-capabilities page.tsx mit force-dynamic für useSearchParams-Konsumenten"
affects: [111-03 (User→Rolle-Link Zielansicht), Phase-111-Gesamt-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Impact-Count-Zählbarkeit wird über global_assignment_count != null bestimmt, nicht über assignable === true (111-RESEARCH.md Pitfall 1)"
    - "Auswahl-Button und Sekundär-Link in derselben Card-Row als Geschwister-Elemente statt verschachtelter interaktiver Elemente (verhindert ungültiges HTML/Event-Bubbling)"
    - "URL-getriebene Vorauswahl per Ref-Guard nur beim ersten erfolgreichen Datenladen anwenden, nicht bei jedem Matrix-Refresh"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/role-capabilities/RoleMasterList.tsx
    - frontend/src/app/admin/role-capabilities/RoleMasterList.test.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
    - frontend/src/app/admin/role-capabilities/page.tsx

key-decisions:
  - "Impact-Count-Link (Button href) und der bestehende Rollen-Auswahl-Button liegen als Geschwister im selben Flex-Row-Container, nicht verschachtelt — vermeidet ungültiges <a>-in-<button>-HTML und fehlerhaftes Klick-Bubbling."
  - "?role=-Vorauswahl wird per useRef-Guard exakt einmal (beim ersten erfolgreichen Matrix-Load) angewendet, nicht bei jedem Matrix-Refresh nach Grant/Revoke — verhindert, dass eine spätere manuelle Rollenauswahl nach einer Mutation stillschweigend auf die URL-Rolle zurückgesetzt wird."

patterns-established: []

requirements-completed: [D-05, D-06]

# Metrics
duration: 35min
completed: 2026-07-28
---

# Phase 111 Plan 05: RBAC-Querverlinkung Rolle→User (Impact-Count) + URL-Vorauswahl Summary

**`RoleMasterList` zeigt für die drei globalen App-Rollen einen anklickbaren „N× vergeben"-Impact-Count-Link zu `/admin/users?role={code}`, ermittelt korrekt über `global_assignment_count` statt der irreführenden `assignable`-Annahme aus der UI-SPEC; `RoleCapabilityClient` wählt `?role={code}` beim ersten Laden automatisch aus.**

## Performance

- **Duration:** ca. 35 min (inkl. Vollsuiten-Verifikationslauf ~11,5 min)
- **Completed:** 2026-07-28T16:43:30Z
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 5 (Code) + 1 (deferred-items.md)

## Accomplishments
- `RoleMasterList.tsx` rendert pro Rolle korrekt einen von drei Impact-Count-Zuständen: klickbarer `N× vergeben`-Link (Button `href="/admin/users?role={code}"`), nicht-klickbares `0× vergeben`-`Badge`, oder `–` mit Tooltip für nicht zählbare Rollen — Entscheidung über `global_assignment_count != null`, NICHT `assignable === true` (Pitfall 1 aus 111-RESEARCH.md korrekt vermieden).
- Badge-Label-Kette erweitert: `role_kind === 'global_app_role'` → `Globale App-Rolle`, ausgewertet vor der bestehenden `Historische Rolle`-Prüfung.
- `RoleCapabilityClient.tsx` liest `?role=` via `useSearchParams` und wählt die passende Rolle beim ersten erfolgreichen Matrix-Load automatisch aus (identischer Pfad wie manueller Klick — Desktop Inline-Panel bzw. Mobile `Drawer variant="responsiveSheet"`).
- `page.tsx` trägt `export const dynamic = 'force-dynamic'` für den neuen `useSearchParams`-Konsumenten (analog `/admin/users/page.tsx`).

## Task Commits

Jeder Task wurde atomar committet (RED/GREEN-Paar):

1. **Task 1 (RED): 5 fehlschlagende Tests für Impact-Count + Badge-Label + ?role=-Vorauswahl** - `342d5846` (test)
2. **Task 2 (GREEN): Impact-Count/Badge-Label implementieren, ?role=-Vorauswahl verdrahten, force-dynamic ergänzen** - `b4f54d4d` (feat)

_Kein separater REFACTOR-Commit nötig — keine Aufräumarbeiten nach GREEN erforderlich._

## Files Created/Modified
- `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx` - Impact-Count-Rendering (`renderImpactCount`-Helper), Badge-Label-Erweiterung, Card-Row auf Geschwister-Layout umgebaut
- `frontend/src/app/admin/role-capabilities/RoleMasterList.test.tsx` - 4 neue Tests (Impact-Count-Link, 0×-Badge, Dash, Badge-Label)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` - `useSearchParams`-Import, `appliedUrlRoleRef`-Guard, Vorauswahl-`useEffect`
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` - `next/navigation`-Mock, 1 neuer Test für ?role=-Vorauswahl
- `frontend/src/app/admin/role-capabilities/page.tsx` - `export const dynamic = 'force-dynamic'`
- `.planning/phases/111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung/deferred-items.md` - Bestätigung, dass die 5 vorbestehenden Testfehler aus Plan 111-03 unverändert außerhalb des Scopes bleiben

## Decisions Made
- Impact-Count-Link und Auswahl-Button als Geschwister-Elemente derselben Zeile statt verschachtelt (HTML-Validität, korrektes Event-Verhalten).
- URL-Vorauswahl greift nur einmalig (Ref-Guard), nicht bei jedem Matrix-Refresh — siehe Deviations unten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ?role=-Vorauswahl bei jedem Matrix-Refresh statt einmalig beim Laden**
- **Found during:** Task 2 (Implementierung der Vorauswahl-`useEffect`)
- **Issue:** Der Plan-Task-Text beschreibt einen `useEffect`, der "bei jedem Matrix-Wechsel" die `?role=`-Vorauswahl anwendet. Wörtlich umgesetzt hätte das bedeutet: Nach jedem Grant/Revoke-Refresh (der die Matrix per `loadData(false)` neu lädt) würde die URL-Rolle erneut ausgewählt und eine zwischenzeitlich manuell getroffene andere Rollenauswahl stillschweigend überschrieben — ein Korrektheitsfehler, der der D-06-Absicht ("beim Laden automatisch") widerspricht.
- **Fix:** `useRef`-Guard (`appliedUrlRoleRef`) ergänzt, der die Vorauswahl exakt einmal beim ersten erfolgreichen Matrix-Load anwendet; spätere Matrix-Refreshes (nach Mutationen) lösen die Vorauswahl nicht erneut aus.
- **Files modified:** `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`
- **Verification:** `npx vitest run src/app/admin/role-capabilities --reporter=dot` → 28/28 grün, inkl. bestehendem Test "hält das Accordion offen nach erfolgreichem Grant + Daten-Refresh" (der bei fehlerhafter Wiederholung der Vorauswahl fehlschlagen könnte, falls dort ein `role=`-Param gesetzt wäre — Default-Mock ist jedoch parameterlos).
- **Committed in:** `b4f54d4d` (Task 2 GREEN-Commit)

---

**Total deviations:** 1 auto-fixed (1 Bug-Vermeidung)
**Impact on plan:** Notwendige Korrektur, um die vom Plan selbst geforderte D-06-Semantik ("beim Laden automatisch vorauswählen, identisch zum manuellen Klick") korrekt zu erfüllen, ohne eine spätere manuelle Rollenauswahl zu brechen. Kein Scope-Creep.

## Issues Encountered
- Zweimal ein verwaistes `.git/index.lock` vor dem jeweiligen Commit vorgefunden (kein laufender `git.exe`-Prozess, HEAD unverändert seit dem eigenen letzten Commit dieser Session) — jeweils ausschließlich die Lock-Datei entfernt (kein `git clean`/`reset --hard`/`stash`), danach normal committet.
- Vollständiger `npx vitest run`-Lauf (213 Testdateien, 1395 Tests) dauerte ca. 11,5 Minuten und bestätigte exakt dieselben 5 vorbestehenden fehlschlagenden Testdateien (11 Tests) wie bereits in `deferred-items.md` aus Plan 111-03 dokumentiert (`ReportModal.test.tsx`, `admin/anime/page.test.tsx`, `publicPageWidthContract.test.ts`, `me/profile/page.test.tsx`, `useAdminAnimeCreateController.test.ts`) — keiner davon liegt in den `files_modified` dieses Plans; siehe `deferred-items.md`-Ergänzung.
- Docker (`team4sv30-frontend`) wurde in dieser Session nicht neu gestartet — die Live-UAT-Verifikation ("Impact-Count bei `platform_admin` klicken → landet auf `/admin/users?role=platform_admin`") aus dem Plan-`<verification>`-Block steht für die finale Phase-111-UAT noch aus, analog zu bereits dokumentierten Docker-Nichtverfügbarkeits-Fällen in 111-01-SUMMARY.md. Alle code-seitigen Verifikationen (Vitest-Scope, `tsc --noEmit`, ESLint, Vollsuite) sind grün.

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- D-05 (Rolle→User Impact-Count) und D-06 (URL-Vorauswahl auf `/admin/role-capabilities`) sind frontend-seitig vollständig implementiert und getestet.
- Offener Punkt: Docker-Rebuild + Live-Browser-Verifikation der bidirektionalen RBAC-Querverlinkung (User→Rolle aus Plan 111-03/111-04, Rolle→User aus diesem Plan) steht für die finale Phase-111-UAT aus.
- Phase 111 (user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung) hat mit diesem Plan alle 5 geplanten Pläne code-seitig abgeschlossen.

---
*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx`
- FOUND: `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`
- FOUND: `frontend/src/app/admin/role-capabilities/page.tsx`
- FOUND: `.planning/phases/111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung/111-05-SUMMARY.md`
- FOUND: Commit `342d5846` (test: RED)
- FOUND: Commit `b4f54d4d` (feat: GREEN)
- FOUND: Commit `b730faa3` (docs: SUMMARY)
