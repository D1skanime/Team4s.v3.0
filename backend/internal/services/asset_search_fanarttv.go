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

// FanartTVAssetSearchProvider fetches logos and banners from fanart.tv.
// Resolution depends on whether the title matches a TMDB TV series or a TMDB movie:
//   - TV: TMDB search (Bearer) → TMDB TV ID → TMDB external_ids → TVDB ID → FanartTV /tv/{tvdbID}.
//   - Movie: TMDB search (Bearer) → TMDB movie ID → FanartTV /movies/{tmdbMovieID} directly
//     (no TVDB resolution step; the movies endpoint is keyed by the TMDB movie ID itself).
type FanartTVAssetSearchProvider struct {
	apiKey      string
	tmdbAPIKey  string // used only for TV/movie lookup + TVDB ID resolution
	baseURL     string
	tmdbBaseURL string
	httpClient  *http.Client
}

func NewFanartTVAssetSearchProvider(apiKey, tmdbAPIKey string, httpClient *http.Client) *FanartTVAssetSearchProvider {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &FanartTVAssetSearchProvider{
		apiKey:      strings.TrimSpace(apiKey),
		tmdbAPIKey:  strings.TrimSpace(tmdbAPIKey),
		baseURL:     "https://webservice.fanart.tv/v3",
		tmdbBaseURL: "https://api.themoviedb.org/3",
		httpClient:  client,
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

	match, ok, err := lookupTMDBTVOrMovie(ctx, p.httpClient, p.tmdbBaseURL, p.tmdbAPIKey, req.Query)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, nil
	}

	if match.MediaType == "movie" {
		return p.fetchMovieImages(ctx, match.ID, req)
	}

	tvdbID, err := p.resolveTVDBIDFromTMDBTVID(ctx, match.ID)
	if err != nil || tvdbID == 0 {
		return nil, err
	}
	return p.fetchTVImages(ctx, tvdbID, req)
}

// resolveTVDBIDFromTMDBTVID fetches /tv/{tmdbTVID}/external_ids and extracts the TVDB ID.
func (p *FanartTVAssetSearchProvider) resolveTVDBIDFromTMDBTVID(ctx context.Context, tmdbTVID int64) (int64, error) {
	extURL := fmt.Sprintf("%s/tv/%d/external_ids", p.tmdbBaseURL, tmdbTVID)
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

// fetchTVImages fetches images from the fanart.tv /tv/{tvdbID} endpoint (unchanged TV/TVDB path).
func (p *FanartTVAssetSearchProvider) fetchTVImages(
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

	sourceURL := fmt.Sprintf("https://fanart.tv/series/%d", tvdbID)
	return buildFanartCandidates(images, sourceURL, req), nil
}

// fetchMovieImages fetches images from the fanart.tv /movies/{tmdbMovieID} endpoint. Live
// verified against the real fanart.tv API: the movies endpoint is directly addressable by the
// TMDB movie ID, no TVDB resolution step is needed.
func (p *FanartTVAssetSearchProvider) fetchMovieImages(
	ctx context.Context,
	tmdbMovieID int64,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	imagesURL, err := url.Parse(fmt.Sprintf("%s/movies/%d", p.baseURL, tmdbMovieID))
	if err != nil {
		return nil, fmt.Errorf("parse fanart movie images url: %w", err)
	}
	qv := url.Values{}
	qv.Set("api_key", p.apiKey)
	imagesURL.RawQuery = qv.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imagesURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create fanart movie images request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call fanart.tv movies: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, nil
	}
	if resp.StatusCode >= 400 {
		// NOTE (T-quick-260922-ikh-02): never include imagesURL.String() here -- it carries
		// api_key as a query parameter. Only status code + numeric ID are safe to surface.
		return nil, fmt.Errorf("fanart.tv movies returned status %d for tmdb movie id %d", resp.StatusCode, tmdbMovieID)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read fanart movie response: %w", err)
	}

	var payload struct {
		HDMovieLogos     []fanartImage `json:"hdmovielogo"`
		MovieLogos       []fanartImage `json:"movielogo"`
		MovieBanners     []fanartImage `json:"moviebanner"`
		MovieBackgrounds []fanartImage `json:"moviebackground"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode fanart movie response: %w", err)
	}

	var images []fanartImage
	switch strings.TrimSpace(req.AssetKind) {
	case "logo":
		// hdmovielogo (HD clear logos) first, then movielogo -- same fallback order as the
		// TV path (hdtvlogo -> clearlogo).
		images = append(payload.HDMovieLogos, payload.MovieLogos...)
	case "banner":
		images = payload.MovieBanners
	case "background":
		images = payload.MovieBackgrounds
	}

	sourceURL := fmt.Sprintf("https://fanart.tv/movie/%d", tmdbMovieID)
	return buildFanartCandidates(images, sourceURL, req), nil
}

// buildFanartCandidates paginates a fanart.tv image list locally and converts it into asset
// search candidates. Shared by both the TV/TVDB path and the movie/TMDB-movie-ID path.
func buildFanartCandidates(
	images []fanartImage,
	sourceURL string,
	req models.AdminAnimeAssetSearchRequest,
) []models.AdminAnimeAssetSearchCandidate {
	page := req.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * req.Limit
	if offset >= len(images) {
		return nil
	}
	images = images[offset:]

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, img := range images {
		if strings.TrimSpace(img.URL) == "" {
			continue
		}
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
	return results
}

type fanartImage struct {
	ID   string `json:"id"`
	URL  string `json:"url"`
	Lang string `json:"lang"`
}
