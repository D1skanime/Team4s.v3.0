package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// probeJellyfinBackdropProxyURLs prüft vorhandene Backdrop-Bilder in Jellyfin und gibt die entsprechenden Proxy-URLs zurück.
func (h *AnimeHandler) probeJellyfinBackdropProxyURLs(ctx context.Context, seriesID string) []string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return []string{}
	}

	defaultExists, err := h.jellyfinBackdropExists(ctx, trimmedSeriesID, nil)
	if err != nil {
		return []string{}
	}

	result := make([]string, 0, maxAnimeBackdropCandidates)
	if defaultExists {
		result = append(result, buildAnimeBackdropProxyURL(trimmedSeriesID, nil))
	}

	for i := 1; i < maxAnimeBackdropCandidates; i++ {
		index := i
		exists, probeErr := h.jellyfinBackdropExists(ctx, trimmedSeriesID, &index)
		if probeErr != nil {
			break
		}
		if exists {
			result = append(result, buildAnimeBackdropProxyURL(trimmedSeriesID, &index))
		}
	}

	if len(result) == 0 {
		indexZero := 0
		zeroExists, zeroErr := h.jellyfinBackdropExists(ctx, trimmedSeriesID, &indexZero)
		if zeroErr == nil && zeroExists {
			result = append(result, buildAnimeBackdropProxyURL(trimmedSeriesID, &indexZero))
		}
	}

	return result
}

// probeJellyfinThemeVideoProxyURLs ruft die Themenvideos einer Jellyfin-Serie ab und gibt die entsprechenden Proxy-URLs zurück.
func (h *AnimeHandler) probeJellyfinThemeVideoProxyURLs(ctx context.Context, seriesID string) []string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return []string{}
	}

	apiPath := fmt.Sprintf("/Items/%s/ThemeVideos", url.PathEscape(trimmedSeriesID))
	payload := animeJellyfinThemeVideosResponse{}
	if _, err := h.fetchJellyfinJSON(ctx, apiPath, url.Values{}, &payload); err != nil {
		return []string{}
	}

	seen := make(map[string]struct{}, len(payload.Items))
	result := make([]string, 0, len(payload.Items))
	for _, item := range payload.Items {
		videoID := strings.TrimSpace(item.ID)
		if videoID == "" {
			continue
		}
		if _, exists := seen[videoID]; exists {
			continue
		}
		seen[videoID] = struct{}{}
		result = append(result, buildAnimeBackdropVideoProxyURL(videoID))
		if len(result) >= maxAnimeBackdropCandidates {
			break
		}
	}

	return result
}

func (h *AnimeHandler) probeJellyfinLogoProxyURL(ctx context.Context, seriesID string) string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return ""
	}

	exists, err := h.jellyfinImageExists(ctx, trimmedSeriesID, "Logo")
	if err != nil || !exists {
		return ""
	}

	return buildAnimeLogoProxyURL(trimmedSeriesID)
}

func (h *AnimeHandler) probeJellyfinBannerProxyURL(ctx context.Context, seriesID string) string {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return ""
	}

	exists, err := h.jellyfinImageExists(ctx, trimmedSeriesID, "Banner")
	if err != nil || !exists {
		return ""
	}

	return buildAnimeBannerProxyURL(trimmedSeriesID)
}

func (h *AnimeHandler) jellyfinImageExists(ctx context.Context, seriesID string, imageType string) (bool, error) {
	apiPath := fmt.Sprintf("/Items/%s/Images/%s", url.PathEscape(strings.TrimSpace(seriesID)), imageType)

	query := url.Values{}
	query.Set("maxWidth", "64")
	query.Set("quality", "35")

	statusCode, err := h.fetchJellyfinStatus(ctx, apiPath, query)
	if statusCode == http.StatusNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return statusCode >= 200 && statusCode < 300, nil
}

func (h *AnimeHandler) jellyfinBackdropExists(ctx context.Context, seriesID string, index *int) (bool, error) {
	apiPath := fmt.Sprintf("/Items/%s/Images/Backdrop", url.PathEscape(strings.TrimSpace(seriesID)))
	if index != nil {
		apiPath = fmt.Sprintf("%s/%d", apiPath, *index)
	}

	query := url.Values{}
	query.Set("maxWidth", "64")
	query.Set("quality", "35")

	statusCode, err := h.fetchJellyfinStatus(ctx, apiPath, query)
	if statusCode == http.StatusNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return statusCode >= 200 && statusCode < 300, nil
}
