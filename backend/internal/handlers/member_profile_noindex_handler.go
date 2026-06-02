package handlers

import (
	"errors"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MemberProfileNoindexHandler struct {
	claimsRepo *repository.MemberClaimsRepository
}

func NewMemberProfileNoindexHandler(claimsRepo *repository.MemberClaimsRepository) *MemberProfileNoindexHandler {
	return &MemberProfileNoindexHandler{claimsRepo: claimsRepo}
}

type memberProfileNoindexRequest struct {
	Noindex *bool `json:"noindex"`
}

func (h *MemberProfileNoindexHandler) PatchNoindex(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	var req memberProfileNoindexRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Noindex == nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}

	if err := h.claimsRepo.UpdateNoindex(c.Request.Context(), identity.AppUserID, *req.Noindex); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(c, "Kein verifizierter Member-Eintrag gefunden. Bitte lass deinen Claim zuerst bestätigen.")
			return
		}
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"noindex": *req.Noindex,
		"message": "Sichtbarkeitseinstellung gespeichert.",
	}})
}
