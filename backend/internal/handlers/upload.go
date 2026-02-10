package handlers

import (
	"errors"
	"net/http"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// UploadHandler handles file upload requests
type UploadHandler struct {
	uploadService *services.UploadService
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(uploadService *services.UploadService) *UploadHandler {
	return &UploadHandler{uploadService: uploadService}
}

// UploadCover handles POST /api/v1/admin/upload/cover
func (h *UploadHandler) UploadCover(c *gin.Context) {
	// Get the file from form data
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "no file provided",
			"details": err.Error(),
		})
		return
	}

	// Upload the file
	result, err := h.uploadService.UploadCover(file)
	if err != nil {
		status := http.StatusInternalServerError
		message := "failed to upload file"

		if errors.Is(err, services.ErrFileTooLarge) {
			status = http.StatusRequestEntityTooLarge
			message = "file size exceeds maximum allowed (5MB)"
		} else if errors.Is(err, services.ErrInvalidFileType) {
			status = http.StatusBadRequest
			message = "invalid file type. Allowed: jpg, png, webp, gif"
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// DeleteCover handles DELETE /api/v1/admin/upload/cover/:filename
func (h *UploadHandler) DeleteCover(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename is required"})
		return
	}

	if err := h.uploadService.DeleteCover(filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to delete file",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "file deleted successfully"})
}
