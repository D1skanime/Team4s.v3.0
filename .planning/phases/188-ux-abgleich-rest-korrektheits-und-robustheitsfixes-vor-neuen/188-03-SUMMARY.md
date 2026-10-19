---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
plan: 03
subsystem: infra
tags: [go, pgxpool, postgres, keycloak, cli, hygiene-script]

# Dependency graph
requires: []
provides:
  - "backend/cmd/report-orphaned-app-users: einmalig lauffaehiges, rein lesendes CLI-Tool fuer D-08 (Befund #27)"
  - "computeOrphanedAppUsers: wiederverwendbare, pure Set-Diff-Funktion fuer Keycloak-Subject-Abgleich"
affects: [188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cmd/-Tool-Muster aus migrate-preview-backfill wiederverwendet: duenne main.go (getEnv-Helfer, pgxpool.New, Fatalf) + separate, importierbare Kernfunktion (runReport) statt Logik in main() zu verstecken"
    - "Zwei-DSN-CLI-Tool (DATABASE_URL + neue KEYCLOAK_DATABASE_URL) fuer Cross-Datenbank-Report ohne Schreibzugriff"
    - "Abwesenheitstest (os.ReadFile + strings.Contains auf Mutations-Keywords) als strukturelle D-08-Absicherung statt nur Dokumentation"

key-files:
  created:
    - backend/cmd/report-orphaned-app-users/report.go
    - backend/cmd/report-orphaned-app-users/report_test.go
    - backend/cmd/report-orphaned-app-users/main.go
  modified: []

key-decisions:
  - "KEYCLOAK_DATABASE_URL-Default zeigt auf den bestehenden keycloak-db-Container (docker-compose.yml), kein neuer manueller Setup-Schritt noetig"
  - "AppUserSubject und OrphanedAppUser als bewusst getrennte, identische Typen fuer Lesbarkeit an der runReport-Aufrufgrenze"
  - "Postgres-Integrationstest nutzt zwei unabhaengige testsupport.OpenPhase106Postgres(t)-Aufrufe als Stand-in fuer zwei getrennte Datenbanken (Team4s-DB, Keycloak-DB), statt eine neue Fixture-Datei zu bauen"

patterns-established:
  - "Report-only CLI-Tools gegen zwei externe Postgres-Instanzen: zwei pgxpool.Pool, read-only SQL, Abwesenheitstest als Mutationsschutz"

requirements-completed: [D-08]

# Metrics
duration: 25min
completed: 2026-10-19
---

# Phase 188 Plan 03: Hygiene-Report fuer verwaiste app_users-Zeilen (D-08) Summary

**Rein lesendes CLI-Tool `report-orphaned-app-users`, das app_users-Zeilen ohne Entsprechung in Keycloaks `user_entity`-Tabelle per Set-Diff auflistet -- strukturell bewiesen, dass es niemals eine Datenzeile veraendert.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-19T23:02:00Z
- **Completed:** 2026-10-19T23:27:00Z
- **Tasks:** 2
- **Files modified:** 3 (alle neu angelegt)

## Accomplishments
- `computeOrphanedAppUsers` als pure Set-Diff-Funktion mit 4 Unit-Tests (leer, alle vorhanden, 1 von 3 fehlt, Keycloak-Menge leer)
- `runReport` liest `app_users` (Team4s-DB) und `user_entity` (Keycloak-DB) ueber zwei unabhaengige `pgxpool.Pool`-Instanzen, ausschliesslich `SELECT`
- Postgres-Integrationstest gegen zwei schema-isolierte Phase-106-Fixturen beweist den End-to-End-Pfad mit einer echten Waise
- `main.go` verbindet sich mit `DATABASE_URL` und dem neuen `KEYCLOAK_DATABASE_URL` (Default auf den bestehenden `keycloak-db`-Container) und druckt einen deutschen stdout-Report
- `TestReportPackageNeverMutatesData` (zulaessige Abwesenheits-Pruefung) beweist strukturell, dass weder `report.go` noch `main.go` eine schreibende SQL-Anweisung enthaelt (D-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Kernlogik (report.go) + Tests** - `b73dbca98` (feat)
2. **Task 2: CLI-Einstieg (main.go)** - `fdd066c2c` (feat)

**Plan metadata:** (folgt in separatem docs-Commit)

## Files Created/Modified
- `backend/cmd/report-orphaned-app-users/report.go` - `AppUserSubject`/`OrphanedAppUser`-Typen, `fetchAppUserSubjects`, `fetchKeycloakSubjectIDs`, `computeOrphanedAppUsers`, `runReport` (alles read-only)
- `backend/cmd/report-orphaned-app-users/report_test.go` - 4 pure Unit-Tests, 1 Postgres-Integrationstest, 1 Abwesenheitstest
- `backend/cmd/report-orphaned-app-users/main.go` - CLI-Einstieg mit zwei DSNs und deutschem stdout-Report

## Decisions Made
- Keine architektonischen Abweichungen vom Plan; Interfaces (`migrate-preview-backfill`-Muster, `keycloak-db`-Compose-Service, `testsupport.OpenPhase106Postgres`) exakt wie in `<interfaces>` vorgegeben wiederverwendet.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Keine. Die vom Plan erwartete Zwischen-Rotphase (Abwesenheitstest schlaegt nach Task 1 fehl, weil `main.go` noch nicht existiert) trat wie vorgesehen ein und wurde durch Task 2 aufgeloest.

## User Setup Required

None - `KEYCLOAK_DATABASE_URL` hat einen funktionierenden Default auf den bereits laufenden `keycloak-db`-Container; kein manueller Schritt noetig, solange `docker compose` laeuft (siehe Plan-Frontmatter `user_setup`).

## Verification

- `go build ./cmd/report-orphaned-app-users/...` - clean
- `go vet ./cmd/report-orphaned-app-users/...` - clean
- `go test ./cmd/report-orphaned-app-users/... -v` (mit `TEAM4S_PHASE106_TEST_DSN` gesetzt) - alle 6 Tests PASS
- `scripts/test-backend.sh` (voller Backend-Testlauf, inkl. `team4s.v3/backend/cmd/report-orphaned-app-users`) - GATE: GREEN (0)
- `docker compose up -d --build team4sv30-backend` - Image neu gebaut, Container laeuft, Routen werden geloggt, kein Fehler in den Logs

## Next Phase Readiness
- D-08 ist damit vollstaendig umgesetzt; das Tool hat aktuell 0 Waisen zu melden (erwartet laut 188-CONTEXT.md Live-Bestand)
- Keine Blocker fuer nachfolgende Plans dieser Phase

---
*Phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen*
*Completed: 2026-10-19*

## Self-Check: PASSED

- FOUND: backend/cmd/report-orphaned-app-users/report.go
- FOUND: backend/cmd/report-orphaned-app-users/report_test.go
- FOUND: backend/cmd/report-orphaned-app-users/main.go
- FOUND: .planning/phases/188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen/188-03-SUMMARY.md
- FOUND commit: b73dbca98
- FOUND commit: fdd066c2c
