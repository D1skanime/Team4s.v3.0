package repository

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

// Phase 134-03 (CONTEXT.md D-07): the dedicated verification matrix — cases
// 1-5 (anonymous public, hidden, owner, refresh-only, missing), exercised at
// the HTTP layer against the temporary backend instance provisioned by
// scripts/provision-phase134-matrix-db.sh (team4s_phase134_test, port 18093).
// Every sub-test asserts read-only against the SAME once-seeded fixture state
// (D-07's "seed exactly once" rule) except the two visibility-toggle tests,
// which restore public visibility via t.Cleanup before returning so later
// tests (including a re-run of this same file) see the fixture unmodified.
//
// Tests run sequentially (no t.Parallel()) since the hidden/owner sub-tests
// mutate shared seeded state.

const (
	phase134MatrixBaseURL = "http://192.168.235.196:18093"
	phase134MatrixKCBase  = "http://192.168.235.196:18081"

	phase134MatrixAdminUsername = "csubs-leader@team4s.local"
	phase134MatrixAdminPassword = "123"
	phase134MatrixShepUsername  = "sheppert@team4s.local"
	phase134MatrixShepPassword  = "123"

	phase134MatrixMissingSlug = "phase134-does-not-exist"
)

// ---- Manifest (single source of truth, CONTEXT.md D-02) -------------------

type phase134MatrixManifestProfile struct {
	Identity struct {
		Slug string `json:"slug"`
	} `json:"identity"`
	Visibility struct {
		ProfileVisibility string `json:"profile_visibility"`
	} `json:"visibility"`
	ProfileStatus string `json:"profile_status"`
}

type phase134MatrixManifest struct {
	Profiles map[string]phase134MatrixManifestProfile `json:"profiles"`
}

var (
	phase134AccessManifestOnce sync.Once
	phase134AccessManifestData phase134MatrixManifest
	phase134AccessManifestErr  error
)

// loadPhase134MatrixAccessManifest reads scripts/member-profile-fixture.manifest.json
// (the SAME checked-in manifest the seed script itself reads from, D-02) once
// per test run and caches it; every sub-test in this file reuses the cached
// result instead of re-reading the file.
func loadPhase134MatrixAccessManifest(t *testing.T) phase134MatrixManifest {
	t.Helper()
	phase134AccessManifestOnce.Do(func() {
		raw, err := os.ReadFile(filepath.Join("..", "..", "..", "scripts", "member-profile-fixture.manifest.json"))
		if err != nil {
			phase134AccessManifestErr = err
			return
		}
		phase134AccessManifestErr = json.Unmarshal(raw, &phase134AccessManifestData)
	})
	require.NoError(t, phase134AccessManifestErr, "load member-profile-fixture.manifest.json")
	return phase134AccessManifestData
}

// ---- HTTP helpers against the temporary matrix backend ---------------------

func phase134MatrixHTTPGet(t *testing.T, path string, bearerToken string) (int, []byte) {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, phase134MatrixBaseURL+path, nil)
	require.NoError(t, err)
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return resp.StatusCode, body
}

func phase134MatrixHTTPPut(t *testing.T, path string, bearerToken string, payload map[string]any) (int, []byte) {
	t.Helper()
	raw, err := json.Marshal(payload)
	require.NoError(t, err)
	req, err := http.NewRequest(http.MethodPut, phase134MatrixBaseURL+path, bytes.NewReader(raw))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return resp.StatusCode, body
}

// ---- Keycloak direct-grant helpers ------------------------------------------

func phase134MatrixKeycloakPasswordToken(t *testing.T, username, password string) (accessToken string, refreshToken string) {
	t.Helper()
	form := url.Values{}
	form.Set("grant_type", "password")
	form.Set("client_id", "team4s-frontend")
	form.Set("username", username)
	form.Set("password", password)
	resp, err := http.PostForm(phase134MatrixKCBase+"/realms/team4s/protocol/openid-connect/token", form)
	require.NoError(t, err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Equalf(t, http.StatusOK, resp.StatusCode, "keycloak password grant for %s: %s", username, string(body))

	var parsed struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.NotEmpty(t, parsed.AccessToken, "keycloak password grant returned empty access_token")
	require.NotEmpty(t, parsed.RefreshToken, "keycloak password grant returned empty refresh_token")
	return parsed.AccessToken, parsed.RefreshToken
}

func phase134MatrixKeycloakRefreshToken(t *testing.T, refreshToken string) string {
	t.Helper()
	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("client_id", "team4s-frontend")
	form.Set("refresh_token", refreshToken)
	resp, err := http.PostForm(phase134MatrixKCBase+"/realms/team4s/protocol/openid-connect/token", form)
	require.NoError(t, err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Equalf(t, http.StatusOK, resp.StatusCode, "keycloak refresh grant: %s", string(body))

	var parsed struct {
		AccessToken string `json:"access_token"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.NotEmpty(t, parsed.AccessToken, "keycloak refresh grant returned empty access_token")
	return parsed.AccessToken
}

// phase134MatrixSetSheppertVisibility logs sheppert in and PUTs
// profile_visibility, returning the access token used (so callers that also
// need an authenticated owner request can reuse it without a second login).
func phase134MatrixSetSheppertVisibility(t *testing.T, visibility string) string {
	t.Helper()
	accessToken, _ := phase134MatrixKeycloakPasswordToken(t, phase134MatrixShepUsername, phase134MatrixShepPassword)
	status, body := phase134MatrixHTTPPut(t, "/api/v1/me/profile", accessToken, map[string]any{"profile_visibility": visibility})
	require.Equalf(t, http.StatusOK, status, "PUT /me/profile visibility=%s: %s", visibility, string(body))
	return accessToken
}

// phase134MatrixFetchMissingProfileBody fetches the always-nonexistent slug's
// response body, shared by TestPhase134MatrixMissingProfile and
// TestPhase134MatrixHiddenProfileIsIndistinguishableFromMissing so both tests
// compare against a freshly-fetched body regardless of `-run` filter/order,
// rather than relying on package-level state populated by execution order.
func phase134MatrixFetchMissingProfileBody(t *testing.T) []byte {
	t.Helper()
	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/"+phase134MatrixMissingSlug, "")
	require.Equalf(t, http.StatusNotFound, status, "GET missing profile: %s", string(body))
	return body
}

// ---- Case 1: anonymous public profile --------------------------------------

func TestPhase134MatrixAnonymousPublicProfile(t *testing.T) {
	manifest := loadPhase134MatrixAccessManifest(t)
	expected, ok := manifest.Profiles["csubs-leader"]
	require.True(t, ok, "manifest missing profiles.csubs-leader")

	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/csubs-leader", "")
	require.Equalf(t, http.StatusOK, status, "GET public csubs-leader: %s", string(body))

	var parsed struct {
		Data struct {
			ProfileStatus string `json:"profile_status"`
		} `json:"data"`
		Viewer struct {
			IsOwner bool `json:"is_owner"`
		} `json:"viewer"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.Equal(t, expected.ProfileStatus, parsed.Data.ProfileStatus)
	require.False(t, parsed.Viewer.IsOwner, "anonymous request must never resolve as owner")
}

// ---- Case 5: missing profile -------------------------------------------------

func TestPhase134MatrixMissingProfile(t *testing.T) {
	body := phase134MatrixFetchMissingProfileBody(t)
	require.NotEmpty(t, body)
}

// ---- Case 2: hidden profile is indistinguishable from missing (PMPR-01) ---

func TestPhase134MatrixHiddenProfileIsIndistinguishableFromMissing(t *testing.T) {
	phase134MatrixSetSheppertVisibility(t, "private")
	t.Cleanup(func() { phase134MatrixSetSheppertVisibility(t, "public") })

	status, hiddenBody := phase134MatrixHTTPGet(t, "/api/v1/members/sheppert", "")
	require.Equalf(t, http.StatusNotFound, status, "GET hidden sheppert (anonymous): %s", string(hiddenBody))

	missingBody := phase134MatrixFetchMissingProfileBody(t)
	require.JSONEqf(t, string(missingBody), string(hiddenBody),
		"T-134-08: hidden-profile body must be byte-structurally identical to the missing-profile body (PMPR-01)")
}

// ---- Case 3: owner preview of own hidden profile --------------------------

func TestPhase134MatrixOwnerPreviewOfHiddenProfile(t *testing.T) {
	shepToken := phase134MatrixSetSheppertVisibility(t, "private")
	t.Cleanup(func() { phase134MatrixSetSheppertVisibility(t, "public") })

	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/sheppert", shepToken)
	require.Equalf(t, http.StatusOK, status, "GET hidden sheppert (owner): %s", string(body))

	var parsed struct {
		Viewer struct {
			IsOwner          bool `json:"is_owner"`
			IsPrivatePreview bool `json:"is_private_preview"`
		} `json:"viewer"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.True(t, parsed.Viewer.IsOwner, "owner must resolve as owner on their own hidden profile")
	require.True(t, parsed.Viewer.IsPrivatePreview, "owner must see the private-preview flag on their own hidden profile")
}

// ---- Case 4: refresh-only owner access -------------------------------------

func TestPhase134MatrixRefreshOnlyOwnerAccess(t *testing.T) {
	_, refreshToken := phase134MatrixKeycloakPasswordToken(t, phase134MatrixShepUsername, phase134MatrixShepPassword)
	refreshedAccessToken := phase134MatrixKeycloakRefreshToken(t, refreshToken)

	status, body := phase134MatrixHTTPGet(t, "/api/v1/members/sheppert", refreshedAccessToken)
	require.Equalf(t, http.StatusOK, status, "GET sheppert with refreshed token: %s", string(body))

	var parsed struct {
		Viewer struct {
			IsOwner bool `json:"is_owner"`
		} `json:"viewer"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	require.True(t, parsed.Viewer.IsOwner, "a refreshed access token must be treated identically to a directly-issued one")
}
