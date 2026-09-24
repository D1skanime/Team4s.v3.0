package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func skippedRow(mediaItemID string) models.EpisodeImportMappingRow {
	return models.EpisodeImportMappingRow{
		MediaItemID:             mediaItemID,
		TargetEpisodeNumbers:    []int32{},
		SuggestedEpisodeNumbers: []int32{},
		Status:                  models.EpisodeImportMappingStatusSkipped,
	}
}

func TestApplyEinteilerSuggestion_SingleCandidateGetsSuggested(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes:    []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		Mappings:             []models.EpisodeImportMappingRow{skippedRow("item-1")},
		UnmappedEpisodes:     []int32{1},
		UnmappedMediaItemIDs: []string{"item-1"},
	}

	got := applyEinteilerSuggestion(preview, "ova")

	if len(got.Mappings) != 1 {
		t.Fatalf("expected 1 mapping row, got %d", len(got.Mappings))
	}
	row := got.Mappings[0]
	if row.Status != models.EpisodeImportMappingStatusSuggested {
		t.Fatalf("expected status suggested, got %q", row.Status)
	}
	if len(row.TargetEpisodeNumbers) != 1 || row.TargetEpisodeNumbers[0] != 1 {
		t.Fatalf("expected target episode numbers [1], got %v", row.TargetEpisodeNumbers)
	}
	if len(row.SuggestedEpisodeNumbers) != 1 || row.SuggestedEpisodeNumbers[0] != 1 {
		t.Fatalf("expected suggested episode numbers [1], got %v", row.SuggestedEpisodeNumbers)
	}
	if row.SuggestionReason == nil || *row.SuggestionReason != "Einziger Kandidat für die einzige Episode" {
		t.Fatalf("expected suggestion reason, got %v", row.SuggestionReason)
	}
	if len(got.UnmappedMediaItemIDs) != 0 {
		t.Fatalf("expected media item id removed from UnmappedMediaItemIDs, got %v", got.UnmappedMediaItemIDs)
	}
	if len(got.UnmappedEpisodes) != 0 {
		t.Fatalf("expected episode 1 removed from UnmappedEpisodes, got %v", got.UnmappedEpisodes)
	}
}

func TestApplyEinteilerSuggestion_FilmType(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		Mappings:          []models.EpisodeImportMappingRow{skippedRow("item-1")},
	}

	got := applyEinteilerSuggestion(preview, "film")

	if got.Mappings[0].Status != models.EpisodeImportMappingStatusSuggested {
		t.Fatalf("expected film type to be treated as einteiler, got status %q", got.Mappings[0].Status)
	}
}

func TestApplyEinteilerSuggestion_TwoCandidatesLeftUnchanged(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		Mappings: []models.EpisodeImportMappingRow{
			skippedRow("item-1"),
			skippedRow("item-2"),
		},
	}

	got := applyEinteilerSuggestion(preview, "ova")

	for i, row := range got.Mappings {
		if row.Status != models.EpisodeImportMappingStatusSkipped {
			t.Fatalf("row %d: expected status to remain skipped, got %q", i, row.Status)
		}
		if row.SuggestionReason != nil {
			t.Fatalf("row %d: expected no suggestion reason, got %v", i, row.SuggestionReason)
		}
		if len(row.TargetEpisodeNumbers) != 0 {
			t.Fatalf("row %d: expected no target episode numbers, got %v", i, row.TargetEpisodeNumbers)
		}
	}
}

func TestApplyEinteilerSuggestion_MultiEpisodeAnimeLeftUnchanged(t *testing.T) {
	canonical := make([]models.EpisodeImportCanonicalEpisode, 12)
	for i := range canonical {
		canonical[i] = models.EpisodeImportCanonicalEpisode{EpisodeNumber: int32(i + 1)}
	}
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: canonical,
		Mappings:          []models.EpisodeImportMappingRow{skippedRow("item-1")},
	}

	got := applyEinteilerSuggestion(preview, "tv")

	if got.Mappings[0].Status != models.EpisodeImportMappingStatusSkipped {
		t.Fatalf("expected status to remain skipped for tv anime, got %q", got.Mappings[0].Status)
	}
}

func TestApplyEinteilerSuggestion_FilmWithMultipleCanonicalEpisodesLeftUnchanged(t *testing.T) {
	canonical := make([]models.EpisodeImportCanonicalEpisode, 2)
	for i := range canonical {
		canonical[i] = models.EpisodeImportCanonicalEpisode{EpisodeNumber: int32(i + 1)}
	}
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: canonical,
		Mappings:          []models.EpisodeImportMappingRow{skippedRow("item-1")},
	}

	got := applyEinteilerSuggestion(preview, "film")

	if got.Mappings[0].Status != models.EpisodeImportMappingStatusSkipped {
		t.Fatalf("expected status to remain skipped for a multi-episode film preview, got %q", got.Mappings[0].Status)
	}
}

func TestApplyEinteilerSuggestion_IsEinteilerSetForSingleEpisodeOVA(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
	}

	got := applyEinteilerSuggestion(preview, "ova")

	if !got.IsEinteiler {
		t.Fatalf("expected IsEinteiler true for a single-episode ova, got false")
	}
}

func TestApplyEinteilerSuggestion_IsEinteilerFalseForTV(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
	}

	got := applyEinteilerSuggestion(preview, "tv")

	if got.IsEinteiler {
		t.Fatalf("expected IsEinteiler false for tv, got true")
	}
}

func TestApplyEinteilerSuggestion_IsEinteilerTrueForFilmRegardlessOfEpisodeCount(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 1},
			{EpisodeNumber: 2},
		},
	}

	got := applyEinteilerSuggestion(preview, "film")

	if !got.IsEinteiler {
		t.Fatalf("expected IsEinteiler true for film with multiple canonical episodes, got false")
	}
}

func TestApplyEinteilerSuggestion_IsEinteilerFalseForOVAWithTwoCanonicalEpisodes(t *testing.T) {
	preview := models.EpisodeImportPreviewResult{
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 1},
			{EpisodeNumber: 2},
		},
	}

	got := applyEinteilerSuggestion(preview, "ova")

	if got.IsEinteiler {
		t.Fatalf("expected IsEinteiler false for ova with two canonical episodes, got true")
	}
}
