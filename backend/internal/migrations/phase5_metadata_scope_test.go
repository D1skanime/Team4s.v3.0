package migrations

import (
	"strings"
	"testing"
)

func TestPhase5ReferenceMigration_GenresOnly(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0019_add_reference_data_tables.up.sql"))

	required := []string{
		"create table if not exists genres",
		"constraint uq_genre_name unique (name)",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0019 to contain %q", fragment)
		}
	}

	forbidden := []string{
		"create table if not exists studios",
		"create table if not exists persons",
		"create table if not exists contributor_roles",
	}
	for _, fragment := range forbidden {
		if strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0019 to exclude %q", fragment)
		}
	}
}

func TestPhase5JunctionMigration_AnimeGenresOnly(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0022_add_junction_tables.up.sql"))

	required := []string{
		"create table if not exists anime_genres",
		"references genres(id) on delete cascade",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0022 to contain %q", fragment)
		}
	}

	forbidden := []string{
		"create table if not exists anime_studios",
		"create table if not exists anime_persons",
		"create table if not exists release_roles",
	}
	for _, fragment := range forbidden {
		if strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0022 to exclude %q", fragment)
		}
	}
}
