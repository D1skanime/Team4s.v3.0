package handlers

import (
	"bytes"
	"context"
	"errors"
	"log"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type segmentStreamThemeRepository interface {
	GetThemeSegmentRenderSource(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderSource, error)
	GetThemeSegmentRenderCacheByKey(ctx context.Context, cacheKey string) (*models.ThemeSegmentRenderCache, error)
	GetReadyThemeSegmentRenderCache(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderCache, error)
	GetLatestThemeSegmentRenderCache(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderCache, error)
	UpsertThemeSegmentRenderCacheQueued(ctx context.Context, input models.ThemeSegmentRenderCacheUpsertInput) (*models.ThemeSegmentRenderCache, error)
	MarkThemeSegmentRenderCacheRendering(ctx context.Context, cacheKey string) error
	MarkThemeSegmentRenderCacheReady(ctx context.Context, input models.ThemeSegmentRenderCacheReadyInput) error
	MarkThemeSegmentRenderCacheFailed(ctx context.Context, cacheKey string, errorCode string, errorMessage string) error
}

func (h *AdminContentHandler) CreateSegmentStreamGrant(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	themeRepo, ok := h.segmentStreamThemeRepo(c)
	if !ok {
		return
	}

	segmentID, err := parsePositiveIDParam(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige segment id")
		return
	}

	source, err := themeRepo.GetThemeSegmentRenderSource(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Quelle konnte nicht geladen werden.")
		return
	}

	if !actor.IsPlatformAdmin {
		if source.ReleaseVariantID == nil || *source.ReleaseVariantID <= 0 {
			writePermissionDenied(c, permissions.Result{Allowed: false, ReasonCode: permissions.ReasonResourceNotFound})
			return
		}
		if h.permissionSvc == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "permission service nicht verfügbar"}})
			return
		}
		result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, *source.ReleaseVariantID)
		if err != nil {
			writePermissionInternalError(c, err, "Segment-Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			auditPermissionDenied(c, h.auditLogRepo, identity, "segment_stream.grant.denied", nil, "theme_segment", &segmentID, permissions.ActionReleaseVersionSegmentsManage, result)
			writePermissionDenied(c, result)
			return
		}
	}

	if h.segmentGrantTTL <= 0 || strings.TrimSpace(h.segmentGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "segmentstream grant vorübergehend nicht verfügbar"}})
		return
	}

	cacheKey := ""
	if cache, err := themeRepo.GetReadyThemeSegmentRenderCache(c.Request.Context(), segmentID); err == nil {
		cacheKey = cache.CacheKey
	} else if err != nil && !errors.Is(err, repository.ErrNotFound) {
		log.Printf("segment stream grant: ready cache lookup failed (segment_id=%d, user_id=%d): %v", segmentID, identity.UserID, err)
	}

	grantToken, expiresAt, err := auth.CreateSegmentStreamGrant(segmentID, identity.UserID, cacheKey, h.segmentGrantSecret, time.Now(), h.segmentGrantTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"theme_segment_id": segmentID,
			"grant_token":      grantToken,
			"expires_at":       expiresAt,
			"ttl_seconds":      int64(h.segmentGrantTTL / time.Second),
			"issued_for":       identity.UserID,
		},
	})
}

func (h *AdminContentHandler) RenderSegment(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	themeRepo, ok := h.segmentStreamThemeRepo(c)
	if !ok {
		return
	}

	segmentID, err := parsePositiveIDParam(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige segment id")
		return
	}
	if !h.segmentRenderEnabled || strings.TrimSpace(h.segmentRenderDir) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "segment-rendering ist nicht verfügbar"}})
		return
	}

	source, err := themeRepo.GetThemeSegmentRenderSource(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Quelle konnte nicht geladen werden.")
		return
	}

	if !actor.IsPlatformAdmin {
		if source.ReleaseVariantID == nil || *source.ReleaseVariantID <= 0 {
			writePermissionDenied(c, permissions.Result{Allowed: false, ReasonCode: permissions.ReasonResourceNotFound})
			return
		}
		if h.permissionSvc == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "permission service nicht verfügbar"}})
			return
		}
		result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, *source.ReleaseVariantID)
		if err != nil {
			writePermissionInternalError(c, err, "Segment-Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			auditPermissionDenied(c, h.auditLogRepo, identity, "segment_stream.render.denied", nil, "theme_segment", &segmentID, permissions.ActionReleaseVersionSegmentsManage, result)
			writePermissionDenied(c, result)
			return
		}
	}

	if source.SourceKind == "uploaded_asset" {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "hochgeladene Segment-Dateien müssen nicht vorbereitet werden", "code": "segment_render_not_required"}})
		return
	}
	if source.StartOffsetSeconds == nil || source.EndOffsetSeconds == nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment hat kein vollständiges Zeitfenster", "code": "segment_window_missing"}})
		return
	}
	if err := services.ValidateDerivedSegmentWindow(*source.StartOffsetSeconds, *source.EndOffsetSeconds, h.segmentRenderMaxSeconds); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment-zeitfenster ist ungültig", "code": "segment_window_invalid"}})
		return
	}
	if source.StreamURL == nil || strings.TrimSpace(*source.StreamURL) == "" {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment hat keine stream-quelle", "code": "segment_source_missing"}})
		return
	}

	sourceIdentity := strings.TrimSpace(derefString(source.StreamExternalID))
	if sourceIdentity == "" {
		sourceIdentity = strings.TrimSpace(*source.StreamURL)
	}
	sourceFingerprint := services.SanitizeSegmentRenderLog(sourceIdentity, h.segmentGrantSecret)
	cacheKey, err := services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{
		SegmentID:      segmentID,
		SourceKind:     source.SourceKind,
		SourceIdentity: sourceIdentity,
		StartSeconds:   *source.StartOffsetSeconds,
		EndSeconds:     *source.EndOffsetSeconds,
		RenderProfile:  services.DefaultSegmentRenderProfile,
	})
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Render-Key konnte nicht erstellt werden.")
		return
	}

	cache, err := themeRepo.UpsertThemeSegmentRenderCacheQueued(c.Request.Context(), models.ThemeSegmentRenderCacheUpsertInput{
		ThemeSegmentID:    segmentID,
		PlaybackSourceID:  &source.PlaybackSourceID,
		CacheKey:          cacheKey,
		SourceKind:        source.SourceKind,
		SourceFingerprint: sourceFingerprint,
		RenderProfile:     services.DefaultSegmentRenderProfile,
	})
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Render konnte nicht vorbereitet werden.")
		return
	}

	if err := themeRepo.MarkThemeSegmentRenderCacheRendering(c.Request.Context(), cache.CacheKey); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Render konnte nicht gestartet werden.")
		return
	}

	outputRel := cache.CacheKey + ".mp4"
	outputPath, ok := resolveControlledFilePath(h.segmentRenderDir, outputRel)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment-renderpfad ist ungültig"}})
		return
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Renderverzeichnis konnte nicht erstellt werden.")
		return
	}
	_ = os.Remove(outputPath)

	durationSeconds := *source.EndOffsetSeconds - *source.StartOffsetSeconds
	args, err := services.BuildFFmpegSegmentArgs(services.SegmentRenderCommandInput{
		FFmpegPath:      h.segmentRenderFFmpegPath,
		StreamURL:       *source.StreamURL,
		OutputPath:      outputPath,
		StartSeconds:    *source.StartOffsetSeconds,
		DurationSeconds: durationSeconds,
	})
	if err != nil {
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(c.Request.Context(), cache.CacheKey, "invalid_render_command", err.Error())
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment-render konnte nicht erstellt werden", "code": "invalid_render_command"}})
		return
	}

	renderCtx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()
	var combined bytes.Buffer
	cmd := exec.CommandContext(renderCtx, args[0], args[1:]...)
	cmd.Stdout = &combined
	cmd.Stderr = &combined
	if err := cmd.Run(); err != nil {
		message := services.SanitizeSegmentRenderLog(combined.String(), h.segmentGrantSecret)
		if strings.TrimSpace(message) == "" {
			message = err.Error()
		}
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(c.Request.Context(), cache.CacheKey, "ffmpeg_failed", message)
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment-render ist fehlgeschlagen", "code": "ffmpeg_failed"}})
		return
	}

	if err := themeRepo.MarkThemeSegmentRenderCacheReady(c.Request.Context(), models.ThemeSegmentRenderCacheReadyInput{
		CacheKey:        cache.CacheKey,
		OutputPath:      outputRel,
		MimeType:        "video/mp4",
		DurationSeconds: durationSeconds,
		VideoCodec:      "h264",
		AudioCodec:      "aac",
	}); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Renderstatus konnte nicht gespeichert werden.")
		return
	}

	ready, err := themeRepo.GetThemeSegmentRenderCacheByKey(c.Request.Context(), cache.CacheKey)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Renderstatus konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ready})
}

func (h *AdminContentHandler) StreamSegment(c *gin.Context) {
	if rejectsSegmentStreamQuery(c) {
		badRequest(c, "segmentstream akzeptiert keine freien start- oder end-parameter")
		return
	}
	themeRepo, ok := h.segmentStreamThemeRepo(c)
	if !ok {
		return
	}

	segmentID, err := parsePositiveIDParam(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige segment id")
		return
	}
	claims, ok := h.authorizeSegmentStreamGrant(c, segmentID)
	if !ok {
		return
	}

	source, err := themeRepo.GetThemeSegmentRenderSource(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Quelle konnte nicht geladen werden.")
		return
	}

	if source.SourceKind == "uploaded_asset" {
		if source.MediaAssetPath == nil {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment fallback-datei fehlt", "code": "segment_source_missing"}})
			return
		}
		h.serveSegmentFile(c, h.mediaStorageDir, *source.MediaAssetPath, "")
		return
	}

	cache, err := themeRepo.GetReadyThemeSegmentRenderCache(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		latest, latestErr := themeRepo.GetLatestThemeSegmentRenderCache(c.Request.Context(), segmentID)
		if latestErr == nil {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment ist noch nicht bereit", "code": "segment_render_" + string(latest.Status), "status": latest.Status}})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segment ist noch nicht vorbereitet", "code": "segment_render_missing"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Renderstatus konnte nicht geladen werden.")
		return
	}
	if claims.CacheKey != "" && claims.CacheKey != cache.CacheKey {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungültiger segmentstream grant"}})
		return
	}
	if cache.OutputPath == nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "segmentdatei fehlt", "code": "segment_render_file_missing"}})
		return
	}
	h.serveSegmentFile(c, h.segmentRenderDir, *cache.OutputPath, derefString(cache.MimeType))
}

func (h *AdminContentHandler) segmentStreamThemeRepo(c *gin.Context) (segmentStreamThemeRepository, bool) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment service nicht verfügbar"}})
		return nil, false
	}
	repo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segmentstream service nicht verfügbar"}})
		return nil, false
	}
	return repo, true
}

func (h *AdminContentHandler) authorizeSegmentStreamGrant(c *gin.Context, segmentID int64) (auth.SegmentStreamGrantClaims, bool) {
	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return auth.SegmentStreamGrantClaims{}, false
	}
	if strings.TrimSpace(h.segmentGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "segmentstream grant vorübergehend nicht verfügbar"}})
		return auth.SegmentStreamGrantClaims{}, false
	}
	claims, err := auth.ParseAndVerifySegmentStreamGrant(grantToken, h.segmentGrantSecret, time.Now())
	if err != nil || claims.SegmentID != segmentID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungültiger segmentstream grant"}})
		return auth.SegmentStreamGrantClaims{}, false
	}
	return claims, true
}

func (h *AdminContentHandler) serveSegmentFile(c *gin.Context, root string, rawPath string, contentType string) {
	path, ok := resolveControlledFilePath(root, rawPath)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segmentdatei nicht gefunden"}})
		return
	}
	file, err := os.Open(path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segmentdatei nicht gefunden"}})
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || info.IsDir() {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segmentdatei nicht gefunden"}})
		return
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = mime.TypeByExtension(filepath.Ext(path))
	}
	if strings.TrimSpace(contentType) != "" {
		c.Header("Content-Type", contentType)
	}
	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "private, no-store")
	http.ServeContent(c.Writer, c.Request, filepath.Base(path), info.ModTime(), file)
}

func parsePositiveIDParam(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}

func rejectsSegmentStreamQuery(c *gin.Context) bool {
	for _, key := range []string{"start", "end", "duration", "startTimeTicks", "StartTimeTicks", "endTimeTicks", "EndTimeTicks"} {
		if strings.TrimSpace(c.Query(key)) != "" {
			return true
		}
	}
	return false
}

func resolveControlledFilePath(root string, rawPath string) (string, bool) {
	trimmedRoot := strings.TrimSpace(root)
	trimmedPath := strings.TrimSpace(rawPath)
	if trimmedRoot == "" || trimmedPath == "" {
		return "", false
	}
	rootAbs, err := filepath.Abs(trimmedRoot)
	if err != nil {
		return "", false
	}
	candidate := trimmedPath
	if !filepath.IsAbs(candidate) {
		candidate = filepath.Join(rootAbs, filepath.FromSlash(candidate))
	}
	candidateAbs, err := filepath.Abs(candidate)
	if err != nil {
		return "", false
	}
	rel, err := filepath.Rel(rootAbs, candidateAbs)
	if err != nil || rel == "." || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return "", false
	}
	return candidateAbs, true
}
