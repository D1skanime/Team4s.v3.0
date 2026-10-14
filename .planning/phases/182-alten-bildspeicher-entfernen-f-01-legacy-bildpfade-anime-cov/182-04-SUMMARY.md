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
  - "Task 2 (D-04, blockierender Live-Checkpoint) wurde NICHT ausgefuehrt oder vorab genehmigt -- dieser Plan ist nach Task 1 bewusst angehalten. Ein Mensch muss die 5 Vergleichs-URLs live pruefen und explizit 'approved' tippen, bevor Plan 182-04 und damit Phase 182 als abgeschlossen gelten."
  - "Die im Originaltext des Plans genannte Watchlist-URL (/me/watchlist) ist falsch (404) -- die korrekte URL ist /watchlist (ohne /me-Praefix). Diese Korrektur wird dem Nutzer beim Checkpoint explizit mitgeteilt und in der Skeleton-182-04-HUMAN-UAT.md verwendet."

requirements-completed: [D-03]

# Metrics
duration: ~10min (nur Task 1 -- Task 2 ist ein offener Live-Checkpoint, keine Ausfuehrungszeit)
completed: 2026-10-14
---

# Phase 182 Plan 4: Historische Cover-Migrationswerkzeuge entfernt (D-03) — Task 2 (D-04 Live-Checkpoint) steht noch aus Summary

**`backend/cmd/migrate-covers/` und zwei veraltete PowerShell-Skripte (`report-cover-image-state.ps1`, `remediate-cover-image.ps1`) sind entfernt; der volle Backend-Build bleibt grün. Der blockierende Live-UAT-Checkpoint (D-04, 5 Vergleichs-URLs) ist noch NICHT durchgeführt — dieser Plan und Phase 182 sind damit noch nicht abgeschlossen.**

## Performance

- **Duration:** ~10 min (Task 1 only)
- **Started:** 2026-10-14T23:50:00Z
- **Completed (Task 1):** 2026-10-14T23:59:00Z
- **Tasks:** 1 von 2 (Task 2 ist ein offener blockierender Human-Checkpoint)
- **Files modified:** 7 (6 gelöscht, 1 geändert)

## Accomplishments
- `backend/cmd/migrate-covers/` (vier Dateien: `main.go`, `README.md`, `INVENTORY.md`, `test-migration.sh`) vollständig gelöscht — bestätigt per Vorab-Prüfung: kein Verweis in `Dockerfile`, `Makefile`, `docker-compose*.yml`; das Paket war `package main` und damit von keinem anderen Go-Paket importierbar.
- `scripts/report-cover-image-state.ps1` und `scripts/remediate-cover-image.ps1` gelöscht — beide griffen per rohem `psql`/SQL direkt auf `anime.cover_image` zu und nutzten einen hartcodierten Standard-DB-Namen (`team4s`, nicht `team4s_v2`); beide wären nach der Spalten-Entfernung in Plan 182-03 ohnehin funktionslos gewesen.
- `scripts/smoke-admin-content.ps1` bewusst **nicht** angefasst — Byte-Identität per MD5-Vergleich vor und nach dem Task bestätigt (`f0b977afe1a5179083e135d14b5c5fd0`), da das Skript die `cover_image`-PATCH-API prüft, nicht die Spalte direkt.
- `backend/cmd/migrate-preview-backfill/main.go`'s Kopfkommentar (Zeilen 8-12) auf Vergangenheitsform umgestellt, damit er nicht mehr auf ein nicht mehr existierendes Verzeichnis verweist.
- `grep -rn "migrate-covers" backend/ scripts/ Makefile docker-compose*.yml` zeigt nach der Änderung ausschließlich noch die bewusst aktualisierte historische Kommentarstelle in `migrate-preview-backfill/main.go` — keine toten Referenzen anderswo.
- `docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."` läuft grün (im Backend-Container ausgeführt, da auf dem Host kein `go`-Binary vorhanden ist).

## Task Commits

1. **Task 1: Remove the historical cover-migration tooling (D-03)** - `bd49ec483` (chore)

**Task 2 (D-04, Live-Checkpoint):** NICHT ausgeführt — blockierender Human-Checkpoint, siehe unten.

_Hinweis: Diese SUMMARY.md und die begleitenden Skeleton-Dateien werden separat committet._

## Files Created/Modified
- `backend/cmd/migrate-covers/main.go` (gelöscht) - Einmal-Tool für `frontend/public/covers/` → V2-Medienmigration
- `backend/cmd/migrate-covers/README.md` (gelöscht)
- `backend/cmd/migrate-covers/INVENTORY.md` (gelöscht)
- `backend/cmd/migrate-covers/test-migration.sh` (gelöscht)
- `scripts/report-cover-image-state.ps1` (gelöscht) - Reporting direkt gegen `anime.cover_image`, falscher Standard-DB-Name
- `scripts/remediate-cover-image.ps1` (gelöscht) - Ad-hoc-`UPDATE`-Skript direkt gegen `anime.cover_image`, falscher Standard-DB-Name
- `backend/cmd/migrate-preview-backfill/main.go` - Kopfkommentar auf Vergangenheitsform aktualisiert (kein Verweis mehr auf ein existierendes `cmd/migrate-covers`-Verzeichnis)

## Decisions Made
- Task 2 (D-04) wurde als blockierender Checkpoint behandelt und NICHT automatisch genehmigt oder simuliert. Ein Mensch muss die 5 Vergleichs-URLs live über `http://127.0.0.1:3300` prüfen.
- Die im ursprünglichen Plantext (182-04-PLAN.md, Task 2, Schritt 5) genannte Watchlist-URL `http://127.0.0.1:3300/me/watchlist` ist **falsch** (liefert 404). Die korrekte URL ist `http://127.0.0.1:3300/watchlist` (ohne `/me`-Präfix). Diese Korrektur ist in `182-04-HUMAN-UAT.md` (Skeleton) bereits berücksichtigt und wird dem Nutzer beim Checkpoint explizit mitgeteilt.
- Zusätzlicher Hinweis an den Nutzer: Die Merkliste muss vor dem Vergleich bereits mindestens ein Jellyfin-stämmiges Anime enthalten, sonst ist der Vorher/Nachher-Vergleich für Punkt 5 leer bzw. aussagelos — der Nutzer wird gebeten, das vor der Prüfung zu bestätigen (oder eines hinzuzufügen).

## Deviations from Plan

None - Task 1 wurde exakt wie im Plan beschrieben ausgeführt. Keine Rule-1/2/3-Abweichungen nötig.

## Issues Encountered
- Auf dem Host (`/home/d1sk/team4s`) ist kein `go`-Binary installiert; die geforderte Verifikation (`cd backend && go build ./... && go vet ./...`) wurde stattdessen äquivalent im laufenden Backend-Container ausgeführt (`docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."`), was laut `CLAUDE.md` ("Run all edits, Git commands, tests, builds ... on Linux" / Docker-Compose-Container als Laufzeitumgebung) der korrekte Ausführungsort ist.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich. Es ist jedoch eine **manuelle Live-Prüfung** durch den Nutzer erforderlich (siehe unten).

## Next Phase Readiness

**Dieser Plan ist NICHT abgeschlossen.** Task 1 (D-03, Code-Entfernung) ist vollständig und committet. Task 2 ist ein blockierender Live-Checkpoint (D-04) und wartet auf explizite Nutzerfreigabe:

Die 5 Vergleichs-URLs über `http://127.0.0.1:3300` (SSH-Tunnel):
1. `/anime` — öffentliche Anime-Liste, kein Letter-Filter. Erwartung: identisch zu vorher.
2. `/anime/3` — Detailseite „11eyes: Pink Phantasmagoria" (einer der 3 Anime mit vorbestehendem lokalem Cover). Erwartung: Cover pixel-identisch zu vorher.
3. `/anime/1` — Detailseite „Buddy Complex" (Jellyfin-Anime). Erwartung: identisch zu vorher, keine Änderung.
4. `/fansubs` → Projekt-Übersicht einer Fansub-Gruppe mit einem Jellyfin-stämmigen Anime ohne vorheriges lokales Cover. Erwartung (beabsichtigter D-01-Effekt, KEINE Regression): dieses Projekt zeigt jetzt erstmals ein Cover.
5. **`/watchlist`** (eingeloggt, mit mindestens einem Jellyfin-stämmigen Anime auf der Merkliste — **vor der Prüfung bitte bestätigen, dass das der Fall ist, sonst ist der Vergleich leer/aussagelos**). Erwartung (beabsichtigter D-01-Effekt, am deutlichsten sichtbare Änderung): dieser Merklisten-Eintrag zeigt jetzt erstmals ein Cover.

**Korrektur gegenüber dem ursprünglichen Plantext:** Punkt 5 lautete im Plan fälschlich `/me/watchlist` (404) — korrekt ist `/watchlist`.

Zusätzlich: Auf allen 5 Seiten sollen keine Browser-Konsolenfehler auftreten (insbesondere keine `next/image`-Remote-Pattern/E426-Fehler).

**Freigabe-Signal:** Der Nutzer tippt "approved", wenn alle 5 URLs den Erwartungen entsprechen (Punkte 1-3 unverändert, Punkte 4-5 zeigen die beabsichtigte neue Cover-Anzeige), oder beschreibt genau, welche URL/welches Verhalten falsch aussieht.

**Bis zu dieser Freigabe gilt Plan 182-04 und damit Phase 182 als NICHT abgeschlossen.** `STATE.md`/`ROADMAP.md` wurden entsprechend nur mit dem Task-1-Fortschritt aktualisiert, nicht mit einem Phasen- oder Plan-Abschluss.

---
*Phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov*
*Task 1 completed: 2026-10-14 — Task 2 (D-04 Live-Checkpoint) pending*

## Self-Check: PASSED

- CONFIRMED: `test ! -d backend/cmd/migrate-covers` → true (Verzeichnis existiert nicht mehr)
- CONFIRMED: `test ! -f scripts/report-cover-image-state.ps1` → true
- CONFIRMED: `test ! -f scripts/remediate-cover-image.ps1` → true
- FOUND: `backend/cmd/migrate-preview-backfill/main.go` (geändert, Kopfkommentar aktualisiert)
- FOUND: commit `bd49ec483` (git log --oneline -1)
- CONFIRMED: `docker compose exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..."` → grün
- CONFIRMED: `scripts/smoke-admin-content.ps1` MD5 unverändert (`f0b977afe1a5179083e135d14b5c5fd0`)
