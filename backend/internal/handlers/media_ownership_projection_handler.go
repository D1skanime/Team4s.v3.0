package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MediaOwnershipProjectionHandler handles read-only media ownership projection routes.
type MediaOwnershipProjectionHandler struct {
	repo *repository.MediaOwnershipProjectionRepository
}

// NewMediaOwnershipProjectionHandler creates a new MediaOwnershipProjectionHandler.
func NewMediaOwnershipProjectionHandler(
	repo *repository.MediaOwnershipProjectionRepository,
) *MediaOwnershipProjectionHandler {
	return &MediaOwnershipProjectionHandler{repo: repo}
}

// GetMediaOwnershipProjection handles GET /api/v1/media-ownership/:ownerType/:ownerId.
func (h *MediaOwnershipProjectionHandler) GetMediaOwnershipProjection(c *gin.Context) {
	ownerType, ok := parseMediaOwnerType(c.Param("ownerType"))
	if !ok {
		badRequest(c, "ungültiger owner-typ")
		return
	}

	ownerID, err := parseMediaOwnerID(c.Param("ownerId"))
	if err != nil {
		badRequest(c, "ungültige owner-id")
		return
	}

	response, err := h.repo.GetMediaOwnershipProjection(c.Request.Context(), ownerType, ownerID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

func parseMediaOwnerType(raw string) (string, bool) {
	ownerType := strings.ToLower(strings.TrimSpace(raw))
	switch ownerType {
	case "member", "fansub_group", "release_version", "release_theme":
		return ownerType, true
	default:
		return "", false
	}
}

func parseMediaOwnerID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}
