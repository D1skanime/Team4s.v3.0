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
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubCacheLoader implementiert CacheLoader für Tests.
// data enthält die vollständige roleCode → []Action-Map die LoadRoleCapabilities zurückgibt.
type stubCacheLoader struct {
	data map[string][]Action
}

func (s stubCacheLoader) LoadRoleCapabilities(_ context.Context) (map[string][]Action, error) {
	return s.data, nil
}

// allActionCodesWave0 enthält alle 18 Action-Code-Strings aus permissions.go als String-Literale.
// Getrennt von den Konstanten, damit der Test den Seed unabhängig validiert (D-10).
var allActionCodesWave0 = []string{
	"fansub_group.edit",
	"fansub_group.links.manage",
	"fansub_group.members.view",
	"fansub_group.members.manage",
	"fansub_group.invitations.view",
	"fansub_group.invitations.create",
	"fansub_group.invitations.cancel",
	"fansub_group.invitations.accept", // in action_definitions, KEIN role_capabilities-Eintrag (Pitfall 2)
	"fansub_group.notes.write",
	"anime_fansub_project.notes.write",
	"release.view",
	"release_version.view",
	"release_version_media.view",
	"release_version_media.upload",
	"release_version_media.update",
	"release_version_media.delete",
	"release_version_media.delete_own",
	"release_version.notes.write",
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
			ActionFansubGroupInvitationsView,
			ActionFansubGroupInvitationsCreate,
			ActionFansubGroupInvitationsCancel,
			ActionFansubGroupNotesWrite,
			ActionAnimeFansubProjectNotesWrite,
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDelete,
			ActionReleaseVersionNotesWrite,
		},
		RoleProjectLead: {
			ActionFansubGroupEdit,
			ActionFansubGroupLinksManage,
			ActionFansubGroupMembersView,
			ActionFansubGroupInvitationsView,
			ActionFansubGroupNotesWrite,
			ActionAnimeFansubProjectNotesWrite,
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDelete,
			ActionReleaseVersionNotesWrite,
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
	}
}

// TestRoleMatrixSeedParity prüft D-03 + D-10:
// Der CacheLoader-Stub liefert die vollständige roleMatrix.
// Nach LoadCache müssen alle 18 Action-Codes (außer invitations.accept) in mindestens einer Rolle vertreten sein.
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
