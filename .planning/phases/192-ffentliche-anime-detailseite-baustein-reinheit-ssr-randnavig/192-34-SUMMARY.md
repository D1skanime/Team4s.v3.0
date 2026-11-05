---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 34
subsystem: testing
tags: [vitest, css, static-analysis, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 28-33)
    provides: "Alle fünf Pilot-Bausteine (Anime-Kopf, Episoden-Bereich, Gruppenkarte/-auswahl, Release-Zeile, Randnavigation) wurden gegen die in Plan 192-28/192-29/192-30 vorbereiteten Grundbaustein-Erweiterungen verdrahtet (Card padding/seamless/widthPurpose, Avatar bordered/size, ResponsiveImage roundedThumbnail, Stack/Cluster Rhythmus-Modi) -- alle neun real existierenden Komposit-Dateien waren vor diesem Plan bereits frei von den hier erweiterten verbotenen Eigenschaften"
provides:
  - "compositeLayoutPurity.guard.test.ts bewacht jetzt alle neun real existierenden Komposit-Dateien der fünf Pilot-Bausteine (zuvor nur vier) gegen 11 verbotene Deklarationskategorien (zuvor 7): display:flex/grid, flex-direction, grid-template, gap, padding, margin, foreign-grundbaustein-variable, border, border-radius, background, box-shadow, width-height -- jede neue Kategorie mit derselben Reset-/Lesereferenz-Exemptionsrigor wie das bestehende padding/margin-Muster"
  - "Empirisch bestätigt (nicht angenommen): alle neun Dateien sind unter dem erweiterten Eigenschafts-Satz bereits vollständig verstoßfrei -- Plan 192-34 musste keine einzige Produktionsdatei ändern, nur den Wächter selbst erweitern"
  - "docs/FRONTEND_ARCHITEKTUR.md beschreibt den Wächter jetzt korrekt (9 Dateien, 11 Kategorien, keine Ausnahmeliste) statt des veralteten, vor Plan 192-27 liegenden Standes (4 Dateien, pro-Selektor begründete Ausnahmeliste)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generalisierte Reset-Exemption-Helfer (isAllExemptDeclaration) neben dem bestehenden isAllZeroDeclaration-Muster: border akzeptiert none/all-zero/transparent, background akzeptiert transparent/none/inherit, box-shadow akzeptiert none, width/height akzeptieren 100%/auto/0/min-content/max-content/eine reine var()-Referenz -- border-radius bildet bewusst die einzige Kategorie ohne jede Ausnahme (Rundungs-Entscheidung gehört immer in den Grundbaustein)"
    - "min-width/max-width/min-height/max-height werden über ein negatives Lookbehind auf der Eigenschafts-Regex selbst ausgeschlossen (nicht über eine Werte-Ausnahme) -- sie drücken flexible Grenzen aus, keine feste Größe"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Zwei echte TDD-Zyklen statt eines einzigen großen Umbaus: Task 1 widerte zuerst NUR die Eigenschafts-Kategorien (GUARDED_COMPOSITE_FILES blieb bei den ursprünglichen 4 Dateien), um das Regressionsrisiko der neuen Regex-Muster isoliert gegen bereits bekannt-konforme Dateien zu prüfen, bevor Task 2 die Dateiliste auf 9 erweiterte -- entspricht exakt der im Plan vorgegebenen Reihenfolge."
  - "Beide RED-Schritte wurden real verifiziert (temporärer Rückbau auf den Vor-Implementierungs-Stand, Testlauf bestätigt Fehlschlag, erst danach GREEN-Implementierung), nicht nur angenommen -- Task 1s RED prüfte die neuen Kategorie-Erkennungen gegen ein Beispiel-Sample, Task 2s RED prüfte die Dateiliste gegen die erwarteten 9 Schlüssel."
  - "border-width/border-color/border-style werden von der neuen border-Kategorie bewusst NICHT erfasst (das optionale Richtungs-Suffix der Regex deckt nur -top/-right/-bottom/-left ab) -- AnimeDetailHero.module.css's bestehendes, weiterhin legitimes `border-width: 0;` bleibt dadurch unverändert unverstoßen; zusätzlich ist der Wert \"0\" auch für die width-height-Kategorie exempt, falls die Eigenschafts-Regex dort zufällig mitträfe."
  - "Kein einziger Produktionscode musste geändert werden: die empirische Prüfung aller neun Dateien gegen den vollständig erweiterten Eigenschafts-Satz (vor Finalisierung der Haupt-Assertion einzeln gegengelesen, nicht nur per Testlauf angenommen) ergab sofort eine leere Verstoßliste -- Plan 192-31/192-32/192-33 hatten jede reale Verstoßstelle bereits vollständig geschlossen."

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: ~5min
completed: 2026-11-05
---

# Phase 192 Plan 34: Guard-Erweiterung (Runde-5-Gap-Closure, codex-Review Runde 2) Summary

**compositeLayoutPurity.guard.test.ts bewacht jetzt alle neun real existierenden Komposit-Dateien der fünf Pilot-Bausteine (zuvor vier) gegen 11 verbotene Deklarationskategorien statt 7 (neu: display:grid, border, border-radius, background, box-shadow, feste width/height) -- empirisch bestätigt mit einer leeren Verstoßliste, ohne dass ein einziges Produktions-CSS geändert werden musste.**

## Performance

- **Duration:** ~5 min (Commit-zu-Commit, 05:59:00-06:04:46 UTC)
- **Started:** 2026-11-05T05:59:00Z (ca.)
- **Completed:** 2026-11-05T06:04:46Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN, mit echter RED-Verifikation)
- **Files modified:** 2

## Accomplishments
- `FORBIDDEN_PATTERNS` um fünf neue Kategorien erweitert: `display` (jetzt flex UND grid), `border`, `border-radius` (bewusst ausnahmelos), `background`, `box-shadow`, `width-height` -- jede mit eigenem, zum bestehenden `isAllZeroDeclaration`-Muster passenden Reset-Exemptionshelfer
- `GUARDED_COMPOSITE_FILES` um die fünf vom unabhängigen Review (Runde 2) namentlich benannten Dateien erweitert: `FansubVersionBrowser.module.css`, `FansubGroupContext.module.css`, `FansubGroupPicker.module.css`, `page.episodes.module.css`, `WatchlistAddButton.module.css` -- Gesamtzahl von 4 auf 9
- Jede der neuen und der drei bereits bestehenden Selbst-Tests um die neuen Kategorien erweitert (historisches Verstoßmuster, Null-/Transparenz-Rücksetzer, var()-Lesereferenz) sowie zwei neue Selbst-Tests ergänzt (Dateilisten-Vollständigkeit, width/height-spezifische var()-Exemption vs. echte Verstoß-Kombination)
- **Discovery-Ergebnis des Plans (Task 1s expliziter Auftrag):** die manuelle Zeilen-für-Zeilen-Durchsicht aller neun Dateien gegen den vollständig erweiterten Eigenschafts-Satz VOR der Implementierung ergab keinen einzigen echten, noch offenen Verstoß -- alle scheinbar relevanten Treffer (`border-width: 0`, `width: var(--media-frame-poster-width)`, `width: 100%`, `min-width: 0`, `max-width: min(100%, 260px)` usw.) fielen bereits unter eine der vorgesehenen Reset-/Lesereferenz-Ausnahmen oder unter die min-/max-Ausschlussregel
- `docs/FRONTEND_ARCHITEKTUR.md`s veraltete Beschreibung des Guards (4 Dateien, pro-Selektor begründete Ausnahmeliste aus der Zeit vor Plan 192-27) auf den aktuellen 9-Dateien/11-Kategorien-Stand ohne jede Ausnahme korrigiert, inklusive der expliziten, begründeten Nichtaufnahme von `StatusBadge`/`AnimeRelations`/`AnimeBackdropRotator.module.css`

## Task Commits

Each task was committed atomically (beide TDD RED/GREEN, mit echter RED-Verifikation):

1. **Task 1: widen FORBIDDEN_PATTERNS with exemption rigor; dry-run discovery against current file state**
   - `51e1638ab` (test) - RED: neuer Selbst-Test erwartet die Kategorien `display`/`border`/`border-radius`/`background`/`box-shadow`/`width-height`, real gegen die unveränderten `FORBIDDEN_PATTERNS` als fehlschlagend bestätigt (`expected [] to include 'display'`)
   - `88124c543` (feat) - GREEN: fünf neue Kategorien samt Exemptionshelfern implementiert, `GUARDED_COMPOSITE_FILES` bewusst noch bei den ursprünglichen 4 Dateien gehalten (isoliertes Regressionsrisiko), bestehende Selbst-Tests entsprechend erweitert
2. **Task 2: widen GUARDED_COMPOSITE_FILES to all 9; confirm empty violation list; update stale docs**
   - `f0f7ebd2b` (test) - RED: neuer Selbst-Test erwartet 9 bewachte Dateischlüssel, real gegen die noch 4-elementige Liste als fehlschlagend bestätigt
   - `a12ba8a1e` (feat) - GREEN: die fünf neuen Dateien ergänzt, Haupt-Verstoßtest läuft sofort mit leerer Liste durch, `docs/FRONTEND_ARCHITEKTUR.md` korrigiert

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - 9 bewachte Dateien, 11 verbotene Kategorien, 5 neue Reset-Exemptionshelfer, 7 Selbst-Tests (2 neu)
- `docs/FRONTEND_ARCHITEKTUR.md` - Guard-Beschreibung auf den aktuellen Stand korrigiert (9 Dateien, 11 Kategorien, keine Ausnahmeliste, explizite Nichtaufnahme-Begründung für StatusBadge/AnimeRelations/AnimeBackdropRotator)

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere die bewusste Zweiteilung in zwei isolierte TDD-Zyklen, die reale RED-Verifikation beider Zyklen, und die Begründung, warum `border-width`/`border-color`/`border-style` von der neuen `border`-Kategorie unberührt bleiben).

## Deviations from Plan

None - plan executed exactly as written. Der Plan verlangte explizit eine Discovery-Phase ("run the widened scanner, inspect every reported violation") -- diese wurde durchgeführt (siehe Accomplishments), ergab aber keinen einzigen echten, noch offenen Verstoß, der eine Fix-Entscheidung (Rule 1-4) erfordert hätte. Keine Produktionsdatei außerhalb des Guards selbst musste geändert werden.

## Issues Encountered

Keine. Die im Plan als Risiko benannte Möglichkeit, dass die Eigenschafts-Erweiterung in Task 1 bereits gegen die ursprünglichen 4 Dateien einen neuen, bislang unentdeckten Verstoß aufdecken könnte, trat nicht ein -- alle vier Dateien waren bereits unter dem erweiterten Satz verstoßfrei (bestätigt durch den Task-1-GREEN-Testlauf vor der Dateilisten-Erweiterung).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `compositeLayoutPurity.guard.test.ts` ist jetzt ein permanenter, ausnahmeloser Rückfall-Wächter für alle neun real existierenden Komposit-Dateien der fünf Pilot-Bausteine -- jede künftige Änderung an einer dieser Dateien, die eine der 11 verbotenen Eigenschaften neu einführt, schlägt sofort fehl, ohne Rückfallmöglichkeit auf eine Ausnahmeliste.
- Keine Blocker: `npx vitest run "src/app/anime/[id]/compositeLayoutPurity.guard.test.ts"` (7/7) und `npx tsc --noEmit` beide grün; voller Sweep über `src/app/anime/[id]`, `src/components/fansubs`, `src/components/anime`, `src/components/watchlist`, `src/components/ui` (122 Testdateien, 1478 Tests) zeigt nur den bereits in `192-28`/`192-29`-SUMMARY.md dokumentierten, vorbestehenden, von dieser Phase unberührten Fehlschlag (`ResponsiveImage.config.test.ts` -- fehlende Umgebungsvoraussetzung außerhalb des Compose-Containers); `processHistory.regression.test.ts` (238/238) und `storyDisplayNames.german.test.ts` (1167/1167) ebenfalls grün.
- Diese fünfte Gap-Closure-Runde (codex-Review Runde 2 von 2) ist damit inhaltlich abgeschlossen -- beide vom Review genannten Befunde (Dateiabdeckung und Eigenschaftsabdeckung) sind geschlossen und dauerhaft durch einen Test-Wächter abgesichert.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

Both modified files (`frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts`,
`docs/FRONTEND_ARCHITEKTUR.md`) and this SUMMARY.md found on disk; all 4 task commits
(`51e1638ab`, `88124c543`, `f0f7ebd2b`, `a12ba8a1e`) found in git history.
