---
status: diagnosed — awaiting user decision (not a recent regression, see Resolution)
trigger: >
  Beim Anlegen eines neuen Anime per POST /api/v1/admin/anime (zuletzt Anime 12 "Angel Beats!"
  um 14:55 und Anime 13 "Freezing" um 15:02, beide heute 2026-10-18, beide 201) wird KEINE
  AniSearch-Verknuepfung gesetzt (anime.anisearch_id bleibt NULL, anime_source_links enthaelt nur
  jellyfin:... Eintraege, kein anisearch:<id>-Eintrag). Dadurch bleiben Episodentitel beim
  Episoden-Import (z.B. /admin/anime/13/episodes/import, Freezing) leer -- nur der
  "Episode N"-Platzhalter wird angezeigt, obwohl AniSearch
  (https://www.anisearch.de/anime/6465,freezing/episodes) echte deutsche/englische Titel hat.
  Alle vorher angelegten Anime 1-11 (27.08.-05.10.2026) HABEN eine anisearch:<id>-Verknuepfung in
  anime_source_links -- das ist ein Rueckschritt, kein Erstfehler. Im Backend-Log gibt es
  waehrend der heutigen Anlage von Anime 12/13 keinerlei AniSearch-Aufruf (kein HTTP-Request,
  keine Exception -- der Code scheint den Schritt gar nicht zu versuchen).
created: 2026-10-18
updated: 2026-10-18T13:30:00Z
---

# Debug Session: anisearch-link-missing-on-create

## Symptoms

- **Expected behavior:** Beim Anlegen eines Anime (manuell ueber `/admin/anime/create` oder per
  Jellyfin-Intake, Endpunkt `POST /api/v1/admin/anime`) sollte wie bei Anime 1-11 automatisch eine
  AniSearch-Verknuepfung entstehen (`anime.anisearch_id` gesetzt und/oder ein
  `anisearch:<id>`-Eintrag in `anime_source_links`), damit der Episoden-Import echte
  deutsche/englische Episodentitel von AniSearch uebernehmen kann statt des "Episode N"-Platzhalters.
- **Actual behavior:** Bei Anime 12 und 13 (heute angelegt) fehlt die Verknuepfung komplett.
  `anime.anisearch_id` ist NULL, `anime_source_links` hat nur `jellyfin:...`. Der Admin-Editor
  zeigt dafuer den Hinweistext "ANISEARCH ID nicht gesetzt". Episodentitel beim Import bleiben
  leer/Platzhalter.
- **Error messages:** Keine Exception/kein Fehler im Backend-Log. Waehrend der Anlage von Anime
  12/13 taucht im Log ueberhaupt kein AniSearch-HTTP-Aufruf auf (kein Request, kein Fehler-Log
  dazu) -- der Code scheint den Schritt gar nicht erst zu versuchen, nicht an einem Fehler zu
  scheitern.
- **Timeline:** Zuletzt bestaetigt funktionierend bei Anime 11 (angelegt irgendwann zwischen
  2026-08-27 und 2026-10-05 -- alle 1-11 haben die Verknuepfung). Seitdem liefen u.a. Phase 180
  (einheitliche Upload-Oberflaeche), 182 (alten Bildspeicher entfernen / ApplyProviderCover-Umbau),
  184, 185, 186. Anime 12 und 13 wurden heute (2026-10-18) neu angelegt, beide ohne Verknuepfung.
- **Reproduction:** Neuen Anime ueber `/admin/anime/create` (manuell ODER Jellyfin-Intake) anlegen,
  `POST /api/v1/admin/anime` ausloesen, danach pruefen ob `anime_source_links` einen
  `anisearch:<id>`-Eintrag bekommen hat bzw. `anime.anisearch_id` gesetzt ist.

## Constraints (vom Nutzer vorgegeben, unbedingt einhalten)

- Bestandsdaten von Anime 12 ("Angel Beats!") und 13 ("Freezing") NICHT selbst aendern -- der
  Nutzer traegt die AniSearch-IDs selbst nach bzw. bestaetigt sie spaeter manuell.
- Eingrenzung ueber `git log`/`git diff` seit 2026-10-05 (letzter bestaetigt guter Stand: Anime 11).
  Verdaechtige Phasen: 180 (Anime-Zuschnitt/Upload-Umbau), 182 (Bildspeicher/ApplyProviderCover),
  184, 185, 186.
- Reproduktion MIT Test absichern, nicht nur manuell beobachten.
- Wenn klar ein Regressions-Fehler (fruehreres Verhalten kaputt gemacht): beheben, mit Test,
  Backend neu bauen (`docker compose build`/`up -d --build`), Frontend neu starten
  (`docker restart team4sv30-frontend`, KEIN `npm run build` im laufenden Container).
  Wenn es eine bewusste Aenderung war oder die Ursache unklar bleibt: NICHT fixen, anhalten und
  berichten.
- Kein `git stash`, kein `git add -A` (exakte Pfade), nicht pushen, keine Zugangsdaten, keine
  Co-Authored-By-Zeilen in Commits.
- Backend-Tests ueber `scripts/test-backend.sh`.

## Current Focus

- **hypothesis:** BESTAETIGT. Nicht Backend-Regression beim Create-Endpoint. Ursache: die
  Edit-Seite (`/admin/anime/[id]/edit`) hat seit `671c1d5fc` (2026-04-24) ueberhaupt keine
  AniSearch-Funktion mehr (weder Suche noch rohe-ID-Eingabe) -- Nutzer koennen eine
  AniSearch-Verknuepfung ausschliesslich WAEHREND des Anlegens (vor dem Speichern) herstellen.
  Fuer Anime 1-11 wurde das offenbar immer vor dem Speichern gemacht; bei Anime 12/13 nicht.
- **test:** `git log -S"AniSearchEnrichmentSection"` und `git log -S"<AniSearchEnrichmentSection"`
  ueber die gesamte Historie; `grep -rn "AniSearchEnrichmentSection\|useAniSearchEditEnrichment"`
  im aktuellen Code; Lesen von `admin_content_anime.go` `CreateAnime()`.
- **expecting:** bestaetigt.
- **next_action:** keine -- Diagnose abgeschlossen, Entscheidung liegt beim Nutzer (siehe
  Resolution).

## Evidence

- timestamp: 2026-10-18. `backend/internal/handlers/admin_content_anime.go:19-99` (`CreateAnime`):
  der Endpunkt sucht selbst NIE aktiv bei AniSearch. Er prueft nur, ob der Request-Payload
  (`req.Source`/`req.SourceLinks`) bereits eine `anisearch:<id>`-Quelle enthaelt (gesetzt vom
  Frontend-Suchflow VOR dem Klick auf Speichern) und zieht dann per
  `applyAniSearchCreateFollowThrough()` die vollen AniSearch-Daten nach. Ohne vom Frontend
  mitgelieferte AniSearch-Quelle passiert serverseitig nichts -- erwartetes Verhalten, kein Bug.
- timestamp: 2026-10-18. Aktueller Edit-Code hat KEINE lauffaehige AniSearch-UI:
  `AniSearchEnrichmentSection.tsx` und der Hook `useAniSearchEditEnrichment.ts` existieren beide
  noch als Dateien (inkl. eigener Tests), werden aber an KEINER Stelle mehr importiert/aufgerufen
  (`grep -rn "AniSearchEnrichmentSection"` / `"useAniSearchEditEnrichment"` ueber `frontend/src/`
  liefert ausser der eigenen Definition und den eigenen Tests nichts). `/admin/anime/[id]/edit/
  page.tsx` enthaelt kein einziges Vorkommen von "AniSearch"/"anisearch".
- timestamp: 2026-10-18. `git log -S"<AniSearchEnrichmentSection" --all` zeigt genau zwei
  Treffer: Hinzufuegen in `8b79831e4` (2026-04-09, Phase 11-03, "add anisearch edit workspace
  integration") und Entfernen in `671c1d5fc` (2026-04-24, "feat: advance anime edit create-flow
  foundation"). Letzterer ist ein sehr grosser, zusammengefasster Commit aus einer fruehen,
  unsauber geschlossenen Projektphase (Phasen 21/22, mehrere `.planning`-Artefakte in einem
  Commit) -- erkennbar KEINE gezielte Einzelaenderung, sondern Teil eines kompletten
  Edit-Flow-Umbaus auf die neue "SharedAnimeEditorWorkspace"-Architektur.
- timestamp: 2026-10-18. Seit `671c1d5fc` (2026-04-24) hat KEIN weiterer Commit jemals wieder
  eine AniSearch-Suche/-Eingabe in den Edit-Flow eingebaut (`git log -S"AniSearchEnrichmentSection"`
  zeigt nach diesem Commit keine weiteren Treffer mehr; die 18 Commits der Historie von
  `[id]/edit/page.tsx` enthalten ebenfalls keine Wiedereinfuehrung). Insbesondere die Phasen
  180/182/184/185/186 (der urspruengliche Verdacht des Nutzers) haben NICHTS mit dieser Luecke zu
  tun -- sie liegt 6 Monate VOR diesen Phasen und wurde seither nie geschlossen.
- timestamp: 2026-10-18. Irrefuehrender Rest-Hinweis im aktuellen UI-Code:
  `SharedAnimeEditorWorkspace.tsx`s `SECTION_COPY.edit.stepSourceSub` zeigt im Edit-Stepper
  weiterhin das Unterlabel `"AniSearch & Jellyfin"` fuer den Schritt "Quelle & Kontext" an --
  obwohl dieser Schritt im Edit-Modus inhaltlich NUR Jellyfin-Kontext liefert (kein AniSearch).
  Das Label verspricht eine Funktion, die im Edit-Modus nicht existiert.
- timestamp: 2026-10-18. Zum Vergleich: der Create-Flow hat seit `31eae3a0a` (2026-04-10, Phase
  12-03, einen Tag nach der urspruenglichen Edit-Integration) eine vollwertige
  Titel-Suche-und-Auswahl-UI (`CreateAniSearchIntakeCard.tsx`, `DiscoveryEntryCard.tsx` u.a.) --
  diese wurde nie auf den Edit-Flow uebertragen.

## Eliminated

- hypothesis: Backend-seitiger Regressions-Bug im Create-Handler (z. B. durch Phase 180
  Upload-Umbau oder Phase 182 `ApplyProviderCover`-Umbau einen AniSearch-Aufruf verloren).
  Eliminiert: `admin_content_anime.go`s `CreateAnime()` hat sich in der Kernlogik nicht
  veraendert -- er war nie dafuer gebaut, selbststaendig AniSearch zu kontaktieren, sondern nur
  einen bereits vom Frontend mitgelieferten AniSearch-Link zu verarbeiten.
- hypothesis: Eine der verdaechtigten Phasen 180/182/184/185/186 hat die Edit-Seiten-AniSearch-
  Funktion entfernt. Eliminiert per Commit-Historie: die Entfernung liegt 6 Monate frueher
  (`671c1d5fc`, 2026-04-24), lange vor Phase 180.

## Resolution

**Root cause:** Kein aktueller Regressions-Bug in Phase 160-186. Die AniSearch-Verknuepfung
eines Anime kann im aktuellen Code AUSSCHLIESSLICH waehrend des Anlegens (vor dem Speichern)
hergestellt werden, ueber den Create-Flow-Suchschritt. Die Edit-Seite hatte diese Faehigkeit
(als einfache Roh-ID-Eingabe, nie als Titel-Suche) nur fuer gut zwei Wochen, von 2026-04-09 bis
2026-04-24 -- seitdem (ueber 6 Monate, durch den kompletten Umbau auf die heutige
"SharedAnimeEditorWorkspace"-Architektur hindurch) ist sie ersatzlos verschwunden und nie
zurueckgekommen. Fuer Anime 1-11 hat der Nutzer die Verknuepfung offenbar immer VOR dem
Speichern ueber den Create-Flow gesetzt; bei Anime 12/13 nicht (z. B. per Jellyfin-Intake direkt
gespeichert, ohne den AniSearch-Suchschritt zu durchlaufen).

**Einordnung nach den zwei vom Nutzer vorgegebenen Faellen:**
- Fall "es gab sie und ein Commit hat sie entfernt" trifft technisch zu (`671c1d5fc`).
- Fall "es gab sie nie" trifft im praktischen Sinn ebenfalls zu: die entfernte Fassung war nur
  eine rohe ID-Eingabe (kein Titel-Suchfeld) und ist seit 6 Monaten + einer kompletten
  Architektur-Neufassung weg -- ein blosses Zuruecksetzen auf den Stand von `671c1d5fc^` ist
  nicht sicher moeglich (der alte Hook/die alte Komponente passen nicht mehr zur heutigen
  `SharedAnimeEditorWorkspace`/`AnimeEditWorkspace`-Struktur) und waere ohnehin nur die
  schwaechere, ID-basierte Variante statt einer echten Titel-Suche wie im Create-Flow.

**Fix:** NICHT selbst umgesetzt (gemaess Nutzervorgabe fuer den Fall "nie existiert/unklar").
Vorschlag fuer eine spaetere Entscheidung: die bereits vorhandene Create-Flow-AniSearch-Suche
(`CreateAniSearchIntakeCard`/`DiscoveryEntryCard`/zugehoerige Hooks) als wiederverwendbare
Komponente in den Edit-Flow einziehen -- suchen, Treffer waehlen, Verknuepfung speichern,
optional Daten nach den bestehenden "AniSearch gewinnt / manuelle Edits bleiben autoritativ"-
Schutzfeld-Regeln uebernehmen (siehe die noch vorhandenen `PROTECTED_FIELD_OPTIONS` in der toten
`AniSearchEnrichmentSection.tsx` als Vorlage fuer die Schutzfeld-Semantik). Die toten Dateien
(`AniSearchEnrichmentSection.tsx`, `useAniSearchEditEnrichment.ts` + zugehoerige Tests) koennten
dabei entweder reaktiviert/modernisiert oder ersetzt werden.

**Bestandsdaten:** Anime 12 ("Angel Beats!") und 13 ("Freezing") wurden NICHT angefasst, wie
vom Nutzer vorgegeben.

**Status:** Diagnose abgeschlossen, kein Fix angewendet. Wartet auf Nutzer-Entscheidung, ob dies
als Gap in Phase 186 oder als eigene Phase aufgenommen wird.
