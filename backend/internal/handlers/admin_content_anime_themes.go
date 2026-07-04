package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
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
	if _, _, ok := permissionActorFromContext(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
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
	if _, _, ok := permissionActorFromContext(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
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
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	if !h.requireAnimeThemeCreate(c, identity, actor, animeID) {
		return
	}

	var req adminAnimeThemeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
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
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungültiger theme_type_id", "code": "invalid_theme_type"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme create: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

func (h *AdminContentHandler) requireAnimeThemeCreate(c *gin.Context, identity middleware.AuthIdentity, actor permissions.Actor, animeID int64) bool {
	if actor.IsPlatformAdmin {
		return true
	}

	releaseVariantID := parseReleaseVariantIDQuery(c)
	if releaseVariantID < 0 {
		badRequest(c, "ungültige release_variant_id")
		return false
	}
	if releaseVariantID <= 0 {
		badRequest(c, "release_variant_id ist erforderlich")
		return false
	}
	if h.permissionSvc == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "permission service nicht verfügbar"}})
		return false
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, releaseVariantID)
	if err != nil {
		writePermissionInternalError(c, err, "Segment-Berechtigung konnte nicht geprüft werden.")
		return false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_theme.create_for_segment.denied", nil, "release_variant", &releaseVariantID, permissions.ActionReleaseVersionSegmentsManage, result)
		writePermissionDenied(c, result)
		return false
	}

	matches, err := h.themeRepo.ReleaseVariantBelongsToAnime(c.Request.Context(), releaseVariantID, animeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Variante konnte nicht geprüft werden.")
		return false
	}
	if !matches {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Release-Variante gehört nicht zu diesem Anime."}})
		return false
	}

	return true
}

// UpdateAnimeTheme verarbeitet PATCH /api/v1/admin/anime/:id/themes/:themeId und aktualisiert ein Theme.
func (h *AdminContentHandler) UpdateAnimeTheme(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}
	_ = animeID // Anime-ID ist Teil der URL für semantische Klarheit, aber das Update wird via themeID durchgeführt

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungültige theme id")
		return
	}

	var req adminAnimeThemePatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
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
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungültiger theme_type_id", "code": "invalid_theme_type"}})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}
	_ = animeID // Anime-ID ist Teil der URL für semantische Klarheit, aber das Löschen wird via themeID durchgeführt

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungültige theme id")
		return
	}

	err = h.themeRepo.DeleteAdminAnimeTheme(c.Request.Context(), themeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme delete: theme_id=%d: %v", themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme konnte nicht gelöscht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}
