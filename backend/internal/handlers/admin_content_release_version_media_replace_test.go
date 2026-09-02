package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestReplaceReleaseVersionMediaFileRequiresUpdatePermission proves (source-inspection,
// matching this package's established convention — see TestUploadReleaseVersionMediaHandlerExists)
// that ReplaceReleaseVersionMediaFile reuses the existing ActionReleaseVersionMediaUpdate +
// canMutateReleaseVersionMediaRelation gate and does NOT invent a new, parallel permission
// action for this feature (VALIDATION.md's cross-cutting Permission invariant, T-144-04-01).
func TestReplaceReleaseVersionMediaFileRequiresUpdatePermission(t *testing.T) {
	src, err := os.ReadFile("admin_content_release_version_media_replace.go")
	require.NoError(t, err, "handler file must exist")

	content := string(src)
	assert.True(t, strings.Contains(content, "func (h *AdminContentHandler) ReplaceReleaseVersionMediaFile("),
		"ReplaceReleaseVersionMediaFile must be defined on *AdminContentHandler")
	assert.True(t, strings.Contains(content, "permissions.ActionReleaseVersionMediaUpdate"),
		"handler must reuse permissions.ActionReleaseVersionMediaUpdate")
	assert.True(t, strings.Contains(content, "h.canMutateReleaseVersionMediaRelation"),
		"handler must reuse h.canMutateReleaseVersionMediaRelation (same ownership gate as PATCH/DELETE)")
	assert.False(t, strings.Contains(content, "ActionReleaseVersionMediaReplace"),
		"handler must NOT introduce a new, parallel permissions.Action for file replace")

	assert.True(t, strings.Contains(content, "h.mediaRepo.ReplaceReleaseVersionMediaFile("),
		"handler must call the 144-02 repository method to swap the file")
	assert.True(t, strings.Contains(content, "h.mediaRepo.EnqueueReleaseVersionMediaFileDeleteJob("),
		"handler must enqueue the old file for cleanup")
	assert.True(t, strings.Contains(content, "NewReleaseReviewLifecycleRepository(tx).SubmitMedia("),
		"handler must bump the review lifecycle via SubmitMedia inside the same transaction")
}

// TestReplaceReleaseVersionMediaFileRejectsNoAuth proves the handler returns 401 when no
// auth_identity is set in context, matching every other mutation route in this file
// (TestReleaseVersionMedia_UploadRejectsNoAuth / _PatchRejectsNoAuth / _DeleteRejectsNoAuth).
func TestReplaceReleaseVersionMediaFileRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.PUT("/release-versions/:versionId/media/:relationId/file", h.ReplaceReleaseVersionMediaFile)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPut, "/release-versions/1/media/1/file", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code,
		"replace-file without auth must return 401")
}
