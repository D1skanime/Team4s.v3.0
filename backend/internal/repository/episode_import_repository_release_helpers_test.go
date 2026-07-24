package repository

import (
	"os"
	"strings"
	"testing"
)

func TestEpisodeImportReleaseCreationCrewHookOrdering(t *testing.T) {
	sourceBytes, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	groupIndex := strings.Index(source, "upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media)")
	seedIndex := strings.Index(source, "seedCreatedReleaseCrews(ctx, tx, crewSeeder, releaseVersionID)")
	if groupIndex < 0 || seedIndex < 0 || seedIndex <= groupIndex {
		t.Fatalf("crew hook must run after canonical release-version group ownership: group=%d seed=%d", groupIndex, seedIndex)
	}
	if !strings.Contains(source, "if created && crewSeeder != nil") {
		t.Fatal("import crew hook must only seed newly created release graphs")
	}
}

func TestReleaseCreationCrewHookUsesCanonicalGroups(t *testing.T) {
	sourceBytes, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	for _, expected := range []string{
		"type ReleaseCreationCrewSeeder interface",
		"SeedCreatedReleaseInTx(context.Context, pgx.Tx, int64, int64) error",
		"SELECT fansub_group_id",
		"FROM release_version_groups",
		"WHERE release_version_id = $1",
		"crewSeeder.SeedCreatedReleaseInTx(ctx, tx, releaseVersionID, fansubGroupID)",
	} {
		if !strings.Contains(source, expected) {
			t.Fatalf("missing canonical crew-hook contract fragment %q", expected)
		}
	}
}
