package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	_ "image/png"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/disintegration/imaging"
	"github.com/gin-gonic/gin"
	_ "golang.org/x/image/webp"
)

type rvmImageMetadata struct {
	Width     int
	Height    int
	GIFFrames int
}

type rvmFileResult struct {
	ClientFileName        string `json:"client_file_name"`
	Status                string `json:"status"` // "ready" or "failed"
	MediaAssetID          *int64 `json:"media_asset_id,omitempty"`
	ReleaseVersionMediaID *int64 `json:"release_version_media_id,omitempty"`
	SourceRevision        *int64 `json:"source_revision,omitempty"`
	ThumbnailURL          string `json:"thumbnail_url,omitempty"`
	DisplayURL            string `json:"display_url,omitempty"`
	ErrorCode             string `json:"error_code,omitempty"`
	Message               string `json:"message,omitempty"`
}

// imageExtFromMimeRVM returns the file extension for a MIME type used in release-version media uploads.
func imageExtFromMimeRVM(mimeType string) string {
	switch mimeType {
	case "image/gif":
		return "gif"
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func inspectRVMImage(data []byte, mimeType string) (*rvmImageMetadata, error) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode config: %w", err)
	}

	meta := &rvmImageMetadata{
		Width:     cfg.Width,
		Height:    cfg.Height,
		GIFFrames: 1,
	}
	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		if err != nil {
			return nil, fmt.Errorf("decode gif: %w", err)
		}
		meta.GIFFrames = len(decoded.Image)
	}

	return meta, nil
}

// generateRVMThumbnail creates a static JPEG thumbnail from image data.
// Animated GIFs/WebP keep their original animation in storage; the thumbnail uses frame 0.
// vipsThumbnailPath is required for animated WebP (D-20/D-21): golang.org/x/image/webp cannot
// decode ANMF animation frames at all (unlike GIF, which the stdlib fully supports via
// gif.DecodeAll), so frame-0 extraction goes through vipsthumbnail instead.
func generateRVMThumbnail(data []byte, mimeType string, vipsThumbnailPath string) ([]byte, int, int, error) {
	if mimeType == "image/webp" && services.IsAnimatedWebPData(data) {
		jpegData, w, h, err := services.ExtractFirstFrameViaVips(vipsThumbnailPath, data, ".webp", rvmThumbnailWidth)
		if err != nil {
			return nil, 0, 0, fmt.Errorf("animiertes webp frame 0 laden: %w", err)
		}
		return jpegData, w, h, nil
	}

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

// UploadReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media.
// Accepts multipart/form-data with: category (string), files[] (one or more files).
// Each file is processed independently - a failure on one file does not affect others.
// Response: {"results": [...]} with one entry per input file.
func (h *AdminContentHandler) UploadReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.upload.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaUpload, result)
		writePermissionDenied(c, result)
		return
	}

	exists, err := h.mediaRepo.ReleaseVersionExistsForRVM(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version konnte nicht geprüft werden.")
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{
			"message":    "release version nicht gefunden",
			"error_code": "RELEASE_VERSION_NOT_FOUND",
		}})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "multipart form fehlt"}})
		return
	}

	category := strings.TrimSpace(c.PostForm("category"))
	if !rvmValidCategories[category] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "ungültige kategorie",
			"error_code": "INVALID_CATEGORY",
		}})
		return
	}

	participatingGroups, err := h.mediaRepo.ListReleaseVersionGroupIDs(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Herkunftsgruppen konnten nicht geladen werden.")
		return
	}
	actorGroups, err := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(c.Request.Context(), versionID, identity.UserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Herkunftsgruppe konnte nicht geprüft werden.")
		return
	}
	allowedGroups := actorGroups
	if actor.IsPlatformAdmin {
		allowedGroups = participatingGroups
	}
	if len(allowedGroups) != 1 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "Die Herkunftsgruppe konnte nicht eindeutig serverseitig bestimmt werden.",
			"error_code": "SOURCE_GROUP_UNRESOLVED",
		}})
		return
	}
	sourceGroupID := allowedGroups[0]
	if actor.IsPlatformAdmin {
		memberGroups, memberErr := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(
			c.Request.Context(), versionID, identity.UserID,
		)
		if memberErr != nil {
			writeInternalErrorResponse(c, "interner serverfehler", memberErr, "Herkunftsgruppe konnte nicht geprüft werden.")
			return
		}
		if len(memberGroups) != 1 || memberGroups[0] != sourceGroupID {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "Für die Einreichung fehlt eine eindeutige reale Member-Zuordnung.",
				"error_code": "SOURCE_ATTRIBUTION_REQUIRED",
			}})
			return
		}
	}

	files := form.File["files[]"]
	if len(files) == 0 {
		files = form.File["files"]
	}
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "keine dateien hochgeladen"}})
		return
	}
	if len(files) > rvmMaxFilesPerUpload {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("zu viele dateien: max %d", rvmMaxFilesPerUpload),
			"error_code": "TOO_MANY_FILES",
		}})
		return
	}

	maxSortOrder, err := h.mediaRepo.GetMaxRVMSortOrder(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Sort-Order konnte nicht ermittelt werden.")
		return
	}

	uploadedByUserID := identity.UserID
	results := make([]rvmFileResult, 0, len(files))

	for i, fileHeader := range files {
		sortOrder := maxSortOrder + (i+1)*10
		result := h.processOneRVMFile(
			c, fileHeader, versionID, sourceGroupID, category, sortOrder,
			uploadedByUserID, identity.AppUserID,
		)
		results = append(results, result)
		if result.Status == "ready" && result.ReleaseVersionMediaID != nil {
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID:    &identity.AppUserID,
				ActorLegacyUserID: &identity.UserID,
				EventType:         "release_version_media.uploaded",
				TargetType:        "release_version_media",
				TargetID:          result.ReleaseVersionMediaID,
				Action:            string(permissions.ActionReleaseVersionMediaUpload),
				Outcome:           "allowed",
				Payload:           map[string]any{"version_id": versionID, "category": category, "client_file_name": result.ClientFileName},
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// buildRVMPublicURL converts a storage path to a /media/... public URL.
// Storage path example: /app/media/release-version/3/uuid/original.png
// Public URL example:   /media/release-version/3/uuid/original.png
func (h *AdminContentHandler) buildRVMPublicURL(storagePath string) string {
	rel := strings.TrimPrefix(storagePath, h.mediaStorageDir)
	rel = strings.TrimPrefix(rel, "/")
	rel = strings.TrimPrefix(rel, "\\")
	rel = strings.ReplaceAll(rel, "\\", "/")
	return "/media/" + rel
}
