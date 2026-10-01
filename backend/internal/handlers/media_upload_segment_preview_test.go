package handlers

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// numericIDMediaUploadRepo vergibt wie das echte V2-Schema numerische media_assets-IDs, damit
// StoreGeneratedAnimeImage die ID zurueckliefern kann.
type numericIDMediaUploadRepo struct {
	*MockMediaUploadRepository
	next int
}

func (r *numericIDMediaUploadRepo) CreateMediaAsset(ctx context.Context, asset *models.UploadMediaAsset) error {
	r.next++
	asset.ID = strconv.Itoa(4700 + r.next)
	return r.MockMediaUploadRepository.CreateMediaAsset(ctx, asset)
}

func (r *numericIDMediaUploadRepo) WithTx(ctx context.Context, fn func(repo repository.MediaUploadRepo) error) error {
	return fn(r)
}

type segmentPreviewAuthorizerCall struct {
	animeID, segmentID, releaseVariantID int64
}

func segmentPreviewUploadRequest(t *testing.T, fields map[string]string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		require.NoError(t, writer.WriteField(key, value))
	}
	fileWriter, err := writer.CreateFormFile("file", "preview.png")
	require.NoError(t, err)
	_, err = fileWriter.Write(testPNGBytes(t))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/admin/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

// performNonAdminUpload fuehrt POST /admin/upload als angemeldeter Nicht-Plattform-Admin aus.
func performNonAdminUpload(handler *MediaUploadHandler, req *http.Request) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/admin/upload", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 77, AppUserID: 77, AppUserStatus: models.AppUserStatusActive, DisplayName: "Segment-Editor"})
		handler.Upload(c)
	})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func newSegmentPreviewUploadHandler(repo repository.MediaUploadRepoTx, storageDir string, calls *[]segmentPreviewAuthorizerCall, allow bool) *MediaUploadHandler {
	return NewMediaUploadHandler(repo, storageDir, "http://localhost", "/usr/bin/ffmpeg").
		WithAdminAuthz(stubRoleChecker{}, "admin").
		WithSegmentPreviewAuthorizer(func(c *gin.Context, animeID, segmentID, releaseVariantID int64) (middleware.AuthIdentity, bool) {
			*calls = append(*calls, segmentPreviewAuthorizerCall{animeID, segmentID, releaseVariantID})
			if !allow {
				c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
				return middleware.AuthIdentity{}, false
			}
			identity, _ := middleware.CommentAuthIdentityFromContext(c)
			return identity, true
		})
}

// TestMediaUploadHandler_SegmentPreviewUsesSegmentPermission beweist: segment_preview laeuft
// durch den globalen Uploader, nutzt statt des Plattform-Admin-Guards die Segment-Berechtigung
// und landet im kanonischen Layout media/anime/<id>/segment_preview/<uuid>/ mit media_type preview.
func TestMediaUploadHandler_SegmentPreviewUsesSegmentPermission(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	var calls []segmentPreviewAuthorizerCall
	handler := newSegmentPreviewUploadHandler(repo, t.TempDir(), &calls, true)

	w := performNonAdminUpload(handler, segmentPreviewUploadRequest(t, map[string]string{
		"entity_type": "anime", "entity_id": "123", "asset_type": "segment_preview", "segment_id": "42", "release_variant_id": "5",
	}))

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	require.Equal(t, []segmentPreviewAuthorizerCall{{123, 42, 5}}, calls)
	require.Len(t, repo.assets, 1)
	for _, asset := range repo.assets {
		require.Equal(t, "preview", asset.MediaType)
		require.True(t, strings.HasPrefix(asset.FilePath, "/media/anime/123/segment_preview/"), asset.FilePath)
	}
	require.True(t, repo.joinTable["anime"][123])
}

// TestMediaUploadHandler_SegmentPreviewDeniedBySegmentPermission beweist, dass eine Ablehnung der
// Segment-Berechtigung den Upload vor jeder Speicherung beendet.
func TestMediaUploadHandler_SegmentPreviewDeniedBySegmentPermission(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	var calls []segmentPreviewAuthorizerCall
	handler := newSegmentPreviewUploadHandler(repo, t.TempDir(), &calls, false)

	w := performNonAdminUpload(handler, segmentPreviewUploadRequest(t, map[string]string{
		"entity_type": "anime", "entity_id": "123", "asset_type": "segment_preview", "segment_id": "42",
	}))

	require.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
	require.Len(t, calls, 1)
	require.Empty(t, repo.assets)
}

// TestMediaUploadHandler_SegmentPreviewRequiresSegmentID beweist 400 ohne segment_id, bevor die
// Berechtigung geprueft oder etwas gespeichert wird.
func TestMediaUploadHandler_SegmentPreviewRequiresSegmentID(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	var calls []segmentPreviewAuthorizerCall
	handler := newSegmentPreviewUploadHandler(repo, t.TempDir(), &calls, true)

	w := performNonAdminUpload(handler, segmentPreviewUploadRequest(t, map[string]string{
		"entity_type": "anime", "entity_id": "123", "asset_type": "segment_preview",
	}))

	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	require.Empty(t, calls)
	require.Empty(t, repo.assets)
}

// TestMediaUploadHandler_OtherAssetTypesStayAdminOnly beweist, dass der Segment-Zweig den
// Plattform-Admin-Guard fuer alle anderen Asset-Typen nicht aufweicht.
func TestMediaUploadHandler_OtherAssetTypesStayAdminOnly(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	var calls []segmentPreviewAuthorizerCall
	handler := newSegmentPreviewUploadHandler(repo, t.TempDir(), &calls, true)

	w := performNonAdminUpload(handler, segmentPreviewUploadRequest(t, map[string]string{
		"entity_type": "anime", "entity_id": "123", "asset_type": "cover", "segment_id": "42",
	}))

	require.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
	require.Empty(t, calls)
	require.Empty(t, repo.assets)
}

// TestMediaUploadHandler_StoreGeneratedAnimeImage beweist, dass automatisch erzeugte
// Vorschaubilder denselben kanonischen Ablagepfad wie Uploads nutzen (original + thumb).
func TestMediaUploadHandler_StoreGeneratedAnimeImage(t *testing.T) {
	repo := &numericIDMediaUploadRepo{MockMediaUploadRepository: NewMockMediaUploadRepository()}
	storageDir := t.TempDir()
	handler := NewMediaUploadHandler(repo, storageDir, "http://localhost", "/usr/bin/ffmpeg")

	framePath := filepath.Join(t.TempDir(), "frame.png")
	require.NoError(t, os.WriteFile(framePath, testPNGBytes(t), 0o644))

	assetID, err := handler.StoreGeneratedAnimeImage(context.Background(), framePath, 123, "segment_preview")
	require.NoError(t, err)
	require.Equal(t, int64(4701), assetID)

	asset := repo.assets["4701"]
	require.NotNil(t, asset)
	require.Equal(t, "preview", asset.MediaType)
	require.Len(t, repo.files["4701"], 2)
	for _, file := range repo.files["4701"] {
		require.True(t, strings.HasPrefix(file.Path, "/media/anime/123/segment_preview/"), file.Path)
		_, statErr := os.Stat(filepath.Join(storageDir, strings.TrimPrefix(file.Path, "/media/")))
		require.NoError(t, statErr, "variant %s must exist on disk", file.Variant)
	}
	require.True(t, repo.joinTable["anime"][123])
}
