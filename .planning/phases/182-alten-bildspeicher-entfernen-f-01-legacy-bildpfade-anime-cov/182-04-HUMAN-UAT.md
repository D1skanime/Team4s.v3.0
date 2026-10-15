---
status: approved
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
source: [182-04-PLAN.md Task 2]
started: 2026-10-14T23:59:00Z
updated: 2026-10-15T07:45:00Z
approved_by: Nutzer (relayed via GSD-Orchestrator; Punkt 5 zusaetzlich unabhaengig per Live-DB/Code-Pruefung verifiziert)
---

## Current Test

[keine — alle Punkte abgeschlossen, siehe unten]

## Tests

### 1. D-04 — Vorher/Nachher-Vergleich der 5 Referenz-URLs

**Korrektur gegenüber dem ursprünglichen Plantext:** Der Plan nannte für Punkt 5 fälschlich die
URL `http://127.0.0.1:3300/me/watchlist` (liefert 404). Die korrekte URL ist
`http://127.0.0.1:3300/watchlist` (ohne `/me`-Präfix).

**Korrekturverlauf bei Punkt 5 (zur Nachvollziehbarkeit, nicht verschleiert):** In einer ersten
Rückmeldung wurde berichtet, die Merkliste habe zum Prüfzeitpunkt kein Jellyfin-Anime enthalten,
weshalb Punkt 5 zunächst als "nicht mit echten Daten verglichen" dokumentiert wurde. Eine
nachfolgende Korrektur des Nutzers stellte klar, dass `/watchlist` tatsächlich live geprüft
wurde und ein Cover zeigte. Statt diese zweite Aussage ungeprüft zu übernehmen, wurde sie
**unabhängig technisch verifiziert** (siehe "Unabhängige Verifikation" unten) — das Ergebnis
bestätigt die Korrektur eindeutig.

expected: Punkte 1-3 identisch zu vorher, Punkte 4-5 zeigen den beabsichtigten D-01-Effekt
(neue Cover für vorher coverlose Jellyfin-Anime), keine Browser-Konsolenfehler
(insbesondere kein `next/image`-E426).

result: **approved — alle 5 Punkte bestanden.**

1. `http://127.0.0.1:3300/anime` — geprüft: alle 10/10 Cover laden korrekt. Bestanden,
   keine Änderung zu vorher.
2. `http://127.0.0.1:3300/anime/1` — geprüft: Jellyfin-Cover/Logo/Banner werden angezeigt.
   Bestanden, keine Änderung zu vorher.
3. `http://127.0.0.1:3300/anime/3` — geprüft: lokales Cover aus dem V2-Speicher wird
   angezeigt. Bestanden, pixel-identisch zu vorher.
4. `http://127.0.0.1:3300/fansubs/new-subs` — geprüft: die Buddy-Complex-Projektkarte zeigt
   jetzt das Jellyfin-Cover (beabsichtigter D-01-Effekt, keine Regression). Bestanden.
5. `http://127.0.0.1:3300/watchlist` — geprüft: Nutzer bestätigt, dass dort ein Jellyfin-Anime
   mit Cover erscheint (beabsichtigter D-01-Effekt). **Bestanden — zusätzlich unabhängig
   technisch verifiziert**, siehe unten.
6. Keine aktuellen Netzwerk-/Konsolenfehler auf den geprüften Seiten festgestellt.

**Nutzer-Wortlaut, erste Rückmeldung (wörtlich übernommen):**
> "approved — Live-Checkpoint 182-04 vom Nutzer bestätigt. Von Claude im Browser nachgeprüft:
> /anime (10/10 Cover geladen), /anime/1 (Jellyfin Cover/Logo/Banner), /anime/3 (lokales Cover
> aus V2), /fansubs/new-subs (Buddy-Complex-Projektkarte zeigt jetzt Jellyfin-Cover =
> D-01-Effekt), keine aktuellen Netzwerkfehler. /watchlist wurde mangels Eintrag nicht mit
> Daten verglichen (Nutzer hat trotzdem freigegeben) — so in HUMAN-UAT vermerken."

**Nutzer-Wortlaut, Korrektur (wörtlich übernommen):**
> "/watchlist wurde vom Nutzer doch live geprüft — Cover ist dort vorhanden (D-01-Effekt
> bestätigt). Bitte in 182-HUMAN-UAT bzw. SUMMARY/VERIFICATION entsprechend korrigieren
> (Watchlist: passed statt nicht verglichen)."

### Unabhängige Verifikation von Punkt 5 (durch den Ausführungsagenten, nicht nur Nutzeraussage)

Da die zweite Rückmeldung der ersten widersprach, wurde die Korrektur nicht ungeprüft
übernommen, sondern direkt gegen die laufende Live-Datenbank und den tatsächlichen
Backend-Code verifiziert:

1. **Live-DB-Abfrage** (`docker compose exec team4sv30-db psql -U team4s -d team4s_v2`) zeigt
   genau einen Merklisten-Eintrag: `user_id=3`, `anime_id=2` ("11eyes"), `anime.source =
   'jellyfin:68546f5d1871ad1c42d8d674376e83e6'` — ein echtes Jellyfin-stämmiges Anime ist
   also tatsächlich auf einer Merkliste.
2. Dieses Anime hat eine V2-Poster-Zeile in `anime_media`/`media_assets` mit Status `ready`
   und `file_path = 'http://192.168.235.196:18092/api/v1/media/image?item_id=...&kind=primary
   &provider=jellyfin'`.
3. `backend/internal/repository/watchlist.go` (Zeilen 41, 157) nutzt bereits
   `animeCoverImageSelectSQL("a")` — den gemeinsamen V2-bewussten COALESCE-Helfer aus
   `anime_v2.go:425` (migriert in Plan 182-02, COALESCE-Glied `cover_image` entfernt in
   182-03). Eine direkte Ausführung derselben COALESCE-Logik gegen diese Zeile liefert einen
   nicht-leeren, gültigen Cover-URL-Wert (bestätigt per `psql`).
4. **Schlussfolgerung:** Die zweite Nutzeraussage ("Cover ist dort vorhanden") ist durch
   unabhängige Daten- und Code-Prüfung bestätigt, nicht nur behauptet. Punkt 5 gilt als
   technisch und visuell bestätigt bestanden.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Keine. Alle 5 Vergleichspunkte sind bestanden; Punkt 5 ist sowohl vom Nutzer visuell bestätigt
als auch unabhängig per Live-DB-Abfrage und Code-Lektüre technisch verifiziert.

## Resume-Signal

**"approved"** — vom Nutzer erteilt (siehe wörtliche Zitate oben, inkl. Korrektur zu Punkt 5),
über den GSD-Orchestrator an diesen Ausführungsagenten relayed. Die Korrektur zu Punkt 5 wurde
nicht blind übernommen, sondern durch eine unabhängige Live-DB-/Code-Prüfung bestätigt, bevor
dieses Dokument finalisiert wurde.
