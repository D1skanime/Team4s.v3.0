package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/middleware"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type CommentHandler struct {
	repo *repository.CommentRepository
}

func NewCommentHandler(repo *repository.CommentRepository) *CommentHandler {
	return &CommentHandler{repo: repo}
}

// GetAnimeComments handles GET /api/v1/anime/:id/comments
// Returns paginated comments for an anime (public endpoint)
func (h *CommentHandler) GetAnimeComments(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Parse pagination params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	// Get current user ID if authenticated (optional)
	currentUserID := middleware.GetUserID(c)

	ctx := c.Request.Context()

	// Check if anime exists
	exists, err := h.repo.AnimeExists(ctx, animeID)
	if err != nil {
		log.Printf("Error checking anime exists: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "anime not found"})
		return
	}

	// Get comments
	comments, err := h.repo.GetCommentsByAnime(ctx, animeID, page, perPage, currentUserID)
	if err != nil {
		log.Printf("Error getting comments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// CreateComment handles POST /api/v1/anime/:id/comments
// Creates a new comment on an anime (authenticated)
func (h *CommentHandler) CreateComment(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse request body
	var req models.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required (1-2000 characters)"})
		return
	}

	// Trim and validate message
	message := strings.TrimSpace(req.Message)
	if len(message) < models.MinCommentLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment cannot be empty"})
		return
	}
	if len(message) > models.MaxCommentLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment too long (max 2000 characters)"})
		return
	}

	ctx := c.Request.Context()

	// Check if anime exists
	animeExists, err := h.repo.AnimeExists(ctx, animeID)
	if err != nil {
		log.Printf("Error checking anime exists: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if !animeExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "anime not found"})
		return
	}

	// Validate reply_to_id if provided
	if req.ReplyToID != nil {
		replyExists, err := h.repo.CommentExists(ctx, *req.ReplyToID)
		if err != nil {
			log.Printf("Error checking reply comment exists: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		if !replyExists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "reply target comment not found"})
			return
		}
	}

	// Create comment
	comment, err := h.repo.CreateComment(ctx, animeID, userID, message, req.ReplyToID)
	if err != nil {
		log.Printf("Error creating comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusCreated, models.CommentResponse{Data: *comment})
}

// UpdateComment handles PUT /api/v1/anime/:id/comments/:commentId
// Updates an existing comment (authenticated, own comments only)
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	// Parse anime ID from path (for validation)
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Parse comment ID from path
	commentID, err := strconv.ParseInt(c.Param("commentId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse request body
	var req models.UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required (1-2000 characters)"})
		return
	}

	// Trim and validate message
	message := strings.TrimSpace(req.Message)
	if len(message) < models.MinCommentLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment cannot be empty"})
		return
	}
	if len(message) > models.MaxCommentLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment too long (max 2000 characters)"})
		return
	}

	ctx := c.Request.Context()

	// Get existing comment to check ownership
	existingComment, err := h.repo.GetCommentByID(ctx, commentID)
	if err != nil {
		log.Printf("Error getting comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if existingComment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Verify comment belongs to this anime
	if existingComment.AnimeID != animeID {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Check if user owns this comment
	if existingComment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only edit your own comments"})
		return
	}

	// Check if already deleted
	if existingComment.IsDeleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Update comment
	updatedComment, err := h.repo.UpdateComment(ctx, commentID, message)
	if err != nil {
		log.Printf("Error updating comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if updatedComment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	c.JSON(http.StatusOK, models.CommentResponse{Data: *updatedComment})
}

// DeleteComment handles DELETE /api/v1/anime/:id/comments/:commentId
// Soft-deletes a comment (authenticated, own comments only)
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	// Parse anime ID from path (for validation)
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Parse comment ID from path
	commentID, err := strconv.ParseInt(c.Param("commentId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	// Get existing comment to check ownership
	existingComment, err := h.repo.GetCommentByID(ctx, commentID)
	if err != nil {
		log.Printf("Error getting comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if existingComment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Verify comment belongs to this anime
	if existingComment.AnimeID != animeID {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Check if user owns this comment
	if existingComment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own comments"})
		return
	}

	// Check if already deleted
	if existingComment.IsDeleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Delete comment
	deleted, err := h.repo.DeleteComment(ctx, commentID, userID)
	if err != nil {
		log.Printf("Error deleting comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	c.Status(http.StatusNoContent)
}
