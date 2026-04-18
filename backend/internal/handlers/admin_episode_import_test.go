package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestPreviewEpisodeImport_SeparatesCanonicalEpisodesAndMediaCandidates(t *testing.T) {
	t.Parallel()

	preview := models.EpisodeImportPreviewResult{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{
			EpisodeNumber: 54,
		}},
		MediaCandidates: []models.EpisodeImportMediaCandidate{{
			MediaItemID: "jellyfin-bleach-s03e11",
			FileName:    "Bleach S03E11.mkv",
		}},
	}

	t.Fatalf("not implemented: preview handler must keep %d canonical rows separate from %d Jellyfin media candidates", len(preview.CanonicalEpisodes), len(preview.MediaCandidates))
}

func TestApplyEpisodeImport_RejectsUnconfirmedConflicts(t *testing.T) {
	t.Parallel()

	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		Mappings: []models.EpisodeImportMappingRow{{
			MediaItemID:          "jellyfin-conflict",
			TargetEpisodeNumbers: []int32{9},
			Status:               models.EpisodeImportMappingStatusConflict,
		}},
	}

	t.Fatalf("not implemented: apply handler must reject unresolved mapping status %q before mutating anime %d", input.Mappings[0].Status, input.AnimeID)
}
