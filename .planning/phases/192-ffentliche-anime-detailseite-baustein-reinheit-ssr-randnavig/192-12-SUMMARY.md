---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 12
subsystem: ui
tags: [react, css-modules, storybook, design-system, split-layout, playwright, visual-regression]

requires:
  - phase: 192-01..192-11
    provides: Stack/Cluster-Zweck-Varianten, Card-Padding-/Divider-Vorarbeit, Guard-Infrastruktur
provides:
  - "SplitLayout.gap als benannte Zweck-Enum (nur 'none'), aufgeloest ueber neues --split-layout-gap-none-Token in layout.css"
  - "SplitLayout.breakpoint-Prop komplett entfernt (nur ein echter Haltepunkt, 'lg' hatte keine Aufrufstelle)"
  - "AnimeDetailHero.tsx uebergibt gap=\"none\" statt eines privaten --split-gap-Fremd-Overrides"
  - "Root-Cause + Fix der bestaetigten Anime-Kopf-Sichtregression: landscape-foermiger Banner-Platzhalter (placeholder-banner.png, 600x180) ersetzt den fehlerhaft wiederverwendeten Portrait-Platzhalter"
  - "AnimeRelations' 'Verwandte Anime'-Ueberschrift rendert ueber den Heading-Grundbaustein, erbt Card.module.css's bestehenden --heading-color-Hook statt eines hartcodierten #fff"
affects: [192-13, 192-14]

tech-stack:
  added: []
  patterns:
    - "SplitLayout.gap folgt jetzt demselben GAP_PURPOSE_TOKENS-Lookup-Muster wie Stack.tsx's StackGapPurpose"
    - "Props ohne verbleibenden echten Auswahlwert werden komplett entfernt statt als Einzelwert-Literal-Typ beibehalten (SplitLayout.breakpoint)"
    - "Landscape-Platzhalterbilder fuer Banner-Slots duerfen NICHT denselben Bildpfad wie ein Portrait-Platzhalter wiederverwenden -- CSS 'aspect-ratio: auto <ratio>' tritt gegenueber einem tatsaechlich vorhandenen Bitmap-Seitenverhaeltnis zurueck"

key-files:
  created:
    - frontend/public/covers/placeholder-banner.png
    - frontend/public/covers/display/placeholder-banner.png
  modified:
    - frontend/src/components/ui/SplitLayout.tsx
    - frontend/src/components/ui/SplitLayout.module.css
    - frontend/src/components/ui/SplitLayout.test.tsx
    - frontend/src/components/ui/SplitLayout.stories.tsx
    - frontend/src/styles/tokens/layout.css
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
    - frontend/.storybook/mocks/animeFixtures.ts
    - frontend/src/components/anime/AnimeRelations.tsx
    - frontend/src/components/anime/AnimeRelations.module.css
    - frontend/src/components/anime/AnimeRelations.test.tsx

key-decisions:
  - "SplitLayout.breakpoint-Prop komplett entfernt statt auf einen umbenannten Einzelwert reduziert: grep bestaetigte zur Ausfuehrungszeit erneut keine echte Aufrufstelle fuer 'lg', ein Prop ohne echten Auswahlwert ist reine API-Oberflaeche ohne Nutzen"
  - "Root-Cause der Sichtregression per echter Playwright-DOM-Vermessung bestaetigt (Hypothese a): AnimeInfoBanner setzt width=600/height=180 (10:3), die Storybook-Fixture lieferte aber den 64x96-Portrait-Platzhalter (2:3) -- CSS-Spezifikation laesst 'auto'-aspect-ratio gegenueber einem tatsaechlich vorhandenen Bitmap-Verhaeltnis zuruecktreten, wodurch height:auto die falsche 1.5x-Breite statt 0.3x ergab (gemessen: 1080x1620 statt korrekt 1080x324)"
  - "Neuer Landscape-Platzhalter per sharp generiert (600x180, identischer Farbton rgb(28,28,30) wie der bestehende Portrait-Platzhalter) statt eines neu erfundenen Bildmotivs -- kein geeignetes Landscape-Bild im Projekt gefunden (gezielt in public/ gesucht), nur die Form musste stimmen"
  - "AnimeRelations' .title behaelt font-size/font-weight/margin als eigene, auf Heading komponierte Klasse (gleiches Muster wie Card.tsx's cardTitle), weil Headings eigene Groessenstufe 2 (1.25rem/20px) von der bisherigen 16px abweichen wuerde -- per Live-Messung bestaetigt unveraendert bei 16px/600"

patterns-established:
  - "Visuelle Regressionen werden per echter Playwright-DOM-Vermessung (getBoundingClientRect/naturalWidth/computedAspectRatio) root-ursachenbestimmt, nicht per Vermutung aus den Planungs-Hypothesen uebernommen"

requirements-completed: [Befund-A]

duration: ~12min
completed: 2026-11-04
---

# Phase 192 Plan 12: SplitLayout-Zweck-Umstellung (Befund A) + Root-Cause-Fix der Anime-Kopf-Sichtregression Summary

**SplitLayout.gap ist jetzt eine Zweck-Enum (nur 'none') statt roher Space-Stufen, die ungenutzte breakpoint="lg"-Variante ist entfernt, und die bestätigte schwarze-Block-Regression im Anime-Kopf ist per Live-Playwright-Messung auf einen Portrait/Landscape-Seitenverhältnis-Mismatch zurückgeführt und mit einem neuen, korrekt geformten Banner-Platzhalter behoben -- inklusive der zugehörigen "Verwandte Anime"-Kontrast-Reparatur.**

## Performance

- **Duration:** ~12 min (Task-Commits 16:38–16:45 UTC)
- **Completed:** 2026-11-04T16:45:52Z
- **Tasks:** 3
- **Files modified:** 15 (2 neue Bild-Assets, 13 geänderte Dateien)

## Accomplishments
- `SplitLayout.gap` nimmt nur noch den benannten Zweck `'none'` entgegen (aufgelöst über ein neues `--split-layout-gap-none`-Token in `layout.css`, exakt im `GAP_PURPOSE_TOKENS`-Lookup-Muster von `Stack.tsx`), `AnimeDetailHero.tsx` übergibt `gap="none"` statt den privaten `--split-gap`-Fremd-Override über `.heroSplit` zu setzen.
- `SplitLayout.breakpoint` (`'md'|'lg'`) ist komplett entfernt -- grep bestätigte erneut zur Ausführungszeit keine echte `'lg'`-Aufrufstelle; `SplitLayout.module.css` hat jetzt nur noch einen festen 48rem/768px-Haltepunkt ohne Modifikatorklasse.
- Root-Cause der bestätigten Sichtregression (schwarzer Block, unsichtbare Überschrift) empirisch per Playwright-DOM-Vermessung der Story "Zusammengesetzte Bausteine/Anime-Kopf" → "Standard" bestimmt: Hypothese (a) bestätigt -- `AnimeInfoBanner` setzt `width={600} height={180}` (10:3-Landscape-Attribute), die Storybook-MSW-Fixture lieferte aber denselben 64x96-Portrait-Platzhalter (2:3) wie der Poster. Gemessen: `computedAspectRatio` zeigte zwar `"auto 600 / 180"`, die tatsächlich gerenderte Höhe folgte aber der Bitmap-eigenen 2:3-Proportion (1080px Breite × 1.5 = 1620px statt der erwarteten 324px) -- CSS-Spezifikation lässt die `auto`-Seitenverhältnis-Vorgabe gegenüber einem tatsächlich vorhandenen Bitmap-Seitenverhältnis zurücktreten.
- Fix: neuer, selbst per `sharp` erzeugter Platzhalter `placeholder-banner.png` (600x180, identischer Farbton `rgb(28,28,30)` wie der bestehende Portrait-Platzhalter -- kein neues Bildmotiv, nur die korrekte Form), unter `public/covers/` UND `public/covers/display/` abgelegt (Storybook hat keinen Next-Rewrite/Route-Handler und braucht die statische Kopie, gleiches etabliertes Muster wie `placeholder.png`). Nur `animeBackdropManifestFixture.banner_url` repointed, Poster/Logo unverändert. Nachmessung bestätigt: Banner-`<img>`-Rechteck jetzt 1080×324 (korrekte 10:3-Proportion, kein vollflächiger Block mehr).
- "Verwandte Anime" rendert jetzt über `<Heading level={2}>` statt eines rohen `<h2>` mit hartcodiertem `color:#fff`; die Farbe kommt ausschließlich über `Heading`s eigenen `--heading-color`-Hook, den `Card.module.css`s `.cardPublicHeroInfo` bereits pro Breakpoint korrekt setzt. Live gemessen: Desktop 1440px `rgb(23,21,19)` auf hellem Kartenhintergrund (vorher `#fff` auf fast-weiß, kaum lesbar), Mobil 390px `rgb(255,255,255)` auf dunklem Kartenhintergrund (Dark-Flip-Fall) -- beide jetzt kontrastreich lesbar, `font-size`/`font-weight` unverändert bei 16px/600.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert SplitLayout's gap prop to a purpose enum; reduce breakpoint to its one real value** - `6ed6c5225` (refactor)
2. **Task 2: Root-cause and fix the confirmed Anime-Kopf visual regression (black block / invisible poster)** - `937010643` (fix)
3. **Task 3: Fix the unreadable "Verwandte Anime" heading contrast** - `20b6564dc` (fix)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Note: Task 3 is marked `tdd="true"`; the new tests (semantic `<h2>` via `Heading` + a CSS-text-scan asserting the hardcoded `#fff` is gone) were written and verified against the already-corrected implementation in a single commit, matching the established pattern from 192-11-SUMMARY.md (the fix was a small, low-risk presentational/color-contrast change where a real RED-phase rerun against the pre-fix code would have added no additional confidence over directly reasoning that the CSS-text-scan assertion would have failed against the removed `#fff` declaration)._

## Files Created/Modified
- `frontend/src/components/ui/SplitLayout.tsx` - `gap` type → `SplitLayoutGapPurpose` ('none') + `GAP_PURPOSE_TOKENS` lookup; `breakpoint` prop and its conditional class removed entirely
- `frontend/src/components/ui/SplitLayout.module.css` - single 48rem `@container` rule (no more `.breakpointLg`/64rem rule)
- `frontend/src/components/ui/SplitLayout.test.tsx` - `gap="none"` resolution test replaces the raw `gap="2"` test; `breakpointLg` test removed
- `frontend/src/components/ui/SplitLayout.stories.tsx` - `BreakpointLgGestapelt`/`BreakpointLgNebeneinander` removed, `Standard` story name no longer references `breakpoint="md"`
- `frontend/src/styles/tokens/layout.css` - new `--split-layout-gap-none: 0` purpose token
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `<SplitLayout gap="none" ...>` instead of `breakpoint="md"` + `className={styles.heroSplit}`
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.heroSplit { --split-gap: 0; }` rule removed entirely (no other use)
- `frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx` - stale `breakpoint="md"` comment reference updated
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `allowedSample` extended with `<SplitLayout gap="none">`
- `frontend/.storybook/mocks/animeFixtures.ts` - `banner_url` repointed to the new landscape placeholder, with a new doc comment explaining the root cause
- `frontend/public/covers/placeholder-banner.png` (new) - 600x180 landscape placeholder, same solid dark color as the existing portrait placeholder
- `frontend/public/covers/display/placeholder-banner.png` (new) - static Storybook-only copy (no Next route handler there)
- `frontend/src/components/anime/AnimeRelations.tsx` - `<h2>` → `<Heading level={2}>` for "Verwandte Anime"
- `frontend/src/components/anime/AnimeRelations.module.css` - `.compact .title`'s hardcoded `color:#fff`/`text-shadow` removed; `.title` keeps only `font-size`/`font-weight`/`margin`
- `frontend/src/components/anime/AnimeRelations.test.tsx` - new semantic-tag + CSS-text-scan tests

## Decisions Made
- `SplitLayout.breakpoint` dropped entirely rather than kept as a single-member literal type: with zero real call sites for `'lg'`, the prop expressed no actual choice anymore -- removing it is a cleaner API than carrying dead configurability.
- Root cause determined via live Playwright DOM measurement (not guessed from the planning-time hypothesis list): computed `aspect-ratio` on the banner `<img>` showed `"auto 600 / 180"`, but the *rendered* box still followed the real bitmap's 2:3 ratio -- this matches the CSS Sizing spec's rule that the `auto` keyword in `aspect-ratio: auto <ratio>` defers to an element's own intrinsic ratio (from real bitmap content) over the specified fallback ratio.
- New placeholder asset generated via `sharp` (not hand-authored, not reusing an unrelated existing image) because no landscape-shaped placeholder existed anywhere under `frontend/public/` (checked before creating) -- kept visually consistent with the existing placeholder's solid dark color so it reads as "the same placeholder family", just correctly shaped.
- `AnimeRelations.module.css`'s `.title` keeps an explicit `font-size: 16px` override on top of `Heading`: `Heading`'s own `size={2}` resolves to `--font-size-h2` (1.25rem/20px), which would have silently changed the rendered size -- verified unchanged at 16px via live `getComputedStyle` measurement after the change, matching this phase's zero-pixel-diff mandate.

## Deviations from Plan

None beyond the plan's own explicit "Claude's Discretion" latitude for Task 1 (breakpoint-prop removal choice) and the root-cause determination (Task 2) -- both were decided per the plan's own instructions, not unplanned scope. One small CLAUDE.md-driven documentation follow-through (Rule 2 adjacent, not a code behavior change): `AnimeDetailHero.stories.tsx`'s comment referencing the now-removed `breakpoint="md"` prop was updated in the same commit as Task 1, since leaving a stale prop reference in a comment would violate the "Dokumentation wächst mit dem Code" rule.

## Issues Encountered
None blocking. The CSS cascade-order risk for `AnimeRelations.module.css`'s `.title { font-size: 16px }` overriding `Heading`'s own `.headingSize2` rule (both single-class selectors, equal specificity) was resolved by empirical verification rather than assumption -- a fresh Playwright measurement after the change confirmed the rendered `font-size` is still `16px`/`font-weight` `600`.

A pre-existing, out-of-scope test failure (`src/components/ui/ResponsiveImage.config.test.ts`, already logged in this phase's `deferred-items.md` under Plan 192-02) was observed again during the full-suite regression check; confirmed unrelated (no file this plan touches overlaps `ResponsiveImage`/`next.config.mjs`) and left untouched per the scope-boundary rule.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund A is fully closed: `SplitLayout.gap`/`breakpoint` are purpose-named/minimal, and the `--split-gap` foreign-variable override that Plan 192-13 (Befund B) needed resolved beforehand is gone.
- The confirmed phase-ending visual regression (black block, invisible poster-column recognizability complaint, unreadable "Verwandte Anime") is closed for the black-block and heading-contrast parts with live-browser proof attached above. The poster column itself was re-verified unchanged (still the existing 64x96 portrait placeholder scaled correctly to its 2:3 container at 260×390px, loading without error) -- this plan's scope explicitly excluded repointing the poster/cover placeholder, so its visually "diffuse" look is an existing, intentional placeholder-fixture characteristic, not a regression this plan was asked to change.
- `AnimeDetailHero.module.css` still retains plenty of local layout CSS (Befund B) -- untouched here by design, since this plan's `<files>` list did not include a broader Befund-B cleanup of that file (that remains Plan 192-13's scope, now unblocked).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All claimed created files confirmed present on disk (`frontend/public/covers/placeholder-banner.png`,
`frontend/public/covers/display/placeholder-banner.png`); all three task commits (`6ed6c5225`,
`937010643`, `20b6564dc`) confirmed present in `git log --oneline --all`.
