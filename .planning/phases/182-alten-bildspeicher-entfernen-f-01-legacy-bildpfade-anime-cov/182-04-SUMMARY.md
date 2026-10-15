---
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
plan: 04
subsystem: infra
tags: [go, cleanup, powershell, migration-tooling]

# Dependency graph
requires:
  - phase: 182-03
    provides: "anime.cover_image existiert nicht mehr in team4s_v2 -- die historischen Werkzeuge in diesem Plan hatten ohnehin keine Spalte mehr, die sie anfassen konnten"
provides:
  - "backend/cmd/migrate-covers/ (main.go, README.md, INVENTORY.md, test-migration.sh) ist entfernt -- das Einmal-Tool, das frontend/public/covers/ in die V2-Medienstruktur migrierte, existiert nicht mehr"
  - "scripts/report-cover-image-state.ps1 und scripts/remediate-cover-image.ps1 sind entfernt -- beide waren direkt an die inzwischen gedropte Spalte gekoppelt und zeigten historisch auf die falsche Standard-DB (team4s statt team4s_v2)"
  - "backend/cmd/migrate-preview-backfill/main.go's Kopfkommentar verweist nicht mehr auf ein existierendes cmd/migrate-covers-Verzeichnis (Vergangenheitsform)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/cmd/migrate-preview-backfill/main.go

key-decisions:
  - "Task 2 (D-04, blockierender Live-Checkpoint) wurde NICHT vom Ausfuehrungsagenten genehmigt oder simuliert -- die Freigabe wurde vom Nutzer erteilt und ueber den GSD-Orchestrator relayed (woertliches Zitat in 182-04-HUMAN-UAT.md dokumentiert)."
  - "Die im Originaltext des Plans genannte Watchlist-URL (/me/watchlist) ist falsch (404) -- die korrekte URL ist /watchlist (ohne /me-Praefix)."
  - "Punkt 5 (/watchlist): eine erste Nutzerrueckmeldung besagte, die Merkliste habe kein Jellyfin-Anime enthalten (ungeprueft, als offene Luecke dokumentiert); eine zweite, korrigierende Nutzerrueckmeldung besagte das Gegenteil (Cover vorhanden, bestanden). Da beide Aussagen sich widersprachen, wurde die zweite NICHT ungeprueft uebernommen, sondern unabhaengig per Live-DB-Abfrage (team4s_v2, watchlist_entries/anime/anime_media) und Code-Lektuere (watchlist.go nutzt animeCoverImageSelectSQL) verifiziert -- Ergebnis bestaetigt die Korrektur eindeutig: ein echter Jellyfin-Merklisteneintrag (anime_id=2, 11eyes) loest zu einer gueltigen Cover-URL auf."

requirements-completed: [D-03, D-04]

# Metrics
duration: ~25min (Task 1 + Finalisierung nach Nutzerfreigabe)
completed: 2026-10-15
---

# Phase 182 Plan 4: Historische Cover-Migrationswerkzeuge entfernt (D-03), Live-Checkpoint vom Nutzer freigegeben und alle 5 Punkte bestanden (D-04) Summary

**`backend/cmd/migrate-covers/` und zwei veraltete PowerShell-Skripte (`report-cover-image-state.ps1`, `remediate-cover-image.ps1`) sind entfernt; der volle Backend-Build bleibt grün. Der blockierende Live-UAT-Checkpoint (D-04) ist vom Nutzer freigegeben — alle 5 Vergleichspunkte bestanden, einschließlich Punkt 5 (`/watchlist`), dessen zunächst gemeldete Datenlücke per unabhängiger Live-DB-/Code-Prüfung korrigiert und bestätigt wurde.**

## Performance

- **Duration:** ~25 min (Task 1 + Checkpoint-Finalisierung)
- **Started:** 2026-10-14T23:50:00Z
- **Completed:** 2026-10-15T00:20:00Z
- **Tasks:** 2 von 2
- **Files modified:** 7 (6 gelöscht, 1 geändert) + 2 Dokumentationsdateien finalisiert

## Accomplishments
- `backend/cmd/migrate-covers/` (vier Dateien: `main.go`, `README.md`, `INVENTORY.md`, `test-migration.sh`) vollständig gelöscht — bestätigt per Vorab-Prüfung: kein Verweis in `Dockerfile`, `Makefile`, `docker-compose*.yml`; das Paket war `package main` und damit von keinem anderen Go-Paket importierbar.
- `scripts/report-cover-image-state.ps1` und `scripts/remediate-cover-image.ps1` gelöscht — beide griffen per rohem `psql`/SQL direkt auf `anime.cover_image` zu und nutzten einen hartcodierten Standard-DB-Namen (`team4s`, nicht `team4s_v2`); beide wären nach der Spalten-Entfernung in Plan 182-03 ohnehin funktionslos gewesen.
- `scripts/smoke-admin-content.ps1` bewusst **nicht** angefasst — Byte-Identität per MD5-Vergleich vor und nach dem Task bestätigt (`f0b977afe1a5179083e135d14b5c5fd0`), da das Skript die `cover_image`-PATCH-API prüft, nicht die Spalte direkt.
- `backend/cmd/migrate-preview-backfill/main.go`'s Kopfkommentar (Zeilen 8-12) auf Vergangenheitsform umgestellt, damit er nicht mehr auf ein nicht mehr existierendes Verzeichnis verweist.
- `grep -rn "migrate-covers" backend/ scripts/ Makefile docker-compose*.yml` zeigt nach der Änderung ausschließlich noch die bewusst aktualisierte historische Kommentarstelle in `migrate-preview-backfill/main.go` — keine toten Referenzen anderswo.
- `docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."` läuft grün — zweimal bestätigt: direkt nach Task 1 und erneut nach der Checkpoint-Freigabe (reiner Re-Check, keine Code-Änderung dazwischen), im Backend-Container ausgeführt, da auf dem Host kein `go`-Binary vorhanden ist.
- **Task 2 (D-04 Live-Checkpoint) ist vom Nutzer freigegeben worden — alle 5 Punkte bestanden.** Geprüft wurden `/anime` (10/10 Cover laden), `/anime/1` (Jellyfin Cover/Logo/Banner), `/anime/3` (lokales Cover aus dem V2-Speicher), `/fansubs/new-subs` (Buddy-Complex-Projektkarte zeigt jetzt das Jellyfin-Cover — beabsichtigter D-01-Effekt), `/watchlist` (Jellyfin-Anime zeigt jetzt ein Cover — ebenfalls beabsichtigter D-01-Effekt), keine aktuellen Netzwerk-/Konsolenfehler (vollständiges Zitat und Einzelbewertung in `182-04-HUMAN-UAT.md`).
- **Korrekturverlauf bei Punkt 5:** Eine erste Nutzerrückmeldung besagte, die Merkliste habe kein Jellyfin-Anime enthalten — Punkt 5 wurde zunächst als offene Lücke dokumentiert. Eine zweite, widersprechende Rückmeldung korrigierte dies zu "bestanden". Statt die zweite Aussage unkritisch zu übernehmen, wurde sie unabhängig verifiziert: eine Live-Abfrage gegen `team4s_v2` zeigt genau einen Merklisteneintrag (`user_id=3`, `anime_id=2` "11eyes", `source='jellyfin:...'`) mit einer `ready`-Poster-Zeile in `anime_media`/`media_assets`; `backend/internal/repository/watchlist.go` nutzt bereits `animeCoverImageSelectSQL` (migriert in 182-02/182-03); die Ausführung derselben COALESCE-Logik gegen diese Zeile liefert eine gültige, nicht-leere Cover-URL. Die Korrektur ist damit technisch bestätigt, nicht nur behauptet (Details in `182-04-HUMAN-UAT.md`, Abschnitt "Unabhängige Verifikation von Punkt 5").
- Eine nachgelagerte Code-Review der Task-1-Löschungen (siehe "Code-Review" unten) fand keine Befunde mit Entscheidungsbedarf.

## Task Commits

1. **Task 1: Remove the historical cover-migration tooling (D-03)** - `bd49ec483` (chore)

**Task 2 (D-04, Live-Checkpoint):** Kein eigener Code-Commit — rein operativer Live-Browser-Check durch den Nutzer, Ergebnis dokumentiert in `182-04-HUMAN-UAT.md` (dieser Plan-Metadaten-Commit).

## Code-Review (Task 1)

Umfang: die 7 in Task 1 geänderten Dateien (6 Löschungen + 1 Kommentar-Fix in
`backend/cmd/migrate-preview-backfill/main.go`).

- Keine verbliebenen Code-Referenzen auf `migrate-covers` außerhalb der bewusst aktualisierten
  historischen Kommentarstelle (`grep -rln "migrate-covers"` gegen den gesamten Baum zeigt nur
  noch Planungs-Markdown-Dateien aus früheren Phasen/Historie sowie `docs/architecture/*` —
  keine ausführbaren Artefakte).
- `backend/go.mod`/`go.sum` unverändert (keine Abhängigkeits-Drift durch die Löschung).
- `Dockerfile`/`Makefile`/`docker-compose*.yml` enthalten keine Referenz auf `migrate-covers`
  (vor und nach der Änderung geprüft).
- `gofmt -l` auf der geänderten Datei liefert keine Ausgabe (bereits korrekt formatiert).
- `go build ./... && go vet ./...` erneut grün nach der Löschung (siehe oben).
- **Keine Befunde mit Entscheidungsbedarf.** Dies war eine reine, risikoarme Löschung
  historischer Werkzeuge ohne Laufzeitpfad — kein BLOCKER, keine WARNING, keine INFO-Funde.

_Hinweis: Diese SUMMARY.md und `182-04-HUMAN-UAT.md` werden gemeinsam mit `STATE.md`/`ROADMAP.md` separat committet._

## Files Created/Modified
- `backend/cmd/migrate-covers/main.go` (gelöscht) - Einmal-Tool für `frontend/public/covers/` → V2-Medienmigration
- `backend/cmd/migrate-covers/README.md` (gelöscht)
- `backend/cmd/migrate-covers/INVENTORY.md` (gelöscht)
- `backend/cmd/migrate-covers/test-migration.sh` (gelöscht)
- `scripts/report-cover-image-state.ps1` (gelöscht) - Reporting direkt gegen `anime.cover_image`, falscher Standard-DB-Name
- `scripts/remediate-cover-image.ps1` (gelöscht) - Ad-hoc-`UPDATE`-Skript direkt gegen `anime.cover_image`, falscher Standard-DB-Name
- `backend/cmd/migrate-preview-backfill/main.go` - Kopfkommentar auf Vergangenheitsform aktualisiert (kein Verweis mehr auf ein existierendes `cmd/migrate-covers`-Verzeichnis)

## Decisions Made
- Task 2 (D-04) wurde als blockierender Checkpoint behandelt; der Ausführungsagent hat ihn an
  keiner Stelle selbst genehmigt oder simuliert. Die Freigabe stammt vom Nutzer (wörtliches
  Zitat in `182-04-HUMAN-UAT.md`).
- Die im ursprünglichen Plantext (182-04-PLAN.md, Task 2, Schritt 5) genannte Watchlist-URL `http://127.0.0.1:3300/me/watchlist` ist **falsch** (liefert 404). Die korrekte URL ist `http://127.0.0.1:3300/watchlist` (ohne `/me`-Präfix).
- **Punkt 5 (`/watchlist`) — Korrekturverlauf:** Eine erste Rückmeldung besagte, die Merkliste
  habe kein Jellyfin-Anime enthalten (als offene Lücke dokumentiert). Eine zweite,
  widersprechende Rückmeldung korrigierte dies zu "bestanden, Cover vorhanden". Da sich beide
  Aussagen widersprachen, wurde die zweite nicht unkritisch übernommen, sondern unabhängig
  gegen die Live-Datenbank (`team4s_v2`) und den tatsächlichen Backend-Code verifiziert:
  genau ein Merklisteneintrag (`user_id=3`, `anime_id=2` "11eyes", Jellyfin-Quelle) mit einer
  `ready`-V2-Poster-Zeile existiert; `watchlist.go` nutzt bereits den V2-bewussten
  `animeCoverImageSelectSQL`-Helfer; die COALESCE-Logik liefert für diese Zeile eine gültige
  Cover-URL. Die Korrektur ist damit technisch bestätigt. Punkt 5 gilt als bestanden.

## Deviations from Plan

None - Task 1 wurde exakt wie im Plan beschrieben ausgeführt. Keine Rule-1/2/3-Abweichungen nötig.

## Issues Encountered
- Auf dem Host (`/home/d1sk/team4s`) ist kein `go`-Binary installiert; die geforderte Verifikation (`cd backend && go build ./... && go vet ./...`) wurde stattdessen äquivalent im laufenden Backend-Container ausgeführt (`docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."`), was laut `CLAUDE.md` ("Run all edits, Git commands, tests, builds ... on Linux" / Docker-Compose-Container als Laufzeitumgebung) der korrekte Ausführungsort ist.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich. Die manuelle Live-Prüfung durch den Nutzer ist erfolgt (siehe `182-04-HUMAN-UAT.md`).

## Next Phase Readiness

**Dieser Plan und Phase 182 sind abgeschlossen.** Task 1 (D-03, Code-Entfernung) ist vollständig und committet; Task 2 (D-04, Live-Checkpoint) ist vom Nutzer freigegeben worden — alle 5 Vergleichspunkte bestanden, einschließlich Punkt 5 (`/watchlist`), dessen zunächst gemeldete Datenlücke per unabhängiger Live-DB-/Code-Prüfung korrigiert und bestätigt wurde (siehe `182-04-HUMAN-UAT.md`, Abschnitt "Unabhängige Verifikation von Punkt 5" — keine offenen Gaps mehr).

Phase 182 (Alten Bildspeicher entfernen, F-01) ist damit vollständig: alle 4 Pläne (182-01 bis 182-04) sind code-vollständig, committet und abgenommen. `anime.cover_image` existiert nicht mehr in `team4s_v2`, alle Leser nutzen den gemeinsamen V2-COALESCE-Helfer, die historische Migrationstooling ist entfernt, und der Live-Checkpoint ist vollständig bestätigt — kein Restrisiko offen.

---
*Phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov*
*Completed: 2026-10-15*

## Self-Check: PASSED

- CONFIRMED: `test ! -d backend/cmd/migrate-covers` → true (Verzeichnis existiert nicht mehr)
- CONFIRMED: `test ! -f scripts/report-cover-image-state.ps1` → true
- CONFIRMED: `test ! -f scripts/remediate-cover-image.ps1` → true
- FOUND: `backend/cmd/migrate-preview-backfill/main.go` (geändert, Kopfkommentar aktualisiert)
- FOUND: commit `bd49ec483` (git log --oneline -1)
- CONFIRMED: `docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."` → grün (zweimal bestätigt)
- CONFIRMED: `scripts/smoke-admin-content.ps1` MD5 unverändert (`f0b977afe1a5179083e135d14b5c5fd0`)
- FOUND: `.planning/phases/182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov/182-04-HUMAN-UAT.md` (status: approved)
- CONFIRMED: Live-DB-Abfrage gegen `team4s_v2` zeigt `watchlist_entries` mit `user_id=3, anime_id=2 (11eyes), source='jellyfin:68546f5d1871ad1c42d8d674376e83e6'` und eine zugehörige `ready`-Poster-Zeile in `anime_media`/`media_assets`
- CONFIRMED: `backend/internal/repository/watchlist.go:41,157` nutzt `animeCoverImageSelectSQL("a")`; direkte Ausführung derselben COALESCE-Logik gegen diese Zeile liefert eine gültige, nicht-leere Cover-URL
