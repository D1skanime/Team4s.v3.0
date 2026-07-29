package handlers

import (
	"bytes"
	"context"
	"errors"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

// segmentRenderWorkerPollInterval bestimmt, wie oft der Hintergrund-Worker nach neuen
// 'queued'-Eintraegen sucht, wenn die Queue gerade leer ist.
const segmentRenderWorkerPollInterval = 2 * time.Second

// segmentRenderExecutionTimeout begrenzt die Laufzeit eines einzelnen ffmpeg-Renders. Der Timeout
// wird ausschliesslich von context.Background() abgeleitet (NICHT vom urspruenglichen HTTP-Request),
// damit ein Browser-Abbruch den laufenden Render nicht mehr abbricht (fixes B3).
const segmentRenderExecutionTimeout = 10 * time.Minute

// notifySegmentRenderQueued weckt den Worker nicht-blockierend auf, sobald ein neuer Job in die
// Queue geschrieben wurde, um die Poll-Latenz zu reduzieren. Ein voller/fehlender Kanal ist kein
// Fehler -- der Worker findet den Job spaetestens beim naechsten Poll-Tick ohnehin.
func (h *AdminContentHandler) notifySegmentRenderQueued() {
	select {
	case h.segmentRenderWakeup <- struct{}{}:
	default:
	}
}

// StartSegmentRenderWorker startet die einzige Hintergrund-Goroutine, die die Segment-Render-Queue
// mit Nebenlaeufigkeit 1 abarbeitet. Solange ctx nicht abgebrochen ist, beansprucht sie atomar den
// aeltesten 'queued'-Eintrag (ClaimNextQueuedThemeSegmentRender) und rendert ihn. Ist die Queue
// leer, wartet sie auf den naechsten Wakeup-Signal oder den Poll-Timer. Es gibt bewusst nur eine
// Goroutine: das eliminiert jede Moeglichkeit paralleler Renders desselben Cache-Eintrags (B1).
func (h *AdminContentHandler) StartSegmentRenderWorker(ctx context.Context) {
	if h.themeRepo == nil {
		log.Printf("segment render worker: theme repo missing, worker nicht gestartet")
		return
	}
	themeRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		log.Printf("segment render worker: theme repo does not implement segment stream repository (type=%T), worker nicht gestartet", h.themeRepo)
		return
	}

	log.Printf("segment render worker: gestartet (poll_interval=%s)", segmentRenderWorkerPollInterval)
	ticker := time.NewTicker(segmentRenderWorkerPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("segment render worker: beendet (context cancelled)")
			return
		default:
		}

		processed := h.processNextQueuedSegmentRender(ctx, themeRepo)
		if processed {
			// Sofort nach weiterer Arbeit sehen, statt auf den Poll-Tick zu warten.
			continue
		}

		select {
		case <-ctx.Done():
			log.Printf("segment render worker: beendet (context cancelled)")
			return
		case <-h.segmentRenderWakeup:
		case <-ticker.C:
		}
	}
}

// processNextQueuedSegmentRender beansprucht hoechstens einen Job und verarbeitet ihn vollstaendig.
// Rueckgabe true bedeutet: ein Job wurde bearbeitet (egal ob erfolgreich) und die Queue sollte
// sofort erneut geprueft werden, statt auf den naechsten Poll-Tick zu warten.
func (h *AdminContentHandler) processNextQueuedSegmentRender(ctx context.Context, themeRepo segmentStreamThemeRepository) bool {
	cache, err := themeRepo.ClaimNextQueuedThemeSegmentRender(ctx)
	if errors.Is(err, repository.ErrNotFound) {
		return false
	}
	if err != nil {
		log.Printf("segment render worker: claim fehlgeschlagen: %v", err)
		return false
	}

	releaseVersionID := int64(0)
	if cache.ReleaseVersionID != nil {
		releaseVersionID = *cache.ReleaseVersionID
	}
	source, err := themeRepo.GetThemeSegmentRenderSource(ctx, cache.ThemeSegmentID, releaseVersionID)
	if err != nil {
		log.Printf("segment render worker: quelle konnte nicht geladen werden (segment_id=%d, cache_key=%s): %v", cache.ThemeSegmentID, cache.CacheKey, err)
		if markErr := themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "source_lookup_failed", "Segment-Quelle konnte nicht geladen werden."); markErr != nil {
			log.Printf("segment render worker: mark failed fehlgeschlagen (cache_key=%s): %v", cache.CacheKey, markErr)
		}
		return true
	}

	if err := h.executeSegmentRender(ctx, cache, source); err != nil {
		log.Printf("segment render worker: render fehlgeschlagen (segment_id=%d, cache_key=%s): %v", cache.ThemeSegmentID, cache.CacheKey, err)
	}
	return true
}

// executeSegmentRender fuehrt den eigentlichen ffmpeg-Render fuer einen bereits beanspruchten
// ('rendering') Cache-Eintrag aus: Untertitel-Aufloesung, ffmpeg-Aufruf, MarkReady/MarkFailed.
// Der uebergebene ctx MUSS von context.Background() abgeleitet sein (siehe StartSegmentRenderWorker) --
// niemals von einem HTTP-Request-Context, damit ein Client-Disconnect den Render nicht abbricht (B3).
func (h *AdminContentHandler) executeSegmentRender(
	ctx context.Context,
	cache *models.ThemeSegmentRenderCache,
	source *models.ThemeSegmentRenderSource,
) error {
	themeRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		return errors.New("segment render worker: theme repo does not implement segment stream repository")
	}

	if source.StartOffsetSeconds == nil || source.EndOffsetSeconds == nil || source.StreamURL == nil || strings.TrimSpace(*source.StreamURL) == "" {
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "segment_source_missing", "Segment hat keine gueltige Render-Quelle.")
		return errors.New("segment render worker: incomplete render source")
	}

	outputRel := cache.CacheKey + ".mp4"
	outputPath, ok := resolveControlledFilePath(h.segmentRenderDir, outputRel)
	if !ok {
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "invalid_output_path", "Segment-Renderpfad ist ungueltig.")
		return errors.New("segment render worker: invalid output path")
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "render_dir_failed", "Segment-Renderverzeichnis konnte nicht erstellt werden.")
		return err
	}
	_ = os.Remove(outputPath)

	subtitle := h.resolveSegmentSubtitleForRender(ctx, cache.ThemeSegmentID, cache.CacheKey, source)
	if subtitle.SubtitleFilePath != "" {
		defer func(path string) { _ = os.Remove(path) }(subtitle.SubtitleFilePath)
	}

	durationSeconds := *source.EndOffsetSeconds - *source.StartOffsetSeconds
	args, err := services.BuildFFmpegSegmentArgs(services.SegmentRenderCommandInput{
		FFmpegPath:       h.segmentRenderFFmpegPath,
		StreamURL:        *source.StreamURL,
		SubtitleFilePath: subtitle.SubtitleFilePath,
		OutputPath:       outputPath,
		StartSeconds:     *source.StartOffsetSeconds,
		DurationSeconds:  durationSeconds,
	})
	if err != nil {
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "invalid_render_command", err.Error())
		return err
	}

	renderCtx, cancel := context.WithTimeout(ctx, segmentRenderExecutionTimeout)
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
		_ = themeRepo.MarkThemeSegmentRenderCacheFailed(ctx, cache.CacheKey, "ffmpeg_failed", message)
		return err
	}

	if err := themeRepo.MarkThemeSegmentRenderCacheReady(ctx, models.ThemeSegmentRenderCacheReadyInput{
		CacheKey:            cache.CacheKey,
		OutputPath:          outputRel,
		MimeType:            "video/mp4",
		DurationSeconds:     durationSeconds,
		VideoCodec:          "h264",
		AudioCodec:          "aac",
		SubtitleStreamIndex: subtitle.StreamIndex,
		SubtitleCodec:       subtitle.Codec,
	}); err != nil {
		_ = os.Remove(outputPath)
		log.Printf("segment render worker: mark ready fehlgeschlagen (cache_key=%s): %v", cache.CacheKey, err)
		return err
	}

	log.Printf("segment render worker: render abgeschlossen (segment_id=%d, cache_key=%s)", cache.ThemeSegmentID, cache.CacheKey)
	return nil
}
