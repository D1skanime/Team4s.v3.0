package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type releaseVersionStoryOrderRequestItem struct {
	Type           string `json:"type"`
	MediaID        *int64 `json:"media_id"`
	ThemeSegmentID *int64 `json:"theme_segment_id"`
	SortOrder      int    `json:"sort_order"`
}

type rvmReorderBody struct {
	Items []releaseVersionStoryOrderRequestItem `json:"items"`
}

// ReorderReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media/reorder.
//
// The route remains the existing release-version media reorder seam; its request now carries
// typed media/Kara story items while the permission gate stays release-version scoped.
func (h *AdminContentHandler) ReorderReleaseVersionMedia(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaReorder, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.reorder.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaReorder, result)
		writePermissionDenied(c, result)
		return
	}

	var body rvmReorderBody
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "items array fehlt oder leer"}})
		return
	}

	reorderItems := make([]repository.ReleaseVersionStoryOrderItem, len(body.Items))
	seenItems := make(map[repository.ReleaseVersionStoryOrderKey]struct{}, len(body.Items))
	seenOrders := make(map[int]struct{}, len(body.Items))
	for i, item := range body.Items {
		if item.Type != string(models.ReleaseVersionStoryItemMedia) && item.Type != string(models.ReleaseVersionStoryItemKara) {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültiger story-item-typ"}})
			return
		}
		if (item.Type == string(models.ReleaseVersionStoryItemMedia)) == (item.MediaID == nil) ||
			(item.Type == string(models.ReleaseVersionStoryItemKara)) == (item.ThemeSegmentID == nil) ||
			(item.Type == string(models.ReleaseVersionStoryItemMedia) && item.ThemeSegmentID != nil) ||
			(item.Type == string(models.ReleaseVersionStoryItemKara) && item.MediaID != nil) {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "story-item-verweis passt nicht zum typ"}})
			return
		}
		if (item.MediaID != nil && *item.MediaID <= 0) || (item.ThemeSegmentID != nil && *item.ThemeSegmentID <= 0) {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige story-item-id"}})
			return
		}
		if item.SortOrder < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "sort_order muss nicht-negativ sein"}})
			return
		}
		if _, exists := seenOrders[item.SortOrder]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "sort_order darf nicht doppelt vorkommen"}})
			return
		}
		seenOrders[item.SortOrder] = struct{}{}
		reorderItems[i] = repository.ReleaseVersionStoryOrderItem{
			ReleaseVersionID:      versionID,
			ItemType:              models.ReleaseVersionStoryItemType(item.Type),
			ReleaseVersionMediaID: item.MediaID,
			ThemeSegmentID:        item.ThemeSegmentID,
			SortOrder:             item.SortOrder,
		}
		key := repository.StoryOrderKeyForRequest(reorderItems[i])
		if _, exists := seenItems[key]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "story-item darf nicht doppelt vorkommen"}})
			return
		}
		seenItems[key] = struct{}{}
	}

	if _, err := h.mediaRepo.ListReleaseVersionStoryOrder(c.Request.Context(), versionID); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktuelle Story-Reihenfolge konnte nicht geladen werden.")
		return
	}
	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if err := h.mediaRepo.ReorderReleaseVersionStoryOrder(c.Request.Context(), tx, versionID, reorderItems); err != nil {
		if errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere story-items gehoeren nicht zu dieser release version"}})
			return
		}
		if strings.Contains(err.Error(), "complete") {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "die vollständige story-liste ist erforderlich"}})
			return
		}
		if strings.Contains(err.Error(), "unsupported") || strings.Contains(err.Error(), "more than once") {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige story-reihenfolge"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Reorder fehlgeschlagen.")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	if h.auditLogRepo != nil {
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &identity.AppUserID,
			ActorLegacyUserID: &identity.UserID,
			EventType:         "release_version_media.reordered",
			TargetType:        "release_version",
			TargetID:          &versionID,
			Action:            string(permissions.ActionReleaseVersionMediaReorder),
			Outcome:           "allowed",
			Payload:           map[string]any{"items": len(body.Items)},
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
