---
quick_task: 260718-e6z
status: complete
one_liner: Backend liefert Fansub-Story-Fakten jetzt direkt in der Summary; Frontend-Fanout (Promise.allSettled(getFansubBySlug) je Gruppe) auf /anime/[id] entfernt
---

# Quick Task 260718-e6z: Anime-Detailseite Request-Fanout reduzieren — Summary

## Ergebnis

`GET /api/v1/anime/{id}/fansubs` liefert `founded_year`, `dissolved_year`, `country` und `status` jetzt direkt im `fansub_group`-Objekt jeder Relation. `/anime/[id]/page.tsx` baut `fansubStoryGroups` ausschliesslich aus dieser einen Response — der vorherige N+1-Fanout (`Promise.allSettled(slugs.map(slug => getFansubBySlug(slug)))`) wurde vollstaendig entfernt.

## Umsetzung

### Task 1 — Backend

- `backend/internal/models/fansub.go`: `FansubGroupSummary` um `FoundedYear *int32`, `DissolvedYear *int32`, `Country *string`, `Status string` (alle `omitempty`) ergaenzt — Typen exakt passend zu `FansubGroup`.
- `backend/internal/repository/fansub_repository.go`: `ListAnimeFansubs` SELECT+Scan symmetrisch um `fg.founded_year, fg.dissolved_year, fg.country, fg.status` erweitert. `AttachAnimeFansub` bewusst unveraendert gelassen (wird von `page.tsx` nicht konsumiert).
- `shared/contracts/fansubs.yaml`: `FansubGroupSummary`-Contract-Eintrag um dieselben vier Felder gespiegelt.
- Neuer Source-Invariant-Test `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` in `fansub_repository_test.go` (Muster wie `TestFansubRepository_PublicProfileSourceInvariants`).
- Commit: `e2ec2176` — feat(quick-260718-e6z): FansubGroupSummary um Story-Fakten erweitern

### Task 2 — Frontend

- `frontend/src/types/fansub.ts`: `FansubGroupSummary` um dieselben vier optionalen Felder ergaenzt (`status?: FansubStatus`).
- `frontend/src/lib/fansub-summary.ts`: `statusLabel`/`foundedLabel`/`buildFansubFactSummary`/`buildFansubStoryPreview` von hart `FansubGroup` auf eine neue schmalere Struktur `FansubStoryFacts` umgestellt (strukturell kompatibel mit `FansubGroup` UND `FansubGroupSummary`). Bestehende Aufrufer mit vollen `FansubGroup`-Objekten (`FansubHeroSection.tsx`, `FansubProfileTabs.tsx`, `ReadinessTab.tsx`, `episode-helpers.ts`/`AnimeContextFansubs.tsx`) unangetastet gelassen — bleiben durch strukturelle Typisierung kompatibel (bestaetigt durch gruenen `npm run typecheck`). Neue Exportfunktion `buildFansubStoryGroups(relations: AnimeFansubRelation[]): FansubGroupSummary[]` dedupliziert nach `fansub_group.id` ohne Zusatz-Fetch.
- `frontend/src/components/fansubs/ActiveFansubStory.tsx`: Prop-Typ `fansubGroups` von `FansubGroup[]` auf `FansubGroupSummary[]` umgestellt.
- `frontend/src/app/anime/[id]/page.tsx`: Fanout-Block (Map-Aufbau, `Promise.allSettled(slugs.map(slug => getFansubBySlug(slug)))`, Dedupe-Schleife) vollstaendig entfernt und durch `const fansubStoryGroups = buildFansubStoryGroups(animeFansubsResponse?.data ?? [])` ersetzt. Ungenutzte Imports (`getFansubBySlug`, `type FansubGroup`) entfernt, `buildFansubStoryGroups`-Import ergaenzt. Datei ist jetzt 408 Zeilen (vorher laenger, CLAUDE.md-Limit 450 eingehalten).
- Neue Tests: `frontend/src/lib/fansub-summary.test.ts` (Dedupe, Skip bei `fansub_group: null`, Feldübernahme, `buildFansubStoryPreview` mit `FansubGroupSummary`-Minimalobjekt) und `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx` (Render-Regressionsschutz fuer den Prop-Typ-Wechsel).
- Commit: `925a446e` — feat(quick-260718-e6z): Fanout entfernen, fansubStoryGroups aus Relation bauen

### Task 3 — Live-Verifikation

1. Backend neu gebaut: `docker compose up -d --build team4sv30-backend` (Container `team4sv30-backend` neu erstellt um 10:34:02 lokal). `/health` lieferte direkt 200 (kein Exit(1)-Race aufgetreten).
2. `curl http://127.0.0.1:18092/api/v1/anime/1/fansubs` bestaetigt die vier neuen Felder live:
   ```
   "fansub_group":{"id":1,"slug":"c-subs","name":"C-Subs","logo_url":"...","founded_year":2002,"country":"Deutschland","status":"active"}
   ```
   (Gruppe 2 "Honto" hat kein `country` gesetzt — `omitempty` greift korrekt, `founded_year`/`status` sind vorhanden.)
3. Frontend neu gestartet: `docker restart team4sv30-frontend`. Turbopack-Kaltstart-Compile fuer `/anime/1` dauerte ~55s (Dev-Modus, erwartetes Verhalten laut Projekt-Erfahrung).
4. **Live-Beweis fuer eliminierten Fanout (Backend-Zugriffslog, nicht nur Code-Review):** Nach zwei `curl`-Aufrufen von `http://127.0.0.1:3000/anime/1` zeigt `docker logs team4sv30-backend`:
   ```
   GET "/api/v1/anime/1/fansubs"   200  205.395758ms
   GET "/api/v1/anime/1/fansubs"   200   45.930488ms
   ```
   und **kein einziger** `GET /api/v1/fansub-slugs/c-subs` (die exakte `getFansubBySlug`-Route). Der einzige `/api/v1/fansub-slugs/c-subs/public-profile`-Log-Eintrag stammt nachweislich von einer fruehreren, unabhaengigen Anfrage an die Fansub-Profilseite `/fansubs/[slug]` (nutzt `getPublicFansubProfileBySlug`, andere Route/Funktion) — nicht von der Anime-Detailseite.
   Zusaetzlich zeigt der im SSR-HTML eingebettete React-Server-Component-Payload fuer `/anime/1`, dass `fansubGroups` exakt die schmale Summary-Form mit den vier neuen Feldern traegt (`founded_year:2002,"country":"Deutschland","status":"active"` fuer C-Subs; `founded_year:2002,"status":"active"` fuer Honto, ohne `country`), nicht die volle `FansubGroup`-Detailform (kein `anime_relations_count` o.ae. im Payload).
5. **Ehrliche Einschraenkung:** In diesem Executor-Kontext war kein Browser-/Computer-Use-Werkzeug gebunden. Die finale visuelle Pruefung (Fansub-Story-Karte sichtbar, Text "gegründet 2002 • Deutschland • aktiv" korrekt gerendert, DevTools-Netzwerk-Tab manuell bestaetigt) wurde **nicht** im echten Browser durchgefuehrt. Die obige Log-/Payload-Analyse ist eine starke strukturelle+Server-seitige Live-Bestaetigung, ersetzt aber keine echte Browser-Sichtpruefung. Diese bleibt beim Nutzer/Orchestrator offen.

## Verifikation

- `cd backend && go build ./...` — gruen.
- `cd backend && go test ./internal/repository/... -run TestListAnimeFansubs_SummaryIncludesFansubStoryFacts -v` — PASS.
- `cd backend && go test ./...` — alle Pakete PASS (kein Regressions-Bruch).
- `cd frontend && npx vitest run src/lib/fansub-summary.test.ts src/components/fansubs/__tests__/ActiveFansubStory.test.tsx` — 5/5 Tests gruen.
- `cd frontend && npx vitest run` (erweiterter Lauf ueber alle Fansub-/episode-helpers-Tests) — 76/76 Tests gruen, keine Regression.
- `cd frontend && npm run typecheck` — gruen.
- `cd frontend && npm run lint` — 1 bereits vorbestehender Fehler in `FansubStorySection.tsx` (nicht Teil dieses Tasks, Datei unangetastet, `git log` bestaetigt letzten Commit `1e26cc64` vor diesem Task) + branchenuebliche Alt-Warnungen (native `<input>`/`<select>` in nicht beruehrten Dateien). Keine neuen Lint-Fehler/Warnungen in den geaenderten Dateien.
- `git diff --check` — keine Whitespace-/Konflikt-Marker in meinen Dateien.
- Live: `/health` 200, `curl /api/v1/anime/1/fansubs` mit neuen Feldern, Backend-Zugriffslog + SSR-Payload bestaetigen eliminierten Fanout (siehe Task 3 oben).

## Deviations from Plan

Keine — Plan exakt wie geschrieben umgesetzt. Einzige Ergaenzung: In `fansub-summary.ts` wurde die neue schmalere Struktur explizit als benannter, exportierter Typ `FansubStoryFacts` eingefuehrt (der Plan liess die genaue Benennung offen — "z. B. ein lokal definierter Typ") statt eines anonymen Inline-Typs, um Lesbarkeit an den vier Funktionssignaturen zu verbessern. Kein Verhaltensunterschied.

## Known Stubs

Keine.

## Threat Flags

Keine neue Angriffsflaeche — `ListAnimeFansubs` ist bereits unauthenticated/oeffentlich (unveraendert), es werden lediglich vier zusaetzliche, bereits oeffentlich sichtbare Felder (auch auf der Fansub-Profilseite sichtbar) additiv mitgeliefert.

## Self-Check: PASSED

Alle 10 gelisteten Dateien gefunden, beide Commit-Hashes (`e2ec2176`, `925a446e`) in `git log` bestaetigt.
