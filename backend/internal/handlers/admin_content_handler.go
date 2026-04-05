package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
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
	Source      *string `json:"source"`
	FolderName  *string `json:"folder_name"`
}

type adminEpisodeCreateRequest struct {
	AnimeID       int64   `json:"anime_id"`
	EpisodeNumber string  `json:"episode_number"`
	Title         *string `json:"title"`
	Status        string  `json:"status"`
	StreamLink    *string `json:"stream_link"`
}

type adminContentRelationRepository interface {
	ListAdminAnimeRelations(ctx context.Context, animeID int64) ([]models.AdminAnimeRelation, error)
	SearchAdminAnimeRelationTargets(ctx context.Context, currentAnimeID int64, query string, limit int) ([]models.AdminAnimeRelationTarget, error)
	CreateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error
	UpdateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error
	DeleteAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64) error
}

type adminRoleChecker interface {
	UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error)
}

type AdminContentHandler struct {
	repo               *repository.AdminContentRepository
	relationRepo       adminContentRelationRepository
	animeAssetRepo     *repository.AnimeAssetRepository
	fansubRepo         *repository.FansubRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	authzRepo          adminRoleChecker
	adminRoleName      string
	mediaStorageDir    string
	jellyfinAPIKey     string
	jellyfinBaseURL    string
	jellyfinStreamPath string
	httpClient         *http.Client
}

type AdminContentJellyfinConfig struct {
	APIKey     string
	BaseURL    string
	StreamPath string
}

func NewAdminContentHandler(
	repo *repository.AdminContentRepository,
	animeAssetRepo *repository.AnimeAssetRepository,
	fansubRepo *repository.FansubRepository,
	episodeVersionRepo *repository.EpisodeVersionRepository,
	authzRepo *repository.AuthzRepository,
	adminRoleName string,
	mediaStorageDir string,
	jellyfinCfg AdminContentJellyfinConfig,
) *AdminContentHandler {
	return &AdminContentHandler{
		repo:               repo,
		relationRepo:       repo,
		animeAssetRepo:     animeAssetRepo,
		fansubRepo:         fansubRepo,
		episodeVersionRepo: episodeVersionRepo,
		authzRepo:          authzRepo,
		adminRoleName:      strings.TrimSpace(adminRoleName),
		mediaStorageDir:    strings.TrimSpace(mediaStorageDir),
		jellyfinAPIKey:     strings.TrimSpace(jellyfinCfg.APIKey),
		jellyfinBaseURL:    strings.TrimSpace(jellyfinCfg.BaseURL),
		jellyfinStreamPath: normalizeStreamPathTemplate(jellyfinCfg.StreamPath),
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}
