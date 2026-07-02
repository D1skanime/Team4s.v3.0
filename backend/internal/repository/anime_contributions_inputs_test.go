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

// TestContributionUpsert_UsesExplicitContextLock verifiziert, dass der adminseitige
// Upsert nach Migration 0111 keinen Row-Unique/ON-CONFLICT mehr voraussetzt. Der
// kanonische member_id-Anker und release_version_id-Kontext werden per Advisory-Lock
// und IS-NOT-DISTINCT-FROM-Lookup serialisiert.
func TestContributionUpsert_UsesExplicitContextLock(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_upsert_repository.go")
	normalized := strings.ToLower(content)

	forbidden := "on conflict (fansub_group_id, anime_id, member_id, release_version_id)"
	if strings.Contains(normalized, forbidden) {
		t.Fatalf("admin-upsert darf kein entferntes Row-Unique-ON-CONFLICT-Target mehr verwenden")
	}
	requiredFragments := []string{
		"pg_advisory_xact_lock",
		"anime-contribution-member",
		"member_id = $3",
		"release_version_id is not distinct from $4",
		"status <> 'proposed'",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("erwartetes Fragment %q im expliziten Contribution-Upsert", fragment)
		}
	}
	if !strings.Contains(normalized, "release_version_id") {
		t.Fatalf("Upsert muss release_version_id in die INSERT-Spaltenliste aufnehmen")
	}
}

// TestDefaultCrewApply_DoesNotUseRemovedContributionUnique verifiziert, dass der
// Default-Crew-Apply-Pfad ebenfalls nicht mehr vom entfernten Row-Unique abhaengt.
func TestDefaultCrewApply_DoesNotUseRemovedContributionUnique(t *testing.T) {
	content := readReleaseLookupSource(t, "fansub_default_crew_repository.go")
	normalized := strings.ToLower(content)

	if strings.Contains(normalized, "on conflict (fansub_group_id, anime_id, member_id, release_version_id)") {
		t.Fatalf("Default-Crew-Apply darf kein entferntes anime_contributions-ON-CONFLICT-Target verwenden")
	}
	requiredFragments := []string{
		"where not exists",
		"release_version_id is null",
		"member_id = $3",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("erwartetes Fragment %q im Default-Crew-Apply", fragment)
		}
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

// TestContributionRead_NullSafeFansubGroupMemberID verifiziert, dass alte
// member_id-verankerte Beiträge ohne hist_fansub_group_members-Anker nicht beim Scan crashen.
func TestContributionRead_NullSafeFansubGroupMemberID(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "coalesce(ac.fansub_group_member_id, 0) as fansub_group_member_id") {
		t.Fatalf("animeContributionSelectCols muss nullable fansub_group_member_id null-sicher selektieren")
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
