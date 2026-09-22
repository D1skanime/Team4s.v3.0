package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
)

// AniListAssetSearchProvider fetches banner AND cover images from AniList via GraphQL.
// No API key required. For "banner" it returns one banner per matched anime entry, which gives
// good coverage for OVA, OAD, specials, and bonus episodes that other sources miss. For "cover"
// it returns the official AniList cover image (coverImage.extraLarge, falling back to
// coverImage.large) -- movie-format anime frequently have bannerImage: null but always have a
// cover image, so this is a dedicated cover source, not a banner reuse.
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
	switch strings.TrimSpace(assetKind) {
	case "banner", "cover":
		return true
	default:
		return false
	}
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
				coverImage{extraLarge large}
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
					CoverImage  struct {
						ExtraLarge string `json:"extraLarge"`
						Large      string `json:"large"`
					} `json:"coverImage"`
					Format string `json:"format"`
				} `json:"media"`
			} `json:"Page"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode anilist response: %w", err)
	}

	assetKind := strings.TrimSpace(req.AssetKind)
	results := make([]models.AdminAnimeAssetSearchCandidate, 0, req.Limit)
	for _, media := range payload.Data.Page.Media {
		var imageURL string
		if assetKind == "cover" {
			imageURL = strings.TrimSpace(media.CoverImage.ExtraLarge)
			if imageURL == "" {
				imageURL = strings.TrimSpace(media.CoverImage.Large)
			}
		} else {
			imageURL = strings.TrimSpace(media.BannerImage)
		}
		if imageURL == "" {
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
			PreviewURL: imageURL,
			ImageURL:   imageURL,
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
