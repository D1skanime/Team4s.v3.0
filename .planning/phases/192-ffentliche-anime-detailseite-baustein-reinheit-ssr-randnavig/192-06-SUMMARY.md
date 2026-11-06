---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 06
subsystem: ui
tags: [react, css-modules, design-system, storybook, vitest]

# Dependency graph
requires:
  - phase: 192-01
    provides: "Cluster/Stack Layout-Grundbausteine (token-only, wrap={false} fuer nie-stapelnde Reihen)"
  - phase: 192-05
    provides: "SSR-Randnavigation (unabhaengiger Vorlaeufer in der Wave-Reihenfolge, keine direkte Code-Abhaengigkeit)"
provides:
  - "ReleasePreviewRow komponiert Avatar(e)+Textzeilen ueber Cluster(wrap=false)+Stack statt eines .content-Grid/.identity-Flex-Hand-Rolls"
  - "Zero-Avatar-Zweig rendert den Text-Stack ohne umschliessenden Cluster (kein reservierter Avatar-Spalten-Gap)"
  - "ReleasePreviewRow.test.tsx als Regressionsschutz fuer die Spaltenausrichtung (Befund 20)"
affects: [192-public-anime-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fuenf Textzeilen (Gruppenname/Release-Name/Technik/Extras/Datum) als EIN lokal gebauter JSX-Ausdruck (textLines), in beiden Avatar-Zweigen (vorhanden/leer) wiederverwendet statt dupliziert"
    - "Bedingtes Weglassen eines ganzen Wrapper-Elements (statt eines leeren Slots) fuer den Zero-Avatar-Fall, nach dem bestehenden ArtworkHero.tsx:58-Muster (`{roles ? <div>...</div> : null}`)"

key-files:
  created:
    - frontend/src/components/fansubs/ReleasePreviewRow.test.tsx
  modified:
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css

key-decisions:
  - "SplitLayout bewusst NICHT verwendet (CONTEXT.md-erlaubte Abweichung von der illustrativen UI-SPEC-Konsum-Karte): SplitLayouts Container-Query-Haltepunkt (768px/1024px) wuerde den Avatar bei der mandatierten 390px-Mobil-Breite ueber den Text stapeln -- eine echte visuelle Regression, die die Null-Pixel-Diff-Vorgabe verbietet. Cluster(wrap=false) hat keinen Stapel-Haltepunkt und reproduziert exakt das bisherige, immer nebeneinander stehende Layout."
  - "Die alte `.content`-CSS-Klasse wird nicht einfach weiterverwendet, sondern durch eine neu benannte `.body`-Klasse ersetzt (traegt weiterhin die flex:1-Wachstumsregel gegenueber `.action` auf Desktop-Breite) -- das Akzeptanzkriterium verlangt explizit die VOLLSTAENDIGE Entfernung der `.content`-Regel, nicht nur ihres Grid-Layouts."

patterns-established:
  - "Strukturelle (statt pixelgenaue) DOM-Tests fuer Spaltenausrichtung in jsdom: gleicher `parentElement` beweist 'gleiche Spalte', da jsdom kein echtes Layout berechnet -- Vorlage fuer kuenftige Layout-Regressionstests auf Cluster/Stack-Basis."

requirements-completed: [Befund-20]

# Metrics
duration: ~15min
completed: 2026-11-04
---

# Phase 192 Plan 06: Release-Zeilen-Einrückung (Befund 20) Summary

**`ReleasePreviewRow` komponiert Avatar(e) und alle Textzeilen jetzt über `Cluster(wrap=false)` + `Stack` statt eines `.content`-Grid/`.identity`-Flex-Hand-Rolls — Technik-/Extras-/Datumszeile liegen dadurch zwangsläufig in derselben Spalte wie Gruppenname/Release-Name, inklusive eines Cluster-freien Zero-Avatar-Zweigs.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-11-04T11:21:36Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 geändert, 1 neu)

## Accomplishments
- `ReleasePreviewRow.tsx` ersetzt das einspaltige `.content`-Grid (Ursache von Befund 20: Datenzeilen starteten auf Höhe der Avatar-Spalte) durch `Cluster gap="4" align="start" wrap={false}` (Avatar-Spalte + Text-Stack nebeneinander) mit einem EINEN, wiederverwendeten `textLines`-JSX-Ausdruck für alle fünf Textzeilen.
- Zero-Avatar-Fall (`fansub_groups.length === 0`) rendert den Text-Stack OHNE umschließenden Cluster — kein reservierter Avatar-Spalten-Gap, exakt nach dem in `192-RESEARCH.md` dokumentierten Pitfall-1-Vermeidungsmuster (Analogie zu `ArtworkHero.tsx:58`).
- Koop-Fall (zwei Logos) bekommt seine Spaltenbreite automatisch aus `Cluster`s natürlichem Flex-Verhalten — kein festes Einzel-Avatar-Maß.
- `.content`/`.identity`/`.identityText` vollständig aus dem CSS-Modul entfernt; eine neu benannte `.body`-Klasse trägt die bisherige `flex:1`-Wachstumsregel gegenüber `.action` auf Desktop-Breite weiter (das Akzeptanzkriterium verlangte die vollständige Entfernung der `.content`-Regel, nicht nur ihres Grid-Layouts).
- Neuer `ReleasePreviewRow.test.tsx` mit vier Verhaltenstests (alle drei mandatierten Storys plus der defensive Null-Gruppen-Fall), die die Spaltenausrichtung strukturell (gemeinsamer Stack-Elternknoten) statt über Pixel-Geometrie oder CSS-Modul-Klassennamen beweisen.

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure ReleasePreviewRow onto Cluster(wrap=false)+Stack, with the zero-avatar defensive branch** - `6a2363f30` (fix)
2. **Task 2: Create ReleasePreviewRow.test.tsx asserting column alignment across all three mandated story variants** - `9854955b7` (test)

**Plan metadata:** (siehe `docs(192-06)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - Avatar(e)+Textzeilen über `Cluster`/`Stack` komponiert, EIN wiederverwendeter `textLines`-Ausdruck, bedingtes Weglassen des Clusters im Zero-Avatar-Fall
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css` - `.content`/`.identity`/`.identityText` entfernt, neue `.body`-Klasse trägt die Desktop-`flex:1`-Regel weiter, `.logos` nur noch `flex-shrink: 0` (Rest jetzt von `Cluster` selbst gesetzt)
- `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx` - vier Verhaltenstests (Mit allen Extras/Koop/Ohne Logo/Null-Gruppen) für die Spaltenausrichtung

## Decisions Made
- `SplitLayout` bewusst nicht verwendet (siehe `key-decisions` oben) — `Cluster(wrap=false)` reproduziert das bisherige, nie stapelnde Avatar+Text-Layout exakt, `SplitLayout`s Haltepunkt hätte bei 390px eine echte visuelle Regression verursacht.
- `.content` wird nicht umbenannt-gleichbehalten, sondern durch eine neue `.body`-Klasse ersetzt, da das Akzeptanzkriterium (`grep -c "\.content\s*{" ... returns 0`) die vollständige Entfernung der Regel verlangt, nicht nur ihrer Grid-Deklaration.
- Testzugriffe auf den Gruppenname-Absatz nutzen `{ selector: 'p' }`, da `Avatar` seinen `label`-Text zusätzlich unsichtbar (VisuallyHidden) für Screenreader wiederholt — ohne Einschränkung fände `getByText` zwei identische Treffer.

## Deviations from Plan

None - plan executed exactly as written. Die beiden oben dokumentierten Entscheidungen (`.body` statt `.content`, `{ selector: 'p' }` in den Tests) sind Implementierungsdetails innerhalb der von `<action>`/`<behavior>` vorgegebenen Freiräume, keine Abweichung von einer verbindlichen Vorgabe.

## Issues Encountered
- `ReleasePreviewRow.stories.tsx`s `buildVersion()` ist nicht exportiert — wie im Plan als Alternative vorgesehen, wurde ein äquivalenter lokaler Builder in `ReleasePreviewRow.test.tsx` nachgebaut, exakt passend zu den drei Storys' `fansub_groups`-Formen.
- RTL normalisiert Mehrfach-Leerzeichen auf eines; der `extrasLine`-Textabgleich im Test musste entsprechend angepasst werden (keine Code-Änderung nötig, nur der Testerwartungswert).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alle drei in `192-CONTEXT.md` als "Pilot-Bausteine dieser Seite" genannten Release-Zeilen-Anforderungen (Mit allen Extras/Koop/Ohne Logo) sind strukturell verifiziert.
- Offen für die VERIFICATION-Phase dieses Phasen-Auftrags: die laut `192-CONTEXT.md` "Specific Ideas" geforderten Playwright-Bildpaare (main vs. Branch, `/anime/6`/`/anime/13`/`/anime/2`, je 1440×900 und 390×844) sind nicht Teil dieses Einzelplans — sie gehören zur phasenweiten Abschlussverifikation, nicht zu Plan 06 selbst.
- Keine Blocker: `catalogTaxonomy.test.ts`/`foreignVariableOverrides.regression.test.ts` bleiben unverändert grün, `tsc --noEmit`/`eslint` zeigen keine neuen Fehler in den drei angefassten Dateien (die vorbestehenden, unveränderten `.storybook/mocks/handlers.ts`-TS-Fehler sind nicht Teil dieses Plans).

## Self-Check: PASSED

All 3 created/modified files verified present on disk; both task commit hashes (`6a2363f30`, `9854955b7`) verified present in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*
