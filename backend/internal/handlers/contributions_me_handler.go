package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ContributionsMeHandler verwaltet HTTP-Endpunkte für eigene Contributions des eingeloggten Members.
type ContributionsMeHandler struct {
	contributionsRepo    *repository.AnimeContributionsRepository
	groupRolesRepo       *repository.HistGroupMemberRolesRepository
	db                   *pgxpool.Pool
}

// NewContributionsMeHandler erstellt einen neuen ContributionsMeHandler.
func NewContributionsMeHandler(
	contributionsRepo *repository.AnimeContributionsRepository,
	groupRolesRepo *repository.HistGroupMemberRolesRepository,
	db *pgxpool.Pool,
) *ContributionsMeHandler {
	return &ContributionsMeHandler{
		contributionsRepo: contributionsRepo,
		groupRolesRepo:    groupRolesRepo,
		db:                db,
	}
}

// resolveVerifiedMemberID ermittelt die member_id des eingeloggten App-Users über member_claims.
// Gibt ErrNotFound zurück, wenn kein verifizierter Claim vorhanden ist.
func (h *ContributionsMeHandler) resolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := h.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// meContributionVisibilityPatchRequest ist der Request-Body für PATCH Visibility auf anime_contributions.
type meContributionVisibilityPatchRequest struct {
	IsPublicOnMemberProfile *bool `json:"is_public_on_member_profile"`
}

// meGroupContributionVisibilityPatchRequest ist der Request-Body für PATCH Visibility auf hist_group_member_roles.
type meGroupContributionVisibilityPatchRequest struct {
	Visibility *string `json:"visibility"`
}

// requireMeIdentity liest die Auth-Identität aus dem Gin-Kontext.
func requireMeIdentity(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}

// ListMyAnimeContributions handles GET /api/v1/me/anime-contributions
func (h *ContributionsMeHandler) ListMyAnimeContributions(c *gin.Context) {
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
		internalError(c, "interner serverfehler")
		return
	}

	items, err := h.contributionsRepo.ListByMemberID(c.Request.Context(), memberID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListMyGroupContributions handles GET /api/v1/me/group-contributions
func (h *ContributionsMeHandler) ListMyGroupContributions(c *gin.Context) {
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
		internalError(c, "interner serverfehler")
		return
	}

	items, err := h.groupRolesRepo.ListByMemberID(c.Request.Context(), memberID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// UpdateMyAnimeContributionVisibility handles PATCH /api/v1/me/anime-contributions/:contributionId/visibility
func (h *ContributionsMeHandler) UpdateMyAnimeContributionVisibility(c *gin.Context) {
	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution-id")
		return
	}

	var req meContributionVisibilityPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request-body")
		return
	}
	if req.IsPublicOnMemberProfile == nil {
		badRequest(c, "is_public_on_member_profile ist erforderlich")
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
		internalError(c, "interner serverfehler")
		return
	}

	// Ownership-Check: hfgm.member_id muss mit dem eingeloggten Member übereinstimmen
	var ownerMemberID int64
	err = h.db.QueryRow(c.Request.Context(), `
		SELECT hfgm.member_id
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE ac.id = $1
	`, contributionID).Scan(&ownerMemberID)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(c, "contribution nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	if ownerMemberID != memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return
	}

	_, err = h.db.Exec(c.Request.Context(), `
		UPDATE anime_contributions
		SET is_public_on_member_profile = $1, updated_at = NOW()
		WHERE id = $2
	`, req.IsPublicOnMemberProfile, contributionID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sichtbarkeit aktualisiert"})
}

// UpdateMyGroupContributionVisibility handles PATCH /api/v1/me/group-contributions/:contributionId/visibility
func (h *ContributionsMeHandler) UpdateMyGroupContributionVisibility(c *gin.Context) {
	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution-id")
		return
	}

	var req meGroupContributionVisibilityPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request-body")
		return
	}
	if req.Visibility == nil {
		badRequest(c, "visibility ist erforderlich")
		return
	}
	vis := *req.Visibility
	if vis != "public" && vis != "internal" {
		badRequest(c, "visibility muss 'public' oder 'internal' sein")
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
		internalError(c, "interner serverfehler")
		return
	}

	// Ownership-Check: hfgm.member_id muss mit dem eingeloggten Member übereinstimmen
	var ownerMemberID int64
	err = h.db.QueryRow(c.Request.Context(), `
		SELECT hfgm.member_id
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		WHERE r.id = $1
	`, contributionID).Scan(&ownerMemberID)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(c, "group-contribution nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	if ownerMemberID != memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return
	}

	_, err = h.db.Exec(c.Request.Context(), `
		UPDATE hist_group_member_roles SET visibility = $1 WHERE id = $2
	`, vis, contributionID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sichtbarkeit aktualisiert"})
}
