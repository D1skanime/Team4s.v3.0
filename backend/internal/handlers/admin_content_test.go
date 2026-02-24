package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestValidateAdminAnimeCreateRequest(t *testing.T) {
	year := int16(2013)
	maxEpisodes := int16(25)

	input, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       " Attack on Titan ",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
		Year:        &year,
		MaxEpisodes: &maxEpisodes,
	})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if input.Title != "Attack on Titan" {
		t.Fatalf("unexpected normalized title: %q", input.Title)
	}
}

func TestValidateAdminAnimeCreateRequest_InvalidType(t *testing.T) {
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "series",
		ContentType: "anime",
		Status:      "ongoing",
	})
	if message != "ungueltiger type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_RequiresField(t *testing.T) {
	_, message := validateAdminAnimePatchRequest(models.AdminAnimePatchInput{})
	if message != "mindestens ein feld ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_AcceptsNullableField(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"genre":null}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminAnimePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.Genre.Set {
		t.Fatalf("expected genre field to be marked as set")
	}
	if validated.Genre.Value != nil {
		t.Fatalf("expected genre value to stay nil for explicit null")
	}
}

func TestValidateAdminEpisodePatchRequest(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"episode_number":" 02 ","status":"public"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminEpisodePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if validated.EpisodeNumber.Value == nil || *validated.EpisodeNumber.Value != "02" {
		t.Fatalf("unexpected episode number value: %+v", validated.EpisodeNumber.Value)
	}
}

func TestValidateAdminEpisodePatchRequest_AcceptsNullableStreamLink(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"stream_link":null}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminEpisodePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.StreamLink.Set {
		t.Fatalf("expected stream_link field to be marked as set")
	}
	if validated.StreamLink.Value != nil {
		t.Fatalf("expected stream_link value to stay nil for explicit null")
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_Defaults(t *testing.T) {
	input, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if input.SeasonNumber != 1 {
		t.Fatalf("expected default season number 1, got %d", input.SeasonNumber)
	}
	if input.EpisodeStatus != "private" {
		t.Fatalf("expected default episode status private, got %q", input.EpisodeStatus)
	}
	if input.OverwriteEpisodeTitle {
		t.Fatalf("expected overwrite episode title to default false")
	}
	if input.OverwriteVersionTitle {
		t.Fatalf("expected overwrite version title to default false")
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_InvalidSeason(t *testing.T) {
	season := int32(0)
	_, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		SeasonNumber: &season,
	})
	if message != "ungueltiger season_number parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestJellyfinVideoQuality(t *testing.T) {
	height := 1080
	quality := jellyfinVideoQuality([]jellyfinMediaStream{
		{Type: "Video", Height: &height},
	})
	if quality == nil {
		t.Fatalf("expected quality to be resolved")
	}
	if *quality != "1080p" {
		t.Fatalf("expected quality 1080p, got %q", *quality)
	}
}

func TestJellyfinSeriesIDFromSource(t *testing.T) {
	source := " jellyfin:abc123 "
	seriesID := jellyfinSeriesIDFromSource(&source)
	if seriesID != "abc123" {
		t.Fatalf("expected series id abc123, got %q", seriesID)
	}
}

func TestFindExactJellyfinSeriesMatches(t *testing.T) {
	items := []jellyfinSeriesItem{
		{ID: "1", Name: "11eyes"},
		{ID: "2", Name: "11 eyes specials"},
	}
	matches := findExactJellyfinSeriesMatches(items, "11 eyes")
	if len(matches) != 1 {
		t.Fatalf("expected exactly one exact match, got %d", len(matches))
	}
	if matches[0].ID != "1" {
		t.Fatalf("expected id 1, got %q", matches[0].ID)
	}
}

func TestResolveJellyfinSeries_ExplicitID_Success(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items" {
			t.Fatalf("expected /Items path, got %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("Ids"); got != "abc123" {
			t.Fatalf("expected Ids=abc123, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"abc123","Name":"Alpha"}]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	item, statusCode, err := handler.resolveJellyfinSeries(
		context.Background(),
		[]string{"Alpha"},
		"abc123",
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if statusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", statusCode)
	}
	if item == nil || item.ID != "abc123" {
		t.Fatalf("expected series id abc123, got %+v", item)
	}
}

func TestResolveJellyfinSeries_ExplicitID_NotFound(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	item, statusCode, err := handler.resolveJellyfinSeries(
		context.Background(),
		[]string{"Alpha"},
		"missing-id",
	)
	if err == nil {
		t.Fatalf("expected not-found error")
	}
	if statusCode != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", statusCode)
	}
	if err.Error() != "jellyfin serie nicht gefunden" {
		t.Fatalf("unexpected error message: %q", err.Error())
	}
	if item != nil {
		t.Fatalf("expected nil item, got %+v", item)
	}
}

func TestResolveJellyfinSeries_AmbiguousTitleConflict(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items" {
			t.Fatalf("expected /Items path, got %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("SearchTerm"); got != "Alpha" {
			t.Fatalf("expected SearchTerm=Alpha, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"s1","Name":"Alpha [1080p]"},{"Id":"s2","Name":"Alpha [720p]"}]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	item, statusCode, err := handler.resolveJellyfinSeries(
		context.Background(),
		[]string{"Alpha"},
		"",
	)
	if err == nil {
		t.Fatalf("expected conflict error")
	}
	if statusCode != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", statusCode)
	}
	if err.Error() != "mehrere jellyfin serien gefunden, bitte jellyfin_series_id angeben" {
		t.Fatalf("unexpected error message: %q", err.Error())
	}
	if item != nil {
		t.Fatalf("expected nil item, got %+v", item)
	}
}

func TestSearchJellyfinSeries_IncludesPathField(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items" {
			t.Fatalf("expected /Items path, got %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("Fields"); got != "Path,ProductionYear,Overview" {
			t.Fatalf("expected Fields=Path,ProductionYear,Overview, got %q", got)
		}
		if got := r.URL.Query().Get("SearchTerm"); got != "Naruto" {
			t.Fatalf("expected SearchTerm=Naruto, got %q", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"s1","Name":"Naruto","Path":"D:\\Anime\\Naruto"}]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	items, err := handler.searchJellyfinSeries(context.Background(), "Naruto", 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one item, got %d", len(items))
	}
	if items[0].Path != `D:\Anime\Naruto` {
		t.Fatalf("unexpected path %q", items[0].Path)
	}
}

func TestGetJellyfinSeriesByID_UsesItemsLookupWithPathField(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items" {
			t.Fatalf("expected /Items path, got %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("Ids"); got != "abc123" {
			t.Fatalf("expected Ids=abc123, got %q", got)
		}
		if got := r.URL.Query().Get("Fields"); got != "Path,ProductionYear,Overview" {
			t.Fatalf("expected Fields=Path,ProductionYear,Overview, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"abc123","Name":"Naruto","Path":"D:\\Anime\\Naruto"}]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	item, err := handler.getJellyfinSeriesByID(context.Background(), "abc123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item == nil {
		t.Fatalf("expected non-nil item")
	}
	if item.Path != `D:\Anime\Naruto` {
		t.Fatalf("unexpected path %q", item.Path)
	}
}

func TestJellyfinPathHasPrefix(t *testing.T) {
	t.Parallel()

	prefix := `/media/Anime/Bonus/Anime.Bonus.Sub/11 eyes OVA`
	normalizedPrefix := normalizeJellyfinPath(&prefix)
	if normalizedPrefix == "" {
		t.Fatalf("expected normalized prefix")
	}

	if !jellyfinPathHasPrefix(`/media/Anime/Bonus/Anime.Bonus.Sub/11 eyes OVA/11 eyes ova.mkv`, normalizedPrefix) {
		t.Fatalf("expected path to match prefix")
	}
	if jellyfinPathHasPrefix(`/media/Anime/Serie/Anime.TV.Sub/11eyes/11eyes-s01e01.mkv`, normalizedPrefix) {
		t.Fatalf("expected unrelated path to be filtered")
	}
}

func TestBuildJellyfinSyncMismatchReason(t *testing.T) {
	t.Parallel()

	maxEpisodes := int16(1)
	mismatch := buildJellyfinSyncMismatchReason(&maxEpisodes, 12)
	if mismatch == nil {
		t.Fatalf("expected mismatch reason for oversized episode count")
	}

	ok := buildJellyfinSyncMismatchReason(&maxEpisodes, 1)
	if ok != nil {
		t.Fatalf("expected no mismatch for matching episode count, got %q", *ok)
	}
}
