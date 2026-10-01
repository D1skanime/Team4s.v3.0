package services

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/gabriel-vasile/mimetype"
	"github.com/disintegration/imaging"
)

// MediaSaveResult enthält das Ergebnis einer erfolgreichen Medien-Speicheroperation,
// inklusive der benötigten Eingabedaten für die Datenbank und eines Hinweises bei großen GIFs.
type MediaSaveResult struct {
	CreateInput  models.MediaAssetCreateInput
	GIFLargeHint bool
	Variants     []MediaVariantSaveResult
}

// MediaVariantSaveResult beschreibt eine gespeicherte Datei-Variante zu einem
// bestehenden Media-Asset, z.B. die interne source_original-Datei.
type MediaVariantSaveResult struct {
	Filename    string
	StoragePath string
	PublicURL   string
	MimeType    string
	SizeBytes   int64
	Width       *int
	Height      *int
}

// MediaValidationError repräsentiert einen Validierungsfehler bei einer Medien-Upload-Operation.
type MediaValidationError struct {
	Message string
}

// Error gibt die Fehlermeldung als String zurück.
func (e *MediaValidationError) Error() string {
	return e.Message
}

// MediaService verwaltet das Speichern und Validieren von Medien-Uploads auf dem Dateisystem.
type MediaService struct {
	storageDir    string
	publicBaseURL string
	ffmpegPath    string
}

type ReleaseThemeVideoStorageContext struct {
	ReleaseID int64
	ThemeID   int64
}

// NewMediaService erstellt einen neuen MediaService mit dem angegebenen Speicherverzeichnis
// und der öffentlichen Basis-URL. Leere Werte werden durch sinnvolle Standardwerte ersetzt.
func NewMediaService(storageDir, publicBaseURL string, ffmpegPath ...string) *MediaService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}

	baseURL := strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")
	ffmpeg := ""
	if len(ffmpegPath) > 0 {
		ffmpeg = strings.TrimSpace(ffmpegPath[0])
	}
	if baseURL == "" {
		baseURL = "http://localhost:8092"
	}

	return &MediaService{
		storageDir:    dir,
		publicBaseURL: baseURL,
		ffmpegPath:    ffmpeg,
	}
}

// SaveUpload validiert und speichert einen Medien-Upload für die angegebene MediaKind.
// Gibt ein MediaSaveResult mit Dateiinformationen zurück oder einen MediaValidationError bei ungültigen Daten.
func (s *MediaService) SaveUpload(kind models.MediaKind, originalName string, data []byte) (*MediaSaveResult, error) {
	if len(data) == 0 {
		return nil, &MediaValidationError{Message: "datei ist leer"}
	}

	maxSize := int64(2 * 1024 * 1024)
	if kind == models.MediaKindImage {
		maxSize = 15 * 1024 * 1024
	} else if kind == models.MediaKindBanner {
		maxSize = 5 * 1024 * 1024
	}
	if int64(len(data)) > maxSize {
		if kind == models.MediaKindLogo {
			return nil, &MediaValidationError{Message: "logo ist zu gross (max 2MB)"}
		}
		if kind == models.MediaKindImage {
			return nil, &MediaValidationError{Message: "bild ist zu gross (max 15MB)"}
		}
		return nil, &MediaValidationError{Message: "banner ist zu gross (max 5MB)"}
	}

	detectedMime := detectMimeType(data)
	if err := validateMimeForKind(kind, detectedMime); err != nil {
		return nil, err
	}

	width, height := decodeImageDimensions(data)
	ext := extensionFromMime(detectedMime)
	filename := buildFilename(kind, ext)
	absolutePath := filepath.Join(s.storageDir, filename)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create media directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write media file: %w", err)
	}

	publicURL := fmt.Sprintf("%s/api/v1/media/files/%s", s.publicBaseURL, url.PathEscape(filename))

	result := &MediaSaveResult{
		CreateInput: models.MediaAssetCreateInput{
			Kind:        kind,
			Filename:    filename,
			StoragePath: absolutePath,
			PublicURL:   publicURL,
			MimeType:    detectedMime,
			SizeBytes:   int64(len(data)),
			Width:       width,
			Height:      height,
		},
	}
	if kind == models.MediaKindBanner && detectedMime == "image/gif" && len(data) > 4*1024*1024 {
		result.GIFLargeHint = true
	}

	_ = originalName
	return result, nil
}

// SaveUploadSourceOriginal validiert und speichert die unbearbeitete Quelle zu
// einem Fansub-Branding-Upload. Die Datei wird nicht öffentlich verlinkt, aber
// als editierbare Quelle über geschützte Admin-/Leader-Antworten durchgereicht.
func (s *MediaService) SaveUploadSourceOriginal(kind models.MediaKind, originalName string, data []byte) (*MediaVariantSaveResult, error) {
	if len(data) == 0 {
		return nil, &MediaValidationError{Message: "datei ist leer"}
	}

	maxSize := int64(2 * 1024 * 1024)
	if kind == models.MediaKindBanner {
		maxSize = 5 * 1024 * 1024
	}
	if int64(len(data)) > maxSize {
		if kind == models.MediaKindLogo {
			return nil, &MediaValidationError{Message: "logo ist zu gross (max 2MB)"}
		}
		return nil, &MediaValidationError{Message: "banner ist zu gross (max 5MB)"}
	}

	detectedMime := detectMimeType(data)
	if err := validateMimeForKind(kind, detectedMime); err != nil {
		return nil, err
	}

	width, height := decodeImageDimensions(data)
	ext := extensionFromMime(detectedMime)
	filename := buildFilename(models.MediaKind(string(kind)+"_source"), ext)
	absolutePath := filepath.Join(s.storageDir, filename)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create media directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write source media file: %w", err)
	}

	_ = originalName
	return &MediaVariantSaveResult{
		Filename:    filename,
		StoragePath: absolutePath,
		PublicURL:   fmt.Sprintf("%s/api/v1/media/files/%s", s.publicBaseURL, url.PathEscape(filename)),
		MimeType:    detectedMime,
		SizeBytes:   int64(len(data)),
		Width:       width,
		Height:      height,
	}, nil
}

// SaveReleaseThemeVideoUpload validiert und speichert ein release-spezifisches Theme-Video fuer OP/ED-Assets.
func (s *MediaService) SaveReleaseThemeVideoUpload(ctx ReleaseThemeVideoStorageContext, originalName string, data []byte) (*MediaSaveResult, error) {
	if len(data) == 0 {
		return nil, &MediaValidationError{Message: "datei ist leer"}
	}
	if int64(len(data)) > 500*1024*1024 {
		return nil, &MediaValidationError{Message: "video ist zu gross (max 500MB)"}
	}

	detectedMime := detectMimeType(data)
	allowed := map[string]string{
		"video/mp4":        "mp4",
		"video/webm":       "webm",
		"video/x-matroska": "mkv",
		"video/x-msvideo":  "avi",
		"video/quicktime":  "mov",
	}
	ext, ok := allowed[detectedMime]
	if !ok {
		return nil, &MediaValidationError{Message: "ungültiges videoformat (erlaubt: mp4, webm, mkv, avi, mov)"}
	}

	filename := buildFilename(models.MediaKindThemeVideo, ext)
	absolutePath := filepath.Join(s.storageDir, s.releaseThemeVideoRelativeDir(ctx), filename)
	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create media directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write media file: %w", err)
	}

	publicURL := fmt.Sprintf("%s/api/v1/media/files/%s", s.publicBaseURL, url.PathEscape(filename))
	_ = originalName

	return &MediaSaveResult{
		CreateInput: models.MediaAssetCreateInput{
			Kind:        models.MediaKindThemeVideo,
			Filename:    filename,
			StoragePath: absolutePath,
			PublicURL:   publicURL,
			MimeType:    detectedMime,
			SizeBytes:   int64(len(data)),
		},
	}, nil
}

func (s *MediaService) releaseThemeVideoRelativeDir(ctx ReleaseThemeVideoStorageContext) string {
	releaseID := ctx.ReleaseID
	if releaseID <= 0 {
		releaseID = 0
	}
	themeID := ctx.ThemeID
	if themeID <= 0 {
		themeID = 0
	}
	return filepath.Join("release-theme-assets", fmt.Sprintf("release_%d", releaseID), fmt.Sprintf("theme_%d", themeID))
}

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

// probeVideoDuration ermittelt die Videodauer in Sekunden via ffprobe -- exakt das
// getVideoMetadata-Muster aus media_upload_video.go:181-205, aber ausschliesslich die Dauer
// liefernd (kein width/height-Bedarf an dieser Stelle).
func (s *MediaService) probeVideoDuration(videoPath string) (float64, error) {
	ffprobePath := strings.Replace(s.ffmpegPath, "ffmpeg", "ffprobe", 1)
	cmd := exec.Command(
		ffprobePath,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=duration",
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

// detectMimeType erkennt den MIME-Typ der übergebenen Binärdaten mithilfe von Bibliotheks-
// und HTTP-Erkennung. SVG-Daten werden zuverlässig normalisiert.
func detectMimeType(data []byte) string {
	detected := mimetype.Detect(data).String()
	detected = strings.ToLower(strings.TrimSpace(detected))
	if detected == "" || detected == "application/octet-stream" {
		detected = strings.ToLower(strings.TrimSpace(http.DetectContentType(data)))
	}

	if strings.Contains(detected, "svg") {
		return "image/svg+xml"
	}
	if (strings.HasPrefix(detected, "text/") || strings.Contains(detected, "xml")) && bytes.Contains(bytes.ToLower(data), []byte("<svg")) {
		return "image/svg+xml"
	}

	switch detected {
	case "image/png":
		return "image/png"
	case "image/jpeg":
		return "image/jpeg"
	case "image/webp":
		return "image/webp"
	case "image/gif":
		return "image/gif"
	default:
		return detected
	}
}

// validateMimeForKind prüft, ob der erkannte MIME-Typ für die gegebene MediaKind erlaubt ist.
// Gibt einen MediaValidationError zurück, wenn das Format nicht zulässig ist.
func validateMimeForKind(kind models.MediaKind, mimeType string) error {
	allowedLogo := map[string]struct{}{
		"image/svg+xml": {},
		"image/png":     {},
		"image/jpeg":    {},
		"image/webp":    {},
	}
	allowedBanner := map[string]struct{}{
		"image/png":  {},
		"image/jpeg": {},
		"image/webp": {},
		"image/gif":  {},
	}

	if kind == models.MediaKindImage {
		if _, ok := allowedBanner[mimeType]; !ok {
			return &MediaValidationError{Message: "ungültiges dateiformat für bild (erlaubt: PNG, JPG, WEBP, GIF)"}
		}
		return nil
	}

	if kind == models.MediaKindLogo {
		if _, ok := allowedLogo[mimeType]; !ok {
			return &MediaValidationError{Message: "ungültiges dateiformat für logo (erlaubt: SVG, PNG, JPG, WEBP)"}
		}
		return nil
	}

	if kind == models.MediaKindBanner {
		if _, ok := allowedBanner[mimeType]; !ok {
			if mimeType == "image/svg+xml" {
				return &MediaValidationError{Message: "svg ist für banner nicht erlaubt"}
			}
			return &MediaValidationError{Message: "ungültiges dateiformat für banner (erlaubt: PNG, JPG, WEBP, GIF)"}
		}
		return nil
	}

	return &MediaValidationError{Message: "ungültiger media-typ"}
}

// decodeImageDimensions liest Breite und Höhe eines Bildes aus den Rohdaten.
// Gibt nil zurück, wenn das Bild nicht dekodiert werden kann.
func decodeImageDimensions(data []byte) (*int, *int) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, nil
	}

	width := cfg.Width
	height := cfg.Height
	return &width, &height
}

// extensionFromMime gibt die passende Dateiendung für einen MIME-Typ zurück.
// Unbekannte Typen erhalten die Endung "bin".
func extensionFromMime(mimeType string) string {
	switch mimeType {
	case "image/svg+xml":
		return "svg"
	case "image/png":
		return "png"
	case "image/jpeg":
		return "jpg"
	case "image/webp":
		return "webp"
	case "image/gif":
		return "gif"
	default:
		return "bin"
	}
}

// buildFilename erzeugt einen eindeutigen Dateinamen aus MediaKind, Zeitstempel und
// zufälligen Bytes. Falls die Zufallsgenerierung fehlschlägt, wird ein Fallback mit
// Nano-Zeitstempel verwendet.
func buildFilename(kind models.MediaKind, extension string) string {
	var randomBytes [8]byte
	if _, err := rand.Read(randomBytes[:]); err != nil {
		now := time.Now().UnixNano()
		return fmt.Sprintf("%s_%d.%s", kind, now, extension)
	}

	return fmt.Sprintf("%s_%d_%s.%s", kind, time.Now().UnixMilli(), hex.EncodeToString(randomBytes[:]), extension)
}
