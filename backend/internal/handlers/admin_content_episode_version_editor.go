package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) GetEpisodeVersionEditorContext(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	data, err := h.loadEpisodeVersionEditorContext(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content episode_version_editor_context: user=%d version=%d err=%v", identity.UserID, versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}

func (h *AdminContentHandler) ScanEpisodeVersionFolder(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	result, statusCode, err := h.scanEpisodeVersionFolder(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	}
	if err != nil {
		if statusCode == 0 {
			statusCode = http.StatusInternalServerError
		}
		message := "interner serverfehler"
		if statusCode == http.StatusBadRequest || statusCode == http.StatusServiceUnavailable || statusCode == http.StatusBadGateway {
			message = err.Error()
		}
		log.Printf("admin_content episode_version_folder_scan: user=%d version=%d err=%v", identity.UserID, versionID, err)
		c.JSON(statusCode, gin.H{"error": gin.H{"message": message}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
