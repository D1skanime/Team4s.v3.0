package repository

import (
	"os"
	"strings"
	"testing"
)

// TestScanEpisodeVersion_ReturnsGroupsList prüft per Source-Scan,
// dass der Read-Helper FansubGroups (Plural, []FansubGroupSummary) im Scan-Pfad
// verwendet und nicht mehr das singuläre FansubGroup-Feld schreibt (P81-SC2).
// Schlägt RED fehl weil der aktuelle Code noch "FansubGroup" (Singular) nutzt (Plan 04).
func TestScanEpisodeVersion_ReturnsGroupsList(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_version_repository_read_helpers.go")
	if err != nil {
		t.Fatalf("read read helper source: %v", err)
	}
	source := string(content)

	if !strings.Contains(source, "FansubGroups") {
		t.Fatal("expected episode_version_repository_read_helpers.go to reference FansubGroups (Plural) für json_agg-Aggregation")
	}
}

func TestScanEpisodeVersion_ReturnsCRC32(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_version_repository_read_helpers.go")
	if err != nil {
		t.Fatalf("read read helper source: %v", err)
	}
	source := string(content)

	if !strings.Contains(source, "rv.crc32") {
		t.Fatal("expected release variant read query to select rv.crc32")
	}
	if !strings.Contains(source, "&item.CRC32") {
		t.Fatal("expected release variant scanner to hydrate EpisodeVersion.CRC32")
	}
}

func TestListReleaseVariants_SegmentAggregationDoesNotSplitByGroupRow(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_version_repository_read_helpers.go")
	if err != nil {
		t.Fatalf("read read helper source: %v", err)
	}
	source := string(content)

	if strings.Contains(source, "COALESCE(ts.fansub_group_id, 0) = COALESCE(rvg.fansub_group_id, 0)") {
		t.Fatal("segment aggregation must not depend on the current release_version_groups row")
	}
	if !strings.Contains(source, "SELECT rvg_segment.fansub_group_id") {
		t.Fatal("segment aggregation should scope through all groups connected to the release version")
	}
}
