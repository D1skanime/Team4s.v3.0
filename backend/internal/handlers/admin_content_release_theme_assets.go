package handlers

import (
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

func parseFansubRouteID(c *gin.Context) (int64, error) {
	raw := c.Param("fansubId")
	if raw == "" {
		raw = c.Param("id")
	}
	return strconv.ParseInt(raw, 10, 64)
}

// ListFansubAnime liefert alle Anime einer Fansub-Gruppe für den OP/ED-Upload-Flow.
func (h *AdminContentHandler) ListFansubAnime(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	items, err := h.themeRepo.ListFansubAnime(c.Request.Context(), fansubID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Liste konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListReleaseThemeAssets verarbeitet GET /api/v1/admin/releases/:releaseId/theme-assets.
func (h *AdminContentHandler) ListReleaseThemeAssets(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	releaseID, err := strconv.ParseInt(c.Param("releaseId"), 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungültige release id")
		return
	}

	items, err := h.themeRepo.ListReleaseThemeAssets(c.Request.Context(), releaseID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Videos konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListFansubAnimeThemeAssets verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/theme-assets.
func (h *AdminContentHandler) ListFansubAnimeThemeAssets(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
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

	releaseID, items, err := h.themeRepo.ListReleaseThemeAssetsByFansubAnime(c.Request.Context(), fansubID, animeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Videos konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"release_id": releaseID,
		"data":       items,
	})
}

// UploadReleaseThemeAsset verarbeitet POST /api/v1/admin/fansubs/:fansubId/anime/:animeId/theme-assets.
func (h *AdminContentHandler) UploadReleaseThemeAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil || h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme video service nicht verfügbar"}})
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
	themeID, err := strconv.ParseInt(c.PostForm("theme_id"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungültige theme id")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}

	releaseID, err := h.themeRepo.GetCanonicalFansubAnimeRelease(c.Request.Context(), fansubID, animeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release konnte nicht vorbereitet werden.")
		return
	}
	if releaseID == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "keine bestehende release-version für diese fansub-anime-kombination gefunden",
				"code":    "missing_release_anchor",
			},
		})
		return
	}

	lockedByGlobalSegment, err := h.themeRepo.HasGlobalThemeSegmentCoverageForRelease(c.Request.Context(), *releaseID, themeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Regel konnte nicht geprueft werden.")
		return
	}
	if lockedByGlobalSegment {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{
			"message": "dieses theme ist bereits global für den episodenbereich gesetzt und kann hier nicht abweichend hochgeladen werden",
			"code":    "theme_segment_locked",
		}})
		return
	}

	saveResult, err := h.mediaService.SaveReleaseThemeVideoUpload(services.ReleaseThemeVideoStorageContext{
		ReleaseID: *releaseID,
		ThemeID:   themeID,
	}, fileHeader.Filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Video konnte nicht gespeichert werden.")
		return
	}

	mediaAsset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Asset konnte nicht gespeichert werden.")
		return
	}

	if err := h.mediaRepo.InsertMediaFile(
		c.Request.Context(),
		mediaAsset.ID,
		"original",
		mediaAsset.StoragePath,
		int64(len(data)),
	); err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigroesse konnte nicht gespeichert werden.")
		return
	}

	created, err := h.themeRepo.CreateReleaseThemeAsset(c.Request.Context(), models.AdminReleaseThemeAssetCreateInput{
		ReleaseID: *releaseID,
		ThemeID:   themeID,
		MediaID:   mediaAsset.ID,
	})
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "theme bereits zugewiesen", "code": "already_assigned"}})
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release oder theme nicht gefunden"}})
			return
		}
		log.Printf("admin release theme asset upload: fansub=%d anime=%d theme=%d: %v", fansubID, animeID, themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht verknuepft werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// UploadReleaseThemeAssetForRelease verarbeitet POST /api/v1/admin/releases/:releaseId/theme-assets.
func (h *AdminContentHandler) UploadReleaseThemeAssetForRelease(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil || h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme video service nicht verfügbar"}})
		return
	}

	releaseID, err := strconv.ParseInt(c.Param("releaseId"), 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungültige release id")
		return
	}
	themeID, err := strconv.ParseInt(c.PostForm("theme_id"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungültige theme id")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}

	lockedByGlobalSegment, err := h.themeRepo.HasGlobalThemeSegmentCoverageForRelease(c.Request.Context(), releaseID, themeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Regel konnte nicht geprueft werden.")
		return
	}
	if lockedByGlobalSegment {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{
			"message": "dieses theme ist bereits global für den episodenbereich gesetzt und kann hier nicht abweichend hochgeladen werden",
			"code":    "theme_segment_locked",
		}})
		return
	}

	saveResult, err := h.mediaService.SaveReleaseThemeVideoUpload(services.ReleaseThemeVideoStorageContext{
		ReleaseID: releaseID,
		ThemeID:   themeID,
	}, fileHeader.Filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Video konnte nicht gespeichert werden.")
		return
	}

	mediaAsset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Asset konnte nicht gespeichert werden.")
		return
	}

	if err := h.mediaRepo.InsertMediaFile(
		c.Request.Context(),
		mediaAsset.ID,
		"original",
		mediaAsset.StoragePath,
		int64(len(data)),
	); err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigroesse konnte nicht gespeichert werden.")
		return
	}

	created, err := h.themeRepo.CreateReleaseThemeAsset(c.Request.Context(), models.AdminReleaseThemeAssetCreateInput{
		ReleaseID: releaseID,
		ThemeID:   themeID,
		MediaID:   mediaAsset.ID,
	})
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "theme bereits zugewiesen", "code": "already_assigned"}})
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release oder theme nicht gefunden"}})
			return
		}
		log.Printf("admin release theme asset direct upload: release=%d theme=%d: %v", releaseID, themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht verknuepft werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// DeleteReleaseThemeAsset verarbeitet DELETE /api/v1/admin/releases/:releaseId/theme-assets/:themeId/:mediaId.
func (h *AdminContentHandler) DeleteReleaseThemeAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil || h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	releaseID, err := strconv.ParseInt(c.Param("releaseId"), 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungültige release id")
		return
	}
	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungültige theme id")
		return
	}
	mediaID, err := strconv.ParseInt(c.Param("mediaId"), 10, 64)
	if err != nil || mediaID <= 0 {
		badRequest(c, "ungültige media id")
		return
	}

	mediaAsset, err := h.mediaRepo.GetMediaAssetByID(c.Request.Context(), mediaID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht vorbereitet werden.")
		return
	}

	err = h.themeRepo.DeleteReleaseThemeAsset(c.Request.Context(), releaseID, themeID, mediaID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme-video nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht gelöscht werden.")
		return
	}

	if mediaAsset != nil {
		if err := h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaID); err != nil && !errors.Is(err, repository.ErrNotFound) {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video-Datei konnte nicht gelöscht werden.")
			return
		}
		_ = removeFileQuietly(mediaAsset.StoragePath)
	}

	c.Status(http.StatusNoContent)
}
