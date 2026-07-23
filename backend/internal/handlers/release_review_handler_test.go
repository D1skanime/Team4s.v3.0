package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type releaseReviewQueryStub struct {
	page         repository.ReleaseReviewQueuePage
	counts       repository.ReleaseReviewQueueCounts
	detail       *repository.ReleaseReviewDetail
	next         *repository.ReleaseReviewQueueItem
	err          error
	listOptions  repository.ReleaseReviewQueueOptions
	detailKinds  []string
	detailGroup  int64
	detailID     string
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
) (*repository.ReleaseReviewDetail, error) {
	s.detailGroup = fansubGroupID
	s.detailID = reviewID
	s.detailKinds = append([]string(nil), allowedKinds...)
	return s.detail, s.err
}

func (s *releaseReviewQueryStub) Next(
	_ context.Context,
	fansubGroupID int64,
	reviewID string,
	allowedKinds []string,
) (*repository.ReleaseReviewQueueItem, error) {
	s.detailGroup = fansubGroupID
	s.detailID = reviewID
	s.detailKinds = append([]string(nil), allowedKinds...)
	return s.next, s.err
}

type releaseReviewPermissionStub struct {
	allowed map[permissions.Action]bool
}

func (s *releaseReviewPermissionStub) CanReviewForFansubGroup(
	_ context.Context,
	_ permissions.Actor,
	action permissions.Action,
	_ int64,
) (permissions.ReviewAuthorizationResult, error) {
	if s.allowed[action] {
		return permissions.ReviewAuthorizationResult{
			Result: permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed},
			MemberID: 901,
		}, nil
	}
	return permissions.ReviewAuthorizationResult{
		Result: permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole},
	}, nil
}

func (s *releaseReviewPermissionStub) CanForFansubGroup(
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
		UserID:       1001,
		AppUserID:    11,
		AppUserStatus: "active",
		DisplayName:  "Reviewer",
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
	handler := NewReleaseReviewHandler(repo, permission, nil)

	c, rec := releaseReviewTestContext(
		http.MethodGet,
		"/api/v1/admin/fansubs/21/release-reviews?view=open&type=text&limit=50",
		"21",
	)
	handler.List(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, []string{repository.ReviewKindText}, repo.listOptions.AllowedKinds)
	assert.Equal(t, repository.ReviewKindText, repo.listOptions.Scope.ReviewKind)
	assert.Equal(t, 50, repo.listOptions.Limit)
	assert.Equal(t, 0, audit.writeCount, "read-only review views must not emit audit events")
}

func TestReleaseReviewQueueRejectsWrongTypedCapabilityWithoutRepositoryAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil)

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

func TestReleaseReviewQueueCapsLimitAndRejectsInvalidCursor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &releaseReviewQueryStub{}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide:  true,
		permissions.ActionReviewImageDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil)

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
			ReviewKind:      repository.ReviewKindText,
			FansubGroupID:   21,
			ReleaseVersionID: 41,
			SubmittedAt:     time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC),
		},
		Text: &repository.ReleaseReviewTextContent{Title: "Dialog", BodyHTML: "<p>Text</p>"},
	}}
	permission := &releaseReviewPermissionStub{allowed: map[permissions.Action]bool{
		permissions.ActionReviewTextDecide: true,
	}}
	handler := NewReleaseReviewHandler(repo, permission, nil)

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
	handler := NewReleaseReviewHandler(repo, permission, nil)
	reviewID, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionMediaReviewSourceType, 601)
	require.NoError(t, err)

	c, rec := releaseReviewTestContext(http.MethodGet, "/api/v1/admin/fansubs/22/release-reviews/"+reviewID, "22")
	c.Params = append(c.Params, gin.Param{Key: "reviewId", Value: reviewID})
	handler.Detail(c)

	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.NotContains(t, rec.Body.String(), "601")
	assert.NotContains(t, rec.Body.String(), "release_version_media")
}
