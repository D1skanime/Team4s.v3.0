---
phase: 86-daten-getriebene-capability-registry
plan: "03"
subsystem: permissions
tags:
  - capability-registry
  - sql-join-nachweis
  - code-kommentare
  - behavior-preserving
dependency_graph:
  requires:
    - "86-02: paket-globaler RWMutex-Cache + AuthzRepository.LoadRoleCapabilities"
  provides:
    - "capability_join_test.go: TestCapabilityJoinQuery — D-07-Nachweis ohne DB-Verbindung"
    - "admin_users_queries.go: Kommentar an beiden leader_count-Stellen (D-08/D-11)"
    - "admin_users_tab_repository.go: Kommentar oberhalb can_view_members + can_edit_content (D-08/D-09/D-11)"
  affects:
    - "Künftige Entwickler verstehen bewusste Nicht-Umstellung der Anzeige-Heuristiken"
tech_stack:
  added: []
  patterns:
    - "Source-Inspection-Stub: stubCapabilityLoader implementiert permissions.CacheLoader ohne DB"
    - "SQL-Kommentare als Entscheidungs-Dokumentation in String-Literalen"
key_files:
  created:
    - "backend/internal/repository/capability_join_test.go"
  modified:
    - "backend/internal/repository/admin_users_queries.go"
    - "backend/internal/repository/admin_users_tab_repository.go"
key_decisions:
  - "D-07-Nachweis per Stub statt echter DB: TestCapabilityJoinQuery läuft ohne Datenbankverbindung und beweist das Interface-Verhalten"
  - "Drei Anzeige-Heuristiken (leader_count ×2, can_view_members, can_edit_content) bleiben SQL-literal — bewusste User-Entscheidung 2026-06-18 per D-08/D-09"

requirements-completed:
  - D-07
  - D-08
  - D-09
  - D-11

duration: 10min
completed: "2026-06-18"
tasks_completed: 2
files_created: 1
files_modified: 2
---

# Phase 86 Plan 03: SQL-Join-Nachweis + Doku-Kommentare Summary

**D-07-Nachweis-Test (TestCapabilityJoinQuery) belegt Registry-Konsultierbarkeit per stub-CacheLoader; SQL-Kommentare an drei Anzeige-Heuristik-Stellen dokumentieren bewusste Nicht-Umstellung (User-Entscheidung 2026-06-18, D-08/D-09/D-11).**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-06-18
- **Tasks:** 2/2
- **Files created:** 1
- **Files modified:** 2

## Accomplishments

- `capability_join_test.go` erstellt: `TestCapabilityJoinQuery` beweist D-07 — stub-CacheLoader für `fansub_lead` liefert `ActionFansubGroupMembersManage` (enthält), `ActionFansubGroupInvitationsAccept` fehlt (kein role_capabilities-Eintrag per Seed-Design). Test läuft ohne DB-Verbindung.
- `admin_users_queries.go`: SQL-Kommentar-Block oberhalb beider `leader_count`-Stellen (`adminUsersListQuery` Zeile ~65, `adminUsersOverviewQuery` Zeile ~153) — dokumentiert Anzeige-Heuristik, Entscheidung 2026-06-18, Hinweis auf role_capabilities-Join für echte Checks.
- `admin_users_tab_repository.go`: SQL-Kommentar-Block oberhalb `can_view_members` + `can_edit_content` (GetUserGroupRights ~Zeile 114) — dokumentiert read-only Anzeige-Heuristiken, keine Capability-Entscheidungen, D-07-Verweis.
- Alle SQL-Literale (`role IN ('leader')`, `role = 'leader'`, `role IN ('leader', 'editor', 'contributor')`) exakt unverändert (100% behavior-preserving).

## Task Commits

1. **Task A: Nachweis-Test capability_join_test.go (D-07)** - `fee644ba` (test)
2. **Task B: Code-Kommentare an Anzeige-Heuristiken (D-08/D-09/D-11)** - `f9bbe98b` (docs)

## Files Created/Modified

- `backend/internal/repository/capability_join_test.go` — neu: TestCapabilityJoinQuery, stubCapabilityLoader, D-07-Assertions
- `backend/internal/repository/admin_users_queries.go` — Kommentar-Block oberhalb beiden leader_count-Stellen (3 Zeilen je Stelle)
- `backend/internal/repository/admin_users_tab_repository.go` — Kommentar-Block oberhalb can_view_members + can_edit_content (3 Zeilen)

## Verification Results

```
go build ./internal/repository/...                                → OK (kein Fehler)
go test ./internal/repository/... -run TestCapabilityJoinQuery   → PASS
go test ./internal/permissions/... -count=1                      → PASS (14/14)

grep -c "Anzeige-Heuristik" admin_users_queries.go               → 2
grep -c "Anzeige-Heuristiken" admin_users_tab_repository.go      → 1
grep -c "fgmr.role IN ('leader')" admin_users_queries.go         → 1 (unveraendert)
grep -c "fgmr.role = 'leader'" admin_users_queries.go            → 1 (unveraendert)
grep -c "fgmr.role IN ('leader', 'editor', 'contributor')" ...   → 1 (unveraendert)
```

Vorhandener Fehlschlag `TestPhase69AnimeContributionMutationsUseRouteScope` (phase69_context_scoping_test.go:81) ist ein pre-existing failure ohne Bezug zu diesem Plan — belegt durch Test-Lauf auf ungeändertem HEAD vor Task B.

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgeführt. SQL-Literale vollständig unverändert.

## Known Stubs

Keine — `TestCapabilityJoinQuery` ist absichtlich stub-basiert (kein DB-Zugriff nötig für D-07-Nachweis). Kein Produktions-Stub.

## Threat Flags

Keine neuen Threat-Flags. T-86-10 und T-86-11 (Anzeige-Heuristiken als accept) durch Kommentare explizit dokumentiert.

## Self-Check: PASSED

- `backend/internal/repository/capability_join_test.go` — vorhanden
- `backend/internal/repository/admin_users_queries.go` — vorhanden, enthält 2× "Anzeige-Heuristik"
- `backend/internal/repository/admin_users_tab_repository.go` — vorhanden, enthält "Anzeige-Heuristiken"
- Commit fee644ba — vorhanden
- Commit f9bbe98b — vorhanden
- TestCapabilityJoinQuery: PASS bestätigt
- SQL-Literale: grep bestätigt alle drei unverändert
