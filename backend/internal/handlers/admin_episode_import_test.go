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
		case "11eyes", "11 eyes mit sub":
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
}

func episodeImportStringPtr(value string) *string {
	return &value
}
