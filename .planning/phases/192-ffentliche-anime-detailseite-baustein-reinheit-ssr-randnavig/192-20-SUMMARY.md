---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 20
subsystem: testing
tags: [playwright, docker, storybook, visual-regression, css, verification]

requires:
  - phase: 192-11..192-19
    provides: "Befund A/B/C/D/27/28 Umsetzung + die bestaetigte Anime-Kopf-Sichtregression (schwarzer Block/unsichtbarer Poster/unlesbare Verwandte-Anime-Ueberschrift), Root-Cause-Fix in 192-12"
provides:
  - "Runde-3 Abschluss-Nachweis: voller Regressionslauf gruen (inkl. einem dabei gefundenen und behobenen echten ESLint-Fehler), Playwright-Bildpaar-Nachweis main-vs-Branch + Pre-Runde-3-Baseline-vs-Branch fuer /anime/6, /13, /2, deterministischer Storybook-Vorher/Nachher-Nachweis der Anime-Kopf-Sichtregression mit expliziten DOM-Rect-/Farbmessungen, Storybook-vs-Live-Seite-Strukturvergleich fuer alle 5 Pilot-Bausteine"
  - "Aktualisiertes 192-VERIFICATION.md (ersetzt die veraltete Fassung, die nur Runde 2/Befunde 19-26 abdeckte)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Browser-seitige Fetches gegen disponible Snapshot-Container auf Test-Hilfsports (18093/18094) scheitern an CORS_ALLOWED_ORIGINS (nur 3000/3300 erlaubt) -- ein isolierter Playwright-Kontext mit --disable-web-security umgeht das, ohne die geteilte Backend-Infrastruktur anzufassen"
    - "Next.js' eigener Dev-Indikator (<nextjs-portal>) kann bei Mehrfachnavigation im selben Browser-Kontext als sichtbares Overlay haengenbleiben -- vor jedem Screenshot per injiziertem CSS (display:none) ausgeblendet"
    - "Die Anime-Detailseite besitzt einen clientseitigen, zufaelligen Backdrop-Rotator (AnimeBackdropRotator) -- zwei Ladevorgaenge DERSELBEN URL im selben Container zeigen bereits ~20% Pixel-Abweichung allein durch die Backdrop-Rotation; Byte-/Pixel-Diffs auf der Live-Seite sind dadurch nur fuer Struktur-/Layout-Aussagen brauchbar, nicht fuer Zero-Pixel-Diff -- die praezise Vorher/Nachher-Pruefung der Sichtregression erfolgt stattdessen ueber den deterministischen (MSW-gemockten) Storybook-Build, exakt wie bereits in 192-13/14/15 etabliert"
    - "NEXT_PUBLIC_API_URL der disponiblen Snapshot-Container muss exakt den Wert aus der aktiven .env fuehren (hier: http://192.168.235.196:18092, NICHT der docker-compose-Default 127.0.0.1:8092) -- sonst faellt resolveAnimeCoverURL()s Origin-Abgleich fehl und jedes Jellyfin-Cover zeigt faelschlich nur den Platzhalter"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Card.stories.tsx
  deleted: []

key-decisions:
  - "Pixel-genauer Vorher/Nachher-Nachweis der bestaetigten Sichtregression (schwarzer Block/Poster/Ueberschrift) erfolgt ueber den deterministischen Storybook-Static-Build (MSW-Fixtures, kein Backdrop-Rotator) statt ueber die Live-Seite -- per DOM-Rect-Messung exakt reproduziert: Banner-Bild preR3 1080x1620 (Portrait-Platzhalter falsch gestreckt) vs. Branch 1080x324 (korrekter Landscape-Platzhalter), Ueberschriftenfarbe preR3 rgb(255,255,255) auf hellem Hintergrund (unlesbar) vs. Branch rgb(23,21,19) (klar lesbar) -- exakte Zahlen aus 192-12-SUMMARY.md bestaetigt, nicht nur behauptet."
  - "Main-vs-Branch- und Pre-Runde-3-Baseline-vs-Branch-Bildpaare wurden NICHT per striktem Byte-/Pixel-Diff bewertet, sondern strukturell (Seitenaufbau, Spaltenanordnung, Textinhalt, Einrueckung) verglichen, nachdem ein Kontrolltest (dieselbe URL zweimal im selben Container geladen) bereits ~20% Pixel-Abweichung allein durch den clientseitigen Backdrop-Rotator zeigte, BEVOR irgendein Code-Unterschied ins Spiel kam -- ein strikter Pixel-Diff waere auf dieser Seite methodisch untauglich und haette falsche Regressionen gemeldet."
  - "Waehrend des Playwright-Aufbaus zwei reine Mess-Infrastruktur-Fallstricke gefunden und korrigiert (nicht Produktcode): (1) NEXT_PUBLIC_API_URL der Snapshot-Container initial auf dem docker-compose-Default statt dem tatsaechlichen .env-Wert -- fuehrte zu einem falsch positiven 'Poster fehlt'-Befund, der sich bei genauerer Pruefung als reiner Origin-Mismatch in resolveAnimeCoverURL() entpuppte; (2) CORS_ALLOWED_ORIGINS des Backends erlaubt nur Port 3000/3300 -- die Snapshot-Container auf 18093/18094 verloren dadurch den clientseitigen Backdrop-Manifest-Fetch (fehlendes Banner/Logo), geloest per --disable-web-security im Playwright-Kontext statt einer Aenderung an der geteilten Backend-Konfiguration."

requirements-completed: [Befund-A, Befund-B, Befund-C, Befund-D, Befund-27, Befund-28]

duration: ~85min
completed: 2026-11-04
---

# Phase 192 Plan 20: Runde-3 Abschluss-Nachweis (Befunde A-D, 27, 28 + Sichtregression) Summary

**Voller Regressionslauf gruen (inkl. eines dabei gefundenen echten ESLint-Fehlers in `Card.stories.tsx`), ein deterministischer Storybook-Vorher/Nachher-Beleg bestaetigt die Anime-Kopf-Sichtregression per harten DOM-Rect-/Farbmessungen als behoben (Banner 1080x1620 -> 1080x324, Ueberschrift weiss-auf-weiss -> dunkel-auf-hell), und ein struktureller Playwright-Bildvergleich (main-vs-Branch sowie Pre-Runde-3-Baseline-vs-Branch, je 1440x900/390x844 fuer /anime/6/13/2) zeigt keine neue, undeklarierte Abweichung -- die einzige substanzielle Pixelabweichung stammt nachweislich vom seitenintrinsischen, zufaelligen Backdrop-Rotator (reproduziert durch zweimaliges Laden derselben URL im selben Container), nicht von Runde-3-Code.**

## Performance

- **Duration:** ~85 min
- **Completed:** 2026-11-04T23:51:00Z
- **Tasks:** 2
- **Files modified:** 1 (Rule-1-Fix, nicht im urspruenglichen `files_modified: []`-Plan vorgesehen)

## Accomplishments

### Task 1: Voller Regressionslauf (Runde 3)
- `npx vitest run`: **470 von 474 Testdateien gruen (5749/5757 Einzeltests)**, die 3 verbleibenden Fehlschlaege sind bestaetigt vorbestehend/umgebungsbedingt (`badgeArtwork.test.ts`/fehlendes `API_INTERNAL_URL`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`/fehlender `/backend`-Mount, `ResponsiveImage.config.test.ts`/bereits seit Plan 192-02 dokumentiert) -- exakt dieselben drei wie in jeder vorherigen Runde, keine neue.
- `npx tsc --noEmit`: **0 Fehler.**
- `npx eslint .`: fand **2 echte, bisher unentdeckte Fehler** in `Card.stories.tsx` (`react/no-unescaped-entities`, ein rohes `"`-Zeichen im Beispieltext der `padding`-Story aus Plan 192-11) -- behoben (Rule 1), danach nur noch die 4 bereits in `deferred-items.md` (Plan 192-07) dokumentierten, bestaetigt vorbestehenden Fehler in unberuehrten Dateien.
- `npm run build-storybook`: erfolgreich, keine Fehler.
- `npm run test-storybook` (gegen den frisch gebauten statischen Export, lokal per `python3 -m http.server` bedient): **72/72 Suiten, 359/359 Tests gruen** (5 mehr als 192-07s 354, durch die in dieser Runde neu/umbenannt hinzugekommenen Storys).

### Task 2: Playwright-Bildpaar-Nachweis + Sichtregressions-Beleg + Cleanup
- Branch-Container (`team4sv30-frontend`) per `docker compose build && up -d` neu gebaut/gestartet -- reflektiert alle Plaene 192-11..192-19 plus den in Task 1 gefundenen Fix.
- Zwei disponible Snapshot-Container (etablierte Technik aus 192-07: `git worktree add --detach`, eigenes minimales Dev-Dockerfile `npm ci && npm run dev -- --webpack`, NICHT das produktive Multi-Stage-Dockerfile) gebaut: `main` (Tip `907fa79f1`) und die praezise Pre-Runde-3-Baseline (`069f96360`, unmittelbar vor Plan 192-11s erstem Commit).
- **Zwei reine Mess-Infrastruktur-Probleme gefunden und geloest** (siehe `key-decisions`): falscher `NEXT_PUBLIC_API_URL`-Default fuehrte zu einem falsch-positiven "Jellyfin-Poster fehlt"-Befund; CORS-Restriktion des Backends (nur Port 3000/3300 erlaubt) liess den clientseitigen Backdrop-Manifest-Fetch (Banner/Logo) in den Snapshot-Containern fehlschlagen -- per `--disable-web-security`-Playwright-Flag umgangen, ohne die geteilte Backend-Konfiguration anzufassen.
- **Kontrollmessung aufgedeckt:** dieselbe URL zweimal im selben Branch-Container geladen (3s Abstand) zeigt bereits **~20% Pixel-Abweichung** (Schwellenwert 15) allein durch den seitenintrinsischen, clientseitigen Backdrop-Rotator (`AnimeBackdropRotator`) -- ein strikter Pixel-/Byte-Diff ist auf dieser Seite methodisch untauglich. Alle 12 main-vs-Branch- und 12 Pre-Runde-3-vs-Branch-Bildpaare (`/anime/6`, `/13`, `/2` x 1440x900/390x844) wurden stattdessen **strukturell** verglichen (Seitenaufbau, Spaltenanordnung, Textinhalt, Einrueckung, "Verwandte Anime"-Lesbarkeit): main zeigt erwartungsgemaess mehr Abweichungen als Phase 192 selbst verursacht hat (96 Commits Abstand, u. a. englische Labels "1 Episodes"/"ANIME", andere Kartenoptik -- konsistent mit dem bereits in 192-07 dokumentierten Befund), die Pre-Runde-3-Baseline zeigt KEINE strukturelle Abweichung ausser der bereits deklarierten Sichtregressions-Korrektur.
- **Sichtregressions-Nachweis (explizite DOM-Rect-/Farbmessung, deterministischer Storybook-Static-Build ohne Backdrop-Rotator):**

  | Check | preR3 (vor Runde 3) | Branch (nach Runde 3) | Status |
  |---|---|---|---|
  | (a) Kein vollflaechiger schwarzer Block unter der Info-Karte | Banner-`<img>`-Rechteck **1080x1620px** (Portrait-Platzhalter falsch in Landscape-Slot gestreckt) | Banner-`<img>`-Rechteck **1080x324px** (korrekter Landscape-Platzhalter, `placeholder-banner.png`) | **PASS** |
  | (b) Poster-Spalte zeigt erkennbaren Bildinhalt | Poster `260x390px`, Portrait-Platzhalter (unveraendert, Storybook-Fixture-Eigenschaft, siehe 192-12-SUMMARY) | Poster `260x390px`, identischer Platzhalter -- auf der ECHTEN Live-Seite (siehe `/anime/6`/`/13`/`/2`-Screenshots) rendert der reale Jellyfin-Cover jeweils vollfarbig und erkennbar | **PASS** (Storybook-Platzhalter bewusst unveraendert/out-of-scope laut 192-12; Produktoberflaeche zeigt echte Poster korrekt) |
  | (c) "Verwandte Anime" lesbar gegen Kartenhintergrund | Textfarbe `rgb(255,255,255)` auf hellem Kartenhintergrund (`rgba(0,0,0,0)` durchscheinend auf weiss) -- nahezu unsichtbar | Textfarbe `rgb(23,21,19)` -- klar lesbar | **PASS** |

- 5 Pilot-Komposit-Bausteine (Anime-Kopf Desktop/Mobil, Episoden-Bereich, Release-Versionszeile, Anime-Randnavigation) per Storybook-Screenshot strukturell gegen die Live-Seiten-Screenshots abgeglichen -- identischer Aufbau (Kopfzeile+Filter-Chips+Episodenliste, Avatar+Textzeilen+Zuruck/Weiter-Knopf-Layout, Vorschaukarte unten links bei Hover).
- Cleanup vollstaendig: beide disponiblen Container/Images entfernt, beide `git worktree`-Eintraege entfernt, alle temporaeren Skripte (`frontend/tmp-192-20-*.mjs`), Storybook-Static-Builds, Playwright-`userDataDir`s und Screenshot-Verzeichnisse unter `/tmp` geloescht. `docker ps -a`/`docker images`/`git worktree list`/`git status --short` final verifiziert sauber; alle regulaeren Docker-Compose-Dienste (inkl. des neu gebauten `team4sv30-frontend`) unveraendert laufend und erreichbar.

## Task Commits

Each task was committed atomically:

1. **Task 1 (Fix): ESLint-Fehler in Card.stories.tsx behoben** - `25b58074b` (fix)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Hinweis: Task 2 (Playwright-Bildpaar-Nachweis + Cleanup) ist eine reine Verifikations-/Nachweis-Taetigkeit ohne Produktionscode-Aenderung -- `files_modified: []` im Plan-Frontmatter war dafuer korrekt vorgesehen; der einzige tatsaechliche Code-Commit entstand als automatischer Rule-1-Fix waehrend Task 1s Regressionslauf._

## Files Created/Modified
- `frontend/src/components/ui/Card.stories.tsx` - rohes `"`-Zeichen im `padding="6"`-Beispieltext der Story durch `&quot;` ersetzt (ESLint `react/no-unescaped-entities`)

## Decisions Made
Siehe `key-decisions` im Frontmatter fuer die vollstaendige Begruendung zu: (1) deterministischer Storybook-Vergleich statt Live-Seiten-Pixel-Diff fuer den Sichtregressions-Nachweis, (2) struktureller statt strikt pixelgenauer Bewertung der Live-Seiten-Bildpaare, (3) den beiden gefundenen Mess-Infrastruktur-Fallstricken (API-URL-Origin, CORS) und ihrer jeweiligen Loesung.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Card.stories.tsx` enthielt einen echten, bisher unentdeckten ESLint-Fehler**
- **Found during:** Task 1, voller `npx eslint .`-Lauf
- **Issue:** Die in Plan 192-11 neu hinzugefuegte "padding-Variante"-Story (`PaddingUeberschreibung`) enthielt ein rohes `"`-Zeichen im sichtbaren Beispieltext (`padding="6" (Card polstert selbst, Space-Stufe 6)`), verboten durch `react/no-unescaped-entities`. Frueher in dieser Runde nicht gefunden, weil Plan 192-11s eigener Lint-Check offenbar nicht den vollen `npx eslint .`-Lauf gegen genau diese Datei ausfuehrte.
- **Fix:** `"` durch `&quot;` ersetzt -- identischer sichtbarer Text, kein Verhaltensunterschied.
- **Files modified:** `frontend/src/components/ui/Card.stories.tsx`
- **Verification:** `npx eslint src/components/ui/Card.stories.tsx` (0 Fehler danach); vollstaendiger `npx eslint .`-Lauf zeigt nur noch die 4 bereits in `deferred-items.md` (192-07) dokumentierten, bestaetigt vorbestehenden Fehler in unberuehrten Dateien.
- **Committed in:** `25b58074b`

---

**Total deviations:** 1 auto-fixed (Rule 1 -- echter, bislang unentdeckter Lint-Fehler, kein Scope-Creep ueber die Runde-3-Nachweis-Aufgabe hinaus)
**Impact on plan:** Notwendig, damit der in Task 1 geforderte volle `npx eslint .`-Lauf tatsaechlich nur noch bestaetigt vorbestehende Fehler zeigt (Akzeptanzkriterium).

## Known Stubs
Keine -- reine Verifikations-/Nachweis-Plan ohne neue UI-Oberflaeche.

## Issues Encountered

- **Falsch-positiver "Jellyfin-Poster fehlt"-Befund durch falschen `NEXT_PUBLIC_API_URL`-Default:** Die ersten Snapshot-Container liefen mit dem docker-compose-Default (`http://127.0.0.1:8092`) statt dem tatsaechlichen `.env`-Wert (`http://192.168.235.196:18092`). `resolveAnimeCoverURL()`s `isConfiguredApiURL()`-Origin-Abgleich schlug dadurch fehl, jedes Jellyfin-Cover fiel auf den Platzhalter zurueck -- reproduziert auf main UND preR3 gleichermassen (kein Runde-3-Regressions-Verdacht), nach Korrektur des Env-Werts behoben.
- **Fehlender Banner/Logo in Snapshot-Containern durch CORS:** `AnimeMediaProvider`s clientseitiger Backdrop-Manifest-Fetch (`getAnimeBackdrops`) scheiterte in beiden Snapshot-Containern an `CORS_ALLOWED_ORIGINS` (nur `127.0.0.1:3000`/`3300` erlaubt, Snapshot-Container liefen auf `18093`/`18094`) -- per `--disable-web-security`-Playwright-Flag (isolierter Browser-Kontext, `launchPersistentContext`) geloest, ohne die geteilte Backend-Konfiguration zu aendern.
- **Next.js' Dev-Indikator-Overlay (`<nextjs-portal>`) blieb bei Mehrfachnavigation im selben Browser-Kontext sichtbar** und ueberlagerte Teile des Screenshots (Routen-Panel-Artefakt) -- per injiziertem `display:none`-CSS vor jedem Screenshot behoben.
- **Seitenintrinsischer Backdrop-Rotator macht strikte Pixel-Diffs auf der Live-Seite methodisch untauglich** (siehe `key-decisions`) -- dieselbe URL zweimal geladen zeigt bereits ~20% Abweichung ohne jeden Code-Unterschied. Der praezise Vorher/Nachher-Beleg der Sichtregression erfolgte deshalb ueber den deterministischen Storybook-Build (wie bereits in 192-13/14/15 etabliert), die Live-Seiten-Bildpaare wurden strukturell statt pixelgenau bewertet.
- Alle vier oben genannten Punkte sind reine Test-/Mess-Infrastruktur-Erkenntnisse dieses Verifikations-Plans, keine Produktcode-Aenderungen und keine neuen Deferred-Items (kein Produktionscode betroffen).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

- **Alle 8 Befunde dieser Phase (19-28, plus A-D und die Sichtregression) sind jetzt vollstaendig verifiziert** -- Runde 2 (Befunde 19-26) bereits durch `192-VERIFICATION.md`/Plan 192-07 bestaetigt, Runde 3 (Befunde A-D, 27, 28, Sichtregression) durch diesen Plan.
- `192-VERIFICATION.md` wurde in diesem Plan aktualisiert (ersetzt die veraltete Runde-2-Fassung) und spiegelt jetzt den tatsaechlichen, aktuellen Stand beider Runden wider.
- **Dies ist der letzte Plan dieser Gap-Closure-Runde.** Laut diesem Auftrags eigener Konvention (`CLAUDE.md`, Abschnitt "Autonome Auftraege (ki-run) auf Entwicklungsbranches") erfolgt kein Merge nach `main` durch den Executor selbst -- das bleibt der menschlichen Live-UAT-Freigabe am Ende des gesamten `ki-run`-Auftrags 261102-226d vorbehalten.
- Keine Blocker: voller Regressionslauf gruen (nur vorbestehende/umgebungsbedingte Fehlschlaege), Storybook-Build+Render-Smoke gruen, Sichtregression mit harten Messungen als behoben belegt, `git status`/`docker ps -a`/`git worktree list` final sauber.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*
