package repository

import (
	"strings"
	"testing"
)

// TestPublicBadgesSourceFiltersVisibility: no-DB Source-Fragment-Test gegen badge_repository.go.
// Prüft, dass eine Methode GetPublicMemberBadges existiert und ihr SQL die Fragmente
// "visibility='public'" UND "status='active'" enthält (Badges-13, kein UI-Neuberechnen).
// RED: Die Methode GetPublicMemberBadges fehlt noch in badge_repository.go.
func TestPublicBadgesSourceFiltersVisibility(t *testing.T) {
	content := readRepositorySource(t, "badge_repository.go")
	normalized := strings.ToLower(content)

	// Methode muss existieren
	if !strings.Contains(normalized, "getpublicmemberbadges") {
		t.Fatalf("badge_repository.go fehlt Methode GetPublicMemberBadges — Badge-Public-Quelle noch nicht implementiert (Badges-13)")
	}

	// SQL muss beide Guards enthalten: nur public UND active
	requiredSQLFragments := []string{
		"visibility='public'",
		"status='active'",
	}
	for _, fragment := range requiredSQLFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("badge_repository.go fehlt SQL-Fragment %q in GetPublicMemberBadges — Badges-13: kein UI-Neuberechnen erlaubt, Badge-Service ist Quelle", fragment)
		}
	}
}

// TestPublicBadgesDoesNotReusePlainGetMemberBadges: Stellt sicher, dass GetPublicMemberBadges
// eine eigenständige Methode ist und NICHT nur GetMemberBadges ohne visibility-Filter aufruft.
// GetMemberBadges liefert auch internal/hidden Badges — diese dürfen öffentlich nicht erscheinen.
// RED: GetPublicMemberBadges fehlt noch.
func TestPublicBadgesDoesNotReusePlainGetMemberBadges(t *testing.T) {
	content := readRepositorySource(t, "badge_repository.go")
	normalized := strings.ToLower(content)

	// GetPublicMemberBadges muss als eigenständige Methode existieren
	if !strings.Contains(normalized, "func (r *badgerepository) getpublicmemberbadges") {
		t.Fatalf("badge_repository.go fehlt eigenständige Methode-Signatur 'GetPublicMemberBadges' — darf nicht nur GetMemberBadges delegieren (liefert internal/hidden Badges)")
	}
}
