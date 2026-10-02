package services

import (
	"bytes"
	"encoding/binary"
)

// StripWebPMetadata entfernt EXIF- und XMP-Chunks verlustfrei aus einem WebP-RIFF-Container
// (D-06/D-15: WebP-Originale behalten ihre echten Bild-Bytes, aber ohne EXIF/GPS-Metadaten).
// Nur die RIFF-Gesamtgroesse und -- falls vorhanden -- das VP8X-Flags-Byte des erweiterten
// Formats werden korrigiert; alle Bild-/Animations-/Alpha-Chunks bleiben byte-identisch. Daten,
// die kein wohlgeformter RIFF/WEBP-Container sind, werden unveraendert zurueckgegeben (kein
// Fehler) -- Aufrufer filtern bereits per mimeType == "image/webp" vor dem Aufruf.
func StripWebPMetadata(data []byte) ([]byte, error) {
	if len(data) < 12 || !bytes.Equal(data[0:4], []byte("RIFF")) || !bytes.Equal(data[8:12], []byte("WEBP")) {
		return data, nil
	}

	out := make([]byte, 12)
	copy(out, data[0:12])

	offset := 12
	vp8xFlagsOutIndex := -1
	for offset+8 <= len(data) {
		fourCC := string(data[offset : offset+4])
		size := binary.LittleEndian.Uint32(data[offset+4 : offset+8])
		chunkTotal := 8 + int(size)
		if size%2 == 1 {
			chunkTotal++ // RIFF-Chunks sind auf gerade Laenge gepolstert (1 Padding-Byte).
		}
		if offset+chunkTotal > len(data) || chunkTotal < 8 {
			// Unvollstaendiger/kaputter Chunk -- Rest unveraendert anhaengen und abbrechen.
			out = append(out, data[offset:]...)
			offset = len(data)
			break
		}

		if fourCC == "EXIF" || fourCC == "XMP " {
			offset += chunkTotal
			continue
		}

		if fourCC == "VP8X" {
			vp8xFlagsOutIndex = len(out) + 8
		}
		out = append(out, data[offset:offset+chunkTotal]...)
		offset += chunkTotal
	}

	if vp8xFlagsOutIndex >= 0 && vp8xFlagsOutIndex < len(out) {
		// VP8X-Flags-Byte: Bit3 = Exif, Bit2 = XMP (RFC "Extended WebP file header").
		out[vp8xFlagsOutIndex] &^= 0x08
		out[vp8xFlagsOutIndex] &^= 0x04
	}

	newRIFFSize := uint32(len(out) - 8)
	binary.LittleEndian.PutUint32(out[4:8], newRIFFSize)

	return out, nil
}
