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

// adminAnimeCreateRequest enthält die Felder für das Anlegen eines neuen Anime-Eintrags über die Admin-API.
type adminAnimeCreateRequest struct {
	Title               string                      `json:"title"`
	TitleDE             *string                     `json:"title_de"`
	TitleEN             *string                     `json:"title_en"`
	Type                string                      `json:"type"`
	ContentType         string                      `json:"content_type"`
	Status              string                      `json:"status"`
	Year                *int16                      `json:"year"`
	MaxEpisodes         *int16                      `json:"max_episodes"`
	Genre               *string                     `json:"genre"`
	Tags                []string                    `json:"tags"`
	Description         *string                     `json:"description"`
	CoverImage          *string                     `json:"cover_image"`
	BannerImage         *string                     `json:"banner_image"`
	LogoImage           *string                     `json:"logo_image"`
	BackgroundVideoURL  *string                     `json:"background_video_url"`
	BackgroundImageURLs []string                    `json:"background_image_urls"`
	Source              *string                     `json:"source"`
	SourceLinks         []string                    `json:"source_links"`
	FolderName          *string                     `json:"folder_name"`
	Relations           []models.AdminAnimeRelation `json:"relations"`
}

// adminEpisodeCreateRequest enthält die Pflicht- und optionalen Felder für das Anlegen einer neuen Episode.
type adminEpisodeCreateRequest struct {
	AnimeID       int64   `json:"anime_id"`
	EpisodeNumber string  `json:"episode_number"`
	Title         *string `json:"title"`
	Status        string  `json:"status"`
	StreamLink    *string `json:"stream_link"`
}

// adminThemeRepository definiert den Datenbankzugriff für Anime-Themes im Admin-Bereich.
type adminThemeRepository interface {
	ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error)
	ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error)
	CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error)
	UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error
	DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error
	ListAdminAnimeThemeSegments(ctx context.Context, themeID int64) ([]models.AdminAnimeThemeSegment, error)
	CreateAdminAnimeThemeSegment(ctx context.Context, themeID int64, input models.AdminAnimeThemeSegmentCreateInput) (*models.AdminAnimeThemeSegment, error)
	DeleteAdminAnimeThemeSegment(ctx context.Context, segmentID int64) error
	GetCanonicalFansubAnimeRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error)
	GetFansubRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error)
	ListFansubAnime(ctx context.Context, fansubGroupID int64) ([]models.AdminFansubAnimeEntry, error)
	ListReleaseThemeAssets(ctx context.Context, releaseID int64) ([]models.AdminReleaseThemeAsset, error)
	ListReleaseThemeAssetsByFansubAnime(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, []models.AdminReleaseThemeAsset, error)
	CreateReleaseThemeAsset(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error)
	DeleteReleaseThemeAsset(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error
}

// adminContentRelationRepository definiert den Datenbankzugriff für Anime-Relationen im Admin-Bereich.
type adminContentRelationRepository interface {
	ListAdminAnimeRelations(ctx context.Context, animeID int64) ([]models.AdminAnimeRelation, error)
	SearchAdminAnimeRelationTargets(ctx context.Context, currentAnimeID int64, query string, limit int) ([]models.AdminAnimeRelationTarget, error)
	CreateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error
	UpdateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error
	DeleteAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64) error
	ApplyAdminAnimeEnrichmentRelations(ctx context.Context, sourceAnimeID int64, relations []models.AdminAnimeRelation) error
	ApplyAdminAnimeEnrichmentRelationsDetailed(ctx context.Context, sourceAnimeID int64, relations []models.AdminAnimeRelation) (repository.AdminAnimeEnrichmentRelationApplyResult, error)
}

// adminAniSearchRepository definiert den Datenbankzugriff für AniSearch-basierte Anime-Quell-Lookups.
type adminAniSearchRepository interface {
	FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error)
	ResolveAdminAnimeRelationTargetsByTitles(ctx context.Context, titles []string) ([]models.AdminAnimeRelationTitleMatch, error)
	ResolveAdminAnimeRelationTargetsBySources(ctx context.Context, sources []string) ([]models.AdminAnimeSourceMatch, error)
}

// adminAniSearchDraftLoader beschreibt den Service zum Laden von AniSearch-Entwurfsdaten und zur Kandidatensuche.
type adminAniSearchDraftLoader interface {
	LoadAniSearchDraft(ctx context.Context, aniSearchID string) (models.AdminAnimeCreateDraftPayload, []models.AdminAnimeRelation, error)
	SearchAniSearchCandidates(ctx context.Context, query string, limit int) (models.AdminAnimeAniSearchSearchResult, error)
}

// adminAnimeAssetSearchService definiert den Service zur Suche nach externen Asset-Kandidaten (Cover, Banner, etc.).
type adminAnimeAssetSearchService interface {
	SearchAssetCandidates(ctx context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)
}

type adminEpisodeImportRepository interface {
	Apply(ctx context.Context, input models.EpisodeImportApplyInput) (*models.EpisodeImportApplyResult, error)
	PreviewExistingCoverage(ctx context.Context, animeID int64) (models.EpisodeImportExistingCoverage, error)
}

type adminAniSearchEpisodeFetcher interface {
	FetchAnimeEpisodes(ctx context.Context, aniSearchID string) ([]services.AniSearchEpisode, error)
}

// adminRoleChecker definiert die Methode zur Prüfung, ob ein Nutzer eine bestimmte Rolle besitzt.
type adminRoleChecker interface {
	UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error)
}

// AdminContentHandler ist der zentrale Handler für alle Admin-Content-Operationen:
// Anime anlegen/bearbeiten/löschen, Episoden, Assets, Relationen und Jellyfin-Integration.
type AdminContentHandler struct {
	repo               *repository.AdminContentRepository
	relationRepo       adminContentRelationRepository
	themeRepo          adminThemeRepository
	animeAssetRepo     *repository.AnimeAssetRepository
	fansubRepo         *repository.FansubRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	episodeImportRepo  adminEpisodeImportRepository
	authzRepo          adminRoleChecker
	mediaRepo          *repository.MediaRepository
	aniSearchRepo      adminAniSearchRepository
	adminRoleName      string
	mediaStorageDir    string
	jellyfinAPIKey              string
	jellyfinBaseURL             string
	jellyfinStreamPath          string
	jellyfinAllowedLibraryIDs   []string
	httpClient         *http.Client
	enrichmentService  adminAniSearchDraftLoader
	aniSearchEpisodes  adminAniSearchEpisodeFetcher
	assetSearchService adminAnimeAssetSearchService
	mediaService       *services.MediaService
}

// AdminContentJellyfinConfig enthält die Verbindungsparameter für die Jellyfin-Integration im Admin-Bereich.
type AdminContentJellyfinConfig struct {
	APIKey             string
	BaseURL            string
	StreamPath         string
	AllowedLibraryIDs  []string // Optionale Whitelist von Bibliotheks-IDs; nil bedeutet kein Filter
}

// AdminContentAssetSearchConfig enthält die API-Schlüssel für externe Asset-Suchprovider (TMDB, FanartTV).
type AdminContentAssetSearchConfig struct {
	TMDBAPIKey   string
	FanartAPIKey string
}

// NewAdminContentHandler erstellt einen vollständig initialisierten AdminContentHandler inklusive
// AniSearch-Enrichment-Service und Asset-Suchprovider.
func NewAdminContentHandler(
	repo *repository.AdminContentRepository,
	animeAssetRepo *repository.AnimeAssetRepository,
	fansubRepo *repository.FansubRepository,
	episodeVersionRepo *repository.EpisodeVersionRepository,
	episodeImportRepo *repository.EpisodeImportRepository,
	authzRepo *repository.AuthzRepository,
	adminRoleName string,
	mediaStorageDir string,
	jellyfinCfg AdminContentJellyfinConfig,
	assetSearchCfg AdminContentAssetSearchConfig,
) *AdminContentHandler {
	handler := &AdminContentHandler{
		repo:               repo,
		relationRepo:       repo,
		themeRepo:          repo,
		animeAssetRepo:     animeAssetRepo,
		fansubRepo:         fansubRepo,
		episodeVersionRepo: episodeVersionRepo,
		episodeImportRepo:  episodeImportRepo,
		authzRepo:          authzRepo,
		adminRoleName:      strings.TrimSpace(adminRoleName),
		mediaStorageDir:    strings.TrimSpace(mediaStorageDir),
		jellyfinAPIKey:            strings.TrimSpace(jellyfinCfg.APIKey),
		jellyfinBaseURL:           strings.TrimSpace(jellyfinCfg.BaseURL),
		jellyfinStreamPath:        normalizeStreamPathTemplate(jellyfinCfg.StreamPath),
		jellyfinAllowedLibraryIDs: jellyfinCfg.AllowedLibraryIDs,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}

	aniSearchClient := services.NewAniSearchClient("https://www.anisearch.de/anime", handler.httpClient)
	handler.aniSearchEpisodes = aniSearchClient
	handler.enrichmentService = services.NewAnimeCreateEnrichmentService(
		aniSearchClient,
		adminAnimeCreateEnrichmentRepo{repo: repo},
		handler.previewJellysyncAnimeCreateFollowup,
	)
	handler.assetSearchService = services.NewAnimeAssetSearchService(
		services.NewTMDBAssetSearchProvider(assetSearchCfg.TMDBAPIKey, handler.httpClient),
		services.NewFanartTVAssetSearchProvider(assetSearchCfg.FanartAPIKey, assetSearchCfg.TMDBAPIKey, handler.httpClient),
		services.NewAniListAssetSearchProvider(handler.httpClient),
		services.NewZerochanAssetSearchProvider(handler.httpClient),
		services.NewKonachanAssetSearchProvider(handler.httpClient),
		services.NewSafebooruAssetSearchProvider(handler.httpClient),
	)
	handler.aniSearchRepo = adminAnimeCreateEnrichmentRepo{repo: repo}

	return handler
}

// WithMediaDeps verdrahtet Media-Repository und Media-Service nachtraeglich,
// damit Theme-Video-Uploads dieselben Instanzen wie der Fansub-Handler nutzen.
func (h *AdminContentHandler) WithMediaDeps(repo *repository.MediaRepository, svc *services.MediaService) *AdminContentHandler {
	h.mediaRepo = repo
	h.mediaService = svc
	return h
}

// adminAnimeCreateEnrichmentRepo ist ein interner Adapter, der das AdminContentRepository
// als adminAniSearchRepository verfügbar macht.
type adminAnimeCreateEnrichmentRepo struct {
	repo *repository.AdminContentRepository
}

// FindAnimeBySource delegiert die Quell-Suche an das zugrundeliegende Repository.
func (r adminAnimeCreateEnrichmentRepo) FindAnimeBySource(
	ctx context.Context,
	source string,
) (*models.AdminAnimeSourceMatch, error) {
	return r.repo.FindAnimeBySource(ctx, source)
}

// ResolveAdminAnimeRelationTargetsByTitles delegiert die Titelauflösung für Relationen an das Repository.
func (r adminAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsByTitles(
	ctx context.Context,
	titles []string,
) ([]models.AdminAnimeRelationTitleMatch, error) {
	return r.repo.ResolveAdminAnimeRelationTargetsByTitles(ctx, titles)
}

// ResolveAdminAnimeRelationTargetsBySources delegiert die Quellenauflösung für Relationen an das Repository.
func (r adminAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsBySources(
	ctx context.Context,
	sources []string,
) ([]models.AdminAnimeSourceMatch, error) {
	return r.repo.ResolveAdminAnimeRelationTargetsBySources(ctx, sources)
}
