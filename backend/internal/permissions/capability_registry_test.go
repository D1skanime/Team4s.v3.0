package permissions

// Wave-0-Tests für den Capability-Registry (Phase 86, Plan 01).
// Diese Tests dokumentieren das ERWARTETE Verhalten nach Plan 86-02 und sind im RED-Zustand:
// LoadCache gibt "nicht implementiert" zurück bis Plan 86-02 den Cache-Umbau liefert.
//
// RED-Kriterium: svc.LoadCache(ctx, stub) gibt immer error != nil (Stub-Implementierung).
// - TestRoleMatrixSeedParity: erwartet NoError → FAIL (RED)
// - TestCacheLoadAndLookup: erwartet NoError + korrekte Lookup-Werte → FAIL (RED)
// - TestStartupConsistencyCheck: erwartet error != nil für unvollständigen Cache → FAIL (RED, falscher Grund)
//
// Bestehende Tests in permissions_test.go bleiben GRÜN, da sie LoadCache nicht aufrufen
// und roleAllows direkt auf die statische roleMatrix fällt.

import (
	"context"
	"errors"
	"os"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	cacheMu.Lock()
	loadedCache = roleMatrixStubData()
	cacheMu.Unlock()
	os.Exit(m.Run())
}

func TestPermissionCatalogFailsClosedBeforeLoad(t *testing.T) {
	cacheMu.Lock()
	previous := loadedCache
	loadedCache = nil
	cacheMu.Unlock()
	t.Cleanup(func() { cacheMu.Lock(); loadedCache = previous; cacheMu.Unlock() })

	assert.Empty(t, AllowedActionsForRole(RoleFansubLead))
	assert.False(t, RoleAllowsAction(RoleFansubLead, ActionFansubGroupEdit))
}

type failingCatalogLoader struct{ stubCacheLoader }

func (f failingCatalogLoader) LoadFansubGroupRoles(context.Context) ([]string, error) {
	return []string{"karaoke_fx"}, nil
}
func (f failingCatalogLoader) LoadCapabilityRoles(context.Context) ([]string, error) {
	return nil, errors.New("catalog unavailable")
}

func TestPermissionCatalogFailureDoesNotPartiallySwap(t *testing.T) {
	beforeRoles := FansubGroupRoles()
	err := NewService(nil).LoadFansubGroupCatalog(context.Background(), failingCatalogLoader{})
	require.Error(t, err)
	assert.Equal(t, beforeRoles, FansubGroupRoles())
}

func TestPermissionCatalogLearnsZeroRightRole(t *testing.T) {
	data := roleMatrixStubData()
	data["karaoke_fx"] = nil
	require.NoError(t, NewService(nil).LoadCache(context.Background(), stubCacheLoader{data: data}))
	assert.Empty(t, AllowedActionsForRole("karaoke_fx"))
}

// stubCacheLoader implementiert CacheLoader für Tests.
// data enthält die vollständige roleCode → []Action-Map die LoadRoleCapabilities zurückgibt.
type stubCacheLoader struct {
	data map[string][]Action
}

func (s stubCacheLoader) LoadRoleCapabilities(_ context.Context) (map[string][]Action, error) {
	return s.data, nil
}

// allActionCodesWave0 enthält alle Action-Code-Strings aus permissions.go als String-Literale.
// Getrennt von den Konstanten, damit der Test den Seed unabhängig validiert (D-10).
var allActionCodesWave0 = []string{
	"fansub_group.edit",
	"fansub_group.links.manage",
	"fansub_group.members.view",
	"fansub_group.members.manage",
	"fansub_group.historical_members.manage",
	"fansub_group.historical_roles.manage",
	"fansub_group.historical_members.link",
	"fansub_group.invitations.view",
	"fansub_group.invitations.create",
	"fansub_group.invitations.cancel",
	"fansub_group.invitations.accept", // in action_definitions, KEIN role_capabilities-Eintrag (Pitfall 2)
	"fansub_group.notes.write",
	"fansub_group_media.view",
	"fansub_group_media.upload",
	"fansub_group_media.update",
	"fansub_group_media.delete",
	"anime_fansub_project.notes.write",
	"anime_fansub_project.timeline.update",
	"release.view",
	"release_version.view",
	"release_version_media.view",
	"release_version_media.upload",
	"release_version_media.update",
	"release_version_media.delete",
	"release_version_media.delete_own",
	"release_version.notes.write",
	"release_version.segments.manage",
	"release_version.metadata.update",
	"review.text.decide",
	"review.image.decide",
	"review.contribution.decide",
}

// roleMatrixStubData gibt die vollständige roleMatrix als map zurück (Seed-Quelle R-02).
// Entspricht exakt den role_capabilities-Einträgen aus Migration 0108.
func roleMatrixStubData() map[string][]Action {
	return map[string][]Action{
		RoleFansubLead: {
			ActionFansubGroupEdit,
			ActionFansubGroupLinksManage,
			ActionFansubGroupMembersView,
			ActionFansubGroupMembersManage,
			ActionFansubGroupHistoricalMembersManage,
			ActionFansubGroupHistoricalRolesManage,
			ActionFansubGroupHistoricalMembersLink,
			ActionFansubGroupInvitationsView,
			ActionFansubGroupInvitationsCreate,
			ActionFansubGroupInvitationsCancel,
			ActionFansubGroupNotesWrite,
			ActionFansubGroupMediaView,
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaDelete,
			ActionAnimeFansubProjectNotesWrite,
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDelete,
			ActionReleaseVersionNotesWrite,
			ActionReleaseVersionSegmentsManage,
			ActionReviewTextDecide,
			ActionReviewImageDecide,
			ActionReviewContributionDecide,
			ActionUserGroupCapabilityOverrideManage,
		},
		RoleProjectLead: {
			ActionFansubGroupEdit,
			ActionFansubGroupLinksManage,
			ActionFansubGroupMembersView,
			ActionFansubGroupInvitationsView,
			ActionFansubGroupNotesWrite,
			ActionFansubGroupMediaView,
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaDelete,
			ActionAnimeFansubProjectNotesWrite,
			ActionAnimeFansubProjectTimelineUpdate,
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDelete,
			ActionReleaseVersionNotesWrite,
			ActionReleaseVersionSegmentsManage,
			ActionReleaseVersionMetadataUpdate,
		},
		RoleDesigner: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDeleteOwn,
		},
		RoleEditor: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionFansubGroupNotesWrite,
			ActionAnimeFansubProjectNotesWrite,
			ActionReleaseVersionNotesWrite,
		},
		RoleTranslator: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionNotesWrite,
		},
		RoleTimer: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionNotesWrite,
			ActionReleaseVersionSegmentsManage,
		},
		RoleTypesetter: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionNotesWrite,
		},
		RoleEncoder: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDeleteOwn,
			ActionReleaseVersionNotesWrite,
		},
		RoleRawProvider: {
			ActionReleaseView,
			ActionReleaseVersionView,
		},
		RoleQualityChecker: {
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionNotesWrite,
		},
		// Phase-136-Rollen (Migration 0146) -- gfxler/techadmin sind Go-Konstanten,
		// founder/co_leader existieren nur als role_definitions-Rollencodes ohne
		// eigene Go-Konstante (siehe app_auth_test.go's bestehende Testfälle). Diese
		// vier Zuordnungen entsprechen exakt Migration 0146's role_capabilities-Seed
		// und werden erst seit Plan 137-05 gebraucht, weil allKnownActions jetzt auch
		// die fünf Phase-136-Actions enthält (D-10-Konsistenz-Check).
		RoleGfxler: {
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaReorder,
		},
		RoleTechadmin: {
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaReorder,
			ActionFansubGroupPageTechnicalLinksEdit,
		},
		"founder": {
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaReorder,
			ActionFansubGroupPageFoundingHistoryEdit,
		},
		"co_leader": {
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaReorder,
			ActionFansubGroupPageGeneralEdit,
			ActionFansubGroupLinksUpdate,
		},
		// Phase 145: RoleMembershipBaseline (group_member) is the reserved pseudo-role
		// sourcing IsMembershipBaselineAction from the registry instead of a hardcoded Go
		// slice -- required here so the fail-closed validateMembershipBaselineRegistryPresence
		// check (permissions.go) passes for every test loading this fixture.
		RoleMembershipBaseline: {
			ActionFansubGroupMembersView,
			ActionFansubGroupMediaView,
			ActionFansubGroupMediaUpload,
		},
	}
}

// TestRoleMatrixSeedParity prüft D-03 + D-10:
// Der CacheLoader-Stub liefert die vollständige roleMatrix.
// Nach LoadCache müssen alle Action-Codes (außer invitations.accept) in mindestens einer Rolle vertreten sein.
// MUSS RED sein: svc.LoadCache gibt "nicht implementiert" zurück bis Plan 86-02 den Cache-Umbau liefert.
func TestRoleMatrixSeedParity(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil)
	stub := stubCacheLoader{data: roleMatrixStubData()}

	err := svc.LoadCache(ctx, stub)
	require.NoError(t, err, "LoadCache sollte nach Plan 86-02 keinen Fehler zurückgeben")

	// Prüfe, dass alle Action-Codes (außer invitations.accept) in mindestens einer Rolle vertreten sind.
	// invitations.accept hat bewusst keinen role_capabilities-Eintrag (CanAcceptInvitation nutzt keinen Rollen-Lookup).
	acceptAction := "fansub_group.invitations.accept"
	for _, code := range allActionCodesWave0 {
		if code == acceptAction {
			// invitations.accept: darf keinen role_capabilities-Eintrag haben — kein Assert nötig
			continue
		}
		action := Action(code)
		found := false
		for role := range roleMatrixStubData() {
			if slices.Contains(roleMatrixStubData()[role], action) {
				found = true
				break
			}
		}
		assert.True(t, found, "action_code %q sollte in mindestens einer Rolle in role_capabilities vertreten sein", code)
	}
}

// TestCacheLoadAndLookup prüft D-04 + D-05:
// Nach LoadCache liefert RoleAllowsAction korrekte Werte aus dem Cache (nicht aus der statischen roleMatrix).
// MUSS RED sein: svc.LoadCache gibt "nicht implementiert" zurück bis Plan 86-02 den Cache-Umbau liefert.
func TestCacheLoadAndLookup(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil)
	stub := stubCacheLoader{data: roleMatrixStubData()}

	err := svc.LoadCache(ctx, stub)
	require.NoError(t, err, "LoadCache sollte nach Plan 86-02 keinen Fehler zurückgeben")

	// Erwartete Wahrheiten aus R-02 (behavior-preserving):
	assert.True(t,
		RoleAllowsAction(RoleFansubLead, ActionFansubGroupEdit),
		"fansub_lead darf fansub_group.edit (R-02)",
	)
	assert.False(t,
		RoleAllowsAction(RoleEditor, ActionFansubGroupMembersManage),
		"editor darf NICHT fansub_group.members.manage (R-02)",
	)
	assert.True(t,
		RoleAllowsAction(RoleRawProvider, ActionReleaseView),
		"raw_provider darf release.view (R-02)",
	)
}

// TestStartupConsistencyCheck prüft D-10:
// LoadCache muss mit vollständigem Cache keinen Fehler zurückgeben,
// und mit unvollständigem Cache (fehlt ActionReleaseVersionNotesWrite) einen Fehler zurückgeben.
// MUSS RED sein: die erste require.NoError-Assertion schlägt fehl, da LoadCache Stub-Fehler zurückgibt.
// Nach Plan 86-02: LoadCache implementiert echten Konsistenz-Check und liefert NoError für vollständigen Cache.
func TestStartupConsistencyCheck(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil)

	// Schritt 1: Mit vollständigem Cache muss LoadCache keinen Fehler zurückgeben (D-10 — Happy Path).
	// MUSS RED sein: Stub gibt immer error zurück.
	fullStub := stubCacheLoader{data: roleMatrixStubData()}
	errFull := svc.LoadCache(ctx, fullStub)
	require.NoError(t, errFull, "LoadCache muss mit vollständigem Cache keinen Fehler zurückgeben (D-10)")

	// Schritt 2: Unvollständiger Cache — ActionReleaseVersionNotesWrite fehlt in allen Rollen.
	// Plan 86-02 muss sicherstellen, dass LoadCache einen Fehler zurückgibt.
	incompleteData := roleMatrixStubData()
	for role, actions := range incompleteData {
		filtered := make([]Action, 0, len(actions))
		for _, a := range actions {
			if a != ActionReleaseVersionNotesWrite {
				filtered = append(filtered, a)
			}
		}
		incompleteData[role] = filtered
	}
	incompleteStub := stubCacheLoader{data: incompleteData}

	errIncomplete := svc.LoadCache(ctx, incompleteStub)
	assert.Error(t, errIncomplete, "LoadCache muss einen Fehler zurückgeben wenn ein Action-Code in keiner Rolle vertreten ist (D-10)")
}

// TestLoadCacheFailsClosedWhenPseudoRoleCapabilitiesMissing proves Phase 145's Success
// Criterion 6: LoadCache aborts (returns an identifiable error, does not publish the
// rejected map) when the RoleMembershipBaseline pseudo-role's role_capabilities entry is
// missing entirely or incomplete, even though every other role's data is otherwise valid --
// mirroring TestStartupConsistencyCheck's two-step happy-path/incomplete-path pattern.
func TestLoadCacheFailsClosedWhenPseudoRoleCapabilitiesMissing(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil)

	// Step 1: full stub (including the pseudo-role's 3 actions) succeeds.
	fullStub := stubCacheLoader{data: roleMatrixStubData()}
	require.NoError(t, svc.LoadCache(ctx, fullStub))
	beforeActions := AllowedActionsForRole(RoleMembershipBaseline)
	require.NotEmpty(t, beforeActions)

	cases := []struct {
		name   string
		mutate func(map[string][]Action)
	}{
		{
			name: "entry entirely missing",
			mutate: func(data map[string][]Action) {
				delete(data, RoleMembershipBaseline)
			},
		},
		{
			name: "entry has fewer than 3 actions",
			mutate: func(data map[string][]Action) {
				data[RoleMembershipBaseline] = []Action{ActionFansubGroupMembersView}
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			incomplete := roleMatrixStubData()
			tc.mutate(incomplete)
			incompleteStub := stubCacheLoader{data: incomplete}

			err := svc.LoadCache(ctx, incompleteStub)
			require.Error(t, err, "LoadCache must fail closed when the pseudo-role's registry rows are incomplete")
			assert.Contains(t, err.Error(), RoleMembershipBaseline)

			// The OLD cache state must still be published, not the rejected one.
			afterActions := AllowedActionsForRole(RoleMembershipBaseline)
			assert.ElementsMatch(t, beforeActions, afterActions, "a rejected LoadCache must not publish its incomplete map")
		})
	}
}

// pseudoRoleCatalogStub is a CatalogLoader stub (Phase 145, Task 3) whose
// LoadFansubGroupRoles return value deliberately EXCLUDES RoleMembershipBaseline while its
// LoadCapabilityRoles return value deliberately INCLUDES it -- proving the Go-side catalog
// functions correctly reflect whatever a loader provides. It intentionally does not
// implement CacheLoader (mirrors the testmain_test.go stubs' CatalogLoader-only shape), so
// LoadFansubGroupCatalog never touches loadedCache here.
type pseudoRoleCatalogStub struct{}

func (pseudoRoleCatalogStub) LoadFansubGroupRoles(context.Context) ([]string, error) {
	return []string{RoleFansubLead}, nil
}

func (pseudoRoleCatalogStub) LoadCapabilityRoles(context.Context) ([]string, error) {
	return []string{RoleFansubLead, RoleMembershipBaseline}, nil
}

// TestPseudoRoleCapabilityEditableButNotAssignable proves Phase 145's Success Criterion 5 in
// both directions within one test run (a test that only checks one direction is
// insufficient, per 145-VALIDATION.md): the reserved pseudo-role is simultaneously
// unassignable (never in the known-group-role catalog) and capability-editable (present in
// the capability-bearing catalog).
func TestPseudoRoleCapabilityEditableButNotAssignable(t *testing.T) {
	err := NewService(nil).LoadFansubGroupCatalog(context.Background(), pseudoRoleCatalogStub{})
	require.NoError(t, err)

	assert.False(t, IsKnownFansubGroupRole(RoleMembershipBaseline), "the reserved pseudo-role must never be assignable via IsKnownFansubGroupRole")
	assert.True(t, IsCapabilityBearingRole(RoleMembershipBaseline), "the reserved pseudo-role must remain capability-editable via IsCapabilityBearingRole")
}

func TestPhase107PermissionCatalogRequiresEveryReviewAction(t *testing.T) {
	for _, missing := range []Action{
		ActionReviewTextDecide,
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	} {
		t.Run(string(missing), func(t *testing.T) {
			data := roleMatrixStubData()
			for role, actions := range data {
				data[role] = slices.DeleteFunc(actions, func(action Action) bool {
					return action == missing
				})
			}

			err := NewService(nil).LoadCache(context.Background(), stubCacheLoader{data: data})

			require.Error(t, err)
			assert.Contains(t, err.Error(), string(missing))
		})
	}
}

func TestPhase107PermissionCatalogHasNoPlatformAdminRoleCapability(t *testing.T) {
	data := roleMatrixStubData()

	assert.NotContains(t, data, RolePlatformAdmin)
	for _, action := range []Action{
		ActionReviewTextDecide,
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	} {
		assert.Contains(t, data[RoleFansubLead], action)
	}
}
