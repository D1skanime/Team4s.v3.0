package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type EpisodeHandler struct {
	repo *repository.EpisodeRepository
}

func NewEpisodeHandler(repo *repository.EpisodeRepository) *EpisodeHandler {
	return &EpisodeHandler{repo: repo}
}

func (h *EpisodeHandler) GetByID(c *gin.Context) {
	id, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige episode id")
		return
	}

	episode, err := h.repo.GetByID(c.Request.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episode nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": episode,
	})
}

func parseEpisodeID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}

	return id, nil
}
