package handlers

import (
	"bytes"
	"fmt"
)

// animatedWebPMessage ist die Antwort fuer animierte WebP-Dateien: weder der Go-Decoder
// (golang.org/x/image/webp) noch ffmpeg koennen sie lesen, daher klare Ablehnung statt 500.
const animatedWebPMessage = "Animierte WebP-Dateien werden nicht unterstützt. Bitte JPG, PNG oder ein nicht animiertes WebP hochladen."

// isAnimatedWebP erkennt animierte WebP-Dateien am Dateikopf: RIFF/WEBP-Container mit
// VP8X-Chunk und gesetztem Animations-Flag (Bit 0x02 im Flag-Byte, Offset 20).
func isAnimatedWebP(head []byte) bool {
	if len(head) < 21 || !bytes.Equal(head[0:4], []byte("RIFF")) || !bytes.Equal(head[8:12], []byte("WEBP")) {
		return false
	}
	return bytes.Equal(head[12:16], []byte("VP8X")) && head[20]&0x02 != 0
}

// rvmFileRejection prueft Dateityp und animierte WebP-Dateien fuer Release-Medien (Upload und
// Ersetzen). rejected=false bedeutet: Datei ist erlaubt.
func rvmFileRejection(mimeType string, data []byte) (message string, code string, rejected bool) {
	if !rvmAllowedMIMETypes[mimeType] {
		return fmt.Sprintf("nicht erlaubter dateityp: %s", mimeType), "INVALID_MIME_TYPE", true
	}
	if mimeType == "image/webp" && isAnimatedWebP(data) {
		return animatedWebPMessage, "ANIMATED_WEBP_UNSUPPORTED", true
	}
	return "", "", false
}
