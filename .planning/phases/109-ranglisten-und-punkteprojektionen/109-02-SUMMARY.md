---
phase: 109-ranglisten-und-punkteprojektionen
plan: 02
subsystem: database
tags: [postgres, plpgsql, go, pgxpool, trigger, gamification, ranking]

# Dependency graph
requires:
  - phase: 109-ranglisten-und-punkteprojektionen (Plan 01)
    provides: RED-Migrations-Contract-Test (phase109_member_point_totals_test.go) und RED-Repository-Test (member_point_totals_repository_test.go) mit den verbindlichen Abnahmekriterien fuer Migration 0139 und MemberPointTotalsRepository
provides:
  - Migration 0139 (member_point_totals-Tabelle, AFTER-INSERT-Fortschreibungs-Trigger auf point_ledger_entries, Guard-Trigger gegen Direkt-Writes)
  - MemberPointTotalsRepository.ListRanking (reines Lese-Repository, absteigend sortierte, seitenweise, oeffentlichkeitsgefilterte Rangliste)
affects: [109-03-lese-endpunkt, 110-ranglisten-ui-und-badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AFTER INSERT-Aggregat-Trigger auf point_ledger_entries als einziger Fortschreibungspfad einer materialisierten Summentabelle (kein Service-seitiges Increment)"
    - "Guard-Trigger via pg_trigger_depth()=0 verhindert direkte Anwendungs-Writes auf eine trigger-gepflegte Tabelle"
    - "Reines Lese-Repository ohne Schreibmethoden ueber eine per DB-Trigger fortgeschriebene Aggregat-Tabelle"

key-files:
  created:
    - database/migrations/0139_member_point_totals.up.sql
    - database/migrations/0139_member_point_totals.down.sql
    - backend/internal/repository/member_point_totals_repository.go
  modified: []

key-decisions:
  - "Migrationsnummer 0139 unmittelbar vor Implementierung erneut per Verzeichnislisting geprueft (ls database/migrations | sort | tail) -- 0138 blieb hoechste vorhandene Nummer, keine Kollision."
  - "Guard-Exception-Text bewusst Englisch ('member_point_totals is maintained exclusively by the point_ledger_entries trigger'), analog zum bestehenden 0131-Text 'point ledger is append-only' -- vermeidet die CLAUDE.md-Umlaut-Sprachfrage fuer DB-Guard-Strings vollstaendig."
  - "ListRanking nutzt INNER JOIN member_point_totals->members (nicht LEFT JOIN): nur Members mit mindestens einer Buchung erscheinen in der Rangliste (Open Question 1 aus 109-RESEARCH.md, in Plan 109-02 final entschieden)."
  - "memberDisplayExpr/memberSlugExpr aus anime_contributions_public_repository.go direkt wiederverwendet statt neu implementiert (sechste/siebte Duplikat-Ableitung waere Slop)."

patterns-established:
  - "Pattern 1 (aus RESEARCH.md uebernommen): AFTER INSERT-Trigger als einziger Schreibpfad einer aggregierten, transaktional konsistenten Summe."
  - "Pattern 2 (aus RESEARCH.md uebernommen): Guard-Trigger via pg_trigger_depth()."

requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]

# Metrics
duration: 40min
completed: 2026-07-27
---

# Phase 109 Plan 02: Persistierte Summenfortschreibung und Ranglisten-Repository Summary

**Migration 0139 fuehrt eine per AFTER-INSERT-Trigger transaktional fortgeschriebene `member_point_totals`-Tabelle ein, und ein neues, rein lesendes `MemberPointTotalsRepository.ListRanking` liefert daraus eine absteigend sortierte, seitenweise, oeffentlichkeitsgefilterte Rangliste -- ohne eine einzige Boundary-geschuetzte Datei aus Phase 106/107 anzufassen.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-27T13:30:00Z
- **Completed:** 2026-07-27T14:10:00Z
- **Tasks:** 2 / 2 completed
- **Files modified:** 3 (alle neu angelegt)

## Accomplishments
- `database/migrations/0139_member_point_totals.up.sql`: Neue Tabelle `member_point_totals(member_id PK REFERENCES members(id) ohne CASCADE, total_points, updated_at)`, Funktion+Trigger `apply_point_ledger_entry_to_member_total`/`point_ledger_apply_member_total` (AFTER INSERT auf `point_ledger_entries`, `ON CONFLICT (member_id) DO UPDATE SET total_points = total_points + NEW.point_value`), Guard-Funktion+Trigger `guard_member_point_totals_mutation`/`member_point_totals_guard_direct_write` (lehnt jede Mutation mit `pg_trigger_depth() = 0` ab, englischer Exception-Text).
- `database/migrations/0139_member_point_totals.down.sql`: Symmetrischer Rueckbau (Guard-Trigger -> Ledger-Trigger -> Guard-Funktion -> Fortschreibungs-Funktion -> Tabelle), ruehrt `point_ledger_entries` selbst nicht an.
- `backend/internal/repository/member_point_totals_repository.go`: `MemberPointRankingRow` mit expliziten snake_case JSON-Tags, `MemberPointTotalsRepository.ListRanking(ctx, page)` mit Bounds-Check (page<1->1, page>1000->1000), profile_visibility='public'-Filter (T-109-02), parametrisiertem LIMIT/OFFSET (T-109-01), `ORDER BY total_points DESC, member_id ASC` (D-01/Pitfall 5), Wiederverwendung von `memberDisplayExpr`/`memberSlugExpr`.
- Alle Wave-0-Migrations-Contract-Tests (`TestPhase109MigrationUpContract`, `TestPhase109MigrationDownContract`) sind gruen; die JSON-Feldnamen-Assertion (`TestMemberPointRankingRowJSONFieldNames`) ist gruen; `go build ./...` und die vollstaendige nicht-Postgres-gebundene Backend-Testsuite (`go test ./...`) sind gruen.
- Beide Boundary-Regressionstests (`TestPointServicePhase106Boundary`, `TestPhase107ReviewServiceBoundary`) bleiben gruen -- keine Boundary-geschuetzte Datei wurde veraendert.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0139 -- Tabelle, Fortschreibungs-Trigger, Guard-Trigger** - `be6ba372` (feat)
2. **Task 2: MemberPointTotalsRepository mit ListRanking** - `06f4995e` (feat)

**Plan metadata:** (dieser Commit folgt separat nach diesem Summary)

## Files Created/Modified
- `database/migrations/0139_member_point_totals.up.sql` - Tabelle `member_point_totals`, Fortschreibungs-Trigger, Guard-Trigger
- `database/migrations/0139_member_point_totals.down.sql` - Symmetrischer Rueckbau ohne `point_ledger_entries` anzufassen
- `backend/internal/repository/member_point_totals_repository.go` - Reines Lese-Repository mit `ListRanking`

## Decisions Made
- Migrationsnummer 0139 direkt vor der Implementierung erneut per Verzeichnislisting geprueft -- keine Kollision mit einem parallelen GSD-Lauf.
- Guard-Exception-Text englisch gehalten (analog 0131), um die CLAUDE.md-Umlaut-Pflicht fuer deutschsprachige user-facing Strings gar nicht erst zu beruehren.
- `INNER JOIN` statt `LEFT JOIN` fuer die Ranglisten-Query: nur Members mit mindestens einer Buchung erscheinen (Open Question 1 aus 109-RESEARCH.md final entschieden, schemakompatibel spaeter auf `LEFT JOIN + COALESCE` erweiterbar).

## Deviations from Plan

None - plan executed exactly as written. Beide Migrationsdateien und das Repository folgen wortgetreu den in RESEARCH.md/PATTERNS.md/109-02-PLAN.md vorgegebenen SQL-Fragmenten, Struct-Definitionen und Query-Templates.

## Issues Encountered
- **Live-PostgreSQL-Integrationstests konnten in dieser Ausfuehrungsumgebung nicht real ausgefuehrt werden.** Docker Desktop war beim Start dieser Session nicht erreichbar (`docker ps` schlaegt mit "failed to connect to the docker API" fehl, auch mit deaktiviertem Sandbox-Modus getestet), und ein direkter TCP-Test gegen `localhost:5433` (den in `docker-compose.yml` konfigurierten Postgres-Port) schlaegt ebenfalls fehl. Dies ist ein bereits dokumentiertes, akzeptiertes Verhalten des Projekts (siehe 109-01-SUMMARY.md: "Live-Postgres-Tests uebersprangen erwartungsgemaess mangels gesetzter `TEAM4S_PHASE106_TEST_DSN`-Umgebungsvariable") -- ohne eine gesetzte, auf eine dedizierte `team4s_phase106_test_*`-Datenbank zeigende `TEAM4S_PHASE106_TEST_DSN` ueberspringen alle Postgres-gebundenen Tests kontrolliert (`SKIP`, kein `FAIL`).
  - **Was lief:** Alle reinen String-/Contract-Tests (`TestPhase109MigrationUpContract`, `TestPhase109MigrationDownContract`, `TestMemberPointRankingRowJSONFieldNames`) sind tatsaechlich ausgefuehrt und gruen. Der Code wurde zusaetzlich Zeile-fuer-Zeile gegen die exakten Assertions in `member_point_totals_repository_test.go` und `phase109_member_point_totals_test.go` gegengelesen (Spaltennamen, Trigger-Reihenfolge, `ON CONFLICT`-Klausel, Tie-Break-Reihenfolge, JSON-Tags).
  - **Was nicht lief:** `TestPhase109MigrationLiveUpDownUp`, `TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly`, `TestMemberPointTotalsPostgresRetrySameAwardDoesNotDoubleCount`, `TestMemberPointTotalsPostgresReversalLowersTotal`, `TestMemberPointTotalsRankingOrderAndTieBreak`, `TestMemberPointTotalsRankingPageBounds` -- alle wurden mit `SKIP` (nicht `FAIL`) uebersprungen, da `TEAM4S_PHASE106_TEST_DSN` nicht gesetzt und keine Docker-Postgres-Instanz erreichbar war.
  - **Empfehlung fuer die naechste Session mit funktionierendem Docker:** `docker compose up -d team4sv30-db`, eine `team4s_phase106_test_<suffix>`-Datenbank anlegen, `TEAM4S_PHASE106_TEST_DSN` setzen und `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run "TestPhase109|TestMemberPointTotals" -v` erneut ausfuehren, um die Live-Trigger-/Concurrency-/Ranking-Verhalten zusaetzlich end-to-end zu bestaetigen.

## User Setup Required
None fuer den Code selbst. Fuer eine vollstaendige Live-Verifikation der in diesem Plan geschriebenen Postgres-Integrationstests muss (wie in 106-01-SUMMARY.md dokumentiert) eine Datenbank mit Namen `team4s_phase106_test_[a-z0-9]+` bereitgestellt und `TEAM4S_PHASE106_TEST_DSN` gesetzt werden -- Docker war in dieser Session nicht erreichbar, um das selbst zu tun.

## Next Phase Readiness
- Migration 0139 und `MemberPointTotalsRepository.ListRanking` stehen fuer Plan 109-03 (Lese-Endpunkt) bereit.
- Boundary-Schutz fuer Phase 106/107 bleibt vollstaendig intakt; keine Datei aus der geschuetzten Liste wurde beruehrt.
- Empfehlung: Vor `/gsd:verify-work` bzw. vor Abschluss der gesamten Phase 109 die oben genannten Live-Postgres-Tests mit gesetzter `TEAM4S_PHASE106_TEST_DSN` nachtraeglich einmal real ausfuehren, sobald Docker in der Ausfuehrungsumgebung erreichbar ist.

---
*Phase: 109-ranglisten-und-punkteprojektionen*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: database/migrations/0139_member_point_totals.up.sql
- FOUND: database/migrations/0139_member_point_totals.down.sql
- FOUND: backend/internal/repository/member_point_totals_repository.go
- FOUND commit: be6ba372 (Task 1)
- FOUND commit: 06f4995e (Task 2)
