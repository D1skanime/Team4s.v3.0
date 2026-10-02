---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 11
subsystem: api
tags: [openapi, typescript, contracts, display-variant]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "the Go-side display_url field (D-05) added in 173-08 on PublicReleaseImage, PublicReleaseMediaItem, ReleaseReviewImageContent, and models.PublicFansubMediaItem"
provides:
  - "display_url property on the matching OpenAPI schema blocks (ReleaseReviewImageContent, PublicFansubMediaItem, PublicReleaseMediaItem, PublicReleaseImage)"
  - "display_url?: string | null on the matching frontend TypeScript interfaces (releaseDetail.ts, releaseReviews.ts, fansub.ts, groupContributors.ts)"
affects: [173-13, 173-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contract-sync pass: each Go DTO field addition gets a matching OpenAPI property line and a matching frontend TS interface field, placed directly next to the existing thumbnail_url/original_url sibling fields, preserving that specific block's pre-existing style convention"

key-files:
  created: []
  modified:
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseDetail.ts
    - frontend/src/types/releaseReviews.ts
    - frontend/src/types/fansub.ts
    - frontend/src/types/groupContributors.ts

key-decisions:
  - "The plan's files_modified listed frontend/src/types/groupAsset.ts for PublicReleaseMediaItem, but that interface actually lives in frontend/src/types/groupContributors.ts (groupAsset.ts only has an unrelated GroupAssetMedia type with its own thumbnail_url). Edited groupContributors.ts instead, per Rule 3 (blocking file-path correction) -- the plan's stated must_haves truth (display_url sits next to thumbnail_url/original_url on PublicReleaseMediaItem) is satisfied at the correct location."

patterns-established: []

requirements-completed: [REQ-173-10]

# Metrics
duration: ~8min
completed: 2026-10-02
---

# Phase 173 Plan 11: OpenAPI + frontend TypeScript contract sync for display_url Summary

**Added `display_url` to the four OpenAPI schema blocks and the four matching frontend TS interfaces that 173-08 extended on the Go side (PublicReleaseImage, PublicReleaseMediaItem, ReleaseReviewImageContent, PublicFansubMediaItem), with zero runtime/route changes.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-10-02T19:23:00Z (approx)
- **Completed:** 2026-10-02T19:31:32Z
- **Tasks:** 1/1
- **Files modified:** 5

## Accomplishments
- `shared/contracts/openapi.yaml` now lists `display_url` on all four touched schema blocks (`ReleaseReviewImageContent`, `PublicFansubMediaItem`, `PublicReleaseMediaItem`, `PublicReleaseImage`), each matching that block's pre-existing inline-vs-multiline style.
- `frontend/src/types/releaseDetail.ts` (`PublicReleaseImage`), `frontend/src/types/releaseReviews.ts` (`ReleaseReviewImageContent`), `frontend/src/types/fansub.ts` (`PublicFansubMediaItem`), and `frontend/src/types/groupContributors.ts` (`PublicReleaseMediaItem`) all now declare `display_url?: string | null`, matching each file's existing optionality convention.
- Verified via `grep -c "display_url"`: 4 occurrences in `openapi.yaml` (one per touched schema block) and 1 occurrence in each of the four touched frontend type files.
- No new HTTP route registered and no runtime code path touched -- pure contract/type-declaration surface, as required by the plan's threat model (T-173-11-01).

## Task Commits

Each task was committed atomically:

1. **Task 1: OpenAPI + frontend TypeScript type sync for the four 173-08 DTOs** - `5e616365` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `shared/contracts/openapi.yaml` - added `display_url: {type: string, nullable: true}` (inline form) to `ReleaseReviewImageContent`; added `display_url:`/`type: string`/`nullable: true` (multiline form) to `PublicFansubMediaItem`, `PublicReleaseMediaItem`, and `PublicReleaseImage`, in each case matching that specific block's existing style
- `frontend/src/types/releaseDetail.ts` - `PublicReleaseImage.display_url?: string | null` added next to `thumbnail_url`/`original_url`
- `frontend/src/types/releaseReviews.ts` - `ReleaseReviewImageContent.display_url?: string | null` added
- `frontend/src/types/fansub.ts` - `PublicFansubMediaItem.display_url?: string | null` added
- `frontend/src/types/groupContributors.ts` - `PublicReleaseMediaItem.display_url?: string | null` added (see Deviations -- this is the corrected file, not `groupAsset.ts`)

## Decisions Made
- Edited `frontend/src/types/groupContributors.ts` instead of the plan-listed `frontend/src/types/groupAsset.ts`, because `PublicReleaseMediaItem` is actually declared in `groupContributors.ts`. `groupAsset.ts` contains only an unrelated `GroupAssetMedia` interface with its own, differently-shaped `thumbnail_url` field and no `PublicReleaseMediaItem` at all. Confirmed via `grep -rn "PublicReleaseMediaItem" frontend/src/` before editing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected frontend file path for PublicReleaseMediaItem**
- **Found during:** Task 1 (frontend TypeScript sync)
- **Issue:** The plan's `files_modified` and `<files>` listed `frontend/src/types/groupAsset.ts` as the location of `PublicReleaseMediaItem`. That file exists but does not declare `PublicReleaseMediaItem` -- it only has an unrelated `GroupAssetMedia` type. The real declaration is in `frontend/src/types/groupContributors.ts` (confirmed by grep and by cross-referencing `MediaSection.tsx`'s import).
- **Fix:** Added `display_url?: string | null` to `PublicReleaseMediaItem` in `groupContributors.ts` instead of editing the non-matching `groupAsset.ts`.
- **Files modified:** `frontend/src/types/groupContributors.ts` (instead of `frontend/src/types/groupAsset.ts`)
- **Verification:** `grep -c "display_url" frontend/src/types/groupContributors.ts` returns 1; `grep -c "display_url" frontend/src/types/groupAsset.ts` returns 0 (expected, since that file has no matching interface).
- **Committed in:** `5e616365` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking file-path correction)
**Impact on plan:** No scope creep -- the plan's actual must_haves truth (display_url present next to thumbnail_url/original_url on all four named DTOs) is satisfied at the correct file; only the plan's own file-path reference was wrong.

## Issues Encountered
- `cd frontend && npx tsc --noEmit` on the host fails immediately with npx's "this is not the tsc command you are looking for" banner (no local `typescript` install in the host's node_modules). Ran `docker compose exec -T team4sv30-frontend npx tsc --noEmit` against the running frontend container instead. That run surfaces pre-existing, unrelated errors (`ReleaseDetailHero.test.tsx` missing a `previous` property on test fixtures, and a Next.js 16 `PageProps` constraint mismatch on a generated route type) that exist independently of this plan's changes -- confirmed by grep: none of the tsc errors mention `display_url` or any of the four files this plan touched. Out of scope per the executor's scope-boundary rule; not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `display_url` is now present end-to-end: Go DTOs (173-08) -> OpenAPI contract -> frontend TypeScript types (this plan). 173-13/173-14, which read `image.display_url` directly in TSX, can now proceed without a missing-type compile error.
- No regressions: `grep -c "display_url"` matches the plan's expected touch count (4 OpenAPI sites, 4 frontend sites), and the frontend container's `tsc --noEmit` shows zero new errors attributable to these changes.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*
