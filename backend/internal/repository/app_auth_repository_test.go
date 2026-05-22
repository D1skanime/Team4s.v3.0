package repository

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestResolvedStatusForNewAppUserDefaultsToActive(t *testing.T) {
	if got := resolvedStatusForNewAppUser(); got != models.AppUserStatusActive {
		t.Fatalf("expected new app user status %q, got %q", models.AppUserStatusActive, got)
	}
}

func TestResolvedStatusForExistingAppUserPromotesPendingToActive(t *testing.T) {
	if got := resolvedStatusForExistingAppUser(models.AppUserStatusPending); got != models.AppUserStatusActive {
		t.Fatalf("expected pending user to promote to %q, got %q", models.AppUserStatusActive, got)
	}
}

func TestResolvedStatusForExistingAppUserKeepsDisabledUsersDisabled(t *testing.T) {
	if got := resolvedStatusForExistingAppUser(models.AppUserStatusDisabled); got != models.AppUserStatusDisabled {
		t.Fatalf("expected disabled user to remain %q, got %q", models.AppUserStatusDisabled, got)
	}
}
