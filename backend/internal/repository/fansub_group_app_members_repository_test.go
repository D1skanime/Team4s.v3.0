package repository

import (
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
