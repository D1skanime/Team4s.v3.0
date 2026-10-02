package handlers

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"image"
	"image/color"
	"image/gif"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// MockMediaUploadRepository implements MediaUploadRepository for testing
type MockMediaUploadRepository struct {
	assets       map[string]*models.UploadMediaAsset
	files        map[string][]*models.UploadMediaFile
	joinTable    map[string]map[int64]bool
	legacySchema bool
}

func NewMockMediaUploadRepository() *MockMediaUploadRepository {
	return &MockMediaUploadRepository{
		assets:       make(map[string]*models.UploadMediaAsset),
		files:        make(map[string][]*models.UploadMediaFile),
		joinTable:    make(map[string]map[int64]bool),
		legacySchema: true,
	}
}

func (m *MockMediaUploadRepository) SupportsLegacyUploadSchema(ctx context.Context) (bool, error) {
	return m.legacySchema, nil
}

func (m *MockMediaUploadRepository) CreateMediaAsset(ctx context.Context, asset *models.UploadMediaAsset) error {
	m.assets[asset.ID] = asset
	return nil
}

func (m *MockMediaUploadRepository) CreateMediaFile(ctx context.Context, file *models.UploadMediaFile) error {
	file.ID = int64(len(m.files[file.MediaID]) + 1)
	m.files[file.MediaID] = append(m.files[file.MediaID], file)
	return nil
}

func (m *MockMediaUploadRepository) CreateAnimeMedia(ctx context.Context, animeID int64, mediaID string, sortOrder int) error {
	if m.joinTable["anime"] == nil {
		m.joinTable["anime"] = make(map[int64]bool)
	}
	m.joinTable["anime"][animeID] = true
	return nil
}

func (m *MockMediaUploadRepository) CreateEpisodeMedia(ctx context.Context, episodeID int64, mediaID string, sortOrder int) error {
	if m.joinTable["episode"] == nil {
		m.joinTable["episode"] = make(map[int64]bool)
	}
	m.joinTable["episode"][episodeID] = true
	return nil
}

func (m *MockMediaUploadRepository) CreateFansubGroupMedia(ctx context.Context, groupID int64, mediaID string) error {
	if m.joinTable["fansub"] == nil {
		m.joinTable["fansub"] = make(map[int64]bool)
	}
	m.joinTable["fansub"][groupID] = true
	return nil
}

func (m *MockMediaUploadRepository) CreateReleaseMedia(ctx context.Context, releaseID int64, mediaID string, sortOrder int) error {
	if m.joinTable["release"] == nil {
		m.joinTable["release"] = make(map[int64]bool)
	}
	m.joinTable["release"][releaseID] = true
	return nil
}

func (m *MockMediaUploadRepository) GetMediaAsset(ctx context.Context, id string) (*models.UploadMediaAsset, error) {
	asset, ok := m.assets[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return asset, nil
}

func (m *MockMediaUploadRepository) GetMediaFiles(ctx context.Context, mediaID string) ([]models.UploadMediaFile, error) {
	files := m.files[mediaID]
	result := make([]models.UploadMediaFile, len(files))
	for i, f := range files {
		result[i] = *f
	}
	return result, nil
}

func (m *MockMediaUploadRepository) DeleteMediaAsset(ctx context.Context, id string) error {
	delete(m.assets, id)
	delete(m.files, id)
	return nil
}

func (m *MockMediaUploadRepository) WithTx(ctx context.Context, fn func(repo repository.MediaUploadRepo) error) error {
	return fn(m)
}

func TestMediaUploadHandler_ValidateFile(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	tests := []struct {
		name        string
		content     []byte
		size        int64
		expectError bool
		expectType  string
	}{
		{
			name: "valid jpeg",
			// JPEG magic bytes
			content:     []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46},
			size:        1024,
			expectError: false,
			expectType:  "image",
		},
		{
			name: "too large image",
			// JPEG magic bytes
			content:     []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46},
			size:        51 * 1024 * 1024, // 51 MB
			expectError: true,
		},
		{
			name:        "invalid file type",
			content:     []byte{0x00, 0x00, 0x00, 0x00},
			size:        1024,
			expectError: true,
		},
		{
			name: "valid mp4 video",
			// MP4 magic bytes with ftyp box signature
			content: []byte{
				0x00, 0x00, 0x00, 0x20, // box size
				0x66, 0x74, 0x79, 0x70, // 'ftyp'
				0x69, 0x73, 0x6F, 0x6D, // 'isom' brand
				0x00, 0x00, 0x02, 0x00, // minor version
				0x69, 0x73, 0x6F, 0x6D, // compatible brands
				0x69, 0x73, 0x6F, 0x32,
				0x61, 0x76, 0x63, 0x31,
				0x6D, 0x70, 0x34, 0x31,
			},
			size:        10 * 1024 * 1024, // 10 MB
			expectError: false,
			expectType:  "video",
		},
		{
			name: "too large video",
			// MP4 magic bytes with ftyp box signature
			content: []byte{
				0x00, 0x00, 0x00, 0x20, // box size
				0x66, 0x74, 0x79, 0x70, // 'ftyp'
				0x69, 0x73, 0x6F, 0x6D, // 'isom' brand
				0x00, 0x00, 0x02, 0x00, // minor version
			},
			size:        301 * 1024 * 1024, // 301 MB
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := bytes.NewReader(tt.content)
			mimeType, format, err := handler.validateFile(mockMultipartFile{reader}, tt.size, "cover")

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectType, format)
				assert.NotEmpty(t, mimeType)
			}
		})
	}
}

func TestMediaUploadHandler_Delete(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	// Setup test asset
	mediaID := "test-media-123"
	asset := &models.UploadMediaAsset{
		ID:         mediaID,
		EntityType: "anime",
		EntityID:   123,
		AssetType:  "poster",
		Format:     "image",
		MimeType:   "image/jpeg",
		CreatedAt:  time.Now(),
	}
	repo.CreateMediaAsset(context.Background(), asset)

	// Create storage directory
	storagePath := filepath.Join(tmpDir, "anime", "123", "poster", mediaID)
	os.MkdirAll(storagePath, 0755)
	os.WriteFile(filepath.Join(storagePath, "original.webp"), []byte("test"), 0644)

	// Test delete
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/admin/media/:id", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:      22,
			DisplayName: "Operator",
		})
		handler.Delete(c)
	})

	req := httptest.NewRequest(http.MethodDelete, "/admin/media/"+mediaID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify asset is deleted
	_, err := repo.GetMediaAsset(context.Background(), mediaID)
	assert.Error(t, err)
}

func TestMediaUploadHandler_UploadRejectsMissingAuthIdentity(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	handler := newAdminMediaUploadHandler(repo, t.TempDir(), "http://localhost", "/usr/bin/ffmpeg")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/admin/upload", handler.Upload)

	req := newMediaUploadRequest(t)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "anmeldung erforderlich")
}

func TestMediaUploadHandler_UploadPersistsUploadedByFromAuthIdentity(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	handler := newAdminMediaUploadHandler(repo, t.TempDir(), "http://localhost", "/usr/bin/ffmpeg")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/admin/upload", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:      44,
			DisplayName: "Operator",
		})
		handler.Upload(c)
	})

	req := newMediaUploadRequest(t)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	if assert.Len(t, repo.assets, 1) {
		for _, asset := range repo.assets {
			if assert.NotNil(t, asset.UploadedBy) {
				assert.Equal(t, int64(44), *asset.UploadedBy)
			}
		}
	}
}

func TestMediaUploadHandler_UploadPreservesPNGOutputAndAlpha(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	w := performAuthorizedUpload(t, handler, newMediaUploadRequest(t))

	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	var originalPath string
	var thumbPath string
	for _, file := range payload.Files {
		switch file.Variant {
		case "original":
			originalPath = file.Path
		case "thumb":
			thumbPath = file.Path
		}
	}

	assert.True(t, strings.HasSuffix(originalPath, "/original.png"), originalPath)
	assert.True(t, strings.HasSuffix(thumbPath, "/thumb.png"), thumbPath)

	diskPath := filepath.Join(tmpDir, filepath.FromSlash(strings.TrimPrefix(originalPath, "/media/")))
	file, err := os.Open(diskPath)
	assert.NoError(t, err)
	defer file.Close()

	img, format, err := image.Decode(file)
	assert.NoError(t, err)
	assert.Equal(t, "png", format)

	_, _, _, alpha := img.At(0, 1).RGBA()
	assert.Equal(t, uint32(0), alpha)
}

func TestImageExtFromMime(t *testing.T) {
	tests := []struct {
		mimeType string
		want     string
	}{
		{mimeType: "image/png", want: "png"},
		{mimeType: "image/gif", want: "gif"},
		{mimeType: "image/jpeg", want: "jpg"},
		{mimeType: "image/webp", want: "webp"},
		{mimeType: "image/avif", want: "jpg"},
	}

	for _, tt := range tests {
		t.Run(tt.mimeType, func(t *testing.T) {
			assert.Equal(t, tt.want, imageExtFromMime(tt.mimeType))
		})
	}
}

// findUploadFile sucht eine Variante in payload.Files (z. B. "display", "thumb", "original").
func findUploadFile(files []models.UploadFileInfo, variant string) (models.UploadFileInfo, bool) {
	for _, f := range files {
		if f.Variant == variant {
			return f, true
		}
	}
	return models.UploadFileInfo{}, false
}

func diskPathForRelPath(tmpDir, relPath string) string {
	return filepath.Join(tmpDir, filepath.FromSlash(strings.TrimPrefix(relPath, "/media/")))
}

// newSizedPNGBytes erzeugt ein deterministisches PNG mit den angegebenen Pixel-Massen, fuer
// Tests der display-Variante (kein Upscale unterhalb des Caps, Kappung bei 1920px darueber).
func newSizedPNGBytes(t *testing.T, width, height int) []byte {
	t.Helper()

	var body bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 128, A: 255})
		}
	}
	if err := png.Encode(&body, img); err != nil {
		t.Fatalf("encode sized png: %v", err)
	}
	return body.Bytes()
}

// testStaticWebPBytes ist ein live mit ffmpeg erzeugtes, gueltiges 4x4-WebP (VP8-Chunk, nicht
// animiert) -- fest kodiert, damit der WebP-Originalerhaltungstest nicht selbst von einer
// installierten ffmpeg-Binary abhaengt. golang.org/x/image/webp dekodiert es (bounds 4x4) und
// mimetype.Detect erkennt es als "image/webp".
func testStaticWebPBytes(t *testing.T) []byte {
	t.Helper()
	const hexBytes = "5249464654000000574542505650382048000000f001009d012a04000400020034258802744c8001d5a11f8000fee6e8f047defb597cf0605fa58fa6247c4f8d12dbff37ffc407cfff95daa365bcf78393151d3f7b17cfff912c0000"
	data, err := hex.DecodeString(hexBytes)
	if err != nil {
		t.Fatalf("decode static webp fixture: %v", err)
	}
	return data
}

// newAnimatedGIFBytes erzeugt ein animiertes GIF (3 Vollfarb-Frames) mit den angegebenen
// Pixel-Massen -- genutzt, um die animierte WebP-"display"-Konvertierung ueber echtes ffmpeg
// zu beweisen.
func newAnimatedGIFBytes(t *testing.T, width, height int) []byte {
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
		t.Fatalf("encode animated gif: %v", err)
	}
	return buf.Bytes()
}

// requireFFmpegForDisplayTests liefert den Pfad zur installierten ffmpeg-Binary oder bricht den
// Test ab -- identisches Muster zu requireFFmpegBinary (segment_render_worker_test.go) bzw.
// requireFFmpeg (internal/services/media_service_test.go).
func requireFFmpegForDisplayTests(t *testing.T) string {
	t.Helper()
	binary, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Fatal("installed FFmpeg is required for this test")
	}
	return binary
}

func newMediaUploadRequestWithFile(t *testing.T, entityType, entityID, assetType, filename string, content []byte) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	assert.NoError(t, writer.WriteField("entity_type", entityType))
	assert.NoError(t, writer.WriteField("entity_id", entityID))
	assert.NoError(t, writer.WriteField("asset_type", assetType))

	fileWriter, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fileWriter.Write(content); err != nil {
		t.Fatalf("write file bytes: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/admin/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

// TestMediaUploadHandler_DisplayVariantNoUpscale beweist: ein Quellbild unterhalb des
// 1920px-Caps wird NICHT hochskaliert, nur re-encodiert (Breite/Hoehe bleiben identisch).
func TestMediaUploadHandler_DisplayVariantNoUpscale(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "small.png", newSizedPNGBytes(t, 400, 300))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	display, ok := findUploadFile(payload.Files, "display")
	if assert.True(t, ok, "display-variante fehlt in payload.Files") {
		assert.Equal(t, 400, display.Width)
		assert.Equal(t, 300, display.Height)
		assert.True(t, strings.HasSuffix(display.Path, "/display.jpg"), display.Path)
	}
}

// TestMediaUploadHandler_DisplayVariantCapsLongEdgeLandscape beweist: ein Querformat-Quellbild
// oberhalb des Caps wird auf 1920px Breite begrenzt, Hoehe proportional skaliert.
func TestMediaUploadHandler_DisplayVariantCapsLongEdgeLandscape(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "wide.png", newSizedPNGBytes(t, 2400, 1200))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	display, ok := findUploadFile(payload.Files, "display")
	if assert.True(t, ok, "display-variante fehlt in payload.Files") {
		assert.Equal(t, 1920, display.Width)
		assert.Equal(t, 960, display.Height)
	}
}

// TestMediaUploadHandler_DisplayVariantCapsLongEdgePortrait beweist: die Kappung greift bei der
// jeweils groesseren Dimension, nicht pauschal bei der Breite.
func TestMediaUploadHandler_DisplayVariantCapsLongEdgePortrait(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "tall.png", newSizedPNGBytes(t, 1200, 2400))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	display, ok := findUploadFile(payload.Files, "display")
	if assert.True(t, ok, "display-variante fehlt in payload.Files") {
		assert.Equal(t, 960, display.Width)
		assert.Equal(t, 1920, display.Height)
	}
}

// TestMediaUploadHandler_UploadPreservesWebPOriginalExtensionAndBytes beweist D-06/D-07: ein
// WebP-Upload wird NICHT silently als JPEG re-encodiert und auf .jpg umbenannt -- original.webp
// behaelt Endung und RIFF/WEBP-Bytes. Die display-Variante existiert trotzdem (JPEG-Re-Encode).
func TestMediaUploadHandler_UploadPreservesWebPOriginalExtensionAndBytes(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "cover.webp", testStaticWebPBytes(t))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	original, ok := findUploadFile(payload.Files, "original")
	if assert.True(t, ok) {
		assert.True(t, strings.HasSuffix(original.Path, "/original.webp"), original.Path)

		diskPath := diskPathForRelPath(tmpDir, original.Path)
		onDisk, err := os.ReadFile(diskPath)
		assert.NoError(t, err)
		assert.True(t, len(onDisk) >= 12, "original.webp zu kurz")
		assert.Equal(t, "RIFF", string(onDisk[0:4]))
		assert.Equal(t, "WEBP", string(onDisk[8:12]))
	}

	display, ok := findUploadFile(payload.Files, "display")
	if assert.True(t, ok, "display-variante fehlt fuer webp-original") {
		assert.True(t, strings.HasSuffix(display.Path, "/display.jpg"), display.Path)
		assert.Greater(t, display.Width, 0)
		assert.Greater(t, display.Height, 0)
	}
}

// TestMediaUploadHandler_AnimatedDisplayGeneratesAnimatedWebP beweist: ein animiertes
// GIF-Upload erzeugt eine "display"-Zeile, deren Bytes per isAnimatedWebP (VP8X+ANIM-Flag) als
// animiertes WebP erkannt werden.
func TestMediaUploadHandler_AnimatedDisplayGeneratesAnimatedWebP(t *testing.T) {
	ffmpegBinary := requireFFmpegForDisplayTests(t)
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", ffmpegBinary)

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "anim.gif", newAnimatedGIFBytes(t, 320, 240))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	display, ok := findUploadFile(payload.Files, "display")
	if !assert.True(t, ok, "display-variante fehlt fuer animiertes gif") {
		return
	}
	assert.True(t, strings.HasSuffix(display.Path, "/display.webp"), display.Path)

	diskPath := diskPathForRelPath(tmpDir, display.Path)
	onDisk, err := os.ReadFile(diskPath)
	assert.NoError(t, err)
	assert.True(t, len(onDisk) >= 21, "display.webp zu kurz fuer header-pruefung")
	assert.True(t, isAnimatedWebP(onDisk), "erzeugtes display.webp muss als animiert erkannt werden")
}

// TestMediaUploadHandler_AnimatedDisplayCapsLongEdge beweist: die animierte WebP-Variante
// begrenzt die lange Kante auf 960px, auch wenn die Quelle groesser ist.
func TestMediaUploadHandler_AnimatedDisplayCapsLongEdge(t *testing.T) {
	ffmpegBinary := requireFFmpegForDisplayTests(t)
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", ffmpegBinary)

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "anim-large.gif", newAnimatedGIFBytes(t, 1200, 800))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	display, ok := findUploadFile(payload.Files, "display")
	if !assert.True(t, ok, "display-variante fehlt fuer grosses animiertes gif") {
		return
	}
	assert.LessOrEqual(t, display.Width, 960)
	assert.LessOrEqual(t, display.Height, 960)
	assert.Equal(t, 960, display.Width)
	assert.Equal(t, 640, display.Height)
}

// TestMediaUploadHandler_AnimatedDisplayDegradesGracefullyWithoutFFmpeg beweist: fehlt ffmpeg
// (leerer ffmpegPath), schlaegt nur die optionale display-Erzeugung fehl -- der Gesamt-Upload
// (original + thumb) bleibt erfolgreich (HTTP 200), analog zum nicht-fatalen Verhalten von
// saveSegmentVideoPreview bei fehlgeschlagener Preview-Erzeugung.
func TestMediaUploadHandler_AnimatedDisplayDegradesGracefullyWithoutFFmpeg(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "")

	req := newMediaUploadRequestWithFile(t, "anime", "123", "poster", "anim.gif", newAnimatedGIFBytes(t, 320, 240))
	w := performAuthorizedUpload(t, handler, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	_, hasOriginal := findUploadFile(payload.Files, "original")
	_, hasThumb := findUploadFile(payload.Files, "thumb")
	_, hasDisplay := findUploadFile(payload.Files, "display")
	assert.True(t, hasOriginal)
	assert.True(t, hasThumb)
	assert.False(t, hasDisplay, "ohne ffmpeg darf keine display-zeile entstehen")
}

type mockAssetLifecycleStore struct {
	subjects map[int64]bool
	audit    []models.AssetLifecycleAuditEntry
}

func newMockAssetLifecycleStore(entityIDs ...int64) *mockAssetLifecycleStore {
	subjects := make(map[int64]bool, len(entityIDs))
	for _, id := range entityIDs {
		subjects[id] = true
	}
	return &mockAssetLifecycleStore{subjects: subjects, audit: make([]models.AssetLifecycleAuditEntry, 0)}
}

func (m *mockAssetLifecycleStore) LookupAssetLifecycleSubject(ctx context.Context, entityType string, entityID int64) (*models.AssetLifecycleSubject, error) {
	if strings.TrimSpace(entityType) != "anime" || !m.subjects[entityID] {
		return nil, repository.ErrNotFound
	}
	return &models.AssetLifecycleSubject{EntityType: "anime", EntityID: entityID}, nil
}

func (m *mockAssetLifecycleStore) RecordAssetLifecycleEvent(ctx context.Context, entry models.AssetLifecycleAuditEntry) error {
	m.audit = append(m.audit, entry)
	return nil
}

func TestMediaUploadHandler_UploadAutoProvisionsCanonicalAnimeFoldersAndReportsStatuses(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	repo.legacySchema = false
	tmpDir := t.TempDir()
	store := newMockAssetLifecycleStore(123)
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
		WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))

	w := performAuthorizedUpload(t, handler, newMediaUploadRequest(t))

	assert.Equal(t, http.StatusOK, w.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	if assert.NotNil(t, payload.Provisioning) {
		assert.Equal(t, "anime", payload.Provisioning.EntityType)
		assert.Equal(t, int64(123), payload.Provisioning.EntityID)
		assert.Equal(t, "cover", payload.Provisioning.RequestedAssetType)
		assert.Len(t, payload.Provisioning.Statuses, 5)
		for _, status := range payload.Provisioning.Statuses {
			assert.Equal(t, "created", status.State)
		}
	}
	assert.Contains(t, payload.URL, "/media/anime/123/cover/")
	assert.DirExists(t, filepath.Join(tmpDir, "anime", "123", "cover"))
	assert.DirExists(t, filepath.Join(tmpDir, "anime", "123", "banner"))
	assert.DirExists(t, filepath.Join(tmpDir, "anime", "123", "logo"))
	assert.DirExists(t, filepath.Join(tmpDir, "anime", "123", "background"))
	assert.DirExists(t, filepath.Join(tmpDir, "anime", "123", "background_video"))
	if assert.Len(t, repo.assets, 1) {
		for _, asset := range repo.assets {
			assert.Equal(t, "cover", asset.AssetType)
			assert.Equal(t, "poster", asset.MediaType)
			assert.Equal(t, int64(123), asset.EntityID)
		}
	}
	assert.Len(t, repo.files, 1)
	assert.True(t, repo.joinTable["anime"][123])
}

func TestMediaUploadHandler_UploadReportsIdempotentProvisioningReuse(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	repo.legacySchema = false
	tmpDir := t.TempDir()
	store := newMockAssetLifecycleStore(123)
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
		WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))

	first := performAuthorizedUpload(t, handler, newMediaUploadRequest(t))
	assert.Equal(t, http.StatusOK, first.Code)

	second := performAuthorizedUpload(t, handler, newMediaUploadRequest(t))
	assert.Equal(t, http.StatusOK, second.Code)

	var payload models.UploadResponse
	assert.NoError(t, json.Unmarshal(second.Body.Bytes(), &payload))
	if assert.NotNil(t, payload.Provisioning) {
		for _, status := range payload.Provisioning.Statuses {
			assert.Equal(t, "already_exists", status.State)
		}
	}
}

func TestMediaUploadHandler_UploadUsesManualAnimePathWithoutJellyfinMetadata(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	repo.legacySchema = false
	tmpDir := t.TempDir()
	store := newMockAssetLifecycleStore(123)
	handler := newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
		WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))

	req := newMediaUploadRequest(t)
	w := performAuthorizedUpload(t, handler, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotContains(t, w.Body.String(), "jellyfin")
}

func TestMediaUploadHandler_UploadReturnsDetailedValidationErrors(t *testing.T) {
	tests := []struct {
		name           string
		request        func(t *testing.T) *http.Request
		setupHandler   func(t *testing.T, tmpDir string) *MediaUploadHandler
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "invalid entity type",
			request: func(t *testing.T) *http.Request {
				return newMediaUploadRequestWithFields(t, "episode", "123", "poster")
			},
			setupHandler: func(t *testing.T, tmpDir string) *MediaUploadHandler {
				return newAdminMediaUploadHandler(NewMockMediaUploadRepository(), tmpDir, "http://localhost", "/usr/bin/ffmpeg")
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungültiger entity_type",
		},
		{
			name: "invalid entity id",
			request: func(t *testing.T) *http.Request {
				return newMediaUploadRequestWithFields(t, "anime", "999", "poster")
			},
			setupHandler: func(t *testing.T, tmpDir string) *MediaUploadHandler {
				repo := NewMockMediaUploadRepository()
				repo.legacySchema = false
				store := newMockAssetLifecycleStore(123)
				return newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
					WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungültige anime id",
		},
		{
			name: "unsupported asset type",
			request: func(t *testing.T) *http.Request {
				return newMediaUploadRequestWithFields(t, "anime", "123", "avatar")
			},
			setupHandler: func(t *testing.T, tmpDir string) *MediaUploadHandler {
				repo := NewMockMediaUploadRepository()
				repo.legacySchema = false
				store := newMockAssetLifecycleStore(123)
				return newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
					WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungültiger asset_type",
		},
		{
			name: "reserved folder collision",
			request: func(t *testing.T) *http.Request {
				return newMediaUploadRequestWithFields(t, "anime", "123", "poster")
			},
			setupHandler: func(t *testing.T, tmpDir string) *MediaUploadHandler {
				assert.NoError(t, os.MkdirAll(filepath.Join(tmpDir, "anime", "123"), 0o755))
				assert.NoError(t, os.WriteFile(filepath.Join(tmpDir, "anime", "123", "cover"), []byte("not-a-dir"), 0o644))
				repo := NewMockMediaUploadRepository()
				repo.legacySchema = false
				store := newMockAssetLifecycleStore(123)
				return newAdminMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
					WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "reservierter ordner",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			handler := tt.setupHandler(t, tmpDir)
			w := performAuthorizedUpload(t, handler, tt.request(t))
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBody)
			assert.NotContains(t, w.Body.String(), "\"error\":\"")
		})
	}
}

func TestMediaUploadHandler_MainFileStaysWithinLineBudget(t *testing.T) {
	content, err := os.ReadFile("media_upload.go")
	if err != nil {
		t.Fatalf("read media_upload.go: %v", err)
	}

	lineCount := bytes.Count(content, []byte{'\n'})
	if len(content) > 0 && content[len(content)-1] != '\n' {
		lineCount++
	}

	if lineCount > 450 {
		t.Fatalf("media_upload.go line count = %d, want <= 450", lineCount)
	}
}

// newAdminMediaUploadHandler baut den Handler wie in main.go, inklusive
// verdrahtetem Plattform-Admin-Guard, damit Bestandstests den Admin-Pfad testen.
func newAdminMediaUploadHandler(repo repository.MediaUploadRepoTx, storageDir, baseURL, ffmpegPath string) *MediaUploadHandler {
	return NewMediaUploadHandler(repo, storageDir, baseURL, ffmpegPath).
		WithAdminAuthz(stubRoleChecker{appUserIsAdmin: true, legacyIsAdmin: true}, "admin")
}

// newAdminMediaUploadHandlerWithVips ist newAdminMediaUploadHandler plus verdrahtetem
// vipsthumbnail-Pfad (D-21), fuer Tests der animierten-WebP-Thumbnail-/Display-Erzeugung.
func newAdminMediaUploadHandlerWithVips(repo repository.MediaUploadRepoTx, storageDir, baseURL, ffmpegPath, vipsThumbnailPath string) *MediaUploadHandler {
	return newAdminMediaUploadHandler(repo, storageDir, baseURL, ffmpegPath).
		WithVipsThumbnailPath(vipsThumbnailPath)
}

// requireVipsThumbnailForDisplayTests liefert den Pfad zur installierten vipsthumbnail-Binary
// oder bricht den Test ab -- identisches Muster zu requireFFmpegForDisplayTests.
func requireVipsThumbnailForDisplayTests(t *testing.T) string {
	t.Helper()
	binary, err := exec.LookPath("vipsthumbnail")
	if err != nil {
		t.Fatal("installed vipsthumbnail (vips-tools) is required for this test")
	}
	return binary
}

// newAnimatedWebPBytes erzeugt ein animiertes WebP (3 Vollfarb-Frames) mit den angegebenen
// Pixel-Massen via ffmpeg (libwebp_anim) -- genutzt, um D-20/D-21 (animiertes WebP bleibt
// animiert, Display-Erzeugung ueber vipsthumbnail) zu beweisen, ohne eine grosse Binaer-Fixture
// einzuchecken.
func newAnimatedWebPBytes(t *testing.T, ffmpegBinary string, width, height int) []byte {
	t.Helper()

	gifData := newAnimatedGIFBytes(t, width, height)
	tmpDir := t.TempDir()
	srcPath := filepath.Join(tmpDir, "src.gif")
	if err := os.WriteFile(srcPath, gifData, 0o644); err != nil {
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
	if !isAnimatedWebP(data) {
		t.Fatal("per ffmpeg erzeugtes webp wurde nicht als animiert erkannt -- test-fixture ungueltig")
	}
	return data
}

func newMediaUploadRequest(t *testing.T) *http.Request {
	return newMediaUploadRequestWithFields(t, "anime", "123", "poster")
}

func newMediaUploadRequestWithFields(t *testing.T, entityType, entityID, assetType string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	assert.NoError(t, writer.WriteField("entity_type", entityType))
	assert.NoError(t, writer.WriteField("entity_id", entityID))
	assert.NoError(t, writer.WriteField("asset_type", assetType))

	fileWriter, err := writer.CreateFormFile("file", "cover.png")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fileWriter.Write(testPNGBytes(t)); err != nil {
		t.Fatalf("write png bytes: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/admin/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func performAuthorizedUpload(t *testing.T, handler *MediaUploadHandler, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/admin/upload", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:      44,
			DisplayName: "Operator",
		})
		handler.Upload(c)
	})

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func testPNGBytes(t *testing.T) []byte {
	t.Helper()

	var body bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	img.Set(1, 0, color.RGBA{G: 255, A: 255})
	img.Set(0, 1, color.RGBA{B: 255, A: 0})
	img.Set(1, 1, color.RGBA{R: 255, G: 255, B: 255, A: 255})
	if err := png.Encode(&body, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}

	return body.Bytes()
}

// mockMultipartFile implements multipart.File interface for testing
type mockMultipartFile struct {
	*bytes.Reader
}

func (m mockMultipartFile) Close() error {
	return nil
}

func (m mockMultipartFile) Read(p []byte) (n int, err error) {
	return m.Reader.Read(p)
}

func (m mockMultipartFile) Seek(offset int64, whence int) (int64, error) {
	return m.Reader.Seek(offset, whence)
}

func (m mockMultipartFile) ReadAt(p []byte, off int64) (n int, err error) {
	return m.Reader.ReadAt(p, off)
}
