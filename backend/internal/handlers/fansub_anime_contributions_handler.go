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
	histMembersRepo   *repository.HistGroupMembersRepository // für ListUnifiedGroupMembers (D-02)
	coverageRepo      *repository.AnimeCoverageRepository   // für GetAnimeCoverage (Gap-82-07)
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

// WithHistMembersRepo ergänzt das HistGroupMembersRepository (für /unified-members, D-02).
func (h *FansubAnimeContributionsHandler) WithHistMembersRepo(repo *repository.HistGroupMembersRepository) *FansubAnimeContributionsHandler {
	h.histMembersRepo = repo
	return h
}

// WithBadgeService ergänzt den Badge-Recompute-Trigger (Phase 68).
func (h *FansubAnimeContributionsHandler) WithBadgeService(svc *services.BadgeService) *FansubAnimeContributionsHandler {
	h.badgeService = svc
	return h
}

// WithCoverageRepo ergänzt das AnimeCoverageRepository (für GetAnimeCoverage, Gap-82-07).
func (h *FansubAnimeContributionsHandler) WithCoverageRepo(repo *repository.AnimeCoverageRepository) *FansubAnimeContributionsHandler {
	h.coverageRepo = repo
	return h
}

// GetAnimeCoverage liefert pro Anime der Gruppe: member_count und covered_role_codes (Aggregat).
// GET /admin/fansubs/:id/anime-coverage
func (h *FansubAnimeContributionsHandler) GetAnimeCoverage(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	if h.coverageRepo == nil {
		log.Printf("anime coverage: coverageRepo not wired (fansub_id=%d)", fansubID)
		internalError(c, "interner serverfehler")
		return
	}

	items, err := h.coverageRepo.CoverageByFansub(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("anime coverage: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
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

	if req.MemberID <= 0 {
		badRequest(c, "member_id ist erforderlich")
		return
	}

	// Cross-Group-Guard: Mitglied (App ODER historisch) muss zur Fansub-Gruppe gehören (T-82-02-02/03).
	belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.MemberID, fansubID)
	if err != nil {
		log.Printf("anime contributions create: member group check error (member_id=%d, fansub_id=%d): %v", req.MemberID, fansubID, err)
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
		MemberID:                req.MemberID,
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

	// Badge-Recompute (nicht kritischer Pfad) — item.MemberID ist members.id (Phase 82-02).
	if h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), item.MemberID)
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

	// Badge-Recompute (nicht kritischer Pfad) — item.MemberID ist members.id (Phase 82-02).
	if h.badgeService != nil {
		_ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), item.MemberID)
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteAnimeContribution ist in fansub_anime_contributions_delete_handler.go ausgelagert (450-Zeilen-Limit, Phase 82-02).
