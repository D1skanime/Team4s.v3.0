package services

import (
	"bytes"
	"fmt"
	"image"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// buildDisplayVariant erzeugt (sofern moeglich) die "display"-Variante fuer einen Upload nach
// D-18/D-19/D-20/D-21: SVG wird nie rasterisiert (keine Pixel-Dimensionen); animierte GIFs
// bleiben als animiertes WebP animiert via ffmpeg (Rueckfall: Original-GIF unveraendert, falls
// ffmpeg fehlschlaegt); animierte WebP bleiben als animiertes WebP animiert via vipsthumbnail
// (Rueckfall: Original-WebP unveraendert, falls vipsthumbnail fehlschlaegt -- golang.org/x/
// image/webp kann ANMF-Animationsframes ueberhaupt nicht dekodieren); alle anderen statischen
// Bilder nutzen die gemeinsame EncodeStaticDisplayVariant-Funktion (PNG bei Transparenz, sonst
// JPEG). Fehler hier sind nicht fatal fuer den Upload selbst -- der Aufrufer bekommt
// original/thumb in jedem Fall, nur ohne zusaetzliche "display"-Zeile.
//
// Ausgelagert aus media_service.go (173-05 Task 0): media_service.go lag bereits bei 494 Zeilen
// (CLAUDE.md-Limit 450), die animierte-WebP-Erweiterung haette es auf 531 Zeilen wachsen lassen.
func (s *MediaService) buildDisplayVariant(detectedMime string, data []byte, originalPath string) *MediaVariantSaveResult {
	dir := filepath.Dir(originalPath)
	if detectedMime == "image/svg+xml" {
		return nil
	}

	if detectedMime == "image/gif" && IsAnimatedGIFData(data) {
		webpData, w, h, err := GenerateAnimatedWebPDisplayFromBytes(s.ffmpegPath, data)
		if err == nil {
			return s.writeDisplayVariant(webpData, displayVariantFileName(originalPath, "webp"), "image/webp", &w, &h, dir)
		}
		log.Printf("media upload: animierte display-variante konnte nicht erzeugt werden, original bleibt display (nicht-fatal): %v", err)
		cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
		if cfgErr != nil {
			return nil
		}
		w, h = cfg.Width, cfg.Height
		return s.writeDisplayVariant(data, displayVariantFileName(originalPath, "gif"), "image/gif", &w, &h, dir)
	}

	if detectedMime == "image/webp" && IsAnimatedWebPData(data) {
		// D-20/D-21: animiertes WebP (Fansub-Logo/Banner/Gruppenmedien) bleibt animiert --
		// golang.org/x/image/webp kann ANMF-Frames nicht dekodieren, daher vipsthumbnail statt
		// der generischen image.Decode-Behandlung unten. Rueckfall bei Fehler: unveraendertes
		// Original-WebP als display (niemals ein statisches Frame-0-Bild), identisch zum
		// animierten-GIF-Zweig oben.
		webpData, w, h, err := GenerateAnimatedDisplayViaVips(s.vipsThumbnailPath, data, ".webp", DisplayAnimatedMaxEdge)
		if err == nil {
			return s.writeDisplayVariant(webpData, displayVariantFileName(originalPath, "webp"), "image/webp", &w, &h, dir)
		}
		log.Printf("media upload: animierte webp-display-variante konnte nicht erzeugt werden, original bleibt display (nicht-fatal): %v", err)
		cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
		if cfgErr != nil {
			return nil
		}
		w, h = cfg.Width, cfg.Height
		return s.writeDisplayVariant(data, displayVariantFileName(originalPath, "webp"), "image/webp", &w, &h, dir)
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
	return s.writeDisplayVariant(displayData, displayVariantFileName(originalPath, ext), mimeType, &w, &h, dir)
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

// displayVariantFileName names the display variant after its original so several originals in
// one shared directory never overwrite each other's display file. Fansub logo/banner/group media
// all live in media/fansub/<group_id>/ -- a fixed "display.<ext>" let a later gallery upload
// replace the group banner's public image (BUG-174-05). Per-asset directories whose original is
// "original.<ext>" keep the established "display.<ext>" name; every other original gets
// "<original-name>_display.<ext>", the scheme migrate-display-backfill already uses.
func displayVariantFileName(originalPath string, ext string) string {
	base := filepath.Base(originalPath)
	stem := strings.TrimSuffix(base, filepath.Ext(base))
	if stem == "" || stem == "original" {
		return "display." + ext
	}
	return stem + "_display." + ext
}
