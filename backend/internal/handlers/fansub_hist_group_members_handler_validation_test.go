package handlers

import (
	"strings"
	"testing"
)

func TestCreateHistoricalMemberReturnsValidationErrorForReservedProfileSlug(t *testing.T) {
	source := readSource(t, "fansub_hist_group_members_handler.go")

	for _, fragment := range []string{
		"errors.Is(err, repository.ErrValidation)",
		"http.StatusUnprocessableEntity",
		"Der Anzeigename erzeugt eine reservierte Profil-URL.",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("historical member create must expose reserved profile slugs as validation errors: missing %q", fragment)
		}
	}
}
