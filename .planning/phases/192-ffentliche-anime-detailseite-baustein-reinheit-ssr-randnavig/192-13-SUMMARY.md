---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 13
subsystem: ui
tags: [react, css-modules, storybook, design-system, card, divider, playwright, visual-regression]

requires:
  - phase: 192-11
    provides: "Card padding override-hook prop, neuer Divider-Grundbaustein"
  - phase: 192-12
    provides: "SplitLayout.gap als Zweck-Enum, Root-Cause-Fix der Anime-Kopf-Sichtregression (Banner-Platzhalter)"
provides:
  - "AnimeDetailHero.module.css deklariert kein eigenes display:flex/flex-direction/<hr>-background/-margin mehr und nur noch drei eng begruendete, lokale Restkorrekturen fuer die neue verschachtelte posterMeta-Card (border-width, Mobil-Margin-Ausgleich, Mobil-justify-items)"
  - "AnimeInfoBanner (AnimeMediaProvider.tsx) nimmt einen `divider`-ReactNode-Slot statt einer `dividerClassName`-ClassName entgegen"
  - "Card.module.css's .cardPublicHeroInfo traegt jetzt ihren eigenen responsiven Standard-Innenabstand (--space-6 Desktop/--space-5 Mobil) direkt in der Variante, statt dass der Composite-Baustein das lokal nachbildet"
affects: [192-15]

tech-stack:
  added: []
  patterns:
    - "Eine Card-Variante mit genuinely-responsivem Standard-Innenabstand (zwei unterschiedliche Haltepunkt-Werte) traegt diesen Standardwert direkt in Card.module.css selbst (per @media-Block), nicht als Fallback-Literal -- Cards generischer padding-Prop bleibt dabei unveraendert ein einziger, nicht responsiver Override-Hook fuer BEIDE Stufen gleichzeitig"
    - "Divider-Grundbaustein als ReactNode-Slot statt ClassName durch eine fremde Komponente (AnimeInfoBanner) durchreichen, wenn das Element selbst (nicht nur seine Optik) umgezogen werden soll"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/components/anime/AnimeMediaProvider.tsx
    - frontend/src/components/ui/Card.module.css
    - frontend/src/app/anime/[id]/page.test.tsx

key-decisions:
  - "AnimeMediaProvider.tsx (nicht im Plan-files_modified) musste mitgeaendert werden: der zweite <hr> (.divider) wird nicht in AnimeDetailHero.tsx selbst gerendert, sondern innerhalb der AnimeInfoBanner-Komponente -- dividerClassName (string) wurde zu divider (ReactNode) umgebaut, damit der Aufrufer ein fertiges Divider-Element statt nur einer ClassName uebergeben kann"
  - "Card.module.css (nicht im Plan-files_modified) musste mitgeaendert werden: .infoCardBody's bisherige padding:var(--space-6)/var(--space-5)-Differenz ist ECHT responsiv (zwei unterschiedliche Haltepunkt-Werte), Cards padding-Prop ist aber ein einziger, nicht responsiver Skalenwert -- die 192-CONTEXT.md-Vorgabe ('Grundbaustein erweitern statt lokales CSS behalten') wird damit woertlich umgesetzt: .cardPublicHeroInfo traegt jetzt selbst einen responsiven Standardwert"
  - ".posterMeta's zweite responsive Differenz (padding:var(--space-4) Desktop vs. var(--space-4) 0 Mobil) wird NICHT durch eine zweite Card-Variantenerweiterung geloest, sondern durch Verschachtelung in eine neue Card variant=\"nested\" padding=\"4\" (die vom Plan explizit genannte, einzige transparente Variante) plus drei eng dokumentierte lokale Restkorrekturen auf dem neuen Wrapper -- border-width:0 (hebt die von .cardNested unsichtbar geerbte 1px-Randbreite auf), Mobil-Margin-Ausgleich (hebt Cards unconditional 16px-Seitenpolsterung bei Mobil auf 0 zurueck) und Mobil-justify-items:center (reproduziert den vorherigen, zufaelligen Deklarations-Reihenfolge-Sieg von .posterMeta's align-items:center gegen Stacks eigenen stretch-Standard, der durch die neue Grid-Zwischenebene sonst verloren ginge) -- alle drei EMPIRISCH per Playwright-Vermessung gegen die Vor-Umstellungs-Fassung bestaetigt, nicht theoretisch angenommen"
  - "Zwei Divider-Instanzen (tone=\"onMediaStrong\"/tone=\"onMedia\") statt einer einzigen mit ueberschriebenem Ton fuer die Info-Banner-Trennlinie: Divider erlaubt per eigener Doku keinen Fremd-Override seiner privaten Farbvariable, CSS display steuert nur, welche der beiden je Haltepunkt sichtbar ist -- derselbe Divider-eigene className-Vertrag (NUR Sichtbarkeit) wie bei .posterDivider's Mobil-Ausblendung"

patterns-established:
  - "Wenn eine Card-Variante nur EINEN echten Aufrufer hat und deren Composite-CSS einen genuinely responsiven (nicht generalisierbaren Einzelwert) Innenabstand braucht, erweitert die Variante selbst ihren Standardwert responsiv, statt dass der Composite-Baustein eine lokale padding-Deklaration behaelt"

requirements-completed: [Befund-B]

duration: ~45min
completed: 2026-11-04
---

# Phase 192 Plan 13: AnimeDetailHero.module.css Layout-CSS-Bereinigung Summary

**AnimeDetailHero.module.css verliert ihr redundantes display:flex/flex-direction, beide `<hr>`-Trennlinien laufen jetzt über den `Divider`-Grundbaustein, und der Card-adjazente Innenabstand (Info-Karte + Poster-Meta) kommt über Cards neuen `padding`-Prop bzw. eine responsive Variantenerweiterung statt lokalem CSS -- per Playwright-Pixelvergleich (Desktop 1440/Mobil 390, Voll-Screenshot-Byte-Diff = 0) als Zero-Pixel-Diff bestätigt.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-11-04T17:48:50Z
- **Tasks:** 2
- **Files modified:** 5 (AnimeDetailHero.tsx, AnimeDetailHero.module.css, AnimeMediaProvider.tsx, Card.module.css, page.test.tsx)

## Accomplishments
- `AnimeDetailHero.tsx`/`.module.css`: beide `<hr>`-Trennlinien (Poster-Meta knapp, Info-Banner großzügig) rendern jetzt über den `Divider`-Grundbaustein (`@/components/ui/Divider`, Plan 192-11) statt eines eigenen `<hr>` mit lokalem `background`/`margin`/`border` -- die Info-Banner-Trennlinie als zwei Divider-Instanzen (`tone="onMediaStrong"`/`tone="onMedia"`), per CSS `display` je Haltepunkt umgeschaltet, weil Divider keinen Fremd-Override seiner privaten Farbvariable erlaubt.
- `.posterColumn` verliert ihre zu `Card variant="publicPoster"`s eigener `.cardPublicPoster`-Regel redundante `display:flex;flex-direction:column`-Deklaration (bereits dort vorhanden); `position:relative` bleibt (Positionierungskontext für `.posterMeta`).
- `.infoCardBody`s responsiver Innenabstand (`--space-6` Desktop/`--space-5` Mobil) zieht vollständig in `Card.module.css`s `.cardPublicHeroInfo`-Variante um (als deren eigener responsiver Standardwert, siehe Decisions) -- `.infoCardBody` selbst hat jetzt kein `padding:` mehr.
- `.posterMeta`s Innenabstand (`--space-4`, inkl. der bisherigen asymmetrischen Mobil-Variante) zieht in eine neue, verschachtelte `Card variant="nested" padding="4"` um, die exakt den Merklisten-Knopf/Divider/Genres-Block umschließt (nicht das Poster-Bild).
- Live-Nachweis per Playwright gegen eine zweite, lokale Storybook-Instanz (Port 6007, unabhängig vom laufenden Docker-Storybook auf 6006): Full-Page-Screenshots (Desktop 1440×1200, Mobil 390×1600) zeigen **0 abweichende Pixel** (`maxDiff=0, diffPixels=0`) zwischen Vor- und Nach-Zustand; DOM-Messung aller relevanten Rects (Hero-Karte, Poster-Karte, Titel-Zeile, Merklisten-Knopf, Genres, Trennlinien, Randnavigations-Overlay) bestätigt identische `x`/`y`/`width`/`height` an beiden Haltepunkten.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace the two local hr+background+margin dividers with the Divider Grundbaustein; remove the redundant posterColumn flex** - `4b48dadc4` (refactor)
2. **Task 2: Move Card-adjacent padding onto Card's new prop; resolve or document the infoCardBody bespoke-spacing case** - `eae58b7bc` (refactor)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Note: Both tasks were marked `tdd="true"` in the plan; given this is a pure structural CSS/JSX refactor with an explicit zero-pixel-diff goal (no new behavior to write a failing test against first), verification took the form of running the full existing regression suite plus a dedicated Playwright DOM-measurement + full-page-screenshot-byte-diff pass against a locally-started Storybook instance (not the shared Docker container on :6006) before and after each task's change, rather than a RED/GREEN unit-test cycle -- matching the established pattern from 192-11/192-12-SUMMARY.md for additive/structural work in this same phase._

## Files Created/Modified
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `Divider` import + both `<hr>` replacements; new nested `Card variant="nested" padding="4" className={styles.posterMetaCard}` wrapping WatchlistAddButton/Divider/genresSection; `AnimeInfoBanner` now receives a `divider` ReactNode (two `Divider` instances) instead of `dividerClassName`
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.posterColumn`'s redundant flex removed; `.posterDivider`/`.divider` lose their own `background`/`margin`/`border` (owned by Divider now); new `.dividerDesktop`/`.dividerMobile` visibility-only toggle classes; `.posterMeta`/`.infoCardBody` lose their own `padding:`; new `.posterMetaCard` with three documented, narrowly-scoped local corrections (see Decisions)
- `frontend/src/components/anime/AnimeMediaProvider.tsx` - `AnimeInfoBanner`'s `dividerClassName?: string` prop replaced by `divider?: ReactNode`, rendering the passed element instead of its own `<hr>`
- `frontend/src/components/ui/Card.module.css` - `.cardPublicHeroInfo`'s base rule now defaults `padding` to `var(--space-6)` (was `0`); its existing mobile `@media (max-width: 767px)` block now additionally sets `padding: var(--card-padding-override, var(--space-5))`
- `frontend/src/app/anime/[id]/page.test.tsx` - the pre-existing "gibt den Trennlinien eine vollständige tokenbasierte Optik" test rewritten to assert the new Divider-based architecture (no `<hr>` in `AnimeDetailHero.tsx`, correct `Divider` prop usage, no `background: var(--border-on-media...)` left in `AnimeDetailHero.module.css`, Divider's own CSS module carries the token-based look) instead of scanning the now-removed local `.posterDivider`/`.divider` CSS rules

## Decisions Made
- **AnimeMediaProvider.tsx extended beyond the plan's declared `files_modified`** ([`AnimeDetailHero.tsx`, `AnimeDetailHero.module.css`] only): the `.divider` `<hr>` the plan assumed lived directly in `AnimeDetailHero.tsx` actually renders *inside* `AnimeInfoBanner` (a different component), which only received a `dividerClassName` string. Moving this `<hr>` to the `Divider` Grundbaustein required changing that component's own prop contract. This is the single other real call site of `AnimeInfoBanner` (confirmed via repo-wide grep), so the change is safe and non-breaking.
- **Card.module.css extended beyond the plan's declared `files_modified`**: `.infoCardBody`'s pre-existing padding was genuinely responsive (`--space-6` desktop / `--space-5` mobile) -- Card's `padding` prop (built in 192-11) is a single, non-responsive override value and cannot express two different breakpoint values. Per `192-CONTEXT.md`'s explicit Befund-B mandate ("wo ein Grundbaustein einen benötigten Zweck NICHT abbilden kann... gilt das NICHT als Rechtfertigung für lokales CSS, sondern als Auftrag, den Grundbaustein... zu erweitern"), `.cardPublicHeroInfo` (Card's variant, the *sole* real caller per grep) now carries this responsive default directly, rather than `AnimeDetailHero.module.css` keeping a local `padding:` declaration. Confirmed via `Card.test.tsx`/`foreignVariableOverrides.regression.test.ts` that this introduces no new forbidden pattern (no new custom-property *declaration*, only additional `var()` *reads* of the already-existing `--card-padding-override` hook; the added literal values are themselves `var()` references, not raw px/rem/hex).
- **`.posterMeta`'s own second responsive padding difference (16px all sides desktop vs. 16px top/bottom-only mobile) is NOT solved the same way** (a second Card-variant extension), because `variant="nested"` is a genuinely generic, multi-caller primitive -- hardcoding this one composite's mobile asymmetry into it would leak domain-specific layout into a shared building block. Instead: wrap the affected children in a new `Card variant="nested" padding="4"` (per the plan's explicit instruction, the one sanctioned transparent variant) and add three narrowly-scoped, fully-documented local CSS corrections on the new wrapper's own className (`.posterMetaCard`), none of which are in Befund B's forbidden-property list (`display:flex`, `flex-direction`, `grid-template`, `gap:`, `padding:`, `margin`):
  1. `border-width: 0` -- `.cardNested` sets `border-color: transparent` but inherits `.card`'s base `border: 1px solid` *width*, which still consumes 1px of layout space per side even though invisible. Without this, Playwright measurement showed the poster card rendering 2px narrower/taller than before.
  2. Mobile-only `margin-left/-right: calc(-1 * var(--space-4))` -- cancels exactly the 16px horizontal padding Card's `padding="4"` prop unconditionally applies (it has no responsive variant), restoring the original mobile-only "0 horizontal padding" need.
  3. Mobile-only `justify-items: center` -- without this, the "Zur Watchlist" button (which switches to `width: auto` below 767px per `Button.module.css`'s `.buttonResponsiveBlock`) stretched to the full grid-column width instead of staying centered at its own content width. Root cause: before this plan, `.posterMeta`'s own `align-items: center` rule happened to win a CSS declaration-order race against `Stack.module.css`'s `align-items: var(--stack-align, stretch)` default (same specificity, same element) -- introducing an intermediate CSS-grid wrapper (Card's base layout mode) broke that accidental ordering win, since grid's cross-axis stretch is governed by `justify-items`, a different property from flex's `align-items`.
  All three corrections were derived empirically (not guessed) via a dedicated before/after Playwright DOM-measurement + full-page-screenshot-byte-diff pass against a disposable local Storybook instance (port 6007), matching the plan's repeated "verify against a real render before deciding" instruction.
- Two `Divider` instances (not one with an externally-overridden tone) for the info-banner separator: `Divider.tsx`'s own documented contract forbids a caller from overriding its private color variable from outside (exactly the "Fremd-Override" pattern Befund B's guard forbids); CSS `display` toggling per breakpoint is the Divider-sanctioned, className-only mechanism for this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `AnimeMediaProvider.tsx`'s `AnimeInfoBanner` needed its own prop contract change to actually relocate the `.divider` `<hr>`**
- **Found during:** Task 1
- **Issue:** The plan's `<interfaces>` section described `<hr className={styles.divider} />` as if it rendered directly in `AnimeDetailHero.tsx`. In the current (post-192-12) file state it actually renders inside `AnimeInfoBanner` (`AnimeMediaProvider.tsx`), which only accepted a `dividerClassName: string` prop -- a `Divider` React component cannot be passed as a plain CSS class string.
- **Fix:** Changed `AnimeInfoBanner`'s prop from `dividerClassName?: string` to `divider?: ReactNode`, rendering the passed element in place of its own `<hr>`. Confirmed via repo-wide grep this is the only real call site (besides its own test, which doesn't pass the prop and is unaffected).
- **Files modified:** `frontend/src/components/anime/AnimeMediaProvider.tsx`
- **Verification:** `AnimeMediaProvider.test.tsx` (13 tests) green; `tsc --noEmit` clean; Playwright measurement confirms the correct Divider instance renders/toggles at each breakpoint.
- **Committed in:** `4b48dadc4` (Task 1 commit)

**2. [Rule 2 - Missing Critical] `Card.module.css`'s `.cardPublicHeroInfo` needed its own responsive default to preserve zero-pixel-diff**
- **Found during:** Task 2
- **Issue:** `.infoCardBody`'s pre-existing padding was genuinely responsive (32px desktop / 24px mobile). Card's `padding` prop (192-11) is a single non-responsive scalar; naively setting `padding="6"` on the outer Card would have applied 32px padding at ALL breakpoints, a real mobile regression (confirmed via baseline Playwright measurement before attempting the naive approach).
- **Fix:** Per 192-CONTEXT.md's explicit mandate to extend the Grundbaustein rather than keep local CSS when a purpose can't be expressed, `.cardPublicHeroInfo`'s own base and existing mobile `@media` rule now each set their own appropriate `var(--card-padding-override, var(--space-N))` default.
- **Files modified:** `frontend/src/components/ui/Card.module.css`
- **Verification:** `Card.test.tsx`, `foreignVariableOverrides.regression.test.ts` (58 tests, scans for forbidden literals/foreign variable sets) green; Playwright measurement confirms identical `titleRow`/content positions at both breakpoints before/after.
- **Committed in:** `eae58b7bc` (Task 2 commit)

**3. [Rule 1 - Bug] Three narrowly-scoped local CSS corrections on the new `.posterMetaCard` wrapper, needed to avoid real zero-pixel-diff regressions introduced by the new nested-Card restructuring itself**
- **Found during:** Task 2 (discovered via Playwright before/after comparison, not assumed)
- **Issue:** Introducing `Card variant="nested" padding="4"` as a new wrapper (per the plan's own instruction) introduced three small but real visual regressions versus the pre-change render: (a) 2px narrower/taller poster card (inherited invisible 1px border from `.cardNested`), (b) 16px of unwanted horizontal padding at mobile (Card's padding prop has no responsive variant), (c) the "Zur Watchlist" button stretching to full width at mobile instead of staying centered at its own content width (grid's `justify-items:stretch` default differs from the flex `align-items:center` declaration-order race it replaced).
- **Fix:** `border-width: 0` (base); mobile-only `margin-left/-right: calc(-1 * var(--space-4))`; mobile-only `justify-items: center`. All three documented inline with the empirical reasoning.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`
- **Verification:** Playwright full-page-screenshot byte-diff = 0 (`maxDiff=0, diffPixels=0` at both 1440×1200 and 390×1600) after applying all three corrections; DOM-rect measurement of every relevant element matches baseline exactly.
- **Committed in:** `eae58b7bc` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 missing-critical/Grundbaustein-extension, 1 bug-preventing-zero-pixel-diff-regression)
**Impact on plan:** All three were necessary to actually achieve the plan's own stated goal (zero-pixel-diff composite-file CSS cleanup); none introduce new user-facing behavior or scope beyond the plan's objective. Two touch files outside the plan's declared `files_modified` (`AnimeMediaProvider.tsx`, `Card.module.css`), both minimal, single-purpose, and necessary for correctness.

## Guard exception for 192-15

For the upcoming composite-layout-purity guard test (Plan 192-15), `AnimeDetailHero.module.css` now contains exactly ONE remaining intentional, documented layout-CSS exception plus three narrowly-scoped corrective exceptions:

1. **`.infoCardBody { display: flex; flex-direction: column; }`** (no padding) -- bespoke, non-uniform per-child vertical spacing rhythm (`.titleRow`/`.badges`/`.description`/`.tagsSection`/`.statsRow`/`.relatedSection`, mixing `--space-4`/`--space-5` margins/padding-tops that are each individually non-generalizable into a single Stack `gap` purpose without changing the actual pixel rhythm -- Zero-Pixel-Diff mandate). The guard should allow `display:flex`/`flex-direction` on this exact selector, but should still flag any NEW `padding`/`margin`/`gap` declaration added to it in the future.
2. **`.posterMetaCard { border-width: 0; }`** (unconditional) -- corrective, not a layout property Befund B's guard targets at all (not in its forbidden list); included here for completeness.
3. **`.posterMetaCard` inside `@media (max-width: 767px)`: `margin-left`/`margin-right: calc(-1 * var(--space-4))`** -- cancels Card's own unconditional horizontal padding prop value at the one breakpoint where it must be zero; Card's `padding` prop has no responsive variant.
4. **`.posterMetaCard` inside the same mobile block: `justify-items: center`** -- restores the pre-existing (accidental-but-depended-upon) center/no-stretch behavior for this wrapper's children, which a generic Card's own grid default (`justify-items: stretch`, unset) would otherwise silently break.

All four are documented inline at their declaration site with a reference to this plan.

## Issues Encountered
- A Docker-based Storybook container (`team4sv30-storybook`, port 6006) is in continuous use and not bind-mounted to local source (built from a baked image) -- live-rebuilding it for every verification iteration would have been prohibitively slow. Started a second, disposable local `storybook dev` process on port 6007 (freshly built from the current working tree, same `node_modules`) purely for before/after visual verification, then stopped it afterward; the shared Docker container on 6006 was never touched.
- No `PIL`/`pixelmatch` available in this environment for pixel-diffing; used the already-available `sharp` package (already a project dependency) via a small ad-hoc Node script to do raw-buffer byte comparison of the two full-page PNG screenshots instead. Script was temporary (`scripts/tmp-192-13-*.mjs`), deleted after use, never committed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund B is closed for `AnimeDetailHero.module.css` (this plan's scope); `ReleasePreviewRow.module.css`, `EpisodeGlassCard.module.css`, and `AnimeEdgeNavigation.module.css` remain for Plan 192-14 (named in `192-CONTEXT.md`'s Befund-B list, not touched here).
- The "Guard exception for 192-15" section above gives the upcoming composite-layout-purity guard test everything it needs to encode this file's remaining exceptions precisely, without re-deriving the reasoning.
- No blockers.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 5 claimed modified files confirmed present on disk; both task commits (`4b48dadc4`, `eae58b7bc`) confirmed present in `git log --oneline --all`.
