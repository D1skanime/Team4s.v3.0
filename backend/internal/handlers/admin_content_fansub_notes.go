package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// requireFansubGroupNoteWriteAccess kapselt die Berechtigungsprüfung für
// fansub_group_notes und member_group_stories. MVP: Admin-only.
// Eigene Funktion ermöglicht spätere Erweiterung ohne Änderung an Call-Sites.
func (h *AdminContentHandler) requireFansubGroupNoteWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	return h.requireAdmin(c)
}

// ---- Request-Structs: fansub_group_notes ----
type createFansubGroupNoteRequest struct {
	Title        string `json:"title"`
	BodyMarkdown string `json:"body_markdown" binding:"required"`
	Visibility   string `json:"visibility" binding:"required,oneof=public internal"`
	Status       string `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder    int    `json:"sort_order"`
}

type updateFansubGroupNoteRequest struct {
	Title        *string `json:"title"`
	BodyMarkdown *string `json:"body_markdown"`
	Visibility   *string `json:"visibility"`
	Status       *string `json:"status"`
	SortOrder    *int    `json:"sort_order"`
}

// ---- Request-Structs: member_group_stories ----
type createMemberGroupStoryRequest struct {
	MemberID     int64  `json:"member_id" binding:"required"`
	RoleID       *int64 `json:"role_id"`
	Title        string `json:"title"`
	BodyMarkdown string `json:"body_markdown" binding:"required"`
	Visibility   string `json:"visibility" binding:"required,oneof=public internal"`
	Status       string `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder    int    `json:"sort_order"`
}

type updateMemberGroupStoryRequest struct {
	RoleID       *int64  `json:"role_id"`
	Title        *string `json:"title"`
	BodyMarkdown *string `json:"body_markdown"`
	Visibility   *string `json:"visibility"`
	Status       *string `json:"status"`
	SortOrder    *int    `json:"sort_order"`
}

// ---- Request-Structs: anime_fansub_project_notes ----
type upsertAnimeFansubProjectNoteRequest struct {
	Title        string `json:"title"`
	BodyMarkdown string `json:"body_markdown" binding:"required"`
	Visibility   string `json:"visibility" binding:"required,oneof=public internal"`
	Status       string `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder    int    `json:"sort_order"`
}

// ---- fansub_group_notes Handler ----
// ListFansubGroupNotes verarbeitet GET /admin/fansubs/:id/notes.
func (h *AdminContentHandler) ListFansubGroupNotes(c *gin.Context) {
	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	notes, err := h.fansubNotesRepo.ListFansubGroupNotes(c.Request.Context(), fansubID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notizen konnten nicht geladen werden.")
		return
	}
	if notes == nil {
		notes = []repository.FansubGroupNote{}
	}
	c.JSON(http.StatusOK, gin.H{"data": notes})
}

// CreateFansubGroupNote verarbeitet POST /api/v1/admin/fansubs/:id/notes.
func (h *AdminContentHandler) CreateFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	var req createFansubGroupNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	bodyHTML, err := h.markdownSvc.RenderMarkdown(req.BodyMarkdown)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
		return
	}

	note, err := h.fansubNotesRepo.CreateFansubGroupNote(
		c.Request.Context(),
		fansubID,
		identity.UserID,
		repository.CreateFansubGroupNoteRequest{
			Title:        req.Title,
			BodyMarkdown: req.BodyMarkdown,
			BodyHTML:     bodyHTML,
			Visibility:   req.Visibility,
			Status:       req.Status,
			SortOrder:    req.SortOrder,
		},
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht erstellt werden.")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": note})
}

// UpdateFansubGroupNote verarbeitet PATCH /api/v1/admin/fansubs/:id/notes/:noteId.
func (h *AdminContentHandler) UpdateFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	var req updateFansubGroupNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	repoReq := repository.UpdateFansubGroupNoteRequest{
		Title:      req.Title,
		Visibility: req.Visibility,
		Status:     req.Status,
		SortOrder:  req.SortOrder,
	}
	if req.BodyMarkdown != nil {
		html, err := h.markdownSvc.RenderMarkdown(*req.BodyMarkdown)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
			return
		}
		repoReq.BodyMarkdown = req.BodyMarkdown
		repoReq.BodyHTML = &html
	}

	note, err := h.fansubNotesRepo.UpdateFansubGroupNote(c.Request.Context(), noteID, identity.UserID, repoReq)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht aktualisiert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// DeleteFansubGroupNote verarbeitet DELETE /api/v1/admin/fansubs/:id/notes/:noteId.
func (h *AdminContentHandler) DeleteFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	err = h.fansubNotesRepo.DeleteFansubGroupNote(c.Request.Context(), noteID, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// ---- member_group_stories Handler ----
// ListMemberGroupStories verarbeitet GET /api/v1/admin/fansubs/:id/member-stories.
func (h *AdminContentHandler) ListMemberGroupStories(c *gin.Context) {
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
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
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

	bodyHTML, err := h.markdownSvc.RenderMarkdown(req.BodyMarkdown)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
		return
	}

	story, err := h.fansubNotesRepo.CreateMemberGroupStory(
		c.Request.Context(),
		fansubID,
		identity.UserID,
		repository.CreateMemberGroupStoryRequest{
			MemberID:     req.MemberID,
			RoleID:       req.RoleID,
			Title:        req.Title,
			BodyMarkdown: req.BodyMarkdown,
			BodyHTML:     bodyHTML,
			Visibility:   req.Visibility,
			Status:       req.Status,
			SortOrder:    req.SortOrder,
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
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
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
		RoleID:     req.RoleID,
		Title:      req.Title,
		Visibility: req.Visibility,
		Status:     req.Status,
		SortOrder:  req.SortOrder,
	}
	if req.BodyMarkdown != nil {
		html, err := h.markdownSvc.RenderMarkdown(*req.BodyMarkdown)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
			return
		}
		repoReq.BodyMarkdown = req.BodyMarkdown
		repoReq.BodyHTML = &html
	}

	story, err := h.fansubNotesRepo.UpdateMemberGroupStory(c.Request.Context(), storyID, identity.UserID, repoReq)
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
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	storyID, err := strconv.ParseInt(c.Param("storyId"), 10, 64)
	if err != nil || storyID <= 0 {
		badRequest(c, "ungültige story id")
		return
	}

	err = h.fansubNotesRepo.DeleteMemberGroupStory(c.Request.Context(), storyID, identity.UserID)
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

// ---- anime_fansub_project_notes Handler ----
// GetAnimeFansubProjectNote verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/notes.
func (h *AdminContentHandler) GetAnimeFansubProjectNote(c *gin.Context) {
	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	note, err := h.fansubNotesRepo.GetAnimeFansubProjectNote(c.Request.Context(), animeID, fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "projektnnotiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// UpsertAnimeFansubProjectNote verarbeitet PUT /api/v1/admin/fansubs/:id/anime/:animeId/notes.
func (h *AdminContentHandler) UpsertAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	var req upsertAnimeFansubProjectNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	bodyHTML, err := h.markdownSvc.RenderMarkdown(req.BodyMarkdown)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
		return
	}

	note, err := h.fansubNotesRepo.UpsertAnimeFansubProjectNote(
		c.Request.Context(),
		animeID,
		fansubID,
		identity.UserID,
		repository.UpsertAnimeFansubProjectNoteRequest{
			Title:        req.Title,
			BodyMarkdown: req.BodyMarkdown,
			BodyHTML:     bodyHTML,
			Visibility:   req.Visibility,
			Status:       req.Status,
			SortOrder:    req.SortOrder,
		},
	)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "projektnotiz-konflikt"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht gespeichert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// DeleteAnimeFansubProjectNote verarbeitet DELETE /api/v1/admin/fansubs/:id/anime/:animeId/notes/:noteId.
func (h *AdminContentHandler) DeleteAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	err = h.fansubNotesRepo.DeleteAnimeFansubProjectNote(c.Request.Context(), noteID, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "projektnotiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
