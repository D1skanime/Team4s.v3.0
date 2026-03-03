package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
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

	result := models.AdminAnimeJellyfinSyncResult{
		AnimeID:               animeID,
		JellyfinSeriesID:      strings.TrimSpace(series.ID),
		JellyfinSeriesName:    strings.TrimSpace(series.Name),
		JellyfinSeriesPath:    normalizeNullableStringPtr(series.Path),
		AppliedPathPrefix:     normalizeNullableStringPtr(series.Path),
		SeasonNumber:          input.SeasonNumber,
		AppliedEpisodeStatus:  input.EpisodeStatus,
		OverwriteEpisodeTitle: false,
		OverwriteVersionTitle: false,
	}

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

	// Delete existing Jellyfin versions if cleanup is requested.
	if input.CleanupProviderVersions {
		deletedCount, deleteErr := h.episodeVersionRepo.DeleteByAnimeAndProvider(c.Request.Context(), animeID, "jellyfin")
		if deleteErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: delete existing versions failed (user_id=%d, anime_id=%d): %v",
				identity.UserID,
				animeID,
				deleteErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "bestehende versionen konnten nicht geloescht werden",
				},
			})
			return
		}
		result.DeletedVersions = int32(deletedCount)
		log.Printf(
			"admin_content jellyfin_sync: deleted %d existing jellyfin versions (user_id=%d, anime_id=%d)",
			deletedCount,
			identity.UserID,
			animeID,
		)
	}

	if !h.importAcceptedEpisodes(c, identity.UserID, animeID, acceptedEpisodes, input, &result) {
		return // Error already sent
	}

	uniqueEpisodeNumbers := collectUniqueEpisodeNumbers(acceptedEpisodes)
	maxEpisodes := int16FromCount(len(uniqueEpisodeNumbers))
	forceSourceUpdate := strings.TrimSpace(input.JellyfinSeriesID) != ""
	if applyErr := h.repo.ApplyJellyfinSyncMetadata(
		c.Request.Context(),
		animeID,
		fmt.Sprintf("jellyfin:%s", series.ID),
		int16FromInt(series.ProductionYear),
		normalizeNullableStringPtr(series.Overview),
		maxEpisodes,
		forceSourceUpdate,
	); applyErr != nil {
		log.Printf("admin_content jellyfin_sync: apply metadata failed (anime_id=%d): %v", animeID, applyErr)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "anime metadaten konnten nicht aktualisiert werden",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

type acceptedJellyfinEpisode struct {
	episodeNumber int32
	mediaItemID   string
	episodeTitle  *string
	fansubGroupID *int64
	releaseDate   *time.Time
	videoQuality  *string
}

func (h *AdminContentHandler) collectAcceptedEpisodes(
	c *gin.Context,
	animeID int64,
	episodes []jellyfinEpisodeItem,
	input adminAnimeJellyfinSyncInput,
	result *models.AdminAnimeJellyfinSyncResult,
) []acceptedJellyfinEpisode {
	aliasResolver := newFansubAliasResolver(nil)
	if h.fansubRepo != nil {
		candidates, aliasErr := h.fansubRepo.ListAnimeAliasCandidates(c.Request.Context(), animeID)
		if aliasErr != nil && !errors.Is(aliasErr, repository.ErrNotFound) {
			log.Printf(
				"admin_content jellyfin_sync: list alias candidates failed (anime_id=%d): %v",
				animeID,
				aliasErr,
			)
		} else {
			aliasResolver = newFansubAliasResolver(candidates)
		}
	}

	normalizedPathPrefix := normalizeJellyfinPath(result.AppliedPathPrefix)
	acceptedEpisodes := make([]acceptedJellyfinEpisode, 0, len(episodes))

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
		if episodeNumber <= 0 {
			result.SkippedEpisodes++
			continue
		}

		mediaItemID := strings.TrimSpace(item.ID)
		if mediaItemID == "" {
			result.SkippedEpisodes++
			continue
		}

		acceptedEpisodes = append(acceptedEpisodes, acceptedJellyfinEpisode{
			episodeNumber: episodeNumber,
			mediaItemID:   mediaItemID,
			episodeTitle:  normalizeNullableStringPtr(item.Name),
			fansubGroupID: aliasResolver.Resolve(item.Name, item.Path),
			releaseDate:   parseJellyfinPremiereDate(item.PremiereDate),
			videoQuality:  jellyfinVideoQuality(item.MediaStreams),
		})
	}

	return acceptedEpisodes
}

func (h *AdminContentHandler) importAcceptedEpisodes(
	c *gin.Context,
	userID int64,
	animeID int64,
	acceptedEpisodes []acceptedJellyfinEpisode,
	input adminAnimeJellyfinSyncInput,
	result *models.AdminAnimeJellyfinSyncResult,
) bool {
	for _, accepted := range acceptedEpisodes {
		episodeNumberText := strconv.Itoa(int(accepted.episodeNumber))
		_, episodeCreated, upsertEpisodeErr := h.repo.UpsertEpisodeByAnimeAndNumber(
			c.Request.Context(),
			animeID,
			episodeNumberText,
			accepted.episodeTitle,
			input.EpisodeStatus,
			false,
		)
		if upsertEpisodeErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: upsert episode failed (anime_id=%d, episode=%d, item_id=%s): %v",
				animeID,
				accepted.episodeNumber,
				accepted.mediaItemID,
				upsertEpisodeErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "episoden import fehlgeschlagen",
				},
			})
			return false
		}
		if episodeCreated {
			result.ImportedEpisodes++
		} else {
			result.UpdatedEpisodes++
		}

		_, versionCreated, upsertVersionErr := h.episodeVersionRepo.UpsertByMediaSource(
			c.Request.Context(),
			models.EpisodeVersionCreateInput{
				AnimeID:       animeID,
				EpisodeNumber: accepted.episodeNumber,
				Title:         accepted.episodeTitle,
				FansubGroupID: accepted.fansubGroupID,
				MediaProvider: "jellyfin",
				MediaItemID:   accepted.mediaItemID,
				VideoQuality:  accepted.videoQuality,
				SubtitleType:  nil,
				ReleaseDate:   accepted.releaseDate,
				StreamURL:     h.buildJellyfinEditorStreamURL(accepted.mediaItemID),
			},
			false,
		)
		if upsertVersionErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: upsert version failed (anime_id=%d, episode=%d, item_id=%s): %v",
				animeID,
				accepted.episodeNumber,
				accepted.mediaItemID,
				upsertVersionErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "versionen import fehlgeschlagen",
				},
			})
			return false
		}
		if versionCreated {
			result.ImportedVersions++
		} else {
			result.UpdatedVersions++
		}
	}
	return true
}

func collectUniqueEpisodeNumbers(episodes []acceptedJellyfinEpisode) map[int32]struct{} {
	result := make(map[int32]struct{}, len(episodes))
	for _, ep := range episodes {
		result[ep.episodeNumber] = struct{}{}
	}
	return result
}
