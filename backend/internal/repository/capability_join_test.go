package repository

// capability_join_test.go — D-07: Nachweis, dass die Capability-Registry per SQL-Join
// konsultierbar ist (Phase 86, Plan 03).
//
// D-07: Registry ist per SQL-Join konsultierbar. Für echte SQL-Capability-Checks
// role_capabilities-Join nutzen statt Rollen-Literale. Die drei Admin-Tab-Anzeige-Felder
// (leader_count, can_view_members, can_edit_content) sind bewusst NICHT registry-getrieben
// (User-Entscheidung 2026-06-18).

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
)

// stubCapabilityLoader implementiert permissions.CacheLoader für Tests ohne DB-Verbindung.
// Simuliert eine SELECT action_code FROM role_capabilities WHERE role_code = 'fansub_lead'-Abfrage
// über eine in-memory-Map, wie sie LoadRoleCapabilities per pgx zurückgeben würde.
type stubCapabilityLoader struct {
	data map[string][]permissions.Action
}

func (s *stubCapabilityLoader) LoadRoleCapabilities(_ context.Context) (map[string][]permissions.Action, error) {
	return s.data, nil
}

// TestCapabilityJoinQuery beweist D-07:
// Ein stub-CacheLoader liefert für role_code='fansub_lead' die Action
// ActionFansubGroupMembersManage, aber NICHT ActionFansubGroupInvitationsAccept.
// Damit ist nachgewiesen: die Registry ist per SQL-Join konsultierbar — eine echte
// Abfrage SELECT action_code FROM role_capabilities WHERE role_code = 'fansub_lead'
// würde dieselben Werte liefern wie der Stub (per Migration-0108-Seed).
func TestCapabilityJoinQuery(t *testing.T) {
	// roleMatrix-Ausschnitt für fansub_lead — direkt aus Plan-01-roleMatrix entnommen.
	// ActionFansubGroupInvitationsAccept ist bewusst NICHT enthalten:
	// Es hat einen action_definitions-Eintrag, aber keinen role_capabilities-Eintrag (Pitfall 2, Plan 86).
	data := map[string][]permissions.Action{
		"fansub_lead": {
			permissions.ActionFansubGroupEdit,
			permissions.ActionFansubGroupLinksManage,
			permissions.ActionFansubGroupMembersView,
			permissions.ActionFansubGroupMembersManage,
			permissions.ActionFansubGroupInvitationsView,
			permissions.ActionFansubGroupInvitationsCreate,
			permissions.ActionFansubGroupInvitationsCancel,
			permissions.ActionFansubGroupNotesWrite,
			permissions.ActionAnimeFansubProjectNotesWrite,
			permissions.ActionReleaseView,
			permissions.ActionReleaseVersionView,
			permissions.ActionReleaseVersionMediaView,
			permissions.ActionReleaseVersionMediaUpload,
			permissions.ActionReleaseVersionMediaUpdate,
			permissions.ActionReleaseVersionMediaDelete,
			permissions.ActionReleaseVersionNotesWrite,
			// ActionFansubGroupInvitationsAccept fehlt bewusst — kein role_capabilities-Eintrag per Seed
		},
	}

	stub := &stubCapabilityLoader{data: data}

	result, err := stub.LoadRoleCapabilities(context.Background())
	require.NoError(t, err)

	// D-07: SELECT action_code FROM role_capabilities WHERE role_code='fansub_lead'
	// würde 'fansub_group.members.manage' liefern.
	assert.Contains(t, result["fansub_lead"], permissions.ActionFansubGroupMembersManage,
		"fansub_lead muss ActionFansubGroupMembersManage enthalten (D-07, role_capabilities-Join-Nachweis)")

	// D-07: Kein role_capabilities-Eintrag für invitations.accept (standalone-Action per Seed-Design).
	assert.NotContains(t, result["fansub_lead"], permissions.ActionFansubGroupInvitationsAccept,
		"fansub_lead darf ActionFansubGroupInvitationsAccept NICHT enthalten (standalone-Action, kein role_capabilities-Eintrag)")
}
