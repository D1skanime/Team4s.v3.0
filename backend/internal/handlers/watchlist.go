package handlers

import (
	"errors"
	"math"
	"net/http"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type createWatchlistRequest struct {
	AnimeID int64 `json:"anime_id"`
}

type WatchlistHandler struct {
	repo *repository.WatchlistRepository
}

func NewWatchlistHandler(repo *repository.WatchlistRepository) *WatchlistHandler {
	return &WatchlistHandler{repo: repo}
}

func (h *WatchlistHandler) ListByUser(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}
	userID := identity.UserID

	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungueltiger page parameter")
		return
	}

	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "20"))
	if err != nil {
		badRequest(c, "ungueltiger per_page parameter")
		return
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := h.repo.ListByUser(c.Request.Context(), models.WatchlistFilter{
		Page:    page,
		PerPage: perPage,
		UserID:  userID,
	})
	if err != nil {
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

func (h *WatchlistHandler) CreateByUser(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}
	userID := identity.UserID

	var req createWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	animeID, validationMessage := validateCreateWatchlistRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateByUser(c.Request.Context(), userID, animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
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

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *WatchlistHandler) DeleteByUser(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}
	userID := identity.UserID

	animeID, err := parseAnimeID(c.Param("anime_id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	if err := h.repo.DeleteByUser(c.Request.Context(), userID, animeID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "watchlist-eintrag nicht gefunden",
			},
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *WatchlistHandler) GetByUserAndAnimeID(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}
	userID := identity.UserID

	animeID, err := parseAnimeID(c.Param("anime_id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	item, err := h.repo.GetByUserAndAnimeID(c.Request.Context(), userID, animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "watchlist-eintrag nicht gefunden",
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
		"data": item,
	})
}

func validateCreateWatchlistRequest(req createWatchlistRequest) (int64, string) {
	if req.AnimeID <= 0 {
		return 0, "anime_id ist erforderlich"
	}

	return req.AnimeID, ""
}
