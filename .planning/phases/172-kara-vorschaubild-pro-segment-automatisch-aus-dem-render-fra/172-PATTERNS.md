# Phase 172: Kara-Vorschaubild pro Segment - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 15 (8 backend, 7 frontend; excludes pure-config files like `openapi.yaml`/`admin-content.yaml` which are listed under Shared Patterns instead)
**Analogs found:** 15 / 15 (every file has a direct, line-verified analog already in the codebase — this phase is a pure extension of existing patterns, confirmed against live `main` on 2026-10-01)

> This phase's RESEARCH.md already did exceptionally deep file:line analog identification. This PATTERNS.md
> independently re-verified every cited analog against the live checkout and extracts the exact excerpts the
> planner needs, organized per target file rather than per capability.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `backend/internal/handlers/admin_content_anime_theme_segments_preview.go` (NEW) | controller (Gin handlers) | request-response + file-I/O | `backend/internal/handlers/admin_content_anime_theme_segments.go` (`UploadSegmentAsset`/`AttachSegmentLibraryAsset`/`DeleteSegmentAsset`) | exact |
| `backend/internal/handlers/segment_render_worker.go` (CHANGED: `executeSegmentRender`) | event-driven worker hook | file-I/O (post-render frame extraction) | same file, `saveSegmentVideoPreview`-style ffmpeg call in `media_service.go` + duration already computed locally at line 178 | exact |
| `backend/internal/services/media_service.go` (CHANGED: `saveSegmentVideoPreview`) | service | file-I/O/transform | `backend/internal/handlers/media_upload_video.go` (`getVideoMetadata` ffprobe pattern) | role-match (duration-probing addition) |
| `backend/internal/repository/theme_segment_preview.go` (NEW, per RESEARCH.md structure proposal) | repository (shared SQL/Go helper) | CRUD (resolve + write) | `backend/internal/repository/release_detail_public_repository_helpers.go` (`countImagesByCategory`, `loadReleaseSegments`) + `admin_content_anime_themes.go` (`hydrateSegmentPlaybackMetadata`-style hydration) | exact (join/gate shape), new (shared helper is a new concept but built from exact existing fragments) |
| `backend/internal/repository/admin_content_anime_themes.go` (CHANGED: `ListAnimeSegments`/`loadSegmentByID` hydration) | repository | CRUD (read) | same file, existing hydration functions (`hydrateSegmentPlaybackMetadata`, `hydrateSegmentLibraryMetadata`) | exact |
| `backend/internal/repository/release_detail_public_repository_helpers.go` (CHANGED: `loadReleaseSegments`) | repository | CRUD (read, public) | same file, current `loadReleaseSegments` query (to be swapped) | exact (modifying itself) |
| `backend/cmd/migrate-preview-backfill/main.go` (NEW) | utility (one-off backfill binary) | batch | `backend/cmd/migrate-covers/main.go` | exact |
| `database/migrations/0177_theme_segment_preview_images.{up,down}.sql` (NEW) | migration | schema | `database/migrations/0176_release_version_story_order_trigger_alignment.{up,down}.sql` (naming/structure convention) + `database/migrations/0059_release_version_media_schema.up.sql` (nullable FK `ON DELETE SET NULL`/`RESTRICT` convention) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImageSection.tsx` (NEW) | component | request-response (triggers upload/picker/reset) | `frontend/src/components/admin/MediaUploadCore.tsx` (dropzone shape) + `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx` (panel-section shape/placement) | exact (per UI-SPEC Design-Entscheidung 1: MediaUploadCore for the dropzone, SegmentAssetSection for placement/props convention) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImagePicker.tsx` (NEW) | component (modal content) | request-response | no exact modal-grid-picker precedent in this folder; closest role-match is `Modal`/`EmptyState`/`ErrorState`/`LoadingState` primitives (see Shared Patterns) + tile-grid shape described in UI-SPEC | role-match (primitives exist, grid-of-image-tiles-in-modal composition is new to this folder) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts` (NEW) | hook | request-response (state/handler hook) | `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts` | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (CHANGED, additive) | component | request-response (props passthrough) | same file, existing `<SegmentAssetSection .../>` insertion pattern | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (CHANGED, additive — `karaFooter` link) | component | request-response | same file, existing `karaFooter` block (lines 523-526) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` (CHANGED: simplify `createKaraStoryItem`) | utility (pure helpers) | transform | same file, current `createKaraStoryItem` (lines 83-98) | exact (modifying itself) |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` (CHANGED: remove fallback) | component | request-response | same file, current `renderKara` (line 144-145) | exact (modifying itself) |
| `frontend/src/lib/api.ts` (CHANGED: 4 new functions) | utility (API client) | request-response | same file, `uploadSegmentAsset`/`attachSegmentLibraryAsset`/`getSegmentLibraryCandidates`/`deleteSegmentAsset` (lines 7728-7884) | exact |
| `frontend/src/types/admin.ts` (CHANGED: add fields to `AdminThemeSegment`) | model (TS type) | — | same file, `AdminThemeSegment` interface (line 925 onward) | exact |

## Pattern Assignments

### `backend/internal/handlers/admin_content_anime_theme_segments_preview.go` (NEW — controller)

**Analog:** `backend/internal/handlers/admin_content_anime_theme_segments.go` — follow the file's own existing
package/import block, and copy the exact handler skeleton of `UploadSegmentAsset`/`AttachSegmentLibraryAsset`.
RESEARCH.md's own instruction (already correct, re-verified): "new admin_content_anime_theme_segments_preview.go
should follow the IDENTICAL shape: 1. parse animeID/segmentID from path params, 2. parseReleaseVariantIDQuery(c)
+ GetAnimeSegmentByID for permission context, 3. requireSegmentManage(c, releaseVariantID) gate, 4.
domain-specific body, 5. c.JSON(http.StatusOK, gin.H{"data": updated})".

**Imports pattern** (`admin_content_anime_theme_segments.go` lines 1-20):
```go
package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)
```

**Param-parse + permission-gate pattern** (`admin_content_anime_theme_segments.go` lines 744-786, `UploadSegmentAsset` opening):
```go
func (h *AdminContentHandler) UploadSegmentAsset(c *gin.Context) {
	if h.themeRepo == nil || h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment asset service nicht verfügbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}
	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungültige segment id")
		return
	}

	releaseVariantID := parseReleaseVariantIDQuery(c)
	if releaseVariantID < 0 {
		badRequest(c, "ungültige release_variant_id")
		return
	}

	// Segment laden für Kontext (groupID, version, theme_type_name)
	seg, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}
	if releaseVariantID == 0 {
		releaseVariantID = segmentPlaybackVariantID(seg)
	}
	if !h.requireSegmentManage(c, releaseVariantID) {
		return
	}
	// ... multipart file read (lines 787-804), then SaveSegmentAsset / CreateMediaAsset / InsertMediaFile
}
```

**Shared helper functions to reuse as-is** (`admin_content_anime_theme_segments.go` lines 147-193):
```go
func parseReleaseVariantIDQuery(c *gin.Context) int64 { /* raw query parse, -1 on invalid, 0 on empty */ }

func (h *AdminContentHandler) requireSegmentManage(c *gin.Context, releaseVariantID int64) bool {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok { return false }
	if actor.IsPlatformAdmin { return true }
	if releaseVariantID <= 0 {
		badRequest(c, "release_variant_id ist erforderlich")
		return false
	}
	if h.permissionSvc == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "permission service nicht verfügbar"}})
		return false
	}
	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, releaseVariantID)
	if err != nil {
		writePermissionInternalError(c, err, "Segment-Berechtigung konnte nicht geprüft werden.")
		return false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version.segments.manage.denied", nil, "release_version", &releaseVariantID, permissions.ActionReleaseVersionSegmentsManage, result)
		writePermissionDenied(c, result)
		return false
	}
	return true
}

func segmentPlaybackVariantID(segment *models.AdminThemeSegment) int64 { /* nil-safe accessor */ }
```
**Do not redefine these** — call them directly from the new file (same package `handlers`).

**Upload pipeline pattern to copy for the new "upload preview image" endpoint** (`admin_content_anime_theme_segments.go` lines 787-896, `UploadSegmentAsset` body): multipart read → `h.mediaService.SaveSegmentAsset(...)` (swap for `h.mediaService.SaveUpload(models.MediaKindImage, ...)` since this is an image, not a video) → force `VisibilityCode = "public"`, `ReviewStatusCode = "approved"` (D-03) → `h.mediaRepo.CreateMediaAsset` → `h.mediaRepo.InsertMediaFile(asset.ID, "original", ...)` → on any failure, `removeFileQuietly`/`DeleteMediaAsset` rollback (this exact rollback shape, lines 838-868, must be replicated for the new endpoint since partial writes orphan files otherwise) → finally `UPDATE theme_segments SET preview_media_asset_id = ...` (new repository method, NOT `BindUploadedSegmentAsset` which targets `source_ref`, a different field) → `c.JSON(http.StatusOK, gin.H{"data": updated})`.

```go
// admin_content_anime_theme_segments.go:834-838 — the exact "force public/approved" pattern (D-03)
publicVisibility := "public"
approvedReview := "approved"
saveResult.CreateInput.VisibilityCode = &publicVisibility
saveResult.CreateInput.ReviewStatusCode = &approvedReview
asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
```

**Ownership-verification pattern for the "attach release image" endpoint** (`admin_content_anime_theme_segments.go`
lines 719-734, comment + call inside `AttachSegmentLibraryAsset`): use `h.themeRepo.ListThemeSegmentAssignments(ctx, segmentID)` to get the assigned `release_version_id`s, then verify the client-supplied `media_asset_id` belongs to `release_version_media` for one of those IDs AND passes the public/approved/ready gate (see `countImagesByCategory` below) — return 404 for anything else, exactly as the Acceptance list requires ("Fremde → 404/403"). Never trust the client-supplied ID without this check (same IDOR concern RESEARCH.md's Security Domain section already flags).

**`ErrConflict`/`ErrNotFound` response pattern** (`admin_content_anime_theme_segments.go` lines 705-717):
```go
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment oder library-asset nicht gefunden"}})
	return
}
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "library-asset passt nicht zu Anime oder Gruppe", "code": "segment_library_conflict"}})
	return
}
```

---

### `backend/internal/handlers/segment_render_worker.go` (CHANGED — `executeSegmentRender` hook)

**Analog:** same file, its own existing success path (lines 199-224) — the new frame-extraction call is inserted
strictly AFTER `MarkThemeSegmentRenderCacheReady` succeeds (line 208-221), never before, and never allowed to
affect the function's own return value (D-06).

**Exact insertion point** (`segment_render_worker.go` lines 208-224):
```go
	if err := themeRepo.MarkThemeSegmentRenderCacheReady(ctx, models.ThemeSegmentRenderCacheReadyInput{
		CacheKey:            cache.CacheKey,
		OutputPath:          outputRel,
		MimeType:            "video/mp4",
		DurationSeconds:     durationSeconds,
		VideoCodec:          "h264",
		AudioCodec:          "aac",
		SubtitleStreamIndex: subtitle.StreamIndex,
		SubtitleCodec:       subtitle.Codec,
	}); err != nil {
		_ = os.Remove(outputPath)
		log.Printf("segment render worker: mark ready fehlgeschlagen (cache_key=%s): %v", cache.CacheKey, err)
		return err
	}

	// [NEW, D-04/D-06] offsetSeconds := float64(durationSeconds) * 0.35
	// extract frame from outputPath at offsetSeconds, log-only on any failure, NEVER return err here.
	// durationSeconds (the just-rendered clip's length) is already in scope at line 178 — no ffprobe needed.

	log.Printf("segment render worker: render abgeschlossen (segment_id=%d, cache_key=%s)", cache.ThemeSegmentID, cache.CacheKey)
	return nil
}
```

**`ctx` discipline (Pitfall 2 from RESEARCH.md, re-verified)**: `ctx` here is the worker's own
`context.Background()`-derived ctx (see comment at lines 118-119, confirmed verbatim: "Der uebergebene ctx MUSS
von context.Background() abgeleitet sein ... niemals von einem HTTP-Request-Context"). The new auto-extraction
call must reuse this same `ctx` parameter — never `c.Request.Context()` (there is no `c` in this function at all).

**Duration already in scope** (`segment_render_worker.go` line 178):
```go
durationSeconds := *source.EndOffsetSeconds - *source.StartOffsetSeconds
```
This is the segment duration in seconds, computed before the ffmpeg render call — exactly the number needed for
`offsetSeconds := float64(durationSeconds) * 0.35`. No ffprobe call needed at this call site (D-04).

---

### `backend/internal/services/media_service.go` (CHANGED — `saveSegmentVideoPreview`)

**Analog:** same file's current implementation, generalized using `media_upload_video.go`'s existing
`extractVideoThumbnail`/`getVideoMetadata` shape for the duration-probing addition.

**Current implementation to generalize** (`media_service.go` lines 351-382, CURRENT `-ss 0`):
```go
func (s *MediaService) saveSegmentVideoPreview(videoPath string) (*MediaVariantSaveResult, error) {
	previewPath := videoPath + ".preview.jpg"
	tempPNG := previewPath + ".tmp.png"
	defer os.Remove(tempPNG)

	cmd := exec.Command(s.ffmpegPath, "-i", videoPath, "-ss", "0", "-frames:v", "1", "-f", "image2", "-y", tempPNG)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg preview extraction failed: %w", err)
	}
	img, err := imaging.Open(tempPNG)
	if err != nil {
		return nil, fmt.Errorf("open extracted preview: %w", err)
	}
	resized := imaging.Resize(img, 480, 0, imaging.Lanczos)
	if err := imaging.Save(resized, previewPath, imaging.JPEGQuality(86)); err != nil {
		return nil, fmt.Errorf("save preview: %w", err)
	}
	stat, err := os.Stat(previewPath)
	if err != nil {
		return nil, err
	}
	bounds := resized.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	return &MediaVariantSaveResult{
		Filename:    filepath.Base(previewPath),
		StoragePath: previewPath,
		MimeType:    "image/jpeg",
		SizeBytes:   stat.Size(),
		Width:       &width,
		Height:      &height,
	}, nil
}
```
Change needed: replace literal `"0"` with a computed `fmt.Sprintf("%.2f", durationSeconds*0.35)`, which requires
probing duration first (D-05). This function is called unconditionally from `SaveUpload` for every video kind
(line 343-347: `if strings.HasPrefix(detectedMime, "video/") && s.ffmpegPath != "" { ... }`) — no call-site change
needed, only the internal offset computation.

**Duration-probing pattern to add, copied from a different file** (`backend/internal/handlers/media_upload_video.go` lines 181-205, `getVideoMetadata`):
```go
func (h *MediaUploadHandler) getVideoMetadata(videoPath string) (width, height int, duration float64, err error) {
	ffprobePath := strings.Replace(h.ffmpegPath, "ffmpeg", "ffprobe", 1)
	cmd := exec.Command(
		ffprobePath,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height,duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	output, err := cmd.Output()
	if err != nil {
		return 0, 0, 0, err
	}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) >= 2 {
		width, _ = strconv.Atoi(strings.TrimSpace(lines[0]))
		height, _ = strconv.Atoi(strings.TrimSpace(lines[1]))
		if len(lines) >= 3 {
			duration, _ = strconv.ParseFloat(strings.TrimSpace(lines[2]), 64)
		}
	}
	return width, height, duration, nil
}
```
`MediaService` has no `ffprobePath` field today (only `ffmpegPath`, set in `NewMediaService`, lines 58-91) —
either derive it inline the same way (`strings.Replace(s.ffmpegPath, "ffmpeg", "ffprobe", 1)`) or thread
`SegmentRenderFFprobePath` through the constructor (confirmed present in config at
`backend/internal/config/config.go:128`).

**Arbitrary-offset frame extraction pattern** (`media_upload_video.go` lines 153-179, `extractVideoThumbnail` —
note the `%.2f`-formatted `-ss` argument, the generalization target):
```go
func (h *MediaUploadHandler) extractVideoThumbnail(videoPath, outputPath string, timeSeconds float64) error {
	tempPNG := outputPath + ".tmp.png"
	defer os.Remove(tempPNG)

	cmd := exec.Command(
		h.ffmpegPath,
		"-i", videoPath,
		"-ss", fmt.Sprintf("%.2f", timeSeconds),
		"-frames:v", "1",
		"-f", "image2",
		"-y",
		tempPNG,
	)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg frame extraction failed: %w", err)
	}
	// imaging.Open / imaging.Resize / imaging.Save ...
}
```

---

### `backend/internal/repository/theme_segment_preview.go` (NEW — shared resolution + write helper)

**Analog A (visibility/review gate to replicate, not reinvent):** `backend/internal/repository/release_detail_public_repository_helpers.go` lines 114-118, `countImagesByCategory`:
```go
func (r *ReleaseDetailPublicRepository) countImagesByCategory(ctx context.Context, releaseVersionID int64) (PublicReleaseImageCategoryTotals, error) {
	var out PublicReleaseImageCategoryTotals
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FILTER(WHERE rvm.category='screenshot'), COUNT(*) FILTER(WHERE rvm.category='typesetting_karaoke'), COUNT(*) FILTER(WHERE rvm.category='fun_outtake'), COUNT(*) FILTER(WHERE rvm.category='other') FROM release_version_media rvm JOIN media_assets ma ON ma.id=rvm.media_asset_id JOIN visibilities v ON v.id=ma.visibility_id JOIN review_statuses rs ON rs.id=ma.review_status_id WHERE rvm.release_version_id=$1 AND rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'`, releaseVersionID).Scan(&out.Screenshot, &out.TypesettingKaraoke, &out.FunOuttake, &out.Other)
	return out, err
}
```
The clause `ma.status='ready' AND v.name='public' AND rs.code='approved'` is THE canonical public-visibility
gate for `media_assets` in this codebase (`JOIN visibilities v ON v.id=ma.visibility_id`, `JOIN review_statuses
rs ON rs.id=ma.review_status_id`) — reuse this exact join shape for the "pick release image" candidate query and
for resolving manual/auto preview assets (both must additionally check `ma.status='ready'`).

**Analog B (current ad-hoc preview resolution being replaced — read before writing the new shared fragment):**
`release_detail_public_repository_helpers.go` line 140, current `loadReleaseSegments` query (the `LEFT JOIN
theme_segment_playback_sources src ... LEFT JOIN media_assets preview_asset ... LEFT JOIN media_files
preview_file ON ... variant='thumb'` chain) — this exact chain must be deleted and replaced by joins against
`theme_segments.preview_media_asset_id`/`auto_preview_media_asset_id` instead.

**Analog C (the exact list-of-assigned-release-versions call to reuse for ownership checks):**
`backend/internal/repository/theme_segment_assignments.go:406`:
```go
func (r *AdminContentRepository) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error)
```
Already called from `AttachSegmentLibraryAsset` (`admin_content_anime_theme_segments.go:725`) for a related
purpose (render invalidation fan-out) — the new preview-picker endpoint and the new shared fallback-resolution
logic both need this same list.

**media_files variant join convention** (confirmed in `loadReleaseSegments`, line 140: `preview_file.variant='thumb'`
and in `UploadSegmentAsset`, line 851/861: `"original"` for the primary file, `"thumb"` for a resized variant) —
when creating the new preview `media_assets` row, insert at minimum an `"original"` `media_files` row
(`h.mediaRepo.InsertMediaFile(ctx, asset.ID, "original", storagePath, sizeBytes)`), matching
`UploadSegmentAsset`'s own pattern (lines 851-859).

---

### `backend/internal/repository/admin_content_anime_themes.go` (CHANGED — hydration)

**Analog:** same file's own hydration pattern, `hydrateSegmentPlaybackMetadata` (starts line 1202) and
`hydrateSegmentLibraryMetadata` (starts line 1295) — both already follow the shape "take a `*models.AdminThemeSegment`,
run one extra query, set fields on it," called from both `ListAnimeSegments` (via
`hydrateSegmentPlaybackMetadataList`/`hydrateSegmentLibraryMetadataList`, lines 1175-1191) and `loadSegmentByID`
(lines 1143-1148). The new `preview_url`/`preview_source` hydration should follow this exact call shape — a new
`hydrateSegmentPreviewMetadata`/`hydrateSegmentPreviewMetadataList` pair, called from the same two call sites.

**Exact call sites to add the new hydration step to** (`admin_content_anime_themes.go` lines 1143-1148, inside
`loadSegmentByID`):
```go
	if err := r.hydrateSegmentPlaybackMetadata(ctx, &seg, currentReleaseVersionID); err != nil {
		return nil, err
	}
	if err := r.hydrateSegmentLibraryMetadata(ctx, &seg); err != nil {
		return nil, err
	}
	// [NEW] if err := r.hydrateSegmentPreviewMetadata(ctx, &seg, currentReleaseVersionID); err != nil { return nil, err }
```
And the equivalent list-hydration call inside `ListAnimeSegments` (verify exact line at plan time — RESEARCH.md
and this verification agree the function body runs from line 414, with existing
`hydrateSegmentPlaybackMetadataList`/`hydrateSegmentLibraryMetadataList`-style calls after the main row scan).

---

### `backend/internal/repository/release_detail_public_repository_helpers.go` (CHANGED — `loadReleaseSegments`)

**Analog:** itself — current query must drop the `theme_segment_playback_sources`/`preview_asset`/`preview_file`
join chain (line 140) and resolve `item.PreviewURL` via the new shared helper instead. The surrounding scan loop
(lines 148-162) and `publicMediaURLForPath` call (line 158) stay structurally the same — only the SQL source of
`previewPath` changes.

**Exact current query + scan loop to modify** (`release_detail_public_repository_helpers.go` lines 140-162):
```go
func (r *ReleaseDetailPublicRepository) loadReleaseSegments(ctx context.Context, animeID, groupID, releaseVersionID int64, version, episodeNumber string, contributors []PublicReleaseContributor) ([]PublicReleaseSegment, error) {
	rows, err := r.db.Query(ctx, `SELECT ts.id, ..., preview_file.path FROM theme_segment_assignments tsa
		JOIN theme_segments ts ON ts.id=tsa.theme_segment_id
		...
		LEFT JOIN theme_segment_playback_sources src ON src.theme_segment_id=ts.id AND src.release_version_id=tsa.release_version_id
		LEFT JOIN media_assets preview_asset ON preview_asset.id=src.media_asset_id AND preview_asset.status='ready'
		LEFT JOIN media_files preview_file ON preview_file.media_id=preview_asset.id AND preview_file.variant='thumb' AND preview_file.status='ready'
		...
		WHERE tsa.release_version_id=$1 ORDER BY ts.start_time NULLS LAST,ts.id`, releaseVersionID)
	// ...
	for rows.Next() {
		var item PublicReleaseSegment
		var previewPath *string
		if err := rows.Scan(&item.ThemeSegmentID, ..., &previewPath); err != nil { return nil, err }
		if previewPath != nil {
			item.PreviewURL = publicMediaURLForPath(*previewPath, r.mediaStorageDir)
		}
		items = append(items, item)
	}
```
**D-09 requirement:** this must call the SAME shared resolution helper (new `theme_segment_preview.go`) as
`ListAnimeSegments`/`loadSegmentByID`, not an independently-written SQL fragment, to guarantee admin and public
agree on `preview_url` for the same segment.

---

### `backend/cmd/migrate-preview-backfill/main.go` (NEW — backfill binary)

**Analog:** `backend/cmd/migrate-covers/main.go` (391 lines total) — mirror its exact shape.

**Config/env/stats struct pattern** (`migrate-covers/main.go` lines 21-58):
```go
type Config struct {
	DBConnString   string
	CoverSourceDir string
	MediaTargetDir string
	ThumbWidth     int
	DryRun         bool
	SkipExisting   bool
}

type MigrationStats struct {
	TotalFiles   int
	ProcessedOK  int
	Skipped      int
	Failed       int
	NoAnimeMatch int
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	config := Config{
		DBConnString:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable"),
		CoverSourceDir: getEnv("COVER_SOURCE_DIR", "frontend/public/covers"),
		MediaTargetDir: getEnv("MEDIA_TARGET_DIR", "media"),
		ThumbWidth:     300,
		DryRun:         getEnvBool("DRY_RUN", false),
		SkipExisting:   getEnvBool("SKIP_EXISTING", true),
	}
	if config.DryRun {
		log.Println("========================================")
		log.Println("DRY RUN MODE - No changes will be made")
		log.Println("========================================")
	}
	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, config.DBConnString)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	stats, err := runMigration(ctx, dbpool, config)
	if err != nil {
		log.Fatalf("Migration failed: %v\n", err)
	}
	// ... print summary from stats struct
}
```
D-13 requires idempotency ("running twice produces no duplicate assets") — use the `SkipExisting`-flag pattern
(check `auto_preview_media_asset_id IS NULL` before processing a segment, same intent as `SkipExisting` here
checking for already-migrated covers) and extract the core loop into a separate, testable package function
(RESEARCH.md's own Wave 0 Gaps note: `migrate-covers` itself has no `_test.go` — don't repeat that gap for the
new binary; put the idempotent core in an importable function, not only inside `main()`).

---

### `database/migrations/0177_theme_segment_preview_images.{up,down}.sql` (NEW)

**Analog:** `database/migrations/0176_release_version_story_order_trigger_alignment.{up,down}.sql` for the
numbering/file-pair convention (confirmed: 0176 is the current highest, so 0177 is correctly free) — see its
header-comment style ("-- Migration 0176: align the legacy runtime story-order trigger with item_type.").

**FK nullability/`ON DELETE` convention to copy:** `media_assets`-referencing FKs in this schema use either
`ON DELETE SET NULL` (for a single pointer that should just become empty, e.g. a preview reference) or `ON
DELETE RESTRICT` (migration 0059, `release_version_media.media_asset_id`, since that row's whole existence is
tied to the asset). For `theme_segments.preview_media_asset_id`/`auto_preview_media_asset_id`, RESEARCH.md's own
recommendation (`BIGINT REFERENCES media_assets(id) ON DELETE SET NULL`) is correct and consistent with this
convention — a segment surviving with a null preview pointer is the desired degrade-gracefully behavior,
whereas deleting the segment must NOT cascade-delete the `media_assets` row (same RESTRICT-by-default reasoning
as 0059, since a `media_assets` row can be referenced from more than one place).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImageSection.tsx` (NEW)

**Analog A (dropzone interaction — per UI-SPEC Design-Entscheidung 1, the correct analog, NOT the older
`<label htmlFor>` pattern in the same folder):** `frontend/src/components/admin/MediaUploadCore.tsx`:
```tsx
// MediaUploadCore.tsx lines 118-131 — hidden input + Button + dropzone div pattern
<div
  className={dropzoneClassName}
  role="button"
  tabIndex={disabled ? -1 : 0}
  aria-label={dropzoneAriaLabel}
  aria-busy={busy}
  onClick={() => (!disabled && !busy ? inputRef.current?.click() : undefined)}
  onKeyDown={onDropzoneKeyDown}
  onDragOver={onDragOver}
  onDragEnter={onDragEnter}
  onDragLeave={onDragLeave}
  onDrop={onDrop}
  aria-disabled={disabled || busy}
>
  {/* ...preview or empty-state content... */}
</div>
```
```tsx
// MediaUploadCore.tsx lines 197-231 — Button triggers hidden file input via ref, never a native label/htmlFor
<Button
  type="button"
  variant="secondary"
  size="sm"
  onClick={() => inputRef.current?.click()}
  disabled={disabled || busy}
  aria-label={`${title} ${hasValue ? 'ersetzen' : 'hochladen'}`}
  leftIcon={hasValue ? <RefreshCw size={14} /> : <ImagePlus size={14} />}
>
  {uploadActionLabel}
</Button>
{/* ... */}
<input
  ref={inputRef}
  className={styles.fileInput}
  type="file"
  accept={acceptedMime}
  aria-label={`${title} Datei auswählen`}
  onChange={onFileInputChange}
/>
```
**Explicitly do NOT copy** `SegmentAssetSection.tsx`'s own neighboring `<label htmlFor="segment-asset-file">`
native pattern (lines 182-188, 210-216) or its native `<select id="seg-source-type">` (lines 68-76) — CLAUDE.md's
closest-analog clause forbids continuing a weaker native-element neighbor pattern when a stronger,
primitive-conformant analog (`MediaUploadCore`) exists in the same project, and this is explicitly called out in
UI-SPEC Design-Entscheidung 1.

**Analog B (panel-section placement/props convention, i.e. where this new file sits structurally):**
`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx` — a props-driven section
component receiving `editingSegment`, loading/error/busy booleans, and callback props, rendered conditionally
inside `SegmentEditPanel.tsx`. Follow this exact prop-naming convention (`isUploading`, `uploadError`,
`onAssetUpload`, etc. → analogous `isUploadingPreview`/`previewUploadError`/`onPreviewUpload` etc.).

**Section header typography to match** (`SegmenteTab.module.css:16-22`, `.assetSectionHeader`) and help-text
style (`SegmenteTab.module.css:444-449`, `.sourceHelpText`) — per UI-SPEC's own typography mapping, reuse these
exact existing CSS rules' visual weight (13px/600 heading, 12px/400 help text) in the new
`SegmentPreviewImageSection.module.css`, rather than inventing new sizes.

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImagePicker.tsx` (NEW)

**Analog:** no exact grid-picker-in-modal precedent exists in this folder (role-match only) — compose from
`@/components/ui` primitives (`Modal`, `LoadingState`, `ErrorState`, `EmptyState`, `Button`) per UI-SPEC's own
screen catalog (Screen 2). Tile buttons: per UI-SPEC Design-Entscheidung 11, each tile is a
`Button variant="subtle"` wrapping an `<img>` plus caption — not a raw clickable `<div>`.

**No source file to copy a tile-grid from** — this is the one new frontend file in this phase without a direct
structural analog in-repo; follow UI-SPEC's Screen 2 ASCII layout verbatim (`172-UI-SPEC.md` lines 346-361) and
the existing `Modal`/`EmptyState`/`ErrorState`/`LoadingState` primitive APIs (see Shared Patterns below).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts` (NEW)

**Analog:** `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts` (176 lines,
full file is the template) — copy its exact shape: local `useState` per async operation
(`isUploading`/`uploadError`, `isLoadingReuseCandidates`/`reuseError`, `isAttachingReuse`), one `async function
handle...()` per action, each wrapped in try/catch/finally that sets a dedicated error state and always
`await reload()` + `setEditingSegment(res.data)` on success.

**Exact upload-handler shape to copy** (`useSegmentAssetHandlers.ts` lines 93-108):
```typescript
async function handleAssetUpload(file: File) {
  if (!animeId || !editingSegment || !hasAuthSession) return
  setIsUploading(true)
  setUploadError(null)
  try {
    const res = await uploadSegmentAsset(animeId, editingSegment.id, file, undefined, releaseVariantId)
    // Reload so table + panel get fresh data
    await reload()
    // Refresh the editing segment from reloaded list
    setEditingSegment(res.data)
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
  } finally {
    setIsUploading(false)
  }
}
```
Apply the same shape for `handlePreviewUpload(file)`, `handleOpenPicker()`/`handleLoadPickerCandidates()`,
`handleAttachPickerCandidate(candidate)`, and `handleResetToAutomatic()` — reusing
`uploadSegmentPreviewImage`/`getSegmentPreviewImageCandidates`/`attachSegmentPreviewImage`/
`resetSegmentPreviewImage` from the new `api.ts` functions (see below) in place of
`uploadSegmentAsset`/`getSegmentLibraryCandidates`/`attachSegmentLibraryAsset`.

**Picker-candidate-loading shape to copy** (`useSegmentAssetHandlers.ts` lines 55-91, the `useEffect` that loads
`reuseCandidates` whenever relevant form state changes) — the new picker's candidate list should load on-demand
when the picker modal opens (not via `useEffect` on every form change, since this phase's picker is explicitly
modal-triggered per UI-SPEC Screen 2, not inline), but the fetch/catch/finally body structure is identical.

**No `useConfirmDialog` needed** (per UI-SPEC Design-Entscheidung 9: reset and attach are both reversible, no
confirm dialog) — unlike `useSegmentAssetHandlers.ts`'s own `handleAssetDelete` (lines 110-133), which DOES use
`confirm({...})` because deletion is destructive. Do not copy the `confirm(...)` call for the new handlers.

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (CHANGED, additive)

**Analog:** itself — exact insertion point confirmed live at lines 365-388:
```tsx
<SegmentPlaybackPreviewSection
  editingSegment={editingSegment}
  previewStreamHref={previewStreamHref ?? null}
  renderStatus={renderStatus}
/>

{/* [NEW] <SegmentPreviewImageSection editingSegment={editingSegment} ... /> goes HERE,
    only when editingSegment != null (UI-SPEC Design-Entscheidung 3) */}

<SegmentAssetSection
  formState={formState}
  onFormChange={onFormChange}
  editingSegment={editingSegment}
  isSaving={isSaving}
  isUploading={isUploading}
  isDeletingAsset={isDeletingAsset}
  isLoadingReuseCandidates={isLoadingReuseCandidates}
  isAttachingReuse={isAttachingReuse}
  uploadError={uploadError}
  reuseCandidates={reuseCandidates}
  reuseError={reuseError}
  pendingUploadFile={pendingUploadFile}
  onPendingUploadFileChange={onPendingUploadFileChange}
  onAssetUpload={onAssetUpload}
  onAssetDelete={onAssetDelete}
  onAttachReuseCandidate={onAttachReuseCandidate}
/>
```
File is 402 lines at a 450-line budget (~48 lines headroom) — additive props-passthrough for one new component
tag plus its prop list stays well within budget (confirmed by RESEARCH.md and independently re-counted here).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (CHANGED, additive — `karaFooter` link)

**Analog:** itself — exact current block, live-verified at lines 523-526:
```tsx
<span className={styles.karaFooter}>
  <span className={styles.karaStoryLabel}>Story</span>
  <span className={styles.karaOrderHint}>Per Drag-and-drop verschieben</span>
</span>
```
UI-SPEC's required change (Screen 3, `172-UI-SPEC.md` lines 366-374) adds exactly one `Button` sibling inside
this span:
```tsx
<span className={styles.karaFooter}>
  <span className={styles.karaStoryLabel}>Story</span>
  <span className={styles.karaOrderHint}>Per Drag-and-drop verschieben</span>
  <Button type="button" variant="text" size="sm" href={`?tab=segmente&segmentId=${segment.id}`}
          aria-label={`Vorschaubild für ${segmentLabel} ändern`}>
    Vorschaubild ändern →
  </Button>
</span>
```
File is 826 lines — D-02 explicitly caps the allowed change here at "at most one link," so this is the entire
diff for this file in this phase; no badge, no new state.

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` (CHANGED — `createKaraStoryItem`)

**Analog:** itself — exact current implementation, live-verified at lines 83-98:
```typescript
export function createKaraStoryItem(
  segment: AdminThemeSegment,
  mediaItems: ReleaseVersionMediaItem[],
  sortOrder: number,
): ReleaseVersionKaraStoryItem {
  const fallback =
    mediaItems.find((item) => item.is_preview_candidate && item.thumbnail_url) ??
    mediaItems.find((item) => item.thumbnail_url)
  return {
    type: 'kara',
    segment,
    sort_order: sortOrder,
    thumbnail_url: fallback?.thumbnail_url ?? null,   // <-- REPLACE with segment.preview_url
    thumbnail_is_fallback: Boolean(fallback),          // <-- REPLACE with segment.preview_source === 'fallback'
  }
}
```
D-10 target shape:
```typescript
export function createKaraStoryItem(
  segment: AdminThemeSegment,
  sortOrder: number,
): ReleaseVersionKaraStoryItem {
  return {
    type: 'kara',
    segment,
    sort_order: sortOrder,
    thumbnail_url: segment.preview_url ?? null,
    thumbnail_is_fallback: segment.preview_source === 'fallback',
  }
}
```
**Call-site impact:** the `mediaItems` parameter is dropped entirely — RESEARCH.md identifies both call sites
needing this signature update: `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:491,500`
(verify exact lines at plan time; both currently pass `nextItems` as the `mediaItems` argument).

---

### `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` (CHANGED — remove fallback)

**Analog:** itself — exact current implementation, live-verified at line 144-145:
```tsx
const renderKara = (segment: PublicReleaseSegment) => {
  const previewUrl = segment.preview_url ?? '/covers/placeholder.jpg'
  return <article ...>
    <div className={styles.karaPreviewWrap}>
      {previewUrl
        ? <Image src={previewUrl} alt={'Preview für ' + segment.name} className={styles.karaPreview} width={640} height={360} unoptimized />
        : <div className={styles.karaPlaceholder} aria-hidden="true" />}
      {/* ... */}
```
D-10 target: drop the `?? '/covers/placeholder.jpg'` fallback entirely —
```tsx
const previewUrl = segment.preview_url
```
— since the backend now guarantees a non-null value (D-10). The `previewUrl ? <Image.../> : <div
className={styles.karaPlaceholder} .../>` conditional can stay as a defensive no-op (it will just never take the
`false` branch in practice) or be simplified; either is acceptable, but no new UI is introduced per UI-SPEC
Screen 4 ("Kein neues UI").

---

### `frontend/src/lib/api.ts` (CHANGED — 4 new functions)

**Analog:** the existing 4 segment-asset functions in the exact same file, immediately preceding the insertion
point, lines 7728-7884 (`getSegmentLibraryCandidates`, `attachSegmentLibraryAsset`, `uploadSegmentAsset`,
`deleteSegmentAsset`). Copy the exact `authorizedFetch`/`parseApiErrorPayload`/`ApiError` error-handling
boilerplate for every new function.

**GET-with-query-params pattern** (`api.ts` lines 7728-7767, `getSegmentLibraryCandidates` — template for
`getSegmentPreviewImageCandidates`):
```typescript
export async function getSegmentLibraryCandidates(
  animeId: number,
  groupId: number,
  kind: string,
  name?: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentLibraryCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("group_id", String(groupId));
  params.set("kind", kind);
  if (name?.trim()) params.set("name", name.trim());
  if (releaseVariantId != null) params.set("release_variant_id", String(releaseVariantId));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/library-candidates?${params.toString()}`,
    { authToken, cache: "no-store" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminSegmentLibraryCandidatesResponse>;
}
```

**POST-JSON pattern** (`api.ts` lines 7769-7808, `attachSegmentLibraryAsset` — template for `attachSegmentPreviewImage` and `resetSegmentPreviewImage`):
```typescript
export async function attachSegmentLibraryAsset(
  animeId: number,
  segmentId: number,
  payload: AdminSegmentLibraryAttachRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null) params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/reuse${qs}`,
    {
      method: "POST",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<{ data: AdminThemeSegment }>;
}
```

**Multipart upload pattern** (`api.ts` lines 7810-7855, `uploadSegmentAsset` — template for `uploadSegmentPreviewImage`):
```typescript
export async function uploadSegmentAsset(
  animeId: number,
  segmentId: number,
  file: File,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (releaseVariantId != null) params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset${qs}`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body: formData,
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<{ data: AdminThemeSegment }>;
}
```

---

### `frontend/src/types/admin.ts` (CHANGED — `AdminThemeSegment` + new candidate type)

**Analog:** itself — exact current interface, live-verified starting line 925:
```typescript
export interface AdminThemeSegment {
  id: number
  theme_id: number
  anime_id: number
  // ...
  playback_media_asset_id?: number | null
  // ... (render_*, library_* fields, all optional with `| null`)
}
```
Add additively, matching the existing optional-field convention (`field?: Type | null`):
```typescript
  preview_url?: string | null
  preview_source?: 'manual' | 'auto' | 'fallback' | null
```
New candidate type (per UI-SPEC's Datenvertrag table, `{ media_asset_id, thumbnail_url, release_version_label }`)
should follow the exact sibling convention of `AdminSegmentLibraryCandidate` (defined nearby in the same file —
grep that interface at plan time for the exact field style to mirror) rather than being invented from scratch.

**`PublicReleaseSegment.preview_url` already exists** (`frontend/src/types/releaseDetail.ts` line 74-83,
confirmed: `preview_url: string | null;` already present) — no new field needed on the public type; only its
backend-side resolution changes, per D-09's note that public does not expose `preview_source`.

---

## Shared Patterns

### Permission gate (`requireSegmentManage`)
**Source:** `backend/internal/handlers/admin_content_anime_theme_segments.go` lines 159-186
**Apply to:** All 4 new backend endpoints (upload, picker-list, attach, reset) — every handler must call
`h.requireSegmentManage(c, releaseVariantID)` after resolving `releaseVariantID` (via
`parseReleaseVariantIDQuery` + `segmentPlaybackVariantID` fallback), exactly as `UploadSegmentAsset`/
`AttachSegmentLibraryAsset`/`DeleteSegmentAsset` already do. Acceptance explicitly requires a 403 test for every
new action ("Ohne Segment-Recht → 403, keine Upload-UI").

### Public-visibility gate for `media_assets`
**Source:** `backend/internal/repository/release_detail_public_repository_helpers.go` lines 114-118 (`countImagesByCategory`)
**Apply to:** the shared preview-resolution helper (manual/auto asset must be `ma.status='ready'`) AND the new
"pick release image" candidate query (`v.name='public' AND rs.code='approved' AND ma.status='ready'`). This is
the single canonical gate in this codebase — do not write a second, slightly different version.

### Media-asset create→file-register→rollback-on-failure sequence
**Source:** `backend/internal/handlers/admin_content_anime_theme_segments.go` lines 816-868 (`UploadSegmentAsset` body)
**Apply to:** the new "upload preview image" endpoint — `mediaService.SaveUpload(...)` → force
`VisibilityCode="public"`/`ReviewStatusCode="approved"` (D-03) → `mediaRepo.CreateMediaAsset` → `mediaRepo.InsertMediaFile(..., "original", ...)`,
with `removeFileQuietly`/`DeleteMediaAsset` rollback on any step's failure, exactly as the existing handler does.

### Error-response shape
**Source:** `backend/internal/handlers/admin_content_anime_theme_segments.go` (throughout, e.g. lines 681-688, 705-717, 824-831)
**Apply to:** all 4 new handlers — `c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "..."}})` for
not-found, `writeInternalErrorResponse(c, "interner serverfehler", err, "<user-facing German message>")` for
unexpected errors, `badRequest(c, "...")` for client input errors. Never a bespoke error envelope shape.

### Frame-extraction + resize (ffmpeg → imaging)
**Source:** `backend/internal/services/media_service.go` lines 356-367 (`saveSegmentVideoPreview`) and
`backend/internal/handlers/media_upload_video.go` lines 157-178 (`extractVideoThumbnail`)
**Apply to:** both D-04 (render-worker hook) and D-05 (upload-path offset fix) — `exec.Command(ffmpegPath, "-i",
path, "-ss", <offset>, "-frames:v", "1", "-f", "image2", "-y", tempPNG)` then `imaging.Open`/`imaging.Resize`/
`imaging.Save`.

### Request-scoped vs. background-worker `ctx` discipline
**Source:** `backend/internal/handlers/segment_render_worker.go` lines 118-119 (comment) and line 120 (`ctx context.Context` parameter)
**Apply to:** the D-04 auto-extraction call inside `executeSegmentRender` — must reuse the function's own `ctx`
parameter (ultimately derived from `context.Background()` in `StartSegmentRenderWorker`), never
`c.Request.Context()`. This distinguishes it from every other new file in this phase, which IS request-scoped.

### `@/components/ui` primitives only (frontend, no native form elements for new code)
**Source:** `frontend/src/components/admin/MediaUploadCore.tsx` (entire file — `Button` + hidden `ref`-driven
`<input type="file">`, no native `<button>`/`<select>`/`<label htmlFor>`)
**Apply to:** every new interactive element in `SegmentPreviewImageSection.tsx`/`SegmentPreviewImagePicker.tsx`
per D-12 and UI-SPEC's "Pflichtregel" — `Button`, `Modal`, `EmptyState`, `ErrorState`, `LoadingState`, `Badge`
from the `@/components/ui` barrel. The only native element permitted is the hidden, `ref`-triggered
`<input type="file">`, matching `MediaUploadCore.tsx`'s own established exception.

### Migration numbering/pairing convention
**Source:** `database/migrations/0176_release_version_story_order_trigger_alignment.{up,down}.sql`
**Apply to:** the new `0177_theme_segment_preview_images.{up,down}.sql` pair — confirmed 0177 is free (0176 is
current highest as of 2026-10-01).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImagePicker.tsx` (modal grid-of-tiles content) | component | request-response | No existing component in this codebase composes `Modal` + a responsive image-tile grid + per-tile attach-on-click. The underlying primitives (`Modal`, `Button variant="subtle"`, `LoadingState`, `ErrorState`, `EmptyState`) all exist and are documented in Shared Patterns above, but their specific composition into a "pick one image from a grid" picker is new to this codebase. Planner should follow `172-UI-SPEC.md`'s Screen 2 layout (lines 346-361) directly rather than searching for a closer in-repo precedent — none exists. |

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/services/`, `backend/internal/repository/`,
`backend/cmd/`, `database/migrations/`, `frontend/src/app/admin/episode-versions/[versionId]/edit/`,
`frontend/src/components/admin/`, `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`,
`frontend/src/lib/`, `frontend/src/types/`
**Files scanned (read/grepped directly this session):** `admin_content_anime_theme_segments.go`,
`media_service.go`, `segment_render_worker.go`, `media_upload_video.go`, `admin_content_anime_themes.go`,
`release_detail_public_repository_helpers.go`, `release_detail_public_repository.go`, `segment_stream.go`,
`theme_segment_assignments.go`, `theme_segment_render_cache.go`, `migrate-covers/main.go`,
`admin-content.yaml`, `0176_release_version_story_order_trigger_alignment.up.sql`, `useSegmentAssetHandlers.ts`,
`SegmentAssetSection.tsx`, `SegmentEditPanel.tsx`, `MediaUploadCore.tsx`, `ReleaseVersionMediaSection.tsx`,
`ReleaseVersionMediaSection.helpers.tsx`, `ReleaseGallery.tsx`, `api.ts` (segment-asset functions section),
`types/admin.ts` (`AdminThemeSegment`), `types/releaseDetail.ts` (`PublicReleaseSegment`)
**Pattern extraction date:** 2026-10-01
