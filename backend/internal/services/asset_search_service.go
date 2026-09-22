package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"team4s.v3/backend/internal/models"
)

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

	// Give each provider a fair first-pass share so early providers cannot
	// exhaust the global limit before later sources are queried.
	perProvider := (limit + len(activeProviders) - 1) / len(activeProviders)

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
			log.Printf("asset_search_service: provider %s lieferte einen Fehler (asset_kind=%s, query=%q): %v", provider.Source(), assetKind, query, err)
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

// defaultAssetSearchSourceOrder liefert die Standard-Provider-Reihenfolge je Asset-Slot.
// Für "cover" stehen TMDB und AniList (offizielle Poster/Cover) VOR den Booru-Fanart-Quellen
// (Zerochan/Konachan/Safebooru) — AniList wurde als Cover-Quelle mit diesem Plan ergänzt.
func defaultAssetSearchSourceOrder(assetKind string) []models.AdminAnimeAssetSearchSource {
	switch strings.TrimSpace(assetKind) {
	case "cover":
		return []models.AdminAnimeAssetSearchSource{
			models.AdminAnimeAssetSearchSourceTMDB,
			models.AdminAnimeAssetSearchSourceAniList,
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
