package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) loadJellyfinEpisodeSyncSeriesAndEpisodes(
	c *gin.Context,
	userID int64,
	animeID int64,
	input adminAnimeJellyfinSyncInput,
) (*models.AdminAnimeSyncSource, *jellyfinSeriesItem, []jellyfinEpisodeItem, bool) {
	animeSource, sourceErr := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(sourceErr, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return nil, nil, nil, false
	}
	if sourceErr != nil {
		log.Printf("admin_content jellyfin_episode_sync: load anime failed (user_id=%d, anime_id=%d): %v", userID, animeID, sourceErr)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return nil, nil, nil, false
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
			userID,
			animeID,
			input.JellyfinSeriesID,
			resolveErr,
		)
		code, details := classifyJellyfinResolutionError(statusCode, resolveErr.Error())
		writeJellyfinErrorResponse(c, statusCode, resolveErr.Error(), code, details)
		return nil, nil, nil, false
	}

	episodes, listErr := h.listJellyfinEpisodes(c.Request.Context(), series.ID)
	if listErr != nil {
		log.Printf(
			"admin_content jellyfin_episode_sync: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
			userID,
			animeID,
			series.ID,
			listErr,
		)
		message, code, details := classifyJellyfinUpstreamError(listErr, "jellyfin episoden konnten nicht geladen werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return nil, nil, nil, false
	}

	return animeSource, series, episodes, true
}

func findTargetJellyfinEpisode(
	episodes []jellyfinEpisodeItem,
	seasonNumber int32,
	pathPrefix *string,
	targetEpisodeNumber int32,
) *jellyfinEpisodeItem {
	normalizedPathPrefix := normalizeJellyfinPath(pathPrefix)
	for i := range episodes {
		ep := &episodes[i]
		if jellyfinSeasonNumber(ep.ParentIndexNumber) != seasonNumber {
			continue
		}
		if normalizedPathPrefix != "" && !jellyfinPathHasPrefix(ep.Path, normalizedPathPrefix) {
			continue
		}
		epNum := jellyfinEpisodeNumber(ep.IndexNumber)
		if epNum == targetEpisodeNumber {
			return ep
		}
	}

	return nil
}

func (h *AdminContentHandler) resolveJellyfinEpisodeFansubGroupID(
	c *gin.Context,
	animeID int64,
	targetEpisode *jellyfinEpisodeItem,
) *int64 {
	if h.fansubRepo == nil {
		return nil
	}

	aliasResolver := newFansubAliasResolver(nil)
	candidates, aliasErr := h.fansubRepo.ListAnimeAliasCandidates(c.Request.Context(), animeID)
	if aliasErr != nil {
		return nil
	}

	aliasResolver = newFansubAliasResolver(candidates)
	return aliasResolver.Resolve(targetEpisode.Name, targetEpisode.Path)
}

func (h *AdminContentHandler) cleanupJellyfinEpisodeProviderVersions(
	c *gin.Context,
	userID int64,
	animeID int64,
	episodeNumber int32,
	cleanupEnabled bool,
) (int64, bool) {
	if !cleanupEnabled {
		return 0, true
	}

	deleted, deleteErr := h.episodeVersionRepo.DeleteByAnimeEpisodeNumberAndProvider(
		c.Request.Context(),
		animeID,
		episodeNumber,
		"jellyfin",
	)
	if deleteErr != nil {
		log.Printf(
			"admin_content jellyfin_episode_sync: delete existing versions failed (user_id=%d, anime_id=%d, episode=%d): %v",
			userID,
			animeID,
			episodeNumber,
			deleteErr,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "bestehende versionen konnten nicht geloescht werden",
			},
		})
		return 0, false
	}

	log.Printf(
		"admin_content jellyfin_episode_sync: deleted %d existing jellyfin versions (user_id=%d, anime_id=%d, episode=%d)",
		deleted,
		userID,
		animeID,
		episodeNumber,
	)

	return deleted, true
}

func (h *AdminContentHandler) upsertJellyfinEpisode(
	c *gin.Context,
	animeID int64,
	episodeNumber int32,
	mediaItemID string,
	targetEpisode *jellyfinEpisodeItem,
	input adminAnimeJellyfinSyncInput,
) (*string, bool, bool) {
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
		return nil, false, false
	}

	return episodeTitle, episodeCreated, true
}

func (h *AdminContentHandler) upsertJellyfinEpisodeVersion(
	c *gin.Context,
	animeID int64,
	episodeNumber int32,
	mediaItemID string,
	episodeTitle *string,
	fansubGroupID *int64,
	targetEpisode *jellyfinEpisodeItem,
) (bool, bool) {
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
		return false, false
	}

	return versionCreated, true
}
