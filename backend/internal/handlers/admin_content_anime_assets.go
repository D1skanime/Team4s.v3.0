package handlers

import (
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminAnimeBannerAssignRequest enthält die MediaID für das Zuweisen eines Banner-Assets zu einem Anime.
type adminAnimeBannerAssignRequest struct {
	MediaID string `json:"media_id"`
}

// adminAnimeBackgroundAssignRequest enthält die MediaID und optionale Provider-Informationen
// für das Hinzufügen eines Hintergrundbilds zu einem Anime.
type adminAnimeBackgroundAssignRequest struct {
	MediaID     string  `json:"media_id"`
	ProviderKey *string `json:"provider_key"`
}

// animeAssetOperation repräsentiert die möglichen Operationen auf einem Anime-Asset (zuweisen, leeren, hinzufügen, entfernen).
type animeAssetOperation string

const (
	animeAssetOperationAssign animeAssetOperation = "assign"
	animeAssetOperationClear  animeAssetOperation = "clear"
	animeAssetOperationAdd    animeAssetOperation = "add"
	animeAssetOperationRemove animeAssetOperation = "remove"
)

// unsupportedAnimeAssetOperationMessage erzeugt eine Fehlermeldung für nicht unterstützte Asset-Operationen.
func unsupportedAnimeAssetOperationMessage(slot string, operation animeAssetOperation) string {
	return strings.TrimSpace(slot) + " unterstuetzt diese aktion nicht"
}

// mapAnimeAssetLinkError übersetzt Repository-Fehler beim Asset-Verknüpfen in HTTP-Status und Meldung.
func mapAnimeAssetLinkError(slot string, err error) (string, int) {
	switch {
	case errors.Is(err, repository.ErrAnimeAssetMediaTypeMismatch):
		return "media asset passt nicht zu " + strings.TrimSpace(slot), http.StatusBadRequest
	case errors.Is(err, repository.ErrNotFound):
		return "anime oder media asset nicht gefunden", http.StatusNotFound
	default:
		return "", http.StatusInternalServerError
	}
}

// AssignAnimeCoverAsset verarbeitet PUT /api/v1/admin/anime/:id/assets/cover und setzt das Cover-Bild.
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
		if message, status := mapAnimeAssetLinkError("cover", err); message != "" && status != http.StatusInternalServerError {
			c.JSON(status, gin.H{"error": gin.H{"message": message}})
			return
		}
		log.Printf("admin anime cover assign: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "cover konnte nicht gesetzt werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteAnimeCoverAsset verarbeitet DELETE /api/v1/admin/anime/:id/assets/cover und entfernt das Cover-Bild.
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

	result, err := h.animeAssetRepo.ClearCoverWithResult(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime cover delete: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "cover konnte nicht geloescht werden"}})
		return
	}
	h.cleanupAnimeAssetDirs(result)

	c.Status(http.StatusNoContent)
}

// AssignAnimeBannerAsset verarbeitet PUT /api/v1/admin/anime/:id/assets/banner und setzt das Banner-Bild.
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
		if message, status := mapAnimeAssetLinkError("banner", err); message != "" && status != http.StatusInternalServerError {
			c.JSON(status, gin.H{"error": gin.H{"message": message}})
			return
		}
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

	item, err := h.animeAssetRepo.AddManualBackground(c.Request.Context(), animeID, req.MediaID, req.ProviderKey)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder media asset nicht gefunden"}})
		return
	}
	if err != nil {
		if message, status := mapAnimeAssetLinkError("background", err); message != "" && status != http.StatusInternalServerError {
			c.JSON(status, gin.H{"error": gin.H{"message": message}})
			return
		}
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

func (h *AdminContentHandler) AssignAnimeLogoAsset(c *gin.Context) {
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

	if err := h.animeAssetRepo.AssignManualLogo(c.Request.Context(), animeID, req.MediaID); err != nil {
		if message, status := mapAnimeAssetLinkError("logo", err); message != "" && status != http.StatusInternalServerError {
			c.JSON(status, gin.H{"error": gin.H{"message": message}})
			return
		}
		log.Printf("admin anime logo assign: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "logo konnte nicht gesetzt werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) DeleteAnimeLogoAsset(c *gin.Context) {
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

	if err := h.animeAssetRepo.ClearLogo(c.Request.Context(), animeID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime logo delete: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "logo konnte nicht geloescht werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) AssignAnimeBackgroundVideoAsset(c *gin.Context) {
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

	if err := h.animeAssetRepo.AssignManualBackgroundVideo(c.Request.Context(), animeID, req.MediaID); err != nil {
		if message, status := mapAnimeAssetLinkError("background_video", err); message != "" && status != http.StatusInternalServerError {
			c.JSON(status, gin.H{"error": gin.H{"message": message}})
			return
		}
		log.Printf("admin anime background video assign: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "background_video konnte nicht gesetzt werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *AdminContentHandler) DeleteAnimeBackgroundVideoAsset(c *gin.Context) {
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

	if err := h.animeAssetRepo.ClearBackgroundVideo(c.Request.Context(), animeID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("admin anime background video delete: anime_id=%d: %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "background_video konnte nicht geloescht werden"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func parseInt64Param(raw string) (int64, error) {
	return parseAnimeID(raw)
}

func (h *AdminContentHandler) cleanupAnimeAssetDirs(result *models.AnimeAssetRemovalResult) {
	if h == nil || strings.TrimSpace(h.mediaStorageDir) == "" || result == nil {
		return
	}

	base := filepath.Clean(h.mediaStorageDir)
	seen := make(map[string]struct{})
	for _, rawPath := range result.RemovedPaths {
		trimmed := strings.TrimSpace(rawPath)
		if trimmed == "" {
			continue
		}

		relative := strings.TrimPrefix(trimmed, "/media/")
		targetDir := filepath.Clean(filepath.Join(base, filepath.FromSlash(relative)))
		targetDir = filepath.Dir(targetDir)
		if targetDir == "." || targetDir == string(filepath.Separator) {
			continue
		}

		rel, err := filepath.Rel(base, targetDir)
		if err != nil {
			continue
		}
		if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
			continue
		}
		if _, ok := seen[targetDir]; ok {
			continue
		}
		seen[targetDir] = struct{}{}

		if err := os.RemoveAll(targetDir); err != nil {
			log.Printf("admin anime asset cleanup: remove %s failed: %v", targetDir, err)
		}
	}
}
