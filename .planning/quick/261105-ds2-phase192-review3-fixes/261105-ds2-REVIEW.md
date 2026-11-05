---
phase: 261105-ds2-phase192-review3-fixes
reviewed: 2026-11-05T11:12:00Z
depth: standard
files_reviewed: 53
files_reviewed_list:
  - docs/FRONTEND_ARCHITEKTUR.md
  - frontend/.storybook/mocks/animeFixtures.ts
  - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
  - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
  - frontend/src/app/anime/[id]/AnimeDetailView.styles.ts
  - frontend/src/app/anime/[id]/AnimeDetailView.test.tsx
  - frontend/src/app/anime/[id]/AnimeDetailView.tsx
  - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
  - frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts
  - frontend/src/app/anime/[id]/effectTokenPurity.guard.test.ts
  - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
  - frontend/src/app/anime/[id]/page.episodes.module.css
  - frontend/src/app/anime/[id]/page.module.css
  - frontend/src/app/anime/[id]/page.performance.test.ts
  - frontend/src/app/anime/[id]/page.test.tsx
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
  - frontend/src/components/anime/AnimeEdgeNavigation.tsx
  - frontend/src/components/anime/AnimeMediaProvider.tsx
  - frontend/src/components/anime/useAnimeEdgeNavigationHover.ts
  - frontend/src/components/fansubs/EpisodeGlassCard.module.css
  - frontend/src/components/fansubs/EpisodeGlassCard.test.tsx
  - frontend/src/components/fansubs/EpisodeGlassCard.tsx
  - frontend/src/components/fansubs/FansubGroupContext.test.tsx
  - frontend/src/components/fansubs/FansubGroupPicker.module.css
  - frontend/src/components/fansubs/FansubGroupPicker.test.tsx
  - frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts
  - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.tsx
  - frontend/src/components/fansubs/ReleasePreviewRow.module.css
  - frontend/src/components/fansubs/ReleasePreviewRow.test.tsx
  - frontend/src/components/fansubs/ReleasePreviewRow.tsx
  - frontend/src/components/showcases/DesignTokensShowcase.module.css
  - frontend/src/components/showcases/DesignTokensShowcase.tsx
  - frontend/src/components/ui/Button.module.css
  - frontend/src/components/ui/Button.stories.tsx
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/Card.module.css
  - frontend/src/components/ui/Cluster.test.tsx
  - frontend/src/components/ui/FormField.test.tsx
  - frontend/src/components/ui/Pagination.test.tsx
  - frontend/src/components/ui/ResponsiveImage.module.css
  - frontend/src/components/ui/ResponsiveImage.tsx
  - frontend/src/components/ui/Stack.tsx
  - frontend/src/components/ui/processHistory.regression.test.ts
  - frontend/src/components/watchlist/WatchlistAddButton.module.css
  - frontend/src/components/watchlist/WatchlistAddButton.test.tsx
  - frontend/src/components/watchlist/WatchlistAddButton.tsx
  - frontend/src/lib/designTokens.test.ts
  - frontend/src/lib/designTokens.ts
  - frontend/src/styles/tokens/components.css
  - frontend/src/styles/tokens/effects.css
  - frontend/src/styles/tokens/layout.css
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Quick Task 261105-ds2: Code Review Report

**Reviewed:** 2026-11-05T11:12:00Z
**Depth:** standard (grep pattern-matching was insufficient for the explicit focus questions in the
task brief, e.g. "is the align-self fix masking a deeper Cluster semantics issue?" — those required
reading the actual CSS/component code and the git history, which this review did)
**Files Reviewed:** 53 (full `files_modified` list from `261105-ds2-PLAN.md`, cross-checked against
`git diff e85244529..HEAD`)
**Status:** issues_found

## Summary

This quick task set out to fix three Phase-192 review findings: (1) replace a `fireEvent`-based
hover test with a direct function-call test of a newly-extracted `AnimeEdgeNavigationPreviewCard`;
(2) remove `ReleasePreviewRow.module.css`'s remaining local width CSS via `Cluster align="stretch"`
+ a new `Button.fullWidthBelowMd` + a new `ResponsiveImage.fillWidth`, and tighten
`compositeLayoutPurity.guard.test.ts` to flag `width:100%` as a real violation; (3) sweep 46
Phase-192 files for planning-artifact references in comments and add a permanent regression guard.

I verified all three mechanically (ran `vitest`, `tsc --noEmit`, `eslint`; independently re-derived
the 46-file list from `git log` against the real Phase-192 commit range; traced the CSS breakpoint
semantics of the new `Cluster`/`Button` capabilities). The core engineering is sound: the
`AnimeEdgeNavigationPreviewCard` extraction is correctly hookless and exported, the `fireEvent` test
is genuinely gone (`grep -c fireEvent` == 0, confirmed), the `fullWidthBelowMd`/`fillWidth` additions
are narrowly scoped and match existing sibling-prop patterns rather than being speculative API
surface, the guard's `width:100%` tightening is correctly self-tested, and the new
`processHistory.regression.test.ts` allowlist block cannot produce false positives against other
phases by construction (explicit list, not a directory walk) — I independently re-ran the same
pattern search against all 105 actually-Phase-192-touched files and found only one residual hit
outside the reviewed scope (see WR-03 below).

That said, I found four warning-level issues and two info-level issues, none of which are correctness
bugs in the shipped runtime behavior, but which represent real gaps against this task's own stated
goals and against this project's explicit, repeatedly-stated code-comment conventions:

- A newly-discovered **CSS breakpoint mismatch** between `Cluster`'s `@container`-query-based
  `collapseBelow="md"` and the new `Button.fullWidthBelowMd`'s `@media`-viewport-query base, which
  the code comments incorrectly claim are "garantiert synchron" (guaranteed to flip in sync). They
  are not, in general, because one measures container inline-size and the other measures viewport
  width — this directly answers review-focus item (e): the `align-self:center` fix itself is
  legitimate, but it sits on top of a wider, pre-existing (not newly introduced, but now newly
  enshrined as a documented "guarantee" on a reusable primitive) semantics gap.
- A systemic **ASCII-umlaut substitution** (`ae`/`oe`/`ue` instead of `ä`/`ö`/`ü`) in a large fraction
  of the newly-written/edited German comments across roughly 15 of the touched files — directly
  violating this project's explicit, mandatory "Sprachqualität"/"Code-Kommentare" rule, and notably
  ironic given this task's own purpose was comment-quality cleanup.
- `docs/FRONTEND_ARCHITEKTUR.md` was directly edited by this task (a new sentence inserted into an
  existing paragraph) but the surrounding `Befund 22/23/24/26`, `Phase 192`, `Runde 3`,
  `Plan 192-25/27/30/33` references in that same paragraph/file were left untouched — this file was
  never part of the original 46-file search (which only scanned `frontend/`, not `docs/`) nor is it
  covered by the new permanent guard, so Befund 3's "fully resolved, permanently guarded" claim is
  incomplete for this prominent, explicitly-architecture-tracking document.
- A pre-existing English comment with a bare planning-ID reference in `ResponsiveImage.tsx`
  ("Retained for observability/testing only (per P154-06)") was left untouched despite this exact
  file being directly modified by this task — violating the "Bestand beim Anfassen einer Datei" rule
  (English→German, planning-reference removal) that CLAUDE.md states applies whenever a file is
  touched, not only to the specific Befund-3 pattern set.

## Warnings

### WR-01: `Button.fullWidthBelowMd` and `Cluster.collapseBelow="md"` use different measurement
axes — the "guaranteed synchronized breakpoint" claim in the code/docs is false in the general case

**File:** `frontend/src/components/ui/Button.module.css:347-358`,
`frontend/src/components/ui/Button.tsx:35-39`, `frontend/src/components/fansubs/ReleasePreviewRow.tsx:85-90`,
`docs/FRONTEND_ARCHITEKTUR.md:215`
**Issue:** `Cluster`'s `collapseBelow="md"` flips via a **container query**
(`@container cluster (min-width: 48rem)` in `Cluster.module.css:30`), which measures the inline-size
of the `Cluster`'s own `.clusterQueryContainer` root element — i.e. the available width *inside*
whatever ancestor padding/gutters surround it. `Button.fullWidthBelowMd` flips via a **viewport media
query** (`@media (max-width: 767px)` in `Button.module.css:354`). These two only coincide when the
`Cluster`'s container element's inline-size equals the browser viewport width, which is false
whenever there is any padding or gutter between them — which is always the case here:
`ReleasePreviewRow`'s outer `Cluster` sits inside `Card variant="glassStrong" padding="content"`
(`--space-3` = 12px/side), itself nested inside `EpisodeGlassCard`'s own padded cards, itself inside
the page's `--public-page-detail-gutter` (48px/side). The repeated comment claim ("derselbe
Haltepunkt... 48rem/768px, damit beide Mechanismen garantiert synchron kippen") is therefore
incorrect: there exists a real viewport-width band (roughly 768px up to 768px + however much
cumulative ancestor padding/gutter reduces the container below the viewport, easily 60-150px here)
where the viewport media query has already flipped `Button` back to `width: auto`, while the
container query has **not yet** flipped `Cluster` out of its stacked/column layout — i.e. a narrow
button rendering inside what is still visually a stacked, full-width mobile layout. This is not a
new regression (the pre-existing local `.action`/`.body` CSS this task replaced used the exact same
plain `@media (min-width: 768px)` mechanism against the same container-query-driven `Cluster`, so the
mismatch pre-dates this task and was preserved by the task's own Zero-Pixel-Diff mandate), but this
task newly **enshrines the incorrect "guaranteed sync" claim as documented behavior of a reusable,
exported `Button` prop** (`fullWidthBelowMd`) intended for reuse "für Aktions-Buttons, die direkter
Bestandteil eines `Cluster collapseBelow='md'` sind" in general — any future caller who nests the
pairing one level deeper than `ReleasePreviewRow` (adding one more padded ancestor) will silently hit
this gap, with no guard or test catching it, because the mismatch only manifests at specific
viewport widths, not in the Zero-Pixel-Diff suite's two fixed viewports (1440px, 390px — both outside
the affected band).
**Fix:** Either (a) correct the comment to state the actual constraint ("synchronized only when the
`Cluster`'s own container element's inline-size tracks the viewport 1:1, e.g. no ancestor
padding/gutter between the `Cluster` and the viewport — verify per call site"), or (b) make
`fullWidthBelowMd` itself container-query-driven (matching `Cluster`'s own mechanism) instead of
viewport-media-query-driven, e.g. by having the Button read a CSS custom property set by the nearest
`clusterQueryContainer` rather than a hardcoded `@media` rule. Given this is a documentation-accuracy
and un-tested-edge-case issue rather than an observed visual regression in the current call site
(worth confirming during the pending live UAT at viewport widths between ~768px-900px specifically),
a WARNING rather than a BLOCKER.

### WR-02: Systemic ASCII-umlaut substitution in newly-written/edited German code comments

**File:** at minimum `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx:141,143`,
`frontend/src/components/anime/AnimeEdgeNavigation.tsx:41`,
`frontend/src/components/anime/AnimeMediaProvider.tsx:38-39`,
`frontend/src/app/anime/[id]/AnimeDetailHero.module.css:70,90`,
`frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts:12,38,121`,
`frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts:13`,
`frontend/src/app/anime/[id]/effectTokenPurity.guard.test.ts:17`,
`frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts:21`,
`frontend/src/app/anime/[id]/page.performance.test.ts:13`,
`frontend/src/app/anime/[id]/page.test.tsx:37,39,53,55,58`,
`frontend/src/components/fansubs/EpisodeGlassCard.module.css:34-36`,
`frontend/src/components/fansubs/EpisodeGlassCard.test.tsx:16,18,19`,
`frontend/src/components/fansubs/EpisodeGlassCard.tsx:22,39-42`,
`frontend/src/components/fansubs/FansubVersionBrowser.test.tsx:10,57`,
`frontend/src/components/fansubs/ReleasePreviewRow.module.css:30-32,44,58-67`,
`frontend/src/components/fansubs/ReleasePreviewRow.test.tsx:25,45,50`,
`frontend/src/components/fansubs/ReleasePreviewRow.tsx:15,19,21-22`,
`frontend/src/components/watchlist/WatchlistAddButton.module.css:10`,
`frontend/src/styles/tokens/layout.css:12` (full list is larger; this is a representative sample
found via `git diff` + grep, not exhaustive).
**Issue:** CLAUDE.md states, verbatim and as a mandatory, override-default rule: "Code-Kommentare:
Deutsch mit korrekten Umlauten, siehe „Dokumentation wächst mit dem Code“" and "Sprache: Code-
Kommentare werden auf Deutsch mit korrekten Umlauten (ä, ö, ü, Ä, Ö, Ü, ß) geschrieben, nicht in
ASCII-Ersatzschreibung (ae/oe/ue/ss)." A large fraction of this task's own newly-written or newly-
edited German comments use the forbidden ASCII substitution instead (e.g. "Faehigkeit", "Hoechst-
breite", "duerfen", "waere", "vollstaendig", "Flaeche", "aeussere", "gehoeren", "Groesse",
"zusammengefuegten", "haelt" — dozens of occurrences across the sample above). This is the exact
category of defect the project's own documentation-discipline rule and the "Dokumentation wächst mit
dem Code" section were written to prevent, and is especially notable here because this task's own
stated purpose (Befund 3) was precisely to raise the quality bar on these same comments.
**Fix:** Pass every touched file's new/edited German comments through a find/replace or spell-check
pass restoring `ä/ö/ü/ß` (e.g. `Hoechstbreite`→`Höchstbreite`, `Faehigkeit`→`Fähigkeit`,
`duerfen`→`dürfen`, `waere`→`wäre`, `vollstaendig`→`vollständig`, `Flaeche`→`Fläche`,
`gehoeren`→`gehören`, `Groesse`→`Größe`). Given the volume, a scripted pass (grep for
`\b\w*(ae|oe|ue)\w*\b` excluding known-safe tokens like `true`/`value`/`queue`/`continue`) followed
by manual spot-check is more reliable than manual editing of each occurrence.

### WR-03: `docs/FRONTEND_ARCHITEKTUR.md` was touched by this task but its pre-existing
Befund-/Phase-192-/Plan-192-references were left in place, and the file is outside the new guard's
scope entirely

**File:** `docs/FRONTEND_ARCHITEKTUR.md:215,217,259,265`
**Issue:** This task's Task 2 directly edited the sentence at line 215 (inserting the new
`fullWidthBelowMd` documentation) — in the same paragraph that already contains "Seit Review-Befund
2", "Seit der fünften Gap-Closure-Runde (Phase 192, unabhängiger Review Runde 2)" and "Aus der
sechsten Gap-Closure-Runde (Phase 192, unabhängiger Review Runde 2)". Lines 217/259/265 (untouched by
this diff, confirmed via `git diff e85244529..HEAD`) contain further live references: "(Befund 23)",
"Befund 22", "seit Befund B (Phase 192, Runde 3)", "seit Plan 192-27", "Plan 192-25", "Plan 192-30",
"Plan 192-33", "Review-Befund 1 (Phase 192, vierte Gap-Closure-Runde)". None of these were in scope
of the task's 46-file cleanup list (which contains only `frontend/`-relative paths — the original
`CONTEXT.md` search that produced the 46-file count appears to have never searched `docs/` at all)
and `docs/FRONTEND_ARCHITEKTUR.md` is not part of `processHistory.regression.test.ts`'s new
`PHASE_192_PILOT_FILES` allowlist, so there is no permanent regression guard preventing this file from
re-accumulating the same references going forward. This directly contradicts both Befund 3's stated
objective ("Code-Kommentare in den von Phase 192 geänderten Dateien verweisen weiterhin auf
Befunde/Runden/Pläne" — this file was and is one of those changed files) and CLAUDE.md's own
"Architektur-Dokumentation aktuell halten" rule, which specifically calls out `docs/
FRONTEND_ARCHITEKTUR.md` as a file that must be kept current whenever reusable components/contracts
change — which this task's Task 2 did.
**Fix:** Reword lines 217/259/265 to pure domain explanations (same treatment as the other 46 files),
and either add `docs/FRONTEND_ARCHITEKTUR.md` to `PHASE_192_PILOT_FILES` (adjusting the relative-path
resolution, since the test's `process.cwd()` is `frontend/` — would need a `../docs/...` path or a
second, doc-specific regression block) or create an equivalent guard for architecture docs.

### WR-04: `ResponsiveImage.tsx` was directly touched by this task but a pre-existing English
comment with a bare planning-ID reference was left in place

**File:** `frontend/src/components/ui/ResponsiveImage.tsx:94`
**Issue:** `ResponsiveImage.tsx` was modified in this task (the `fillWidth` prop/destructuring/
className logic was added directly next to this line). The file still carries the pre-existing
comment `// Retained for observability/testing only (per P154-06) -- deliberately not read by the`,
which is (a) in English, and (b) a bare planning-ID reference of exactly the type CLAUDE.md's
"Dokumentation wächst mit dem Code" section explicitly forbids ("Verboten in Code-Kommentaren: Reine
Planungs-Verweise als Erklärung wie... 'Gap-08'" — "P154-06" is the same style of reference).
CLAUDE.md's "Bestand beim Anfassen einer Datei" rule states that when a file is touched, its English
comments are translated to German and its pure phase-ID references are reworded to domain
explanations — this applies regardless of whether "P154-06" happens to match this specific task's
narrower Befund-3 pattern set (it is a different, older phase's ID, not a Phase-192 reference, so it
correctly wasn't caught by the new regression guard — but the general CLAUDE.md rule is broader than
that guard).
**Fix:** Reword to German, domain-only, e.g.: "`usingDisplayOriginal` wird nur für Beobachtbarkeit/
Tests mitgeführt und bewusst nicht beim Rendern gelesen" (dropping the "(per P154-06)" reference).

## Info

### IN-01: `D-NN`-style decision-ID references left in files directly touched by this task

**File:** `frontend/src/components/fansubs/ReleasePreviewRow.tsx:46,123`,
`frontend/src/components/fansubs/EpisodeGlassCard.tsx:114`
**Issue:** Both files carry `D-20`/`D-20-Folgefall` comments that were not reworded, even though both
files were directly edited by this task (Task 2's `fullWidthBelowMd`/`align="stretch"` changes touch
`ReleasePreviewRow.tsx` directly; `EpisodeGlassCard.tsx` was touched in the Task-2 deviation that
removed its redundant `width:100%`). This is a defensible, explicitly-documented scoping decision
(the new guard's module comment in `processHistory.regression.test.ts:46-53` correctly notes that
`D-NN` is a codebase-wide requirement-ID convention used across many unrelated, already-completed
phases — e.g. `D-09`/`D-11`/`D-16`/`D-31`/`D-40` appear throughout `frontend/src/lib/` for other
features — so a blanket `D-\d{2}` pattern would have produced the exact kind of cross-phase false
positive the task's RESEARCH.md Pitfall 1 warned against), so this is not a defect in the guard's
design. It is nonetheless a residual gap against CLAUDE.md's general, non-Befund-3-specific "Bestand
beim Anfassen einer Datei" rule, since both files were directly edited (not merely swept). Flagged as
INFO, not WARNING, given the documented, reasoned scoping rationale.
**Fix:** Optional follow-up: reword `D-20`/`D-20-Folgefall` to pure domain explanations in these two
files specifically (not a codebase-wide `D-NN` sweep, which remains legitimately out of scope).

### IN-02: `Button.fullWidthBelowMd` and `Button.responsiveFullWidth` can be set simultaneously with
no guard against the resulting CSS specificity tie

**File:** `frontend/src/components/ui/Button.tsx:102-104`, `frontend/src/components/ui/Button.module.css:337-358`
**Issue:** `fullWidth`, `responsiveFullWidth`, and the new `fullWidthBelowMd` are three independent
optional booleans with no mutual-exclusivity enforced at the type or runtime level. If a caller sets
both `responsiveFullWidth` and `fullWidthBelowMd` (opposite breakpoint directions), the resulting
class list applies both `.buttonResponsiveBlock` and `.buttonFullWidthBelowMd`; since both have equal
selector specificity, source order in `Button.module.css` decides the winner (currently
`fullWidthBelowMd` wins both above and below 768px, silently making `responsiveFullWidth` a no-op).
This mirrors the pre-existing lack of a guard between `fullWidth` and `responsiveFullWidth`, so it is
not a new pattern introduced by this task, but the newly-added third option increases the combinatorial
surface.
**Fix:** Not required for this task's scope; worth a one-line doc-comment note on `fullWidthBelowMd`
("nicht gemeinsam mit `responsiveFullWidth` auf demselben Button verwenden — beide steuern dieselbe
CSS-Eigenschaft in entgegengesetzte Richtungen") so future callers don't combine them by accident.

---

_Reviewed: 2026-11-05T11:12:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
