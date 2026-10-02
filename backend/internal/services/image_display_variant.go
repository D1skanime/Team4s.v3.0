package services

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"

	"github.com/disintegration/imaging"
)

// DisplayMaxLongEdge begrenzt die lange Kante der statischen "display"-Variante (nie
// hochskaliert). DisplayJPEGQuality ist die JPEG-Qualitaet, wenn das Quellbild keine
// Transparenz hat (D-01: "hohe Qualitaet (WebP oder JPEG >= 88)"). Einzige Stelle fuer diese
// Konstanten (Phase 173 Review-Korrektur: vorher doppelt in media_upload_image.go UND
// admin_content_release_version_media_display.go definiert).
const (
	DisplayMaxLongEdge = 1920
	DisplayJPEGQuality = 88
)

// ImageHasVisibleAlpha prueft, ob irgendein Pixel des Bildes nicht vollstaendig deckend ist
// (Alpha < 0xffff). Verwendet den generischen image.Image-Zugriff (img.At(x,y).RGBA()), damit
// alle konkreten Typen (NRGBA, RGBA, Paletted, Gray, YCbCr, ...) korrekt behandelt werden,
// inklusive paletted GIF-Frames mit transparentem Index. Formate ohne Alphakanal (Gray, YCbCr,
// CMYK) liefern ueber At(x,y).RGBA() durchgehend a=0xffff, also false.
func ImageHasVisibleAlpha(img image.Image) bool {
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := img.At(x, y).RGBA()
			if a != 0xffff {
				return true
			}
		}
	}
	return false
}

// EncodeStaticDisplayVariant erzeugt die gemeinsame statische "display"-Variante fuer ein
// bereits dekodiertes Bild: lange Kante auf DisplayMaxLongEdge begrenzt (nie hochskaliert).
// D-18: hat das (ggf. verkleinerte) Bild sichtbare Transparenz, wird verlustfrei als PNG
// kodiert (display.png); sonst als JPEG (display.jpg, Qualitaet DisplayJPEGQuality).
//
// Diese Funktion ist die EINE gemeinsame Implementierung fuer alle statischen Schreibpfade
// (globaler Uploader, Release-Version-Media Upload/Replace, Fansub-Logo/Banner/Gruppenmedien,
// Backfill-CLI 173-07) -- Phase 173 Review-Korrektur (vorher pro Aufrufer dupliziert).
func EncodeStaticDisplayVariant(img image.Image, origWidth, origHeight int) (data []byte, ext string, mimeType string, width int, height int, err error) {
	display := img
	longEdge := origWidth
	if origHeight > longEdge {
		longEdge = origHeight
	}
	if longEdge > DisplayMaxLongEdge {
		if origWidth >= origHeight {
			display = imaging.Resize(img, DisplayMaxLongEdge, 0, imaging.Lanczos)
		} else {
			display = imaging.Resize(img, 0, DisplayMaxLongEdge, imaging.Lanczos)
		}
	}

	bounds := display.Bounds()
	buf := new(bytes.Buffer)
	if ImageHasVisibleAlpha(display) {
		if encErr := png.Encode(buf, display); encErr != nil {
			return nil, "", "", 0, 0, encErr
		}
		return buf.Bytes(), "png", "image/png", bounds.Dx(), bounds.Dy(), nil
	}
	if encErr := jpeg.Encode(buf, display, &jpeg.Options{Quality: DisplayJPEGQuality}); encErr != nil {
		return nil, "", "", 0, 0, encErr
	}
	return buf.Bytes(), "jpg", "image/jpeg", bounds.Dx(), bounds.Dy(), nil
}
