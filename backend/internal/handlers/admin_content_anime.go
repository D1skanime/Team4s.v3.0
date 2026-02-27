package handlers

import (
	"errors"
	"log"
	"net/http"

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

	item, err := h.repo.CreateAnime(c.Request.Context(), input)
	if err != nil {
		log.Printf("admin_content create_anime: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
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

	item, err := h.repo.UpdateAnime(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content update_anime: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}
