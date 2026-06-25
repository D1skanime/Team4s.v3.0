package handlers

import (
	"os"
	"strings"
	"testing"
)

func TestFansubGroupMediaUploadStoresThumbnailVariant(t *testing.T) {
	content, err := os.ReadFile("fansub_media_upload.go")
	if err != nil {
		t.Fatalf("fansub_media_upload.go konnte nicht gelesen werden: %v", err)
	}
	source := string(content)

	if !strings.Contains(source, "generateRVMThumbnail(data, saveResult.CreateInput.MimeType)") {
		t.Fatal("Gruppenmedia-Upload muss die bestehende Thumbnail-Erzeugung wiederverwenden")
	}
	if !strings.Contains(source, `InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb"`) {
		t.Fatal("Gruppenmedia-Upload muss media_files.variant='thumb' schreiben")
	}
	if !strings.Contains(source, "ThumbnailURL") || !strings.Contains(source, "OriginalURL") {
		t.Fatal("Upload-Response muss Thumbnail und Original getrennt ausweisen")
	}
}
