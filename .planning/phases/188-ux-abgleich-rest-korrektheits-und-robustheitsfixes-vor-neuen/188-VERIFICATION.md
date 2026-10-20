---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
verified: 2026-10-20T09:01:55Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
---

# Phase 188: UX-Abgleich-Rest — Korrektheits- und Robustheitsfixes vor neuen Features Verification Report

**Phase Goal:** Die drei verbliebenen Korrektheits- und Robustheitsbefunde aus dem UX-Abgleich vom
2026-10-17 (#18 Badge-Nenner-Korrektheit, #27 Re-Subjecting-Sicherheitslücke + Datenkonsistenz,
#35.1 Config-Robustheit) sind behoben und mit echten Verhaltens-Tests belegt, bevor neue
Feature-Arbeit beginnt. Zusätzlich (additiv am 2026-10-19 aufgenommen): Der Bug "Leader/
Projektleiter kann Projektzeitraum nicht setzen" ist behoben — bestätigte Projektrollen aus
anime_contribution_roles zählen jetzt zusätzlich zu Gruppenrollen bei der Rechteprüfung für
anime_fansub_project.timeline.update.

**Verified:** 2026-10-20T09:01:55Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-04/D-05/D-06: Badge-Nenner "Mitgetragene Projekte" nutzt `anime.max_episodes`, NULL-Rückfall auf `COUNT(*)`, Zähler auf `DISTINCT episode_id` | ✓ VERIFIED | `backend/internal/repository/member_profile_contribution_badges_repository.go:68-105` liest wörtlich die in 188-RESEARCH.md geprüfte Formel (`COALESCE(MAX(pv.max_episodes), COUNT(*))` als Nenner, `COUNT(DISTINCT pv.episode_id) FILTER(...)` als Zähler, `WHERE numerator >= denominator AND denominator > 0`). Drei neue Postgres-Tests (`TestLoadContribProjectsCountMaxEpisodesDenominatorRejectsPartialLedgerCoverage`, `...DistinctEpisodeDedupes...`, `...NullMaxEpisodesFallback...`) existieren und ihre Assertions spiegeln exakt D-04/D-05/D-06. |
| 2 | D-07: Re-Subjecting per E-Mail-Match greift NUR bei `email_verified=true`; Subject-Match-Pfad bleibt vorrangig/unverändert | ✓ VERIFIED | `KeycloakIdentity.EmailVerified` (`models/app_auth.go:73`) wird aus `claims.EmailVerified` durchgereicht (`middleware/current_user_auth.go:88`). `EnsureAppUserForIdentity` (`app_auth_repository.go:68-90`) prüft `found` (Subject-Match) zuerst und unverändert; erst im `!found`-Zweig und nur bei `identity.EmailVerified==true` wird `loadAppUserByEmail` aufgerufen; `shouldResubjectByEmail(emailVerified, emailMatchFound) = emailVerified && emailMatchFound` (`app_auth_repository_resubject.go:21`) ist eine reine AND-Gate-Funktion. Positiv-/Negativ-Postgres-Tests (`TestEnsureAppUserForIdentityResubjectsOnVerifiedEmailMatch`, `...DoesNotResubjectUnverifiedEmail`) sowie der 4-Fälle-Unit-Test `TestShouldResubjectByEmail` existieren. |
| 3 | D-08: Rein lesendes Hygiene-CLI listet verwaiste `app_users`-Zeilen, verändert nie Daten | ✓ VERIFIED | `backend/cmd/report-orphaned-app-users/{report.go,main.go}` enthalten ausschließlich `SELECT`-Statements (`fetchAppUserSubjects`, `fetchKeycloakSubjectIDs`), `computeOrphanedAppUsers` ist eine reine Set-Diff-Funktion. `TestReportPackageNeverMutatesData` (zulässige Abwesenheitsprüfung) beweist strukturell das Fehlen von DELETE/UPDATE/INSERT. |
| 4 | D-09: Ungültiger `NEXT_PUBLIC_API_URL`-Wert bricht mit eindeutiger deutscher Fehlermeldung ab; gültige/leere Werte bleiben unverändert | ✓ VERIFIED | `publicImagePatterns.mjs:45-53`: `new URL(trimmed)` ist in try/catch gekapselt, `catch`-Zweig wirft `new Error("Ungültige Umgebungsvariable NEXT_PUBLIC_API_URL: ...")`. Vier Tests in `publicImagePatterns.test.ts` (gültig/leer/zwei ungültige Werte) laufen grün; `ResponsiveImage.config.test.ts` (13 Tests, Bestandsdatei) bleibt unverändert grün. |
| 5 | D-10: `fansub_lead` (Gruppenrolle) kann Projektzeitraum setzen, ohne zusätzliche Projektrolle | ✓ VERIFIED | Live-DB-Check: `role_capabilities` enthält `fansub_lead` für `anime_fansub_project.timeline.update` (Migration 185 angewendet). Unit-Test `TestCanForAnimeProjectAllowsFansubLeadGroupRoleAfterMigration` deckt dies ab. |
| 6 | D-11: `typesetter` kann Projektzeitraum NICHT mehr setzen (Gruppen- oder Projektrolle) | ✓ VERIFIED | Live-DB-Check: `role_capabilities` enthält `typesetter` NICHT mehr für diese Action. Zwei Regressionstests (`TestCanForAnimeProjectDeniesTypesetterAfterMigrationGroupRole`/`...ProjectRole`) decken beide Varianten ab. |
| 7 | D-12: Bestätigte `anime_contribution_roles`-Projektrolle für genau Anime+Gruppe gewährt Zugriff auch ohne granting Gruppenrolle (Kernfall Strawhat Subs/Anime 3/app_user 6) | ✓ VERIFIED | `CanForAnimeProject` (`permissions_anime_project.go:39-96`) fällt bei fehlendem Gruppenrecht auf `ListActorContributionRolesForAnimeProject` zurück; SQL filtert exakt auf `ac.anime_id=$1 AND ac.fansub_group_id=$2 AND ac.status='confirmed' AND fgm.app_user_id=$3 AND fgm.status='active'`. Unit-Test `TestCanForAnimeProjectAllowsConfirmedProjectLeadWithoutGroupGrant` + Postgres-Test `TestListActorContributionRolesForAnimeProjectReturnsConfirmedRoles` sowie Handler-Test A beweisen den Kernfall. Live-UAT vom Nutzer "verifiziert" bestätigt (siehe 188-05-SUMMARY.md, Live-Checkpoint Task 7, zählt laut Auftrag als erbrachter menschlicher Nachweis). |
| 8 | D-12 Sicherheitsgrenze: unbestätigter Status oder anderes Anime gewährt KEINEN Zugriff | ✓ VERIFIED | Postgres-Tests `TestListActorContributionRolesForAnimeProjectExcludesUnconfirmedContribution` (status='draft' → leere Liste) und `...ExcludesCrossAnimeContribution` (anderes `anime_id` → leere Liste) existieren und laufen gegen eine echte Postgres-Fixture. |
| 9 | D-13: Keine hartcodierten Rollen-Namen im geänderten Handler-/Frontend-Produktionscode; Entscheidung ausschließlich über `role_capabilities`/`CapabilityRightState` | ✓ VERIFIED | `grep -nE "fansub_lead\|project_lead\|typesetter"` liefert 0 Treffer in `permissions_anime_project.go`, `admin_content_anime_project_timeline.go`, `app_auth_capabilities.go`, `AnimeProjectTimelineSection.tsx`, `fansub-members.ts` (selbst nachgeprüft, nicht nur SUMMARY.md übernommen). `CanForAnimeProject` entscheidet ausschließlich über `groupRights.Can(action)` und `roleAllows(code, action)`. |
| 10 | D-13: Projektzeitraum-Datumsfelder schalten sich pro Projekt frei (eigener Capability-Abruf mit `anime_id`), nicht mehr pauschal gruppenweit | ✓ VERIFIED | `AnimeProjectTimelineSection.tsx:68-83`: zweiter `useEffect` ruft `getFansubGroupCapabilities(fansubId, undefined, { animeId })` auf, `effectiveCanEdit = projectCanEdit ?? canEdit`. Backend: `GetFansubGroupCapabilities` (`app_auth_capabilities.go:118-131`) nutzt `CanForAnimeProject` nur wenn `anime_id`-Query gesetzt ist, sonst unverändert `CanForFansubGroup` (Regressionsschutz, Handler-Test D). Frontend-Test `AnimeProjectTimelineSection.test.tsx` (3 Tests) grün nachvollzogen. |
| 11 | D-14: Vorab >450-Zeilen-Dateien (`permissions.go`, `authz_permissions.go`, `AnimeReleasesCockpit.tsx`) sind aufgeteilt, jede Teildatei ≤450 Zeilen | ✓ VERIFIED | `wc -l` selbst ausgeführt: `permissions.go`=311, `permissions_types.go`=285, `permissions_cache.go`=252, `permissions_release.go`=139, `permissions_anime_project.go`=96, `authz_permissions.go`=238, `authz_resolve.go`=166, `authz_roles.go`=201, `authz_anime_project.go`=69, `AnimeReleasesCockpit.tsx`=192, `AnimeProjectReleaseCard.tsx`=352 — alle ≤450. Datei-Split liegt als isolierter Umbau-Commit (`62fe21202`) vor `git show --stat` bestätigt reinen Verschiebe-Diff. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/member_profile_contribution_badges_repository.go` | `loadContribProjectsCount` mit max_episodes-Nenner/NULL-Rückfall/DISTINCT-Zähler | ✓ VERIFIED | Code gelesen, exakt wie spezifiziert |
| `backend/internal/repository/member_profile_contribution_badges_repository_test.go` | 3 neue Postgres-Tests | ✓ VERIFIED | `TestLoadContribProjectsCount{MaxEpisodesDenominatorRejectsPartialLedgerCoverage,DistinctEpisodeDedupesMultipleVersionsOfSameEpisode,NullMaxEpisodesFallbackStaysReleaseVersionCount}` existieren mit den im Plan beschriebenen Fixtures |
| `backend/internal/models/app_auth.go` | `KeycloakIdentity.EmailVerified` | ✓ VERIFIED | Feld vorhanden, Zeile 73 |
| `backend/internal/middleware/current_user_auth.go` | `EmailVerified: claims.EmailVerified` | ✓ VERIFIED | Zeile 88 |
| `backend/internal/repository/app_auth_repository.go` + `app_auth_repository_resubject.go` | `loadAppUserByEmail`, `shouldResubjectByEmail`, gated Re-Subjecting-Zweig | ✓ VERIFIED | Code in beiden Dateien (450-Zeilen-Split, 364+117 Zeilen) exakt nach Plan |
| `backend/internal/testsupport/phase188_postgres.go` | `OpenPhase188Postgres`, volles app_users+users-Schema | ✓ VERIFIED | Datei existiert, Tests darauf nutzen sie erfolgreich |
| `backend/cmd/report-orphaned-app-users/{report.go,main.go,report_test.go}` | read-only CLI + Tests | ✓ VERIFIED | `go build`/`go test` grün, Abwesenheitstest grün |
| `frontend/src/lib/images/publicImagePatterns.mjs` + `.test.ts` | try/catch Fail-Fast | ✓ VERIFIED | Code + 4 Tests grün |
| `backend/internal/repository/authz_anime_project.go` | `ListActorContributionRolesForAnimeProject` | ✓ VERIFIED | SQL exakt nach Spezifikation, Compile-Zeit-Assertion aktiv |
| `backend/internal/permissions/permissions_anime_project.go` | `AnimeProjectContributionResolver` + `CanForAnimeProject` | ✓ VERIFIED | Code gelesen, Logikfluss exakt wie CanForReleaseVersion-Vorlage |
| `database/migrations/0185_*.up.sql`/`.down.sql` | additiv fansub_lead + gezielt typesetter-Rücknahme | ✓ VERIFIED | Live gegen DB bestätigt (`role_capabilities` zeigt exakt `fansub_lead`,`project_lead`); kein `DELETE FROM role_capabilities;` ohne WHERE |
| `backend/internal/handlers/admin_content_anime_project_timeline.go` | `CanForAnimeProject` statt `CanForFansubGroup` | ✓ VERIFIED | Code gelesen, `animeID` wird vor der Prüfung selbst geparst |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx` | projektbezogener Capability-Abruf | ✓ VERIFIED | Code + Test gelesen/ausgeführt |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `requireAnimeProjectTimelineWriteAccess` | `permissions.Service.CanForAnimeProject` | `h.permissionSvc.CanForAnimeProject(ctx, actor, ActionAnimeFansubProjectTimelineUpdate, animeID, fansubID)` | ✓ WIRED | Zeile 76-78 des Handlers, bestätigt gelesen |
| `permissions.Service.CanForAnimeProject` | `repository.AuthzRepository.ListActorContributionRolesForAnimeProject` | Typassertion `s.resolver.(AnimeProjectContributionResolver)` | ✓ WIRED | `permissions_anime_project.go:71-86`; Compile-Zeit-Assertion in `authz_anime_project.go:69` aktiv |
| `AnimeProjectTimelineSection.tsx` | `GET /api/v1/admin/fansubs/:id/capabilities?anime_id=` | `getFansubGroupCapabilities(fansubId, undefined, { animeId })` | ✓ WIRED | Frontend-Code + Backend-Query-Parsing (`app_auth_capabilities.go:122-131`) beide bestätigt |
| `backend/internal/repository/app_auth_repository.go` (`EnsureAppUserForIdentity`) | `app_auth_repository_resubject.go` (`shouldResubjectByEmail`, `resubjectAppUserByEmail`, `loadAppUserByEmail`) | direkter Funktionsaufruf, selbes Package | ✓ WIRED | Code gelesen, Aufrufkette nachvollzogen |
| `report-orphaned-app-users/main.go` | `report.go:runReport` | zwei `pgxpool.Pool`-Instanzen | ✓ WIRED | `main.go` ruft `runReport(ctx, teamPool, keycloakPool)` auf |

### Behavioral Spot-Checks / Live-DB-Checks (selbst ausgeführt, nicht aus SUMMARY.md übernommen)

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| D-10/D-11 Live-DB | `SELECT role_code FROM role_capabilities WHERE action_code='anime_fansub_project.timeline.update'` | `fansub_lead`, `project_lead` (exakt diese zwei, kein `typesetter`) | ✓ PASS |
| Migration 185 angewendet | `SELECT 1 FROM schema_migrations WHERE version=185` | `1` | ✓ PASS |
| Keine App-User-E-Mail-Duplikate (Live-Bestand) | `SELECT email, count(*) FROM app_users GROUP BY email HAVING count(*)>1` | 0 Zeilen | ✓ PASS |
| `go build ./...` (im Backend-Container) | — | clean, 0 Fehler | ✓ PASS |
| `go vet ./...` (im Backend-Container) | — | clean, 0 Fehler | ✓ PASS |
| Volles Backend-Test-Gate (`scripts/test-backend.sh`), eigener, unabhängig durchgeführter Lauf | `bash scripts/test-backend.sh` | `GATE: GREEN (0)` (eine erste, durch parallele Verifikations-Läufe meinerseits verursachte RED-Teilmenge im Phase-134-Matrix-Cluster — reine Docker-DNS-Transiente, nichts mit Phase 188 zu tun — wurde durch einen zweiten, isolierten Lauf als nicht reproduzierbar/irrelevant bestätigt) | ✓ PASS (nach Bereinigung der selbstverursachten Nebenläufigkeit) |
| Volle Frontend-Testsuite (`npm run test`), eigener Lauf | `npm run test` | 394 Dateien passed / 1 skipped (395), 3634 Tests passed / 3 todo (3637), **0 Failures** | ✓ PASS |
| Der in der Aufgabe benannte bekannte Flake | `npm run test -- "src/app/members/[slug]/not-found.test.tsx"` zweimal hintereinander | 1. Lauf: 1 Test FAIL (waitFor-Timeout), 2. Lauf (isoliert): 2/2 PASS | ✓ Bestätigt als echter, nicht-deterministischer Flake — `git log` zeigt die Datei zuletzt in Phase 153/154 geändert, Phase 188 hat sie nicht berührt. Im vollen, saubersten Lauf dieser Verifikation (siehe oben) trat der Flake nicht auf (0 Failures). |
| D-13 Hardcoded-Role-Grep (alle 5 Dateien erneut selbst ausgeführt) | `grep -nE "fansub_lead\|project_lead\|typesetter"` | 0 Treffer in allen 5 Produktionsdateien | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| D-04 | 188-01 | Nenner = `anime.max_episodes` | ✓ SATISFIED | Code + Test verifiziert |
| D-05 | 188-01 | NULL-Rückfall auf heutige Logik | ✓ SATISFIED | Code + Test verifiziert |
| D-06 | 188-01 | Zähler auf `DISTINCT episode_id` | ✓ SATISFIED | Code + Test verifiziert |
| D-07 | 188-02 | Re-Subjecting nur bei verifizierter E-Mail | ✓ SATISFIED | Code + Positiv-/Negativ-Test verifiziert |
| D-08 | 188-03 | Hygiene-Report, keine Löschung | ✓ SATISFIED | Code + Abwesenheitstest verifiziert |
| D-09 | 188-04 | Fail-fast mit deutscher Fehlermeldung | ✓ SATISFIED | Code + Tests verifiziert |
| D-10 | 188-05 | `fansub_lead` gewinnt Recht | ✓ SATISFIED | Live-DB + Test verifiziert |
| D-11 | 188-05 | `typesetter` verliert Recht | ✓ SATISFIED | Live-DB + Test verifiziert |
| D-12 | 188-05 | Projektkontext-Prüfung (Gruppe+Anime) | ✓ SATISFIED | Code + Tests + Live-UAT verifiziert |
| D-13 | 188-05 | Keine hartcodierten Rollen-Namen | ✓ SATISFIED | grep selbst ausgeführt, 0 Treffer |
| D-14 | 188-05 | Dateien ≤450 Zeilen | ✓ SATISFIED | `wc -l` selbst ausgeführt, alle ≤450 |

Alle 11 Requirement-IDs (D-04 bis D-14) tauchen jeweils im `requirements:`-Frontmatter-Feld
mindestens eines der 5 Pläne auf (D-04/D-05/D-06 → 188-01, D-07 → 188-02, D-08 → 188-03, D-09 →
188-04, D-10/D-11/D-12/D-13/D-14 → 188-05). Keine Lücke, keine fehlende Zuordnung. D-01/D-02/D-03
sind laut Auftrag reine Scope-/Prozessentscheidungen ohne eigenen Code-Task und korrekt
ausgenommen. Phase 188 hat erwartungsgemäß keine eigene Sektion in REQUIREMENTS.md (additive,
nicht-Milestone-Phase, Decision-Coverage ausschließlich über das Plan-Frontmatter — bestätigt durch
eigene Suche in REQUIREMENTS.md).

### Anti-Patterns Found

Keine Blocker gefunden. Zwei bereits im Code-Review (188-REVIEW.md) dokumentierte, bewusst
akzeptierte Abweichungen, selbst nachvollzogen:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/cmd/report-orphaned-app-users/main.go` | 26 | Hartcodiertes Dev-Default-Passwort in Connection-String-Fallback (`keycloak_dev_password`) | ⚠️ Warning (WR-02, Review) | Entspricht bestehendem Repo-Muster (`docker-compose.yml`, `migrate-preview-backfill`), vollständig überschreibbar via `KEYCLOAK_DATABASE_URL`; bewusst dokumentiert, nicht in dieser Phase behoben (Review empfiehlt Follow-up) |
| `backend/internal/permissions/permissions_anime_project.go` | 62-91 | Projektrollen-Fallback wird vor Prüfung eines `user_deny` evaluiert (kann einen expliziten User-Deny auf Gruppenebene durch eine Projektrolle überschreiben) | ℹ️ Info (IN-01, Review) | Bewusst identisches, bereits etabliertes Verhalten wie `CanForReleaseVersion` (dokumentierter Trade-off, kein neuer Defekt dieser Phase) |

WR-01 (verwaister Doc-Kommentar nach Datei-Split) wurde bereits vor dieser Verifikation behoben
(Commit `dff3d0e22`, selbst im Code nachgeprüft — `authz_permissions.go`/`authz_roles.go` tragen
jeweils nur noch ihren eigenen, korrekten Doc-Kommentar).

### Human Verification Required

Keine offenen Punkte. Der einzige in dieser Phase vorgesehene blockierende menschliche
Live-Checkpoint (Plan 188-05, Task 7: Login als `app_user 6`/Strawhat Subs, Projektzeitraum für
„11eyes: Pink Phantasmagoria" setzen) wurde bereits vom Nutzer durchgeführt und wörtlich als
"verifiziert" bestätigt (188-05-SUMMARY.md, Zitat enthalten). Gemäß Auftrag zählt dies als
erbrachter Nachweis für den menschlichen Verifikationsteil und wird hier nicht erneut als offenes
`human_needed`-Item eingestuft.

### Gaps Summary

Keine Gaps. Alle 11 beobachtbaren Wahrheiten (D-04 bis D-14) sind durch selbst gelesenen
Produktionscode, selbst ausgeführte Tests (nicht nur SUMMARY.md-Behauptungen), einen eigenen,
sauberen vollständigen Backend-Test-Lauf (`GATE: GREEN (0)`), einen eigenen vollständigen
Frontend-Test-Lauf (3634/3637 Tests, 0 Failures in diesem Lauf) und direkte Live-Datenbank-Abfragen
bestätigt. Eine erste Teilmenge von 9 Testfehlschlägen in einem eigenen Zwischenlauf
(`internal/repository`, Phase-134-Matrix-Cluster) wurde auf eigene, durch parallele
Verifikations-Testläufe verursachte Docker-DNS-Nebenläufigkeit zurückgeführt (Cluster ist Teil der
vorbestehenden Phase-134-Infrastruktur, von keinem 188-xx-Plan berührt) und durch einen zweiten,
isolierten Lauf als nicht reproduzierbar widerlegt. Der in der Aufgabe benannte
`not-found.test.tsx`-Flake wurde selbst reproduziert (1 Fehlschlag in einem Einzellauf, 2/2 PASS im
Folgelauf) und als echter, unzusammenhängender Ressourcen-Flake bestätigt (Datei zuletzt in Phase
153/154 geändert, nicht von Phase 188 berührt) — im saubersten Gesamtlauf dieser Verifikation trat
er nicht auf.

---

*Verified: 2026-10-20T09:01:55Z*
*Verifier: Claude (gsd-verifier)*
