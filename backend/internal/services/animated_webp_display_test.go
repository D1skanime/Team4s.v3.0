package services

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
)

// requireVipsThumbnail liefert den absoluten Pfad zur installierten vipsthumbnail-Binary (D-21,
// vips-tools) oder bricht den Test per t.Fatal ab -- analoges Muster zu requireFFmpeg.
func requireVipsThumbnail(t *testing.T) string {
	t.Helper()
	binary, err := exec.LookPath("vipsthumbnail")
	if err != nil {
		t.Fatal("installed vipsthumbnail (vips-tools) is required for this test")
	}
	return binary
}

// webpHeader baut einen minimalen RIFF/WEBP-Header mit dem angegebenen zweiten Chunk-Typ und
// VP8X-Flag-Byte -- genutzt, um IsAnimatedWebPData ohne eine echte WebP-Datei zu pruefen.
func webpHeader(chunk string, flags byte) []byte {
	head := append([]byte("RIFF"), 0, 0, 0, 0)
	head = append(head, []byte("WEBP"+chunk)...)
	head = append(head, 10, 0, 0, 0)
	return append(head, flags, 0, 0, 0)
}

func TestIsAnimatedWebPData(t *testing.T) {
	cases := []struct {
		name string
		head []byte
		want bool
	}{
		{"animiertes VP8X", webpHeader("VP8X", 0x02), true},
		{"VP8X mit Alpha, nicht animiert", webpHeader("VP8X", 0x10), false},
		{"einfaches VP8", webpHeader("VP8 ", 0x00), false},
		{"verlustfreies VP8L", webpHeader("VP8L", 0x00), false},
		{"kein WebP", []byte("PNG-Datei-ohne-RIFF-Header-xxxx"), false},
		{"zu kurz", []byte("RIFF"), false},
	}
	for _, tc := range cases {
		if got := IsAnimatedWebPData(tc.head); got != tc.want {
			t.Errorf("%s: IsAnimatedWebPData = %v, want %v", tc.name, got, tc.want)
		}
	}
}

// newAnimatedGIFFixture erzeugt ein animiertes GIF (3 Vollfarb-Frames) mit den angegebenen
// Pixel-Massen -- Ausgangsmaterial, das per ffmpeg in ein animiertes WebP umgewandelt wird (es
// existiert keine reine Go-Bibliothek, die animiertes WebP encodieren kann).
func newAnimatedGIFFixture(t *testing.T, width, height int) []byte {
	t.Helper()
	palette := []color.Color{
		color.RGBA{R: 255, A: 255},
		color.RGBA{G: 255, A: 255},
		color.RGBA{B: 255, A: 255},
	}
	anim := &gif.GIF{}
	for frameIdx := range palette {
		frame := image.NewPaletted(image.Rect(0, 0, width, height), palette)
		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				frame.SetColorIndex(x, y, uint8(frameIdx))
			}
		}
		anim.Image = append(anim.Image, frame)
		anim.Delay = append(anim.Delay, 10)
	}
	var buf bytes.Buffer
	if err := gif.EncodeAll(&buf, anim); err != nil {
		t.Fatalf("encode animated gif fixture: %v", err)
	}
	return buf.Bytes()
}

// newAnimatedWebPFixture erzeugt ein animiertes WebP (3 Frames) via ffmpeg (libwebp_anim) aus
// einem animierten GIF -- fuer Tests von GenerateAnimatedDisplayViaVips/ExtractFirstFrameViaVips,
// die eine echte, mehrframige WebP-Quelle benoetigen (ohne eine Binaer-Fixture einzuchecken).
func newAnimatedWebPFixture(t *testing.T, ffmpegBinary string, width, height int) []byte {
	t.Helper()
	tmpDir := t.TempDir()
	srcPath := filepath.Join(tmpDir, "src.gif")
	if err := os.WriteFile(srcPath, newAnimatedGIFFixture(t, width, height), 0o644); err != nil {
		t.Fatalf("animated gif source schreiben: %v", err)
	}
	destPath := filepath.Join(tmpDir, "out.webp")
	cmd := exec.Command(ffmpegBinary, "-y", "-i", srcPath, "-loop", "0", "-vcodec", "libwebp_anim", destPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("animiertes webp per ffmpeg erzeugen: %v (%s)", err, string(output))
	}
	data, err := os.ReadFile(destPath)
	if err != nil {
		t.Fatalf("erzeugtes animiertes webp lesen: %v", err)
	}
	if !IsAnimatedWebPData(data) {
		t.Fatal("per ffmpeg erzeugtes webp wurde nicht als animiert erkannt -- test-fixture ungueltig")
	}
	return data
}

// TestGenerateAnimatedDisplayViaVips_PreservesFramesAndCapsEdge belegt D-21: die erzeugte
// "display"-Variante behaelt alle Frames der Quelle (via vipsheader n-pages, kein direkter
// Go-Decoder fuer animiertes WebP verfuegbar) und skaliert bei Ueberschreiten von maxEdge herunter
// -- ohne, bei kleineren Quellen, hochzuskalieren.
func TestGenerateAnimatedDisplayViaVips_PreservesFramesAndCapsEdge(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	vipsBinary := requireVipsThumbnail(t)

	small := newAnimatedWebPFixture(t, ffmpegBinary, 200, 100)
	webpData, w, h, err := GenerateAnimatedDisplayViaVips(vipsBinary, small, ".webp", DisplayAnimatedMaxEdge)
	assert.NoError(t, err)
	assert.Equal(t, 200, w, "kleinere Quelle darf nicht hochskaliert werden")
	assert.Equal(t, 100, h)
	assertWebPPageCount(t, vipsBinary, webpData, 3)

	large := newAnimatedWebPFixture(t, ffmpegBinary, 1600, 900)
	webpData2, w2, h2, err2 := GenerateAnimatedDisplayViaVips(vipsBinary, large, ".webp", DisplayAnimatedMaxEdge)
	assert.NoError(t, err2)
	assert.Equal(t, DisplayAnimatedMaxEdge, w2, "lange Kante muss auf DisplayAnimatedMaxEdge gekappt werden")
	assert.Less(t, h2, 900)
	assertWebPPageCount(t, vipsBinary, webpData2, 3)
}

// TestGenerateAnimatedDisplayViaVips_MissingBinaryErrors belegt den Rueckfall-Vertrag: ohne
// konfigurierten vipsthumbnail-Pfad liefert die Funktion einen Fehler (kein Panic, kein leeres
// Ergebnis), damit Aufrufer non-fatal auf das unveraenderte Original zurueckfallen koennen.
func TestGenerateAnimatedDisplayViaVips_MissingBinaryErrors(t *testing.T) {
	_, _, _, err := GenerateAnimatedDisplayViaVips("", []byte("not-a-real-webp"), ".webp", DisplayAnimatedMaxEdge)
	assert.Error(t, err)
}

// TestExtractFirstFrameViaVips_ReturnsStaticJPEGFrame0 belegt: die Thumbnail-Erzeugung fuer
// animiertes WebP liefert ein einzelnes, statisches JPEG (Frame 0) -- benoetigt, weil
// golang.org/x/image/webp ANMF-Animationsframes ueberhaupt nicht dekodieren kann.
func TestExtractFirstFrameViaVips_ReturnsStaticJPEGFrame0(t *testing.T) {
	ffmpegBinary := requireFFmpeg(t)
	vipsBinary := requireVipsThumbnail(t)

	data := newAnimatedWebPFixture(t, ffmpegBinary, 400, 200)
	jpegData, w, h, err := ExtractFirstFrameViaVips(vipsBinary, data, ".webp", 300)
	assert.NoError(t, err)
	assert.Greater(t, w, 0)
	assert.Greater(t, h, 0)

	decoded, format, decErr := image.Decode(bytes.NewReader(jpegData))
	assert.NoError(t, decErr)
	assert.Equal(t, "jpeg", format)
	assert.NotNil(t, decoded)
}

// assertWebPPageCount liest die Seiten-/Frame-Anzahl einer WebP-Datei per "vipsheader -a" aus
// und vergleicht sie mit want -- die einzige verlaessliche Methode in diesem Projekt, animierte
// WebP-Frames zu zaehlen (kein Go-Decoder unterstuetzt ANMF).
func assertWebPPageCount(t *testing.T, vipsThumbnailBinary string, data []byte, want int) {
	t.Helper()
	vipsheaderBinary := filepath.Join(filepath.Dir(vipsThumbnailBinary), "vipsheader")
	if _, err := exec.LookPath(vipsheaderBinary); err != nil {
		vipsheaderBinary = "vipsheader"
	}
	tmpFile := filepath.Join(t.TempDir(), "check.webp")
	if err := os.WriteFile(tmpFile, data, 0o644); err != nil {
		t.Fatalf("webp zum header-check schreiben: %v", err)
	}
	cmd := exec.Command(vipsheaderBinary, "-a", tmpFile)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("vipsheader fehlgeschlagen: %v (%s)", err, string(output))
	}
	if !bytes.Contains(output, []byte("n-pages: "+strconv.Itoa(want))) {
		t.Fatalf("erwartete n-pages: %d, vipsheader-ausgabe: %s", want, string(output))
	}
}
