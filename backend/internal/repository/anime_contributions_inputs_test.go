package repository

import (
	"strings"
	"testing"
)

// TestContributionInputs_ReleaseVersionFieldsExist verifiziert, dass die ausgelagerten
// Input-/Patch-/Row-Structs das optionale release_version_id tragen (D-10 Roundtrip).
func TestContributionInputs_ReleaseVersionFieldsExist(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_inputs.go")
	// Whitespace zwischen Feldname und Typ kollabieren, damit der Test
	// unabhaengig von gofmt-Tab-Ausrichtung greift.
	collapsed := strings.Join(strings.Fields(strings.ToLower(content)), " ")

	requiredFragments := []string{
		"type animecontributioninput struct",
		"type animecontributionpatchinput struct",
		"type animecontributionrow struct",
		"releaseversionid *int64",
		"releaseversionid **int64",
		`json:"release_version_id"`,
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(collapsed, frag) {
			t.Fatalf("erwartetes Fragment %q in anime_contributions_inputs.go", frag)
		}
	}
}

// TestContributionUpsert_FourColumnConflict verifiziert das vierspaltige ON CONFLICT-Target
// inkl. release_version_id und kanonischem member_id-Anker (Pitfall 1, T-67-02-DUP).
func TestContributionUpsert_FourColumnConflict(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_upsert_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "on conflict (fansub_group_id, anime_id, member_id, release_version_id)") {
		t.Fatalf("erwartetes vierspaltiges ON CONFLICT-Target im Upsert")
	}
	if !strings.Contains(normalized, "release_version_id") {
		t.Fatalf("Upsert muss release_version_id in die INSERT-Spaltenliste aufnehmen")
	}
}

// TestContributionRead_SelectsReleaseVersion verifiziert, dass GetByID/List
// release_version_id selektieren (B2 Read-Roundtrip).
func TestContributionRead_SelectsReleaseVersion(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "ac.release_version_id") {
		t.Fatalf("animeContributionSelectCols muss ac.release_version_id selektieren")
	}
}

// TestContributionProposal_InsertsReleaseVersion verifiziert, dass CreateProposal
// release_version_id in den INSERT aufnimmt (D-08, Pitfall 5).
func TestContributionProposal_InsertsReleaseVersion(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_proposal_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "release_version_id") {
		t.Fatalf("CreateProposal muss release_version_id in den INSERT aufnehmen")
	}
}
