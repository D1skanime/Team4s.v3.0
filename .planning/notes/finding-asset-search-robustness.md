# Finding (Backlog): Anime-Media Asset-Suche ist nicht-deterministisch + verschluckt Provider-Fehler still

**Entdeckt:** 2026-08-17 beim Anime-Anlegen (Background-Asset-Suche, Titel "Buddy Complex").
**Status:** Qualitäts-Fund fürs Backlog — Kandidat für eine Media-Intake-Follow-up-Phase.
**Scope-Bezug:** CLAUDE.md — "Only cover upload is currently productionized; other anime media
upload surfaces need planning and follow-up work."

## Symptom
Zweimal exakt dieselbe Suche (`slot=background&q=Buddy+Complex&limit=12`), unterschiedliche
Ergebnisse — ohne dass sich am Input etwas änderte:

| Lauf | Dauer | Treffer |
|---|---|---|
| 1 (08:30) | 11,5 s (kalt) | 3 — Zerochan lief in einen Timeout, seine Treffer fielen weg |
| 2 (08:36) | 0,76 s (warm/gecacht) | 6 — Zerochan war jetzt dabei (3× "Yumihara Hina") |

In den Backend-Logs: **keine einzige** Timeout-/Fehler-Zeile → Provider-Fehler werden
**still verschluckt**.

## Ursache
- Für `slot=background` fragt der Service 5 Provider ab: **TMDB, FanartTV, Zerochan, Konachan,
  Safebooru** (AniList nur für Banner). Siehe
  `backend/internal/services/anime_create_enrichment.go` (asset-type→provider Mapping ~Z.178-206)
  und Handler `backend/internal/handlers/admin_content_anime_asset_search.go`.
- Nur **TMDB + Fanart** haben API-Keys (`config.go` TMDBAPIKey/FanartAPIKey, in .env gesetzt);
  Zerochan/Konachan/Safebooru sind **keyless Booru-/Scraping-Quellen** → langsam & flaky.
- Cold-Path: Zerochan überschreitet den Timeout (die ~11,5 s ≈ Timeout-Grenze) → Ergebnisse
  werden **verworfen** statt retry/gewartet.
- Warm-Path: Ergebnisse gecacht (0,76 s) → vollständig.
- Fehler/Timeouts werden **weder geloggt noch in der UI angezeigt** → Admin kann "Timeout" nicht
  von "0 Treffer" unterscheiden.

## Verbesserungs-Kandidaten (für spätere Phase)
1. **Per-Quelle-Status in der UI** ("Zerochan: Timeout/Fehler" vs. "0 Treffer") + **Retry-Button**
   je Quelle.
2. **Cold-Path robuster:** Zerochan/Booru-Timeout hochsetzen und/oder Retry, statt Treffer
   stillschweigend zu verwerfen.
3. **Provider-Fehler loggen** (aktuell komplett verschluckt) — für Diagnose.
4. **Caching vereinheitlichen**, damit die erste Suche nicht schlechter ist als die zweite.
5. Optional prüfen: nur ~1 Treffer/Quelle bei Booru-Quellen — evtl. **Tag-Format** der Query
   (`buddy_complex` statt `Buddy Complex`).

## Betroffene Dateien
- backend/internal/handlers/admin_content_anime_asset_search.go
- backend/internal/services/anime_create_enrichment.go (Provider-Dispatch + Booru-Clients)
- backend/internal/config/config.go (nur TMDB/Fanart-Keys)
- Frontend: Modal "Backgrounds online suchen" (admin Anime-Anlegen, Asset-Suche)

---

*Isolierte Backlog-Notiz — kein Commit, keine Shared-File-Edits.*
