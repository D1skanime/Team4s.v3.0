package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type adminAnimeJellyfinIntakePreviewRequest struct {
	JellyfinSeriesID *string `json:"jellyfin_series_id"`
}

func validateAdminAnimeJellyfinIntakePreviewRequest(
	req adminAnimeJellyfinIntakePreviewRequest,
) (string, string) {
	seriesID := strings.TrimSpace(derefString(req.JellyfinSeriesID))
	if seriesID == "" {
		return "", "jellyfin_series_id ist erforderlich"
	}
	if len([]rune(seriesID)) > 120 {
		return "", "jellyfin_series_id ist zu lang"
	}
	return seriesID, ""
}

func (h *AdminContentHandler) PreviewAnimeIntakeFromJellyfin(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if !h.ensureJellyfinConfigured(c) {
		return
	}

	var req adminAnimeJellyfinIntakePreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content jellyfin_intake_preview: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	seriesID, validationMessage := validateAdminAnimeJellyfinIntakePreviewRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	detail, err := h.getJellyfinSeriesIntakeDetail(c.Request.Context(), seriesID)
	if err != nil {
		log.Printf("admin_content jellyfin_intake_preview: detail load failed (user_id=%d, series_id=%q): %v", identity.UserID, seriesID, err)
		message, code, details := classifyJellyfinUpstreamError(err, "jellyfin vorschau konnte nicht geladen werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return
	}
	if detail == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "jellyfin serie nicht gefunden",
			},
		})
		return
	}

	themeVideoIDs, err := h.listJellyfinThemeVideoIDs(c.Request.Context(), seriesID)
	if err != nil {
		log.Printf("admin_content jellyfin_intake_preview: theme videos failed (user_id=%d, series_id=%q): %v", identity.UserID, seriesID, err)
		themeVideoIDs = nil
	}

	c.JSON(http.StatusOK, gin.H{
		"data": buildAdminJellyfinIntakePreviewResult(*detail, themeVideoIDs),
	})
}
