package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type ReleaseAssetsHandler struct {
	episodeVersionRepo *repository.EpisodeVersionRepository
}

func NewReleaseAssetsHandler(episodeVersionRepo *repository.EpisodeVersionRepository) *ReleaseAssetsHandler {
	return &ReleaseAssetsHandler{
		episodeVersionRepo: episodeVersionRepo,
	}
}

// ListReleaseAssets returns the public media assets for a release.
func (h *ReleaseAssetsHandler) ListReleaseAssets(c *gin.Context) {
	releaseIDRaw := c.Param("releaseId")
	if strings.TrimSpace(releaseIDRaw) == "" {
		releaseIDRaw = c.Param("id")
	}

	releaseID, err := strconv.ParseInt(releaseIDRaw, 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungültiger releaseId parameter")
		return
	}

	data, err := h.episodeVersionRepo.ListReleaseAssets(c.Request.Context(), releaseID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "release nicht gefunden")
		return
	} else if err != nil {
		log.Printf("release assets: repo error (release_id=%d): %v", releaseID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
	})
}
