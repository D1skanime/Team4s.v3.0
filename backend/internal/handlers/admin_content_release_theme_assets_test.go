package handlers

import (
	"os"
	"strings"
	"testing"
)

func readReleaseThemeHandlerSource(t *testing.T) string {
	t.Helper()
	src, err := os.ReadFile("admin_content_release_theme_assets.go")
	if err != nil {
		t.Fatalf("handler source nicht lesbar: %v", err)
	}
	return string(src)
}

func readMediaRepoSource(t *testing.T) string {
	t.Helper()
	src, err := os.ReadFile("../repository/media_repository.go")
	if err != nil {
		t.Fatalf("repository source nicht lesbar: %v", err)
	}
	return string(src)
}

// TestReleaseThemeAsset_InsertMediaFileCalled prueft FIX-01 und FIX-02:
// InsertMediaFile existiert als Methode auf MediaRepository und wird in beiden Handlern aufgerufen.
func TestReleaseThemeAsset_InsertMediaFileCalled(t *testing.T) {
	repoSrc := readMediaRepoSource(t)
	if !strings.Contains(repoSrc, "func (r *MediaRepository) InsertMediaFile") {
		t.Error("FIX-01: InsertMediaFile-Methode fehlt in media_repository.go")
	}

	handlerSrc := readReleaseThemeHandlerSource(t)
	count := strings.Count(handlerSrc, "h.mediaRepo.InsertMediaFile(")
	if count < 2 {
		t.Errorf("FIX-02: InsertMediaFile wird nur %d mal aufgerufen, erwartet mindestens 2 (einmal pro Handler)", count)
	}
}

// TestReleaseThemeAsset_InsertMediaFileRollback prueft FIX-03:
// Bei InsertMediaFile-Fehler wird DeleteMediaAsset als Rollback aufgerufen.
func TestReleaseThemeAsset_InsertMediaFileRollback(t *testing.T) {
	handlerSrc := readReleaseThemeHandlerSource(t)

	// Prueft ob DeleteMediaAsset nach dem InsertMediaFile-Block vorkommt
	// (beide Handler haben dieses Rollback-Pattern)
	insertIdx := strings.Index(handlerSrc, "h.mediaRepo.InsertMediaFile(")
	if insertIdx == -1 {
		t.Fatal("FIX-03: kein InsertMediaFile-Aufruf gefunden")
	}
	afterInsert := handlerSrc[insertIdx:]
	if !strings.Contains(afterInsert, "h.mediaRepo.DeleteMediaAsset(") {
		t.Error("FIX-03: kein DeleteMediaAsset-Rollback nach InsertMediaFile gefunden")
	}
}

func TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete(t *testing.T) {
	handlerSrc := readReleaseThemeHandlerSource(t)

	if strings.Contains(handlerSrc, "func (h *AdminContentHandler) UploadReleaseThemeAsset(c *gin.Context) {\n\tif _, ok := h.requireAdmin(c);") {
		t.Error("Fansub-Anime-Theme-Upload darf nicht admin-only bleiben")
	}
	if strings.Contains(handlerSrc, "func (h *AdminContentHandler) UploadReleaseThemeAssetForRelease(c *gin.Context) {\n\tif _, ok := h.requireAdmin(c);") {
		t.Error("Release-Theme-Upload darf nicht admin-only bleiben")
	}
	if strings.Contains(handlerSrc, "func (h *AdminContentHandler) DeleteReleaseThemeAsset(c *gin.Context) {\n\tif _, ok := h.requireAdmin(c);") {
		t.Error("Release-Theme-Delete darf nicht admin-only bleiben")
	}

	expected := []string{
		"h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, fansubID)",
		"h.permissionSvc.CanForRelease(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, releaseID)",
		"h.permissionSvc.CanForRelease(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaDelete, releaseID)",
	}
	for _, needle := range expected {
		if !strings.Contains(handlerSrc, needle) {
			t.Errorf("Permission-Check fehlt: %s", needle)
		}
	}
}

func TestReleaseThemeAsset_BlocksNonAnchorReleaseAssetSegmentUploads(t *testing.T) {
	handlerSrc := readReleaseThemeHandlerSource(t)

	if count := strings.Count(handlerSrc, "HasReleaseAssetSegmentUploadBlockedForRelease"); count < 2 {
		t.Fatalf("Release-Theme-Uploads muessen den Segmentstart-Lock in beiden Upload-Pfaden pruefen, gefunden: %d", count)
	}
	if !strings.Contains(handlerSrc, "theme_segment_upload_anchor_required") {
		t.Fatal("Release-Theme-Upload braucht einen stabilen Fehlercode fuer Nicht-Start-Episoden im Segmentbereich")
	}
}
