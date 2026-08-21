package services

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// --- Role capability cache -----------------------------------------------------

// permissions.ResolveGroupRights' role-grant precedence step (grantingRolesFor ->
// roleAllows) reads from permissions' own package-level cache, which starts nil and is
// populated only by an explicit Service.LoadCache call (production does this once at
// server startup, see backend/cmd/server/main.go). No test file in this package
// currently loads it, so without this, every role-based grant this plan's tests need
// (fansub_lead's ActionEffectiveRightsOverrideManage and ActionFansubGroupMediaUpload
// capabilities) would always evaluate to no_grant/denied regardless of what migration
// 0150 or fansub_group_member_roles actually seeded. This is loaded exactly once, and
// only from this file's own tests, via a small stub covering every permissions.Action
// LoadCache's D-10 catalog-consistency check requires -- it deliberately does not
// depend on this fixture's own reduced migration chain (which lacks the full seed data
// LoadCache's real production loader would read).
var effectiveRightsCacheLoadOnce sync.Once

func ensureEffectiveRightsPermissionsCacheLoaded(t *testing.T) {
	t.Helper()
	effectiveRightsCacheLoadOnce.Do(func() {
		if err := permissions.NewService(nil).LoadCache(context.Background(), effectiveRightsCacheLoaderStub{}); err != nil {
			t.Fatalf("load permissions cache for effective-rights tests: %v", err)
		}
	})
}

// effectiveRightsCacheLoaderStub implements permissions.CacheLoader. fansub_lead
// carries exactly the two role-granted actions this plan's tests exercise, matching
// migration 0150's real fansub_lead seed for ActionUserGroupCapabilityOverrideManage.
// Every other canonical action is parked under a role none of this file's test actors
// hold, purely to satisfy LoadCache's D-10 "every action appears in >=1 role" check --
// which role is otherwise immaterial to this file's own assertions.
type effectiveRightsCacheLoaderStub struct{}

func (effectiveRightsCacheLoaderStub) LoadRoleCapabilities(context.Context) (map[string][]permissions.Action, error) {
	return map[string][]permissions.Action{
		permissions.RoleFansubLead: {
			permissions.ActionFansubGroupMediaUpload,
			permissions.ActionUserGroupCapabilityOverrideManage,
		},
		"_effective_rights_test_unused_role": {
			permissions.ActionFansubGroupEdit,
			permissions.ActionFansubGroupLinksManage,
			permissions.ActionFansubGroupMembersView,
			permissions.ActionFansubGroupMembersManage,
			permissions.ActionFansubGroupHistoricalMembersManage,
			permissions.ActionFansubGroupHistoricalRolesManage,
			permissions.ActionFansubGroupHistoricalMembersLink,
			permissions.ActionFansubGroupInvitationsView,
			permissions.ActionFansubGroupInvitationsCreate,
			permissions.ActionFansubGroupInvitationsCancel,
			permissions.ActionFansubGroupNotesWrite,
			permissions.ActionFansubGroupMediaView,
			permissions.ActionFansubGroupMediaUpdate,
			permissions.ActionFansubGroupMediaReorder,
			permissions.ActionFansubGroupMediaDelete,
			permissions.ActionFansubGroupPageGeneralEdit,
			permissions.ActionFansubGroupPageTechnicalLinksEdit,
			permissions.ActionFansubGroupPageFoundingHistoryEdit,
			permissions.ActionFansubGroupLinksUpdate,
			permissions.ActionAnimeFansubProjectNotesWrite,
			permissions.ActionReleaseView,
			permissions.ActionReleaseVersionView,
			permissions.ActionReleaseVersionMediaView,
			permissions.ActionReleaseVersionMediaUpload,
			permissions.ActionReleaseVersionMediaUpdate,
			permissions.ActionReleaseVersionMediaDelete,
			permissions.ActionReleaseVersionMediaDeleteOwn,
			permissions.ActionReleaseVersionNotesWrite,
			permissions.ActionReleaseVersionSegmentsManage,
			permissions.ActionReviewTextDecide,
			permissions.ActionReviewImageDecide,
			permissions.ActionReviewContributionDecide,
		},
	}, nil
}

// --- Fixture -----------------------------------------------------------------

// effectiveRightsFixtureAction is the overridable action every non-catalog test
// exercises mutation against -- one of migration 0150's pilot ten.
const effectiveRightsFixtureAction = string(permissions.ActionFansubGroupMediaUpload)

// effectiveRightsNonOverridableAction is a real, cataloged action that migration 0150
// deliberately did not flip to user_overridable=true.
const effectiveRightsNonOverridableAction = string(permissions.ActionFansubGroupMembersManage)

type effectiveRightsPostgresFixture struct {
	pool *pgxpool.Pool
}

// openPhase137EffectiveRightsPostgres builds the real Phase-137 schema (via
// testsupport.OpenPhase137Postgres) plus the ad-hoc fansub_group_member_roles table
// (mirroring openPhase107ReviewServicePostgres's precedent -- migration 0073's real
// table is not part of the Phase-137 prerequisite chain) and one fixed actor/target
// topology every test in this file and effective_rights_concurrency_test.go reuses:
//
//   - app_user 11 / member 101: fansub_lead in group 21 -- holds
//     ActionEffectiveRightsOverrideManage and is used both as the authorizing actor and
//     as a self-mutation target.
//   - app_user 12 / member 102: active membership in group 21, no roles -- the typical
//     override mutation target.
//   - app_user 13 / member 103: DISABLED membership in group 21 -- an inactive target.
//   - app_user 14 / member 104: active membership in group 22 only (a foreign group) --
//     used to prove cross-group/BOLA manipulation is rejected.
func openPhase137EffectiveRightsPostgres(t *testing.T) *effectiveRightsPostgresFixture {
	t.Helper()
	ensureEffectiveRightsPermissionsCacheLoaded(t)
	pool := testsupport.OpenPhase137Postgres(t)
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		);
		-- Minimal stand-ins so permissions.ResolveGroupRights' unconditional Review
		-- Delegation SpecializedGrantProvider lookup (ResolveActorReviewGrantContext)
		-- has real, empty tables to query against instead of erroring; no row is ever
		-- seeded here, so it always contributes zero specialized grants.
		CREATE TABLE member_claims (
			id BIGSERIAL PRIMARY KEY,
			member_id BIGINT NOT NULL,
			app_user_id BIGINT NOT NULL,
			claim_status TEXT NOT NULL,
			verified_at TIMESTAMPTZ
		);
		CREATE TABLE fansub_group_member_review_capabilities (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			action_code TEXT NOT NULL REFERENCES action_definitions(code),
			PRIMARY KEY (fansub_group_member_id, action_code)
		);
		INSERT INTO members(id) VALUES (101), (102), (103), (104);
		INSERT INTO app_users(id, status) VALUES
			(11, 'active'), (12, 'active'), (13, 'active'), (14, 'active');
		INSERT INTO fansub_groups(id) VALUES (21), (22);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active'),
			(32, 21, 12, 102, 'active'),
			(33, 21, 13, 103, 'disabled'),
			(34, 22, 14, 104, 'active');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role) VALUES (31, 'fansub_lead');
	`); err != nil {
		t.Fatal(err)
	}
	return &effectiveRightsPostgresFixture{pool: pool}
}

func (f *effectiveRightsPostgresFixture) currentEffect(t *testing.T, appUserID, fansubGroupID int64, actionCode string) *string {
	t.Helper()
	var effect *string
	err := f.pool.QueryRow(context.Background(), `
		SELECT effect FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
	`, appUserID, fansubGroupID, actionCode).Scan(&effect)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	require.NoError(t, err)
	return effect
}

func (f *effectiveRightsPostgresFixture) membershipStatus(t *testing.T, appUserID, fansubGroupID int64) string {
	t.Helper()
	var status string
	require.NoError(t, f.pool.QueryRow(context.Background(), `
		SELECT status FROM fansub_group_members WHERE app_user_id = $1 AND fansub_group_id = $2
	`, appUserID, fansubGroupID).Scan(&status))
	return status
}

func (f *effectiveRightsPostgresFixture) setMembershipStatus(t *testing.T, appUserID, fansubGroupID int64, status string) {
	t.Helper()
	_, err := f.pool.Exec(context.Background(), `
		UPDATE fansub_group_members SET status = $3 WHERE app_user_id = $1 AND fansub_group_id = $2
	`, appUserID, fansubGroupID, status)
	require.NoError(t, err)
}

func (f *effectiveRightsPostgresFixture) historyCount(t *testing.T, appUserID, fansubGroupID int64, actionCode string) int {
	t.Helper()
	var count int
	require.NoError(t, f.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM user_group_capability_override_history
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
	`, appUserID, fansubGroupID, actionCode).Scan(&count))
	return count
}

func (f *effectiveRightsPostgresFixture) seedOverride(t *testing.T, appUserID, fansubGroupID int64, actionCode, effect string, actorAppUserID int64) {
	t.Helper()
	_, err := f.pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_overrides (
			app_user_id, fansub_group_id, action_code, effect, created_by_app_user_id, updated_by_app_user_id
		) VALUES ($1, $2, $3, $4, $5, $5)
	`, appUserID, fansubGroupID, actionCode, effect, actorAppUserID)
	require.NoError(t, err)
}

// resetOverrideState clears only the CURRENT override row. It deliberately never
// touches user_group_capability_override_history: migration 0146's append-only
// trigger rejects DELETE/UPDATE against that table entirely (by design -- it is
// immutable audit, not test scaffolding), so every history assertion in this file
// compares a delta against a historyCount baseline captured before the mutation under
// test, rather than resetting history between subtests.
func (f *effectiveRightsPostgresFixture) resetOverrideState(t *testing.T, appUserID, fansubGroupID int64, actionCode string) {
	t.Helper()
	_, err := f.pool.Exec(context.Background(), `
		DELETE FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
	`, appUserID, fansubGroupID, actionCode)
	require.NoError(t, err)
}

func leadActor() permissions.Actor { return permissions.Actor{AppUserID: 11, Status: "active"} }

func strOrNone(p *string) string {
	if p == nil {
		return "<none>"
	}
	return *p
}

// --- D06 real-change / no-op transition matrix --------------------------------

func TestPhase137EffectiveRightsOverrideMutationTransitions(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)

	cases := []struct {
		name       string
		seedEffect *string
		kind       OverrideMutationKind
		wantAfter  *string
		wantReal   bool
	}{
		{"none_to_allow", nil, OverrideMutationSetAllow, strPtr("allow"), true},
		{"none_to_deny", nil, OverrideMutationSetDeny, strPtr("deny"), true},
		{"allow_to_deny", strPtr("allow"), OverrideMutationSetDeny, strPtr("deny"), true},
		{"deny_to_allow", strPtr("deny"), OverrideMutationSetAllow, strPtr("allow"), true},
		{"allow_to_none", strPtr("allow"), OverrideMutationRemove, nil, true},
		{"deny_to_none", strPtr("deny"), OverrideMutationRemove, nil, true},
		{"allow_to_allow_noop", strPtr("allow"), OverrideMutationSetAllow, strPtr("allow"), false},
		{"deny_to_deny_noop", strPtr("deny"), OverrideMutationSetDeny, strPtr("deny"), false},
		{"none_to_none_noop", nil, OverrideMutationRemove, nil, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
			if tc.seedEffect != nil {
				fx.seedOverride(t, 12, 21, effectiveRightsFixtureAction, *tc.seedEffect, 11)
			}
			historyBefore := fx.historyCount(t, 12, 21, effectiveRightsFixtureAction)

			cmd := EffectiveRightsOverrideMutationCommand{
				Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
				ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: tc.kind,
			}
			if tc.wantReal {
				cmd.ReasonCategory = OverrideReasonCategoryTaskDelegation
			}

			result, err := service.MutateOverride(ctx, cmd)
			require.NoError(t, err)
			require.NotNil(t, result)

			assert.Equal(t, tc.wantReal, result.Changed, "changed mismatch")
			assert.Equal(t, strOrNone(tc.seedEffect), strOrNone(result.BeforeEffect), "before mismatch")
			assert.Equal(t, strOrNone(tc.wantAfter), strOrNone(result.AfterEffect), "after mismatch")
			assert.Equal(t, EffectiveRightsActivationStatusActive, result.ActivationStatus)
			assert.Equal(t, strOrNone(tc.wantAfter), strOrNone(fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction)))

			wantHistory := historyBefore
			if tc.wantReal {
				wantHistory++
			}
			assert.Equal(t, wantHistory, fx.historyCount(t, 12, 21, effectiveRightsFixtureAction), "history row count mismatch")
		})
	}
}

func strPtr(s string) *string { return &s }

// --- D06 reason requirement ----------------------------------------------------

func TestPhase137EffectiveRightsOverrideMutationRequiresReasonForRealChange(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)

	t.Run("blank_category_rejected", func(t *testing.T) {
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsReasonRequired)
		assert.Nil(t, fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction), "rejected mutation must not persist any override state")
		assert.Equal(t, 0, fx.historyCount(t, 12, 21, effectiveRightsFixtureAction))
	})

	t.Run("other_category_without_text_rejected", func(t *testing.T) {
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryOther, ReasonText: "   ",
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsReasonRequired)
		assert.Nil(t, fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction))
	})

	t.Run("no_op_does_not_require_reason", func(t *testing.T) {
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
		fx.seedOverride(t, 12, 21, effectiveRightsFixtureAction, "allow", 11)
		result, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
		})
		require.NoError(t, err)
		assert.False(t, result.Changed)
		assert.Equal(t, 0, fx.historyCount(t, 12, 21, effectiveRightsFixtureAction), "no-op must not fabricate an audit event")
	})
}

// --- D02/D08 target membership validation --------------------------------------

func TestPhase137EffectiveRightsOverrideMutationRejectsInactiveOrMissingTarget(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)

	cases := []struct {
		name          string
		targetAppUser int64
		fansubGroupID int64
	}{
		{"disabled_membership", 13, 21},
		{"no_membership_at_all", 999, 21},
		{"foreign_group_membership_not_scoped_here", 14, 21},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fx.resetOverrideState(t, tc.targetAppUser, tc.fansubGroupID, effectiveRightsFixtureAction)
			_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
				Actor: leadActor(), TargetAppUserID: tc.targetAppUser, FansubGroupID: tc.fansubGroupID,
				ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
				ReasonCategory: OverrideReasonCategoryTaskDelegation,
			})
			assert.ErrorIs(t, err, ErrEffectiveRightsTargetNotActiveMember)
			assert.Nil(t, fx.currentEffect(t, tc.targetAppUser, tc.fansubGroupID, effectiveRightsFixtureAction))
		})
	}
}

func TestPhase137EffectiveRightsOverrideRetainedDormantWhenMembershipBecomesInactive(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)
	fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
	fx.seedOverride(t, 12, 21, effectiveRightsFixtureAction, "allow", 11)
	require.Equal(t, "active", fx.membershipStatus(t, 12, 21))

	fx.setMembershipStatus(t, 12, 21, "disabled")
	defer fx.setMembershipStatus(t, 12, 21, "active")

	_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
		Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
		ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetDeny,
		ReasonCategory: OverrideReasonCategoryTaskDelegation,
	})
	assert.ErrorIs(t, err, ErrEffectiveRightsTargetNotActiveMember)
	// D02: the service never auto-deletes a dormant override -- the previously
	// stored "allow" row must remain byte-for-byte unchanged.
	assert.Equal(t, "allow", strOrNone(fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction)))

	fx.setMembershipStatus(t, 12, 21, "active")
	result, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
		Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
		ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetDeny,
		ReasonCategory: OverrideReasonCategoryTaskDelegation,
	})
	require.NoError(t, err)
	assert.True(t, result.Changed, "a reactivated membership makes the retained override mutable again")
}

// --- D07 authorization -----------------------------------------------------------

func TestPhase137EffectiveRightsOverrideMutationAuthorization(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)

	t.Run("actor_without_capability_denied", func(t *testing.T) {
		fx.resetOverrideState(t, 13, 21, effectiveRightsFixtureAction)
		fx.setMembershipStatus(t, 13, 21, "active")
		defer fx.setMembershipStatus(t, 13, 21, "disabled")
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor:          permissions.Actor{AppUserID: 12, Status: "active"},
			TargetAppUserID: 13, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsCapabilityDenied)
		assert.Nil(t, fx.currentEffect(t, 13, 21, effectiveRightsFixtureAction))
	})

	t.Run("management_capability_does_not_cross_groups", func(t *testing.T) {
		fx.resetOverrideState(t, 14, 22, effectiveRightsFixtureAction)
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), // fansub_lead only in group 21
			TargetAppUserID: 14, FansubGroupID: 22,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsCapabilityDenied)
	})

	t.Run("self_mutation_allowed_via_capability_not_special_casing", func(t *testing.T) {
		fx.resetOverrideState(t, 11, 21, effectiveRightsFixtureAction)
		historyBefore := fx.historyCount(t, 11, 21, effectiveRightsFixtureAction)
		result, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 11, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		require.NoError(t, err)
		assert.True(t, result.Changed)
		assert.Equal(t, historyBefore+1, fx.historyCount(t, 11, 21, effectiveRightsFixtureAction), "a legitimate self-mutation must still be audited like any other real change")
		fx.resetOverrideState(t, 11, 21, effectiveRightsFixtureAction)
	})

	// 137-CONTEXT.md Section 7 negative matrix: "self-modification without
	// management capability | blocked". app_user 12 holds no roles in group 21
	// (see fixture topology), so targeting itself must be denied exactly like
	// targeting any other user -- D07 requires no special-cased self-check in
	// either direction.
	t.Run("self_mutation_denied_without_capability", func(t *testing.T) {
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: permissions.Actor{AppUserID: 12, Status: "active"}, TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsCapabilityDenied)
		assert.Nil(t, fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction))
	})

	// 137-CONTEXT.md Section 7 negative matrix: "Platform-Admin path | separately
	// verified" -- proven here at the mutation/authorization boundary (the
	// resolver-level platform-admin bypass is already proven in
	// effective_rights_test.go; D07's own text explicitly calls out that
	// "Platform Admin may manage them through the non-deniable global bypass").
	// A platform admin with zero roles/membership in group 21 must still be able
	// to mutate an override there.
	t.Run("platform_admin_bypasses_group_management_capability", func(t *testing.T) {
		// created_by_app_user_id/updated_by_app_user_id carry an FK to app_users(id),
		// so the acting platform admin must be a real row -- id 900, no group role
		// or membership anywhere, exactly the "platform admin with zero group
		// standing" scenario D07 describes.
		_, err := fx.pool.Exec(ctx, `INSERT INTO app_users(id, status) VALUES (900, 'active') ON CONFLICT DO NOTHING`)
		require.NoError(t, err)
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
		result, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor:           permissions.Actor{AppUserID: 900, Status: "active", IsPlatformAdmin: true},
			TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetDeny,
			ReasonCategory: OverrideReasonCategorySecurityMeasure,
		})
		require.NoError(t, err)
		assert.True(t, result.Changed)
		assert.Equal(t, "deny", strOrNone(fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction)))
		fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
	})
}

// --- D07/D08 catalog validation ---------------------------------------------------

func TestPhase137EffectiveRightsOverrideMutationCatalogValidation(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	service := NewEffectiveRightsService(fx.pool)

	t.Run("unknown_action_rejected", func(t *testing.T) {
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: "not.a.real.action", Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsActionUnknown)
	})

	t.Run("non_overridable_action_rejected", func(t *testing.T) {
		fx.resetOverrideState(t, 12, 21, effectiveRightsNonOverridableAction)
		_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsNonOverridableAction), Kind: OverrideMutationSetAllow,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		})
		assert.ErrorIs(t, err, ErrEffectiveRightsActionNotOverridable)
		assert.Nil(t, fx.currentEffect(t, 12, 21, effectiveRightsNonOverridableAction))
	})
}

// --- D06 atomicity: history-insert failure rolls back the override mutation too ---

var errForcedEffectiveRightsHistoryFailure = errors.New("forced history failure for rollback proof")

type forcedHistoryFailureOverrideRepo struct {
	*repository.AuthzUserOverridesRepository
}

func (r *forcedHistoryFailureOverrideRepo) AppendHistory(
	context.Context, repository.UserGroupCapabilityOverrideHistoryEntry,
) (int64, error) {
	return 0, errForcedEffectiveRightsHistoryFailure
}

var _ effectiveRightsOverrideRepo = (*forcedHistoryFailureOverrideRepo)(nil)

func TestPhase137EffectiveRightsOverrideMutationRollsBackOnHistoryFailure(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	ctx := context.Background()
	fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)

	service := NewEffectiveRightsService(fx.pool)
	service.newOverrideRepo = func(tx pgx.Tx) effectiveRightsOverrideRepo {
		return &forcedHistoryFailureOverrideRepo{repository.NewAuthzUserOverridesRepository(tx)}
	}

	_, err := service.MutateOverride(ctx, EffectiveRightsOverrideMutationCommand{
		Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
		ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetAllow,
		ReasonCategory: OverrideReasonCategoryTaskDelegation,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, errForcedEffectiveRightsHistoryFailure)

	// The override upsert genuinely executed inside the transaction before the forced
	// history failure -- proving this asserts the ROLLBACK actually undid it, not that
	// it never ran.
	assert.Nil(t, fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction), "history failure must roll back the override mutation")
	assert.Equal(t, 0, fx.historyCount(t, 12, 21, effectiveRightsFixtureAction))
}
