package handlers

import (
	"net/url"
	"strconv"
	"strings"
)

const maxAnimeBackdropCandidates = 12

func buildAnimeBackdropProxyURLs(seriesID string, backdropCount int) []string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return []string{}
	}

	if backdropCount <= 0 {
		backdropCount = 1
	}
	if backdropCount > maxAnimeBackdropCandidates {
		backdropCount = maxAnimeBackdropCandidates
	}

	result := make([]string, 0, backdropCount)
	result = append(result, buildAnimeBackdropProxyURL(trimmedSeriesID, nil))
	for i := 1; i < backdropCount; i++ {
		index := i
		result = append(result, buildAnimeBackdropProxyURL(trimmedSeriesID, &index))
	}

	return result
}

func buildAnimeBackdropProxyURL(seriesID string, index *int) string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return ""
	}

	query := url.Values{}
	query.Set("provider", "jellyfin")
	query.Set("item_id", trimmedSeriesID)
	query.Set("kind", "backdrop")
	if index != nil {
		query.Set("index", strconv.Itoa(*index))
	}

	return "/api/v1/media/image?" + query.Encode()
}

func buildAnimeBackdropVideoProxyURL(itemID string) string {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return ""
	}

	query := url.Values{}
	query.Set("provider", "jellyfin")
	query.Set("item_id", trimmedItemID)

	return "/api/v1/media/video?" + query.Encode()
}

func buildAnimeLogoProxyURL(seriesID string) string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return ""
	}

	query := url.Values{}
	query.Set("provider", "jellyfin")
	query.Set("item_id", trimmedSeriesID)
	query.Set("kind", "logo")

	return "/api/v1/media/image?" + query.Encode()
}

func buildAnimeBannerProxyURL(seriesID string) string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return ""
	}

	query := url.Values{}
	query.Set("provider", "jellyfin")
	query.Set("item_id", trimmedSeriesID)
	query.Set("kind", "banner")

	return "/api/v1/media/image?" + query.Encode()
}
