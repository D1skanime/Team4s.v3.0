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
