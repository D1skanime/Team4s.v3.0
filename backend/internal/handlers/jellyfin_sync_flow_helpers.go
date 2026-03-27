package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func newAdminAnimeJellyfinSyncResult(
	animeID int64,
	series *jellyfinSeriesItem,
	input adminAnimeJellyfinSyncInput,
) models.AdminAnimeJellyfinSyncResult {
	return models.AdminAnimeJellyfinSyncResult{
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
}

func (h *AdminContentHandler) cleanupJellyfinProviderVersions(
	c *gin.Context,
	userID int64,
	animeID int64,
	cleanupEnabled bool,
	result *models.AdminAnimeJellyfinSyncResult,
) bool {
	if !cleanupEnabled {
		return true
	}

	deletedCount, deleteErr := h.episodeVersionRepo.DeleteByAnimeAndProvider(c.Request.Context(), animeID, "jellyfin")
	if deleteErr != nil {
		log.Printf(
			"admin_content jellyfin_sync: delete existing versions failed (user_id=%d, anime_id=%d): %v",
			userID,
			animeID,
			deleteErr,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "bestehende versionen konnten nicht geloescht werden",
			},
		})
		return false
	}

	result.DeletedVersions = int32(deletedCount)
	log.Printf(
		"admin_content jellyfin_sync: deleted %d existing jellyfin versions (user_id=%d, anime_id=%d)",
		deletedCount,
		userID,
		animeID,
	)

	return true
}

func (h *AdminContentHandler) applyJellyfinSyncMetadata(
	c *gin.Context,
	animeID int64,
	series *jellyfinSeriesItem,
	acceptedEpisodes []acceptedJellyfinEpisode,
	forceSourceUpdate bool,
) bool {
	uniqueEpisodeNumbers := collectUniqueEpisodeNumbers(acceptedEpisodes)
	maxEpisodes := int16FromCount(len(uniqueEpisodeNumbers))

	if applyErr := h.repo.ApplyJellyfinSyncMetadata(
		c.Request.Context(),
		animeID,
		fmt.Sprintf("jellyfin:%s", series.ID),
		normalizeNullableStringPtr(series.Path),
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
		return false
	}

	return true
}
