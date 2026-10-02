package services

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newOpaquePNGBytes erzeugt ein vollstaendig deckendes PNG (Alpha=255 ueberall) --
// SaveUpload muss dafuer eine JPEG-display-Variante erzeugen (D-18).
func newOpaquePNGBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.NRGBA{R: uint8(x), G: uint8(y), B: 10, A: 255})
		}
	}
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

// newTransparentPNGBytes erzeugt ein PNG, dessen linke Haelfte transparent ist -- SaveUpload
// muss dafuer eine PNG-display-Variante mit erhaltenem Alpha erzeugen (D-18), nicht JPEG.
func newTransparentPNGBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			a := uint8(255)
			if x < w/2 {
				a = 0
			}
			img.Set(x, y, color.NRGBA{R: 200, G: 50, B: 50, A: a})
		}
	}
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

// newGIFBytes erzeugt ein GIF mit genau frames Frames (frames=1 -> statisch, frames>1 ->
// echte Animation, fuer die D-19-Tests ueber IsAnimatedGIFData/generateAnimatedDisplayVariant).
func newGIFBytes(t *testing.T, frames int) []byte {
	t.Helper()
	pal := color.Palette{color.Black, color.White, color.RGBA{R: 255, A: 255}}
	g := &gif.GIF{}
	for i := 0; i < frames; i++ {
		img := image.NewPaletted(image.Rect(0, 0, 8, 8), pal)
		for y := 0; y < 8; y++ {
			for x := 0; x < 8; x++ {
				img.SetColorIndex(x, y, uint8((x+y+i)%len(pal)))
			}
		}
		g.Image = append(g.Image, img)
		g.Delay = append(g.Delay, 10)
	}
	var buf bytes.Buffer
	require.NoError(t, gif.EncodeAll(&buf, g))
	return buf.Bytes()
}

// countANMFChunks ist ein einfacher Byte-Scan nach dem "ANMF"-FourCC, um zu pruefen, dass eine
// WebP-Datei tatsaechlich mehrere Animations-Frames enthaelt -- derselbe pragmatische
// Chunk-basierte Ansatz wie der bereits etablierte isAnimatedWebP-VP8X-Flag-Check.
func countANMFChunks(data []byte) int {
	return bytes.Count(data, []byte("ANMF"))
}

func TestSaveUpload_NamespacesFansubAssetsUnderGroupID(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindLogo, "logo.png", newOpaquePNGBytes(t, 10, 10), 42)
	require.NoError(t, err)
	assert.Contains(t, result.CreateInput.StoragePath, filepath.Join("fansub", "42"))
	assert.Contains(t, result.CreateInput.PublicURL, "/media/fansub/42/")
}

func TestSaveUpload_FlatLayoutWhenGroupIDIsZero(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.png", newOpaquePNGBytes(t, 10, 10), 0)
	require.NoError(t, err)
	assert.NotContains(t, result.CreateInput.StoragePath, "fansub")
	assert.Contains(t, result.CreateInput.PublicURL, "/api/v1/media/files/")
}

func TestSaveUpload_PathTraversalGroupIDIsAlwaysNumeric(t *testing.T) {
	// groupID is typed int64 (not a free-text path segment), so there is no string input to
	// attempt traversal with -- this test documents/locks that invariant: even a negative or
	// huge groupID resolves to a safe, contained path under storageDir.
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindLogo, "logo.png", newOpaquePNGBytes(t, 10, 10), 999999999)
	require.NoError(t, err)
	rel, relErr := filepath.Rel(dir, result.CreateInput.StoragePath)
	require.NoError(t, relErr)
	assert.False(t, strings.HasPrefix(rel, ".."), "resolved storage path must stay within storageDir")
}

func TestSaveUpload_DisplayVariant_TransparentPNGStaysPNG(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindLogo, "logo.png", newTransparentPNGBytes(t, 20, 20), 7)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	variant := result.Variants[0]
	assert.Equal(t, "display", variant.Variant)
	assert.Equal(t, "image/png", variant.MimeType)
	assert.True(t, strings.HasSuffix(variant.Filename, ".png"))

	onDisk, err := os.ReadFile(variant.StoragePath)
	require.NoError(t, err)
	decoded, err := png.Decode(bytes.NewReader(onDisk))
	require.NoError(t, err)
	nrgba, ok := decoded.(*image.NRGBA)
	require.True(t, ok, "decoded display png must be NRGBA to carry alpha")
	_, _, _, a := nrgba.At(0, 0).RGBA()
	assert.NotEqual(t, uint32(0xffff), a, "the originally-transparent left half must stay transparent in the display variant")
}

func TestSaveUpload_DisplayVariant_OpaqueImageBecomesJPEG(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.png", newOpaquePNGBytes(t, 20, 20), 7)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	assert.Equal(t, "image/jpeg", result.Variants[0].MimeType)
	assert.True(t, strings.HasSuffix(result.Variants[0].Filename, ".jpg"))
}

func TestSaveUpload_SVGLogoProducesNoDisplayVariant(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	svgData := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>`)
	result, err := svc.SaveUpload(models.MediaKindLogo, "logo.svg", svgData, 7)
	require.NoError(t, err)
	assert.Empty(t, result.Variants, "SVG must never be rasterized into a display variant")
}

func TestSaveUpload_AnimatedGIFDisplayStaysAnimated(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092", ffmpegBinary)

	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.gif", newGIFBytes(t, 3), 0)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	variant := result.Variants[0]
	assert.Equal(t, "image/webp", variant.MimeType, "an animated GIF's display must be an animated WebP, never a static frame")

	onDisk, err := os.ReadFile(variant.StoragePath)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, countANMFChunks(onDisk), 2, "the animated display webp must contain at least 2 ANMF frames")
}

func TestSaveUpload_StaticGIFDisplayIsStatic(t *testing.T) {
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092")

	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.gif", newGIFBytes(t, 1), 0)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	assert.NotEqual(t, "image/webp", result.Variants[0].MimeType, "a single-frame GIF must take the static display path")
}

func TestIsAnimatedGIFData(t *testing.T) {
	assert.True(t, IsAnimatedGIFData(newGIFBytes(t, 3)))
	assert.False(t, IsAnimatedGIFData(newGIFBytes(t, 1)))
	assert.False(t, IsAnimatedGIFData([]byte("not a gif")))
}
