---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 12
subsystem: backend
tags: [go, gin, fansub-group-hints, d-09, d-11, d-15, openapi, docs]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Migration 0188 + FansubGroupHintsRepository.HasActiveLead/ListWithoutActiveLead (Plan 191-11)"
provides:
  - "Compiling fansub_group_hints handler family (me-handler, review-handler, admin-handler) against the Plan 191-11 schema"
  - "D-11 'no active lead' routing wired end to end into AdminFansubGroupHintsHandler"
  - "shared/contracts/fansub-group-hints.yaml + docs/BACKEND_ARCHITEKTUR.md describing the single-hint-type/D-11 model"
affects: ["191-13 ff (Live-UAT-Checkpoint D-16)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-11 routing is a property of the TARGET GROUP (HasActiveLead/ListWithoutActiveLead), never a client-controlled hint field -- enforced identically across both review surfaces"

key-files:
  modified:
    - backend/internal/handlers/fansub_group_hints_me_handler.go
    - backend/internal/handlers/fansub_group_hints_me_handler_test.go
    - backend/internal/handlers/fansub_group_hints_review_handler.go
    - backend/internal/handlers/fansub_group_hints_review_handler_test.go
    - backend/internal/handlers/admin_fansub_group_hints_handler.go
    - backend/internal/handlers/admin_fansub_group_hints_handler_test.go
    - backend/internal/handlers/fansub_group_hints_decide.go
    - backend/cmd/server/main.go
    - shared/contracts/fansub-group-hints.yaml
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "D-09: hint_type/requested_role_code dimension fully removed from the member-create handler; related_anime_id is the sole remaining required field"
  - "D-11: the admin list is backed by ListWithoutActiveLead; the review handler returns every row for its target group unfiltered -- no handler re-implements the 'has active lead' predicate itself"
  - "D-15: every doc comment and the audit-log actor_path literal across the whole handler family reworded from the retired 'fansub_lead-Mitgliedschaftsanfrage' concept to D-11's 'no active lead' concept"

requirements-completed: [D-09, D-11, D-15, D-08]

# Metrics
duration: ~55min
completed: 2026-10-23
---

# Phase 191 Plan 12: Gap-Closure Live-UAT-Nachbesserung (Handler-Schicht) Summary

**Backend wieder kompilierbar: alle drei Handler der fansub_group_hints-Familie sind auf das D-09-Einzeltyp-Schema umgebaut, die Admin-Liste läuft jetzt über D-11s `ListWithoutActiveLead`, und jede Doku-/Audit-Spur des gestrichenen Mitgliedschaftsanfrage-Konzepts ist entfernt.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-23T19:45:00Z (approx.)
- **Completed:** 2026-10-23T20:40:00Z (approx.)
- **Tasks:** 3 completed
- **Files modified:** 10

## Accomplishments

- **Task 1 (D-09):** `fansub_group_hints_me_handler.go` komplett entschlackt — `hint_type`/`requested_role_code` restlos entfernt, `CreateHint` verlangt ausnahmslos `related_anime_id` (422 sonst), `NewFansubGroupHintsMeHandler` verliert das jetzt ungenutzte `rolesRepo`-Argument, `main.go`s Call-Site ist angepasst. Testdatei auf das verbleibende, einfachere Verhalten reduziert (sechs auf das gestrichene Mitgliedschaftsanfrage-Verhalten zielende Tests entfernt, ein `MissingAnimeReturns422`-Test ersetzt).
- **Task 2 (D-11 + D-15):** `fansub_group_hints_review_handler.go`s `ListHints` filtert nichts mehr selbst (die Rollenfilterschleife ist weg, `FansubGroupHintRow` hat das Feld gar nicht mehr); `admin_fansub_group_hints_handler.go` läuft jetzt über `ListWithoutActiveLead` statt `ListForFansubLeadRole`; der Audit-Log-Literal `platform_admin_fansub_lead_route` ist in beiden Confirm/Reject-Methoden auf `platform_admin_no_active_lead_route` umbenannt. Jede Struct-/Methoden-Doku in diesen drei Dateien plus `fansub_group_hints_decide.go` ist auf das D-11-Konzept ("hat die Zielgruppe eine aktive Leitung?") umformuliert — keine Spur des gestrichenen rollenbasierten Routings mehr.
- **Task 3 (D-08):** `shared/contracts/fansub-group-hints.yaml` beschreibt jetzt den Einzeltyp (`related_anime_id` Pflicht, kein `hint_type`/`requested_role_code` mehr in Request- oder Response-Schema) und D-11s Routing in den Pfad-Beschreibungen; `docs/BACKEND_ARCHITEKTUR.md`s zwei betroffene Abschnitte (Datenmodell-Fundament, Review-Flow) sind entsprechend umgeschrieben, mit explizitem Kontrast zum entfernten `requested_role_code = 'fansub_lead'`-Mechanismus.
- Backend-Container `team4sv30-backend` neu gebaut und als gesund verifiziert (`/health` → `{"status":"ok"}`); volle `scripts/test-backend.sh`-Suite zweimal grün durchlaufen (Exit-Code 0, 0 `FAIL`-Zeilen).

## Task Commits

Each task was committed atomically:

1. **Task 1: Member-create handler simplification (D-09)** — `176140b62` (fix)
2. **Task 2: Leader-review filter removal + D-11 admin routing + decide-helper doc sweep** — `6a1a26917` (fix)
3. **Task 3: Contract + backend architecture docs (D-08)** — `2e8d66c4c` (docs)
4. **Follow-up: gofmt-Korrektur der Task-1-Struct-Tags** — `4b11be0b9` (style)

## Files Created/Modified

- `backend/internal/handlers/fansub_group_hints_me_handler.go` — `hint_type`/`requested_role_code` entfernt, `RolesRepository`-Abhängigkeit entfernt, Doc-Kommentar auf D-09 umgeschrieben
- `backend/internal/handlers/fansub_group_hints_me_handler_test.go` — sechs auf das gestrichene Verhalten zielende Tests entfernt, Stub-Signaturen angepasst
- `backend/internal/handlers/fansub_group_hints_review_handler.go` — Rollenfilterschleife entfernt, Struct- und Methoden-Doku auf D-11 umgeschrieben
- `backend/internal/handlers/fansub_group_hints_review_handler_test.go` — Ausschluss-Test durch `ReturnsAllRowsUnfiltered`-Regressionstest ersetzt
- `backend/internal/handlers/admin_fansub_group_hints_handler.go` — `ListForFansubLeadRole` → `ListWithoutActiveLead`, Audit-Literal umbenannt, alle Doc-Kommentare (inkl. Confirm/Reject) auf D-11 umgeschrieben
- `backend/internal/handlers/admin_fansub_group_hints_handler_test.go` — Fake-Methode umbenannt, `requested_role_code`-Fixtures entfernt
- `backend/internal/handlers/fansub_group_hints_decide.go` — Caller-Differenzierungssatz im Doc-Kommentar auf den D-11-Split umgeschrieben
- `backend/cmd/server/main.go` — `NewFansubGroupHintsMeHandler`-Call-Site auf die vereinfachte Signatur angepasst
- `shared/contracts/fansub-group-hints.yaml` — Einzeltyp-Request-Schema, `requested_role_code`/`hint_type` aus Response-Schema entfernt, alle Pfad-Beschreibungen auf D-11 umgeschrieben
- `docs/BACKEND_ARCHITEKTUR.md` — zwei Abschnitte (Zeilen ~137-139, ~226-230) auf den Einzeltyp + D-11-Routing umgeschrieben

## Decisions Made

- D-09/D-11/D-15 exakt wie in `191-CONTEXT.md` spezifiziert — keine Abweichung vom entschiedenen Umfang.
- `histGroupMemberRolesRepo` in `main.go` bleibt bestehen (wird an mehreren anderen Call-Sites weiterhin gebraucht), nur das eine `NewFansubGroupHintsMeHandler`-Argument entfällt — genau wie im Plan als Grenze vorgegeben.
- Die explizite Erwähnung des entfernten `requested_role_code = 'fansub_lead'`-Mechanismus in `docs/BACKEND_ARCHITEKTUR.md` (als Kontrast-Erklärung, warum D-11 KEIN Wiederaufguss desselben Routings ist) ist eine bewusste, vom Plan-Task explizit verlangte Formulierung ("State explicitly that this is NOT the same mechanism...") — kein Verstoß gegen das D-15-Verbot von Alt-Konzept-Referenzen, da sie als historische Abgrenzung markiert ist, nicht als aktuelles Verhalten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `docker compose exec gofmt` lief gegen ein veraltetes, bereits gebautes Image statt gegen die Host-Dateien**
- **Found during:** Task 1, Nachformatierungs-Check nach dem ersten `docker compose up -d --build`
- **Issue:** `team4sv30-backend` hat keinen Bind-Mount für `/app` (reiner Image-Build, siehe `docker-compose.yml`) — ein späterer `Edit`-Aufruf auf die Host-Datei `fansub_group_hints_me_handler.go` (Struct-Tag-Umformulierung) verschob die Spaltenausrichtung wieder, aber `docker compose exec ... gofmt -w` schrieb nur innerhalb des (zu diesem Zeitpunkt bereits veralteten) Container-Images und hinterließ auf dem Host eine nicht-gofmt-konforme Datei, ohne dass `git diff` eine Änderung zeigte.
- **Fix:** Einen temporären `golang:1.25-alpine`-Container mit Host-Bind-Mount (`docker run --rm -v "$(pwd):/repo" ...`) genutzt, um `gofmt -l` zuverlässig gegen die tatsächlichen Host-Dateien zu prüfen, danach die drei betroffenen Struct-Felder manuell spaltenkorrekt ausgerichtet.
- **Files modified:** `backend/internal/handlers/fansub_group_hints_me_handler.go`
- **Verification:** `docker run --rm -v "$(pwd):/repo" -w /repo golang:1.25-alpine gofmt -l ...` liefert für alle acht in diesem Plan geänderten Go-Dateien keine Treffer mehr.
- **Committed in:** `4b11be0b9` (separater Style-Commit, da die beiden vorherigen Task-Commits bereits erstellt waren)

---

**Total deviations:** 1 auto-fixed (Rule 3, Tooling-Erkenntnis über den fehlenden Bind-Mount des Backend-Containers)
**Impact on plan:** Kein Verhaltens- oder Scope-Einfluss — reine Formatierungskorrektur, in einem eigenen, klar beschrifteten Commit nachgezogen statt rückwirkend in einen bereits erstellten Task-Commit gequetscht.

## Issues Encountered

Keine offenen Probleme. Die in `191-11-SUMMARY.md` dokumentierte Blockade ("Backend kompiliert nicht, bis Plan 191-12 läuft") ist vollständig aufgelöst: `go build ./...` ist clean, die volle `scripts/test-backend.sh`-Suite läuft zweimal hintereinander grün durch (Exit-Code 0, 0 `--- FAIL:`-Zeilen), und der Live-Dev-Backend-Container ist nach `docker compose up -d --build team4sv30-backend` gesund (`/health` → `{"status":"ok"}`).

## User Setup Required

None — keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Die "Hinweis senden"-Funktionalität ist auf dem Live-Dev-Stack jetzt funktionsfähig (zuvor laut 191-11-SUMMARY.md non-funktional, weil `air` den alten, vor-191-11-Build weiterlaufen ließ).
- Bereit für den D-16-Pflicht-Vorabprüfung-Schritt: der nächste Live-Checkpoint (Plan 191-10 Task 2 Nachholtermin) kann jetzt tatsächlich einen Korrektur-Hinweis an eine fremde Gruppe durchspielen.
- D-12/D-13/D-14 (Kontext-Einstieg "Fehler melden", Formular-UI-Korrekturen) sind laut `191-CONTEXT.md` noch offen und nicht Teil dieses Plans — sie betreffen das Frontend-Formular, nicht die hier bearbeitete Handler-Schicht.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

All 10 modified files and all 4 commit hashes (176140b62, 6a1a26917, 2e8d66c4c, 4b11be0b9) verified present.
