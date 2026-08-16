package repository

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

// Phase 134-03 (CONTEXT.md D-07): the dedicated verification matrix — cases
// 6-9 (sparse, dense, error, pagination), exercised at the HTTP layer against
// the temporary matrix backend from Task 1 (phase134MatrixBaseURL, declared
// in phase134_verification_matrix_access_test.go, same package). sparse vs
// dense come from the SAME once-seeded fixture (sheppert=sparse,
// csubs-leader=dense), never a separate snapshot, per D-07.
//
// This file loads the fixture manifest independently of the access-matrix
// file (small, self-contained, per the plan — no shared test-helper package
// for two files), using distinct type/function names to avoid colliding with
// the identically-purposed declarations in the access-matrix file.

// ---- Manifest (independent load, D-02) --------------------------------------

type phase134MatrixDataManifestProfile struct {
	Projects struct {
		ConfirmedDistinctAnimeMin int  `json:"confirmed_distinct_anime_min"`
		Sparse                    bool `json:"sparse"`
		CurrentProjectsCount      *int `json:"current_projects_count"`
	} `json:"projects"`
}

type phase134MatrixDataManifest struct {
	Profiles map[string]phase134MatrixDataManifestProfile `json:"profiles"`
}

var (
	phase134DataManifestOnce sync.Once
	phase134DataManifestData phase134MatrixDataManifest
	phase134DataManifestErr  error
)

func loadPhase134MatrixDataManifest(t *testing.T) phase134MatrixDataManifest {
	t.Helper()
	phase134DataManifestOnce.Do(func() {
		raw, err := os.ReadFile(filepath.Join("..", "..", "..", "scripts", "member-profile-fixture.manifest.json"))
		if err != nil {
			phase134DataManifestErr = err
			return
		}
		phase134DataManifestErr = json.Unmarshal(raw, &phase134DataManifestData)
	})
	require.NoError(t, phase134DataManifestErr, "load member-profile-fixture.manifest.json")
	return phase134DataManifestData
}

// ---- Case 6: sparse profile matches manifest --------------------------------

func TestPhase134MatrixSparseProfileMatchesManifest(t *testing.T) {
	manifest := loadPhase134MatrixDataManifest(t)
	expected, ok := manifest.Profiles["sheppert"]
	require.True(t, ok, "manifest missing profiles.sheppert")
	require.True(t, expected.Projects.Sparse, "manifest must mark sheppert as sparse")
	require.NotNilf(t, expected.Projects.CurrentProjectsCount, "manifest must declare profiles.sheppert.projects.current_projects_count")

	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/sheppert", "")
	require.Equalf(t, http.StatusOK, status, "GET public sheppert: %s", string(body))

	var parsed struct {
		Data struct {
			CurrentProjectsCount int `json:"current_projects_count"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.Equal(t, *expected.Projects.CurrentProjectsCount, parsed.Data.CurrentProjectsCount)
}

// ---- Case 7: dense profile matches manifest ---------------------------------

func TestPhase134MatrixDenseProfileMatchesManifest(t *testing.T) {
	manifest := loadPhase134MatrixDataManifest(t)
	expected, ok := manifest.Profiles["csubs-leader"]
	require.True(t, ok, "manifest missing profiles.csubs-leader")
	require.False(t, expected.Projects.Sparse, "manifest must mark csubs-leader as dense (not sparse)")

	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/csubs-leader", "")
	require.Equalf(t, http.StatusOK, status, "GET public csubs-leader: %s", string(body))

	var parsed struct {
		Data struct {
			CurrentProjectsCount int `json:"current_projects_count"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.GreaterOrEqual(t, parsed.Data.CurrentProjectsCount, expected.Projects.ConfirmedDistinctAnimeMin)
}

// ---- Case 8: malformed input fails closed (ASVS V5) -------------------------
//
// Deviation from the plan's literal text (Rule 1 — test-assertion correction,
// not a production bug): the plan assumed invalid `limit`/`offset` query
// params return 400. Reading the actual handler
// (backend/internal/handlers/app_public_profile.go's parseBoundedProjectPageValue)
// shows it never returns an error status for unparsable/out-of-range numeric
// input — it silently clamps to the documented safe default/bound and still
// returns 200. That IS the fail-closed behavior (no panic, no 5xx, no
// unbounded value reaching the query layer); asserting 400 against this
// correct, already-shipped behavior would be a permanently-red assertion
// against working code. Verified live: limit=-1&offset=abc clamps to
// limit=6 (currentProjectsInitialPageSize), offset=0.
func TestPhase134MatrixErrorMalformedSlugDoesNotPanic(t *testing.T) {
	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/%00%3Cscript%3E", "")
	require.Equalf(t, http.StatusNotFound, status, "malformed slug (control/script chars): %s", string(body))

	longSlug := strings.Repeat("a", 300)
	status, body = phase134MatrixHTTPGet(t, "/api/v1/members/"+longSlug, "")
	require.Equalf(t, http.StatusNotFound, status, "oversized (300-char) slug: %s", string(body))

	status, body = phase134MatrixHTTPGet(t, "/api/v1/members/csubs-leader/projects?limit=-1&offset=abc", "")
	require.Equalf(t, http.StatusOK, status, "invalid pagination params must fail closed via clamping, not error: %s", string(body))
	var parsed struct {
		Data struct {
			Limit  int `json:"limit"`
			Offset int `json:"offset"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.Equalf(t, 6, parsed.Data.Limit, "invalid limit must clamp to the documented safe default, not reach the query layer unbounded")
	require.Equalf(t, 0, parsed.Data.Offset, "invalid offset must clamp to the documented safe default")
}

// ---- Case 9: pagination is honest across pages ------------------------------

func TestPhase134MatrixPaginationHonestAcrossPages(t *testing.T) {
	status1, body1 := phase134MatrixHTTPGet(t, "/api/v1/members/csubs-leader/projects?limit=6&offset=0", "")
	require.Equalf(t, http.StatusOK, status1, "page1: %s", string(body1))
	status2, body2 := phase134MatrixHTTPGet(t, "/api/v1/members/csubs-leader/projects?limit=6&offset=6", "")
	require.Equalf(t, http.StatusOK, status2, "page2: %s", string(body2))

	type projectItem struct {
		AnimeID       int64 `json:"anime_id"`
		FansubGroupID int64 `json:"fansub_group_id"`
	}
	var page1, page2 struct {
		Data struct {
			Items []projectItem `json:"items"`
			Total int           `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body1, &page1))
	require.NoError(t, json.Unmarshal(body2, &page2))

	require.Equalf(t, page1.Data.Total, page2.Data.Total, "total must be identical across both pages (honest total)")

	expectedPage1Len := 6
	if page1.Data.Total < expectedPage1Len {
		expectedPage1Len = page1.Data.Total
	}
	require.Lenf(t, page1.Data.Items, expectedPage1Len, "page1 must have exactly min(6, total) items")
	if page1.Data.Total > 6 {
		require.NotEmptyf(t, page2.Data.Items, "page2 must be non-empty when total>6")
	}

	seen := make(map[string]bool, len(page1.Data.Items))
	for _, item := range page1.Data.Items {
		seen[fmt.Sprintf("%d:%d", item.AnimeID, item.FansubGroupID)] = true
	}
	for _, item := range page2.Data.Items {
		key := fmt.Sprintf("%d:%d", item.AnimeID, item.FansubGroupID)
		require.Falsef(t, seen[key], "item %s appeared on both page1 and page2 (offset wobble)", key)
	}
}
