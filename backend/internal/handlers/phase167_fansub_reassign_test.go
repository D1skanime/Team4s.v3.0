package handlers

// Behavioral httptest+fake tests for ReassignFansubAlias (Phase 167 Plan 03, D-02/D-09),
// mirroring fansub_project_resolver_handler_test.go's compliant shape: a narrow fake
// permissions.Resolver plus a func-field fake for h.reassignFansubAlias, gin.CreateTestContext,
// and assertions against recorder.Code/recorder.Body/call-counters. CLAUDE.md's Teststil
// section forbids reading a handler's own source file and substring-matching it (the pattern
// fansub_group_history_handler_test.go uses) -- every assertion here fires a real HTTP-shaped
// request through the real FansubHandler.ReassignFansubAlias method against fakes, including
// the literal proof that T-167-IDOR's dual source/destination permission check cannot be
// bypassed by only managing one side.

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// fakeReassignPermResolver is a permissions.Resolver (plus the optional
// GroupRightsMembershipResolver/GroupRightsOverridesResolver capabilities) whose
// ResolveFansubGroup only recognizes the groups listed in allowedGroupIDs. A group NOT in
// that set resolves to (nil, nil), which permissions.Service.canForContext treats as
// "ressource nicht gefunden" and denies immediately -- letting these tests drive each of
// ReassignFansubAlias's two independent CanForFansubGroup calls (source, then destination)
// to allow or deny individually via real permission-service evaluation, not a handler-level
// stub.
type fakeReassignPermResolver struct {
	allowedGroupIDs map[int64]bool
}

func (f fakeReassignPermResolver) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	if !f.allowedGroupIDs[fansubGroupID] {
		return nil, nil
	}
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (fakeReassignPermResolver) ResolveRelease(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (fakeReassignPermResolver) ResolveReleaseVersion(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (fakeReassignPermResolver) ResolveReleaseVersionMedia(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (fakeReassignPermResolver) ListActorGroupRoles(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (fakeReassignPermResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

// ResolveActorGroupMembership is only ever reached for a group ResolveFansubGroup already
// allowed (denied groups short-circuit before this call), so an unconditional active
// membership is sufficient to let evaluateGroupRights proceed to the user-allow override.
func (fakeReassignPermResolver) ResolveActorGroupMembership(context.Context, int64, int64) (*permissions.GroupMembershipState, error) {
	return &permissions.GroupMembershipState{ActiveMembership: true}, nil
}

// ResolveActorUserOverrides grants ActionFansubGroupEdit via the same user_allow provenance
// path production's AuthzRepository uses -- again only reached for an already-allowed group.
func (fakeReassignPermResolver) ResolveActorUserOverrides(context.Context, int64, int64) ([]permissions.UserCapabilityOverride, error) {
	return []permissions.UserCapabilityOverride{{ActionCode: permissions.ActionFansubGroupEdit, Effect: "allow"}}, nil
}

func reassignFansubAliasTestHandler(
	allowedGroupIDs map[int64]bool,
	reassign func(ctx context.Context, fansubID, aliasID, targetGroupID int64) (*models.FansubAlias, error),
) *FansubHandler {
	h := &FansubHandler{
		permissionSvc: permissions.NewService(fakeReassignPermResolver{allowedGroupIDs: allowedGroupIDs}),
	}
	h.reassignFansubAlias = reassign
	return h
}

func reassignFansubAliasTestContext(fansubID, aliasID, body string) (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/fansubs/"+fansubID+"/aliases/"+aliasID+"/reassign", bytes.NewBufferString(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: fansubID}, {Key: "aliasId", Value: aliasID}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 3, AppUserID: 5, DisplayName: "Reassign Tester", AppUserStatus: "active", IsPlatformAdmin: false})
	if _, ok := middleware.CommentAuthIdentityFromContext(c); !ok {
		panic("test auth identity was not stored")
	}
	return recorder, c
}

// TestReassignFansubAlias_Success covers case 1: source (41) and destination (42) both
// authorized, repository returns a populated alias -> 200 with the alias data.
func TestReassignFansubAlias_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	calls := 0
	h := reassignFansubAliasTestHandler(
		map[int64]bool{41: true, 42: true},
		func(_ context.Context, fansubID, aliasID, targetGroupID int64) (*models.FansubAlias, error) {
			calls++
			require.Equal(t, int64(41), fansubID)
			require.Equal(t, int64(7), aliasID)
			require.Equal(t, int64(42), targetGroupID)
			return &models.FansubAlias{ID: 7, FansubGroupID: 42, Alias: "TeamXYZ"}, nil
		},
	)

	recorder, c := reassignFansubAliasTestContext("41", "7", `{"target_fansub_group_id":42}`)
	h.ReassignFansubAlias(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, 1, calls)
	require.Contains(t, recorder.Body.String(), `"alias":"TeamXYZ"`)
	require.Contains(t, recorder.Body.String(), `"fansub_group_id":42`)
}

// TestReassignFansubAlias_SourcePermissionDenied covers case 2: the caller is not
// authorized on the SOURCE group (41) -- the reassign func-field must never fire and the
// destination group is never even looked at.
func TestReassignFansubAlias_SourcePermissionDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	calls := 0
	h := reassignFansubAliasTestHandler(
		map[int64]bool{42: true}, // 41 (source) intentionally NOT allowed
		func(context.Context, int64, int64, int64) (*models.FansubAlias, error) {
			calls++
			return nil, nil
		},
	)

	recorder, c := reassignFansubAliasTestContext("41", "7", `{"target_fansub_group_id":42}`)
	h.ReassignFansubAlias(c)

	require.Equal(t, http.StatusNotFound, recorder.Code, "denied CanForFansubGroup resolves to ReasonResourceNotFound")
	require.Zero(t, calls, "reassign must never run when the source-group permission check fails")
}

// TestReassignFansubAlias_DestinationPermissionDenied covers case 3, the literal T-167-IDOR
// mitigation proof: the source group (41) IS authorized but the destination group (42) is
// NOT. A caller who only manages the source group must not be able to move an alias into a
// group they do not manage -- the reassign func-field must never fire.
func TestReassignFansubAlias_DestinationPermissionDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	calls := 0
	h := reassignFansubAliasTestHandler(
		map[int64]bool{41: true}, // 42 (destination) intentionally NOT allowed
		func(context.Context, int64, int64, int64) (*models.FansubAlias, error) {
			calls++
			return nil, nil
		},
	)

	recorder, c := reassignFansubAliasTestContext("41", "7", `{"target_fansub_group_id":42}`)
	h.ReassignFansubAlias(c)

	require.Equal(t, http.StatusNotFound, recorder.Code, "denied CanForFansubGroup resolves to ReasonResourceNotFound")
	require.Zero(t, calls, "reassign must never run when only the source group is authorized (T-167-IDOR)")
}

// TestReassignFansubAlias_NoopTargetRejected covers case 4: target_fansub_group_id equals
// the current (source) group -- a client error, not a silent success.
func TestReassignFansubAlias_NoopTargetRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)

	calls := 0
	h := reassignFansubAliasTestHandler(
		map[int64]bool{41: true},
		func(context.Context, int64, int64, int64) (*models.FansubAlias, error) {
			calls++
			return nil, nil
		},
	)

	recorder, c := reassignFansubAliasTestContext("41", "7", `{"target_fansub_group_id":41}`)
	h.ReassignFansubAlias(c)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Zero(t, calls, "reassign must never run for a no-op target")
}

// TestReassignFansubAlias_RepositoryNotFound covers case 5: repository.ErrNotFound -> 404.
func TestReassignFansubAlias_RepositoryNotFound(t *testing.T) {
	reassignFansubAliasAssertRepoFailure(t, repository.ErrNotFound, http.StatusNotFound)
}

// TestReassignFansubAlias_RepositoryConflict covers case 6: repository.ErrConflict -> 409.
func TestReassignFansubAlias_RepositoryConflict(t *testing.T) {
	reassignFansubAliasAssertRepoFailure(t, repository.ErrConflict, http.StatusConflict)
}

func reassignFansubAliasAssertRepoFailure(t *testing.T, repoErr error, expectedStatus int) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	calls := 0
	h := reassignFansubAliasTestHandler(
		map[int64]bool{41: true, 42: true},
		func(context.Context, int64, int64, int64) (*models.FansubAlias, error) {
			calls++
			return nil, repoErr
		},
	)

	recorder, c := reassignFansubAliasTestContext("41", "7", `{"target_fansub_group_id":42}`)
	h.ReassignFansubAlias(c)

	require.Equal(t, expectedStatus, recorder.Code)
	require.Equal(t, 1, calls)
}
