package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ---- Request-Structs: member_group_stories ----
type createMemberGroupStoryRequest struct {
	MemberID   int64           `json:"member_id" binding:"required"`
	RoleID     *int64          `json:"role_id"`
	Title      string          `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

type updateMemberGroupStoryRequest struct {
	Title      *string          `json:"title"`
	BodyJSON   *json.RawMessage `json:"body_json"`
	Visibility *string          `json:"visibility"`
	Status     *string          `json:"status"`
	SortOrder  *int             `json:"sort_order"`
}

// GetMemberGroupStoryContext verarbeitet GET /api/v1/admin/fansubs/:id/member-stories/context.
func (h *AdminContentHandler) GetMemberGroupStoryContext(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	contextData, err := h.fansubNotesRepo.GetMemberGroupStoryContext(c.Request.Context(), fansubID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Kontext für Member-Geschichten konnte nicht geladen werden.")
		return
	}
	if contextData == nil {
		contextData = &repository.MemberStoryContext{
			Members: []repository.MemberStoryContextMember{},
			Roles:   []repository.MemberStoryContextRole{},
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": contextData})
}

// ListMemberGroupStories verarbeitet GET /api/v1/admin/fansubs/:id/member-stories.
func (h *AdminContentHandler) ListMemberGroupStories(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	stories, err := h.fansubNotesRepo.ListMemberGroupStories(c.Request.Context(), fansubID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Geschichten konnten nicht geladen werden.")
		return
	}
	if stories == nil {
		stories = []repository.MemberGroupStory{}
	}
	c.JSON(http.StatusOK, gin.H{"data": stories})
}

// CreateMemberGroupStory verarbeitet POST /api/v1/admin/fansubs/:id/member-stories.
func (h *AdminContentHandler) CreateMemberGroupStory(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	var req createMemberGroupStoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	bodyJSONStr := string(req.BodyJSON)
	if err := h.tiptapSvc.ValidateJSON(bodyJSONStr); err != nil {
		badRequest(c, "nicht erlaubter Editor-Inhalt: "+err.Error())
		return
	}
	bodyHTML, err := h.tiptapSvc.RenderHTML(bodyJSONStr)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "HTML-Rendering fehlgeschlagen.")
		return
	}
	bodyText, _ := h.tiptapSvc.ExtractText(bodyJSONStr)

	story, err := h.fansubNotesRepo.CreateMemberGroupStory(
		c.Request.Context(),
		fansubID,
		identity.UserID,
		repository.CreateMemberGroupStoryRequest{
			MemberID:             req.MemberID,
			RoleID:               req.RoleID,
			Title:                req.Title,
			BodyJSON:             []byte(req.BodyJSON),
			BodyText:             bodyText,
			BodyHTML:             bodyHTML,
			EditorType:           "tiptap",
			ContentSchemaVersion: 1,
			Visibility:           req.Visibility,
			Status:               req.Status,
			SortOrder:            req.SortOrder,
		},
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Geschichte konnte nicht erstellt werden.")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": story})
}

// UpdateMemberGroupStory verarbeitet PATCH /api/v1/admin/fansubs/:id/member-stories/:storyId.
func (h *AdminContentHandler) UpdateMemberGroupStory(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	storyID, err := strconv.ParseInt(c.Param("storyId"), 10, 64)
	if err != nil || storyID <= 0 {
		badRequest(c, "ungültige story id")
		return
	}

	var req updateMemberGroupStoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	repoReq := repository.UpdateMemberGroupStoryRequest{
		Title:      req.Title,
		Visibility: req.Visibility,
		Status:     req.Status,
		SortOrder:  req.SortOrder,
	}
	if req.BodyJSON != nil {
		bodyJSONStr := string(*req.BodyJSON)
		if err := h.tiptapSvc.ValidateJSON(bodyJSONStr); err != nil {
			badRequest(c, "nicht erlaubter Editor-Inhalt: "+err.Error())
			return
		}
		html, err := h.tiptapSvc.RenderHTML(bodyJSONStr)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "HTML-Rendering fehlgeschlagen.")
			return
		}
		text, _ := h.tiptapSvc.ExtractText(bodyJSONStr)
		rawBytes := []byte(*req.BodyJSON)
		repoReq.BodyJSON = &rawBytes
		repoReq.BodyHTML = &html
		repoReq.BodyText = &text
	}

	story, err := h.fansubNotesRepo.UpdateMemberGroupStory(c.Request.Context(), storyID, fansubID, identity.UserID, repoReq)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "member-geschichte nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Geschichte konnte nicht aktualisiert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": story})
}

// DeleteMemberGroupStory verarbeitet DELETE /api/v1/admin/fansubs/:id/member-stories/:storyId.
func (h *AdminContentHandler) DeleteMemberGroupStory(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	storyID, err := strconv.ParseInt(c.Param("storyId"), 10, 64)
	if err != nil || storyID <= 0 {
		badRequest(c, "ungültige story id")
		return
	}

	err = h.fansubNotesRepo.DeleteMemberGroupStory(c.Request.Context(), storyID, fansubID, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "member-geschichte nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Geschichte konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
