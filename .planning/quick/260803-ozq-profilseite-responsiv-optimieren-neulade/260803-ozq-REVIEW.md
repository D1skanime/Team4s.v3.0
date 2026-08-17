---
phase: 260803-ozq-profilseite-responsiv-optimieren-neulade
reviewed: 2026-08-03T18:25:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/LatestContributionsSection.tsx
  - frontend/src/components/profile/LatestContributionsSection.test.tsx
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Quick Task 260803-ozq: Code Review Report

**Reviewed:** 2026-08-03T18:25:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The seven scoped profile files were reviewed at standard depth, with `FocalCarousel.tsx` inspected only as an integration dependency. The focused test suite passes (60 tests), and `git diff --check` passes. No security or data-loss issue was found. The responsive badge rail nevertheless misses a real resize transition, and both newly interactive surfaces have accessibility contract defects.

## Warnings

### WR-01: Badge rail is not re-centered when the viewport crosses into mobile layout

**File:** `frontend/src/components/profile/MemberBadgeChain.tsx:249-262`
**Issue:** The current-stage centering effect runs only when family data changes. If the component mounts above 820px with all stages fitting, line 253 exits without scrolling. Resizing below 820px changes CSS to the overflowing mandatory-snap rail, but no effect dependency changes, so the current stage can remain off-center until interaction.
**Fix:** Observe the strip with `ResizeObserver` (or subscribe to the media query), invoke a shared centering function on layout changes, clean it up, and test a measured-width change after mount.

### WR-02: The contribution expander controls a nonexistent element ID

**File:** `frontend/src/components/profile/LatestContributionsSection.tsx:117-123,187-190`
**Issue:** The button declares `aria-controls="latest-contributions-list"`, but the `<ul>` never receives `id={listId}`. Assistive technology cannot resolve the advertised relationship.
**Fix:** Add the ID to the list. Prefer `useId()` so multiple instances cannot collide, and test that the target resolves.

### WR-03: The stage strip exposes an invalid mixed list structure

**File:** `frontend/src/components/profile/MemberBadgeChain.tsx:374-416`
**Issue:** The container has `role="list"`, but only locked stages have `role="listitem"`; earned stages are direct buttons without list-item semantics. The announced stage count changes depending on earned state.
**Fix:** Wrap every stage consistently in a semantic list item and add a mixed earned/locked accessibility assertion.

## Info

### IN-01: New interaction tests assert source text and zero-layout mocks instead of behavior

**File:** `frontend/src/components/profile/MemberBadgeChain.test.tsx:938-981`; `frontend/src/components/profile/LatestContributionsSection.test.tsx:4`
**Issue:** The mobile test checks CSS strings, and the centering test leaves jsdom geometry at zero, bypassing the production fit guard. No test covers resize, scroll settling, timer cleanup, or contribution expansion. ESLint also reports the new `fireEvent` import as unused.
**Fix:** Mock nonzero geometry, use fake timers, simulate resize/media-query changes, add an expansion/ARIA-target test, and remove the unused import if unused.

---

_Reviewed: 2026-08-03T18:25:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
