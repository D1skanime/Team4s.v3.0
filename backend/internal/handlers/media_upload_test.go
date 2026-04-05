package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
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
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
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
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
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
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
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
				return NewMediaUploadHandler(NewMockMediaUploadRepository(), tmpDir, "http://localhost", "/usr/bin/ffmpeg")
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungueltiger entity_type",
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
				return NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
					WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungueltige anime id",
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
				return NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
					WithLifecycleService(services.NewAssetLifecycleService(store, tmpDir))
			},
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "ungueltiger asset_type",
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
				return NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
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
