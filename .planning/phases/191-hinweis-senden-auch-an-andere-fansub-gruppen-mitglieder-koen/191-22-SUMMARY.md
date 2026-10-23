---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 22
subsystem: api
tags: [go, gin, pgx, fansub-group-hints, idor, openapi]

# Dependency graph
requires:
  - phase: 191-11
    provides: "FansubGroupHintsRepository mit ListByTargetGroup/HasActiveLead/ListWithoutActiveLead-Muster, auf dem ListBySender aufbaut"
  - phase: 191-01
    provides: "FansubGroupHintsMeHandler mit CreateHint, requireMeIdentityForProposals-Auth-Pattern"
provides:
  - "Repository-Methode ListBySender(ctx, senderAppUserID) -- Absender-seitiger Spiegel zu ListByTargetGroup, alle Status, geordnet nach created_at"
  - "GET /api/v1/me/fansub-group-hints -- gibt dem Absender alle jemals von ihm gesendeten Hinweise zurueck, IDOR-sicher ausschliesslich ueber die verifizierte Auth-Identitaet gefiltert"
  - "Contract- und Doku-Nachzug (shared/contracts/fansub-group-hints.yaml, docs/BACKEND_ARCHITEKTUR.md)"
affects: [191-23, 191-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Absender-seitiger Lese-Spiegel zu einer bestehenden Ziel-gescopten Liste: gleiche SELECT/JOIN-Helfer, nur die WHERE-Spalte wechselt (sender_app_user_id statt target_fansub_group_id)"
    - "IDOR-Schutz durch Abwesenheit: der Handler liest keinerlei Request-Parameter fuer die Absender-ID -- es existiert strukturell kein Feld, das ein Client manipulieren koennte"

key-files:
  created: []
  modified:
    - backend/internal/repository/fansub_group_hints_repository.go
    - backend/internal/repository/fansub_group_hints_repository_test.go
    - backend/internal/handlers/fansub_group_hints_me_handler.go
    - backend/internal/handlers/fansub_group_hints_me_handler_test.go
    - backend/cmd/server/main.go
    - shared/contracts/fansub-group-hints.yaml
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "ListBySender liefert alle Status (offen/bestaetigt/abgelehnt), keine serverseitige Filterung -- dieselbe Philosophie wie ListByTargetGroup, das Frontend (Plan 191-23) entscheidet ueber Anzeige/Filter"
  - "Kein Tageslimit auf dem neuen GET-Endpunkt -- die FansubGroupHintDailyLimitMiddleware bremst nur das ERSTELLEN neuer Hinweise, nicht das Lesen eigener bereits gesendeter"
  - "Route direkt unterhalb der bestehenden POST-Route fuer denselben Pfad registriert, keine neue Repository-Instanz (fansubGroupHintsRepo wird wiederverwendet)"

patterns-established:
  - "Bei neuen Absender-seitigen Lese-Endpunkten: HintRepository-Interface um die neue Methode erweitern, Stub im Handler-Test um ein capturedSenderAppUserID-Feld ergaenzen, das explizit gegen identity.AppUserID (nie einen Client-Wert) geprueft wird"

requirements-completed: [D-18, D-08]

# Metrics
duration: ~10min
completed: 2026-10-23
---

# Phase 191 Plan 22: GET /me/fansub-group-hints -- Absender-Sicht auf gesendete Hinweise (D-18) Summary

**Neue Repository-Methode `ListBySender` und ein auf `requireMeIdentityForProposals` gestuetzter `GET /api/v1/me/fansub-group-hints`-Endpunkt geben dem Absender eines Fansub-Gruppen-Hinweises erstmals eine eigene, IDOR-sichere Sicht auf alle jemals von ihm verschickten Hinweise (eigene wie fremde Gruppe, alle Status).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-23T22:31:27Z
- **Completed:** 2026-10-23T22:35:47Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `FansubGroupHintsRepository.ListBySender` spiegelt `ListByTargetGroup`, filtert exklusiv auf `h.sender_app_user_id`, alle Status, `ORDER BY created_at ASC`. Integrationstest gegen echte Postgres-Instanz (Migrationen 0187/0188) beweist, dass ein zweiter Absender niemals im Ergebnis eines anderen Absenders auftaucht.
- `HintRepository`-Interface um `ListBySender` erweitert; neue Handler-Methode `FansubGroupHintsMeHandler.ListSentHints` liest die Absender-ID ausschliesslich aus `requireMeIdentityForProposals(c)` -- kein Pfad-/Query-/Body-Parameter existiert, aus dem ein Client einen anderen Absender erzwingen koennte (T-191-28). Handler-Test beweist das anhand des im Stub tatsaechlich gebundenen Arguments.
- `GET /api/v1/me/fansub-group-hints`, nur `authMiddleware`, in `main.go` direkt unter der bestehenden POST-Route registriert.
- `shared/contracts/fansub-group-hints.yaml` um den neuen GET-Pfad (200/401, IDOR-Hinweis im Beschreibungstext) erweitert; `docs/BACKEND_ARCHITEKTUR.md` um einen Satz zum neuen Endpunkt und seiner Auth-Identitaets-Filterregel ergaenzt.
- Backend-Container neu gebaut (`docker compose up -d --build team4sv30-backend`), `/health` liefert `{"status":"ok"}`, Route ist laut `[GIN-debug]`-Log registriert, `GET /api/v1/me/fansub-group-hints` ohne Auth liefert `401`.

## Task Commits

1. **Task 1: Repository -- ListBySender** - `f0adf37a0` (feat)
2. **Task 2: Handler + route + contract** - `f570d4aba` (feat)

**Plan metadata:** siehe Self-Check unten.

## Files Created/Modified
- `backend/internal/repository/fansub_group_hints_repository.go` - neue Methode `ListBySender`, Doc-Kommentar erklaert IDOR-Verantwortung des Aufrufers
- `backend/internal/repository/fansub_group_hints_repository_test.go` - `TestFansubGroupHint_ListBySender_OnlyOwnHints_OrderedByCreatedAt` gegen echte Postgres-Instanz
- `backend/internal/handlers/fansub_group_hints_me_handler.go` - `HintRepository`-Interface erweitert, neue Methode `ListSentHints`
- `backend/internal/handlers/fansub_group_hints_me_handler_test.go` - `hintRepoStub` um `ListBySender`-Stub ergaenzt, drei neue Tests (401 ohne Auth, 200 mit eigenen Hinweisen + IDOR-Beweis, 500 bei Repository-Fehler)
- `backend/cmd/server/main.go` - `GET /me/fansub-group-hints`-Route registriert
- `shared/contracts/fansub-group-hints.yaml` - neuer GET-Pfad fuer `/api/v1/me/fansub-group-hints`
- `docs/BACKEND_ARCHITEKTUR.md` - Satz zum neuen Endpunkt in der bestehenden `fansub_group_hints`-Passage ergaenzt

## Decisions Made
- Kein neues Schema/keine neue Spalte noetig -- `ListBySender` nutzt exakt dieselben Spalten/Joins wie `ListByTargetGroup`.
- Response-Envelope `{"data": [...]}` ohne `meta`/Pagination, identisch zu `GET /admin/fansubs/{fansubId}/group-hints` (kein neues Schema im Contract notwendig, `FansubGroupHint` wiederverwendet).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `TEAM4S_PHASE191_TEST_DSN` war in der Shell nicht gesetzt; statt des vollen `scripts/test-backend.sh`-Laufs (laut Plan fuer 191-24 deferred) wurde eine einzelne Wegwerf-Datenbank (`team4s_phase191_test_1ba854a7`) direkt im laufenden `team4sv30-db`-Container angelegt und `go test` innerhalb des laufenden `team4sv30-backend`-Containers (selbes Docker-Netzwerk, hat `go1.25.13`) mit der passenden DSN ausgefuehrt -- kein Produktcode-Workaround, nur eine lokale Testumgebungs-Entscheidung. Die Wegwerf-Datenbank wurde nicht geloescht, da sie keine echten Daten beruehrt (reine Phase-191-Testfixture, isoliert von `team4s_v2`); kann bei Bedarf spaeter per `DROP DATABASE team4s_phase191_test_1ba854a7;` entfernt werden.

## User Setup Required

None - keine neue externe Konfiguration erforderlich.

## Next Phase Readiness
- Backend-Fundament fuer D-18 ist fertig: Plan 191-23 kann `/me/contributions` jetzt gegen `GET /api/v1/me/fansub-group-hints` verdrahten (Anzeige unter "Eingereichte Hinweise", Kopfzeilen-Zaehler-Summierung laut D-18).
- Keine offenen Blocker fuer diese Teilaufgabe.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

All 8 referenced files found on disk; both task commit hashes (`f0adf37a0`, `f570d4aba`) found in git log.
