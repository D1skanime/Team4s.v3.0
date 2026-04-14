package handlers

import (
	"errors"
	"math"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const (
	maxCommentAuthorNameLength = 80
	maxCommentContentLength    = 4000
)

type createCommentRequest struct {
	Content string `json:"content"`
}

// CommentHandler verwaltet HTTP-Endpunkte für Kommentare zu Anime-Einträgen.
type CommentHandler struct {
	repo *repository.CommentRepository
}

// NewCommentHandler erstellt einen neuen CommentHandler mit dem angegebenen Repository.
func NewCommentHandler(repo *repository.CommentRepository) *CommentHandler {
	return &CommentHandler{repo: repo}
}

// ListByAnimeID verarbeitet GET /api/v1/anime/:id/comments und gibt eine paginierte Kommentarliste zurück.
func (h *CommentHandler) ListByAnimeID(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

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

	items, total, err := h.repo.ListByAnimeID(c.Request.Context(), animeID, models.CommentFilter{
		Page:    page,
		PerPage: perPage,
	})
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

// CreateByAnimeID verarbeitet POST /api/v1/anime/:id/comments und legt einen neuen Kommentar an.
func (h *CommentHandler) CreateByAnimeID(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req createCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	input, validationMessage := validateCreateCommentRequest(req, identity.DisplayName)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateByAnimeID(c.Request.Context(), animeID, input)
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

func validateCreateCommentRequest(req createCommentRequest, authorNameRaw string) (models.CommentCreateInput, string) {
	authorName := strings.TrimSpace(authorNameRaw)
	content := strings.TrimSpace(req.Content)

	if authorName == "" {
		return models.CommentCreateInput{}, "author_name ist erforderlich"
	}
	if len([]rune(authorName)) > maxCommentAuthorNameLength {
		return models.CommentCreateInput{}, "author_name ist zu lang (max 80 zeichen)"
	}

	if content == "" {
		return models.CommentCreateInput{}, "content ist erforderlich"
	}
	if len([]rune(content)) > maxCommentContentLength {
		return models.CommentCreateInput{}, "content ist zu lang (max 4000 zeichen)"
	}

	return models.CommentCreateInput{
		AuthorName: authorName,
		Content:    content,
	}, ""
}
