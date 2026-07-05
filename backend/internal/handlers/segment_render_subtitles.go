package handlers

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

// segmentSubtitleSelection enthält das Ergebnis der Untertitel-Erkennung fuer einen Segment-Render.
// SubtitleFilePath ist leer, wenn keine passende Spur gefunden wurde oder der Download fehlschlug;
// dieser Fall ist kein Fehler, sondern eine Diagnose (Clip bleibt ohne eingebrannte Untertitel abspielbar).
type segmentSubtitleSelection struct {
	SubtitleFilePath string
	StreamIndex      *int32
	Codec            *string
	Diagnostic       string
}

// resolveSegmentSubtitle ermittelt fuer ein Jellyfin-Item die am besten geeignete ASS/Kara-Spur,
// laedt sie in eine kontrollierte Temp-Datei herunter und liefert das Ergebnis fuer den FFmpeg-Render.
// Bei fehlender Spur oder Download-Fehler wird KEIN Fehler zurueckgegeben, sondern eine leere Auswahl
// mit Diagnosetext -- der Aufrufer rendert dann ohne Untertitel weiter.
func (h *AdminContentHandler) resolveSegmentSubtitle(ctx context.Context, itemID string, tempDir string) segmentSubtitleSelection {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return segmentSubtitleSelection{Diagnostic: "kein jellyfin-item fuer untertitel-erkennung vorhanden"}
	}

	streams, mediaSourceID, err := h.getJellyfinItemMediaStreams(ctx, trimmedItemID)
	if err != nil {
		log.Printf(
			"segment_render_subtitles: media streams laden fehlgeschlagen (item=%s): %s",
			trimmedItemID,
			services.SanitizeSegmentRenderLog(err.Error(), h.jellyfinAPIKey),
		)
		return segmentSubtitleSelection{Diagnostic: "untertitel-spuren konnten nicht geladen werden"}
	}

	probeStreams := mapJellyfinMediaStreamsToSegmentProbe(streams)
	selected := services.SelectSegmentSubtitleStream(probeStreams)
	if selected == nil {
		return segmentSubtitleSelection{Diagnostic: "keine passende ass/kara-untertitelspur gefunden"}
	}

	destPath, err := h.downloadJellyfinSubtitle(ctx, trimmedItemID, mediaSourceID, selected.Index, tempDir)
	if err != nil {
		log.Printf(
			"segment_render_subtitles: untertitel-download fehlgeschlagen (item=%s, index=%d): %s",
			trimmedItemID,
			selected.Index,
			services.SanitizeSegmentRenderLog(err.Error(), h.jellyfinAPIKey),
		)
		return segmentSubtitleSelection{Diagnostic: "untertitelspur gefunden, aber download fehlgeschlagen"}
	}

	streamIndex := selected.Index
	codec := strings.ToLower(strings.TrimSpace(selected.Codec))
	return segmentSubtitleSelection{
		SubtitleFilePath: destPath,
		StreamIndex:      &streamIndex,
		Codec:            &codec,
	}
}

// resolveSegmentSubtitleForRender kapselt die Quellart-Pruefung und das Diagnose-Logging fuer den
// Aufruf aus RenderSegment. Nur episode_version/jellyfin_theme-Quellen mit Jellyfin-Item-ID werden
// probiert; uploaded_asset benoetigt keine Untertitel-Erkennung.
func (h *AdminContentHandler) resolveSegmentSubtitleForRender(
	ctx context.Context,
	segmentID int64,
	cacheKey string,
	source *models.ThemeSegmentRenderSource,
) segmentSubtitleSelection {
	jellyfinItemID := strings.TrimSpace(derefString(source.JellyfinItemID))
	if source.SourceKind != "episode_version" && source.SourceKind != "jellyfin_theme" {
		return segmentSubtitleSelection{}
	}
	if jellyfinItemID == "" {
		return segmentSubtitleSelection{}
	}

	subtitle := h.resolveSegmentSubtitle(ctx, jellyfinItemID, segmentSubtitleTempDir(h.segmentRenderDir))
	if subtitle.SubtitleFilePath == "" && strings.TrimSpace(subtitle.Diagnostic) != "" {
		log.Printf(
			"segment_render_subtitles: %s (segment_id=%d, cache_key=%s)",
			subtitle.Diagnostic,
			segmentID,
			cacheKey,
		)
	}
	return subtitle
}

// getJellyfinItemMediaStreams laedt die MediaStreams eines einzelnen Jellyfin-Items und liefert
// zusaetzlich die MediaSource-Id fuer den Subtitle-Download. Faellt die Item-Antwort ohne MediaSource
// zurueck, wird die Item-Id als MediaSource-Id verwendet (Single-Version-Items).
func (h *AdminContentHandler) getJellyfinItemMediaStreams(ctx context.Context, itemID string) ([]jellyfinMediaStream, string, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return nil, "", fmt.Errorf("jellyfin item id is required")
	}

	values := url.Values{}
	values.Set("Ids", trimmedItemID)
	values.Set("Limit", "1")
	values.Set("Fields", "MediaStreams,MediaSources")

	var payload jellyfinEpisodeListResponse
	statusCode, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload)
	if statusCode == http.StatusNotFound {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}

	item := findJellyfinItem(payload.Items, trimmedItemID)
	if item == nil {
		return nil, "", nil
	}
	return item.MediaStreams, resolveJellyfinMediaSourceID(item, trimmedItemID), nil
}

// findJellyfinItem waehlt das passende Item aus der Antwort (bevorzugt exakte Id-Uebereinstimmung).
func findJellyfinItem(items []jellyfinEpisodeItem, itemID string) *jellyfinEpisodeItem {
	for i := range items {
		if strings.TrimSpace(items[i].ID) == itemID {
			return &items[i]
		}
	}
	if len(items) > 0 {
		return &items[0]
	}
	return nil
}

// resolveJellyfinMediaSourceID liefert die erste MediaSource-Id des Items; ohne MediaSource faellt
// sie auf die Item-Id zurueck (bei Single-Version-Items sind beide identisch).
func resolveJellyfinMediaSourceID(item *jellyfinEpisodeItem, itemID string) string {
	for _, source := range item.MediaSources {
		if id := strings.TrimSpace(source.ID); id != "" {
			return id
		}
	}
	return itemID
}

// mapJellyfinMediaStreamsToSegmentProbe wandelt Jellyfin-MediaStreams in das service-neutrale Probe-Format um.
func mapJellyfinMediaStreamsToSegmentProbe(streams []jellyfinMediaStream) []services.SegmentProbeMediaStream {
	mapped := make([]services.SegmentProbeMediaStream, 0, len(streams))
	for _, stream := range streams {
		mapped = append(mapped, services.SegmentProbeMediaStream{
			Index:     stream.Index,
			Type:      stream.Type,
			Codec:     stream.Codec,
			IsDefault: stream.IsDefault,
			IsForced:  stream.IsForced,
		})
	}
	return mapped
}

// downloadJellyfinSubtitle laedt eine ASS/Kara-Untertitelspur von Jellyfin in eine kontrollierte Temp-Datei.
// Es werden NIE api_key/token oder volle Jellyfin-URLs geloggt.
func (h *AdminContentHandler) downloadJellyfinSubtitle(
	ctx context.Context,
	itemID string,
	mediaSourceID string,
	streamIndex int32,
	tempDir string,
) (string, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	trimmedSourceID := strings.TrimSpace(mediaSourceID)
	if trimmedItemID == "" || trimmedSourceID == "" {
		return "", fmt.Errorf("jellyfin item id and media source id are required")
	}
	if streamIndex < 0 {
		return "", fmt.Errorf("invalid subtitle stream index")
	}

	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" {
		return "", fmt.Errorf("jellyfin base url missing")
	}
	apiKey := strings.TrimSpace(h.jellyfinAPIKey)
	if apiKey == "" {
		return "", fmt.Errorf("jellyfin api key missing")
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse jellyfin base url: %w", err)
	}
	subtitlePath := fmt.Sprintf(
		"/Videos/%s/%s/Subtitles/%s/Stream.ass",
		url.PathEscape(trimmedItemID),
		url.PathEscape(trimmedSourceID),
		strconv.FormatInt(int64(streamIndex), 10),
	)
	if strings.HasSuffix(parsedBase.Path, "/") {
		parsedBase.Path = strings.TrimSuffix(parsedBase.Path, "/")
	}
	parsedBase.Path = parsedBase.Path + subtitlePath

	values := url.Values{}
	values.Set("api_key", apiKey)
	parsedBase.RawQuery = values.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedBase.String(), nil)
	if err != nil {
		return "", fmt.Errorf("create jellyfin subtitle request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("call jellyfin subtitle endpoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("jellyfin subtitle endpoint returned status %d", resp.StatusCode)
	}

	trimmedTempDir := strings.TrimSpace(tempDir)
	if trimmedTempDir == "" {
		return "", fmt.Errorf("segment subtitle temp directory is missing")
	}
	destDirAbs, err := filepath.Abs(trimmedTempDir)
	if err != nil {
		return "", fmt.Errorf("resolve segment subtitle temp directory: %w", err)
	}
	if err := os.MkdirAll(destDirAbs, 0o755); err != nil {
		return "", fmt.Errorf("create segment subtitle temp directory: %w", err)
	}

	fileName := "segment-subtitle-" + uuid.NewString() + ".ass"
	destPath, ok := resolveControlledFilePath(destDirAbs, fileName)
	if !ok {
		return "", fmt.Errorf("segment subtitle temp path is invalid")
	}

	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return "", fmt.Errorf("create segment subtitle temp file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, resp.Body); err != nil {
		_ = os.Remove(destPath)
		return "", fmt.Errorf("write segment subtitle temp file: %w", err)
	}

	return destPath, nil
}

// segmentSubtitleTempDir liefert das kontrollierte Verzeichnis fuer temporaere Untertitel-Downloads
// unterhalb des konfigurierten Segment-Render-Verzeichnisses.
func segmentSubtitleTempDir(segmentRenderDir string) string {
	trimmed := strings.TrimSpace(segmentRenderDir)
	if trimmed == "" {
		return ""
	}
	return filepath.Join(trimmed, "subtitle-tmp")
}

// SegmentSubtitleCleanupInterval bestimmt, wie oft verwaiste Untertitel-Temp-Dateien entfernt werden.
const SegmentSubtitleCleanupInterval = 30 * time.Minute

// CleanupOrphanedSegmentSubtitles entfernt verwaiste .ass-Temp-Dateien aus dem subtitle-tmp-Verzeichnis.
// Normalerweise raeumt RenderSegment die Datei per defer auf; stuerzt der Prozess zwischen Download und
// defer ab, bleibt sie liegen. Entfernt werden nur Dateien, die aelter als maxAge sind (Renders dauern
// Sekunden bis wenige Minuten, alles Aeltere ist ein abgebrochener Job). Rueckgabe: Anzahl entfernter Dateien.
func (h *AdminContentHandler) CleanupOrphanedSegmentSubtitles(maxAge time.Duration) (int, error) {
	dir := segmentSubtitleTempDir(h.segmentRenderDir)
	if strings.TrimSpace(dir) == "" {
		return 0, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}

	cutoff := time.Now().Add(-maxAge)
	removed := 0
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".ass") {
			continue
		}
		info, err := entry.Info()
		if err != nil || info.ModTime().After(cutoff) {
			continue
		}
		path, ok := resolveControlledFilePath(dir, entry.Name())
		if !ok {
			continue
		}
		if err := os.Remove(path); err == nil {
			removed++
		}
	}
	return removed, nil
}
