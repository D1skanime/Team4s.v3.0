package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

func segmentRenderInputsChanged(before *models.AdminThemeSegment, after *models.AdminThemeSegment) bool {
	if before == nil || after == nil {
		return false
	}
	return stringPtrValue(before.StartTime) != stringPtrValue(after.StartTime) ||
		stringPtrValue(before.EndTime) != stringPtrValue(after.EndTime) ||
		stringPtrValue(before.PlaybackSourceKind) != stringPtrValue(after.PlaybackSourceKind) ||
		int64PtrValue(before.PlaybackSourceID) != int64PtrValue(after.PlaybackSourceID) ||
		int64PtrValue(before.PlaybackVariantID) != int64PtrValue(after.PlaybackVariantID) ||
		int64PtrValue(before.PlaybackMediaAssetID) != int64PtrValue(after.PlaybackMediaAssetID) ||
		stringPtrValue(before.PlaybackJellyfinID) != stringPtrValue(after.PlaybackJellyfinID) ||
		int32PtrValue(before.PlaybackStartSeconds) != int32PtrValue(after.PlaybackStartSeconds) ||
		int32PtrValue(before.PlaybackEndSeconds) != int32PtrValue(after.PlaybackEndSeconds)
}

// resetAndQueueSegmentRenderAfterChange invalidiert den Render-Cache fuer EINE
// release_version_id nach einer Basis-Zeit-Aenderung. releaseVersionID=0 (heutiger
// Aufrufer in admin_content_anime_theme_segments.go) trifft dabei bewusst noch keine
// Zuweisung -- der Fan-Out ueber ALLE zugewiesenen Release-Versionen eines geteilten
// Segments (D-03) ist Aufgabe von Plan 117-04, nicht dieses Plans.
func (h *AdminContentHandler) resetAndQueueSegmentRenderAfterChange(ctx context.Context, segmentID int64, releaseVersionID int64) error {
	themeRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		return fmt.Errorf("segment render refresh: theme repo does not implement segment stream repository")
	}

	caches, err := themeRepo.ListThemeSegmentRenderCaches(ctx, segmentID, releaseVersionID)
	if err != nil {
		return err
	}
	if err := h.removeSegmentRenderCacheFiles(caches); err != nil {
		return err
	}
	if _, err := themeRepo.DeleteThemeSegmentRenderCaches(ctx, segmentID, releaseVersionID); err != nil {
		return err
	}

	if !h.segmentRenderEnabled || strings.TrimSpace(h.segmentRenderDir) == "" {
		return nil
	}

	source, err := themeRepo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionID)
	if errorsIsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if source.SourceKind == "uploaded_asset" {
		return nil
	}

	cache, prepareErr := h.buildQueuedSegmentRenderCache(ctx, themeRepo, segmentID, source)
	if prepareErr != nil {
		if prepareErr.status >= http.StatusInternalServerError {
			return prepareErr.err
		}
		log.Printf("segment render refresh: neuer render nicht eingereiht (segment_id=%d, code=%s)", segmentID, prepareErr.code)
		return nil
	}
	log.Printf("segment render refresh: alter cache geloescht, neuer render eingereiht (segment_id=%d, cache_key=%s)", segmentID, cache.CacheKey)
	h.notifySegmentRenderQueued()
	return nil
}

func (h *AdminContentHandler) removeSegmentRenderCacheFiles(caches []models.ThemeSegmentRenderCache) error {
	if strings.TrimSpace(h.segmentRenderDir) == "" {
		for _, cache := range caches {
			if cache.OutputPath != nil && strings.TrimSpace(*cache.OutputPath) != "" {
				return fmt.Errorf("segment render refresh: render dir missing for cache file %q", *cache.OutputPath)
			}
		}
		return nil
	}

	for _, cache := range caches {
		if cache.OutputPath == nil || strings.TrimSpace(*cache.OutputPath) == "" {
			continue
		}
		path, ok := resolveControlledFilePath(h.segmentRenderDir, *cache.OutputPath)
		if !ok {
			return fmt.Errorf("segment render refresh: invalid cache path %q", *cache.OutputPath)
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("segment render refresh: remove cache file %q: %w", *cache.OutputPath, err)
		}
	}
	return nil
}

func (h *AdminContentHandler) buildQueuedSegmentRenderCache(
	ctx context.Context,
	themeRepo segmentStreamThemeRepository,
	segmentID int64,
	source *models.ThemeSegmentRenderSource,
) (*models.ThemeSegmentRenderCache, *segmentRenderPrepareError) {
	if source.StartOffsetSeconds == nil || source.EndOffsetSeconds == nil {
		return nil, &segmentRenderPrepareError{status: http.StatusConflict, message: "segment hat kein vollständiges Zeitfenster", code: "segment_window_missing"}
	}
	if err := services.ValidateDerivedSegmentWindow(*source.StartOffsetSeconds, *source.EndOffsetSeconds, h.segmentRenderMaxSeconds); err != nil {
		return nil, &segmentRenderPrepareError{status: http.StatusConflict, message: "segment-zeitfenster ist ungültig", code: "segment_window_invalid", err: err}
	}
	if source.StreamURL == nil || strings.TrimSpace(*source.StreamURL) == "" {
		return nil, &segmentRenderPrepareError{status: http.StatusConflict, message: "segment hat keine stream-quelle", code: "segment_source_missing"}
	}

	sourceIdentity := strings.TrimSpace(derefString(source.StreamExternalID))
	if sourceIdentity == "" {
		sourceIdentity = strings.TrimSpace(*source.StreamURL)
	}
	cacheKey, err := services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{
		SegmentID:      segmentID,
		SourceKind:     source.SourceKind,
		SourceIdentity: sourceIdentity,
		StartSeconds:   *source.StartOffsetSeconds,
		EndSeconds:     *source.EndOffsetSeconds,
		RenderProfile:  services.DefaultSegmentRenderProfile,
	})
	if err != nil {
		return nil, &segmentRenderPrepareError{status: http.StatusInternalServerError, message: "interner serverfehler", err: err}
	}

	sourceFingerprint := services.SanitizeSegmentRenderLog(sourceIdentity, h.segmentGrantSecret)
	cache, err := themeRepo.UpsertThemeSegmentRenderCacheQueued(ctx, models.ThemeSegmentRenderCacheUpsertInput{
		ThemeSegmentID:    segmentID,
		PlaybackSourceID:  &source.PlaybackSourceID,
		ReleaseVersionID:  source.ReleaseVersionID,
		CacheKey:          cacheKey,
		SourceKind:        source.SourceKind,
		SourceFingerprint: sourceFingerprint,
		RenderProfile:     services.DefaultSegmentRenderProfile,
	})
	if err != nil {
		return nil, &segmentRenderPrepareError{status: http.StatusInternalServerError, message: "interner serverfehler", err: err}
	}
	return cache, nil
}

func errorsIsNotFound(err error) bool {
	return errors.Is(err, repository.ErrNotFound)
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func int64PtrValue(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func int32PtrValue(value *int32) int32 {
	if value == nil {
		return 0
	}
	return *value
}
