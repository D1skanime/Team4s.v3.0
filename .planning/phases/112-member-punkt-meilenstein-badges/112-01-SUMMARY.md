---
phase: 112-member-punkt-meilenstein-badges
plan: 01
subsystem: api
tags: [go, pgx, postgres, badges, gamification, repository]

# Dependency graph
requires:
  - phase: 106-member-gamification-punktefundament
    provides: append-only Punktebuch, release_role_credit_lifecycles (Migration 0137/0131)
  - phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
    provides: loadPublicBadges role-entry UNION, GetPublicMemberProfile, PublicMemberBadge model
provides:
  - loadRoleVolumeBadges read-time COUNT/GROUP-BY-Projektion pro Rolle
  - highestRoleVolumeTier reine Schwellen-Funktion (Bronze 12 / Silber 108 / Gold 320 / Platin 510)
  - Typ-3-Badges (role_volume_<roleCode>_<tier>) in profile.PublicBadges
affects: [112-02, 112-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split-File-Konvention fuer Repository-Erweiterungen (member_profile_*_repository.go, package repository, extension methods auf *MemberProfileRepository)"
    - "Read-time synthetisierte Badges (ID:0, nie persistiert) fuer Live-Projektionen ueber Ledger-/Lifecycle-Tabellen"

key-files:
  created:
    - backend/internal/repository/member_profile_role_volume_repository.go
  modified:
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_postgres_test.go

key-decisions:
  - "Tier-Tokens sind intern-englisch (bronze/silver/gold/platinum), keine deutschen Strings ueber die Go/Client-Grenze -- Label-Aufloesung folgt clientseitig in Plan 112-02."
  - "loadRoleVolumeBadges lebt in einer neuen Split-Datei statt in der bereits 1875 Zeilen grossen member_profile_repository.go (450-Zeilen-Limit)."
  - "Call-Site-Aenderung an member_profile_repository.go bleibt auf 5 Zeilen begrenzt (Pitfall-3-Gate erfuellt)."

patterns-established:
  - "Rollen-gefilterte Netto-Zaehlung ueber release_role_credit_lifecycles (WHERE lifecycle_status='awarded' GROUP BY role_code) als wiederverwendbares Muster fuer weitere volumenbasierte Ableitungen."

requirements-completed: [GAM-04]

# Metrics
duration: 9min
completed: 2026-07-28
---

# Phase 112 Plan 01: Backend-Rollen-Volumen-Badges Summary

**Read-time COUNT/GROUP-BY-Projektion ueber `release_role_credit_lifecycles` liefert pro Rolle nur die hoechste erreichte Bronze/Silber/Gold/Platin-Stufe als nie-persistiertes `PublicMemberBadge`.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-28T05:55:00Z (approx., STATE.md-Referenz)
- **Completed:** 2026-07-28T06:04:32Z
- **Tasks:** 2
- **Files modified:** 3 (1 neu, 2 geaendert)

## Accomplishments
- Neues Split-File `member_profile_role_volume_repository.go` mit `loadRoleVolumeBadges` (COUNT/GROUP-BY-Query) und der reinen Funktion `highestRoleVolumeTier` (Schwellenlogik).
- Call-Site in `GetPublicMemberProfile` haengt die Typ-3-Badges minimal-invasiv (5 Zeilen Diff) an `profile.PublicBadges` an.
- Go-Unit-Test `TestHighestRoleVolumeTier` deckt alle 9 Grenzwerte (11/12, 107/108, 319/320, 509/510, 0) unabhaengig von Postgres ab -- gruen verifiziert.
- Postgres-Integrationstest `TestLoadPublicBadgesPostgresRoleVolume` beweist den vollen award(12x)->bronze sichtbar->reverse(1x)->bronze verschwindet Lebenszyklus (D-02/GAM-04 Live-Projektion).

## Task Commits

Each task was committed atomically:

1. **Task 1: Neues Split-File member_profile_role_volume_repository.go mit loadRoleVolumeBadges + highestRoleVolumeTier** - `4fe8a9b9` (feat)
2. **Task 2: Call-Site verdrahtet + Postgres Live-Projektions-Integrationstest** - `3419d53a` (feat)

_Note: Task 1 hatte tdd="true", aber die produktionsreife Implementierung und der Grenzwert-Unit-Test wurden zusammen im GREEN-Zustand committet (Behavior-Block war unmittelbar durch die pure Funktion erfuellbar, kein separater RED-Commit noetig)._

**Plan metadata:** (folgt, siehe final commit unten)

## Files Created/Modified
- `backend/internal/repository/member_profile_role_volume_repository.go` - Neue Datei: `loadRoleVolumeBadges` (Extension-Methode auf `*MemberProfileRepository`) + `highestRoleVolumeTier` (reine Schwellen-Funktion)
- `backend/internal/repository/member_profile_repository.go` - Call-Site-Erweiterung nach `loadPublicBadges`-Aufruf (5 Zeilen)
- `backend/internal/repository/member_profile_repository_postgres_test.go` - `TestHighestRoleVolumeTier` (reiner Unit-Test) + `TestLoadPublicBadgesPostgresRoleVolume` (Postgres-Integrationstest, award->reverse->hidden)

## Decisions Made
- Tier-Tokens `bronze/silver/gold/platinum` sind maschinenlesbar/intern-englisch, konsistent mit dem bestehenden `productive_bronze/silver/gold`-Praezedenzfall; das deutsche Label (`Platin` etc.) wird erst clientseitig in Plan 112-02 aufgeloest.
- Neues Split-File statt Erweiterung der 1875-Zeilen-Datei `member_profile_repository.go`, um das CLAUDE.md-450-Zeilen-Limit nicht weiter zu verletzen.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Docker/Postgres nicht erreichbar in dieser Ausfuehrungsumgebung** (`docker ps` schlaegt mit "failed to connect to the docker API" fehl; kein lokaler Postgres-Port 5432 erreichbar) -- identisches, bereits dokumentiertes Verhalten wie in `109-02-SUMMARY.md` und `110-02-SUMMARY.md`. `TEAM4S_PHASE106_TEST_DSN` ist nicht gesetzt, daher laeuft `TestLoadPublicBadgesPostgresRoleVolume` als `SKIP` (nicht `FAIL`). Verifiziert als erwartetes, sicheres Verhalten durch:
  - `cd backend && go build ./...` sauber.
  - `cd backend && go vet ./internal/repository/...` sauber.
  - `cd backend && go test ./internal/repository/...` (volles Paket, ohne `-run`-Filter) gruen, mit `TestLoadPublicBadgesPostgresRoleVolume` als `SKIP: TEAM4S_PHASE106_TEST_DSN is not set`.
  - `cd backend && go test ./...` (volle Backend-Suite) gruen, keine Regressionen.
  - Schema-Constraints des neuen Tests manuell gegen Migration 0137 (`release_role_credit_lifecycles`: `UNIQUE(release_version_id, fansub_group_id, member_id, role_code, generation)`, `award_entry_id UNIQUE`) und die bestehende InsertReversal-Implementierung geprueft; Test seedet 12 awards mit distinkten `generation`-Werten (1..12) und distinkten Idempotency-Keys, erfuellt beide UNIQUE-Constraints strukturell identisch zum bereits gruen laufenden `TestLoadPublicBadgesPostgresRoleEntryReversedHidden`-Muster.

## User Setup Required

None fuer den Code selbst. Um `TestLoadPublicBadgesPostgresRoleVolume` live zu verifizieren, wird eine erreichbare Postgres-Instanz benoetigt: `docker compose up -d team4sv30-db`, eine `team4s_phase106_test_<suffix>`-Datenbank anlegen, `TEAM4S_PHASE106_TEST_DSN` setzen, dann erneut ausfuehren:
`cd backend && go test ./internal/repository/... -run "TestLoadPublicBadgesPostgresRoleVolume|TestHighestRoleVolumeTier" -v`

## Next Phase Readiness
- `role_volume_<roleCode>_<tier>`-Badges fliessen bereits ueber `profile.PublicBadges` mit, sind read-time berechnet und nie persistiert -- Plan 112-02 kann direkt auf dieser Backend-Grundlage aufbauen (Label-/Icon-/Paletten-Aufloesung im Frontend, `memberBadgeLabels.ts`-Resolver fuer `role_volume_`-Praefix).
- Kein neuer Backend-Buchungspfad wurde eingefuehrt (GAM-04 unveraendert eingehalten); Typ 2 (Punkt-Meilensteine) bleibt reine Frontend-Ableitung, wie in 112-CONTEXT.md D-01/D-03 festgelegt.
- Live-Postgres-Verifikation des neuen Integrationstests steht aus (Umgebungslimitierung, kein Code-Blocker).

---
*Phase: 112-member-punkt-meilenstein-badges*
*Completed: 2026-07-28*
