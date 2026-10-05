package repository

import (
	"strings"

	"team4s.v3/backend/internal/models"
)

// 174-19: split out of anime_assets.go to keep the retained core file under the
// project's 450-line modularity ceiling (CLAUDE.md). These are generic
// pointer/URL-resolution utilities used by GetResolvedAssets/getResolvedAssetsV2
// (anime_assets.go) and directly by several asset-type sibling files
// (cover/banner_logo/background) -- they carry no asset-type-specific logic of
// their own, so splitting them out does not violate the "co-locate legacy/V2
// pairs" rule (RESEARCH.md Pitfall 4).

func resolveAnimeBannerAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	return resolveAnimeResolvedAsset(mediaID, source, resolvedURL, providerKey, mediaPath)
}

func resolveAnimeResolvedAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	ownership := strings.TrimSpace(derefString(source))
	if ownership == "" {
		return nil
	}
	urlValue := resolveAnimeAssetURL(mediaID, resolvedURL, mediaPath)
	if urlValue == "" {
		return nil
	}

	return &models.AnimeResolvedAsset{
		MediaID:     mediaID,
		URL:         urlValue,
		Ownership:   models.AnimeAssetOwnership(ownership),
		ProviderKey: normalizeNullableTrimmedString(providerKey),
	}
}

func resolveAnimeAssetURL(mediaID *string, resolvedURL *string, mediaPath *string) string {
	if mediaID != nil && strings.TrimSpace(derefString(mediaPath)) != "" {
		return strings.TrimSpace(derefString(mediaPath))
	}
	return strings.TrimSpace(derefString(resolvedURL))
}

func normalizeNullableTrimmedString(value *string) *string {
	trimmed := strings.TrimSpace(derefString(value))
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func resolveV2AssetOwnership(provider *string, externalID *string) (models.AnimeAssetOwnership, *string) {
	if strings.TrimSpace(derefString(provider)) == "" {
		return models.AnimeAssetOwnershipManual, nil
	}

	return models.AnimeAssetOwnershipProvider, normalizeNullableTrimmedString(externalID)
}
