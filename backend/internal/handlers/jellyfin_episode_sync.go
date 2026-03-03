package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// SyncEpisodeFromJellyfin imports a single episode from Jellyfin into the database.
func (h *AdminContentHandler) SyncEpisodeFromJellyfin(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	episodeIDParam := strings.TrimSpace(c.Param("episodeId"))
	targetEpisodeNumber, parseErr := strconv.ParseInt(episodeIDParam, 10, 32)
	if parseErr != nil || targetEpisodeNumber <= 0 {
		badRequest(c, "ungueltige episode nummer")
		return
	}

	if !h.ensureJellyfinConfigured(c) {
		return
	}
	if h.episodeVersionRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	var req adminAnimeJellyfinSyncRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
			log.Printf("admin_content jellyfin_episode_sync: bad request (user_id=%d, anime_id=%d, episode=%d): %v", identity.UserID, animeID, targetEpisodeNumber, bindErr)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input, validationMessage := validateAdminAnimeJellyfinSyncRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	_, series, episodes, ok := h.loadJellyfinEpisodeSyncSeriesAndEpisodes(c, identity.UserID, animeID, input)
	if !ok {
		return
	}

	sortJellyfinEpisodes(episodes)

	targetEpisode := findTargetJellyfinEpisode(episodes, input.SeasonNumber, normalizeNullableStringPtr(series.Path), int32(targetEpisodeNumber))

	if targetEpisode == nil {
		details := fmt.Sprintf("Episode %d wurde nicht in Jellyfin gefunden. Bitte Season-Nummer und Pfad-Filter pruefen.", targetEpisodeNumber)
		writeJellyfinErrorResponse(c, http.StatusNotFound, "episode nicht in jellyfin gefunden", "jellyfin_episode_not_found", &details)
		return
	}

	episodeNumber := jellyfinEpisodeNumber(targetEpisode.IndexNumber)
	mediaItemID := strings.TrimSpace(targetEpisode.ID)
	if mediaItemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": "jellyfin episode hat keine media item id",
			},
		})
		return
	}

	fansubGroupID := h.resolveJellyfinEpisodeFansubGroupID(c, animeID, targetEpisode)
	deletedCount, ok := h.cleanupJellyfinEpisodeProviderVersions(c, identity.UserID, animeID, episodeNumber, input.CleanupProviderVersions)
	if !ok {
		return
	}

	episodeTitle, episodeCreated, ok := h.upsertJellyfinEpisode(c, animeID, episodeNumber, mediaItemID, targetEpisode, input)
	if !ok {
		return
	}

	versionCreated, ok := h.upsertJellyfinEpisodeVersion(c, animeID, episodeNumber, mediaItemID, episodeTitle, fansubGroupID, targetEpisode)
	if !ok {
		return
	}

	result := gin.H{
		"anime_id":        animeID,
		"episode_number":  episodeNumber,
		"episode_created": episodeCreated,
		"version_created": versionCreated,
		"deleted_count":   deletedCount,
		"media_item_id":   mediaItemID,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}
