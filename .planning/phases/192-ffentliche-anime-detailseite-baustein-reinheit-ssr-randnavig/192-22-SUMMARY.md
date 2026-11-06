---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 22
subsystem: ui
tags: [react, typescript, css-container-queries, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-21)
    provides: Stack/Cluster/SplitLayout-Grundbausteine mit Zweck-Benennung, SplitLayouts etabliertes Zwei-Ebenen-Container-Query-Wrapper-Muster, 192-CONTEXT.md-Addendum 2026-11-05a (unabhängiger Review, Befund 1)
provides:
  - "Cluster.collapseBelow/gapCollapsed: kippt Cluster unterhalb 48rem/768px von einer horizontalen Zeile auf eine gestapelte Spalte mit eigenem Lücken-Zweck für den gestapelten Zustand (Fallback auf gap), container-query-getrieben"
  - "Cluster.float='controlBand': oberhalb 48rem/768px ein präzise auf dem Rand seines positionierten Vorfahren schwebendes position:absolute-Band mit korrekt gescoptem pointer-events (none auf der Wurzel, auto auf jedem direkten Kind), unterhalb davon eine normale, im Textfluss liegende Zeile"
  - "Neuer ClusterGapPurpose-Zweck 'independentBlocks' (geteilt mit Stacks gleichnamigem Zweck, gleiches --space-independent-blocks-Token)"
  - "Zwei neue layout.css-Zweck-Token (--overlay-offset-control-band, --overlay-height-control-band), Zero-Pixel-Diff auf --space-3/--control-height-md"
affects: [192-24, 192-25, 192-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clusters Zwei-Ebenen-Container-Query-Wrapper (container: cluster / inline-size auf einem äußeren Element, Flex-/Positionierungsverhalten auf einem inneren Kind) ist dasselbe Muster wie SplitLayout.module.css -- wird NUR gerendert, wenn collapseBelow oder float gesetzt ist, sonst bleibt Cluster das einzelne, unveränderte Element von vorher (Zero-Pixel-Diff für jeden bestehenden Aufrufer)"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.module.css
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "collapseBelow und float teilen sich denselben Zwei-Ebenen-Wrapper und denselben Container-Namen ('cluster') statt zweier getrennter Mechanismen -- beide Props sind unabhängig voneinander kombinierbar (durch Test abgedeckt), was künftige kombinierte Anwendungsfälle ohne weitere Grundbaustein-Änderung ermöglicht"
  - "'independentBlocks' wird NICHT als zweites, wertgleiches Token neu angelegt, sondern Clusters GAP_PURPOSE_TOKENS verweist auf dasselbe --space-independent-blocks, das Stack bereits nutzt -- layout.css-Kommentar entsprechend auf 'Stack UND Cluster' erweitert"
  - "float oberhalb des Haltepunkts behält Clusters Basis-display:flex bei (keine explizite Entfernung) -- da die realen Kinder (AdjacentNavigation variant='floating', die Vorschaukarte) sich selbst absolut positionieren, hat der Flex-Modus des Elternelements keinen sichtbaren Effekt auf sie; dies vereinfacht die Implementierung ohne das in der Plan-Spezifikation geforderte Verhalten (position:absolute/top/height/left/right/pointer-events) zu verändern"
  - "Zwei ASCII-Umlaut-Korrekturen und die Entfernung aller 'Review-Befund 1'-Verweise aus Cluster.tsx/.module.css-Kommentaren als Nachbesserungs-Commit (Rule 1), gefunden durch die bestehenden Guard-Tests processHistory.regression.test.ts (verbietet 'Befund N'-Verweise in components/ui) sowie CLAUDE.md's Umlautpflicht"

requirements-completed: [Befund-Review1]

# Metrics
duration: 9min
completed: 2026-11-05
---

# Phase 192 Plan 22: Cluster collapseBelow/gapCollapsed + float (Schwebe-Overlay-Modus) Summary

**Cluster unterstützt jetzt zwei container-query-getriebene Zusatzfähigkeiten -- eine Haltepunkt-Umkehr von Zeile auf gestapelte Spalte (`collapseBelow`/`gapCollapsed`) und einen schwebenden position:absolute-Overlay-Modus (`float="controlBand"`) -- beide strikt additiv/opt-in und noch nicht an Komposit-Dateien verdrahtet.**

## Performance

- **Duration:** ~9 min (Commit-zu-Commit, 00:51:41–01:00:23 UTC)
- **Started:** 2026-11-05T00:51:21Z (ca.)
- **Completed:** 2026-11-05T01:00:23Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN, plus eine Nachbesserung)
- **Files modified:** 6

## Accomplishments
- `Cluster` kennt jetzt `collapseBelow?: 'md'` + `gapCollapsed?: ClusterGapPurpose`: unterhalb 48rem/768px kippt die horizontale Zeile zu einer gestapelten Spalte mit eigenem Lücken-Zweck (Fallback auf `gap`, wenn `gapCollapsed` fehlt) -- löst künftig `AnimeDetailHero.module.css`s `.titleRow` und `ReleasePreviewRow.module.css`s `.row` ab (Verdrahtung folgt in Plänen 192-24/192-26)
- `Cluster` kennt jetzt `float?: 'controlBand'`: oberhalb 48rem ein präzise positioniertes, schwebendes `position:absolute`-Band mit korrekt gescoptem `pointer-events` (none auf der Wurzel, auto auf jedem direkten Kind), unterhalb davon eine normale Zeile -- löst künftig `AnimeDetailHero.module.css`s `.edgeNavigationOverlay` ab (Verdrahtung folgt in Plan 192-25)
- Beide Fähigkeiten nutzen denselben, aus `SplitLayout` übernommenen Zwei-Ebenen-Container-Query-Wrapper-Mechanismus und sind unabhängig voneinander kombinierbar
- Neuer `ClusterGapPurpose`-Zweck `'independentBlocks'`, der dasselbe `--space-independent-blocks`-Token wie Stack wiederverwendet (kein zweites, wertgleiches Token)
- Zwei neue `layout.css`-Zweck-Token (`--overlay-offset-control-band`/`--overlay-height-control-band`), gegen `AnimeDetailHero.module.css`s aktuelle `.edgeNavigationOverlay`-Regel nachgemessen und Zero-Pixel-Diff bestätigt (`var(--space-3)`/`var(--control-height-md)`, unverändert)
- Zwei neue Storybook-Stories ("Haltepunkt-Umkehr", "Schwebe-Overlay-Modus") mit Resize-Demos und deutscher Erklärung der jeweiligen realen Anwendungsfälle
- `docs/FRONTEND_ARCHITEKTUR.md`s Stack/Cluster/SplitLayout-Absatz dokumentiert beide neuen Fähigkeiten

## Task Commits

Each task was committed atomically (TDD RED/GREEN), plus eine nachgelagerte Korrektur:

1. **Task 1: Cluster collapseBelow/gapCollapsed (Haltepunkt-Umkehr)**
   - `204ca319a` (test) - RED: 4 neue Tests (independentBlocks-Zweck, Zero-Pixel-Diff ohne Props, Wrapper-Struktur, gapCollapsed-Auflösung/-Fallback)
   - `d4374b746` (feat) - GREEN: neuer Zweck + Props + Zwei-Ebenen-Wrapper in `Cluster.tsx`/`.module.css`, `layout.css`-Kommentar erweitert, neue Storybook-Story
2. **Task 2: Cluster float (Schwebe-Overlay-Modus); docs**
   - `5cc4f814c` (test) - RED: 3 neue Tests (Schwebe-Modifikatorklasse, Abwesenheit ohne float, Kombinierbarkeit mit collapseBelow)
   - `9724af725` (feat) - GREEN: `float`-Prop + CSS, zwei neue `layout.css`-Token, Storybook-Story, `docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung
   - `f6aa5fbb0` (fix) - Nachbesserung: ASCII-Umlaut-Korrekturen + Entfernung aller "Review-Befund 1"-Kommentarverweise (siehe Deviations)

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Cluster.tsx` - `collapseBelow`/`gapCollapsed`/`float`-Props, neuer `'independentBlocks'`-Zweck, Zwei-Ebenen-Wrapper-Rendering
- `frontend/src/components/ui/Cluster.module.css` - `.clusterQueryContainer`/`.collapsibleMd`/`.floatControlBand`-Klassen mit `@container cluster`-Abfragen
- `frontend/src/components/ui/Cluster.stories.tsx` - zwei neue Stories mit Resize-Demonstration
- `frontend/src/components/ui/Cluster.test.tsx` - 10 neue Testfälle (RED+GREEN über beide Tasks)
- `frontend/src/styles/tokens/layout.css` - zwei neue Zweck-Token, `--space-independent-blocks`-Kommentar auf Stack+Cluster erweitert
- `docs/FRONTEND_ARCHITEKTUR.md` - zwei neue Sätze im bestehenden Stack/Cluster/SplitLayout-Absatz

## Decisions Made
- Siehe `key-decisions` im Frontmatter oben (Wrapper-Teilung, Token-Wiederverwendung, Flex-Beibehaltung bei float, Nachbesserungs-Commit-Begründung)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Entfernte "Review-Befund 1"-Planungsverweise aus Cluster.tsx/.module.css-Kommentaren**
- **Found during:** Nach Task 2 GREEN, beim Ausführen der vollständigen `src/components/ui/`-Testsuite
- **Issue:** `processHistory.regression.test.ts` (bereits bestehender Guard-Test, verbietet "Befund N"-Verweise in `components/ui`-Produktionsdateien) schlug für `Cluster.tsx` und `Cluster.module.css` fehl -- die neuen Kommentare zu `collapseBelow`/`gapCollapsed`/`float` zitierten "Review-Befund 1 Erweiterung B/C" als Begründung
- **Fix:** Alle Planungsverweise entfernt, Kommentare bleiben rein fachlich (Verhalten/Zweck unverändert, siehe CLAUDE.md "Verboten in Code-Kommentaren")
- **Files modified:** `frontend/src/components/ui/Cluster.tsx`, `frontend/src/components/ui/Cluster.module.css`
- **Verification:** `processHistory.regression.test.ts` (237/237) grün
- **Committed in:** `f6aa5fbb0`

**2. [Rule 1 - Bug] ASCII-Umlaut-Korrektur im bereits angefassten layout.css-Kommentar**
- **Found during:** Task 1 GREEN, Selbstprüfung der neu geschriebenen Kommentare gegen CLAUDE.md's Umlautpflicht
- **Issue:** Die von mir erweiterte `--space-independent-blocks`-Kommentarzeile enthielt (teils geerbt aus dem Vorzustand, teils neu von mir geschrieben) ASCII-Ersatzschreibung (`unabhaengige`, `Inhaltsbloecke`, `Luecken`) statt echter Umlaute
- **Fix:** Auf korrekte Umlaute (`unabhängige`, `Inhaltsblöcke`, `Lücken`) sowie `Höhe`/`über`/`unverändert`/`größere` in den beiden neuen `layout.css`-Token-Kommentaren korrigiert
- **Files modified:** `frontend/src/styles/tokens/layout.css`
- **Verification:** visuelle Durchsicht + `git diff` grep auf verbleibende `ae`/`oe`/`ue`-Substitutionsmuster (nur Fehlalarme bei legitimen Wörtern wie "Steuerelement"/"aktuell" übrig)
- **Committed in:** `d4374b746` (Token-Kommentar), `f6aa5fbb0` (verbleibende Token-Wert-Zeile)

---

**Total deviations:** 2 auto-fixed (beide Rule 1, reine Kommentar-/Dokumentationskorrekturen, kein Verhaltensunterschied)
**Impact on plan:** Beide Korrekturen betreffen ausschließlich Kommentartext, keine Laufzeit-/Test-/Verhaltensänderung. Kein Scope-Creep -- beide wurden durch bereits bestehende, projekteigene Guard-Regeln/Konventionen erzwungen.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pläne 192-24 (`AnimeDetailHero.module.css`s `.titleRow`) und 192-26 (`ReleasePreviewRow.module.css`s `.row`) können jetzt `Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks"` einsetzen, um ihre lokale Zeile-zu-Spalte-Haltepunkt-Umkehr durch echte Grundbaustein-Komposition zu ersetzen
- Plan 192-25 (`AnimeDetailHero.module.css`s `.edgeNavigationOverlay`) kann jetzt `Cluster float="controlBand"` einsetzen und dabei den bisherigen lokalen `.edgeNavigationOverlay > * { pointer-events: auto; }`-Mechanismus vollständig entfernen
- Keine Blocker: `npx vitest run src/components/ui/Cluster.test.tsx` (13/13) und `npx tsc --noEmit` beide grün; `catalogTaxonomy.test.ts`, `gapPurposeNaming.guard.test.ts`, `compositeLayoutPurity.guard.test.ts` und `processHistory.regression.test.ts` bleiben unverändert grün. Der `compositeLayoutPurity.guard.test.ts`-Umbau (Entfernung von `DOCUMENTED_LAYOUT_EXCEPTIONS`) selbst ist NICHT Teil dieses Plans -- er folgt erst, nachdem alle 4 Grundbaustein-Erweiterungen (A/B/C/D aus dem Addendum) fertig UND in den Komposit-Dateien verdrahtet sind
- Ein vorbestehender, von dieser Phase unberührter Testfehler in `ResponsiveImage.config.test.ts` ("allows only the configured Team4s API media namespace for responsive group logos") wurde gegen den Basis-Commit `a50769f0d` (vor diesem Plan) via Einweg-Worktree gegengeprüft und reproduziert sich dort identisch -- nicht durch diesen Plan verursacht, nicht behoben (außerhalb des Scopes)

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 6 modified files found on disk; all 5 task commits (204ca319a, d4374b746, 5cc4f814c, 9724af725, f6aa5fbb0) found in git history.
