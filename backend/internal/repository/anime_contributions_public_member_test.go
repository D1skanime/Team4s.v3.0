package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPublicContributionMemberSlugProjectionUsesStoredIdentity(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	start := strings.Index(content, "func (r *AnimeContributionsRepository) GetPublicAnimeContributions")
	end := strings.Index(content, "func (r *AnimeContributionsRepository) GetPublicMemberContributionsByID")
	if start < 0 || end < 0 || end <= start {
		t.Fatal("outbound contribution projection section not found")
	}

	outbound := strings.ToLower(content[start:end])
	const storedSlugProjection = "case when m.profile_visibility = 'public' then m.public_slug else null end"
	if count := strings.Count(outbound, storedSlugProjection); count != 2 {
		t.Fatalf("outbound contribution projections contain %d stored public_slug selections, want 2", count)
	}
	if strings.Contains(outbound, "fmt.sprintf(memberslugexpr") {
		t.Fatal("outbound contribution projections still use memberSlugExpr")
	}
	if strings.Contains(outbound, "regexp_replace") {
		t.Fatal("outbound contribution projections still derive member slugs from nickname")
	}
	if strings.Contains(outbound, "coalesce(m.public_slug") {
		t.Fatal("outbound contribution projections must not fall back from public_slug")
	}
	if count := strings.Count(outbound, "m.profile_visibility, m.public_slug"); count != 1 {
		t.Fatalf("outbound contribution projections contain %d visibility/slug grouping clauses, want 1", count)
	}
}

func TestPublicMemberContributionsUsesResolvedMemberID(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	required := "func (r *animecontributionsrepository) getpublicmembercontributionsbyid(ctx context.context, memberid int64)"
	if !strings.Contains(normalized, required) {
		t.Fatalf("resolved-ID contribution loader signature missing: %q", required)
	}
	for _, forbidden := range []string{
		"getpublicmembercontributions(ctx",
		"regexp_replace",
		"id::text",
		"resolve slug",
		"pgx.errnorows",
	} {
		if strings.Contains(normalized, forbidden) {
			t.Fatalf("contribution loader contains local member resolution: %q", forbidden)
		}
	}
}

func TestMemberSlugInvariant(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve repository test path")
	}
	entries, err := os.ReadDir(filepath.Dir(file))
	if err != nil {
		t.Fatalf("read repository directory: %v", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		content := readRepositorySource(t, entry.Name())
		for _, forbidden := range []string{"memberSlugExpr", "deriveMemberSlug(", "normalizeMemberProfileSlug("} {
			if strings.Contains(content, forbidden) {
				t.Fatalf("%s contains forbidden legacy slug helper %q", entry.Name(), forbidden)
			}
		}
	}
}

// TestPublicMemberContributionsGroupHistoryBranch: Source-Fragment-Test gegen
// anime_contributions_public_repository.go. Stellt sicher, dass GetPublicMemberContributions
// den 3. UNION-Branch (aktuelle App-Gruppenrollen, GAP-3/D-06) und die notes-Projektion (GAP-2/D-07)
// enthält. Die repository-Test-Suite hat keinen echten DB-Harness (siehe runtime_authority_test.go /
// member_claims_memorial_guard_test.go), daher Fragment-Stil — konsistent zum bestehenden Muster.
// Der Live-DB-Beleg (Member 3 / Ballelboy -> genau ein group_history-Eintrag) erfolgt in Plan 74-11.
func TestPublicMemberContributionsGroupHistoryBranch(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	// Pflicht-Fragmente: 3. Branch-Quelltabellen, group_history-Kontext, label_de-Fallback,
	// notes aus anime_contributions.note und member->app_user-Auflösung.
	requiredFragments := []string{
		"fansub_group_members",      // 3. Branch-Quelltabelle (aktuelle App-Gruppe)
		"fansub_group_member_roles", // role-Quelle des 3. Branch
		"group_history",             // gemeinsamer Kontext-Wert
		"coalesce(rd.label_de",      // role-Label-Fallback (fansub_lead fehlt in role_definitions)
		"ac.note as notes",          // notes-Projektion im anime_contribution-Branch
		"resolved_user",             // member->app_user-Auflösungs-CTE
		"member_claims",             // verifizierter-claim-Pfad der Auflösung
		"legacy_user_id",            // members.user_id->app_users-Fallback der Auflösung
		"not exists",                // Duplikat-Schutz gegen hist-Rollen
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("anime_contributions_public_repository.go fehlt erwartetes Fragment %q — GAP-3 App-Gruppenrollen-Branch / notes-Projektion noch nicht implementiert", fragment)
		}
	}
}

// TestPublicMemberContributionsNotesField: stellt sicher, dass PublicMemberRoleEntry das
// notes-Feld trägt (Lock-K-Datenquelle für den Inline-Expand, GAP-2/D-07) und der Scan-Loop es liest.
func TestPublicMemberContributionsNotesField(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, `notes           *string`) {
		t.Fatalf("PublicMemberRoleEntry fehlt das Feld Notes *string — notes-Detaildaten (GAP-2) nicht implementiert")
	}
	if !strings.Contains(normalized, `json:"notes"`) {
		t.Fatalf("PublicMemberRoleEntry.Notes fehlt der json-Tag \"notes\" — Lock-K-Contract nicht erfüllt")
	}
	if !strings.Contains(content, "&e.Notes") {
		t.Fatalf("Scan-Loop liest &e.Notes nicht — notes-Spalte wird nicht eingelesen")
	}
}
