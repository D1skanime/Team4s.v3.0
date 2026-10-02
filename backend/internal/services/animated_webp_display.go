package services

import (
	"bytes"
	"fmt"
	"image"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// IsAnimatedWebPData erkennt animierte WebP-Rohdaten am Dateikopf: RIFF/WEBP-Container mit
// VP8X-Chunk und gesetztem Animations-Flag (Bit 0x02 im Flag-Byte, Offset 20). Zentrale
// Implementierung fuer die Ablehnungs-Pruefung (handlers, nur noch fuer asset_type=
// segment_preview, D-20) und die Display-/Thumb-Erzeugung in diesem Package.
func IsAnimatedWebPData(data []byte) bool {
	if len(data) < 21 || !bytes.Equal(data[0:4], []byte("RIFF")) || !bytes.Equal(data[8:12], []byte("WEBP")) {
		return false
	}
	return bytes.Equal(data[12:16], []byte("VP8X")) && data[20]&0x02 != 0
}

// GenerateAnimatedDisplayViaVips erzeugt aus animierten WebP-Rohdaten eine verkleinerte, weiterhin
// animierte WebP-"display"-Variante via libvips' vipsthumbnail-CLI (D-21): weder
// golang.org/x/image/webp (kann ANMF-Animationsframes nicht dekodieren, nur VP8/VP8L auf
// oberster RIFF-Ebene) noch ffmpeg (siehe 173-RESEARCH.md: kann animiertes WebP nicht
// dekodieren) koennen das leisten -- vipsthumbnail ist das einzige im Projekt verfuegbare
// Werkzeug, das dabei alle Frames erhaelt (verifiziert: n-pages bleibt unveraendert).
//
// "[n=-1]" laedt alle Seiten/Frames der Quelle; "-s WxHx>" begrenzt die lange Kante auf maxEdge
// OHNE hochzuskalieren (das Geometrie-Suffix ">" ist vipsthumbnail-eigenes Verhalten, analog zu
// ImageMagick, und wurde gegen eine echte 200x100-Quelle verifiziert: < maxEdge bleibt
// unveraendert, > maxEdge wird auf maxEdge herunterskaliert). Sicherheitsmuster: fester
// Argument-Vektor (exec.Command), keine Shell, keine String-Interpolation von Dateinamen in einen
// Kommandostring -- identisch zu GenerateAnimatedWebPDisplay (ffmpeg-Pfad fuer animierte GIFs).
func GenerateAnimatedDisplayViaVips(vipsThumbnailPath string, data []byte, srcExt string, maxEdge int) (webpData []byte, width int, height int, err error) {
	if strings.TrimSpace(vipsThumbnailPath) == "" {
		return nil, 0, 0, fmt.Errorf("vipsthumbnail ist nicht konfiguriert")
	}
	tmpDir, mkErr := os.MkdirTemp("", "display-anim-vips-*")
	if mkErr != nil {
		return nil, 0, 0, fmt.Errorf("temp-verzeichnis anlegen: %w", mkErr)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "src"+srcExt)
	if writeErr := os.WriteFile(srcPath, data, 0o644); writeErr != nil {
		return nil, 0, 0, fmt.Errorf("animations-quelle schreiben: %w", writeErr)
	}
	destPath := filepath.Join(tmpDir, "display.webp")

	cmd := exec.Command(
		vipsThumbnailPath,
		fmt.Sprintf("%s[n=-1]", srcPath),
		"-s", fmt.Sprintf("%dx%d>", maxEdge, maxEdge),
		"-o", destPath,
	)
	if output, cmdErr := cmd.CombinedOutput(); cmdErr != nil {
		return nil, 0, 0, fmt.Errorf("vipsthumbnail animierte display-erzeugung fehlgeschlagen: %w (%s)", cmdErr, strings.TrimSpace(string(output)))
	}

	out, readErr := os.ReadFile(destPath)
	if readErr != nil {
		return nil, 0, 0, fmt.Errorf("animierte display-datei lesen: %w", readErr)
	}
	cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(out))
	if cfgErr != nil {
		return nil, 0, 0, fmt.Errorf("display-webp-dimensionen ermitteln: %w", cfgErr)
	}
	return out, cfg.Width, cfg.Height, nil
}

// ExtractFirstFrameViaVips liest ausschliesslich den ersten Frame einer animierten Quelle (ohne
// "[n=-1]" laedt vipsthumbnail standardmaessig nur Seite/Frame 0) und exportiert ihn als JPEG,
// begrenzt auf maxEdge lange Kante (nie hochskaliert, gleiches ">"-Geometriesuffix wie
// GenerateAnimatedDisplayViaVips). Wird fuer Thumbnails animierter WebP-Dateien benoetigt: anders
// als animierte GIFs (volle Frame-0-Unterstuetzung ueber die Standardbibliothek image/gif) kann
// golang.org/x/image/webp ANMF-Animationsframes ueberhaupt nicht dekodieren.
func ExtractFirstFrameViaVips(vipsThumbnailPath string, data []byte, srcExt string, maxEdge int) (jpegData []byte, width int, height int, err error) {
	if strings.TrimSpace(vipsThumbnailPath) == "" {
		return nil, 0, 0, fmt.Errorf("vipsthumbnail ist nicht konfiguriert")
	}
	tmpDir, mkErr := os.MkdirTemp("", "frame0-vips-*")
	if mkErr != nil {
		return nil, 0, 0, fmt.Errorf("temp-verzeichnis anlegen: %w", mkErr)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "src"+srcExt)
	if writeErr := os.WriteFile(srcPath, data, 0o644); writeErr != nil {
		return nil, 0, 0, fmt.Errorf("quelle schreiben: %w", writeErr)
	}
	destPath := filepath.Join(tmpDir, "frame0.jpg")

	cmd := exec.Command(
		vipsThumbnailPath,
		srcPath,
		"-s", fmt.Sprintf("%dx%d>", maxEdge, maxEdge),
		"-o", destPath,
	)
	if output, cmdErr := cmd.CombinedOutput(); cmdErr != nil {
		return nil, 0, 0, fmt.Errorf("vipsthumbnail frame-0-erzeugung fehlgeschlagen: %w (%s)", cmdErr, strings.TrimSpace(string(output)))
	}

	out, readErr := os.ReadFile(destPath)
	if readErr != nil {
		return nil, 0, 0, fmt.Errorf("frame-0-datei lesen: %w", readErr)
	}
	cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(out))
	if cfgErr != nil {
		return nil, 0, 0, fmt.Errorf("frame-0-dimensionen ermitteln: %w", cfgErr)
	}
	return out, cfg.Width, cfg.Height, nil
}
