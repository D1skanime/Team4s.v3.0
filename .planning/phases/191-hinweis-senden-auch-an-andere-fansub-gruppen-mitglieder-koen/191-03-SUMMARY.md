---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 03
subsystem: api
tags: [go, gin, redis, rate-limit, pgx]

requires:
  - phase: 191-01
    provides: "fansub_group_hints table + FansubGroupHintsRepository.CreateHint (Partial-Unique-Index für D-04(1), kein Ownership-Check)"
provides:
  - "POST /api/v1/me/fansub-group-hints — Member-seitiger Endpunkt zum Senden eines Korrektur-Hinweises oder einer Mitgliedschaftsanfrage an JEDE Fansub-Gruppe"
  - "middleware.FansubGroupHintDailyLimitMiddleware — AppUserID-geschlüsselte Rate-Limit-Middleware-Variante (10/Person/24h), zweite Instanz des bestehenden CommentRateLimiter-Mechanismus"
affects: [191-04, 191-05, 191-06, 191-07, 191-08, 191-09, 191-10]

tech-stack:
  added: []
  patterns:
    - "Gemeinsamer Deny-/Fehler-Pfad (writeRateLimitExceeded/handleRateLimitStoreError) für mehrere Rate-Limit-Middleware-Varianten in derselben Datei, statt den 429-/Degraded-Code pro Variante zu duplizieren"
    - "Request-DTO ohne das sicherheitskritische Feld überhaupt zu deklarieren (kein sender_app_user_id auf createFansubGroupHintRequest) statt es nur zu ignorieren — verhindert jede zukünftige versehentliche Bindung"
    - "Handler-seitige Pflichtfeld-Validierung spiegelt die DB-CHECK-Constraints der Migration 1:1, um eine rohe 500-Constraint-Verletzung durch eine saubere 422-Antwort zu ersetzen"

key-files:
  created:
    - backend/internal/handlers/fansub_group_hints_me_handler.go
    - backend/internal/handlers/fansub_group_hints_me_handler_test.go
  modified:
    - backend/internal/middleware/comment_rate_limit.go
    - backend/internal/middleware/comment_rate_limit_test.go
    - backend/cmd/server/main.go
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "ResolveVerifiedMemberID wird weiterhin aufgerufen (404 bei fehlendem verifiziertem Member-Claim), obwohl kein Ownership-Check mehr folgt — reiner Identitätsnachweis, nicht Autorisierung (laut Plan-Vorgabe explizit so entschieden, UI-SPEC Contract A6 bleibt für das Frontend offen)."
  - "Zusätzliche, über die Plan-Akzeptanzkriterien hinausgehende Validierung: ein Korrektur-Hinweis mit gesetztem requested_role_code wird mit 422 abgewiesen (spiegelt die DB-CHECK-Constraint chk_fansub_group_hints_role_scope), statt eine rohe Constraint-Verletzung als 500 durchzulassen."
  - "main.go wird NICHT aufgeteilt, obwohl es mit 712 Zeilen über dem 450-Zeilen-Limit liegt — etablierter Bestandsfall (zentrale, von CLAUDE.md ausdrücklich als Pflicht-Wiring-Stelle benannte Datei), von mehreren vorherigen Phasen (172/173-05/176/180) ohne Aufteilung berührt; nur additive Wiring-Zeilen ergänzt."

requirements-completed: [D-04, D-06, D-07, D-08]

duration: 45min
completed: 2026-10-23
---

# Phase 191 Plan 03: Member-Endpunkt „Hinweis senden" + taegliches Rate-Limit Summary

**POST /api/v1/me/fansub-group-hints lässt ein verifiziertes Mitglied einen Korrektur-Hinweis oder eine Mitgliedschaftsanfrage an JEDE Fansub-Gruppe schicken, serverseitig durch eine neue AppUserID-geschlüsselte Variante des bestehenden Redis-Rate-Limiters auf 10/Tag begrenzt.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-10-23T13:00:00Z
- **Completed:** 2026-10-23T13:45:00Z
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `FansubGroupHintDailyLimitMiddleware` erweitert die bestehende Kommentar-Rate-Limit-Mechanik (`comment_rate_limit.go`) additiv um eine zweite, AppUserID-geschlüsselte Instanz (10 Anfragen/Person/24h) — kein neuer Rate-Limit-Mechanismus, derselbe Redis-Fixed-Window-Lua-Code, nur ein anderer Schlüssel.
- Der gemeinsame Deny-/Fehlerbehandlungs-Code beider Varianten (ClientIP- und AppUserID-geschlüsselt) ist in zwei private Helfer (`writeRateLimitExceeded`, `handleRateLimitStoreError`) extrahiert — das bestehende ClientIP-Verhalten bleibt dabei byte-für-byte unverändert (Original-Tests laufen weiterhin unverändert grün).
- `FansubGroupHintsMeHandler.CreateHint` implementiert die volle Sicherheitskette: Auth → Pflichtfeld-Validierung je Hinweistyp (spiegelt die DB-CHECK-Constraints der Migration 0187) → bewusst KEIN Ownership-Check (D-02-Kernentscheidung, einziger struktureller Unterschied zum Donor-Handler) → Rollenvalidierung über die bereits vorhandene `RoleCodeIsAssignableForContext(ctx, code, "fansub_group")` → DB-Insert mit 409/404-Mapping.
- Das Request-DTO (`createFansubGroupHintRequest`) besitzt kein `sender_app_user_id`-Feld — die Absenderidentität kommt beweisbar ausschließlich aus der Auth-Identität (eigener Regressionstest belegt das auch bei einem im Body mitgesendeten Fremd-Wert).
- `requested_role_code = "fansub_lead"` wird vom Endpunkt angenommen (das ist der fachliche Kernzweck von D-01/D-07) — die Plattform-Admin-Freigabe-Logik dafür folgt in einem späteren Plan (191-06).
- `main.go` verdrahtet Repository, Handler, die neue Limiter-Instanz und die Route; Backend-Container wurde neu gebaut, ist gesund, und der neue Endpunkt antwortet (401 ohne Auth, bestätigt Erreichbarkeit statt 404).

## Task Commits

Each task was committed atomically:

1. **Task 1: AppUserID-geschlüsselte Rate-Limit-Middleware-Variante** - `679173ff0` (feat)
2. **Task 2: CreateHint-Handler + main.go-Wiring** - `5c25d9abc` (feat)

**Doku-Nachzug:** `046087f21` (docs: BACKEND_ARCHITEKTUR.md)

## Files Created/Modified
- `backend/internal/middleware/comment_rate_limit.go` - `FansubGroupHintDailyLimitMiddleware` + gemeinsame Deny-/Fehler-Helfer
- `backend/internal/middleware/comment_rate_limit_test.go` - 5 neue Testfälle (Limit, Denial+Retry-After, Isolation pro App-User, Fail-Closed ohne Identität, Fail-Open bei Redis-Ausfall)
- `backend/internal/handlers/fansub_group_hints_me_handler.go` - `FansubGroupHintsMeHandler.CreateHint`
- `backend/internal/handlers/fansub_group_hints_me_handler_test.go` - 14 Verhaltenstests (httptest + Fake-Repository, Statuscode + Body-Assertion)
- `backend/cmd/server/main.go` - neue Limiter-Instanz (Zeile ~119), Repository-/Handler-Konstruktion + Routen-Registrierung
- `docs/BACKEND_ARCHITEKTUR.md` - Abschnitt „Hinweise an Fansub-Gruppen" um den neuen Endpunkt/die Middleware ergänzt

## Decisions Made
- `ResolveVerifiedMemberID` bleibt im Handler erhalten (404 bei fehlendem verifiziertem Member-Claim), obwohl danach kein Ownership-Check mehr folgt — laut Plan-eigener `<behavior>`-Vorgabe ein reiner Identitätsnachweis, keine Autorisierung. Die offene UI-SPEC-Frage (Contract A6, ob das für die Trigger-Button-Gating-Logik im Frontend ausreicht) ist explizit NICHT Teil dieses Backend-Plans.
- Handler validiert zusätzlich zu den Plan-Akzeptanzkriterien einen Korrektur-Hinweis mit gesetztem `requested_role_code` als 422 (spiegelt `chk_fansub_group_hints_role_scope`) — verhindert, dass diese Kombination erst als rohe DB-Constraint-Verletzung (500) auffällt.
- `main.go` (712 Zeilen, bereits vor diesem Plan über dem 450-Zeilen-Limit) wurde NICHT aufgeteilt — etablierter, von mehreren Vorgänger-Phasen unangetastet gelassener Bestandsfall der zentralen, laut CLAUDE.md-Konvention als Pflicht-Wiring-Ort vorgesehenen Datei; nur ~10 additive Zeilen ergänzt, keine inhaltliche Umstrukturierung nötig.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Testfunktionsnamen trafen die im Plan vorgegebenen `-run`-Filter nicht**
- **Found during:** Task 1 und Task 2 Verifikation (`go test ... -run RateLimit`/`-run FansubGroupHint`)
- **Issue:** Erste Testnamen (`TestFansubGroupHintDailyLimitMiddleware...` bzw. `TestCreateHint_...`) enthielten nicht den vom jeweiligen Plan-Verifikationsbefehl verlangten Substring (`RateLimit` bzw. `FansubGroupHint`) — die Filter trafen dadurch keinen der neuen Tests.
- **Fix:** Testfunktionen umbenannt auf `TestFansubGroupHintRateLimitMiddleware...` (Task 1) bzw. `TestFansubGroupHint_CreateHint_...` (Task 2).
- **Files modified:** backend/internal/middleware/comment_rate_limit_test.go, backend/internal/handlers/fansub_group_hints_me_handler_test.go
- **Verification:** Beide `-run`-Filter treffen jetzt alle neuen Tests, alle grün.
- **Committed in:** 679173ff0 / 5c25d9abc (vor dem jeweiligen Task-Commit korrigiert)

**2. [Rule 1 - Bug] Fake-Identität ohne `UserID`/`DisplayName` wurde von `CommentAuthIdentityFromContext` verworfen**
- **Found during:** Task 1 Verifikation
- **Issue:** Der erste Testhelfer setzte nur `AppUserID` in der Fake-`AuthIdentity` — `CommentAuthIdentityFromContext` verlangt zusätzlich `UserID > 0` und ein nicht-leeres `DisplayName`, sonst gilt die Identität als nicht vorhanden. Alle vier betroffenen Tests scheiterten dadurch mit 500 statt des erwarteten Verhaltens.
- **Fix:** Testhelfer `withFakeIdentity` setzt zusätzlich `UserID` und `DisplayName`.
- **Files modified:** backend/internal/middleware/comment_rate_limit_test.go
- **Verification:** Alle 5 neuen Middleware-Tests grün.
- **Committed in:** 679173ff0 (vor dem Commit korrigiert)

**3. [Rule 1 - Bug] Doppelte Funktionsdeklaration `decodeErrorMessage` im `handlers`-Package**
- **Found during:** Task 2 Verifikation (`go vet`)
- **Issue:** Die neue Testdatei deklarierte einen eigenen `decodeErrorMessage`-Helfer, der bereits identisch in `media_proxy_test.go` existiert — Compile-Fehler durch Redeklaration im selben Package.
- **Fix:** Eigene Deklaration entfernt, bestehenden paketweiten Helfer wiederverwendet.
- **Files modified:** backend/internal/handlers/fansub_group_hints_me_handler_test.go
- **Verification:** `go vet ./...` und `go test ./internal/handlers/... -run FansubGroupHint -v` grün.
- **Committed in:** 5c25d9abc (vor dem Commit korrigiert)

---

**Total deviations:** 3 auto-fixed (alle Rule 1 — mechanische Korrekturen vor dem jeweiligen Task-Commit, keine Abweichung vom fachlichen Plan-Inhalt)
**Impact on plan:** Keine Scope-Erweiterung; alle drei Korrekturen waren nötig, um die im Plan selbst vorgegebenen Verifikationsbefehle und den Build überhaupt lauffähig zu machen.

## Issues Encountered
None darüber hinaus.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Der Member-seitige Erstellpfad ist vollständig, getestet und live hinter Auth + Rate-Limit erreichbar — Pläne 191-04/191-05 (Leader-Review- bzw. Plattform-Admin-Review-Handler) können direkt auf `FansubGroupHintsRepository.ListByTargetGroup`/`ListForFansubLeadRole`/`Confirm`/`Reject` aufsetzen, ohne den Erstellpfad erneut anzufassen.
- Backend-Container (`team4sv30-backend`) wurde neu gebaut und läuft gesund; `go build`/`go vet`/volle `scripts/test-backend.sh`-Suite (`GATE: GREEN (0)`) bestätigt ohne Regression.
- Kein Blocker: Die offene UI-SPEC-Frage zu Contract A6 (Trigger-Button-Gating im Frontend) bleibt für den zuständigen Frontend-Plan (191-07) dokumentiert, berührt diesen Backend-Plan nicht.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
