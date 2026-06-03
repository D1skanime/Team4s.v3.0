package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// FansubAnimeContributionsHandler verwaltet Admin-Endpunkte für anime_contributions.
type FansubAnimeContributionsHandler struct {
	contributionsRepo *repository.AnimeContributionsRepository
	rolesRepo         *repository.HistGroupMemberRolesRepository
	permissionSvc     *permissions.Service
	auditLogRepo      *repository.AuditLogRepository
	badgeService      *services.BadgeService // Phase 68: Badge-Recompute
}

// NewFansubAnimeContributionsHandler erstellt einen neuen FansubAnimeContributionsHandler.
func NewFansubAnimeContributionsHandler(
	contributionsRepo *repository.AnimeContributionsRepository,
	rolesRepo *repository.HistGroupMemberRolesRepository,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
) *FansubAnimeContributionsHandler {
	return &FansubAnimeContributionsHandler{
		contributionsRepo: contributionsRepo,
		rolesRepo:         rolesRepo,
		permissionSvc:     permissionSvc,
		auditLogRepo:      auditLogRepo,
	}
}

// WithBadgeService ergänzt den Badge-Recompute-Trigger (Phase 68).
func (h *FansubAnimeContributionsHandler) WithBadgeService(svc *services.BadgeService) *FansubAnimeContributionsHandler {
	h.badgeService = svc
	return h
}

// ListAnimeContributions gibt alle Beiträge einer Fansub-Gruppe für ein Anime zurück.
// GET /admin/fansubs/:id/anime/:animeId/contributions
func (h *FansubAnimeContributionsHandler) ListAnimeContributions(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.list.denied", &fansubID, "anime_contribution", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	items, err := h.contributionsRepo.ListByFansubAndAnimeWithDisplay(c.Request.Context(), fansubID, animeID)
	if err != nil {
		log.Printf("anime contributions list: repo error (fansub_id=%d, anime_id=%d): %v", fansubID, animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeContribution legt einen neuen Beitragseintrag an (Upsert-Semantik).
// POST /admin/fansubs/:id/anime/:animeId/contributions
func (h *FansubAnimeContributionsHandler) CreateAnimeContribution(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.create.denied", &fansubID, "anime_contribution", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req animeContributionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.FansubGroupMemberID <= 0 {
		badRequest(c, "fansub_group_member_id ist erforderlich")
		return
	}

	// Cross-Group-Guard: Mitglied muss zur Fansub-Gruppe gehören.
	belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.FansubGroupMemberID, fansubID)
	if err != nil {
		log.Printf("anime contributions create: member group check error (member_id=%d, fansub_id=%d): %v", req.FansubGroupMemberID, fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if !belongs {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "mitglied gehört nicht zu dieser fansubgruppe",
			},
		})
		return
	}

	// Versions-Beteiligungs-Check (D-03): nur bei gesetztem release_version_id.
	if !h.validateReleaseVersionParticipation(c, fansubID, req.ReleaseVersionID) {
		return
	}

	// Status-Enum-Validierung: nur erlaubte Werte zulassen.
	status := req.Status
	if status != "" {
		if _, ok := validContributionStatuses[status]; !ok {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": "ungültiger status-wert",
				},
			})
			return
		}
	} else {
		status = "draft"
	}

	for _, code := range req.RoleCodes {
		valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
		if err != nil {
			log.Printf("anime contributions create: role validation error (code=%s): %v", code, err)
			internalError(c, "interner serverfehler")
			return
		}
		if !valid {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code),
				},
			})
			return
		}
	}

	input := repository.AnimeContributionInput{
		FansubGroupMemberID:     req.FansubGroupMemberID,
		RoleCodes:               req.RoleCodes,
		Status:                  status,
		StartedYear:             req.StartedYear,
		EndedYear:               req.EndedYear,
		Note:                    req.Note,
		IsPublicOnAnimePage:     req.IsPublicOnAnimePage,
		IsPublicOnMemberProfile: req.IsPublicOnMemberProfile,
		ReleaseVersionID:        req.ReleaseVersionID,
	}

	item, err := h.contributionsRepo.CreateOrUpdate(c.Request.Context(), fansubID, animeID, input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "beitragseintrag konnte nicht gespeichert werden (konflikt)",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe, anime oder mitglied nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime contributions create: repo error (fansub_id=%d, anime_id=%d): %v", fansubID, animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "anime_contribution",
		TargetID:       &item.ID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"status": status, "release_version_id": req.ReleaseVersionID},
	})

	// Badge-Recompute (nicht kritischer Pfad).
	if h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadgesByMembership(c.Request.Context(), item.FansubGroupMemberID)
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateAnimeContribution aktualisiert einen Beitragseintrag.
// PATCH /admin/fansubs/:id/anime/:animeId/contributions/:contributionId
func (h *FansubAnimeContributionsHandler) UpdateAnimeContribution(c *gin.Context) {
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
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.update.denied", &fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req animeContributionPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.RoleCodes != nil && len(*req.RoleCodes) > 0 {
		for _, code := range *req.RoleCodes {
			valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
			if err != nil {
				log.Printf("anime contributions update: role validation error (code=%s): %v", code, err)
				internalError(c, "interner serverfehler")
				return
			}
			if !valid {
				c.JSON(http.StatusUnprocessableEntity, gin.H{
					"error": gin.H{
						"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code),
					},
				})
				return
			}
		}
	}
	if req.Status != nil {
		if _, ok := validContributionStatuses[*req.Status]; !ok {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": "ungültiger status-wert",
				},
			})
			return
		}
	}

	// Versions-Beteiligungs-Check (D-03): nur wenn der Patch eine konkrete
	// release_version_id setzt (Doppelpointer non-nil mit non-nil Zielwert).
	// Auf NULL setzen (*req.ReleaseVersionID == nil) braucht keinen Check.
	if req.ReleaseVersionID != nil && *req.ReleaseVersionID != nil {
		if !h.validateReleaseVersionParticipation(c, fansubID, *req.ReleaseVersionID) {
			return
		}
	}

	input := repository.AnimeContributionPatchInput{
		RoleCodes:               req.RoleCodes,
		StartedYear:             req.StartedYear,
		EndedYear:               req.EndedYear,
		Note:                    req.Note,
		IsPublicOnAnimePage:     req.IsPublicOnAnimePage,
		IsPublicOnMemberProfile: req.IsPublicOnMemberProfile,
		ReleaseVersionID:        req.ReleaseVersionID,
		Status:                  req.Status,
	}

	item, err := h.contributionsRepo.Update(c.Request.Context(), fansubID, animeID, contributionID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "beitragseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime contributions update: repo error (fansub_id=%d, anime_id=%d, contribution_id=%d): %v", fansubID, animeID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	// Audit-Payload: release_version_id nur aufnehmen, wenn der Patch das Feld
	// beruehrt (Doppelpointer non-nil); innerer Wert kann nil sein (= auf NULL gesetzt).
	updatePayload := map[string]any{}
	if req.ReleaseVersionID != nil {
		updatePayload["release_version_id"] = *req.ReleaseVersionID
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "anime_contribution",
		TargetID:       &contributionID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        updatePayload,
	})

	// Badge-Recompute (nicht kritischer Pfad).
	if h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadgesByMembership(c.Request.Context(), item.FansubGroupMemberID)
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

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

	// Badge-Recompute nach Delete (nicht kritischer Pfad).
	if memberIDForBadge > 0 && h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), memberIDForBadge)
	}

	c.Status(http.StatusNoContent)
}
