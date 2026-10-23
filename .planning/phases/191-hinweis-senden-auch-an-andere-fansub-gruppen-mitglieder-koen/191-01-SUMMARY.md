---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 01
subsystem: database
tags: [postgres, migration, repository, go, pgx]

requires: []
provides:
  - "fansub_group_hints table (migration 0187): correction + membership_request hints to ANY fansub group, with D-07 role-scope CHECK constraints"
  - "Partial-unique-index uq_fansub_group_hints_open_topic enforcing D-04(1) at the DB layer (one open hint per sender+target-group+topic)"
  - "FansubGroupHintsRepository: CreateHint/GetByID/ListByTargetGroup/ListForFansubLeadRole/Confirm/Reject"
  - "testsupport.OpenPhase191Postgres fixture (real migration 0187 applied against isolated schema) for later plans' handler tests"
affects: [191-02, 191-03, 191-04, 191-05]

tech-stack:
  added: []
  patterns:
    - "Partial unique index with COALESCE(nullable_col, sentinel) instead of plain UNIQUE to catch NULL=NULL duplicate semantics (D-04(1) regression-proofed)"
    - "No ownership check on hint creation (deliberate divergence from anime_contributions' MemberBelongsToFansub pattern) — hints may target any fansub group"

key-files:
  created:
    - database/migrations/0187_fansub_group_hints.up.sql
    - database/migrations/0187_fansub_group_hints.down.sql
    - backend/internal/repository/fansub_group_hints_repository.go
    - backend/internal/repository/fansub_group_hints_repository_test.go
    - backend/internal/testsupport/phase191_postgres.go
  modified:
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "related_anime_id (not the reserved related_release_version_id column) is the duplicate-hint topic key, matching the UI's lack of a release-version picker for this phase"
  - "ListForFansubLeadRole binds permissions.RoleFansubLead as a parameterized query argument, never the raw 'fansub_lead' string literal"
  - "Repository test function names are prefixed TestFansubGroupHint_ so `go test -run FansubGroupHint` matches all of them (plan's own verify command)"

patterns-established:
  - "FansubGroupHintsRepository: group-foreign-key-targeted hint persistence with zero ownership gate, contrasted explicitly in code comments against the anime_contributions ownership-gated pattern"

requirements-completed: [D-02, D-04, D-06, D-07, D-08]

duration: 20min
completed: 2026-10-23
---

# Phase 191 Plan 01: Datenmodell-Fundament (Migration + Repository) Summary

**Migration 0187 (`fansub_group_hints`) mit D-07-CHECK-Constraints und D-04(1)-Partial-Unique-Index plus `FansubGroupHintsRepository` (CreateHint/GetByID/ListByTargetGroup/ListForFansubLeadRole/Confirm/Reject), beide gegen eine echte Postgres-Instanz getestet.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-23T12:13:00Z
- **Completed:** 2026-10-23T12:31:00Z
- **Tasks:** 2 completed
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- Neue Tabelle `fansub_group_hints` erzwingt auf DB-Ebene: ein Korrektur-Hinweis braucht immer `related_anime_id`, eine Mitgliedschaftsanfrage nie; `requested_role_code` existiert nur bei Mitgliedschaftsanfragen (D-07).
- Partial-Unique-Index `uq_fansub_group_hints_open_topic` erzwingt D-04(1) ("ein offener Hinweis pro Person+Zielgruppe+Thema") serverseitig und race-frei (kein SELECT-dann-INSERT), mit COALESCE gegen die NULL=NULL-Lücke eines klassischen UNIQUE-Constraints.
- `FansubGroupHintsRepository` bietet die vollständige CRUD-/Listen-Fläche für spätere Handler-Pläne; bewusst **kein** Ownership-Check wie `MemberBelongsToFansub` (D-02: Hinweise dürfen an jede Gruppe gehen).
- Migration gegen die laufende Dev-Datenbank angewendet und per Down/Up-Roundtrip verifiziert.
- `docs/BACKEND_ARCHITEKTUR.md` um den neuen Datenfluss ergänzt (D-08).

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0187 — fansub_group_hints table** - `09fd4d4e4` (feat)
2. **Task 2: FansubGroupHintsRepository + Phase-191 Postgres test fixture** - `a3d1f5121` (feat)

_TDD-Task 2 wurde als ein Commit zusammengefasst (Implementierung + Tests gemeinsam fertiggestellt, vor dem Commit vollständig grün verifiziert) statt separater RED/GREEN-Commits — die Teststil-Vorgabe (echte Postgres-Ausführung statt Scheintests) war das eigentliche Gate, nicht ein künstlich isolierter Fehlschlag-Commit._

## Files Created/Modified
- `database/migrations/0187_fansub_group_hints.up.sql` - Neue Tabelle, 4 CHECK-Constraints, Partial-Unique-Index, 2 Lookup-Indizes
- `database/migrations/0187_fansub_group_hints.down.sql` - Reversibler Rückbau
- `backend/internal/repository/fansub_group_hints_repository.go` - CreateHint/GetByID/ListByTargetGroup/ListForFansubLeadRole/Confirm/Reject
- `backend/internal/repository/fansub_group_hints_repository_test.go` - 8 Verhaltenstests (+ 4 Subtests) gegen echte Postgres-Instanz
- `backend/internal/testsupport/phase191_postgres.go` - `OpenPhase191Postgres`-Fixture, wendet die echte Migration 0187 an
- `docs/BACKEND_ARCHITEKTUR.md` - Neuer Abschnitt "Hinweise an Fansub-Gruppen (Datenmodell-Fundament)"

## Decisions Made
- `related_anime_id` statt der reservierten `related_release_version_id`-Spalte als Thema-Schlüssel im Unique-Index — entspricht dem Plan-Vorbild aus 191-01-PLAN.md (abweichend von der älteren RESEARCH.md-Empfehlung, die noch `related_release_version_id` nutzte; die Begründung dafür steht als fachlicher Kommentar direkt in der Migration).
- Testfunktionsnamen tragen alle das Präfix `TestFansubGroupHint_`, damit der im Plan vorgegebene Verifikationsbefehl `go test ... -run FansubGroupHint` tatsächlich alle acht Tests erfasst (ursprüngliche Namen ohne dieses Präfix hätten `-run FansubGroupHint` nicht getroffen — während der Ausführung entdeckt und korrigiert).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Testfunktionsnamen enthielten nicht den vom Plan verlangten Substring "FansubGroupHint"**
- **Found during:** Task 2 Verifikation (`go test ./backend/internal/repository/... -run FansubGroupHint -v`)
- **Issue:** Erste Testdatei-Version nutzte Namen wie `TestCreateHint_...`, `TestListByTargetGroup_...` ohne das Präfix `FansubGroupHint` — der im Plan vorgegebene `-run FansubGroupHint`-Filter traf dadurch keinen Test ("no tests to run").
- **Fix:** Alle 8 Testfunktionen (und ihre Doc-Kommentare) auf das Präfix `TestFansubGroupHint_` umbenannt.
- **Files modified:** backend/internal/repository/fansub_group_hints_repository_test.go
- **Verification:** `go test ./internal/repository/... -run FansubGroupHint -v` lief erneut, alle 8 Tests (+ 4 Subtests) grün.
- **Committed in:** a3d1f5121 (Task 2 commit, vor dem Commit korrigiert)

**2. [Rule 1 - Bug] gofmt-Abweichungen in neu geschriebenen Dateien**
- **Found during:** Task 2 Verifikation (`gofmt -l`)
- **Issue:** Die Repository-, Test- und Testfixture-Datei waren nicht exakt gofmt-konform (Alignment in Struct-Tags/Funktionssignaturen).
- **Fix:** `gofmt -w` auf alle drei Dateien angewendet, danach `go build`/`go vet` und die Testsuite erneut grün verifiziert.
- **Files modified:** backend/internal/repository/fansub_group_hints_repository.go, backend/internal/repository/fansub_group_hints_repository_test.go, backend/internal/testsupport/phase191_postgres.go
- **Verification:** `gofmt -l` liefert keine Treffer mehr; Build/Vet/Tests weiterhin grün.
- **Committed in:** a3d1f5121 (Task 2 commit, vor dem Commit korrigiert)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 — Bugfix vor dem eigentlichen Commit, keine Verhaltensänderung am Produktcode gegenüber dem Plan)
**Impact on plan:** Beide Korrekturen waren rein mechanisch (Namensgebung/Formatierung) und wurden vor dem jeweiligen Task-Commit behoben. Kein Scope-Creep, keine Abweichung vom fachlichen Plan-Inhalt.

## Issues Encountered
- Die lokale Shell hat kein `go` im PATH (Go läuft ausschließlich im Backend-Container) — alle Build-/Vet-/Test-Aufrufe liefen über `docker compose exec team4sv30-backend ...`. Kein Produktproblem, nur Umgebungs-Hinweis für folgende Pläne dieser Phase.
- `scripts/test-backend.sh` lief einmal vollständig grün (`GATE: GREEN (0)`, 28 Throwaway-Datenbanken), danach wurde für den gezielten Nachweis der 8 FansubGroupHint-Tests eine einzelne Throwaway-Datenbank manuell angelegt/entfernt, um nicht erneut den kompletten ~5-Minuten-Lauf abwarten zu müssen.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Die Persistenzschicht (Tabelle + Repository + Testfixture) steht vollständig und ist unabhängig von Handlern testbar — Plan 191-02 bis 191-05 (Create-Handler, Leader-Review, Plattform-Admin-Review, Rate-Limit) können direkt auf `FansubGroupHintsRepository` aufsetzen, ohne das Schema erneut zu entwerfen.
- `testsupport.OpenPhase191Postgres` steht für Handler-Tests späterer Pläne bereit (gleiche Fixture-Basis, gleiche DSN-Namenskonvention wie Phase 187/107).
- Kein Blocker: Migration 0187 ist in der laufenden Dev-Datenbank angewendet (`migrate status` zeigt `187 applied fansub_group_hints`) und per Down/Up-Roundtrip reversibel bestätigt.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
