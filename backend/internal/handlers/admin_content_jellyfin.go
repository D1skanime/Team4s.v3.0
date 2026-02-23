package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type adminAnimeJellyfinSyncRequest struct {
	JellyfinSeriesID        *string `json:"jellyfin_series_id"`
	SeasonNumber            *int32  `json:"season_number"`
	EpisodeStatus           *string `json:"episode_status"`
	OverwriteEpisodeTitle   *bool   `json:"overwrite_episode_titles"`
	OverwriteVersionTitle   *bool   `json:"overwrite_version_titles"`
	CleanupProviderVersions *bool   `json:"cleanup_provider_versions"`
}

type adminAnimeJellyfinSyncInput struct {
	JellyfinSeriesID        string
	SeasonNumber            int32
	EpisodeStatus           string
	OverwriteEpisodeTitle   bool
	OverwriteVersionTitle   bool
	CleanupProviderVersions bool
}

type jellyfinSeriesListResponse struct {
	Items []jellyfinSeriesItem `json:"Items"`
}

type jellyfinSeriesItem struct {
	ID             string `json:"Id"`
	Name           string `json:"Name"`
	ProductionYear *int   `json:"ProductionYear"`
	Overview       string `json:"Overview"`
	Path           string `json:"Path"`
}

type jellyfinEpisodeListResponse struct {
	Items []jellyfinEpisodeItem `json:"Items"`
}

type jellyfinEpisodeItem struct {
	ID                string                `json:"Id"`
	Name              string                `json:"Name"`
	IndexNumber       *int                  `json:"IndexNumber"`
	ParentIndexNumber *int                  `json:"ParentIndexNumber"`
	PremiereDate      *string               `json:"PremiereDate"`
	MediaStreams      []jellyfinMediaStream `json:"MediaStreams"`
}

type jellyfinMediaStream struct {
	Type   string `json:"Type"`
	Height *int   `json:"Height"`
}

func (h *AdminContentHandler) SearchJellyfinSeries(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	if !h.ensureJellyfinConfigured(c) {
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "q ist erforderlich")
		return
	}
	if len([]rune(query)) > 120 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	limit := 25
	limitRaw := strings.TrimSpace(c.Query("limit"))
	if limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungueltiger limit parameter")
			return
		}
		limit = value
	}
	if limit > 100 {
		limit = 100
	}

	items, err := h.searchJellyfinSeries(c.Request.Context(), query, limit)
	if err != nil {
		log.Printf("admin_content jellyfin_series_search: search failed (user_id=%d, q=%q): %v", identity.UserID, query, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "jellyfin serien konnten nicht gesucht werden",
			},
		})
		return
	}

	result := make([]models.AdminJellyfinSeriesSearchItem, 0, len(items))
	for _, item := range items {
		seriesID := strings.TrimSpace(item.ID)
		if seriesID == "" {
			continue
		}
		result = append(result, models.AdminJellyfinSeriesSearchItem{
			JellyfinSeriesID: seriesID,
			Name:             strings.TrimSpace(item.Name),
			ProductionYear:   item.ProductionYear,
			Path:             normalizeNullableStringPtr(item.Path),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *AdminContentHandler) PreviewAnimeFromJellyfin(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	if !h.ensureJellyfinConfigured(c) {
		return
	}

	var req adminAnimeJellyfinSyncRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("admin_content jellyfin_preview: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input, validationMessage := validateAdminAnimeJellyfinSyncRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_preview: load anime failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	seriesTitles := uniqueLookupTitles(animeSource.Title, animeSource.TitleDE, animeSource.TitleEN)
	resolvedSeriesID := strings.TrimSpace(input.JellyfinSeriesID)
	if resolvedSeriesID == "" {
		resolvedSeriesID = jellyfinSeriesIDFromSource(animeSource.Source)
	}

	series, statusCode, resolveErr := h.resolveJellyfinSeries(c.Request.Context(), seriesTitles, resolvedSeriesID)
	if resolveErr != nil {
		log.Printf(
			"admin_content jellyfin_preview: resolve series failed (user_id=%d, anime_id=%d, series_id=%q): %v",
			identity.UserID,
			animeID,
			input.JellyfinSeriesID,
			resolveErr,
		)
		c.JSON(statusCode, gin.H{
			"error": gin.H{
				"message": resolveErr.Error(),
			},
		})
		return
	}

	episodes, listErr := h.listJellyfinEpisodes(c.Request.Context(), series.ID)
	if listErr != nil {
		log.Printf(
			"admin_content jellyfin_preview: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
			identity.UserID,
			animeID,
			series.ID,
			listErr,
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "jellyfin episoden konnten nicht geladen werden",
			},
		})
		return
	}

	sort.Slice(episodes, func(i, j int) bool {
		leftSeason := jellyfinSeasonNumber(episodes[i].ParentIndexNumber)
		rightSeason := jellyfinSeasonNumber(episodes[j].ParentIndexNumber)
		if leftSeason != rightSeason {
			return leftSeason < rightSeason
		}
		leftEpisode := jellyfinEpisodeNumber(episodes[i].IndexNumber)
		rightEpisode := jellyfinEpisodeNumber(episodes[j].IndexNumber)
		if leftEpisode != rightEpisode {
			return leftEpisode < rightEpisode
		}
		return strings.TrimSpace(episodes[i].ID) < strings.TrimSpace(episodes[j].ID)
	})

	// Count existing Jellyfin versions for this anime
	var existingJellyfinVersions int32
	if h.episodeVersionRepo != nil {
		count, countErr := h.episodeVersionRepo.CountByAnimeAndProvider(c.Request.Context(), animeID, "jellyfin")
		if countErr != nil {
			log.Printf("admin_content jellyfin_preview: count existing versions failed (anime_id=%d): %v", animeID, countErr)
			// Non-fatal: continue with 0
		} else {
			existingJellyfinVersions = int32(count)
		}
	}

	// Count episodes that would become orphaned if all jellyfin versions are deleted
	var existingEpisodes int32
	{
		episodeCount, countErr := h.repo.CountEpisodesWithOnlyProvider(c.Request.Context(), animeID, "jellyfin")
		if countErr != nil {
			log.Printf("admin_content jellyfin_preview: count episodes with only jellyfin failed (anime_id=%d): %v", animeID, countErr)
			// Non-fatal: continue with 0
		} else {
			existingEpisodes = int32(episodeCount)
		}
	}

	result := models.AdminAnimeJellyfinPreviewResult{
		AnimeID:                  animeID,
		JellyfinSeriesID:         strings.TrimSpace(series.ID),
		JellyfinSeriesName:       strings.TrimSpace(series.Name),
		JellyfinSeriesPath:       normalizeNullableStringPtr(series.Path),
		SeasonNumber:             input.SeasonNumber,
		ExistingJellyfinVersions: existingJellyfinVersions,
		ExistingEpisodes:         existingEpisodes,
		AppliedEpisodeStatus:     input.EpisodeStatus,
		OverwriteEpisodeTitle:    false,
		OverwriteVersionTitle:    false,
		Episodes:                 make([]models.AdminAnimeJellyfinPreviewEpisode, 0, 64),
	}

	for _, item := range episodes {
		if jellyfinSeasonNumber(item.ParentIndexNumber) != input.SeasonNumber {
			continue
		}

		result.ScannedEpisodes++
		episodeNumber := jellyfinEpisodeNumber(item.IndexNumber)
		mediaItemID := strings.TrimSpace(item.ID)
		if episodeNumber <= 0 || mediaItemID == "" {
			result.SkippedEpisodes++
			continue
		}

		result.MatchedEpisodes++
		result.Episodes = append(result.Episodes, models.AdminAnimeJellyfinPreviewEpisode{
			JellyfinItemID: mediaItemID,
			EpisodeNumber:  episodeNumber,
			Title:          normalizeNullableStringPtr(item.Name),
			PremiereDate:   parseJellyfinPremiereDate(item.PremiereDate),
			VideoQuality:   jellyfinVideoQuality(item.MediaStreams),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *AdminContentHandler) SyncAnimeFromJellyfin(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	if !h.ensureJellyfinConfigured(c) {
		return
	}
	if h.episodeVersionRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	var req adminAnimeJellyfinSyncRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("admin_content jellyfin_sync: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input, validationMessage := validateAdminAnimeJellyfinSyncRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_sync: load anime failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	seriesTitles := uniqueLookupTitles(animeSource.Title, animeSource.TitleDE, animeSource.TitleEN)
	resolvedSeriesID := strings.TrimSpace(input.JellyfinSeriesID)
	if resolvedSeriesID == "" {
		resolvedSeriesID = jellyfinSeriesIDFromSource(animeSource.Source)
	}

	series, statusCode, resolveErr := h.resolveJellyfinSeries(c.Request.Context(), seriesTitles, resolvedSeriesID)
	if resolveErr != nil {
		log.Printf(
			"admin_content jellyfin_sync: resolve series failed (user_id=%d, anime_id=%d, series_id=%q): %v",
			identity.UserID,
			animeID,
			input.JellyfinSeriesID,
			resolveErr,
		)
		c.JSON(statusCode, gin.H{
			"error": gin.H{
				"message": resolveErr.Error(),
			},
		})
		return
	}

	episodes, listErr := h.listJellyfinEpisodes(c.Request.Context(), series.ID)
	if listErr != nil {
		log.Printf(
			"admin_content jellyfin_sync: list episodes failed (user_id=%d, anime_id=%d, series_id=%s): %v",
			identity.UserID,
			animeID,
			series.ID,
			listErr,
		)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "jellyfin episoden konnten nicht geladen werden",
			},
		})
		return
	}

	sort.Slice(episodes, func(i, j int) bool {
		leftSeason := jellyfinSeasonNumber(episodes[i].ParentIndexNumber)
		rightSeason := jellyfinSeasonNumber(episodes[j].ParentIndexNumber)
		if leftSeason != rightSeason {
			return leftSeason < rightSeason
		}
		leftEpisode := jellyfinEpisodeNumber(episodes[i].IndexNumber)
		rightEpisode := jellyfinEpisodeNumber(episodes[j].IndexNumber)
		if leftEpisode != rightEpisode {
			return leftEpisode < rightEpisode
		}
		return strings.TrimSpace(episodes[i].ID) < strings.TrimSpace(episodes[j].ID)
	})

	result := models.AdminAnimeJellyfinSyncResult{
		AnimeID:               animeID,
		JellyfinSeriesID:      series.ID,
		JellyfinSeriesName:    series.Name,
		SeasonNumber:          input.SeasonNumber,
		AppliedEpisodeStatus:  input.EpisodeStatus,
		OverwriteEpisodeTitle: false,
		OverwriteVersionTitle: false,
	}

	// Delete existing Jellyfin versions if cleanup is requested
	if input.CleanupProviderVersions {
		deletedCount, deleteErr := h.episodeVersionRepo.DeleteByAnimeAndProvider(c.Request.Context(), animeID, "jellyfin")
		if deleteErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: delete existing versions failed (user_id=%d, anime_id=%d): %v",
				identity.UserID,
				animeID,
				deleteErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "bestehende versionen konnten nicht geloescht werden",
				},
			})
			return
		}
		result.DeletedVersions = int32(deletedCount)
		log.Printf(
			"admin_content jellyfin_sync: deleted %d existing jellyfin versions (user_id=%d, anime_id=%d)",
			deletedCount,
			identity.UserID,
			animeID,
		)
	}

	episodeNumberSet := make(map[int32]struct{}, 64)
	for _, item := range episodes {
		if jellyfinSeasonNumber(item.ParentIndexNumber) != input.SeasonNumber {
			continue
		}

		result.ScannedEpisodes++
		episodeNumber := jellyfinEpisodeNumber(item.IndexNumber)
		if episodeNumber <= 0 {
			result.SkippedEpisodes++
			continue
		}

		mediaItemID := strings.TrimSpace(item.ID)
		if mediaItemID == "" {
			result.SkippedEpisodes++
			continue
		}

		episodeTitle := normalizeNullableStringPtr(item.Name)
		episodeNumberText := strconv.Itoa(int(episodeNumber))
		_, episodeCreated, upsertEpisodeErr := h.repo.UpsertEpisodeByAnimeAndNumber(
			c.Request.Context(),
			animeID,
			episodeNumberText,
			episodeTitle,
			input.EpisodeStatus,
			false,
		)
		if upsertEpisodeErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: upsert episode failed (anime_id=%d, episode=%d, item_id=%s): %v",
				animeID,
				episodeNumber,
				mediaItemID,
				upsertEpisodeErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "episoden import fehlgeschlagen",
				},
			})
			return
		}
		if episodeCreated {
			result.ImportedEpisodes++
		} else {
			result.UpdatedEpisodes++
		}
		episodeNumberSet[episodeNumber] = struct{}{}

		releaseDate := parseJellyfinPremiereDate(item.PremiereDate)
		videoQuality := jellyfinVideoQuality(item.MediaStreams)
		_, versionCreated, upsertVersionErr := h.episodeVersionRepo.UpsertByMediaSource(
			c.Request.Context(),
			models.EpisodeVersionCreateInput{
				AnimeID:       animeID,
				EpisodeNumber: episodeNumber,
				Title:         episodeTitle,
				FansubGroupID: nil,
				MediaProvider: "jellyfin",
				MediaItemID:   mediaItemID,
				VideoQuality:  videoQuality,
				SubtitleType:  nil,
				ReleaseDate:   releaseDate,
				StreamURL:     nil,
			},
			false,
		)
		if upsertVersionErr != nil {
			log.Printf(
				"admin_content jellyfin_sync: upsert version failed (anime_id=%d, episode=%d, item_id=%s): %v",
				animeID,
				episodeNumber,
				mediaItemID,
				upsertVersionErr,
			)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "versionen import fehlgeschlagen",
				},
			})
			return
		}
		if versionCreated {
			result.ImportedVersions++
		} else {
			result.UpdatedVersions++
		}
	}

	maxEpisodes := int16FromCount(len(episodeNumberSet))
	forceSourceUpdate := strings.TrimSpace(input.JellyfinSeriesID) != ""
	if applyErr := h.repo.ApplyJellyfinSyncMetadata(
		c.Request.Context(),
		animeID,
		fmt.Sprintf("jellyfin:%s", series.ID),
		int16FromInt(series.ProductionYear),
		normalizeNullableStringPtr(series.Overview),
		maxEpisodes,
		forceSourceUpdate,
	); applyErr != nil {
		log.Printf("admin_content jellyfin_sync: apply metadata failed (anime_id=%d): %v", animeID, applyErr)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "anime metadaten konnten nicht aktualisiert werden",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func validateAdminAnimeJellyfinSyncRequest(req adminAnimeJellyfinSyncRequest) (adminAnimeJellyfinSyncInput, string) {
	input := adminAnimeJellyfinSyncInput{
		SeasonNumber:  1,
		EpisodeStatus: "private",
	}

	if req.JellyfinSeriesID != nil {
		input.JellyfinSeriesID = strings.TrimSpace(*req.JellyfinSeriesID)
		if len(input.JellyfinSeriesID) > 120 {
			return adminAnimeJellyfinSyncInput{}, "jellyfin_series_id ist zu lang"
		}
	}

	if req.SeasonNumber != nil {
		if *req.SeasonNumber <= 0 {
			return adminAnimeJellyfinSyncInput{}, "ungueltiger season_number parameter"
		}
		input.SeasonNumber = *req.SeasonNumber
	}

	if req.EpisodeStatus != nil {
		status := strings.TrimSpace(*req.EpisodeStatus)
		if _, ok := allowedEpisodeStatuses[status]; !ok {
			return adminAnimeJellyfinSyncInput{}, "ungueltiger episode_status parameter"
		}
		input.EpisodeStatus = status
	}

	if req.OverwriteEpisodeTitle != nil {
		input.OverwriteEpisodeTitle = *req.OverwriteEpisodeTitle
	}
	if req.OverwriteVersionTitle != nil {
		input.OverwriteVersionTitle = *req.OverwriteVersionTitle
	}
	if req.CleanupProviderVersions != nil {
		input.CleanupProviderVersions = *req.CleanupProviderVersions
	}

	return input, ""
}

func (h *AdminContentHandler) ensureJellyfinConfigured(c *gin.Context) bool {
	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "jellyfin ist nicht konfiguriert",
			},
		})
		return false
	}
	return true
}

func (h *AdminContentHandler) resolveJellyfinSeries(
	ctx context.Context,
	animeTitles []string,
	requestedSeriesID string,
) (*jellyfinSeriesItem, int, error) {
	if strings.TrimSpace(requestedSeriesID) != "" {
		item, err := h.getJellyfinSeriesByID(ctx, strings.TrimSpace(requestedSeriesID))
		if err != nil {
			return nil, http.StatusBadGateway, errors.New("jellyfin serie konnte nicht geladen werden")
		}
		if item == nil {
			return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
		}
		return item, http.StatusOK, nil
	}

	candidateByID := make(map[string]jellyfinSeriesItem, 8)

	for _, title := range animeTitles {
		items, err := h.searchJellyfinSeries(ctx, title, 10)
		if err != nil {
			return nil, http.StatusBadGateway, errors.New("jellyfin serien konnten nicht gesucht werden")
		}
		if len(items) == 0 {
			continue
		}

		exactMatches := findExactJellyfinSeriesMatches(items, title)
		if len(exactMatches) == 1 {
			return &exactMatches[0], http.StatusOK, nil
		}
		if len(exactMatches) > 0 {
			for _, item := range exactMatches {
				candidateByID[item.ID] = item
			}
			continue
		}

		if len(items) == 1 {
			return &items[0], http.StatusOK, nil
		}
		for _, item := range items {
			candidateByID[item.ID] = item
		}
	}

	if len(candidateByID) == 0 {
		return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
	}
	if len(candidateByID) > 1 {
		return nil, http.StatusConflict, errors.New("mehrere jellyfin serien gefunden, bitte jellyfin_series_id angeben")
	}

	for _, item := range candidateByID {
		return &item, http.StatusOK, nil
	}

	return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
}

func uniqueLookupTitles(primary string, titleDE *string, titleEN *string) []string {
	values := []string{primary}
	if titleDE != nil {
		values = append(values, *titleDE)
	}
	if titleEN != nil {
		values = append(values, *titleEN)
	}

	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, raw := range values {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}

	return result
}

func jellyfinSeriesIDFromSource(source *string) string {
	if source == nil {
		return ""
	}

	trimmed := strings.TrimSpace(*source)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	if !strings.HasPrefix(lower, "jellyfin:") {
		return ""
	}

	return strings.TrimSpace(trimmed[len("jellyfin:"):])
}

func findExactJellyfinSeriesMatches(items []jellyfinSeriesItem, title string) []jellyfinSeriesItem {
	normalizedTitle := normalizeJellyfinLookup(title)
	if normalizedTitle == "" {
		return []jellyfinSeriesItem{}
	}

	matches := make([]jellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		if normalizeJellyfinLookup(item.Name) != normalizedTitle {
			continue
		}
		matches = append(matches, item)
	}

	return matches
}

func normalizeJellyfinLookup(value string) string {
	raw := strings.ToLower(strings.TrimSpace(value))
	if raw == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(raw))
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		}
	}

	return builder.String()
}

func (h *AdminContentHandler) searchJellyfinSeries(
	ctx context.Context,
	title string,
	limit int,
) ([]jellyfinSeriesItem, error) {
	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("SearchTerm", strings.TrimSpace(title))
	values.Set("Limit", strconv.Itoa(limit))
	values.Set("Fields", "Path,ProductionYear,Overview")

	var payload jellyfinSeriesListResponse
	if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
		return nil, err
	}

	items := make([]jellyfinSeriesItem, 0, len(payload.Items))
	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) == "" {
			continue
		}
		items = append(items, item)
	}

	return items, nil
}

func (h *AdminContentHandler) getJellyfinSeriesByID(
	ctx context.Context,
	seriesID string,
) (*jellyfinSeriesItem, error) {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return nil, nil
	}

	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("Ids", trimmedSeriesID)
	values.Set("Limit", "1")
	values.Set("Fields", "Path,ProductionYear,Overview")

	var payload jellyfinSeriesListResponse
	statusCode, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload)
	if statusCode == http.StatusNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(payload.Items) == 0 {
		return nil, nil
	}

	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) == trimmedSeriesID {
			return &item, nil
		}
	}

	return &payload.Items[0], nil
}

func (h *AdminContentHandler) listJellyfinEpisodes(
	ctx context.Context,
	seriesID string,
) ([]jellyfinEpisodeItem, error) {
	values := url.Values{}
	values.Set("Fields", "MediaStreams")
	values.Set("EnableUserData", "false")

	var payload jellyfinEpisodeListResponse
	if _, err := h.fetchJellyfinJSON(ctx, fmt.Sprintf("/Shows/%s/Episodes", url.PathEscape(seriesID)), values, &payload); err != nil {
		return nil, err
	}

	return payload.Items, nil
}

func (h *AdminContentHandler) fetchJellyfinJSON(
	ctx context.Context,
	apiPath string,
	query url.Values,
	target any,
) (int, error) {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin base url missing")
	}
	apiKey := strings.TrimSpace(h.jellyfinAPIKey)
	if apiKey == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin api key missing")
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return 0, fmt.Errorf("parse jellyfin base url: %w", err)
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

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedBase.String(), nil)
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

func jellyfinSeasonNumber(value *int) int32 {
	if value == nil || *value <= 0 {
		return 1
	}
	return int32(*value)
}

func jellyfinEpisodeNumber(value *int) int32 {
	if value == nil || *value <= 0 {
		return 0
	}
	return int32(*value)
}

func parseJellyfinPremiereDate(raw *string) *time.Time {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}

	parsed, err := time.Parse(time.RFC3339Nano, trimmed)
	if err != nil {
		return nil
	}
	return &parsed
}

func jellyfinVideoQuality(streams []jellyfinMediaStream) *string {
	maxHeight := 0
	for _, stream := range streams {
		if !strings.EqualFold(strings.TrimSpace(stream.Type), "Video") {
			continue
		}
		if stream.Height == nil || *stream.Height <= 0 {
			continue
		}
		if *stream.Height > maxHeight {
			maxHeight = *stream.Height
		}
	}

	if maxHeight == 0 {
		return nil
	}
	label := ""
	switch {
	case maxHeight >= 2000:
		label = "2160p"
	case maxHeight >= 1400:
		label = "1440p"
	case maxHeight >= 1000:
		label = "1080p"
	case maxHeight >= 700:
		label = "720p"
	case maxHeight >= 540:
		label = "576p"
	default:
		label = "480p"
	}

	return &label
}

func normalizeNullableStringPtr(raw string) *string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func int16FromCount(count int) *int16 {
	if count <= 0 || count > 32767 {
		return nil
	}
	value := int16(count)
	return &value
}

func int16FromInt(raw *int) *int16 {
	if raw == nil || *raw <= 0 || *raw > 32767 {
		return nil
	}
	value := int16(*raw)
	return &value
}
