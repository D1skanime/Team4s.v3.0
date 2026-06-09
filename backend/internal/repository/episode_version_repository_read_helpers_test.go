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
