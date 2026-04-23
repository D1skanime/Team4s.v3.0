package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
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
			Path:                  `/media/Anime/Bleach/Season 03/Bleach S03E11.mkv`,
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
	// Readable file evidence must be present in mapping rows so the frontend
	// can identify real files instead of showing opaque media IDs.
	if got := preview.Mappings[0].FileName; got != "Bleach S03E11.mkv" {
		t.Fatalf("expected mapping row to carry file_name %q, got %q", "Bleach S03E11.mkv", got)
	}
	if got := preview.Mappings[0].DisplayPath; got == "" {
		t.Fatal("expected mapping row to carry a non-empty display_path for folder context")
	}
}

func TestPreviewEpisodeImport_AccumulatesSeasonSplitEpisodeSuggestions(t *testing.T) {
	t.Parallel()

	season1 := int32(1)
	season2 := int32(2)
	season3 := int32(3)
	ep1 := int32(1)
	ep26 := int32(26)
	preview := buildEpisodeImportPreview(
		7,
		"Naruto",
		episodeImportStringPtr("2788"),
		episodeImportStringPtr("naruto-series"),
		episodeImportStringPtr(`/media/Anime.TV.Sub/Naruto`),
		[]models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 1},
			{EpisodeNumber: 26},
			{EpisodeNumber: 27},
			{EpisodeNumber: 53},
		},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID:           "naruto-s01e01",
				FileName:              "Naruto.S01E01-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S01E01-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season1,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "naruto-s01e26",
				FileName:              "Naruto.S01E26-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S01E26-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season1,
				JellyfinEpisodeNumber: &ep26,
			},
			{
				MediaItemID:           "naruto-s02e01",
				FileName:              "Naruto.S02E01-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S02E01-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season2,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "naruto-s02e26",
				FileName:              "Naruto.S02E26-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S02E26-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season2,
				JellyfinEpisodeNumber: &ep26,
			},
			{
				MediaItemID:           "naruto-s03e01",
				FileName:              "Naruto.S03E01-Gena.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S03E01-Gena.avi`,
				JellyfinSeasonNumber:  &season3,
				JellyfinEpisodeNumber: &ep1,
			},
		},
		0,
	)

	got := make(map[string][]int32, len(preview.Mappings))
	for _, row := range preview.Mappings {
		got[row.MediaItemID] = row.SuggestedEpisodeNumbers
	}

	if want := []int32{1}; len(got["naruto-s01e01"]) != 1 || got["naruto-s01e01"][0] != want[0] {
		t.Fatalf("expected s01e01 => %v, got %v", want, got["naruto-s01e01"])
	}
	if want := []int32{26}; len(got["naruto-s01e26"]) != 1 || got["naruto-s01e26"][0] != want[0] {
		t.Fatalf("expected s01e26 => %v, got %v", want, got["naruto-s01e26"])
	}
	if want := []int32{27}; len(got["naruto-s02e01"]) != 1 || got["naruto-s02e01"][0] != want[0] {
		t.Fatalf("expected s02e01 => %v, got %v", want, got["naruto-s02e01"])
	}
	if want := []int32{52}; len(got["naruto-s02e26"]) != 1 || got["naruto-s02e26"][0] != want[0] {
		t.Fatalf("expected s02e26 => %v, got %v", want, got["naruto-s02e26"])
	}
	if want := []int32{53}; len(got["naruto-s03e01"]) != 1 || got["naruto-s03e01"][0] != want[0] {
		t.Fatalf("expected s03e01 => %v, got %v", want, got["naruto-s03e01"])
	}
}

func TestPreviewEpisodeImport_AddsManualSeasonOffsetAfterSeasonAccumulation(t *testing.T) {
	t.Parallel()

	season1 := int32(1)
	season2 := int32(2)
	ep10 := int32(10)
	ep2 := int32(2)
	preview := buildEpisodeImportPreview(
		9,
		"Bleach",
		episodeImportStringPtr("1078"),
		episodeImportStringPtr("series-bleach"),
		episodeImportStringPtr(`/media/Bleach`),
		[]models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 64}},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID:           "bleach-s01e10",
				FileName:              "Bleach S01E10.mkv",
				JellyfinSeasonNumber:  &season1,
				JellyfinEpisodeNumber: &ep10,
			},
			{
				MediaItemID:           "bleach-s02e02",
				FileName:              "Bleach S02E02.mkv",
				JellyfinSeasonNumber:  &season2,
				JellyfinEpisodeNumber: &ep2,
			},
		},
		54,
	)

	var target []int32
	for _, row := range preview.Mappings {
		if row.MediaItemID == "bleach-s02e02" {
			target = row.SuggestedEpisodeNumbers
			break
		}
	}
	if len(target) != 1 || target[0] != 66 {
		t.Fatalf("expected season accumulation plus offset to yield 66, got %v", target)
	}
}

func TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets(t *testing.T) {
	t.Parallel()

	season1 := int32(1)
	season2 := int32(2)
	season3 := int32(3)
	ep26 := int32(26)
	ep1 := int32(1)
	ep12 := int32(12)
	ep14 := int32(14)

	preview := buildEpisodeImportPreview(
		3,
		"Naruto",
		episodeImportStringPtr("2788"),
		episodeImportStringPtr("naruto-series"),
		episodeImportStringPtr(`/media/Anime.TV.Sub/Naruto`),
		[]models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 95},
			{EpisodeNumber: 96},
			{EpisodeNumber: 97},
			{EpisodeNumber: 98},
		},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID:           "naruto-s01e26",
				FileName:              "Naruto.S01E26-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S01E26-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season1,
				JellyfinEpisodeNumber: &ep26,
			},
			{
				MediaItemID:           "naruto-s02e26",
				FileName:              "Naruto.S02E26-AnimeOwnage.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S02E26-AnimeOwnage.avi`,
				JellyfinSeasonNumber:  &season2,
				JellyfinEpisodeNumber: &ep26,
			},
			{
				MediaItemID:           "naruto-s03e01",
				FileName:              "Naruto.S03E01-N!kKrew.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S03E01-N!kKrew.avi`,
				JellyfinSeasonNumber:  &season3,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "naruto-s03e12-13",
				FileName:              "Naruto.S03E12-13-N!kKrew.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S03E12-13-N!kKrew.avi`,
				JellyfinSeasonNumber:  &season3,
				JellyfinEpisodeNumber: &ep12,
			},
			{
				MediaItemID:           "naruto-s03e14",
				FileName:              "Naruto.S03E14-NarutoSeals.avi",
				Path:                  `/media/Anime.TV.Sub/Naruto/Naruto.S03E14-NarutoSeals.avi`,
				JellyfinSeasonNumber:  &season3,
				JellyfinEpisodeNumber: &ep14,
			},
		},
		31,
	)

	got := make(map[string][]int32, len(preview.Mappings))
	for _, row := range preview.Mappings {
		got[row.MediaItemID] = row.SuggestedEpisodeNumbers
	}

	if want := []int32{95, 96}; len(got["naruto-s03e12-13"]) != len(want) || got["naruto-s03e12-13"][0] != want[0] || got["naruto-s03e12-13"][1] != want[1] {
		t.Fatalf("expected s03e12-13 => %v, got %v", want, got["naruto-s03e12-13"])
	}
	if want := []int32{97}; len(got["naruto-s03e14"]) != len(want) || got["naruto-s03e14"][0] != want[0] {
		t.Fatalf("expected s03e14 => %v, got %v", want, got["naruto-s03e14"])
	}
	if len(preview.UnmappedEpisodes) != 1 || preview.UnmappedEpisodes[0] != 98 {
		t.Fatalf("expected episode 98 to stay unmapped until a separate file covers it, got %v", preview.UnmappedEpisodes)
	}
}

func TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence(t *testing.T) {
	t.Parallel()

	ep1 := int32(1)
	ep2 := int32(1)
	preview := buildEpisodeImportPreview(
		99,
		"11eyes",
		episodeImportStringPtr("5678"),
		episodeImportStringPtr("series-11eyes"),
		episodeImportStringPtr(`D:\Anime\TV\11 eyes mit sub`),
		[]models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID:           "id-group-a",
				FileName:              "11eyes_01_[GroupA].mkv",
				Path:                  `D:\Anime\TV\11 eyes mit sub\[GroupA]\11eyes_01_[GroupA].mkv`,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "id-group-b",
				FileName:              "11eyes_01_[GroupB].mkv",
				Path:                  `D:\Anime\TV\11 eyes mit sub\[GroupB]\11eyes_01_[GroupB].mkv`,
				JellyfinEpisodeNumber: &ep2,
			},
		},
		0,
	)

	if len(preview.Mappings) != 2 {
		t.Fatalf("expected two mapping rows, got %d", len(preview.Mappings))
	}
	for _, row := range preview.Mappings {
		if row.FileName == "" {
			t.Errorf("mapping row %q must carry a non-empty file_name", row.MediaItemID)
		}
		if row.DisplayPath == "" {
			t.Errorf("mapping row %q must carry a non-empty display_path", row.MediaItemID)
		}
		if row.MediaItemID == "id-group-a" && row.FileName != "11eyes_01_[GroupA].mkv" {
			t.Errorf("expected file_name %q, got %q", "11eyes_01_[GroupA].mkv", row.FileName)
		}
		if row.MediaItemID == "id-group-b" && row.FileName != "11eyes_01_[GroupB].mkv" {
			t.Errorf("expected file_name %q, got %q", "11eyes_01_[GroupB].mkv", row.FileName)
		}
	}
}

func TestPreviewEpisodeImport_PrefillsDetectedFansubGroupNames(t *testing.T) {
	t.Parallel()

	ep1 := int32(1)
	preview := buildEpisodeImportPreview(
		99,
		"11eyes",
		episodeImportStringPtr("5678"),
		episodeImportStringPtr("series-11eyes"),
		episodeImportStringPtr(`D:\Anime\TV\11 eyes mit sub`),
		[]models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID:           "id-bracketed",
				FileName:              "11eyes_01_[GroupA].mkv",
				Path:                  `D:\Anime\TV\11 eyes mit sub\[GroupA]\11eyes_01_[GroupA].mkv`,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "id-suffixed",
				FileName:              "11eyes.S01E01-FlameHazeSubs.mp4",
				Path:                  `D:\Anime\TV\11 eyes mit sub\11eyes.S01E01-FlameHazeSubs.mp4`,
				JellyfinEpisodeNumber: &ep1,
			},
			{
				MediaItemID:           "id-typo",
				FileName:              "Naruto.S01E01-AnmeOwnage.avi",
				Path:                  `D:\Anime\Naruto\Naruto.S01E01-AnmeOwnage.avi`,
				JellyfinEpisodeNumber: &ep1,
			},
		},
		0,
	)

	got := make(map[string]string, len(preview.Mappings))
	for _, row := range preview.Mappings {
		if row.FansubGroupName != nil {
			got[row.MediaItemID] = *row.FansubGroupName
		}
	}

	if got["id-bracketed"] != "GroupA" {
		t.Fatalf("expected bracketed group GroupA, got %q", got["id-bracketed"])
	}
	if got["id-suffixed"] != "FlameHazeSubs" {
		t.Fatalf("expected suffixed group FlameHazeSubs, got %q", got["id-suffixed"])
	}
	if got["id-typo"] != "AnmeOwnage" {
		t.Fatalf("expected raw typo spelling to be preserved, got %q", got["id-typo"])
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

func TestFindJellyfinSeriesMatchesByPath_FiltersToExactFolder(t *testing.T) {
	t.Parallel()

	matches := findJellyfinSeriesMatchesByPath([]jellyfinSeriesItem{
		{ID: "series-1", Name: "11eyes", Path: `D:\Anime\TV\11 eyes mit sub`},
		{ID: "series-2", Name: "11eyes", Path: `D:\Anime\TV\11 eyes specials`},
		{ID: "series-3", Name: "11eyes", Path: `D:\Anime\TV\11 eyes mit sub\Season 01`},
	}, normalizeJellyfinPath(episodeImportStringPtr(`D:\Anime\TV\11 eyes mit sub`)))

	if len(matches) != 1 {
		t.Fatalf("expected exactly one exact folder match, got %+v", matches)
	}
	if matches[0].ID != "series-1" {
		t.Fatalf("expected series-1, got %+v", matches[0])
	}
}

func TestResolveEpisodeImportSeriesByFolderPath_UsesStoredFolderPathFallback(t *testing.T) {
	t.Parallel()

	seenTerms := make(map[string]int)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items" {
			t.Fatalf("expected /Items path, got %s", r.URL.Path)
		}
		switch got := r.URL.Query().Get("SearchTerm"); got {
		case "11eyes", "11", "11eyesmitsub", "11 eyes mit sub":
			seenTerms[got]++
		default:
			t.Fatalf("unexpected SearchTerm=%q", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[
			{"Id":"series-1","Name":"11eyes","Path":"D:\\Anime\\TV\\11 eyes mit sub"},
			{"Id":"series-2","Name":"11eyes","Path":"D:\\Anime\\TV\\11 eyes specials"}
		]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	item, err := handler.resolveEpisodeImportSeriesByFolderPath(
		context.Background(),
		[]string{"11eyes"},
		episodeImportStringPtr(`D:\Anime\TV\11 eyes mit sub`),
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item == nil {
		t.Fatal("expected jellyfin series to be resolved from stored folder path")
	}
	if item.ID != "series-1" {
		t.Fatalf("expected series-1, got %+v", item)
	}
	if seenTerms["11eyes"] == 0 {
		t.Fatalf("expected anime title lookup to run, got %+v", seenTerms)
	}
	if seenTerms["11 eyes mit sub"] == 0 {
		t.Fatalf("expected folder seed lookup to run, got %+v", seenTerms)
	}
	if seenTerms["11"] == 0 {
		t.Fatalf("expected compact lookup seed to run, got %+v", seenTerms)
	}
}

func TestAppendUniqueJellyfinLookupTerms_ExpandsCompactNumericSeeds(t *testing.T) {
	t.Parallel()

	got := appendUniqueJellyfinLookupTerms(nil, "3x3 Eyes")
	want := []string{"3x3 Eyes", "3x3", "3x3Eyes"}
	if len(got) != len(want) {
		t.Fatalf("expected %d lookup terms, got %d: %#v", len(want), len(got), got)
	}
	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("expected lookup terms %#v, got %#v", want, got)
		}
	}
}

func TestFilterAlreadyMappedCandidates_ExcludesPersistedJellyfinItems(t *testing.T) {
	t.Parallel()

	candidates := []models.EpisodeImportMediaCandidate{
		{MediaItemID: "jf-ep01"},
		{MediaItemID: "jf-ep02"},
		{MediaItemID: "jf-ep51"},
		{MediaItemID: "jf-ep52"},
	}
	existing := models.EpisodeImportExistingCoverage{
		AnimeID: 7,
		Mappings: []models.EpisodeImportMappingRow{
			{MediaItemID: "jf-ep01", TargetEpisodeNumbers: []int32{1}, Status: models.EpisodeImportMappingStatusConfirmed},
			{MediaItemID: "jf-ep02", TargetEpisodeNumbers: []int32{2}, Status: models.EpisodeImportMappingStatusConfirmed},
			{MediaItemID: "", TargetEpisodeNumbers: []int32{3}, Status: models.EpisodeImportMappingStatusConfirmed},
		},
	}

	got := filterAlreadyMappedCandidates(candidates, existing)

	if len(got) != 2 {
		t.Fatalf("expected 2 new candidates, got %d: %+v", len(got), got)
	}
	for _, c := range got {
		if c.MediaItemID == "jf-ep01" || c.MediaItemID == "jf-ep02" {
			t.Errorf("already-mapped candidate %q must not appear in filtered result", c.MediaItemID)
		}
	}
}

func TestFilterAlreadyMappedCandidates_PassesThroughWhenNoExistingMappings(t *testing.T) {
	t.Parallel()

	candidates := []models.EpisodeImportMediaCandidate{
		{MediaItemID: "jf-ep01"},
		{MediaItemID: "jf-ep02"},
	}

	got := filterAlreadyMappedCandidates(candidates, models.EpisodeImportExistingCoverage{AnimeID: 7})

	if len(got) != 2 {
		t.Fatalf("expected all 2 candidates to pass through, got %d", len(got))
	}
}

func episodeImportStringPtr(value string) *string {
	return &value
}
