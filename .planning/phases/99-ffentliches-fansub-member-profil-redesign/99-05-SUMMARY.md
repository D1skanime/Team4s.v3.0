---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "05"
subsystem: database
tags: [go, postgresql, pgx, repository, fansub, members]

# Dependency graph
requires:
  - phase: 99-ffentliches-fansub-member-profil-redesign
    provides: "domain_projection_repository.go listProjectionMembers/listProjectionHistorical (das kanonische Zaehlvorbild)"
provides:
  - "getGroupStats zaehlt Mitglieder identisch zu countVisibleTeamMembers (Gruppen-/Projektseite)"
  - "MembersCount-Batch (attachGroupCounts) zaehlt Mitglieder identisch zu countVisibleTeamMembers (Fansub-Highlights)"
affects: [99-06, 99-07, "fansub-profile", "group-profile", "release-detail"]

tech-stack:
  added: []
  patterns:
    - "Mitgliederzahl-Queries spiegeln listProjectionMembers/listProjectionHistorical statt eigener Zaehlsemantik zu erfinden"
    - "Source-Assertion-Tests (os.ReadFile + strings.Contains auf Funktionskoerper) fuer Repository-Queries ohne DB-Testharness"

key-files:
  created: []
  modified:
    - "backend/internal/repository/group_repository.go"
    - "backend/internal/repository/group_repository_test.go"
    - "backend/internal/repository/fansub_repository.go"
    - "backend/internal/repository/fansub_repository_test.go"

key-decisions:
  - "getGroupStats: zwei Sub-Selects (aktive fansub_group_members ohne profile_visibility-Filter + oeffentlich-historische hist_fansub_group_members) werden in einer Query summiert statt zwei QueryRow-Aufrufen, um Konsistenz zu einem Snapshot zu garantieren"
  - "MembersCount-Batch: UNION ALL der beiden Zeilenquellen mit aeusserem GROUP BY group_id, COUNT(*), damit populateCountMap unveraendert eine (group_id, count)-Zeile pro Gruppe erhaelt"
  - "Bestehende DB-Integrationstests (setupTestRepo/createTestAnime) bleiben t.Skip()-basiert (kein Testharness vorhanden); neue Tests nutzen Source-Assertion auf den Funktionskoerper wie im Repository-Paket bereits etabliert (z.B. TestFansubRepository_PublicProfileSourceInvariants)"

requirements-completed: ["AO4-01"]

duration: 12min
completed: 2026-07-08
---

# Phase 99 Plan 05: Mitgliederzahl-Bugfix (AO4-01) Summary

**getGroupStats und der MembersCount-Batch zaehlen jetzt exakt dieselbe Menge wie die angezeigte Team-Liste (countVisibleTeamMembers) statt der ungefilterten Legacy-Tabelle fansub_members.**

## Performance

- **Duration:** 12min
- **Started:** 2026-07-08T15:23:00Z (approx.)
- **Completed:** 2026-07-08
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- `getGroupStats` (`group_repository.go`) zaehlt Mitglieder jetzt als Summe aus (a) aktiven `fansub_group_members` (status='active', OHNE `profile_visibility`-Zeilenfilter, JOIN `app_users` wie `listProjectionMembers`) und (b) oeffentlich-historischen `hist_fansub_group_members` (status IN historical/confirmed, visibility='public', wie `listProjectionHistorical`).
- `attachGroupCounts` → MembersCount-Batch (`fansub_repository.go`) zaehlt dieselbe Semantik pro `fansub_group_id` per UNION ALL + aeusserem `GROUP BY group_id`, kompatibel mit der bestehenden `populateCountMap`-Signatur.
- Beide Zaehlpfade referenzieren die Legacy-Tabelle `fansub_members` nicht mehr (grep-verifiziert).
- Ein privates/unclaimed aktives Mitglied wird jetzt als 1 gezaehlt statt als 0 — der zentrale Bugfall aus AO4-01.
- Neue Source-Assertion-Tests pinnen die Zaehlsemantik fest (Query enthaelt die richtigen Tabellen/Filter, enthaelt NICHT `profile_visibility = 'public'` auf aktiven Zeilen und NICHT `FROM fansub_members`).

## Task Commits

Each task was committed atomically:

1. **Task 1: getGroupStats an countVisibleTeamMembers angleichen** - `50cb404e` (fix)
2. **Task 2: MembersCount-Batch an countVisibleTeamMembers angleichen** - `b2fc2ffb` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/group_repository.go` - `getGroupStats` zaehlt aktive + oeffentlich-historische Mitglieder statt `fansub_members`
- `backend/internal/repository/group_repository_test.go` - Source-Assertion-Test `TestGetGroupStats_MemberCountMatchesCountVisibleTeamMembers`
- `backend/internal/repository/fansub_repository.go` - `attachGroupCounts` MembersCount-Batch zaehlt aktive + oeffentlich-historische Mitglieder statt `fansub_members`
- `backend/internal/repository/fansub_repository_test.go` - Source-Assertion-Test `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers`

## Decisions Made
- Kein DB-Integrationstest moeglich: `setupTestRepo`/`createTestAnime` in `test_helpers.go` sind Platzhalter, die immer `t.Skip()` aufrufen (kein Testdatenbank-Harness im Repo vorhanden). Statt eines funktionslosen DB-Tests wurden — wie im Repository-Paket an mehreren Stellen bereits ueblich (z.B. `TestFansubRepository_PublicProfileSourceInvariants`, `TestFansubRepository_DeleteGroupCleansRestrictedChildrenFirst`) — Source-Assertion-Tests ergaenzt, die den Funktionskoerper per `os.ReadFile` + `strings.Contains` pruefen. Dies deckt die geforderten Acceptance-Criteria (enthaelt/enthaelt-nicht bestimmte SQL-Fragmente) direkt ab.
- Die bestehende (bereits geskippte) `TestGroupRepository_GetGroupDetail` erwartet `MemberCount == 1` fuer ein via `fansubRepo.CreateMember` (Legacy-`fansub_members`-Insert) angelegtes Mitglied. Da dieser Test wegen `t.Skip()` nie tatsaechlich laeuft, wurde er unveraendert gelassen, um den Diff auf den Plan-Scope zu begrenzen — er ist semantisch veraltet, aber inert.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Beim ersten Testlauf schlug die Source-Assertion faelschlich fehl, weil der erklaerende Kommentar ueber der Query selbst den String `profile_visibility` enthielt (Kommentartext, keine SQL-Klausel). Die Assertion wurde praezisiert auf die konkrete verbotene Klausel `profile_visibility = 'public'` / `profile_visibility='public'`, sodass sie nur echte Zeilenfilter erkennt und nicht durch erklaerende Kommentare getriggert wird. Beide Tests laufen danach gruen.

## User Setup Required

None - no external service configuration required. Fuer eine Live-Verifikation der neuen Zahlen auf `/fansubs/[slug]` bzw. der Gruppen-/Projektseite ist ein Backend-Rebuild noetig: `docker compose up -d --build team4sv30-backend` (stale Backend liefert sonst weiterhin alte Zahlen aus dem vorherigen Build).

## Next Phase Readiness
- AO4-01 ist code- und testseitig abgeschlossen; `go build ./...` und die gezielten `go test ./internal/repository -run "GroupStats|GetGroupDetail|Members|Highlight|Fansub"` sind gruen.
- Live-UAT auf `/fansubs/[slug]`, der Gruppenseite und der Projektseite steht noch aus (Docker-Rebuild + Browser-Check), ist aber ausserhalb des Scopes dieses reinen Backend-Repository-Plans.
- Folgeplaene 99-06+ (Release-Aggregation AO4-02, Cursor-Pagination AO4-03, Frontend-Reihenfolge/Leerfall-Bereinigung AO4-06..AO4-25) koennen auf einer konsistenten Mitgliederzahl aufbauen.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*
