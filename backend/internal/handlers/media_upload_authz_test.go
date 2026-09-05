package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// Negative Security-Tests fuer die generischen Anime-Medienendpunkte
// POST /admin/upload und DELETE /admin/media/:id. Beide duerfen ausschliesslich
// von Plattform-Admins genutzt werden; eine reine Authentifizierung reicht nicht.

var (
	anonymousIdentity *middleware.AuthIdentity

	authenticatedAppUser = middleware.AuthIdentity{
		UserID:        77,
		AppUserID:     77,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Normaler Nutzer",
	}

	authenticatedLegacyUser = middleware.AuthIdentity{
		UserID:      88,
		DisplayName: "Legacy Nutzer",
	}

	platformAdminAppUser = middleware.AuthIdentity{
		UserID:        9,
		AppUserID:     9,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Plattform-Admin",
	}
)

func newAuthzMediaUploadHandler(t *testing.T, checker stubRoleChecker) (*MediaUploadHandler, *MockMediaUploadRepository, string) {
	t.Helper()

	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg").
		WithAdminAuthz(checker, "admin")
	return handler, repo, tmpDir
}

func performMediaUpload(t *testing.T, handler *MediaUploadHandler, identity *middleware.AuthIdentity) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/admin/upload", func(c *gin.Context) {
		if identity != nil {
			c.Set("auth_identity", *identity)
		}
		handler.Upload(c)
	})

	w := httptest.NewRecorder()
	router.ServeHTTP(w, newMediaUploadRequest(t))
	return w
}

func performMediaDelete(t *testing.T, handler *MediaUploadHandler, identity *middleware.AuthIdentity, mediaID string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/admin/media/:id", func(c *gin.Context) {
		if identity != nil {
			c.Set("auth_identity", *identity)
		}
		handler.Delete(c)
	})

	req := httptest.NewRequest(http.MethodDelete, "/admin/media/"+mediaID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// seedMediaAsset legt ein Asset samt Storage-Verzeichnis an und liefert den Dateipfad zurueck.
func seedMediaAsset(t *testing.T, repo *MockMediaUploadRepository, tmpDir, mediaID, entityType string, entityID int64, assetType string) string {
	t.Helper()

	asset := &models.UploadMediaAsset{
		ID:         mediaID,
		EntityType: entityType,
		EntityID:   entityID,
		AssetType:  assetType,
		Format:     "image",
		MimeType:   "image/jpeg",
		CreatedAt:  time.Now(),
	}
	if err := repo.CreateMediaAsset(context.Background(), asset); err != nil {
		t.Fatalf("seed asset: %v", err)
	}

	storagePath := filepath.Join(tmpDir, entityType, strconv.FormatInt(entityID, 10), assetType, mediaID)
	if err := os.MkdirAll(storagePath, 0o755); err != nil {
		t.Fatalf("seed storage dir: %v", err)
	}
	filePath := filepath.Join(storagePath, "original.webp")
	if err := os.WriteFile(filePath, []byte("test"), 0o644); err != nil {
		t.Fatalf("seed storage file: %v", err)
	}
	return filePath
}

func TestMediaUploadHandler_UploadDeniesAnonymousRequest(t *testing.T) {
	handler, repo, _ := newAuthzMediaUploadHandler(t, stubRoleChecker{appUserIsAdmin: true, legacyIsAdmin: true})

	w := performMediaUpload(t, handler, anonymousIdentity)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "anmeldung erforderlich")
	assert.Empty(t, repo.assets, "anonymer request darf kein asset anlegen")
}

func TestMediaUploadHandler_UploadDeniesAuthenticatedNonAdmin(t *testing.T) {
	for _, tc := range []struct {
		name     string
		identity middleware.AuthIdentity
	}{
		{name: "app user ohne plattform-admin-rolle", identity: authenticatedAppUser},
		{name: "legacy user ohne admin-rolle", identity: authenticatedLegacyUser},
	} {
		t.Run(tc.name, func(t *testing.T) {
			handler, repo, tmpDir := newAuthzMediaUploadHandler(t, stubRoleChecker{})

			identity := tc.identity
			w := performMediaUpload(t, handler, &identity)

			assert.Equal(t, http.StatusForbidden, w.Code)
			assert.Contains(t, w.Body.String(), "keine berechtigung")
			assert.Empty(t, repo.assets, "nicht-admin darf kein asset anlegen")
			assert.NoDirExists(t, filepath.Join(tmpDir, "anime", "123"))
		})
	}
}

func TestMediaUploadHandler_UploadAllowsPlatformAdmin(t *testing.T) {
	handler, repo, _ := newAuthzMediaUploadHandler(t, stubRoleChecker{appUserIsAdmin: true})

	identity := platformAdminAppUser
	w := performMediaUpload(t, handler, &identity)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Len(t, repo.assets, 1)
}

func TestMediaUploadHandler_UploadFailsClosedWithoutAuthzWiring(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	handler := NewMediaUploadHandler(repo, t.TempDir(), "http://localhost", "/usr/bin/ffmpeg")

	identity := platformAdminAppUser
	w := performMediaUpload(t, handler, &identity)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Empty(t, repo.assets, "ohne verdrahteten guard darf nichts gespeichert werden")
}

func TestMediaUploadHandler_DeleteDeniesAnonymousRequest(t *testing.T) {
	handler, repo, tmpDir := newAuthzMediaUploadHandler(t, stubRoleChecker{appUserIsAdmin: true, legacyIsAdmin: true})
	filePath := seedMediaAsset(t, repo, tmpDir, "asset-anon", "anime", 123, "cover")

	w := performMediaDelete(t, handler, anonymousIdentity, "asset-anon")

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "anmeldung erforderlich")
	_, err := repo.GetMediaAsset(context.Background(), "asset-anon")
	assert.NoError(t, err, "asset muss erhalten bleiben")
	assert.FileExists(t, filePath)
}

// BOLA/IDOR: ein authentifizierter Nicht-Admin darf ueber die generische Media-ID
// weder eigene noch fremde Medien loeschen -- unabhaengig von Entity-Typ und Besitzer.
func TestMediaUploadHandler_DeleteDeniesNonAdminForArbitraryMediaID(t *testing.T) {
	for _, tc := range []struct {
		name       string
		entityType string
		entityID   int64
	}{
		{name: "fremdes anime-medium", entityType: "anime", entityID: 123},
		{name: "fremdes gruppenmedium", entityType: "fansub_group", entityID: 7},
		{name: "fremdes profilmedium", entityType: "member", entityID: 42},
	} {
		t.Run(tc.name, func(t *testing.T) {
			handler, repo, tmpDir := newAuthzMediaUploadHandler(t, stubRoleChecker{})
			filePath := seedMediaAsset(t, repo, tmpDir, "asset-foreign", tc.entityType, tc.entityID, "cover")

			identity := authenticatedAppUser
			w := performMediaDelete(t, handler, &identity, "asset-foreign")

			assert.Equal(t, http.StatusForbidden, w.Code)
			assert.Contains(t, w.Body.String(), "keine berechtigung")
			_, err := repo.GetMediaAsset(context.Background(), "asset-foreign")
			assert.NoError(t, err, "asset muss erhalten bleiben")
			assert.FileExists(t, filePath)
		})
	}
}

// Der Guard greift vor jedem Repository-Zugriff: unbekannte IDs liefern 403 statt 404,
// damit Nicht-Admins die Existenz von Medien nicht enumerieren koennen.
func TestMediaUploadHandler_DeleteDeniesNonAdminBeforeLookup(t *testing.T) {
	handler, _, _ := newAuthzMediaUploadHandler(t, stubRoleChecker{})

	identity := authenticatedLegacyUser
	w := performMediaDelete(t, handler, &identity, "does-not-exist")

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "keine berechtigung")
}

func TestMediaUploadHandler_DeleteAllowsPlatformAdmin(t *testing.T) {
	handler, repo, tmpDir := newAuthzMediaUploadHandler(t, stubRoleChecker{appUserIsAdmin: true})
	filePath := seedMediaAsset(t, repo, tmpDir, "asset-admin", "anime", 123, "cover")

	identity := platformAdminAppUser
	w := performMediaDelete(t, handler, &identity, "asset-admin")

	assert.Equal(t, http.StatusOK, w.Code)
	_, err := repo.GetMediaAsset(context.Background(), "asset-admin")
	assert.Error(t, err, "asset muss geloescht sein")
	assert.NoFileExists(t, filePath)
}

// Fachlicher Scope: der generische Endpunkt bleibt auf Anime-Stammdaten begrenzt,
// auch fuer Plattform-Admins. Gruppen-/Release-/Profilmedien haben eigene Endpunkte.
func TestMediaUploadHandler_DeleteRejectsNonAnimeAssetForPlatformAdmin(t *testing.T) {
	handler, repo, tmpDir := newAuthzMediaUploadHandler(t, stubRoleChecker{appUserIsAdmin: true})
	filePath := seedMediaAsset(t, repo, tmpDir, "asset-group", "fansub_group", 7, "cover")

	identity := platformAdminAppUser
	w := performMediaDelete(t, handler, &identity, "asset-group")

	assert.Equal(t, http.StatusBadRequest, w.Code)
	_, err := repo.GetMediaAsset(context.Background(), "asset-group")
	assert.NoError(t, err, "gruppenmedium darf hier nicht geloescht werden")
	assert.FileExists(t, filePath)
}

func TestMediaUploadHandler_DeleteFailsClosedWithoutAuthzWiring(t *testing.T) {
	repo := NewMockMediaUploadRepository()
	tmpDir := t.TempDir()
	handler := NewMediaUploadHandler(repo, tmpDir, "http://localhost", "/usr/bin/ffmpeg")
	filePath := seedMediaAsset(t, repo, tmpDir, "asset-unwired", "anime", 123, "cover")

	identity := platformAdminAppUser
	w := performMediaDelete(t, handler, &identity, "asset-unwired")

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	_, err := repo.GetMediaAsset(context.Background(), "asset-unwired")
	assert.NoError(t, err)
	assert.FileExists(t, filePath)
}
