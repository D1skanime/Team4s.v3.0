package handlers

import (
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) ServeMediaFile(c *gin.Context) {
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfuegbar"}})
		return
	}

	filename := strings.TrimSpace(c.Param("filename"))
	if filename == "" || filename != filepath.Base(filename) || strings.Contains(filename, "..") {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "datei nicht gefunden"}})
		return
	}

	asset, err := h.mediaRepo.GetMediaAssetByFilename(c.Request.Context(), filename)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "datei nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("media serve: query failed (filename=%q): %v", filename, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if _, err := os.Stat(asset.StoragePath); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "datei nicht gefunden"}})
			return
		}
		log.Printf("media serve: stat failed (filename=%q): %v", filename, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Header("Content-Type", asset.MimeType)
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.File(asset.StoragePath)
}
