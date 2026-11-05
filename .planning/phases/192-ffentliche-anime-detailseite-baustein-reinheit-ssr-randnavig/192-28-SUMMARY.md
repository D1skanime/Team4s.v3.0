---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 28
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-27)
    provides: Card.padding-Zweck-Enum ('content'/'nestedBlock'/'dividedSection'/'none'), bleedBelowMd-Rand-bis-Rand-Modus, 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2 von 2)
provides:
  - "Card.padding gewinnt zwei weitere Zweck-Werte: 'section' (32px, voller Innenabstand eines eigenständigen Seitenabschnitts) und 'contextCard' (24px, Innenabstand einer eigenständigen Kontext-/Hinweiskarte) -- beide noch an keiner Aufrufstelle verdrahtet, bereit für Plan 192-31 (page.episodes.module.css) bzw. 192-33 (FansubGroupContext.module.css)"
  - "Neuer Card widthPurpose?: 'compactPreview'-Prop (setzt --card-width-override, gelesen von Cards Basisregel über var(--card-width-override, auto)) für eine auf min(260px, 90vw) begrenzte Vorschaukarte -- noch nicht verdrahtet, bereit für Plan 192-32 (AnimeEdgeNavigation.module.css)"
  - "Neuer Card seamless?: boolean-Prop (Modifikatorklasse .cardSeamless, zeroed border-width/border-radius/background jeder Variante) als real geprüfte, benannte Auflösung für EpisodeGlassCards lokalen .versionList-Override -- noch nicht verdrahtet, bereit für Plan 192-32 (EpisodeGlassCard.module.css)"
affects: [192-31, 192-32, 192-33]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "widthPurpose folgt exakt demselben Override-Hook-Muster wie padding/tintHue: CardWidthPurpose-Enum + WIDTH_PURPOSE_TOKENS-Lookup-Tabelle, gesetzt als --card-width-override, gelesen von Cards Basisregel per var(--card-width-override, auto) -- EIN gemeinsames Muster für jeden generischen, werte-tragenden Override-Hook"
    - "seamless folgt exakt demselben Modifikatorklassen-Muster wie bleedBelowMd: eine boolesche Prop kann keine reine CSS-Custom-Property sein, weil eine Custom Property nur einen WERT liefert, aber keine Selektor-Deklaration (border-radius/border-width) bedingt AN-/ABSCHALTEN kann -- die Klasse wird nur gerendert, wenn die Prop gesetzt ist, und steht bewusst NACH allen Varianten-Klassen in der CSS-Datei, damit sie bei gleicher Selektor-Spezifität per Deklarationsreihenfolge zuverlässig gewinnt"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Card.tsx
    - frontend/src/components/ui/Card.module.css
    - frontend/src/components/ui/Card.stories.tsx
    - frontend/src/components/ui/Card.test.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts

key-decisions:
  - "Neue 32px-Padding-Stufe heißt 'section' (CardPaddingPurpose), bewusst dokumentiert als unabhängig von CardVariants gleichnamigem 'section'-Mitglied (.cardSection, eine reine Hintergrundfarb-Variante) -- keine TypeScript-Kollision (verschiedene Props: padding vs. variant), aber im Doc-Kommentar explizit von beiden Lesarten abgegrenzt, wie vom Plan verlangt"
  - "Neue 24px-Padding-Stufe heißt 'contextCard' (nicht nach dem Aufrufer FansubGroupContext benannt), beschreibt den wiederverwendbaren Zweck 'Innenabstand einer eigenständigen Kontext-/Hinweiskarte' wörtlich aus dem Addendum übernommen"
  - "Breiten-Mechanismus: var(--card-width-override, auto), gelesen von EINER neuen Zeile in Cards Basisregel .card -- NICHT als Modifikatorklasse, weil (anders als bei border-radius/seamless) ein fester Breitenwert sich problemlos als reiner CSS-Variablen-Default ausdrücken lässt (keine Selektor-AN-/ABSCHALTUNG nötig, nur ein Wert). auto als Fallback ist Zero-Pixel-Diff, weil section (block-level) ohnehin implizit width:auto hat, wenn keine width-Deklaration existiert"
  - "EpisodeGlassCard-Konflikt (Addendum Punkt 4) nach DIREKTEM Vergleich entschieden, nicht geraten: Card.module.css's .cardNested setzt NUR border-color:transparent (border-width bleibt 1px, border-radius bleibt var(--radius-surface)=4px, vererbt von .card); .cardNestedFlat setzt border-radius explizit auf var(--radius-surface) (4px, sichtbar) und hat einen eigenen Hintergrund -- KEINE bestehende Variante erreicht gleichzeitig border-width:0 UND border-radius:0 UND background:transparent, die .versionList aktuell lokal via drei Deklarationen erzwingt. Da box-sizing:border-box global gilt (src/styles/base.css), ändert ein 1px-transparenter Rahmen die Inhaltsfläche um 2px gegenüber border-width:0 -- real messbar, kein rein kosmetischer Unterschied. Lösung (b) aus dem Plan gewählt: neuer, minimaler seamless-Prop (Modifikatorklasse) statt Wiederverwendung einer bestehenden Variante"
  - "seamless-Modifikatorklasse bewusst NACH .cardFlat/.cardNested/.cardNestedFlat im CSS-Quelltext platziert (per Testfall geprüft) -- bei identischer Selektor-Spezifität (jeweils eine einzelne Klasse) gewinnt die später deklarierte Regel; Plan 192-32 kann seamless deshalb mit JEDER bestehenden Variante kombinieren, nicht nur mit variant=\"flat\""

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: 5min
completed: 2026-11-05
---

# Phase 192 Plan 28: Card padding-Zweckstufen 'section'/'contextCard' + Breiten-Zweck + randloser Modus Summary

**Card gewinnt vier rein additive Fähigkeiten (zwei neue padding-Zweckstufen, einen widthPurpose-Override-Hook, einen seamless-Modifikator) als vorbereitete, noch unverdrahtete Bausteine für Runde 5 der Baustein-Reinheits-Gap-Closure.**

## Performance

- **Duration:** ~5 min (Commit-zu-Commit, 04:23:15-04:27:47 UTC)
- **Started:** 2026-11-05T04:22:49Z (ca.)
- **Completed:** 2026-11-05T04:27:47Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN)
- **Files modified:** 7

## Accomplishments
- `CardPaddingPurpose` gewinnt `'section'` (32px, `--card-padding-section`) und `'contextCard'` (24px, `--card-padding-context-card`), beide mit deutschem Zweck-Kommentar gegenüber jedem bestehenden Zweck abgegrenzt
- Neuer `widthPurpose?: 'compactPreview'`-Prop (`--card-width-compact-preview: min(260px, 90vw)`) nach exakt demselben Override-Hook-Muster wie `padding`/`tintHue`
- Neuer `seamless?: boolean`-Prop als real geprüfte, benannte Auflösung für `EpisodeGlassCard`s lokalen `.versionList { border-width: 0; border-radius: 0; background: transparent; }`-Override -- direkte Nachprüfung bestätigte, dass KEINE bestehende Card-Variante (`nested`/`nestedFlat`/`flat`) diese drei Werte gleichzeitig erreicht
- `gapPurposeNaming.guard.test.ts`s `allowedSample` um beide neuen Padding-Zweck-Werte erweitert, damit der Guard seine eigene Positiv-Gegenprobe aktuell hält
- Vier neue Storybook-Stories dokumentieren jede Fähigkeit anhand ihres wiederverwendbaren Einsatzzwecks statt der konkreten Aufrufstelle; `docs/FRONTEND_ARCHITEKTUR.md`s Card-Absatz dokumentiert alle vier
- Nichts davon ist in diesem Plan an eine Komposit-Datei verdrahtet (laut Plan-Objective) -- Verdrahtung folgt in den Plänen 192-31 (`section`), 192-32 (`widthPurpose`/`seamless`) und 192-33 (`contextCard`)

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: Card padding purposes 'section' + context-card (24px)**
   - `962625719` (test) - RED: neuer `Card.test.tsx`-Fall für beide neuen Zweck-Token, `gapPurposeNaming.guard.test.ts`s `allowedSample` erweitert
   - `7f0216f73` (feat) - GREEN: `CardPaddingPurpose`/`PADDING_PURPOSE_TOKENS` in `Card.tsx` um beide Werte erweitert, zwei neue Token in `layout.css`, zwei neue Storybook-Stories
2. **Task 2: Card compact-preview width purpose; EpisodeGlassCard radius-free resolution; docs**
   - `3d7fcd7d1` (test) - RED: 3 neue Testfälle (Zero-Diff + Wert-Test für `widthPurpose`, Zero-Diff + Klassen-Test für `seamless`, CSS-Quelltext-Prüfung der `.cardSeamless`-Regel UND ihrer Deklarationsreihenfolge)
   - `82b97a033` (feat) - GREEN: `CardWidthPurpose`/`WIDTH_PURPOSE_TOKENS` + `widthPurpose`-Prop, `seamless`-Prop + `.cardSeamless`-Modifikatorklasse (platziert nach `.cardFlat`/`.cardNested`/`.cardNestedFlat`), neuer `--card-width-compact-preview`-Token, zwei neue Storybook-Stories, `docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Card.tsx` - `CardPaddingPurpose` um `'section'`/`'contextCard'` erweitert, neuer `CardWidthPurpose`-Typ + `WIDTH_PURPOSE_TOKENS`, neue `widthPurpose`/`seamless`-Props
- `frontend/src/components/ui/Card.module.css` - `.card`-Basisregel liest `width` über `var(--card-width-override, auto)`, neue `.cardSeamless`-Modifikatorklasse nach den drei betroffenen Varianten
- `frontend/src/components/ui/Card.stories.tsx` - vier neue Stories (zwei Padding-Zwecke, `widthPurpose`, `seamless`)
- `frontend/src/components/ui/Card.test.tsx` - neue Zweck-Token-Tests, `widthPurpose`-Zero-Diff/Wert-Tests, `seamless`-Zero-Diff/Klassen-Test, CSS-Quelltext-Test für `.cardSeamless`
- `frontend/src/styles/tokens/layout.css` - drei neue `--card-padding-*`/`--card-width-*`-Zweck-Token
- `docs/FRONTEND_ARCHITEKTUR.md` - Card-Absatz um alle vier neuen Fähigkeiten ergänzt (stale `compositeLayoutPurity`-Wortlaut bewusst unverändert gelassen, siehe Deviations)
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `allowedSample` um `padding="section"`/`padding="contextCard"` erweitert

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere die direkte, gemessene Begründung für die `seamless`-Neuanlage statt Wiederverwendung einer bestehenden Variante, und die Deklarationsreihenfolge-Begründung für `.cardSeamless`).

## Deviations from Plan

None - plan executed exactly as written. Eine explizit im Plan-Task-2-Verhalten genannte Anweisung wurde bewusst befolgt, nicht abgewichen: die veraltete `compositeLayoutPurity.guard.test.ts`-Beschreibung ("vier Pilot-Dateien" mit "pro Selektor begründeter Ausnahmeliste", obwohl die Ausnahmeliste bereits in Plan 192-27 entfernt wurde) wurde in `docs/FRONTEND_ARCHITEKTUR.md` bewusst NICHT korrigiert -- das ist laut Plan explizit Aufgabe von Plan 192-34 (Guard-Erweiterung ändert Dateizahl/Ausnahme-Status erneut).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-31 (`page.episodes.module.css` → `AnimeEpisodesSection.tsx`) kann jetzt `Card padding="section"` einsetzen, um das bisherige lokale `padding: var(--space-6)` zu ersetzen
- Plan 192-33 (`FansubGroupContext.module.css`) kann jetzt `Card padding="contextCard"` einsetzen, um das bisherige lokale `padding: var(--space-5)` zu ersetzen
- Plan 192-32 kann `AnimeEdgeNavigation.module.css`s `.previewCard { width: min(260px, 90vw); }` durch `Card widthPurpose="compactPreview"` ersetzen UND `EpisodeGlassCard.module.css`s `.versionList`-Override durch `<Card ... seamless>` ersetzen (beide Card-Fähigkeiten in diesem Plan bereit, real gegen den aktuellen Zustand geprüft, keine erneute Recherche in Plan 192-32 nötig)
- Keine Blocker: `npx vitest run src/components/ui/Card.test.tsx src/components/ui/foreignVariableOverrides.regression.test.ts "src/app/anime/[id]/gapPurposeNaming.guard.test.ts"` (74/74) und `npx tsc --noEmit` beide grün; `catalogTaxonomy.test.ts` (33/33) und `compositeLayoutPurity.guard.test.ts` (5/5) bleiben unverändert grün
- Ein vorbestehender, von dieser Phase unberührter Testfehler in `ResponsiveImage.config.test.ts` (bereits in früheren Summaries dokumentiert) besteht unverändert fort -- nicht durch diesen Plan verursacht, nicht behoben (außerhalb des Scopes)

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 7 modified files plus this SUMMARY.md found on disk; all 4 task commits (962625719, 7f0216f73, 3d7fcd7d1, 82b97a033) found in git history.
