package repository

import (
	"context"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestMapAdminRelationLabelToDB_AllowsOnlyPhase5Labels(t *testing.T) {
	tests := map[string]string{
		"Hauptgeschichte": "full-story",
		"Nebengeschichte": "side-story",
		"Fortsetzung":     "sequel",
		"Zusammenfassung": "summary",
	}

	for label, want := range tests {
		got, ok := mapAdminRelationLabelToDB(label)
		if !ok {
			t.Fatalf("expected label %q to be allowed", label)
		}
		if got != want {
			t.Fatalf("expected %q -> %q, got %q", label, want, got)
		}
	}

	if _, ok := mapAdminRelationLabelToDB("Prequel"); ok {
		t.Fatal("expected unsupported label to be rejected")
	}
	if _, ok := mapAdminRelationLabelToDB("related"); ok {
		t.Fatal("expected legacy broad label to be rejected")
	}
}

func TestMapDBRelationTypeToAdmin_OnlyExposesNarrowV1Labels(t *testing.T) {
	tests := map[string]string{
		"full-story": "Hauptgeschichte",
		"side-story": "Nebengeschichte",
		"sequel":     "Fortsetzung",
		"summary":    "Zusammenfassung",
	}

	for raw, want := range tests {
		got, ok := mapDBRelationTypeToAdmin(raw)
		if !ok {
			t.Fatalf("expected relation type %q to map", raw)
		}
		if got != want {
			t.Fatalf("expected %q -> %q, got %q", raw, want, got)
		}
	}

	if _, ok := mapDBRelationTypeToAdmin("prequel"); ok {
		t.Fatal("expected prequel to stay hidden in Phase 5")
	}
}

func TestSearchAdminAnimeRelationTargetsQuery_UsesCurrentAnimeExclusionAndNormalizedTitles(t *testing.T) {
	query := `
		SELECT
			a.id,
			` + primaryNormalizedTitleSQL("a.id", "a.title") + `,
			a.type,
			a.status,
			a.year,
			a.cover_image
		FROM anime a
		WHERE a.id <> $1
		  AND a.status <> 'disabled'
		  AND (
			` + primaryNormalizedTitleSQL("a.id", "a.title") + ` ILIKE $2
			OR a.title_de ILIKE $2
			OR a.title_en ILIKE $2
			OR EXISTS (
				SELECT 1
				FROM anime_titles at
				WHERE at.anime_id = a.id
				  AND at.title ILIKE $2
			)
		  )
	`

	required := []string{
		"a.id <> $1",
		"a.status <> 'disabled'",
		"FROM anime_titles at",
		"at.anime_id = a.id",
	}

	for _, fragment := range required {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q", fragment)
		}
	}
}

func TestIsRelationConflict_DetectsUniqueAndCheckViolationCodes(t *testing.T) {
	if !isRelationConflict(&pgconn.PgError{Code: "23505"}) {
		t.Fatal("expected unique violation to map to relation conflict")
	}
	if !isRelationConflict(&pgconn.PgError{Code: "23514"}) {
		t.Fatal("expected check violation to map to relation conflict")
	}
	if isRelationConflict(&pgconn.PgError{Code: "42703"}) {
		t.Fatal("expected unrelated pg error code not to map to relation conflict")
	}
}

func TestApplyAdminAnimeEnrichmentRelations_DoesNotDuplicateExistingRows(t *testing.T) {
	t.Parallel()

	repo := &AdminContentRepository{}
	err := repo.ApplyAdminAnimeEnrichmentRelations(context.Background(), 7, []models.AdminAnimeRelation{
		{TargetAnimeID: 12, RelationLabel: "Fortsetzung"},
		{TargetAnimeID: 12, RelationLabel: "Fortsetzung"},
	})
	if err != nil {
		t.Fatalf("expected duplicate AniSearch relation apply to no-op, got %v", err)
	}
}
