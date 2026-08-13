---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "08"
subsystem: frontend-ui
tags: [react, accessibility, semantic-headings, responsive-images, profile]
requires:
  - phase: 120-02
    provides: Public member-profile loading and rendering baseline
  - phase: 120-07
    provides: Locked Hero B and shared profile token baseline
provides:
  - Bounded semantic H2/H3 support in the global SectionHeader
  - Story and membership sections ready for the public H2 pair composition
  - Fixed 52px lazy membership logos with optimizer-first display-original fallback
affects: [120-11, 120-13, public-member-profile, SectionHeader]
tech-stack:
  added: []
  patterns: [bounded semantic heading props, optimizer-first display-original image fallback]
key-files:
  created:
    - frontend/src/components/ui/SectionHeader.test.tsx
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-08-SUMMARY.md
  modified:
    - frontend/src/components/ui/SectionHeader.tsx
    - frontend/src/components/profile/MemberStorySection.tsx
    - frontend/src/components/profile/MemberStorySection.module.css
    - frontend/src/components/profile/MemberStorySection.test.tsx
    - frontend/src/components/profile/MembershipsSection.tsx
    - frontend/src/components/profile/MembershipsSection.test.tsx
    - frontend/src/components/profile/profile.module.css
key-decisions:
  - "SectionHeader accepts only level 2 or 3 and defaults to H2, preserving every existing consumer."
  - "Story and memberships expose headingLevel with the same H2 default; Plan 120-11 can opt into H3 under its shared H2."
  - "Membership logos use ResponsiveImage with the resolved public display URL, fixed 52px geometry, lazy loading and no source-original seam."
patterns-established:
  - "Semantic hierarchy is configured through bounded numeric heading props rather than duplicated header markup or visual variants."
  - "Profile pair cards consume global surface, border, radius, shadow and 400/700 typography tokens without adding nested card wrappers."
requirements-completed: [D-06, D-07, D-08, D-09, D-17, D-19, D-22]
duration: 11m
completed: 2026-08-04
---

# Phase 120 Plan 08: Semantic Story and Membership Pair Summary

**Global bounded H2/H3 headers now prepare the story and membership cards for one shared profile H2, while group logos reserve 52px and use the existing optimizer-first display-original fallback.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-04T16:06:08Z
- **Completed:** 2026-08-04T16:17:07Z
- **Tasks:** 2
- **Files modified:** 8 implementation/test files plus this summary

## Accomplishments

- Extended the domain-free `SectionHeader` with a bounded `level?: 2 | 3` prop while retaining H2 as the default and the single global `var(--ui-line)` underline.
- Added compatible `headingLevel` props to story and memberships so Plan 120-11 can compose both as H3 cards without changing standalone dashboard, preview or legacy consumers.
- Preserved `RichTextRenderer` sanitization, `ResizeObserver` measurement/cleanup and component-local expand/collapse state in the story section.
- Replaced the membership logo's permanently unoptimized image with `ResponsiveImage` at 52x52, `sizes="52px"` and lazy loading; fallback retries only the same resolved display URL.
- Aligned touched pair-card surfaces and text with global tokens and the locked 400/700 typography contract without adding a generic card-in-card wrapper.

## Task Commits

1. **Task 1 RED: Lock SectionHeader semantic levels** — `cda0a1e6`
2. **Task 1 GREEN: Add bounded H2/H3 rendering** — `804940d0`
3. **Task 2 RED: Lock pair headings and logo delivery** — `b0672bdb`
4. **Task 2 GREEN: Prepare story and memberships pair** — `7b3fd285`

## Files Created/Modified

- `frontend/src/components/ui/SectionHeader.tsx` — Bounded semantic heading selection with H2 default.
- `frontend/src/components/ui/SectionHeader.test.tsx` — Default H2, opt-in H3, shared style and global token ownership coverage.
- `frontend/src/components/profile/MemberStorySection.tsx` — Compatible heading level while retaining the existing safe story renderer and measurement state.
- `frontend/src/components/profile/MemberStorySection.module.css` — Tokenized card surface and 14px/400 story copy.
- `frontend/src/components/profile/MemberStorySection.test.tsx` — Standalone H2 and pair H3 coverage alongside existing empty, clamp and toggle tests.
- `frontend/src/components/profile/MembershipsSection.tsx` — Compatible heading level and 52px lazy `ResponsiveImage` logos.
- `frontend/src/components/profile/MembershipsSection.test.tsx` — Semantic headings, links/ownership and exact image-prop coverage.
- `frontend/src/components/profile/profile.module.css` — Overflow-safe membership geometry and global card/400-700 typography tokens.

## Decisions Made

- Kept semantic levels bounded to 2 and 3; domain sections cannot turn the global primitive into an arbitrary heading/variant API.
- Kept H2 as the default in both domain components, so existing dashboard and hidden-preview callers remain semantically unchanged.
- Reused `ResponsiveImage` directly instead of creating a membership-specific fallback or image helper.
- Retained the existing card structure and only tokenized its surfaces; no new outer generic card was added around existing interactive membership cards.

## Verification

- Focused Vitest suites: **12/12 passed** across `SectionHeader`, `MemberStorySection` and `MembershipsSection`.
- Targeted ESLint for all changed TSX/test files with `--max-warnings=0`: **passed**.
- Production typecheck with only inherited implicit-any diagnostics disabled: **passed**.
- Strict production typecheck: **blocked only by inherited TS7016** in `src/components/ui/ResponsiveImage.config.test.ts` for `../../../next.config.mjs` (pre-existing debug commit `2585b8a0`); no 120-08 file was reported.
- `git diff --check`: **passed**.
- Phase-119 overlap-chain audit using committed initial/latest manifests: **passed** with `{"ok":true}` before both tasks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supplied the validator's committed manifest inputs**
- **Found during:** Task 1 and Task 2 preconditions
- **Issue:** The literal planned `check --authorization ...` command exits with `check requires --expect or --initial` under the committed validator.
- **Fix:** Used the committed initial overlap manifest plus the exact latest per-file Phase-120 evidence manifests already established by Plans 06, 10 and 12. Authorization and evidence were never refreshed or rewritten.
- **Files modified:** None.
- **Verification:** Both corrected preconditions returned `{"ok":true}`.

---

**Total deviations:** 1 auto-fixed blocking invocation issue.
**Impact on plan:** No scope expansion, domain/API change or weakening of the Phase-119 ownership boundary.

## Issues Encountered

- Strict typecheck remains blocked by the inherited TS7016 in `ResponsiveImage.config.test.ts` from debug commit `2585b8a0`. The scoped implementation typechecks when that single unrelated implicit-any category is relaxed; the inherited file was not edited.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Review

- T-120-03 remains mitigated: membership images receive only the resolved display URL; no `source_original_url` is accepted or rendered.
- T-120-07 is mitigated by explicit H2/H3 tests, fixed 52x52 intrinsic logo geometry and preserved story observer cleanup.
- No endpoint, auth path, schema, file-access boundary or media ownership surface changed.

## Unrelated Existing State

Dirty Phase-119 badge assets and planning artifacts, plus shared `.planning/STATE.md` and `.planning/ROADMAP.md`, remain untouched and unstaged as required.

## Next Phase Readiness

- Plan 120-11 can now render one underlined H2 `Profil und Mitgliedschaft` and pass `headingLevel={3}` into both cards.
- Plan 120-13 can live-verify the pair at 390/768/1440 and confirm membership fallback requests without reopening image ownership.

## Self-Check: PASSED

---
*Phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo*
*Completed: 2026-08-04*
