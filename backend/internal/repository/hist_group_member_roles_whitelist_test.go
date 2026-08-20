package repository

import (
	"os"
	"strings"
	"testing"
)

func TestHistGroupMemberRolesUseCatalogContext(t *testing.T) {
	sourceBytes, err := os.ReadFile("hist_group_member_roles_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	for _, forbidden := range []string{
		"groupHistoryDialogRoleWhitelist",
		"IsGroupHistoryWhitelistRole",
		"code = ANY($",
	} {
		if strings.Contains(source, forbidden) {
			t.Fatalf("historical role authority must not contain %q", forbidden)
		}
	}

	if !strings.Contains(source, "$2 = ANY(contexts)") {
		t.Fatal("historical role validation must use a parameterized role_definitions context lookup")
	}
	if !strings.Contains(source, "RoleCodeExistsForContext(ctx, code, \"group_history\")") {
		t.Fatal("historical writes must validate the group_history catalog context")
	}
}

func TestHistGroupMemberRolesKeepNeutralInvalidBehavior(t *testing.T) {
	sourceBytes, err := os.ReadFile("hist_group_member_roles_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)
	if !strings.Contains(source, "if strings.TrimSpace(code) == \"\"") {
		t.Fatal("blank role codes must retain neutral false validation")
	}
	if !strings.Contains(source, "return false, nil") {
		t.Fatal("invalid historical role codes must retain neutral false validation")
	}
}
