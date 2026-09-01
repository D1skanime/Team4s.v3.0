---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 07
subsystem: testing
tags: [vitest, react-testing-library, role-catalog, next-image, css-modules, test-drift]

# Dependency graph
requires:
  - phase: 143
    provides: "143-05/143-06's RoleCatalogProvider-mock and categoryForRole test-triage patterns for the remaining Kriterium-1 red files"
provides:
  - "Last 6 of the 17 Kriterium-1 red frontend test files closed and green (MemberBadgeChain
    interactions via members/[slug]/page.test.tsx's catalog fixture gap, next.config.mjs image
    pattern narrowing, api.no-token-boundary.test.ts docs allowlist paths, MembershipsSection.test.tsx
    grid assertion, ReleaseGallery.test.tsx category label, DefaultCrewManager.test.tsx confirmed
    already-green)"
  - "Full unscoped `npx vitest run` at 0 unexpected red files (288 files / 2146 tests passed, 1 file
    intentionally skipped) — closes CONTEXT.md Kriterium 1 for the whole wave (143-05+143-06+143-07)"
affects: [143-testsuite-triage, frontend-testing, next-image-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "images.localPatterns now enumerates explicit /media/<namespace>/** entries (anime, profile,
      release-version) instead of a blanket /media/**, derived from a repo-wide grep of every
      backend PublicURL-construction call site rather than guessing from frontend usage"

key-files:
  created: []
  modified:
    - "frontend/src/app/members/[slug]/page.test.tsx"
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/next.config.mjs
    - frontend/src/lib/api.no-token-boundary.test.ts
    - frontend/src/components/profile/MembershipsSection.test.tsx
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx"

key-decisions:
  - "MemberBadgeChain.tsx itself needed zero production changes. members/[slug]/page.test.tsx's
    missing 'Rollenfortschritt' heading was a stale RoleCatalogProvider mock fixture (catalogRoles
    lacked a 'timer' entry even though the profile fixture earns role_entry_timer) tripping the
    intentional Phase-136 CR-02 catalog-trust gate (earned roles absent from the catalog are hidden
    by design) — fixed by adding the missing catalog entry, not by relaxing the gate."
  - "MemberBadgeChain.test.tsx's remaining 4 failing tests were pre-existing Phase-119-era test debt,
    unrelated to Phase 142/143 drift (confirmed via git log: neither the component nor its test file
    changed since 2026-08-20, before the Phase-142 commit range CONTEXT.md audited) — each assertion
    was individually cross-checked against later, more specific, currently-passing tests (Phase
    125/126/127) that lock the actual, intentionally-adopted rendering shape, then corrected."
  - "next.config.mjs's images.localPatterns /media/** wildcard narrowed to exactly the three
    namespaces a repo-wide grep of backend PublicURL construction proved are real
    (/media/anime/**, /media/profile/**, /media/release-version/**); no /media/group/** namespace
    exists (group logos route through the already-allow-listed /api/v1/media/image proxy, not local
    static serving), and /media/admin/** is deliberately never allow-listed (T-143-07-01)."
  - "DefaultCrewManager.test.tsx's suite-order RoleCatalogProvider pollution (documented in
    143-CONTEXT.md/143-07-PLAN.md) no longer reproduces — standalone, directory-scoped, and full
    unscoped runs are all green. Resolved as a side effect of 143-05's RoleCatalogProvider-mock
    fixes to FansubAppMembersSection.test.tsx and admin/fansubs/[id]/edit/page.test.tsx earlier in
    this wave; no further change was needed or made in this plan."

patterns-established:
  - "When a test's assertion contradicts another currently-passing, more specific test in the same
    file/suite, cross-reference git history (git log on the production file) before assuming the
    production code is wrong — if the component hasn't changed since before the audited commit
    range, the contradiction is test debt from an earlier phase's rendering shape, not a live bug."

requirements-completed: ["Criterion-1"]

# Metrics
duration: 20min
completed: 2026-09-01
---

# Phase 143 Plan 07: Testsuite-Triage — Restfälle und Dashboard-Vorbereitung Summary

**Closed the last 6 Kriterium-1 red frontend test files by fixing a RoleCatalogProvider fixture gap that was hiding an entire earned badge group, narrowing next.config.mjs's image `localPatterns` from a blanket `/media/**` wildcard to the three real backend namespaces, repointing a docs-existence test at its post-milestone-archival path, and correcting five individually-diagnosed pieces of pre-existing test drift — bringing the full unscoped `npx vitest run` to zero unexpected red files across the whole wave.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-01T21:22:00Z
- **Completed:** 2026-09-01T21:41:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `members/[slug]/page.test.tsx`'s missing "Rollenfortschritt" heading fixed at its true root cause: the test's own `RoleCatalogProvider` mock catalog was missing a `timer` role entry even though the profile fixture earns `role_entry_timer`, so Phase 136 CR-02's intentional catalog-trust gate silently hid the whole roles group
- `MemberBadgeChain.test.tsx`'s 4 remaining failures (all pre-existing Phase-119-era test debt, confirmed unrelated to Phase 142/143 via git history) corrected to match the currently-adopted Phase 125/126/127 rendering shapes — zero production code changes were needed or made
- `next.config.mjs`'s `images.localPatterns` narrowed from `/media/**` to `/media/anime/**`, `/media/profile/**`, `/media/release-version/**` (the three namespaces a repo-wide grep of backend `PublicURL` construction proved are real), closing T-143-07-01 without breaking any legitimate image path
- `api.no-token-boundary.test.ts`'s `docsAllowlist` repointed at the post-milestone-archival path for the two Phase-49 docs
- `MembershipsSection.test.tsx`'s base grid assertion updated to the live, intentionally-responsive `auto-fit` rule
- `ReleaseGallery.test.tsx`'s screenshot label/alt assertions updated to the live "Fansub Screenshot" `CATEGORY_LABELS` value
- `DefaultCrewManager.test.tsx` confirmed already green (standalone, directory, and full-suite) — the suite-order pollution described in `143-CONTEXT.md` was already resolved by 143-05's earlier `RoleCatalogProvider` mock fixes
- Full unscoped `npx vitest run`: **288 files / 2146 tests passed, 1 file intentionally skipped, 0 unexpected failures** — closes CONTEXT.md Kriterium 1 across 143-05 + 143-06 + 143-07

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix MemberBadgeChain's roles-progress group rendering** - `1d92244b` (fix)
2. **Task 2: Narrow next.config.mjs media pattern, fix docs allowlist paths, align MembershipsSection grid assertion** - `8f250c12` (fix)
3. **Task 3: Fix the stale screenshot label in ReleaseGallery.test.tsx and confirm DefaultCrewManager.test.tsx already green** - `27668413` (fix)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/members/[slug]/page.test.tsx` - added a `timer` entry to the `RoleCatalogProvider` mock's `catalogRoles` fixture, matching the profile fixture's earned `role_entry_timer` badge
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - corrected 5 stale Phase-119-era assertions (combined contribution-progress text, "X+ Jahre Mitglied" labels vs the live "X Jahre Mitgliedschaft" wording, a founding-member panel expectation for non-founders, a "Besondere Auszeichnungen" heading expectation contradicting Phase 127's adopted suppression, and a `.roleHeroArtwork` CSS assertion pointed at the wrong post-133-09-split file) to match the currently-adopted, already-tested-elsewhere rendering
- `frontend/next.config.mjs` - `images.localPatterns` narrowed from `/media/**` to three explicit namespaces
- `frontend/src/lib/api.no-token-boundary.test.ts` - `docsAllowlist` paths updated to the post-archival location
- `frontend/src/components/profile/MembershipsSection.test.tsx` - base `.membershipsList` grid assertion updated to the live `auto-fit` rule
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` - "Release-Screenshot" → "Fansub Screenshot"

## Decisions Made
- `MemberBadgeChain.tsx` needed no production changes; every one of its test file's failures was either a fixture gap in a *different* test file (`members/[slug]/page.test.tsx`) or pre-existing test debt in its own file, both confirmed via git history and cross-referencing currently-passing, more specific tests.
- `next.config.mjs`'s narrowed `/media/**` allow-list is exactly the 3 namespaces proven real by grepping backend `PublicURL` construction; no `/media/group/**` exists (group logos route through the already-allow-listed `/api/v1/media/image` proxy) and `/media/admin/**` is deliberately excluded.
- `DefaultCrewManager.test.tsx`'s described pollution required no fix in this plan — it was already resolved by 143-05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `members/[slug]/page.test.tsx`'s `RoleCatalogProvider` mock catalog was missing the `timer` role, silently hiding an earned badge group**
- **Found during:** Task 1
- **Issue:** The page's fixture earns `role_entry_timer` (`public_badges`), but the test's own `catalogRoles` mock array only contained `typesetter` and `karaoke_fx`. Phase 136 CR-02's intentional "trust the catalog" gate in `MemberBadgeChain.tsx` filters earned role badges whose role code isn't present in the fetched catalog — a correct, deliberate anti-drift behavior that was tripped by this fixture inconsistency, not a bug in the gate itself.
- **Fix:** Added a `timer` entry to `catalogRoles`, matching the shape of the other two entries.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`
- **Verification:** All 31 tests in the file pass, including the previously-failing heading-hierarchy test.
- **Committed in:** `1d92244b`

**2. [Rule 1 - Bug] `MemberBadgeChain.test.tsx`'s 4 failing assertions were pre-existing Phase-119-era test debt superseded by later phases (125/126/127), not touched by files_modified but required for the plan's own acceptance criteria to pass**
- **Found during:** Task 1
- **Issue:** `git log` confirmed neither `MemberBadgeChain.tsx` nor its test file changed between 2026-08-20 (commit `acb11232`) and the start of Phase 142's commit range — so these failures predate and are unrelated to Phase 142/143. Each was individually diagnosed:
  - The combined "1 mitgetragenes Projekt · Noch 4 bis Silber" text assumed `FamilyCollectionCard`'s single-paragraph copy pattern, but `ContributionAchievementStage` (introduced in Phase 125, proven by multiple currently-passing tests including an identical `within(stage).getByText('20 mitgetragene Projekte')` + separate `'Höchste Stufe erreicht'` pair) deliberately renders count and next-tier copy as two separate nodes.
  - "7+ Jahre Mitglied"/"10+ Jahre Mitglied" labels contradicted the "X Jahre Mitgliedschaft" wording used and locked by ~15 other currently-passing assertions in the same file (Phase 126 membership-stage tests).
  - The "Gründungsmitglied · Gesperrt" expectation for a non-founder directly contradicted three separate, explicitly-named, currently-passing Phase 126 tests ("does not render an interactive or empty founding card for non-founders").
  - The `data-contribution-family-stage="..."` selector used a non-existent attribute name; the file's own established pattern (already used successfully 3 other times, including a passing test 20 lines above) is `[data-family="..."][data-contribution-achievement-stage]`.
  - The "Besondere Auszeichnungen" heading and "Historische Leitung" h3 expectations directly contradicted the currently-passing "Phase 127 RED chain suppresses legacy Special" test, which explicitly and deliberately suppresses the `special` badge group once `badgeProgress` (collection-card mode) is supplied — Phase 120's test predates that suppression and was never updated.
  - The final `.roleHeroArtwork` CSS regex checked `memberBadgeChainCss` (the post-133-09-split shell file) for `height: 320px`, but that selector and its `width: 320px; aspect-ratio: 1; height: auto;` rule moved to `RoleBadgeCard.module.css` in Plan 133-09 (documented in that file's own code comment); the correct pattern already exists and passes 6 lines below in the same test file.
- **Fix:** Corrected all 5 stale assertions/selectors to match the actual, already-adopted, already-multiply-tested behavior. Zero changes to any production `.tsx`/`.css` file.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** All 109 tests in the file pass (1 pre-existing `.skip`).
- **Committed in:** `1d92244b`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — a stale test fixture and pre-existing, unrelated test drift, both required to make this plan's own named acceptance criteria pass)
**Impact on plan:** No architectural changes, no production code changes to `MemberBadgeChain.tsx` (contrary to the plan's `files_modified` listing — investigation showed no production bug existed at the file's actual current state, only test-side drift and a fixture gap in a sibling test file). No scope creep beyond what was needed to turn the plan's own named acceptance criteria green.

## Issues Encountered
None beyond the deviations documented above — each failure was traced to a concrete root cause (a missing fixture entry, or a specific superseding test elsewhere in the same file) via git history and cross-referencing, rather than guessed at.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CONTEXT.md's Kriterium 1 (testsuite triage) is now fully closed: all 17 originally-red frontend test files across 143-05, 143-06, and 143-07 are green, and a full unscoped `npx vitest run` confirms 0 unexpected red files (288 files / 2146 tests passed, 1 skipped by design, 3 todo).
- `next.config.mjs`'s narrowed `images.localPatterns` is a genuine security tightening (T-143-07-01) ready for the remaining Phase-143 plans; no known consumer of a `/media/**` path outside the three allow-listed namespaces exists.
- No blockers for subsequent Phase 143 plans.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

All 6 modified files and the SUMMARY.md itself verified present on disk; all 3 task commits
(`1d92244b`, `8f250c12`, `27668413`) verified present in `git log --oneline --all`.
