---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 14
subsystem: ui
tags: [react, css-modules, storybook, design-system, cluster, stack, card, playwright, visual-regression]

requires:
  - phase: 192-11
    provides: "Card padding override-hook prop"
  - phase: 192-12
    provides: "SplitLayout.gap als Zweck-Enum, Root-Cause-Fix der Anime-Kopf-Sichtregression"
  - phase: 192-13
    provides: "Divider-Grundbaustein-Einsatz, Card-padding-Prop-Einsatz-Muster, dokumentierte Guard-Ausnahmen fuer AnimeDetailHero.module.css"
provides:
  - "ReleasePreviewRow.module.css/.tsx: Innenabstand ueber Cards padding-Hook statt lokalem CSS; .row behaelt eine dokumentierte Einzelfall-Ausnahme fuer ihre Haltepunkt-Umkehr; zwei wirkungslose Alt-Flex-Regeln (.action, .extrasLine) entfernt"
  - "EpisodeGlassCard.module.css/.tsx: Kopfzeile (Titel+Versionszaehler) ueber Cluster, Versionsliste ueber Stack statt eigenem display:flex/grid; .versionLists asymmetrische Polsterung bleibt dokumentierte Ausnahme"
  - "AnimeEdgeNavigation.module.css/.tsx: previewCard-Innenabstand ueber Cards padding-Hook, Bild+Text-Anordnung ueber Cluster; .previewCard enthaelt nur noch Positionierung/Groesse/Sichtbarkeit"
  - "Cluster.tsx: zwei neue Zweck-Werte (labelWithTrailingMeta, mediaCaption) plus zwei neue Zweck-Token in layout.css, fuer Faelle, in denen keiner der vier bestehenden Zwecke semantisch UND wertgleich passte"
  - "gapPurposeNaming.guard.test.ts schuetzt jetzt sechs statt vier Aufrufstellen-Dateien (EpisodeGlassCard.tsx, AnimeEdgeNavigation.tsx neu dazu)"
affects: [192-15]

tech-stack:
  added: []
  patterns:
    - "Wenn keiner der bestehenden Cluster-Zweck-Werte semantisch passt UND denselben Space-Wert liefert, wird ein neuer, eng benannter Zweck-Wert ergaenzt statt eines semantisch falschen bestehenden Werts (z. B. 'interactiveChipRow' fuer eine nicht-interaktive Kopfzeile) oder eines Werts mit falschem Pixel-Ergebnis -- gleiche Erweiterungslogik wie Cards padding-Prop in 192-11"
    - "Wirkungslose Alt-Flex-/Grid-Deklarationen (Flex-Container mit nur einem Kind oder einem einzigen zusammengefuegten Textknoten) werden beim Anfassen der Datei als Rule-1-Fund entfernt, nicht nur die vom Plan explizit benannten Selektoren"

key-files:
  created:
    - frontend/src/components/fansubs/EpisodeGlassCard.test.tsx
  modified:
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.module.css
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/styles/tokens/layout.css
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts

key-decisions:
  - "Cluster bekommt zwei neue Zweck-Werte (labelWithTrailingMeta fuer EpisodeGlassCard.headerTitleRow, mediaCaption fuer AnimeEdgeNavigation.previewCard) statt eines wiederverwendeten, semantisch falschen bestehenden Werts -- beide neuen Werte loesen auf denselben var(--space-3)-Grundwert auf (Zero-Pixel-Diff), tragen aber einen ehrlichen, am tatsaechlichen Einsatzzweck ausgerichteten Namen statt 'interactiveChipRow' (keine interaktive Chip-Reihe) oder 'contentPair' (waere var(--space-4), falscher Pixel-Wert)"
  - "ReleasePreviewRow's .row behaelt als einzige verbleibende Ausnahme dieser Datei ihr eigenes display:flex/flex-direction/gap: weder SplitLayout (feste erste/flexible zweite Spalte -- hier ist es umgekehrt) noch Cluster (keine Haltepunkt-abhaengige Stapel-vs-Reihen-Umkehr) koennen die Mobil-Stapel-vs-Desktop-Reihe-Umkehr abbilden; eine Erweiterung eines der beiden Grundbausteine um eine so spezifische Faehigkeit waere eine eigene, groessere Architekturentscheidung, keine Drive-by-Erweiterung dieses Plans"
  - "EpisodeGlassCard's .versionList behaelt ihr asymmetrisches padding+border-top als dokumentierte Ausnahme: Cards padding-Prop kennt nur einen einzigen, gleichmaessigen Wert, und .versionList ist selbst kein Card-Element, sondern ein reiner Trennabschnitt innerhalb der umschliessenden Card -- Cards Hook greift hier konzeptionell nicht"
  - "Zwei wirkungslose Alt-Flex-Regeln (ReleasePreviewRow .action, .extrasLine) wurden beim Anfassen der Datei entfernt, obwohl sie nicht explizit im Plan-Behavior genannt waren -- beide erfuellten keine sichtbare Funktion mehr (ein Flex-Container mit genau einem Kind bzw. mit einem einzigen zusammengefuegten Textknoten statt mehrerer Kinder zum Umbrechen) und verstiessen gegen die must_haves-Vorgabe 'kein display:flex/gap/padding ausserhalb einer dokumentierten Ausnahme'"

patterns-established:
  - "Vor dem Hinzufuegen eines neuen Cluster/Stack-Zweck-Werts wird zuerst geprueft, ob ein bestehender Wert SOWOHL semantisch passt ALS AUCH denselben Pixel-Wert liefert -- nur wenn beides nicht zutrifft, wird ein neuer, eng benannter Wert ergaenzt (nie nur wegen semantischer ODER nur wegen Wert-Abweichung alleine)"

requirements-completed: [Befund-B]

duration: ~22min
completed: 2026-11-04
---

# Phase 192 Plan 14: ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation Layout-CSS-Bereinigung Summary

**Die letzten drei der vier Befund-B-Pilot-Bausteine (ReleasePreviewRow, EpisodeGlassCard, AnimeEdgeNavigation) verlieren ihr eigenes display:flex/grid/padding zugunsten von Cluster/Stack/Cards padding-Hook -- Cluster bekommt dabei zwei neue, eng begruendete Zweck-Werte (labelWithTrailingMeta, mediaCaption) fuer Faelle ohne passenden bestehenden Wert, und ein Playwright-Pixelvergleich (vier Storybook-Zustaende, Vor-/Nachzustand) bestaetigt Zero-Pixel-Diff fuer alle vier.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-11-04T17:53:34Z
- **Completed:** 2026-11-04T18:14:58Z
- **Tasks:** 3
- **Files modified:** 11 (1 created, 10 modified)

## Accomplishments
- `ReleasePreviewRow.module.css`: `.row`'s Innenabstand kommt jetzt ueber `Card variant="glassStrong" padding="3"` statt eines lokalen `padding:`; `.row` behaelt als einzige dokumentierte Ausnahme ihr eigenes `display:flex`/`flex-direction`/`gap` fuer die Mobil-Stapel-vs-Desktop-Reihe-Umkehr (weder SplitLayout noch Cluster koennen das abbilden). Zwei wirkungslose Alt-Flex-Regeln (`.action`, `.extrasLine`) entfernt -- beide hatten keine sichtbare Wirkung mehr (ein Kind bzw. ein einzelner zusammengefuegter Textknoten statt mehrerer umbrechender Kinder).
- `EpisodeGlassCard.module.css`/`.tsx`: `.headerTitleRow` entfaellt vollstaendig -- `Cluster gap="labelWithTrailingMeta" justify="between"` uebernimmt die Kopfzeilen-Anordnung (Titel-Block links, Versionszaehler rechtsbuendig). `.headerText` verliert ihr wirkungsloses `display:flex;flex-direction:column` (die Kind-Spans sind bereits `display:block` und stapeln sich identisch). `.versionList`'s `display:grid;gap:` wird durch `Stack gap="section"` ersetzt; die asymmetrische `padding`+`border-top`-Kombination bleibt als dokumentierte Einzelfall-Ausnahme (Card kennt nur einen gleichmaessigen Wert, und `.versionList` ist kein eigenes Card-Element).
- `AnimeEdgeNavigation.module.css`/`.tsx`: `Card` bekommt `padding="3"` statt eines lokalen `padding:` auf `.previewCard`; die Bild+Text-Anordnung kommt ueber `Cluster gap="mediaCaption" align="stretch"` (explizites `align="stretch"` reproduziert den bisherigen Flex-ohne-`align-items`-Browser-Standard, da Clusters eigener Default `"center"` waere). `.previewCard` enthaelt jetzt nur noch Positionierung/Groesse/Sichtbarkeit.
- `Cluster.tsx` bekommt zwei neue Zweck-Werte (`labelWithTrailingMeta`, `mediaCaption`), da keiner der vier bestehenden Werte fuer die beiden neuen Aufrufstellen sowohl semantisch passte als auch denselben `var(--space-3)`-Pixel-Wert lieferte -- neue Zweck-Token in `layout.css`, neue Storybook-Stories, erweiterter `Cluster.test.tsx`.
- `gapPurposeNaming.guard.test.ts` schuetzt jetzt `EpisodeGlassCard.tsx` und `AnimeEdgeNavigation.tsx` zusaetzlich zu den vier bestehenden Aufrufstellen.
- Live-Nachweis per Playwright gegen zwei disposable lokale Storybook-Instanzen (Vorzustand `a6bbabf37` via `git worktree add --detach` auf Port 6007, aktueller Zustand auf Port 6008, nach etablierter Vorgehensweise aus Plan 192-13): Full-Page-Screenshots der drei geforderten `ReleasePreviewRow`-Storys ("Mit allen Extras", "Koop", "Ohne Logo") und der `AnimeEdgeNavigation`-Hover-Vorschaukarte ("Mit Zurueck und Weiter", Hover auf "Weiter") zeigen **byte-identische PNGs** (Vor-/Nachzustand, alle vier Faelle) -- Zero-Pixel-Diff bestaetigt. Worktree, temporaere Screenshots und das temporaere Script wurden danach geloescht.

## Task Commits

Each task was committed atomically:

1. **Task 1: ReleasePreviewRow -- remove local row/action flex+padding** - `8f036a322` (refactor)
2. **Task 2: EpisodeGlassCard -- headerTitleRow/headerText/versionList cleanup** - `c425714d1` (refactor)
3. **Task 3: AnimeEdgeNavigation -- previewCard flex+padding cleanup** - `2fbaf6015` (refactor)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Note: All three tasks were marked `tdd="true"` in the plan. For Tasks 1 and 3 (pure structural CSS/JSX refactors on files with existing structural tests, explicit zero-pixel-diff goal), verification took the existing test suite plus the Playwright byte-diff pass described above, matching the established pattern from 192-11/192-12/192-13-SUMMARY.md. Task 2 additionally created a new `EpisodeGlassCard.test.tsx` (the plan's verify command referenced a test file that did not yet exist -- EpisodeGlassCard was previously only tested indirectly via `FansubVersionBrowser.test.tsx`) with a genuine RED/GREEN CSS-text-scan cycle: the first assertion (`not.toMatch(/display:\s*flex/)` etc.) failed against the pre-change file, then passed after the cleanup -- a real RED/GREEN gate, not a retrofitted test against already-correct code._

## Files Created/Modified
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - `Card` gains `padding="3"`; updated comment explaining the now-resolved Card/`.row` padding ownership question
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css` - `.row` keeps a documented single exception (flex/flex-direction/gap for the breakpoint reversal); `.row`'s own `padding:` removed; `.action`'s inert `display:flex;justify-content:flex-end` removed (base + desktop media query, `flex-shrink:0` kept); `.extrasLine`'s inert `display:flex;flex-wrap:wrap;gap:` removed (falls back to the shared `display:block` rule)
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx` - `Cluster`/`Stack` imports; `.headerTitleRow` wrapper replaced by `<Cluster as="span" gap="labelWithTrailingMeta" justify="between" align="center" wrap={false}>`; version list children wrapped in `<Stack gap="section">`
- `frontend/src/components/fansubs/EpisodeGlassCard.module.css` - `.headerTitleRow` rule removed entirely (Cluster owns the layout); `.headerText` reduced to `display:block;min-width:0`; `.versionList`'s `display:grid;gap:` removed, asymmetric `padding`+`border-top` documented as the sole remaining exception
- `frontend/src/components/fansubs/EpisodeGlassCard.test.tsx` (new) - CSS-text-scan guard (no `display:flex`/`flex-direction`/`display:grid` outside comments) + two behavior tests (header title/counter render side by side; passed-through release rows land inside a `Stack` parent when expanded)
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `Cluster` import; `Card` gains `padding="3"`; `ResponsiveImage`+text block wrapped in `<Cluster gap="mediaCaption" align="stretch" wrap={false}>`
- `frontend/src/components/anime/AnimeEdgeNavigation.module.css` - `.previewCard`'s `display:flex;gap:var(--space-3);padding:var(--space-3)` removed, keeping only position/size/visibility
- `frontend/src/components/ui/Cluster.tsx` - two new `ClusterGapPurpose` values (`labelWithTrailingMeta`, `mediaCaption`) with documented reasoning for not reusing an existing value
- `frontend/src/components/ui/Cluster.stories.tsx` - two new stories (`BeschriftungMitZusatzinfo`, `BildMitBildunterschrift`) demonstrating the new purpose values ("Stories ziehen mit" rule)
- `frontend/src/components/ui/Cluster.test.tsx` - extended gap-purpose coverage for the two new values
- `frontend/src/styles/tokens/layout.css` - two new purpose tokens (`--space-label-with-trailing-meta`, `--space-media-caption`), both resolving to the existing `var(--space-3)` grundskala value
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `guardedCallSiteFiles` extended with `EpisodeGlassCard.tsx`/`AnimeEdgeNavigation.tsx`

## Decisions Made
- See `key-decisions` in frontmatter for the full reasoning on the two new Cluster purpose values, `.row`'s single remaining exception, `.versionList`'s padding exception, and the dead-CSS removal in `ReleasePreviewRow.module.css`.
- Chose two separate new Cluster purposes (`labelWithTrailingMeta`, `mediaCaption`) rather than one shared generic name for both new call sites: per Befund 24's explicit per-call-site naming guidance ("pro Aufrufstelle den fachlichen Zweck benennen"), a title+counter header row and a thumbnail+caption media pairing are genuinely different relationships even though both happen to resolve to the same `var(--space-3)` pixel value -- collapsing them into one name would have been dishonest naming purely to avoid a second token.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed two inert local flex declarations in `ReleasePreviewRow.module.css` not explicitly named in the plan's `<behavior>` text**
- **Found during:** Task 1
- **Issue:** `.action { display:flex; justify-content:flex-end; }` and `.extrasLine { display:flex; flex-wrap:wrap; gap:var(--space-4); }` both had zero visible effect -- `.action` always contains exactly one child whose own `width` rule fully determines positioning regardless of the parent's `display`; `.extrasLine` wraps a single already-joined text string (`extras.join('   ')`), so there are no separate children for `flex-wrap` to wrap. Leaving them in place would have violated this plan's own must-have ("ReleasePreviewRow.module.css declares no display:flex/gap:/padding: of its own outside a documented, non-generalizable exception") since neither was a documented exception.
- **Fix:** Removed both declarations; `.extrasLine` now falls through to the pre-existing shared `.techLine, .extrasLine, .dateLine { display: block; }` rule (identical rendered result, confirmed via the Playwright byte-diff below).
- **Files modified:** `frontend/src/components/fansubs/ReleasePreviewRow.module.css`
- **Verification:** `ReleasePreviewRow.test.tsx` green; Playwright full-page screenshot byte-diff = 0 for all three required stories (Mit allen Extras, Koop, Ohne Logo) before/after.
- **Committed in:** `8f036a322` (Task 1 commit)

**2. [Rule 3 - Blocking] Created `EpisodeGlassCard.test.tsx`, which the plan's verify command referenced but which did not exist**
- **Found during:** Task 2
- **Issue:** Task 2's `<verify>` block referenced `npx vitest run src/components/fansubs/EpisodeGlassCard.test.tsx`, but `EpisodeGlassCard` was previously tested only indirectly via `FansubVersionBrowser.test.tsx` -- no dedicated test file existed to run.
- **Fix:** Created `EpisodeGlassCard.test.tsx` following the project's established CSS-text-scan pattern (e.g. `AnimeRelations.test.tsx`, `Card.test.tsx`) plus two render-based behavior assertions, run as a genuine RED (failed against the pre-cleanup file) then GREEN (passed after cleanup) cycle.
- **Files modified:** `frontend/src/components/fansubs/EpisodeGlassCard.test.tsx` (new)
- **Verification:** Test file passes against the cleaned-up component; `FansubVersionBrowser.test.tsx`'s existing EpisodeGlassCard-adjacent assertions remain green.
- **Committed in:** `c425714d1` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug/dead-code removal, 1 blocking/missing-test-file)
**Impact on plan:** Both were necessary to actually satisfy this plan's own must-haves and verification commands. No scope creep beyond the four named composite files plus the Cluster primitive extension the plan itself anticipated as a possible outcome ("otherwise this may need a NEW Cluster purpose value").

## Issues Encountered
- The disposable local Storybook instance on port 6007 (baseline, started from a `git worktree add --detach` checkout of commit `a6bbabf37`) crashed/became unresponsive partway through the first screenshot pass (webpack HMR churn under concurrent dev-server load, not a code issue) -- all baseline screenshots were invalid (blank "no preview" pages) until the instance was killed and restarted cleanly. Retook all four baseline screenshots after the restart; all four then matched the "current" screenshots byte-for-byte.
- A pre-existing, out-of-scope test failure (`src/components/ui/ResponsiveImage.config.test.ts`, already logged in this phase's `deferred-items.md` under Plan 192-02, re-confirmed unrelated in 192-12/192-13) was observed again during the broader regression check; confirmed unrelated (no file this plan touches overlaps `ResponsiveImage`/`next.config.mjs`) and left untouched per the scope-boundary rule.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund B's four named pilot composite files (`AnimeDetailHero.module.css` in 192-13; `ReleasePreviewRow.module.css`, `EpisodeGlassCard.module.css`, `AnimeEdgeNavigation.module.css` in this plan) are all closed.
- **Guard exception inventory for the upcoming composite-layout-purity guard (Plan 192-15)**, combined with 192-13's own list:
  1. `ReleasePreviewRow.module.css` `.row { display:flex; flex-direction:column; gap: var(--space-3); }` (base) and its `@media (min-width: 768px)` override (`flex-direction:row; align-items:center; justify-content:space-between; gap:var(--space-4);`) -- documented single exception, breakpoint-dependent stack-vs-row reversal that neither `SplitLayout` (wrong fixed/flexible column ratio) nor `Cluster` (no breakpoint-collapse capability) can express.
  2. `EpisodeGlassCard.module.css` `.versionList { padding: var(--space-3) var(--space-4) var(--space-4); border-top: 1px solid var(--border-on-media); }` -- documented exception, asymmetric padding Card's uniform `padding` prop cannot express, on a plain `<div>` that is not itself a Card instance.
  3. `AnimeEdgeNavigation.module.css`'s `.previewCard` has **no remaining exception at all** -- fully reduced to position/size/visibility.
- No blockers. All three files' composite CSS is now either Cluster/Stack-driven or a narrowly documented, non-generalizable exception, matching this plan's and 192-13's `must_haves` exactly.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 11 claimed created/modified files confirmed present on disk (including the new
`EpisodeGlassCard.test.tsx`); all three task commits (`8f036a322`, `c425714d1`, `2fbaf6015`)
confirmed present in `git log --oneline --all`.
