---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 31
subsystem: ui
tags: [react, typescript, css, design-tokens, layout-primitives, playwright]

# Dependency graph
requires:
  - phase: 192 (Plan 28)
    provides: Card padding-Zweckstufe 'section' (32px, --card-padding-section), 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2)
provides:
  - "Episoden-Bereich-Karte (AnimeEpisodesSection.tsx) bezieht ihre volle Innenabstand-Polsterung aus Card padding=\"section\" statt aus einer lokalen Klasse in page.episodes.module.css -- erste verdrahtete Aufrufstelle der in Plan 192-28 vorbereiteten Zweckstufe"
  - "page.episodes.module.css ist auf reine Selektor-Verdrahtung reduziert (keine eigene padding-/margin-Deklaration mehr) -- bereit fuer die Guard-Erweiterung in Plan 192-34"
  - "Der vormals zwischen zwei Dateien verstreute Seitenende-Abstand (contentArea padding-bottom + episodesSection margin-bottom, additiv 128px) ist in EINER Deklaration in page.module.css (.contentArea) konsolidiert, Betrag unveraendert"
affects: [192-34, 192-35]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seitenende-Abstand als bewusst verdoppelter --space-8-Wert (calc(var(--space-8) * 2)) in einer einzigen Seiten-CSS-Deklaration statt additiv ueber zwei Dateien verteilt -- derselbe Gesamtbetrag, aber EINE Quelle statt einer zufaelligen Addition aus Komposit-margin und Seiten-padding."

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/page.episodes.module.css
    - frontend/src/app/anime/[id]/AnimeEpisodesSection.tsx
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
    - frontend/src/app/anime/[id]/page.test.tsx

key-decisions:
  - "Gemessen statt angenommen: eine Playwright-Messung gegen die live laufende Seite (http://192.168.235.196:3000/anime/8) VOR der Aenderung zeigte einen Gesamtabstand von 128px zwischen dem unteren Kartenrand der Episoden-Bereich-Karte und dem Seitenende -- NICHT die vom Plan als 'wahrscheinlich' bezeichnete bereits-redundante 64px. Grund: ein Elternelement mit eigenem padding-bottom kollabiert NICHT mit dem margin-bottom seines letzten Kindes, die beiden --space-8-Werte (Karte margin-bottom + contentArea padding-bottom) waren additiv, nicht redundant."
  - "Da die Messung einen realen Unterschied ergab, wurde gemaess Plan-Interface-Schritt 2 'adjust .contentArea's own padding-bottom ... to preserve the exact total' umgesetzt: .contentArea's padding-bottom wurde von var(--space-8) auf calc(var(--space-8) * 2) verdoppelt (128px), waehrend padding-top unveraendert bei var(--space-8) bleibt (3-Werte-Padding-Shorthand: top | links-rechts | unten). Eine erneute Playwright-Messung NACH der Aenderung bestaetigte exakt denselben Gesamtabstand von 128px (Zero-Pixel-Diff)."
  - "page.episodes.module.css behaelt die .episodesSection-Klasse als leere, reine Selektor-Verdrahtung (statt die Datei komplett zu leeren oder den className-Prop am Card zu entfernen) -- vermeidet einen sonst ungenutzten CSS-Modul-Import in AnimeEpisodesSection.tsx und haelt die Datei als stabilen Erweiterungspunkt, falls ein kuenftiger seitenspezifischer Zusatz noetig wird."
  - "TDD-Testfall nutzt page.test.tsx's bestehenden elements()-Baum-Helfer (der AnimeEpisodesSection bereits spezialbehandelt und dessen gerenderten Card-Baum materialisiert) statt eine neue Testdatei anzulegen -- echte Verhaltens-Assertion gegen die Card-Props (padding='section'), kombiniert mit einer Abwesenheits-Pruefung der padding-/margin-Deklaration im CSS-Quelltext (zulaessige Ausnahme vom Teststil-Verbot, siehe CLAUDE.md)."

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: 9min
completed: 2026-11-05
---

# Phase 192 Plan 31: Episoden-Bereich-Card padding="section" + Seitenende-Abstand-Konsolidierung Summary

**AnimeEpisodesSection.tsx bezieht seine 32px-Innenabstand-Polsterung jetzt aus Cards wiederverwendbarem padding="section"-Zweck statt aus page.episodes.module.css; der vormals auf zwei Dateien additiv verteilte 128px-Seitenende-Abstand ist in einer einzigen page.module.css-Deklaration konsolidiert, Betrag per Playwright-Messung vor/nach als unveraendert bestaetigt.**

## Performance

- **Duration:** ~9 min (Commit-zu-Commit, 04:44:30-04:52:51 UTC; Messungen gegen die live laufende Dev-Instanz eingeschlossen)
- **Started:** 2026-11-05T04:49:00Z (ca.)
- **Completed:** 2026-11-05T04:52:51Z
- **Tasks:** 1 completed (TDD: RED→GREEN, kein REFACTOR noetig)
- **Files modified:** 5

## Accomplishments
- `AnimeEpisodesSection.tsx`s `<Card variant="publicSection">` traegt jetzt zusaetzlich `padding="section"` -- erste verdrahtete Aufrufstelle der in Plan 192-28 vorbereiteten, noch ungenutzten Card-Zweckstufe
- `page.episodes.module.css`s `.episodesSection` deklariert weder `padding` noch `margin-bottom` mehr -- nur noch eine leere Selektor-Verdrahtung mit erklaerendem Kommentar
- `page.module.css`s `.contentArea` traegt den vormals in der Karte liegenden `margin-bottom`-Betrag jetzt explizit selbst (`padding-bottom: calc(var(--space-8) * 2)`), mit Kommentar zur additiven Vorgeschichte und zum Befund-22-Bezug
- Realer Messwert (nicht angenommen): Gesamtabstand Kartenunterkante -> Seitenende war VOR der Aenderung 128px (additiv, nicht redundant wie vom Plan als wahrscheinlich vermutet) und ist NACH der Aenderung weiterhin exakt 128px -- beide Messungen per Playwright gegen `http://192.168.235.196:3000/anime/8` (echter Anime-Datensatz, ID 8)
- `gapPurposeNaming.guard.test.ts`s `guardedCallSiteFiles` um `AnimeEpisodesSection.tsx` erweitert
- Neuer Testfall in `page.test.tsx` prueft sowohl die tatsaechlich gerenderte Card-Prop (`padding === 'section'`, echte Verhaltens-Assertion ueber den bestehenden `elements()`-Baum-Helfer) als auch die Abwesenheit von `padding`-/`margin`-Deklarationen im CSS-Quelltext

## Task Commits

Each task was committed atomically (TDD RED/GREEN, kein REFACTOR noetig):

1. **Task 1: migrate .episodesSection to Card padding="section"; resolve margin-bottom placement**
   - `003bcc334` (test) - RED: neuer Testfall in `page.test.tsx` erwartet `padding="section"` auf der Episoden-Bereich-Card und die Abwesenheit von `padding`/`margin` in `page.episodes.module.css`
   - `6e10d6532` (feat) - GREEN: `padding="section"`-Prop ergaenzt, CSS-Deklarationen entfernt, `.contentArea`s `padding-bottom` verdoppelt, Guard-Dateiliste erweitert

**Nebenbei dokumentiert (kein Task-Commit):** `532f7750c` (docs) - Deferred-Item fuer eine vorbestehende, unberuehrte Kommentar-Staleness in `FansubVersionBrowser.tsx` (siehe Deviations)

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/AnimeEpisodesSection.tsx` - `Card` traegt zusaetzlich `padding="section"`
- `frontend/src/app/anime/[id]/page.episodes.module.css` - `.episodesSection` ohne eigene Deklaration (reine Selektor-Verdrahtung), Kommentar erklaert die Migration beider vormaligen Werte
- `frontend/src/app/anime/[id]/page.module.css` - `.contentArea`s `padding-bottom` auf `calc(var(--space-8) * 2)` verdoppelt (padding-top unveraendert), mit Kommentar zur additiven Vorgeschichte
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `AnimeEpisodesSection.tsx` zur bewachten Aufrufstellen-Liste hinzugefuegt
- `frontend/src/app/anime/[id]/page.test.tsx` - neuer Testfall fuer die Card-Prop und die CSS-Abwesenheitspruefung
- `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/deferred-items.md` - neues Deferred-Item dokumentiert (siehe Deviations)

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere die gemessene, nicht angenommene Bestaetigung, dass der vormalige 128px-Gesamtabstand additiv und NICHT bereits redundant war, und die daraus folgende Entscheidung, `.contentArea`s `padding-bottom` zu verdoppeln statt die Zeile ersatzlos zu streichen).

## Deviations from Plan

### Auto-fixed Issues

**1. [Scope-Boundary / Deferred, kein Auto-Fix] Vorbestehende Kommentar-Staleness in FansubVersionBrowser.tsx protokolliert statt korrigiert**
- **Found during:** Lesen des Kontexts um `.episodesSection` vor der Implementierung
- **Issue:** `FansubVersionBrowser.tsx` (Zeilen ~258-260) behauptet in einem Kommentar, es gebe weiterhin eine `.episodesSection h2`-Selektorregel in `page.episodes.module.css` -- diese Regel existierte bereits VOR diesem Plan nicht mehr in der Datei (per `git log -p` bestaetigt), die Staleness ist also nicht durch diesen Plan verursacht.
- **Fix:** Nicht korrigiert (Datei ist nicht Teil der `files_modified` dieses Plans) -- stattdessen in `deferred-items.md` dokumentiert, Rule-2/3-Scope-Boundary (nur Dateien, die der Auftrag ohnehin beruehrt).
- **Files modified:** `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/deferred-items.md`
- **Commit:** `532f7750c`

---

**Total deviations:** 1 dokumentiert, 0 Code-Aenderungen ausserhalb des Plan-Scopes
**Impact on plan:** Kein Einfluss auf dieses Plans Ziel; reine Dokumentation eines vorbestehenden, unberuehrten Fundes fuer eine kuenftige Beruehrung von `FansubVersionBrowser.tsx`.

## Issues Encountered

Der Plan selbst vermutete ("the expected, likely outcome"), dass `.contentArea`s bestehendes `padding-bottom` den Gesamtabstand bereits redundant alleine reproduziert. Die tatsaechliche Messung widerlegte das: CSS-Spezifikation zufolge kollabiert das `margin-bottom` eines Kindelements NICHT mit dem `padding-bottom` seines Elternelements (nur mit dessen `margin`, und nur wenn das Elternelement selbst KEIN `padding`/`border` traegt) -- die beiden `--space-8`-Werte waren tatsaechlich additiv (128px), nicht identisch (64px). Geloest durch Messung statt Annahme, wie vom Plan explizit gefordert ("do not guess, confirm via rendered measurement").

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-34 (Guard-Erweiterung) kann `page.episodes.module.css` jetzt ohne Ausnahme in die erweiterte Dateiliste aufnehmen -- die Datei deklariert keine der neu bewachten Eigenschaften (padding/margin/border/...) mehr.
- Plan 192-35 (Playwright-Bildpaare, finaler Zero-Pixel-Diff-Nachweis) kann sich auf die in diesem Plan bereits durchgefuehrte manuelle Playwright-Messung stuetzen (128px vor/nach identisch, Card-Padding 32px vor/nach identisch) -- keine erneute Recherche noetig, nur die formale Bildpaar-Erstellung.
- Keine Blocker: `npx vitest run "src/app/anime/[id]"` (28 Testdateien, 249 Tests) sowie `npx vitest run src/components/ui/Card.test.tsx src/components/ui/foreignVariableOverrides.regression.test.ts` (73 Tests) beide gruen; `npx tsc --noEmit` ohne Fehler.
- Ein vorbestehender, von dieser Phase unberuehrter Testfehler in `ResponsiveImage.config.test.ts` (bereits in frueheren Summaries dokumentiert, siehe `deferred-items.md` 192-02) besteht unveraendert fort -- nicht durch diesen Plan verursacht, nicht behoben (ausserhalb des Scopes).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 5 modified source files, the deferred-items.md update, and this SUMMARY.md found on disk; all 3 commits (003bcc334, 6e10d6532, 532f7750c) found in git history.
