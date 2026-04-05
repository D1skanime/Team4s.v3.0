package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func TestCreateAnimeRelation_RejectsSelfLink(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo:    adminRoleCheckerStub{isAdmin: true},
		relationRepo: &relationRepoStub{},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/7/relations", strings.NewReader(`{"target_anime_id":7,"relation_label":"Fortsetzung"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.CreateAnimeRelation(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", recorder.Code)
	}

	var payload struct {
		Error struct {
			Message string `json:"message"`
			Code    string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Error.Code != "relation_self_link" {
		t.Fatalf("unexpected code %q", payload.Error.Code)
	}
}

func TestCreateAnimeRelation_UsesValidatedLabelAndTarget(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repoStub := relationRepoStub{}
	handler := &AdminContentHandler{
		authzRepo:    adminRoleCheckerStub{isAdmin: true},
		relationRepo: &repoStub,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/7/relations", strings.NewReader(`{"target_anime_id":12,"relation_label":"Fortsetzung"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.CreateAnimeRelation(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}
	if repoStub.createdSourceID != 7 || repoStub.createdTargetID != 12 || repoStub.createdLabel != "Fortsetzung" {
		t.Fatalf("unexpected create call: %+v", repoStub)
	}
}

func TestSearchAnimeRelationTargets_RequiresQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo:    adminRoleCheckerStub{isAdmin: true},
		relationRepo: &relationRepoStub{},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/anime/7/relation-targets", nil)
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.SearchAnimeRelationTargets(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}

func TestListAnimeRelations_ReturnsRepoRows(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
		relationRepo: &relationRepoStub{
			listResult: []models.AdminAnimeRelation{
				{TargetAnimeID: 12, RelationLabel: "Fortsetzung", TargetTitle: "Naruto Shippuden", TargetType: "tv", TargetStatus: "done"},
			},
		},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/anime/7/relations", nil)
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.ListAnimeRelations(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "Naruto Shippuden") {
		t.Fatalf("expected response body to contain relation title, got %s", recorder.Body.String())
	}
}

func TestUpdateAnimeRelation_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo:    adminRoleCheckerStub{isAdmin: true},
		relationRepo: &relationRepoStub{updateErr: repository.ErrNotFound},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/anime/7/relations/12", strings.NewReader(`{"relation_label":"Nebengeschichte"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}, {Key: "targetAnimeId", Value: "12"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.UpdateAnimeRelation(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

type adminRoleCheckerStub struct {
	isAdmin bool
	err     error
}

func (s adminRoleCheckerStub) UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	return s.isAdmin, s.err
}

type relationRepoStub struct {
	listResult       []models.AdminAnimeRelation
	searchResult     []models.AdminAnimeRelationTarget
	listErr          error
	searchErr        error
	createErr        error
	updateErr        error
	deleteErr        error
	createdSourceID  int64
	createdTargetID  int64
	createdLabel     string
	updatedSourceID  int64
	updatedTargetID  int64
	updatedLabel     string
	deletedSourceID  int64
	deletedTargetID  int64
}

func (s *relationRepoStub) ListAdminAnimeRelations(ctx context.Context, animeID int64) ([]models.AdminAnimeRelation, error) {
	return s.listResult, s.listErr
}

func (s *relationRepoStub) SearchAdminAnimeRelationTargets(ctx context.Context, currentAnimeID int64, query string, limit int) ([]models.AdminAnimeRelationTarget, error) {
	return s.searchResult, s.searchErr
}

func (s *relationRepoStub) CreateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error {
	s.createdSourceID = sourceAnimeID
	s.createdTargetID = targetAnimeID
	s.createdLabel = relationLabel
	return s.createErr
}

func (s *relationRepoStub) UpdateAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64, relationLabel string) error {
	s.updatedSourceID = sourceAnimeID
	s.updatedTargetID = targetAnimeID
	s.updatedLabel = relationLabel
	return s.updateErr
}

func (s *relationRepoStub) DeleteAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64) error {
	s.deletedSourceID = sourceAnimeID
	s.deletedTargetID = targetAnimeID
	return s.deleteErr
}

var _ adminContentRelationRepository = (*relationRepoStub)(nil)
var _ adminRoleChecker = adminRoleCheckerStub{}

func TestValidateAdminRelationLabel_AllowsOnlyPhase5Labels(t *testing.T) {
	if _, message := validateAdminRelationLabel("Fortsetzung"); message != "" {
		t.Fatalf("expected Fortsetzung to validate, got %q", message)
	}
	if _, message := validateAdminRelationLabel("Prequel"); message != "ungueltiger relation_label parameter" {
		t.Fatalf("unexpected message %q", message)
	}
}

func TestDeleteAnimeRelation_PropagatesInternalErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo:    adminRoleCheckerStub{isAdmin: true},
		relationRepo: &relationRepoStub{deleteErr: errors.New("db down")},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/7/relations/12", nil)
	c.Params = gin.Params{{Key: "id", Value: "7"}, {Key: "targetAnimeId", Value: "12"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.DeleteAnimeRelation(c)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}
}
