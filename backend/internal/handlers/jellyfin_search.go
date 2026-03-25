package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Request and input types for Jellyfin sync operations.

type adminAnimeJellyfinSyncRequest struct {
	JellyfinSeriesID        *string `json:"jellyfin_series_id"`
	SeasonNumber            *int32  `json:"season_number"`
	EpisodeStatus           *string `json:"episode_status"`
	OverwriteEpisodeTitle   *bool   `json:"overwrite_episode_titles"`
	OverwriteVersionTitle   *bool   `json:"overwrite_version_titles"`
	CleanupProviderVersions *bool   `json:"cleanup_provider_versions"`
	AllowMismatch           *bool   `json:"allow_mismatch"`
}

type adminAnimeJellyfinSyncInput struct {
	JellyfinSeriesID        string
	SeasonNumber            int32
	EpisodeStatus           string
	OverwriteEpisodeTitle   bool
	OverwriteVersionTitle   bool
	CleanupProviderVersions bool
	AllowMismatch           bool
}

// SearchJellyfinSeries searches for series in Jellyfin by title.
func (h *AdminContentHandler) SearchJellyfinSeries(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	if !h.ensureJellyfinConfigured(c) {
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "q ist erforderlich")
		return
	}
	if len([]rune(query)) > 120 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	limit := 25
	limitRaw := strings.TrimSpace(c.Query("limit"))
	if limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungueltiger limit parameter")
			return
		}
		limit = value
	}
	if limit > 100 {
		limit = 100
	}

	items, err := h.searchJellyfinSeries(c.Request.Context(), query, limit)
	if err != nil {
		log.Printf("admin_content jellyfin_series_search: search failed (user_id=%d, q=%q): %v", identity.UserID, query, err)
		message, code, details := classifyJellyfinUpstreamError(err, "jellyfin serien konnten nicht gesucht werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": buildAdminJellyfinIntakeSearchItems(items, query),
	})
}

// validateAdminAnimeJellyfinSyncRequest validates sync request parameters.
func validateAdminAnimeJellyfinSyncRequest(req adminAnimeJellyfinSyncRequest) (adminAnimeJellyfinSyncInput, string) {
	input := adminAnimeJellyfinSyncInput{
		SeasonNumber:  1,
		EpisodeStatus: "private",
	}

	if req.JellyfinSeriesID != nil {
		input.JellyfinSeriesID = strings.TrimSpace(*req.JellyfinSeriesID)
		if len(input.JellyfinSeriesID) > 120 {
			return adminAnimeJellyfinSyncInput{}, "jellyfin_series_id ist zu lang"
		}
	}

	if req.SeasonNumber != nil {
		if *req.SeasonNumber <= 0 {
			return adminAnimeJellyfinSyncInput{}, "ungueltiger season_number parameter"
		}
		input.SeasonNumber = *req.SeasonNumber
	}

	if req.EpisodeStatus != nil {
		status := strings.TrimSpace(*req.EpisodeStatus)
		if _, ok := allowedEpisodeStatuses[status]; !ok {
			return adminAnimeJellyfinSyncInput{}, "ungueltiger episode_status parameter"
		}
		input.EpisodeStatus = status
	}

	if req.OverwriteEpisodeTitle != nil {
		input.OverwriteEpisodeTitle = *req.OverwriteEpisodeTitle
	}
	if req.OverwriteVersionTitle != nil {
		input.OverwriteVersionTitle = *req.OverwriteVersionTitle
	}
	if req.CleanupProviderVersions != nil {
		input.CleanupProviderVersions = *req.CleanupProviderVersions
	}
	if req.AllowMismatch != nil {
		input.AllowMismatch = *req.AllowMismatch
	}

	return input, ""
}

// ensureJellyfinConfigured checks if Jellyfin integration is set up.
func (h *AdminContentHandler) ensureJellyfinConfigured(c *gin.Context) bool {
	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		details := "JELLYFIN_BASE_URL oder JELLYFIN_API_KEY fehlt."
		writeJellyfinErrorResponse(c, http.StatusServiceUnavailable, "jellyfin ist nicht konfiguriert", "jellyfin_not_configured", &details)
		return false
	}
	return true
}
