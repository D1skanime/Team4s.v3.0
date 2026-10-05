package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// DeleteReleaseVersionMedia handles DELETE /api/v1/admin/release-versions/:versionId/media/:relationId.
func (h *AdminContentHandler) DeleteReleaseVersionMedia(c *gin.Context) {
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
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersionMediaDelete(c.Request.Context(), actor, relationID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.delete.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaDelete, result)
		writePermissionDenied(c, result)
		return
	}

	relationMeta, err := h.mediaRepo.GetReleaseVersionMediaRelation(c.Request.Context(), relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geladen werden.")
		return
	}
	if relationMeta.ReleaseVersionID != versionID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation gehoert nicht zu dieser release version"}})
		return
	}
	canMutate, err := h.canMutateReleaseVersionMediaRelation(
		c, actor, relationID, relationMeta.UploadedByUserID, identity.UserID,
		permissions.ActionReleaseVersionMediaDelete, result,
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}
	if !canMutate {
		ownerResult := releaseVersionMediaOwnerMismatchResult()
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.delete.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaDelete, ownerResult)
		writePermissionDenied(c, ownerResult)
		return
	}

	if err := h.mediaRepo.SoftDeleteReleaseVersionMedia(c.Request.Context(), relationID, identity.UserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "löschen fehlgeschlagen.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.deleted",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaDelete),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID},
	})

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
