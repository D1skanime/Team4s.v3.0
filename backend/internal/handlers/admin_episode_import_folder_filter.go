package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"team4s.v3/backend/internal/models"
)

// resolveEpisodeImportFolderFilterPath resolves which Jellyfin folder path
// PreviewEpisodeImport should use as a local path filter for media candidates
// (GAP-07, 165-UAT.md). Kept in a sibling file rather than inline in
// admin_episode_import.go, which is already at CLAUDE.md's file-size budget
// -- see admin_episode_import_ownership.go for the same precedent.
//
// When the caller did not explicitly select a folder different from the
// anime's main connected folder (contextResult.JellyfinSeriesID), the
// existing main-folder path is used unchanged -- zero behavior change, zero
// new Jellyfin requests for the single-folder / main-folder case.
//
// When an explicit, different (non-main) folder WAS selected -- already
// proven to be one of the anime's own connected folders by
// rejectUnownedJellyfinSeriesID before this runs -- the selected folder's OWN
// path is fetched via a single getJellyfinSeriesByID call (never per-episode)
// and used as the filter instead. Without this, loadEpisodeImportMediaCandidates
// always filtered by the main folder's path even though listJellyfinEpisodes
// already scoped the fetch server-side to the selected series, discarding
// every episode of the additionally-connected folder.
//
// Returns (path, true) on success (path may be nil, meaning "no local path
// filter needed" -- listJellyfinEpisodes already scoped the fetch to the
// selected series server-side). Returns (nil, false) when an upstream error
// response was already written to c -- callers must return immediately.
func (h *AdminContentHandler) resolveEpisodeImportFolderFilterPath(
	c *gin.Context,
	animeID int64,
	jellyfinSeriesID string,
	contextResult models.EpisodeImportContextResult,
) (*string, bool) {
	requested := strings.TrimSpace(jellyfinSeriesID)
	if requested == "" || requested == strings.TrimSpace(derefString(contextResult.JellyfinSeriesID)) {
		return contextResult.FolderPath, true
	}

	seriesItem, err := h.getJellyfinSeriesByID(c.Request.Context(), requested)
	if err != nil {
		log.Printf("episode import preview jellyfin failed anime_id=%d series_id=%q: %v", animeID, requested, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "jellyfin episoden konnten nicht geladen werden"}})
		return nil, false
	}
	if seriesItem == nil || strings.TrimSpace(seriesItem.Path) == "" {
		return nil, true
	}
	return normalizeStringPtr(seriesItem.Path), true
}
