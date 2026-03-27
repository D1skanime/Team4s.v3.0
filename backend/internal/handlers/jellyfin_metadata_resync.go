package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type adminAnimeJellyfinMetadataRequest struct {
	JellyfinSeriesID *string `json:"jellyfin_series_id"`
}

type adminAnimeJellyfinMetadataApplyRequest struct {
	JellyfinSeriesID *string `json:"jellyfin_series_id"`
	ApplyCover       *bool   `json:"apply_cover"`
	ApplyBanner      *bool   `json:"apply_banner"`
	ApplyBackgrounds *bool   `json:"apply_backgrounds"`
}

func validateAdminAnimeJellyfinMetadataSeriesID(raw *string) (string, string) {
	seriesID := strings.TrimSpace(derefString(raw))
	if seriesID == "" {
		return "", ""
	}
	if len([]rune(seriesID)) > 120 {
		return "", "jellyfin_series_id ist zu lang"
	}
	return seriesID, ""
}

func (h *AdminContentHandler) GetAnimeJellyfinContext(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_context: load anime failed (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	contextPayload, statusCode, loadErr := h.buildAnimeJellyfinContext(c.Request.Context(), animeSource, "")
	if loadErr != nil {
		message, code, details := classifyJellyfinUpstreamError(loadErr, "jellyfin kontext konnte nicht geladen werden")
		writeJellyfinErrorResponse(c, statusCode, message, code, details)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": contextPayload})
}

func (h *AdminContentHandler) PreviewAnimeMetadataFromJellyfin(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if !h.ensureJellyfinConfigured(c) {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeJellyfinMetadataRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	explicitSeriesID, validationMessage := validateAdminAnimeJellyfinMetadataSeriesID(req.JellyfinSeriesID)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_metadata_preview: load anime failed (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	preview, statusCode, previewErr := h.buildAnimeJellyfinMetadataPreview(c.Request.Context(), animeSource, explicitSeriesID)
	if previewErr != nil {
		if statusCode == http.StatusBadRequest {
			badRequest(c, previewErr.Error())
			return
		}
		message, code, details := classifyJellyfinUpstreamError(previewErr, "jellyfin metadaten-vorschau konnte nicht geladen werden")
		writeJellyfinErrorResponse(c, statusCode, message, code, details)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": preview})
}

func (h *AdminContentHandler) ApplyAnimeMetadataFromJellyfin(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if !h.ensureJellyfinConfigured(c) {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeJellyfinMetadataApplyRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	explicitSeriesID, validationMessage := validateAdminAnimeJellyfinMetadataSeriesID(req.JellyfinSeriesID)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	animeSource, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_metadata_apply: load anime failed (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	preview, statusCode, previewErr := h.buildAnimeJellyfinMetadataPreview(c.Request.Context(), animeSource, explicitSeriesID)
	if previewErr != nil {
		if statusCode == http.StatusBadRequest {
			badRequest(c, previewErr.Error())
			return
		}
		message, code, details := classifyJellyfinUpstreamError(previewErr, "jellyfin metadaten konnten nicht vorbereitet werden")
		writeJellyfinErrorResponse(c, statusCode, message, code, details)
		return
	}

	applyCover := req.ApplyCover != nil && *req.ApplyCover
	applyBanner := req.ApplyBanner != nil && *req.ApplyBanner
	applyBackgrounds := req.ApplyBackgrounds != nil && *req.ApplyBackgrounds
	if applyCover && !preview.Cover.CanApply {
		badRequest(c, "jellyfin cover ist fuer diesen anime nicht verfuegbar")
		return
	}

	if err := h.repo.ApplyJellyfinSyncMetadata(
		c.Request.Context(),
		animeID,
		"jellyfin:"+preview.JellyfinSeriesID,
		preview.JellyfinSeriesPath,
		int16FromStringPtr(fieldIncomingValue(preview.Diff, "year")),
		fieldIncomingValue(preview.Diff, "description"),
		nil,
		explicitSeriesID != "",
	); err != nil {
		log.Printf("admin_content jellyfin_metadata_apply: apply metadata failed (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "anime metadaten konnten nicht aktualisiert werden"}})
		return
	}

	coverResult := preview.Cover
	if h.animeAssetRepo != nil && applyCover {
		if err := h.animeAssetRepo.ApplyProviderCover(
			c.Request.Context(),
			animeID,
			providerBannerInput(preview.AssetSlots.Cover),
		); err != nil {
			log.Printf("admin_content jellyfin_metadata_apply: apply cover failed (anime_id=%d): %v", animeID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "cover konnte nicht aktualisiert werden"}})
			return
		}
		if persistedAssets, err := h.animeAssetRepo.GetResolvedAssets(c.Request.Context(), animeID); err == nil && persistedAssets != nil && persistedAssets.Cover != nil {
			coverResult.CurrentImage = stringPtrFromValue(persistedAssets.Cover.URL)
			coverResult.CurrentSource = string(persistedAssets.Cover.Ownership)
			coverResult.WillApplyByDefault = persistedAssets.Cover.Ownership == models.AnimeAssetOwnershipProvider
		} else if preview.Cover.IncomingImage != nil {
			coverResult.CurrentImage = preview.Cover.IncomingImage
			coverResult.CurrentSource = "provider"
			coverResult.WillApplyByDefault = true
		}
	}

	if h.animeAssetRepo != nil && applyBanner {
		if err := h.animeAssetRepo.ApplyProviderBanner(
			c.Request.Context(),
			animeID,
			providerBannerInput(preview.AssetSlots.Banner),
		); err != nil {
			log.Printf("admin_content jellyfin_metadata_apply: apply banner failed (anime_id=%d): %v", animeID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "banner konnte nicht aktualisiert werden"}})
			return
		}
	}

	if h.animeAssetRepo != nil && applyBackgrounds {
		if err := h.animeAssetRepo.ApplyProviderBackgrounds(
			c.Request.Context(),
			animeID,
			providerBackgroundInputs(preview.AssetSlots.Backgrounds),
		); err != nil {
			log.Printf("admin_content jellyfin_metadata_apply: apply backgrounds failed (anime_id=%d): %v", animeID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "backgrounds konnten nicht aktualisiert werden"}})
			return
		}
	}

	appliedFields := make([]models.AdminAnimeJellyfinMetadataFieldPreview, 0, len(preview.Diff))
	for _, field := range preview.Diff {
		if field.Apply {
			appliedFields = append(appliedFields, field)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": models.AdminAnimeJellyfinMetadataApplyResult{
			AnimeID:            animeID,
			JellyfinSeriesID:   preview.JellyfinSeriesID,
			JellyfinSeriesName: preview.JellyfinSeriesName,
			AppliedFields:      appliedFields,
			Cover:              coverResult,
		},
	})
}

func (h *AdminContentHandler) buildAnimeJellyfinContext(
	ctx context.Context,
	animeSource *models.AdminAnimeSyncSource,
	explicitSeriesID string,
) (models.AdminAnimeJellyfinProvenanceContext, int, error) {
	seriesID := strings.TrimSpace(explicitSeriesID)
	if seriesID == "" {
		seriesID = jellyfinSeriesIDFromSource(animeSource.Source)
	}

	result := models.AdminAnimeJellyfinProvenanceContext{
		AnimeID:    animeSource.ID,
		Linked:     seriesID != "",
		Source:     animeSource.Source,
		FolderName: animeSource.FolderName,
		PersistedAssets: models.AdminAnimePersistedAssets{
			Backgrounds: []models.AdminAnimePersistedBackgroundState{},
		},
		Cover: models.AdminAnimeJellyfinCoverPreview{
			CurrentImage:       animeSource.CoverImage,
			CurrentSource:      inferJellyfinCoverSource(animeSource.CoverImage, nil),
			IncomingAvailable:  false,
			CanApply:           false,
			WillApplyByDefault: false,
		},
	}

	if h.animeAssetRepo != nil {
		if persistedAssets, err := h.animeAssetRepo.GetResolvedAssets(ctx, animeSource.ID); err == nil {
			result.PersistedAssets = mapPersistedAnimeAssets(persistedAssets)
			if persistedAssets != nil && persistedAssets.Cover != nil {
				result.Cover.CurrentImage = stringPtrFromValue(persistedAssets.Cover.URL)
				result.Cover.CurrentSource = string(persistedAssets.Cover.Ownership)
			}
		}
	}

	if seriesID == "" {
		result.SourceKind = "manual"
		return result, http.StatusOK, nil
	}
	result.SourceKind = "jellyfin"
	result.JellyfinSeriesID = stringPtrFromValue(seriesID)

	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return result, http.StatusOK, nil
	}

	detail, err := h.getJellyfinSeriesIntakeDetail(ctx, seriesID)
	if err != nil {
		return result, http.StatusBadGateway, err
	}
	if detail == nil {
		return result, http.StatusOK, nil
	}

	themeVideoIDs, err := h.listJellyfinThemeVideoIDs(ctx, seriesID)
	if err != nil {
		themeVideoIDs = nil
	}

	preview := buildAdminJellyfinIntakePreviewResult(*detail, themeVideoIDs)
	result.JellyfinSeriesName = stringPtrFromValue(strings.TrimSpace(detail.Name))
	result.JellyfinSeriesPath = normalizeNullableStringPtr(detail.Path)
	result.AssetSlots = &preview.AssetSlots
	result.Cover = buildJellyfinCoverPreview(animeSource.CoverImage, preview.AssetSlots.Cover)
	return result, http.StatusOK, nil
}

func (h *AdminContentHandler) buildAnimeJellyfinMetadataPreview(
	ctx context.Context,
	animeSource *models.AdminAnimeSyncSource,
	explicitSeriesID string,
) (models.AdminAnimeJellyfinMetadataPreviewResult, int, error) {
	seriesTitles := uniqueLookupTitles(animeSource.Title, animeSource.TitleDE, animeSource.TitleEN)
	resolvedSeriesID := strings.TrimSpace(explicitSeriesID)
	if resolvedSeriesID == "" {
		resolvedSeriesID = jellyfinSeriesIDFromSource(animeSource.Source)
	}
	if resolvedSeriesID == "" && len(seriesTitles) == 0 {
		return models.AdminAnimeJellyfinMetadataPreviewResult{}, http.StatusBadRequest, errors.New("kein jellyfin-link fuer diesen anime vorhanden")
	}

	series, statusCode, resolveErr := h.resolveJellyfinSeries(ctx, seriesTitles, resolvedSeriesID)
	if resolveErr != nil {
		return models.AdminAnimeJellyfinMetadataPreviewResult{}, statusCode, resolveErr
	}

	detail, err := h.getJellyfinSeriesIntakeDetail(ctx, strings.TrimSpace(series.ID))
	if err != nil {
		return models.AdminAnimeJellyfinMetadataPreviewResult{}, http.StatusBadGateway, err
	}
	if detail == nil {
		return models.AdminAnimeJellyfinMetadataPreviewResult{}, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
	}

	themeVideoIDs, err := h.listJellyfinThemeVideoIDs(ctx, strings.TrimSpace(series.ID))
	if err != nil {
		themeVideoIDs = nil
	}

	intakePreview := buildAdminJellyfinIntakePreviewResult(*detail, themeVideoIDs)
	diff := []models.AdminAnimeJellyfinMetadataFieldPreview{
		buildMetadataFieldPreview("source", "Quelle", animeSource.Source, stringPtrFromValue("jellyfin:"+strings.TrimSpace(series.ID))),
		buildMetadataFieldPreview("folder_name", "Ordner", animeSource.FolderName, normalizeNullableStringPtr(detail.Path)),
		buildMetadataFieldPreview("year", "Jahr", int16ToStringPtr(animeSource.Year), int16ToStringPtr(intakePreview.Year)),
		buildMetadataFieldPreview("description", "Beschreibung", animeSource.Description, intakePreview.Description),
	}

	return models.AdminAnimeJellyfinMetadataPreviewResult{
		AnimeID:            animeSource.ID,
		Linked:             true,
		JellyfinSeriesID:   strings.TrimSpace(series.ID),
		JellyfinSeriesName: strings.TrimSpace(series.Name),
		JellyfinSeriesPath: normalizeNullableStringPtr(detail.Path),
		Diff:               diff,
		Cover:              buildJellyfinCoverPreview(animeSource.CoverImage, intakePreview.AssetSlots.Cover),
		AssetSlots:         intakePreview.AssetSlots,
	}, http.StatusOK, nil
}

func buildMetadataFieldPreview(field string, label string, current *string, incoming *string) models.AdminAnimeJellyfinMetadataFieldPreview {
	result := models.AdminAnimeJellyfinMetadataFieldPreview{
		Field:         field,
		Label:         label,
		CurrentValue:  normalizeNullableStringPtr(derefString(current)),
		IncomingValue: normalizeNullableStringPtr(derefString(incoming)),
		Action:        "keep",
		Apply:         false,
	}

	currentValue := strings.TrimSpace(derefString(current))
	incomingValue := strings.TrimSpace(derefString(incoming))

	switch {
	case incomingValue == "":
		result.Action = "keep"
		result.Reason = stringPtrFromValue("Keine Jellyfin-Daten verfuegbar")
	case currentValue == "":
		result.Action = "fill"
		result.Apply = true
	case currentValue == incomingValue:
		result.Action = "keep"
		result.Reason = stringPtrFromValue("Bereits synchron")
	default:
		result.Action = "protect"
		result.Reason = stringPtrFromValue("Vorhandener Wert bleibt geschuetzt")
	}

	return result
}

func buildJellyfinCoverPreview(currentImage *string, incoming models.AdminJellyfinIntakeAssetSlot) models.AdminAnimeJellyfinCoverPreview {
	incomingURL := normalizeNullableStringPtr(derefString(incoming.URL))
	currentSource := inferJellyfinCoverSource(currentImage, incomingURL)
	canApply := incoming.Present && incomingURL != nil
	reason := (*string)(nil)
	if !canApply {
		reason = stringPtrFromValue("Kein Jellyfin-Cover verfuegbar")
	}

	return models.AdminAnimeJellyfinCoverPreview{
		CurrentImage:       currentImage,
		CurrentSource:      currentSource,
		IncomingImage:      incomingURL,
		IncomingAvailable:  canApply,
		CanApply:           canApply,
		WillApplyByDefault: false,
		Reason:             reason,
	}
}

func inferJellyfinCoverSource(currentImage *string, incomingImage *string) string {
	currentValue := strings.TrimSpace(derefString(currentImage))
	incomingValue := strings.TrimSpace(derefString(incomingImage))
	switch {
	case currentValue == "":
		return "none"
	case incomingValue != "" && currentValue == incomingValue:
		return "provider"
	default:
		return "manual"
	}
}

func fieldIncomingValue(fields []models.AdminAnimeJellyfinMetadataFieldPreview, name string) *string {
	for _, field := range fields {
		if field.Field == name {
			return field.IncomingValue
		}
	}
	return nil
}

func int16ToStringPtr(value *int16) *string {
	if value == nil {
		return nil
	}
	return stringPtrFromValue(strconv.FormatInt(int64(*value), 10))
}

func int16FromStringPtr(value *string) *int16 {
	trimmed := strings.TrimSpace(derefString(value))
	if trimmed == "" {
		return nil
	}
	parsed, err := strconv.ParseInt(trimmed, 10, 16)
	if err != nil {
		return nil
	}
	next := int16(parsed)
	return &next
}

func stringPtrFromValue(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func mapPersistedAnimeAssets(value *models.AnimeResolvedAssets) models.AdminAnimePersistedAssets {
	result := models.AdminAnimePersistedAssets{
		Backgrounds: []models.AdminAnimePersistedBackgroundState{},
	}
	if value == nil {
		return result
	}

	if value.Cover != nil {
		result.Cover = &models.AdminAnimePersistedAssetState{
			MediaID:   value.Cover.MediaID,
			URL:       value.Cover.URL,
			Ownership: string(value.Cover.Ownership),
		}
	}

	if value.Banner != nil {
		result.Banner = &models.AdminAnimePersistedAssetState{
			MediaID:   value.Banner.MediaID,
			URL:       value.Banner.URL,
			Ownership: string(value.Banner.Ownership),
		}
	}

	for _, item := range value.Backgrounds {
		result.Backgrounds = append(result.Backgrounds, models.AdminAnimePersistedBackgroundState{
			ID:        item.ID,
			MediaID:   item.MediaID,
			URL:       item.URL,
			Ownership: string(item.Ownership),
			SortOrder: item.SortOrder,
		})
	}

	return result
}

func providerBannerInput(slot models.AdminJellyfinIntakeAssetSlot) *models.AnimeProviderAssetInput {
	if !slot.Present || slot.URL == nil {
		return nil
	}
	trimmedURL := strings.TrimSpace(derefString(slot.URL))
	if trimmedURL == "" {
		return nil
	}
	return &models.AnimeProviderAssetInput{
		URL:         trimmedURL,
		ProviderKey: buildProviderAssetKey(slot),
	}
}

func providerBackgroundInputs(slots []models.AdminJellyfinIntakeAssetSlot) []models.AnimeProviderAssetInput {
	result := make([]models.AnimeProviderAssetInput, 0, len(slots))
	for _, slot := range slots {
		item := providerBannerInput(slot)
		if item == nil {
			continue
		}
		result = append(result, *item)
	}
	return result
}

func buildProviderAssetKey(slot models.AdminJellyfinIntakeAssetSlot) string {
	base := strings.TrimSpace(slot.Kind)
	if base == "" {
		base = "asset"
	}
	if slot.Index != nil {
		return base + ":" + strconv.Itoa(*slot.Index)
	}
	if slot.URL != nil {
		return base + ":" + strings.TrimSpace(derefString(slot.URL))
	}
	return base
}
