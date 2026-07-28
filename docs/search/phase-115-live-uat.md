# Phase 115 — Konsolidierte Live-UAT-Checkliste (globale Suche)

**Status:** AUSSTEHEND — auszuführen, sobald Docker wieder läuft.
**Zweck:** Ein einziger, selbst-enthaltener Live-UAT-Durchlauf, der **alle**
Live-DB-Verifikationen der Phase 115 bündelt. Solange dieser Durchlauf nicht mit
allen PASS-Assertions bestanden ist, gilt Phase 115 **nicht** als verifiziert/abgeschlossen.

**Warum gebündelt:** Zum Code-Fertigstellungszeitpunkt (2026-07-28/29) war die
Docker-Desktop-WSL2-Engine down (`500 Internal Server Error` auf
`dockerDesktopLinuxEngine`), und die Ausführungs-Sandbox erreicht Host-Ports ohnehin
nicht. Es wurde bewusst **kein** EXPLAIN-Plan, kein Migrations-Apply-Ergebnis und kein
Smoke-Output fabriziert. Diese Checkliste ist der exakte manuelle Ablauf für ein echtes
Terminal (PowerShell auf dem Windows-Host).

Diese Checkliste konsolidiert:
- **Block A (aus Plan 115-02, Task 2):** Migration 0140 anwenden + EXPLAIN-ANALYZE-Nachweis
  der Index-Nutzung (Bitmap Index Scan auf den 0140-Trigram-/Normalisierungs-Indizes,
  kein Seq Scan auf den Suchspalten). Detail-Referenz:
  `docs/performance/anime-search-query-plan-tracking.md` (Abschnitt „Phase 115 —
  search_foundation Baseline").
- **Block B (aus Plan 115-08, Task 2):** Backend-Rebuild (damit `/api/v1/search`
  erscheint), D-12-Re-Import, vollständiger `scripts/smoke-search.ps1`-Lauf
  (D-04/D-05/D-07/D-11/D-12), und die visuelle/mobile UI-Abnahme.

---

## Vorbereitung — reale Container/Ports ermitteln (NICHT aus .env raten)

Die tatsächlich veröffentlichten Host-Ports weichen von den `.env`-Werten ab
(Betriebsnotiz / Memory). **Immer** aus `docker ps` ableiten:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Erwartete Container (Namen ggf. abweichend — die aus `docker ps` gelten):
- Backend: `team4sv30-backend` (Container-Port 8092 → Host-Port, z. B. 18092)
- Frontend: `team4sv30-frontend` (Container-Port 3000 → Host-Port, z. B. 3000)
- Keycloak: `team4sv30-keycloak` (Container-Port 8080 → Host-Port, z. B. 18081)
- Postgres: `team4sv30-db` (DB `team4s_v2dump`, User `team4s`)

Merke dir den realen Backend-Host-Port als `<BACKEND_PORT>` und den Keycloak-Host-Port
als `<KC_PORT>` für die Schritte unten.

**PASS-Vorbedingung:** `docker ps` listet Backend, Frontend, Keycloak und DB als `Up`.

---

## Block A — Migration 0140 anwenden + EXPLAIN-Nachweis (D-09, aus Plan 115-02)

### A1 — Backend-Container mit den Phase-115-Änderungen bauen

Der Rebuild ist Voraussetzung für **beide** Blöcke: er bringt sowohl den Migrate-Runner
mit 0140 als auch die neue `/api/v1/search`-Route ins laufende Backend.

```powershell
docker compose up -d --build team4sv30-backend
```

**PASS:** Build ohne Fehler; `docker ps` zeigt `team4sv30-backend` als `Up`.

### A2 — Migration 0140 anwenden

```powershell
docker compose exec -T team4sv30-backend /app/migrate up
# ODER Status prüfen:
docker compose exec -T team4sv30-backend /app/migrate status
```

**PASS:** `migrate status` listet `140  applied  search_foundation`
(bzw. `migrations applied: >=1` beim `up`).

### A3 — EXPLAIN ANALYZE: Anime-Titel-Trigram-Index (kein Seq Scan)

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, title FROM anime WHERE f_unaccent(title) % f_unaccent('narotu') ORDER BY similarity(f_unaccent(title), f_unaccent('narotu')) DESC LIMIT 20;"
```

**PASS:** Plan enthält `Bitmap Index Scan on idx_anime_title_unaccent_trgm`
(bzw. auf `idx_anime_titles_title_unaccent_trgm` beim `anime_titles`-Zweig);
**kein** `Seq Scan` auf `anime.title`.

### A4 — EXPLAIN ANALYZE: Fansub-Alias-Trigram-Index (kein Seq Scan)

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT fga.fansub_group_id, fga.alias FROM fansub_group_aliases fga WHERE f_unaccent(fga.normalized_alias) % f_unaccent('t4s') LIMIT 20;"
```

**PASS:** Plan enthält `Bitmap Index Scan on idx_fansub_group_aliases_normalized_unaccent_trgm`;
**kein** `Seq Scan` auf `fansub_group_aliases.normalized_alias`.

> Hinweis: `%` nutzt `pg_trgm.similarity_threshold` (Default 0.3). Falls der Planner bei
> sehr kleinen Tabellen einen Seq Scan wählt, testweise `SET enable_seqscan = off;`
> voranstellen, um die Index-**Nutzbarkeit** zu belegen — für die eigentliche Baseline
> gilt der Default-Plan.

### A5 — Normalisierungs-Index (D-04-Gleichheitspfad) optional prüfen

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, name FROM fansub_groups WHERE regexp_replace(lower(f_unaccent(name)), '[^a-z0-9]+', '', 'g') = 'team4s' LIMIT 20;"
```

**PASS:** Plan nutzt `idx_fansub_groups_name_norm` (Index/Bitmap Index Scan), kein Seq Scan.

### A6 — Baseline dokumentieren

Trage die realen Plan-Auszüge (A3/A4) + Datum in
`docs/performance/anime-search-query-plan-tracking.md` unter **„Angewandter Plan"** ein
(ersetzt das aktuell leere Platzhalter-Feld). Damit ist der Abschnitt „AUSSTEHEND" erledigt.

**PASS:** Feld „Angewandter Plan" enthält datierte, echte EXPLAIN-Ausgaben.

---

## Block B — D-12-Re-Import, Live-Smoke, UI-Abnahme (aus Plan 115-08)

### B1 — Neue Route ist live

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:<BACKEND_PORT>/api/v1/search?q=naruto" | Select-Object -ExpandProperty StatusCode
```

**PASS:** `200` (die Route existiert nach dem Rebuild A1; ohne Rebuild käme 404).

### B2 — D-12-Datenkorrektur per Re-Import

Der reine Code-Fix (Plan 115-01) macht **neue** Speichervorgänge korrekt, repariert aber
**nicht** rückwirkend Anime, deren Romaji/Haupttitel nie in `anime_titles` landete.
Betroffene Test-Anime (z. B. **„A Silent Voice"**) daher über die Admin-UI/den
Enrichment-Pfad **neu importieren/anreichern** (disponible Testdaten — kein
Bestandsdaten-Backfill-Zwang). Danach:

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "SELECT at.title FROM anime_titles at JOIN title_types tt ON tt.id = at.title_type_id WHERE tt.name = 'romaji' LIMIT 20;"
```

**PASS:** Query liefert Zeilen (Romaji-Titel sind jetzt persistiert), darunter der
Romaji-Titel des re-importierten Test-Anime (z. B. „Koe no Katachi").

### B3 — Vollständige Smoke-Suite (D-04/D-05/D-07/D-11/D-12)

`scripts/smoke-search.ps1` ermittelt Ports selbst aus `docker ps`. Für die D-11-Fälle
die realen Seed-Werte als Parameter übergeben (sonst werden diese Teilfälle sauber
übersprungen):

```powershell
pwsh scripts/smoke-search.ps1 -DissolvedGroupExpect "<name-einer-dissolved-gruppe>" -DisabledAnimeQuery "<titel-eines-disabled-anime>"
```

Falls Auto-Port-Erkennung nicht greift, explizit übersteuern:

```powershell
pwsh scripts/smoke-search.ps1 -ApiBaseUrl "http://localhost:<BACKEND_PORT>" -KeycloakBaseUrl "http://localhost:<KC_PORT>" -DissolvedGroupExpect "<...>" -DisabledAnimeQuery "<...>"
```

**PASS (jede einzelne Assertion muss `[PASS]` sein):**
- **D-07:** `q=a` → 400; `q` mit 101 Zeichen → 400; `type=movies` → 400.
- **D-12:** `q=Koe no Katachi` (type=anime) → 200 **und** Treffer enthält „A Silent Voice";
  `q=Eiga Koe no Katachi` → 200.
- **D-04:** `q=Narotu` findet „Naruto" (Tippfehler); `q=T4S` **und** `q=team-4s`
  (type=fansub) finden „Team4s" über das Alias-/Kürzel-System.
- **D-05:** exakter Haupttitel `q=Naruto` steht auf **Rang 1** (nicht durch populäreren
  Teiltreffer verdrängt).
- **D-11:** dissolved-Gruppe erscheint; disabled-Anime **fehlt** ohne Admin-Token und
  **erscheint** mit Admin-Token + `include_disabled=true`.
- Abschlusszeile: `Suche-Smoke abgeschlossen: N/N bestanden.`

> Der Admin-Teilfall nutzt einen Keycloak-Direct-Grant-Token (Default `csubs-leader/123`,
> Client `team4s-frontend`). Schlägt die Token-Beschaffung fehl, wird nur der
> Admin-Teilfall übersprungen — dann diesen Teil separat mit gültigem Admin nachziehen.

### B4 — Frontend für die visuelle Abnahme neu starten

HMR greift im Team4s-Dev-Setup **nicht** zuverlässig (Memory) — nach Bedarf neu starten
und Hard-Reload:

```powershell
docker restart team4sv30-frontend
```

Dann im Browser `http://localhost:<FRONTEND_PORT>/suche` öffnen und **Strg+F5**.

### B5 — Visuelle/mobile UI-Akzeptanz (D-08)

Manuell im Browser prüfen — je Punkt PASS/FAIL notieren:

- **Nav in beiden Shells (D-11-Korrektur):** „Suche" ist erreichbar sowohl im
  **anonymen** als auch im **eingeloggten** AppShell-Drawer. **PASS:** beide zeigen den
  Eintrag und führen auf `/suche`.
- **Fokus/Tastatur:** Suchfeld ist Anker; Combobox mit Pfeiltasten navigierbar,
  Enter öffnet Treffer, Esc schließt mit Fokusrückgabe. **PASS:** vollständig
  tastaturbedienbar, kein Fokus-Verlust.
- **Akzent/Umlaut:** Suche nach akzentbehaftetem/umlautbehaftetem Begriff findet den
  normalisierten Treffer. **PASS:** Treffer erscheint.
- **Gruppierte Vorschläge + Trefferzahlen:** Vorschläge nach Anime/Fansubgruppen
  gruppiert; Tabs zeigen Trefferzahl. **PASS:** beide sichtbar.
- **Mobiler Drawer:** im schmalen Viewport öffnet der Filter als Drawer/Bottom-Sheet und
  ist bedienbar. **PASS:** Drawer öffnet/schließt, Filter wirken.
- **Lade-/Empty-/Fehlerzustände:** sichtbar bei laufender Suche, ohne Treffer und bei
  Fehler. **PASS:** alle drei Zustände erscheinen korrekt.
- **URL-Zustand / Reload-Restore:** aktiver Tab + gesetzte Filter stehen in der URL; nach
  **Reload** bleiben Tab und Filter erhalten (teilbarer Zustand). **PASS:** Zustand
  überlebt Reload.

---

## Gesamt-Abnahme

Phase 115 gilt erst dann als live verifiziert, wenn **alle** obigen PASS-Assertions
(Block A: A1–A6, Block B: B1–B5) bestanden sind. Bei Abweichungen: konkrete Abweichung
je Punkt notieren (Gap-Closure), nicht global „failed". Rückmeldung an den ausführenden
GSD-Flow: `approved`, sobald alles grün ist.
