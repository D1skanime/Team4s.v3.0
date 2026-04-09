package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

type adminAnimeCreateRequest struct {
	Title       string   `json:"title"`
	TitleDE     *string  `json:"title_de"`
	TitleEN     *string  `json:"title_en"`
	Type        string   `json:"type"`
	ContentType string   `json:"content_type"`
	Status      string   `json:"status"`
	Year        *int16   `json:"year"`
	MaxEpisodes *int16   `json:"max_episodes"`
	Genre       *string  `json:"genre"`
	Tags        []string `json:"tags"`
	Description *string  `json:"description"`
	CoverImage  *string  `json:"cover_image"`
	Source      *string  `json:"source"`
	FolderName  *string  `json:"folder_name"`
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
	enrichmentService  *services.AnimeCreateEnrichmentService
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
	handler := &AdminContentHandler{
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

	aniSearchClient := services.NewAniSearchClient("https://www.anisearch.de/anime", handler.httpClient)
	handler.enrichmentService = services.NewAnimeCreateEnrichmentService(
		aniSearchClient,
		adminAnimeCreateEnrichmentRepo{repo: repo},
		handler.previewJellysyncAnimeCreateFollowup,
	)

	return handler
}

type adminAnimeCreateEnrichmentRepo struct {
	repo *repository.AdminContentRepository
}

func (r adminAnimeCreateEnrichmentRepo) FindAnimeBySource(
	ctx context.Context,
	source string,
) (*models.AdminAnimeSourceMatch, error) {
	return r.repo.FindAnimeBySource(ctx, source)
}

func (r adminAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsByTitles(
	ctx context.Context,
	titles []string,
) ([]models.AdminAnimeRelationTitleMatch, error) {
	return r.repo.ResolveAdminAnimeRelationTargetsByTitles(ctx, titles)
}

func (r adminAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsBySources(
	ctx context.Context,
	sources []string,
) ([]models.AdminAnimeSourceMatch, error) {
	return r.repo.ResolveAdminAnimeRelationTargetsBySources(ctx, sources)
}

// LoadAnimeAniSearchEnrichment reserves the Phase 11 edit AniSearch seam.
// The live edit enrichment contract is implemented in the next plan.
func (h *AdminContentHandler) LoadAnimeAniSearchEnrichment(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": gin.H{
			"message": "anisearch edit enrichment noch nicht implementiert",
			"code":    "anisearch_edit_enrichment_pending",
		},
	})
}
