package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

type themeSlotConflictRepo struct{ adminThemeRepository }

func (themeSlotConflictRepo) UpdateAdminAnimeTheme(context.Context, int64, models.AdminAnimeThemePatchInput) error {
	return repository.ErrSegmentAssignmentConflict
}

func TestSegmentSlotConflictHTTPMutations(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, kind := range []string{"create", "update", "direct", "theme_type"} {
		t.Run(kind, func(t *testing.T) {
			h := &AdminContentHandler{authzRepo: adminRoleCheckerStub{isAdmin: true}}
			body := `{"theme_id":1,"start_episode":4,"end_episode":4}`
			route := "/api/v1/admin/anime/1/segments?release_variant_id=14"
			method := http.MethodPost
			action := h.CreateAnimeSegment
			params := gin.Params{{Key: "id", Value: "1"}, {Key: "segmentId", Value: "7"}, {Key: "themeId", Value: "1"}}
			switch kind {
			case "create":
				h.themeRepo = &rangeAutoAssignThemeRepo{createErr: repository.ErrSegmentAssignmentConflict}
			case "update":
				method = http.MethodPatch
				action = h.UpdateAnimeSegment
				h.themeRepo = &rangeAutoAssignThemeRepo{segment: &models.AdminThemeSegment{ID: 7, AnimeID: 1}, updateErr: repository.ErrSegmentAssignmentConflict}
			case "direct":
				body = `{"release_version_id":14}`
				action = h.AssignAnimeSegment
				h.themeRepo = &fakeSegmentAssignmentThemeRepo{assignErr: repository.ErrSegmentAssignmentConflict}
			case "theme_type":
				body = `{"theme_type_id":2}`
				method = http.MethodPatch
				action = h.UpdateAnimeTheme
				h.themeRepo = themeSlotConflictRepo{}
			}
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(method, route, strings.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = params
			c.Set("auth_identity", fansubNotesPlatformAdminIdentity())
			action(c)
			require.Equal(t, http.StatusConflict, recorder.Code, recorder.Body.String())
			var payload struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}
			require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
			require.Equal(t, "segment_assignment_conflict", payload.Error.Code)
			require.Contains(t, payload.Error.Message, "bereits")
			require.NotContains(t, recorder.Body.String(), `"data"`)
		})
	}
}

func TestSegmentSlotRangeResponseCarriesSkippedConflicts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	group := int64(1)
	h := &AdminContentHandler{themeRepo: &rangeAutoAssignThemeRepo{
		segment:     &models.AdminThemeSegment{ID: 7, AnimeID: 1, FansubGroupID: &group, AssignedReleaseVersionIDs: []int64{11, 13, 14}},
		rangeResult: &models.ThemeSegmentAssignmentSyncResult{Added: []int64{11, 13, 14}, Removed: []int64{}, ProtectedByOverride: []int64{}, SkippedConflicts: []models.ThemeSegmentAssignmentConflict{{ReleaseVersionID: 12, EpisodeNumber: "2", ExistingSegmentID: 6}}},
	}}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/1/segments?release_variant_id=11", strings.NewReader(`{"theme_id":2,"fansub_group_id":1,"start_episode":1,"end_episode":4}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("auth_identity", fansubNotesPlatformAdminIdentity())
	h.CreateAnimeSegment(c)
	require.Equal(t, http.StatusCreated, recorder.Code, recorder.Body.String())
	var payload struct {
		Data      models.AdminThemeSegment                `json:"data"`
		RangeSync models.ThemeSegmentAssignmentSyncResult `json:"range_sync"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.ElementsMatch(t, []int64{11, 13, 14}, payload.Data.AssignedReleaseVersionIDs)
	require.Equal(t, []models.ThemeSegmentAssignmentConflict{{ReleaseVersionID: 12, EpisodeNumber: "2", ExistingSegmentID: 6}}, payload.RangeSync.SkippedConflicts)
	require.Contains(t, recorder.Body.String(), `"removed":[]`)
}
