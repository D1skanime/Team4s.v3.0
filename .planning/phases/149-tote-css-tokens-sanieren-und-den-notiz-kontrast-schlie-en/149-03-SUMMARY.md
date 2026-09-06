---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 03
subsystem: ui
tags: [css, custom-properties, design-tokens, dead-code, contrast]

# Dependency graph
requires:
  - phase: 148-tote-css-tokens (role-color restoration precedent)
    provides: "globals.css token definitions (--accent-primary, --accent-deep, --color-border, --border-subtle, --radius-sm) that this plan's replacements resolve against"
provides:
  - "8 dead-token references (--color-info x3, --accent-primary-strong x2, --border-default x1, --border-soft x1, --radius x1) replaced with locked, already-defined replacement tokens across 6 files"
  - "Block A file group 3 of 3 complete; combined with Plans 149-01/02, all 39 fallback-free dead-token occurrences across 15 files are fixed"
affects: [149-04, 149-05, 149-06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Dead custom-property token substitution — same-value token-name swap with no rendering or geometry change"]

key-files:
  created: []
  modified:
    - frontend/src/components/episodes/EpisodesOverview/VersionRow.module.css
    - "frontend/src/app/fansubs/[slug]/page.module.css"
    - frontend/src/components/fansubs/FansubPublicSections.module.css
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.module.css"
    - frontend/src/components/ui/ui.module.css
    - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx

key-decisions:
  - "--radius at RoleCapabilityDetail.tsx:224 resolves to --radius-sm (6px), per 149-UI-SPEC.md's sibling-alert-box comparison (MemorialSetterAction.tsx, CorrectionReportModal.tsx both hardcode borderRadius: 6), overriding ROADMAP's tentative --radius-md guess."

patterns-established: []

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-09-06
---

# Phase 149 Plan 3: Fix remaining dead CSS tokens (--color-info, --accent-primary-strong, --border-default, --border-soft, --radius) Summary

**Replaced 8 fallback-free dead custom-property references across 6 files with their 149-UI-SPEC.md-locked replacement tokens (--accent-primary, --accent-deep, --color-border, --border-subtle, --radius-sm), completing Block A's full 39-occurrence, 15-file dead-token remediation scope.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-06T06:51:36Z
- **Completed:** 2026-09-06T06:53:14Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments
- `VersionRow.module.css`'s `.subtitleSoftsub` info badge (border/background/color, lines 99-101) now references `var(--accent-primary)` instead of the undefined `var(--color-info)`.
- Both public fansub-page hover links (`app/fansubs/[slug]/page.module.css:259`, `FansubPublicSections.module.css:860`) now reference `var(--accent-deep)` instead of the undefined `var(--accent-primary-strong)`.
- `ThemeTimeline.module.css:58`'s `.track` border now references `var(--color-border)` instead of the undefined `var(--border-default)`.
- `ui.module.css:643`'s `.datePickerTrigger` border now references `var(--border-subtle)` instead of the undefined `var(--border-soft)`.
- `RoleCapabilityDetail.tsx:224`'s inline `role="alert"` error box now sets `borderRadius: 'var(--radius-sm)'` instead of the undefined `'var(--radius)'`, resolving the ambiguity the ROADMAP left open in favor of the UI-SPEC's sibling-comparison-based 6px lock.
- Project-wide grep confirms zero remaining references to `--color-info`, `--accent-primary-strong`, `--border-default`, `--border-soft`, or bare `var(--radius)` anywhere under `frontend/src`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix --color-info in VersionRow.module.css and --accent-primary-strong in the two public fansub page files** - `134480a3` (fix)
2. **Task 2: Fix --border-default, --border-soft, --radius in ThemeTimeline.module.css, ui.module.css, RoleCapabilityDetail.tsx** - `d8abd779` (fix)

**Plan metadata:** (this commit, added after this document)

## Files Created/Modified
- `frontend/src/components/episodes/EpisodesOverview/VersionRow.module.css` - `.subtitleSoftsub` info badge now uses `--accent-primary`
- `frontend/src/app/fansubs/[slug]/page.module.css` - `.heroLink:hover` now uses `--accent-deep`
- `frontend/src/components/fansubs/FansubPublicSections.module.css` - `.inlineLink:hover` now uses `--accent-deep`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.module.css` - `.track` border now uses `--color-border`
- `frontend/src/components/ui/ui.module.css` - `.datePickerTrigger` border now uses `--border-subtle`
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` - inline error-box `borderRadius` now uses `--radius-sm`

## Decisions Made
- Confirmed and applied 149-UI-SPEC.md's `--radius` -> `--radius-sm` resolution (6px), which supersedes the ROADMAP's tentative `--radius-md` candidate guess, based on the two structurally identical `role="alert"` boxes elsewhere in the codebase both hardcoding `borderRadius: 6`.

## Deviations from Plan

None — plan executed exactly as written. One informational note: the plan's acceptance-criteria grep for Task 1 (`grep -c "var(--accent-primary)" ... equals 3`) assumed `VersionRow.module.css` had zero pre-existing `--accent-primary` usages; in reality the file already had 10 unrelated pre-existing occurrences of that (already-valid) token, so the total count is 13, not 3. The actually-required outcome — the 3 specific lines (99, 100, 101) that previously read `--color-info` now read `--accent-primary` — is verified true by line-numbered grep. This is a plan-authoring inaccuracy in the literal count assertion, not a defect in the fix.

## Issues Encountered
`npx tsc --noEmit` inside the frontend container reports one pre-existing error unrelated to this plan's changes: a Next.js generated route-type mismatch in `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` (a different file from any this plan touched). This matches the codebase's documented precedent of pre-existing, unrelated Next.js route-type errors (see STATE.md Phase 135 decision log). Out of scope per the deviation rules' Scope Boundary — not fixed, not caused by this plan's `RoleCapabilityDetail.tsx` inline-style string change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Block A (dead-token remediation) is now complete across all three parallel plans (149-01, 149-02, 149-03) — 39/39 fallback-free occurrences across 15 files fixed, 0 new tokens introduced, 0 existing token values changed. Ready for the remaining Phase 149 plans (149-04 through 149-06), which per the ROADMAP/UI-SPEC cover the guard test (Success Criterion 3), the PublicNoteCard contrast fix (Part B), and live UAT (Success Criteria 5-7).

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*

## Self-Check: PASSED

All 7 files (6 modified source files + this SUMMARY.md) confirmed present on disk. All 3 commits
(`134480a3`, `d8abd779`, `5ee95e69`) confirmed present in git log.
