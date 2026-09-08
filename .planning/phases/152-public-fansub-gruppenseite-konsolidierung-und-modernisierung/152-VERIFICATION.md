---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
verified: 2026-09-08T19:21:06Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
pinned_facts:
  - name: "Phase-152 query-budget correction (binding, per project-owner requirement)"
    detail: >
      Plan 152-03's public group load-path reduction, combined with Plan 152-08's regression
      gate, established these PINNED query-count budgets (not the originally planned/estimated
      values): Public-profile load path (GetPublicProfileBySlug) went from 12 statically-counted
      queries pre-152 to a pinned constant of 8 (originally estimated 7 in 152-03's arithmetic;
      the measured value is 8 because ListGroupLinks issues its own internal fansubGroupExists
      existence-check round-trip -- a separate SELECT EXISTS(...) -- before its
      fansub_group_links SELECT, which the original 152-03 estimate did not account for).
      Domain-projection load path (GetFansubGroupDomainProjection) went from 3 to a pinned
      constant of 2 (matches the original estimate exactly). Both constants are enforced by
      real guarded-Postgres regression tests (TestFansubPublicProfileQueryBudgetIsConstant,
      TestDomainProjectionQueryBudgetExcludesContributors in
      backend/internal/repository/fansub_public_profile_query_budget_test.go) which this
      verification independently re-ran against a live Postgres database on 2026-09-08 and
      confirmed PASS at exactly these pinned values (8 and 2). Full reasoning trail is in
      152-08-SUMMARY.md and 152-10-SUMMARY.md.
re_verification: null
gaps: []
deferred: []
human_verification: []
---

# Phase 152: Public-Fansub-Gruppenseite — Konsolidierung und Modernisierung Verification Report

**Phase Goal:** Die öffentliche Fansub-Gruppenseite `/fansubs/[slug]` nutzt für History-Badges den
gemeinsamen Phase-151-Artwork-Slot statt eines zweiten Badge-Systems, liefert Badge- und Hero-Bilder
über die vorhandene Next-Image-Pipeline aus, steuert Achievement-Darstellung datengetrieben über die
bestehende Gruppen-History-Registry, lässt Admin-Freitexte unverändert, lädt public-seitig nur noch
tatsächlich benötigte Daten mit abgesichertem Query-Budget, besitzt einen konsistenten
Tiptap-Link-Contract und ist durch verhaltensbasierte Tests, axe-Abdeckung und eine vollständige
Viewport-Sichtabnahme belegt.

**Verified:** 2026-09-08T19:21:06Z
**Status:** passed
**Re-verification:** No — initial verification

## Mandatory Pinned Fact (project-owner requirement)

Per explicit instruction from the project owner (D1sk), the following is recorded as a **binding,
documented fact**, not merely implied by "tests pass":

> Plan 152-03's public group load-path reduction, combined with Plan 152-08's regression gate,
> established these **PINNED query-count budgets** (not the originally planned/estimated values):
>
> - **Public-profile load path** (`GetPublicProfileBySlug`): **12 → 8** queries (originally
>   estimated 7 in Plan 152-03's own arithmetic; the measured/pinned value is **8** because
>   `ListGroupLinks` issues its own internal `fansubGroupExists` existence-check round-trip — a
>   separate `SELECT EXISTS(...)` — before its `fansub_group_links` SELECT, a detail the original
>   152-03 estimate did not account for).
> - **Domain-projection load path** (`GetFansubGroupDomainProjection`): **3 → 2** queries (matches
>   the original estimate exactly).
>
> Full reasoning is documented in `152-08-SUMMARY.md` (Decisions Made / Deviations from Plan) and
> `152-10-SUMMARY.md` ("Query-Budget Correction — Phase-Level Fact for VERIFICATION.md").

**Independent re-verification of this fact (not trusting the SUMMARY claim):** this VERIFICATION
pass re-ran both guarded-Postgres tests fresh, from a clean `golang:1.25-alpine` container against
the live `team4s_phase152_test` database, on 2026-09-08:

```
=== RUN   TestFansubPublicProfileQueryBudgetIsConstant
    fansub_public_profile_query_budget_test.go:130: P152-09 constant-budget gate: 1 rows -> 8
    queries; 6 rows -> 8 queries (must be equal and constant, reflecting Plan 152-03's B1/B2
    reduction).
--- PASS: TestFansubPublicProfileQueryBudgetIsConstant (0.02s)
=== RUN   TestDomainProjectionQueryBudgetExcludesContributors
    fansub_public_profile_query_budget_test.go:211: P152-09 domain-projection budget: real seeded
    contributor row -> 2 queries, Contributors=[] (must equal the pinned constant 2 and stay
    empty).
--- PASS: TestDomainProjectionQueryBudgetExcludesContributors (0.01s)
PASS
```

Both pinned constants (8 and 2) are confirmed live-measured and enforced by a real regression gate,
not an aspirational plan-time estimate.

## Goal Achievement

### Observable Truths (mapped to P152-01 .. P152-14)

| # | Truth (Requirement) | Status | Evidence |
|---|---|---|---|
| 1 | P152-01: `/history-event-badges-transparent/**` unblocked for Next Image; `/_next/image` returns 200 with WebP; master PNGs unchanged | ✓ VERIFIED | `frontend/next.config.mjs` has the `localPatterns` entry; live `curl` against the running dev server re-run by this verification returns `status=200`, `Content-Type: image/webp`; master PNG sha256 unchanged per 152-01-SUMMARY.md and re-confirmed no `git status` drift on `frontend/public/history-event-badges-transparent/` |
| 2 | P152-02: `FansubHistorySection` renders artwork via the Phase-151 `AchievementArtwork` slot; timeline/own assets/own registry intact; no member-badge resolver reused | ✓ VERIFIED | `frontend/src/components/fansubs/FansubHistorySection.tsx` imports and renders `AchievementArtwork` (direct descriptor, `size="hero"`, `decorative`); no import of `profile/badgeArtwork.ts`; `git log`/diff for commit `bbaa2e11` confirms the migration |
| 3 | P152-03: `--history-badge-size`, badge-size breakpoints, `releases_10000` special size, achievement-specific size logic, pixel-shifts removed | ✓ VERIFIED | `grep -rn "history-badge-size\|history-image-x\|history-image-y" frontend/src/` returns nothing; `FansubPublicSections.module.css` confirmed at 611 lines (was 883), no family-specific size blocks remain (re-verified directly, not from SUMMARY text) |
| 4 | P152-04: `achievementEventStyle`/hard `eventType` if-chains replaced by additive registry fields; no second registry | ✓ VERIFIED | `grep -rn "achievementEventStyle" frontend/src/` returns nothing; `group-history-events.ts` carries `emphasis: 'none' \| 'legendary'` and `publicLabel: string` on all 23 entries (directly inspected, all entries populated) |
| 5 | P152-05: `publicDomainTerms` removed; static public labels in the registry; admin free text provably unchanged | ✓ VERIFIED | `grep -rn "publicDomainTerms" frontend/src/` returns nothing; 152-09-SUMMARY.md's live curl proof plus this phase's own `FansubHistorySection.test.tsx` behavioral test assert the custom title "Projektor gekauft" renders byte-for-byte, no "Fansub-" prefix — re-run independently in this verification, 9/9 green |
| 6 | P152-06: Image performance documented before/after (History; Hero if changed), incl. initial payload delta and percentage reduction | ✓ VERIFIED | 152-09-SUMMARY.md documents exact byte tables: History badge -97.4% (840,090 B → 21,836 B WebP @ w=256); Hero logo -98.14%, banner -96.69%; 6-badge initial-payload total -96.29% (4.5 MB → 167 KB) |
| 7 | P152-07: Public-specific group load path hydrates only needed fields; duplicate link loading removed; other consumers undamaged; no monster query | ✓ VERIFIED | `getPublicGroupBase`/`attachPublicReleaseVersionsCount` added as additive methods in `fansub_repository.go`; `GetGroupBySlug`/`hydrateFansubGroup` left byte-identical per 152-03-SUMMARY.md's stated diff scope; independently re-ran `TestFansubPublicProfileQueryBudgetIsConstant` — PASS |
| 8 | P152-08: Unused contributors projection checked and decision documented; `public-profile`/`domain-projection` stay separate endpoints | ✓ VERIFIED | `GetFansubGroupDomainProjection` no longer calls `listProjectionContributors` (confirmed by direct source read); `TestDomainProjectionQueryBudgetExcludesContributors` behaviorally proves this against a real seeded contributor row, independently re-run, PASS; two endpoints remain structurally separate (no merge) |
| 9 | P152-09: Query-budget test on existing query-counter infrastructure; constant budget, no growth with projects/members/history/media; new target value documented | ✓ VERIFIED | See "Mandatory Pinned Fact" section above — independently re-executed, both constants (8, 2) pinned and PASS |
| 10 | P152-10: Dead History CSS removed; touched breakpoints/hex colors consolidated; initials logic decided; `CATEGORY_TAG_CLASS` typed; `Promise.allSettled([single])` simplified | ✓ VERIFIED | All 11 dead classes confirmed absent via direct grep against `FansubPublicSections.module.css`; `CATEGORY_TAG_CLASS` is `Record<FansubMediaCategory, string>` (direct source read); `page.tsx` uses `try/catch` not `Promise.allSettled` (direct source read, line matches 152-06-SUMMARY.md's claim); `buildInitials` divergence documented via German comment, not silently merged |
| 11 | P152-11: Tiptap link contract consistent between editor and backend, with regression test; sanitizer hardening (`class` pattern, `h1`) checked and applied where side-effect-free | ✓ VERIFIED | `RichTextEditor.tsx` has `link: false` in StarterKit config (direct grep); backend `newTipTapSanitizerPolicy` no longer allows `h1`; `span`/`td`/`th` class constrained to `^color-token-[a-z]+$`; independently re-ran all 34 backend TipTap tests fresh — all PASS including the CR-01 regression tests `TestTipTapRenderHTML_headingLevel1DegradesToH2`/`...LevelMissingDegradesToH2` |
| 12 | P152-12: Accessibility findings fixed (no duplicate year in a11y tree, no double-labeled media thumbnails); axe coverage added via existing infrastructure | ✓ VERIFIED | `aria-hidden="true"` confirmed on the timeline axis-year span (direct source read); `FansubGroupMediaBlock.tsx`'s inner image is `alt=""`, `Button`'s `aria-label` is the sole accessible-name source (direct source read); both `FansubHistorySection.test.tsx` and `FansubGroupMediaBlock.test.tsx` import `jest-axe` and assert `toHaveNoViolations()` — independently re-run, PASS |
| 13 | P152-13: Page composition tests for section conditions, empty states, projection fallback, error states; History tests behavior-based instead of class-name assertions | ✓ VERIFIED | `page.test.tsx` grew to 11 tests including a `'FansubProfilePage composition (152-06)'` describe block covering empty-state/section-conditional/projection-fallback/404-vs-generic-error/hero-stat-correctness — independently re-run, 10/10 green; `FansubHistorySection.test.tsx` rewritten to `data-achievement-art`/`data-emphasis`/`aria-hidden` assertions, no CSS-class-substring assertions remain (direct source read) |
| 14 | P152-14: Viewport visual sign-off 320/390/520/768/1024/1440/1920/2560 across Hero/Story/Projects/Team/History/Media; build and relevant front-/backend tests PASS; independent final verification | ✓ VERIFIED | 152-10-SUMMARY.md documents an explicit human sign-off by the project owner (D1sk) backed by an independent Playwright DOM-geometry re-measurement across all 8 viewports (not visual-only); fixture cleanup proven via fresh `psql` (DB restored to the pre-152 1-row baseline); this VERIFICATION performs the independent final check requested by P152-14 |

**Score:** 14/14 truths verified

### Code Review Findings (152-REVIEW.md) — Critical Fixes Verified Landed

| Finding | Status | Evidence |
|---|---|---|
| CR-01: RichTextEditor H1 toolbar button silently degraded saved headings to unstyled plain text (backend sanitizer had already dropped `h1` from `AllowElements`, but the frontend still offered an unguarded H1 button, and `resolveHeadingLevel` defaulted/clamped to 1, which the sanitizer then stripped) | ✓ FIXED, VERIFIED LANDED | Commit `9a873495` exists in `git log`; diff confirmed: H1 `<button>` removed from `RichTextEditor.tsx`'s full toolbar (only H2/H3 buttons remain — re-confirmed via direct grep, zero `toggleHeading({ level: 1` calls remain); `resolveHeadingLevel` in `tiptap_service.go` now floors at 2 (clamp `[2,3]`), confirmed by direct source read; two new regression tests (`TestTipTapRenderHTML_headingLevel1DegradesToH2`, `...LevelMissingDegradesToH2`) independently re-run — PASS |
| CR-02: New test `TestGetFansubGroupDomainProjection_DoesNotCallListProjectionContributors` violated CLAUDE.md's Teststil rule (source-read + `strings.Contains`, never executes the function under test); fully redundant with an already-existing behavioral test in the same phase | ✓ FIXED, VERIFIED LANDED | Commit `ef08af06` exists in `git log`; diff confirmed: the violating test's 22 lines deleted from `domain_projection_repository_test.go`; re-confirmed via grep the test no longer exists in the file; the behavioral twin (`TestDomainProjectionQueryBudgetExcludesContributors`) independently re-run in this verification — PASS |

Both Critical findings are confirmed fixed in the actual codebase (not just claimed) — commits exist,
diffs match the stated fix description, and both fixes' own regression tests pass on independent
re-execution.

### Known Non-Blocking Debt (152-REVIEW.md Warnings/Info — open, not silently dropped)

These 5 Warnings and 2 Info findings remain open in `152-REVIEW.md` and are **explicitly carried
forward as known, non-blocking maintainability debt** — re-confirmed present in the current codebase
by this verification (not assumed from the review text):

| ID | Finding | Re-confirmed present? | Severity |
|---|---|---|---|
| WR-01 | `sortHistory` comparator in `FansubHistorySection.tsx` is not antisymmetric for tied null-year items — can non-deterministically reorder null-year entries between renders | Yes — comparator code unchanged since review | Warning (low blast radius: no null-year rows exist in current production data model usage observed) |
| WR-02 | `listProjectionContributors`/`DomainProjectionContributorRow` are dead code (unreachable, ~80 lines) kept only so tests could assert non-invocation | Yes — function/type still present, still unreferenced from any caller | Warning (housekeeping) |
| WR-03 | `getPublicGroupBase` duplicates the 17-column SELECT/Scan block already used elsewhere instead of routing through the existing `scanFansubGroup` helper | Not independently re-verified line-by-line in this pass; carried forward per REVIEW.md | Warning |
| WR-04 | `fansub_repository.go` remains far over the CLAUDE.md 450-line modularity ceiling (2462 lines, confirmed via `wc -l` in this verification) | Yes — `wc -l` confirms 2462 lines | Warning |
| WR-05 | `RichTextEditor.tsx`'s full toolbar still hand-builds ~20 native `<button>` elements instead of the `Button` primitive (predates this phase; only `link: false` was added by 152-02) | Yes — `grep -c "<button"` confirms 20 occurrences remain | Warning |
| IN-01 | New guarded-Postgres test fixtures build seed SQL via `fmt.Sprintf` interpolation instead of parameterized queries (test-controlled literals only, no live injection risk today) | Yes — `fmt.Sprintf` calls confirmed present in both new test files | Info |
| IN-02 | Pre-existing Teststil debt (9 other `readRepositorySource`/`strings.Contains` tests in the same file) predates this phase, tracked separately per `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` | Not re-verified in this pass (explicitly out of phase scope per REVIEW.md) | Info |

None of these block phase goal achievement — they are maintainability debt, not functional gaps, and
none contradict any of the 14 observable truths above. WR-04 in particular is worth flagging forward:
the file continues to grow past the modularity ceiling and should be split in a future phase/quick-task
(the review's own suggested fix: extract the public-profile-load-path methods into a dedicated file).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/next.config.mjs` | `localPatterns` entry for history badges | ✓ VERIFIED | Entry present; live `/_next/image` 200+WebP re-confirmed |
| `frontend/src/components/fansubs/FansubHistorySection.tsx` | Uses `AchievementArtwork`, no dead helpers, `aria-hidden` on axis year | ✓ VERIFIED | 119 lines (was 139); direct read confirms all claims |
| `frontend/src/components/fansubs/FansubPublicSections.module.css` | Dead classes removed, geometry delegated to `AchievementArtwork` | ✓ VERIFIED | 611 lines (was 883); zero `history-badge-size`/`history-image-x/y`/dead-class matches |
| `frontend/src/lib/group-history-events.ts` | `emphasis`/`publicLabel` additive fields, 23 entries | ✓ VERIFIED | Directly read, all 23 entries populated |
| `backend/internal/repository/fansub_repository.go` | Public-specific load path (`getPublicGroupBase`, `attachPublicReleaseVersionsCount`) | ✓ VERIFIED | Present; 2462 lines total (WR-04 debt noted above) |
| `backend/internal/repository/domain_projection_repository.go` | Contributors query removed from the call path | ✓ VERIFIED | `GetFansubGroupDomainProjection` no longer calls `listProjectionContributors` (dead code remains, WR-02) |
| `backend/internal/repository/fansub_public_profile_query_budget_test.go` | Constant-budget regression tests, pinned 8 / 2 | ✓ VERIFIED | Independently re-run, PASS at pinned values |
| `backend/internal/services/tiptap_service.go` | `resolveHeadingLevel` floors at 2; `h1` removed from `AllowElements`; `span/td/th` class regex-constrained | ✓ VERIFIED | Direct read confirms all three |
| `frontend/src/components/editor/RichTextEditor.tsx` | `link: false`; no H1 button | ✓ VERIFIED | Direct read confirms both |
| `frontend/src/app/fansubs/[slug]/page.tsx` | `try/catch` instead of `Promise.allSettled([single])` | ✓ VERIFIED | Direct read confirms |
| `frontend/src/app/fansubs/[slug]/page.test.tsx` | 11 tests incl. 8 new composition tests | ✓ VERIFIED | Independently re-run, 10/10 green (the 11th, project-routing, also part of the same run) |
| `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` | Behavior-based, axe coverage | ✓ VERIFIED | Independently re-run, 9/9 green, `jest-axe` import + `toHaveNoViolations` confirmed |
| `frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx` | axe coverage, unique accessible name | ✓ VERIFIED | Independently re-run, 9/9 green |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `FansubHistorySection.tsx` | `AchievementArtwork` (Phase 151) | direct import + JSX usage | ✓ WIRED | Import present, component invoked with `descriptor`/`size="hero"`/`decorative` props |
| `frontend/next.config.mjs` `localPatterns` | `/_next/image` route | Next.js image optimizer config | ✓ WIRED | Live HTTP 200 + `image/webp` re-confirmed against the running dev server |
| `RichTextEditor.tsx` (`link: false`) | backend `allowedTipTapMarks` (no `link`) | contract symmetry | ✓ WIRED | Frontend never produces a link mark; backend never allows one — both sides re-confirmed independently, `TestTipTapValidateJSON_linkMarkRejected` PASS |
| `GetPublicProfileBySlug` | `getPublicGroupBase` + `attachPublicReleaseVersionsCount` + single `ListGroupLinks` call | function composition | ✓ WIRED | Confirmed via source read; query-count regression test independently re-run, PASS at 8 |
| `page.tsx` | `FansubHistorySection`/`FansubGroupMediaBlock`/etc. | conditional rendering by data length | ✓ WIRED | Composition tests independently re-run confirming section-conditional behavior (empty vs. non-empty history/media) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `/_next/image` serves History badge as WebP | `curl -H 'Accept: image/webp,*/*' '.../_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75'` | `status=200`, `Content-Type: image/webp` | ✓ PASS |
| Public-profile query budget pinned at 8 | `go test -run TestFansubPublicProfileQueryBudgetIsConstant` against live `team4s_phase152_test` | `1 rows -> 8 queries; 6 rows -> 8 queries` PASS | ✓ PASS |
| Domain-projection query budget pinned at 2, contributors empty despite real seeded row | `go test -run TestDomainProjectionQueryBudgetExcludesContributors` | `real seeded contributor row -> 2 queries, Contributors=[]` PASS | ✓ PASS |
| Backend TipTap suite (34 tests incl. CR-01 regression tests) | `go test ./internal/services/... -run TipTap -v` | 34/34 PASS | ✓ PASS |
| Frontend fansub-public + editor test surface (4 files) | `vitest run FansubHistorySection.test.tsx FansubGroupMediaBlock.test.tsx page.test.tsx RichTextEditor.test.tsx` | 4 files, 39/39 tests PASS | ✓ PASS |
| Dead CSS classes absent | `grep` for 11 named classes in `FansubPublicSections.module.css` | zero matches | ✓ PASS |
| `publicDomainTerms`/`achievementEventStyle` absent from frontend source | `grep -rn` across `frontend/src/` | zero matches | ✓ PASS |
| No debt markers (TBD/FIXME/XXX) in phase-touched files | `grep -n -E "TBD\|FIXME\|XXX"` across all 19 modified/created files | zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| P152-01 | 152-01 | Image optimizer unblock for History badges | ✓ SATISFIED | Live re-verified 200/WebP |
| P152-02 | 152-07 | AchievementArtwork migration | ✓ SATISFIED | Direct source verification |
| P152-03 | 152-03, 152-07 | Badge geometry removal | ✓ SATISFIED | Direct grep, zero matches |
| P152-04 | 152-07 | Registry-driven achievement style | ✓ SATISFIED | Direct source verification |
| P152-05 | 152-07 | `publicDomainTerms` removal, freetext preserved | ✓ SATISFIED | Grep + behavioral test |
| P152-06 | 152-05, 152-09 | Image performance documented | ✓ SATISFIED | 152-09-SUMMARY.md evidence tables |
| P152-07 | 152-03 | Public load-path trimming | ✓ SATISFIED | Independently re-run query-budget test |
| P152-08 | 152-03, 152-08 | Contributors projection decision | ✓ SATISFIED | Independently re-run behavioral test |
| P152-09 | 152-08 | Query-budget regression gate | ✓ SATISFIED | See Mandatory Pinned Fact section |
| P152-10 | 152-04, 152-10 | Dead CSS/typing/initials/allSettled cleanup | ✓ SATISFIED | Direct source verification |
| P152-11 | 152-02, CR-01 fix | Tiptap contract consistency | ✓ SATISFIED | Independently re-run 34 backend tests |
| P152-12 | 152-04, 152-07 | Accessibility fixes + axe coverage | ✓ SATISFIED | Independently re-run axe tests |
| P152-13 | 152-06, 152-07 | Page composition + behavioral history tests | ✓ SATISFIED | Independently re-run 10/10 + 9/9 |
| P152-14 | 152-10 | Visual QA sign-off + final verification | ✓ SATISFIED | Human sign-off documented; this document is the independent final verification |

No orphaned requirements — all 14 IDs mapped in ROADMAP.md's requirement-definitions table appear in
at least one plan's `requirements-completed` frontmatter, and all 14 are marked complete in
`.planning/REQUIREMENTS.md`.

### Anti-Patterns Found

No blocker-level anti-patterns found in this pass. See "Known Non-Blocking Debt" above for the 5
Warnings + 2 Info items carried forward from `152-REVIEW.md`, all re-confirmed present and all
classified as non-blocking maintainability debt (dead code, a repository file over the 450-line
modularity ceiling, a non-antisymmetric sort comparator with narrow blast radius, pre-existing native
`<button>` usage, and test-fixture SQL interpolation with no live injection risk). No new anti-patterns
were introduced beyond what 152-REVIEW.md already documented.

### Human Verification Required

None. Visual/viewport sign-off (P152-14) was already performed by the project owner (D1sk) during
Plan 152-10's Task 2 checkpoint, backed by an independent Playwright DOM-geometry re-measurement
(not visual inspection alone) — documented in full in 152-10-SUMMARY.md's "Human Sign-Off Record"
section, including the per-viewport slot-size table (192px/240px, all exactly square, zero
family-dependent size deltas, zero horizontal overflow) and an explicit rationale for the one
apparent visual artifact (a fixed nav bar frozen mid-scroll in the 390px stitched screenshot, traced
to `AppShell.module.css`'s pre-existing `position: fixed`/`sticky` rules, unrelated to any Phase 152
change).

### Gaps Summary

No gaps. All 14 observable truths (P152-01 through P152-14) are verified against the actual codebase
via a combination of direct source reads and independent, freshly-executed test runs — not SUMMARY.md
claims alone. Both Critical code-review findings (CR-01, CR-02) are confirmed fixed and landed
(commits `9a873495`, `ef08af06` exist, diffs match their stated descriptions, and both fixes' own
regression tests pass on independent re-execution). The mandatory pinned query-budget fact (12→8,
3→2, with the `fansubGroupExists` internal-round-trip reasoning) is documented above as an explicit,
named fact per the project owner's requirement, and independently re-verified live against Postgres
rather than trusted from the SUMMARY text. The 5 open Warnings and 2 open Info findings from
152-REVIEW.md are carried forward, re-confirmed present, and explicitly classified as non-blocking —
none of them contradict phase goal achievement.

---

_Verified: 2026-09-08T19:21:06Z_
_Verifier: Claude (gsd-verifier)_
