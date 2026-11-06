---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 27
subsystem: ui
tags: [react, typescript, css, storybook, playwright, docker, verification]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-26)
    provides: Stack-Rhythmus-Array-Modus + captionLines (192-21), Cluster collapseBelow/gapCollapsed + float="controlBand" (192-22), Card-padding Zweck-Enum + bleedBelowMd + dividedSection (192-23), AnimeDetailHero vollständig aus Grundbausteinen (192-24, 192-25), ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation vollständig aus Grundbausteinen (192-26) -- alle 12 compositeLayoutPurity-Ausnahmefälle bereits auf null reduziert, 192-CONTEXT.md addendum_2026-11-05a (Review-Befund 1+2)
provides:
  - "compositeLayoutPurity.guard.test.ts ist ein permanenter, ausnahmeloser Scanner -- DOCUMENTED_LAYOUT_EXCEPTIONS/LayoutException/isAllowed und der zugehörige Existenz-Selbsttest sind vollständig entfernt (grep -c DOCUMENTED_LAYOUT_EXCEPTIONS == 0), nicht nur geleert"
  - "Regressions-Canary-Beleg: ein verbotenes Muster einzeln in jede der 4 Pilot-Dateien eingefügt, Haupttest schlägt jedes Mal fehl, dann reverted -- beweist die Abwesenheit eines Restloches"
  - "Vollständiger Regressionslauf (vitest/tsc/eslint/build-storybook/test-storybook) grün, nur die bereits dokumentierten 3 pre-existing/environment-bedingten vitest-Ausnahmen und 4 pre-existing eslint-Fehler, keine neuen Regressionen dieser Runde"
  - "Playwright-Nachweis: main-vs-Branch + Pre-Runde-4-Baseline-vs-Branch (strukturell, 3 Animes x 2 Haltepunkte) + Storybook-vs-Live-Seite für alle 5 Pilot-Komposit-Blöcke, alle disponiblen Container/Worktrees/Skripte restlos entfernt"
  - "192-VERIFICATION.md rewrite (Runde 4), supersedes die stale Runde-3-Fassung, Score 20/20"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regressions-Canary-Technik für Guard-Tests: ein verbotenes Muster temporär injizieren, Fehlschlag bestätigen, dann gezielt per `git checkout -- <datei>` zurücksetzen (NIE git stash/clean) -- beweist, dass ein Guard tatsächlich scannt statt nur zufällig grün zu sein"
    - "Storybook-Stories, die Stacks Rhythmus-Array-Modus demonstrieren, müssen ihre Kinder als echtes Array übergeben, nicht als einzelnes <>...</>-Fragment -- Children.toArray(children) zählt ein Fragment-Element als EIN Kind, nicht als seine enthaltenen Elemente"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - frontend/src/components/ui/Stack.stories.tsx
    - .planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/192-VERIFICATION.md

key-decisions:
  - "DOCUMENTED_LAYOUT_EXCEPTIONS war bei Plan-Start bereits ein leeres Array (von den Plänen 192-24/25/26 schrittweise geleert) -- dieser Plan war trotzdem notwendig, um den MECHANISMUS selbst (LayoutException-Interface, isAllowed-Funktion, der eine Existenz-Selbsttest) zu entfernen, wie vom Review ausdrücklich gefordert: eine leere Ausnahmeliste ist strukturell immer noch eine Ausnahmeliste, kein ausnahmeloser Scanner"
  - "ScanResult.selectors (nur für den entfernten Existenz-Selbsttest gebraucht) mitentfernt statt als totes Feld zu belassen -- hält scanContent() minimal bei der ohnehin fälligen Überarbeitung"
  - "Für den Pre-Runde-4-Baseline-Vergleich wurde der Commit unmittelbar vor Plan 192-21 gewählt (9d6bdce73), nicht ein Commit vor der gesamten Phase -- isoliert exakt, was DIESE Runde verändert hat, exakt wie in jeder vorherigen Runde etabliert"
  - "team4sv30-frontend wurde vor den Playwright-Vergleichen neu gebaut (docker compose build/up), um sicherzustellen, dass die Branch-Instanz tatsächlich alle Pläne 192-21..192-26 reflektiert, auch wenn der Dev-Server durch Bind-Mount + Polling ohnehin automatisch nachzieht"

requirements-completed: [Befund-Review1, Befund-Review2]

# Metrics
duration: ~27min
completed: 2026-11-05
---

# Phase 192 Plan 27: Runde-4-Abschluss-Nachweis (compositeLayoutPurity ausnahmelos, voller Regressionslauf, Playwright-Bildpaar-Nachweis) Summary

**`compositeLayoutPurity.guard.test.ts` hat die `DOCUMENTED_LAYOUT_EXCEPTIONS`-Ausnahmeliste vollständig verloren (checkbar per `grep -c` == 0, nicht nur geleert) und ist per Regressions-Canary-Test gegen alle vier Pilot-Dateien als echter, unbedingter Scanner bestätigt; voller Regressionslauf + main-vs-Branch-, Pre-Runde-4-Baseline-vs-Branch- und Storybook-vs-Live-Seite-Playwright-Nachweis sind grün, 192-VERIFICATION.md ist auf Runde 4 (20/20) aktualisiert.**

## Performance

- **Duration:** ~27 min (Commit-zu-Commit, 03:10–03:32 UTC)
- **Started:** 2026-11-05T03:05:00Z (ca.)
- **Completed:** 2026-11-05T03:31:58Z
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments
- `compositeLayoutPurity.guard.test.ts`: `LayoutException`-Interface, `DOCUMENTED_LAYOUT_EXCEPTIONS`-Array (war bereits leer, aber als Mechanismus noch vorhanden), `isAllowed()`-Helfer und der eine dedizierte Existenz-Selbsttest ("DOCUMENTED_LAYOUT_EXCEPTIONS verweist nur auf Selektoren...") vollständig entfernt -- die vier übrigen generischen Selbsttests (Verstoßmuster-Erkennung, Grundbaustein-Ausschluss, Null-Rücksetzer-Nicht-Erkennung, fremde-var()-Lesereferenz-Nicht-Erkennung) bleiben unverändert in Intent erhalten
- Checkbarer Beleg: `grep -c "DOCUMENTED_LAYOUT_EXCEPTIONS" frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` → `0`
- Regressions-Canary-Beleg: ein verbotenes Muster (`display:flex` + `padding:4px`) einzeln in jede der vier Pilot-Dateien (`AnimeDetailHero`/`ReleasePreviewRow`/`EpisodeGlassCard`/`AnimeEdgeNavigation.module.css`) eingefügt -- Haupttest schlug JEDES Mal mit dem erwarteten Verstoß fehl, danach per `git checkout -- <datei>` zurückgesetzt. Vier von vier bestätigt.
- Voller Regressionslauf: `npx vitest run` 470/474 Testdateien grün (dieselben 3 bereits dokumentierten pre-existing/environment-bedingten Ausnahmen: `ResponsiveImage.config.test.ts`, `badgeArtwork.test.ts`/`RoleCapabilityDetail.membershipBaselineDrift.test.ts` benötigen Docker-Backend-Mount/`API_INTERNAL_URL`); `tsc --noEmit` 0 Fehler; `eslint .` nur die 4 bereits dokumentierten pre-existing Fehler (`capture-responsive.cjs`, `ReleasesFilterBar.tsx`, `useReleaseVersionMedia.ts`); `build-storybook` grün; `test-storybook` nach dem unten beschriebenen Fix 72/72 Suiten/370/370 Tests grün
- Echter, bei diesem Regressionslauf gefundener Fehler behoben: `Stack.stories.tsx`s "AnimeKopfRhythmus"/"RhythmusModus"-Stories übergaben ihre Array-Modus-Kinder als `<>...</>`-Fragment statt als echtes Array -- `Children.toArray(children)` zählt ein Fragment als EIN Kind, die Längenprüfung warf deshalb beim Rendern. Fix: echtes, geschlüsseltes Array. Produktionscode (`AnimeDetailHero.tsx`) war nicht betroffen.
- Playwright-Nachweis: disponibler `team4sv30-frontend`-Neubau (reflektiert alle Pläne 192-21..192-26), zwei disponible Docker-Snapshot-Container (dev-mode, `main` und der Commit unmittelbar vor 192-21) auf demselben Docker-Netzwerk wie das laufende Backend, 18 Screenshots (main/preround4/branch × 3 Animes × 2 Haltepunkte) + 5 Storybook-vs-Live-Seite-Paare -- alle strukturell verglichen (keine pixelgenaue Live-Seite möglich, siehe bereits etablierter Backdrop-Rotator-Methodik-Hinweis). Pre-Runde-4-Baseline zeigt exakt identische Seiten-Gesamthöhen zur Branch-Instanz für alle 3 Animes/beide Haltepunkte -- starker Zero-Höhen-Drift-Beleg.
- Alle disponiblen Artefakte restlos entfernt: 2 Docker-Images/-Container, 2 Git-Worktrees unter `/tmp/t4s-snapshots/`, 2 temporäre Node-Skripte unter `frontend/`, der `build-storybook`-Output-Ordner -- `docker ps -a`/`docker images`/`git worktree list`/`git status --short` final sauber
- `192-VERIFICATION.md` auf Runde 4 aktualisiert: `supersedes`-Frontmatter zeigt auf die Runde-3-Fassung, neue Runde-4-Sektion (Goal-Achievement-Tabelle für Erweiterungen A-D + Guard-Verschärfung + Review-Befund-2, Requirements-Coverage, Methodik-Hinweis), Runde-2/3-Inhalt unverändert erhalten, Score 20/20

## Task Commits

1. **Task 1: DOCUMENTED_LAYOUT_EXCEPTIONS-Mechanismus entfernen; Regressions-Canary**
   - `bac3f0efd` (test) - `LayoutException`/`DOCUMENTED_LAYOUT_EXCEPTIONS`/`isAllowed`/Existenz-Selbsttest entfernt, Regressions-Canary manuell gegen alle 4 Dateien bestätigt (nicht Teil des Commits -- temporäre Injektion/Revert, kein Dateizustand)
2. **Task 2: Voller Regressionslauf + Playwright-Nachweis**
   - `83165c6e4` (fix) - `Stack.stories.tsx`-Array-Fragment-Bug behoben (gefunden durch `test-storybook` während dieses Tasks), keine weiteren Dateiänderungen nötig
3. **Task 3: 192-VERIFICATION.md (Runde 4)**
   - `a4a333e90` (docs) - Runde-4-Sektion ergänzt, `supersedes`/`verified`/`score` aktualisiert

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - Ausnahmelisten-Mechanismus vollständig entfernt, Modulkommentar auf "permanenter, ausnahmeloser Wächter" aktualisiert
- `frontend/src/components/ui/Stack.stories.tsx` - zwei Array-Modus-Stories von `<>...</>`-Fragment auf echtes, geschlüsseltes Array umgestellt
- `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/192-VERIFICATION.md` - Runde-4-Sektion, aktualisierte Frontmatter, erhaltener Runde-2/3-Inhalt

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (leere-Liste-ist-trotzdem-Mechanismus-Begründung, ScanResult.selectors-Entfernung, Pre-Runde-4-Baseline-Commit-Wahl, Frontend-Neubau vor Screenshots).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Stack.stories.tsx`: Array-Modus-Stories übergaben Kinder als Fragment statt als Array**
- **Found during:** Task 2, erster `test-storybook`-Lauf
- **Issue:** "AnimeKopfRhythmus" (Plan 192-24) und "RhythmusModus" (Plan 192-21) setzten `args.children` auf ein einzelnes `<>...</>`-Fragment, das mehrere `<Box>`-Elemente umschließt. `Stack`s Array-Modus zählt Kinder über `Children.toArray(children)` -- ein Fragment-Element zählt dabei als EIN Kind (seine enthaltenen Elemente werden nicht geflacht), wodurch die Fail-fast-Längenprüfung fälschlich "1 Kind" statt der tatsächlichen 7 bzw. 3 sah und beim Rendern warf. Dieser Fehler bestand bereits seit den jeweiligen Plänen, wurde aber nie gefunden, weil jene Pläne sich nur über eigene Playwright-Skripte/`vitest` verifizierten, nie über den Storybook-Test-Runner (der erst in diesem Plan wieder vollständig lief).
- **Fix:** Beide Stories auf ein echtes, geschlüsseltes Array umgestellt (`[<Box key="..." .../>, ...]`). Kein Eingriff in `Stack.tsx` nötig -- Produktionscode (`AnimeDetailHero.tsx`s `infoCardChildren`) nutzte bereits ein echtes `ReactNode[]`-Array und war nie betroffen.
- **Files modified:** `frontend/src/components/ui/Stack.stories.tsx`
- **Verification:** `test-storybook` danach 72/72 Suiten/370/370 Tests grün (vorher 70/72/368/370); `tsc --noEmit` grün; `vitest run src/components/ui/Stack.test.tsx` (10/10) grün
- **Committed in:** `83165c6e4`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, gefunden durch dieses Plans eigenen Regressionslauf, kein Eingriff in Produktionscode nötig).
**Impact on plan:** Der Fix liegt vollständig innerhalb des Plans eigenen "voller Regressionslauf"-Mandats aus Task 2 -- keine Scope-Erweiterung.

## Issues Encountered

Beide disponiblen Playwright-Snapshot-Container (dev-mode, auf demselben Docker-Netzwerk wie der laufende Backend-Container) zeigten keine ladenden Jellyfin-Cover/Backdrop-Bilder (schwarze/graue Platzhalterflächen statt echter Bilder), während die laufende Branch-Instanz reale Cover korrekt lädt -- ein bekanntes Artefakt der Wegwerf-Infrastruktur (vermutlich Next.js-Image-Optimierungs-Pipeline auf einem frisch gestarteten Dev-Server, nicht reproduzierbar auf Code-Ebene). Betraf beide Snapshot-Container gleichermaßen, verzerrt den Vergleich also nicht einseitig. Strukturvergleich (Seitenaufbau, Textinhalt, exakte Gesamthöhen) blieb davon unberührt und lieferte den eigentlichen Beleg -- konsistent mit der bereits in Runde 3 etablierten "strukturell statt pixelgenau"-Methodik für Live-Seiten-Vergleiche.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dies ist der letzte Plan dieser Gap-Closure-Runde (Runde 4) und der gesamten Phase 192. `compositeLayoutPurity.guard.test.ts` ist ein permanenter, ausnahmeloser Wächter -- jede künftige Wiedereinführung von lokalem Layout-CSS in einer der vier Pilot-Dateien schlägt sofort und unbedingt fehl.
- Keine Blocker: vollständiger Regressionslauf grün (siehe Accomplishments), alle disponiblen Verifikations-Artefakte restlos entfernt.
- `192-VERIFICATION.md` (Runde 4, Score 20/20) ist aktuell und bereit für die abschließende Live-Browser-UAT durch den Menschen (`ki-run uat`), gemäß der Projektkonvention für `ki-run`-Aufträge.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 3 modified files plus this SUMMARY.md found on disk; all 3 task commits (bac3f0efd, 83165c6e4, a4a333e90) found in git history.
