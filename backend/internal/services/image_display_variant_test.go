package services

import (
	"bytes"
	"image"
	"image/png"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func decodePNG(t *testing.T, data []byte) image.Image {
	t.Helper()
	img, err := png.Decode(bytes.NewReader(data))
	require.NoError(t, err)
	return img
}

func TestEncodeStaticDisplayVariant_NoUpscale(t *testing.T) {
	data, ext, mimeType, w, h, err := EncodeStaticDisplayVariant(decodePNG(t, newOpaquePNGBytes(t, 300, 200)), 300, 200)
	require.NoError(t, err)
	assert.NotEmpty(t, data)
	assert.Equal(t, "jpg", ext)
	assert.Equal(t, "image/jpeg", mimeType)
	assert.Equal(t, 300, w)
	assert.Equal(t, 200, h)
}

func TestEncodeStaticDisplayVariant_CapsLongEdge(t *testing.T) {
	_, _, _, w, h, err := EncodeStaticDisplayVariant(decodePNG(t, newOpaquePNGBytes(t, 3000, 1500)), 3000, 1500)
	require.NoError(t, err)
	assert.Equal(t, DisplayMaxLongEdge, w)
	assert.Equal(t, 960, h)
}

func TestEncodeStaticDisplayVariant_TransparentBecomesPNG(t *testing.T) {
	_, ext, mimeType, _, _, err := EncodeStaticDisplayVariant(decodePNG(t, newTransparentPNGBytes(t, 40, 40)), 40, 40)
	require.NoError(t, err)
	assert.Equal(t, "png", ext)
	assert.Equal(t, "image/png", mimeType)
}
