# Phase 173: Öffentliche Bildqualität – zusätzliche Display-Variante (Backend) - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 9 modified handler/service files + 1 new CLI package (3 files) + 1 shared-query pattern for `display_url`
**Analogs found:** 9 / 9 (every target file has at least one in-repo analog; 2 targets have no *existing* display/thumb analog in their own file and must copy a sibling file's helper instead — flagged below)

Scope note: this phase is backend-only (see phase directory suffix "-backend"). No new HTTP
route/handler file is in scope — D-14 explicitly forbids a new endpoint. All "files to
modify" below are existing files; the only wholly new file is the backfill CLI package
(`backend/cmd/migrate-display-backfill/`). Frontend `next.config.mjs`/`localPatterns`/
`ResponsiveImage` changes belong to a later, Next.js-focused phase per the phase title split
and are intentionally NOT classified here.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/media_upload_image.go` (`processImage`) | handler (image-processing helper) | file-I/O (decode → resize → re-encode → persist) | `backend/internal/handlers/admin_content_release_version_media.go` (`generateRVMThumbnail`) | role-match (same operation, different file-shape: `image.Image` vs `[]byte`) |
| `backend/internal/handlers/admin_content_release_version_media.go` (new `generateRVMDisplay` + call site ~L397/L483) | handler (shared helper + CRUD insert) | file-I/O + CRUD (media_files insert) | same file, `generateRVMThumbnail` (L114-144) | exact (self-analog, parallel function) |
| `backend/internal/handlers/admin_content_release_version_media_replace.go` (display insert + `cleanupNewFiles`) | handler (CRUD insert + cleanup) | file-I/O + CRUD | `admin_content_release_version_media.go` L397-483 (upload twin) | exact (replace handler already mirrors upload handler 1:1) |
| `backend/internal/handlers/fansub_media_upload.go` (`processOneFansubGroupMediaFile`) | handler (CRUD insert) | file-I/O + CRUD | `admin_content_release_version_media.go` L397-483 (same shared `generateRVMThumbnail` call) | exact (already shares the thumb helper with RVM) |
| `backend/internal/services/media_service.go` (`SaveUpload`, logo/banner path) | service (file-I/O, no thumb today) | file-I/O | `media_upload_image.go` thumb-generation block (no same-file precedent — cross-file analog) | role-match only (no existing thumb/display logic in this function; must be newly introduced) |
| `backend/internal/services/media_service_segment.go` + `backend/internal/handlers/media_upload_segment_preview.go` (`StoreGeneratedAnimeImage`) | service/handler (frame extraction → re-entry into `processImage`) | event-driven (video → frame) + file-I/O | `media_upload_image.go` `processImage` (called internally, no separate insertion point needed) | exact (pass-through call, covered automatically once `processImage` changes) |
| `backend/internal/handlers/app_profile.go` (`UploadOwnProfileAvatar`, `UploadOwnProfileBackground`) | handler (file-I/O, two distinct resize styles) | file-I/O | `app_profile_story_image.go` (`UploadOwnProfileStoryImage`, same package, same resize-then-save shape) | role-match (same package, same `imaging.Save`/EXIF-strip idiom, different crop/fill logic per field) |
| `backend/internal/handlers/app_profile_story_image.go` (`UploadOwnProfileStoryImage`) | handler (file-I/O) | file-I/O | `app_profile.go` `UploadOwnProfileAvatar`/`UploadOwnProfileBackground` (same package) | role-match (see Pitfall 4 — D-06 original-storage contradiction must be resolved here too) |
| `backend/cmd/migrate-display-backfill/{main.go,backfill.go,backfill_test.go}` (NEW) | CLI command (batch) | batch / idempotent re-processing | `backend/cmd/migrate-preview-backfill/{main.go,backfill.go,backfill_test.go}` | exact (explicitly named analog by the orchestrator; same env-var config shape, same `runBackfill(ctx, db, cfg)` testable-core split, same race-safe UPDATE guard) |
| `display_url` fallback projection (D-05) in DTO/query layer | repository (CRUD read-projection) | request-response (read) | `backend/internal/repository/release_detail_public_repository_helpers.go` (`imagesQuery`/`loadImages`, L339-421) + `group_release_media_repository.go:96` (`publicMediaURLForPath`) | exact (identical `LEFT JOIN media_files ... variant = 'thumb'/'original'` idiom; add a third `mf_display` join + `COALESCE` fallback to `original`) |

## Pattern Assignments

### `backend/internal/handlers/media_upload_image.go` (handler, file-I/O)

**Analog:** `backend/internal/handlers/admin_content_release_version_media.go` (`generateRVMThumbnail`, L114-144) for the "resize + encode" shape; file is self-contained for the insertion point.

**Current imports** (lines 1-15):
```go
package handlers

import (
	"context"
	"fmt"
	"image"
	"mime/multipart"
	"path/filepath"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
)
```
A `display` helper that re-encodes to JPEG≥88 needs `bytes` and `image/jpeg` added (both already imported two files over in `admin_content_release_version_media.go` — copy that import block's additions, not a new pattern).

**Core pattern — current thumb generation, insertion point for `display`** (lines 75-89, `processImage`):
```go
thumbPath := filepath.Join(storagePath, thumbFilename)
thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, thumbFilename)
thumb := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
if err := imaging.Save(thumb, thumbPath); err != nil {
	return nil, fmt.Errorf("thumbnail speichern: %w", err)
}

thumbBounds := thumb.Bounds()
thumbSize, _ := h.getFileSize(thumbPath)
files = append(files, models.UploadFileInfo{
	Variant: "thumb",
	Path:    thumbRelPath,
	Width:   thumbBounds.Dx(),
	Height:  thumbBounds.Dy(),
})
```
`display` generation goes directly after this block (before line 91's `shouldUseAnimePosterPathFallback` check) using the same `files = append(files, models.UploadFileInfo{Variant: "display", ...})` shape, then the loop at lines 122-137 (`for _, fileInfo := range files { ... txRepo.CreateMediaFile(...) }`) already handles arbitrary variants generically — **no change needed there** except adding a `displaySize` alongside `thumbSize`/`originalSize` in the `size := ...` branch (lines 123-126).

**"Never upscale" gate to add** (Pitfall 3 from RESEARCH.md, not yet present anywhere in this file):
```go
// New helper, modeled on generateRVMDisplay (see admin_content_release_version_media.go pattern below)
longEdge := originalWidth
if originalHeight > longEdge {
	longEdge = originalHeight
}
var display image.Image
if longEdge <= 1920 {
	display = img // already decoded; re-encode as-is, no resize
} else if originalWidth >= originalHeight {
	display = imaging.Resize(img, 1920, 0, imaging.Lanczos)
} else {
	display = imaging.Resize(img, 0, 1920, imaging.Lanczos)
}
```

**Anti-pattern warning (already documented in this file's own comment, line 26):**
```go
// WebP is decode-only in this upload path for now; imaging.Save cannot encode it.
return "jpg"
```
Any `display` output must reuse `imageExtFromMime`/JPEG re-encode — do not attempt `imaging.Save(..., "*.webp")`.

---

### `backend/internal/handlers/admin_content_release_version_media.go` (handler, shared helper + CRUD)

**Analog:** self (parallel function next to the existing one).

**Imports** (lines 1-31) — already includes everything a `generateRVMDisplay` needs (`image`, `image/jpeg`, `image/gif`, `bytes`, `github.com/disintegration/imaging`); no new imports required.

**Core pattern to duplicate** (lines 114-144, verbatim existing code):
```go
// generateRVMThumbnail creates a static JPEG thumbnail from image data.
// Animated GIFs keep their original animation in storage; the thumbnail uses frame 0.
func generateRVMThumbnail(data []byte, mimeType string) ([]byte, int, int, error) {
	var src image.Image

	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("gif frame 0 laden: %w", err)
		}
		if len(decoded.Image) == 0 {
			return nil, 0, 0, fmt.Errorf("gif enthält keine frames")
		}
		src = decoded.Image[0]
	} else {
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("bild dekodieren: %w", err)
		}
		src = decoded
	}

	thumb := imaging.Resize(src, rvmThumbnailWidth, 0, imaging.Lanczos)
	buf := new(bytes.Buffer)
	if err := jpeg.Encode(buf, thumb, &jpeg.Options{Quality: 85}); err != nil {
		return nil, 0, 0, fmt.Errorf("thumbnail exportieren: %w", err)
	}

	bounds := thumb.Bounds()
	return buf.Bytes(), bounds.Dx(), bounds.Dy(), nil
}
```
The parallel `generateRVMDisplay(data []byte, mimeType string) ([]byte, int, int, error)` must add the "never upscale, constrain long edge" check (see `media_upload_image.go` entry above) before calling `imaging.Resize`, and should use a new constant alongside `rvmThumbnailWidth = 400` (line 39), e.g. `rvmDisplayLongEdge = 1920`, and `jpeg.Options{Quality: 88}` (or higher, per D-01 discretion) instead of `85`.

**Call-site + CRUD insert pattern** (lines 397-483, the exact place `display` hooks in):
```go
thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, mimeType)
// ... error handling ...
// display generation goes right after this, same error-handling shape
// ...
if err := os.WriteFile(thumbPath, thumbData, 0o644); err != nil { ... }
// displayPath written the same way
// ...
if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, thumbWidth, thumbHeight, int64(len(thumbData)), "processing"); err != nil {
	_ = removeFileQuietly(originalPath)
	_ = removeFileQuietly(thumbPath)
	return rvmFileResult{ClientFileName: clientName, Status: "failed",
		ErrorCode: "DB_FAILED", Message: "media file (thumb) konnte nicht erstellt werden"}
}
// identical InsertMediaFileWithStatus(..., "display", displayPath, displayWidth, displayHeight, ..., "processing") goes here,
// with the SAME removeFileQuietly(originalPath)/removeFileQuietly(thumbPath) cleanup PLUS removeFileQuietly(displayPath)
// in every subsequent error branch (lines 484-540 all repeat this triple-cleanup shape)
```
**Important:** every one of the ~8 subsequent error-return blocks between line 483 and line 540 repeats `removeFileQuietly(originalPath)` + `removeFileQuietly(thumbPath)`. Adding `display` means adding `removeFileQuietly(displayPath)` to **all of them**, not just the new insert's own error branch — this is the single highest-risk omission spot in this file.

**450-line-limit note (Pitfall 6):** this file is already 1296 lines. Per the Phase-172 precedent (`theme_segment_preview.go` → `theme_segment_preview_writes.go`), put `generateRVMDisplay` and any new insert-helper in a new sibling file `admin_content_release_version_media_display.go` in the same package rather than growing this file further.

---

### `backend/internal/handlers/admin_content_release_version_media_replace.go` (handler, CRUD + cleanup)

**Analog:** `admin_content_release_version_media.go` lines 397-483 (upload handler — replace handler is structurally identical).

**Core pattern** (lines 249-368, verbatim):
```go
thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, mimeType)
// ...
assetDir := filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)
originalPath := filepath.Join(assetDir, "original."+ext)
thumbPath := filepath.Join(assetDir, "thumb.jpg")
// ...
cleanupNewFiles := func() {
	_ = removeFileQuietly(originalPath)
	_ = removeFileQuietly(thumbPath)
}
```
`display` requires: a `displayPath := filepath.Join(assetDir, "display.jpg")` next to `thumbPath`, a `generateRVMDisplay` call next to line 249's `generateRVMThumbnail` call, a write next to line 289's `os.WriteFile(thumbPath, thumbData, 0o644)`, and — critically — `displayPath` added inside the `cleanupNewFiles` closure (lines 296-299) so every one of the ~10 downstream error paths that calls `cleanupNewFiles()` (lines 304-368+) cleans it up automatically. This closure-based cleanup is actually safer than the upload handler's repeated inline calls — one edit point instead of eight.

---

### `backend/internal/handlers/fansub_media_upload.go` (handler, CRUD)

**Analog:** `admin_content_release_version_media.go` lines 397-483 (shares `generateRVMThumbnail` already).

**Core pattern** (`processOneFansubGroupMediaFile`, lines 440-522):
```go
saveResult, err := h.mediaService.SaveUpload(models.MediaKindImage, clientName, data)
// ...
thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, saveResult.CreateInput.MimeType)
// ...
thumbPath := groupMediaThumbPath(saveResult.CreateInput.StoragePath)
if err := os.WriteFile(thumbPath, thumbData, 0o644); err != nil { ... }
// ...
if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, thumbWidth, thumbHeight, int64(len(thumbData)), "processing"); err != nil {
	_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
	_ = removeFileQuietly(thumbPath)
	return fansubGroupMediaFileResult{...}
}
```
`groupMediaThumbPath` (line 312) derives the thumb path from the original storage path by filename convention — a `groupMediaDisplayPath` sibling function should do the same for `display`, and the same `removeFileQuietly(...)` triple-cleanup pattern noted for `admin_content_release_version_media.go` applies here too (every error branch from line 467 to 521 repeats the two-path cleanup; add the third).

---

### `backend/internal/services/media_service.go` (service, file-I/O — NO existing thumb/display analog)

**Analog:** cross-file only — this function has no local precedent for a second variant. Use `media_upload_image.go`'s "never upscale" check (see above) as the algorithm template, but keep the output shape of this file's own `MediaVariantSaveResult` (lines 33-43).

**Current core pattern** (`SaveUpload`, lines 93-151 — only writes `original`, no thumb exists today):
```go
width, height := decodeImageDimensions(data)
ext := extensionFromMime(detectedMime)
filename := buildFilename(kind, ext)
absolutePath := filepath.Join(s.storageDir, filename)

if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
	return nil, fmt.Errorf("create media directory: %w", err)
}
if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
	return nil, fmt.Errorf("write media file: %w", err)
}
```
This is the exact insertion point (right after line 127's `os.WriteFile`). Return a second `MediaVariantSaveResult` (same struct already used by `SaveUploadSourceOriginal`, lines 33-43 and 156+) for the new `display` file instead of inventing a new return type — `MediaSaveResult.Variants []MediaVariantSaveResult` (line 30) already exists as a slot for exactly this.

**SVG exception (new, no existing MIME-branch precedent in this function):** `detectMimeType`/`extensionFromMime` (lines 261, 347) must be checked for `image/svg+xml` before attempting any resize — SVG has no raster dimensions. Pattern: an early `if detectedMime == "image/svg+xml" { /* display = copy of original, no raster resize */ }` guard, mirroring how `media_upload_image.go` already special-cases `format == "gif" && isAnimatedGIF` (lines 56-62) as a per-MIME-type branch before the generic path.

---

### `backend/internal/services/media_service_segment.go` + `media_upload_segment_preview.go` (no direct change expected)

**Analog:** `media_upload_image.go` `processImage` — this path calls `h.processImage(...)` internally (per RESEARCH.md line 70, verified call at `media_upload_segment_preview.go:119`). Once `processImage` emits a `display` variant, this path inherits it automatically. No separate insertion point; only verify via test that `StoreGeneratedAnimeImage` → `processImage` → `display` round-trips (same test shape as `admin_content_release_version_media_test.go`, see Validation Architecture in RESEARCH.md).

---

### `backend/internal/handlers/app_profile.go` (handler, file-I/O — avatar + background)

**Analog:** `app_profile_story_image.go` (same package, closest sibling pattern for "decode → maybe resize → `imaging.Save` → EXIF-stripped output").

**Avatar core pattern** (lines 457-475):
```go
if shouldCopyAvatarDisplayFile(mimeType) {
	if err := copyMultipartFileToPath(croppedFile, absolutePath); err != nil { ... }
} else {
	img, _, err := image.Decode(croppedFile)
	// ...
	if err := imaging.Save(img, absolutePath); err != nil { ... }
}
```
**Background core pattern** (lines 620-638):
```go
img, _, err := image.Decode(uploadFile)
// ...
outputImage := img
if !isCroppedUpload {
	outputImage = imaging.Fill(img, profileBackgroundBannerWidth, profileBackgroundBannerHeight, imaging.Center, imaging.Lanczos)
	// ...
}
if err := imaging.Save(outputImage, absolutePath); err != nil { ... }
```
Both need a `display.<ext>` file written next to `absolutePath` using the same "never upscale, cap long edge at 1920" helper as `media_upload_image.go`/`generateRVMDisplay`, then a corresponding field/row added wherever `AttachUploadedAvatar`/`AttachUploadedBackground` (lines 496, 663) persist file metadata — these are direct, bespoke DB writes (not the generic `media_files` table), so the planner must check `models.MemberProfileAvatarUploadInput`/`MemberProfileBackgroundUploadInput` for whether a `DisplayFilePath`-style field needs adding (open question — no existing field name to copy; follow the existing `SourceFilePath`/`FilePath` dual-field naming convention already used in those structs at lines 497-498/664-665).

---

### `backend/internal/handlers/app_profile_story_image.go` (handler, file-I/O)

**Analog:** `app_profile.go` (same package, `UploadOwnProfileAvatar`/`UploadOwnProfileBackground`).

**Core pattern + Pitfall 4 context** (lines 140-157):
```go
img, _, err := image.Decode(file)
// ...
// Resize auf max 1600px Breite (D-19)
if cfg.Width > 1600 {
	img = imaging.Resize(img, 1600, 0, imaging.Lanczos)
}
// EXIF-Strip: imaging.Save re-enkodiert ohne EXIF-Metadaten (D-19)
if err := imaging.Save(img, absolutePath); err != nil { ... }
```
**D-15 resolution (per CONTEXT.md, already decided — not open):** this 1600px-resize-as-"original" behavior must change for *new* uploads: store the true 1:1 original (EXIF-stripped, same `imaging.Save` re-encode, no resize) at `original.<ext>`, and additionally produce `display.<ext>` as what this code currently does (resize to the long-edge cap, reusing the exact `imaging.Resize(img, 1600, 0, imaging.Lanczos)` call shown above but changed to the shared 1920-cap helper). Existing stored 1600px files stay as-is; backfill only adds `display` for them, never touches `original`.

---

### `backend/cmd/migrate-display-backfill/` (NEW CLI package, batch)

**Analog:** `backend/cmd/migrate-preview-backfill/` (named explicitly by the orchestrator; copy this package's shape wholesale, not `cmd/migrate-covers` which lacks the testable `runBackfill` split).

**`main.go` pattern to copy** (full file, 100 lines — env-var config + stats summary):
```go
type Config struct {
	DBConnString     string
	SegmentRenderDir string
	MediaStorageDir  string
	FFmpegPath       string
	DryRun           bool
	// ImageStore ersetzt in Tests den globalen Anime-Upload-Pfad (nil = echter Pfad).
	ImageStore previewImageStore
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	// getEnv/getEnvBool-based Config construction
	// pgxpool.New(ctx, config.DBConnString)
	stats, err := runBackfill(ctx, dbpool, config)
	// structured log.Printf summary: TotalCandidates / ProcessedOK / Failed
}

func getEnv(key, defaultValue string) string { /* os.Getenv + TrimSpace + default */ }
func getEnvBool(key string, defaultValue bool) bool { /* "true"/"1"/"yes" */ }
```

**`backfill.go` pattern to copy** (full file, 161 lines — testable core + idempotent SQL guard):
```go
// runBackfill is the testable core ... For every [asset] without a [variant] but with a
// ready [source], it [generates variant] and stores it through [existing write path] —
// exactly like the live [...] path.
func runBackfill(ctx context.Context, db *pgxpool.Pool, cfg Config) (*BackfillStats, error) {
	stats := &BackfillStats{}
	candidates, err := fetchBackfillCandidates(ctx, db)
	// ...
	for _, candidate := range candidates {
		if err := processBackfillCandidate(ctx, db, ..., candidate); err != nil {
			log.Printf("FAILED ...: %v\n", err)
			stats.Failed++
			continue
		}
		stats.ProcessedOK++
	}
	return stats, nil
}

// fetchBackfillCandidates implements the "most recently completed wins" / "missing variant"
// ranking. Rows that already have the target variant are excluded up front (primary
// idempotency guard); processBackfillCandidate's UPDATE/INSERT carries a second, race-safe
// guard on top of this snapshot.
func fetchBackfillCandidates(ctx context.Context, db *pgxpool.Pool) ([]backfillCandidate, error) {
	rows, err := db.Query(ctx, `
		SELECT DISTINCT ON (ma.id) ma.id, mf_orig.path, mf_orig.width, mf_orig.height, mf_orig.mime_type
		FROM media_assets ma
		JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND mf_orig.variant = 'original' AND mf_orig.status = 'ready'
		LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display'
		WHERE mf_display.id IS NULL
		ORDER BY ma.id
	`)
	// ...
}

// Race-safe idempotent write: never clobber a display variant inserted concurrently.
tag, err := db.Exec(ctx, `
	INSERT INTO media_files (media_id, variant, path, width, height, size_bytes, status)
	SELECT $1, 'display', $2, $3, $4, $5, 'ready'
	WHERE NOT EXISTS (SELECT 1 FROM media_files WHERE media_id = $1 AND variant = 'display')
`, ...)
```
**Do-Not-Hand-Roll:** reuse this exact `SELECT DISTINCT ON ... WHERE <variant missing> ... ORDER BY ...` + second race-safe `WHERE NOT EXISTS`/`WHERE ... IS NULL` guard shape from `backend/cmd/migrate-preview-backfill/backfill.go:85-150` verbatim — do not invent a new "already processed" marker column.

**`backfill_test.go` pattern to copy:** `backend/cmd/migrate-preview-backfill/backfill_test.go` (306 lines) — real Postgres integration test fixture (per the project's Teststil rule: behavior assertions that actually execute `runBackfill` against a test DB and check resulting rows, not `os.ReadFile`+`strings.Contains` on the source).

---

### `display_url` fallback projection (D-05) — repository/DTO read path

**Analog:** `backend/internal/repository/release_detail_public_repository_helpers.go` (`imagesQuery`/`loadImages`, lines 339-421) — this is the general pattern for every place a public API response needs to resolve a `media_files` variant into a URL field, and it already demonstrates the exact `thumb → fallback` idiom needed for `display → original`.

**Query pattern** (lines 394-421, verbatim):
```go
func (r *ReleaseDetailPublicRepository) imagesQuery() string {
	return fmt.Sprintf(`
		SELECT
			rvm.id,
			...
			COALESCE(mf_thumb.path, '') AS thumbnail_path,
			COALESCE(mf_orig.path, ma.file_path, '') AS original_path,
			...
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		...
	`, uploaderAuthorNameJoin)
}
```
For `display_url` (D-05), add a third `LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display' AND mf_display.status = 'ready'` and project `COALESCE(mf_display.path, mf_orig.path, ma.file_path, '') AS display_path` — the fallback chain is literally the same `COALESCE` idiom already used for `original_path`'s own fallback to `ma.file_path`.

**Scan + URL-resolution pattern** (lines 346-362, verbatim):
```go
items := make([]PublicReleaseImage, 0)
for rows.Next() {
	var (
		item          PublicReleaseImage
		thumbnailPath *string
		originalPath  *string
	)
	if err := rows.Scan(&item.ID, ..., &thumbnailPath, &originalPath, ...); err != nil { ... }
	if thumbnailPath != nil {
		item.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
	}
	if originalPath != nil {
		item.OriginalURL = publicMediaURLForPath(*originalPath, r.mediaStorageDir)
	}
	items = append(items, item)
}
```
Add a `displayPath *string` scan target and `item.DisplayURL = publicMediaURLForPath(*displayPath, r.mediaStorageDir)` the same way. The exact same two-line pattern recurs at `group_release_media_repository.go:96` and `release_review_query_repository.go:242` — every public DTO that currently exposes `thumbnail_url`/`original_url` should get `display_url` added via this identical idiom, not a bespoke one per file.

**DTO field to add** (model shape, e.g. `backend/internal/models/release_asset.go` or the nearest public-facing struct per asset type):
```go
ThumbnailURL    *string          `json:"thumbnail_url,omitempty"`
// add:
DisplayURL      *string          `json:"display_url,omitempty"`
```
Follow the existing `*string` + `omitempty` convention seen uniformly across `release_asset.go:21`, `group_assets.go:27/38`, `member_profile.go:55/286`, `fansub.go:114-115` — do not introduce a non-pointer or non-omitempty variant for this new field.

## Shared Patterns

### "Never upscale" long-edge cap (applies to ALL 7 display-generation sites)
**Source:** no existing function implements this today (Pitfall 3) — this is new shared logic, not an existing pattern to imitate. Recommend one helper per the two incompatible call shapes already present in the codebase:
- `generateRVMDisplay(data []byte, mimeType string) ([]byte, int, int, error)` next to `generateRVMThumbnail` in `admin_content_release_version_media.go` (byte-slice input shape) — reused by `admin_content_release_version_media.go`, `_replace.go`, `fansub_media_upload.go`.
- A second, `image.Image`-input helper for `media_upload_image.go`'s `processImage` (already-decoded input shape) — reused transitively by `media_service_segment.go`/`media_upload_segment_preview.go` and the backfill CLI (per RESEARCH.md's table, row 1: "covers 3 of 6 cases at once").
- `app_profile.go` and `app_profile_story_image.go` need their own small call sites (different storage model: direct profile-repo fields, not generic `media_files` rows) but should call into the same long-edge-cap math, not reimplement it a third time.

### EXIF-strip via `imaging.Save` re-encode (already established, D-06 compliance)
**Source:** `admin_content_release_version_media.go` lines 424-436 (comment: *"EXIF-Strip für JPEG, PNG und WebP: imaging.Save re-enkodiert das Bild ohne Metadaten. GIF bleibt raw..."*)
**Apply to:** every new `display` encode path except the GIF branch, which needs the FFmpeg `libwebp_anim` shellout instead (D-07) — see RESEARCH.md Pattern 2 for the verified `exec.Command` argument list (no shell string interpolation, per the Security Domain table's Tampering mitigation).

### Animated-WebP rejection stays unchanged (D-08, no code change)
**Source:** `backend/internal/handlers/image_animated_webp.go` (31 lines, full file read) — `isAnimatedWebP(head []byte) bool` (lines 14-19) and `rvmFileRejection` (lines 23-31) are correct as-is; RESEARCH.md's live FFmpeg decode test confirms animated WebP cannot be read back. **No file in this phase should touch `image_animated_webp.go`.**

### Idempotent batch processing with race-safe second guard
**Source:** `backend/cmd/migrate-preview-backfill/backfill.go` lines 85-93 (`SELECT DISTINCT ON` snapshot-exclusion) + lines 137-148 (second `WHERE ... IS NULL` guard on the actual write). Apply verbatim to `cmd/migrate-display-backfill`.

### Pixel-bomb guard ordering (40 MP limit, already present everywhere)
**Source:** `admin_content_release_version_media.go` lines 384-390, `app_profile_story_image.go` lines 104-107 — `display` generation must be inserted **after** this existing check, never before, since the check already gates all processing today (Security Domain table: "keine neue Prüfung nötig, nur sicherstellen, dass `display` NACH diesem Gate eingefügt wird").

## No Analog Found

| File/Change | Role | Data Flow | Reason |
|---|---|---|---|
| SVG exception in `media_service.go` `SaveUpload` (logo/banner) | service | file-I/O | No existing MIME-type branch skips rasterization anywhere in this codebase; nearest conceptual precedent is the GIF-vs-static branch in `generateRVMThumbnail`, but that still rasterizes (just picks frame 0) — SVG must skip rasterization entirely. Planner should treat this as new logic, not a copy. |
| `display` field additions to `MemberProfileAvatarUploadInput`/`MemberProfileBackgroundUploadInput` | model (struct fields) | CRUD | These are bespoke per-profile-field structs (not generic `media_files` rows), so there's no existing third-variant field to copy; follow the existing `FilePath`/`SourceFilePath` dual-field naming convention instead of a direct analog. |

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/services/`, `backend/internal/repository/`, `backend/cmd/migrate-preview-backfill/`, `backend/cmd/migrate-covers/`, `database/migrations/0026_add_media_tables.up.sql`
**Files scanned:** 14 read directly (full or targeted ranges); confirmed via RESEARCH.md's independently-verified line numbers for the 6 write-path insertion points
**Pattern extraction date:** 2026-10-02
