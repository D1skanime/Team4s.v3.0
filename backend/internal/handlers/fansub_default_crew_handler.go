package handlers

import (
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// FansubDefaultCrewHandler verwaltet die Stamm-Crew-Endpunkte einer Fansub-Gruppe (D-04).
type FansubDefaultCrewHandler struct {
	defaultCrewRepo   *repository.FansubDefaultCrewRepository
	contributionsRepo *repository.AnimeContributionsRepository
	permissionSvc     *permissions.Service
	auditLogRepo      *repository.AuditLogRepository
}

// NewFansubDefaultCrewHandler erstellt einen neuen FansubDefaultCrewHandler.
func NewFansubDefaultCrewHandler(
	defaultCrewRepo *repository.FansubDefaultCrewRepository,
	contributionsRepo *repository.AnimeContributionsRepository,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
) *FansubDefaultCrewHandler {
	return &FansubDefaultCrewHandler{
		defaultCrewRepo:   defaultCrewRepo,
		contributionsRepo: contributionsRepo,
		permissionSvc:     permissionSvc,
		auditLogRepo:      auditLogRepo,
	}
}

// GetDefaultCrew gibt alle Stamm-Crew-Einträge einer Fansub-Gruppe zurück.
// GET /admin/fansubs/:id/default-crew
// Gesichert mit CanForFansubGroup(MembersView) (T-82-02-04).
func (h *FansubDefaultCrewHandler) GetDefaultCrew(c *gin.Context) {
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

	entries, err := h.defaultCrewRepo.ListDefaultCrew(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("default crew get: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entries})
}

// putDefaultCrewRequest ist der Request-Body für PutDefaultCrew.
type putDefaultCrewRequest struct {
	MemberID int64  `json:"member_id"`
	RoleCode string `json:"role_code"`
}

// PutDefaultCrew fügt einen Stamm-Crew-Eintrag idempotent hinzu.
// PUT /admin/fansubs/:id/default-crew
// Gesichert mit CanForFansubGroup(MembersManage); Cross-Group-Guard via MemberBelongsToFansub (T-82-02-05).
func (h *FansubDefaultCrewHandler) PutDefaultCrew(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "default_crew.put.denied", &fansubID, "default_crew", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req putDefaultCrewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	if req.MemberID <= 0 {
		badRequest(c, "member_id ist erforderlich")
		return
	}
	if req.RoleCode == "" {
		badRequest(c, "role_code ist erforderlich")
		return
	}

	// Cross-Group-Guard: member_id muss zur Gruppe gehören (T-82-02-05).
	belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.MemberID, fansubID)
	if err != nil {
		log.Printf("default crew put: member group check error (member_id=%d, fansub_id=%d): %v", req.MemberID, fansubID, err)
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

	var createdBy *int64
	if identity.AppUserID > 0 {
		uid := identity.AppUserID
		createdBy = &uid
	}

	if err := h.defaultCrewRepo.UpsertDefaultCrewEntry(c.Request.Context(), fansubID, req.MemberID, req.RoleCode, createdBy); err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied oder rolle nicht gefunden"}})
			return
		}
		log.Printf("default crew put: repo error (fansub_id=%d, member_id=%d, role=%s): %v", fansubID, req.MemberID, req.RoleCode, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// DeleteDefaultCrewEntry entfernt einen einzelnen Stamm-Crew-Eintrag.
// DELETE /admin/fansubs/:id/default-crew/:memberId/:roleCode
// Gesichert mit CanForFansubGroup(MembersManage); fansub_group_id kommt aus URL-Param (T-82-02-07).
func (h *FansubDefaultCrewHandler) DeleteDefaultCrewEntry(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "default_crew.delete.denied", &fansubID, "default_crew", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	memberID, err := strconv.ParseInt(c.Param("memberId"), 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige member id")
		return
	}

	roleCode := c.Param("roleCode")
	if roleCode == "" {
		badRequest(c, "role_code ist erforderlich")
		return
	}

	if err := h.defaultCrewRepo.DeleteDefaultCrewEntry(c.Request.Context(), fansubID, memberID, roleCode); err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "stamm-crew-eintrag nicht gefunden"}})
			return
		}
		log.Printf("default crew delete: repo error (fansub_id=%d, member_id=%d, role=%s): %v", fansubID, memberID, roleCode, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// applyDefaultCrewRequest ist der optionale Request-Body für ApplyDefaultCrew.
type applyDefaultCrewRequest struct {
	AnimeIDs []int64 `json:"anime_ids"`
}

// ApplyDefaultCrew legt Contributions aus der Stamm-Crew für leere Projekte an (idempotent).
// POST /admin/fansubs/:id/default-crew/apply
// Gesichert mit CanForFansubGroup(MembersManage); Gruppe aus URL-Param (T-82-02-06).
func (h *FansubDefaultCrewHandler) ApplyDefaultCrew(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "default_crew.apply.denied", &fansubID, "default_crew", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req applyDefaultCrewRequest
	// Body ist optional — leerer Body = alle leeren Projekte.
	_ = c.ShouldBindJSON(&req)

	applied, err := h.defaultCrewRepo.ApplyDefaultCrewToEmptyProjects(c.Request.Context(), fansubID, req.AnimeIDs)
	if err != nil {
		log.Printf("default crew apply: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "default_crew.applied",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "default_crew",
		TargetID:       nil,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"applied_count": applied, "anime_ids": req.AnimeIDs},
	})

	c.JSON(http.StatusOK, gin.H{"applied_count": applied})
}
