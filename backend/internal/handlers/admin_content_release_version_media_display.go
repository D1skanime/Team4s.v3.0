package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"

	"github.com/disintegration/imaging"
)

const (
	rvmDisplayLongEdge = 1920
	rvmDisplayQuality  = 88
)

// generateRVMDisplay creates a static JPEG "display" variant from image data, decoded the same
// way generateRVMThumbnail does (GIF -> frame 0 via gif.DecodeAll, else image.Decode). The long
// edge is capped at rvmDisplayLongEdge and never upscaled; the result is always re-encoded as
// JPEG at rvmDisplayQuality, regardless of source mimetype (matches generateRVMThumbnail's
// existing re-encode posture, and D-01's "WebP or JPEG >= 88" discretion).
func generateRVMDisplay(data []byte, mimeType string) ([]byte, int, int, error) {
	var src image.Image

	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("gif frame 0 laden: %w", err)
		}
		if len(decoded.Image) == 0 {
			return nil, 0, 0, fmt.Errorf("gif enthält keine frames")
		}
		src = decoded.Image[0]
	} else {
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("bild dekodieren: %w", err)
		}
		src = decoded
	}

	bounds := src.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	longEdge := max(width, height)

	display := src
	if longEdge > rvmDisplayLongEdge {
		if width >= height {
			display = imaging.Resize(src, rvmDisplayLongEdge, 0, imaging.Lanczos)
		} else {
			display = imaging.Resize(src, 0, rvmDisplayLongEdge, imaging.Lanczos)
		}
	}

	buf := new(bytes.Buffer)
	if err := jpeg.Encode(buf, display, &jpeg.Options{Quality: rvmDisplayQuality}); err != nil {
		return nil, 0, 0, fmt.Errorf("display exportieren: %w", err)
	}

	displayBounds := display.Bounds()
	return buf.Bytes(), displayBounds.Dx(), displayBounds.Dy(), nil
}

// GenerateStaticDisplayVariant is an exported wrapper around generateRVMDisplay so the Phase 173
// backfill CLI (backend/cmd/migrate-display-backfill, package main, plan 173-07) can generate the
// same display variant for already-on-disk release-version-media originals without duplicating
// the resize/encode logic. generateRVMDisplay itself stays package-private since its only other
// in-repo callers (admin_content_release_version_media_replace.go, fansub_media_upload.go) live in
// this same package.
func GenerateStaticDisplayVariant(data []byte, mimeType string) ([]byte, int, int, error) {
	return generateRVMDisplay(data, mimeType)
}
