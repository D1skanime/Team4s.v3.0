package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const maxAnimeBackdropCandidates = 12

type animeJellyfinSeriesListResponse struct {
	Items []animeJellyfinSeriesItem `json:"Items"`
}

type animeJellyfinSeriesItem struct {
	ID   string `json:"Id"`
	Name string `json:"Name"`
}

type animeJellyfinThemeVideosResponse struct {
	Items []animeJellyfinThemeVideoItem `json:"Items"`
}

type animeJellyfinThemeVideoItem struct {
	ID string `json:"Id"`
}

func (h *AnimeHandler) ListBackdrops(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	result := models.AnimeBackdropManifest{
		AnimeID:     animeID,
		Provider:    "jellyfin",
		Backdrops:   []string{},
		ThemeVideos: []string{},
	}

	lookup, err := h.repo.GetMediaLookupByID(c.Request.Context(), animeID, false)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		c.JSON(http.StatusOK, gin.H{
			"data": result,
		})
		return
	}

	seriesID := jellyfinSeriesIDFromSource(lookup.Source)
	if seriesID == "" {
		resolvedID, resolveErr := h.resolveJellyfinSeriesID(c.Request.Context(), lookup)
		if resolveErr == nil {
			seriesID = resolvedID
		}
	}

	if strings.TrimSpace(seriesID) == "" {
		c.JSON(http.StatusOK, gin.H{
			"data": result,
		})
		return
	}

	result.MediaItemID = strings.TrimSpace(seriesID)
	result.ThemeVideos = h.probeJellyfinThemeVideoProxyURLs(c.Request.Context(), result.MediaItemID)
	result.Backdrops = h.probeJellyfinBackdropProxyURLs(c.Request.Context(), result.MediaItemID)
	if len(result.Backdrops) == 0 {
		result.Backdrops = buildAnimeBackdropProxyURLs(result.MediaItemID, 1)
	}
	result.LogoURL = h.probeJellyfinLogoProxyURL(c.Request.Context(), result.MediaItemID)
	result.BannerURL = h.probeJellyfinBannerProxyURL(c.Request.Context(), result.MediaItemID)

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *AnimeHandler) resolveJellyfinSeriesID(ctx context.Context, lookup *models.AnimeMediaLookup) (string, error) {
	terms := uniqueAnimeBackdropTerms(lookup)
	if len(terms) == 0 {
		return "", nil
	}

	fallbackID := ""
	for _, term := range terms {
		items, err := h.searchJellyfinSeries(ctx, term, 10)
		if err != nil {
			return "", err
		}
		if len(items) == 0 {
			continue
		}

		exactMatches := findExactAnimeJellyfinSeriesMatches(items, term)
		if len(exactMatches) == 1 {
			return strings.TrimSpace(exactMatches[0].ID), nil
		}

		if fallbackID == "" && len(items) == 1 {
			fallbackID = strings.TrimSpace(items[0].ID)
		}
		if fallbackID == "" && len(exactMatches) > 0 {
			fallbackID = strings.TrimSpace(exactMatches[0].ID)
		}
		if fallbackID == "" {
			fallbackID = strings.TrimSpace(items[0].ID)
		}
	}

	return fallbackID, nil
}

func uniqueAnimeBackdropTerms(lookup *models.AnimeMediaLookup) []string {
	if lookup == nil {
		return nil
	}

	baseTerms := uniqueLookupTitles(lookup.Title, lookup.TitleDE, lookup.TitleEN)
	folderTerm := folderLookupTerm(lookup.FolderName)
	if folderTerm == "" {
		return baseTerms
	}

	seen := make(map[string]struct{}, len(baseTerms)+1)
	for _, term := range baseTerms {
		seen[strings.ToLower(term)] = struct{}{}
	}
	if _, exists := seen[strings.ToLower(folderTerm)]; exists {
		return baseTerms
	}

	return append(baseTerms, folderTerm)
}

func folderLookupTerm(raw *string) string {
	if raw == nil {
		return ""
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return ""
	}

	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	normalized = strings.Trim(normalized, "/")
	if normalized == "" {
		return ""
	}

	segments := strings.Split(normalized, "/")
	last := strings.TrimSpace(segments[len(segments)-1])
	if last == "" {
		return ""
	}

	return last
}

func findExactAnimeJellyfinSeriesMatches(items []animeJellyfinSeriesItem, title string) []animeJellyfinSeriesItem {
	normalizedTitle := normalizeJellyfinLookup(title)
	if normalizedTitle == "" {
		return []animeJellyfinSeriesItem{}
	}

	matches := make([]animeJellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		if normalizeJellyfinLookup(item.Name) != normalizedTitle {
			continue
		}
		matches = append(matches, item)
	}

	return matches
}

func (h *AnimeHandler) searchJellyfinSeries(
	ctx context.Context,
	title string,
	limit int,
) ([]animeJellyfinSeriesItem, error) {
	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("SearchTerm", strings.TrimSpace(title))
	values.Set("Limit", strconv.Itoa(limit))

	var payload animeJellyfinSeriesListResponse
	if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
		return nil, err
	}

	items := make([]animeJellyfinSeriesItem, 0, len(payload.Items))
	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) == "" {
			continue
		}
		items = append(items, item)
	}

	return items, nil
}

func (h *AnimeHandler) probeJellyfinBackdropProxyURLs(
	ctx context.Context,
	seriesID string,
) []string {
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

func (h *AnimeHandler) probeJellyfinThemeVideoProxyURLs(
	ctx context.Context,
	seriesID string,
) []string {
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

func (h *AnimeHandler) probeJellyfinLogoProxyURL(
	ctx context.Context,
	seriesID string,
) string {
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

func (h *AnimeHandler) probeJellyfinBannerProxyURL(
	ctx context.Context,
	seriesID string,
) string {
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

func (h *AnimeHandler) fetchJellyfinJSON(
	ctx context.Context,
	apiPath string,
	query url.Values,
	target any,
) (int, error) {
	targetURL, err := h.buildJellyfinURL(apiPath, query)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return 0, fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return resp.StatusCode, fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, fmt.Errorf("read jellyfin response: %w", err)
	}
	if err := json.Unmarshal(body, target); err != nil {
		return resp.StatusCode, fmt.Errorf("decode jellyfin response: %w", err)
	}

	return resp.StatusCode, nil
}

func (h *AnimeHandler) fetchJellyfinStatus(
	ctx context.Context,
	apiPath string,
	query url.Values,
) (int, error) {
	targetURL, err := h.buildJellyfinURL(apiPath, query)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return 0, fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return resp.StatusCode, fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}
	return resp.StatusCode, nil
}

func (h *AnimeHandler) buildJellyfinURL(apiPath string, query url.Values) (string, error) {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" {
		return "", errors.New("jellyfin base url missing")
	}
	apiKey := strings.TrimSpace(h.jellyfinAPIKey)
	if apiKey == "" {
		return "", errors.New("jellyfin api key missing")
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse jellyfin base url: %w", err)
	}

	resolvedPath := strings.TrimPrefix(apiPath, "/")
	if strings.HasSuffix(parsedBase.Path, "/") {
		parsedBase.Path = strings.TrimSuffix(parsedBase.Path, "/")
	}
	parsedBase.Path = parsedBase.Path + "/" + resolvedPath

	values := url.Values{}
	for key, entries := range query {
		for _, value := range entries {
			values.Add(key, value)
		}
	}
	values.Set("api_key", apiKey)
	parsedBase.RawQuery = values.Encode()

	return parsedBase.String(), nil
}
