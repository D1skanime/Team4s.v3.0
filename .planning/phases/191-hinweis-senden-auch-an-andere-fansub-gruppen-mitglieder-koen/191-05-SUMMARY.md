---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 05
subsystem: api
tags: [go, gin, permissions, review-flow, openapi]

requires:
  - phase: 191-01
    provides: "fansub_group_hints table + FansubGroupHintsRepository.ListForFansubLeadRole/Confirm/Reject"
  - phase: 191-03
    provides: "fansubGroupHintsRepo-Instanz in main.go, POST /api/v1/me/fansub-group-hints"
  - phase: 191-04
    provides: "FansubGroupHintsReviewHandler (Leader-Pfad), HintReviewRepository-Interface"
provides:
  - "GET/POST /api/v1/admin/fansub-group-hints(/:hid/confirm|reject) — Plattform-Admin-Entscheidungsflaeche fuer fansub_lead-Mitgliedschaftsanfragen (D-01/D-07)"
  - "decideFansubGroupHint — gemeinsamer Confirm/Reject-Helfer, von Leader- UND Plattform-Admin-Pfad genutzt"
  - "shared/contracts/fansub-group-hints.yaml — vollstaendiger OpenAPI-Contract fuer alle sieben Hinweis-Endpunkte"
  - "docs/BACKEND_ARCHITEKTUR.md-Abschnitt 'Hinweise an fremde Fansub-Gruppen'"
affects: [191-06, 191-07, 191-08]

tech-stack:
  added: []
  patterns:
    - "Geteilter Entscheidungs-Helfer (decideFansubGroupHint) statt Code-Duplikat zwischen zwei Autorisierungswegen — das Interface hintDecideRepository besitzt strukturell keine Mitgliedschafts-/Punkte-/Badge-Methode, macht D-03/D-05 ueber den Typsystem statt nur Testbehauptung erzwungen"
    - "Plattform-weite Admin-Liste (requirePlatformAdminIdentity) analog AdminClaimsListHandler, serverseitiges WHERE auf requested_role_code statt clientseitiger Filter"

key-files:
  created:
    - backend/internal/handlers/fansub_group_hints_decide.go
    - backend/internal/handlers/admin_fansub_group_hints_handler.go
    - backend/internal/handlers/admin_fansub_group_hints_handler_test.go
    - shared/contracts/fansub-group-hints.yaml
  modified:
    - backend/internal/handlers/fansub_group_hints_review_handler.go
    - backend/cmd/server/main.go
    - docs/api/api-contracts.md
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "decideFansubGroupHint nimmt eine decision-Zeichenkette ('confirm'/'reject') statt zwei getrennter Funktionen, weil beide Handler (ConfirmHint/RejectHint) ohnehin schon getrennte HTTP-Methoden/Routen sind — eine einzige Helper-Funktion mit String-Switch hält die Datei klein und die beiden Call-Sites symmetrisch, ohne dass der Plan-Wortlaut (der nur die Signatur mit decision-Parameter vorgab) verletzt wird."
  - "Fuer die Plattform-Admin-Audit-Eintraege (fansub_group_hint.confirmed/.rejected) wurde ScopeType=permissions.ScopeTypeGlobal gewaehlt statt ScopeTypeGroup wie beim Leader-Pfad — fachlich korrekt, weil requirePlatformAdminIdentity keine gruppenbezogene Berechtigung prueft; die Ziel-Gruppe der Hinweiszeile ist dem Audit-Eintrag trotzdem nicht verloren, weil TargetType/TargetID auf den Hinweis selbst zeigen, aus dem die Zielgruppe per GetByID nachschlagbar bleibt."
  - "Task 2 (Wiring+Contract+Doku) wurde NICHT in zwei Teilschritte gesplittet (vom Plan optional erlaubt) — der Kontext reichte fuer einen zusammenhaengenden Commit, main.go bleibt dabei weiterhin unaufgeteilt (zentrale Wiring-Datei-Ausnahme aus 191-02/03/04 unveraendert fortgefuehrt, nur 8 additive Zeilen in diesem Plan)."

requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-08]

duration: 50min
completed: 2026-10-23
---

# Phase 191 Plan 05: Plattform-Admin-Review fuer fansub_lead-Hinweise + geteilter Entscheidungs-Helfer Summary

**Der Plattform-Admin entscheidet ueber Mitgliedschaftsanfragen mit gewuenschter Rolle `fansub_lead` ueber eine plattform-weite Liste, die mit dem Leader-Pfad aus Plan 191-04 nachweislich dieselbe seiteneffektfreie Entscheidungslogik teilt — D-01's Routing-Split ist damit auf beiden Seiten geschlossen und der komplette Backend-API-Umfang der Phase ist jetzt in `shared/contracts/fansub-group-hints.yaml` und `docs/BACKEND_ARCHITEKTUR.md` dokumentiert.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2 completed
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- `decideFansubGroupHint` (`fansub_group_hints_decide.go`) ist der einzige Ort, an dem ein Hinweis tatsächlich bestätigt oder abgelehnt wird — der Leader-Handler aus Plan 191-04 wurde refaktoriert, um ihn ebenfalls zu nutzen (`grep -c "decideFansubGroupHint" backend/internal/handlers/*.go` zeigt Treffer in beiden Handler-Dateien). Das Interface `hintDecideRepository` besitzt strukturell nur `Confirm`/`Reject` — keine Mitgliedschafts-, Rollen- oder Punkte-/Badge-Methode ist überhaupt syntaktisch erreichbar, was D-03/D-05 über das Typsystem statt nur durch eine Testbehauptung erzwingt.
- `AdminFansubGroupHintsHandler` (`List/Confirm/RejectHint`) ist die plattform-weite Entscheidungsfläche für den D-01/D-07-Sonderfall: `ListHints` filtert serverseitig über `ListForFansubLeadRole` (WHERE `requested_role_code = $1`, gebunden an `permissions.RoleFansubLead`) — keine clientseitige Filterung einer generischen Liste. Gate ist `requirePlatformAdminIdentity`, unabhängig von jeder gruppenbezogenen Berechtigung des Aufrufers.
- Ein D-01-Regressionstest beweist explizit: ein Akteur ohne globale `platform_admin`-Rolle (auch wenn er theoretisch Leader der Zielgruppe wäre) wird über `/admin/fansub-group-hints*` mit 403 abgelehnt, bevor überhaupt eine Repository-Methode aufgerufen wird (`callLog` bleibt leer).
- `main.go` verdrahtet die drei neuen Routen direkt neben dem bestehenden Leader-Routen-Block, wiederverwendet `fansubGroupHintsRepo`/`authzRepo`/`auditLogRepo` ohne eine zweite Repository-Instanz. Insgesamt sieben Hinweis-Endpunkte sind jetzt live (`/me/fansub-group-hints`, drei Leader-Routen, drei Plattform-Admin-Routen).
- `shared/contracts/fansub-group-hints.yaml` dokumentiert alle sieben Endpunkte (parsbar validiert über `python3 -c "import yaml; yaml.safe_load(...)"`), inklusive deutscher 409/429-Beispieltexte für D-04. `docs/api/api-contracts.md` listet die neue Datei in der Domänen-Enumeration. `docs/BACKEND_ARCHITEKTUR.md` erklärt im neuen Abschnitt "Hinweise an fremde Fansub-Gruppen" den fachlichen Grund für den parallelen Datenpfad, das serverseitige D-01/D-07-Routing und die Rate-Limit-Wiederverwendung — mit konkreten Bezeichnern (`requested_role_code`, `NewCommentRateLimiter`/`AppUserID`), nicht nur einem Phasen-Verweis.
- Backend-Container neu gebaut und manuell verifiziert: alle drei neuen Routen antworten mit 401 (nicht 404) ohne Auth-Header.
- Volle Backend-Testsuite (`scripts/test-backend.sh`) lief grün: `GATE: GREEN (0)`, 28 Throwaway-Datenbanken.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared decide helper; implement Plattform-Admin handler** - `40beb49e7` (feat)
2. **Task 2: Wire routes, write the full contract, update backend docs** - `a435336ce` (docs)

## Files Created/Modified

- `backend/internal/handlers/fansub_group_hints_decide.go` - `decideFansubGroupHint`-Helfer + `hintDecideRepository`-Interface (NEU)
- `backend/internal/handlers/admin_fansub_group_hints_handler.go` - `AdminFansubGroupHintsHandler` (List/Confirm/RejectHint) + `adminHintsRepository`-Interface (NEU)
- `backend/internal/handlers/admin_fansub_group_hints_handler_test.go` - 10 Verhaltenstests (httptest + Fake-Repository, D-01-Enforcement-Beweis, D-03/D-05-callLog-Beweis) (NEU)
- `backend/internal/handlers/fansub_group_hints_review_handler.go` - `ConfirmHint`/`RejectHint` rufen jetzt `decideFansubGroupHint` statt direkt `h.reviewRepo.Confirm/Reject` (Refactor, kein Verhaltensunterschied — bestehende Tests aus 191-04 bleiben grün)
- `backend/cmd/server/main.go` - `adminFansubGroupHintsHandler`-Konstruktion + drei neue Routen (8 additive Zeilen)
- `shared/contracts/fansub-group-hints.yaml` - vollständiger OpenAPI-Contract für alle sieben Hinweis-Endpunkte (NEU)
- `docs/api/api-contracts.md` - `fansub-group-hints.yaml` in der Domänen-Enumeration registriert
- `docs/BACKEND_ARCHITEKTUR.md` - neuer Abschnitt "Hinweise an fremde Fansub-Gruppen" zwischen "Fansub-Mitgliederverwaltung" und "Audit"

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## D-01-Verifikation (Guardrail 2 / Routing-Split)

`AdminFansubGroupHintsHandler` gated alle drei Endpunkte über `requirePlatformAdminIdentity` — unabhängig von `CanForFansubGroup`. `ListForFansubLeadRole` bindet `permissions.RoleFansubLead` als parametrisierten Query-Wert (Repository, Plan 191-01), niemals ein String-Literal. Der Test `TestAdminFansubGroupHints_ConfirmHint_RejectsNonPlatformAdmin` beweist: ein Aufrufer ohne globale Plattform-Admin-Rolle wird abgelehnt, bevor irgendeine Repository-Methode aufgerufen wird.

## D-03/D-05-Verifikation (Guardrail 4, geteilter Helfer)

`decideFansubGroupHint` ist die einzige Stelle, die `Confirm`/`Reject` aufruft — beide Handler (Leader und Plattform-Admin) rufen ausschließlich diesen Helfer. Das Interface `hintDecideRepository` hat genau zwei Methoden; keine davon kann eine Mitgliedschaft, Rolle, Punkte oder Badges vergeben, weil es dafür schlicht keine Methode gibt, die aufgerufen werden könnte. `TestAdminFansubGroupHints_ConfirmHint_Success` beweist per `callLog`-Spy zusätzlich zur Laufzeit, dass am Fake-Repository ausschließlich `"Confirm"` protokolliert wird — identisch zum bereits bestehenden Beweis im Leader-Pfad (`TestFansubGroupHintsReview_ConfirmHint_Success`, Plan 191-04).

## Issues Encountered

Keine. Der im Plan optional erlaubte Split von Task 2 in "Wiring+Contract" und "Doku" war nicht nötig — der Kontext reichte für einen zusammenhängenden Commit.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Beide Backend-Entscheidungsflächen (Leader- und Plattform-Admin-Pfad) stehen vollständig hinter Auth + Capability-/Rollen-Gate, teilen beweisbar dieselbe seiteneffektfreie Entscheidungslogik und sind unabhängig voneinander testbar.
- Backend-Container (`team4sv30-backend`) neu gebaut, läuft gesund; `go build`/`go vet`/volle `scripts/test-backend.sh`-Suite (`GATE: GREEN (0)`) bestätigt ohne Regression.
- Der komplette Backend-API-Umfang der Phase (alle sieben Endpunkte) ist jetzt vertraglich dokumentiert (`shared/contracts/fansub-group-hints.yaml`, `docs/api/api-contracts.md`, `docs/BACKEND_ARCHITEKTUR.md`) — Frontend-Pläne dieser Phase können sich darauf stützen.
- Frontend-seitige `FansubGroupHintsAdminClient.tsx`/`page.tsx` (Analog `ClaimsClient.tsx`/`admin/claims/page.tsx`, siehe `191-PATTERNS.md`) sind noch nicht gebaut — folgen in einem späteren Frontend-Plan dieser Phase.

## Self-Check: PASSED

Alle in dieser Summary genannten Dateien existieren auf der Festplatte und alle genannten Commit-Hashes sind im Git-Verlauf auffindbar (geprüft per `[ -f ... ]` und `git log --oneline --all | grep`).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
