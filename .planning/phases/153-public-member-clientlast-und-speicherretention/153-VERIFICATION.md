---
phase: 153-public-member-clientlast-und-speicherretention
verified: 2026-09-10T12:15:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Phase 153: Public-Member-Profil — Speicherretention, Importgraph und SSR-Sichtbarkeit Verification Report

**Phase Goal:** Die drei P1-Befunde der Messreihe vom 2026-09-09 sind geschlossen: die native
Auto-Sizes-DOM-Retention (RCA-01), der Editor-Importzweig im öffentlichen Graph (RCA-02) und die
Skeletons, die vorhandene SSR-Inhalte bis zur Hydration verdecken (RCA-03).
**Verified:** 2026-09-10T12:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Method

All claims were independently reproduced against the live codebase and running containers, not
taken from SUMMARY.md text. Reproduced this session: `npx tsc --noEmit` (0 errors), full `npm test`
(295/296 files, 2263/2266 tests, 0 failures — exact match to claimed numbers), `npm run lint` (344
problems / 13 errors / 331 warnings — exact match, all 13 errors independently confirmed in
phase-foreign admin files via direct grep of the lint output), `docker compose build` (exit 0, both
images built), `scripts/audit-public-member-bundles.mjs` (independently re-run; 0 tiptap/prosemirror
categories for both `members/[slug]/page.js` and `fansubs/[slug]/page.js`, byte counts match
153-AFTER.md to the byte), and a fresh 12-cycle `scripts/audit-public-member-navigation-retention.mjs`
run (1187→1434 nodes, 634→818 listeners — matches 153-AFTER.md's independently-reproduced numbers
within cold-start noise). Source diffs for every touched file were read directly via `git diff`/`git
show`, not inferred from commit messages.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `sizes` is deterministic (no `auto,` prefix) for lazy and priority achievement images (P153-01) | VERIFIED | `frontend/src/components/profile/AchievementArtwork.tsx:35` — `const sizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES`; repo-wide grep for `auto,`/`sizes="auto"` under `frontend/src` returns zero matches |
| 2 | Lazy loading, reserved 1254×1254 geometry, optimizer usage, `srcset` unchanged (P153-02) | VERIFIED | `git diff` of the `AchievementArtwork.tsx` change across the whole phase shows exactly 3 lines touched (the `sizes`/`fallbackSizes` computation); `AchievementArtwork.module.css` has zero diff across the phase |
| 3 | No linear DOM-/listener retention over 12/50 SPA cycles (P153-03) | VERIFIED | Independently re-ran 12-cycle audit this session: 1187→1434 nodes (+20.6/cycle), 634→818 listeners (+15.3/cycle) vs. the pre-fix baseline's ~1220 nodes/cycle, ~62.75 listeners/cycle — ~59×/~4× improvement, reproduces 153-01-SUMMARY.md and 153-AFTER.md's numbers almost exactly |
| 4 | Four renderer-only consumers import `RichTextRenderer` directly, not via barrel (P153-04) | VERIFIED | Grep confirms `MemberStorySection.tsx`, `MemberGroupsHistorySection.tsx`, `PublicNoteCard.tsx`, `AnimeProjectNotesSection.tsx` all import from `'@/components/editor/RichTextRenderer'` |
| 5 | Barrel structure decision (B3) documented (P153-05) | VERIFIED | `frontend/src/components/editor/index.ts` no longer exports `RichTextRenderer`; carries a 12-line rationale comment; three dual-symbol consumers (`ProfileStoryCard`, `AnimeProjectNoteWorkspace`, `NotesTab.helpers`) compile against two explicit imports each (`tsc --noEmit` clean) |
| 6 | Private not-found preview behind a real loading boundary; owner/privacy logic unchanged (P153-06) | VERIFIED | `not-found.tsx` uses `'use client'` + `next/dynamic(..., { ssr: false })`; `OwnHiddenProfilePreview.tsx` last touched in a pre-phase commit (`fa7c9772`, Phase 132) — zero diff in Phase 153; 9/9 tests pass in `not-found.test.tsx` + `OwnHiddenProfilePreview.test.tsx`, covering both owner and anonymous paths |
| 7 | No Tiptap/ProseMirror/RichTextEditor in public import graph (P153-07) | VERIFIED | Independently re-ran `audit-public-member-bundles.mjs`: `app/members/[slug]/page.js` has 0 tiptap/0 prosemirror module categories (was 38/11); `app/fansubs/[slug]/page.js` (control) also 0; `RichTextRenderer.tsx` itself untouched (last touch: Phase 41) |
| 8 | Server-present content visible before full hydration; data/SEO/accessibility unchanged (P153-08) | VERIFIED | `data-visible`/skeleton overlay grep returns zero matches in `MemberCurrentProjectsSection`, `LatestContributionsSection`, `PreviousContributionsSection`, `MemberBadgeChain`; full phase diff-stat shows zero touches to `MemberProfileContent.tsx`, `page.tsx`, or any data-fetching file |
| 9 | Empty areas server-decided; locked badge ladder scope preserved (P153-09) | VERIFIED | `MemberCurrentProjectsSection`'s `totalCount === 0` branch renders only `SectionHeader`+`EmptyState`; `MemberBadgeChain`'s content-determining diff (`git show 95b4e1d7`) touches only 9 lines, all inside the deleted skeleton `<div>` — zero change to `buildMemberBadgeGroups`/`catalogWithEarnedBadges`/`renderItem` |
| 10 | Smaller interactive islands with real loading boundaries; no skeleton-timer cosmetics (P153-10) | VERIFIED | `interactionEnabled` from `useNearViewportActivation` gates only `disabled={!interactionEnabled}` on pagination/expand buttons in all four components — confirmed via grep, no remaining CSS-visibility gate on content |
| 11 | Before/after measurement as new audit doc; existing REPORT.md unchanged (P153-11) | VERIFIED | `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` exists (301 lines); `git diff --stat REPORT.md` is empty (byte-identical, independently re-confirmed) |
| 12 | Regression tests green, full suite green, `docker compose build` PASS, permanent guard exists (P153-12) | VERIFIED | Independently re-ran: `npm test` 295/296 files / 2263/2266 tests / 0 failures; `tsc --noEmit` 0 errors; `docker compose build` exit 0; `publicImportGraph.test.ts` (5/5 tests) exists as a permanent static regression tripwire |
| 13 | RCA-04 explicitly open; no crash-fixed claim (P153-13) | VERIFIED | `153-AFTER.md` "RCA-04 — Status" section states verbatim the crash remains unreproduced/unfixed; grep of all phase-153 SUMMARY.md files finds no "fixed"/"resolved" claim attached to RCA-04 |
| 14 | Pre-existing phase-foreign defects named/evidenced, not silently touched (P153-14) | VERIFIED | `153-AFTER.md` D5 section cites all 3 defects with file:line; independently re-ran `npm run lint` this session — all 13 errors land in phase-foreign admin files (`useEpisodeNeighborNavigation.ts`, `useReleaseVersionMedia.ts`, `GroupMemberFormModals.tsx`, `GroupRolesTab.tsx`, `AdminGroupsClient.tsx`, `RoleCapabilityDetail.tsx`, `CapabilityDetailRow.tsx`, `CapabilityHistoryPanel.tsx`, `capture-responsive.cjs`), none touched by any of the six content-changing plans |

**Score:** 14/14 truths verified (P153-01 through P153-14)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/profile/AchievementArtwork.tsx` | Deterministic `sizes` for hero/stage | VERIFIED | `sizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES`, minimal 3-line diff |
| `frontend/src/components/profile/AchievementArtwork.test.tsx` | Regression coverage for corrected strings | VERIFIED | Assertions updated, `MemberBadgeChain.test.tsx`'s 2 downstream assertions also fixed (documented deviation) |
| `frontend/src/components/editor/index.ts` | Barrel scoped to editor-only symbols, B3 documented | VERIFIED | `RichTextRenderer` export removed, rationale comment present |
| `frontend/src/components/profile/MemberStorySection.tsx` | Direct `RichTextRenderer` import | VERIFIED | Confirmed via grep |
| `frontend/src/app/members/[slug]/not-found.tsx` | `next/dynamic`-wrapped loading boundary | VERIFIED | `'use client'` + `dynamic(..., { ssr: false })`, generic `LoadingState` fallback |
| `frontend/src/app/members/[slug]/not-found.test.tsx` | Behavioral regression test | VERIFIED | 2/2 tests pass, render-based (no source-text assertions) |
| `frontend/src/components/profile/MemberCurrentProjectsSection.tsx`/`.module.css` | Skeleton removed, empty-state branch | VERIFIED | Zero `data-visible`/`projectSkeleton` references; `totalCount===0` early return present |
| `frontend/src/components/profile/LatestContributionsSection.tsx` + `PreviousContributionsSection.tsx` | Sibling skeleton removal | VERIFIED | Zero `data-visible`/`skeletonLayer` in either file |
| `frontend/src/components/profile/MemberBadgeChain.tsx`/`.module.css` | `carouselSkeleton` removed, content untouched | VERIFIED | 9-line deletion confined to the skeleton `<div>`; content-determining logic byte-identical |
| `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` | Before/after measurement doc, D4/D5/P153-09 sections | VERIFIED | Present, 301 lines, all required sections present, numbers independently re-reproduced this session |
| `frontend/src/components/editor/__tests__/publicImportGraph.test.ts` | Permanent structural regression guard | VERIFIED | 5/5 tests pass; absence-only checks, correctly scoped under CLAUDE.md's Teststil carve-out |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `AchievementArtwork.tsx` | `AchievementArtwork.module.css` | `HERO_SIZES`/`STAGE_SIZES` byte-matching CSS breakpoints | WIRED | Verified: CSS untouched, values match `.hero`/`.stage` + `@container` rules cited in the plan |
| `MemberStorySection.tsx` (+3 siblings) | `editor/RichTextRenderer.tsx` | direct module import | WIRED | Grep-confirmed import specifiers; `RichTextRenderer.tsx` unchanged (sanitization invariant intact) |
| `not-found.tsx` | `OwnHiddenProfilePreview.tsx` | `next/dynamic(() => import(...))` | WIRED | Confirmed via source read; owner/anonymous paths both exercised in `not-found.test.tsx` |
| `MemberCurrentProjectsSection.tsx`/siblings | `useNearViewportActivation` | `interactionEnabled` used only for `disabled={!interactionEnabled}` | WIRED | Grep confirms no remaining content-visibility gate tied to this flag |
| `MemberBadgeChain.tsx` | `AchievementArtwork.tsx` | rendering inside badge chips, inherits corrected `sizes` | WIRED | `MemberBadgeChain.test.tsx`'s sizes-string assertions match `AchievementArtwork`'s corrected output; 94/94 tests pass |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense (no new data-fetching was introduced by this phase — all
six content plans are presentational/timing changes on already-server-fetched props). The one
meaningful data-flow question — does the public bundle audit reflect a real compiled `.next` state
rather than a stale/cached number — was independently re-verified this session by re-running
`audit-public-member-bundles.mjs` from a freshly restarted container and reproducing the same byte
counts documented in `153-AFTER.md` (`page.js` 3,359,142 bytes / `not-found.js` 1,257,791 bytes /
0 tiptap+prosemirror categories on both member and group routes).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 12-cycle retention audit reproduces bounded growth | `docker compose exec ... audit-public-member-navigation-retention.mjs` (AUDIT_CYCLES=12) | 1187→1434 nodes, 634→818 listeners | PASS |
| Bundle audit reproduces zero tiptap/prosemirror | `docker compose exec ... audit-public-member-bundles.mjs` | 0/0 categories on member+group routes, byte counts match `153-AFTER.md` exactly | PASS |
| Full regression suite | `npm test` | 295/296 files, 2263/2266 tests, 0 failures | PASS |
| Typecheck | `npx tsc --noEmit` | 0 errors | PASS |
| Lint | `npm run lint` | 344 problems (13 errors/331 warnings), all errors in phase-foreign files | PASS (matches D5 exactly) |
| Production build | `docker compose build` | exit 0, both images built | PASS |
| Owner/anonymous route paths | `vitest run not-found.test.tsx OwnHiddenProfilePreview.test.tsx` | 9/9 tests pass | PASS |
| publicImportGraph regression guard | `vitest run publicImportGraph.test.ts` | 5/5 tests pass | PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` files; verification instead used the
phase's own committed audit scripts (`audit-public-member-bundles.mjs`,
`audit-public-member-navigation-retention.mjs`), which were independently re-run above under
"Behavioral Spot-Checks" rather than trusted from SUMMARY text.

### Requirements Coverage

| Requirement | Source Plan | Description (from ROADMAP.md Phase 153 section) | Status | Evidence |
|---|---|---|---|---|
| P153-01 | 153-01 | `auto`-Präfix entfernt; deterministische, CSS-treue `sizes` | SATISFIED | See Truth #1 |
| P153-02 | 153-01 | Lazy Loading/Geometrie/Optimizer/srcset/Bildschärfe unverändert; kein globales `eager` | SATISFIED | See Truth #2 |
| P153-03 | 153-01 | Keine lineare DOM-/Listener-Retention über 12/50 Zyklen | SATISFIED | See Truth #3 |
| P153-04 | 153-02 | Vier reine Renderer-Konsumenten importieren direkt | SATISFIED | See Truth #4 |
| P153-05 | 153-02 | Barrel-Entscheidung dokumentiert | SATISFIED | See Truth #5 |
| P153-06 | 153-03 | Owner-Vollvorschau hinter echter Ladegrenze; Owner-Logik unverändert | SATISFIED | See Truth #6 |
| P153-07 | 153-07 | Kein Tiptap/ProseMirror/RichTextEditor im öffentlichen Importgraph | SATISFIED | See Truth #7 |
| P153-08 | 153-04/05/06 | SSR-Inhalte vor Hydration sichtbar; Daten/SEO/A11y unverändert | SATISFIED | See Truth #8 |
| P153-09 | 153-04/06 | Leere Bereiche serverseitig entschieden; Badge-Ladder-Umfang bewusst geklärt | SATISFIED | See Truth #9 |
| P153-10 | 153-04/05/06 | Kleinere interaktive Inseln mit echten Ladegrenzen | SATISFIED | See Truth #10 |
| P153-11 | 153-07 | Vorher/Nachher als neues Dokument; Bericht unverändert | SATISFIED | See Truth #11 |
| P153-12 | 153-07 | Regressions-/Build-Gate grün; Dauerschutz geprüft | SATISFIED | See Truth #12 |
| P153-13 | 153-07 | RCA-04 offen geführt | SATISFIED | See Truth #13 |
| P153-14 | 153-07 | Phasenfremde Defekte benannt, nicht still verändert | SATISFIED | See Truth #14 |

**Traceability process gap (not a functional gap, phase-wide, pre-existing all seven plans):**
`.planning/REQUIREMENTS.md` has **no Phase 153 section at all** — confirmed independently this
session (`grep -c "P153" .planning/REQUIREMENTS.md` → 0; the file's most recent phase section is
Phase 152). All fourteen `P153-*` requirement descriptions instead live in
`.planning/ROADMAP.md` lines 1298-1325 under "Phase 153" (used as the source of truth for the
Requirements Coverage table above), and the same 14 IDs are consistently declared across all seven
plans' frontmatter and marked `requirements-completed` in all seven SUMMARY.md files. This is a
process/documentation-generation gap in how `.planning/REQUIREMENTS.md` was populated for this
phase, not evidence that the underlying work is unverified or unimplemented — every requirement's
substance was independently confirmed against the codebase above. Recommend a follow-up
housekeeping step to backfill the `.planning/REQUIREMENTS.md` Phase 153 section from
`.planning/ROADMAP.md`'s existing table, but this is not a blocker for the phase goal.

### Anti-Patterns Found

None. Grep for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` across every file touched by this
phase's seven plans returns zero matches. No stub returns, no hardcoded empty props flowing to
rendered output, no console.log-only handlers found in any touched file.

### Human Verification Required

None required to determine phase status. One item is already correctly routed through, and resolved
by, the phase's own blocking human checkpoint (Plan 07 Task 3), rather than being a newly-discovered
gap this verification is surfacing for the first time:

- **Owner view of a hidden profile (checkpoint step 4).** Not live-verified by a real logged-in
  owner at the time the user approved Plan 07's Task 3 checkpoint — explicitly and honestly recorded
  as "NICHT geprüft" in `153-AFTER.md`'s "Live-Checkpoint (Task 3)" section and in
  `153-07-SUMMARY.md`'s "Open Items Carried Forward" section, not silently marked passed. The
  underlying truth this step would confirm (owner sees the full preview through the new loading
  boundary) is already covered by automated tests exercising the actual owner code path with mocked
  auth/API state (`not-found.test.tsx`'s owner-path test + `OwnHiddenProfilePreview.test.tsx`'s
  8 tests, 9/9 green, independently re-run this session). A live confirmation by an actually
  logged-in owner remains a recommended follow-up but is not required to consider this phase's
  automated-verification-level must-haves met, since the human stakeholder already reviewed and
  accepted this specific gap when approving the checkpoint.

### Other Honestly-Documented Scope Boundaries (verified, not gaps)

- **RCA-04 (Chrome tab crash):** correctly out of scope, unreproduced, no document claims it fixed —
  verified via `153-AFTER.md`'s explicit "RCA-04 — Status" section.
- **Residual RCA-01 listener growth (~14-15/cycle):** independently reproduced this session
  (634→818 over 12 cycles = ~15.3/cycle) and correctly reported as an open observation, not claimed
  fully eliminated — matches the plan's own acceptance bar ("bounded, not linear," not "flat").
- **D5 measurement discrepancy:** two of the three named pre-existing defects
  (`anime/page.tsx` searchParams typecheck, `admin/anime/[id]/edit/page.tsx`
  `formatEditLoadError`) did not reproduce under this session's `npm run typecheck`/`docker compose
  build` — independently reproduced this session (both commands ran clean of these two specific
  errors) — and this discrepancy is honestly reported as a measurement-method difference in
  `153-AFTER.md`, not smoothed into a "fixed" claim. Source files for both remain unchanged (verified
  via `git diff --stat` showing zero touches to `anime/page.tsx` or `admin/anime/[id]/edit/page.tsx`
  across the phase).

### Gaps Summary

No blocking gaps found. All 14 requirement IDs and all must-have truths across all seven plans are
independently verified against the running codebase and containers, not merely asserted in
SUMMARY.md text. The only process-level shortfall (REQUIREMENTS.md missing a Phase 153 section) is a
documentation-generation gap that spans and predates all seven plans equally — it does not indicate
unverified or unimplemented work, since every requirement's substance was cross-checked directly
against source code, git history, and live re-execution of the phase's own audit/test/build tooling.
The one open live-verification item (owner-view-of-hidden-profile) was already surfaced to, and
knowingly accepted by, the human stakeholder as part of the phase's own blocking checkpoint — it is
not a newly discovered gap.

---

*Verified: 2026-09-10T12:15:00Z*
*Verifier: Claude (gsd-verifier)*
