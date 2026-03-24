package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// MockMediaUploadRepository implements MediaUploadRepository for testing
type MockMediaUploadRepository struct {
	assets    map[string]*models.UploadMediaAsset
	files     map[string][]*models.UploadMediaFile
	joinTable map[string]map[int64]bool
}

func NewMockMediaUploadRepository() *MockMediaUploadRepository {
	return &MockMediaUploadRepository{
		assets:    make(map[string]*models.UploadMediaAsset),
		files:     make(map[string][]*models.UploadMediaFile),
		joinTable: make(map[string]map[int64]bool),
	}
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
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

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
			mimeType, format, err := handler.validateFile(mockMultipartFile{reader}, tt.size)

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
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")

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
	handler := NewMediaUploadHandler(repo, t.TempDir(), "http://localhost", "/usr/bin/ffmpeg")

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
	handler := NewMediaUploadHandler(repo, t.TempDir(), "http://localhost", "/usr/bin/ffmpeg")

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

func newMediaUploadRequest(t *testing.T) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	assert.NoError(t, writer.WriteField("entity_type", "anime"))
	assert.NoError(t, writer.WriteField("entity_id", "123"))
	assert.NoError(t, writer.WriteField("asset_type", "poster"))

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

func testPNGBytes(t *testing.T) []byte {
	t.Helper()

	var body bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	img.Set(1, 0, color.RGBA{G: 255, A: 255})
	img.Set(0, 1, color.RGBA{B: 255, A: 255})
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
