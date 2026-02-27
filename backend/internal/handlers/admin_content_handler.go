package handlers

import (
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/repository"
)

type adminAnimeCreateRequest struct {
	Title       string  `json:"title"`
	TitleDE     *string `json:"title_de"`
	TitleEN     *string `json:"title_en"`
	Type        string  `json:"type"`
	ContentType string  `json:"content_type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year"`
	MaxEpisodes *int16  `json:"max_episodes"`
	Genre       *string `json:"genre"`
	Description *string `json:"description"`
	CoverImage  *string `json:"cover_image"`
}

type adminEpisodeCreateRequest struct {
	AnimeID       int64   `json:"anime_id"`
	EpisodeNumber string  `json:"episode_number"`
	Title         *string `json:"title"`
	Status        string  `json:"status"`
	StreamLink    *string `json:"stream_link"`
}

type AdminContentHandler struct {
	repo               *repository.AdminContentRepository
	fansubRepo         *repository.FansubRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	authzRepo          *repository.AuthzRepository
	adminRoleName      string
	jellyfinAPIKey     string
	jellyfinBaseURL    string
	httpClient         *http.Client
}

type AdminContentJellyfinConfig struct {
	APIKey  string
	BaseURL string
}

func NewAdminContentHandler(
	repo *repository.AdminContentRepository,
	fansubRepo *repository.FansubRepository,
	episodeVersionRepo *repository.EpisodeVersionRepository,
	authzRepo *repository.AuthzRepository,
	adminRoleName string,
	jellyfinCfg AdminContentJellyfinConfig,
) *AdminContentHandler {
	return &AdminContentHandler{
		repo:               repo,
		fansubRepo:         fansubRepo,
		episodeVersionRepo: episodeVersionRepo,
		authzRepo:          authzRepo,
		adminRoleName:      strings.TrimSpace(adminRoleName),
		jellyfinAPIKey:     strings.TrimSpace(jellyfinCfg.APIKey),
		jellyfinBaseURL:    strings.TrimSpace(jellyfinCfg.BaseURL),
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}
