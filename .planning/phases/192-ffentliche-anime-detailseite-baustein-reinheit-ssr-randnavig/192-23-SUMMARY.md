---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 23
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-22)
    provides: Stack/Cluster-Grundbausteine mit Zweck-Benennung, 192-CONTEXT.md-Addendum 2026-11-05a (Review-Befund 1+2, unabhängiger Review Runde 1 von 2)
provides:
  - "Card.padding ist eine Zweck-Enum ('content' | 'nestedBlock' | 'dividedSection' | 'none'), nie mehr eine rohe Space-Skalenstufe -- schließt Review-Befund 2"
  - "Neues 'dividedSection'-Rezept (var(--space-3) var(--space-4) var(--space-4), oben/seitlich/unten) für einen durch eine Trennlinie statt einen Rahmen abgesetzten verschachtelten Abschnitt -- noch an keiner Aufrufstelle verdrahtet, bereit für Plan 192-26 (EpisodeGlassCard.versionList)"
  - "Neuer Card bleedBelowMd-Modus: unterhalb 767px horizontale Polsterung auf 0, justify-items auf center -- noch an keiner Aufrufstelle verdrahtet, bereit für Plan 192-25 (AnimeDetailHero.posterMetaCard)"
affects: [192-25, 192-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card.padding folgt jetzt exakt demselben PADDING_PURPOSE_TOKENS-Muster wie Stack/Clusters GAP_PURPOSE_TOKENS -- ein Record<Zweck, Token-String>, nie eine String-Interpolation auf eine rohe --space-N-Stufe"
    - "bleedBelowMd nutzt eine Modifikatorklasse (styles.cardBleedBelowMd) statt eines reinen CSS-Variablen-Hooks -- dieselbe, bereits durch Clusters collapseBelow/float etablierte Technik für eine boolesche, an einen Haltepunkt gebundene Zusatzfähigkeit (eine reine CSS-Custom-Property kann eine Selektor-AKTIVIERUNG nicht bedingen, nur einen Wert liefern; die Klasse wird nur gerendert, wenn die Prop gesetzt ist)"

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
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx

key-decisions:
  - "bleedBelowMd technisch als Modifikatorklasse statt als reiner CSS-Variablen-Hook umgesetzt -- die Plan-Spezifikation nannte '--card-bleed-below-md: 1' nur als Beispiel und erlaubte ausdrücklich jeden Mechanismus, der Card.module.css die bedingte Aktivierung erlaubt; eine Custom Property kann aber keinen Selektor bedingt aktivieren (nur einen Wert liefern), die Klasse ist der einzige technisch korrekte Weg und bereits durch Cluster collapseBelow/float als Projektkonvention etabliert"
  - "Die bleedBelowMd-Regel steht bewusst als LETZTE Deklaration innerhalb des bestehenden @media(max-width:767px)-Blocks und nutzt Einzel-Eigenschaften (padding-left/-right/justify-items) statt des padding-Shorthands -- Einzel-Eigenschaften lassen die vertikale Polsterung jeder Variante unberührt, und die Deklarationsreihenfolge garantiert bei gleicher Selektor-Spezifität den Sieg über jede variantenspezifische Mobil-Regel (z. B. .cardPublicHeroInfo) unabhängig davon, welche Variante die Karte sonst trägt"
  - "Keine Verdrahtung von 'dividedSection' oder bleedBelowMd in diesem Plan -- beide sind laut Plan-Objective bewusst interface-first, Verdrahtung folgt in den Plänen 192-25 (bleedBelowMd -> .posterMetaCard)/192-26 (dividedSection -> EpisodeGlassCard.versionList)"

requirements-completed: [Befund-Review1, Befund-Review2]

# Metrics
duration: 9min
completed: 2026-11-05
---

# Phase 192 Plan 23: Card-padding Zweck-Enum + 'dividedSection' + Rand-bis-Rand-Modus Summary

**Card.padding ist jetzt eine Zweck-Enum (`content`/`nestedBlock`/`dividedSection`/`none`) statt einer rohen Space-Skalenstufe -- schließt Review-Befund 2, migriert alle 3 echten Produktions-Aufrufstellen, und fügt einen neuen opt-in `bleedBelowMd`-Rand-bis-Rand-Modus hinzu, beide noch nicht an weitere Komposit-Dateien verdrahtet.**

## Performance

- **Duration:** ~9 min (Commit-zu-Commit, 01:06:07–01:13:47 UTC)
- **Started:** 2026-11-05T01:06:00Z (ca.)
- **Completed:** 2026-11-05T01:13:47Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN)
- **Files modified:** 10

## Accomplishments
- `Card.padding` ist eine Zweck-Enum (`'content' | 'nestedBlock' | 'dividedSection' | 'none'`) mit eigener `PADDING_PURPOSE_TOKENS`-Auflösungstabelle, exakt nach dem `GAP_PURPOSE_TOKENS`-Muster von Stack/Cluster -- schließt Review-Befund 2
- Alle 3 echten, repo-weit per Grep bestätigten Produktions-Aufrufstellen migriert: `AnimeDetailHero.tsx:81` (`padding="4"` → `"nestedBlock"`), `AnimeEdgeNavigation.tsx:99` (`padding="3"` → `"content"`), `ReleasePreviewRow.tsx:83` (`padding="3"` → `"content"`) -- `grep -rn 'padding="[1-9]"' frontend/src --include=*.tsx` liefert jetzt repo-weit nichts mehr
- Neues `'dividedSection'`-Rezept (`var(--space-3) var(--space-4) var(--space-4)`, oben/seitlich/unten) -- reproduziert exakt `EpisodeGlassCard.module.css`s aktuelles `.versionList`-Padding, bereit für Plan 192-26
- Neuer `Card bleedBelowMd`-Modus: unterhalb 767px horizontale Polsterung auf 0, `justify-items` auf `center`, über eine eigene Modifikatorklasse innerhalb von Cards bestehendem Mobil-Haltepunkt -- reproduziert exakt `AnimeDetailHero.module.css`s aktuelles lokales `.posterMetaCard`-Mobil-Override, bereit für Plan 192-25
- `gapPurposeNaming.guard.test.ts` erweitert um `padding="[1-9]"` als verbotenes Muster plus die vier neuen erlaubten Zweck-Werte in der Positiv-Gegenprobe -- verhindert künftig einen Rückfall auf eine rohe Card-Padding-Stufe
- Neue Storybook-Story ("Rand-bis-Rand unterhalb 767px (bleedBelowMd)") mit `mobile1`-Viewport-Dekoration, `docs/FRONTEND_ARCHITEKTUR.md`s Card-Absatz dokumentiert beide neuen Fähigkeiten

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: Card.padding Zweck-Enum; 3 echte Aufrufstellen migriert**
   - `2c945887c` (test) - RED: neue/angepasste Card.test.tsx-Fälle für die Zweck-Token, gapPurposeNaming.guard.test.ts erweitert um `padding="[1-9]"` -- Guard schlug korrekt für die 3 noch unveränderten Aufrufstellen fehl
   - `7a1bfa5b2` (feat) - GREEN: `CardPaddingPurpose`-Typ + `PADDING_PURPOSE_TOKENS` in `Card.tsx`, drei neue Token in `layout.css`, 3 Aufrufstellen migriert, `Card.stories.tsx`s `PaddingUeberschreibung`-Story nachgezogen
2. **Task 2: Card bleedBelowMd (Rand-bis-Rand-Modus); Doku**
   - `56c83fa33` (test) - RED: 4 neue Testfälle (Zero-Diff ohne Prop, Modifikatorklasse mit Prop, CSS-Quelltext-Prüfung der Mobil-Regel)
   - `0d1648142` (feat) - GREEN: `bleedBelowMd`-Prop + `.cardBleedBelowMd`-Modifikatorklasse in `Card.module.css`s bestehendem `@media(max-width:767px)`-Block, neue Storybook-Story, `docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Card.tsx` - `CardPaddingPurpose`-Typ + `PADDING_PURPOSE_TOKENS`, neue `bleedBelowMd`-Prop
- `frontend/src/components/ui/Card.module.css` - neue `.cardBleedBelowMd`-Modifikatorklasse im bestehenden Mobil-Haltepunkt
- `frontend/src/components/ui/Card.stories.tsx` - `PaddingUeberschreibung`-Story auf Zweck-Werte umgestellt, neue "Rand-bis-Rand"-Story
- `frontend/src/components/ui/Card.test.tsx` - Zweck-Token-Tests, `dividedSection`-Test, 2 `bleedBelowMd`-Tests, 1 CSS-Quelltext-Test
- `frontend/src/styles/tokens/layout.css` - drei neue `--card-padding-*`-Zweck-Token
- `docs/FRONTEND_ARCHITEKTUR.md` - Card-Absatz um Zweck-Enum-Umstellung und `bleedBelowMd` ergänzt
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `padding="[1-9]"` als verbotenes Muster, vier neue erlaubte Zweck-Werte
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `padding="4"` → `padding="nestedBlock"`
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `padding="3"` → `padding="content"`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - `padding="3"` → `padding="content"`

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (Modifikatorklasse statt reinem CSS-Variablen-Hook für `bleedBelowMd`, Deklarationsreihenfolge-Begründung, keine Verdrahtung von `dividedSection`/`bleedBelowMd` in diesem Plan).

## Deviations from Plan

None - plan executed exactly as written. Die Plan-Spezifikation nannte für `bleedBelowMd` einen CSS-Variablen-Hook nur als BEISPIEL ("oder jeder Mechanismus ... Claude's Discretion") -- die gewählte Modifikatorklasse ist technisch die einzig korrekte Umsetzung einer bedingten Selektor-Aktivierung in reinem CSS und liegt damit innerhalb des dokumentierten Ermessensspielraums, keine Abweichung von der Spezifikation.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-25 (`AnimeDetailHero.module.css`s `.posterMetaCard`) kann jetzt `Card bleedBelowMd` einsetzen und dabei die bisherige lokale `margin-left`/`margin-right`/`justify-items`-Mobil-Regel vollständig entfernen
- Plan 192-26 (`EpisodeGlassCard.module.css`s `.versionList`) kann jetzt `Card variant="flat" padding="dividedSection"` einsetzen und dabei das bisherige lokale `padding`+`border-top` durch die Card-Variante plus ein vorangestelltes `<Divider>`-Element ersetzen
- Keine Blocker: `npx vitest run src/components/ui/Card.test.tsx src/components/ui/foreignVariableOverrides.regression.test.ts "src/app/anime/[id]/gapPurposeNaming.guard.test.ts"` (68/68) und `npx tsc --noEmit` beide grün; `catalogTaxonomy.test.ts`, `compositeLayoutPurity.guard.test.ts` und `processHistory.regression.test.ts` bleiben unverändert grün
- Ein vorbestehender, von dieser Phase unberührter Testfehler in `ResponsiveImage.config.test.ts` (bereits in 192-22-SUMMARY.md dokumentiert und gegen den Basis-Commit gegengeprüft) besteht unverändert fort -- nicht durch diesen Plan verursacht, nicht behoben (außerhalb des Scopes)

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 10 modified files plus this SUMMARY.md found on disk; all 4 task commits (2c945887c, 7a1bfa5b2, 56c83fa33, 0d1648142) found in git history.
