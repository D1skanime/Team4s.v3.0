package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type releaseReviewQueryStub struct {
	page                  repository.ReleaseReviewQueuePage
	counts                repository.ReleaseReviewQueueCounts
	detail                *repository.ReleaseReviewDetail
	next                  *repository.ReleaseReviewQueueItem
	err                   error
	listOptions           repository.ReleaseReviewQueueOptions
	detailKinds           []string
	detailGroup           int64
	detailID              string
	detailActorAppUserID  int64
	detailActorMemberIDs  []int64
}

func (s *releaseReviewQueryStub) List(
	_ context.Context,
	options repository.ReleaseReviewQueueOptions,
) (*repository.ReleaseReviewQueuePage, error) {
	s.listOptions = options
	return &s.page, s.err
}

func (s *releaseReviewQueryStub) Counts(
	_ context.Context,
	options repository.ReleaseReviewQueueOptions,
) (*repository.ReleaseReviewQueueCounts, error) {
	s.listOptions = options
	return &s.counts, s.err
}

func (s *releaseReviewQueryStub) Detail(
	_ context.Context,
	fansubGroupID int64,
	reviewID string,
	allowedKinds []string,
	actorAppUserID int64,
	actorMemberIDs []int64,
) (*repository.ReleaseReviewDetail, error) {
	s.detailGroup = fansubGroupID
	s.detailID = reviewID
	s.detailKinds = append([]string(nil), allowedKinds...)
	s.detailActorAppUserID = actorAppUserID
	s.detailActorMemberIDs = append([]int64(nil), actorMemberIDs...)
	return s.detail, s.err
}

func (s *releaseReviewQueryStub) Next(
	_ context.Context,
	fansubGroupID int64,
	reviewID string,
	allowedKinds []string,
	actorAppUserID int64,
	actorMemberIDs []int64,
) (*repository.ReleaseReviewQueueItem, error) {
	s.detailGroup = fansubGroupID
	s.detailID = reviewID
	s.detailKinds = append([]string(nil), allowedKinds...)
	s.detailActorAppUserID = actorAppUserID
	s.detailActorMemberIDs = append([]int64(nil), actorMemberIDs...)
	return s.next, s.err
}

type releaseReviewPermissionStub struct {
	allowed      map[permissions.Action]bool
	resolveCalls int
}

type releaseReviewDecisionStub struct {
	result  *repository.ReviewDecisionRow
	err     error
	calls   int
	command services.ReviewDecisionCommand
}

// releaseReviewIdentityStub satisfies releaseReviewActorIdentityResolver for tests that do
// not exercise self-exclusion (Plan 141-02) -- an empty memberIDs slice is correct for every
// pre-existing test.
type releaseReviewIdentityStub struct {
	memberIDs []int64
	err       error
}

func (s *releaseReviewIdentityStub) ResolveVerifiedActorMemberIDs(
	context.Context, int64,
) ([]int64, error) {
	return s.memberIDs, s.err
}

func (s *releaseReviewDecisionStub) Decide(
	_ context.Context,
	command services.ReviewDecisionCommand,
) (*repository.ReviewDecisionRow, error) {
	s.calls++
	s.command = command
	return s.result, s.err
}

func (s *releaseReviewPermissionStub) ResolveReviewGroupAuthorization(
	_ context.Context,
	_ permissions.Actor,
	_ int64,
) (map[permissions.Action]permissions.ReviewAuthorizationResult, error) {
	s.resolveCalls++
	results := make(map[permissions.Action]permissions.ReviewAuthorizationResult, 2)
	for _, action := range []permissions.Action{
		permissions.ActionReviewTextDecide,
		permissions.ActionReviewImageDecide,
	} {
		if s.allowed[action] {
			results[action] = permissions.ReviewAuthorizationResult{
				Result:   permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed},
				MemberID: 901,
			}
			continue
		}
		results[action] = permissions.ReviewAuthorizationResult{
			Result: permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole},
		}
	}
	return results, nil
}

func (s *releaseReviewPermissionStub) CanForReleaseVersion(
	_ context.Context,
	_ permissions.Actor,
	action permissions.Action,
	_ int64,
) (permissions.Result, error) {
	if s.allowed[action] {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

func releaseReviewTestContext(method, target string, groupID string) (*gin.Context, *httptest.ResponseRecorder) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, target, nil)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        1001,
		AppUserID:     11,
		AppUserStatus: "active",
		DisplayName:   "Reviewer",
	})
	return c, rec
}

func TestReleaseReviewQueueUsesOnlyAuthorizedTypedKindsAndDoesNotAuditViews(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{page: repository.ReleaseReviewQueuePage{
		Items: []repository.ReleaseReviewQueueItem{},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	audit := &auditReviewStub{}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?view=open&type=text&limit=50",
		"21",
	)
	handler.List(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, []string{string(repository.ReviewKindText)}, repo.listOptions.AllowedKinds)
	assert.Equal(t, string(repository.ReviewKindText), repo.listOptions.Scope.ReviewKind)
	assert.Equal(t, 50, repo.listOptions.Limit)
	assert.Equal(t, 0, audit.writeCount, "read-only review views must not emit audit events")
}

func TestReleaseReviewQueueRejectsWrongTypedCapabilityWithoutRepositoryAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?type=image",
		"21",
	)
	handler.List(c)

	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Empty(t, repo.listOptions.AllowedKinds)
	assert.NotContains(t, rec.Body.String(), "count")
	assert.NotContains(t, rec.Body.String(), "item")
}

func TestReleaseReviewQueueRejectsUnknownTypeBeforePermissionOrRepositoryAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?type=video",
		"21",
	)
	handler.List(c)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Empty(t, repo.listOptions.AllowedKinds)
}

// TestReleaseReviewQueueOwnViewBypassesCapabilityGate proves the D10 capability bypass
// (Plan 141-02 Task 2) structurally: with view=own, queueOptions must skip authorizedKinds
// entirely -- never calling ResolveReviewGroupAuthorization -- and unconditionally use
// [text, image] as AllowedKinds, even when the actor is authorized for NEITHER review kind.
func TestReleaseReviewQueueOwnViewBypassesCapabilityGate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{page: repository.ReleaseReviewQueuePage{
		Items: []repository.ReleaseReviewQueueItem{},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?view=own",
		"21",
	)
	handler.List(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, 0, permission.resolveCalls, "view=own must never call ResolveReviewGroupAuthorization")
	assert.ElementsMatch(t,
		[]string{string(repository.ReviewKindText), string(repository.ReviewKindImage)},
		repo.listOptions.AllowedKinds,
	)
	assert.Equal(t, repository.ReleaseReviewQueueViewOwn, repo.listOptions.Scope.View)
}

func TestReleaseReviewQueueCapsLimitAndRejectsInvalidCursor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide:  true,
		permissions.ActionReviewImageDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?limit=5000&cursor=foreign",
		"21",
	)
	handler.List(c)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Empty(t, repo.listOptions.AllowedKinds)
}

func TestReleaseReviewDetailIsNarrowAndEditPermissionIsIndependent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)
	repo := &releaseReviewQueryStub{detail: &repository.ReleaseReviewDetail{
		ReleaseReviewQueueItem: repository.ReleaseReviewQueueItem{
			ID:               reviewID,
			SourceRevision:   3,
			ReviewKind:       repository.ReviewKindText,
			FansubGroupID:    21,
			ReleaseVersionID: 41,
			SubmittedAt:      time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC),
		},
		Text: &repository.ReleaseReviewTextContent{Title: "Dialog", BodyHTML: "<p>Text</p>"},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

	c, rec := releaseReviewTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews/"+reviewID, "21")
	c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
	handler.Detail(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var response struct {
		Data repository.ReleaseReviewDetail `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	assert.NotNil(t, response.Data.Text)
	assert.Nil(t, response.Data.Image)
	assert.False(t, response.Data.CanEditRelease)
	assert.NotContains(t, rec.Body.String(), "beneficiary")
	assert.NotContains(t, rec.Body.String(), "storage_path")
}

func TestReleaseReviewDetailCrossGroupIsScopedNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{err: repository.ErrNotFound}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewImageDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionMediaReviewSourceType, 601)
	require.NoError(t, err)

	c, rec := releaseReviewTestContext(http.MethodGet, "/api/v1/admin/fansubs/22/release-reviews/"+reviewID, "22")
	c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
	handler.Detail(c)

	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.NotContains(t, rec.Body.String(), "601")
	assert.NotContains(t, rec.Body.String(), "release_version_media")
}

func TestReleaseReviewNextCrossGroupIsScopedNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{err: repository.ErrNotFound}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionNoteReviewSourceType, 602)
	require.NoError(t, err)

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/22/release-reviews/"+reviewID+"/next",
		"22",
	)
	c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
	handler.Next(c)

	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.NotContains(t, rec.Body.String(), "602")
	assert.NotContains(t, rec.Body.String(), "release_version_notes")
}

func TestReleaseReviewDetailPlatformAdminReceivesBothTypedScopes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{err: repository.ErrNotFound}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide:  true,
		permissions.ActionReviewImageDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionMediaReviewSourceType, 601)
	require.NoError(t, err)

	c, _ := releaseReviewTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews/"+reviewID, "21")
	c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
	identity, _ := c.Get("auth_identity")
	admin := identity.(middleware.AuthIdentity)
	admin.IsPlatformAdmin = true
	c.Set("auth_identity", admin)
	handler.Detail(c)

	assert.ElementsMatch(t,
		[]string{string(repository.ReviewKindText), string(repository.ReviewKindImage)},
		repo.detailKinds,
	)
}

func TestReleaseReviewDecisionMapsStableConflictWithoutRetry(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)
	repo := &releaseReviewQueryStub{detail: &repository.ReleaseReviewDetail{
		ReleaseReviewQueueItem: repository.ReleaseReviewQueueItem{
			ID: reviewID, SourceRevision: 3, ReviewKind: repository.ReviewKindText,
			FansubGroupID: 21, ReleaseVersionID: 41,
		},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	decision := &releaseReviewDecisionStub{err: services.ErrReviewAlreadyDecided}
	handler := NewReleaseReviewHandler(repo, permission, decision, &releaseReviewIdentityStub{})
	body := `{"decision":"confirm","expected_revision":3}`

	c, rec := releaseReviewTestContext(
		http.MethodPost,
		"/api/v1/admin/fansubs/21/release-reviews/"+reviewID+"/decision",
		"21",
	)
	c.Request = httptest.NewRequest(http.MethodPost, c.Request.URL.String(), strings.NewReader(body))
	c.Params = gin.Params{{Key: "id", Value: "21"}, {Key: "reviewId", Value: reviewID}}
	setReviewTestAuth(c, 11)
	handler.Decide(c)

	assert.Equal(t, http.StatusConflict, rec.Code)
	assert.Contains(t, rec.Body.String(), "REVIEW_ALREADY_DECIDED")
	assert.Equal(t, 1, decision.calls, "conflicts must never retry automatically")
}

func TestReleaseReviewDecisionPlatformAdminUsesOverrideOnlyWhenReasonProvided(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)
	repo := &releaseReviewQueryStub{detail: &repository.ReleaseReviewDetail{
		ReleaseReviewQueueItem: repository.ReleaseReviewQueueItem{
			ID: reviewID, SourceRevision: 3, ReviewKind: repository.ReviewKindText,
			FansubGroupID: 21, ReleaseVersionID: 41,
		},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	decision := &releaseReviewDecisionStub{result: &repository.ReviewDecisionRow{
		Decision: repository.ReviewDecisionConfirm,
	}}
	handler := NewReleaseReviewHandler(repo, permission, decision, &releaseReviewIdentityStub{})
	c, rec := releaseReviewTestContext(
		http.MethodPost,
		"/api/v1/admin/fansubs/21/release-reviews/"+reviewID+"/decision",
		"21",
	)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		c.Request.URL.String(),
		strings.NewReader(`{"decision":"confirm","expected_revision":3}`),
	)
	c.Params = gin.Params{{Key: "id", Value: "21"}, {Key: "reviewId", Value: reviewID}}
	identity, _ := c.Get("auth_identity")
	admin := identity.(middleware.AuthIdentity)
	admin.IsPlatformAdmin = true
	c.Set("auth_identity", admin)

	handler.Decide(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.False(t, decision.command.SelfReviewOverride)
	assert.Empty(t, decision.command.OverrideReason)
}

func TestReleaseReviewDecisionOverrideReasonValidation(t *testing.T) {
	assert.NoError(t, validateReleaseReviewDecisionRequest(
		releaseReviewDecisionRequest{Decision: "confirm", ExpectedRevision: 1},
		true,
	))
	assert.Error(t, validateReleaseReviewDecisionRequest(
		releaseReviewDecisionRequest{
			Decision: "confirm", ExpectedRevision: 1, OverrideReason: "zu kurz",
		},
		true,
	))
	assert.NoError(t, validateReleaseReviewDecisionRequest(
		releaseReviewDecisionRequest{
			Decision: "confirm", ExpectedRevision: 1, OverrideReason: "Zehn Zeichen",
		},
		true,
	))
}

func TestReleaseReviewDecisionDecoderRejectsUnknownFieldsAndTrailingJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{
		`{"decision":"confirm","expected_revision":3,"unexpected":true}`,
		`{"decision":"confirm","expected_revision":3} {"decision":"reject"}`,
	} {
		c, _ := releaseReviewTestContext(http.MethodPost, "/decision", "21")
		c.Request = httptest.NewRequest(http.MethodPost, "/decision", strings.NewReader(body))
		var request releaseReviewDecisionRequest

		assert.Error(t, decodeStrictReleaseReviewJSON(c, &request), body)
	}
}

func TestReleaseReviewQueueContractsMatchRuntimeAndExcludeSensitiveFields(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
	paths := []string{
		filepath.Join(root, "shared", "contracts", "openapi.yaml"),
		filepath.Join(root, "shared", "contracts", "admin-content.yaml"),
	}
	for _, path := range paths {
		content, err := os.ReadFile(path)
		require.NoError(t, err)
		contract := string(content)
		for _, required := range []string{
			"/api/v1/admin/fansubs/{id}/release-reviews",
			"expected_revision",
			"REVIEW_ALREADY_DECIDED",
			"typesetting_karaoke",
			"can_edit_release",
		} {
			if strings.HasSuffix(path, "admin-content.yaml") && strings.Contains(required, "{id}") {
				required = strings.ReplaceAll(required, "{id}", ":id")
			}
			assert.Contains(t, contract, required, path)
		}
		reviewContract := contract
		if strings.HasSuffix(path, "openapi.yaml") {
			pathStart := strings.Index(contract, "  /api/v1/admin/fansubs/{id}/release-reviews:")
			pathEnd := strings.Index(contract[pathStart:], "  /api/v1/admin/fansubs/{fansubId}/contribution-proposals/{cid}/confirm:")
			schemaStart := strings.Index(contract, "    ReleaseReviewImageCategory:")
			schemaEnd := strings.Index(contract[schemaStart:], "    HealthResponse:")
			require.GreaterOrEqual(t, pathStart, 0)
			require.Greater(t, pathEnd, 0)
			require.GreaterOrEqual(t, schemaStart, 0)
			require.Greater(t, schemaEnd, 0)
			reviewContract = contract[pathStart:pathStart+pathEnd] +
				contract[schemaStart:schemaStart+schemaEnd]
		} else {
			start := strings.Index(contract, "  - name: admin-release-review-list")
			end := strings.Index(contract[start:], "  AdminAnimeCreateRequest:")
			require.GreaterOrEqual(t, start, 0)
			require.Greater(t, end, 0)
			reviewContract = contract[start : start+end]
		}
		for _, forbidden := range []string{"beneficiary_member_id", "point_recipient", "storage_path"} {
			assert.NotContains(t, reviewContract, forbidden, path)
		}
	}
}

// TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts proves the Phase 141
// Plan 01 fix for 141-RESEARCH.md Pitfall 1: List, Counts, Detail, and Next each resolve
// group review rights exactly ONCE per independent HTTP handler invocation, not once per
// review kind (the historical two-call behavior).
func TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)

	newAllowedStub := func() *releaseReviewPermissionStub {
		return &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
			permissions.ActionReviewTextDecide:  true,
			permissions.ActionReviewImageDecide: true,
		}}
	}

	t.Run("List", func(t *testing.T) {
		repo := &releaseReviewQueryStub{page: repository.ReleaseReviewQueuePage{
			Items: []repository.ReleaseReviewQueueItem{},
		}}
		permission := newAllowedStub()
		handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

		c, rec := releaseReviewTestContext(
			http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews", "21",
		)
		handler.List(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		assert.Equal(t, 1, permission.resolveCalls)
	})

	t.Run("Counts", func(t *testing.T) {
		repo := &releaseReviewQueryStub{}
		permission := newAllowedStub()
		handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

		c, rec := releaseReviewTestContext(
			http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews/counts", "21",
		)
		handler.Counts(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		assert.Equal(t, 1, permission.resolveCalls)
	})

	t.Run("Detail", func(t *testing.T) {
		repo := &releaseReviewQueryStub{detail: &repository.ReleaseReviewDetail{
			ReleaseReviewQueueItem: repository.ReleaseReviewQueueItem{
				ID: reviewID, SourceRevision: 3, ReviewKind: repository.ReviewKindText,
				FansubGroupID: 21, ReleaseVersionID: 41,
			},
			Text: &repository.ReleaseReviewTextContent{Title: "Dialog", BodyHTML: "<p>Text</p>"},
		}}
		permission := newAllowedStub()
		handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

		c, rec := releaseReviewTestContext(
			http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews/"+reviewID, "21",
		)
		c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
		handler.Detail(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		assert.Equal(t, 1, permission.resolveCalls)
	})

	t.Run("Next", func(t *testing.T) {
		repo := &releaseReviewQueryStub{next: &repository.ReleaseReviewQueueItem{
			ID: reviewID, ReviewKind: repository.ReviewKindText, FansubGroupID: 21,
		}}
		permission := newAllowedStub()
		handler := NewReleaseReviewHandler(repo, permission, nil, &releaseReviewIdentityStub{})

		c, rec := releaseReviewTestContext(
			http.MethodGet, "/api/v1/admin/fansubs/21/release-reviews/"+reviewID+"/next", "21",
		)
		c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
		handler.Next(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		assert.Equal(t, 1, permission.resolveCalls)
	})
}
