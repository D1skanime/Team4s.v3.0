# Reproduktion und Artefakte

Auf team4s-linux in `/home/d1sk/team4s` ausführen. Endstand-Commit `f3faa618` (nach 155-06) plus
diesem Plans Task-1-Commit. Route `/fansubs/new-subs/fansubprojekt/buddy-complex` — die einzige real
vorhandene Gruppe/Projekt-Kombination im Dev-Datenbestand (bestätigt per Live-SQL, siehe unten).
Keine Seeds, Resets oder Migrationen für dieses Messdokument. Zuerst `git status --short` und
`docker compose ps` prüfen.

## Route bestimmen

```
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT fg.slug AS group_slug, a.slug AS anime_slug, a.title \
   FROM anime_fansub_groups afg \
   JOIN fansub_groups fg ON fg.id = afg.fansub_group_id \
   JOIN anime a ON a.id = afg.anime_id LIMIT 5;"
```

Ergebnis in dieser Umgebung: `group_slug=new-subs`, `anime_slug=buddy-complex`.

## Browserseitige Messung (wiederverwendetes Skript)

Dieses Dokument wiederverwendet das bereits bestehende, vollständig routenparametrisierte
`frontend/scripts/audit-public-member-performance.mjs` (per `155-CONTEXT.md`s ausdrücklicher
„prüfen und wiederzuverwenden"-Vorgabe) — kein neues Skript wurde geschrieben. Exakt derselbe
Aufruf wie im Sibling-Audit (`docs/audits/2026-09-09-public-member-performance/REPRODUCE.md`),
nur mit `AUDIT_ROUTES` auf die Projektseite gerichtet:

```
docker compose exec -T \
  -e AUDIT_OUT=/tmp/phase155-project-audit \
  -e AUDIT_LABEL=phase155-after \
  -e AUDIT_ROUTES=fansubs/new-subs/fansubprojekt/buddy-complex \
  -e AUDIT_REPEATS=1 \
  team4sv30-frontend node scripts/audit-public-member-performance.mjs
```

Standardausgabe pro Lauf (stdout, eine JSON-Zeile je Cache-Zustand):

```
{"id":"phase155-after-fansubs-new-subs-fansubprojekt-buddy-complex-0-cold","ttfb":248.5,"dcl":412.7,"load":1315.6,"requests":11,"bytes":4393417,"longest":195,"commits":14,"heap":19112644,"errors":2}
{"id":"phase155-after-fansubs-new-subs-fansubprojekt-buddy-complex-0-warm","ttfb":237.3,"dcl":457.7,"load":746.9,"requests":11,"bytes":3849942,"longest":170,"commits":12,"heap":19114580,"errors":2}
```

Vollständige Rohdaten (Network-JSON, Screenshot, CPU-Trace, DOM-Trace) liegen unter
`/tmp/phase155-project-audit/` im Frontend-Container:

```
docker compose exec -T team4sv30-frontend sh -c "ls -la /tmp/phase155-project-audit"
```

Zum Auslesen einer Requestliste aus der JSON-Datei (Beispiel Cold-Lauf):

```
docker cp team4sv30-frontend:/tmp/phase155-project-audit/phase155-after-fansubs-new-subs-fansubprojekt-buddy-complex-0-cold.json /tmp/cold.json
node -e "const d=require('/tmp/cold.json'); for (const r of d.requests) console.log(r.method, r.status, r.url, r.transferred)"
```

Für neue Serien `AUDIT_LABEL` ändern, damit alte Rohwerte erhalten bleiben (gleiche Konvention wie
im Sibling-Audit).

## Serverseitige Backend-Aufrufzählung (Quelltextvergleich, keine Live-Instrumentierung nötig)

Die serverseitigen SSR-Backend-Aufrufe sind für CDP unsichtbar (siehe REPORT.md „Methodik"). Statt
eine neue Instrumentierung zu bauen, wurden Vorher/Nachher direkt am Quelltext abgezählt:

```
# Vorher (letzter Commit vor 155-01):
git show b68d4c61:frontend/src/app/fansubs/\[slug\]/fansubprojekt/\[animeSlug\]/page.tsx
git show b68d4c61:frontend/src/app/anime/\[id\]/group/\[groupId\]/projectPageData.ts

# Nachher (aktueller Stand):
cat frontend/src/app/fansubs/\[slug\]/fansubprojekt/\[animeSlug\]/page.tsx
cat frontend/src/app/anime/\[id\]/group/\[groupId\]/projectPageData.ts
```

## SQL-Query-Budget-Konstanten (bereits vorhandene, real gegen Postgres gemessene Tests — hier nur zitiert, nicht neu ausgeführt)

```
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine go test ./internal/repository/... \
  -run 'FansubProjectResolverQueryBudget|GetProjectContributorsQueryBudget|GroupReleaseVersionCount' \
  -count=1 -v
```

Diese Tests sind DSN-gated (`TEAM4S_PHASE155_TEST_DSN`) gegen die bereits in 155-01 provisionierte,
disposable `team4s_phase155_test`-Datenbank und wurden bereits in 155-01/155-02/155-03 real
ausgeführt und in den jeweiligen SUMMARY.md-Dateien mit ihren gemessenen Zahlen dokumentiert; dieses
Audit zitiert die dort gepinnten Konstanten, statt sie erneut auszuführen (155-01/02/03 sind
Single-Run-Fixtures mit fest kodierten IDs — ein Rerun ohne DB-Reset schlägt mit
Duplicate-Key-Fehlern fehl, siehe 155-03-SUMMARY.md „Issues Encountered").

## Frontend-Testnachweis (Task 1 dieses Plans, live ausgeführt)

```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/lib/fansubProjectNavigation.test.ts'"
```

## Vollregression (Task 2 dieses Plans, live ausgeführt)

```
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine sh -c "go build ./... && go vet ./... && go test ./..."

docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run && npx eslint ."
```

## Rohartefakte

Alle Rohdaten dieses Laufs liegen im Frontend-Container unter `/tmp/phase155-project-audit/`
(nicht in einem dauerhaften Docker-Volume, im Gegensatz zum größeren 2026-09-09-Audit — dieses
Dokument ist ein einzelner, fokussierter Vorher/Nachher-Lauf, keine mehrtägige Ursachenanalyse).
Eine lokale Kopie der beiden JSON-Ergebnisdateien liegt unter `/tmp/phase155-project-audit/` auf
dem Host (siehe `docker cp`-Befehl oben zur Wiederherstellung, falls der Container neu gestartet
wird).

Live-Route zur manuellen Nachprüfung: `http://192.168.235.196:3000/fansubs/new-subs/fansubprojekt/buddy-complex`.
