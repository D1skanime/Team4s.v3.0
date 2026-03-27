package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type adminAnimeBannerAssignRequest struct {
	MediaID string `json:"media_id"`
}

type adminAnimeBackgroundAssignRequest struct {
	MediaID string `json:"media_id"`
}

func (h *AdminContentHandler) AssignAnimeCoverAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeBannerAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltige anfrage")
		return
	}

	if err := h.animeAssetRepo.AssignManualCover(c.Request.Context(), animeID, req.MediaID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder media asset nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime cover assign: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "cover konnte nicht gesetzt werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) DeleteAnimeCoverAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	if err := h.animeAssetRepo.ClearCover(c.Request.Context(), animeID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime cover delete: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "cover konnte nicht geloescht werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) AssignAnimeBannerAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeBannerAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltige anfrage")
		return
	}

	if err := h.animeAssetRepo.AssignManualBanner(c.Request.Context(), animeID, req.MediaID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder media asset nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime banner assign: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "banner konnte nicht gesetzt werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) DeleteAnimeBannerAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	if err := h.animeAssetRepo.ClearBanner(c.Request.Context(), animeID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime banner delete: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "banner konnte nicht geloescht werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) AddAnimeBackgroundAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeBackgroundAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltige anfrage")
		return
	}

	item, err := h.animeAssetRepo.AddManualBackground(c.Request.Context(), animeID, req.MediaID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder media asset nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime background add: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "background konnte nicht gesetzt werden"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (h *AdminContentHandler) DeleteAnimeBackgroundAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.animeAssetRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime-asset service nicht verfuegbar"}})
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	backgroundID, err := parseInt64Param(c.Param("backgroundId"))
	if err != nil {
		badRequest(c, "ungueltige background id")
		return
	}

	if err := h.animeAssetRepo.RemoveBackground(c.Request.Context(), animeID, backgroundID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "background nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime background delete: anime_id=%d background_id=%d: %v", animeID, backgroundID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "background konnte nicht geloescht werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func parseInt64Param(raw string) (int64, error) {
	return parseAnimeID(raw)
}
