# Reproduktion und Artefakte

Auf team4s-linux in `/home/d1sk/team4s` ausführen. Endstand-Commit `6af965a2` (nach 156-10 Task 1).
Zuerst `git status --short` und `docker compose ps` prüfen — alle Befehle unten laufen gegen die
laufenden Compose-Container, kein Rebuild-from-scratch nötig außer explizit genannt.

## DSN-Herleitung (aus dem laufenden Backend-Container, NICHT aus `.env`)

Das Projekt-`.env`-`POSTGRES_PASSWORD` entspricht nicht den Live-Zugangsdaten. Die tatsächlichen
Zugangsdaten wurden aus dem laufenden `team4sv30-backend`-Container gelesen:

```
docker compose exec -T team4sv30-backend printenv DATABASE_URL
# postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable
```

Für die Phase-117-Test-Fixture (Table-Family seit 156-02) wird dieselbe Nutzer-/Passwort-Kombination
verwendet, nur mit anderem Datenbanknamen: `team4s_phase117_test_156` (die tatsächlich seit 156-02
verwendete Fixture-Datenbank, siehe jede 156-*-SUMMARY.md).

## Backend: Build, Vet, voller Testlauf (im Container, nicht auf dem Host)

```
docker network ls | grep team4s   # bestätigt team4s_default

docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine sh -c "go build ./... && go vet ./..."

docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  -e TEAM4S_PHASE117_TEST_DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_156?sslmode=disable" \
  golang:1.25-alpine go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1
```

Ergebnis (156-10, 2026-09-11): `go build`/`go vet` exit 0. `internal/handlers` und
`internal/permissions` beide `ok`. `internal/repository` meldet `FAIL` mit genau 49
Einzeltest-Fehlschlägen, alle vorbestehend und außerhalb dieser Phase (siehe TABLES.md Tabelle 8).

## Backend: Phase-156-spezifische Tests gezielt (Beweis, dass keiner der 49 Fehlschläge Phase-156-Code betrifft)

```
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  -e TEAM4S_PHASE117_TEST_DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_156?sslmode=disable" \
  golang:1.25-alpine go test ./internal/repository/... \
  -run 'AssignThemeSegment|ThemeSegmentOrigin|AutoAssign|AttachReleaseTimelineSegments|ReleaseDetailPublicSegment|SegmentCreditRoleFilter|LoadReleaseSegmentsQueryBudget|ResolvePublicEffectiveContributors|GroupReleaseCursorSource' \
  -v -count=1

docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine go test ./internal/handlers/... -v -count=1 2>&1 | grep -E 'SetAnimeSegmentOrigin|RangeAutoAssign'
```

Ergebnis (156-10): jeder aufgeführte Testname PASS.

## Backend: Backend-Container neu bauen und Health-Check

```
docker compose up -d --build team4sv30-backend
curl -s http://192.168.235.196:18092/health
# {"status":"ok"}
```

## Migration 0161: Rundlauf-Verifikation gegen die live `team4s_v2`-Datenbank

```
DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable"

# Status vor Rundlauf
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine go run ./cmd/migrate status -dir /workspace/database/migrations -database-url "$DSN"

# Ausgangswerte notieren
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT id, origin_release_version_id FROM theme_segments ORDER BY id;"

# down (1 Schritt = Migration 161)
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine go run ./cmd/migrate down -steps 1 -dir /workspace/database/migrations -database-url "$DSN"

# Spalte ist weg, schema_migrations-Head auf 160
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "\d theme_segments" | grep -i origin
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 3;"

# up (stellt Spalte + Index + Backfill wieder her)
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine go run ./cmd/migrate up -dir /workspace/database/migrations -database-url "$DSN"

# Werte erneut lesen -- muss byte-identisch zum Ausgangswert sein
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT id, origin_release_version_id FROM theme_segments ORDER BY id;"
```

Ergebnis (156-10): vorher/nachher `id=1 -> 27`, `id=2 -> 27`, `id=3 -> 29` — byte-identisch.

## Frontend: Typecheck, gezielter Vitest-Lauf, voller Vitest-Lauf, ESLint

```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"
docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test -- ThemeTimeline"
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint ."
```

Ergebnis (156-10): `tsc` exit 0. `ThemeTimeline`: 23/23. Voller Vitest-Lauf: 298 Dateien bestanden,
1 übersprungen (299 gesamt), 2.305 Tests bestanden, 3 Todo (2.308 gesamt), 0 Fehlschläge.
`eslint`: 13 Errors / 331 Warnings, alle in vorbestehenden, planfremden Dateien (siehe TABLES.md).

## Produktions-Builds (Docker Compose)

```
docker compose build team4sv30-frontend
docker compose build team4sv30-backend
```

Ergebnis (156-10): beide `Built`, keine Fehler.

## Working-Tree-Sauberkeit

```
git status --short
```

Ergebnis (156-10, vor dem `156-10`-Abschluss-Commit): leer.

## Segment-Origin-Live-Datensatz (für die noch ausstehende Admin-Live-UAT, Plan 156-11 Task 2)

```
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT theme_segment_id, COUNT(*) FROM theme_segment_assignments GROUP BY theme_segment_id ORDER BY theme_segment_id;"
```

Ergebnis: `theme_segment_id 3` hat 3 Zuweisungen — der in `deferred-items.md` benannte Testdatensatz
für die ausstehende Live-UAT.
