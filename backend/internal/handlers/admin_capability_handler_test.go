package handlers

import (
	"testing"
)

// Wave-0 RED-Tests für den Capability-Handler (Plan 87-01).
// Diese Tests schlagen mit "not implemented" fehl — das ist das erwartete RED-Signal.
// Plan 87-02 ersetzt die t.Fatalf-Stubs durch echte Handler-Tests.

// TestGrantCapabilityRequiresPlatformAdmin prüft, dass PUT /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
// einen nicht-platform-admin Benutzer mit 403 ablehnt.
func TestGrantCapabilityRequiresPlatformAdmin(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}

// TestRevokeCapabilityLastActionGuard prüft, dass DELETE /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
// den Last-Action-Guard auslöst (HTTP 409) wenn die letzte Capability einer Rolle entzogen werden würde.
func TestRevokeCapabilityLastActionGuard(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}

// TestCapabilityAuditOnGrant prüft, dass nach einem erfolgreichen Grant-Aufruf
// ein Audit-Log-Eintrag erzeugt wurde.
func TestCapabilityAuditOnGrant(t *testing.T) {
	t.Fatalf("not implemented — Plan 87-02")
}
