package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminAnimeThemeCreateRequest enthält die Eingabedaten zum Anlegen eines neuen Anime-Themes.
type adminAnimeThemeCreateRequest struct {
	ThemeTypeID int64   `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// adminAnimeThemePatchRequest enthält die optionalen Felder für ein Theme-Update.
type adminAnimeThemePatchRequest struct {
	ThemeTypeID *int64  `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// ListThemeTypes verarbeitet GET /api/v1/admin/theme-types und gibt alle verfügbaren Theme-Typen zurück.
func (h *AdminContentHandler) ListThemeTypes(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	items, err := h.themeRepo.ListThemeTypes(c.Request.Context())
	if err != nil {
		log.Printf("admin theme types list: %v", err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Typen konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListAnimeThemes verarbeitet GET /api/v1/admin/anime/:id/themes und gibt alle Themes eines Anime zurück.
func (h *AdminContentHandler) ListAnimeThemes(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	items, err := h.themeRepo.ListAdminAnimeThemes(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime themes list: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Themes konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeTheme verarbeitet POST /api/v1/admin/anime/:id/themes und legt ein neues Theme an.
func (h *AdminContentHandler) CreateAnimeTheme(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeThemeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.ThemeTypeID <= 0 {
		badRequest(c, "theme_type_id ist erforderlich")
		return
	}

	input := models.AdminAnimeThemeCreateInput{
		ThemeTypeID: req.ThemeTypeID,
		Title:       req.Title,
	}

	created, err := h.themeRepo.CreateAdminAnimeTheme(c.Request.Context(), animeID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungueltiger theme_type_id", "code": "invalid_theme_type"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme create: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// UpdateAnimeTheme verarbeitet PATCH /api/v1/admin/anime/:id/themes/:themeId und aktualisiert ein Theme.
func (h *AdminContentHandler) UpdateAnimeTheme(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	_ = animeID // Anime-ID ist Teil der URL für semantische Klarheit, aber das Update wird via themeID durchgeführt

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungueltige theme id")
		return
	}

	var req adminAnimeThemePatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	input := models.AdminAnimeThemePatchInput{
		ThemeTypeID: req.ThemeTypeID,
		Title:       req.Title,
	}

	err = h.themeRepo.UpdateAdminAnimeTheme(c.Request.Context(), themeID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungueltiger theme_type_id", "code": "invalid_theme_type"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme update: theme_id=%d: %v", themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme konnte nicht aktualisiert werden.")
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteAnimeTheme verarbeitet DELETE /api/v1/admin/anime/:id/themes/:themeId und löscht ein Theme.
func (h *AdminContentHandler) DeleteAnimeTheme(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	_ = animeID // Anime-ID ist Teil der URL für semantische Klarheit, aber das Löschen wird via themeID durchgeführt

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungueltige theme id")
		return
	}

	err = h.themeRepo.DeleteAdminAnimeTheme(c.Request.Context(), themeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme delete: theme_id=%d: %v", themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme konnte nicht geloescht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}
