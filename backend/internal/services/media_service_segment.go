package services

import (
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/disintegration/imaging"
)

// SegmentAssetContext enthaelt die Kontext-Parameter fuer den deterministischen Segment-Asset-Pfad.
type SegmentAssetContext struct {
	AnimeID          int64
	StableProvider   string
	StableExternalID string
	GroupID          int64
	Version          string
	SegmentTypeName  string
}

// SaveSegmentAsset validiert und speichert ein Segment-Asset (OP/ED/Insert-Audio- oder Videodatei).
// Zielpfad bevorzugt die stabile Anime-Identitaet:
// segments/library/{provider}/{externalId}/group_{groupId}/{version}/{segmentTypeLower}/{sanitizedFilename}
// Fallback ohne stabile Quelle:
// segments/local/anime_{animeId}/group_{groupId}/{version}/{segmentTypeLower}/{sanitizedFilename}
// Erlaubte Formate: mp4, webm, mkv, mp3, aac, flac, ogg, opus, m4a. Groessenlimit: 150 MB.
func (s *MediaService) SaveSegmentAsset(ctx SegmentAssetContext, originalName string, data []byte) (*MediaSaveResult, error) {
	if len(data) == 0 {
		return nil, &MediaValidationError{Message: "datei ist leer"}
	}
	const maxSize = int64(150 * 1024 * 1024)
	if int64(len(data)) > maxSize {
		return nil, &MediaValidationError{Message: "segment-asset ist zu gross (max 150MB)"}
	}

	detectedMime := detectMimeType(data)
	allowedSegment := map[string]string{
		"video/mp4":        "mp4",
		"video/webm":       "webm",
		"video/x-matroska": "mkv",
		"audio/mpeg":       "mp3",
		"audio/aac":        "aac",
		"audio/flac":       "flac",
		"audio/ogg":        "ogg",
		"audio/mp4":        "m4a",
	}
	ext, ok := allowedSegment[detectedMime]
	if !ok {
		return nil, &MediaValidationError{Message: "ungültiges format für segment-asset (erlaubt: mp4, webm, mkv, mp3, aac, flac, ogg, opus, m4a)"}
	}

	sanitized := sanitizeSegmentFilename(originalName, ext)
	segTypeDir := strings.ToLower(strings.TrimSpace(ctx.SegmentTypeName))
	if segTypeDir == "" {
		segTypeDir = "unknown"
	}

	pathParts := []string{"segments"}
	stableProvider := sanitizeSegmentPathComponent(ctx.StableProvider)
	stableExternalID := sanitizeSegmentPathComponent(ctx.StableExternalID)
	if stableProvider != "" && stableExternalID != "" {
		pathParts = append(pathParts, "library", stableProvider, stableExternalID)
	} else {
		pathParts = append(pathParts, "local", fmt.Sprintf("anime_%d", ctx.AnimeID))
	}
	pathParts = append(pathParts,
		fmt.Sprintf("group_%d", ctx.GroupID),
		sanitizeSegmentPathComponent(ctx.Version),
		sanitizeSegmentPathComponent(segTypeDir),
		sanitized,
	)
	relPath := filepath.Join(pathParts...)
	// Use forward slashes for storage path keys (cross-platform consistent)
	relPathFwd := filepath.ToSlash(relPath)
	absolutePath := filepath.Join(s.storageDir, relPath)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create segment asset directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write segment asset file: %w", err)
	}

	result := &MediaSaveResult{
		CreateInput: models.MediaAssetCreateInput{
			Kind:        models.MediaKindSegmentAsset,
			Filename:    relPathFwd,
			StoragePath: absolutePath,
			MimeType:    detectedMime,
			SizeBytes:   int64(len(data)),
		},
	}
	if strings.HasPrefix(detectedMime, "video/") && s.ffmpegPath != "" {
		if preview, err := s.saveSegmentVideoPreview(absolutePath); err == nil {
			result.Variants = append(result.Variants, *preview)
		}
	}
	return result, nil
}

// probeVideoDuration ermittelt die Videodauer in Sekunden via ffprobe.
//
// Code-Review-Fix (Phase 172): zwei Bugs behoben.
//  1. ffprobePath wurde per strings.Replace(ffmpegPath, "ffmpeg", "ffprobe", 1) abgeleitet --
//     das ersetzt das ERSTE Vorkommen von "ffmpeg" im GESAMTEN Pfad, nicht nur im Dateinamen
//     (z.B. "/opt/ffmpeg-static/bin/ffmpeg" wuerde faelschlich zu
//     "/opt/ffprobe-static/bin/ffmpeg"). Jetzt wird nur der Dateiname im selben Verzeichnis
//     ersetzt: filepath.Dir(ffmpegPath) + "ffprobe".
//  2. stream=duration lieferte bei MKV-Containern oft "N/A" (die Dauer steht dort meist nur im
//     Format-Header, nicht im Video-Stream selbst), wodurch der 35%-Offset (D-05) still auf 0
//     zurueckfiel. format=duration liest die Container-Dauer und ist robuster.
func (s *MediaService) probeVideoDuration(videoPath string) (float64, error) {
	ffprobePath := filepath.Join(filepath.Dir(s.ffmpegPath), "ffprobe")
	cmd := exec.Command(
		ffprobePath,
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe duration probe failed: %w", err)
	}
	duration, err := strconv.ParseFloat(strings.TrimSpace(string(output)), 64)
	if err != nil {
		return 0, fmt.Errorf("parse ffprobe duration: %w", err)
	}
	return duration, nil
}

// saveSegmentVideoPreview extrahiert einen Frame bei ca. 35% der Videodauer (Phase 172, D-05) statt
// bei Sekunde 0 -- schlaegt die Dauer-Ermittlung fehl, faellt die Funktion defensiv auf Offset 0
// zurueck statt den gesamten Segment-Asset-Upload scheitern zu lassen (D-06).
func (s *MediaService) saveSegmentVideoPreview(videoPath string) (*MediaVariantSaveResult, error) {
	previewPath := videoPath + ".preview.jpg"
	tempPNG := previewPath + ".tmp.png"
	defer os.Remove(tempPNG)

	offsetSeconds := 0.0
	if duration, err := s.probeVideoDuration(videoPath); err == nil && duration > 0 {
		offsetSeconds = duration * 0.35
	}

	cmd := exec.Command(s.ffmpegPath, "-i", videoPath, "-ss", fmt.Sprintf("%.2f", offsetSeconds), "-frames:v", "1", "-f", "image2", "-y", tempPNG)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg preview extraction failed: %w", err)
	}
	img, err := imaging.Open(tempPNG)
	if err != nil {
		return nil, fmt.Errorf("open extracted preview: %w", err)
	}
	resized := imaging.Resize(img, 480, 0, imaging.Lanczos)
	if err := imaging.Save(resized, previewPath, imaging.JPEGQuality(86)); err != nil {
		return nil, fmt.Errorf("save preview: %w", err)
	}
	stat, err := os.Stat(previewPath)
	if err != nil {
		return nil, err
	}
	bounds := resized.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	return &MediaVariantSaveResult{
		Filename:    filepath.Base(previewPath),
		StoragePath: previewPath,
		MimeType:    "image/jpeg",
		SizeBytes:   stat.Size(),
		Width:       &width,
		Height:      &height,
	}, nil
}

// ExtractImageFrame extrahiert einen Frame bei einem explizit uebergebenen Offset (in Sekunden)
// aus einem beliebigen Video und speichert ihn unter s.storageDir/destRelPath -- NICHT neben dem
// Quellvideo, damit die Datei unter der regulaeren Media-Storage-Struktur (und damit /media-
// Auslieferung sowie einheitlichem Aufraeumen) liegt. Genutzt vom Render-Worker-Hook (Phase 172,
// D-04), wo die Segmentdauer bereits bekannt ist und kein ffprobe-Aufruf noetig ist. 640px Breite
// (statt der 480px von saveSegmentVideoPreview), da dieses Bild direkt als oeffentliches
// Kara-Vorschaubild angezeigt wird (passend zur width={640} in ReleaseGallery.tsx).
func (s *MediaService) ExtractImageFrame(videoPath string, offsetSeconds float64, destRelPath string) (*MediaVariantSaveResult, error) {
	destPath := filepath.Join(s.storageDir, destRelPath)
	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return nil, fmt.Errorf("create preview directory: %w", err)
	}
	tempPNG := destPath + ".tmp.png"
	defer os.Remove(tempPNG)

	cmd := exec.Command(s.ffmpegPath, "-i", videoPath, "-ss", fmt.Sprintf("%.2f", offsetSeconds), "-frames:v", "1", "-f", "image2", "-y", tempPNG)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg frame extraction failed: %w", err)
	}
	img, err := imaging.Open(tempPNG)
	if err != nil {
		return nil, fmt.Errorf("open extracted frame: %w", err)
	}
	resized := imaging.Resize(img, 640, 0, imaging.Lanczos)
	if err := imaging.Save(resized, destPath, imaging.JPEGQuality(86)); err != nil {
		return nil, fmt.Errorf("save frame: %w", err)
	}
	stat, err := os.Stat(destPath)
	if err != nil {
		return nil, err
	}
	bounds := resized.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	return &MediaVariantSaveResult{
		Filename:    filepath.Base(destRelPath),
		StoragePath: destPath,
		MimeType:    "image/jpeg",
		SizeBytes:   stat.Size(),
		Width:       &width,
		Height:      &height,
	}, nil
}

// ExtractSegmentUploadAutoPreview extrahiert bei ca. 35% der Videodauer (D-05) einen
// EIGENSTAENDIGEN Vorschaubild-Frame unter destRelPath, getrennt von saveSegmentVideoPreview's
// eigenem Thumb (das weiterhin als 'thumb'-media_files-Variante des Video-Assets registriert
// wird). Code-Review-Fix (Phase 172, doppelter Dateibesitz): vorher registrierte der Video-
// Upload-Pfad denselben von saveSegmentVideoPreview erzeugten Datei-Pfad ZWEIMAL -- einmal als
// Video-Thumb, einmal (ueber registerSegmentAutoPreview) als eigenstaendiges Auto-Vorschaubild-
// Asset. Beide media_assets-Zeilen zeigten dann auf dieselbe physische Datei; ein spaeteres
// Aufraeumen des einen Assets riss das andere mit. ExtractImageFrame erzeugt hier bewusst eine
// zweite, unabhaengige Kopie. Faellt bei fehlgeschlagener Dauer-Ermittlung auf Offset 0 zurueck
// (D-06), analog saveSegmentVideoPreview.
func (s *MediaService) ExtractSegmentUploadAutoPreview(videoPath string, destRelPath string) (*MediaVariantSaveResult, error) {
	offsetSeconds := 0.0
	if duration, err := s.probeVideoDuration(videoPath); err == nil && duration > 0 {
		offsetSeconds = duration * 0.35
	}
	return s.ExtractImageFrame(videoPath, offsetSeconds, destRelPath)
}

func sanitizeSegmentPathComponent(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	if trimmed == "" {
		return ""
	}
	sanitized := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, trimmed)
	sanitized = strings.Trim(sanitized, "-.")
	if sanitized == "" {
		return ""
	}
	return sanitized
}

// sanitizeSegmentFilename normalisiert einen Dateinamen fuer Segment-Assets:
// lowercase, Leerzeichen -> '-', nur [a-z0-9._-], max 80 Zeichen, Extension beibehalten.
func sanitizeSegmentFilename(originalName, fallbackExt string) string {
	name := strings.ToLower(strings.TrimSpace(originalName))
	if name == "" {
		return "segment." + fallbackExt
	}

	// Ersetze Leerzeichen durch Bindestriche
	name = strings.ReplaceAll(name, " ", "-")

	// Trenne Basis und Extension
	dotIdx := strings.LastIndex(name, ".")
	var base, ext string
	if dotIdx >= 0 {
		base = name[:dotIdx]
		ext = name[dotIdx:] // inkl. Punkt
	} else {
		base = name
		ext = "." + fallbackExt
	}

	// Filtere unerlaubte Zeichen aus Basis und Extension
	allowed := func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			return r
		}
		return '-'
	}
	base = strings.Map(allowed, base)
	ext = strings.Map(allowed, ext)

	result := base + ext

	// Maximale Laenge: 80 Zeichen (Extension beibehalten)
	if len(result) > 80 {
		maxBase := 80 - len(ext)
		if maxBase < 1 {
			maxBase = 1
		}
		result = base[:maxBase] + ext
	}

	return result
}

