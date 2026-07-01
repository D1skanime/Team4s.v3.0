package repository

import (
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
)

func TestEvaluateMemberMutationConflictBlocksLastActiveLead(t *testing.T) {
	err := evaluateMemberMutationConflict(
		models.FansubGroupMemberStatusActive,
		[]string{permissions.RoleFansubLead},
		models.FansubGroupMemberStatusDisabled,
		[]string{permissions.RoleFansubLead},
		1,
		1,
	)
	if err == nil {
		t.Fatal("expected last active lead conflict")
	}

	conflict, ok := AsMemberMutationConflict(err)
	if !ok {
		t.Fatalf("expected member mutation conflict, got %T", err)
	}
	if conflict.Code != "last_active_lead" {
		t.Fatalf("expected last_active_lead, got %q", conflict.Code)
	}
}

func TestCreateCanLinkOpenHistoricalMemberByVerifiedClaim(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "fansub_group_app_members_repository.go"))

	required := []string{
		"historicalmemberid",
		"from hist_fansub_group_members hfgm",
		"from hist_group_member_roles hgr",
		"hgr.ended_date is null",
		"from member_claims mc",
		"mc.claim_status = 'verified'",
		"listopenhistoricalrolesforappmembercreate",
		"mergefansubgrouproles",
		"select distinct hgr.role_code",
		"join role_definitions rd",
		"'manual_review'",
		"on conflict (member_id, app_user_id)",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected app member create historical-link flow to contain %q", fragment)
		}
	}
}

func TestEvaluateMemberMutationConflictBlocksLastActiveManager(t *testing.T) {
	err := evaluateMemberMutationConflict(
		models.FansubGroupMemberStatusActive,
		[]string{permissions.RoleFansubLead},
		models.FansubGroupMemberStatusActive,
		nil,
		2,
		1,
	)
	if err == nil {
		t.Fatal("expected last active manager conflict")
	}

	conflict, ok := AsMemberMutationConflict(err)
	if !ok {
		t.Fatalf("expected member mutation conflict, got %T", err)
	}
	if conflict.Code != "last_active_manager" {
		t.Fatalf("expected last_active_manager, got %q", conflict.Code)
	}
}

func TestEvaluateMemberMutationConflictAllowsNonManagingRoleRemoval(t *testing.T) {
	err := evaluateMemberMutationConflict(
		models.FansubGroupMemberStatusActive,
		[]string{permissions.RoleDesigner},
		models.FansubGroupMemberStatusActive,
		nil,
		0,
		3,
	)
	if err != nil {
		t.Fatalf("expected non-managing role removal to be allowed, got %v", err)
	}
}

func TestNormalizeFansubGroupRolesRejectsUnknownRole(t *testing.T) {
	if _, err := normalizeFansubGroupRoles([]string{"fansub_lead", "made_up_role"}); err == nil {
		t.Fatal("expected unknown role to be rejected")
	}
}

// TestSetRoleRejectsHistoricalRoleCode prüft AC-2 (D-01):
// Historische Rollen dürfen NICHT als aktive App-Rollen gesetzt werden.
//
// Produktiv-Validierung: fansub_group_app_members_repository.go:378
//   role := strings.TrimSpace(input.Role)
//   if !permissions.IsKnownFansubGroupRole(role) { return nil, fmt.Errorf("... unknown role") }
//
// Die IsKnownFansubGroupRole-Prüfung läuft VOR jedem DB-Zugriff (Z.374–380),
// daher ist kein Live-DB-Pool nötig — nil ist sicher.
func TestSetRoleRejectsHistoricalRoleCode(t *testing.T) {
	// Erwartung aus dem Katalog ableiten — keine hartkodierte Rollenliste im Test.
	// Vorbedingung: "founder" ist keine aktive App-Rolle laut permissions-Katalog.
	if permissions.IsKnownFansubGroupRole("founder") {
		t.Fatal("Testvorbedingung nicht erfüllt: 'founder' ist eine aktive App-Rolle — TestSetRoleRejectsHistoricalRoleCode wäre bedeutungslos")
	}
	// Positivfall: mindestens eine aktive App-Rolle existiert im Katalog.
	activeRoles := permissions.FansubGroupRoles()
	if len(activeRoles) == 0 {
		t.Fatal("Testvorbedingung nicht erfüllt: keine aktiven App-Rollen im Katalog")
	}

	// nil-Pool ist sicher: die Rollen-Whitelist-Prüfung bricht vor jedem DB-Zugriff ab.
	repo := NewFansubGroupAppMemberRepository(nil)
	_, err := repo.SetRole(
		t.Context(),
		1, // gültige fansubGroupID
		1, // gültige appUserID
		models.FansubGroupMemberRoleUpdateInput{
			Role:   "founder", // historische Rolle — darf nicht gesetzt werden
			Enable: true,
		},
	)
	if err == nil {
		t.Fatal("SetRole hätte den historischen role_code 'founder' ablehnen sollen, hat aber keinen Fehler zurückgegeben")
	}
}
