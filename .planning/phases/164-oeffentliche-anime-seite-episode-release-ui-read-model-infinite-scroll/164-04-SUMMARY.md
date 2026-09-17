---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 04
subsystem: ui
tags: [react, nextjs, css-modules, glassmorphism, fansubs, public-anime-page]

# Dependency graph
requires:
  - phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
    plan: 01
    provides: Extended PublicGroupedEpisode/PublicEpisodeVersion Go DTOs (filler_type, episode_type, container, video_codec, has_images, has_notes, has_karaoke), the runtime source of truth this plan renders
  - phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
    plan: 02
    provides: Matching OpenAPI/TypeScript contract for the same seven fields
provides:
  - EpisodeGlassCard.tsx/.module.css — presentational glass episode header (classification tint, combined classification+type line, plain-text version counter + DisclosureIndicator)
  - ReleasePreviewRow.tsx/.module.css — presentational, non-clickable release preview (group/logo-first, dot-separated tech line, conditional extras/date lines, Button-based "Zum Release ->" link, Coop handling)
  - episodePreviewFormat.ts — pure, unit-tested formatting helpers (classification/type labels, tech-value Unbekannt fallback, release-date-line omission, resolveCoopLinkGroupId) shared by both components
  - LoadingState.tsx additive `compact` prop, ready for the D-36 infinite-scroll loading indicator in plan 164-05
  - FansubVersionBrowser.tsx wired to the two new components, all dead pill/badge/play-button CSS removed, file size 421 -> 328 lines
affects: [164-05, 164-06, 164-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature-local CSS custom properties declared per-component (--glass-*/--glass-tint-*), not in globals.css, matching UI-SPEC decision 1's one-page-only-token precedent"
    - "Pure formatting-helper module (episodePreviewFormat.ts) extracted ahead of markup so both new components and their tests depend only on unit-testable functions, not on rendering"

key-files:
  created:
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css
    - frontend/src/components/fansubs/episodePreviewFormat.ts
    - frontend/src/components/fansubs/episodePreviewFormat.test.ts
  modified:
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/components/ui/LoadingState.tsx

key-decisions:
  - "Kept resolveReleaseName's rendered output (release title/label) as a visible secondary line under the group name in ReleasePreviewRow, even though the UI-SPEC typography table does not name a dedicated role for it — required both by D-08 ('Release-Version/Label falls gepflegt' must be visible) and by the untouched sibling test file FansubVersionBrowser.groupSwitch.test.tsx, which asserts on this exact text (e.g. screen.getByText('Variante 7')) and was explicitly out of this plan's files_modified list."
  - "formatSubtitleType kept as its own function (softsub->Softsub, hardsub->Hardsub) layered on top of formatTechValue's shared 'Unbekannt' fallback, rather than collapsing subtitle mapping directly into formatTechValue, so the tech line renders proper-case German labels instead of raw enum values while still sharing one fallback word per UI-SPEC decision 10."
  - "Zum-Release link's group id resolved via a new one-line resolveCoopLinkGroupId(fansub_groups) helper (fansub_groups[0].id) rather than inline, per the plan's explicit testability requirement -- fansub_groups is already server-sorted by name,id (existing ORDER BY), so no new sorting logic was introduced."

requirements-completed: [REQ-164-01, REQ-164-02, REQ-164-03, REQ-164-04, REQ-164-05, REQ-164-06, REQ-164-07, REQ-164-08, REQ-164-09, REQ-164-10, REQ-164-11, REQ-164-12, REQ-164-13, REQ-164-14, REQ-164-15, REQ-164-16, REQ-164-17, REQ-164-18, REQ-164-19, REQ-164-20, REQ-164-48]

# Metrics
duration: ~45min
completed: 2026-09-17
---

# Phase 164 Plan 04: Episode Glass UI + Release Preview UI Summary

**Replaced FansubVersionBrowser's opaque white episode cards, color-pill version counter, and pill/play-button release rows with classification-tinted glass EpisodeGlassCard/ReleasePreviewRow components (group-first, dot-separated tech text, conditional extras/date lines, Button-based "Zum Release ->" link), driven entirely by the already-fetched public episode data plan 164-01/02 already deliver.**

## Performance

- **Duration:** ~45 min (includes recovery from an accidental container-bind-mount overwrite during pre-existing-failure verification, see Issues Encountered)
- **Completed:** 2026-09-17
- **Tasks:** 3
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments
- `episodePreviewFormat.ts`: pure, fully unit-tested (20/20 passing) formatting helpers — classification/type label resolvers (with the deliberately distinct `episodeTypeLabel('recap')` = "Rückblickfolge" vs `classificationLabel('recap')` = "Rückblick" per D-04), `formatVersionCountLabel` (no "+" prefix), `formatTechValue`/`formatSubtitleType` (unified "Unbekannt" fallback), `formatReleaseDateLine` (returns `null` to signal line omission per D-14), moved `resolveLogoUrl`/`resolveEpisodeTitle`/`resolveReleaseName` verbatim, new `resolveCoopLinkGroupId`.
- `EpisodeGlassCard.tsx`/`.module.css`: glass episode header with 4 classification tint variants (canon/filler/mixed/recap) plus a neutral untinted surface for `unknown` (no tint class, no label, per D-04/decision 4), `backdrop-filter: blur(14px) saturate(1.15)` wrapped in `@supports` with dual-prefix fallback declarations, plain-text version counter + `DisclosureIndicator` replacing the old blue pill.
- `ReleasePreviewRow.tsx`/`.module.css`: group/logo-first identity block (36px `<Image alt="">` or initials fallback), Coop rendering (multiple logos/names joined by " × " plus a plain-text "COOP" label, no chip), dot-separated tech line (`resolution · container · codec · subtitle`, all four independently falling back to "Unbekannt"), conditional extras line (📷/📝/♪, omitted entirely when all three flags are false), conditional date line (omitted entirely when `release_date` is null), and a `Button href=... variant="secondary"` "Zum Release →" link to `/anime/{animeID}/group/{groupID}/releases/{releaseVersionID}` — the row itself carries no `onClick`/`role="button"`.
- `LoadingState.tsx`: additive `compact?: boolean` prop mirroring `EmptyState`'s existing `stateCompact` precedent exactly; repo-wide grep confirmed all ~50 existing call sites remain unaffected (title/description-only usage).
- `FansubVersionBrowser.tsx`: wired to both new components, dropped from 421 to 328 lines; all fetch/abort/race-guard state logic (`requestRef`, `switchTo`, `loadMore`, `mergeEpisodes`, `expandedEpisodes`) is byte-for-byte unchanged — only the rendered JSX changed.
- `FansubVersionBrowser.module.css`: all dead pill/badge/play-button CSS removed (`.episodeCard`, `.episodeHeader`, `.episodeNumber`, `.summaryLine`, `.countBadge`, `.versionList`, `.versionRow`, `.versionMeta`, `.versionIdentity`, `.versionLogo`, `.versionLogoFallback`, `.versionIdentityText`, `.versionGroupName`, `.versionReleaseName`, `.badgeRow`, `.metaBadge`, `.playButton`); only `.section`, `.emptyBox`, `.episodeList`, `.episodeListDimmed` remain.
- `FansubVersionBrowser.test.tsx`: added a full D-48 visual test-case suite (classification tints 1-4, unknown-no-label case 5, episode-type labels 6-9, logo/fallback 10-11, date presence/absence 12-13, extras combinations 14-17, Coop 18, multi-release episodes 19) plus updated the pre-existing markup-coupled assertions (`+N Versionen` → `N Versionen`, `Version abspielen` play-link → `Zum Release →` link/href) to match the new glass UI, without touching any of the URL-state/group-switch fetch-behavior assertions in the same file or in the untouched sibling `FansubVersionBrowser.groupSwitch.test.tsx`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract pure formatting helpers and build EpisodeGlassCard** - `087c6a32` (feat)
2. **Task 2: Build ReleasePreviewRow and LoadingState compact prop** - `4f90dd09` (feat)
3. **Task 3: Wire EpisodeGlassCard/ReleasePreviewRow into FansubVersionBrowser, retire dead CSS, add visual-contract tests** - `0b84b8a6` (feat)

## Files Created/Modified
- `frontend/src/components/fansubs/episodePreviewFormat.ts` - Pure classification/type/tech/date formatting helpers, moved verbatim helpers, new `resolveCoopLinkGroupId`
- `frontend/src/components/fansubs/episodePreviewFormat.test.ts` - 20 unit tests covering every documented behavior
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx` - Glass episode header (tint, classification+type line, version counter, disclosure)
- `frontend/src/components/fansubs/EpisodeGlassCard.module.css` - Feature-local glass/tint tokens, `@supports` blur with dual-prefix fallback, 4 tint variants
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - Group-first, non-clickable release preview row
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css` - Neutral glass sub-element styling, mobile-first stacked -> desktop two-column layout at 768px
- `frontend/src/components/ui/LoadingState.tsx` - Additive `compact` prop
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - Wired to new components, dead helpers removed, 421 -> 328 lines
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` - Dead pill/badge/play-button CSS removed (174 -> 21 lines)
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - D-48 visual test-case suite added, markup-coupled assertions updated
- `.planning/phases/164-.../deferred-items.md` - Two pre-existing, out-of-scope findings logged (see Deviations)

## Decisions Made
See `key-decisions` in frontmatter.

## Deviations from Plan

### Auto-fixed Issues

None — all three tasks matched the plan's action/behavior specification directly; no Rule 1/2/3 auto-fixes were needed in the component/helper code itself.

**1. [Rule 1 - Bug] Fixed two of my own newly-added D-48 test assertions that used the wrong query API for decorative images and un-normalized extras-line whitespace**
- **Found during:** Task 3 verification (`npx vitest run FansubVersionBrowser.test.tsx`)
- **Issue:** My new "Testfall 10" test used `screen.getByRole('img')`, but an `<img alt="">` (decorative, per UI-SPEC) is intentionally removed from the accessibility tree's `img` role (ARIA presentation role) — the assertion failed even though the `<img>` element was correctly rendered. My new "Testfall 14-16" test asserted the exact literal string `'📷 Bilder   ♪ Karaoke'` (three raw spaces), but Testing Library's `getByText` normalizes whitespace by default, collapsing the three spaces to one for comparison.
- **Fix:** Switched the logo assertion to `screen.getByAltText('')` (queries by the `alt` attribute directly, independent of ARIA role) and adjusted the extras-line expectation to the whitespace-normalized single-space string; the actual rendered DOM output (three raw spaces, verified via the test's own debug output) was not changed.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Verification:** `npx vitest run FansubVersionBrowser.test.tsx` — both tests pass; the underlying `ReleasePreviewRow.tsx` extras-line `join('   ')` (three literal spaces) was not touched.
- **Committed in:** `0b84b8a6` (Task 3 commit)

**2. [Rule 1 - Bug] Fixed a real `it.each` tuple/callback-arity type mismatch in my own new D-48 test**
- **Found during:** Task 3 verification (`npx tsc --noEmit`)
- **Issue:** My new classification-tint `it.each` table included an unused third tuple element (a tint-class-name string) that the callback signature didn't accept, producing a genuine `tsc` error (3-element tuple vs. 2-parameter callback).
- **Fix:** Removed the unused third element from each tuple.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Verification:** `npx tsc --noEmit` exits with only the pre-existing, unrelated `AnimePageProps` error (see Issues Encountered).
- **Committed in:** `0b84b8a6` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both self-contained within test assertions I wrote in this same task — no scope expansion beyond making my own new tests correct).
**Impact on plan:** None on production code; both fixes were corrections to my own newly-written test code before it was ever committed.

## Issues Encountered
- **Process incident (self-recovered, no data loss, no destructive git commands used):** while independently re-verifying that the pre-existing "merges 125 variants..." test failure (already documented in 164-02-SUMMARY.md) still reproduced identically after this plan's changes, I used `docker compose cp` to temporarily overwrite `FansubVersionBrowser.tsx`/`.module.css`/`.test.tsx` inside the frontend container with their pre-164-04 (commit `1c00a00a`) content. Because the frontend container bind-mounts the host `frontend/` directory, this write went directly to the host files, silently discarding my uncommitted Task 3 edits (which had not yet been committed at that point). No `git stash`/`git clean`/`git reset --hard` was used at any point — I detected the loss via `git diff --stat` showing zero pending changes against the last real commit, and recovered by re-applying the exact same Task 3 edits (component wiring, dead-CSS removal, test-file changes) from scratch via `Write`/`Edit`, then re-ran the full verification suite to confirm the recovered state was correct. Verified the pre-existing failure reproduces identically on the true pre-164-04 file content (confirming, again, that it is unrelated to this plan) before restoring my own work.
- **Two pre-existing, out-of-scope failures confirmed during full-suite verification** (`npx vitest run` across the whole `frontend/src` tree), both logged in `deferred-items.md`, neither caused by any file this plan modified:
  1. `FansubVersionBrowser.test.tsx > bounded public inventory continuation > merges 125 variants...` — already documented in 164-02-SUMMARY.md as pre-existing; reconfirmed unaffected by 164-04 (fetch/pagination logic untouched).
  2. `cssCustomProperties.guard.test.ts`'s two "real frontend/src tree" assertions — a hardcoded `line: 282` in that guard's allow-list no longer matches the actual line (268) of an unrelated textual `--surface-muted` mention inside a test-description string in `roleCatalog.accessibility.test.ts`. Neither file was read or touched by any 164-04 task; `git log` confirms both were last modified in phases 149/151/157.
- Pre-existing `AnimePageProps`/Next.js 16 `searchParams` typecheck error in `frontend/src/app/anime/page.tsx` (already documented in 164-02-SUMMARY.md's deferred-items.md) continues to reproduce identically; not touched.

## User Setup Required

None - no external service configuration, no runtime restart required. All changes are pure frontend component/CSS/test files; the frontend container continued running throughout (no restart needed for this plan's verification, which was entirely automated `vitest`/`tsc`/`eslint`).

## Next Phase Readiness
- `EpisodeGlassCard`/`ReleasePreviewRow`/`episodePreviewFormat.ts` are now the canonical presentational layer for episode/release rendering on `/anime/[id]`, fully decoupled from `FansubVersionBrowser.tsx`'s fetch/pagination state machine.
- `LoadingState`'s new `compact` prop is ready for plan 164-05's D-36 infinite-scroll forward/backward loading indicators without any further primitive changes.
- `FansubVersionBrowser.tsx` at 328 lines has ample headroom under the 450-line cap for plan 164-05's windowing/sentinel/eviction state additions.
- No blockers for plan 164-05 (Infinite Scroll / Bidirectional Windowing), which is explicitly scoped to touch `FansubVersionBrowser.tsx` again for the fetch/state-machine layer only — this plan's rendering layer is stable and independently tested.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-17*

## Self-Check: PASSED

All 10 created/modified plan files plus `deferred-items.md` verified present on disk; all
three task commit hashes (`087c6a32`, `4f90dd09`, `0b84b8a6`) verified present in
`git log --oneline --all`.
