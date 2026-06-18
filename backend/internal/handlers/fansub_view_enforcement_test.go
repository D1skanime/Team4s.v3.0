package handlers

import (
	"testing"
)

// Wave-0 RED-Tests für View-Capability-Enforcement (Plan 87-01).
// Diese Tests schlagen mit "not implemented" fehl — das ist das erwartete RED-Signal.
// Plan 87-02 implementiert die View-Enforcement-Logik an den drei Endpunkten
// und ersetzt die t.Fatalf-Stubs durch echte Enforcement-Tests.

// TestViewCapabilityEnforcementGroupMembers prüft, dass GET /api/v1/fansubs/:id/members
// einen Benutzer ohne ActionFansubGroupMembersView mit 403 ablehnt.
func TestViewCapabilityEnforcementGroupMembers(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}

// TestViewCapabilityEnforcementUnifiedMembers prüft, dass der Unified-Members-Endpunkt
// das ActionFansubGroupMembersView-Recht durchsetzt.
func TestViewCapabilityEnforcementUnifiedMembers(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}

// TestViewCapabilityEnforcementAnimeCoverage prüft, dass der Anime-Coverage-Endpunkt
// das zutreffende View-Recht durchsetzt.
func TestViewCapabilityEnforcementAnimeCoverage(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}
