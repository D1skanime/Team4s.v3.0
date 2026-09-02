---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
plan: 05
subsystem: frontend-api
tags: [typescript, api-client, presentation, release-review, release-version-media]

# Dependency graph
requires: ["144-04"]
provides:
  - "replaceReleaseVersionMediaFile() in frontend/src/lib/api.ts — PUT .../media/:relationId/file client"
  - "RELEASE_REVIEW_REJECTION_CATEGORY_LABELS and releaseReviewResubmissionBadge() in frontend/src/app/admin/fansubs/releaseReviewPresentation.ts"
affects: [144-06, 144-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AuthorizedUploadXhrOptions.method?: 'POST' | 'PUT' closed-union field added to the shared upload-xhr plumbing (sendAuthorizedUploadXhrOnce), defaulting to 'POST' for zero behavior change on every existing caller — the only shared-plumbing edit in this plan"
    - "replaceReleaseVersionMediaFile mirrors uploadReleaseVersionMedia's exact structural shape (browser guard, endpoint via getApiBaseUrl(), authorizedUploadXhr call, FormData buildBody) rather than inventing a new upload-client pattern"
    - "Rejection-category label vocabulary centralized in releaseReviewPresentation.ts (mirroring the existing RELEASE_REVIEW_CATEGORY_LABELS/releaseReviewQueueStatus pattern) so Wave-5 plans import instead of duplicating"

key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/releaseReviewPresentation.ts

key-decisions:
  - "caption ?? '' is sent as an explicit empty string in replaceReleaseVersionMediaFile's FormData when options.caption !== undefined (multipart cannot express JSON null); presence of the field in the body is what signals 'clear/set the caption', matching the JSON PATCH path's captionSet semantics from 144-01/144-04."
  - "RELEASE_REVIEW_REJECTION_CATEGORY_LABELS is a verbatim copy of the 5 label strings currently local to ReleaseVersionMediaSection.tsx (lines 72-78) — that file is intentionally NOT touched by this plan; 144-06 (Wave 5) will import from here and remove the local copy."

requirements-completed:
  - "Zielbild 1 (144-CONTEXT.md): frontend API client for the new replace-file endpoint"
  - "Zielbild 3 (144-CONTEXT.md): shared presentation helper for the resubmission badge"

duration: ~15min
completed: 2026-09-02
---

# Phase 144 Plan 05: Frontend API Client and Shared Presentation Contracts Summary

**`replaceReleaseVersionMediaFile()` gives the frontend a typed PUT client for 144-04's new file-replace endpoint, and `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS`/`releaseReviewResubmissionBadge()` give both Wave-5 UI plans one shared source for the rejection-category vocabulary and the "Überarbeitet" badge — no UI changes in this plan.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-02 (immediately after 144-04)
- **Completed:** 2026-09-02
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments

- `AuthorizedUploadXhrOptions<T>` gained an optional `method?: 'POST' | 'PUT'` field; `sendAuthorizedUploadXhrOnce`'s `xhr.open("POST", ...)` call now reads `xhr.open(options.method ?? "POST", ...)` — the only change to the shared upload-xhr plumbing, verified to be a no-op for every existing caller (none of which set `method`).
- `replaceReleaseVersionMediaFile(options: ReplaceReleaseVersionMediaFileOptions): Promise<ReleaseVersionMediaItem>` added immediately after `patchReleaseVersionMediaItem` in `frontend/src/lib/api.ts`. It builds the endpoint as `.../admin/release-versions/{versionId}/media/{relationId}/file`, sends `method: 'PUT'`, and constructs a `FormData` from `file` plus optional `category`/`caption`/`isPreviewCandidate`/`sourceRevision` fields, each gated on `!== undefined` so unset fields are omitted from the request entirely (mirrors 144-04's backend contract).
- `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS: Record<ReleaseReviewRejectionCategory, string>` added to `releaseReviewPresentation.ts` with the exact 5 documented label strings, importing `ReleaseReviewRejectionCategory` from `@/types/releaseReviews`.
- `releaseReviewResubmissionBadge()` added alongside `releaseReviewQueueStatus`/`releaseReviewDetailStatus`, returning `{ label: 'Überarbeitet', variant: 'warning' as const }` per UI-SPEC's locked Copywriting Contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: replaceReleaseVersionMediaFile API client function** - `cd5b5063` (feat)
2. **Task 2: Shared rejection-category labels and resubmission badge helper** - `ae5522bc` (feat)

## Files Created/Modified

- `frontend/src/lib/api.ts` - `AuthorizedUploadXhrOptions.method` field; `sendAuthorizedUploadXhrOnce`'s `xhr.open` call; new `ReplaceReleaseVersionMediaFileOptions` interface and `replaceReleaseVersionMediaFile` function
- `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` - New `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS` export, new `releaseReviewResubmissionBadge` export, `ReleaseReviewRejectionCategory` added to the existing type-only import block

## Decisions Made

- No architectural deviations. Both tasks were implemented exactly as the plan's `<action>` blocks specified, since the plan's interfaces block already resolved every open question (exact function signatures, exact label text, exact badge shape).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `docker compose exec team4sv30-frontend npx tsc --noEmit` - clean, no errors, for the whole project (including both touched files).
- `docker compose exec team4sv30-frontend npx vitest run src/app/admin/fansubs/releaseReviews.test.tsx` - 16/16 tests passed, no regression to existing `releaseReviewPresentation.ts` consumers.
- `docker compose exec team4sv30-frontend npx eslint src/lib/api.ts src/app/admin/fansubs/releaseReviewPresentation.ts` - zero findings.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `replaceReleaseVersionMediaFile()` is available for 144-06 (submitter drawer) to call directly against 144-04's live `PUT .../media/:relationId/file` endpoint — no further API-client work needed.
- `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS` and `releaseReviewResubmissionBadge()` are available for both 144-06 and 144-07 to import — closes the risk of two independently-invented label maps for the same 5 rejection-category values.
- `ReleaseVersionMediaSection.tsx`'s local `REJECTION_CATEGORY_LABELS` const (lines 72-78) was deliberately left untouched per the plan's scope — 144-06 owns the import-and-remove-local-copy step.
- No blockers for Wave 5.

---
*Phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen*
*Completed: 2026-09-02*

## Self-Check: PASSED

Both claimed modified files found on disk with the expected new symbols; both claimed task commits (cd5b5063, ae5522bc) found in `git log --oneline --all`.
