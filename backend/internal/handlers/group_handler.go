package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// GroupHandler verwaltet HTTP-Anfragen rund um Fansub-Gruppen und deren Releases.
type GroupHandler struct {
	repo *repository.GroupRepository
}

// NewGroupHandler erstellt einen neuen GroupHandler mit dem übergebenen Repository.
func NewGroupHandler(repo *repository.GroupRepository) *GroupHandler {
	return &GroupHandler{repo: repo}
}

// GetGroupDetail handles GET /api/v1/anime/{animeId}/group/{groupId}
func (h *GroupHandler) GetGroupDetail(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungueltige group id")
		return
	}

	detail, err := h.repo.GetGroupDetail(c.Request.Context(), animeID, groupID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "gruppe nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": detail})
}

// GetGroupReleases handles GET /api/v1/anime/{animeId}/group/{groupId}/releases
func (h *GroupHandler) GetGroupReleases(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungueltige group id")
		return
	}

	filter, err := parseGroupReleasesFilter(c)
	if err != nil {
		badRequest(c, "ungueltige filter parameter")
		return
	}

	data, total, err := h.repo.GetGroupReleases(c.Request.Context(), animeID, groupID, filter)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "gruppe nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	meta := buildPaginationMeta(filter.Page, filter.PerPage, total)
	c.JSON(http.StatusOK, gin.H{
		"data": data,
		"meta": meta,
	})
}

// parseGroupID parses groupId path parameter
func parseGroupID(s string) (int64, error) {
	id, err := strconv.ParseInt(s, 10, 64)
	if err != nil || id < 1 {
		return 0, errors.New("invalid group id")
	}
	return id, nil
}

// parseGroupReleasesFilter parses query parameters for releases endpoint
func parseGroupReleasesFilter(c *gin.Context) (models.GroupReleasesFilter, error) {
	filter := models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
	}

	if pageStr := c.Query("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			return filter, errors.New("invalid page")
		}
		filter.Page = page
	}

	if perPageStr := c.Query("per_page"); perPageStr != "" {
		perPage, err := strconv.Atoi(perPageStr)
		if err != nil || perPage < 1 || perPage > 100 {
			return filter, errors.New("invalid per_page")
		}
		filter.PerPage = perPage
	}

	if hasOPStr := c.Query("has_op"); hasOPStr != "" {
		hasOP, err := strconv.ParseBool(hasOPStr)
		if err != nil {
			return filter, errors.New("invalid has_op")
		}
		filter.HasOP = &hasOP
	}

	if hasEDStr := c.Query("has_ed"); hasEDStr != "" {
		hasED, err := strconv.ParseBool(hasEDStr)
		if err != nil {
			return filter, errors.New("invalid has_ed")
		}
		filter.HasED = &hasED
	}

	if hasKaraokeStr := c.Query("has_karaoke"); hasKaraokeStr != "" {
		hasKaraoke, err := strconv.ParseBool(hasKaraokeStr)
		if err != nil {
			return filter, errors.New("invalid has_karaoke")
		}
		filter.HasKaraoke = &hasKaraoke
	}

	filter.Q = c.Query("q")

	return filter, nil
}

// buildPaginationMeta constructs pagination metadata
func buildPaginationMeta(page, perPage int, total int64) map[string]any {
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	if totalPages < 1 {
		totalPages = 1
	}

	return map[string]any{
		"current_page": page,
		"per_page":     perPage,
		"total":        total,
		"total_pages":  totalPages,
	}
}

// notFound returns a 404 JSON error response
func notFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, gin.H{
		"error": gin.H{
			"message": message,
		},
	})
}

// internalError returns a 500 JSON error response
func internalError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, gin.H{
		"error": gin.H{
			"message": message,
		},
	})
}
