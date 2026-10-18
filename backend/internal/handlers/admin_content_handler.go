package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"golang.org/x/sync/singleflight"
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
	AltTitles           []models.AdminAnimeAltTitle `json:"alt_titles"`
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

// adminAniSearchLinkRepository (quick-261018-l5r Task 1, Signatur erweitert in Task 2) definiert
// den schmalen Schreibzugriff für den additiven "verknüpfen + ggf. Felder übernehmen"-Endpunkt
// (POST /admin/anime/:id/anisearch/link) -- bewusst getrennt vom breiteren
// adminAniSearchRepository-Lookup-Interface, damit Handler-Tests beide unabhängig faken können,
// analog zu adminAnimeCreateRepository. takeoverPatch ist nil, wenn der Handler keine Übernahme
// versuchen konnte (fehlende Abhängigkeiten oder fehlgeschlagener AniSearch-Fetch) -- die
// Implementierung muss in diesem Fall ausschließlich den additiven Link schreiben.
type adminAniSearchLinkRepository interface {
	LinkAniSearchSource(ctx context.Context, animeID int64, aniSearchID string, takeoverPatch *models.AdminAnimePatchInput, actorUserID int64) error
}

// adminAniSearchTakeoverSnapshotRepository (quick-261018-l5r Task 2) definiert den schmalen
// Lesezugriff auf die aktuellen Werte der 8 Übernahme-Felder eines bestehenden Anime, VOR dem
// additiven Link-Schreibvorgang -- getrennt gehalten, damit Handler-Tests den additiven
// Link-Endpunkt weiterhin ohne laufende Postgres-Instanz testen können (nil = Übernahme wird
// erst gar nicht versucht).
type adminAniSearchTakeoverSnapshotRepository interface {
	GetAnimeAniSearchTakeoverSnapshot(ctx context.Context, animeID int64) (*models.AdminAnimeAniSearchTakeoverSnapshot, error)
}

// adminAniSearchAnimeFetcher (quick-261018-l5r Task 2) ist der schmale Fetch-Zugriff für das
// Übernahme-Feature -- wraps dieselbe services.AniSearchFetcher.FetchAnime-Methode, die
// AnimeCreateEnrichmentService bereits für den Create-Flow verwendet, auf derselben
// aniSearchClient-Instanz (kein zweiter AniSearch-HTTP-Client).
type adminAniSearchAnimeFetcher interface {
	FetchAnime(ctx context.Context, aniSearchID string) (services.AniSearchAnime, error)
}

// adminAniSearchTakeoverSyncSourceRepository (quick-261018-l5r Task 2) ist der schmale Lesezugriff
// auf den aktuellen Jellyfin-Verknüpfungs-Kontext eines Anime (Source/SourceLinks), den die
// Übernahme-Logik braucht, um überhaupt zu wissen, ob ein Jellyfin-Vergleich versucht werden soll.
type adminAniSearchTakeoverSyncSourceRepository interface {
	GetAnimeSyncSource(ctx context.Context, animeID int64) (*models.AdminAnimeSyncSource, error)
}

// adminAnimeCreateRepository definiert den minimalen Lese-/Schreibzugriff, den CreateAnime für den
// Save-Time-AniSearch-Duplicate-Guard (165-03/D-20, re-check unmittelbar vor dem Insert) und den
// eigentlichen Insert benötigt. Bewusst getrennt von der deutlich breiteren
// *repository.AdminContentRepository-Oberfläche des `repo`-Felds, damit beide Pfade in
// Handler-Tests durch ein schlankes Fake ersetzt werden können, ohne eine laufende Datenbank
// vorauszusetzen.
type adminAnimeCreateRepository interface {
	FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error)
	CreateAnime(ctx context.Context, input models.AdminAnimeCreateInput, userID int64) (*models.AdminAnimeItem, error)
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
	GetJellyfinSourceBindings(ctx context.Context, itemIDs []string) (map[models.JellyfinSourceKey]models.JellyfinSourceSnapshot, error)
	Apply(ctx context.Context, input models.EpisodeImportApplyInput) (*models.EpisodeImportApplyResult, error)
	PreviewExistingCoverage(ctx context.Context, animeID int64) (models.EpisodeImportExistingCoverage, error)
	ResolveFansubGroupMatches(ctx context.Context, candidates []string) ([]models.FansubGroupMatch, error)
	SuggestSimilarFansubGroups(ctx context.Context, candidate string) ([]models.FansubGroupSuggestion, error)
	GetAnimeType(ctx context.Context, animeID int64) (string, error)
}

type adminAniSearchEpisodeFetcher interface {
	FetchAnimeEpisodes(ctx context.Context, aniSearchID string) ([]services.AniSearchEpisode, error)
}

// adminRoleChecker definiert die Methode zur Prüfung, ob ein Nutzer eine bestimmte Rolle besitzt.
type adminRoleChecker interface {
	UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error)
}

// adminFansubReleasesContributionsRepo definiert den Datenbankzugriff für den aufgelösten Mitwirkenden-Satz.
type adminFansubReleasesContributionsRepo interface {
	ListEffectiveContributionsForVersion(ctx context.Context, releaseVersionID int64, fansubGroupID int64) (*repository.EffectiveContributionsResult, error)
}

type releaseCrewCommandService interface {
	Replace(context.Context, services.ReleaseCrewReplaceCommand) (*repository.ReleaseCrewSnapshot, error)
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
	// animeCreateRepo verdrahtet den Save-Time-AniSearch-Duplicate-Guard und den Insert-Pfad von
	// CreateAnime (165-03). Zeigt in Produktion auf dieselbe repo-Instanz wie `repo`.
	animeCreateRepo                 adminAnimeCreateRepository
	adminRoleName                   string
	mediaStorageDir                 string
	jellyfinAPIKey                  string
	jellyfinBaseURL                 string
	jellyfinStreamPath              string
	jellyfinAllowedLibraryIDs       []string
	httpClient                      *http.Client
	enrichmentService               adminAniSearchDraftLoader
	aniSearchEpisodes               adminAniSearchEpisodeFetcher
	// releaseFilenameParser (186-02, D-03): anitogo-gestützte Episoden-/Checksum-
	// Erkennung für den Episoden-Import-Dateinamen-Fallback, siehe
	// services.ReleaseFilenameParser und admin_episode_import_filename_parser.go.
	releaseFilenameParser services.ReleaseFilenameParser
	assetSearchService              adminAnimeAssetSearchService
	mediaService                    *services.MediaService
	generatedImageStore             generatedAnimeImageStore
	fansubNotesRepo                 *repository.FansubNotesRepository
	projectNoteCreditSvc            projectNoteCreditService
	releaseVersionNotesRepo         *repository.ReleaseVersionNotesRepository
	fansubReleasesContributionsRepo adminFansubReleasesContributionsRepo
	releaseCrewSvc                  releaseCrewCommandService
	markdownSvc                     *services.MarkdownService
	tiptapSvc                       *services.TipTapService
	permissionSvc                   *permissions.Service
	auditLogRepo                    auditLogWriter
	segmentGrantSecret              string
	segmentGrantTTL                 time.Duration
	segmentRenderEnabled            bool
	segmentRenderDir                string
	segmentRenderMaxSeconds         int32
	segmentRenderFFmpegPath         string
	// segmentRenderWakeup weckt StartSegmentRenderWorker nicht-blockierend auf, sobald
	// RenderSegment einen neuen Job einreiht (reduziert Poll-Latenz; siehe segment_render_worker.go).
	segmentRenderWakeup chan struct{}
	// discoveryCache ist der TTL-Cache fuer den Jellyfin-Library-Discovery-Snapshot
	// (165-01, D-06/D-19). Injectable Interface statt *redis.Client, damit
	// buildJellyfinDiscoverySnapshot ohne laufendes Redis unit-testbar bleibt
	// (siehe jellyfin_discovery_cache.go). nil bedeutet "kein Cache konfiguriert" —
	// der Snapshot wird dann bei jedem Aufruf frisch von Jellyfin geholt.
	discoveryCache discoveryCacheStore
	// discoverySnapshotGroup (165-15, GAP-15): buendelt gleichzeitige
	// buildJellyfinDiscoverySnapshot-Rebuild-Aufrufe (TTL-Ablauf-Race oder zwei parallele
	// "Aktualisieren"-Klicks) ueber denselben Cache-Key in genau einen echten Jellyfin-Fetch
	// (singleflight.Group.Do). Zero-value-ready, keine Konstruktor-Aenderung noetig.
	discoverySnapshotGroup singleflight.Group
	// discoveryExistingMatchRepo (165-06): derselbe Existenz-Lookup wie `repo`, als schmales
	// Interface fuer Handler-Tests ohne laufende Postgres-Instanz.
	discoveryExistingMatchRepo jellyfinDiscoveryExistingMatchRepository
	// libraryDiscoveryIgnoreRepo (165-02/165-06): reversibler "ignoriert"-Zustand fuer die
	// Discovery-Liste und die Ignore/Unignore-Endpunkte. nil ist gueltig (kein Ignore-Zugriff).
	libraryDiscoveryIgnoreRepo libraryDiscoveryIgnoreRepository
	// folderManagementRepo (165-07): schmale Repo-Oberflaeche fuer die additive
	// Jellyfin-Mehrfach-Ordner-Verwaltung (D-05/D-18), siehe jellyfin_source_folder_management.go.
	folderManagementRepo jellyfinFolderManagementRepository
	// animeAniSearchLinkRepo (quick-261018-l5r Task 1): schmale Repo-Oberflaeche fuer den additiven
	// "nur verknüpfen"-Endpunkt, siehe admin_content_anime_anisearch_link.go.
	animeAniSearchLinkRepo adminAniSearchLinkRepository
	// aniSearchTakeoverSnapshotRepo/aniSearchFetcher/aniSearchTakeoverSyncSourceRepo
	// (quick-261018-l5r Task 2): die drei schmalen Abhaengigkeiten des transaktionalen
	// Feld-Uebernahme-Features, siehe admin_content_anime_anisearch_takeover.go. Jede davon darf
	// nil sein (z.B. in aelteren Handler-Tests) -- der Handler degradiert dann auf "nur verknuepfen,
	// keine Uebernahme versucht", nie auf einen Fehler.
	aniSearchTakeoverSnapshotRepo   adminAniSearchTakeoverSnapshotRepository
	aniSearchFetcher                adminAniSearchAnimeFetcher
	aniSearchTakeoverSyncSourceRepo adminAniSearchTakeoverSyncSourceRepository
}

// AdminContentJellyfinConfig enthält die Verbindungsparameter für die Jellyfin-Integration im Admin-Bereich.
type AdminContentJellyfinConfig struct {
	APIKey            string
	BaseURL           string
	StreamPath        string
	AllowedLibraryIDs []string // Optionale Whitelist von Bibliotheks-IDs; nil bedeutet kein Filter
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
		repo:                      repo,
		relationRepo:              repo,
		themeRepo:                 repo,
		animeAssetRepo:            animeAssetRepo,
		fansubRepo:                fansubRepo,
		episodeVersionRepo:        episodeVersionRepo,
		episodeImportRepo:         episodeImportRepo,
		authzRepo:                 authzRepo,
		adminRoleName:             strings.TrimSpace(adminRoleName),
		mediaStorageDir:           strings.TrimSpace(mediaStorageDir),
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
	handler.releaseFilenameParser = services.NewAnitogoReleaseFilenameParser()
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
	handler.animeCreateRepo = repo
	handler.discoveryExistingMatchRepo = repo
	handler.folderManagementRepo = repo
	handler.animeAniSearchLinkRepo = repo
	// quick-261018-l5r Task 2: dieselbe aniSearchClient-Instanz wie enrichmentService/
	// aniSearchEpisodes -- kein zweiter AniSearch-HTTP-Client.
	handler.aniSearchFetcher = aniSearchClient
	handler.aniSearchTakeoverSnapshotRepo = repo
	handler.aniSearchTakeoverSyncSourceRepo = repo

	return handler
}

// WithMediaDeps verdrahtet Media-Repository und Media-Service nachtraeglich,
// damit Theme-Video-Uploads dieselben Instanzen wie der Fansub-Handler nutzen.
func (h *AdminContentHandler) WithMediaDeps(repo *repository.MediaRepository, svc *services.MediaService) *AdminContentHandler {
	h.mediaRepo = repo
	h.mediaService = svc
	return h
}

// WithNoteDeps verdrahtet FansubNotesRepository und MarkdownService nachträglich,
// damit Fansub-Note-Handler auf diese Abhängigkeiten zugreifen können.
func (h *AdminContentHandler) WithNoteDeps(repo *repository.FansubNotesRepository, svc *services.MarkdownService) *AdminContentHandler {
	h.fansubNotesRepo = repo
	h.markdownSvc = svc
	return h
}

func (h *AdminContentHandler) WithProjectNoteCreditDeps(svc projectNoteCreditService) *AdminContentHandler {
	h.projectNoteCreditSvc = svc
	return h
}

// WithReleaseVersionNoteDeps verdrahtet das ReleaseVersionNotesRepository nachträglich.
// markdownSvc wird von WithNoteDeps gesetzt und hier wiederverwendet.
func (h *AdminContentHandler) WithReleaseVersionNoteDeps(repo *repository.ReleaseVersionNotesRepository) *AdminContentHandler {
	h.releaseVersionNotesRepo = repo
	return h
}

// WithFansubReleasesContributionsDeps verdrahtet das FansubReleasesContributionsRepository nachträglich,
// damit GetEffectiveContributionsForVersion auf den aufgelösten Mitwirkenden-Satz zugreifen kann.
func (h *AdminContentHandler) WithFansubReleasesContributionsDeps(repo *repository.FansubReleasesContributionsRepository) *AdminContentHandler {
	h.fansubReleasesContributionsRepo = repo
	return h
}

func (h *AdminContentHandler) WithReleaseCrewDeps(svc releaseCrewCommandService) *AdminContentHandler {
	h.releaseCrewSvc = svc
	return h
}

// WithTipTapDeps verdrahtet den TipTapService nachträglich,
// damit Fansub-Note-Handler TipTap-Validierung und -Rendering nutzen können.
func (h *AdminContentHandler) WithTipTapDeps(tiptapSvc *services.TipTapService) *AdminContentHandler {
	h.tiptapSvc = tiptapSvc
	return h
}

func (h *AdminContentHandler) WithPermissionDeps(permissionSvc *permissions.Service, auditLogRepo auditLogWriter) *AdminContentHandler {
	h.permissionSvc = permissionSvc
	h.auditLogRepo = auditLogRepo
	return h
}

func (h *AdminContentHandler) WithSegmentStreamDeps(
	grantSecret string,
	grantTTLSeconds int,
	renderEnabled bool,
	renderDir string,
	renderMaxSeconds int,
	renderFFmpegPath string,
) *AdminContentHandler {
	h.segmentGrantSecret = strings.TrimSpace(grantSecret)
	h.segmentGrantTTL = time.Duration(grantTTLSeconds) * time.Second
	h.segmentRenderEnabled = renderEnabled
	h.segmentRenderDir = strings.TrimSpace(renderDir)
	h.segmentRenderMaxSeconds = int32(renderMaxSeconds)
	h.segmentRenderFFmpegPath = strings.TrimSpace(renderFFmpegPath)
	if h.segmentRenderWakeup == nil {
		h.segmentRenderWakeup = make(chan struct{}, 1)
	}
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
