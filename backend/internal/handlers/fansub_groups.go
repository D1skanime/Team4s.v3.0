package handlers

import (
	"errors"
	"log"
	"math"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubs returns a paginated list of fansub groups.
func (h *FansubHandler) ListFansubs(c *gin.Context) {
	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungueltiger page parameter")
		return
	}

	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "24"))
	if err != nil {
		badRequest(c, "ungueltiger per_page parameter")
		return
	}
	if perPage > 500 {
		perPage = 500
	}

	q := strings.TrimSpace(c.Query("q"))
	if len([]rune(q)) > 120 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		if _, ok := allowedFansubStatuses[status]; !ok {
			badRequest(c, "ungueltiger status parameter")
			return
		}
	}

	items, total, err := h.fansubRepo.ListGroups(c.Request.Context(), models.FansubFilter{
		Page:    page,
		PerPage: perPage,
		Q:       q,
		Status:  status,
	})
	if err != nil {
		log.Printf("fansub list: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(perPage)))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": models.PaginationMeta{
			Total:      total,
			Page:       page,
			PerPage:    perPage,
			TotalPages: totalPages,
		},
	})
}

// CreateFansub creates a new fansub group.
func (h *FansubHandler) CreateFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req fansubGroupCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub create: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateGroup(c.Request.Context(), input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "fansubgruppe bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub create: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

// GetFansubByID returns a fansub group by its ID.
func (h *FansubHandler) GetFansubByID(c *gin.Context) {
	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	item, err := h.fansubRepo.GetGroupByID(c.Request.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub get: repo error (fansub_id=%d): %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// GetFansubBySlug returns a fansub group by its slug.
func (h *FansubHandler) GetFansubBySlug(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" || len([]rune(slug)) > 120 {
		badRequest(c, "ungueltiger fansub slug")
		return
	}

	item, err := h.fansubRepo.GetGroupBySlug(c.Request.Context(), slug)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub get by slug: repo error (slug=%q): %v", slug, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// UpdateFansub modifies an existing fansub group.
func (h *FansubHandler) UpdateFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req models.FansubGroupPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub update: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.UpdateGroup(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "fansubgruppe bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub update: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// DeleteFansub removes a fansub group.
func (h *FansubHandler) DeleteFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	if err := h.fansubRepo.DeleteGroup(c.Request.Context(), id); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("fansub delete: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
