package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// UpdateEpisodeVersion aktualisiert eine bestehende Episodenversion (nur für Admins).
func (h *FansubHandler) UpdateEpisodeVersion(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungültige version id")
		return
	}

	var req models.EpisodeVersionPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("episode version update: bad request (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		badRequest(c, "ungültiger request body")
		return
	}

	input, validationMessage := validateEpisodeVersionPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	if !actor.IsPlatformAdmin {
		if !isReleaseMetadataOnlyPatch(input) {
			c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "nur release-metadaten duerfen bearbeitet werden"}})
			return
		}
		result, permissionErr := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMetadataUpdate, versionID)
		if permissionErr != nil {
			writePermissionInternalError(c, permissionErr, "Release-Metadaten-Berechtigung konnte nicht geprueft werden.")
			return
		}
		if !result.Allowed {
			auditPermissionDenied(c, h.auditLogRepo, identity, "release_version.metadata.update.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMetadataUpdate, result)
			writePermissionDenied(c, result)
			return
		}
	}

	item, err := h.episodeVersionRepo.Update(c.Request.Context(), versionID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "versionskombination bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("episode version update: repo error (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if h.releaseMetadataCreditSvc != nil {
		if creditErr := h.releaseMetadataCreditSvc.AwardIfCompleted(c.Request.Context(), versionID, identity.AppUserID); creditErr != nil {
			log.Printf("episode version metadata credit failed (user_id=%d, version_id=%d): %v", identity.UserID, versionID, creditErr)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}
func isReleaseMetadataOnlyPatch(input models.EpisodeVersionPatchInput) bool {
	return !input.FansubGroups.Set &&
		!input.FansubGroupID.Set &&
		!input.MediaProvider.Set &&
		!input.MediaItemID.Set &&
		!input.StreamURL.Set
}
