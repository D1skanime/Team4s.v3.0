package repository

import (
	"strings"
	"testing"
)

func TestHistGroupMemberUpdateCastsStatusParameterForConfirmationCase(t *testing.T) {
	source := readRepositorySource(t, "hist_group_members_repository.go")

	for _, fragment := range []string{
		"status = $%d::text",
		"CASE WHEN $%d::text = 'confirmed'",
		"WHEN $%d::text <> 'confirmed'",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("historical member status update must cast the confirmation comparison parameter: missing %q", fragment)
		}
	}
}
