---
phase: 171-kara-segmente-in-release-media-und-public-story-integrie
plan: 03
subsystem: ui
tags: [nextjs, react, release-story, kara, timeline, responsive, auth]

requires:
  - phase: 171-kara-segmente-in-release-media-und-public-story-integrie
    provides: Typed canonical public mixed story projection and release-version segment playback contracts from Plans 01-02
provides:
  - Canonical mixed public release story rendering media and Kara in server-provided order
  - Stable timeline-to-Kara-card anchors with responsive inline playback cards
  - Preview fallback, highlight preservation, login gating, and regression coverage
affects: [public-release-story, release-detail, phase-171-verification]

tech-stack:
  added: []
  patterns:
    - Public story consumes the discriminated story projection directly; legacy image-only fallback retains compatibility ordering.
    - Timeline navigation targets release-story-kara-{theme_segment_id} anchors without granting playback.
    - Kara playback remains session-gated and uses the existing release-version-bound stream URL.
    - Responsive gallery reveal and card layout remain mobile-first with contained media.

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx

key-decisions:
  - "The public gallery renders detail.story exactly as projected; only responses without story retain the pre-existing image-only ordering fallback."
  - "Timeline hit targets navigate to the matching Kara card and never themselves authorize playback."
  - "Kara cards show play to authenticated sessions and login to guests while backend stream resolution remains authoritative."

patterns-established:
  - "Every public Kara card uses the stable release-story-kara-{theme_segment_id} DOM anchor."
  - "Kara preview resolution prefers segment.preview_url and falls back to the existing release preview image."

requirements-completed: [PH171]

metrics:
  duration: ~35 min
  completed: 2026-09-30
---

# Phase 171 Plan 03: Public mixed release story Summary

**The public release page now renders one canonical media/Kara story with anchored timeline navigation, fallback previews, and session-aware playback.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-30T20:45:00Z
- **Completed:** 2026-09-30
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Passed detail.story into ReleaseGallery and removed the separate public Kara-card flow from the page composition.
- Rendered media and Kara cards in canonical story order, preserving image highlight metadata and normal lightbox behavior.
- Added stable timeline-to-card scrolling, release-preview fallback imagery, responsive Kara cards, and guest/authenticated playback affordances.
- Added mixed-story, fallback-preview, anchor-navigation, unavailable-target, and responsive regression coverage.

## Task Commits

1. **Task 1: Replace separate Kara section with mixed story** - 468e065d (feat)
2. **Task 2: Add stable anchors and retain playback behavior** - 468e065d (feat)
3. **Task 3: Lock responsive and contract evidence** - 468e065d (feat)

## Files Created/Modified

- releaseDetailPageData.tsx - passes canonical story data and suppresses the old separate segment-card rendering.
- ReleaseGallery.tsx - consumes mixed story items, renders inline Kara, preserves image lightbox behavior, and keeps auth/playback semantics.
- ReleaseGallery.module.css - adds responsive Kara card, fallback, player, and timeline-target highlight styling.
- ThemeTimeline.tsx / ThemeTimeline.module.css - derives stable target IDs and scrolls ready timeline targets to matching cards without authorizing playback.
- ReleaseGallery.test.tsx / ThemeTimeline.test.tsx - cover canonical mixed order, fallback previews, login affordance, anchor scrolling, and unavailable hit-target behavior.

## Decisions Made

- Canonical story order is authoritative when present; legacy image-only responses keep the previous preview/highlight/regular ordering fallback for compatibility.
- The public timeline is navigation only. Playback remains an explicit card action behind the existing auth/session and backend resolver seam.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored timeline readiness boundary after adding anchors**
- **Found during:** Task 2
- **Issue:** The first anchor implementation exposed hit targets for unavailable segments, regressing the existing static unavailable state.
- **Fix:** Timeline hit targets are rendered only for ready segments; unavailable segments remain non-interactive while their inline cards retain status copy.
- **Files modified:** ThemeTimeline.tsx, ThemeTimeline.test.tsx
- **Verification:** Focused timeline suite passes, including the unavailable-target regression test.
- **Committed in:** 468e065d

**2. [Rule 3 - Blocking] Preserved image-only compatibility fallback**
- **Found during:** Task 1
- **Issue:** Existing gallery fixtures and older responses do not include story; directly assuming mixed data would lose image ordering/reveal behavior.
- **Fix:** Added a typed fallback projection using the existing preview/highlight/regular ordering and cursor reveal seam.
- **Files modified:** ReleaseGallery.tsx, ReleaseGallery.test.tsx
- **Verification:** Existing gallery suite and mixed-story suite pass.
- **Committed in:** 468e065d

---
**Total deviations:** 2 auto-fixed (1 bug, 1 blocking compatibility issue)
**Impact on plan:** Both fixes were directly required to preserve existing public behavior; no new endpoint, auth boundary, or media ownership seam was introduced.

## Issues Encountered

- The plan examples use docker compose exec frontend and --runInBand; this checkout exposes team4sv30-frontend and Vitest does not support --runInBand. Equivalent commands were used against the running service.
- Full frontend typecheck remains blocked by pre-existing ReleaseDetailHero.test.tsx fixtures missing required previous fields. No errors remain in the files touched by this plan.
- Full repository lint remains blocked by unrelated existing errors in capture-responsive.cjs, CapabilityDetailRow.tsx, and other files. Targeted ESLint for all touched TS/TSX files passes.
- No backend source changes were needed; Plan 01 already supplied the story and playback contracts, and the focused public repository integration coverage remains in place.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The public page consumes the canonical mixed story and is ready for live browser verification at the existing release-version route. Plan 04 can validate the complete phase against live data and the prior admin ordering flow.

---
*Phase: 171-kara-segmente-in-release-media-und-public-story-integrie*
*Completed: 2026-09-30*

## Self-Check: PASSED

- Summary file exists.
- Implementation commit 468e065d is present in git history.
- Focused ESLint, focused Vitest suites, and git diff --check passed.
- Full typecheck has only the pre-existing ReleaseDetailHero.test.tsx fixture errors documented above.
