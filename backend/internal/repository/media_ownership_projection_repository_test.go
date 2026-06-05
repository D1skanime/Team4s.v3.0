package repository

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestMediaProjectionExposesAllOwnershipAxes(t *testing.T) {
	content := readRepositorySource(t, "media_ownership_projection_repository.go")
	normalized := strings.ToLower(content)

	required := []string{
		"`json:\"owner_type\"`",
		"`json:\"owner_id\"`",
		"`json:\"media_category\"`",
		"`json:\"visibility\"`",
		"`json:\"review_status\"`",
		"left join visibilities",
		"left join review_statuses",
		"ma.visibility_id",
		"ma.review_status_id",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected media ownership projection to contain %q", fragment)
		}
	}

	if strings.Contains(normalized, "media_assets.status") ||
		strings.Contains(normalized, "ma.status as review") ||
		strings.Contains(normalized, "ma.status as review_status") {
		t.Fatalf("expected review_status to come from review_statuses, not media_assets.status")
	}
}

func TestMediaProjectionMemberOwnerFromOwnerMemberId(t *testing.T) {
	content := readRepositorySource(t, "media_ownership_projection_repository.go")
	normalized := strings.ToLower(content)

	required := []string{
		"ma.owner_member_id",
		"'member'::text as owner_type",
		"ma.owner_member_id as owner_id",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected member media owner projection to contain %q", fragment)
		}
	}
}

func TestMediaProjectionRespectsOwnerScope(t *testing.T) {
	content := readRepositorySource(t, "media_ownership_projection_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "owner_member_id = $") {
		t.Fatalf("expected owner_member_id scope to be enforced with a pgx parameter")
	}

	forbidden := []string{
		"fmt.sprintf",
		"owner_member_id = '",
		"owner_member_id = \"",
		"owner_member_id = `",
	}
	for _, fragment := range forbidden {
		if strings.Contains(normalized, fragment) {
			t.Fatalf("expected owner scope WHERE to avoid string-built user input, found %q", fragment)
		}
	}
}

func TestMediaProjectionHandlerHasNoEnvelope(t *testing.T) {
	content := readBackendSource(t, filepath.Join("internal", "handlers", "media_ownership_projection_handler.go"))
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "c.json(http.statusok, response)") {
		t.Fatalf("expected media ownership handler to return the response DTO directly")
	}
	if strings.Contains(normalized, "\"data\"") {
		t.Fatalf("expected media ownership handler to avoid a data envelope")
	}
}
