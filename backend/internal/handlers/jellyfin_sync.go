package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// SyncAnimeFromJellyfin imports episodes from Jellyfin into the database.
func (h *AdminContentHandler) SyncAnimeFromJellyfin(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
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
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("admin_content jellyfin_sync: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input, validationMessage := validateAdminAnimeJellyfinSyncRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_sync: load anime failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	seriesTitles := uniqueLookupTitles(animeSource.Title, animeSource.TitleDE, animeSource.TitleEN)
	resolvedSeriesID := strings.TrimSpace(input.JellyfinSeriesID)
	if resolvedSeriesID == "" {
		resolvedSeriesID = jellyfinSeriesIDFromSource(animeSource.Source)
	}

	series, statusCode, resolveErr := h.resolveJellyfinSeries(c.Request.Context(), seriesTitles, resolvedSeriesID)
	if resolveErr != nil {
		log.Printf(
			"admin_content jellyfin_sync: resolve series failed (user_id=%d, anime_id=%d, series_id=%q): %v",
			identity.UserID,
			animeID,
			input.JellyfinSeriesID,
			resolveErr,
		)
		code, details := classifyJellyfinResolutionError(statusCode, resolveErr.Error())
		writeJellyfinErrorResponse(c, statusCode, resolveErr.Error(), code, details)
		return
	}

	episodes, listErr := h.listJellyfinEpisodes(c.Request.Context(), series.ID)
	if listErr != nil {
		log.Printf(
			"admin_content jellyfin_sync: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
			identity.UserID,
			animeID,
			series.ID,
			listErr,
		)
		message, code, details := classifyJellyfinUpstreamError(listErr, "jellyfin episoden konnten nicht geladen werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return
	}

	sortJellyfinEpisodes(episodes)

	result := newAdminAnimeJellyfinSyncResult(animeID, series, input)

	acceptedEpisodes := h.collectAcceptedEpisodes(c, animeID, episodes, input, &result)
	if acceptedEpisodes == nil {
		return // Error already sent
	}

	result.AcceptedUniqueEpisodes = int32(len(collectUniqueEpisodeNumbers(acceptedEpisodes)))
	if result.AcceptedUniqueEpisodes == 0 {
		details := "Bitte Season-Nummer, Serienauswahl und Pfad-Filter pruefen, bevor der Sync gestartet wird."
		writeJellyfinErrorResponse(c, http.StatusConflict, "keine passenden jellyfin episoden gefunden", "jellyfin_no_matching_episodes", &details)
		return
	}
	if mismatchReason := buildJellyfinSyncMismatchReason(animeSource.MaxEpisodes, result.AcceptedUniqueEpisodes); mismatchReason != nil && !input.AllowMismatch {
		details := "Bitte die Preview pruefen oder den Guard nur bewusst mit allow_mismatch=true uebersteuern."
		writeJellyfinErrorResponse(c, http.StatusConflict, *mismatchReason, "jellyfin_episode_mismatch", &details)
		return
	}

	if !h.cleanupJellyfinProviderVersions(c, identity.UserID, animeID, input.CleanupProviderVersions, &result) {
		return
	}

	if !h.importAcceptedEpisodes(c, identity.UserID, animeID, acceptedEpisodes, input, &result) {
		return // Error already sent
	}

	forceSourceUpdate := strings.TrimSpace(input.JellyfinSeriesID) != ""
	if !h.applyJellyfinSyncMetadata(c, animeID, series, acceptedEpisodes, forceSourceUpdate) {
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}
