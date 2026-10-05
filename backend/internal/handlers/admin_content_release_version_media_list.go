package handlers

import (
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListReleaseVersionMedia handles GET /api/v1/admin/release-versions/:versionId/media.
// Returns scoped, non-deleted media for a release version with populated URLs.
func (h *AdminContentHandler) ListReleaseVersionMedia(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	items, err := h.mediaRepo.ListReleaseVersionMedia(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Liste konnte nicht geladen werden.")
		return
	}
	if items == nil {
		items = make([]repository.ReleaseVersionMediaItem, 0)
	}
	items = filterReleaseVersionMediaItemsForActor(items, identity.UserID, result)

	updateResult, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if err := h.annotateReleaseVersionMediaItemPermissionsBatch(c, actor, identity.UserID, items, updateResult); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
	}

	storyOrder, err := h.mediaRepo.ListReleaseVersionStoryOrder(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Reihenfolge konnte nicht geladen werden.")
		return
	}
	storyOrderResponse := make([]gin.H, 0, len(storyOrder))
	for _, item := range storyOrder {
		entry := gin.H{
			"type":       string(item.ItemType),
			"sort_order": item.SortOrder,
		}
		if item.ReleaseVersionMediaID != nil {
			entry["media_id"] = *item.ReleaseVersionMediaID
		}
		if item.ThemeSegmentID != nil {
			entry["theme_segment_id"] = *item.ThemeSegmentID
		}
		storyOrderResponse = append(storyOrderResponse, entry)
	}

	c.JSON(http.StatusOK, gin.H{"data": items, "story_order": storyOrderResponse})
}

func (h *AdminContentHandler) loadReleaseVersionMediaResponseItem(
	ctx *gin.Context,
	actor permissions.Actor,
	currentLegacyUserID int64,
	versionID, relationID int64,
) (repository.ReleaseVersionMediaItem, error) {
	items, err := h.mediaRepo.ListReleaseVersionMedia(ctx.Request.Context(), versionID)
	if err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}
	updateResult, err := h.permissionSvc.CanForReleaseVersion(ctx.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}
	if err := h.annotateReleaseVersionMediaItemPermissions(ctx, actor, currentLegacyUserID, items, updateResult); err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
		if items[i].ID == relationID {
			return items[i], nil
		}
	}

	return repository.ReleaseVersionMediaItem{}, repository.ErrNotFound
}
