---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 25
subsystem: api
tags: [go, postgres, pgx, gin, fansub-group-hints, data-integrity]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "FansubGroupHintsRepository/FansubGroupHintsMeHandler (Pläne 191-01..191-24), ensureAnimeFansubProjectContextExistsInDB-Helfer (anime_project_notes_repository.go)"
provides:
  - "CreateHint lehnt eine (target_fansub_group_id, related_anime_id)-Paarung ohne reale anime_fansub_groups-Zeile serverseitig mit ErrInvalidAnimeFansubContext/404 ab"
  - "Pre-Insert-Validierung in eigener Datei fansub_group_hints_repository_validation.go, damit fansub_group_hints_repository.go unter 450 Zeilen bleibt"
  - "anime_fansub_groups-Testfixture-Stand-in (Migration-0011-Schema) in phase191_postgres.go"
  - "docs/BACKEND_ARCHITEKTUR.md beschreibt den neuen D-23-Check"
affects: [191-30, 191-hinweis-senden-fremde-gruppen-D-23, 191-hinweis-senden-fremde-gruppen-D-25]

tech-stack:
  added: []
  patterns:
    - "Repository-Validierung vor INSERT ausgelagert in eine eigene, gleichpaketige *_validation.go-Datei, wenn die Haupt-Repository-Datei sonst das 450-Zeilen-Limit überschreitet"

key-files:
  created:
    - backend/internal/repository/fansub_group_hints_repository_validation.go
  modified:
    - backend/internal/repository/fansub_group_hints_repository.go
    - backend/internal/repository/fansub_group_hints_repository_test.go
    - backend/internal/handlers/fansub_group_hints_me_handler.go
    - backend/internal/handlers/fansub_group_hints_me_handler_test.go
    - backend/internal/testsupport/phase191_postgres.go
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "ensureAnimeFansubProjectContextExistsInDB wiederverwendet statt dupliziert (D-23, explizite Guardrail-Vorgabe)"
  - "Pre-Insert-Check in fansub_group_hints_repository_validation.go ausgelagert statt die 450-Zeilen-Grenze zu überschreiten"
  - "TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsNotFound umbenannt/angepasst zu ReturnsInvalidContext: die neue D-23-Prüfung läuft jetzt vor dem INSERT und fängt eine unbekannte Zielgruppe bereits als fehlende anime_fansub_groups-Paarung ab (ErrInvalidAnimeFansubContext statt der vorherigen FK-Verletzung/ErrNotFound) -- beide Fälle münden weiterhin in einer 404-Antwort am Handler"

requirements-completed: [D-23, D-25]

duration: 35min
completed: 2026-10-24
---

# Phase 191 Plan 25: D-23 Server-Validierung Projekt-Gruppe-Zuordnung Summary

**CreateHint prüft vor dem Insert serverseitig per wiederverwendetem Helfer, dass die Projekt-Gruppe-Paarung real in anime_fansub_groups existiert, sonst 404 statt eines erfundenen Hinweises.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files modified:** 6 (1 neu, 5 geändert)

## Accomplishments
- `FansubGroupHintsRepository.CreateHint` lehnt jede (target_fansub_group_id, related_anime_id)-Paarung ohne reale `anime_fansub_groups`-Zeile mit `ErrInvalidAnimeFansubContext` ab, bevor ein INSERT versucht wird — behebt den live reproduzierten Datenfehler (Hinweis-ID 4: Gruppe 29 ↔ Anime 2 ohne passende Zuordnung).
- `FansubGroupHintsMeHandler.CreateHint` mappt den neuen Fehler auf `404` mit der deutschen Meldung „Anime-Fansub-Zuordnung nicht gefunden".
- Alle acht bestehenden Repository-Tests mit erfolgreichem `CreateHint` wurden um den jetzt nötigen `seedPhase191AnimeFansubGroup`-Seed ergänzt; zwei neue Repository-Tests und ein neuer Handler-Test beweisen Ablehnung und Erfolg.
- `anime_fansub_groups`-Testfixture (echtes Migration-0011-Schema) in `phase191_postgres.go` ergänzt.
- `fansub_group_hints_repository.go` blieb nach der Änderung bei 451 Zeilen über dem 450-Limit — die Pre-Insert-Prüfung wurde in `fansub_group_hints_repository_validation.go` ausgelagert, Endstand 448 Zeilen.
- D-25-Sweep für alle drei von dieser Runde berührten Dateien (`me_handler.go`, `repository.go`, `phase191_postgres.go`) sowie für die drei separat gelisteten Dateien (`admin_fansub_group_hints_handler.go`, `fansub_group_hints_decide.go`, `fansub_group_hints_review_handler.go`) per `git diff 72fc7c0f6..HEAD` geprüft: alle Phase-191-Kommentare sind bereits fact-first mit D-Tag als Nebenverweis — keine bloßen D-Tag-Kommentare gefunden, keine Änderung nötig.
- `docs/BACKEND_ARCHITEKTUR.md` um einen Satz zum neuen D-23-Check ergänzt.
- Backend-Container neu gebaut (`docker compose up -d --build team4sv30-backend`), `/health` bestätigt `{"status":"ok"}`.
- Volle Backend-Suite (`scripts/test-backend.sh`) grün: `go test exit code: 0`, `GATE: GREEN (0)`, kein Suite silently skipped.
- Live-Testdaten `fansub_group_hints` IDs 1-5 unverändert geprüft (keine DB-Mutation durch diesen Plan).

## Task Commits

1. **Task 1: D-23 server-side validation — repository check + handler error mapping + tests** - `24de5c81f` (fix)
2. **Task 2: D-25 comment sweep for the three remaining backend files + BACKEND_ARCHITEKTUR.md note** - `0a7bb6cdc` (docs)

## Files Created/Modified
- `backend/internal/repository/fansub_group_hints_repository_validation.go` - neue `ensureHintAnimeFansubContext`-Hilfsfunktion (D-23-Pre-Insert-Check, ausgelagert für das 450-Zeilen-Limit)
- `backend/internal/repository/fansub_group_hints_repository.go` - `CreateHint` ruft `ensureHintAnimeFansubContext` vor dem INSERT auf; Doc-Kommentar aktualisiert
- `backend/internal/repository/fansub_group_hints_repository_test.go` - `seedPhase191AnimeFansubGroup`-Helfer; Seeds für alle Erfolgstests; `UnknownTargetGroup`-Test auf `ErrInvalidAnimeFansubContext` umgestellt; neuer `AnimeNotLinkedToTargetGroup`-Test
- `backend/internal/handlers/fansub_group_hints_me_handler.go` - `fansubGroupHintInvalidContextMessage`-Konstante + `errors.Is(err, repository.ErrInvalidAnimeFansubContext)`-404-Branch
- `backend/internal/handlers/fansub_group_hints_me_handler_test.go` - neuer `InvalidAnimeFansubContextReturns404`-Test
- `backend/internal/testsupport/phase191_postgres.go` - `anime_fansub_groups`-Stand-in-Tabelle (Migration-0011-Schema) + Doc-Kommentar-Erweiterung
- `docs/BACKEND_ARCHITEKTUR.md` - Satz zum D-23-Check in der `fansub_group_hints`-Beschreibung ergänzt

## Decisions Made
- `ensureAnimeFansubProjectContextExistsInDB` wiederverwendet statt eine eigene, parallele Prüfung zu bauen (D-23-Vorgabe, Guardrail 2).
- Die neue Validierung in eine eigene Datei ausgelagert, weil `fansub_group_hints_repository.go` nach der inline-Variante bei 451 Zeilen lag (450-Zeilen-Limit, CLAUDE.md).
- Der bestehende Test `TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsNotFound` musste inhaltlich angepasst werden (siehe Deviations) — eine notwendige, nicht schwächende Konsequenz der neuen, strikteren Prüfreihenfolge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Testanpassung] Bestehender Test mit falscher Fehlererwartung durch die neue Prüfreihenfolge**
- **Found during:** Task 1 (D-23-Implementierung)
- **Issue:** `TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsNotFound` erwartete `ErrNotFound`, das vorher durch eine FK-Verletzung beim INSERT entstand. Die neue D-23-Prüfung läuft jetzt VOR dem INSERT; eine unbekannte `target_fansub_group_id` hat per Definition auch keine `anime_fansub_groups`-Zeile, also liefert `ensureHintAnimeFansubContext` in diesem Fall `ErrInvalidAnimeFansubContext` statt die FK-Verletzung zu erreichen.
- **Fix:** Test umbenannt zu `TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsInvalidContext`, Assertion auf `errors.Is(err, ErrInvalidAnimeFansubContext)` umgestellt. Keine Assertion wurde geschwächt — der Test prüft weiterhin streng einen konkreten Fehlertyp, nur den fachlich jetzt korrekten. Am Handler ändert sich das HTTP-Ergebnis nicht (weiterhin 404).
- **Files modified:** `backend/internal/repository/fansub_group_hints_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run FansubGroupHint -v` grün.
- **Committed in:** `24de5c81f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Notwendige, erwartbare Konsequenz der D-23-Prüfreihenfolge, kein Scope-Creep. Alle anderen pre-existierenden Erfolgstests blieben durch den zusätzlichen Seed unverändert bestehen.

## Issues Encountered
- Kein lokal installiertes `go`-Binary auf dem Host — Build/Tests liefen stattdessen über `golang:1.25-alpine`-Container gegen das `team4s_default`-Docker-Netzwerk (analog zu `scripts/test-backend.sh`s eigenem Ansatz), inkl. einer eigenen Wegwerf-DB `team4s_phase191_test_ex25` für den gezielten Task-1-Testlauf (vor dem finalen Vollauf wieder gedroppt).

## User Setup Required
None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- D-23 und D-25 sind für diese Plan-Runde vollständig geschlossen.
- D-24 (Löschung der Testdaten-IDs 1 und 4) ist laut Guardrail-Vorgabe explizit NICHT Teil dieses Plans — bleibt für Plan 191-30.
- Live-Testdaten-IDs 2, 3 und 5 unverändert bestätigt (DB-Snapshot in diesem Summary dokumentiert).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-24*
