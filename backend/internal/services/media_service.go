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
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/gabriel-vasile/mimetype"

	_ "golang.org/x/image/webp"
)

// MediaSaveResult enthält das Ergebnis einer erfolgreichen Medien-Speicheroperation,
// inklusive der benötigten Eingabedaten für die Datenbank und eines Hinweises bei großen GIFs.
type MediaSaveResult struct {
	CreateInput  models.MediaAssetCreateInput
	GIFLargeHint bool
	Variants     []MediaVariantSaveResult
}

// MediaVariantSaveResult beschreibt eine gespeicherte Datei-Variante zu einem
// bestehenden Media-Asset, z.B. die interne source_original-Datei oder (seit Phase 173) die
// automatisch von SaveUpload erzeugte "display"-Variante.
type MediaVariantSaveResult struct {
	Variant     string // z.B. "source_original", "display"
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

// FFmpegPath gibt den konfigurierten ffmpeg-Binärpfad zurück (leer = nicht konfiguriert).
// Exportiert, damit handlers-seitige Aufrufer (RVM-Upload/Replace, Fansub-Gruppenmedien), die
// bereits einen *services.MediaService referenzieren, denselben Pfad für ihre eigene
// animierte-GIF-Display-Erzeugung (services.GenerateAnimatedWebPDisplayFromBytes) wiederverwenden
// können, statt eine zweite Konfigurationsquelle zu benötigen.
func (s *MediaService) FFmpegPath() string {
	return s.ffmpegPath
}

// isSaveUploadPathWithinBase prüft, dass ein aufgelöster absoluter Pfad innerhalb von base
// liegt. Lokale Entsprechung des handlers-Pakets isUploadPathWithinBase (services kann
// handlers nicht importieren, um einen Importzyklus zu vermeiden).
func isSaveUploadPathWithinBase(base string, target string) (bool, error) {
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false, err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return false, nil
	}
	return true, nil
}

// SaveUpload validiert und speichert einen Medien-Upload für die angegebene MediaKind.
// groupID > 0 namespaced Fansub-Branding-/Gruppenmedien-Uploads (Logo, Banner, Bild) unter
// <storageDir>/fansub/<groupID>/... (D-09) statt flach im Media-Root; groupID <= 0 behält das
// bisherige flache Layout bei. Gibt ein MediaSaveResult mit Dateiinformationen zurück oder
// einen MediaValidationError bei ungültigen Daten.
func (s *MediaService) SaveUpload(kind models.MediaKind, originalName string, data []byte, groupID int64) (*MediaSaveResult, error) {
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

	// D-06/D-15: WebP-Originale behalten ihre echten Bytes, aber ohne EXIF/XMP-Metadaten.
	if detectedMime == "image/webp" {
		stripped, stripErr := StripWebPMetadata(data)
		if stripErr != nil {
			return nil, fmt.Errorf("webp exif/xmp entfernen: %w", stripErr)
		}
		data = stripped
	}

	width, height := decodeImageDimensions(data)
	ext := extensionFromMime(detectedMime)
	filename := buildFilename(kind, ext)

	namespaced := groupID > 0 && (kind == models.MediaKindLogo || kind == models.MediaKindBanner || kind == models.MediaKindImage)
	relativeDir := ""
	if namespaced {
		relativeDir = filepath.Join("fansub", strconv.FormatInt(groupID, 10))
	}
	absolutePath := filepath.Join(s.storageDir, relativeDir, filename)
	if ok, err := isSaveUploadPathWithinBase(s.storageDir, absolutePath); err != nil || !ok {
		return nil, fmt.Errorf("ungültige pfadangabe für media upload")
	}

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create media directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write media file: %w", err)
	}

	publicURL := fmt.Sprintf("%s/api/v1/media/files/%s", s.publicBaseURL, url.PathEscape(filename))
	if namespaced {
		publicURL = fmt.Sprintf("%s/media/%s/%s", s.publicBaseURL, filepath.ToSlash(relativeDir), url.PathEscape(filename))
	}

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

	if variant := s.buildDisplayVariant(detectedMime, data, filepath.Dir(absolutePath)); variant != nil {
		result.Variants = append(result.Variants, *variant)
	}

	_ = originalName
	return result, nil
}

// buildDisplayVariant erzeugt (sofern moeglich) die "display"-Variante fuer einen Upload nach
// D-18/D-19: SVG wird nie rasterisiert (keine Pixel-Dimensionen); animierte GIFs bleiben als
// animiertes WebP animiert (Rueckfall: Original-GIF unveraendert, falls ffmpeg fehlschlaegt);
// alle anderen statischen Bilder nutzen die gemeinsame EncodeStaticDisplayVariant-Funktion
// (PNG bei Transparenz, sonst JPEG). Fehler hier sind nicht fatal fuer den Upload selbst -- der
// Aufrufer bekommt original/thumb in jedem Fall, nur ohne zusaetzliche "display"-Zeile.
func (s *MediaService) buildDisplayVariant(detectedMime string, data []byte, dir string) *MediaVariantSaveResult {
	if detectedMime == "image/svg+xml" {
		return nil
	}

	if detectedMime == "image/gif" && IsAnimatedGIFData(data) {
		webpData, w, h, err := GenerateAnimatedWebPDisplayFromBytes(s.ffmpegPath, data)
		if err == nil {
			return s.writeDisplayVariant(webpData, "display.webp", "image/webp", &w, &h, dir)
		}
		log.Printf("media upload: animierte display-variante konnte nicht erzeugt werden, original bleibt display (nicht-fatal): %v", err)
		cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
		if cfgErr != nil {
			return nil
		}
		w, h = cfg.Width, cfg.Height
		return s.writeDisplayVariant(data, "display.gif", "image/gif", &w, &h, dir)
	}

	decoded, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		log.Printf("media upload: display-quelle konnte nicht dekodiert werden (nicht-fatal): %v", err)
		return nil
	}
	bounds := decoded.Bounds()
	displayData, ext, mimeType, w, h, encErr := EncodeStaticDisplayVariant(decoded, bounds.Dx(), bounds.Dy())
	if encErr != nil {
		log.Printf("media upload: display-variante konnte nicht erzeugt werden (nicht-fatal): %v", encErr)
		return nil
	}
	return s.writeDisplayVariant(displayData, "display."+ext, mimeType, &w, &h, dir)
}

func (s *MediaService) writeDisplayVariant(data []byte, filename, mimeType string, width, height *int, dir string) *MediaVariantSaveResult {
	displayPath := filepath.Join(dir, filename)
	if err := os.WriteFile(displayPath, data, fs.FileMode(0o644)); err != nil {
		log.Printf("media upload: display-variante konnte nicht gespeichert werden (nicht-fatal): %v", err)
		return nil
	}
	rel, relErr := filepath.Rel(s.storageDir, displayPath)
	publicURL := ""
	if relErr == nil {
		publicURL = fmt.Sprintf("%s/media/%s", s.publicBaseURL, filepath.ToSlash(rel))
	}
	return &MediaVariantSaveResult{
		Variant:     "display",
		Filename:    filename,
		StoragePath: displayPath,
		PublicURL:   publicURL,
		MimeType:    mimeType,
		SizeBytes:   int64(len(data)),
		Width:       width,
		Height:      height,
	}
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
