---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 04
subsystem: api
tags: [go, gin, permissions, review-flow]

requires:
  - phase: 191-01
    provides: "fansub_group_hints table + FansubGroupHintsRepository.ListByTargetGroup/Confirm/Reject"
  - phase: 191-03
    provides: "fansubGroupHintsRepo-Instanz in main.go, POST /api/v1/me/fansub-group-hints"
provides:
  - "GET/POST /api/v1/admin/fansubs/:id/group-hints(/:hid/confirm|reject) — Leader-der-Zielgruppe-Entscheidungsflaeche fuer eingehende Hinweise"
  - "FansubGroupHintsReviewHandler mit HintReviewRepository-Interface fuer Stub-Tests"
affects: [191-05, 191-06, 191-07, 191-08]

tech-stack:
  added: []
  patterns:
    - "Capability-Check 1:1 vom Donor (CanForFansubGroup + ActionFansubGroupMembersManage) wiederverwendet statt eines neuen Rechts (D-06)"
    - "Keine zusaetzliche Service-Dependency auf dem Handler (kein WithReleaseCrewService-Aequivalent) — die Abwesenheit einer solchen Dependency IST der D-03-Seiteneffekt-Schutz, kein Flag/Toggle"
    - "Stateful Fake-Repository in Tests bildet echte Statusuebergaenge nach, um 'bleibt erhalten, verschwindet aber aus der offenen Ansicht' tatsaechlich auszufuehren statt zu behaupten"

key-files:
  created:
    - backend/internal/handlers/fansub_group_hints_review_handler.go
    - backend/internal/handlers/fansub_group_hints_review_handler_test.go
  modified:
    - backend/cmd/server/main.go

key-decisions:
  - "fansubGroupHintsReviewHandler wird NICHT direkt nach reviewHandler (Zeile ~528) konstruiert, wie der Plan-Action-Text vorschlug, sondern direkt neben der bereits existierenden fansubGroupHintsRepo-Instanz (~Zeile 650) — die Repo-Instanz wird erst dort angelegt (Plan 191-03), eine Konstruktion an Zeile 528 hätte eine Vorwärtsreferenz auf eine noch nicht existierende Variable erfordert. Das Ziel des Plans (keine zweite Repo-Instanz, direkte Nachbarschaft zur fachlich zusammengehörigen Stelle) ist erreicht, nur die exakte main.go-Zeilennummer weicht ab."
  - "main.go bleibt bei 721 Zeilen (vorher 712) unaufgeteilt — wie in 191-02/03 bereits entschieden, etablierter Bestandsfall als zentrale Wiring-Datei; dieser Plan ergaenzt nur 9 additive Zeilen, keine inhaltliche Umstrukturierung."
  - "Fuer den D-03/D-05-Regressionsbeweis wurde zusaetzlich zur strukturellen Abwesenheit (Handler hat kein drittes Dependency-Feld) ein callLog-Spy auf dem Test-Repository-Doppel ergaenzt, der zur Laufzeit beweist, dass ConfirmHint ausschliesslich 'Confirm' aufruft — eine über die Plan-Mindestanforderung hinausgehende, aber im Sinne der CLAUDE.md-Teststil-Regel (echte Ausfuehrung statt Behauptung) sinnvolle Ergaenzung."

requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-08]

duration: 50min
completed: 2026-10-23
---

# Phase 191 Plan 04: Leader-Review fuer eingehende Hinweise (group-hints) Summary

**Der Leader der ZIELGRUPPE kann eingehende Hinweise (Korrektur-Hinweise + Mitgliedschaftsanfragen ohne/mit anderer Rolle als fansub_lead) über die exakt wiederverwendete `ActionFansubGroupMembersManage`-Berechtigung listen, bestätigen und ablehnen — Bestätigen ist eine reine Statusänderung ohne jeden Mitgliedschafts- oder Punkte-/Badge-Seiteneffekt.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-10-23T13:30:00Z
- **Completed:** 2026-10-23T14:20:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `FansubGroupHintsReviewHandler.ListHints` liefert dem Leader der Zielgruppe alle Hinweise an seine Gruppe, filtert aber serverseitig jede Mitgliedschaftsanfrage mit `requested_role_code = permissions.RoleFansubLead` heraus (D-01: diese Entscheidung gehört ausschließlich der Plattform-Admin-Liste aus Plan 191-05) — gebunden an die Konstante, nie an ein String-Literal.
- `ConfirmHint` setzt ausschließlich `status='acknowledged'`/`decided_by`/`decided_at` — der Handler besitzt strukturell keine dritte Dependency (kein `releaseCrewSvc`-Äquivalent wie beim Donor `ConfirmProposal`), es gibt also nichts aufzurufen, das eine Mitgliedschaft anlegen oder Punkte/Badges vergeben könnte (D-03/D-05). Ein `callLog`-Spy im Test beweist zur Laufzeit, dass tatsächlich nur `Confirm` aufgerufen wird.
- `RejectHint` übernimmt das Raw-Body-Optional-JSON-Muster des Donors unverändert: `decision_note` wird bei Angabe persistiert, bei leerem Body bleibt sie `nil`. Ein abgelehnter Hinweis bleibt als Datensatz erhalten (kein Hard-Delete), verschwindet aber aus der "offen"-Teilmenge — durch einen echten zweiten `ListHints`-Aufruf nach der Ablehnung nachgewiesen, nicht nur behauptet.
- Beide Autorisierungs-Fehlerpfade (403 bei fehlender Berechtigung) schreiben `auditPermissionDenied` mit den neuen `fansub_group_hint.*.denied`-Event-Typen; erfolgreiche Confirm/Reject-Aktionen schreiben `fansub_group_hint.confirmed`/`fansub_group_hint.rejected` — gleiche Audit-Infrastruktur wie der Donor.
- `main.go` verdrahtet drei neue Routen (`GET /admin/fansubs/:id/group-hints`, `POST .../confirm`, `POST .../reject`) hinter `authMiddleware`, wiederverwendet die bereits in Plan 191-03 instanziierte `fansubGroupHintsRepo` (keine zweite Repository-Instanz).
- Backend-Container neu gebaut und manuell verifiziert: alle drei neuen Routen antworten mit 401 (nicht 404) ohne Auth-Header — Routing ist korrekt verdrahtet.
- Volle Backend-Testsuite (`scripts/test-backend.sh`) lief grün: `GATE: GREEN (0)`, 28 Throwaway-Datenbanken.

## Task Commits

Each task was committed atomically:

1. **Task 1: FansubGroupHintsReviewHandler — List/Confirm/Reject** - `7813dde23` (feat)
2. **Task 2: Wire routes in main.go** - `77a75fc96` (feat)

## Files Created/Modified
- `backend/internal/handlers/fansub_group_hints_review_handler.go` - `FansubGroupHintsReviewHandler` (ListHints/ConfirmHint/RejectHint) + `HintReviewRepository`-Interface
- `backend/internal/handlers/fansub_group_hints_review_handler_test.go` - 10 Verhaltenstests (httptest + Fake-Repository, Statuscode + Body-Assertion), inkl. stateful Fake fuer den Statusuebergangs-Nachweis
- `backend/cmd/server/main.go` - `fansubGroupHintsReviewHandler`-Konstruktion + drei Routen, 9 additive Zeilen (712 → 721 Zeilen gesamt)

## Decisions Made
- Siehe `key-decisions` im Frontmatter: Platzierung der Handler-Konstruktion in main.go direkt neben der bereits existierenden `fansubGroupHintsRepo`-Instanz statt an der im Plan-Action-Text genannten Zeile ~524 (dort existiert die Repo-Variable noch nicht) — fachliches Ziel (keine zweite Instanz, enge Nachbarschaft zur zusammengehörigen Stelle) erreicht, nur die konkrete Zeilennummer weicht vom Plan-Wortlaut ab.
- `main.go` bleibt laut der bereits in 191-02/191-03 getroffenen und vom Nutzer zu bestätigenden Entscheidung unaufgeteilt (Vorgabe 6 des Auftrags: Nutzer entscheidet am Phasenende, ob die zentrale Wiring-Datei eine akzeptierte Ausnahme bleibt oder gesplittet wird). Diese Ausführung fügt nur 9 Zeilen hinzu, keine inhaltliche Umstrukturierung.
- Zusätzlich zur im Plan verlangten strukturellen D-03/D-05-Abwesenheitsprüfung (Handler hat keine dritte Dependency) wurde ein laufzeitgestützter `callLog`-Spy ergänzt, der beweist, dass `ConfirmHint` tatsächlich nur `Confirm` aufruft — über die Plan-Mindestanforderung hinaus, aber im Sinne der CLAUDE.md-Teststil-Pflicht (echte Ausführung statt Behauptung).

## D-03-Verifikation (Guardrail 2)

`ConfirmHint` ruft ausschließlich `h.reviewRepo.Confirm(ctx, hintID, identity.AppUserID)` auf. Der Handler-Struct hat genau drei Felder (`reviewRepo`, `permissionSvc`, `auditLogRepo`) — kein `releaseCrewSvc`-Äquivalent wie beim Donor `ContributionReviewHandler`. Es gibt keinen Weg, von diesem Handler aus eine `fansub_group_members`-Zeile oder eine andere Zuweisung anzulegen. Der Test `TestFansubGroupHintsReview_ConfirmHint_Success` prüft zusätzlich per `callLog`, dass am Fake-Repository ausschließlich "Confirm" protokolliert wird.

## D-05-Verifikation (Guardrail 3)

Die beiden in den Tests verwendeten Fake-Repository-Typen (`hintReviewRepoStub`, `statefulHintRepoFake`) implementieren strukturell nur die drei Methoden des `HintReviewRepository`-Interfaces (`ListByTargetGroup`, `Confirm`, `Reject`). Keiner der beiden Typen besitzt eine Methode, die einer Punkte- oder Badge-Vergabe ähnelt (kein `AwardPoints`, kein `GrantBadge`, kein vergleichbarer Name) — durch Konstruktion bewiesen, nicht durch eine Laufzeit-Behauptung gegen ein Mock, das ohnehin nicht aufgerufen wird.

## Issues Encountered
- Der im Task-2-Acceptance-Criteria vorgeschlagene `grep -n "group-hints" backend/cmd/server/main.go` trifft real 4 Zeilen statt der genannten 3, weil die bereits in Plan 191-03 angelegte Member-Route `/me/fansub-group-hints` ebenfalls den Substring "group-hints" enthält. Die drei neuen Admin-Routen selbst folgen exakt wie gefordert unmittelbar nach dem bestehenden `contribution-proposals`-Block — die Diskrepanz ist eine Ungenauigkeit in der Plan-Formulierung des Grep-Musters, kein Implementierungsfehler.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Die Leader-Entscheidungsfläche steht vollständig hinter Auth + Capability-Gate und ist unabhängig vom Plattform-Admin-Pfad (Plan 191-05) testbar — fansub_lead-Mitgliedschaftsanfragen sind aus dieser Liste bewiesen ausgefiltert.
- Backend-Container (`team4sv30-backend`) neu gebaut, läuft gesund; `go build`/`go vet`/volle `scripts/test-backend.sh`-Suite (`GATE: GREEN (0)`) bestätigt ohne Regression.
- Kein Blocker für Plan 191-05 (Plattform-Admin-Liste für `fansub_lead`-Anfragen): `FansubGroupHintsRepository.ListForFansubLeadRole`/`Confirm`/`Reject` stehen bereits aus Plan 191-01 bereit, dieser Plan hat sie nicht angefasst.
- Frontend-seitige `FansubGroupHintsReviewSection.tsx` (Analog `ContributionsReviewSection.tsx`, siehe `191-PATTERNS.md`) ist noch nicht gebaut — folgt in einem späteren Frontend-Plan dieser Phase.

## Self-Check: PASSED

Alle in dieser Summary genannten Dateien existieren auf der Festplatte und alle genannten
Commit-Hashes sind im Git-Verlauf auffindbar (geprüft per `[ -f ... ]` und
`git log --oneline --all | grep`).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
