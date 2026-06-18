package permissions

import (
	"testing"
)

// TestIsStandaloneAction prüft, ob IsStandaloneAction korrekt zwischen Standalone-
// und normalen Actions unterscheidet.
func TestIsStandaloneAction(t *testing.T) {
	// ActionFansubGroupInvitationsAccept ist die einzige standalone-Action.
	if !IsStandaloneAction(ActionFansubGroupInvitationsAccept) {
		t.Errorf("IsStandaloneAction(ActionFansubGroupInvitationsAccept) = false, erwartet true")
	}

	// ActionReleaseView hat einen role_capabilities-Eintrag — keine standalone-Action.
	if IsStandaloneAction(ActionReleaseView) {
		t.Errorf("IsStandaloneAction(ActionReleaseView) = true, erwartet false")
	}
}
