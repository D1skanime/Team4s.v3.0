package handlers

import (
	"strings"

	"github.com/gin-gonic/gin"

	"team4s.v3/backend/internal/models"
)

// rejectUnownedJellyfinSeriesID enforces that a client-supplied
// jellyfin_series_id in PreviewEpisodeImport is one of the target anime's own
// connected Jellyfin folders, before any Jellyfin HTTP call is made. This
// closes a pre-existing IDOR-shaped gap (RESEARCH.md Pitfall 5): without this
// check any admin could preview episodes from an arbitrary Jellyfin series
// unrelated to the anime being edited. Kept in a sibling file rather than
// inline in admin_episode_import.go, which is already 756 lines -- over
// CLAUDE.md's 450-line limit -- before this change.
//
// When requestedSeriesID is empty (today's single-folder auto-resolve path,
// using contextResult.JellyfinSeriesID) no check is performed. Returns true
// when a rejection response was written to c -- callers must return
// immediately in that case.
func (h *AdminContentHandler) rejectUnownedJellyfinSeriesID(c *gin.Context, requestedSeriesID string, folders []models.JellyfinFolderOption) bool {
	requested := strings.TrimSpace(requestedSeriesID)
	if requested == "" {
		return false
	}
	for _, folder := range folders {
		if folder.JellyfinItemID == requested {
			return false
		}
	}
	badRequest(c, "jellyfin_series_id ist nicht mit diesem Anime verbunden")
	return true
}
