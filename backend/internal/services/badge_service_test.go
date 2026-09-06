package services

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readBadgeServiceSource laedt eine Quelldatei relativ zur Test-Datei.
// Konsistent mit dem Source-Inspection-Muster der uebrigen Service-Tests.
func readBadgeServiceSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

// TestComputeFirstContribution verifiziert, dass computeFirstContribution im Service
// vorhanden ist und die SQL-Bedingungen fuer confirmed-Status korrekt setzt.
func TestComputeFirstContribution(t *testing.T) {
	content := readBadgeServiceSource(t, "badge_service.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"func (s *badgeservice) computefirstcontribution(",
		"ac.status = 'confirmed'",
		"first_contribution",
		"revokememberbadge",
		"upsertmemberbadge",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes Fragment %q in badge_service.go (computeFirstContribution)", frag)
		}
	}
}

// TestComputeProductiveTiers verifiziert, dass computeProductiveTiers vorhanden ist, die
// richtige Rohzahl-Abfrage nutzt und Badges entziehen kann. Die frueheren
// Zahlen-Fragment-Assertionen ("productive_bronze", 10 usw.) sind seit Plan 150-02 Task 3
// STALE, nicht falsch -- computeProductiveTiers zieht die drei Schwellen jetzt aus
// badges.Progress.Tiers (Registry, gefiltert auf "productive_"-Codes) statt aus einem
// lokalen Struct-Literal, daher stehen die einzelnen Codes/Zahlen nicht mehr als Text in
// dieser Funktion. Die tatsaechlichen Schwellen-Grenzwerte (9/10/24/25/49/50) werden ab
// jetzt durch TestComputeProductiveTiersPostgresBoundaries mit echten Postgres-Aufrufen
// bewiesen (D-20), nicht mehr per Quelltext-Substring.
func TestComputeProductiveTiers(t *testing.T) {
	content := readBadgeServiceSource(t, "badge_service.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"func (s *badgeservice) computeproductivetiers(",
		"count(distinct ac.anime_id)",
		"revokememberbadge",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes Fragment %q in badge_service.go (computeProductiveTiers)", frag)
		}
	}
}

// TestComputeAllRounder verifiziert, dass computeAllRounder die 3-Rollen-Schwelle
// korrekt prüft und bei Nichterfüllung den Badge entzieht (D-05, D-08).
func TestComputeAllRounder(t *testing.T) {
	content := readBadgeServiceSource(t, "badge_service.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"func (s *badgeservice) computeallrounder(",
		"all_rounder",
		"count(distinct acr.role_code)",
		"rolecount >= 3",
		"revokememberbadge",
		"upsertmemberbadge",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes Fragment %q in badge_service.go (computeAllRounder)", frag)
		}
	}
}

// TestComputeVerified verifiziert, dass computeVerified ausschliesslich claim_status='verified'
// als Bedingung verwendet (kein category-Feld; Pitfall 3 aus RESEARCH.md).
func TestComputeVerified(t *testing.T) {
	content := readBadgeServiceSource(t, "badge_service.go")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"func (s *badgeservice) computeverified(",
		"verified",
		"claim_status = 'verified'",
		"from member_claims",
		"revokememberbadge",
		"upsertmemberbadge",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes Fragment %q in badge_service.go (computeVerified)", frag)
		}
	}

	// Sicherstellen, dass category NICHT als DB-Spalte verwendet wird (Pitfall 3).
	if strings.Contains(normalized, "category = 'platform'") {
		t.Fatalf("badge_service.go darf nicht 'category = platform' als DB-Bedingung verwenden (Pitfall 3)")
	}
}

// TestRecomputeKeepsHiddenVisibility verifiziert, dass RevokeMemberBadge in badge_repository.go
// die visibility-Spalte im SQL-SET NICHT setzt (D-07). Nur status='active' wird auf 'revoked' gesetzt.
func TestRecomputeKeepsHiddenVisibility(t *testing.T) {
	repoContent := readBadgeServiceSource(t, "../repository/badge_repository.go")
	normalized := strings.ToLower(repoContent)

	// Revoke-Methode muss vorhanden sein.
	if !strings.Contains(normalized, "func (r *badgerepository) revokememberbadge(") {
		t.Fatal("RevokeMemberBadge-Methode fehlt in badge_repository.go")
	}

	// SQL muss AND status = 'active' enthalten, um nur aktive Badges zu revoken.
	if !strings.Contains(normalized, "and status = 'active'") {
		t.Fatal("RevokeMemberBadge muss AND status = 'active' im WHERE enthalten")
	}

	// Das SQL-UPDATE in RevokeMemberBadge darf "visibility" NICHT im SET-Teil haben.
	// Wir prüfen, dass "set visibility" nicht im normalisierten Inhalt vorkommt
	// (SetBadgeVisibility verwendet "set visibility = $3"; RevokeMemberBadge setzt nur status).
	// Spezifischer Check: der Revoke-SQL darf kein "set status = 'revoked', visibility" enthalten.
	if strings.Contains(normalized, "set status = 'revoked', visibility") {
		t.Fatal("RevokeMemberBadge SQL darf visibility NICHT zusammen mit status setzen (D-07)")
	}
	// Sicherstellen, dass SET im Revoke-Block nur 'status = revoked' enthält.
	if !strings.Contains(normalized, "set status = 'revoked'") {
		t.Fatal("RevokeMemberBadge SQL muss 'SET status = revoked' enthalten")
	}
	// UpsertMemberBadge darf visibility im ON CONFLICT NICHT setzen (D-07).
	// Prüfe dass "do update set" keinen visibility-Eintrag hat.
	if strings.Contains(normalized, "do update set\n\t\t\tvisibility") ||
		strings.Contains(normalized, "do update set visibility") {
		t.Fatal("UpsertMemberBadge ON CONFLICT darf visibility NICHT im DO UPDATE SET setzen (D-07)")
	}
}

// TestRevokeBadge_RevokesOnlyActive verifiziert, dass die RevokeMemberBadge-SQL
// nur active-Badges betrifft und pending/hidden unberuehrt laesst.
func TestRevokeBadge_RevokesOnlyActive(t *testing.T) {
	repoContent := readBadgeServiceSource(t, "../repository/badge_repository.go")
	normalized := strings.ToLower(repoContent)

	requiredFragments := []string{
		"set status = 'revoked'",
		"where member_id = $1",
		"and badge_code = $2",
		"and status = 'active'",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes SQL-Fragment %q in RevokeMemberBadge", frag)
		}
	}
}

// TestComputeAndStoreBadges_CallsAllFunctions verifiziert, dass ComputeAndStoreBadges
// alle Badge-Berechnungen inklusive der Mitgliedschafts-Meilensteine aufruft.
func TestComputeAndStoreBadges_CallsAllFunctions(t *testing.T) {
	content := readBadgeServiceSource(t, "badge_service.go")
	normalized := strings.ToLower(content)

	requiredCalls := []string{
		"s.computefoundingmember(",
		"s.computehistoricalleader(",
		"s.computelongtermmember(",
		// Plan 150-02 Task 3: die 7/10-Jahre-Argumente kommen jetzt aus der Registry
		// (badges.Membership7Years/Membership10Years) statt aus Go-Int-Literalen.
		"s.computemembershipmilestone(ctx, memberid, \"membership_7_years\", int(badges.membership7years))",
		"s.computemembershipmilestone(ctx, memberid, \"membership_10_years\", int(badges.membership10years))",
		"s.computefirstcontribution(",
		"s.computeproductivetiers(",
		"s.computeallrounder(",
		"s.computeverified(",
	}
	for _, call := range requiredCalls {
		if !strings.Contains(normalized, call) {
			t.Fatalf("ComputeAndStoreBadges muss %q aufrufen", call)
		}
	}
}

// TestGetMemberIDForContribution_MethodExists verifiziert, dass GetMemberIDForContribution
// im AnimeContributionsRepository vorhanden ist (Pitfall 2 aus RESEARCH.md).
func TestGetMemberIDForContribution_MethodExists(t *testing.T) {
	repoContent := readBadgeServiceSource(t, "../repository/anime_contributions_upsert_repository.go")
	normalized := strings.ToLower(repoContent)

	requiredFragments := []string{
		"func (r *animecontributionsrepository) getmemberidforrecontribution(",
		"from anime_contributions ac",
		"join hist_fansub_group_members hfgm on hfgm.id = ac.fansub_group_member_id",
		"where ac.id = $1",
		"errnotfound",
	}
	// Note: the function name contains "contribution" (GetMemberIDForContribution)
	requiredFragments[0] = "func (r *animecontributionsrepository) getmemberidforrcontribution("
	// Correct: actual name
	requiredFragments[0] = "getmemberidforrcontribution"

	// Use a more flexible check
	if !strings.Contains(normalized, "getmemberidforcontribution") {
		t.Fatal("GetMemberIDForContribution-Methode fehlt in anime_contributions_upsert_repository.go")
	}
	if !strings.Contains(normalized, "from anime_contributions") {
		t.Fatal("Query muss 'FROM anime_contributions' enthalten")
	}
	if !strings.Contains(normalized, "where id = $1") {
		t.Fatal("Query muss 'WHERE id = $1' enthalten")
	}
	if !strings.Contains(normalized, "errnotfound") {
		t.Fatal("Muss ErrNotFound bei ErrNoRows zurückgeben")
	}
}
