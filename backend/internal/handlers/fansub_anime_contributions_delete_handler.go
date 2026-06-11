package handlers

// Ausgelagert aus fansub_anime_contributions_handler.go für das 450-Zeilen-Limit (Phase 82-02).
// Enthält den DeleteAnimeContribution-Handler.

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// DeleteAnimeContribution entfernt einen Beitragseintrag.
// DELETE /admin/fansubs/:id/anime/:animeId/contributions/:contributionId
func (h *FansubAnimeContributionsHandler) DeleteAnimeContribution(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.delete.denied", &fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	// member_id VOR dem Delete sichern (Pitfall 2 aus RESEARCH.md).
	var memberIDForBadge int64
	if h.badgeService != nil {
		if mid, err := h.contributionsRepo.GetMemberIDForContribution(c.Request.Context(), contributionID); err == nil {
			memberIDForBadge = mid
		} else if !errors.Is(err, repository.ErrNotFound) {
			log.Printf("anime contributions delete: badge resolve pre-delete (contribution_id=%d): %v", contributionID, err)
		}
	}

	if err := h.contributionsRepo.Delete(c.Request.Context(), fansubID, animeID, contributionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "beitragseintrag nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("anime contributions delete: repo error (fansub_id=%d, anime_id=%d, contribution_id=%d): %v", fansubID, animeID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.deleted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "anime_contribution",
		TargetID:       &contributionID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	// Badge-Recompute nach Delete (nicht kritischer Pfad) — memberIDForBadge ist members.id (Phase 82-02).
	if memberIDForBadge > 0 && h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), memberIDForBadge)
	}

	c.Status(http.StatusNoContent)
}
