package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *ContributionsMeHandler) GetMyProjectDetail(c *gin.Context) {
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
	if err != nil || fansubGroupID <= 0 {
		badRequest(c, "fansub_group_id ist erforderlich")
		return
	}

	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(c, "projekt nicht gefunden")
			return
		}
		internalError(c, "interner serverfehler")
		return
	}

	project, err := h.contributionsRepo.GetMemberProjectDetail(
		c.Request.Context(),
		memberID,
		identity.AppUserID,
		animeID,
		fansubGroupID,
	)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": project})
}
