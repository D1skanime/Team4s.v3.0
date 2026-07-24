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
	contributionsRepo  *repository.AnimeContributionsRepository
	rolesRepo          *repository.HistGroupMemberRolesRepository
	histMembersRepo    *repository.HistGroupMembersRepository // für ListUnifiedGroupMembers (D-02)
	coverageRepo       *repository.AnimeCoverageRepository    // für GetAnimeCoverage (Gap-82-07)
	permissionSvc      *permissions.Service
	auditLogRepo       *repository.AuditLogRepository
	badgeService       *services.BadgeService // Phase 68: Badge-Recompute
	releaseCrewService *services.ReleaseCrewService
}

func (h *FansubAnimeContributionsHandler) WithReleaseCrewService(svc *services.ReleaseCrewService) *FansubAnimeContributionsHandler {
	h.releaseCrewService = svc
	return h
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.list.denied", &fansubID, "anime_contribution", nil, permissions.ActionReleaseView, result)
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
	if req.ReleaseVersionID != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Release-Besetzungen können nur vollständig gespeichert werden."}})
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
	isPublicOnAnimePage := status == "confirmed"
	if req.IsPublicOnAnimePage != nil {
		isPublicOnAnimePage = *req.IsPublicOnAnimePage
	}
	isPublicOnMemberProfile := status == "confirmed"
	if req.IsPublicOnMemberProfile != nil {
		isPublicOnMemberProfile = *req.IsPublicOnMemberProfile
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
		IsPublicOnAnimePage:     isPublicOnAnimePage,
		IsPublicOnMemberProfile: isPublicOnMemberProfile,
		ReleaseVersionID:        req.ReleaseVersionID,
	}

	if h.releaseCrewService == nil {
		internalError(c, "interner serverfehler")
		return
	}
	input.CreatedBy = &identity.AppUserID
	mutationResult, err := h.releaseCrewService.ApplyProjectRosterMutation(c.Request.Context(), services.ProjectRosterMutationCommand{
		FansubGroupID: fansubID, AnimeID: animeID, ActorAppUserID: identity.AppUserID,
		Mutation: repository.ProjectRosterMutation{Kind: repository.ProjectRosterMutationUpsert, Input: input},
	})
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
	item, err := h.contributionsRepo.GetByIDWithDisplay(c.Request.Context(), mutationResult.ContributionID)
	if err != nil {
		log.Printf("anime contributions create: post-commit load error (contribution_id=%d): %v", mutationResult.ContributionID, err)
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
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Der review-status darf nur über die Bestätigungsaktionen geändert werden."}})
		return
	}

	if req.ReleaseVersionID != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "release_version_id darf in diesem Endpunkt nicht geändert werden."}})
		return
	}
	target, err := h.contributionsRepo.GetByIDForFansubAnime(c.Request.Context(), fansubID, animeID, contributionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "beitragseintrag nicht gefunden"}})
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	if target.ReleaseVersionID != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Release-Besetzungen können nur vollständig gespeichert werden."}})
		return
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
		UpdatedBy:               &identity.AppUserID,
	}

	if h.releaseCrewService == nil {
		internalError(c, "interner serverfehler")
		return
	}
	mutationResult, err := h.releaseCrewService.ApplyProjectRosterMutation(c.Request.Context(), services.ProjectRosterMutationCommand{
		FansubGroupID: fansubID, AnimeID: animeID, ActorAppUserID: identity.AppUserID,
		Mutation: repository.ProjectRosterMutation{Kind: repository.ProjectRosterMutationPatch, ContributionID: contributionID, Patch: input},
	})
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
	item, err := h.contributionsRepo.GetByIDWithDisplay(c.Request.Context(), mutationResult.ContributionID)
	if err != nil {
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
