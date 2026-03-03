package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

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
