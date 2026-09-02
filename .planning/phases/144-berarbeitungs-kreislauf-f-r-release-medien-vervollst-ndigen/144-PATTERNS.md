# Phase 144: Überarbeitungs-Kreislauf für Release-Medien - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 15
**Analogs found:** 15 / 15 (all self-analog or same-package sibling; no research spawn was used — CONTEXT.md/VALIDATION.md already named exact files/functions)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/admin_content_release_version_media_replace.go` (NEW) | handler/controller | file-I/O + request-response | `UploadReleaseVersionMedia`/`processOneRVMFile` in `admin_content_release_version_media.go:164-530` (multipart + storage write) and `PatchReleaseVersionMedia` in the same file (`:789-978`, permission + lifecycle-submit shape) | exact (same package, sibling handler, explicitly required to be a new file by the 450-line cap) |
| `backend/internal/repository/release_version_media_replace_repository.go` (NEW) | repository | CRUD + event-driven (enqueues cleanup job) | `PatchReleaseVersionMedia`/`CreateReleaseVersionMediaAsset` in `release_version_media_repository.go:104-333` + the delete-job enqueue INSERT in `release_review_cleanup_repository.go:175-190` | exact |
| `backend/internal/handlers/admin_content_release_version_media.go` (MODIFY: remove category hard-block ~line 854) | handler/controller | request-response | self (same file, `PatchReleaseVersionMedia`) | exact |
| `backend/internal/repository/release_version_media_repository.go` (MODIFY: `ReleaseVersionMediaPatchInput` + `PatchReleaseVersionMedia` SQL to accept category) | repository | CRUD | self (same file) | exact |
| `backend/cmd/server/admin_routes.go` (MODIFY: register new replace-file route) | route registration | request-response | self (same file, lines 160-169) | exact |
| `shared/contracts/openapi.yaml` (MODIFY: new path + schema additions) | config/contract | request-response | self (existing `POST .../media` multipart path `:6559-6631`, existing `ReleaseVersionMediaPatchRequest` schema `:13912-13935`) | exact |
| `frontend/src/types/releaseVersionMedia.ts` (MODIFY: category on patch request, replace response type, prior-rejection fields) | types | — | self (same file) | exact |
| `frontend/src/lib/api.ts` (MODIFY: add `replaceReleaseVersionMediaFile`) | service (API client) | file-I/O + request-response | self (`uploadReleaseVersionMedia`, `:7426-7450`, uses `authorizedUploadXhr`) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` (MODIFY: add replace action) | hook | request-response | self (`patchItem`/`startUpload` in same file) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (MODIFY: file-replace control + category field in edit drawer) | component | request-response | self (existing upload drop-zone + edit drawer in same file, `:459-668`) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` (MODIFY: possibly a "hasStagedChanges" helper) | utility | — | self (same file) | exact |
| `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` (MODIFY: resubmission badge + context line) | component | request-response | self (existing `Badge`/status usage, `:229, 249, 261-263`) | exact |
| `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` (MODIFY: add resubmission-badge helper) | utility (presentation) | — | self (`releaseReviewQueueStatus`/`releaseReviewDetailStatus`, `:56-74`) | exact |
| `frontend/src/types/releaseReviews.ts` (MODIFY: prior-rejection fields on `ReleaseReviewDetail`) | types | — | self (same file) | exact |
| `backend/internal/handlers/admin_content_release_version_media_test.go` / `backend/internal/repository/release_version_media_repository_test.go` (or a new sibling `*_replace_test.go`) | test | — | self (existing 715/364-line test files in same package) | exact |

**Do-not-touch (cross-cutting constraint, not a file to modify):** `backend/internal/services/release_review_adapters.go` (`creditReleaseReviewContribution`, lines ~126 and ~228) — the replace path must call `SubmitMedia` the same way `PatchReleaseVersionMedia` and `processOneRVMFile` already do, and must NOT route through the confirm-decision path. This is the single highest-risk mistake per VALIDATION.md.

---

## Pattern Assignments

### `backend/internal/handlers/admin_content_release_version_media_replace.go` (NEW handler, file-I/O)

**Analogs:** `UploadReleaseVersionMedia`/`processOneRVMFile` (multipart + storage) and `PatchReleaseVersionMedia` (permission + lifecycle-submit) — both in `backend/internal/handlers/admin_content_release_version_media.go`.

**Imports pattern** (from the existing file, `:1-30` — reuse verbatim, same package):
```go
package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
)
```
Note: since this is a NEW file in the same `handlers` package, only import what the new file actually uses — the shared constants (`rvmMaxFileSizeBytes`, `rvmAllowedMIMETypes`, `rvmValidCategories`, `rvmPreviewAllowedCategories`, helper funcs like `inspectRVMImage`, `generateRVMThumbnail`, `imageExtFromMimeRVM`, `removeFileQuietly`) are already package-level in `admin_content_release_version_media.go` and can be called directly without re-declaring them.

**Auth/permission pattern to copy** (`admin_content_release_version_media.go:810-847`, `PatchReleaseVersionMedia`):
```go
result, err := h.permissionSvc.CanForReleaseVersionMedia(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, relationID)
if err != nil {
	writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
	return
}
if !result.Allowed {
	auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaUpdate, result)
	writePermissionDenied(c, result)
	return
}
// ... load relationMeta, verify relationMeta.ReleaseVersionID == versionID ...
canMutate, err := h.canMutateReleaseVersionMediaRelation(
	c, actor, relationID, relationMeta.UploadedByUserID, identity.UserID,
	permissions.ActionReleaseVersionMediaUpdate, result,
)
if err != nil {
	writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
	return
}
if !canMutate {
	ownerResult := releaseVersionMediaOwnerMismatchResult()
	auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaUpdate, ownerResult)
	writePermissionDenied(c, ownerResult)
	return
}
```
This is VALIDATION.md's answer to "Wer darf ersetzen?" — reuse `ActionReleaseVersionMediaUpdate` + `canMutateReleaseVersionMediaRelation` exactly as PATCH does. Do not add a new `permissions.Action*`.

**Multipart file intake + storage-write pattern to copy** (`processOneRVMFile`, `:309-530`): read `fileHeader.Open()` → `io.LimitReader` size guard → `mimetype.Detect` → `rvmAllowedMIMETypes` check → `inspectRVMImage` dimension/GIF-frame/decompression-bomb guards → `generateRVMThumbnail` → write `original.<ext>` + `thumb.jpg` under a **new** `assetUUID` directory (`filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)`) so the replacement gets its own storage path rather than overwriting the old file in place — this is what makes "enqueue old file for cleanup, don't overwrite live path" possible. Reuse the exact size/MIME/dimension/GIF/pixel-count guard block verbatim (`:328-372`).

**Lifecycle-submit pattern to copy exactly** (`processOneRVMFile:484-497`, identical to `PatchReleaseVersionMedia:925-950`):
```go
lifecycle, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
	ctx,
	repository.ReleaseReviewSubmissionInput{
		SourceID:       relationID,       // the SAME relation id — id must not change
		ActorAppUserID: actorAppUserID,
		ExpectedRevision: expectedRevision, // optional, from request body source_revision
		LastActivityAt: time.Now().UTC(),
	},
)
```
`SubmitMedia` (see repository section below) already does the revision-bump + `review_state = 'pending'` reset — call this, do not reimplement it.

**Transaction pattern:** `h.mediaRepo.BeginTx(ctx)` → `defer tx.Rollback(ctx)` → do the DB writes (new `media_files`/`media_assets` for the new file, update `release_version_media.media_asset_id`, call `SubmitMedia`) → enqueue delete job for the OLD `media_asset_id`/`media_file_id` (new repository method, see below) → `tx.Commit(ctx)`. Mirror `PatchReleaseVersionMedia`'s tx shape (`:904-954`), not `processOneRVMFile`'s per-file isolated-tx shape (that one swallows errors into a result array; a single-file replace endpoint should return real HTTP errors like `PatchReleaseVersionMedia` does).

**Error handling / response shape to copy** (`PatchReleaseVersionMedia:933-950`):
```go
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message":    "Das Medium wurde zwischenzeitlich geändert.",
		"error_code": "SOURCE_REVISION_CONFLICT",
	}})
	return
}
```
Reuse this `error_code` vocabulary — UI-SPEC's stale-revision-conflict copy maps to this exact `SOURCE_REVISION_CONFLICT` code.

**Response payload:** load the updated item via `h.loadReleaseVersionMediaResponseItem(c, actor, identity.UserID, versionID, relationID)` (`:755-786`, already public on `AdminContentHandler`) — reuse as-is, don't build a second response shape.

---

### `backend/internal/repository/release_version_media_replace_repository.go` (NEW repository, CRUD + event-driven)

**Analog 1 — file-swap SQL shape:** `PatchReleaseVersionMedia` (`release_version_media_repository.go:311-333`):
```go
func (r *MediaRepository) PatchReleaseVersionMedia(
	ctx context.Context,
	tx pgx.Tx,
	relationID int64,
	input ReleaseVersionMediaPatchInput,
) error {
	tag, err := tx.Exec(ctx, `
		UPDATE release_version_media
		SET
			caption              = CASE WHEN $2 THEN $3 ELSE caption END,
			is_preview_candidate = COALESCE($4, is_preview_candidate),
			updated_at           = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
	`, relationID, input.CaptionSet, input.Caption, input.IsPreviewCandidate)
	if err != nil {
		return fmt.Errorf("patch release_version_media %d: %w", relationID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```
The new replace method follows the same shape but additionally sets `media_asset_id = $newAssetID` (the row's `id` stays the same — this is Zielbild 1's non-negotiable invariant).

**Analog 2 — old-file cleanup-job enqueue, copy this exact INSERT** (`release_review_cleanup_repository.go:175-190`, from `scrubExpiredReleaseReviewMedia`):
```go
if _, err := tx.Exec(ctx, `
	INSERT INTO release_review_file_delete_jobs (
		release_version_media_id,
		media_asset_id,
		media_file_id,
		job_state,
		created_at,
		updated_at
	)
	SELECT $1, $2, media_file.id, 'pending', $3, $3
	FROM media_files media_file
	WHERE media_file.media_id = $2
	ON CONFLICT (media_file_id) DO NOTHING
`, source.SourceID, source.MediaAssetID, tombstonedAt); err != nil {
	return fmt.Errorf("enqueue release review media files %d: %w", source.SourceID, err)
}
```
This resolves CONTEXT.md's open question "Alte Datei behalten oder verwerfen?" — the outbox table (`release_review_file_delete_jobs`, `database/migrations/0135_release_review_lifecycle.up.sql:124-161`) and its worker (`backend/internal/services/release_review_cleanup.go`, `ClaimNextFileDeleteJob`/`CompleteFileDeleteJob`/`FailFileDeleteJob`) already exist and are exercised by `internal/services/release_review_cleanup_test.go`. The replace path should enqueue the **old** `media_asset_id`/`media_file_id` into this same table (`ON CONFLICT (media_file_id) DO NOTHING` already makes double-replace safe) rather than inventing a second cleanup mechanism.

**Analog 3 — `SubmitMedia`, the exact revision-bump + pending-reset to mirror** (`release_review_lifecycle_repository.go:119-170` and `:312-351`, `updateLifecycle`):
```go
// updateLifecycle (release_review_lifecycle_repository.go:312-351) — this is what
// SubmitMedia calls on the update branch; it is the single source of truth for the
// "id stays, revision bumps, state resets to pending" invariant Zielbild 1 requires:
query := fmt.Sprintf(`
	UPDATE %s
	SET source_revision = $2,
	    review_state = 'pending',
	    submitter_app_user_id = $3,
	    submitter_member_id = $4,
	    last_activity_at = $5,
	    decided_at = NULL,
	    cleanup_due_at = NULL,
	    tombstoned_at = NULL,
	    updated_at = $5
	    %s
	WHERE %s = $1
`, table, categoryUpdate, sourceColumn)
```
Do not write a parallel version of this. Call `repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(...)` from the handler (or from the new repository method if the plan pushes lifecycle-calling down into the repository layer) exactly as `PatchReleaseVersionMedia` and `processOneRVMFile` already do.

**Struct pattern to extend, not duplicate** (`release_version_media_repository.go:31-42`):
```go
type ReleaseVersionMediaPatchInput struct {
	Caption            *string
	CaptionSet         bool
	IsPreviewCandidate *bool
	Visibility   *string
	ReviewStatus *string
	// ADD: Category *string — nil = do not change, matches the existing nil-means-unchanged convention
}
```

---

### `backend/internal/handlers/admin_content_release_version_media.go` (MODIFY: remove category hard-block)

**Exact block to remove/replace** (`:854-860`):
```go
if _, hasCategory := rawBody["category"]; hasCategory {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
		"message":    "kategorie kann nicht geaendert werden",
		"error_code": "CATEGORY_CHANGE_NOT_ALLOWED",
	}})
	return
}
```
Replace with parsing into `patchInput.Category` (new field) and pass through to `PatchReleaseVersionMedia`. **Preserve the interaction with the preview-candidate guard** already present at `:888-896` — a category change to a non-preview-allowed category while `is_preview_candidate` stays true must still trip `PREVIEW_NOT_ALLOWED_FOR_CATEGORY` (VALIDATION.md's explicit regression requirement). Use `relationMeta.Category` (pre-patch) vs. the new category consistently — check both the existing and incoming category against `rvmPreviewAllowedCategories` (`:55-58`).

---

### `backend/cmd/server/admin_routes.go` (MODIFY: register new route)

**Exact registration block to extend** (`:160-169`):
```go
// NOTE: /reorder must be registered BEFORE /:relationId so Gin matches the literal segment first.
v1.POST("/admin/release-versions/:versionId/media", auth, deps.adminContentHandler.UploadReleaseVersionMedia)
v1.GET("/admin/release-versions/:versionId/capabilities", auth, deps.adminContentHandler.GetReleaseVersionCapabilities)

v1.GET("/admin/release-versions/:versionId/contributions/effective", auth, deps.adminContentHandler.GetEffectiveContributionsForVersion)
v1.PUT("/admin/release-versions/:versionId/contributions/effective", auth, deps.adminContentHandler.ReplaceEffectiveContributionsForVersion)
v1.GET("/admin/release-versions/:versionId/media", auth, deps.adminContentHandler.ListReleaseVersionMedia)
v1.POST("/admin/release-versions/:versionId/media/reorder", auth, deps.adminContentHandler.ReorderReleaseVersionMedia)
v1.PATCH("/admin/release-versions/:versionId/media/:relationId", auth, deps.adminContentHandler.PatchReleaseVersionMedia)
v1.DELETE("/admin/release-versions/:versionId/media/:relationId", auth, deps.adminContentHandler.DeleteReleaseVersionMedia)
```
Same literal-vs-parameterized-segment rule applies: if the new route is `PUT /admin/release-versions/:versionId/media/:relationId/file`, Gin resolves this fine alongside `/:relationId` on PATCH/DELETE because the HTTP method differs and the extra `/file` literal segment is unambiguous — but keep it grouped with the other `/media/...` routes and keep the existing `/reorder`-before-`/:relationId` comment/ordering intact (do not reorder unrelated lines).

---

### `shared/contracts/openapi.yaml` (MODIFY: new path + schema)

**Analog for the new multipart replace-file path** — existing `POST .../media` (`:6559-6631`):
```yaml
    post:
      tags: [Admin]
      summary: Upload media for a release version
      operationId: uploadReleaseVersionMedia
      security:
        - bearerAuth: []
      parameters:
        - name: versionId
          in: path
          required: true
          schema: { type: integer, format: int64, minimum: 1 }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [category, files[]]
              properties:
                category: { $ref: "#/components/schemas/ReleaseVersionMediaCategory" }
                files[]: { type: array, minItems: 1, maxItems: 20, items: { type: string, format: binary } }
```
The new replace endpoint follows the same multipart shape but `files[]` → a single `file` (UI-SPEC explicitly says "single-file mode — multiple is not set here"), and adds `versionId`+`relationId` path params like the existing PATCH path (`:6690-6712`).

**Analog for extending the PATCH request schema with category** (`:13912-13935`, `ReleaseVersionMediaPatchRequest`) — add a `category: { $ref: "#/components/schemas/ReleaseVersionMediaCategory" }` property alongside the existing `caption`/`is_preview_candidate`/`source_revision` properties, same `minProperties: 1` object.

**Analog for prior-rejection fields on the review detail schema:** the `ReleaseVersionMediaItem` schema already carries `rejection_category`/`rejection_reason`/`source_revision`/`review_state` (`:13821-13841`) — the resubmission-indicator UI surface needs the equivalent on `ReleaseReviewDetail` (search schema name near `ReleaseReviewDetail` in openapi.yaml); extend it with the same nullable enum shape rather than inventing new field names.

---

### `frontend/src/lib/api.ts` (MODIFY: add `replaceReleaseVersionMediaFile`)

**Exact analog to copy** (`:7426-7450`, `uploadReleaseVersionMedia`):
```typescript
export interface UploadReleaseVersionMediaOptions {
  versionId: number;
  category: ReleaseVersionMediaCategory;
  files: File[];
  onProgress?: (fileIndex: number, percent: number) => void;
}

export async function uploadReleaseVersionMedia(
  options: UploadReleaseVersionMediaOptions,
): Promise<ReleaseVersionMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/release-versions/${options.versionId}/media`;
  return authorizedUploadXhr<ReleaseVersionMediaUploadResponse>({
    endpoint,
    retryEligibility: "never",
    onProgress: options.onProgress
      ? (percent) => options.onProgress?.(0, percent)
      : undefined,
    buildBody: () => {
      const body = new FormData();
      body.set("category", options.category);
      for (const file of options.files) {
        body.append("files[]", file);
      }
      return body;
    },
  });
}
```
The new function targets `PUT .../media/${relationId}/file` (or whatever verb/path the plan settles on), uses `authorizedUploadXhr` the same way (single `file` field instead of `files[]`), and returns the same `ReleaseVersionMediaItem` shape `patchReleaseVersionMediaItem` returns (`:7451-7483`) so the frontend hook can update `items` state identically after either a metadata-only PATCH or a file replace.

**JSON PATCH analog for the category-extended request** (`:7451-7483`, `patchReleaseVersionMediaItem`) — no code change needed to this function itself, only to the `ReleaseVersionMediaPatchRequest` type it accepts (add `category?: ReleaseVersionMediaCategory`).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` (MODIFY: add replace action)

**Analog to extend from** (`:311-344`, `patchItem`):
```typescript
const patchItem = useCallback(
  async (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => {
    if (versionId === null) return
    setPatchError(null)
    try {
      const currentItem = itemsRef.current.find((item) => item.id === mediaId)
      const revisionBoundPatch = currentItem?.source_revision != null
        ? { ...patch, source_revision: currentItem.source_revision }
        : patch
      const updated = await patchReleaseVersionMediaItem(versionId, mediaId, revisionBoundPatch)
      setItems((current) => current.map((item) => (item.id === mediaId ? updated : item)))
    } catch (patchItemError) {
      const message = readUploadError(patchItemError, 'Änderung konnte nicht gespeichert werden.')
      setPatchError(message)
      throw patchItemError
    }
  },
  [versionId],
)
```
The new `replaceItem` action follows the identical shape: resolve `currentItem.source_revision` for the revision-bound guard, call the new `replaceReleaseVersionMediaFile` API function, replace the item in `items` state with the returned updated item — same error-wrapping via `readUploadError` (`:77-85`), same `set*Error` + re-throw pattern used by every mutating action in this hook (`patchItem`, `deleteItem`, `reorderItems`).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (MODIFY: file-replace control + category field)

**Drop-zone class reuse** (UI-SPEC mandates reusing these, `:507-550`):
```tsx
<div
  className={[
    styles.dropZone,
    isDragActive ? styles.dropZoneActive : '',
    !canChooseFiles ? styles.dropZoneDisabled : '',
  ].filter(Boolean).join(' ')}
  role="button"
  tabIndex={canChooseFiles ? 0 : -1}
  aria-disabled={!canChooseFiles}
  onClick={() => openFilePicker()}
  onKeyDown={onDropZoneKeyDown}
  onDragEnter={...} onDragOver={...} onDragLeave={...} onDrop={onDrop}
>
```
Reuse `styles.dropZone`/`styles.dropZoneActive`/`styles.dropZoneDisabled` verbatim for the new single-file replace zone inside the edit drawer (UI-SPEC explicitly forbids a second visual drop-zone style). Drop the `multiple` attribute on the `<input type="file">` for this one (single-file mode).

**Local preview reuse** (`buildLocalPreviewURL`, imported from `./ReleaseVersionMediaSection.helpers`, already used at `:115-118` for the upload sheet) — call the same helper for the staged replacement file so `.editPreview` swaps to the local object-URL, per UI-SPEC interaction contract point 1.

**Category select — reuse `CATEGORY_OPTIONS`** (`ReleaseVersionMediaSection.helpers.tsx:11-16`), same constant already used for the top-level segmented control (`:358-373` in the section component) — do not redefine category labels a second time. Wrap in `FormField label="Kategorie"` + the global `Select` primitive (`@/components/ui`), per UI-SPEC and CLAUDE.md's mandatory-primitives rule (native `<select>` is forbidden).

**Primary-action button label switch** — extend the existing footer button (`:617-624`):
```tsx
<Button
  variant="ghost"
  className={styles.accentButton}
  onClick={() => void handleSaveSelectedItem()}
  disabled={!canEditSelectedItem}
>
  {selectedItem?.review_state === 'rejected' ? 'Erneut einreichen' : 'Speichern'}
</Button>
```
UI-SPEC requires three label states now ("Überarbeitung einreichen" / "Erneut einreichen" (disabled until a change is staged) / "Speichern") — extend this same ternary into a small label-resolution function colocated in the component (or in the `.helpers.tsx` file, matching the existing `statusLabel`/`statusClassName` helper pattern), not a duplicate button block.

**Rejection-badge reuse for the reviewer side** — the existing `REJECTION_CATEGORY_LABELS` const (`:72-78`, this file) is exactly what UI-SPEC's rejection-context-panel heading needs; the reviewer-side resubmission context line needs the *same* category label vocabulary — do not redefine `REJECTION_CATEGORY_LABELS` a second time in the reviewer page. Either export it from this file/helpers, or (preferred, since it's presentation logic for the review flow specifically) add the equivalent mapping into `releaseReviewPresentation.ts` where `RELEASE_REVIEW_CATEGORY_LABELS` already exists (`:23-28`) but currently only covers `ReleaseReviewImageCategory`, not `ReleaseReviewRejectionCategory` — these are two different enums in this codebase (image category vs. rejection reason category), keep them distinct.

---

### `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` (MODIFY: resubmission badge)

**Badge-next-to-status pattern to copy** (`:247-250`):
```tsx
<div className={styles.titleLine}>
  <h1>Prüfung</h1>
  <Badge variant={status.variant}>{status.label}</Badge>
</div>
```
Add the new `Badge variant="warning"` "Überarbeitet" here, gated on the new `detail` field (e.g. `detail.source_revision > 1` or an explicit prior-rejection payload field) — same `Badge` import already present (`:9`), same conditional-render idiom used elsewhere in this file (e.g. `{detail.category ? (...) : null}` at `:261-263`).

**Context-line placement analog** (`:266-290`, `.contentPanel` section) — UI-SPEC requires the badge+context line directly above the media preview inside `.contentPanel`; follow the same conditional-JSX style as the existing `{detail.type === 'image' && detail.image ? (<ReleaseReviewMediaPreview .../>) : null}` block just below it.

---

### `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` (MODIFY: add resubmission-badge helper)

**Exact function shape to mirror** (`:56-74`, the whole file is 83 lines — read in full above, no re-read needed):
```typescript
export function releaseReviewQueueStatus(status: ReleaseReviewQueueItem['status']) {
  switch (status) {
    case 'confirmed':
      return { label: 'Bestätigt', variant: 'success' as const }
    case 'rejected':
      return { label: 'Abgelehnt', variant: 'danger' as const }
    case 'tombstoned':
      return { label: 'Bereinigt', variant: 'muted' as const }
    default:
      return { label: 'In Prüfung', variant: 'warning' as const }
  }
}

export function releaseReviewDetailStatus(status: ReleaseReviewDetail['status']) {
  const queueStatus = releaseReviewQueueStatus(status)
  return status === 'confirmed'
    ? { ...queueStatus, label: 'Bestätigt / Öffentlich' }
    : queueStatus
}
```
Add a new `releaseReviewResubmissionBadge(...)` (or similarly named) function in this exact same file, returning `{ label: 'Überarbeitet', variant: 'warning' as const }` plus whatever context-copy pieces are needed, following the same `{ label, variant: 'x' as const }` return shape as the two functions above. VALIDATION.md's grep assertion (`grep -c "case 'rejected'" frontend/src/app/admin/fansubs/**/*.tsx` outside this file staying at 0) means the badge/label logic MUST live here, not inline in the page component.

---

## Shared Patterns

### Permission/ownership check for media mutation
**Source:** `canMutateReleaseVersionMediaRelation` + `evaluateReleaseVersionMediaRelationMutation` (`backend/internal/handlers/admin_content_release_version_media.go:589-661`)
**Apply to:** the new replace-file handler — call this exact function with `permissions.ActionReleaseVersionMediaUpdate`, identical to how `PatchReleaseVersionMedia` and `DeleteReleaseVersionMedia` already do it. Do not add a new permission action constant.

### Review-lifecycle revision-bump + pending-reset
**Source:** `ReleaseReviewLifecycleRepository.SubmitMedia` (`backend/internal/repository/release_review_lifecycle_repository.go:119-170`, delegating to `submitLifecycle`/`updateLifecycle` at `:194-351`)
**Apply to:** every write path that changes a `release_version_media` row's content post-submission — PATCH (already wired), the new replace-file path, and the category-change path all funnel through this one method. This is also what auto-produces the correct `ReviewAuditEventSourceResubmitted` audit event (`:241-259`) that the reviewer-side "who rejected this before" context line can source its data from.

### Old-file async cleanup via outbox table
**Source:** `release_review_file_delete_jobs` INSERT pattern (`backend/internal/repository/release_review_cleanup_repository.go:175-190`) + the existing worker (`backend/internal/services/release_review_cleanup.go`)
**Apply to:** the new replace-file repository method, to enqueue the OLD `media_asset_id`/`media_file_id` for deletion instead of deleting synchronously or leaving it orphaned. `ON CONFLICT (media_file_id) DO NOTHING` already guards against double-enqueue on a second replace.

### Error response shape (`error.error_code`)
**Source:** every handler in `admin_content_release_version_media.go`, e.g. `:212-217` (`INVALID_CATEGORY`), `:934-939` (`SOURCE_REVISION_CONFLICT`)
**Apply to:** all new/modified backend error paths — `gin.H{"error": gin.H{"message": "...", "error_code": "SOME_CODE"}}`, German lowercase `message`, SCREAMING_SNAKE `error_code`.

### Frontend mutating-hook action shape
**Source:** `patchItem`/`deleteItem`/`reorderItems` in `useReleaseVersionMedia.ts` (`:311-384`)
**Apply to:** the new `replaceItem` hook action — `set*Error(null)` → try → API call → update `items` state → catch → `readUploadError` → `set*Error(message)` → re-throw.

### Global UI primitives (mandatory, CLAUDE.md)
**Source:** `@/components/ui` (`Badge`, `Button`, `Drawer`, `FormField`, `Select`, `Textarea`, `Modal`), already used throughout both touched frontend files.
**Apply to:** the new category `Select` and any new form control in `ReleaseVersionMediaSection.tsx`'s edit drawer — no native `<select>`/`<input>`/`<textarea>` for anything a primitive already covers. Confirmation for "Datei ersetzen" explicitly should NOT use `Modal` or `window.confirm` per UI-SPEC (gated purely on capability, no interrupt).

---

## No Analog Found

None. Every file in scope has a same-package or same-file self-analog because this phase is explicitly an extension of an existing, already-well-patterned review-lifecycle subsystem (notes/media submission, cleanup jobs, permission checks all pre-exist).

---

## Metadata

**Analog search scope:** `backend/internal/handlers/admin_content_release_version_media*.go`, `backend/internal/repository/release_version_media*.go`, `backend/internal/repository/release_review_*.go`, `backend/cmd/server/admin_routes.go`, `shared/contracts/openapi.yaml` (release-version-media + release-review schemas/paths), `frontend/src/app/admin/episode-versions/[versionId]/edit/*`, `frontend/src/app/admin/fansubs/**` (reviews detail page + presentation module), `frontend/src/types/releaseVersionMedia.ts`, `frontend/src/types/releaseReviews.ts`, `frontend/src/lib/api.ts` (release-version-media section).
**Files scanned (Read in full or targeted ranges):** 16 backend files, 8 frontend files, 2 openapi.yaml sections.
**Pattern extraction date:** 2026-09-02
