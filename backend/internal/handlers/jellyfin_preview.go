package handlers

import (
	"errors"
	"log"
	"net/http"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// PreviewAnimeFromJellyfin shows what would be synced without making changes.
func (h *AdminContentHandler) PreviewAnimeFromJellyfin(c *gin.Context) {
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

	var req adminAnimeJellyfinSyncRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("admin_content jellyfin_preview: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
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
		log.Printf("admin_content jellyfin_preview: load anime failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
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
			"admin_content jellyfin_preview: resolve series failed (user_id=%d, anime_id=%d, series_id=%q): %v",
			identity.UserID,
			animeID,
			input.JellyfinSeriesID,
			resolveErr,
		)
		c.JSON(statusCode, gin.H{
			"error": gin.H{
				"message": resolveErr.Error(),
			},
		})
		return
	}

	episodes, listErr := h.listJellyfinEpisodes(c.Request.Context(), series.ID)
	if listErr != nil {
		log.Printf(
			"admin_content jellyfin_preview: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
			identity.UserID,
			animeID,
			series.ID,
			listErr,
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "jellyfin episoden konnten nicht geladen werden",
			},
		})
		return
	}

	sortJellyfinEpisodes(episodes)

	// Count existing Jellyfin versions for this anime
	var existingJellyfinVersions int32
	if h.episodeVersionRepo != nil {
		count, countErr := h.episodeVersionRepo.CountByAnimeAndProvider(c.Request.Context(), animeID, "jellyfin")
		if countErr != nil {
			log.Printf("admin_content jellyfin_preview: count existing versions failed (anime_id=%d): %v", animeID, countErr)
			// Non-fatal: continue with 0
		} else {
			existingJellyfinVersions = int32(count)
		}
	}

	// Count episodes that would become orphaned if all jellyfin versions are deleted
	var existingEpisodes int32
	{
		episodeCount, countErr := h.repo.CountEpisodesWithOnlyProvider(c.Request.Context(), animeID, "jellyfin")
		if countErr != nil {
			log.Printf("admin_content jellyfin_preview: count episodes with only jellyfin failed (anime_id=%d): %v", animeID, countErr)
			// Non-fatal: continue with 0
		} else {
			existingEpisodes = int32(episodeCount)
		}
	}

	result := models.AdminAnimeJellyfinPreviewResult{
		AnimeID:                  animeID,
		JellyfinSeriesID:         strings.TrimSpace(series.ID),
		JellyfinSeriesName:       strings.TrimSpace(series.Name),
		JellyfinSeriesPath:       normalizeNullableStringPtr(series.Path),
		AppliedPathPrefix:        normalizeNullableStringPtr(series.Path),
		SeasonNumber:             input.SeasonNumber,
		ExistingJellyfinVersions: existingJellyfinVersions,
		ExistingEpisodes:         existingEpisodes,
		AppliedEpisodeStatus:     input.EpisodeStatus,
		OverwriteEpisodeTitle:    false,
		OverwriteVersionTitle:    false,
		Episodes:                 make([]models.AdminAnimeJellyfinPreviewEpisode, 0, 64),
	}

	normalizedPathPrefix := normalizeJellyfinPath(result.AppliedPathPrefix)
	acceptedEpisodeNumbers := make(map[int32]struct{}, 64)

	for _, item := range episodes {
		if jellyfinSeasonNumber(item.ParentIndexNumber) != input.SeasonNumber {
			continue
		}

		result.ScannedEpisodes++
		if normalizedPathPrefix != "" && !jellyfinPathHasPrefix(item.Path, normalizedPathPrefix) {
			result.PathFilteredEpisodes++
			continue
		}

		episodeNumber := jellyfinEpisodeNumber(item.IndexNumber)
		mediaItemID := strings.TrimSpace(item.ID)
		if episodeNumber <= 0 || mediaItemID == "" {
			result.SkippedEpisodes++
			continue
		}

		result.MatchedEpisodes++
		acceptedEpisodeNumbers[episodeNumber] = struct{}{}
		result.Episodes = append(result.Episodes, models.AdminAnimeJellyfinPreviewEpisode{
			JellyfinItemID: mediaItemID,
			EpisodeNumber:  episodeNumber,
			Title:          normalizeNullableStringPtr(item.Name),
			PremiereDate:   parseJellyfinPremiereDate(item.PremiereDate),
			VideoQuality:   jellyfinVideoQuality(item.MediaStreams),
		})
	}
	result.AcceptedUniqueEpisodes = int32(len(acceptedEpisodeNumbers))
	result.MismatchReason = buildJellyfinSyncMismatchReason(animeSource.MaxEpisodes, result.AcceptedUniqueEpisodes)
	result.MismatchDetected = result.MismatchReason != nil

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// sortJellyfinEpisodes sorts episodes by season, episode number, then ID.
func sortJellyfinEpisodes(episodes []jellyfinEpisodeItem) {
	sort.Slice(episodes, func(i, j int) bool {
		leftSeason := jellyfinSeasonNumber(episodes[i].ParentIndexNumber)
		rightSeason := jellyfinSeasonNumber(episodes[j].ParentIndexNumber)
		if leftSeason != rightSeason {
			return leftSeason < rightSeason
		}
		leftEpisode := jellyfinEpisodeNumber(episodes[i].IndexNumber)
		rightEpisode := jellyfinEpisodeNumber(episodes[j].IndexNumber)
		if leftEpisode != rightEpisode {
			return leftEpisode < rightEpisode
		}
		return strings.TrimSpace(episodes[i].ID) < strings.TrimSpace(episodes[j].ID)
	})
}
