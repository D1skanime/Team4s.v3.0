package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MemberBadgesHandler verwaltet HTTP-Endpunkte für Member-Badge-Sichtbarkeit.
type MemberBadgesHandler struct {
	badgeRepo *repository.BadgeRepository
}

// NewMemberBadgesHandler erstellt einen neuen MemberBadgesHandler.
func NewMemberBadgesHandler(badgeRepo *repository.BadgeRepository) *MemberBadgesHandler {
	return &MemberBadgesHandler{badgeRepo: badgeRepo}
}

// meBadgeVisibilityPatchRequest ist der Request-Body für PATCH /me/badges/:badgeId/visibility.
type meBadgeVisibilityPatchRequest struct {
	Visibility string `json:"visibility"`
}

var allowedBadgeVisibilities = map[string]struct{}{
	"public":   {},
	"internal": {},
	"hidden":   {},
}

// PatchBadgeVisibility handles PATCH /api/v1/me/badges/:badgeId/visibility
func (h *MemberBadgesHandler) PatchBadgeVisibility(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "Anmeldung erforderlich."}})
		return
	}

	badgeIDStr := c.Param("badgeId")
	badgeID, err := strconv.ParseInt(badgeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Ungültige Badge-ID."}})
		return
	}

	var req meBadgeVisibilityPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Ungültiger Anfrage-Body."}})
		return
	}

	if _, ok := allowedBadgeVisibilities[req.Visibility]; !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Ungültiger Sichtbarkeitswert."}})
		return
	}

	// memberID aus dem DB-Claim des eingeloggten App-Users ermitteln.
	// Die badges-Tabelle speichert member_id (historische Identität), nicht app_user_id.
	// Sicherheitsprüfung erfolgt in SetBadgeVisibility via WHERE member_id = $2.
	memberID, err := resolveBadgeMemberID(c, identity.AppUserID, h.badgeRepo)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Badge nicht gefunden."}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Interner Serverfehler."}})
		return
	}

	if err := h.badgeRepo.SetBadgeVisibility(c.Request.Context(), badgeID, memberID, req.Visibility); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Badge nicht gefunden."}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Interner Serverfehler."}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sichtbarkeit aktualisiert."})
}

// resolveBadgeMemberID ermittelt die member_id des eingeloggten App-Users über member_claims.
// Gibt ErrNotFound zurück wenn kein verifizierter Claim vorhanden ist.
func resolveBadgeMemberID(c *gin.Context, appUserID int64, badgeRepo *repository.BadgeRepository) (int64, error) {
	return badgeRepo.ResolveMemberIDForAppUser(c.Request.Context(), appUserID)
}
