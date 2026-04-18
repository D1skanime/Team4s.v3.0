package repository

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestEpisodeImportApply_CreatesCoverageJoinRowsForMultiEpisodeMedia(t *testing.T) {
	t.Parallel()

	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 9},
			{EpisodeNumber: 10},
		},
		Mappings: []models.EpisodeImportMappingRow{{
			MediaItemID:          "jellyfin-naruto-009-010",
			TargetEpisodeNumbers: []int32{9, 10},
			Status:               models.EpisodeImportMappingStatusConfirmed,
		}},
	}

	t.Fatalf("not implemented: apply one media item as one episode_versions row with compatibility episode_number=9 and coverage rows for %v", input.Mappings[0].TargetEpisodeNumbers)
}

func TestEpisodeImportApply_PreservesExistingManualEpisodeTitle(t *testing.T) {
	t.Parallel()

	existingTitle := "Manual curated title"
	incomingTitle := "AniSearch imported title"
	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{
			EpisodeNumber: 9,
			Title:         &incomingTitle,
			ExistingTitle: &existingTitle,
		}},
	}

	t.Fatalf("not implemented: apply must preserve existing manual title %q when importing %q for anime %d", existingTitle, incomingTitle, input.AnimeID)
}
