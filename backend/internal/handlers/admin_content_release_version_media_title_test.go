package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/repository"
)

func TestRVMTitleParser(t *testing.T) {
	for _, tc := range []struct {
		name    string
		body    map[string]interface{}
		value   *string
		present bool
		invalid bool
	}{
		{name: "missing", body: map[string]interface{}{}},
		{name: "null", body: map[string]interface{}{"title": nil}, present: true},
		{name: "empty", body: map[string]interface{}{"title": "  \n\t"}, present: true},
		{name: "boolean", body: map[string]interface{}{"title": true}, invalid: true},
		{name: "number", body: map[string]interface{}{"title": 42.0}, invalid: true},
		{name: "object", body: map[string]interface{}{"title": map[string]interface{}{}}, invalid: true},
		{name: "200 unicode characters", body: map[string]interface{}{"title": strings.Repeat("界", 200)}, value: rvmTitlePtr(strings.Repeat("界", 200)), present: true},
		{name: "201 unicode characters", body: map[string]interface{}{"title": strings.Repeat("界", 201)}, invalid: true},
		{name: "trimmed distinct title", body: map[string]interface{}{"title": "  Übersetzung ✨  ", "caption": "Anderer Text"}, value: rvmTitlePtr("Übersetzung ✨"), present: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			value, present, err := parseOptionalRVMTitleField(tc.body)
			if tc.invalid {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.present, present)
			require.Equal(t, tc.value, value)
		})
	}
}
func rvmTitlePtr(value string) *string { return &value }

func TestRVMTitlePatchPersistsIndependentMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())
	id := rvmExecUploadOne(t, h, "screenshot")
	call := func(body map[string]interface{}, want int) repository.ReleaseVersionMediaItem {
		data, err := json.Marshal(body)
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", id), bytes.NewReader(data))
		req.Header.Set("Content-Type", "application/json")
		c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(id, 10)}}, rvmExecPlatformAdminIdentity())
		h.PatchReleaseVersionMedia(c)
		require.Equal(t, want, rec.Code, rec.Body.String())
		var item repository.ReleaseVersionMediaItem
		if want == http.StatusOK {
			require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &item))
		}
		return item
	}
	item := call(map[string]interface{}{"title": "  Erster Titel ✨  ", "caption": "Eigener mehrzeiliger\nBeschreibungstext", "source_revision": 1}, 200)
	require.Equal(t, rvmTitlePtr("Erster Titel ✨"), item.Title)
	require.Equal(t, rvmTitlePtr("Eigener mehrzeiliger\nBeschreibungstext"), item.Caption)
	item = call(map[string]interface{}{"caption": "Nur Text geändert", "source_revision": 2}, 200)
	require.Equal(t, rvmTitlePtr("Erster Titel ✨"), item.Title)
	for _, invalid := range []interface{}{true, 42, map[string]interface{}{}, strings.Repeat("界", 201)} {
		call(map[string]interface{}{"title": invalid}, 400)
	}
	// Rejected revisions roll back title changes along with the existing lifecycle.
	call(map[string]interface{}{"title": "Veraltet", "source_revision": 1}, 409)
	item = call(map[string]interface{}{"title": nil, "source_revision": 3}, 200)
	require.Nil(t, item.Title)
	require.Equal(t, rvmTitlePtr("Nur Text geändert"), item.Caption)
	item = call(map[string]interface{}{"title": strings.Repeat("界", 200), "source_revision": 4}, 200)
	require.Equal(t, rvmTitlePtr(strings.Repeat("界", 200)), item.Title)
	item = call(map[string]interface{}{"title": "  ", "source_revision": 5}, 200)
	require.Nil(t, item.Title)
	var title, caption *string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT title,caption FROM release_version_media WHERE id=$1`, id).Scan(&title, &caption))
	require.Nil(t, title)
	require.Equal(t, rvmTitlePtr("Nur Text geändert"), caption)
}

func TestRVMTitleReplacePreservesAndEditsMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name   string
		field  *string
		want   *string
		status int
	}{
		{"missing", nil, rvmTitlePtr("Vorher"), 200},
		{"new", rvmTitlePtr("  Neuer Titel  "), rvmTitlePtr("Neuer Titel"), 200},
		{"too long", rvmTitlePtr(strings.Repeat("界", 201)), rvmTitlePtr("Vorher"), 400},
		{"clear", rvmTitlePtr("  "), nil, 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			pool := openReplaceRVMHandlerFixture(t)
			h := newRVMExecHandler(pool, t.TempDir())
			_, err := pool.Exec(context.Background(), `UPDATE release_version_media SET title='Vorher',caption='Beschreibung bleibt' WHERE id=601`)
			require.NoError(t, err)
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			if tc.field != nil {
				require.NoError(t, writer.WriteField("title", *tc.field))
			}
			part, err := writer.CreateFormFile("file", "replacement.png")
			require.NoError(t, err)
			_, err = part.Write(tinyValidPNGBytes(t))
			require.NoError(t, err)
			require.NoError(t, writer.Close())
			req := httptest.NewRequest(http.MethodPut, "/release-versions/41/media/601/file", &body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: "601"}}, replaceRVMPlatformAdminIdentity())
			h.ReplaceReleaseVersionMediaFile(c)
			require.Equal(t, tc.status, rec.Code, rec.Body.String())
			var title, caption *string
			require.NoError(t, pool.QueryRow(context.Background(), `SELECT title,caption FROM release_version_media WHERE id=601`).Scan(&title, &caption))
			require.Equal(t, tc.want, title)
			require.Equal(t, rvmTitlePtr("Beschreibung bleibt"), caption)
		})
	}
}
