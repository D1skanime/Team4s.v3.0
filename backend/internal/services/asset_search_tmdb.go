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

// TMDBAssetSearchProvider searches TMDB for cover (posters) and background (backdrops).
// Durchsucht sowohl TV-Serien (/search/tv) als auch Filme (/search/movie) -- Movie-Format-Anime
// wie ".hack//G.U. Trilogy" sind bei TMDB ausschließlich als Film gelistet.
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

	match, ok, err := lookupTMDBTVOrMovie(ctx, p.httpClient, p.baseURL, p.apiKey, req.Query)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, nil
	}

	return p.fetchImages(ctx, match.MediaType, match.ID, req)
}

func (p *TMDBAssetSearchProvider) fetchImages(
	ctx context.Context,
	mediaType string,
	id int64,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	var imagesPath string
	if mediaType == "tv" {
		imagesPath = fmt.Sprintf("%s/tv/%d/images", p.baseURL, id)
	} else {
		imagesPath = fmt.Sprintf("%s/movie/%d/images", p.baseURL, id)
	}

	imagesURL, err := url.Parse(imagesPath)
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

	var sourceURL string
	if mediaType == "tv" {
		sourceURL = fmt.Sprintf("https://www.themoviedb.org/tv/%d", id)
	} else {
		sourceURL = fmt.Sprintf("https://www.themoviedb.org/movie/%d", id)
	}

	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, img := range images {
		if strings.TrimSpace(img.FilePath) == "" {
			continue
		}
		previewURL := fmt.Sprintf("%s/w342%s", p.imageBase, img.FilePath)
		imageURL := fmt.Sprintf("%s/original%s", p.imageBase, img.FilePath)

		candidate := models.AdminAnimeAssetSearchCandidate{
			ID:         fmt.Sprintf("tmdb-%s-%d-%s", mediaType, id, strings.TrimPrefix(img.FilePath, "/")),
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
