package services

import (
	"bytes"
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// buildTestWebP assembles a minimal (not necessarily pixel-decodable) RIFF/WEBP container from
// a list of (fourCC, payload) chunks, computing the RIFF size header correctly. Used to test
// StripWebPMetadata's chunk-walking logic in isolation, without depending on a real libwebp
// encoder for EXIF/XMP-bearing fixtures.
func buildTestWebP(t *testing.T, chunks [][2]any) []byte {
	t.Helper()
	var body bytes.Buffer
	for _, chunk := range chunks {
		fourCC := chunk[0].(string)
		payload := chunk[1].([]byte)
		require.Len(t, fourCC, 4)
		body.WriteString(fourCC)
		sizeBuf := make([]byte, 4)
		binary.LittleEndian.PutUint32(sizeBuf, uint32(len(payload)))
		body.Write(sizeBuf)
		body.Write(payload)
		if len(payload)%2 == 1 {
			body.WriteByte(0)
		}
	}

	var out bytes.Buffer
	out.WriteString("RIFF")
	sizeBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(sizeBuf, uint32(4+body.Len())) // "WEBP" + chunks
	out.Write(sizeBuf)
	out.WriteString("WEBP")
	out.Write(body.Bytes())
	return out.Bytes()
}

func TestStripWebPMetadata_RemovesEXIFChunkKeepsImageDataByteIdentical(t *testing.T) {
	imageChunk := []byte{0x01, 0x02, 0x03, 0x04, 0x05}
	exifChunk := []byte("fake-exif-payload-with-gps-coords")
	data := buildTestWebP(t, [][2]any{
		{"VP8 ", imageChunk},
		{"EXIF", exifChunk},
	})

	stripped, err := StripWebPMetadata(data)
	require.NoError(t, err)

	assert.False(t, bytes.Contains(stripped, []byte("EXIF")), "EXIF chunk must be removed entirely")
	assert.True(t, bytes.Contains(stripped, imageChunk), "image pixel chunk must survive byte-identical")

	// RIFF size header must be corrected to reflect the shorter container.
	riffSize := binary.LittleEndian.Uint32(stripped[4:8])
	assert.Equal(t, uint32(len(stripped)-8), riffSize)
}

func TestStripWebPMetadata_RemovesXMPChunk(t *testing.T) {
	imageChunk := []byte{0xAA, 0xBB, 0xCC}
	xmpChunk := []byte("<x:xmpmeta>fake</x:xmpmeta>")
	data := buildTestWebP(t, [][2]any{
		{"VP8 ", imageChunk},
		{"XMP ", xmpChunk},
	})

	stripped, err := StripWebPMetadata(data)
	require.NoError(t, err)

	assert.False(t, bytes.Contains(stripped, []byte("XMP ")), "XMP chunk must be removed entirely")
	assert.True(t, bytes.Contains(stripped, imageChunk))
}

func TestStripWebPMetadata_ClearsVP8XExifAndXMPFlags(t *testing.T) {
	// VP8X chunk data: flags byte (bit3=Exif, bit2=XMP set) + 3 reserved + 3 width-1 + 3 height-1.
	vp8xPayload := []byte{0x0C, 0, 0, 0, 7, 0, 0, 7, 0, 0} // 0x0C = 0b00001100 (Exif|XMP)
	imageChunk := []byte{0x01, 0x02, 0x03, 0x04}
	data := buildTestWebP(t, [][2]any{
		{"VP8X", vp8xPayload},
		{"EXIF", []byte("exif-data")},
		{"XMP ", []byte("xmp-data")},
		{"VP8L", imageChunk},
	})

	stripped, err := StripWebPMetadata(data)
	require.NoError(t, err)
	require.False(t, bytes.Contains(stripped, []byte("EXIF")))
	require.False(t, bytes.Contains(stripped, []byte("XMP ")))

	vp8xIdx := bytes.Index(stripped, []byte("VP8X"))
	require.GreaterOrEqual(t, vp8xIdx, 0)
	flagsByte := stripped[vp8xIdx+8]
	assert.Equal(t, byte(0), flagsByte&0x08, "Exif flag must be cleared")
	assert.Equal(t, byte(0), flagsByte&0x04, "XMP flag must be cleared")
}

func TestStripWebPMetadata_NoMetadataIsByteIdentical(t *testing.T) {
	imageChunk := []byte{0x01, 0x02, 0x03}
	data := buildTestWebP(t, [][2]any{
		{"VP8 ", imageChunk},
	})

	stripped, err := StripWebPMetadata(data)
	require.NoError(t, err)
	assert.Equal(t, data, stripped, "a WebP without EXIF/XMP must round-trip byte-for-byte")
}

func TestStripWebPMetadata_NonWebPDataPassesThroughUnchanged(t *testing.T) {
	data := []byte("not a webp file at all")
	out, err := StripWebPMetadata(data)
	require.NoError(t, err)
	assert.Equal(t, data, out)
}
