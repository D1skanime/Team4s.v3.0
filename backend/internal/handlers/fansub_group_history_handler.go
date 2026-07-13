package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

var allowedGroupHistoryEventTypes = map[string]struct{}{
	"founding":          {},
	"disbanding":        {},
	"hiatus":            {},
	"rebranding":        {},
	"milestone":         {},
	"first_project":     {},
	"first_release":     {},
	"anniversary":       {},
	"collaboration":     {},
	"revival":           {},
	"project_completed": {},
	"team_change":       {},
	"website_launch":    {},
	"award":             {},
	"projects_10":       {},
	"projects_50":       {},
	"projects_100":      {},
	"projects_500":      {},
	"releases_100":      {},
	"releases_500":      {},
	"releases_1000":     {},
	"releases_5000":     {},
	"releases_10000":    {},
}

const allowedGroupHistoryEventTypesMessage = "ungültiger event_type; erlaubte Werte: founding, disbanding, hiatus, rebranding, milestone, first_project, first_release, anniversary, collaboration, revival, project_completed, team_change, website_launch, award, projects_10, projects_50, projects_100, projects_500, releases_100, releases_500, releases_1000, releases_5000, releases_10000"
const firstProjectGuardMessage = "Erstes Projekt ist noch nicht vollständig. Bitte Ausblick schreiben und Rollen Übersetzer, Timer und Encoder vergeben."
const firstReleaseGuardMessage = "Erstes Release ist noch nicht vollständig. Bitte zuerst ein Kara-Segment und mindestens einen Release-Text oder ein Release-Bild hinterlegen."
const projectCompletedGuardMessage = "Projekt abgeschlossen ist noch nicht vollständig. Bitte bei jedem Release dieses Projekts mindestens einen Release-Text oder ein Release-Bild der Gruppe hinterlegen."
const collaborationGuardMessage = "Kooperation ist noch nicht vollständig. Bitte zuerst eine Release-Version mit mindestens zwei beteiligten Fansubgruppen anlegen."
const revivalGuardMessage = "Wiederaufnahme ist noch nicht möglich. Bitte zuerst Pause eintragen."
const singleUseGroupHistoryEventMessage = "Dieser Meilenstein wurde bereits eingetragen."

var singleUseGroupHistoryEventTypes = map[string]struct{}{
	"disbanding":        {},
	"first_project":     {},
	"first_release":     {},
	"project_completed": {},
	"collaboration":     {},
}

// FansubGroupHistoryHandler verwaltet Admin-Endpunkte für fansub_group_history.
type FansubGroupHistoryHandler struct {
	historyRepo   *repository.FansubGroupHistoryRepository
	permissionSvc *permissions.Service
}

// NewFansubGroupHistoryHandler erstellt einen neuen FansubGroupHistoryHandler.
func NewFansubGroupHistoryHandler(repo *repository.FansubGroupHistoryRepository) *FansubGroupHistoryHandler {
	return &FansubGroupHistoryHandler{historyRepo: repo}
}

// WithPermissionSvc ergänzt den Permission-Service (Leader-Auth-Check).
func (h *FansubGroupHistoryHandler) WithPermissionSvc(svc *permissions.Service) *FansubGroupHistoryHandler {
	h.permissionSvc = svc
	return h
}

func (h *FansubGroupHistoryHandler) validateEventUnlocked(c *gin.Context, fansubID int64, eventType string) bool {
	switch eventType {
	case "website_launch":
		if err := h.historyRepo.ValidateWebsiteLaunchAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Webseite fehlt. Bitte zuerst einen Community-Link vom Typ Webseite eintragen."}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	case "first_project":
		if err := h.historyRepo.ValidateFirstProjectAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": firstProjectGuardMessage}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	case "first_release":
		if err := h.historyRepo.ValidateFirstReleaseAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": firstReleaseGuardMessage}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	case "project_completed":
		if err := h.historyRepo.ValidateCompletedProjectAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": projectCompletedGuardMessage}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	case "collaboration":
		if err := h.historyRepo.ValidateCollaborationAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": collaborationGuardMessage}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	case "revival":
		if err := h.historyRepo.ValidateRevivalAllowed(c.Request.Context(), fansubID); err != nil {
			if errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": revivalGuardMessage}})
				return false
			}
			log.Printf("group history guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
			internalError(c, "interner serverfehler")
			return false
		}
	}
	return true
}

func (h *FansubGroupHistoryHandler) validateSingleUseEvent(c *gin.Context, fansubID int64, eventType string, excludeID *int64) bool {
	if _, ok := singleUseGroupHistoryEventTypes[eventType]; !ok {
		return true
	}
	exists, err := h.historyRepo.HasEventType(c.Request.Context(), fansubID, eventType, excludeID)
	if err != nil {
		log.Printf("group history single-use guard failed (event_type=%s, fansub_id=%d): %v", eventType, fansubID, err)
		internalError(c, "interner serverfehler")
		return false
	}
	if exists {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": singleUseGroupHistoryEventMessage}})
		return false
	}
	return true
}

type groupHistoryCreateRequest struct {
	Year      *int    `json:"year"`
	EventType string  `json:"event_type"`
	Title     *string `json:"title"`
	Note      *string `json:"note"`
	Status    string  `json:"status"`
}

type groupHistoryPatchRequest struct {
	Year      **int    `json:"year"`
	EventType *string  `json:"event_type"`
	Title     **string `json:"title"`
	Note      **string `json:"note"`
	Status    *string  `json:"status"`
}

// ListGroupHistory gibt alle Historieneinträge einer Fansub-Gruppe zurück.
// GET /admin/fansubs/:id/history
func (h *FansubGroupHistoryHandler) ListGroupHistory(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	items, err := h.historyRepo.ListByFansub(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("group history list: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateGroupHistory legt einen neuen Historieneintrag an.
// POST /admin/fansubs/:id/history
func (h *FansubGroupHistoryHandler) CreateGroupHistory(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	// Leader-Auth-Check (T-68-02-01)
	if h.permissionSvc != nil {
		_, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}
		result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
			permissions.ActionFansubGroupMembersManage, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			writePermissionDenied(c, result)
			return
		}
	}

	var req groupHistoryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.Title == nil || *req.Title == "" {
		badRequest(c, "titel ist ein Pflichtfeld")
		return
	}
	if req.EventType == "" {
		req.EventType = "milestone"
	}
	if _, ok := allowedGroupHistoryEventTypes[req.EventType]; !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": allowedGroupHistoryEventTypesMessage,
			},
		})
		return
	}
	if !h.validateSingleUseEvent(c, fansubID, req.EventType, nil) {
		return
	}
	if !h.validateEventUnlocked(c, fansubID, req.EventType) {
		return
	}

	// D-11: Leader-Einträge sind sofort mit status='confirmed' sichtbar.
	// Falls kein Status gesendet oder leer → immer "confirmed".
	status := "confirmed"
	if req.Status != "" {
		if !validHistoricalContributionStatus(req.Status) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": "ungültiger status-wert",
				},
			})
			return
		}
		status = req.Status
	}

	input := repository.GroupHistoryInput{
		Year:      req.Year,
		EventType: req.EventType,
		Title:     req.Title,
		Note:      req.Note,
		Status:    status,
	}

	item, err := h.historyRepo.Create(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("group history create: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateGroupHistory aktualisiert einen Historieneintrag.
// PATCH /admin/fansubs/:id/history/:historyId
func (h *FansubGroupHistoryHandler) UpdateGroupHistory(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	historyID, err := strconv.ParseInt(c.Param("historyId"), 10, 64)
	if err != nil || historyID <= 0 {
		badRequest(c, "ungültige history id")
		return
	}

	// Leader-Auth-Check (T-68-02-01)
	if h.permissionSvc != nil {
		_, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}
		result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
			permissions.ActionFansubGroupMembersManage, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			writePermissionDenied(c, result)
			return
		}
	}

	// Cross-Group-Guard (T-68-02-03): Eintrag muss zur URL-Gruppe gehören.
	existing, err := h.historyRepo.GetByID(c.Request.Context(), historyID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("group history update: getbyid error (history_id=%d): %v", historyID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if existing.FansubGroupID != fansubID {
		// Kein Infoleakage — gibt 404 wie bei nicht-gefundenem Eintrag.
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
		return
	}

	var req groupHistoryPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.EventType != nil {
		if _, ok := allowedGroupHistoryEventTypes[*req.EventType]; !ok {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": allowedGroupHistoryEventTypesMessage,
				},
			})
			return
		}
		if *req.EventType != existing.EventType {
			if !h.validateSingleUseEvent(c, fansubID, *req.EventType, &historyID) {
				return
			}
			if !h.validateEventUnlocked(c, fansubID, *req.EventType) {
				return
			}
		}
	}
	if req.Status != nil && !validHistoricalContributionStatus(*req.Status) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger status-wert",
			},
		})
		return
	}

	input := repository.GroupHistoryPatchInput{
		Year:      req.Year,
		EventType: req.EventType,
		Title:     req.Title,
		Note:      req.Note,
		Status:    req.Status,
	}

	item, err := h.historyRepo.Update(c.Request.Context(), historyID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "historieneintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("group history update: repo error (fansub_id=%d, history_id=%d): %v", fansubID, historyID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteGroupHistory löscht einen Historieneintrag.
// DELETE /admin/fansubs/:id/history/:historyId
func (h *FansubGroupHistoryHandler) DeleteGroupHistory(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	historyID, err := strconv.ParseInt(c.Param("historyId"), 10, 64)
	if err != nil || historyID <= 0 {
		badRequest(c, "ungültige history id")
		return
	}

	// Leader-Auth-Check (T-68-02-01)
	if h.permissionSvc != nil {
		_, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}
		result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
			permissions.ActionFansubGroupMembersManage, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			writePermissionDenied(c, result)
			return
		}
	}

	// Cross-Group-Guard (T-68-02-03): Eintrag muss zur URL-Gruppe gehören.
	existing, err := h.historyRepo.GetByID(c.Request.Context(), historyID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("group history delete: getbyid error (history_id=%d): %v", historyID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if existing.FansubGroupID != fansubID {
		// Kein Infoleakage — gibt 404 wie bei nicht-gefundenem Eintrag.
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
		return
	}

	if err := h.historyRepo.Delete(c.Request.Context(), historyID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
			return
		}
		log.Printf("group history delete: repo error (fansub_id=%d, history_id=%d): %v", fansubID, historyID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.Status(http.StatusNoContent)
}
