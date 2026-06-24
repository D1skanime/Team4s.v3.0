package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// DeleteFansubMedia löscht die Mediendatei (Logo oder Banner) einer Fansub-Gruppe.
func (h *FansubHandler) DeleteFansubMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	if mediaID, parseErr := strconv.ParseInt(c.Param("kind"), 10, 64); parseErr == nil && mediaID > 0 {
		h.deleteFansubGroupMedia(c, identity, actor, fansubID, mediaID)
		return
	}
	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.delete.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupEdit, result)
		writePermissionDenied(c, result)
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfügbar"}})
		return
	}

	kind, err := parseMediaKind(c.Param("kind"))
	if err != nil {
		badRequest(c, "ungültiger media-kind")
		return
	}

	previousMediaID, err := h.mediaRepo.ClearFansubMedia(c.Request.Context(), fansubID, kind)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub media delete: clear failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "löschen fehlgeschlagen"}})
		return
	}

	if previousMediaID != nil {
		h.tryCleanupUnusedMedia(c.Request.Context(), *previousMediaID)
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) deleteFansubGroupMedia(c *gin.Context, identity middleware.AuthIdentity, actor permissions.Actor, fansubID int64, mediaID int64) {
	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaDelete, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.delete.denied", &fansubID, "fansub_group_media", &mediaID, permissions.ActionFansubGroupMediaDelete, result)
		writePermissionDenied(c, result)
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfügbar"}})
		return
	}
	userID := identity.UserID
	if err := h.mediaRepo.SoftDeleteFansubGroupMedia(c.Request.Context(), fansubID, mediaID, &userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "medium nicht gefunden oder nicht in dieser gruppe"}})
			return
		}
		log.Printf("fansub group media delete: soft delete failed (user_id=%d, fansub_id=%d, media_id=%d): %v", identity.UserID, fansubID, mediaID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "löschen fehlgeschlagen"}})
		return
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "fansub_group_media.deleted",
		ScopeType:         permissions.ScopeTypeGroup,
		ScopeID:           &fansubID,
		TargetType:        "fansub_group_media",
		TargetID:          &mediaID,
		Action:            string(permissions.ActionFansubGroupMediaDelete),
		Outcome:           "allowed",
	})
	c.Status(http.StatusNoContent)
}
