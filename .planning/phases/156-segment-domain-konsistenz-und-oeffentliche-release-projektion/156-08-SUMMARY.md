---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 08
subsystem: ui
tags: [nextjs, react, typescript, vitest, theme-timeline, release-detail, member-links]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "06"
    provides: "CanonicalSegmentType -- backend-canonical OP/ED/INSERT/KARA derivation"
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "07"
    provides: "loadReleaseSegments/loadPublicEffectiveContributors surfacing RoleCodes/MemberSlug on release-page segment participants"
provides:
  - "ThemeTimeline.tsx renders backend-canonical segment.type directly; own OP/ED/INSERT/KARA classification (TYPE_LABELS/TYPE_STYLE_KEYS) is deleted"
  - "ThemeTimelineSegmentDetails.tsx (new sibling) -- SegmentDetails/SelectionSurface extracted, with project-context member-link participant rendering"
  - "PublicReleaseContributor.role_codes/member_slug (frontend DTO, mirrors Plan 156-05 backend fields)"
  - "First production consumer of buildPublicFansubProjectMemberPath's suffix shape ('/mitwirkende/' + encodeURIComponent(memberSlug))"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentational-only lookup tables (SEGMENT_TYPE_STYLE_CLASS/SEGMENT_TYPE_DISPLAY_LABEL) keyed by exact canonical backend values, no substring/heuristic matching in the frontend"
    - "Per-participant conditional Link rendering via React.Fragment siblings (not a wrapping element) so RTL's default direct-text-node matching still resolves the combined name+role text"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimelineSegmentDetails.tsx
  modified:
    - frontend/src/types/releaseDetail.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.test.tsx

key-decisions:
  - "Kept `segmentTypeDisplayLabel` (German label lookup) in the new sibling file ThemeTimelineSegmentDetails.tsx and imported it back into ThemeTimeline.tsx, instead of duplicating the map in both files -- avoids a circular import (ThemeTimeline already imports SegmentDetails/SelectionSurface from the sibling) while keeping exactly one label map"
  - "Used React.Fragment (not a wrapping <span>) for each participant entry so the participants <span>'s direct text-node children still concatenate to the full 'Name · Role' string -- Testing Library's default getNodeText only reads a node's own text-node children, not descendant elements, so wrapping each participant in its own element would have broken existing regex-based text assertions"
  - "SEGMENT_TYPE_STYLE_CLASS keyed by exactly the four canonical codes (OP/ED/INSERT/KARA) per the plan's explicit instruction, with typeOther as the sole fallback -- a backend fallback value like 'MIDDLE' (CanonicalSegmentType's uppercase-passthrough case) now renders via the generic typeOther/raw-label fallback rather than a dedicated typeMiddle class, matching the plan's literal must-have text"

requirements-completed: [P156-14, P156-15]

# Metrics
duration: 11min
completed: 2026-09-11
---

# Phase 156 Plan 08: ThemeTimeline Canonical-Type Rendering and Project-Context Member Links Summary

**`ThemeTimeline.tsx` no longer owns an OP/ED/INSERT/KARA classification world -- it renders the backend-canonical `segment.type` directly through a small presentational CSS-class/label lookup, and segment participants with a `member_slug` now link to the project-context member route via the first production use of `buildPublicFansubProjectMemberPath`'s suffix shape.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-11T21:50:21Z (previous commit in sequence)
- **Completed:** 2026-09-11T22:01:02Z
- **Tasks:** 2 completed
- **Files modified:** 6 (1 new, 5 modified)

## Accomplishments

- `ThemeTimeline.tsx`'s `TYPE_LABELS`, `TYPE_STYLE_KEYS`, `typeKey`, and `segmentTypeLabel` -- the frontend's own fachliche OP/ED/INSERT/KARA classification world, including variant string keys like `'OP KARA'`/`'OPENING KARA'` -- are deleted entirely. The only remaining type-keyed lookups (`SEGMENT_TYPE_STYLE_CLASS` for CSS class, `SEGMENT_TYPE_DISPLAY_LABEL` for the German label) are exact-key maps over the four canonical backend codes (`OP`/`ED`/`INSERT`/`KARA`) with a single `typeOther`/raw-value fallback -- they map an already-decided value, they do not decide it.
- New sibling file `ThemeTimelineSegmentDetails.tsx` (97 lines) holds the extracted `SegmentDetails`/`SelectionSurface` components plus the German display-label lookup, keeping `ThemeTimeline.tsx` at 323 lines -- both comfortably under CLAUDE.md's 450-line cap (the plan's own research had flagged the file at 396/450 before this split).
- Segment participants with a `member_slug` now render as a `<Link>` to `{projectPath}/mitwirkende/{encodeURIComponent(memberSlug)}` -- the first production consumer of `buildPublicFansubProjectMemberPath`'s established suffix shape (built in Phase 155, unused in production until now). Participants without a resolvable slug, or when no `projectPath` is supplied, render exactly the old plain-text `"{name} · {role_label}"` line, per participant (not per whole list).
- `PublicReleaseContributor` (frontend DTO) gained `role_codes: string[]` and `member_slug: string | null`, mirroring Plan 156-05's backend `RoleCodes`/`MemberSlug` fields (`role_codes`/`member_slug` JSON keys, confirmed against `release_detail_public_repository.go`).
- `releaseDetailPageData.tsx` threads the already-in-scope `canonicalProjectPath` into `<ThemeTimeline projectPath={canonicalProjectPath} />`.
- Vitest coverage (`ThemeTimeline.test.tsx`, 23 tests, all green) now proves: a participant with `member_slug` + `projectPath` renders a real `<Link>` to the exact expected href; a participant with `member_slug: null` or no `projectPath` renders plain text with no link; canonical backend type values (`OP`/`ED`/`INSERT`) map to their correct CSS classes; and a regression case (`type: 'KARAAGE'`, an unrelated "kara" substring at the start of an unrecognized word) proves the new presentational maps do NOT misclassify it as Karaoke -- confirming no string-matching/heuristic logic survived the split.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split ThemeTimeline, drop the frontend type world, add project-context member links** - `a9363666` (feat)
2. **Task 2: Update ThemeTimeline Vitest coverage for the split and member links** - `3c958033` (test)

**Plan metadata:** (this commit) `docs(156-08): complete plan`

## Files Created/Modified

- `frontend/src/types/releaseDetail.ts` - `PublicReleaseContributor` gains `role_codes: string[]` and `member_slug: string | null`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimelineSegmentDetails.tsx` - NEW: `SegmentDetails`, `SelectionSurface`, `segmentTypeDisplayLabel` (German label lookup), per-participant conditional member-link rendering
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` - `TYPE_LABELS`/`TYPE_STYLE_KEYS`/`typeKey`/`segmentTypeLabel`/local `SegmentDetails`/`SelectionSurface` deleted; `SEGMENT_TYPE_STYLE_CLASS` (presentational CSS-class lookup) added; imports `SegmentDetails`/`SelectionSurface`/`segmentTypeDisplayLabel` from the new sibling; new `projectPath` prop threaded to `SelectionSurface`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` - passes `projectPath={canonicalProjectPath}` to `<ThemeTimeline />`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx` - fixtures extended with `role_codes`/`member_slug`; new member-link presence/absence tests; canonical-type rendering tests; `KARAAGE` no-heuristic regression case; `type: 'IN'` fixture updated to canonical `'INSERT'`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.test.tsx` - fixtures updated with the new required `role_codes`/`member_slug` fields (Rule 1 fix, see Deviations)

## Decisions Made

- Kept the German display-label map (`segmentTypeDisplayLabel`) in the new sibling file and imported it back into `ThemeTimeline.tsx`, rather than duplicating it in both files, to avoid a circular import (`ThemeTimeline.tsx` already imports `SegmentDetails`/`SelectionSurface` from the sibling).
- Used `React.Fragment` (no wrapping DOM element) for each participant entry in `ThemeTimelineSegmentDetails.tsx`'s participant list, so the parent `<span className={styles.participants}>`'s own direct text-node children still concatenate to the full `"Name · Role"` string -- Testing Library's default `getNodeText` only reads a node's own text-node children, not descendant elements' text, so wrapping each participant in its own `<span>` would have broken the existing (and new) regex-based `getByText` assertions on the combined name+role text.
- `SEGMENT_TYPE_STYLE_CLASS` is keyed by exactly the four canonical codes (`OP`/`ED`/`INSERT`/`KARA`) per the plan's literal instruction, with `typeOther` as the sole fallback -- a raw uppercase-passthrough value from `CanonicalSegmentType` (e.g. `'MIDDLE'`) now falls into the generic `typeOther` styling/raw-label fallback instead of a dedicated `typeMiddle` class, even though `.typeMiddle` still exists in the CSS module (now dead/unused by this component, left in place since removing CSS was out of this plan's scope).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, directly caused by this plan's change] Fixed `ContributorsRow.test.tsx` fixtures broken by the new required `PublicReleaseContributor` fields**
- **Found during:** Task 1, running `tsc --noEmit` after adding `role_codes`/`member_slug` to `PublicReleaseContributor`
- **Issue:** `ContributorsRow.test.tsx` (a pre-existing, plan-untouched test file) constructs `PublicReleaseContributor` object literals without the two newly-required fields, causing 5 `TS2739` type errors.
- **Fix:** Added `role_codes: []` and `member_slug: null` to each of the five fixture literals in the file. No behavior assertions changed.
- **Files modified:** `ContributorsRow.test.tsx`
- **Verification:** `npx tsc --noEmit` clean; `npm run test -- ContributorsRow` passes (2/2 tests).
- **Committed in:** `a9363666` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 type-fallout fix)
**Impact on plan:** The fix was required purely for compilation correctness after this plan's own DTO change; no behavior or scope change beyond what the plan specified.

## Issues Encountered

- The first draft of the new member-link Vitest test used `screen.getAllByText(/Mia.*Karaoke/)` (mirroring the pre-existing plain-text assertion style), which failed because Testing Library's default `getNodeText` only concatenates a node's own direct text-node children, not descendant elements' text -- once `Mia` moved into a nested `<Link>`/`<a>`, the parent `<span>`'s "own text" no longer included it. Fixed by asserting the link's `href`/accessible name separately and checking `document.querySelector('.participants').textContent` directly for the combined `"Mia · Karaoke"` string. This is a test-authoring correction within Task 2, not a production-code deviation.

## User Setup Required

None -- no external service configuration required. No backend changes in this plan (Plans 156-06/156-07 already deliver the backend-canonical `segment.type` and `role_codes`/`member_slug` fields this plan consumes).

## Next Phase Readiness

- The frontend half of Workstream E/F2 (P156-14/P156-15) is closed. No remaining SQL `LIKE` or frontend type-map duplication exists anywhere in the segment-type derivation path across Plans 156-06 (project page), 156-07 (release page), and this plan (`ThemeTimeline.tsx`).
- `buildPublicFansubProjectMemberPath`'s suffix shape now has a second production consumer path pattern (`{projectPath}/mitwirkende/{slug}`) proven end-to-end in a component test; no blockers for any later phase that wants to add further member-link surfaces using the same helper.
- No blockers identified for downstream Phase 156 plans (Workstream G: query budget, indexes, full test matrix, Vorher/Nachher report).

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All 6 created/modified source files plus this SUMMARY.md confirmed present on disk (7/7 checked).
All three commits (`a9363666`, `3c958033`, `0a5ad761`) confirmed present in `git log`.
