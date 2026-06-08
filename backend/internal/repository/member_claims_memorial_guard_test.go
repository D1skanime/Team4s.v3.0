package repository

import (
	"strings"
	"testing"
)

// TestClaimSubmitBlockedForMemorialProfile: Source-Fragment-Test gegen member_claims_repository.go.
// Prüft, dass SubmitClaim die profile_status-Abfrage, den Code memorial_not_claimable und HTTP 409 enthält.
// RED: Diese Fragmente fehlen noch in member_claims_repository.go.
func TestClaimSubmitBlockedForMemorialProfile(t *testing.T) {
	content := readRepositorySource(t, "member_claims_repository.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"profile_status",
		"memorial_not_claimable",
		"409",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("member_claims_repository.go fehlt erwartetes Fragment %q — Guard gegen memorial-Profile noch nicht implementiert", fragment)
		}
	}
}

// TestClaimAcceptInvitationBlockedForMemorialProfile: Source-Fragment-Test gegen member_claim_invitations_repository.go.
// Prüft, dass AcceptInvitation die profile_status-Abfrage, den Code memorial_not_claimable und HTTP 409 enthält.
// RED: Diese Fragmente fehlen noch in member_claim_invitations_repository.go.
func TestClaimAcceptInvitationBlockedForMemorialProfile(t *testing.T) {
	content := readRepositorySource(t, "member_claim_invitations_repository.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"profile_status",
		"memorial_not_claimable",
		"409",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("member_claim_invitations_repository.go fehlt erwartetes Fragment %q — Guard gegen memorial-Profile noch nicht implementiert (Fallstrick 3: zweiter Claim-Pfad!)", fragment)
		}
	}
}

// TestClaimBlockWritesDeniedAudit: Source-Fragment-Assertion, dass BEIDE Claim-Pfade
// den denied-Audit-Action-Key "member_claim.memorial_blocked" UND den Outcome "denied" enthalten.
// Erzwingt für Plan 02 Task 2, dass das denied-Audit in beiden Repositories als String-Literal erscheint.
// RED: Diese Fragmente fehlen noch in den Repository-Dateien (D-15).
func TestClaimBlockWritesDeniedAudit(t *testing.T) {
	claimsContent := readRepositorySource(t, "member_claims_repository.go")
	claimsNormalized := strings.ToLower(claimsContent)

	invitationsContent := readRepositorySource(t, "member_claim_invitations_repository.go")
	invitationsNormalized := strings.ToLower(invitationsContent)

	deniedAuditFragments := []string{
		"member_claim.memorial_blocked",
		"denied",
	}

	// Prüfe member_claims_repository.go (SubmitClaim-Pfad)
	for _, fragment := range deniedAuditFragments {
		if !strings.Contains(claimsNormalized, fragment) {
			t.Fatalf("member_claims_repository.go fehlt denied-Audit-Fragment %q — D-15 Claim-Block-Audit nicht implementiert (SubmitClaim-Pfad)", fragment)
		}
	}

	// Prüfe member_claim_invitations_repository.go (AcceptInvitation-Pfad)
	for _, fragment := range deniedAuditFragments {
		if !strings.Contains(invitationsNormalized, fragment) {
			t.Fatalf("member_claim_invitations_repository.go fehlt denied-Audit-Fragment %q — D-15 Claim-Block-Audit nicht implementiert (AcceptInvitation-Pfad, Fallstrick 3)", fragment)
		}
	}
}

// TestClaimBlockDeniedAuditOutcomeColocated: Stellt sicher, dass der Outcome "denied"
// nicht nur irgendwo in der Datei, sondern direkt im memorial_blocked-Audit-Block
// beider Claim-Pfade gesetzt wird (D-15). Re-Audit nannte die Outcome-"denied"-Prüfung
// explizit; ein reines Datei-weites Vorkommen würde ein versehentlich auf "allowed"
// gesetztes Block-Outcome nicht erkennen. Diese Assertion bindet beide Literale
// (EventType + Outcome) an dieselbe Guard-Region.
func TestClaimBlockDeniedAuditOutcomeColocated(t *testing.T) {
	cases := []struct {
		filename string
		path     string
	}{
		{"member_claims_repository.go", "SubmitClaim"},
		{"member_claim_invitations_repository.go", "AcceptInvitation (zweiter Pfad)"},
	}

	for _, tc := range cases {
		content := readRepositorySource(t, tc.filename)

		// Letztes Vorkommen verwenden — das EventType-Literal taucht zuerst im
		// Erläuterungs-Kommentar und dann im eigentlichen Struct-Literal auf.
		idx := strings.LastIndex(content, `EventType:`)
		if idx < 0 || !strings.Contains(content, "member_claim.memorial_blocked") {
			t.Fatalf("%s: EventType \"member_claim.memorial_blocked\" fehlt — denied-Audit nicht implementiert (%s)", tc.filename, tc.path)
		}

		// Region ab dem Struct-Literal bis ~12 Zeilen weiter (der Audit-Block-Aufruf).
		region := content[idx:]
		if len(region) > 400 {
			region = region[:400]
		}
		if !strings.Contains(region, "member_claim.memorial_blocked") {
			t.Fatalf("%s: kein memorial_blocked-Audit-Struct-Literal gefunden (%s)", tc.filename, tc.path)
		}
		if !strings.Contains(region, `Outcome:        "denied"`) && !strings.Contains(region, `Outcome:    "denied"`) {
			t.Fatalf("%s: Outcome \"denied\" steht nicht im memorial_blocked-Audit-Block (%s) — D-15 verlangt Outcome 'denied' direkt am Block.\nRegion:\n%s", tc.filename, tc.path, region)
		}
	}
}
