---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
reviewed: 2026-09-02T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_release_version_media_category.go
  - backend/internal/handlers/admin_content_release_version_media_category_test.go
  - backend/internal/handlers/admin_content_release_version_media.go
  - backend/internal/handlers/admin_content_release_version_media_replace.go
  - backend/internal/handlers/admin_content_release_version_media_replace_test.go
  - backend/internal/handlers/admin_content_release_version_media_test.go
  - backend/internal/repository/release_review_query_repository.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/repository/release_review_query_scan_helpers.go
  - backend/internal/repository/release_version_media_replace_repository.go
  - backend/internal/repository/release_version_media_replace_repository_test.go
  - backend/internal/repository/release_version_media_repository.go
  - backend/internal/repository/release_version_media_repository_test.go
  - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaReplaceControls.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
  - frontend/src/app/admin/fansubs/releaseReviewPresentation.ts
  - frontend/src/lib/api.ts
  - frontend/src/types/releaseReviews.ts
  - frontend/src/types/releaseVersionMedia.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 144: Code Review Report

**Reviewed:** 2026-09-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

This is a re-review after the 144-08 gap-closure plan. I verified all three items that plan
claimed to fix, and did a full adversarial pass over every file in scope (not just the diff).

**Verified fixed, no regressions found:**
- **VERIFICATION.md's blocking gap** (preview-guard bypass on an omitted `is_preview_candidate`
  field): `rvmPreviewGuardBlocked` in `admin_content_release_version_media_category.go` now
  falls back to the row's real current `is_preview_candidate` (via
  `ReleaseVersionMediaRelationMeta.IsPreviewCandidate`, newly populated by
  `GetReleaseVersionMediaRelation`'s SELECT) whenever the request omits the field, while an
  explicit request value always still wins. Both `PatchReleaseVersionMedia` and
  `ReplaceReleaseVersionMediaFile` call the same shared function. The table-driven unit test
  (`admin_content_release_version_media_category_test.go`) and the real-Postgres repository
  test (`TestGetReleaseVersionMediaRelationReturnsCurrentPreviewCandidate`) both cover the exact
  scenario from the prior VERIFICATION.md gap, plus the "explicit value always wins" and
  "already-inconsistent row" edge cases.
- **WR-01 (Sprachqualität)**: all five `"gross"`/`"geprueft"` ASCII substitutions in
  `admin_content_release_version_media.go` and `admin_content_release_version_media_replace.go`
  are now `"groß"`/`"geprüft"`.
- **WR-03 (dead code)**: `GetRVMCategory` and its compile-only existence-check test line are
  both removed; `ReleaseVersionMediaRelationMeta`/`GetReleaseVersionMediaRelation` now carry the
  category lookup instead, and are the only source used by both PATCH and PUT-replace.

**Still open, correctly left out of scope for this gap-closure round** (per this run's
instructions): CR-01 (`useReleaseVersionMedia.ts`'s `runUpload` still swallows every upload
failure instead of rejecting, so `ReleaseVersionMediaSection.tsx`'s `handleUploadClick` catch
branch is still dead code) and the old WR-02 (several tests still assert on handler source-file
substrings instead of exercising the code). Both are unchanged from the prior review and are
restated below for completeness, since this file replaces the prior REVIEW.md.

**New findings from this pass** (see Warnings/Info): the fix that closes the preview-guard gap
reads the row's current `is_preview_candidate`/`category` *before* the transaction starts and
without a row lock, leaving a narrow TOCTOU window where a concurrent PATCH/replace on the same
relation can still reach the DB's `chk_rvm_preview_category` CHECK constraint and surface a 500
instead of the intended 422; and `shared/contracts/openapi.yaml`'s PATCH
`.../media/{relationId}` operation — the exact endpoint this phase extended to trigger
`SOURCE_REVISION_CONFLICT` (409) and `INVALID_CATEGORY`/`PREVIEW_NOT_ALLOWED_FOR_CATEGORY`/
`SOURCE_ATTRIBUTION_INVALID` (422) — still only documents 400/401/403/404/500.

## Critical Issues

### CR-01: Upload failures are reported as success and hidden from the admin (carried forward, unfixed, explicitly deferred)

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:117-247` (the `catch` block at lines 228-244)
**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:288-307`

**Issue:** `runUpload` (used by both `startUpload` and `retryUpload`) wraps the whole
upload/patch sequence in `try { ... } catch (uploadError) { setError(message); setUploadItems(...) }`
and — unlike every sibling mutator in the same file (`patchItem`, `replaceItem`, `deleteItem`,
`reorderItems` all `throw` in their `catch` blocks) — never re-throws. The promise returned by
`startUpload`/`retryUpload` therefore always resolves, even when:
- `uploadReleaseVersionMedia(...)` itself throws (network error, 5xx, malformed response), or
- every file in the batch comes back with `status: 'failed'` in the (HTTP 200) response body
  — the backend deliberately returns 200 with per-file failure entries rather than a non-2xx
  status (`UploadReleaseVersionMedia` always calls `c.JSON(http.StatusOK, ...)`), or
- `patchUploadedItem` (the metadata patch issued after each successfully-stored file) fails.

`ReleaseVersionMediaSection.tsx`'s `handleUploadClick` awaits `media.startUpload(...)` and, on
resolve, unconditionally clears `selectedFiles`, closes the upload drawer, and shows a green
"Upload abgeschlossen." toast — its `catch` branch is structurally unreachable for any of the
three failure modes above. `openUploadSheet()` → `resetUploadDraft()` → `media.clearUploadQueue()`
then wipes the failed-item queue (with its per-file `errorMessage`/retry button) the next time
the drawer opens, so a failed upload is invisible and unrecoverable without re-selecting files
from scratch. This directly contradicts the project's own "operational errors must be visible
immediately in the UI" constraint and undermines the exact re-submission workflow this phase
implements. No test in `ReleaseVersionMediaSection.test.tsx` exercises a failing
`startUpload`/`uploadReleaseVersionMedia` call (the mock always resolves), so the regression is
untested.

**Fix:** Make `runUpload`'s catch block re-throw (matching `patchItem`/`replaceItem`/
`deleteItem`/`reorderItems`), and have `handleUploadClick` additionally check that every queued
item ended in `status === 'ready'` before showing the success toast / closing the drawer — a
resolved promise alone is not sufficient given the backend's always-200 partial-failure
contract.

## Warnings

### WR-01: TOCTOU race in the just-fixed preview-category guard can still surface a raw 500 instead of 422

**File:** `backend/internal/handlers/admin_content_release_version_media.go:821, 885, 900`
**File:** `backend/internal/handlers/admin_content_release_version_media_replace.go:95, 172, 296`

**Issue:** The 144-08 fix correctly closes the VERIFICATION.md gap by reading the row's
*current* `is_preview_candidate`/`category` via `GetReleaseVersionMediaRelation` and feeding
them into `rvmPreviewGuardBlocked`. However, in both `PatchReleaseVersionMedia` and
`ReplaceReleaseVersionMediaFile`, that read happens **before** `h.mediaRepo.BeginTx(...)` is
called and with a plain `SELECT` (no `FOR UPDATE`) — the guard decision is made entirely outside
the transaction that later performs the actual `UPDATE`. If a second admin request
concurrently flips `is_preview_candidate` to `true` on the same relation (via its own PATCH)
between this handler's read and its own transaction's write, this request's guard evaluates
against stale data, sees no conflict, and its later `UPDATE ... SET category = ...` inside the
transaction can violate the DB's `chk_rvm_preview_category` CHECK constraint
(`database/migrations/0059_release_version_media_schema.up.sql:21`). The constraint prevents
data corruption, but the admin sees a generic `writeInternalErrorResponse` 500
("Patch fehlgeschlagen." / "media asset..." etc.) instead of the documented, actionable 422
`PREVIEW_NOT_ALLOWED_FOR_CATEGORY` — i.e. under concurrent edits, the exact class of bug this
phase's gap-closure round set out to eliminate (a confusing 500 instead of a clean 422) can
still occur, just through a narrower window than the original gap.

**Fix:** Move the `GetReleaseVersionMediaRelation` read inside the transaction and take a row
lock before evaluating `rvmPreviewGuardBlocked`, mirroring the `SELECT ... FOR UPDATE` pattern
`ReplaceReleaseVersionMediaFile` (the repository method) already uses for the
`media_asset_id` swap in `release_version_media_replace_repository.go:42-48`. Alternatively,
re-check the guard against a fresh, transaction-scoped read immediately before the `UPDATE`.

### WR-02: `openapi.yaml`'s PATCH `.../media/{relationId}` operation is missing the 409/422 responses this phase makes routine

**File:** `shared/contracts/openapi.yaml:6690-6754`

**Issue:** `PatchReleaseVersionMedia` (the handler backing this exact operation) returns:
- `422 INVALID_CATEGORY` (new in this phase — category changes were previously hard-blocked),
- `422 PREVIEW_NOT_ALLOWED_FOR_CATEGORY`,
- `400 INVALID_SOURCE_REVISION`,
- `409 SOURCE_REVISION_CONFLICT` (from `SubmitMedia`'s `ErrConflict`),
- `422 SOURCE_ATTRIBUTION_INVALID` (from `SubmitMedia`'s `ErrNotFound`/`ErrValidation`),

but the OpenAPI operation only documents `200/400/401/403/404/500`. This gap predates 144 (the
`SubmitMedia` 409/422 paths existed before), but this phase is the one that made `422
INVALID_CATEGORY` reachable on this endpoint for the first time (previously PATCH hard-blocked
category changes), and it is the same phase that correctly documented all of these response
codes on the sibling PUT `.../media/{relationId}/file` endpoint it added
(`shared/contracts/openapi.yaml:6866-6914`) — so the PATCH endpoint's contract is now visibly
inconsistent with its own newly-added sibling for materially the same failure modes.

**Fix:** Add `409` (`SOURCE_REVISION_CONFLICT`) and `422` (`INVALID_CATEGORY` /
`PREVIEW_NOT_ALLOWED_FOR_CATEGORY` / `SOURCE_ATTRIBUTION_INVALID`) response entries to the PATCH
operation, matching the pattern already used for the PUT `.../file` operation.

### WR-03: Several tests assert on handler source-text substrings instead of exercising the logic (carried forward, unfixed, out of scope for this round)

**File:** `backend/internal/handlers/admin_content_release_version_media_replace_test.go:22-42` (`TestReplaceReleaseVersionMediaFileRequiresUpdatePermission`)
**File:** `backend/internal/handlers/admin_content_release_version_media_test.go:279-310, 587-605, 312-351, 424-446` (e.g. `TestReleaseVersionMedia_InvalidCategoryRejectsUpload`, `TestReleaseVersionMedia_UploadMissingCategoryError`, `TestPatchReleaseVersionMediaAllowsCategoryChange`)

**Issue:** Unchanged from the prior review. These tests `os.ReadFile` the handler's own `.go`
source and `strings.Contains` for expected identifiers/error codes rather than calling the code
under test, so they prove the string exists somewhere in the file (including in a comment), not
that the described guard actually fires at the described point with the described response
shape. This materially weakens confidence in exactly the invariants this phase's own context
docs call out as important ("category changes unblocked but PREVIEW_NOT_ALLOWED_FOR_CATEGORY
still enforced", "file-replace reuses the update permission, no new parallel action").

**Fix:** Where feasible, replace source-substring assertions with `httptest`-driven calls
against a stubbed/faked `mediaRepo` so the actual branch is exercised and the response
body/status is asserted directly, as `TestReplaceReleaseVersionMediaFileRejectsNoAuth` and the
real-Postgres repository tests already do elsewhere in this same phase.

## Info

### IN-01: Caption-equality check in `hasStagedChanges` does not treat `""` and `null` as equal (carried forward, unfixed)

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:177-179`

**Issue:** `hasStagedChanges` compares `(editCaption.trim() || null) !== (selectedItem.caption ?? null)`.
`selectedItem.caption ?? null` only normalizes `undefined`/`null`, not an empty string — so a
`ReleaseVersionMediaItem` that ever arrives with `caption: ""` (rather than `null`) would report
`hasStagedChanges === true` on drawer open with no edits, spuriously enabling "Überarbeitung
einreichen" for a `rejected` item. Today's save paths always persist `caption: null` when
cleared, so this is currently unreachable through this UI, but remains a latent trap for any
other caller/import path.

**Fix:** Normalize both sides through the same helper, e.g. `(selectedItem.caption?.trim() || null)`.

### IN-02: `is_preview_candidate` on PATCH silently ignores a wrongly-typed value instead of rejecting it

**File:** `backend/internal/handlers/admin_content_release_version_media.go:864-869`

**Issue:**
```go
var isPreviewCandidate *bool
if v, ok := rawBody["is_preview_candidate"]; ok {
    if b, ok := v.(bool); ok {
        isPreviewCandidate = &b
    }
}
```
Unlike `caption` (`parseOptionalCaptionField` returns an explicit 400 for a non-string/non-null
value) and `category` (`parseRVMCategoryPatchField` returns `Invalid: true` → 422 for a
non-string or unknown value), a client that sends `"is_preview_candidate": "true"` (string) or
`1` (number) instead of a JSON boolean gets no error at all — the field is silently treated as
absent, and the request proceeds as if `is_preview_candidate` were never mentioned. Pre-existing
(phase 35), not introduced by 144, but inconsistent with the validation rigor applied to the two
sibling fields this exact phase touched.

**Fix:** Mirror the caption/category pattern: if the key is present but not a JSON boolean,
return `400`/`422` explicitly instead of silently dropping the field.

### IN-03: Duplicate/wasted contributor-group query for platform-admin uploads

**File:** `backend/internal/handlers/admin_content_release_version_media.go:219-256`

**Issue:** `UploadReleaseVersionMedia` calls
`h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(ctx, versionID, identity.UserID)`
into `actorGroups` (line 224). For a platform-admin actor, `allowedGroups` is then immediately
overwritten with `participatingGroups` instead (line 231), so `actorGroups` is computed but
never read on that path — and the handler then issues the *exact same* query again a few lines
later into `memberGroups` (lines 242-244) to check `SOURCE_ATTRIBUTION_REQUIRED`. Every
platform-admin upload therefore runs this query twice for no functional reason. Not introduced
by this phase, but present in a file this phase materially extended.

**Fix:** Reuse the first call's result for the platform-admin `SOURCE_ATTRIBUTION_REQUIRED`
check instead of issuing an identical second query, or restructure so the query only runs once
regardless of actor type.

### IN-04: Redundant duplicate `ApiError`/generic-object 409 check in the review decision handler

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:165-186`

**Issue:** `submitDecision`'s `catch` block checks `error instanceof ApiError && error.status ===
409 && error.code === 'REVIEW_ALREADY_DECIDED'` and then, immediately after (unreachable if the
first branch already matched and returned), re-checks the same condition via a manual
`typeof error === 'object' ...` structural check on the same `error` value. Since the mocked
`ApiError` class used in `page.test.tsx` (and the real one in `lib/api.ts`) is a proper `Error`
subclass, the second branch is dead code reachable only if some non-`ApiError`-instance object
with the same shape were ever thrown (e.g. across a bundling/realm boundary) — a narrow,
speculative case that adds duplicated logic without a corresponding test for when the second
branch alone would fire.

**Fix:** Either remove the redundant structural check (relying on `instanceof ApiError`, which
is what every other call site in this codebase does), or, if the second branch exists to guard
against a specific known realm/duplication issue, add a short comment and a dedicated test
proving the second branch is reachable and correct.

---

_Reviewed: 2026-09-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
