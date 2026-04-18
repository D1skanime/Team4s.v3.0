package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestPreviewEpisodeImport_SeparatesCanonicalEpisodesAndMediaCandidates(t *testing.T) {
	t.Parallel()

	episodeNumber := int32(11)
	preview := buildEpisodeImportPreview(
		42,
		"Bleach",
		episodeImportStringPtr("1078"),
		episodeImportStringPtr("series-1"),
		episodeImportStringPtr("/media/Bleach"),
		[]models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 54}},
		[]models.EpisodeImportMediaCandidate{{
			MediaItemID:           "jellyfin-bleach-s03e11",
			FileName:              "Bleach S03E11.mkv",
			JellyfinEpisodeNumber: &episodeNumber,
		}},
		43,
	)

	if len(preview.CanonicalEpisodes) != 1 || len(preview.MediaCandidates) != 1 {
		t.Fatalf("expected separate canonical/media arrays, got %+v", preview)
	}
	if preview.CanonicalEpisodes[0].EpisodeNumber != 54 {
		t.Fatalf("expected AniSearch canonical episode 54, got %d", preview.CanonicalEpisodes[0].EpisodeNumber)
	}
	if got := preview.Mappings[0].SuggestedEpisodeNumbers; len(got) != 1 || got[0] != 54 {
		t.Fatalf("expected offset suggestion 54 from Jellyfin evidence, got %v", got)
	}
}

func TestApplyEpisodeImport_RejectsUnconfirmedConflicts(t *testing.T) {
	t.Parallel()

	_, err := validateEpisodeImportApplyRequest(42, adminEpisodeImportApplyRequest{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 9}},
		Mappings: []models.EpisodeImportMappingRow{{
			MediaItemID:          "jellyfin-conflict",
			TargetEpisodeNumbers: []int32{9},
			Status:               models.EpisodeImportMappingStatusConflict,
		}},
	})

	if err == nil {
		t.Fatal("expected unresolved conflict to be rejected before mutation")
	}
}

func episodeImportStringPtr(value string) *string {
	return &value
}
