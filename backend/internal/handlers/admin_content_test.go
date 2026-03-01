package handlers

import (
	"context"
	"encoding/json"
	"errors"
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

func TestClassifyJellyfinUpstreamError_AuthInvalid(t *testing.T) {
	t.Parallel()

	message, code, details := classifyJellyfinUpstreamError(
		errors.New("jellyfin returned status 401"),
		"jellyfin serien konnten nicht gesucht werden",
	)
	if message != "jellyfin token ungueltig" {
		t.Fatalf("unexpected message: %q", message)
	}
	if code != "jellyfin_auth_invalid" {
		t.Fatalf("unexpected code: %q", code)
	}
	if details == nil || *details == "" {
		t.Fatalf("expected auth details")
	}
}

func TestClassifyJellyfinUpstreamError_Unreachable(t *testing.T) {
	t.Parallel()

	message, code, details := classifyJellyfinUpstreamError(
		errors.New("call jellyfin: Get \"http://localhost:8096\": dial tcp 127.0.0.1:8096: connectex"),
		"jellyfin episoden konnten nicht geladen werden",
	)
	if message != "server nicht erreichbar" {
		t.Fatalf("unexpected message: %q", message)
	}
	if code != "jellyfin_unreachable" {
		t.Fatalf("unexpected code: %q", code)
	}
	if details == nil || *details == "" {
		t.Fatalf("expected unreachable details")
	}
}

func TestClassifyJellyfinResolutionError_AmbiguousSeries(t *testing.T) {
	t.Parallel()

	code, details := classifyJellyfinResolutionError(
		http.StatusConflict,
		"mehrere jellyfin serien gefunden, bitte jellyfin_series_id angeben",
	)
	if code != "jellyfin_series_ambiguous" {
		t.Fatalf("unexpected code: %q", code)
	}
	if details == nil || *details == "" {
		t.Fatalf("expected ambiguity details")
	}
}

// -------------------------------------------------------------------
// Additional regression tests for admin anime step-flow coverage
// -------------------------------------------------------------------

func TestValidateAdminAnimeCreateRequest_EmptyTitle(t *testing.T) {
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
	})
	if message != "title ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_WhitespaceOnlyTitle(t *testing.T) {
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "   ",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
	})
	if message != "title ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_TitleTooLong(t *testing.T) {
	longTitle := make([]rune, 256)
	for i := range longTitle {
		longTitle[i] = 'A'
	}
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       string(longTitle),
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
	})
	if message != "title ist zu lang" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_InvalidContentType(t *testing.T) {
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "tv",
		ContentType: "cartoon",
		Status:      "ongoing",
	})
	if message != "ungueltiger content_type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_InvalidStatus(t *testing.T) {
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "tv",
		ContentType: "anime",
		Status:      "completed",
	})
	if message != "ungueltiger status parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_InvalidYear(t *testing.T) {
	year := int16(-1)
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
		Year:        &year,
	})
	if message != "ungueltiger year parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_ZeroYear(t *testing.T) {
	year := int16(0)
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
		Year:        &year,
	})
	if message != "ungueltiger year parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_InvalidMaxEpisodes(t *testing.T) {
	maxEpisodes := int16(0)
	_, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
		Title:       "Valid",
		Type:        "tv",
		ContentType: "anime",
		Status:      "ongoing",
		MaxEpisodes: &maxEpisodes,
	})
	if message != "ungueltiger max_episodes parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimeCreateRequest_AllAnimeTypes(t *testing.T) {
	validTypes := []string{"tv", "film", "ova", "ona", "special", "bonus"}
	for _, animeType := range validTypes {
		input, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
			Title:       "Test",
			Type:        animeType,
			ContentType: "anime",
			Status:      "ongoing",
		})
		if message != "" {
			t.Fatalf("type %q should be valid, got error: %q", animeType, message)
		}
		if input.Type != animeType {
			t.Fatalf("expected type %q, got %q", animeType, input.Type)
		}
	}
}

func TestValidateAdminAnimeCreateRequest_AllStatuses(t *testing.T) {
	validStatuses := []string{"disabled", "ongoing", "done", "aborted", "licensed"}
	for _, status := range validStatuses {
		input, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
			Title:       "Test",
			Type:        "tv",
			ContentType: "anime",
			Status:      status,
		})
		if message != "" {
			t.Fatalf("status %q should be valid, got error: %q", status, message)
		}
		if input.Status != status {
			t.Fatalf("expected status %q, got %q", status, input.Status)
		}
	}
}

func TestValidateAdminAnimeCreateRequest_AllContentTypes(t *testing.T) {
	validContentTypes := []string{"anime", "hentai"}
	for _, contentType := range validContentTypes {
		input, message := validateAdminAnimeCreateRequest(adminAnimeCreateRequest{
			Title:       "Test",
			Type:        "tv",
			ContentType: contentType,
			Status:      "ongoing",
		})
		if message != "" {
			t.Fatalf("content_type %q should be valid, got error: %q", contentType, message)
		}
		if input.ContentType != contentType {
			t.Fatalf("expected content_type %q, got %q", contentType, input.ContentType)
		}
	}
}

func TestValidateAdminAnimePatchRequest_TitleTooLong(t *testing.T) {
	longTitle := make([]rune, 256)
	for i := range longTitle {
		longTitle[i] = 'A'
	}
	titleStr := string(longTitle)
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"title":"`+titleStr+`"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "title ist zu lang" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_EmptyTitle(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"title":""}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "title ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_InvalidType(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"type":"invalid"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_EmptyType(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"type":""}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_InvalidContentType(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"content_type":"cartoon"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger content_type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_InvalidStatus(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"status":"completed"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger status parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_InvalidYear(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"year":-1}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger year parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_InvalidMaxEpisodes(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"max_episodes":0}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminAnimePatchRequest(patch)
	if message != "ungueltiger max_episodes parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminAnimePatchRequest_NormalizesOptionalFields(t *testing.T) {
	var patch models.AdminAnimePatchInput
	if err := json.Unmarshal([]byte(`{"title_de":"  German Title  ","title_en":"  English Title  ","description":"  Desc  "}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminAnimePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if validated.TitleDE.Value == nil || *validated.TitleDE.Value != "German Title" {
		t.Fatalf("expected trimmed title_de, got %+v", validated.TitleDE.Value)
	}
	if validated.TitleEN.Value == nil || *validated.TitleEN.Value != "English Title" {
		t.Fatalf("expected trimmed title_en, got %+v", validated.TitleEN.Value)
	}
	if validated.Description.Value == nil || *validated.Description.Value != "Desc" {
		t.Fatalf("expected trimmed description, got %+v", validated.Description.Value)
	}
}

// -------------------------------------------------------------------
// Additional regression tests for episode validation
// -------------------------------------------------------------------

func TestValidateAdminEpisodeCreateRequest_ValidInput(t *testing.T) {
	input, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       1,
		EpisodeNumber: " 01 ",
		Status:        "public",
	})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if input.EpisodeNumber != "01" {
		t.Fatalf("expected trimmed episode number, got %q", input.EpisodeNumber)
	}
	if input.Status != "public" {
		t.Fatalf("expected status public, got %q", input.Status)
	}
}

func TestValidateAdminEpisodeCreateRequest_InvalidAnimeID(t *testing.T) {
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       0,
		EpisodeNumber: "01",
		Status:        "public",
	})
	if message != "anime_id ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_NegativeAnimeID(t *testing.T) {
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       -1,
		EpisodeNumber: "01",
		Status:        "public",
	})
	if message != "anime_id ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_EmptyEpisodeNumber(t *testing.T) {
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       1,
		EpisodeNumber: "",
		Status:        "public",
	})
	if message != "episode_number ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_WhitespaceOnlyEpisodeNumber(t *testing.T) {
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       1,
		EpisodeNumber: "   ",
		Status:        "public",
	})
	if message != "episode_number ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_EpisodeNumberTooLong(t *testing.T) {
	longNumber := make([]rune, 33)
	for i := range longNumber {
		longNumber[i] = '0'
	}
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       1,
		EpisodeNumber: string(longNumber),
		Status:        "public",
	})
	if message != "episode_number ist zu lang" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_InvalidStatus(t *testing.T) {
	_, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
		AnimeID:       1,
		EpisodeNumber: "01",
		Status:        "active",
	})
	if message != "ungueltiger status parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodeCreateRequest_AllStatuses(t *testing.T) {
	validStatuses := []string{"disabled", "private", "public"}
	for _, status := range validStatuses {
		input, message := validateAdminEpisodeCreateRequest(adminEpisodeCreateRequest{
			AnimeID:       1,
			EpisodeNumber: "01",
			Status:        status,
		})
		if message != "" {
			t.Fatalf("status %q should be valid, got error: %q", status, message)
		}
		if input.Status != status {
			t.Fatalf("expected status %q, got %q", status, input.Status)
		}
	}
}

func TestValidateAdminEpisodePatchRequest_RequiresField(t *testing.T) {
	_, message := validateAdminEpisodePatchRequest(models.AdminEpisodePatchInput{})
	if message != "mindestens ein feld ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodePatchRequest_EmptyEpisodeNumber(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"episode_number":""}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminEpisodePatchRequest(patch)
	if message != "episode_number ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodePatchRequest_EpisodeNumberTooLong(t *testing.T) {
	longNumber := make([]rune, 33)
	for i := range longNumber {
		longNumber[i] = '0'
	}
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"episode_number":"`+string(longNumber)+`"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminEpisodePatchRequest(patch)
	if message != "episode_number ist zu lang" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodePatchRequest_InvalidStatus(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"status":"active"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminEpisodePatchRequest(patch)
	if message != "ungueltiger status parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodePatchRequest_EmptyStatus(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"status":""}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateAdminEpisodePatchRequest(patch)
	if message != "ungueltiger status parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateAdminEpisodePatchRequest_NullableTitle(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"title":null}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminEpisodePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.Title.Set {
		t.Fatalf("expected title field to be marked as set")
	}
	if validated.Title.Value != nil {
		t.Fatalf("expected title value to stay nil for explicit null")
	}
}

func TestValidateAdminEpisodePatchRequest_NormalizesTitle(t *testing.T) {
	var patch models.AdminEpisodePatchInput
	if err := json.Unmarshal([]byte(`{"title":"  Episode Title  "}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateAdminEpisodePatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if validated.Title.Value == nil || *validated.Title.Value != "Episode Title" {
		t.Fatalf("expected trimmed title, got %+v", validated.Title.Value)
	}
}

func TestHasAnyAdminAnimePatchField(t *testing.T) {
	tests := []struct {
		name     string
		input    models.AdminAnimePatchInput
		expected bool
	}{
		{"empty", models.AdminAnimePatchInput{}, false},
		{"title set", models.AdminAnimePatchInput{Title: models.OptionalString{Set: true}}, true},
		{"title_de set", models.AdminAnimePatchInput{TitleDE: models.OptionalString{Set: true}}, true},
		{"title_en set", models.AdminAnimePatchInput{TitleEN: models.OptionalString{Set: true}}, true},
		{"type set", models.AdminAnimePatchInput{Type: models.OptionalString{Set: true}}, true},
		{"content_type set", models.AdminAnimePatchInput{ContentType: models.OptionalString{Set: true}}, true},
		{"status set", models.AdminAnimePatchInput{Status: models.OptionalString{Set: true}}, true},
		{"year set", models.AdminAnimePatchInput{Year: models.OptionalInt16{Set: true}}, true},
		{"max_episodes set", models.AdminAnimePatchInput{MaxEpisodes: models.OptionalInt16{Set: true}}, true},
		{"genre set", models.AdminAnimePatchInput{Genre: models.OptionalString{Set: true}}, true},
		{"description set", models.AdminAnimePatchInput{Description: models.OptionalString{Set: true}}, true},
		{"cover_image set", models.AdminAnimePatchInput{CoverImage: models.OptionalString{Set: true}}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasAnyAdminAnimePatchField(tt.input)
			if result != tt.expected {
				t.Fatalf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
