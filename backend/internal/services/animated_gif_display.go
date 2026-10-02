package services

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	_ "golang.org/x/image/webp"
)

// DisplayAnimatedMaxEdge begrenzt die lange Kante der animierten WebP-"display"-Variante, die
// aus animierten GIFs erzeugt wird (D-19).
const DisplayAnimatedMaxEdge = 960

// IsAnimatedGIFData zaehlt die Frames der uebergebenen GIF-Rohdaten und meldet true, wenn mehr
// als ein Frame enthalten ist. Ersetzt die vorherige MediaUploadHandler.isAnimatedGIF, die
// unconditional true zurueckgab (Phase 173 Review-Korrektur-Bugfix) -- hier wird tatsaechlich
// gif.DecodeAll ausgewertet, exakt wie generateRVMThumbnail/generateRVMDisplay es bereits fuer
// die Frame-0-Extraktion tun.
func IsAnimatedGIFData(data []byte) bool {
	decoded, err := gif.DecodeAll(bytes.NewReader(data))
	if err != nil {
		return false
	}
	return len(decoded.Image) > 1
}

// GenerateAnimatedWebPDisplay erzeugt aus einer animierten GIF-Quelle (srcGIFPath) eine
// animierte WebP-"display"-Variante (destWebPPath): Endlosschleife, lange Kante begrenzt auf
// DisplayAnimatedMaxEdge, nie hochskaliert. Verschoben aus
// handlers/media_upload_image.go (Phase 173 Review-Korrektur) nach services, damit
// MediaService.SaveUpload (Fansub-Logo/Banner/Gruppenmedien) denselben Pfad direkt aufrufen
// kann, ohne dass services das handlers-Paket importieren muesste.
//
// Sicherheitsmuster: fester Argument-Vektor (exec.Command), keine Shell, keine String-
// Interpolation von Dateinamen in einen einzelnen Kommandostring -- identisch zum bereits
// geprueften Muster in media_service_segment.go (ExtractImageFrame).
func GenerateAnimatedWebPDisplay(ffmpegPath, srcGIFPath, destWebPPath string) error {
	if strings.TrimSpace(ffmpegPath) == "" {
		return fmt.Errorf("ffmpeg ist nicht konfiguriert")
	}
	scaleFilter := fmt.Sprintf(
		"scale='min(%d,iw)':'min(%d,ih)':force_original_aspect_ratio=decrease:flags=lanczos",
		DisplayAnimatedMaxEdge, DisplayAnimatedMaxEdge,
	)
	cmd := exec.Command(
		ffmpegPath, "-y",
		"-i", srcGIFPath,
		"-loop", "0",
		"-vf", scaleFilter,
		"-vcodec", "libwebp_anim",
		destWebPPath,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ffmpeg animierte webp-erzeugung fehlgeschlagen: %w (%s)", err, strings.TrimSpace(string(output)))
	}
	return nil
}

// GenerateAnimatedWebPDisplayFromBytes ist eine Bytes-in/Bytes-out-Variante von
// GenerateAnimatedWebPDisplay fuer Aufrufer, die (wie RVM-Upload/Replace und Fansub-
// Gruppenmedien) nur die rohen GIF-Bytes im Speicher haben, nicht bereits eine Datei auf
// Platte. Schreibt die Quelle in ein temporaeres Verzeichnis, ruft ffmpeg auf und liest das
// Ergebnis zurueck; das temporaere Verzeichnis wird in jedem Fall aufgeraeumt.
func GenerateAnimatedWebPDisplayFromBytes(ffmpegPath string, data []byte) (webpData []byte, width int, height int, err error) {
	tmpDir, mkErr := os.MkdirTemp("", "display-anim-*")
	if mkErr != nil {
		return nil, 0, 0, fmt.Errorf("temp-verzeichnis anlegen: %w", mkErr)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "src.gif")
	if writeErr := os.WriteFile(srcPath, data, 0o644); writeErr != nil {
		return nil, 0, 0, fmt.Errorf("gif-quelle schreiben: %w", writeErr)
	}
	destPath := filepath.Join(tmpDir, "display.webp")
	if genErr := GenerateAnimatedWebPDisplay(ffmpegPath, srcPath, destPath); genErr != nil {
		return nil, 0, 0, genErr
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
