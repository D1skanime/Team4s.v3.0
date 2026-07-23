package services

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestPhase107ReviewServiceBoundary(t *testing.T) {
	files := []string{
		"review_service.go",
		filepath.Join("..", "repository", "review_delegation_repository.go"),
		filepath.Join("..", "repository", "review_decision_repository.go"),
		filepath.Join("..", "repository", "review_audit_repository.go"),
		filepath.Join("..", "repository", "review_credit_repository.go"),
	}
	for _, file := range files {
		raw, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		source := strings.ToLower(string(raw))
		for _, forbidden := range []string{
			"net/http",
			"internal/handlers",
			"backend/cmd/server",
			"frontend",
			"shared/contracts",
			"review_" + "assignments",
			"assigned_" + "to",
			"claimed_" + "by",
			"reserved_" + "until",
			"listopen",
			"cleanup",
			"retention",
			"upload",
			"badge",
			"ranking",
			"insert into " + "point_ledger_entries",
			"points_" + "ledger",
			"member_" + "points",
		} {
			if strings.Contains(source, forbidden) {
				t.Errorf("%s contains forbidden Phase-107 coupling %q", file, forbidden)
			}
		}
	}

	commandType := reflect.TypeOf(ReviewDecisionCommand{})
	allowedFields := map[string]bool{
		"Actor":              true,
		"Target":             true,
		"Decision":           true,
		"RejectionCategory":  true,
		"RejectReason":       true,
		"SelfReviewOverride": true,
		"OverrideReason":     true,
	}
	if commandType.NumField() != len(allowedFields) {
		t.Fatalf("ReviewDecisionCommand fields=%d want=%d", commandType.NumField(), len(allowedFields))
	}
	for index := range commandType.NumField() {
		field := commandType.Field(index)
		if !allowedFields[field.Name] {
			t.Errorf("ReviewDecisionCommand exposes caller-authoritative field %q", field.Name)
		}
	}
}
