package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) CreateAnime(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req adminAnimeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content create_anime: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminAnimeCreateRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content create_anime: validation failed (user_id=%d): %s", identity.UserID, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateAnime(c.Request.Context(), input, identity.UserID)
	if err != nil {
		log.Printf("admin_content create_anime: repo error (user_id=%d): %v", identity.UserID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime konnte nicht angelegt werden. Falls lokal gerade auf v2 gearbeitet wird, bitte die neuesten Datenbank-Migrationen anwenden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (h *AdminContentHandler) UpdateAnime(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseAnimeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content update_anime: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige anime id")
		return
	}

	var req models.AdminAnimePatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content update_anime: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminAnimePatchRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content update_anime: validation failed (user_id=%d, anime_id=%d): %s", identity.UserID, id, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.UpdateAnime(c.Request.Context(), id, input, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content update_anime: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime konnte nicht gespeichert werden. Der Bearbeitungs-Pfad oder das Datenbank-Schema ist noch nicht vollstaendig synchron.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (h *AdminContentHandler) DeleteAnime(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseAnimeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content delete_anime: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige anime id")
		return
	}

	result, err := h.repo.DeleteAnime(c.Request.Context(), id, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content delete_anime: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime konnte nicht geloescht werden.")
		return
	}
	h.cleanupDeletedAnimeDir(result.AnimeID)

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *AdminContentHandler) cleanupDeletedAnimeDir(animeID int64) {
	if h == nil || animeID <= 0 || strings.TrimSpace(h.mediaStorageDir) == "" {
		return
	}

	base := filepath.Clean(h.mediaStorageDir)
	targetDir := filepath.Join(base, "anime", fmt.Sprintf("%d", animeID))
	rel, err := filepath.Rel(base, targetDir)
	if err != nil {
		return
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return
	}
	if err := os.RemoveAll(targetDir); err != nil {
		log.Printf("admin_content delete_anime: cleanup anime dir %s failed: %v", targetDir, err)
	}
}
