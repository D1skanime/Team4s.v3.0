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
