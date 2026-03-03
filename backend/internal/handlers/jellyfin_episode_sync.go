package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

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

	animeSource, sourceErr := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(sourceErr, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if sourceErr != nil {
		log.Printf("admin_content jellyfin_episode_sync: load anime failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, sourceErr)
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
			"admin_content jellyfin_episode_sync: resolve series failed (user_id=%d, anime_id=%d, series_id=%q): %v",
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
			"admin_content jellyfin_episode_sync: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
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

	normalizedPathPrefix := normalizeJellyfinPath(normalizeNullableStringPtr(series.Path))
	var targetEpisode *jellyfinEpisodeItem
	for i := range episodes {
		ep := &episodes[i]
		if jellyfinSeasonNumber(ep.ParentIndexNumber) != input.SeasonNumber {
			continue
		}
		if normalizedPathPrefix != "" && !jellyfinPathHasPrefix(ep.Path, normalizedPathPrefix) {
			continue
		}
		epNum := jellyfinEpisodeNumber(ep.IndexNumber)
		if epNum == int32(targetEpisodeNumber) {
			targetEpisode = ep
			break
		}
	}

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

	var fansubGroupID *int64
	aliasResolver := newFansubAliasResolver(nil)
	if h.fansubRepo != nil {
		candidates, aliasErr := h.fansubRepo.ListAnimeAliasCandidates(c.Request.Context(), animeID)
		if aliasErr == nil {
			aliasResolver = newFansubAliasResolver(candidates)
			fansubGroupID = aliasResolver.Resolve(targetEpisode.Name, targetEpisode.Path)
		}
	}

	var deletedCount int64
	if input.CleanupProviderVersions {
		deleted, deleteErr := h.episodeVersionRepo.DeleteByAnimeEpisodeNumberAndProvider(
			c.Request.Context(),
			animeID,
			episodeNumber,
			"jellyfin",
		)
		if deleteErr != nil {
			log.Printf(
				"admin_content jellyfin_episode_sync: delete existing versions failed (user_id=%d, anime_id=%d, episode=%d): %v",
				identity.UserID,
				animeID,
				episodeNumber,
				deleteErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "bestehende versionen konnten nicht geloescht werden",
				},
			})
			return
		}
		deletedCount = deleted
		log.Printf(
			"admin_content jellyfin_episode_sync: deleted %d existing jellyfin versions (user_id=%d, anime_id=%d, episode=%d)",
			deleted,
			identity.UserID,
			animeID,
			episodeNumber,
		)
	}

	episodeNumberText := strconv.Itoa(int(episodeNumber))
	episodeTitle := normalizeNullableStringPtr(targetEpisode.Name)
	_, episodeCreated, upsertEpisodeErr := h.repo.UpsertEpisodeByAnimeAndNumber(
		c.Request.Context(),
		animeID,
		episodeNumberText,
		episodeTitle,
		input.EpisodeStatus,
		false,
	)
	if upsertEpisodeErr != nil {
		log.Printf(
			"admin_content jellyfin_episode_sync: upsert episode failed (anime_id=%d, episode=%d, item_id=%s): %v",
			animeID,
			episodeNumber,
			mediaItemID,
			upsertEpisodeErr,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "episode import fehlgeschlagen",
			},
		})
		return
	}

	_, versionCreated, upsertVersionErr := h.episodeVersionRepo.UpsertByMediaSource(
		c.Request.Context(),
		models.EpisodeVersionCreateInput{
			AnimeID:       animeID,
			EpisodeNumber: episodeNumber,
			Title:         episodeTitle,
			FansubGroupID: fansubGroupID,
			MediaProvider: "jellyfin",
			MediaItemID:   mediaItemID,
			VideoQuality:  jellyfinVideoQuality(targetEpisode.MediaStreams),
			SubtitleType:  nil,
			ReleaseDate:   parseJellyfinPremiereDate(targetEpisode.PremiereDate),
			StreamURL:     h.buildJellyfinEditorStreamURL(mediaItemID),
		},
		false,
	)
	if upsertVersionErr != nil {
		log.Printf(
			"admin_content jellyfin_episode_sync: upsert version failed (anime_id=%d, episode=%d, item_id=%s): %v",
			animeID,
			episodeNumber,
			mediaItemID,
			upsertVersionErr,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "version import fehlgeschlagen",
			},
		})
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
