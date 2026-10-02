package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"

	"team4s.v3/backend/internal/services"
)

// generateRVMDisplay creates a "display" variant from image data, decoded the same way
// generateRVMThumbnail does (GIF -> frame 0 via gif.DecodeAll, else image.Decode).
//
// Phase 173 Review-Korrektur: this function is now a thin wrapper around the shared
// services.EncodeStaticDisplayVariant helper (same long-edge cap, PNG-when-transparent/JPEG-
// otherwise encoding as the global uploader and Fansub-Media use -- no second resize/encode
// implementation) PLUS real animated-GIF handling (D-19): an animated GIF (more than one frame,
// via services.IsAnimatedGIFData) produces an animated WebP display variant through
// services.GenerateAnimatedWebPDisplayFromBytes; if ffmpeg is unavailable/fails, the display
// falls back to the ORIGINAL animated GIF bytes unchanged (never a static frame-0 image for an
// animation). D-20/D-21: an animated WebP gets the equivalent treatment via vipsthumbnail
// (services.GenerateAnimatedDisplayViaVips) instead of ffmpeg, since ffmpeg cannot decode
// animated WebP (173-RESEARCH.md) and golang.org/x/image/webp cannot decode ANMF frames at all.
// ffmpegPath/vipsThumbnailPath are threaded in by the caller (AdminContentHandler/FansubHandler
// both already hold a *services.MediaService with the configured paths via its exported
// FFmpegPath()/VipsThumbnailPath() accessors).
func generateRVMDisplay(data []byte, mimeType string, ffmpegPath string, vipsThumbnailPath string) (displayData []byte, ext string, displayMimeType string, width int, height int, err error) {
	if mimeType == "image/gif" {
		if services.IsAnimatedGIFData(data) {
			if webpData, w, h, animErr := services.GenerateAnimatedWebPDisplayFromBytes(ffmpegPath, data); animErr == nil {
				return webpData, "webp", "image/webp", w, h, nil
			}
			// D-19: ffmpeg nicht verfuegbar/fehlgeschlagen -- Animation bleibt erhalten, indem
			// das unveraenderte Original-GIF als display zurueckgegeben wird (niemals ein
			// statisches Frame-0-Bild fuer eine Animation).
			cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
			if cfgErr != nil {
				return nil, "", "", 0, 0, fmt.Errorf("gif dimensionen ermitteln: %w", cfgErr)
			}
			return data, "gif", "image/gif", cfg.Width, cfg.Height, nil
		}

		decoded, decErr := gif.DecodeAll(bytes.NewReader(data))
		if decErr != nil {
			return nil, "", "", 0, 0, fmt.Errorf("gif frame 0 laden: %w", decErr)
		}
		if len(decoded.Image) == 0 {
			return nil, "", "", 0, 0, fmt.Errorf("gif enthält keine frames")
		}
		src := decoded.Image[0]
		bounds := src.Bounds()
		return encodeStaticRVMDisplay(src, bounds.Dx(), bounds.Dy())
	}

	if mimeType == "image/webp" && services.IsAnimatedWebPData(data) {
		if webpData, w, h, animErr := services.GenerateAnimatedDisplayViaVips(vipsThumbnailPath, data, ".webp", services.DisplayAnimatedMaxEdge); animErr == nil {
			return webpData, "webp", "image/webp", w, h, nil
		}
		// D-20/D-21: vipsthumbnail nicht verfuegbar/fehlgeschlagen -- Animation bleibt erhalten,
		// indem das unveraenderte Original-WebP als display zurueckgegeben wird (niemals ein
		// statisches Frame-0-Bild fuer eine Animation).
		cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
		if cfgErr != nil {
			return nil, "", "", 0, 0, fmt.Errorf("webp dimensionen ermitteln: %w", cfgErr)
		}
		return data, "webp", "image/webp", cfg.Width, cfg.Height, nil
	}

	decoded, _, decErr := image.Decode(bytes.NewReader(data))
	if decErr != nil {
		return nil, "", "", 0, 0, fmt.Errorf("bild dekodieren: %w", decErr)
	}
	bounds := decoded.Bounds()
	return encodeStaticRVMDisplay(decoded, bounds.Dx(), bounds.Dy())
}

func encodeStaticRVMDisplay(img image.Image, width, height int) ([]byte, string, string, int, int, error) {
	data, ext, mimeType, w, h, err := services.EncodeStaticDisplayVariant(img, width, height)
	if err != nil {
		return nil, "", "", 0, 0, fmt.Errorf("display exportieren: %w", err)
	}
	return data, ext, mimeType, w, h, nil
}

// rvmFFmpegPath returns the configured ffmpeg path from h.mediaService, or "" if mediaService is
// nil (older/narrower test fixtures never set it) -- avoids a nil-pointer dereference since
// *services.MediaService.FFmpegPath() dereferences its receiver's field.
func (h *AdminContentHandler) rvmFFmpegPath() string {
	if h.mediaService == nil {
		return ""
	}
	return h.mediaService.FFmpegPath()
}

// rvmVipsThumbnailPath returns the configured vipsthumbnail path from h.mediaService, or "" if
// mediaService is nil (same nil-safety rationale as rvmFFmpegPath).
func (h *AdminContentHandler) rvmVipsThumbnailPath() string {
	if h.mediaService == nil {
		return ""
	}
	return h.mediaService.VipsThumbnailPath()
}

// GenerateStaticDisplayVariant is an exported wrapper around generateRVMDisplay so the Phase 173
// backfill CLI (backend/cmd/migrate-display-backfill, package main, plan 173-07) can generate the
// same display variant for already-on-disk release-version-media originals without duplicating
// the resize/encode logic. generateRVMDisplay itself stays package-private since its only other
// in-repo callers (admin_content_release_version_media.go, admin_content_release_version_media_replace.go,
// fansub_media_upload.go) live in this same package.
//
// Signature note (173-05 Task 0): gained a vipsThumbnailPath parameter alongside ffmpegPath for
// animated-WebP display generation (D-20/D-21) -- the not-yet-built 173-07 backfill CLI must call
// this with both paths, not the ffmpegPath-only signature from 173-04's summary.
func GenerateStaticDisplayVariant(data []byte, mimeType string, ffmpegPath string, vipsThumbnailPath string) ([]byte, string, string, int, int, error) {
	return generateRVMDisplay(data, mimeType, ffmpegPath, vipsThumbnailPath)
}
