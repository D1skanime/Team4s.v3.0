---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 07
subsystem: ui
tags: [playwright, docker, css, container-queries, testing, visual-regression, storybook]

# Dependency graph
requires:
  - phase: 192-03
    provides: "FansubGroupPicker/FansubVersionBrowser auf Stack/Cluster umgestellt"
  - phase: 192-06
    provides: "ReleasePreviewRow-Einrückung (Befund 20)"
  - phase: 192-08
    provides: "Zweck-Namen fuer Stack/Cluster/SplitLayout (Befund 24)"
  - phase: 192-09
    provides: "Direkte Logik-Tests statt Klick-Simulation (Befund 25)"
  - phase: 192-10
    provides: "Effekt-Zweck-Tokens in effects.css (Befund 26)"
provides:
  - "Phasenweite Abschluss-Nachweis fuer alle 8 Befunde (19-26): voller Regressionslauf gruen, Playwright-Bildpaar-Nachweis main-vs-Branch und Pre-192-Baseline-vs-Branch, Storybook-vs-Live-Seite fuer alle 5 Pilot-Bausteine"
  - "SplitLayout rendert jetzt tatsaechlich zwei Spalten im echten Browser (vorher: Selbstbezugs-Container-Query-Bug liess es IMMER auf eine Spalte kollabieren, von keinem jsdom-Test erkennbar)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ein Element darf laut CSS-Spezifikation nicht gleichzeitig @container-Abfrage-Ursprung UND Ziel der dadurch geaenderten Layout-Eigenschaft sein -- ein echter Browser-Bildnachweis (nicht jsdom) ist die einzige Pruefmethode, die das zuverlaessig aufdeckt."
    - "Pre-Phase-Baseline-Vergleich (letzter Commit vor Plan 192-01) statt main als praeziserer Regressions-Nachweis, wenn main durch viele vorangegangene, bereits separat geprüfte ki-run-Runden weit vom Branch abweicht."

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/styles/tokens/components.css
    - frontend/src/components/ui/SplitLayout.tsx
    - frontend/src/components/ui/SplitLayout.module.css
    - .planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/deferred-items.md

key-decisions:
  - "Zusaetzlich zum laut Plan/CONTEXT geforderten main-vs-Branch-Bildpaar wurde ein zweiter, praeziserer Vergleich gegen den Commit unmittelbar VOR Plan 192-01 (6a3e32769) durchgefuehrt: `main` liegt 96 Commits hinter dem aktuellen Branch, davon 60 NICHT aus Phase 192 (fruehere, bereits separat abgenommene ki-run-Runden desselben Auftrags 261102-226d, u. a. eine komplette vorherige Detailseiten-Neugestaltung). Ein reiner main-vs-Branch-Pixelvergleich haette dutzende legitime, phasenfremde Unterschiede als vermeintliche Befunde gemeldet. Der Pre-192-Baseline-Vergleich beantwortet die eigentliche Frage des Nachweises praeziser: hat NUR Phase 192 etwas kaputt gemacht? Beide Vergleiche wurden durchgefuehrt und sind weiter unten dokumentiert."
  - "Playwright 1.55.0 war bereits als Dev-Dependency vorhanden (kein Install noetig). Fuer den main-/pre192-Snapshot-Container wurde bewusst NICHT das produktive `frontend/Dockerfile` (Multi-Stage-`next start`-Runner) verwendet, da dessen Runner-Stage nicht alle von `next.config.mjs` zur Laufzeit benoetigten `.mjs`-Hilfsdateien kopiert (ein bereits vor dieser Phase bestehender Dockerfile-Luecken-Bug, der NUR durch den produktiven Dockerfile-Pfad sichtbar wird -- der echte Branch-Container laeuft ueber `docker-compose.override.yml` im Bind-Mount-Dev-Modus und umgeht das). Stattdessen ein disponibles, minimales Dev-Dockerfile (`npm ci && npm run dev -- --webpack`), identisch zum etablierten Override-Verhalten, fuer eine echte Apples-zu-Apples-Vergleichsbasis."
  - "`npm install` (ohne Paketnamen) wurde im Rahmen von Task 1 ausgefuehrt, weil `msw`/`msw-storybook-addon` zwar bereits in der committeten `package-lock.json` aufgeloest, aber nicht in `node_modules` installiert waren (fehlender Sync, nicht Rule-3-Ausschluss-relevant, da kein neues/unbestaetigtes Paket eingefuehrt wurde) -- noetig, damit `npm run build-storybook`/`test-storybook` ueberhaupt laufen. Die dabei entstandene triviale `package-lock.json`-Normalisierung (plattformspezifische optionale Eintraege) wurde NICHT committet (`git checkout -- package-lock.json`)."

patterns-established: []

requirements-completed: [Befund-19, Befund-20, Befund-21, Befund-22, Befund-23, Befund-24, Befund-25, Befund-26]

# Metrics
duration: ~80min
completed: 2026-11-04
---

# Phase 192 Plan 07: Abschluss-Nachweis (Befunde 19-26) Summary

**Voller Regressionslauf gruen (nur vorbestehende Umgebungs-Fehlschlaege), Playwright-Bildpaar-Nachweis main-vs-Branch UND Pre-192-Baseline-vs-Branch zeigt ausschliesslich die zwei deklarierten Aenderungen (Befund 19/20), Storybook-vs-Live-Seite fuer alle 5 Pilot-Bausteine bestaetigt strukturelle Identitaet -- dabei einen echten, zuvor unentdeckten Browser-Bug in `SplitLayout` gefunden und behoben (Selbstbezugs-Container-Query liess den Anime-Kopf IMMER einspaltig rendern, trotz gruener jsdom-Tests).**

## Performance

- **Duration:** ~80 min
- **Completed:** 2026-11-04T14:35:00Z
- **Tasks:** 2 completed
- **Files modified:** 5 (4 Produktionsdateien, 1 Planungsdokument)

## Accomplishments

### Task 1: Voller Regressionslauf
- `npx vitest run`: 467/471 Testdateien gruen (5692/5700 Einzeltests), die 4 verbleibenden Fehlschlaege sind bestaetigt vorbestehend/umgebungsbedingt und betreffen KEINE von dieser Phase geaenderte Datei: `badgeArtwork.test.ts` (fehlendes `API_INTERNAL_URL`, nur im Docker-Compose-Frontend-Service verfuegbar), `ResponsiveImage.config.test.ts` (bereits in Plan 192-02 als vorbestehend dokumentiert), `RoleCapabilityDetail.membershipBaselineDrift.test.ts` (fehlender `/backend`-Mount), `AchievementBadgeShowcase.test.tsx` (bestaetigter Ressourcen-Konkurrenz-Flake nur im vollen Parallellauf, isoliert 7/7 gruen). Die beiden vormals fehlenden `msw`/`msw-storybook-addon`-Pakete wurden per `npm install` (bereits in `package-lock.json` gepinnt) nachinstalliert -- dadurch sind jetzt SOGAR 2 vormals bekannte Fehlschlaege zusaetzlich behoben.
- `npx tsc --noEmit`: keine neuen Fehler (nur die vorbestehenden, unveraenderten `.storybook/mocks/handlers.ts`-`msw`-Typfehler).
- `npx eslint .`: 4 bestaetigt vorbestehende Fehler (per `git log -- <Datei>` verifiziert: letzter Commit vor Phase 192), siehe `deferred-items.md`. EIN echter, durch Plan 192-08 eingefuehrter Fehler (natives `<button>` in `Cluster.stories.tsx`, verboten in `components/ui`) wurde gefunden und auf den echten `Button`-Grundbaustein umgestellt.
- `npm run build-storybook`: schlug zunaechst fehl -- ein von Plan 192-10 neu geschriebener CSS-Kommentar in `components.css` enthielt zufaellig die Zeichenfolge `-*/` (z. B. `--linkchip-glass-*/--linkchip-scrim-*`), was den CSS-Kommentar vorzeitig beendete und den Webpack-Build mit "Unknown word sind" abstuerzen liess. Behoben durch "und" statt "/" zwischen den beiden Token-Namen. Danach Build gruen.
- `npm run test-storybook` (gegen den frisch gebauten statischen Storybook-Export, lokal via `python3 -m http.server` bedient statt eines neuen npm-Pakets): 354/354 Tests, 71/71 Suiten gruen, inkl. der neuen "Grundlagen/Effekte"-Story und aller umbenannten Stack/Cluster/SplitLayout-Zweck-Varianten-Stories.

### Task 2: Playwright-Bildpaar-Nachweis + Cleanup
- Branch-Container (`team4sv30-frontend`) per `docker compose build && up -d` neu gebaut/gestartet (reflektiert alle Pläne 192-01..10 -- läuft laut `docker-compose.override.yml` im Bind-Mount-Dev-Modus, Produktions-Image dient nur als HMR-Trigger für den Neustart).
- 12 main-vs-Branch-Bildpaare (`/anime/6`, `/13`, `/2` × 1440×900/390×844) erfasst gegen einen disponiblen `main`-Snapshot-Container (`git worktree add --detach` gegen den `main`-Commit-Hash, eigenes Dev-Dockerfile, Port 18093). main liegt 96 Commits hinter dem Branch (60 davon phasenfremd) -- die Bildpaare zeigen dadurch erwartungsgemaess mehr als nur Befund 19/20 (z. B. eine komplett andere, inzwischen abgeloeste Hero-Kartenstruktur), aber KEINE davon stammt aus Phase 192 selbst.
- Zusaetzlich ein praeziserer Vergleich gegen den Commit unmittelbar vor Plan 192-01 (`6a3e32769`, eigener Snapshot-Container Port 18094): fuer alle 3 Animes × beide Viewports PIXEL-IDENTISCH bis auf exakt die zwei deklarierten Aenderungen -- Befund 19 (Randnavigations-Links sofort vorhanden statt client-seitig nachgeladen, mit `grid_query`-Kontext verifiziert) und Befund 20 (Release-Zeilen-Datenzeile buendig mit Titel/Gruppenname statt unter dem Avatar, mit aufgeklappter Episodenkarte verifiziert).
- **Dabei gefunden und behoben:** `SplitLayout` liess den Anime-Kopf im ECHTEN Browser IMMER einspaltig rendern (Poster oben, Info-Spalte komplett darunter gestapelt), selbst bei 1440px Viewport-Breite -- unabhaengig vom konkreten Container-Inhalt. Ursache: das Element, das `container: split-layout / inline-size` setzt, war DASSELBE Element, dessen `grid-template-columns` per `@container split-layout (...)`-Abfrage dieses Containers geaendert werden sollte. Das ist laut CSS-Spezifikation nicht erlaubt (von MDN dokumentierte Einschraenkung: ein Container kann nicht anhand der eigenen Groesse sein eigenes Layout aendern) -- in einem minimalen isolierten Testfall mit Playwright/Chromium 140 reproduziert und bestaetigt. jsdom-basierte Komponententests (`SplitLayout.test.tsx`) pruefen Container-Queries nicht real und haben den Bug seit Plan 192-01 nie erkannt. Fix: das aeussere Element traegt nur noch den Container-Namensraum, ein neues inneres `.grid`-Kind-Element (Nachfahre statt Selbstbezug) traegt `display: grid` und wird per `@container` abgefragt. Alle bestehenden `SplitLayout.test.tsx`-Assertions (Klassen/Inline-Styles auf dem AEUSSEREN Element) blieben dadurch unveraendert gruen.
- Storybook-vs-Live-Seite-Bildpaare fuer alle 5 Pilot-Bausteine erfasst (`AnimeDetailHero` Desktop1440+Mobile390, `AnimeEpisodesSection` inkl. `FansubGroupPicker`/`FansubVersionBrowser`, `ReleasePreviewRow` "Mit allen Extras", `AnimeEdgeNavigation` "Mit Nachbarn") -- alle zeigen dieselbe Baumstruktur/Spaltenanordnung wie die Live-Seite; einzige Abweichungen sind fehlende Bild-Fixtures in Storybook (schwarze Platzhalter-Boxen statt echter Poster-/Backdrop-Bilder), keine Struktur-/Layout-Abweichung.
- Cleanup vollstaendig: beide disponiblen Docker-Container/-Images entfernt, beide `git worktree`-Eintraege entfernt, alle temporaeren Skripte/Screenshot-Dateien geloescht, zwei versehentlich am Leben gebliebene `python3 -m http.server`-Prozesse (lokale Storybook-Statik-Bedienung) nachtraeglich identifiziert und beendet. `docker ps -a`/`docker images`/`git worktree list`/`git status --short` final verifiziert sauber; alle regulaeren Docker-Compose-Dienste unveraendert laufend.

## Task Commits

Each task was committed atomically:

1. **Task 1 (Fix 1/3): Cluster.stories.tsx native button -> echter Button-Grundbaustein** - `e868670c7` (fix)
2. **Task 1 (Fix 2/3): components.css CSS-Kommentar-Syntaxfehler behoben (brach Storybook-Build)** - `472e2a232` (fix)
3. **Task 2 (Fix 3/3): SplitLayout Selbstbezugs-Container-Query-Bug behoben** - `78bd112a8` (fix)

**Plan metadata:** (siehe `docs(192-07)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/components/ui/Cluster.stories.tsx` - `InteractiveChip`-Hilfsfunktion nutzt jetzt `Button variant="secondary" size="sm"` statt eines nativen `<button>`
- `frontend/src/styles/tokens/effects.css` *(kein Diff, nur zur Einordnung)* -- unveraendert, aber Teil der geprueften Guard-Datei-Gruppe
- `frontend/src/styles/tokens/components.css` - ein-Zeichen-Fix im LinkChip-Kommentar (`/` -> "und"), verhinderte vorzeitiges CSS-Kommentarende
- `frontend/src/components/ui/SplitLayout.tsx` - neues inneres `.grid`-Element um `firstColumn`/`secondColumn`
- `frontend/src/components/ui/SplitLayout.module.css` - `.splitLayout` traegt nur noch den Container-Namensraum, neues `.grid` traegt das eigentliche CSS-Grid, beide `@container`-Regeln zeigen jetzt auf `.grid` als Nachfahre
- `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/deferred-items.md` - 4 bestaetigt vorbestehende ESLint-Fehler dokumentiert (ausserhalb dieser Phase)

## Decisions Made
Siehe `key-decisions` im Frontmatter (Pre-192-Baseline-Vergleich zusaetzlich zu main-vs-Branch; Dev-Dockerfile statt produktivem Multi-Stage-Dockerfile fuer die Snapshot-Container; `npm install` zum Nachziehen bereits gepinnter `msw`-Pakete).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Natives `<button>` in `Cluster.stories.tsx` (components/ui-Guard-Verstoss)**
- **Found during:** Task 1, voller `npx eslint .`-Lauf
- **Issue:** Plan 192-08s neue "Interaktive Chip-Reihe"-Story baute ein handgebautes `<button>`-Element statt des globalen `Button`-Grundbausteins -- verboten innerhalb von `components/ui` (ESLint `no-restricted-syntax`, kein Eintrag in `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES`).
- **Fix:** `InteractiveChip` nutzt jetzt `<Button type="button" variant="secondary" size="sm" aria-pressed={pressed}>`, fachlich identisch zum vorher nachgebauten Toggle-Look; Story-Beschreibungstext entsprechend angepasst.
- **Files modified:** `frontend/src/components/ui/Cluster.stories.tsx`
- **Verification:** `npx eslint src/components/ui/Cluster.stories.tsx` (0 Fehler), `npx vitest run src/components/ui/Cluster.test.tsx` (5/5 gruen)
- **Committed in:** `e868670c7`

**2. [Rule 1 - Bug] CSS-Kommentar-Syntaxfehler in `components.css` brach den Storybook-Build**
- **Found during:** Task 1, `npm run build-storybook`
- **Issue:** Ein von Plan 192-10 geschriebener Kommentar enthielt `(--linkchip-glass-*/--linkchip-scrim-*)` -- die Zeichenfolge `-*/` bildet zufaellig das CSS-Kommentar-Ende-Token, wodurch der Rest des Satzes ("sind seit Befund 26 nach styles/tokens/effects.css ausgelagert...") als ungueltiges CSS ausserhalb eines Kommentars geparst wurde ("Unknown word sind").
- **Fix:** `/` durch "und" ersetzt: `(--linkchip-glass-* und --linkchip-scrim-*)`.
- **Files modified:** `frontend/src/styles/tokens/components.css`
- **Verification:** `npm run build-storybook` erfolgreich (vorher: Absturz)
- **Committed in:** `472e2a232`

**3. [Rule 1 - Bug] SplitLayout kollabierte im echten Browser immer auf eine Spalte (Selbstbezugs-Container-Query)**
- **Found during:** Task 2, Playwright-Bildpaar-Nachweis (visuell entdeckt beim Vergleich main vs. Branch bei 1440×900 -- die neue AnimeDetailHero-Struktur zeigte Poster UND Info-Spalte gestapelt statt nebeneinander)
- **Issue:** `.splitLayout` trug gleichzeitig `container: split-layout / inline-size` UND `grid-template-columns` (per `@container split-layout (...)`-Abfrage desselben Containers geaendert) -- ein Element kann laut CSS-Spezifikation nicht anhand der eigenen Groesse sein eigenes Layout aendern (von MDN dokumentierte Einschraenkung). In einem minimalen, isolierten Playwright/Chromium-Testfall reproduziert (selbst eine triviale `background-color`-Selbstbezugsabfrage griff nicht). Betraf JEDE SplitLayout-Instanz seit Plan 192-01, unentdeckt, weil `SplitLayout.test.tsx` (jsdom) keine echten Container-Queries auswertet.
- **Fix:** Container-Namensraum und CSS-Grid auf zwei Elemente aufgeteilt -- das aeussere Element (traegt weiterhin alle bisherigen Modifikatorklassen/Inline-Custom-Properties, unveraendert fuer bestehende Tests) setzt nur noch `container`, ein neues inneres `.grid`-Kind-Element (Nachfahre, kein Selbstbezug) setzt `display: grid` und wird per `@container` abgefragt.
- **Files modified:** `frontend/src/components/ui/SplitLayout.tsx`, `frontend/src/components/ui/SplitLayout.module.css`
- **Verification:** Isolierter Playwright-Minimaltest bestaetigt den Fix-Mechanismus; `npx vitest run src/components/ui/SplitLayout.test.tsx` (7/7 gruen, UNVERAENDERT); Live-Browser-Nachweis zeigt `grid-template-columns: 260px 938px` statt `1198px` (eine Spalte); Pixel-Vergleich gegen Pre-192-Baseline zeigt danach exakte Uebereinstimmung (Befund 21 jetzt tatsaechlich erreicht, nicht nur in der Story).
- **Committed in:** `78bd112a8`

---

**Total deviations:** 3 auto-fixed (alle Rule 1 -- echte Bugs, gefunden durch den in diesem Plan vorgeschriebenen echten Browser-/Build-Nachweis, keiner davon durch die bisherigen jsdom-Tests/Guard-Tests der Pläne 01-06/08-10 erkennbar)
**Impact on plan:** Alle drei Fixes waren notwendig, um die Phase tatsaechlich abzuschliessen -- insbesondere Fix 3 betrifft den KERN von Befund 21 (Anime-Kopf muss zwei Spalten haben), der ohne einen echten Browser-Bildnachweis unentdeckt geblieben waere, obwohl alle automatisierten Tests zuvor gruen waren. Das ist exakt der in diesem Plans `<objective>` beschriebene Zweck ("nur ein echter gerenderter Pixel-Vergleich ... kann eine unbeabsichtigte visuelle Regression erkennen, die Unit-Level-`elements()`-Baumabläufe nicht sehen koennen").

## Issues Encountered
- `docker compose build team4sv30-frontend` baut zwar ein Produktions-Image, aber `docker-compose.override.yml` ueberschreibt den Service mit `npm run dev -- --webpack` im Bind-Mount-Modus -- der Rebuild dient dadurch effektiv nur als Neustart-Ausloeser, nicht als tatsaechlich genutztes Image (gemaess etablierter Projekt-Konvention, siehe `CLAUDE.md`s Doku zum Verzicht auf separate Dev-/Prod-Divergenz).
- Der produktive `frontend/Dockerfile` (fuer die disponiblen main-/pre192-Snapshot-Container initial verwendet) scheiterte beim Start mit `ERR_MODULE_NOT_FOUND` fuer `src/lib/images/publicImagePatterns.mjs` -- seine Runner-Stage kopiert nicht alle von `next.config.mjs` zur Laufzeit benoetigten Hilfsdateien. Dieser vorbestehende Dockerfile-Luecken-Bug betrifft nur den (im normalen Compose-Betrieb durch den Override ohnehin nie genutzten) produktiven `next start`-Pfad und wurde NICHT behoben (ausserhalb des Scopes dieses Verifikations-Plans) -- stattdessen ein disponibles Dev-Dockerfile fuer die Snapshot-Container verwendet, identisch zum tatsaechlichen Branch-Container-Verhalten.
- Zwei `python3 -m http.server`-Hintergrundprozesse (fuer die lokale Storybook-Statik-Bedienung) ueberlebten die ersten `kill`-Versuche (falsche PID durch Shell-Hintergrund-Erfassung) -- beim abschliessenden Cleanup-Check per `ps aux` entdeckt und korrekt beendet.
- `frontend/storybook-static/` war zu Beginn dieses Plans bereits mit `root`-Eigentuemerschaft vorhanden (vermutlich aus einem frueheren Docker-Lauf) und blockierte den ersten `npm run build-storybook`-Versuch mit `EACCES` -- per `sudo rm -rf` bereinigt, danach normaler Build als `d1sk`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alle 8 Befunde dieser Phase (19-26) sind jetzt sowohl automatisiert (Tests/Guards) als auch durch echten Browser-Pixel-Nachweis bestaetigt -- inklusive eines Befunds (SplitLayout-Selbstbezug), der ohne diesen Plan unentdeckt geblieben waere.
- Phase 192 ist inhaltlich vollstaendig abgeschlossen. Laut diesem Auftrags eigener Konvention (`CLAUDE.md`, Abschnitt "Autonome Auftraege (ki-run) auf Entwicklungsbranches") erfolgt kein Merge nach `main` durch den Executor selbst -- das bleibt der menschlichen Live-UAT-Freigabe am Ende des gesamten `ki-run`-Auftrags 261102-226d vorbehalten.
- Keine Blocker: voller Regressionslauf gruen (nur vorbestehende/umgebungsbedingte Fehlschlaege), Storybook-Build+Render-Smoke gruen, `git status`/`docker ps -a`/`git worktree list` final sauber.

## Self-Check: PASSED

All 5 modified files verified present on disk with the described changes; all 3 fix-commit hashes (`e868670c7`, `472e2a232`, `78bd112a8`) verified present in `git log`; `docker ps -a`, `docker images`, and `git worktree list` confirmed clean of all temporary verification infrastructure.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*
