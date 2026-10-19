---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
plan: 02
subsystem: auth
tags: [postgres, keycloak, oidc, account-takeover, security, tdd]

# Dependency graph
requires:
  - phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
    provides: "Befund #27 aus 2026-10-17-ux-findings-abgleich.md + 188-RESEARCH.md Analyse von EnsureAppUserForIdentity"
provides:
  - "KeycloakIdentity.EmailVerified-Feld, durchgereicht von claims.EmailVerified bis ins Repository"
  - "shouldResubjectByEmail-Gate: Re-Subjecting per E-Mail-Match greift ausschliesslich bei verifizierter E-Mail (D-07)"
  - "loadAppUserByEmail + resubjectAppUserByEmail in neuem Modul app_auth_repository_resubject.go"
  - "OpenPhase188Postgres-Fixture (echte Migration 0072 gegen schema-isolierte Testdatenbank)"
  - "Positiv-/Negativ-Postgres-Beweis fuer D-07 (Account-Uebernahme-Schutz)"
affects: [keycloak-login, app-users-table, member-profile-badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dateiaufteilung bei Ueberschreiten des 450-Zeilen-Limits direkt beim ersten Anfassen (app_auth_repository.go -> + app_auth_repository_resubject.go), ohne separaten reinen Umbau-Commit, da das Limit erst durch den neuen Code selbst ueberschritten wurde (keine Altlast zu refactoren)"
    - "Go-TDD-RED via bewusstem Kompilierfehler (undefined: shouldResubjectByEmail), nicht nur Laufzeit-Assertion"

key-files:
  created:
    - backend/internal/testsupport/phase188_postgres.go
    - backend/internal/repository/app_auth_repository_postgres_test.go
    - backend/internal/repository/app_auth_repository_resubject.go
  modified:
    - backend/internal/models/app_auth.go
    - backend/internal/middleware/current_user_auth.go
    - backend/internal/repository/app_auth_repository.go

key-decisions:
  - "shouldResubjectByEmail(emailVerified, emailMatchFound) = emailVerified && emailMatchFound -- einzige Bedingung fuer Re-Subjecting, exakt wie in D-07 gefordert"
  - "Re-Subjecting-Zweig nur im !found-Pfad (kein Subject-Treffer) geprueft, VOR dem bestehenden INSERT -- der Subject-Treffer-Pfad bleibt komplett unveraendert und hat weiterhin Vorrang"
  - "legacy_user_id bleibt beim Re-Subjecting unangetastet (von der per E-Mail gefundenen Zeile uebernommen) -- nur keycloak_subject, email, display_name, preferred_username, given_name, family_name, status, last_login_at/updated_at werden aktualisiert"
  - "loadAppUserByEmail waehlt bei mehreren historischen Treffern deterministisch die aelteste Zeile (ORDER BY created_at ASC, id ASC LIMIT 1) -- T-188-05 im Threat-Model als 'accept' disponiert, da aktuell 0 Live-Zeilen betroffen"
  - "Re-Subjecting-Helfer (shouldResubjectByEmail, resubjectAppUserByEmail, loadAppUserByEmail) in eigene Datei app_auth_repository_resubject.go ausgelagert, damit app_auth_repository.go nach der Erweiterung unter 450 Zeilen bleibt (364 statt 466)"

requirements-completed: [D-07]

# Metrics
duration: ~25min
completed: 2026-10-19
---

# Phase 188 Plan 02: Gated E-Mail-Re-Subjecting (Befund #27 / D-07) Summary

**`EnsureAppUserForIdentity` reiht bei Keycloak-Delete+Recreate jetzt den bestehenden `app_users`-Datensatz um das neue Subject, aber ausschliesslich wenn Keycloak die E-Mail als verifiziert meldet -- eine unverifizierte E-Mail kann ein bestehendes Konto nachweislich nie uebernehmen.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-19T23:07:00Z (approx.)
- **Completed:** 2026-10-19T23:17:00Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `KeycloakIdentity.EmailVerified` ergaenzt und von `claims.EmailVerified` (bereits in `oidc.go` vorhanden) bis ins Repository durchgereicht -- der Claim "verschwand" vorher komplett an der Modellgrenze
- Neue, pure Gate-Funktion `shouldResubjectByEmail(emailVerified, emailMatchFound)` entscheidet ausschliesslich ueber Re-Subjecting; vier Faelle per Tabellentest bewiesen
- `EnsureAppUserForIdentity` reiht bei keinem Subject-Treffer UND verifizierter E-Mail UND vorhandenem E-Mail-Treffer die bestehende Zeile per `UPDATE` um (neues `keycloak_subject`, `legacy_user_id` bleibt unberuehrt) statt eine neue Zeile zu `INSERT`en
- Der bestehende Subject-Treffer-Pfad bleibt komplett unveraendert und wird weiterhin zuerst geprueft (hat Vorrang vor jedem E-Mail-Check)
- Neue Postgres-Fixture `OpenPhase188Postgres` wendet die ECHTE Migration 0072 (inkl. `uq_app_users_keycloak_subject`-UNIQUE- und Status-CHECK-Constraint) gegen eine schema-isolierte Testdatenbank an
- Echter Positiv-Beweis (Subject-Wechsel + verifizierte E-Mail -> dieselbe Zeile, genau 1 Zeile in `app_users`) UND echter Negativ-Beweis (Subject-Wechsel + UNVERIFIZIERTE E-Mail -> neue Zeile, genau 2 Zeilen) gegen eine echte Postgres-Transaktion, nicht nur Unit-Test der reinen Gate-Funktion
- `app_auth_repository.go` nach der Erweiterung ueber 450 Zeilen gewachsen (466) -> Re-Subjecting-Helfer in neues Modul `app_auth_repository_resubject.go` ausgelagert (364 + 117 Zeilen, beide unter dem Limit)
- `docker compose up -d --build team4sv30-backend` ausgefuehrt, Backend `/health` antwortet `{"status":"ok"}`
- `scripts/test-backend.sh` vollstaendig durchgelaufen (GATE: GREEN, exit code 0) -- `TEAM4S_PHASE188_TEST_DSN` wurde automatisch aus der live-derivierten DSN-Var-Liste erkannt und bedient, alle vier `TestShouldResubjectByEmail`-Faelle sowie beide neuen Postgres-Tests und der bestehende Source-Invarianten-Test liefen darin gruen mit

## Task Commits

Each task was committed atomically:

1. **Task 1: Neue Postgres-Fixture OpenPhase188Postgres** - `7188f0883` (feat)
2. **Task 2a (TDD RED): Failing Tests fuer gated E-Mail-Re-Subjecting** - `9e53c0931` (test)
2. **Task 2b (TDD GREEN): EmailVerified durchreichen + gated Re-Subjecting implementieren** - `ab82d56b8` (feat)

**Plan metadata:** (siehe finaler Commit nach diesem Dokument)

_Note: Task 2 war `tdd="true"` -- RED-Commit (Kompilierfehler `undefined: shouldResubjectByEmail`, bewusst) und GREEN-Commit (alle Tests gruen) wie vom Workflow verlangt getrennt._

## Files Created/Modified
- `backend/internal/testsupport/phase188_postgres.go` - `OpenPhase188Postgres`, wendet echte Migration 0072 gegen schema-isolierte Testdatenbank an (inkl. minimaler `users`-Stand-in-Tabelle fuer die `legacy_user_id`-FK)
- `backend/internal/repository/app_auth_repository_postgres_test.go` - `TestShouldResubjectByEmail` (4 reine Faelle) + Positiv-/Negativ-Postgres-Test fuer D-07
- `backend/internal/models/app_auth.go` - `KeycloakIdentity.EmailVerified bool` neues Feld
- `backend/internal/middleware/current_user_auth.go` - `EmailVerified: claims.EmailVerified` im einzigen `KeycloakIdentity{...}`-Konstruktionsort ergaenzt
- `backend/internal/repository/app_auth_repository.go` - `EnsureAppUserForIdentity` um gated Re-Subjecting-Zweig im `!found`-Pfad erweitert (364 Zeilen nach Auslagerung)
- `backend/internal/repository/app_auth_repository_resubject.go` - NEU: `shouldResubjectByEmail`, `resubjectAppUserByEmail`, `loadAppUserByEmail` (117 Zeilen)

## Decisions Made
- Re-Subjecting-Pruefung nur ausgefuehrt, wenn `identity.EmailVerified` bereits true ist (kein unnoetiger `loadAppUserByEmail`-Query bei unverifizierter E-Mail) -- funktional identisch zu `shouldResubjectByEmail`, aber vermeidet eine unnoetige Query im Mehrheitsfall (bestehende Nutzer mit Subject-Treffer durchlaufen diesen Zweig ohnehin nie)
- Datei-Aufteilung (`app_auth_repository_resubject.go`) als Teil desselben GREEN-Commits statt als separater reiner Umbau-Commit, weil es keinen vorbestehenden Zustand &gt;450 Zeilen zu refactoren gab -- das Limit wurde erst durch den neuen Code in genau diesem Task ueberschritten (CLAUDE.md-Modularitaetsregel erfuellt: beide resultierenden Dateien ≤450 Zeilen, fachlich sinnvoll getrennt: Kern-CRUD vs. Re-Subjecting-Konzern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - CLAUDE.md-Konformitaet] app_auth_repository.go ueberschritt nach der geplanten Aenderung das 450-Zeilen-Limit**
- **Found during:** Task 2 (nach Implementierung des gated Re-Subjecting-Zweigs)
- **Issue:** Der Plan ging davon aus, die Datei bleibe ≤450 Zeilen ("keine Datei-Aufteilung nötig"); tatsaechlich wuchs sie nach der vollstaendigen Umsetzung auf 466 Zeilen.
- **Fix:** `shouldResubjectByEmail`, `resubjectAppUserByEmail` und `loadAppUserByEmail` in eine neue, fachlich abgegrenzte Datei `app_auth_repository_resubject.go` ausgelagert (117 Zeilen); `app_auth_repository.go` dadurch auf 364 Zeilen reduziert. Oeffentliche Verwendungsstellen (`EnsureAppUserForIdentity`) unveraendert, da alle ausgelagerten Funktionen paket-intern (lowercase) bleiben.
- **Files modified:** backend/internal/repository/app_auth_repository.go, backend/internal/repository/app_auth_repository_resubject.go (neu)
- **Verification:** `go build ./...` und `go vet ./...` clean; `wc -l` beider Dateien ≤450; alle Tests (inkl. `TestEnsureAppUserForIdentityStaysAppUserOnly`, der direkt den Quelltext von `app_auth_repository.go` liest) weiterhin gruen
- **Committed in:** `ab82d56b8` (Task 2 GREEN-Commit)

---

**Total deviations:** 1 auto-fixed (Rule 2, CLAUDE.md-Modularitaetsregel)
**Impact on plan:** Kein Scope-Creep -- reine Organisationsaenderung zur Einhaltung der 450-Zeilen-Regel, keine Verhaltensaenderung, keine neuen oeffentlichen Schnittstellen.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-07 (sicherheitskritischer Teil von Befund #27) vollstaendig geschlossen: Re-Subjecting per E-Mail-Match ist durch `shouldResubjectByEmail` strikt auf verifizierte E-Mails gegated, Positiv- UND Negativ-Fall echt gegen eine Postgres-Transaktion bewiesen
- `docker compose up -d --build team4sv30-backend` und `scripts/test-backend.sh` (voller Backend-Suite-Lauf, GATE: GREEN) nach den Code-Aenderungen ausgefuehrt -- keine Regressionen in anderen Paketen
- Keine Blocker fuer nachfolgende 188-xx-Plaene dieser Phase

---
*Phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen*
*Completed: 2026-10-19*

## Self-Check: PASSED
- FOUND: backend/internal/testsupport/phase188_postgres.go
- FOUND: backend/internal/repository/app_auth_repository_postgres_test.go
- FOUND: backend/internal/repository/app_auth_repository_resubject.go
- FOUND: backend/internal/models/app_auth.go
- FOUND: backend/internal/middleware/current_user_auth.go
- FOUND: backend/internal/repository/app_auth_repository.go
- FOUND: commit 7188f0883 (Task 1)
- FOUND: commit 9e53c0931 (Task 2, RED)
- FOUND: commit ab82d56b8 (Task 2, GREEN)
