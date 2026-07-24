package repository

import (
	"os"
	"strings"
	"testing"
)

func TestEpisodeVersionCreateCrewHookOrdering(t *testing.T) {
	sourceBytes, err := os.ReadFile("episode_version_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	syncIndex := strings.Index(source, "syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID")
	seedIndex := strings.Index(source, "seedCreatedReleaseCrews(ctx, tx, r.crewSeeder, releaseVersionID)")
	commitIndex := strings.Index(source, "tx.Commit(ctx)")
	if syncIndex < 0 || seedIndex < 0 || seedIndex <= syncIndex {
		t.Fatalf("manual crew hook must run after canonical group sync: sync=%d seed=%d", syncIndex, seedIndex)
	}
	if commitIndex < 0 || seedIndex >= commitIndex {
		t.Fatalf("manual crew hook must remain inside the create transaction: seed=%d commit=%d", seedIndex, commitIndex)
	}
}

func TestReleaseCreationRepositoriesExposeSameCrewHook(t *testing.T) {
	for _, file := range []string{"episode_import_repository.go", "episode_version_repository.go"} {
		sourceBytes, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		source := string(sourceBytes)
		if !strings.Contains(source, "crewSeeder ReleaseCreationCrewSeeder") {
			t.Fatalf("%s does not store the shared release-creation crew hook", file)
		}
		if !strings.Contains(source, "crewSeeders ...ReleaseCreationCrewSeeder") {
			t.Fatalf("%s does not expose the optional constructor injection seam", file)
		}
	}
}
