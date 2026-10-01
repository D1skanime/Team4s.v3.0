package services

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/disintegration/imaging"
)

// requireFFmpeg liefert den absoluten Pfad zur installierten ffmpeg-Binary oder bricht den Test
// per t.Fatal ab -- exakt das etablierte Test-Muster aus segment_render_service_test.go
// (TestFFmpegExecutableAuthenticatedInputRejectsCrossOriginRedirect), echtes ffmpeg statt Mocks.
func requireFFmpeg(t *testing.T) string {
	t.Helper()
	binary, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Fatal("installed FFmpeg is required for this test")
	}
	return binary
}

// generateFourColorFixture erzeugt ein 4-Sekunden-Synthetik-Video (1 fps, ein Keyframe pro
// Sekunde) mit je einer anderen Farbe pro Sekunde (rot/gruen/blau/gelb), damit Tests pruefen
// koennen, ob ein gegebener Offset tatsaechlich NICHT mehr den Frame bei t=0 (rot) liefert.
// Vier einzelne PNG-Frames + "-framerate 1 -i frame%d.png" statt lavfi-concat, weil
// lavfi-concat von vier separaten "color=...:d=1:r=1"-Quellen in der Praxis nur 2 statt 4
// Frames/Sekunden im Container ablegt (live mit ffprobe verifiziert) -- die Einzelbild-Variante
// liefert verlaesslich nb_frames=4/duration=4.0s.
func generateFourColorFixture(t *testing.T, ffmpegBinary, outputPath string) {
	t.Helper()
	dir := filepath.Dir(outputPath)
	colors := []string{"red", "green", "blue", "yellow"}
	for i, color := range colors {
		framePath := filepath.Join(dir, fmt.Sprintf("fixture-frame-%d.png", i+1))
		gen := exec.Command(ffmpegBinary, "-y", "-f", "lavfi", "-i", fmt.Sprintf("color=c=%s:s=16x16", color), "-frames:v", "1", framePath)
		if output, err := gen.CombinedOutput(); err != nil {
			t.Fatalf("generate color frame %q: %v\n%s", color, err, output)
		}
	}
	framePattern := filepath.Join(dir, "fixture-frame-%d.png")
	assemble := exec.Command(ffmpegBinary, "-y", "-framerate", "1", "-i", framePattern, "-pix_fmt", "yuv420p", "-r", "1", outputPath)
	if output, err := assemble.CombinedOutput(); err != nil {
		t.Fatalf("assemble four-color fixture: %v\n%s", err, output)
	}
}

// TestSaveSegmentVideoPreview_ExtractsAt35Percent beweist D-05: saveSegmentVideoPreview extrahiert
// nicht mehr bei Sekunde 0, sondern bei ca. 35% der Videodauer. Das Fixture-Video hat eine andere
// Farbe pro Sekunde (rot bei t=0, gruen bei t=1-2); bei einer 4-Sekunden-Datei liegt 35% bei 1.4s,
// also im gruenen Frame -- das extrahierte Pixel darf daher NICHT der Farbe bei t=0 (rot) entsprechen.
func TestSaveSegmentVideoPreview_ExtractsAt35Percent(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	dir := t.TempDir()
	videoPath := filepath.Join(dir, "fixture.mp4")
	generateFourColorFixture(t, ffmpegBinary, videoPath)

	svc := NewMediaService(dir, "http://localhost:8092", ffmpegBinary)
	result, err := svc.saveSegmentVideoPreview(videoPath)
	if err != nil {
		t.Fatalf("saveSegmentVideoPreview: %v", err)
	}

	img, err := imaging.Open(result.StoragePath)
	if err != nil {
		t.Fatalf("open extracted preview: %v", err)
	}
	bounds := img.Bounds()
	c := img.At(bounds.Dx()/2, bounds.Dy()/2)
	r, g, b, _ := c.RGBA()

	// t=0-Frame ist rot (deutlich dominanter R-Kanal, G/B nahe Null). Ein bei ~35% der
	// 4-Sekunden-Fixture (1.4s, also NACH dem roten Frame) extrahiertes Pixel darf dieses Muster
	// nicht zeigen -- der eigentliche Beweis fuer D-05 (Offset != 0).
	looksLikeT0Red := r > g+0x3000 && r > b+0x3000
	if looksLikeT0Red {
		t.Fatalf("extracted pixel still matches t=0 color (red), offset was not applied: r=%d g=%d b=%d", r>>8, g>>8, b>>8)
	}
}

// TestExtractImageFrame_WritesFrameToDestPath beweist, dass ExtractImageFrame den Frame als
// lesbares JPEG genau nach destPath schreibt und nichts neben dem Quellvideo erzeugt. Die
// dauerhafte Ablage uebernimmt danach der globale Anime-Upload-Pfad (Phase 172).
func TestExtractImageFrame_WritesFrameToDestPath(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)

	sourceDir := t.TempDir()
	videoPath := filepath.Join(sourceDir, "source.mp4")
	generateFourColorFixture(t, ffmpegBinary, videoPath)

	svc := NewMediaService(t.TempDir(), "http://localhost:8092", ffmpegBinary)

	destPath := filepath.Join(t.TempDir(), "frames", "frame.jpg")
	if err := svc.ExtractImageFrame(videoPath, 1.4, destPath); err != nil {
		t.Fatalf("ExtractImageFrame: %v", err)
	}
	if _, err := imaging.Open(destPath); err != nil {
		t.Fatalf("expected extracted frame at %q: %v", destPath, err)
	}

	neighborPath := videoPath + ".preview.jpg"
	if _, err := imaging.Open(neighborPath); err == nil {
		t.Fatalf("unexpected file written next to source video: %s", neighborPath)
	}
}
