package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

func TestEpisodeImportReleaseCreationCrewHookOrdering(t *testing.T) {
	sourceBytes, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	groupIndex := strings.Index(source, "upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media, learned)")
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

// TestEpisodeImportReleaseTitleNeverWritesAFilename is 164-08's GAP-02 Test 3: a
// newly-imported release's title must always be nil (release_versions.title stays
// NULL), regardless of the media candidate's FileName/Path content -- the default
// display name is computed on read (public_release_name.go), never stored. This
// executes the real function, not a source-string assertion (CLAUDE.md Teststil).
func TestEpisodeImportReleaseTitleNeverWritesAFilename(t *testing.T) {
	mapping := models.EpisodeImportMappingRow{TargetEpisodeNumbers: []int32{7}}
	for _, media := range []models.EpisodeImportMediaCandidate{
		{FileName: "Naruto.S01E07-AnimeOwnage.avi"},
		{FileName: "", Path: "/imports/naruto/Naruto.S01E07-AnimeOwnage.avi"},
		{FileName: "", Path: ""},
	} {
		title := episodeImportReleaseTitle(mapping, media)
		require.Nil(t, title, "episodeImportReleaseTitle must always return nil, regardless of FileName/Path")
	}
}
