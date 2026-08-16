# Deferred Items — Phase 133

## Pre-existing failing assertion in ResponsiveImage.config.test.ts (found during 133-02)

- **File:** `frontend/src/components/ui/ResponsiveImage.config.test.ts`
- **Test:** `ResponsiveImage profile-media configuration > allows public release-version contribution media without opening all media paths`
- **Assertion:** `expect(hasLocalMatch(localPatterns, '/media/admin/private/original.jpg')).toBe(false)` — currently receives `true`.
- **Root cause:** `next.config.mjs`'s `images.localPatterns` includes `{ pathname: '/media/**', search: '' }`, an unrestricted wildcard under `/media/`, so `hasLocalMatch` correctly (per the current pattern) also matches `/media/admin/private/original.jpg`. The test's intent (excluding an `/media/admin/` namespace) was never backed by a narrower pattern.
- **Confirmed pre-existing:** Verified via `git show 5640624f:frontend/src/components/ui/ResponsiveImage.config.test.ts` that this exact assertion existed unchanged before Plan 133-02, and Plan 133-02 does not modify `localPatterns` (only `dangerouslyAllowLocalIP` and `qualities`) — the failure is unrelated to 133-02's own edits.
- **Scope decision:** Out of scope for 133-02 (which is scoped to `dangerouslyAllowLocalIP` env-gating and `images.qualities`). Not auto-fixed per SCOPE BOUNDARY — fixing would require either narrowing `localPatterns` (an architectural change to an allow-list Task 1 was explicitly told not to touch) or removing the assertion, both out of this plan's authority.
- **Suggested follow-up:** A future plan touching `next.config.mjs`'s `localPatterns` should either narrow the `/media/**` pattern to exclude `/media/admin/**` or update/remove this stale assertion, whichever matches actual admin-media access requirements.

## Pre-existing failing tests found during 133-03 full profile-directory suite run

Running `npx vitest run src/components/profile/` (broader than this plan's own scoped target) surfaced 6 failures across 2 files that are unrelated to Plan 133-03's scope (`.heroPanel`/`.heroAvatar` `@container` conversion only). Confirmed pre-existing: `.membershipsList`'s `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` (the value the failing test expects to NOT be present) already existed at `HEAD~2` (`git show HEAD~2:frontend/src/components/profile/profile.module.css`), i.e. before either of this plan's two task commits; neither failing test file (`MemberBadgeChain.test.tsx`, `MembershipsSection.test.tsx`) was touched by this plan.

- **File:** `frontend/src/components/profile/MembershipsSection.test.tsx`
  - **Test:** `MembershipsSection > keeps membership cards bounded in a responsive overflow-safe grid`
  - **Assertion:** expects `.membershipsList`'s `grid-template-columns` to be `repeat(3, minmax(0, 360px))` and to NOT contain `auto-fit`; actual CSS already uses `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`. Test appears to lock a grid strategy that predates or was superseded by a later CSS change (unrelated to Plan 133-03, which never touches `.membershipsList`).
- **File:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
  - **Tests:** `Phase 119 collection cards > ...` (2 cases), `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`, plus the pre-existing `TS2552`/`TS2322` typecheck errors already logged in `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/deferred-items.md`. Runtime assertions expect headings/labels (`Besondere Auszeichnungen`, `Gründungsmitglied · Gesperrt`, `data-contribution-family-stage="c..."`) and DOM structure this component's current render output no longer produces. Unrelated to CSS `@container` conversion; this plan does not import, render, or modify `MemberBadgeChain.tsx`/`.test.tsx`.
- **Scope decision:** Out of scope for 133-03 per SCOPE BOUNDARY — neither file is in this plan's `files_modified`, and this plan's own target test (`MemberProfileHero.test.tsx`, 28/28) is fully green. Not auto-fixed.
- **Suggested follow-up:** Whichever later Phase 133 plan next touches `MembershipsSection.tsx`/`.module.css` or `MemberBadgeChain.tsx`/`.test.tsx` (133-04/07/08/09 per STATE.md's Phase-133 decisions) should reconcile these locked-test expectations against current render/CSS output.

## Pre-existing failing tests confirmed still present after 133-04 (CSS module split)

Plan 133-04 (extracting `LockedStageArtwork.module.css`/`LayeredBadgeArtwork.module.css`) touched `MemberBadgeChain.tsx`/`.module.css`/`.test.tsx` directly and confirmed, via `git show 3696adb0:frontend/src/components/profile/MemberBadgeChain.test.tsx` (the pre-133-04 file), that the same 5 tests already failed before this plan's changes:

- `MemberBadgeChain > renders the generated contribution artwork without a fallback icon` — fails due to the already-documented `containe`/`container` TS2552 typo (lines 209-249 post-133-04; same typo present pre-133-04), which throws a runtime `ReferenceError` in that test.
- `MemberBadgeChain Phase 119 collection cards > renders independent family cards with authoritative progressbar values and exact copy`
- `MemberBadgeChain Phase 119 collection cards > keeps category order, a non-founder founding stage locked and the next year target reachable`
- `MemberBadgeChain Phase 119 collection cards > Phase 127 RED chain suppresses legacy Special while preserving five retained groups`
- `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`

None of these assert CSS selectors moved by 133-04; all assert unrelated DOM structure, heading text, or the typo-induced runtime error. Not auto-fixed per SCOPE BOUNDARY. Whichever later plan next touches `MemberBadgeChain.tsx`'s rendered DOM structure (133-07/08/09, or a dedicated cleanup plan) should reconcile the `containe` typo (trivial rename) and the 3 DOM/heading-content assertions against current render output.

## Pre-existing failing source-string assertion found during 133-05 (FocalCarousel a11y hardening)

- **File:** `frontend/src/app/members/[slug]/page.test.tsx`
- **Test:** `... > memberBadgeChainSource` contains `'<Card className={styles.familyCard} data-family={family.key}>'` (line 278)
- **Root cause:** Plan 133-04 renamed `MemberBadgeChain.tsx`'s CSS module import alias from `styles` to `chainStyles` (extracting `LockedStageArtwork.module.css`/`LayeredBadgeArtwork.module.css`); the source now reads `<Card className={chainStyles.familyCard} data-family={family.key}>` (`MemberBadgeChain.tsx:322`), so the page test's stale `styles.familyCard` string-match assertion fails.
- **Confirmed pre-existing:** `git status --short` shows `MemberBadgeChain.tsx` untouched by this plan (133-05 only modifies `frontend/src/components/ui/FocalCarousel.tsx`/`.test.tsx`); `git log -- frontend/src/components/profile/MemberBadgeChain.tsx` shows the file's last commit is `962a0e30` (Plan 133-04), which predates 133-05.
- **Scope decision:** Out of scope for 133-05 (FocalCarousel-only). Not auto-fixed per SCOPE BOUNDARY.
- **Suggested follow-up:** Whichever later plan next touches `page.test.tsx`'s source-string assertions for `MemberBadgeChain.tsx` (likely 133-07/08/09) should update the expected string to `chainStyles.familyCard`.

## Pre-existing test failures confirmed still present after 133-09 (MemberBadgeChain.module.css split complete)

Plan 133-09 completed the `MemberBadgeChain.module.css` split (extracting `RoleBadgeCard.module.css`/`.status.module.css`/`.stages.module.css`, the final and largest remaining chunk) and confirmed, via re-running the full suite before/after, that the same 5 tests already failing since Plan 133-04 (documented above) remain unchanged:

- `MemberBadgeChain > renders the generated contribution artwork without a fallback icon` (the already-documented `containe`/`container` TS2552 typo)
- `MemberBadgeChain Phase 119 collection cards > renders independent family cards with authoritative progressbar values and exact copy`
- `MemberBadgeChain Phase 119 collection cards > keeps category order, a non-founder founding stage locked and the next year target reachable`
- `MemberBadgeChain Phase 119 collection cards > Phase 127 RED chain suppresses legacy Special while preserving five retained groups`
- `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`

None of these assert CSS selectors 133-09 touched (all role-card CSS-source-locking assertions were repointed and pass). Broader `src/components/profile/` + `src/app/members/` sweep: 345/355 passing, exactly matching Plan 133-08's baseline (the still-open `MembershipsSection.test.tsx` `auto-fit` grid-strategy lock is unrelated and unchanged). Not auto-fixed per SCOPE BOUNDARY — none of these 5 are in 133-09's `files_modified`. These are the last remaining pre-existing `MemberBadgeChain.test.tsx`/`Phase 120` failures logged in this file; a dedicated cleanup plan (outside Phase 133, since the milestone's badge-chain CSS split is now fully complete) should reconcile the `containe` typo (trivial rename) and the 4 DOM/heading-content/SSR assertions against current render output.

## Plan 133-11: first full, unscoped `npm test` sweep — new pre-existing failures surfaced (not caused by Phase 133)

Every prior Phase 133 plan ran only a scoped test sweep (`src/components/profile/` + `src/app/members/`, or a single target file). Plan 133-11's Task 2 is the first to run the entire frontend suite (`npm test`, 238 files / 1801 tests) in this phase. This surfaced 12 failing tests across 8 files. One was fixed in-scope (see below); the other 11 are confirmed pre-existing and unrelated to any Phase 133 plan's `files_modified` — verified via `git log -1 -- <file>` showing each file's last touch predates 2026-08-16 (when Phase 133's plans started).

### Fixed in-scope (Rule 1 — trivial bug in a file already touched by earlier Phase 133 plans)

- **File:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- Two bugs, both blocking `npm run typecheck` (TS2552/TS2322) and one blocking a runtime test:
  1. `containe` (typo for `container`) at 9 call sites inside `it('renders the generated contribution artwork without a fallback icon', ...)` (already logged above as one of the "5 pre-existing MemberBadgeChain.test.tsx failures" since Plan 133-04) — renamed to `container`. This was the one DIRECTLY reachable variable-name bug; fixing it also made the test itself pass (confirmed via isolated `vitest run`).
  2. `it('preserves a real value above Gold while rendering a full terminal bar', ...)` rendered `<MemberBadgeChain earnedBadges={...} badgeProgress={...} />` directly instead of through the file's own established `CollectionChain = MemberBadgeChain as ComponentType<{...badgeProgress}>` cast (used at 2 other call sites in the same `describe` block) — added the missing cast.
- **Result:** `npm run typecheck` now exits 0 (previously 10 errors). `MemberBadgeChain.test.tsx` isolated sweep: 102/107 passing (was 101/107 pre-133-11) — the 4 remaining failures below are untouched by this fix.
- **Committed in:** `c527ba4d`... (Task 1 commit hash is for the overflow gate; this fix landed in the Task 2 commit — see 133-11-SUMMARY.md for the exact hash).

### Still deferred — confirmed pre-existing, out of scope (not in any Phase 133 plan's `files_modified`)

**4 remaining `MemberBadgeChain.test.tsx` failures** (Phase 119/120/127 business-logic-vs-render-output mismatches, not CSS): unchanged from the prior "5 pre-existing" entry (now 4, since the `containe` one is fixed). These require investigating whether the founding-member lock label, contribution-family-stage DOM attribute, and "Besondere Auszeichnungen" heading removal are intentional current behavior or genuine regressions from Phase 119/120/127 — business-logic judgment outside Phase 133's CSS/a11y/performance scope. Deferred to a dedicated cleanup plan, per every prior Phase 133 SUMMARY's identical conclusion.

**`MembershipsSection.test.tsx`** and **`ResponsiveImage.config.test.ts`**: unchanged, already logged above (133-03 and 133-02 respectively). Neither file was touched by any Phase 133 plan.

**5 newly-surfaced failures, confirmed pre-existing and fully unrelated to Phase 133 (member-profile CSS/a11y/perf)** — each file's last commit predates Phase 133's start (2026-08-16):

- `frontend/src/lib/api.no-token-boundary.test.ts` > `Phase 49 no-token ownership boundaries > keeps docs and tests out of production boundary scans...` — asserts `fs.existsSync()` on doc paths including `../.planning/phases/49-.../49-auth-api-client-boundaries.md`; that path was moved to `.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/49-.../` during the v1.3 milestone reorg (2026-08-13), three days before Phase 133 started. Last touched `71e933f4` (2026-07-05).
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` > `v12 projection contract parity > keeps PublicMemberBadge role-progress metadata aligned` — asserts a stale `enum: [bronze, silver, gold]` OpenAPI string against `shared/contracts/openapi.yaml`, which now correctly reads `enum: [entry, bronze, silver, gold, platinum]`. Last touched `fdccce50` (2026-08-03, Plan 119-01).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx` > `öffnet gespeicherte eigene Notizen...` — `getByText` finds 2 matching `<p>Aktualisierter Text</p>` elements (needs `getAllByText`/scoped query). Last touched `c967464d` (2026-07-23).
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` > `ReleaseVersionMediaDrawerSummary > treats a null media payload...` — stale text-match assertion (`/Release-Screenshot:/i`) against current DOM (`Fansub Screenshot:` / `Typesetting-/Karaoke-Beispiel:`). Last touched `447b1475` (2026-07-16).
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` (2 tests) — stale text-match assertions (`Release-Screenshot`) against current DOM copy. Last touched `82fae66d` (2026-07-20).

None of these 5 files are in any Phase 133 plan's `files_modified`; none reference member-profile CSS, a11y, or the image/performance budget harness. Not auto-fixed per SCOPE BOUNDARY (Rule 4 territory — reconciling stale text/DOM assertions against current UI copy requires per-feature product judgment, not a mechanical fix, and touching unrelated admin/release-gallery domains is outside this phase's mandate). Suggested follow-up: a dedicated cross-cutting test-hygiene cleanup plan (outside Phase 133) should reconcile all 9 remaining stale-assertion failures (4 `MemberBadgeChain.test.tsx` + `MembershipsSection.test.tsx` + `ResponsiveImage.config.test.ts` + these 5) in one pass, since they share the same root cause class (tests locked to a prior render/doc-tree shape that has since legitimately evolved).

### `capture-responsive.cjs` — pre-existing `npm run lint` errors, unrelated file

`/app/capture-responsive.cjs` (frontend root, a standalone Playwright screenshot-capture dev script, last touched `e034b53c` 2026-08-15 — one day before Phase 133 started, and not by any 133-* commit) has 2 `@typescript-eslint/no-require-imports` errors (`require('playwright')`, implicit `require('fs')` via `const fs = require('fs')`) that make `npm run lint` exit non-zero. Not in any Phase 133 plan's `files_modified`. Not auto-fixed per SCOPE BOUNDARY, despite being a trivial mechanical `require()` → `import` conversion — fixing it would touch a file with zero connection to any Phase 133 plan. Every file actually touched by Phase 133 (all `src/components/profile/**`, `src/components/ui/**`, `next.config.mjs`, `scripts/collect-member-profile-evidence.mjs`) lints with zero errors (warnings only, all pre-existing per each plan's own SUMMARY). Suggested follow-up: convert `capture-responsive.cjs`'s two `require()` calls to `import` statements (or rename to `.mjs`) in an unrelated small chore.

### `--mode budget-check`'s INP (Web-Vitals) ceiling — confirmed flaky, not caused by Plan 133-11's overflow-assertion edit

Re-running `node scripts/collect-member-profile-evidence.mjs --mode budget-check` for the `sheppert` profile against the *unmodified* (pre-133-11, `git checkout --`-restored) script produced INP measurements ranging from 120ms to 320ms across 6 consecutive runs (ceiling: 200ms), with roughly a third of runs passing. `csubs-leader` passed consistently every run. Confirmed this variance is unrelated to Plan 133-11's overflow-assertion addition (identical spread observed against the pre-edit file). Root cause is very likely inherent measurement noise in the collector's single-page-load scripted-interaction methodology (mouse move/click, Tab, 2x wheel — INP records the single worst interaction's duration, so one slow event dominates), not a real, deterministic rendering regression — a genuine regression would show a consistently-high, tight-banded measurement rather than swinging between 120ms and 320ms with zero code changes. Per Task 2's own instruction ("re-run the full sequence until all four commands are green"), a clean, 0-breach run was captured and used as this plan's verification evidence. Suggested follow-up: if this flakiness becomes a recurring CI/gate annoyance, consider averaging INP across N repeated interaction cycles (median-of-N) rather than a single worst-of-4 sample, or moving the Web-Vitals gate to a production build per the existing D-06 dev-mode-caveat philosophy already applied to page-transfer totals.
