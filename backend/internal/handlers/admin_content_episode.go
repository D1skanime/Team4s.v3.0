package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) CreateEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req adminEpisodeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content create_episode: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminEpisodeCreateRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content create_episode: validation failed (user_id=%d): %s", identity.UserID, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateEpisode(c.Request.Context(), input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content create_episode: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, input.AnimeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (h *AdminContentHandler) UpdateEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content update_episode: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige episode id")
		return
	}

	var req models.AdminEpisodePatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content update_episode: bad request (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminEpisodePatchRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content update_episode: validation failed (user_id=%d, episode_id=%d): %s", identity.UserID, id, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.UpdateEpisode(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episode nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content update_episode: repo error (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (h *AdminContentHandler) DeleteEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content delete_episode: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige episode id")
		return
	}

	result, err := h.repo.DeleteEpisode(c.Request.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episode nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content delete_episode: repo error (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
