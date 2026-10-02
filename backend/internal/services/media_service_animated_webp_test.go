package services

import (
	"os"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSaveUpload_AnimatedWebPDisplayStaysAnimated belegt D-20/D-21: ein Fansub-Logo/Banner-
// Upload mit animiertem WebP produziert eine "display"-Variante, die selbst weiterhin animiert
// ist (>= 2 ANMF-Frames), via vipsthumbnail statt der generischen image.Decode-Behandlung (die
// bei ANMF-Animationsframes fehlschlagen wuerde).
func TestSaveUpload_AnimatedWebPDisplayStaysAnimated(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	vipsBinary := requireVipsThumbnail(t)
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092", ffmpegBinary).
		WithVipsThumbnailPath(vipsBinary)

	data := newAnimatedWebPFixture(t, ffmpegBinary, 200, 100)
	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.webp", data, 0)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	variant := result.Variants[0]
	assert.Equal(t, "image/webp", variant.MimeType)

	onDisk, err := os.ReadFile(variant.StoragePath)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, countANMFChunks(onDisk), 2, "die animierte display-webp-Variante muss mindestens 2 ANMF-Frames enthalten")
}

// TestSaveUpload_AnimatedWebPDisplayFallsBackToOriginalWithoutVips belegt den Rueckfall-Vertrag
// (D-20/D-21): ohne konfigurierten vipsthumbnail-Pfad bleibt das unveraenderte Original-WebP die
// display-Variante -- niemals ein statisches Standbild fuer eine Animation.
func TestSaveUpload_AnimatedWebPDisplayFallsBackToOriginalWithoutVips(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	dir := t.TempDir()
	svc := NewMediaService(dir, "http://localhost:8092", ffmpegBinary) // kein WithVipsThumbnailPath

	data := newAnimatedWebPFixture(t, ffmpegBinary, 200, 100)
	result, err := svc.SaveUpload(models.MediaKindBanner, "banner.webp", data, 0)
	require.NoError(t, err)
	require.Len(t, result.Variants, 1)
	variant := result.Variants[0]
	assert.Equal(t, "image/webp", variant.MimeType)

	onDisk, err := os.ReadFile(variant.StoragePath)
	require.NoError(t, err)
	assert.True(t, IsAnimatedWebPData(onDisk), "ohne vipsthumbnail muss die unveraenderte, weiterhin animierte Original-Datei als display dienen")
}
