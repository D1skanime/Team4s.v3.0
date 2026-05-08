package handlers

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestUploadReleaseVersionMediaHandlerExists verifies the handler method is defined
// on *AdminContentHandler and the handler file compiles.
func TestUploadReleaseVersionMediaHandlerExists(t *testing.T) {
	src, err := os.ReadFile("admin_content_release_version_media.go")
	require.NoError(t, err, "handler file must exist")

	content := string(src)
	assert.True(t, strings.Contains(content, "func (h *AdminContentHandler) UploadReleaseVersionMedia("),
		"UploadReleaseVersionMedia must be defined on *AdminContentHandler")
	assert.True(t, strings.Contains(content, "generateRVMThumbnail"),
		"generateRVMThumbnail helper must exist")
	assert.False(t, strings.Contains(content, "adminContentRepo"),
		"handler must NOT reference adminContentRepo — use h.mediaRepo.ReleaseVersionExistsForRVM")
}

// TestGenerateGIFThumbnailSignature verifies generateRVMThumbnail exists
// with the expected signature and returns an error for empty input.
func TestGenerateGIFThumbnail(t *testing.T) {
	// Empty input must return error, not panic
	result, err := generateRVMThumbnail([]byte{}, "image/gif")
	assert.Error(t, err, "empty gif data must return error")
	assert.Nil(t, result)

	// Empty input for non-GIF must also return error, not panic
	result2, err2 := generateRVMThumbnail([]byte{}, "image/jpeg")
	assert.Error(t, err2, "empty jpeg data must return error")
	assert.Nil(t, result2)
}

// TestPreviewCategoryValidation verifies that only screenshot and typesetting_karaoke
// are in rvmPreviewAllowedCategories (D-16).
func TestPreviewCategoryValidation(t *testing.T) {
	assert.True(t, rvmPreviewAllowedCategories["screenshot"],
		"screenshot must be a valid preview category")
	assert.True(t, rvmPreviewAllowedCategories["typesetting_karaoke"],
		"typesetting_karaoke must be a valid preview category")
	assert.False(t, rvmPreviewAllowedCategories["fun_outtake"],
		"fun_outtake must NOT be a valid preview category (D-16)")
	assert.False(t, rvmPreviewAllowedCategories["other"],
		"other must NOT be a valid preview category (D-16)")
}

// TestUploadReleaseVersionMedia_FileSizeLimit verifies that rvmMaxFileSizeBytes is 15 MB.
func TestUploadReleaseVersionMedia_FileSizeLimit(t *testing.T) {
	expected := 15 * 1024 * 1024
	assert.Equal(t, expected, rvmMaxFileSizeBytes,
		"max file size must be exactly 15 MB")
}

// TestRVMValidCategories verifies all 4 valid categories are registered.
func TestRVMValidCategories(t *testing.T) {
	for _, cat := range []string{"screenshot", "typesetting_karaoke", "fun_outtake", "other"} {
		assert.True(t, rvmValidCategories[cat], "category %q must be valid", cat)
	}
	assert.False(t, rvmValidCategories["invalid"], "unknown category must not be valid")
}

// TestImageExtFromMimeRVM verifies MIME to file extension mapping.
func TestImageExtFromMimeRVM(t *testing.T) {
	assert.Equal(t, "gif", imageExtFromMimeRVM("image/gif"))
	assert.Equal(t, "png", imageExtFromMimeRVM("image/png"))
	assert.Equal(t, "webp", imageExtFromMimeRVM("image/webp"))
	assert.Equal(t, "jpg", imageExtFromMimeRVM("image/jpeg"))
	assert.Equal(t, "jpg", imageExtFromMimeRVM("unknown/type"))
}
