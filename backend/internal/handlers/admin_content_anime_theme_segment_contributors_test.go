package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeSegmentContributorsThemeRepo implementiert nur die Methoden, die
// ListThemeSegmentContributors/SetAnimeSegmentContributors benoetigen -- der Rest der
// adminThemeRepository-Schnittstelle bleibt bewusst ungesetzt (nil-embedded), analog
// fakeSegmentOriginThemeRepo (admin_content_anime_theme_segment_origin_test.go).
type fakeSegmentContributorsThemeRepo struct {
	adminThemeRepository

	segment         *models.AdminThemeSegment
	getSegmentErr   error
	getSegmentCalls int

	candidates          []models.AdminThemeSegmentContributorCandidate
	listCandidatesErr   error
	listCandidatesCalls int

	setContributorsErr       error
	setContributorsCalls     int
	setContributorsMemberIDs []int64
}

func (f *fakeSegmentContributorsThemeRepo) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	f.getSegmentCalls++
	if f.getSegmentErr != nil {
		return nil, f.getSegmentErr
	}
	if f.segment != nil {
		return f.segment, nil
	}
	return &models.AdminThemeSegment{ID: segmentID, AnimeID: animeID}, nil
}

func (f *fakeSegmentContributorsThemeRepo) ListThemeSegmentContributorCandidates(ctx context.Context, segmentID int64) ([]models.AdminThemeSegmentContributorCandidate, error) {
	f.listCandidatesCalls++
	if f.listCandidatesErr != nil {
		return nil, f.listCandidatesErr
	}
	return f.candidates, nil
}

func (f *fakeSegmentContributorsThemeRepo) SetThemeSegmentContributors(ctx context.Context, segmentID int64, memberIDs []int64) (int, int, error) {
	f.setContributorsCalls++
	f.setContributorsMemberIDs = memberIDs
	if f.setContributorsErr != nil {
		return 0, 0, f.setContributorsErr
	}
	return len(memberIDs), 0, nil
}

func newContributorsTestContext(method, path string, body string, animeID, segmentID string) (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	} else {
		reader = strings.NewReader("")
	}
	c.Request = httptest.NewRequest(method, path, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: animeID}, {Key: "segmentId", Value: segmentID}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())
	return recorder, c
}

// TestListThemeSegmentContributors_RequiresCapabilityThenSucceeds beweist beide Haelften
// des requireSegmentManage-Gates: ohne die Capability -> 403 und KEIN Kandidatenlisten-
// Aufruf (der Segment-Load selbst findet planmaessig VOR der Pruefung statt, weil er die
// Permission-Check-Release-Version liefert); mit der Capability -> 200 mit Kandidaten +
// origin_release_version_id.
func TestListThemeSegmentContributors_RequiresCapabilityThenSucceeds(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denied without capability performs no candidate-list read", func(t *testing.T) {
		originID := int64(17)
		stub := &fakeSegmentContributorsThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(segmentAssignmentDenyResolverStub{}),
		}

		recorder, c := newContributorsTestContext(http.MethodGet, "/api/v1/admin/anime/10/segments/7/contributors", "", "10", "7")
		handler.ListThemeSegmentContributors(c)

		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.listCandidatesCalls != 0 {
			t.Fatalf("expected no ListThemeSegmentContributorCandidates call when the permission gate denies, got %d calls", stub.listCandidatesCalls)
		}
	})

	t.Run("allowed with capability returns candidates and origin id", func(t *testing.T) {
		originID := int64(17)
		stub := &fakeSegmentContributorsThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
			candidates: []models.AdminThemeSegmentContributorCandidate{
				{MemberID: 1, Name: "Alice", RoleLabel: "Übersetzung", RoleCodes: []string{"translator"}, Selected: true},
			},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
		}

		recorder, c := newContributorsTestContext(http.MethodGet, "/api/v1/admin/anime/10/segments/7/contributors", "", "10", "7")
		handler.ListThemeSegmentContributors(c)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.listCandidatesCalls != 1 {
			t.Fatalf("expected exactly one ListThemeSegmentContributorCandidates call, got %d", stub.listCandidatesCalls)
		}
		var resp struct {
			Data                   []models.AdminThemeSegmentContributorCandidate `json:"data"`
			OriginReleaseVersionID *int64                                         `json:"origin_release_version_id"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if len(resp.Data) != 1 || resp.Data[0].MemberID != 1 {
			t.Fatalf("expected the stubbed candidate in the response, got %+v", resp.Data)
		}
		if resp.OriginReleaseVersionID == nil || *resp.OriginReleaseVersionID != originID {
			t.Fatalf("expected origin_release_version_id=%d in the response, got %+v", originID, resp.OriginReleaseVersionID)
		}
	})
}

// TestListThemeSegmentContributors_SegmentNotFound beweist, dass ein nicht existierendes
// oder zu einem anderen Anime gehoerendes Segment mit 404 abgelehnt wird.
func TestListThemeSegmentContributors_SegmentNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentContributorsThemeRepo{getSegmentErr: repository.ErrNotFound}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder, c := newContributorsTestContext(http.MethodGet, "/api/v1/admin/anime/10/segments/7/contributors", "", "10", "7")
	handler.ListThemeSegmentContributors(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

// TestSetAnimeSegmentContributors_RequiresCapabilityThenSucceeds beweist beide Haelften
// des requireSegmentManage-Gates fuer den Schreibpfad: ohne die Capability -> 403 und KEIN
// SetThemeSegmentContributors-Aufruf; mit der Capability + gueltigem Body -> 200 mit dem
// neu geladenen Segment und der neu geladenen Kandidatenliste.
func TestSetAnimeSegmentContributors_RequiresCapabilityThenSucceeds(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denied without capability performs no repository write", func(t *testing.T) {
		originID := int64(17)
		stub := &fakeSegmentContributorsThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(segmentAssignmentDenyResolverStub{}),
		}

		recorder, c := newContributorsTestContext(http.MethodPut, "/api/v1/admin/anime/10/segments/7/contributors", `{"member_ids":[1,2]}`, "10", "7")
		handler.SetAnimeSegmentContributors(c)

		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.setContributorsCalls != 0 {
			t.Fatalf("expected no SetThemeSegmentContributors call when the permission gate denies, got %d calls", stub.setContributorsCalls)
		}
	})

	t.Run("allowed with capability sets contributors and returns segment plus contributors", func(t *testing.T) {
		originID := int64(17)
		stub := &fakeSegmentContributorsThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
			candidates: []models.AdminThemeSegmentContributorCandidate{
				{MemberID: 1, Name: "Alice", Selected: true},
				{MemberID: 2, Name: "Bob", Selected: true},
			},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
		}

		recorder, c := newContributorsTestContext(http.MethodPut, "/api/v1/admin/anime/10/segments/7/contributors", `{"member_ids":[1,2]}`, "10", "7")
		handler.SetAnimeSegmentContributors(c)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.setContributorsCalls != 1 {
			t.Fatalf("expected exactly one SetThemeSegmentContributors call, got %d", stub.setContributorsCalls)
		}
		if len(stub.setContributorsMemberIDs) != 2 {
			t.Fatalf("expected the two requested member_ids to be forwarded, got %+v", stub.setContributorsMemberIDs)
		}
		var resp struct {
			Data         models.AdminThemeSegment                       `json:"data"`
			Contributors []models.AdminThemeSegmentContributorCandidate `json:"contributors"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if resp.Data.ID != 7 {
			t.Fatalf("expected the reloaded segment in the response, got %+v", resp.Data)
		}
		if len(resp.Contributors) != 2 {
			t.Fatalf("expected the reloaded contributor candidates in the response, got %+v", resp.Contributors)
		}
	})
}

// TestSetAnimeSegmentContributors_NoOriginIsConflict beweist, dass ein Segment ohne
// gesetzte Origin-Release-Version JEDE Contributor-Auswahl mit 409/segment_has_no_origin
// ablehnt, OHNE SetThemeSegmentContributors ueberhaupt aufzurufen (156-UAT.md
// Auftragspunkt 2/14).
func TestSetAnimeSegmentContributors_NoOriginIsConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentContributorsThemeRepo{
		// Kein OriginReleaseVersionID, aber eine zugewiesene Release-Version, damit die
		// Permission-Pruefung selbst (die eine releaseVariantID>0 braucht) nicht schon
		// vorher mit 400 fehlschlaegt -- dieser Test soll ausschliesslich den
		// "kein Origin"-409-Pfad beweisen, nicht die Permission-Pruefung.
		segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, AssignedReleaseVersionIDs: []int64{99}},
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder, c := newContributorsTestContext(http.MethodPut, "/api/v1/admin/anime/10/segments/7/contributors", `{"member_ids":[1]}`, "10", "7")
	handler.SetAnimeSegmentContributors(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if stub.setContributorsCalls != 0 {
		t.Fatalf("expected no SetThemeSegmentContributors call for a segment without an origin, got %d calls", stub.setContributorsCalls)
	}
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Error.Code != "segment_has_no_origin" {
		t.Fatalf("expected code=segment_has_no_origin, got %q", resp.Error.Code)
	}
}

// TestSetAnimeSegmentContributors_RepositoryConflictIsMemberNotOriginContributor beweist,
// dass ein Repository-ErrConflict (mindestens ein member_id ist kein effektiver
// Origin-Contributor) als 409/member_not_origin_contributor durchgereicht wird.
func TestSetAnimeSegmentContributors_RepositoryConflictIsMemberNotOriginContributor(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originID := int64(17)
	stub := &fakeSegmentContributorsThemeRepo{
		segment:            &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
		setContributorsErr: repository.ErrConflict,
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder, c := newContributorsTestContext(http.MethodPut, "/api/v1/admin/anime/10/segments/7/contributors", `{"member_ids":[999]}`, "10", "7")
	handler.SetAnimeSegmentContributors(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Error.Code != "member_not_origin_contributor" {
		t.Fatalf("expected code=member_not_origin_contributor, got %q", resp.Error.Code)
	}
}

// TestSetAnimeSegmentContributors_MalformedBodyIsBadRequest beweist, dass ein fehlendes/
// fehlerhaftes JSON-Body mit 400 abgelehnt wird, bevor Segment-Load, Permission-Pruefung
// oder Repository ueberhaupt erreicht werden.
func TestSetAnimeSegmentContributors_MalformedBodyIsBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentContributorsThemeRepo{}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder, c := newContributorsTestContext(http.MethodPut, "/api/v1/admin/anime/10/segments/7/contributors", `{"member_ids": "not-a-list"}`, "10", "7")
	handler.SetAnimeSegmentContributors(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if stub.getSegmentCalls != 0 {
		t.Fatalf("expected no GetAnimeSegmentByID call on a malformed body, got %d calls", stub.getSegmentCalls)
	}
	if stub.setContributorsCalls != 0 {
		t.Fatalf("expected no SetThemeSegmentContributors call on a malformed body, got %d calls", stub.setContributorsCalls)
	}
}
