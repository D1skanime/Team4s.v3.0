---
phase: 188
slug: ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-19
---

# Phase 188 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Extrahiert aus
> `188-RESEARCH.md` ("Validation Architecture"-Abschnitt) nach dem Blocker-Befund des
> Plan-Checkers (fehlende `*-VALIDATION.md`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | Go `testing` + `testify` (require/assert), Postgres-Fixtures über `backend/internal/testsupport` |
| **Framework (Frontend)** | Vitest 3 |
| **Config file (Backend)** | kein separates Config-File — Fixtures sind opt-in über `TEAM4S_PHASE<N>_TEST_DSN`-Env-Vars, sonst `t.Skip`/`t.Fatalf` |
| **Config file (Frontend)** | `frontend/vitest.config.ts` |
| **Quick run command (Backend, #18/#27 gezielt)** | `go test ./internal/repository/... -run TestLoadContribProjectsCount...` bzw. `-run TestEnsureAppUserForIdentity...` mit `TEAM4S_PHASE106_TEST_DSN`/`TEAM4S_PHASE188_TEST_DSN` |
| **Quick run command (Frontend, #35.1 gezielt)** | `cd frontend && npm run test -- publicImagePatterns ResponsiveImage.config` |
| **Full suite command (Backend)** | `scripts/test-backend.sh` |
| **Full suite command (Frontend)** | `npm run test` (Vitest, volle Suite) |
| **Estimated runtime** | ~90s gezielt (Backend-Fixture-Tests), ~15s gezielt (Frontend); volles Gate je nach Suite mehrere Minuten (unverändert gegenüber Bestand) |

---

## Sampling Rate

- **After every task commit:** jeweils der oben genannte gezielte Befehl für den gerade geänderten Befund.
- **After every plan wave:** volle Backend-Fixture-Suite (`go test ./internal/repository/... ./cmd/...` mit allen gesetzten `TEAM4S_PHASE*_TEST_DSN`) + `npm run test` (Frontend).
- **Before `/gsd:verify-work`:** `scripts/test-backend.sh` (volles Gate) UND volle Frontend-Suite grün.
- **Max feedback latency:** < 10s pro gezieltem Testlauf (keine Watch-Mode-Flags, keine vollen E2E-Läufe pro Task).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 188-01-01 | 01 | 1 | D-04/D-05/D-06 | — | N/A | integration (Postgres-Fixture) | `TEAM4S_PHASE106_TEST_DSN=... go test ./internal/repository/... -run "TestLoadContribProjectsCountMaxEpisodesDenominatorRejectsPartialLedgerCoverage\|TestLoadContribProjectsCountDistinctEpisodeDedupesMultipleVersionsOfSameEpisode\|TestLoadContribProjectsCountNullMaxEpisodesFallbackStaysReleaseVersionCount" -v` | ✅ Datei existiert, Testfälle ERWEITERT | ⬜ pending |
| 188-01-02 | 01 | 1 | D-04/D-05/D-06 | — | N/A | integration (Postgres-Fixture) | `TEAM4S_PHASE106_TEST_DSN=... go test ./internal/repository/... -run TestLoadContributionBadges -v` | ✅ Datei existiert | ⬜ pending |
| 188-02-01 | 02 | 1 | D-07 | T-188-03 | `email_verified` korrekt durchgereicht, keine Verhaltensänderung ohne Gate | build/vet | `go build ./internal/testsupport/... && go vet ./internal/testsupport/...` | ❌ Wave 0 (neue Fixture `phase188_postgres.go`) | ⬜ pending |
| 188-02-02 | 02 | 1 | D-07 | T-188-03 | Re-Subjecting NUR bei `email_verified=true`; unverifiziert → kein Account-Übernahme-Pfad | integration + unit (Postgres-Fixture + reine Funktion) | `TEAM4S_PHASE188_TEST_DSN=... go test ./internal/repository/... -run "TestShouldResubjectByEmail\|TestEnsureAppUserForIdentityResubjectsOnVerifiedEmailMatch\|TestEnsureAppUserForIdentityDoesNotResubjectUnverifiedEmail\|TestEnsureAppUserForIdentityStaysAppUserOnly" -v` | ❌ Wave 0 (neue Testfälle, Positiv+Negativ) | ⬜ pending |
| 188-03-01 | 03 | 1 | D-08 | T-188-04 (Information Disclosure, akzeptiert — CLI-only) | Reiner `SELECT`-Report, keine Mutation | integration (Postgres-Fixture, Team4s + Keycloak-DB) | `TEAM4S_PHASE106_TEST_DSN=... go test ./cmd/report-orphaned-app-users/... -v` (inkl. `TestReportPackageNeverMutatesData`-Abwesenheitsprüfung) | ❌ Wave 0 (komplett neues Paket) | ⬜ pending |
| 188-03-02 | 03 | 1 | D-08 | — | N/A | build/vet | `go build ./cmd/report-orphaned-app-users/... && go vet ./cmd/report-orphaned-app-users/...` | ❌ Wave 0 | ⬜ pending |
| 188-04-01 | 04 | 1 | D-09 | T-188-05 (Input Validation, `new URL()` bleibt Validierungsquelle) | Fail-fast mit klarer deutscher Fehlermeldung, kein stiller Fallback | unit (reine Funktion, kein DOM/Browser) | `cd frontend && npm run test -- publicImagePatterns ResponsiveImage.config` | ❌ Wave 0 (neue Testdatei) | ⬜ pending |
| 188-05-01 | 05 | 1 | D-14 | — | N/A (reiner Umbau, Verhalten unverändert) | build/vet + volle Bestandssuite | `cd backend && go build ./... && go vet ./... && go test ./internal/permissions/... ./internal/repository/... ./internal/handlers/... -count=1` | ✅ Dateien existieren, werden gesplittet | ⬜ pending |
| 188-05-02 | 05 | 1 | D-12 | T-188-05-01 (Elevation of Privilege, `confirmed`-Filter + Scoping) | `status='confirmed'` + exaktes `(anime_id, fansub_group_id)`-Scoping, kein Cross-Anime-Leak | integration (neue Postgres-Fixture `phase188_permissions_postgres.go`) | `TEAM4S_PHASE188_PERMISSIONS_TEST_DSN=... go test ./internal/repository/... -run "TestListActorContributionRolesForAnimeProject" -v` | ❌ Wave 0 (neues Paket `authz_anime_project.go` + Fixture) | ⬜ pending |
| 188-05-03 | 05 | 1 | D-12/D-13 | T-188-05-04 (Elevation of Privilege, optionale Typassertion fail-closed statt fail-open) | Gruppenrolle ODER bestätigte Projektrolle gewährt, kein hartcodierter Rollen-Name im Produktionscode | unit (reine Entscheidungsfunktion, Cache-Stub) | `cd backend && go test ./internal/permissions/... -run TestCanForAnimeProject -v && go build ./...` | ❌ Wave 0 (neue Datei `permissions_anime_project.go`) | ⬜ pending |
| 188-05-04 | 05 | 1 | D-10/D-11 | T-188-05-02 (Elevation of Privilege, gezielte statt blunter Migration) | `fansub_lead` additiv gewährt, `typesetter` gezielt entzogen, kein Massen-`DELETE` | integration (Migrations-Fixture, Live-Up/Down/Up) | `cd backend && go test ./internal/migrations/... -run TestPhase188ProjectTimelineFansubLead -v` | ❌ Wave 0 (neue Migration 0185 + Migrationstest) | ⬜ pending |
| 188-05-05 | 05 | 1 | D-12/D-13 | T-188-05-03 (Tampering, `animeId`/`anime_id`-Parsing) | Projektbezogene Freischaltung im Handler UND im Capabilities-Endpunkt, gruppenweiter Fallback ohne `anime_id` bleibt unverändert | integration (`httptest` + Fake-Resolver-Stub) | `cd backend && go test ./internal/handlers/... -run "TestUpdateAnimeFansubProjectTimeline\|TestGetFansubGroupCapabilities" -v` | ✅ Dateien existieren, Tests A–D neu/erweitert | ⬜ pending |
| 188-05-06 | 05 | 1 | D-12/D-13/D-14 | — | Projektbezogene Freischaltung im Frontend überschreibt gruppenweite Fallback-Prop, bestehende Aufrufer bleiben kompatibel | unit/component (Vitest, `@/lib/api` gemockt) + `tsc --noEmit` | `cd frontend && npx tsc --noEmit && npm run test -- AnimeProjectTimelineSection FansubAppMembersSection` | ❌ Wave 0 (neue Datei `AnimeProjectReleaseCard.tsx` + neuer Test `AnimeProjectTimelineSection.test.tsx`) | ⬜ pending |
| 188-05-07 | 05 | 1 | D-10/D-11/D-12 | — | Migration live angewendet, Permission-Cache neu geladen, echter Bestandsfall (Strawhat Subs/Anime 3/app_user 6) funktioniert | manuell (blockierender Live-Checkpoint) + automatisierte Migrationsstand-Prüfung | `docker compose exec team4sv30-db psql -U team4s -d team4s_v2 -tAc "SELECT 1 FROM schema_migrations WHERE version = 185;" \| grep -q 1` (automatisierter Teil, live gegengeprüft — kein `./migrate`-Binary im Dev-Backend-Container) + manuelle Schritte laut `188-05-PLAN.md` Task 7 | ✅ Nutzerbestätigung "verifiziert" nötig | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/testsupport/phase188_postgres.go` — `OpenPhase188Postgres` mit vollem Migration-0072-Schema (`app_users` inkl. `UNIQUE(keycloak_subject)`, `users`-Legacy-Tabelle)
- [ ] `backend/internal/repository/app_auth_repository_postgres_test.go` (oder gleichnamig erweitert) — Positiv-/Negativ-Fall D-07
- [ ] `backend/cmd/report-orphaned-app-users/` — komplettes neues Paket (`main.go`, `report.go`, `report_test.go`)
- [ ] `frontend/src/lib/images/publicImagePatterns.test.ts` (bzw. passendes Vitest-Pattern für `.mjs`-Quelldateien im Projekt) — Fail-Fast-Testfall für D-09
- [ ] `backend/internal/testsupport/phase188_permissions_postgres.go` — `OpenPhase188PermissionsPostgres`, eigenständige Fixture (kollidiert bewusst NICHT mit `phase188_postgres.go` aus Plan 188-02, siehe Namenskollisions-Warnung in `188-05-PLAN.md`)
- [ ] `backend/internal/repository/authz_anime_project.go` + `authz_anime_project_postgres_test.go` — neue Resolver-Fähigkeit `ListActorContributionRolesForAnimeProject`
- [ ] `backend/internal/permissions/permissions_anime_project.go` + `_test.go` — neue `Service.CanForAnimeProject` + `AnimeProjectContributionResolver`-Interface
- [ ] `database/migrations/0185_anime_project_timeline_fansub_lead.{up,down}.sql` + `backend/internal/migrations/phase188_project_timeline_fansub_lead_test.go`
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectReleaseCard.tsx` (Split-Ergebnis von `AnimeReleasesCockpit.tsx`) + `AnimeProjectTimelineSection.test.tsx`
- Framework-Install: keines nötig — alle Test-Frameworks sind bereits vorhanden.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Echter Live-Fall (Strawhat Subs, Anime 3, app_user 6) kann den Projektzeitraum setzen; Migration 0185 ist nach Backend-Rebuild live angewendet; Permission-Cache ist neu geladen | D-10/D-11/D-12 | Erfordert echten Server-/Frontend-Neustart (Permission-Cache wird nur beim Start geladen) und eine echte Browser-Session gegen den Live-Bestand — kein sinnvoller automatisierter Ersatz für den eigentlichen Endnutzer-Workflow | Siehe `188-05-PLAN.md` Task 7, `<how-to-verify>` (8 Schritte, blockierender Checkpoint, Nutzerbestätigung "verifiziert" erforderlich) |

Alle übrigen Phase-Verhaltensweisen (D-04 bis D-09 sowie die SQL-/Logik-/Migrationsebenen von D-10
bis D-14) haben zusätzlich vollständige automatisierte Verifikation — der Live-Checkpoint ist eine
Ergänzung für den konkreten Endnutzer-Workflow, kein Ersatz dafür.

---

## Validation Sign-Off

- [x] Alle Tasks haben `<automated>` verify oder Wave-0-Abhängigkeiten
- [x] Sampling-Kontinuität: keine 3 aufeinanderfolgenden Tasks ohne automatisierten Verify
- [x] Wave 0 deckt alle MISSING-Referenzen ab (siehe Liste oben)
- [x] Keine Watch-Mode-Flags in den Automated-Commands
- [x] Feedback-Latenz < 10s pro gezieltem Testlauf
- [x] `nyquist_compliant: true` im Frontmatter gesetzt

**Approval:** pending (Ausführung noch nicht gestartet — diese Phase wird laut Auftrag NICHT ausgeführt)
