package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// contributionsPermissionResolverDenied implementiert permissions.Resolver und
// verweigert immer den Zugriff (für IDOR-Test mit 403).
type contributionsPermissionResolverDenied struct{}

func (s contributionsPermissionResolverDenied) ResolveFansubGroup(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s contributionsPermissionResolverDenied) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s contributionsPermissionResolverDenied) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	// Kontext mit gültiger Gruppe, aber keine Rollen → kein Leader-Bypass, kein Contribution-Match → ReasonNoMembership → 403
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (s contributionsPermissionResolverDenied) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s contributionsPermissionResolverDenied) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func (s contributionsPermissionResolverDenied) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

// contributionsPermissionResolverAllowed implementiert permissions.Resolver und
// erlaubt immer den Zugriff als fansub_lead (für 200-Test).
type contributionsPermissionResolverAllowed struct{}

func (s contributionsPermissionResolverAllowed) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (s contributionsPermissionResolverAllowed) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (s contributionsPermissionResolverAllowed) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (s contributionsPermissionResolverAllowed) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (s contributionsPermissionResolverAllowed) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return []string{permissions.RoleFansubLead}, nil
}

func (s contributionsPermissionResolverAllowed) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

// contributionsRepoStub ist ein minimaler Stub für FansubReleasesContributionsRepository
// für Handler-Tests ohne echte DB-Verbindung.
type contributionsRepoStub struct {
	result *repository.EffectiveContributionsResult
	err    error
}

func (s *contributionsRepoStub) ListEffectiveContributionsForVersion(
	_ context.Context,
	_ int64,
	_ int64,
) (*repository.EffectiveContributionsResult, error) {
	return s.result, s.err
}

// TestGetEffectiveContributionsForVersion verankert T-83-IDOR als messbar:
// - denied-Subtest: 403 wenn CanForReleaseVersion denied ist
// - allowed-Subtest: 200 mit is_override=false wenn Berechtigung vorhanden und Repo leer
func TestGetEffectiveContributionsForVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denied", func(t *testing.T) {
		// Resolver mit leerem FansubGroupIDs-Kontext → kein Leader-Bypass, keine Contribution → 403
		// Repo wird absichtlich nil gelassen — der Handler darf nie bis zum Repo-Call gelangen
		handler := &AdminContentHandler{
			permissionSvc:                   permissions.NewService(contributionsPermissionResolverDenied{}),
			fansubReleasesContributionsRepo: nil,
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodGet,
			"/api/v1/admin/release-versions/42/contributions/effective?fansub_group_id=5", nil)
		c.Params = gin.Params{{Key: "versionId", Value: "42"}}
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "User"})

		handler.GetEffectiveContributionsForVersion(c)

		// T-83-IDOR: muss 403 zurückgeben, NICHT 200 mit Daten
		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected 403 (IDOR-Mitigation), got %d body=%s", recorder.Code, recorder.Body.String())
		}
	})

	t.Run("allowed", func(t *testing.T) {
		// Resolver mit fansub_lead-Rolle → Zugriff erlaubt; Repo gibt leeres Ergebnis zurück
		stub := &contributionsRepoStub{
			result: &repository.EffectiveContributionsResult{
				Rows:       []repository.EffectiveContributionRow{},
				IsOverride: false,
				Source:     "anime_default",
			},
		}
		handler := &AdminContentHandler{
			permissionSvc:                   permissions.NewService(contributionsPermissionResolverAllowed{}),
			fansubReleasesContributionsRepo: stub,
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodGet,
			"/api/v1/admin/release-versions/42/contributions/effective?fansub_group_id=5", nil)
		c.Params = gin.Params{{Key: "versionId", Value: "42"}}
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Lead"})

		handler.GetEffectiveContributionsForVersion(c)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
		}

		var resp struct {
			Data []repository.EffectiveContributionRow `json:"data"`
			Meta struct {
				IsOverride bool   `json:"is_override"`
				Source     string `json:"source"`
			} `json:"meta"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if resp.Meta.IsOverride != false {
			t.Fatalf("expected is_override=false, got %v", resp.Meta.IsOverride)
		}
		if resp.Meta.Source != "anime_default" {
			t.Fatalf("expected source=anime_default, got %q", resp.Meta.Source)
		}
	})
}
