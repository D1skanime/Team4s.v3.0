package repository

import (
	"strings"
	"testing"
)

func TestHistGroupMemberUpdatePersistsDisplayNameOnExistingMember(t *testing.T) {
	source := readRepositorySource(t, "hist_group_members_repository.go")

	for _, fragment := range []string{
		"DisplayName *string",
		"len(setClauses) == 0 && input.DisplayName == nil",
		"updated_member AS",
		"UPDATE members",
		"SET nickname = $%d",
		"FROM updated",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("historical member update must persist the display name: missing %q", fragment)
		}
	}
}
