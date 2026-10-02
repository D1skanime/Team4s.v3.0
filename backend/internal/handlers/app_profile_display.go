package handlers

import (
	"bytes"
	"image"
	"image/jpeg"
	"os"
	"path/filepath"

	"team4s.v3/backend/internal/services"

	"github.com/disintegration/imaging"
)

// Phase 173-05 Task 1: avatar/profile-background "display" variant generation, kept in a
// sibling file because app_profile.go is already close to the CLAUDE.md 450-line limit.
const (
	profileDisplayMaxLongEdge = 1920
	profileDisplayJPEGQuality = 88
)

// capLongEdgeAndSaveJPEG resizes img so its longer edge is at most maxLongEdge (never upscaled
// -- a smaller source keeps its original size) and encodes the result as JPEG at destPath.
// Mirrors 173-01's processImage display-cap algorithm (generateStaticDisplayVariant /
// services.EncodeStaticDisplayVariant), kept separate here since avatar/background display is
// always JPEG regardless of transparency (profile avatars/backgrounds never need an alpha
// channel the way logos do).
func capLongEdgeAndSaveJPEG(img image.Image, maxLongEdge, quality int, destPath string) (width, height int, err error) {
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	longEdge := w
	if h > longEdge {
		longEdge = h
	}

	resized := img
	if longEdge > maxLongEdge {
		if w >= h {
			resized = imaging.Resize(img, maxLongEdge, 0, imaging.Lanczos)
		} else {
			resized = imaging.Resize(img, 0, maxLongEdge, imaging.Lanczos)
		}
	}

	f, createErr := os.Create(destPath)
	if createErr != nil {
		return 0, 0, createErr
	}
	defer f.Close()
	if encErr := jpeg.Encode(f, resized, &jpeg.Options{Quality: quality}); encErr != nil {
		return 0, 0, encErr
	}

	rb := resized.Bounds()
	return rb.Dx(), rb.Dy(), nil
}

// generateProfileImageDisplayVariant erzeugt die "display"-Variante fuer Avatar-/Hintergrundbild-
// Uploads (D-18..D-21, Orchestrator-Ergaenzung 2026-10-02): eine animierte GIF- oder WebP-Quelle
// bleibt animiert (ffmpeg bzw. vipsthumbnail, Rueckfall bei Fehler = unveraenderte Quell-Bytes,
// NIE ein statisches Bild fuer eine Animation); jede andere Quelle nutzt
// capLongEdgeAndSaveJPEG (lange Kante <=1920px, nie hochskaliert, JPEG q>=88).
//
// data sind die rohen Bytes der GESPEICHERTEN Datei (bei Zuschnitt-Flows bereits die
// zugeschnittene Datei, D-22 -- der Aufrufer uebergibt niemals die unbearbeitete Quelle hier).
// img ist das bereits dekodierte Bild fuer den statischen Fall (kann nil sein, wenn data
// animiert ist -- dann wird gar nicht erst generisch dekodiert, da golang.org/x/image/webp
// ANMF-Animationsframes nicht lesen kann und ein zusaetzlicher Dekodierversuch nur fehlschlagen
// wuerde). Nicht-fatal: ein Fehler liefert ok=false, der Aufrufer faellt auf "kein display"
// zurueck (Avatar/Hintergrundbild bleiben trotzdem funktionsfaehig, nur ohne verkleinerte
// Darstellung).
func (h *AppAuthHandler) generateProfileImageDisplayVariant(
	data []byte, mimeType string, img image.Image, destDir string,
) (filename string, width int, height int, ok bool) {
	if mimeType == "image/gif" && services.IsAnimatedGIFData(data) {
		webpData, w, hgt, err := services.GenerateAnimatedWebPDisplayFromBytes(h.ffmpegPath, data)
		if err != nil {
			return "", 0, 0, false
		}
		if writeErr := os.WriteFile(filepath.Join(destDir, "display.webp"), webpData, 0o644); writeErr != nil {
			return "", 0, 0, false
		}
		return "display.webp", w, hgt, true
	}

	if mimeType == "image/webp" && services.IsAnimatedWebPData(data) {
		webpData, w, hgt, err := services.GenerateAnimatedDisplayViaVips(h.vipsThumbnailPath, data, ".webp", services.DisplayAnimatedMaxEdge)
		if err != nil {
			return "", 0, 0, false
		}
		if writeErr := os.WriteFile(filepath.Join(destDir, "display.webp"), webpData, 0o644); writeErr != nil {
			return "", 0, 0, false
		}
		return "display.webp", w, hgt, true
	}

	srcImg := img
	if srcImg == nil {
		decoded, _, decErr := image.Decode(bytes.NewReader(data))
		if decErr != nil {
			return "", 0, 0, false
		}
		srcImg = decoded
	}

	destPath := filepath.Join(destDir, "display.jpg")
	w, hgt, err := capLongEdgeAndSaveJPEG(srcImg, profileDisplayMaxLongEdge, profileDisplayJPEGQuality, destPath)
	if err != nil {
		return "", 0, 0, false
	}
	return "display.jpg", w, hgt, true
}
