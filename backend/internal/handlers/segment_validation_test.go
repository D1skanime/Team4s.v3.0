package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
)

// TestValidateSegmentTimes_StartAfterEnd verifies that start_time >= end_time is always rejected.
func TestValidateSegmentTimes_StartAfterEnd(t *testing.T) {
	start := "00:01:00"
	end := "00:00:30"
	msg := validateSegmentTimes(&start, &end, nil)
	if msg == "" {
		t.Fatal("expected validation error when start_time >= end_time, got empty string")
	}
}

// TestValidateSegmentTimes_StartEqualsEnd verifies that start_time == end_time is rejected.
func TestValidateSegmentTimes_StartEqualsEnd(t *testing.T) {
	ts := "00:01:30"
	msg := validateSegmentTimes(&ts, &ts, nil)
	if msg == "" {
		t.Fatal("expected validation error when start_time == end_time, got empty string")
	}
}

// TestValidateSegmentTimes_EndExceedsKnownRuntime verifies that end_time > duration_seconds
// is rejected when runtime is known.
func TestValidateSegmentTimes_EndExceedsKnownRuntime(t *testing.T) {
	start := "00:00:00"
	end := "00:01:35" // 95 seconds
	dur := int32(90)  // 90 seconds runtime
	msg := validateSegmentTimes(&start, &end, &dur)
	if msg == "" {
		t.Fatal("expected validation error when end_time exceeds known runtime, got empty string")
	}
}

// TestValidateSegmentTimes_ValidTimesWithKnownRuntime verifies that valid times within
// known runtime are accepted.
func TestValidateSegmentTimes_ValidTimesWithKnownRuntime(t *testing.T) {
	start := "00:00:05"
	end := "00:01:25" // 85 seconds
	dur := int32(90)  // 90 seconds runtime
	msg := validateSegmentTimes(&start, &end, &dur)
	if msg != "" {
		t.Fatalf("expected no validation error for valid times within runtime, got: %q", msg)
	}
}

// TestValidateSegmentTimes_RejectsSegmentsLongerThanFourMinutes verifies that
// OP/ED segment windows cannot be abused to stream a full episode.
func TestValidateSegmentTimes_RejectsSegmentsLongerThanFourMinutes(t *testing.T) {
	start := "00:00:00"
	end := "23:59:59"
	msg := validateSegmentTimes(&start, &end, nil)
	if msg == "" {
		t.Fatal("expected validation error when segment exceeds four minutes, got empty string")
	}
}

func TestValidateSegmentTimes_AllowsExactlyFourMinutes(t *testing.T) {
	start := "00:00:00"
	end := "00:04:00"
	msg := validateSegmentTimes(&start, &end, nil)
	if msg != "" {
		t.Fatalf("expected no validation error for exactly four minutes, got: %q", msg)
	}
}

// TestValidateSegmentTimes_NilTimesAlwaysValid verifies that nil start/end are always valid.
func TestValidateSegmentTimes_NilTimesAlwaysValid(t *testing.T) {
	dur := int32(90)
	msg := validateSegmentTimes(nil, nil, &dur)
	if msg != "" {
		t.Fatalf("expected no validation error for nil times, got: %q", msg)
	}
}

// TestParseClockToSeconds_VariousFormats verifies the clock string parser.
func TestParseClockToSeconds_VariousFormats(t *testing.T) {
	cases := []struct {
		input    string
		expected *int32
	}{
		{"00:00:30", handlerInt32ptr(30)},
		{"00:01:30", handlerInt32ptr(90)},
		{"01:30:00", handlerInt32ptr(5400)},
		{"1:30", handlerInt32ptr(90)},
		{"", nil},
		{"invalid", nil},
		{"1:2:3:4", nil},
	}

	for _, tc := range cases {
		var input *string
		if tc.input != "" {
			s := tc.input
			input = &s
		}
		got := parseClockToSeconds(input)
		if tc.expected == nil && got != nil {
			t.Errorf("parseClockToSeconds(%q): expected nil, got %d", tc.input, *got)
		} else if tc.expected != nil && got == nil {
			t.Errorf("parseClockToSeconds(%q): expected %d, got nil", tc.input, *tc.expected)
		} else if tc.expected != nil && got != nil && *tc.expected != *got {
			t.Errorf("parseClockToSeconds(%q): expected %d, got %d", tc.input, *tc.expected, *got)
		}
	}
}

// fakeSegmentValidationThemeRepo implements only the one adminThemeRepository method
// UpdateAnimeSegment calls before validateSegmentTimes runs (GetAnimeSegmentByID, to load
// the existing segment) -- the rest of the interface stays deliberately nil-embedded, since
// a rejected (invalid-times) request never reaches any other repository call in either
// handler. CreateAnimeSegment needs no methods at all for the invalid-times path: it rejects
// before ever touching the repository (unless fansub_group_id is set, which this test's
// request body omits).
type fakeSegmentValidationThemeRepo struct {
	adminThemeRepository

	existingSegment *models.AdminThemeSegment
}

func (f *fakeSegmentValidationThemeRepo) GetAnimeSegmentByID(_ context.Context, _ int64, _ int64, _ int64) (*models.AdminThemeSegment, error) {
	return f.existingSegment, nil
}

// segmentValidationHandlerContext builds a real gin.Context/httptest.ResponseRecorder pair
// with a platform-admin identity, so requireSegmentManage's permission check short-circuits
// to allowed without needing a permission service or release-variant lookups -- isolating
// the test to the validateSegmentTimes seam itself.
func segmentValidationHandlerContext(method, target string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, target, bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID: 7, AppUserID: 71, IsPlatformAdmin: true, DisplayName: "Admin",
	})
	return c, recorder
}

// TestCreateUpdateAnimeSegment_SharedValidationSeamExists proves, by actually invoking the
// real CreateAnimeSegment and UpdateAnimeSegment handlers with the identical invalid
// start_time >= end_time pair, that both reject it the same way (400 + the same German
// validation message) through the shared validateSegmentTimes seam -- not by reading the
// handler's own source text for the function's name.
func TestCreateUpdateAnimeSegment_SharedValidationSeamExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const wantMessage = "start_time muss vor end_time liegen"

	t.Run("CreateAnimeSegment rejects start_time >= end_time", func(t *testing.T) {
		h := &AdminContentHandler{themeRepo: &fakeSegmentValidationThemeRepo{}}
		body := []byte(`{"theme_id":1,"version":"v1","start_time":"00:01:00","end_time":"00:00:30"}`)
		c, rec := segmentValidationHandlerContext(http.MethodPost, "/api/v1/admin/anime/61/segments", body)
		c.Params = gin.Params{{Key: "id", Value: "61"}}

		h.CreateAnimeSegment(c)

		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), wantMessage,
			"CreateAnimeSegment must reject start_time >= end_time via the real validateSegmentTimes seam")
	})

	t.Run("UpdateAnimeSegment rejects the identical start_time >= end_time pair", func(t *testing.T) {
		existing := &models.AdminThemeSegment{ID: 91, AnimeID: 61, ThemeID: 1, Version: "v1"}
		h := &AdminContentHandler{themeRepo: &fakeSegmentValidationThemeRepo{existingSegment: existing}}
		body := []byte(`{"start_time":"00:01:00","end_time":"00:00:30"}`)
		c, rec := segmentValidationHandlerContext(http.MethodPatch, "/api/v1/admin/anime/61/segments/91", body)
		c.Params = gin.Params{{Key: "id", Value: "61"}, {Key: "segmentId", Value: "91"}}

		h.UpdateAnimeSegment(c)

		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), wantMessage,
			"UpdateAnimeSegment must reject the SAME start_time >= end_time pair via the identical shared seam")
	})
}

func TestAdminAnimeSegments_UsesCapabilityWithoutRuntimeRoleHardcode(t *testing.T) {
	src := readSegmentHandlerSource(t)

	if !strings.Contains(src, "permissions.ActionReleaseVersionSegmentsManage") {
		t.Fatal("segment handler must check the release_version.segments.manage capability")
	}
	if !strings.Contains(src, "CanForReleaseVersion") {
		t.Fatal("segment handler must authorize through the permission service release-version seam")
	}

	forbidden := []string{
		"permissions.RoleFansubLead",
		"permissions.RoleProjectLead",
		"permissions.RoleTimer",
		`"fansub_lead"`,
		`"project_lead"`,
		`"timer"`,
	}
	for _, token := range forbidden {
		if strings.Contains(src, token) {
			t.Fatalf("segment handler must not hardcode role token %s; use app-user capabilities", token)
		}
	}
}

func TestAdminAnimeSegments_NoParallelMediaOwnershipShortcuts(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Skip("cannot determine test file path")
	}
	handlerSrc := readSegmentHandlerSource(t)
	repoBytes, err := os.ReadFile(filepath.Join(filepath.Dir(thisFile), "..", "repository", "admin_content_anime_segments_playback.go"))
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	src := handlerSrc + "\n" + string(repoBytes)

	if !strings.Contains(src, "theme_segment_playback_sources") {
		t.Fatal("segment playback source ownership seam missing")
	}
	if !strings.Contains(src, "media_assets") {
		t.Fatal("existing uploaded segment fallback should continue through media_assets")
	}
	forbidden := []string{"release_media", "episode_media"}
	for _, token := range forbidden {
		if strings.Contains(src, token) {
			t.Fatalf("segment flow must not use %s as a shortcut for segment playback/fallback media", token)
		}
	}
}

func readSegmentHandlerSource(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Skip("cannot determine test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(thisFile), "admin_content_anime_theme_segments.go"))
	if err != nil {
		t.Fatalf("read handler source: %v", err)
	}
	return string(content)
}

func handlerInt32ptr(v int32) *int32 { return &v }
