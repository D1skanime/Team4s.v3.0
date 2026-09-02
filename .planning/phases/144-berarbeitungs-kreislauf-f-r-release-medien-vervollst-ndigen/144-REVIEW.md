---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
reviewed: 2026-09-02T15:25:37Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_release_version_media_category.go
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
  info: 1
  total: 5
status: issues_found
---

# Phase 144: Code Review Report

**Reviewed:** 2026-09-02T15:25:37Z
**Depth:** standard
**Files Reviewed:** 26 (28 listed; `shared/contracts/openapi.yaml` and one test file overlap in coverage notes below)
**Status:** issues_found

## Summary

Phase 144 adds a "file replace" endpoint for rejected release-version media
(`PUT .../media/:relationId/file`), unblocks category changes on the existing PATCH
endpoint, and surfaces prior-rejection context in the review UI. The backend work
(`release_version_media_replace_repository.go`, `admin_content_release_version_media_replace.go`,
the category-patch helper, and the review-query prior-rejection JOIN) is careful:
transactions are used correctly, the file-replace flow never overwrites the old asset in
place, cleanup is enqueued idempotently, and the permission/ownership gate is reused
verbatim rather than duplicated. The SQL and Go repository tests are thorough and use
real Postgres fixtures for the tricky self-exclusion / lifecycle-revision logic.

The most serious problem is on the frontend: `useReleaseVersionMedia.ts`'s `runUpload`
swallows every upload error internally instead of rejecting the promise it returns, which
makes `ReleaseVersionMediaSection.tsx`'s `handleUploadClick` structurally incapable of ever
reaching its `catch` block. A hard upload failure (network error, 500, or every file in
the batch failing validation) still shows a "Upload abgeschlossen." success toast, clears
the selected files, and closes the upload drawer — actively hiding failures from the admin
in a phase whose whole purpose is giving admins a trustworthy revision/re-submission loop.
There are also a few smaller issues: a repeated German-language rule violation ("groß" spelled
"gross") in two of the phase's own user-facing backend strings, dead repository code, and a
recurring "test asserts a string exists in the source file" pattern that does not actually
exercise the logic it claims to verify.

## Critical Issues

### CR-01: Upload failures are reported as success and hidden from the admin

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:117-247` (see especially the `catch` block at lines 228-244)
**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:288-307`

**Issue:**
`runUpload` (used by both `startUpload` and `retryUpload`) wraps the whole upload/patch
sequence in `try { ... } catch (uploadError) { setError(message); setUploadItems(...); }`
and, unlike every sibling method in the same file (`patchItem`, `replaceItem`,
`deleteItem`, `reorderItems` all `throw` in their `catch` blocks), it never re-throws.
That means the promise returned by `startUpload` **always resolves**, even when:

- `uploadReleaseVersionMedia(...)` itself throws (network error, 5xx, malformed
  response), or
- every file in the batch comes back with `status: 'failed'` in the (HTTP 200) response
  body — which the backend deliberately returns instead of a non-2xx status for
  per-file failures (`admin_content_release_version_media.go`'s
  `UploadReleaseVersionMedia` always calls `c.JSON(http.StatusOK, ...)`), or
- `patchUploadedItem` (metadata patch after each successful file) fails.

`ReleaseVersionMediaSection.tsx`'s `handleUploadClick` is:

```js
try {
  await media.startUpload(selectedCategory, selectedFiles, defaultCaption, ...)
  setSelectedFiles([])
  setDefaultCaption('')
  setIsPreviewCandidate(false)
  setIsUploadOpen(false)
  showToast('Upload abgeschlossen.')
} catch (error) {
  setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.')
}
```

Because the awaited promise can never reject, the `catch` branch (and the `uploadError`
banner it would populate) is dead code. On any failure mode the admin instead sees a
green "Upload abgeschlossen." toast, the drawer closes immediately, and
`selectedFiles`/`defaultCaption` are cleared. If the admin reopens the upload drawer,
`openUploadSheet()` calls `resetUploadDraft()` → `media.clearUploadQueue()`, which wipes
the failed-item queue (and its per-file `errorMessage`/retry button) before it was ever
shown, so there is no way to discover which file failed or retry it — the admin has to
guess and re-select files from scratch.

For a fully failed batch, `media.error` *is* set (so the top-level "API-Fehler: ..."
banner appears), but it renders **simultaneously with** the "Upload abgeschlossen." toast
and the already-closed drawer — a directly contradictory UI state. For a *partial*
failure (some files ready, some failed — the common case this phase's partial-failure
result shape exists to support), `media.error` is never set at all (the try block never
throws), so there is no banner either: the admin gets a pure false-positive success signal
and silently loses the failed files.

This directly violates the project's own constraint ("Observability: ... operational
errors must be visible immediately in the UI") and undermines the very re-submission
workflow this phase implements (an admin who thinks an upload "abgeschlossen" happened
will not know to re-check or retry the file that actually failed the review-worthy
content). No test in `ReleaseVersionMediaSection.test.tsx` exercises a failing
`startUpload`/`uploadReleaseVersionMedia` call — the existing upload test only mocks
`startUpload` to always resolve, so this regression is untested.

**Fix:** Make `runUpload` reject on failure (or at minimum on the "no results were
`ready`" / thrown-exception case), matching the pattern already used by `patchItem`,
`replaceItem`, `deleteItem`, and `reorderItems`:

```js
} catch (uploadError) {
  const message = readUploadError(uploadError, 'Upload fehlgeschlagen.')
  setError(message)
  setUploadItems((current) => current.map((item, index) =>
    queueIndices.includes(index)
      ? { ...item, status: 'failed', progress: item.progress, errorMessage: message, resultId: null }
      : item,
  ))
  throw uploadError
}
```

and additionally have `handleUploadClick` inspect the per-file results (not just whether
the promise resolved) before showing the success toast / closing the drawer, e.g. only
close+toast when every queued item ended in `status === 'ready'`, otherwise keep the
drawer open so the existing `uploadSummaryVisible`/retry UI can do its job.

## Warnings

### WR-01: "ß" is spelled "ss" ("gross") in newly-reused user-facing backend strings, violating the project's Sprachqualität rule

**File:** `backend/internal/handlers/admin_content_release_version_media.go:336, 359, 193`
**File:** `backend/internal/handlers/admin_content_release_version_media_replace.go:198, 224`

**Issue:** CLAUDE.md's Sprachqualität section explicitly forbids ASCII substitutions for
umlauts/ß (`ae/oe/ue/Ae/Oe/Ue/ss`) in user-facing strings, explicitly including
"Go-Response-Strings". Both `FILE_TOO_LARGE` and `IMAGE_DIMENSIONS_TOO_LARGE` messages use
`"datei zu gross: max %d MB"` / `"bild zu gross: max %dx%d px"` (should be "groß"), and
`admin_content_release_version_media.go:193` uses `"...konnte nicht geprueft werden."`
(should be "geprüft"). `admin_content_release_version_media_replace.go` is a brand-new
file added by this phase, and its own file header states the intake-guard sequence was
"reused verbatim" from `processOneRVMFile` (T-144-04-02) — which means this phase copied
the rule violation forward into new code rather than fixing it.

**Fix:** Replace `"gross"` with `"groß"` and `"geprueft"` with `"geprüft"` in both files
(all five call sites above); consider a small `go vet`/lint rule or grep-based check for
`ae|oe|ue|ss` inside `gin.H{"message": ...}` literals to catch regressions.

### WR-02: New/duplicated tests assert on source-text substrings instead of executing the handler logic they claim to verify

**File:** `backend/internal/handlers/admin_content_release_version_media_replace_test.go:22-42` (`TestReplaceReleaseVersionMediaFileRequiresUpdatePermission`)
**File:** `backend/internal/handlers/admin_content_release_version_media_test.go:279-310, 587-605, 312-351, 424-446` (e.g. `TestReleaseVersionMedia_InvalidCategoryRejectsUpload`, `TestReleaseVersionMedia_UploadMissingCategoryError`, `TestPatchReleaseVersionMediaAllowsCategoryChange`)

**Issue:** Several of the tests this phase added (and several pre-existing ones the phase
extends) do not call the code under test at all — they `os.ReadFile` the handler's own
`.go` source and `strings.Contains` for expected identifiers/error codes
(`TestReleaseVersionMedia_InvalidCategoryRejectsUpload` even says so explicitly in its own
comment: "With nil mediaRepo, handler returns 500 before category check. ... We test
category validation via the structural code inspection instead."). This style proves the
string exists somewhere in the file, not that the validation actually fires on the
described input, at the described point in the handler, with the described response
shape. A regression that moves the check, inverts the condition, or changes when it fires
relative to other guards would not be caught by these tests as long as the substring
remains present anywhere in the file (including in a comment). This materially weakens
confidence in the "PREVIEW_NOT_ALLOWED_FOR_CATEGORY still enforced after unblocking
category changes" and "no new parallel permission action" claims these specific tests are
supposed to protect, both called out as important invariants in this phase's own context
docs.

**Fix:** Where feasible, replace source-substring assertions with `httptest`-driven calls
against a stubbed/faked `mediaRepo` (a lightweight interface fake, not a real DB) so the
actual branch is exercised and the response body/status is asserted directly, the way
`TestReplaceReleaseVersionMediaFileRejectsNoAuth` and the repository-level Postgres tests
already do elsewhere in this same phase.

### WR-03: `GetRVMCategory` is dead code

**File:** `backend/internal/repository/release_version_media_repository.go:492-508`

**Issue:** `MediaRepository.GetRVMCategory` is defined ("Used by the PATCH handler to
enforce preview category rules") but neither `PatchReleaseVersionMedia` nor
`ReplaceReleaseVersionMediaFile` call it — both instead read `Category` off the result of
`GetReleaseVersionMediaRelation`, which already returns it. The only remaining reference
is a compile-time existence check in `release_version_media_repository_test.go:96`
(`_ = repo.GetRVMCategory // must exist`), which will keep this dead method alive
indefinitely without ever exercising it.

**Fix:** Remove `GetRVMCategory` and its existence-check test line, or if it is intended
as a public repository API for a future caller, document that explicitly instead of
attributing it to the (no-longer-true) PATCH handler usage.

## Info

### IN-01: Caption-equality check in `hasStagedChanges` does not treat `""` and `null` as equal

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:177-179`

**Issue:** `hasStagedChanges` compares `(editCaption.trim() || null) !== (selectedItem.caption ?? null)`.
`selectedItem.caption ?? null` only normalizes `undefined`/`null`, not an empty string —
so if a `ReleaseVersionMediaItem` ever arrives with `caption: ""` (rather than `null`),
opening the edit drawer without touching anything reports `hasStagedChanges === true`
(comparing `null` to `""`). For a `rejected` item this spuriously enables the "Überarbeitung
einreichen" button before any real edit was made. Today's own save paths always send
`caption: null` rather than `""` when clearing (see `buildSelectedItemSavePayload`'s
`trimmedCaption`), so this is currently unreachable through this UI, but it is a latent
trap for any other caller/import path that persists an empty-string caption.

**Fix:** Normalize both sides through the same `|| null` helper, e.g.
`(selectedItem.caption?.trim() || null)`.

---

_Reviewed: 2026-09-02T15:25:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
