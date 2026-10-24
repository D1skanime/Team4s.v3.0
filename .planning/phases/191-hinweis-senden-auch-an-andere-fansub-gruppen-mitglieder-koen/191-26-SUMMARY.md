---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 26
subsystem: api
tags: [go, gin, backend-architecture, refactor, main.go-split, d-26, d-25]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "fansub_group_hints Routing/Wiring (Pläne 191-01..191-25), admin_routes.go/bootstrap_helpers.go-Präzedenz für struct-of-dependencies-Dateien"
provides:
  - "backend/cmd/server/main.go bei 62 Zeilen, ohne CLAUDE.md-Ausnahme für das 450-Zeilen-Limit"
  - "Vier neue, fachlich geschnittene Wiring-/Routing-Dateien (wiring_infra.go, wiring_catalog.go, wiring_fansub_contributions.go, routes_public.go), jede ≤450 Zeilen, identisches Laufzeitverhalten"
  - "catalogDeps/fansubContributionsResult-Structs als expliziter Dependency-Transport zwischen den neuen Dateien"
  - "D-25-Kommentar-Sweep für main.go's 5 Phase-191-Kommentarblöcke abgeschlossen (2 umformuliert, 3 bereits konform)"
  - "docs/BACKEND_ARCHITEKTUR.md beschreibt die neue Mehrdatei-Struktur (Tabelle + Einstiegspunkte-Absätze)"
affects: [191-27, 191-28, 191-29, 191-30, 191-31]

tech-stack:
  added: []
  patterns:
    - "Struct-of-dependencies-Transport (catalogDeps, fansubContributionsResult) zwischen Wiring-Funktionen statt Parameterlisten mit vielen einzelnen Argumenten"
    - "Volle lokale Destrukturierung von Struct-Feldern am Funktionsanfang (core.X -> lokales X), damit der Funktionsrumpf textlich mit main.go vor dem Split identisch bleibt und bestehende substring-grep-Tests (main_test.go-Familie) weiter funktionieren"
    - "readServerWiringSource()-Testhelfer liest alle Nicht-Test-.go-Dateien im Paket zusammen, statt eine feste Datei (main.go) zu grep-en -- macht Wiring-Fragment-Tests robust gegen künftige Datei-Splits"

key-files:
  created:
    - backend/cmd/server/wiring_infra.go
    - backend/cmd/server/wiring_catalog.go
    - backend/cmd/server/wiring_fansub_contributions.go
    - backend/cmd/server/routes_public.go
    - backend/cmd/server/wiring_source_test_helper_test.go
  modified:
    - backend/cmd/server/main.go
    - backend/cmd/server/phase108_runtime_wiring_test.go
    - backend/cmd/server/admin_media_authz_wiring_test.go
    - backend/internal/repository/domain_projection_repository_test.go
    - backend/internal/repository/media_ownership_projection_repository_test.go
    - backend/internal/handlers/project_member_public_handler_test.go
    - backend/internal/handlers/public_member_access_matrix_test.go
    - docs/BACKEND_ARCHITEKTUR.md

key-decisions:
  - "wiring_catalog.go bleibt EINE Datei (435 Zeilen) statt wie im Plan optional vorgesehen in zwei Dateien gesplittet, weil main()'s Original-Block (Zeilen 81-370) als Ganzes unter 450 Zeilen passt, sobald er in eine eigene Funktion extrahiert wird -- kein künstlicher zweiter Datei-Schnitt ohne fachlichen Mehrwert"
  - "Jede Wiring-/Routing-Funktion entpackt ihr catalogDeps/fansubContributionsResult-Struct-Argument zuerst vollständig in lokale Variablen mit den Original-Namen, bevor der eigentliche (unveränderte) main.go-Code folgt -- Haupttreiber war die Entdeckung, dass 5 bestehende Tests (cmd/server-Paket + 3 Cross-Package-Tests) main.go per os.ReadFile nach EXAKTEN bare-name-Fragmenten wie 'WithReleaseCrewService(releaseCrewService)' oder 'authoptionalmiddleware, projectmemberpublichandler.getsummary' grep-en; ein 'core.'/'contrib.'-Präfix hätte diese Tests gebrochen"
  - "Zwei Routing-Teilfunktionen (registerPublicRoutesPart1/Part2) statt einer einzigen registerPublicRoutes-Funktion, um main()'s ursprüngliche Aufrufreihenfolge (öffentliche Routen Teil 1 -> Admin-Wiring+registerAdminRoutes -> öffentliche Routen Teil 2) exakt zu erhalten, statt sich auf Gins Trie-Unabhängigkeit von der Registrierungsreihenfolge zu verlassen"
  - "gofmt-Korrektur über einen host-bind-gemounteten golang:1.25-alpine-Container statt docker compose exec gegen den laufenden Dev-Container, nachdem sich zeigte, dass /app im laufenden Backend-Container NICHT bind-gemountet ist (nur /app/media, /database/migrations, /scripts) -- ein docker-exec-'gofmt -w' hätte sonst nur die flüchtige Image-Kopie formatiert, nicht die Host-Datei, die tatsächlich committet wird"

requirements-completed: [D-26, D-25]

# Metrics
duration: ~75min
completed: 2026-10-24
---

# Phase 191 Plan 26: main.go-Struktursplit (D-26) + D-25-Kommentar-Sweep Summary

**main.go (738 → 62 Zeilen) in vier fachlich geschnittene Wiring-/Routing-Dateien aufgeteilt, Verhalten unverändert (volle Backend-Testsuite grün, Live-Container-Smoke-Test bestanden), plus abgeschlossener D-25-Kommentar-Sweep und aktualisierte Architektur-Doku**

## Performance

- **Duration:** ~75 min
- **Tasks:** 2
- **Files modified:** 13 (5 neu, 8 geändert)

## Accomplishments
- `backend/cmd/server/main.go` ist jetzt 62 Zeilen (vorher 738) und verstößt nicht mehr gegen CLAUDE.md's 450-Zeilen-Regel -- ohne Ausnahme, wie vom Nutzer für diese Runde festgelegt.
- Vier neue Dateien (`wiring_infra.go` 106, `wiring_catalog.go` 435, `wiring_fansub_contributions.go` 164, `routes_public.go` 292 Zeilen) übernehmen main()'s komplette Boot-/Wiring-/Routing-Logik 1:1, jede für sich unter dem Limit.
- Laufzeitverhalten nachweislich unverändert: `go build`/`go vet` grün, volle Backend-Regressionssuite (`scripts/test-backend.sh`) zweimal hintereinander grün (Exit 0, 0 FAIL-Zeilen), Backend-Container neu gebaut und `/health` + 9 Stichproben-Routen (öffentlich/admin/geschützt) antworten exakt wie vor dem Split (200/401/400 je nach Erwartung).
- D-25-Kommentar-Sweep abgeschlossen: Die beiden Kommentarblöcke, die mit `D-18:`/`Phase 191-04:` als Satzsubjekt begannen, wurden umformuliert, sodass die fachliche Regel führt und der Verweis nachgestellt/parenthetisch erscheint. Die 3 bereits konformen Blöcke (fansubHintDailyLimiter, fansubGroupHintsRepo-Wiring, Plattform-Admin/D-11) blieben unangetastet.
- `docs/BACKEND_ARCHITEKTUR.md` beschreibt jetzt die neue Mehrdatei-Struktur (Verantwortlichkeiten-Tabelle "Prozess-Start"-Zeile + ein Absatz pro neuer Datei im Abschnitt "Einstiegspunkte").
- Live-Testdaten `fansub_group_hints` ID 2/3/5 verifiziert unverändert (status weiterhin "open").

## Task Commits

1. **Task 1: Pure structural split of main.go (behavior-preserving)** - `0865328c4` (refactor)
2. **Task 2: D-25 comment sweep + BACKEND_ARCHITEKTUR.md update + regression confirmation** - `8b3a2d342` (docs)

**Plan metadata:** (folgt in diesem Commit)

## Files Created/Modified
- `backend/cmd/server/wiring_infra.go` - `bootstrapInfra(ctx, cfg)`: DB-Pool/Redis-Client, ffmpeg/vipsthumbnail-Checks, Basis-Gin-Router (`/health`, `/media`-StaticFS), `corsMiddleware`
- `backend/cmd/server/wiring_catalog.go` - `bootstrapCatalog(...)`: komplette Repo→Service→Handler-Kette für Katalog/Auth/Medien/Fansub/Gruppen + alle Hintergrund-Goroutinen; gibt `catalogDeps`-Struct zurück
- `backend/cmd/server/wiring_fansub_contributions.go` - `wireFansubContributionsAndAdminRoutes(...)`: Fansub-Historie/Contributions/Badges + Phase 78/80/87/95/107/137/138-xx-Admin-Handler, ruft `registerAdminRoutes` auf
- `backend/cmd/server/routes_public.go` - `registerPublicRoutesPart1`/`registerPublicRoutesPart2`: alle Nicht-Admin-`/api/v1/*`-Routen in main()'s Original-Reihenfolge; enthält den D-25-umformulierten D-18- und Phase-191-04-Kommentar
- `backend/cmd/server/main.go` - auf 62 Zeilen reduziert: kurze, geordnete Aufrufsequenz + Prozess-Lifecycle (defer Close, Signal-Handling, Graceful Shutdown)
- `backend/cmd/server/wiring_source_test_helper_test.go` - neuer Testhelfer `readServerWiringSource`, liest alle Nicht-Test-.go-Dateien im Paket zusammen
- `backend/cmd/server/phase108_runtime_wiring_test.go`, `backend/cmd/server/admin_media_authz_wiring_test.go` - auf den neuen Helfer umgestellt statt fest `main.go`/`admin_routes.go` zu lesen
- `backend/internal/repository/domain_projection_repository_test.go`, `backend/internal/repository/media_ownership_projection_repository_test.go` - Routen-Check zeigt jetzt auf `routes_public.go` statt `main.go`
- `backend/internal/handlers/project_member_public_handler_test.go` - `pmMainSource` liest jetzt `routes_public.go` + `wiring_catalog.go`
- `backend/internal/handlers/public_member_access_matrix_test.go` - Kommentare mit main.go-Zeilennummern durch Dateinamen-Verweise ersetzt (nur Kommentar, keine Testlogik geändert)
- `docs/BACKEND_ARCHITEKTUR.md` - Verantwortlichkeiten-Tabelle + Einstiegspunkte-Abschnitt auf die neue Mehrdatei-Struktur aktualisiert

## Decisions Made
Siehe `key-decisions` im Frontmatter (wiring_catalog.go bewusst nicht weiter gesplittet; volle lokale Destrukturierung der Struct-Argumente zur Wahrung bestehender substring-grep-Tests; zwei registerPublicRoutes-Teilfunktionen statt einer; gofmt-Fix über host-bind-gemounteten Container statt `docker compose exec`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 5 bestehende Tests, die main.go/admin_routes.go per `os.ReadFile` grep-ten, nach main.go-Split angepasst**
- **Found during:** Task 1 (vor dem ersten Build-Versuch, durch gezielte Suche nach `ReadFile("main.go")`-Mustern im Repo)
- **Issue:** `backend/cmd/server/phase108_runtime_wiring_test.go`, `admin_media_authz_wiring_test.go` sowie drei Cross-Package-Tests (`domain_projection_repository_test.go`, `media_ownership_projection_repository_test.go`, `project_member_public_handler_test.go`) lesen main.go's/admin_routes.go's Rohquelltext und prüfen per `strings.Contains` auf exakte Code-Fragmente (Routen, Konstruktor-Aufrufe). Nach dem Split liegen diese Fragmente in anderen Dateien -- die Tests wären ohne Anpassung fehlgeschlagen, obwohl das Verhalten unverändert ist.
- **Fix:** Neuer Helfer `readServerWiringSource()` liest alle Nicht-Test-.go-Dateien im `cmd/server`-Paket zusammen (robust gegen künftige Datei-Splits); die 3 Cross-Package-Tests wurden auf die konkrete neue Zieldatei (`routes_public.go` bzw. `routes_public.go`+`wiring_catalog.go`) umgestellt.
- **Files modified:** siehe Liste oben
- **Verification:** Alle 5 betroffenen Tests laufen in der vollen `scripts/test-backend.sh`-Suite grün (einzeln verifiziert per `grep` im Testlauf-Log).
- **Committed in:** `0865328c4` (Task 1 commit)

**2. [Rule 1 - Bug] gofmt-Korrektur betraf zunächst nur die flüchtige Container-Kopie, nicht die Host-Datei**
- **Found during:** Task 2 (erneuter `gofmt -l`-Check nach dem D-25-Sweep)
- **Issue:** Der erste `gofmt -w` in Task 1 lief über `docker compose exec team4sv30-backend`; `/app` in diesem Container ist NICHT bind-gemountet (nur `/app/media`, `/database/migrations`, `/scripts`), sondern eine Build-Zeit-Kopie. Die Formatierung landete also nur in der flüchtigen Container-Kopie, nicht in der tatsächlich committeten Host-Datei `wiring_catalog.go` -- diese blieb mit uneinheitlicher Struct-Feld-Ausrichtung im Repo.
- **Fix:** `gofmt -w` erneut über einen frischen `golang:1.25-alpine`-Container mit explizitem Bind-Mount des Host-Verzeichnisses (`-v /home/d1sk/team4s/backend:/repo`) ausgeführt -- das schreibt garantiert auf die Host-Datei.
- **Files modified:** `backend/cmd/server/wiring_catalog.go`
- **Verification:** `gofmt -l ./cmd/server/` über denselben host-gemounteten Container zeigt keine Treffer mehr; `go build`/`go vet` weiterhin grün; volle Testsuite erneut grün.
- **Committed in:** `8b3a2d342` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 -- Bugs, die durch die Natur des Datei-Splits bzw. der Docker-Entwicklungsumgebung entstanden, keine davon ändert produktives Verhalten).
**Impact on plan:** Beide Fixes waren notwendig, um die Plan-Vorgabe "volle Backend-Regressionssuite grün" tatsächlich zu erfüllen. Kein Scope-Creep über main.go-Split/D-25/Doku-Update hinaus.

## Issues Encountered
- Kein lokal installierter Go-Toolchain auf dem Host; alle `go build`/`go vet`/`gofmt`-Checks liefen über Docker (zunächst fälschlich über `docker compose exec` gegen den laufenden, nicht bind-gemounteten Dev-Container, siehe Deviation 2; danach korrekt über host-bind-gemountete `golang:1.25-alpine`-Container). Die offizielle `scripts/test-backend.sh`-Suite bind-mountet das gesamte Repo korrekt und lieferte beide Male verlässlich grüne Ergebnisse.
- Ein direkter `go test ./cmd/server/... ./internal/repository/... ./internal/handlers/...`-Lauf innerhalb des laufenden Dev-Containers zeigte mehrere FAILs (Phase-134-Matrix-Verbindungsfehler, fehlende Jellyfin-Fixture-Dateien) -- das ist erwartet, weil dieser Container die von `scripts/test-backend.sh` bereitgestellten Test-DSNs/Sidecar-Container/Arbeitsverzeichnis-Konventionen nicht hat. Kein echter Regressionsbefund; die offizielle Suite lief fehlerfrei.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- main.go hält jetzt CLAUDE.md's 450-Zeilen-Regel ohne Ausnahme ein; künftige Pläne, die main.go-angrenzenden Code anfassen, arbeiten bereits mit der neuen Mehrdatei-Struktur.
- D-25-Kommentar-Debt für main.go (bzw. seine Nachfolgedateien) ist vollständig abgeschlossen.
- Keine Blocker für 191-27 ff.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 26*
*Completed: 2026-10-24*

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; both task commit hashes
(`0865328c4`, `8b3a2d342`) confirmed present in git history.
