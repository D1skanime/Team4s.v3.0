package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type adminAnimeRelationMutationRequest struct {
	TargetAnimeID int64  `json:"target_anime_id"`
	RelationLabel string `json:"relation_label"`
}

type adminAnimeRelationUpdateRequest struct {
	RelationLabel string `json:"relation_label"`
}

var allowedAdminRelationLabels = map[string]struct{}{
	"Hauptgeschichte": {},
	"Nebengeschichte": {},
	"Fortsetzung":     {},
	"Zusammenfassung": {},
}

func normalizeAdminRelationLabel(raw string) string {
	return strings.TrimSpace(raw)
}

func validateAdminRelationLabel(raw string) (string, string) {
	label := normalizeAdminRelationLabel(raw)
	if label == "" {
		return "", "relation_label ist erforderlich"
	}
	if _, ok := allowedAdminRelationLabels[label]; !ok {
		return "", "ungueltiger relation_label parameter"
	}
	return label, ""
}

func (h *AdminContentHandler) ListAnimeRelations(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.relationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "relation service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	items, err := h.relationRepo.ListAdminAnimeRelations(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime relations list: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *AdminContentHandler) SearchAnimeRelationTargets(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.relationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "relation service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "q ist erforderlich")
		return
	}
	if len([]rune(query)) > 100 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	limit := 10
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed <= 0 {
			badRequest(c, "ungueltiger limit parameter")
			return
		}
		limit = parsed
	}

	items, err := h.relationRepo.SearchAdminAnimeRelationTargets(c.Request.Context(), animeID, query, limit)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime relation target search: anime_id=%d q=%q: %v", animeID, query, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Ziel-Anime konnten nicht gesucht werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *AdminContentHandler) CreateAnimeRelation(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.relationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "relation service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeRelationMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.TargetAnimeID <= 0 {
		badRequest(c, "target_anime_id ist erforderlich")
		return
	}
	if animeID == req.TargetAnimeID {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "self-link nicht erlaubt", "code": "relation_self_link"}})
		return
	}
	label, message := validateAdminRelationLabel(req.RelationLabel)
	if message != "" {
		badRequest(c, message)
		return
	}

	err = h.relationRepo.CreateAdminAnimeRelation(c.Request.Context(), animeID, req.TargetAnimeID, label)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder ziel-anime nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "relation existiert bereits oder ist ungueltig", "code": "relation_conflict"}})
		return
	}
	if err != nil {
		log.Printf("admin anime relation create: anime_id=%d target_id=%d: %v", animeID, req.TargetAnimeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"target_anime_id": req.TargetAnimeID,
			"relation_label":  label,
		},
	})
}

func (h *AdminContentHandler) UpdateAnimeRelation(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.relationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "relation service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	targetAnimeID, err := parseAnimeID(c.Param("targetAnimeId"))
	if err != nil {
		badRequest(c, "ungueltige target anime id")
		return
	}

	var req adminAnimeRelationUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	label, message := validateAdminRelationLabel(req.RelationLabel)
	if message != "" {
		badRequest(c, message)
		return
	}

	err = h.relationRepo.UpdateAdminAnimeRelation(c.Request.Context(), animeID, targetAnimeID, label)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "relation ist ungueltig", "code": "relation_conflict"}})
		return
	}
	if err != nil {
		log.Printf("admin anime relation update: anime_id=%d target_id=%d: %v", animeID, targetAnimeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht aktualisiert werden.")
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) DeleteAnimeRelation(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.relationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "relation service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	targetAnimeID, err := parseAnimeID(c.Param("targetAnimeId"))
	if err != nil {
		badRequest(c, "ungueltige target anime id")
		return
	}

	err = h.relationRepo.DeleteAdminAnimeRelation(c.Request.Context(), animeID, targetAnimeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime relation delete: anime_id=%d target_id=%d: %v", animeID, targetAnimeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geloescht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}
