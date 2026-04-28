package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

const segmentSourceTypeReleaseAsset = "release_asset"

// validateSegmentTimes validates start_time and end_time for a segment save.
// Rules:
//   - start_time >= end_time is always rejected
//   - if runtime (durationSeconds) is known, end_time beyond runtime is rejected
//
// Returns a non-empty validation message if the times are invalid, or "" if valid.
func validateSegmentTimes(startTime, endTime *string, durationSeconds *int32) string {
	if startTime == nil && endTime == nil {
		return ""
	}

	start := parseClockToSeconds(startTime)
	end := parseClockToSeconds(endTime)

	if start != nil && end != nil {
		if *start >= *end {
			return "start_time muss vor end_time liegen"
		}
	}

	if end != nil && durationSeconds != nil && *durationSeconds > 0 {
		if *end > *durationSeconds {
			return "end_time ueberschreitet die bekannte Laufzeit der Release-Variante"
		}
	}

	return ""
}

// parseClockToSeconds converts an HH:MM:SS or MM:SS clock string to total seconds.
// Returns nil if the input is nil, empty, or unparseable.
func parseClockToSeconds(raw *string) *int32 {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	parts := strings.Split(trimmed, ":")
	if len(parts) == 0 || len(parts) > 3 {
		return nil
	}
	total := 0
	multiplier := 1
	for i := len(parts) - 1; i >= 0; i-- {
		v, err := strconv.Atoi(strings.TrimSpace(parts[i]))
		if err != nil || v < 0 {
			return nil
		}
		total += v * multiplier
		multiplier *= 60
	}
	s := int32(total)
	return &s
}

func cleanupSegmentAssetRef(ctx context.Context, themeRepo adminThemeRepository, mediaRepo *repository.MediaRepository, mediaStorageDir string, ref string) {
	trimmedRef := strings.TrimSpace(filepath.ToSlash(ref))
	if trimmedRef == "" {
		return
	}

	if themeRepo != nil {
		if reusable, err := themeRepo.IsReusableSegmentAsset(ctx, trimmedRef); err == nil && reusable {
			return
		}
	}

	absPath := filepath.Join(mediaStorageDir, filepath.FromSlash(trimmedRef))
	_ = os.Remove(absPath)

	if mediaRepo == nil {
		return
	}

	if asset, err := mediaRepo.GetMediaAssetByFilename(ctx, trimmedRef); err == nil {
		_ = mediaRepo.DeleteMediaAsset(ctx, asset.ID)
		return
	}
	if asset, err := mediaRepo.GetMediaAssetByFilename(ctx, absPath); err == nil {
		_ = mediaRepo.DeleteMediaAsset(ctx, asset.ID)
	}
}

type adminAnimeSegmentCreateRequest struct {
	ThemeID              int64   `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              string  `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
	SourceType           *string `json:"source_type"`
	SourceRef            *string `json:"source_ref"`
	SourceLabel          *string `json:"source_label"`
}

type adminAnimeSegmentPatchRequest struct {
	ThemeID              *int64  `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              *string `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
	SourceType           *string `json:"source_type"`
	SourceRef            *string `json:"source_ref"`
	SourceLabel          *string `json:"source_label"`
}

type adminSegmentLibraryAttachRequest struct {
	AssetID int64 `json:"asset_id"`
}

// ListAnimeSegments verarbeitet GET /api/v1/admin/anime/:id/segments
// Query-Parameter: group_id (optional, int64), version (optional, string).
func (h *AdminContentHandler) ListAnimeSegments(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	var groupID int64
	if raw := c.Query("group_id"); raw != "" {
		groupID, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || groupID <= 0 {
			badRequest(c, "ungueltige group_id")
			return
		}
	}

	version := c.Query("version")

	items, err := h.themeRepo.ListAnimeSegments(c.Request.Context(), animeID, groupID, version)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segments list: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segmente konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeSegment verarbeitet POST /api/v1/admin/anime/:id/segments
// Body: { theme_id, fansub_group_id?, version, start_episode?, end_episode?,
//
//	start_time?, end_time?, source_jellyfin_item_id? }
func (h *AdminContentHandler) CreateAnimeSegment(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminAnimeSegmentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.ThemeID <= 0 {
		badRequest(c, "theme_id ist erforderlich")
		return
	}

	version := req.Version
	if version == "" {
		version = "v1"
	}

	// Runtime-aware validation: look up duration_seconds for the current release variant context.
	var releaseDuration *int32
	if req.FansubGroupID != nil && *req.FansubGroupID > 0 {
		dur, durErr := h.themeRepo.GetSegmentReleaseDuration(c.Request.Context(), animeID, *req.FansubGroupID, version)
		if durErr != nil {
			log.Printf("admin anime segment create: lookup release duration anime=%d group=%d: %v", animeID, *req.FansubGroupID, durErr)
			// Non-fatal: continue without duration validation
		} else {
			releaseDuration = dur
		}
	}
	if msg := validateSegmentTimes(req.StartTime, req.EndTime, releaseDuration); msg != "" {
		badRequest(c, msg)
		return
	}

	created, err := h.themeRepo.CreateAnimeSegment(c.Request.Context(), animeID, models.AdminThemeSegmentCreateInput{
		ThemeID:              req.ThemeID,
		FansubGroupID:        req.FansubGroupID,
		Version:              version,
		StartEpisode:         req.StartEpisode,
		EndEpisode:           req.EndEpisode,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		SourceJellyfinItemID: req.SourceJellyfinItemID,
		SourceType:           req.SourceType,
		SourceRef:            req.SourceRef,
		SourceLabel:          req.SourceLabel,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder theme nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungueltige gruppe oder constraint verletzt", "code": "invalid_theme_or_group"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment create: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// UpdateAnimeSegment verarbeitet PATCH /api/v1/admin/anime/:id/segments/:segmentId
// Body: alle Felder optional (partieller Patch).
func (h *AdminContentHandler) UpdateAnimeSegment(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	existingSegment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}

	var req adminAnimeSegmentPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.SourceType != nil && *req.SourceType != segmentSourceTypeReleaseAsset {
		empty := ""
		req.SourceRef = &empty
		req.SourceLabel = &empty
	}

	// Resolve effective start_time/end_time for validation: prefer patch values, fall back to existing.
	effectiveStart := req.StartTime
	if effectiveStart == nil {
		effectiveStart = existingSegment.StartTime
	}
	effectiveEnd := req.EndTime
	if effectiveEnd == nil {
		effectiveEnd = existingSegment.EndTime
	}

	// Runtime-aware validation using the existing segment's playback duration (from the current variant).
	// PlaybackDuration is already hydrated from theme_segment_playback_sources / release_variants.
	var releaseDuration *int32
	// Prefer the live variant duration lookup when we have the segment's group/version context.
	effectiveGroupID := existingSegment.FansubGroupID
	if req.FansubGroupID != nil {
		effectiveGroupID = req.FansubGroupID
	}
	effectiveVersion := existingSegment.Version
	if req.Version != nil {
		effectiveVersion = *req.Version
	}
	if effectiveGroupID != nil && *effectiveGroupID > 0 {
		dur, durErr := h.themeRepo.GetSegmentReleaseDuration(c.Request.Context(), animeID, *effectiveGroupID, effectiveVersion)
		if durErr != nil {
			log.Printf("admin anime segment update: lookup release duration anime=%d group=%d: %v", animeID, *effectiveGroupID, durErr)
		} else {
			releaseDuration = dur
		}
	}
	if releaseDuration == nil {
		releaseDuration = existingSegment.PlaybackDuration
	}
	if msg := validateSegmentTimes(effectiveStart, effectiveEnd, releaseDuration); msg != "" {
		badRequest(c, msg)
		return
	}

	err = h.themeRepo.UpdateAnimeSegment(c.Request.Context(), segmentID, models.AdminThemeSegmentPatchInput{
		ThemeID:              req.ThemeID,
		FansubGroupID:        req.FansubGroupID,
		Version:              req.Version,
		StartEpisode:         req.StartEpisode,
		EndEpisode:           req.EndEpisode,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		SourceJellyfinItemID: req.SourceJellyfinItemID,
		SourceType:           req.SourceType,
		SourceRef:            req.SourceRef,
		SourceLabel:          req.SourceLabel,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "constraint verletzt", "code": "constraint_violation"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment update: segment_id=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht aktualisiert werden.")
		return
	}

	updatedSegment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisiertes Segment konnte nicht geladen werden.")
		return
	}

	if existingSegment.SourceType != nil &&
		*existingSegment.SourceType == segmentSourceTypeReleaseAsset &&
		existingSegment.SourceRef != nil &&
		strings.TrimSpace(*existingSegment.SourceRef) != "" {
		oldRef := strings.TrimSpace(*existingSegment.SourceRef)
		newType := ""
		if updatedSegment.SourceType != nil {
			newType = strings.TrimSpace(*updatedSegment.SourceType)
		}
		newRef := ""
		if updatedSegment.SourceRef != nil {
			newRef = strings.TrimSpace(*updatedSegment.SourceRef)
		}
		if newType != segmentSourceTypeReleaseAsset || newRef == "" || newRef != oldRef {
			cleanupSegmentAssetRef(c.Request.Context(), h.themeRepo, h.mediaRepo, h.mediaStorageDir, oldRef)
		}
	}

	// Return the fully hydrated segment so the frontend immediately receives updated playback_* fields.
	c.JSON(http.StatusOK, gin.H{"data": updatedSegment})
}

// DeleteAnimeSegment verarbeitet DELETE /api/v1/admin/anime/:id/segments/:segmentId.
func (h *AdminContentHandler) DeleteAnimeSegment(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	err = h.themeRepo.DeleteAnimeSegment(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment delete: segment_id=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geloescht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}

// ListSegmentLibraryCandidates verarbeitet
// GET /api/v1/admin/anime/:id/segments/library-candidates?group_id=...&kind=...&name=...
func (h *AdminContentHandler) ListSegmentLibraryCandidates(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	groupID, err := strconv.ParseInt(strings.TrimSpace(c.Query("group_id")), 10, 64)
	if err != nil || groupID <= 0 {
		badRequest(c, "ungueltige group_id")
		return
	}

	kind := strings.TrimSpace(c.Query("kind"))
	if kind == "" {
		badRequest(c, "kind ist erforderlich")
		return
	}

	items, err := h.themeRepo.ListSegmentLibraryCandidates(
		c.Request.Context(),
		animeID,
		groupID,
		kind,
		strings.TrimSpace(c.Query("name")),
	)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("segment library candidates: anime=%d group=%d: %v", animeID, groupID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Library-Kandidaten konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// AttachSegmentLibraryAsset verarbeitet
// POST /api/v1/admin/anime/:id/segments/:segmentId/reuse
func (h *AdminContentHandler) AttachSegmentLibraryAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}
	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	var req adminSegmentLibraryAttachRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.AssetID <= 0 {
		badRequest(c, "ungueltiger request body")
		return
	}

	updated, err := h.themeRepo.AttachSegmentLibraryAsset(c.Request.Context(), animeID, segmentID, models.SegmentLibraryAttachInput{
		AssetID: req.AssetID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment oder library-asset nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "library-asset passt nicht zu Anime oder Gruppe", "code": "segment_library_conflict"}})
		return
	}
	if err != nil {
		log.Printf("segment library attach: anime=%d segment=%d asset=%d: %v", animeID, segmentID, req.AssetID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Library-Asset konnte nicht verknuepft werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// UploadSegmentAsset verarbeitet POST /api/v1/admin/anime/:id/segments/:segmentId/asset.
// Speichert eine Videodatei als Segment-Asset und aktualisiert die Segment-Source-Felder.
// Bestehende Assets werden vor dem Speichern des neuen Assets aufgeraeumt.
func (h *AdminContentHandler) UploadSegmentAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil || h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment asset service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}
	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	// Segment laden fuer Kontext (groupID, version, theme_type_name)
	seg, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}

	var groupID int64
	if seg.FansubGroupID != nil {
		groupID = *seg.FansubGroupID
	}
	stableProvider, stableExternalID, err := h.themeRepo.GetStableSegmentAnimeSource(c.Request.Context(), animeID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Quellkontext konnte nicht geladen werden.")
		return
	}

	saveResult, err := h.mediaService.SaveSegmentAsset(services.SegmentAssetContext{
		AnimeID:          animeID,
		StableProvider:   stableProvider,
		StableExternalID: stableExternalID,
		GroupID:          groupID,
		Version:          seg.Version,
		SegmentTypeName:  seg.ThemeTypeName,
	}, fileHeader.Filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Asset konnte nicht gespeichert werden.")
		return
	}

	asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Asset konnte nicht gespeichert werden.")
		return
	}

	relPath := saveResult.CreateInput.Filename
	sourceLabel := fileHeader.Filename
	updated, patchErr := h.themeRepo.BindUploadedSegmentAsset(
		c.Request.Context(),
		animeID,
		segmentID,
		asset.ID,
		relPath,
		&sourceLabel,
	)
	if patchErr != nil {
		log.Printf("segment asset bind failed: anime=%d segment=%d ref=%s: %v", animeID, segmentID, relPath, patchErr)
		cleanupSegmentAssetRef(c.Request.Context(), h.themeRepo, h.mediaRepo, h.mediaStorageDir, relPath)
		writeInternalErrorResponse(c, "interner serverfehler", patchErr, "Segment-Quelle konnte nicht aktualisiert werden.")
		return
	}

	if seg.SourceType != nil &&
		*seg.SourceType == segmentSourceTypeReleaseAsset &&
		seg.SourceRef != nil &&
		strings.TrimSpace(*seg.SourceRef) != "" &&
		strings.TrimSpace(*seg.SourceRef) != relPath {
		cleanupSegmentAssetRef(c.Request.Context(), h.themeRepo, h.mediaRepo, h.mediaStorageDir, *seg.SourceRef)
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// DeleteSegmentAsset verarbeitet DELETE /api/v1/admin/anime/:id/segments/:segmentId/asset.
// Leert die Source-Felder des Segments, loescht die Datei und den media_assets-Eintrag.
func (h *AdminContentHandler) DeleteSegmentAsset(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil || h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment asset service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}
	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	// Source leeren und vorherigen Pfad lesen
	previousRef, err := h.themeRepo.ClearSegmentAsset(c.Request.Context(), animeID, segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Asset konnte nicht geloescht werden.")
		return
	}

	if previousRef != nil && *previousRef != "" {
		cleanupSegmentAssetRef(c.Request.Context(), h.themeRepo, h.mediaRepo, h.mediaStorageDir, *previousRef)
	}

	c.Status(http.StatusNoContent)
}
