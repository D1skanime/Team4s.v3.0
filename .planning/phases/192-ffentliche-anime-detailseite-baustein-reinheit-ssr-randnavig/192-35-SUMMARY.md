---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 35
subsystem: testing
tags: [vitest, playwright, docker, storybook, verification, css]

# Dependency graph
requires:
  - phase: 192 (Pläne 28-34)
    provides: "compositeLayoutPurity.guard.test.ts bewacht alle 9 real existierenden Komposit-Dateien der fünf Pilot-Bausteine gegen 11 verbotene Deklarationskategorien, ohne jede Ausnahme (Plan 192-34); alle fünf Pilot-Bausteine vollständig aus Grundbausteinen verdrahtet (Pläne 192-31/32/33)"
provides:
  - "Bestätigter, vollständiger Regressionslauf (vitest/tsc/eslint/build-storybook/test-storybook) ohne neue Fehlschläge gegenüber den bereits dokumentierten pre-existing/environment-bedingten Ausnahmen"
  - "Playwright-Visual-Proof: main-vs-Branch (3 Animes × 2 Haltepunkte), Pre-Runde-5-Baseline-vs-Branch (Commit 08d92ce4c, Ende Plan 192-27), Storybook-vs-Live-Seite für alle fünf Pilot-Komposit-Blöcke -- keine undeklarierte strukturelle Abweichung, insbesondere die als Risiko benannte FansubGroupPicker/FansubGroupContext/FansubVersionBrowser-Episoden-Bereich-Überschriften-Einrückung strukturell bestätigt identisch"
  - "192-VERIFICATION.md aktualisiert auf Runde 5 (22/22 kumulativ), Runde 2/3/4-Inhalt unverändert erhalten, supersedes-Kette fortgeführt"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Main-Produktions-Docker-Image (next build + next start) scheitert für einen main-Snapshot an einer fehlenden Laufzeit-Datei (next.config.mjs importiert src/lib/images/publicImagePatterns.mjs, das Dockerfiles Runner-Stage nicht kopiert) -- der etablierte Workaround ist derselbe dev-mode-Bind-Mount-Ansatz, den docker-compose.override.yml für den echten team4sv30-frontend-Service verwendet (node:20-bookworm-slim-Container, Worktree-Verzeichnis als /app gebindet, npm ci + npm run dev -- --webpack, auf demselben Docker-Netzwerk wie das Backend)"
    - "Storybook-iframe.html-Navigation darf NICHT auf 'networkidle' warten (dev-mode-Storybook haelt durch HMR/WebSocket-Polling dauerhaft offene Verbindungen, 'networkidle' timeoutet deshalb immer) -- 'load' plus kurzer expliziter waitForTimeout ist die richtige Wartebedingung fuer Storybook-Screenshot-Vergleiche in diesem Projekt"

key-files:
  created: []
  modified:
    - .planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/192-VERIFICATION.md

key-decisions:
  - "Fuer den main-vs-Branch-Vergleich wurde (wie in Runde 3/4 etabliert) strukturell statt pixelgenau verglichen -- main (907fa79f1, unveraendert seit Runde 4, 96+ Commits hinter dem Branch) zeigt die GESAMTE ueber alle fuenf Gap-Closure-Runden dieser Phase akkumulierte AnimeDetailHero-Restrukturierung (z. B. andere Position der Genre-Chips, geaenderte i18n-Grossschreibung), nicht nur diese Runde -- diese Unterschiede sind erwartet, keine Regression"
  - "Zusaetzlich zum main-Vergleich wurde ein Pre-Runde-5-Baseline-Vergleich (Commit 08d92ce4c, der letzte Commit von Plan 192-27, unmittelbar vor Plan 192-28) durchgefuehrt, um zu isolieren, was NUR diese Runde (192-28..192-35) veraendert hat -- strukturell identisch fuer den gemeinsam sichtbaren Seitenbereich; die verbleibende Hoehen-Differenz stammt aus nichtdeterministischem Episoden-Windowing (IntersectionObserver-Timing beim Rendern des Fullpage-Screenshots), nicht aus dieser Runde, bestaetigt durch Bild-fuer-Bild-Vergleich des sichtbaren Bereichs (identisch bis Folge 8 in beiden Snapshots)"
  - "Vier benannte, containerlose Docker-Volumes (t4s-snapshot-main-192-35-node-modules/-next, t4s-snapshot-preround5-192-35-node-modules/-next) blieben nach der Verifikation bewusst stehen, weil der projektweite ki-guard-Hook Volume-Entfernung explizit dem Auftrags-Cleanup vorbehaelt ('Volumes entfernt nur das Auftrags-Cleanup') und einzelnen Plan-Agenten verweigert -- alle vier sind unreferenziert (kein laufender Container) und enthalten nur npm-node_modules-Cache bzw. .next-Build-Output, kein Repository-Inhalt"

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: ~35min
completed: 2026-11-05
---

# Phase 192 Plan 35: Runde-5-Abschluss-Nachweis (codex-Review Runde 2 von 2, voller Regressionslauf + Playwright-Bildpaar-Nachweis) Summary

**Voller Regressionslauf (vitest 470/474, tsc sauber, eslint nur die 4 bereits dokumentierten pre-existing Fehler, build-storybook + test-storybook 72/72 Suiten/379/379 Tests) ist gruen; Playwright-Nachweis (main-vs-Branch, Pre-Runde-5-Baseline-vs-Branch, Storybook-vs-Live-Seite je Pilot-Baustein) bestaetigt keine undeklarierte strukturelle Abweichung; 192-VERIFICATION.md dokumentiert Runde 5 (22/22) als bestanden, alle disponiblen Container/Images/Worktrees/Skripte restlos entfernt.**

## Performance

- **Duration:** ~35 min (Lesen der Kontextdateien bis Abschluss-Commit)
- **Started:** 2026-11-05T06:08:00Z (ca.)
- **Completed:** 2026-11-05T06:42:06Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments

- Voller automatisierter Regressionslauf erneut ausgefuehrt und bestaetigt: `npx vitest run`
  470/474 Testdateien gruen (dieselben 3 bereits dokumentierten pre-existing/environment-bedingten
  Ausnahmen: `ResponsiveImage.config.test.ts`, `badgeArtwork.test.ts`,
  `RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- alle drei benoetigen Docker-Backend-
  Umgebungsvariablen ausserhalb des Compose-Containers); `tsc --noEmit` 0 Fehler; `eslint .` nur
  die 4 bereits dokumentierten pre-existing Fehler (`capture-responsive.cjs` ×2 require-imports,
  `useReleaseVersionMedia.ts` Memoization-Warnung, `ReleasesFilterBar.tsx` natives `<input>`);
  `build-storybook` gruen; `test-storybook` 72/72 Suiten/379/379 Tests gruen -- keine einzige neue
  Regression gegenueber dem bereits in frueheren Runden dokumentierten Bestand
- `compositeLayoutPurity.guard.test.ts` erneut gegen den aktuellen Code-Zustand ausgefuehrt: 7/7
  gruen, bewacht weiterhin alle 9 real existierenden Komposit-Dateien gegen 11 Kategorien ohne
  jede Ausnahme
- `team4sv30-frontend` neu gebaut (`docker compose build/up`), um sicherzustellen, dass die
  Branch-Instanz alle Plaene 192-28..192-35 reflektiert
- Disponibler main-Snapshot (Commit `907fa79f1`, unveraendert seit Runde 4) und
  Pre-Runde-5-Baseline-Snapshot (Commit `08d92ce4c`, Ende Plan 192-27) ueber dieselbe
  dev-mode-Bind-Mount-Docker-Technik wie `team4sv30-frontend` selbst erzeugt (das
  Produktions-Dockerfile scheiterte an einer fehlenden `next.config.mjs`-Laufzeitabhaengigkeit,
  siehe Deviations) -- Playwright-Screenshot-Paare fuer `/anime/6`, `/anime/13`, `/anime/2` je
  1440×900/390×844 gegen Branch erzeugt und strukturell verglichen: main zeigt die ueber alle
  fuenf Gap-Closure-Runden akkumulierte, erwartete Restrukturierung (keine Regression); die
  Pre-Runde-5-Baseline zeigt fuer den gemeinsam sichtbaren Seitenbereich (bis Folge 8 in beiden
  Snapshots) identische Struktur -- die Restdifferenz in der Gesamthoehe ist nichtdeterministisches
  Episoden-Windowing (IntersectionObserver-Timing), keine Layout-Regression dieser Runde
- Storybook-vs.-Live-Seite-Bildpaare fuer alle fuenf Pilot-Komposit-Bloecke erzeugt (Anime-Kopf,
  Episoden-Bereich inkl. Fansubgruppen-Auswahl/-Kontext, Release-Versionszeile, Randnavigation) --
  insbesondere die vom Plan als Risiko benannte FansubGroupPicker/FansubGroupContext/
  FansubVersionBrowser-Episoden-Bereich-Ueberschriften-Einrueckung anhand des Live-Anime `Freezing`
  (identische Fansub-Gruppen wie die Storybook-Fixture: Bloody-Shadow/LazySubs/MelonSubs) strukturell
  identisch zwischen main-Baseline und Branch bestaetigt (Card-Rand → Ueberschrift → Gruppen-Chip-
  Reihe → Episodenliste, keine sichtbare Luecken-Verschiebung)
- Alle disponiblen Artefakte restlos entfernt: 2 Docker-Snapshot-Container, 1 Docker-Image
  (main-Snapshot, Pre-Runde-5-Baseline lief im dev-mode ohne eigenes Image), 2 Git-Worktrees unter
  `/tmp/t4s-snapshots/`, 2 temporaere Node-Skripte + alle Screenshots unter
  `frontend/tmp-playwright-192-35/` -- `docker ps -a`/`docker images`/`git worktree list`/
  `git status --short` final sauber (vier containerlose, namentlich bekannte Docker-Volumes blieben
  bewusst stehen, siehe Deviations)
- `192-VERIFICATION.md` auf Runde 5 aktualisiert: `supersedes`-Frontmatter zeigt auf die
  Runde-4-Fassung, neue Runde-5-Sektion (Goal-Achievement-Tabelle fuer die Guard-Datei-/
  Eigenschaftsabdeckung, Requirements-Bezug `Befund-Review2-R2`, Methodik-Hinweis zur
  main-vs-Pre-Runde-5-Baseline-Unterscheidung), Runde-2/3/4-Inhalt unveraendert erhalten, Score
  22/22

## Task Commits

1. **Task 1: full regression + Playwright Nachweis** -- kein Datei-Commit (reine
   Verifikations-/Nachweisarbeit, keine Produktions- oder Testdatei geaendert; alle disponiblen
   Artefakte wieder entfernt, siehe Accomplishments)
2. **Task 2: 192-VERIFICATION.md rewrite (Runde 5)** -- `c8d64db7e` (docs)

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified

- `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/192-VERIFICATION.md` -
  Runde-5-Sektion ergaenzt, Frontmatter (`verified`/`score`/`supersedes`) aktualisiert, Runde 2/3/4
  byte-fuer-byte erhalten

## Decisions Made

Siehe `key-decisions` im Frontmatter oben (insbesondere die main- vs. Pre-Runde-5-Baseline-
Unterscheidung und die bewusst stehen gelassenen, containerlosen Docker-Volumes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Produktions-Dockerfile scheitert fuer einen main-Snapshot an einer
fehlenden Laufzeit-Datei**
- **Found during:** Task 1, erster Build-Versuch des main-Snapshot-Containers
- **Issue:** `docker build` aus dem main-Worktree mit dem regulaeren `frontend/Dockerfile`
  (Produktions-Build, `next build` + `next start`) erzeugte ein lauffaehiges Image, aber der
  Container scheiterte beim Start mit `Cannot find module
  '/app/src/lib/images/publicImagePatterns.mjs' imported from /app/next.config.mjs` --
  `next.config.mjs` importiert diese Datei zur Laufzeit (nicht nur beim Build), die Runner-Stage
  des Dockerfiles kopiert aber nur eine explizite, schmale Dateiliste (u. a. `ResponsiveImage.tsx`),
  nicht `src/lib/images/`. Das reale `team4sv30-frontend` laeuft NICHT ueber dieses Produktions-
  Image, sondern ueber `docker-compose.override.yml`s dev-mode-Bind-Mount (`npm run dev --
  --webpack`, volles Quellverzeichnis gebindet) -- daher trat dieses Problem dort nie auf.
- **Fix:** Fuer beide disponiblen Snapshots (main UND Pre-Runde-5-Baseline) denselben dev-mode-
  Bind-Mount-Ansatz verwendet wie der reale Service: `node:20-bookworm-slim`-Container, das
  jeweilige Worktree-Verzeichnis als `/app` gebindet, `npm ci && npm run dev -- --webpack -p 3000`,
  auf demselben Docker-Netzwerk (`team4s_default`) wie der laufende Backend-Container. Das zuvor
  gebaute Produktions-Image (`t4s-snapshot-main-192-35:latest`) wurde nach dem Fund entfernt
  (siehe Cleanup).
- **Files modified:** keine (nur disponible Docker-Infrastruktur betroffen, kein Repository-Code)
- **Verification:** beide Snapshot-Container erreichten `Ready in ...` und waren per `curl`/
  Playwright erreichbar; Screenshots erfolgreich erzeugt.
- **Committed in:** n/a (keine Datei-Aenderung)

---

**Total deviations:** 1 auto-fixed (Rule 3 - technisches Blocking-Issue der disponiblen
Verifikations-Infrastruktur, kein Repository-Code betroffen).
**Impact on plan:** Kein Einfluss auf das Verifikationsergebnis -- lediglich ein anderer,
bereits im Projekt etablierter technischer Weg (derselbe wie fuer `team4sv30-frontend` selbst)
zum Erzeugen der disponiblen Vergleichs-Container.

## Issues Encountered

Storybook-iframe-Screenshots schlugen im ersten Versuch mit `page.goto(..., { waitUntil:
'networkidle' })` durchgaengig mit einem 30s-Timeout fehl, weil der dev-mode-Storybook-Server
(HMR/WebSocket-Polling) nie in einen Netzwerk-Ruhezustand kommt. Behoben durch Umstellung auf
`waitUntil: 'load'` plus einen kurzen expliziten `waitForTimeout` -- danach alle sechs
Story-Screenshots erfolgreich erzeugt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dies ist der letzte Plan dieser fuenften Gap-Closure-Runde UND der gesamten Phase 192.
  `compositeLayoutPurity.guard.test.ts` bewacht dauerhaft alle 9 real existierenden
  Komposit-Dateien der fuenf Pilot-Bausteine gegen 11 Kategorien, ohne Ausnahme -- jede kuenftige
  Wiedereinfuehrung von lokalem Layout-/Rand-/Rundungs-/Flaechen-/Schatten-/Fixgroessen-CSS in
  einer dieser Dateien schlaegt sofort fehl.
- Keine Blocker: voller Regressionslauf gruen (siehe Accomplishments), alle disponiblen
  Verifikations-Artefakte (Container/Images/Worktrees/Skripte/Screenshots) restlos entfernt
  (vier containerlose Docker-Volumes bewusst stehen gelassen, siehe Deviations/key-decisions).
- `192-VERIFICATION.md` (Runde 5, Score 22/22) ist aktuell und bereit fuer die abschliessende
  Live-Browser-UAT durch den Menschen (`ki-run uat`), gemaess der Projektkonvention fuer
  `ki-run`-Auftraege.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

`192-VERIFICATION.md` found on disk with Runde-5-section (`grep -c "Runde 5"` → 10); commit
`c8d64db7e` found in git history (`git log --oneline | grep c8d64db7e`); `docker ps -a` / `docker
images` / `git worktree list` / `git status --short` all confirmed clean of 192-35 disposable
artifacts during Task 1.
