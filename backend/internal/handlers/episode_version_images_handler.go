package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type EpisodeVersionImagesHandler struct {
	imageRepo *repository.EpisodeVersionImageRepository
}

func NewEpisodeVersionImagesHandler(imageRepo *repository.EpisodeVersionImageRepository) *EpisodeVersionImagesHandler {
	return &EpisodeVersionImagesHandler{
		imageRepo: imageRepo,
	}
}

// ListReleaseImages returns paginated images for an episode version (release).
// GET /api/v1/releases/:releaseId/images?cursor=&limit=
func (h *EpisodeVersionImagesHandler) ListReleaseImages(c *gin.Context) {
	releaseIDRaw := c.Param("releaseId")
	releaseID, err := strconv.ParseInt(releaseIDRaw, 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungueltiger releaseId parameter")
		return
	}

	var cursor *string
	if cursorParam := c.Query("cursor"); cursorParam != "" {
		cursor = &cursorParam
	}

	limit := int32(12)
	if limitParam := c.Query("limit"); limitParam != "" {
		parsed, parseErr := strconv.ParseInt(limitParam, 10, 32)
		if parseErr != nil || parsed <= 0 {
			badRequest(c, "ungueltiger limit parameter")
			return
		}
		limit = int32(parsed)
	}

	images, nextCursor, err := h.imageRepo.GetByEpisodeVersionID(c.Request.Context(), releaseID, cursor, limit)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(c, "Release nicht gefunden")
			return
		}
		log.Printf("error listing release images for release=%d: %v", releaseID, err)
		internalError(c, "Fehler beim Laden der Bilder")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": models.EpisodeVersionImagesResponse{
			Images: images,
			Cursor: nextCursor,
		},
	})
}
