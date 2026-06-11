package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type memberRepoStub struct {
	listMembers []models.FansubGroupAppMember
	listErr     error
	createErr   error
	createResp  *models.FansubGroupAppMember
	listCalls   int
	createCalls int
}

func (s *memberRepoStub) ListByFansubGroup(_ context.Context, _ int64) ([]models.FansubGroupAppMember, error) {
	s.listCalls++
	return s.listMembers, s.listErr
}

func (s *memberRepoStub) SearchCandidates(_ context.Context, _ int64, _ string, _ int) ([]models.FansubGroupMemberCandidate, error) {
	return []models.FansubGroupMemberCandidate{}, nil
}

func (s *memberRepoStub) Create(_ context.Context, _ int64, _ models.FansubGroupMemberCreateInput) (*models.FansubGroupAppMember, error) {
	s.createCalls++
	return s.createResp, s.createErr
}

func (s *memberRepoStub) SetRole(_ context.Context, _ int64, _ int64, _ models.FansubGroupMemberRoleUpdateInput) (*models.FansubGroupAppMember, error) {
	return nil, nil
}

func (s *memberRepoStub) UpdateStatus(_ context.Context, _ int64, _ int64, _ models.FansubGroupMemberStatusUpdateInput) (*models.FansubGroupAppMember, error) {
	return nil, nil
}

type auditLogStub struct {
	entries []repository.AuditLogEntry
}

func (s *auditLogStub) Write(_ context.Context, entry repository.AuditLogEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

type invitationRepoStub struct {
	listResp   []models.FansubGroupInvitation
	createResp *models.FansubGroupInvitationCreateResult
	createErr  error
}

type profileRepoStub struct {
	getResp       *models.MemberProfile
	getErr        error
	updateResp    *models.MemberProfile
	updateErr     error
	attachResp    *models.MemberProfile
	attachErr     error
	bgAttachResp  *models.MemberProfile
	bgAttachErr   error
	updateCalls   int
	attachCalls   int
	bgAttachCalls int
	lastUpdateArg models.MemberProfileUpdateInput
	lastAttachArg models.MemberProfileAvatarUploadInput
	lastBgArg     models.MemberProfileBackgroundUploadInput

	storyAssetByIDResp *models.StoryImageAssetRef
	storyAssetByIDErr  error
}

type contributorRepoStub struct {
	listResp    []models.ContributorGroupOverview
	listErr     error
	detailResp  *models.ContributorGroupDetail
	detailErr   error
	listCalls   int
	detailCalls int
}

func (s *contributorRepoStub) ListContributorGroups(_ context.Context, _ models.ContributorGroupQueryInput) ([]models.ContributorGroupOverview, error) {
	s.listCalls++
	return s.listResp, s.listErr
}

func (s *contributorRepoStub) GetContributorGroupDetail(_ context.Context, _ models.ContributorGroupQueryInput, _ int64) (*models.ContributorGroupDetail, error) {
	s.detailCalls++
	return s.detailResp, s.detailErr
}

func (s *profileRepoStub) GetOwnProfile(_ context.Context, _ int64) (*models.MemberProfile, error) {
	return s.getResp, s.getErr
}

func (s *profileRepoStub) UpdateOwnProfile(_ context.Context, _ int64, input models.MemberProfileUpdateInput) (*models.MemberProfile, error) {
	s.updateCalls++
	s.lastUpdateArg = input
	return s.updateResp, s.updateErr
}

func (s *profileRepoStub) AttachUploadedAvatar(_ context.Context, _ int64, input models.MemberProfileAvatarUploadInput) (*models.MemberProfile, error) {
	s.attachCalls++
	s.lastAttachArg = input
	return s.attachResp, s.attachErr
}

func (s *profileRepoStub) AttachUploadedBackground(_ context.Context, _ int64, input models.MemberProfileBackgroundUploadInput) (*models.MemberProfile, error) {
	s.bgAttachCalls++
	s.lastBgArg = input
	if s.bgAttachResp != nil || s.bgAttachErr != nil {
		return s.bgAttachResp, s.bgAttachErr
	}
	return s.attachResp, s.attachErr
}

func (s *profileRepoStub) InsertStoryImageAsset(_ context.Context, _ models.StoryImageUploadInput) (int64, error) {
	return 0, nil
}

func (s *profileRepoStub) GetStoryImageAssetsByMember(_ context.Context, _ int64) ([]models.StoryImageAssetRef, error) {
	return nil, nil
}

func (s *profileRepoStub) GetStoryImageAssetByID(_ context.Context, _ int64) (*models.StoryImageAssetRef, error) {
	return s.storyAssetByIDResp, s.storyAssetByIDErr
}

func (s *profileRepoStub) DeleteStoryImageAsset(_ context.Context, _ int64, _ int64) error {
	return nil
}

func (s *invitationRepoStub) ListByFansubGroup(_ context.Context, _ int64) ([]models.FansubGroupInvitation, error) {
	return s.listResp, nil
}

func (s *invitationRepoStub) Create(_ context.Context, _ int64, _ models.FansubGroupInvitationCreateInput) (*models.FansubGroupInvitationCreateResult, error) {
	return s.createResp, s.createErr
}

func (s *invitationRepoStub) Cancel(_ context.Context, _ int64, _ int64, _ models.FansubGroupInvitationCancelInput) (*models.FansubGroupInvitation, error) {
	return nil, nil
}

func (s *invitationRepoStub) Accept(_ context.Context, _ models.AcceptFansubInvitationInput) (*models.FansubGroupInvitation, *models.FansubGroupAppMember, error) {
	return nil, nil, nil
}

type permissionResolverStub struct {
	context *permissions.Context
	roles   map[int64][]string
}

func (s permissionResolverStub) ResolveFansubGroup(_ context.Context, _ int64) (*permissions.Context, error) {
	return s.context, nil
}

func (s permissionResolverStub) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return s.context, nil
}

func (s permissionResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return s.context, nil
}

func (s permissionResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return s.context, nil
}

func (s permissionResolverStub) ListActorGroupRoles(_ context.Context, _ int64, fansubGroupID int64) ([]string, error) {
	return s.roles[fansubGroupID], nil
}

func (s permissionResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func makeAppAuthTestContext(method string, target string, body []byte, identity middleware.AuthIdentity, params ...gin.Param) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	c.Request = req
	c.Params = params
	c.Set("auth_identity", identity)
	return c, recorder
}

func decodeBody(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
	return body
}

func makeMultipartTestContext(method string, target string, fieldName string, filename string, fileContent []byte, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, _ := writer.CreateFormFile(fieldName, filename)
	_, _ = part.Write(fileContent)
	_ = writer.Close()

	req := httptest.NewRequest(method, target, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req
	c.Set("auth_identity", identity)
	return c, recorder
}

func makeMultipartFieldsTestContext(method string, target string, files map[string]struct {
	filename string
	content  []byte
}, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for fieldName, file := range files {
		part, _ := writer.CreateFormFile(fieldName, file.filename)
		_, _ = part.Write(file.content)
	}
	_ = writer.Close()

	req := httptest.NewRequest(method, target, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req
	c.Set("auth_identity", identity)
	return c, recorder
}

func tinyPNGBytes(t *testing.T) []byte {
	t.Helper()
	data, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
	if err != nil {
		t.Fatalf("decode test png: %v", err)
	}
	return data
}

func tinyGIFBytes(t *testing.T) []byte {
	t.Helper()
	data, err := base64.StdEncoding.DecodeString("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")
	if err != nil {
		t.Fatalf("decode test gif: %v", err)
	}
	return data
}

func TestListFansubGroupAppMembersAllowsOwnGroupLead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	memberRepo := &memberRepoStub{
		listMembers: []models.FansubGroupAppMember{{
			ID:            21,
			FansubGroupID: 88,
			AppUserID:     11,
			Status:        models.FansubGroupMemberStatusActive,
			Roles:         []string{permissions.RoleFansubLead},
		}},
	}
	handler := &AppAuthHandler{
		memberRepo: memberRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: &auditLogStub{},
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/88/app-members", nil, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Phase Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.ListFansubGroupAppMembers(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if memberRepo.listCalls != 1 {
		t.Fatalf("expected list repo to be called once, got %d", memberRepo.listCalls)
	}
	body := decodeBody(t, recorder)
	data, ok := body["data"].([]any)
	if !ok || len(data) != 1 {
		t.Fatalf("expected one member in response, got %#v", body["data"])
	}
}

func TestListFansubGroupAppMembersDeniesCrossGroupAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	memberRepo := &memberRepoStub{}
	handler := &AppAuthHandler{
		memberRepo: memberRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{94}},
			roles:   map[int64][]string{},
		}),
		auditLogRepo: &auditLogStub{},
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/94/app-members", nil, middleware.AuthIdentity{
		UserID:        102,
		AppUserID:     12,
		DisplayName:   "Phase Member",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "94"})

	handler.ListFansubGroupAppMembers(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if memberRepo.listCalls != 0 {
		t.Fatalf("expected repo list to be skipped on denied access")
	}
	body := decodeBody(t, recorder)
	errBody, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error body, got %#v", body)
	}
	if errBody["reason_code"] != permissions.ReasonNoMembership {
		t.Fatalf("expected reason_code %q, got %#v", permissions.ReasonNoMembership, errBody["reason_code"])
	}
}

func TestCreateFansubGroupAppMemberRejectsDesignerWithoutManagePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	memberRepo := &memberRepoStub{}
	handler := &AppAuthHandler{
		memberRepo: memberRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleDesigner}},
		}),
		auditLogRepo: &auditLogStub{},
	}

	body := []byte(`{"app_user_id":12,"roles":["fansub_lead"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/app-members", body, middleware.AuthIdentity{
		UserID:        103,
		AppUserID:     15,
		DisplayName:   "Phase Designer",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupAppMember(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if memberRepo.createCalls != 0 {
		t.Fatalf("expected repo create to be skipped on denied access")
	}
}

func TestGetOwnProfileReturnsAggregate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           44,
			AppUserID:          11,
			DisplayName:        "Mika",
			FansubName:         "MikaFX",
			Email:              "mika@example.com",
			KeycloakSubject:    "kc-11",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Mika",
		},
	}
	handler := &AppAuthHandler{
		profileRepo:        profileRepo,
		keycloakAccountURL: "http://localhost:8081/realms/team4s/account",
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/profile", nil, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.GetOwnProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].(map[string]any)
	if data["display_name"] != "Mika" {
		t.Fatalf("expected display_name Mika, got %#v", data["display_name"])
	}
	capabilities := data["capabilities"].(map[string]any)
	if capabilities["can_open_keycloak_account"] != true {
		t.Fatalf("expected keycloak account capability, got %#v", capabilities)
	}
}

func TestGetOwnProfileWithoutMemberProfileReturnsAccountOnlyCapabilities(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           0,
			HasMemberProfile:   false,
			AppUserID:          11,
			DisplayName:        "Phase Admin",
			FansubName:         "",
			Email:              "platform-admin@example.com",
			KeycloakSubject:    "kc-11",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Phase Admin",
		},
	}
	handler := &AppAuthHandler{
		profileRepo:        profileRepo,
		keycloakAccountURL: "http://localhost:8081/realms/team4s/account",
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/profile", nil, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Phase Admin",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.GetOwnProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].(map[string]any)
	if data["has_member_profile"] != false {
		t.Fatalf("expected has_member_profile false, got %#v", data["has_member_profile"])
	}
	capabilities := data["capabilities"].(map[string]any)
	if capabilities["can_edit_own_profile"] != false || capabilities["can_upload_own_avatar"] != false {
		t.Fatalf("expected account-only profile mutation capabilities to be disabled, got %#v", capabilities)
	}
	if capabilities["can_view_memberships"] != false || capabilities["can_view_historical_credits"] != false {
		t.Fatalf("expected account-only member sections to be hidden, got %#v", capabilities)
	}
	if capabilities["can_open_keycloak_account"] != true {
		t.Fatalf("expected keycloak account capability, got %#v", capabilities)
	}
}

func TestUpdateOwnProfileRejectsMissingMemberProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           0,
			HasMemberProfile:   false,
			AppUserID:          11,
			DisplayName:        "Phase Admin",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Phase Admin",
		},
	}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"display_name":"Phase Admin"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Phase Admin",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileRejectsReadonlyIdentityFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"display_name":"Mika Nova","email":"new@example.com"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileRejectsDisabledUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"display_name":"Mika Nova"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusDisabled,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileAcceptsTipTapStoryJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp:    updated,
		updateResp: updated,
	}
	handler := &AppAuthHandler{
		profileRepo: profileRepo,
		tiptapSvc:   services.NewTipTapService(),
	}

	body := []byte(`{
		"member_story_json":{
			"type":"doc",
			"content":[
				{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Profil"}]},
				{"type":"paragraph","content":[{"type":"text","text":"Rot","marks":[{"type":"textStyle","attrs":{"colorToken":"red"}}]}]},
				{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Rolle"}]}]}]}]}
			]
		}
	}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 1 {
		t.Fatalf("expected one profile update call, got %d", profileRepo.updateCalls)
	}
	input := profileRepo.lastUpdateArg
	if !input.MemberStoryJSON.Set || input.MemberStoryJSON.Value == nil {
		t.Fatalf("expected member_story_json to be set")
	}
	if !strings.Contains(string(*input.MemberStoryJSON.Value), `"table"`) {
		t.Fatalf("expected table structure to survive in JSON payload, got %s", string(*input.MemberStoryJSON.Value))
	}
	if !input.MemberStoryHTML.Set || input.MemberStoryHTML.Value == nil || !strings.Contains(*input.MemberStoryHTML.Value, "<table>") {
		t.Fatalf("expected rendered HTML table, got %#v", input.MemberStoryHTML.Value)
	}
	if !input.MemberStoryText.Set || input.MemberStoryText.Value == nil || !strings.Contains(*input.MemberStoryText.Value, "Profil") {
		t.Fatalf("expected extracted plain text, got %#v", input.MemberStoryText.Value)
	}
}

func TestUpdateOwnProfileAcceptsYearNormalizedActivityDates(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp:    updated,
		updateResp: updated,
	}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"active_from_date":"2016-01-01","active_until_date":"2020-01-01","is_currently_active":false}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	input := profileRepo.lastUpdateArg
	if !input.ActiveFromDate.Set || input.ActiveFromDate.Value == nil || *input.ActiveFromDate.Value != "2016-01-01" {
		t.Fatalf("expected active_from_date to be forwarded, got %#v", input.ActiveFromDate)
	}
	if !input.ActiveUntilDate.Set || input.ActiveUntilDate.Value == nil || *input.ActiveUntilDate.Value != "2020-01-01" {
		t.Fatalf("expected active_until_date to be forwarded, got %#v", input.ActiveUntilDate)
	}
}

func TestUpdateOwnProfileRejectsNonYearNormalizedActivityDate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 44, AppUserID: 11},
	}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"active_from_date":"2016-05-01"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileRejectsInvalidActivityDateRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 44, AppUserID: 11},
	}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"active_from_date":"2021-01-01","active_until_date":"2020-01-01"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileCurrentlyActiveClearsUntilDate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp:    updated,
		updateResp: updated,
	}
	handler := &AppAuthHandler{profileRepo: profileRepo}

	body := []byte(`{"active_from_date":"2016-01-01","active_until_date":"2020-01-01","is_currently_active":true}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	input := profileRepo.lastUpdateArg
	if !input.ActiveUntilDate.Set || input.ActiveUntilDate.Value != nil {
		t.Fatalf("expected active_until_date to be cleared, got %#v", input.ActiveUntilDate)
	}
}

func TestUpdateOwnProfileRejectsUnknownTipTapNode(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 44, AppUserID: 11},
	}
	handler := &AppAuthHandler{
		profileRepo: profileRepo,
		tiptapSvc:   services.NewTipTapService(),
	}

	body := []byte(`{"member_story_json":{"type":"doc","content":[{"type":"codeBlock","content":[]}]}}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUpdateOwnProfileRejectsClientProvidedStoryHTML(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 44, AppUserID: 11},
	}
	handler := &AppAuthHandler{
		profileRepo: profileRepo,
		tiptapSvc:   services.NewTipTapService(),
	}

	body := []byte(`{"member_story_html":"<script>alert(1)</script>"}`)
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.updateCalls != 0 {
		t.Fatalf("expected no profile update call, got %d", profileRepo.updateCalls)
	}
}

func TestUploadOwnProfileAvatarRejectsInvalidFileType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           44,
			AppUserID:          11,
			DisplayName:        "Mika",
			FansubName:         "MikaFX",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Mika",
		},
	}
	handler := &AppAuthHandler{
		profileRepo:     profileRepo,
		mediaStorageDir: t.TempDir(),
		mediaBaseURL:    "http://localhost:8092",
	}

	c, recorder := makeMultipartTestContext(http.MethodPost, "/api/v1/me/profile/avatar", "file", "avatar.txt", []byte("not an image"), middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UploadOwnProfileAvatar(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.attachCalls != 0 {
		t.Fatalf("expected no avatar attach call, got %d", profileRepo.attachCalls)
	}
}

func TestUploadOwnProfileAvatarRejectsSVG(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileRepo := &profileRepoStub{}
	handler := &AppAuthHandler{
		profileRepo:     profileRepo,
		mediaStorageDir: t.TempDir(),
		mediaBaseURL:    "http://localhost:8092",
	}

	c, recorder := makeMultipartTestContext(http.MethodPost, "/api/v1/me/profile/avatar", "file", "avatar.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UploadOwnProfileAvatar(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.attachCalls != 0 {
		t.Fatalf("expected no avatar attach call, got %d", profileRepo.attachCalls)
	}
}

func TestUploadOwnProfileAvatarStoresSourceOriginalAndCroppedDisplay(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           44,
			AppUserID:          11,
			DisplayName:        "Mika",
			FansubName:         "MikaFX",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Mika",
		},
		attachResp: updated,
	}
	handler := &AppAuthHandler{
		profileRepo:     profileRepo,
		mediaStorageDir: t.TempDir(),
		mediaBaseURL:    "http://localhost:8092",
	}

	png := tinyPNGBytes(t)
	c, recorder := makeMultipartFieldsTestContext(http.MethodPost, "/api/v1/me/profile/avatar", map[string]struct {
		filename string
		content  []byte
	}{
		"source_file":  {filename: "source.png", content: png},
		"cropped_file": {filename: "cropped.png", content: png},
	}, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UploadOwnProfileAvatar(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.attachCalls != 1 {
		t.Fatalf("expected one avatar attach call, got %d", profileRepo.attachCalls)
	}
	if !strings.Contains(profileRepo.lastAttachArg.FilePath, "/original.png") {
		t.Fatalf("expected cropped display original path, got %q", profileRepo.lastAttachArg.FilePath)
	}
	if !strings.Contains(profileRepo.lastAttachArg.SourceFilePath, "/source_original.png") {
		t.Fatalf("expected retained source_original path, got %q", profileRepo.lastAttachArg.SourceFilePath)
	}
	if strings.Contains(profileRepo.lastAttachArg.PublicURL, "source_original") {
		t.Fatalf("expected public URL to expose cropped display path, got %q", profileRepo.lastAttachArg.PublicURL)
	}
}

func TestUploadOwnProfileAvatarStoresAnimatedGIFWithoutFlattening(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           44,
			AppUserID:          11,
			DisplayName:        "Mika",
			FansubName:         "MikaFX",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Mika",
		},
		attachResp: updated,
	}
	mediaStorageDir := t.TempDir()
	handler := &AppAuthHandler{
		profileRepo:     profileRepo,
		mediaStorageDir: mediaStorageDir,
		mediaBaseURL:    "http://localhost:8092",
	}

	gif := tinyGIFBytes(t)
	c, recorder := makeMultipartFieldsTestContext(http.MethodPost, "/api/v1/me/profile/avatar", map[string]struct {
		filename string
		content  []byte
	}{
		"source_file":  {filename: "source.gif", content: gif},
		"cropped_file": {filename: "avatar.gif", content: gif},
	}, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UploadOwnProfileAvatar(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.attachCalls != 1 {
		t.Fatalf("expected one avatar attach call, got %d", profileRepo.attachCalls)
	}
	if !strings.Contains(profileRepo.lastAttachArg.FilePath, "/original.gif") {
		t.Fatalf("expected GIF display original path, got %q", profileRepo.lastAttachArg.FilePath)
	}
	if !strings.Contains(profileRepo.lastAttachArg.SourceFilePath, "/source_original.gif") {
		t.Fatalf("expected retained GIF source_original path, got %q", profileRepo.lastAttachArg.SourceFilePath)
	}
	if profileRepo.lastAttachArg.MimeType != "image/gif" {
		t.Fatalf("expected image/gif mime type, got %q", profileRepo.lastAttachArg.MimeType)
	}
	if profileRepo.lastAttachArg.SizeBytes != int64(len(gif)) {
		t.Fatalf("expected original GIF size %d, got %d", len(gif), profileRepo.lastAttachArg.SizeBytes)
	}
	relativePath := strings.TrimPrefix(profileRepo.lastAttachArg.FilePath, "/media/")
	stored, err := os.ReadFile(filepath.Join(mediaStorageDir, relativePath))
	if err != nil {
		t.Fatalf("read stored gif: %v", err)
	}
	if len(stored) < 3 || !bytes.HasPrefix(stored, []byte("GIF")) {
		t.Fatalf("expected stored avatar to remain a GIF")
	}
}

func TestAvatarDisplayCopyFormatsPreserveAnimatedImages(t *testing.T) {
	if !shouldCopyAvatarDisplayFile("image/gif") {
		t.Fatal("expected GIF avatar display files to be copied")
	}
	if !shouldCopyAvatarDisplayFile("image/webp") {
		t.Fatal("expected WebP avatar display files to be copied")
	}
	if shouldCopyAvatarDisplayFile("image/png") {
		t.Fatal("expected PNG avatar display files to stay on the crop encode path")
	}
	if avatarSourceExtFromMime("image/webp") != "webp" {
		t.Fatalf("expected WebP avatar display extension to be webp, got %q", avatarSourceExtFromMime("image/webp"))
	}
}

func TestUploadOwnProfileBackgroundStoresSourceOriginalAndCroppedDisplay(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updated := &models.MemberProfile{
		MemberID:           44,
		AppUserID:          11,
		DisplayName:        "Mika",
		FansubName:         "MikaFX",
		ProfileVisibility:  models.ProfileVisibilityMembersOnly,
		AccountStatus:      models.AppUserStatusActive,
		AccountDisplayName: "Mika",
	}
	profileRepo := &profileRepoStub{
		getResp: &models.MemberProfile{
			MemberID:           44,
			AppUserID:          11,
			DisplayName:        "Mika",
			FansubName:         "MikaFX",
			ProfileVisibility:  models.ProfileVisibilityMembersOnly,
			AccountStatus:      models.AppUserStatusActive,
			AccountDisplayName: "Mika",
		},
		attachResp: updated,
	}
	handler := &AppAuthHandler{
		profileRepo:     profileRepo,
		mediaStorageDir: t.TempDir(),
		mediaBaseURL:    "http://localhost:8092",
	}

	png := tinyPNGBytes(t)
	c, recorder := makeMultipartFieldsTestContext(http.MethodPost, "/api/v1/me/profile/background", map[string]struct {
		filename string
		content  []byte
	}{
		"source_file":  {filename: "source.png", content: png},
		"cropped_file": {filename: "cropped.png", content: png},
	}, middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     11,
		DisplayName:   "Mika",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UploadOwnProfileBackground(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if profileRepo.bgAttachCalls != 1 {
		t.Fatalf("expected one background attach call, got %d", profileRepo.bgAttachCalls)
	}
	if !strings.Contains(profileRepo.lastBgArg.FilePath, "/original.png") {
		t.Fatalf("expected cropped display original path, got %q", profileRepo.lastBgArg.FilePath)
	}
	if !strings.Contains(profileRepo.lastBgArg.SourceFilePath, "/source_original.png") {
		t.Fatalf("expected retained source_original path, got %q", profileRepo.lastBgArg.SourceFilePath)
	}
	if strings.Contains(profileRepo.lastBgArg.PublicURL, "source_original") {
		t.Fatalf("expected public URL to expose cropped display path, got %q", profileRepo.lastBgArg.PublicURL)
	}
	if profileRepo.lastBgArg.Width == nil || *profileRepo.lastBgArg.Width != 1 {
		t.Fatalf("expected cropped display width to be retained, got %#v", profileRepo.lastBgArg.Width)
	}
	if profileRepo.lastBgArg.Height == nil || *profileRepo.lastBgArg.Height != 1 {
		t.Fatalf("expected cropped display height to be retained, got %#v", profileRepo.lastBgArg.Height)
	}
}

func TestCreateFansubGroupAppMemberMapsDuplicateMembershipConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)

	memberRepo := &memberRepoStub{createErr: repository.ErrConflict}
	handler := &AppAuthHandler{
		memberRepo: memberRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: &auditLogStub{},
	}

	body := []byte(`{"app_user_id":12,"roles":["fansub_lead"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/app-members", body, middleware.AuthIdentity{
		UserID:        104,
		AppUserID:     11,
		DisplayName:   "Phase Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupAppMember(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	bodyMap := decodeBody(t, recorder)
	errBody, ok := bodyMap["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error body, got %#v", bodyMap)
	}
	if errBody["message"] != "mitgliedschaft existiert bereits" {
		t.Fatalf("expected duplicate membership message, got %#v", errBody["message"])
	}
}

func TestGetFansubGroupCapabilitiesReturnsViewWithoutManageForProjectLead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AppAuthHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleProjectLead}},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/88/capabilities", nil, middleware.AuthIdentity{
		UserID:        105,
		AppUserID:     21,
		DisplayName:   "Project Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.GetFansubGroupCapabilities(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data, ok := body["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data object, got %#v", body)
	}
	if data["can_view_members"] != true {
		t.Fatalf("expected can_view_members=true, got %#v", data["can_view_members"])
	}
	if data["can_manage_members"] != false {
		t.Fatalf("expected can_manage_members=false, got %#v", data["can_manage_members"])
	}
	if data["can_view_releases"] != true {
		t.Fatalf("expected can_view_releases=true, got %#v", data["can_view_releases"])
	}
	if data["can_view_release_media"] != true {
		t.Fatalf("expected can_view_release_media=true, got %#v", data["can_view_release_media"])
	}
	if data["can_upload_release_media"] != true {
		t.Fatalf("expected can_upload_release_media=true, got %#v", data["can_upload_release_media"])
	}
	if data["can_edit_release_notes"] != true {
		t.Fatalf("expected can_edit_release_notes=true, got %#v", data["can_edit_release_notes"])
	}
}

func TestGetFansubGroupCapabilitiesAllowsEncoderMediaAndNotesWorkspace(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AppAuthHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleEncoder}},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/88/capabilities", nil, middleware.AuthIdentity{
		UserID:        107,
		AppUserID:     41,
		DisplayName:   "Encoder",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.GetFansubGroupCapabilities(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].(map[string]any)
	if data["can_view_releases"] != true {
		t.Fatalf("expected can_view_releases=true, got %#v", data["can_view_releases"])
	}
	if data["can_edit_group"] != false || data["can_view_members"] != false {
		t.Fatalf("expected encoder to skip group/member permissions, got %#v", data)
	}
	if data["can_view_release_media"] != true {
		t.Fatalf("expected encoder to view release media, got %#v", data["can_view_release_media"])
	}
	if data["can_upload_release_media"] != true || data["can_edit_release_notes"] != true {
		t.Fatalf("expected encoder to upload media and edit notes, got %#v", data)
	}
}

func TestGetFansubGroupCapabilitiesAllowsReleaseOnlyRolesIntoWorkspace(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AppAuthHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleRawProvider}},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/88/capabilities", nil, middleware.AuthIdentity{
		UserID:        107,
		AppUserID:     41,
		DisplayName:   "Raw Provider",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.GetFansubGroupCapabilities(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].(map[string]any)
	if data["can_view_releases"] != true {
		t.Fatalf("expected can_view_releases=true, got %#v", data["can_view_releases"])
	}
	if data["can_edit_group"] != false || data["can_view_members"] != false {
		t.Fatalf("expected release-only role to skip group/member permissions, got %#v", data)
	}
	if data["can_view_release_media"] != false {
		t.Fatalf("expected raw provider to skip release media view, got %#v", data["can_view_release_media"])
	}
	if data["can_upload_release_media"] != false || data["can_edit_release_notes"] != false {
		t.Fatalf("expected raw provider to only view releases, got %#v", data)
	}
}

func TestGetFansubGroupCapabilitiesReturnsInvitationBooleansForLead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AppAuthHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/admin/fansubs/88/capabilities", nil, middleware.AuthIdentity{
		UserID:        106,
		AppUserID:     31,
		DisplayName:   "Invite Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.GetFansubGroupCapabilities(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].(map[string]any)
	if data["can_view_invitations"] != true || data["can_create_invitation"] != true || data["can_cancel_invitation"] != true {
		t.Fatalf("expected invitation booleans to be true, got %#v", data)
	}
}

func TestListMyFansubGroupsAttachesCapabilityBooleans(t *testing.T) {
	gin.SetMode(gin.TestMode)

	contributorRepo := &contributorRepoStub{
		listResp: []models.ContributorGroupOverview{{
			ID:                  88,
			Name:                "AnimeOwnage",
			MembershipStatus:    "app_member",
			AppMemberStatus:     appAuthTestStringPtr(models.FansubGroupMemberStatusActive),
			AppMemberRoles:      []string{permissions.RoleProjectLead},
			HasHistoricalLink:   true,
			ReleaseVersionCount: 3,
		}},
	}
	handler := &AppAuthHandler{
		contributorRepo: contributorRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleProjectLead}},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/fansub-groups", nil, middleware.AuthIdentity{
		UserID:           101,
		AppUserID:        11,
		DisplayName:      "Project Lead",
		AppUserStatus:    models.AppUserStatusActive,
		LegacyUserLinked: true,
	}, gin.Param{Key: "id", Value: "88"})

	handler.ListMyFansubGroups(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	body := decodeBody(t, recorder)
	data := body["data"].([]any)
	first := data[0].(map[string]any)
	capabilities := first["capabilities"].(map[string]any)
	if capabilities["can_open_contributor_group"] != true {
		t.Fatalf("expected contributor group to be openable, got %#v", capabilities)
	}
	if capabilities["can_manage_members"] != false {
		t.Fatalf("expected project lead not to manage members, got %#v", capabilities)
	}
}

func TestListMyFansubGroupsRejectsDisabledUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	contributorRepo := &contributorRepoStub{}
	handler := &AppAuthHandler{
		contributorRepo: contributorRepo,
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/fansub-groups", nil, middleware.AuthIdentity{
		UserID:        102,
		AppUserID:     12,
		DisplayName:   "Disabled Member",
		AppUserStatus: models.AppUserStatusDisabled,
	})

	handler.ListMyFansubGroups(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if contributorRepo.listCalls != 0 {
		t.Fatalf("expected disabled user to skip repo access")
	}
}

func TestGetMyFansubGroupDetailBlocksHistoricalOnlyGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	contributorRepo := &contributorRepoStub{
		detailResp: &models.ContributorGroupDetail{
			Group: models.ContributorGroupOverview{
				ID:                94,
				Name:              "Historical Only",
				MembershipStatus:  "historical",
				HasHistoricalLink: true,
			},
		},
	}
	handler := &AppAuthHandler{
		contributorRepo: contributorRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{94}},
			roles:   map[int64][]string{},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/fansub-groups/94", nil, middleware.AuthIdentity{
		UserID:           102,
		AppUserID:        12,
		DisplayName:      "Historical Member",
		AppUserStatus:    models.AppUserStatusActive,
		LegacyUserLinked: true,
	}, gin.Param{Key: "id", Value: "94"})

	handler.GetMyFansubGroupDetail(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if contributorRepo.detailCalls != 1 {
		t.Fatalf("expected detail repo to be called once, got %d", contributorRepo.detailCalls)
	}
}

func TestGetMyFansubGroupDetailBlocksForeignGroupLookup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	contributorRepo := &contributorRepoStub{detailErr: repository.ErrNotFound}
	handler := &AppAuthHandler{
		contributorRepo: contributorRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{120}},
			roles:   map[int64][]string{},
		}),
	}

	c, recorder := makeAppAuthTestContext(http.MethodGet, "/api/v1/me/fansub-groups/120", nil, middleware.AuthIdentity{
		UserID:        103,
		AppUserID:     13,
		DisplayName:   "Foreign Member",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "120"})

	handler.GetMyFansubGroupDetail(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if contributorRepo.detailCalls != 1 {
		t.Fatalf("expected detail repo to be called once, got %d", contributorRepo.detailCalls)
	}
}

func TestCreateFansubGroupInvitationReturnsOneTimeInviteLink(t *testing.T) {
	gin.SetMode(gin.TestMode)

	invitationRepo := &invitationRepoStub{
		createResp: &models.FansubGroupInvitationCreateResult{
			Invitation: models.FansubGroupInvitation{
				ID:               91,
				FansubGroupID:    88,
				Email:            "invitee@example.local",
				InvitedRoleCodes: []string{permissions.RoleFansubLead, permissions.RoleEditor},
				Status:           models.FansubGroupInvitationStatusPending,
				ExpiresAt:        time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC),
			},
			InviteLink: "/invitations/accept?token=abc123",
		},
	}
	handler := &AppAuthHandler{
		invitationRepo: invitationRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: &auditLogStub{},
	}

	body := []byte(`{"email":"invitee@example.local","invited_role_codes":["fansub_lead","editor"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/invitations", body, middleware.AuthIdentity{
		UserID:        107,
		AppUserID:     41,
		DisplayName:   "Invite Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupInvitation(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	payload := decodeBody(t, recorder)
	data := payload["data"].(map[string]any)
	if data["invite_link"] != "/invitations/accept?token=abc123" {
		t.Fatalf("expected invite link in response, got %#v", data["invite_link"])
	}
}

func appAuthTestStringPtr(value string) *string {
	return &value
}

// --- Mailer-Stubs fuer Einladungs-Mail-Tests ---

type mailerStub struct {
	sendCalls int
	sendErr   error
	lastMsg   services.MailMessage
}

func (s *mailerStub) Send(_ context.Context, msg services.MailMessage) error {
	s.sendCalls++
	s.lastMsg = msg
	return s.sendErr
}

func TestCreateFansubGroupInvitationSendsMailOnSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mailer := &mailerStub{}
	invitationRepo := &invitationRepoStub{
		createResp: &models.FansubGroupInvitationCreateResult{
			Invitation: models.FansubGroupInvitation{
				ID:               91,
				FansubGroupID:    88,
				Email:            "invitee@example.local",
				InvitedRoleCodes: []string{permissions.RoleFansubLead},
				Status:           models.FansubGroupInvitationStatusPending,
				ExpiresAt:        time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC),
			},
			InviteLink: "/invitations/accept?token=testtoken123",
		},
	}
	handler := &AppAuthHandler{
		invitationRepo: invitationRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: &auditLogStub{},
		mailer:       mailer,
		appPublicURL: "http://team4s.local",
	}

	body := []byte(`{"email":"invitee@example.local","invited_role_codes":["fansub_lead"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/invitations", body, middleware.AuthIdentity{
		UserID:        107,
		AppUserID:     41,
		DisplayName:   "Invite Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupInvitation(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if mailer.sendCalls != 1 {
		t.Fatalf("expected exactly one mail send, got %d", mailer.sendCalls)
	}
	if mailer.lastMsg.To != "invitee@example.local" {
		t.Fatalf("expected mail to invitee@example.local, got %q", mailer.lastMsg.To)
	}
	// D-10: absoluter Link aus AppPublicURL + InviteLink
	if !strings.Contains(mailer.lastMsg.BodyText, "http://team4s.local/invitations/accept?token=testtoken123") {
		t.Fatalf("expected absolute invite URL in mail body, got %q", mailer.lastMsg.BodyText)
	}
}

func TestCreateFansubGroupInvitationCancelsOnMailFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cancelCalls := 0
	invitationRepo := &invitationRepoStubWithCancelTracking{
		createResp: &models.FansubGroupInvitationCreateResult{
			Invitation: models.FansubGroupInvitation{
				ID:               92,
				FansubGroupID:    88,
				Email:            "fail@example.local",
				InvitedRoleCodes: []string{permissions.RoleFansubLead},
				Status:           models.FansubGroupInvitationStatusPending,
				ExpiresAt:        time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC),
			},
			InviteLink: "/invitations/accept?token=failing123",
		},
		onCancel: func() { cancelCalls++ },
	}
	mailer := &mailerStub{sendErr: errors.New("SMTP connection refused")}
	handler := &AppAuthHandler{
		invitationRepo: invitationRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: &auditLogStub{},
		mailer:       mailer,
		appPublicURL: "http://team4s.local",
	}

	body := []byte(`{"email":"fail@example.local","invited_role_codes":["fansub_lead"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/invitations", body, middleware.AuthIdentity{
		UserID:        108,
		AppUserID:     42,
		DisplayName:   "Invite Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupInvitation(c)

	// D-12: SMTP-Fehler darf keine stille pending-Einladung hinterlassen
	if recorder.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 on mail failure, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if cancelCalls != 1 {
		t.Fatalf("expected invitation to be cancelled on mail failure, cancel was called %d times", cancelCalls)
	}
	payload := decodeBody(t, recorder)
	errBody, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error body, got %#v", payload)
	}
	if errBody["reason_code"] != "mail_delivery_failed" {
		t.Fatalf("expected reason_code mail_delivery_failed, got %#v", errBody["reason_code"])
	}
}

func TestCreateFansubGroupInvitationAuditLogContainsNoRawToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	auditLog := &auditLogStub{}
	mailer := &mailerStub{}
	invitationRepo := &invitationRepoStub{
		createResp: &models.FansubGroupInvitationCreateResult{
			Invitation: models.FansubGroupInvitation{
				ID:               93,
				FansubGroupID:    88,
				Email:            "check@example.local",
				InvitedRoleCodes: []string{permissions.RoleFansubLead},
				Status:           models.FansubGroupInvitationStatusPending,
				ExpiresAt:        time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC),
			},
			InviteLink: "/invitations/accept?token=secretrawtoken",
		},
	}
	handler := &AppAuthHandler{
		invitationRepo: invitationRepo,
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleFansubLead}},
		}),
		auditLogRepo: auditLog,
		mailer:       mailer,
		appPublicURL: "http://team4s.local",
	}

	body := []byte(`{"email":"check@example.local","invited_role_codes":["fansub_lead"]}`)
	c, recorder := makeAppAuthTestContext(http.MethodPost, "/api/v1/admin/fansubs/88/invitations", body, middleware.AuthIdentity{
		UserID:        109,
		AppUserID:     43,
		DisplayName:   "Invite Lead",
		AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"})

	handler.CreateFansubGroupInvitation(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}

	// D-11: Roh-Token darf nicht im Audit-Log erscheinen
	for _, entry := range auditLog.entries {
		for key, val := range entry.Payload {
			valStr := fmt.Sprintf("%v", val)
			if strings.Contains(valStr, "secretrawtoken") {
				t.Fatalf("audit log entry contains raw token in key %q: %q", key, valStr)
			}
		}
	}
}

// invitationRepoStubWithCancelTracking ermoeglicht Callback bei Cancel-Aufrufen.
type invitationRepoStubWithCancelTracking struct {
	createResp *models.FansubGroupInvitationCreateResult
	onCancel   func()
}

func (s *invitationRepoStubWithCancelTracking) ListByFansubGroup(_ context.Context, _ int64) ([]models.FansubGroupInvitation, error) {
	return nil, nil
}

func (s *invitationRepoStubWithCancelTracking) Create(_ context.Context, _ int64, _ models.FansubGroupInvitationCreateInput) (*models.FansubGroupInvitationCreateResult, error) {
	return s.createResp, nil
}

func (s *invitationRepoStubWithCancelTracking) Cancel(_ context.Context, _ int64, _ int64, _ models.FansubGroupInvitationCancelInput) (*models.FansubGroupInvitation, error) {
	if s.onCancel != nil {
		s.onCancel()
	}
	return &models.FansubGroupInvitation{}, nil
}

func (s *invitationRepoStubWithCancelTracking) Accept(_ context.Context, _ models.AcceptFansubInvitationInput) (*models.FansubGroupInvitation, *models.FansubGroupAppMember, error) {
	return nil, nil, nil
}
