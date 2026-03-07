package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type GroupAssetsHandler struct {
	groupRepo       *repository.GroupRepository
	jellyfinAPIKey  string
	jellyfinBaseURL string
	httpClient      *http.Client
	libraryCacheMu  sync.RWMutex
	libraryCache    groupAssetsLibraryCache
}

type groupAssetsLibraryCache struct {
	id        string
	expiresAt time.Time
}

func NewGroupAssetsHandler(
	groupRepo *repository.GroupRepository,
	mediaConfig AnimeMediaConfig,
) *GroupAssetsHandler {
	return &GroupAssetsHandler{
		groupRepo:       groupRepo,
		jellyfinAPIKey:  strings.TrimSpace(mediaConfig.JellyfinAPIKey),
		jellyfinBaseURL: strings.TrimSpace(mediaConfig.JellyfinBaseURL),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		libraryCache: groupAssetsLibraryCache{},
	}
}

func (h *GroupAssetsHandler) GetGroupAssets(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungueltige group id")
		return
	}

	groupDetail, err := h.groupRepo.GetGroupDetail(c.Request.Context(), animeID, groupID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "gruppe nicht gefunden")
		return
	}
	if err != nil {
		log.Printf("group assets: load group detail failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
		internalError(c, "interner serverfehler")
		return
	}

	payload, err := h.buildGroupAssetsPayload(c.Request.Context(), animeID, groupDetail)
	if err != nil {
		log.Printf("group assets: build payload failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "gruppen-assets konnten nicht geladen werden",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": payload,
	})
}

func (h *GroupAssetsHandler) buildGroupAssetsPayload(
	ctx context.Context,
	animeID int64,
	groupDetail *models.GroupDetail,
) (models.GroupAssetsData, error) {
	payload, err := h.resolveGroupAssets(ctx, animeID, groupDetail)
	if err != nil {
		return models.GroupAssetsData{}, err
	}

	releases, _, err := h.groupRepo.GetGroupReleases(ctx, animeID, groupDetail.Fansub.ID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 500,
	})
	if err != nil {
		return models.GroupAssetsData{}, err
	}

	releasesByEpisode := make(map[int32]models.EpisodeReleaseSummary, len(releases.Episodes))
	for _, episode := range releases.Episodes {
		releasesByEpisode[episode.EpisodeNumber] = episode
	}
	for index := range payload.Episodes {
		release, ok := releasesByEpisode[payload.Episodes[index].EpisodeNumber]
		if !ok {
			continue
		}
		payload.Episodes[index].ReleaseID = &release.ID
		payload.Episodes[index].EpisodeID = release.EpisodeID
		payload.Episodes[index].Title = release.Title
	}

	return payload, nil
}
