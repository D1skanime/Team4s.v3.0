---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 32
subsystem: backend
tags: [migration, repository, validation, contract, d-29, d-31, d-32, d-33, d-34]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "related_release_version_id als reservierte, bisher ungenutzte Spalte (Migration 0187), D-23s ensureAnimeFansubProjectContextExistsInDB-Muster (Plan 191-25)"
provides:
  - "Migration 0189: uq_fansub_group_hints_open_topic keyt zusaetzlich auf COALESCE(related_release_version_id, -1) -- zwei offene Hinweise zu verschiedenen Releases desselben Projekts koexistieren jetzt"
  - "ensureHintReleaseContext (D-31): serverseitige Pruefung, dass ein optional angegebenes Release tatsaechlich zum Projekt gehoert UND die Zielgruppe daran beteiligt ist, bevor CreateHint einfuegt"
  - "ErrInvalidReleaseVersionContext -> 404 'Release-Fansub-Zuordnung nicht gefunden'"
  - "409-Konfliktmeldung unterscheidet release- von projektgescopten Faellen (D-33)"
  - "related_release_version_id/related_release_label in HintInput, FansubGroupHintRow, CreateHint-Request, allen drei Lesepfaden (ListByTargetGroup/ListBySender/ListWithoutActiveLead) und im Contract"
  - "fansub_group_hints_repository_admin.go: AdminHintListFilter/HasActiveLead/ListWithoutActiveLead ausgelagert, Hauptdatei bei 336 Zeilen"
affects: [191-33, 191-34, 191-35, 191-36]

tech-stack:
  added: []
  patterns:
    - "ensureHintReleaseContext mirrort den Stil von ensureAnimeFansubProjectContextExistsInDB (D-23), nicht dessen Join-Form -- eigene Datei, eigene Query, gleiches Fehler-Wrapping-Muster"
    - "fansubGroupHintSelectCols ist seit D-34 var statt const, weil related_release_label ueber den bestehenden publicReleaseTitleSQL-Baustein (group_repository.go) gebildet wird statt als reines SQL-Literal"
    - "409-Textwahl (D-33) entscheidet sich ausschliesslich am Request-Feld (req.RelatedReleaseVersionID != nil), nie an einem DB-Wert -- der Partial-Unique-Index liefert selbst keine Information darueber, WELCHES Feld kollidierte"

key-files:
  created:
    - database/migrations/0189_fansub_group_hints_release_scope.up.sql
    - database/migrations/0189_fansub_group_hints_release_scope.down.sql
    - backend/internal/repository/fansub_group_hints_repository_admin.go
  modified:
    - backend/internal/repository/errors.go
    - backend/internal/testsupport/phase191_postgres.go
    - backend/internal/repository/fansub_group_hints_repository.go
    - backend/internal/repository/fansub_group_hints_repository_validation.go
    - backend/internal/repository/fansub_group_hints_repository_test.go
    - backend/internal/handlers/fansub_group_hints_me_handler.go
    - backend/internal/handlers/fansub_group_hints_me_handler_test.go
    - shared/contracts/fansub-group-hints.yaml
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "ensureHintReleaseContext behandelt animeID == nil defensiv als ErrInvalidReleaseVersionContext statt eines SQL-NULL-Vergleichsfehlers, obwohl related_anime_id seit Migration 0188 praktisch nie nil ist (NOT-NULL-Constraint + Handler-Pflichtfeld) -- reine Verteidigungslinie, kein beobachtbares Verhalten im Normalfall."
  - "fansub_group_hints_repository_admin.go wurde beim Split direkt mit den finalen D-34-Scan-Spalten geschrieben (statt zuerst ein separater reiner Struktur-Commit und danach ein Inhalts-Commit), weil beide Aenderungen dieselbe Datei und denselben Task betreffen -- Verhalten wurde per vollem Testlauf vor UND nach dem Commit verifiziert, keine Regression."
  - "Testdaten-IDs 2, 3, 5, 6 in fansub_group_hints wurden nicht angefasst (D-35/ID-6-Loeschung ist explizit Plan 191-37 vorbehalten) -- live per psql gegen team4s_v2 nach dem Rebuild verifiziert."

requirements-completed: [D-31, D-32, D-33, D-34]

# Metrics
duration: ~55min
completed: 2026-10-24
---

# Phase 191 Plan 32: Release-Bezug fuer Hinweise -- Validierung, Doppel-Schutz, 409-Text, Lesepfade Summary

**Serverseitige Release-Validierung (D-31), release-genauer Doppel-Hinweis-Schutz (D-32), dynamische 409-Meldung (D-33) und Release-Spalten in allen Lesepfaden (D-34) fuer `fansub_group_hints` -- Migration 0189, `ensureHintReleaseContext`, Repository-Split unter 450 Zeilen**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files modified:** 12 (3 neu, 9 geaendert)

## Accomplishments

- Migration 0189 ersetzt `uq_fansub_group_hints_open_topic` durch einen Schluessel aus `(sender_app_user_id, target_fansub_group_id, related_anime_id, COALESCE(related_release_version_id, -1))` -- live gegen `team4s_v2` verifiziert (`indexdef` zeigt die neue Spaltenliste), Migration 0188 blieb byte-identisch unangetastet (append-only).
- `ensureHintReleaseContext` (`fansub_group_hints_repository_validation.go`) prueft vor jedem Insert mit gesetztem `related_release_version_id`, dass das Release ueber `release_versions -> fansub_releases -> episodes.anime_id` tatsaechlich zum uebergebenen Projekt gehoert UND `target_fansub_group_id` laut `release_version_groups` daran beteiligt ist -- fehlt eine der beiden Bedingungen, liefert `ErrInvalidReleaseVersionContext` statt eines stillen Inserts mit erfundener Kombination.
- `CreateHint`, `HintInput`, `FansubGroupHintRow` und alle drei Lesepfade (`ListByTargetGroup`, `ListBySender`, `ListWithoutActiveLead`) tragen jetzt `RelatedReleaseVersionID`/`RelatedReleaseLabel`; das Label wird ueber den bereits fuer oeffentliche Release-Listen genutzten `publicReleaseTitleSQL`-Baustein gebildet (`fansubGroupHintSelectCols` dafuer von `const` auf `var` umgestellt).
- `fansub_group_hints_repository.go` wurde von 449 auf 336 Zeilen reduziert: `AdminHintListFilter`/`HasActiveLead`/`ListWithoutActiveLead` leben jetzt in der neuen `fansub_group_hints_repository_admin.go`, Verhalten unveraendert (D-11 weiterhin korrekt, per vollem Testlauf bestaetigt).
- Der Member-Handler (`fansub_group_hints_me_handler.go`) nimmt `related_release_version_id` optional entgegen, mappt `ErrInvalidReleaseVersionContext` auf 404 "Release-Fansub-Zuordnung nicht gefunden" und waehlt den 409-Text (`fansubGroupHintConflictMessage(bool)`) ausschliesslich anhand des Request-Felds -- "Du hast zu diesem Release..." vs. "...zu diesem Projekt..." (D-33).
- `shared/contracts/fansub-group-hints.yaml` und `docs/BACKEND_ARCHITEKTUR.md` dokumentieren das neue Feld, die 404-Erweiterung, die D-32-Indexsemantik und die D-33-Textwahl.
- 10 neue Repository-Tests (falsches Projekt, nicht beteiligte Gruppe, gueltige Kombination mit Label, weggelassenes Release ohne Regression, Release-Sichtbarkeit in `ListByTargetGroup`, Koexistenz zweier offener Hinweise zu verschiedenen Releases vs. Konflikt beim selben Release) und 4 neue Handler-Tests (release- vs. projektgescopter 409-Text, 404-Mapping, Durchreichen des Felds) -- alle gruen gegen eine echte, isolierte Postgres-Instanz.
- Voller Backend-Testlauf (`scripts/test-backend.sh`, 28 Wegwerf-Datenbanken, Phase-134-Matrix inklusive) zweimal gruen (nach Task 2 und nach Task 3): `GATE: GREEN (0)`, keine FAILs, keine uebersprungene Suite wegen fehlender DSN.
- `docker compose up -d --build team4sv30-backend` erfolgreich; `/health` liefert `{"status":"ok"}`; Migration 0189 live gegen `team4s_v2` bestaetigt angewendet; Testdaten-IDs 2, 3, 5 (und 6, bewusst nicht geloescht -- das ist Plan 191-37) unveraendert per `psql` gegengeprueft.

## Task Commits

1. **Task 1: Migration 0189 + test-fixture foundation** - `54f88e1ee` (feat)
2. **Task 2: Repository split + D-31 validation + D-34 read-path columns** - `f249bbbb4` (feat)
3. **Task 3: Handler wiring + D-33 dynamic conflict message + contract + docs** - `258676624` (feat)

## Files Created/Modified

- `database/migrations/0189_fansub_group_hints_release_scope.up.sql` - neue, release-gescopte Unique-Index-Definition (D-32)
- `database/migrations/0189_fansub_group_hints_release_scope.down.sql` - exakte Rueckrollung auf den 0188-Zustand
- `backend/internal/repository/errors.go` - `ErrInvalidReleaseVersionContext` ergaenzt (D-31)
- `backend/internal/testsupport/phase191_postgres.go` - real-shaped `episodes`/`fansub_releases`/`release_version_groups`-Stand-ins + `release_versions.release_id`/`version`/`title`, Migration 0189 wird im Fixture angewendet
- `backend/internal/repository/fansub_group_hints_repository_admin.go` - neu; `AdminHintListFilter`/`HasActiveLead`/`ListWithoutActiveLead` aus der Hauptdatei ausgelagert, inkl. D-34-Scan-Spalten
- `backend/internal/repository/fansub_group_hints_repository.go` - `RelatedReleaseVersionID`/`RelatedReleaseLabel` in `HintInput`/`FansubGroupHintRow`, `fansubGroupHintSelectCols` jetzt `var` mit Release-Label-Baustein, drei neue `LEFT JOIN`s, `CreateHint` ruft `ensureHintReleaseContext` auf und fuegt die neue Spalte ein; Datei jetzt 336 Zeilen
- `backend/internal/repository/fansub_group_hints_repository_validation.go` - `ensureHintReleaseContext` (D-31) ergaenzt
- `backend/internal/repository/fansub_group_hints_repository_test.go` - `seedPhase191ReleaseVersion`-Helper + 6 neue Verhaltenstests
- `backend/internal/handlers/fansub_group_hints_me_handler.go` - `related_release_version_id` im Request-DTO, `fansubGroupHintConflictMessage(bool)`-Funktion statt Konstante, neues 404-Mapping fuer `ErrInvalidReleaseVersionContext`
- `backend/internal/handlers/fansub_group_hints_me_handler_test.go` - 4 neue Tests fuer D-31/D-33, bestehender Konflikt-Test in projektgescopte Variante umbenannt
- `shared/contracts/fansub-group-hints.yaml` - `related_release_version_id`/`related_release_label` in Request/Response-Schema, erweiterte 404/409-Beschreibungen inkl. zweitem 409-Beispiel
- `docs/BACKEND_ARCHITEKTUR.md` - Absatz um D-29/D-31/D-32/D-33/D-34 ergaenzt

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

None - plan executed exactly as written. Die im Plan vorgesehene Reihenfolge "erst reiner Struktur-Split, dann Inhaltsaenderung, mit Zwischen-Testlauf" wurde fuer `fansub_group_hints_repository_admin.go` als neue Datei direkt mit den finalen D-34-Spalten geschrieben (dieselbe Datei, derselbe Task, derselbe Commit) -- vor UND nach der gesamten Task-2-Aenderung lief die volle Backend-Suite gruen, keine Verhaltensregression beobachtet.

## Known Stubs

None - keine Stubs. Frontend-seitige Nutzung der neuen Felder (Formular-Select, Listen-Anzeige) ist bewusst Plan 191-33/191-36 vorbehalten; das Backend liefert die Daten bereits vollstaendig und korrekt.

## Issues Encountered

Keine. `go build`/`go test ./internal/repository/... -run FansubGroupHint -v`/`go test ./internal/handlers/... -run FansubGroupHint -v` sowie der volle `scripts/test-backend.sh`-Lauf liefen beim ersten Versuch gruen.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness

- D-31/D-32/D-33/D-34s Backend-Haelfte ist vollstaendig umgesetzt und live verifiziert (Migration angewendet, Container gesund, Testdaten unangetastet).
- Plan 191-33 ff. (Formular-Select, UI-Anzeige der drei Hinweis-Listen) kann jetzt auf ein vollstaendiges, getestetes Backend-API aufsetzen: `related_release_version_id` wird akzeptiert, validiert und in allen Lesepfaden mit lesbarem Label zurueckgegeben.
- D-34s Eigengruppen-Variante (`anime_contributions`-Proposals) bleibt laut Plan explizit offen -- kein Blocker fuer diesen Plan, wird in einem spaeteren Plan-SUMMARY als "nicht umgesetzt, Grund: Schema-Umbau noetig" behandelt, falls zutreffend.
- Kein Blocker fuer 191-33.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 32*
*Completed: 2026-10-24*

## Self-Check: PASSED

All 12 files created/modified by this plan confirmed present on disk; all three task commit
hashes (`54f88e1ee`, `f249bbbb4`, `258676624`) confirmed present in git history.
