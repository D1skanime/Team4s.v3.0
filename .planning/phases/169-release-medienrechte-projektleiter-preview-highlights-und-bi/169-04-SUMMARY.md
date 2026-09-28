---
phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi
plan: 04
subsystem: public-release-ui
tags: [go, postgres, react, typescript, openapi, release-version-media, highlights]

requires:
  - phase: 169-02
    provides: canonical release-version highlight persistence/API and synchronized admin contracts
  - phase: 169-03
    provides: independent preview/highlight media DTO patterns and release-version media ownership
provides:
  - public release-version image projections with eligible highlight metadata and deterministic ordering
  - preview-only group thumbnails and independent PreviewImage selection
  - public OpenAPI/TypeScript highlight DTO parity and highlight-aware gallery/lightbox ordering
affects: [public-release-detail, release-version-media, fansub-release-gallery]

tech-stack:
  added: []
  patterns:
    - public release-version media joins retain ready/public/approved/non-deleted gates
    - preview candidacy remains separate from highlight state and highlight order
    - public gallery orders preview first, then deterministic highlights, then regular story media

key-files:
  created:
    - none
  modified:
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_cursor_test.go
    - backend/internal/repository/release_detail_public_repository_test.go
    - frontend/src/types/releaseDetail.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - shared/contracts/openapi.yaml

key-decisions:
  - "The existing ReleaseGallery.tsx is the canonical public lightbox/story seam; the plan's ReleaseDetailClient.tsx path does not exist in the current repository."
  - "Public image highlight_order is always serialized as a nullable field so the OpenAPI and TypeScript response shapes remain aligned."
  - "Group release-card thumbnails continue to select only is_preview_candidate; highlights are not a media ownership or preview substitute."

patterns-established:
  - "Public release image projections expose is_highlight and highlight_order only through the release_version_media relation and its highlight join."
  - "Same-category highlights sort by highlight_order and stable relation ID, while the UI keeps preview first."

requirements-completed: [REQ-169-05, REQ-169-06]

duration: 18min
completed: 2026-09-28
---

# Phase 169 Plan 04: Release-Medienrechte, Projektleiter, Preview, Highlights und Bildreihenfolge Summary

**Public release-version projections now expose gated independent highlights with deterministic ordering while preview and release-version media ownership remain separate**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-28T18:57:00Z
- **Completed:** 2026-09-28T19:15:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Extended the full public release detail and cursor image projections with a left join to release_version_media_highlights, preserving ready/public/approved/non-deleted media gates and exposing nullable highlight order.
- Kept PreviewImage and group release-card thumbnails driven only by is_preview_candidate; no release_media, episode media, or parallel ownership seam was introduced.
- Aligned the public OpenAPI contract and frontend DTO, and updated the existing ReleaseGallery lightbox/story mapping to put preview first, sort multiple highlights deterministically, and label preview/highlight state.
- Added focused backend source/projection coverage and public gallery regression coverage for preview-only, highlight-only, both, hidden/processing gate behavior, and same-category ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend public repository projections** - 65dd3a73 (test RED), 152f0f22 (feat)
2. **Task 2: Align public frontend contract and UI** - 7fec2599 (test RED), 74d147c9 (feat)

Additional correctness fix:

- 091ada20 (fix): keep public highlight_order nullable and required across runtime/contract

## Files Created/Modified

- `backend/internal/repository/release_detail_public_repository.go` - cursor image projection and scan now carry highlight metadata.
- `backend/internal/repository/release_detail_public_repository_helpers.go` - full public image query joins eligible highlight rows and orders them deterministically.
- `backend/internal/repository/release_detail_public_repository_test.go` - public image visibility gate coverage includes the highlight relation.
- `backend/internal/repository/release_detail_cursor_test.go` - cursor projection and preview-only thumbnail assertions.
- `shared/contracts/openapi.yaml` - public image DTO documents required preview/highlight state and nullable order.
- `frontend/src/types/releaseDetail.ts` - typed public highlight fields.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` - preview/highlight ordering and badges in the existing story/lightbox flow.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` - public ordering and state-independence regression.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` - aligned preview fixture for the expanded public image DTO.

## Decisions Made

- Reused the existing release-version public projection and ReleaseGallery seam; no new public endpoint, component family, or media ownership structure was added.
- Highlight rows are joined to already-gated public release-version media, and same-category highlight order is stable by highlight_order then relation ID.
- Preview remains an independent is_preview_candidate path for PreviewImage and group thumbnails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used source-mounted Compose test execution for backend TDD**
- **Found during:** Task 1 verification
- **Issue:** The project GSD wrapper exposes the legacy gsd-tools command surface, and the running backend service image does not bind-mount backend source files.
- **Fix:** Executed the same Go tests in a disposable Compose backend container with `/home/d1sk/team4s/backend` mounted at `/app`; no runtime data or source outside the canonical Linux tree was changed.
- **Files modified:** None.
- **Verification:** Focused backend repository tests passed.
- **Committed in:** N/A (verification environment only)

**2. [Rule 2 - Contract alignment] Made public highlight_order explicitly nullable**
- **Found during:** Final contract/diff review
- **Issue:** Go's `omitempty` would omit the field for non-highlight rows while the frontend DTO and OpenAPI model describe a nullable response field.
- **Fix:** Removed `omitempty` from the public Go JSON tag and required `highlight_order` in the public OpenAPI schema.
- **Files modified:** backend/internal/repository/release_detail_public_repository.go, shared/contracts/openapi.yaml
- **Verification:** Focused backend tests, frontend tests, lint, and diff check passed.
- **Committed in:** 091ada20

**3. [Rule 3 - Plan seam correction] Used the current public gallery file**
- **Found during:** Task 2 implementation
- **Issue:** The plan names ReleaseDetailClient.tsx and its test, but those files do not exist in the canonical repository; ReleaseGallery.tsx owns the existing public story/lightbox mapping.
- **Fix:** Extended ReleaseGallery.tsx and ReleaseGallery.test.tsx without introducing a parallel client seam.
- **Files modified:** frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx, ReleaseGallery.test.tsx
- **Verification:** Focused public gallery/hero suite passed 28/28.
- **Committed in:** 7fec2599, 74d147c9

---

**Total deviations:** 3 auto-fixed (2 Rule 3, 1 Rule 2)
**Impact on plan:** All deviations preserved the requested domain/API behavior and avoided parallel public media logic.

## Issues Encountered

- Full frontend typecheck remains blocked by pre-existing errors in ReleaseDetailHero.test.tsx (missing unrelated previous fixture fields) and OlderReleasesList.rows.tsx (stale start_episode access). The changed production files introduce no new type errors; the focused tests and changed-file lint pass.
- A broader backend repository regex also reaches the pre-existing Phase134Matrix credential test; the explicit focused public projection suite passes independently.

## Known Stubs

None introduced by this plan. Existing public fallback labels and empty media states remain intentional behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Public release detail and group projections now consume the canonical release_version_media_highlights relation safely.
- Plan 169-05 can build on the same DTO fields and deterministic highlight ordering without changing preview semantics or media ownership.
- No database rows were changed and no push was performed.

---
*Phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi*
*Completed: 2026-09-28*

## Self-Check: PASSED

- Summary file exists after creation.
- Task RED/GREEN commits 65dd3a73, 152f0f22, 7fec2599, and 74d147c9 exist in git history.
- Correctness fix 091ada20 exists in git history.
- Focused backend repository tests passed.
- Focused frontend tests passed 28/28.
- Changed-file ESLint and git diff --check passed.
