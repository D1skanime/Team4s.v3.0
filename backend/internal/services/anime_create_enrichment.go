package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
)

// AniSearchFetcher definiert die Schnittstelle zum Abrufen und Suchen von Anime-Daten bei AniSearch.
type AniSearchFetcher interface {
	FetchAnime(ctx context.Context, aniSearchID string) (AniSearchAnime, error)
	SearchAnime(ctx context.Context, query string, limit int) ([]AniSearchSearchCandidate, error)
}

// AnimeCreateEnrichmentRepository definiert die Datenbankoperationen, die der AnimeCreateEnrichmentService
// zum Suchen und Auflösen von Anime-Quellen und Relationen benötigt.
type AnimeCreateEnrichmentRepository interface {
	FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error)
	ResolveAdminAnimeRelationTargetsByTitles(ctx context.Context, titles []string) ([]models.AdminAnimeRelationTitleMatch, error)
	ResolveAdminAnimeRelationTargetsBySources(ctx context.Context, sources []string) ([]models.AdminAnimeSourceMatch, error)
}

// JellysyncFollowupResult enthält das Ergebnis einer Jellyfin-Synchronisations-Nachfolge-Operation,
// inklusive des aktualisierten Entwurfs und der Liste befüllter Felder und Assets.
type JellysyncFollowupResult struct {
	Draft        models.AdminAnimeCreateDraftPayload
	FilledFields []string
	FilledAssets []string
	Applied      bool
}

// JellysyncFollowupFunc ist eine Callback-Funktion, die nach dem AniSearch-Anreicherungsschritt
// aufgerufen wird, um Jellyfin-Daten in den Entwurf einzumischen.
type JellysyncFollowupFunc func(ctx context.Context, draft models.AdminAnimeCreateDraftPayload) (JellysyncFollowupResult, error)

// AnimeCreateEnrichmentService koordiniert die AniSearch-Anreicherung und optionale
// Jellyfin-Synchronisation beim Erstellen eines neuen Anime-Entwurfs.
type AnimeCreateEnrichmentService struct {
	fetcher  AniSearchFetcher
	repo     AnimeCreateEnrichmentRepository
	followup JellysyncFollowupFunc
}

// NewAnimeCreateEnrichmentService erstellt einen neuen AnimeCreateEnrichmentService mit dem angegebenen
// AniSearch-Fetcher, Repository und optionalen Jellyfin-Followup-Callback.
func NewAnimeCreateEnrichmentService(
	fetcher AniSearchFetcher,
	repo AnimeCreateEnrichmentRepository,
	followup JellysyncFollowupFunc,
) *AnimeCreateEnrichmentService {
	return &AnimeCreateEnrichmentService{
		fetcher:  fetcher,
		repo:     repo,
		followup: followup,
	}
}

// AdminAnimeAssetSearchProvider definiert die Schnittstelle für einen Asset-Suchprovider,
// der Kandidaten für einen bestimmten Asset-Typ (z.B. Cover, Banner) liefert.
type AdminAnimeAssetSearchProvider interface {
	Source() models.AdminAnimeAssetSearchSource
	SupportsAssetKind(assetKind string) bool
	SearchAssetCandidates(ctx context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)
}

// AnimeAssetSearchService koordiniert alle aktiven Asset-Provider und verteilt
// das Such-Limit gleichmäßig auf die Provider.
type AnimeAssetSearchService struct {
	providers map[models.AdminAnimeAssetSearchSource]AdminAnimeAssetSearchProvider
}

// NewAnimeAssetSearchService erstellt einen neuen AnimeAssetSearchService mit den angegebenen Providern.
// Nil-Provider werden ignoriert; doppelte Provider-Quellen werden überschrieben.
func NewAnimeAssetSearchService(providers ...AdminAnimeAssetSearchProvider) *AnimeAssetSearchService {
	indexed := make(map[models.AdminAnimeAssetSearchSource]AdminAnimeAssetSearchProvider, len(providers))
	for _, provider := range providers {
		if provider == nil {
			continue
		}
		indexed[provider.Source()] = provider
	}
	return &AnimeAssetSearchService{providers: indexed}
}

// SearchAssetCandidates koordiniert alle aktiven Asset-Provider und gibt eine kombinierte
// Liste von Asset-Kandidaten zurück, aufgeteilt nach Provider-Limit.
func (s *AnimeAssetSearchService) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	query := strings.TrimSpace(req.Query)
	assetKind := strings.TrimSpace(req.AssetKind)
	if query == "" {
		return nil, fmt.Errorf("asset query is required")
	}
	if assetKind == "" {
		return nil, fmt.Errorf("asset kind is required")
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 12
	}
	if limit > 50 {
		limit = 50
	}
	page := req.Page
	if page <= 0 {
		page = 1
	}
	req.Query = query
	req.AssetKind = assetKind
	req.Limit = limit
	req.Page = page

	orderedSources := req.Sources
	if len(orderedSources) == 0 {
		orderedSources = defaultAssetSearchSourceOrder(assetKind)
	}

	// Collect active providers first so we can distribute the limit evenly.
	activeProviders := make([]AdminAnimeAssetSearchProvider, 0, len(orderedSources))
	for _, source := range orderedSources {
		provider, ok := s.providers[source]
		if ok && provider != nil && provider.SupportsAssetKind(assetKind) {
			activeProviders = append(activeProviders, provider)
		}
	}
	if len(activeProviders) == 0 {
		return nil, nil
	}

	// Give each provider an equal share with a minimum of 4 so no provider
	// is squeezed out entirely when the global limit is small.
	perProvider := limit / len(activeProviders)
	if perProvider < 4 {
		perProvider = 4
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, limit)
	for i, provider := range activeProviders {
		slotLimit := perProvider
		// Last provider gets whatever is left so we always reach the total limit.
		if i == len(activeProviders)-1 {
			remaining := limit - len(results)
			if remaining > slotLimit {
				slotLimit = remaining
			}
		}

		providerReq := req
		providerReq.Limit = slotLimit

		candidates, err := provider.SearchAssetCandidates(ctx, providerReq)
		if err != nil {
			continue
		}
		for _, candidate := range candidates {
			if strings.TrimSpace(candidate.ID) == "" || strings.TrimSpace(candidate.PreviewURL) == "" || strings.TrimSpace(candidate.ImageURL) == "" {
				continue
			}
			results = append(results, candidate)
			if len(results) >= limit {
				return results, nil
			}
		}
	}

	return results, nil
}

func defaultAssetSearchSourceOrder(assetKind string) []models.AdminAnimeAssetSearchSource {
	switch strings.TrimSpace(assetKind) {
	case "cover":
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceTMDB,
			models.AdminAnimeAssetSearchSourceZerochan,
			models.AdminAnimeAssetSearchSourceKonachan,
			models.AdminAnimeAssetSearchSourceSafebooru,
		}
	case "background":
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceTMDB,
			models.AdminAnimeAssetSearchSourceFanartTV,
			models.AdminAnimeAssetSearchSourceZerochan,
			models.AdminAnimeAssetSearchSourceKonachan,
			models.AdminAnimeAssetSearchSourceSafebooru,
		}
	case "logo":
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceFanartTV,
			models.AdminAnimeAssetSearchSourceTMDB,
		}
	case "banner":
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceAniList,
			models.AdminAnimeAssetSearchSourceFanartTV,
			models.AdminAnimeAssetSearchSourceTMDB,
		}
	default:
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceZerochan,
		}
	}
}

type ZerochanAssetSearchProvider struct {
	baseURL    string
	httpClient *http.Client
}

func NewZerochanAssetSearchProvider(httpClient *http.Client) *ZerochanAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &ZerochanAssetSearchProvider{
		baseURL:    "https://www.zerochan.net",
		httpClient: client,
	}
}

func (p *ZerochanAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceZerochan
}

func (p *ZerochanAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	switch strings.TrimSpace(assetKind) {
	case "cover", "background":
		return true
	default:
		return false
	}
}

func (p *ZerochanAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	searchURL, err := url.Parse(strings.TrimSpace(p.baseURL))
	if err != nil {
		return nil, fmt.Errorf("parse zerochan base url: %w", err)
	}

	searchURL.Path = "/" + strings.ReplaceAll(strings.TrimSpace(req.Query), " ", "+")
	qv := url.Values{}
	qv.Set("q", strings.TrimSpace(req.Query))
	if req.Page > 1 {
		qv.Set("p", fmt.Sprintf("%d", req.Page))
	}
	searchURL.RawQuery = "json&" + qv.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create zerochan request: %w", err)
	}
	request.Header.Set("User-Agent", "Team4sAssetSearch/1.0 (admin)")

	response, err := p.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call zerochan: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("zerochan returned status %d", response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read zerochan response: %w", err)
	}

	var payload struct {
		Items []struct {
			ID        int64    `json:"id"`
			Width     int32    `json:"width"`
			Height    int32    `json:"height"`
			Thumbnail string   `json:"thumbnail"`
			Tag       string   `json:"tag"`
			Tags      []string `json:"tags"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode zerochan response: %w", err)
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, item := range payload.Items {
		if item.ID <= 0 || strings.TrimSpace(item.Thumbnail) == "" {
			continue
		}
		if !zerochanMatchesAssetKind(req.AssetKind, item.Width, item.Height, item.Tags) {
			continue
		}

		title := strings.TrimSpace(item.Tag)
		sourceURL := fmt.Sprintf("%s/%d", strings.TrimRight(p.baseURL, "/"), item.ID)
		imageURL := strings.TrimSpace(item.Thumbnail)
		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("zerochan-%d", item.ID),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceZerochan,
			PreviewURL: imageURL,
			ImageURL:   imageURL,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		if title != "" {
			candidate.Title = &title
		}
		if item.Width > 0 {
			candidate.Width = &item.Width
		}
		if item.Height > 0 {
			candidate.Height = &item.Height
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}

	return results, nil
}

// FanartTVAssetSearchProvider fetches logos and banners from fanart.tv.
// Resolution: TMDB search (Bearer) → TMDB TV ID → TMDB external_ids → TVDB ID → FanartTV.
type FanartTVAssetSearchProvider struct {
	apiKey     string
	tmdbAPIKey string // used only for TVDB ID resolution
	baseURL    string
	httpClient *http.Client
}

func NewFanartTVAssetSearchProvider(apiKey, tmdbAPIKey string, httpClient *http.Client) *FanartTVAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &FanartTVAssetSearchProvider{
		apiKey:     strings.TrimSpace(apiKey),
		tmdbAPIKey: strings.TrimSpace(tmdbAPIKey),
		baseURL:    "https://webservice.fanart.tv/v3",
		httpClient: client,
	}
}

func (p *FanartTVAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceFanartTV
}

func (p *FanartTVAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	switch strings.TrimSpace(assetKind) {
	case "logo", "banner", "background":
		return true
	default:
		return false
	}
}

func (p *FanartTVAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	if strings.TrimSpace(p.apiKey) == "" {
		return nil, fmt.Errorf("fanart.tv api key not configured")
	}

	tvdbID, err := p.resolveTVDBID(ctx, req.Query)
	if err != nil || tvdbID == 0 {
		return nil, err
	}

	return p.fetchImages(ctx, tvdbID, req)
}

// resolveTVDBID uses authenticated TMDB to get the TVDB ID for a title:
// 1. Search TMDB TV with Bearer token → first TMDB TV ID
// 2. Fetch /tv/{id}/external_ids → tvdb_id
func (p *FanartTVAssetSearchProvider) resolveTVDBID(ctx context.Context, query string) (int64, error) {
	if strings.TrimSpace(p.tmdbAPIKey) == "" {
		return 0, nil
	}

	// Step 1: search TMDB for the show
	searchURL, err := url.Parse("https://api.themoviedb.org/3/search/tv")
	if err != nil {
		return 0, fmt.Errorf("parse tmdb search url: %w", err)
	}
	qv := url.Values{}
	qv.Set("query", strings.TrimSpace(query))
	qv.Set("page", "1")
	searchURL.RawQuery = qv.Encode()

	searchReq, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return 0, fmt.Errorf("create tmdb search request: %w", err)
	}
	searchReq.Header.Set("Accept", "application/json")
	searchReq.Header.Set("Authorization", "Bearer "+p.tmdbAPIKey)

	searchResp, err := p.httpClient.Do(searchReq)
	if err != nil {
		return 0, fmt.Errorf("tmdb search for fanart: %w", err)
	}
	defer searchResp.Body.Close()
	if searchResp.StatusCode >= 400 {
		return 0, nil
	}

	searchBody, err := io.ReadAll(searchResp.Body)
	if err != nil {
		return 0, fmt.Errorf("read tmdb search body: %w", err)
	}
	var searchPayload struct {
		Results []struct {
			ID int64 `json:"id"`
		} `json:"results"`
	}
	if err := json.Unmarshal(searchBody, &searchPayload); err != nil || len(searchPayload.Results) == 0 {
		return 0, nil
	}
	tmdbID := searchPayload.Results[0].ID

	// Step 2: get external IDs to find the TVDB ID
	extURL := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/external_ids", tmdbID)
	extReq, err := http.NewRequestWithContext(ctx, http.MethodGet, extURL, nil)
	if err != nil {
		return 0, fmt.Errorf("create external_ids request: %w", err)
	}
	extReq.Header.Set("Accept", "application/json")
	extReq.Header.Set("Authorization", "Bearer "+p.tmdbAPIKey)

	extResp, err := p.httpClient.Do(extReq)
	if err != nil {
		return 0, fmt.Errorf("tmdb external_ids: %w", err)
	}
	defer extResp.Body.Close()
	if extResp.StatusCode >= 400 {
		return 0, nil
	}

	extBody, err := io.ReadAll(extResp.Body)
	if err != nil {
		return 0, fmt.Errorf("read external_ids body: %w", err)
	}
	var extPayload struct {
		TVDBId int64 `json:"tvdb_id"`
	}
	if err := json.Unmarshal(extBody, &extPayload); err != nil || extPayload.TVDBId == 0 {
		return 0, nil
	}
	return extPayload.TVDBId, nil
}

func (p *FanartTVAssetSearchProvider) fetchImages(
	ctx context.Context,
	tvdbID int64,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	imagesURL, err := url.Parse(fmt.Sprintf("%s/tv/%d", p.baseURL, tvdbID))
	if err != nil {
		return nil, fmt.Errorf("parse fanart images url: %w", err)
	}
	qv := url.Values{}
	qv.Set("api_key", p.apiKey)
	imagesURL.RawQuery = qv.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imagesURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create fanart images request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call fanart.tv: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, nil
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("fanart.tv returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read fanart response: %w", err)
	}

	var payload struct {
		HDTVLogos       []fanartImage `json:"hdtvlogo"`
		ClearLogos      []fanartImage `json:"clearlogo"`
		TVLogos         []fanartImage `json:"tvlogo"`
		TVBanners       []fanartImage `json:"tvbanner"`
		SeasonBanners   []fanartImage `json:"seasonbanner"`
		ShowBackgrounds []fanartImage `json:"showbackground"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode fanart response: %w", err)
	}

	var images []fanartImage
	switch strings.TrimSpace(req.AssetKind) {
	case "logo":
		// hdtvlogo (HD clear logos) first, then clearlogo, then tvlogo
		images = append(payload.HDTVLogos, payload.ClearLogos...)
		images = append(images, payload.TVLogos...)
	case "banner":
		images = append(payload.TVBanners, payload.SeasonBanners...)
	case "background":
		images = payload.ShowBackgrounds
	}

	// Paginate locally.
	page := req.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * req.Limit
	if offset >= len(images) {
		return nil, nil
	}
	images = images[offset:]

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, img := range images {
		if strings.TrimSpace(img.URL) == "" {
			continue
		}
		sourceURL := fmt.Sprintf("https://fanart.tv/series/%d", tvdbID)
		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("fanart-%s", img.ID),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceFanartTV,
			PreviewURL: img.URL,
			ImageURL:   img.URL,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}
	return results, nil
}

type fanartImage struct {
	ID   string `json:"id"`
	URL  string `json:"url"`
	Lang string `json:"lang"`
}

// TMDBAssetSearchProvider searches TMDB for cover (posters) and background (backdrops).
type TMDBAssetSearchProvider struct {
	apiKey     string
	baseURL    string
	imageBase  string
	httpClient *http.Client
}

func NewTMDBAssetSearchProvider(apiKey string, httpClient *http.Client) *TMDBAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &TMDBAssetSearchProvider{
		apiKey:     strings.TrimSpace(apiKey),
		baseURL:    "https://api.themoviedb.org/3",
		imageBase:  "https://image.tmdb.org/t/p",
		httpClient: client,
	}
}

func (p *TMDBAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceTMDB
}

func (p *TMDBAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	switch strings.TrimSpace(assetKind) {
	case "cover", "background":
		return true
	default:
		return false
	}
}

func (p *TMDBAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	if strings.TrimSpace(p.apiKey) == "" {
		return nil, fmt.Errorf("tmdb api key not configured")
	}

	tvID, err := p.searchTVShow(ctx, req.Query)
	if err != nil {
		return nil, err
	}
	if tvID == 0 {
		return nil, nil
	}

	return p.fetchImages(ctx, tvID, req)
}

func (p *TMDBAssetSearchProvider) searchTVShow(ctx context.Context, query string) (int64, error) {
	searchURL, err := url.Parse(p.baseURL + "/search/tv")
	if err != nil {
		return 0, fmt.Errorf("parse tmdb search url: %w", err)
	}
	qv := url.Values{}
	qv.Set("query", strings.TrimSpace(query))
	qv.Set("page", "1")
	searchURL.RawQuery = qv.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return 0, fmt.Errorf("create tmdb search request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call tmdb search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return 0, fmt.Errorf("tmdb search returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("read tmdb search response: %w", err)
	}

	var payload struct {
		Results []struct {
			ID int64 `json:"id"`
		} `json:"results"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return 0, fmt.Errorf("decode tmdb search response: %w", err)
	}

	if len(payload.Results) == 0 {
		return 0, nil
	}
	return payload.Results[0].ID, nil
}

func (p *TMDBAssetSearchProvider) fetchImages(
	ctx context.Context,
	tvID int64,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	imagesURL, err := url.Parse(fmt.Sprintf("%s/tv/%d/images", p.baseURL, tvID))
	if err != nil {
		return nil, fmt.Errorf("parse tmdb images url: %w", err)
	}
	imagesURL.RawQuery = ""

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imagesURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create tmdb images request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call tmdb images: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("tmdb images returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read tmdb images response: %w", err)
	}

	var payload struct {
		Posters   []tmdbImage `json:"posters"`
		Backdrops []tmdbImage `json:"backdrops"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode tmdb images response: %w", err)
	}

	var images []tmdbImage
	switch strings.TrimSpace(req.AssetKind) {
	case "cover":
		images = payload.Posters
	case "background":
		images = payload.Backdrops
	}

	// Paginate the full image list locally (TMDB returns all images in one call).
	page := req.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * req.Limit
	if offset >= len(images) {
		return nil, nil
	}
	images = images[offset:]

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, img := range images {
		if strings.TrimSpace(img.FilePath) == "" {
			continue
		}
		previewURL := fmt.Sprintf("%s/w342%s", p.imageBase, img.FilePath)
		imageURL := fmt.Sprintf("%s/original%s", p.imageBase, img.FilePath)
		sourceURL := fmt.Sprintf("https://www.themoviedb.org/tv/%d/images", tvID)

		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("tmdb-%d-%s", tvID, strings.TrimPrefix(img.FilePath, "/")),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceTMDB,
			PreviewURL: previewURL,
			ImageURL:   imageURL,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		if img.Width > 0 {
			w := int32(img.Width)
			candidate.Width = &w
		}
		if img.Height > 0 {
			h := int32(img.Height)
			candidate.Height = &h
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}
	return results, nil
}

type tmdbImage struct {
	FilePath string  `json:"file_path"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	VoteAvg  float64 `json:"vote_average"`
}

// KonachanAssetSearchProvider searches konachan.com for cover and background images.
type KonachanAssetSearchProvider struct {
	baseURL    string
	httpClient *http.Client
}

func NewKonachanAssetSearchProvider(httpClient *http.Client) *KonachanAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &KonachanAssetSearchProvider{
		baseURL:    "https://konachan.com",
		httpClient: client,
	}
}

func (p *KonachanAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceKonachan
}

func (p *KonachanAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	switch strings.TrimSpace(assetKind) {
	case "cover", "background":
		return true
	default:
		return false
	}
}

func (p *KonachanAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	searchURL, err := url.Parse(p.baseURL + "/post.json")
	if err != nil {
		return nil, fmt.Errorf("parse konachan url: %w", err)
	}
	qv := url.Values{}
	qv.Set("tags", strings.TrimSpace(req.Query))
	qv.Set("limit", fmt.Sprintf("%d", req.Limit*2))
	if req.Page > 1 {
		qv.Set("page", fmt.Sprintf("%d", req.Page))
	}
	searchURL.RawQuery = qv.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create konachan request: %w", err)
	}
	httpReq.Header.Set("User-Agent", "Team4sAssetSearch/1.0 (admin)")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call konachan: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("konachan returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read konachan response: %w", err)
	}

	var posts []struct {
		ID             int64  `json:"id"`
		Width          int    `json:"width"`
		Height         int    `json:"height"`
		SampleURL      string `json:"sample_url"`
		FileURL        string `json:"file_url"`
		PreviewURL     string `json:"preview_url"`
	}
	if err := json.Unmarshal(body, &posts); err != nil {
		return nil, fmt.Errorf("decode konachan response: %w", err)
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, post := range posts {
		if post.ID <= 0 || strings.TrimSpace(post.SampleURL) == "" {
			continue
		}
		if !konachanMatchesAssetKind(req.AssetKind, post.Width, post.Height) {
			continue
		}
		previewURL := strings.TrimSpace(post.PreviewURL)
		if previewURL == "" {
			previewURL = strings.TrimSpace(post.SampleURL)
		}
		imageURL := strings.TrimSpace(post.FileURL)
		if imageURL == "" {
			imageURL = strings.TrimSpace(post.SampleURL)
		}
		sourceURL := fmt.Sprintf("%s/post/show/%d", p.baseURL, post.ID)
		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("konachan-%d", post.ID),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceKonachan,
			PreviewURL: previewURL,
			ImageURL:   imageURL,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		if post.Width > 0 {
			w := int32(post.Width)
			candidate.Width = &w
		}
		if post.Height > 0 {
			h := int32(post.Height)
			candidate.Height = &h
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}
	return results, nil
}

func konachanMatchesAssetKind(assetKind string, width int, height int) bool {
	switch strings.TrimSpace(assetKind) {
	case "cover":
		return height >= width
	case "background":
		return width > height
	default:
		return false
	}
}

// SafebooruAssetSearchProvider searches safebooru.org for cover and background images.
// Safebooru is SFW and has extensive anime artwork coverage.
//
// Starting offset: to avoid always returning the same popular first-page results,
// the starting pid is derived from a deterministic hash of the query string. This gives
// variety across different titles while still supporting consistent "Mehr laden"
// pagination within a single search session (page 2 continues from startPID + limit).
type SafebooruAssetSearchProvider struct {
	baseURL    string
	httpClient *http.Client
}

func NewSafebooruAssetSearchProvider(httpClient *http.Client) *SafebooruAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &SafebooruAssetSearchProvider{
		baseURL:    "https://safebooru.org",
		httpClient: client,
	}
}

func (p *SafebooruAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceSafebooru
}

func (p *SafebooruAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	switch strings.TrimSpace(assetKind) {
	case "cover", "background":
		return true
	default:
		return false
	}
}

func (p *SafebooruAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	// Derive a deterministic starting offset from the query so different titles
	// get different starting positions. Limit to 10 pages of variance so niche
	// anime with small tag pools (< 20 posts) are not skipped entirely.
	const maxStartOffset = 10
	startOffset := int(safebooruQueryHash(req.Query) % maxStartOffset)
	pid := startOffset + (req.Page-1)*req.Limit

	searchURL, err := url.Parse(p.baseURL + "/index.php")
	if err != nil {
		return nil, fmt.Errorf("parse safebooru url: %w", err)
	}
	qv := url.Values{}
	qv.Set("page", "dapi")
	qv.Set("s", "post")
	qv.Set("q", "index")
	qv.Set("json", "1")
	qv.Set("tags", strings.TrimSpace(req.Query))
	qv.Set("limit", fmt.Sprintf("%d", req.Limit*2))
	qv.Set("pid", fmt.Sprintf("%d", pid))
	searchURL.RawQuery = qv.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create safebooru request: %w", err)
	}
	httpReq.Header.Set("User-Agent", "Team4sAssetSearch/1.0 (admin)")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call safebooru: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("safebooru returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read safebooru response: %w", err)
	}

	var posts []struct {
		ID         int64  `json:"id"`
		Width      int    `json:"width"`
		Height     int    `json:"height"`
		SampleURL  string `json:"sample_url"`
		FileURL    string `json:"file_url"`
		PreviewURL string `json:"preview_url"`
	}
	if err := json.Unmarshal(body, &posts); err != nil {
		return nil, fmt.Errorf("decode safebooru response: %w", err)
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, post := range posts {
		if post.ID <= 0 || strings.TrimSpace(post.SampleURL) == "" {
			continue
		}
		if !konachanMatchesAssetKind(req.AssetKind, post.Width, post.Height) {
			continue
		}
		previewURL := strings.TrimSpace(post.PreviewURL)
		if previewURL == "" {
			previewURL = strings.TrimSpace(post.SampleURL)
		}
		imageURL := strings.TrimSpace(post.FileURL)
		if imageURL == "" {
			imageURL = strings.TrimSpace(post.SampleURL)
		}
		sourceURL := fmt.Sprintf("%s/index.php?page=post&s=view&id=%d", p.baseURL, post.ID)
		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("safebooru-%d", post.ID),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceSafebooru,
			PreviewURL: previewURL,
			ImageURL:   imageURL,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		if post.Width > 0 {
			w := int32(post.Width)
			candidate.Width = &w
		}
		if post.Height > 0 {
			h := int32(post.Height)
			candidate.Height = &h
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}
	return results, nil
}

// safebooruQueryHash returns a simple deterministic hash of a query string.
// Used to derive a per-query starting pid offset so results vary across titles.
func safebooruQueryHash(query string) uint32 {
	var h uint32 = 2166136261
	for i := 0; i < len(query); i++ {
		h ^= uint32(query[i])
		h *= 16777619
	}
	return h
}

// AniListAssetSearchProvider fetches banner images from AniList via GraphQL.
// No API key required. Returns one banner per matched anime entry, which gives
// good coverage for OVA, OAD, specials, and bonus episodes that other sources miss.
type AniListAssetSearchProvider struct {
	baseURL    string
	httpClient *http.Client
}

func NewAniListAssetSearchProvider(httpClient *http.Client) *AniListAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &AniListAssetSearchProvider{
		baseURL:    "https://graphql.anilist.co",
		httpClient: client,
	}
}

func (p *AniListAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return models.AdminAnimeAssetSearchSourceAniList
}

func (p *AniListAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	return strings.TrimSpace(assetKind) == "banner"
}

func (p *AniListAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	perPage := req.Limit * 2
	if perPage > 50 {
		perPage = 50
	}
	page := req.Page
	if page <= 0 {
		page = 1
	}

	const gql = `query($search:String,$page:Int,$perPage:Int){
		Page(page:$page,perPage:$perPage){
			media(search:$search,type:ANIME){
				id
				title{romaji english}
				bannerImage
				format
			}
		}
	}`
	variables := map[string]any{
		"search":  strings.TrimSpace(req.Query),
		"page":    page,
		"perPage": perPage,
	}
	reqBody, err := json.Marshal(map[string]any{"query": gql, "variables": variables})
	if err != nil {
		return nil, fmt.Errorf("marshal anilist request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL, strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("create anilist request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call anilist: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("anilist returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read anilist response: %w", err)
	}

	var payload struct {
		Data struct {
			Page struct {
				Media []struct {
					ID    int64 `json:"id"`
					Title struct {
						Romaji  string `json:"romaji"`
						English string `json:"english"`
					} `json:"title"`
					BannerImage string `json:"bannerImage"`
					Format      string `json:"format"`
				} `json:"media"`
			} `json:"Page"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode anilist response: %w", err)
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, media := range payload.Data.Page.Media {
		if strings.TrimSpace(media.BannerImage) == "" {
			continue
		}
		title := strings.TrimSpace(media.Title.English)
		if title == "" {
			title = strings.TrimSpace(media.Title.Romaji)
		}
		sourceURL := fmt.Sprintf("https://anilist.co/anime/%d", media.ID)
		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("anilist-%d", media.ID),
			AssetKind:  req.AssetKind,
			Source:     models.AdminAnimeAssetSearchSourceAniList,
			PreviewURL: media.BannerImage,
			ImageURL:   media.BannerImage,
			SourceURL:  normalizeStringPtr(sourceURL),
		}
		if title != "" {
			candidate.Title = &title
		}
		results = append(results, candidate)
		if len(results) >= req.Limit {
			break
		}
	}
	return results, nil
}

func zerochanMatchesAssetKind(assetKind string, width int32, height int32, tags []string) bool {
	normalizedKind := strings.TrimSpace(assetKind)
	switch normalizedKind {
	case "cover":
		return height >= width
	case "background":
		return width >= height || containsZerochanTag(tags, "Official Wallpaper") || containsZerochanTag(tags, "Wallpaper")
	default:
		return false
	}
}

func containsZerochanTag(tags []string, expected string) bool {
	for _, tag := range tags {
		if strings.EqualFold(strings.TrimSpace(tag), strings.TrimSpace(expected)) {
			return true
		}
	}
	return false
}

func (s *AnimeCreateEnrichmentService) Enrich(
	ctx context.Context,
	req models.AdminAnimeAniSearchEnrichmentRequest,
) (any, error) {
	aniSearchID := strings.TrimSpace(req.AniSearchID)
	if aniSearchID == "" {
		return nil, fmt.Errorf("anisearch id is required")
	}

	sourceTag := "anisearch:" + aniSearchID
	if duplicate, err := s.repo.FindAnimeBySource(ctx, sourceTag); err != nil {
		return nil, err
	} else if duplicate != nil {
		return models.AdminAnimeAniSearchEnrichmentRedirectResult{
			Mode:            "redirect",
			AniSearchID:     aniSearchID,
			ExistingAnimeID: duplicate.AnimeID,
			ExistingTitle:   duplicate.Title,
			RedirectPath:    buildAdminAnimeEditPath(duplicate.AnimeID),
		}, nil
	}

	aniSearchAnime, err := s.fetcher.FetchAnime(ctx, aniSearchID)
	if err != nil {
		return nil, err
	}

	draft := req.Draft
	manualFieldsKept := make([]string, 0)
	filledFields := make([]string, 0)
	filledAssets := make([]string, 0)

	aniSearchDraft := buildAniSearchDraftPayload(aniSearchAnime)
	mergeCreateDraftPayload(&draft, aniSearchDraft, &manualFieldsKept, &filledFields, &filledAssets)

	resolvedRelations, relationCandidates, relationMatches, err := s.resolveRelations(ctx, aniSearchAnime.Relations)
	if err != nil {
		return nil, err
	}
	if len(draft.Relations) == 0 && len(resolvedRelations) > 0 {
		draft.Relations = resolvedRelations
		filledFields = appendUniqueStrings(filledFields, "relations")
	}

	jellysyncApplied := false
	if s.followup != nil {
		followup, err := s.followup(ctx, draft)
		if err != nil {
			return nil, err
		}
		if followup.Applied {
			draft = followup.Draft
			jellysyncApplied = true
			filledFields = appendUniqueStrings(filledFields, followup.FilledFields...)
			filledAssets = appendUniqueStrings(filledAssets, followup.FilledAssets...)
		}
	}

	return models.AdminAnimeAniSearchEnrichmentDraftResult{
		Mode:        "draft",
		AniSearchID: aniSearchID,
		Source:      sourceTag,
		Draft:       draft,
		ManualFieldsKept: appendUniqueStrings(
			nil,
			manualFieldsKept...,
		),
		FilledFields: appendUniqueStrings(nil, filledFields...),
		FilledAssets: appendUniqueStrings(nil, filledAssets...),
		Provider: models.AdminAnimeAniSearchEnrichmentProviderSummary{
			AniSearchID:        aniSearchID,
			JellysyncApplied:   jellysyncApplied,
			RelationCandidates: int32(relationCandidates),
			RelationMatches:    int32(relationMatches),
		},
	}, nil
}

func (s *AnimeCreateEnrichmentService) LoadAniSearchDraft(
	ctx context.Context,
	aniSearchID string,
) (models.AdminAnimeCreateDraftPayload, []models.AdminAnimeRelation, error) {
	trimmedID := strings.TrimSpace(aniSearchID)
	if trimmedID == "" {
		return models.AdminAnimeCreateDraftPayload{}, nil, fmt.Errorf("anisearch id is required")
	}

	aniSearchAnime, err := s.fetcher.FetchAnime(ctx, trimmedID)
	if err != nil {
		return models.AdminAnimeCreateDraftPayload{}, nil, err
	}

	resolvedRelations, _, _, err := s.resolveRelations(ctx, aniSearchAnime.Relations)
	if err != nil {
		return models.AdminAnimeCreateDraftPayload{}, nil, err
	}

	draft := buildAniSearchDraftPayload(aniSearchAnime)
	draft.Relations = append([]models.AdminAnimeRelation(nil), resolvedRelations...)
	return draft, resolvedRelations, nil
}

func (s *AnimeCreateEnrichmentService) SearchAniSearchCandidates(
	ctx context.Context,
	query string,
	limit int,
) (models.AdminAnimeAniSearchSearchResult, error) {
	candidates, err := s.fetcher.SearchAnime(ctx, query, limit)
	if err != nil {
		return models.AdminAnimeAniSearchSearchResult{}, err
	}

	sourceKeys := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		aniSearchID := strings.TrimSpace(candidate.AniSearchID)
		if aniSearchID == "" {
			continue
		}
		sourceKeys = append(sourceKeys, "anisearch:"+aniSearchID)
	}

	existingMatches := make(map[string]struct{}, len(sourceKeys))
	if len(sourceKeys) > 0 {
		sourceMatches, err := s.repo.ResolveAdminAnimeRelationTargetsBySources(ctx, sourceKeys)
		if err != nil {
			return models.AdminAnimeAniSearchSearchResult{}, err
		}
		for _, match := range sourceMatches {
			existingMatches[normalizeLookupKey(match.Source)] = struct{}{}
		}
	}

	result := make([]models.AdminAnimeAniSearchSearchCandidate, 0, len(candidates))
	filteredExistingCount := int32(0)
	for _, candidate := range candidates {
		sourceKey := normalizeLookupKey("anisearch:" + strings.TrimSpace(candidate.AniSearchID))
		if _, exists := existingMatches[sourceKey]; exists {
			filteredExistingCount++
			continue
		}
		result = append(result, models.AdminAnimeAniSearchSearchCandidate{
			AniSearchID: candidate.AniSearchID,
			Title:       candidate.Title,
			Type:        candidate.Type,
			Year:        candidate.Year,
		})
	}
	return models.AdminAnimeAniSearchSearchResult{
		Data:                  result,
		FilteredExistingCount: filteredExistingCount,
	}, nil
}

func buildAniSearchDraftPayload(anime AniSearchAnime) models.AdminAnimeCreateDraftPayload {
	draft := models.AdminAnimeCreateDraftPayload{
		Title:       strings.TrimSpace(anime.PrimaryTitle),
		TitleDE:     anime.GermanTitle,
		TitleEN:     anime.EnglishTitle,
		Type:        mapAniSearchFormatToAnimeType(anime.Format),
		ContentType: "anime",
		Status:      "ongoing",
		Year:        anime.Year,
		MaxEpisodes: anime.EpisodeCount,
		Genre:       joinOptional(anime.Genres),
		Description: anime.Description,
		Source:      normalizeStringPtr("anisearch:" + anime.AniSearchID),
		AltTitles:   buildAniSearchAltTitles(anime),
		Tags:        append([]string(nil), anime.Tags...),
	}

	return draft
}

func buildAniSearchAltTitles(anime AniSearchAnime) []models.AdminAnimeAltTitle {
	result := make([]models.AdminAnimeAltTitle, 0, 4)
	appendIfPresent := func(language string, kind string, value *string) {
		if value == nil || strings.TrimSpace(*value) == "" {
			return
		}
		lang := language
		typeKind := kind
		result = append(result, models.AdminAnimeAltTitle{
			Language: &lang,
			Kind:     &typeKind,
			Title:    strings.TrimSpace(*value),
		})
	}

	appendIfPresent("ja", "official", anime.OriginalTitle)
	appendIfPresent("ja-Latn", "romanized", anime.RomajiTitle)
	appendIfPresent("en", "official", anime.EnglishTitle)
	appendIfPresent("de", "official", anime.GermanTitle)
	return result
}

func mapAniSearchFormatToAnimeType(format *string) string {
	value := strings.ToLower(strings.TrimSpace(derefString(format)))
	switch value {
	case "movie", "film":
		return "film"
	case "ova":
		return "ova"
	case "ona", "web":
		return "ona"
	case "special":
		return "special"
	case "bonus":
		return "bonus"
	default:
		return "tv"
	}
}

func mergeCreateDraftPayload(
	target *models.AdminAnimeCreateDraftPayload,
	incoming models.AdminAnimeCreateDraftPayload,
	manualFieldsKept *[]string,
	filledFields *[]string,
	filledAssets *[]string,
) {
	if target == nil {
		return
	}

	mergeString := func(field string, current *string, next *string, assign func(*string)) {
		if next == nil || strings.TrimSpace(*next) == "" {
			return
		}
		if current != nil && strings.TrimSpace(*current) != "" {
			*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, field)
			return
		}
		assign(next)
		*filledFields = appendUniqueStrings(*filledFields, field)
	}

	if strings.TrimSpace(target.Title) != "" {
		if strings.TrimSpace(incoming.Title) != "" {
			*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "title")
		}
	} else if strings.TrimSpace(incoming.Title) != "" {
		target.Title = strings.TrimSpace(incoming.Title)
		*filledFields = appendUniqueStrings(*filledFields, "title")
	}

	mergeString("title_de", target.TitleDE, incoming.TitleDE, func(value *string) { target.TitleDE = value })
	mergeString("title_en", target.TitleEN, incoming.TitleEN, func(value *string) { target.TitleEN = value })
	mergeString("genre", target.Genre, incoming.Genre, func(value *string) { target.Genre = value })
	mergeString("description", target.Description, incoming.Description, func(value *string) { target.Description = value })
	mergeString("cover_image", target.CoverImage, incoming.CoverImage, func(value *string) { target.CoverImage = value })
	mergeString("source", target.Source, incoming.Source, func(value *string) { target.Source = value })
	mergeString("folder_name", target.FolderName, incoming.FolderName, func(value *string) { target.FolderName = value })

	if shouldFillAniSearchType(target.Type, incoming.Type) {
		target.Type = incoming.Type
		*filledFields = appendUniqueStrings(*filledFields, "type")
	} else if strings.TrimSpace(target.Type) != "" && strings.TrimSpace(incoming.Type) != "" && !strings.EqualFold(target.Type, incoming.Type) {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "type")
	}

	if target.Year == nil && incoming.Year != nil {
		target.Year = incoming.Year
		*filledFields = appendUniqueStrings(*filledFields, "year")
	} else if target.Year != nil && incoming.Year != nil && *target.Year != *incoming.Year {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "year")
	}

	if target.MaxEpisodes == nil && incoming.MaxEpisodes != nil {
		target.MaxEpisodes = incoming.MaxEpisodes
		*filledFields = appendUniqueStrings(*filledFields, "max_episodes")
	} else if target.MaxEpisodes != nil && incoming.MaxEpisodes != nil && *target.MaxEpisodes != *incoming.MaxEpisodes {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "max_episodes")
	}

	if len(target.AltTitles) == 0 && len(incoming.AltTitles) > 0 {
		target.AltTitles = append([]models.AdminAnimeAltTitle(nil), incoming.AltTitles...)
		*filledFields = appendUniqueStrings(*filledFields, "alt_titles")
	} else if len(target.AltTitles) > 0 && len(incoming.AltTitles) > 0 {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "alt_titles")
	}

	if len(target.Tags) == 0 && len(incoming.Tags) > 0 {
		target.Tags = append([]string(nil), incoming.Tags...)
		*filledFields = appendUniqueStrings(*filledFields, "tags")
	} else if len(target.Tags) > 0 && len(incoming.Tags) > 0 {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "tags")
	}

	if target.AssetSuggestions == nil && incoming.AssetSuggestions != nil {
		target.AssetSuggestions = cloneDraftAssetSuggestions(incoming.AssetSuggestions)
		*filledAssets = appendDraftSuggestionKinds(*filledAssets, incoming.AssetSuggestions)
	}
}

func cloneDraftAssetSuggestions(input *models.AdminAnimeCreateDraftAssetSuggestions) *models.AdminAnimeCreateDraftAssetSuggestions {
	if input == nil {
		return nil
	}
	copyValue := *input
	if len(input.Backgrounds) > 0 {
		copyValue.Backgrounds = append([]string(nil), input.Backgrounds...)
	}
	return &copyValue
}

func appendDraftSuggestionKinds(target []string, suggestions *models.AdminAnimeCreateDraftAssetSuggestions) []string {
	if suggestions == nil {
		return target
	}
	if strings.TrimSpace(derefString(suggestions.Cover)) != "" {
		target = appendUniqueStrings(target, "cover")
	}
	if strings.TrimSpace(derefString(suggestions.Banner)) != "" {
		target = appendUniqueStrings(target, "banner")
	}
	if strings.TrimSpace(derefString(suggestions.Logo)) != "" {
		target = appendUniqueStrings(target, "logo")
	}
	if len(suggestions.Backgrounds) > 0 {
		target = appendUniqueStrings(target, "background")
	}
	if strings.TrimSpace(derefString(suggestions.BackgroundVideo)) != "" {
		target = appendUniqueStrings(target, "background_video")
	}
	return target
}

func (s *AnimeCreateEnrichmentService) resolveRelations(
	ctx context.Context,
	relations []AniSearchAnimeRelation,
) ([]models.AdminAnimeRelation, int, int, error) {
	candidates := make([]AniSearchAnimeRelation, 0, len(relations))
	sources := make([]string, 0, len(relations))
	titles := make([]string, 0, len(relations))

	for _, relation := range relations {
		if !isAllowedAdminRelationLabel(relation.RelationLabel) {
			continue
		}
		title := strings.TrimSpace(relation.Title)
		if title == "" {
			continue
		}
		candidates = append(candidates, relation)
		titles = append(titles, title)
		if relation.AniSearchID != "" {
			sources = append(sources, "anisearch:"+strings.TrimSpace(relation.AniSearchID))
		}
	}
	if len(candidates) == 0 {
		return []models.AdminAnimeRelation{}, 0, 0, nil
	}

	// Source-based lookup (reliable — matches by anisearch:{id} in source field).
	matchBySource := make(map[string]models.AdminAnimeRelationTarget)
	if len(sources) > 0 {
		sourceMatches, err := s.repo.ResolveAdminAnimeRelationTargetsBySources(ctx, sources)
		if err != nil {
			return nil, 0, 0, err
		}
		for _, m := range sourceMatches {
			matchBySource[normalizeLookupKey(m.Source)] = models.AdminAnimeRelationTarget{
				AnimeID: m.AnimeID,
				Title:   m.Title,
			}
		}
	}

	// Title-based lookup as fallback for relations without AniSearch IDs.
	matchByTitle := make(map[string]models.AdminAnimeRelationTarget)
	titleMatches, err := s.repo.ResolveAdminAnimeRelationTargetsByTitles(ctx, titles)
	if err != nil {
		return nil, 0, 0, err
	}
	for _, m := range titleMatches {
		matchByTitle[normalizeLookupKey(m.MatchedTitle)] = m.Target
	}

	result := make([]models.AdminAnimeRelation, 0)
	for _, relation := range candidates {
		var target models.AdminAnimeRelationTarget
		var ok bool

		// Prefer source match; fall back to title match.
		if relation.AniSearchID != "" {
			target, ok = matchBySource[normalizeLookupKey("anisearch:"+strings.TrimSpace(relation.AniSearchID))]
		}
		if !ok {
			target, ok = matchByTitle[normalizeLookupKey(relation.Title)]
		}
		if !ok {
			continue
		}

		result = append(result, models.AdminAnimeRelation{
			TargetAnimeID:  target.AnimeID,
			RelationLabel:  relation.RelationLabel,
			TargetTitle:    target.Title,
			TargetType:     target.Type,
			TargetStatus:   target.Status,
			TargetYear:     target.Year,
			TargetCoverURL: target.CoverURL,
		})
	}

	return result, len(candidates), len(result), nil
}

func BuildJellysyncFollowupResult(
	draft models.AdminAnimeCreateDraftPayload,
	preview models.AdminJellyfinIntakePreviewResult,
) JellysyncFollowupResult {
	result := draft
	filledFields := make([]string, 0)
	filledAssets := make([]string, 0)

	if result.Year == nil && preview.Year != nil {
		result.Year = preview.Year
		filledFields = appendUniqueStrings(filledFields, "year")
	}
	if result.Description == nil && preview.Description != nil {
		result.Description = preview.Description
		filledFields = appendUniqueStrings(filledFields, "description")
	}
	if result.Genre == nil && preview.Genre != nil {
		result.Genre = preview.Genre
		filledFields = appendUniqueStrings(filledFields, "genre")
	}
	if len(result.Tags) == 0 && len(preview.Tags) > 0 {
		result.Tags = append([]string(nil), preview.Tags...)
		filledFields = appendUniqueStrings(filledFields, "tags")
	}

	assetSuggestions := cloneDraftAssetSuggestions(result.AssetSuggestions)
	if assetSuggestions == nil {
		assetSuggestions = &models.AdminAnimeCreateDraftAssetSuggestions{}
	}
	if assetSuggestions.Cover == nil && preview.AssetSlots.Cover.URL != nil {
		assetSuggestions.Cover = preview.AssetSlots.Cover.URL
		filledAssets = appendUniqueStrings(filledAssets, "cover")
	}
	if assetSuggestions.Banner == nil && preview.AssetSlots.Banner.URL != nil {
		assetSuggestions.Banner = preview.AssetSlots.Banner.URL
		filledAssets = appendUniqueStrings(filledAssets, "banner")
	}
	if assetSuggestions.Logo == nil && preview.AssetSlots.Logo.URL != nil {
		assetSuggestions.Logo = preview.AssetSlots.Logo.URL
		filledAssets = appendUniqueStrings(filledAssets, "logo")
	}
	if len(assetSuggestions.Backgrounds) == 0 && len(preview.AssetSlots.Backgrounds) > 0 {
		backgrounds := make([]string, 0, len(preview.AssetSlots.Backgrounds))
		for _, slot := range preview.AssetSlots.Backgrounds {
			if slot.URL != nil && strings.TrimSpace(*slot.URL) != "" {
				backgrounds = append(backgrounds, strings.TrimSpace(*slot.URL))
			}
		}
		if len(backgrounds) > 0 {
			assetSuggestions.Backgrounds = backgrounds
			filledAssets = appendUniqueStrings(filledAssets, "background")
		}
	}
	if assetSuggestions.BackgroundVideo == nil && preview.AssetSlots.BackgroundVideo.URL != nil {
		assetSuggestions.BackgroundVideo = preview.AssetSlots.BackgroundVideo.URL
		filledAssets = appendUniqueStrings(filledAssets, "background_video")
	}
	if len(filledAssets) > 0 {
		result.AssetSuggestions = assetSuggestions
	}

	return JellysyncFollowupResult{
		Draft:        result,
		FilledFields: filledFields,
		FilledAssets: filledAssets,
		Applied:      len(filledFields) > 0 || len(filledAssets) > 0,
	}
}

func BuildAdminAnimeCreateAniSearchSummary(
	source *string,
	relationsAttempted int,
	relationsApplied int,
	relationsSkippedExisting int,
	warnings []string,
) *models.AdminAnimeCreateAniSearchSummary {
	normalizedSource := normalizeStringPtr(derefString(source))
	if normalizedSource == nil && relationsAttempted == 0 && relationsApplied == 0 && relationsSkippedExisting == 0 && len(warnings) == 0 {
		return nil
	}

	return &models.AdminAnimeCreateAniSearchSummary{
		Source:                   normalizedSource,
		RelationsAttempted:       int32(relationsAttempted),
		RelationsApplied:         int32(relationsApplied),
		RelationsSkippedExisting: int32(relationsSkippedExisting),
		Warnings:                 appendUniqueStrings(nil, warnings...),
	}
}

func buildAdminAnimeEditPath(animeID int64) string {
	return fmt.Sprintf("/admin/anime/%d/edit", animeID)
}

func isAllowedAdminRelationLabel(label string) bool {
	switch strings.TrimSpace(label) {
	case "Hauptgeschichte", "Nebengeschichte", "Fortsetzung", "Zusammenfassung":
		return true
	default:
		return false
	}
}

func normalizeLookupKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func appendUniqueStrings(target []string, values ...string) []string {
	seen := make(map[string]struct{}, len(target))
	for _, value := range target {
		seen[normalizeLookupKey(value)] = struct{}{}
	}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := normalizeLookupKey(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		target = append(target, trimmed)
	}
	return target
}

func joinOptional(values []string) *string {
	if len(values) == 0 {
		return nil
	}
	joined := strings.Join(values, ", ")
	return &joined
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func shouldFillAniSearchType(current string, incoming string) bool {
	currentType := strings.TrimSpace(strings.ToLower(current))
	incomingType := strings.TrimSpace(strings.ToLower(incoming))
	if incomingType == "" {
		return false
	}
	if currentType == "" {
		return true
	}

	// The create form starts as "tv". Treat that untouched default as replaceable
	// when AniSearch returns a more specific format like "film".
	return currentType == "tv" && incomingType != "tv"
}
