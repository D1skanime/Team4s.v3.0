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
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/gabriel-vasile/mimetype"
)

// MediaSaveResult enthält das Ergebnis einer erfolgreichen Medien-Speicheroperation,
// inklusive der benötigten Eingabedaten für die Datenbank und eines Hinweises bei großen GIFs.
type MediaSaveResult struct {
	CreateInput  models.MediaAssetCreateInput
	GIFLargeHint bool
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
}

// NewMediaService erstellt einen neuen MediaService mit dem angegebenen Speicherverzeichnis
// und der öffentlichen Basis-URL. Leere Werte werden durch sinnvolle Standardwerte ersetzt.
func NewMediaService(storageDir, publicBaseURL string) *MediaService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}

	baseURL := strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8092"
	}

	return &MediaService{
		storageDir:    dir,
		publicBaseURL: baseURL,
	}
}

// SaveUpload validiert und speichert einen Medien-Upload für die angegebene MediaKind.
// Gibt ein MediaSaveResult mit Dateiinformationen zurück oder einen MediaValidationError bei ungültigen Daten.
func (s *MediaService) SaveUpload(kind models.MediaKind, originalName string, data []byte) (*MediaSaveResult, error) {
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

// SaveVideoUpload validiert und speichert ein Theme-Video fuer OP/ED-Assets.
func (s *MediaService) SaveVideoUpload(originalName string, data []byte) (*MediaSaveResult, error) {
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
		return nil, &MediaValidationError{Message: "ungueltiges videoformat (erlaubt: mp4, webm, mkv, avi, mov)"}
	}

	filename := buildFilename(models.MediaKindThemeVideo, ext)
	absolutePath := filepath.Join(s.storageDir, filename)
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

// SegmentAssetContext enthaelt die Kontext-Parameter fuer den deterministischen Segment-Asset-Pfad.
type SegmentAssetContext struct {
	AnimeID         int64
	StableProvider  string
	StableExternalID string
	GroupID         int64
	Version         string
	SegmentTypeName string
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
		return nil, &MediaValidationError{Message: "ungueltiges format fuer segment-asset (erlaubt: mp4, webm, mkv, mp3, aac, flac, ogg, opus, m4a)"}
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

	return &MediaSaveResult{
		CreateInput: models.MediaAssetCreateInput{
			Kind:        models.MediaKindSegmentAsset,
			Filename:    relPathFwd,
			StoragePath: absolutePath,
			MimeType:    detectedMime,
			SizeBytes:   int64(len(data)),
		},
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

	if kind == models.MediaKindLogo {
		if _, ok := allowedLogo[mimeType]; !ok {
			return &MediaValidationError{Message: "ungueltiges dateiformat fuer logo (erlaubt: SVG, PNG, JPG, WEBP)"}
		}
		return nil
	}

	if kind == models.MediaKindBanner {
		if _, ok := allowedBanner[mimeType]; !ok {
			if mimeType == "image/svg+xml" {
				return &MediaValidationError{Message: "svg ist fuer banner nicht erlaubt"}
			}
			return &MediaValidationError{Message: "ungueltiges dateiformat fuer banner (erlaubt: PNG, JPG, WEBP, GIF)"}
		}
		return nil
	}

	return &MediaValidationError{Message: "ungueltiger media-typ"}
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
