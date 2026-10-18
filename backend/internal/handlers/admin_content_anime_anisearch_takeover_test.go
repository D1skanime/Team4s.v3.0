package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

// quick-261018-l5r Task 2: httptest-level proof that LinkAnimeAniSearchSource correctly reports
// filled/replaced/kept fields (and the jellyfin_unreachable flag) in its response body, with the
// real buildAniSearchFieldTakeover orchestration code actually executing against fakes/a fake
// Jellyfin HTTP server -- Teststil per CLAUDE.md, never a source-grep.

// fakeAniSearchTakeoverSnapshotRepo is an in-memory adminAniSearchTakeoverSnapshotRepository fake.
type fakeAniSearchTakeoverSnapshotRepo struct {
	snapshot *models.AdminAnimeAniSearchTakeoverSnapshot
	err      error
	calls    int
}

func (f *fakeAniSearchTakeoverSnapshotRepo) GetAnimeAniSearchTakeoverSnapshot(_ context.Context, _ int64) (*models.AdminAnimeAniSearchTakeoverSnapshot, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.snapshot, nil
}

// fakeAniSearchAnimeFetcher is an in-memory adminAniSearchAnimeFetcher fake.
type fakeAniSearchAnimeFetcher struct {
	anime services.AniSearchAnime
	err   error
	calls int
}

func (f *fakeAniSearchAnimeFetcher) FetchAnime(_ context.Context, _ string) (services.AniSearchAnime, error) {
	f.calls++
	if f.err != nil {
		return services.AniSearchAnime{}, f.err
	}
	return f.anime, nil
}

// fakeAniSearchTakeoverSyncSourceRepo is an in-memory adminAniSearchTakeoverSyncSourceRepository fake.
type fakeAniSearchTakeoverSyncSourceRepo struct {
	syncSource *models.AdminAnimeSyncSource
	err        error
}

func (f *fakeAniSearchTakeoverSyncSourceRepo) GetAnimeSyncSource(_ context.Context, _ int64) (*models.AdminAnimeSyncSource, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.syncSource, nil
}

// newAniSearchTakeoverTestHandler builds a handler with the Task-1 lookup/link fakes plus the
// Task-2 takeover dependencies -- jellyfinServerURL is empty when the test does not want a
// reachable Jellyfin (jellyfin_unreachable=true path).
func newAniSearchTakeoverTestHandler(
	link *fakeAniSearchLinkRepo,
	audit auditLogWriter,
	snapshotRepo *fakeAniSearchTakeoverSnapshotRepo,
	fetcher *fakeAniSearchAnimeFetcher,
	syncSourceRepo *fakeAniSearchTakeoverSyncSourceRepo,
	jellyfinServerURL string,
) *AdminContentHandler {
	h := &AdminContentHandler{
		authzRepo:                       stubAdminRoleChecker{allowed: true},
		adminRoleName:                   "admin",
		aniSearchRepo:                   &fakeAniSearchLinkLookupRepo{},
		animeAniSearchLinkRepo:          link,
		auditLogRepo:                    audit,
		aniSearchTakeoverSnapshotRepo:   snapshotRepo,
		aniSearchFetcher:                fetcher,
		aniSearchTakeoverSyncSourceRepo: syncSourceRepo,
		httpClient:                      http.DefaultClient,
	}
	if jellyfinServerURL != "" {
		h.jellyfinBaseURL = jellyfinServerURL
		h.jellyfinAPIKey = "test-key"
	}
	return h
}

// newFakeJellyfinSeriesDetailServer responds to every /Items request with a single series
// matching productionYear/overview/genres/tags -- good enough to exercise
// resolveJellyfinSeries -> getJellyfinSeriesByID -> getJellyfinSeriesIntakeDetail end to end
// without asserting on the exact outgoing query shape (covered elsewhere).
func newFakeJellyfinSeriesDetailServer(t *testing.T, seriesID string, productionYear int, overview string, genres []string, tags []string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		payload := map[string]any{
			"Items": []map[string]any{
				{
					"Id":             seriesID,
					"Name":           "Fixture Series",
					"ProductionYear": productionYear,
					"Overview":       overview,
					"Genres":         genres,
					"Tags":           tags,
				},
			},
		}
		_ = json.NewEncoder(w).Encode(payload)
	}))
}

type aniSearchTakeoverDecodedResponse struct {
	Data struct {
		Mode     string `json:"mode"`
		Takeover *struct {
			Filled   []string `json:"filled"`
			Replaced []string `json:"replaced"`
			Kept     []struct {
				Field  string `json:"field"`
				Action string `json:"action"`
				Reason string `json:"reason"`
			} `json:"kept"`
			JellyfinUnreachable bool `json:"jellyfin_unreachable"`
		} `json:"takeover"`
	} `json:"data"`
}

func decodeAniSearchTakeoverResponse(t *testing.T, body []byte) aniSearchTakeoverDecodedResponse {
	t.Helper()
	var decoded aniSearchTakeoverDecodedResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v (body=%s)", err, body)
	}
	return decoded
}

func keptFieldReason(t *testing.T, decoded aniSearchTakeoverDecodedResponse, field string) string {
	t.Helper()
	for _, kept := range decoded.Data.Takeover.Kept {
		if kept.Field == field {
			return kept.Reason
		}
	}
	t.Fatalf("expected field %q in kept list, got %+v", field, decoded.Data.Takeover.Kept)
	return ""
}

// --- Full success with Jellyfin reachable: proves fill, replace, AND keep in one response ------

func TestAniSearchLink_TakeoverReportsFillReplaceAndKeepWhenJellyfinIsReachable(t *testing.T) {
	jellyfinServer := newFakeJellyfinSeriesDetailServer(t, "999", 2020, "Jellyfin Overview", []string{"Isekai-Genre"}, []string{"Isekai"})
	defer jellyfinServer.Close()

	currentTitleEN := "Manual EN Title"
	currentYear := int16(2020)
	currentMaxEpisodes := int16(12)
	currentDescription := "Manual description"

	snapshotRepo := &fakeAniSearchTakeoverSnapshotRepo{snapshot: &models.AdminAnimeAniSearchTakeoverSnapshot{
		TitleDE:     nil, // empty -> fill
		TitleEN:     &currentTitleEN,
		Year:        &currentYear, // matches jellyfin -> replace
		MaxEpisodes: &currentMaxEpisodes,
		Description: &currentDescription,
		Genres:      nil,              // empty -> fill
		Tags:        []string{"Isekai"}, // matches jellyfin -> replace
		Type:        "tv",
	}}

	germanTitle := "Deutscher Titel"
	englishTitle := "AniSearch EN Title"
	description := "AniSearch Description"
	year := int16(2023)
	episodeCount := int16(24)
	format := "Movie"
	fetcher := &fakeAniSearchAnimeFetcher{anime: services.AniSearchAnime{
		AniSearchID:  "6465",
		GermanTitle:  &germanTitle,
		EnglishTitle: &englishTitle,
		Description:  &description,
		Year:         &year,
		EpisodeCount: &episodeCount,
		Format:       &format,
		Genres:       []string{"Action", "Fantasy"},
		Tags:         []string{"Harem", "Isekai"},
	}}

	jellyfinSource := "jellyfin:999"
	syncSourceRepo := &fakeAniSearchTakeoverSyncSourceRepo{syncSource: &models.AdminAnimeSyncSource{
		ID:     13,
		Title:  "Fixture Anime",
		Source: &jellyfinSource,
	}}

	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchTakeoverTestHandler(link, audit, snapshotRepo, fetcher, syncSourceRepo, jellyfinServer.URL))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	decoded := decodeAniSearchTakeoverResponse(t, rec.Body.Bytes())
	if decoded.Data.Takeover == nil {
		t.Fatalf("expected a non-nil takeover summary, got %s", rec.Body.String())
	}
	if decoded.Data.Takeover.JellyfinUnreachable {
		t.Fatalf("expected jellyfin_unreachable=false when the fake jellyfin server answered, got true")
	}

	assertStringSliceEqualIgnoringOrder(t, []string{"title_de", "genre"}, decoded.Data.Takeover.Filled)
	assertStringSliceEqualIgnoringOrder(t, []string{"year", "tags"}, decoded.Data.Takeover.Replaced)

	// title_en never has a jellyfin comparison value at all (no equivalent field), so a non-empty
	// current value is "protected" (no comparison possible), not "differs from jellyfin".
	if reason := keptFieldReason(t, decoded, "title_en"); !strings.Contains(reason, "geschützt") {
		t.Fatalf("expected title_en kept reason to mention no jellyfin comparison, got %q", reason)
	}
	if reason := keptFieldReason(t, decoded, "max_episodes"); !strings.Contains(reason, "geschützt") {
		t.Fatalf("expected max_episodes kept reason to mention no jellyfin comparison, got %q", reason)
	}
	if reason := keptFieldReason(t, decoded, "description"); !strings.Contains(reason, "manuell") {
		t.Fatalf("expected description kept reason to mention manual maintenance (differs from jellyfin), got %q", reason)
	}
	if reason := keptFieldReason(t, decoded, "type"); !strings.Contains(reason, "geschützt") {
		t.Fatalf("expected type kept reason to mention no jellyfin comparison, got %q", reason)
	}

	if link.linkCalls != 1 {
		t.Fatalf("expected the repo link write to be attempted exactly once, got %d", link.linkCalls)
	}
	patch := link.takeoverPatches[0]
	if patch == nil {
		t.Fatalf("expected a non-nil takeover patch to be passed to the repository")
	}
	if !patch.TitleDE.Set || patch.TitleDE.Value == nil || *patch.TitleDE.Value != "Deutscher Titel" {
		t.Fatalf("expected patch.TitleDE to be set to the AniSearch value, got %+v", patch.TitleDE)
	}
	if !patch.Year.Set || patch.Year.Value == nil || *patch.Year.Value != 2023 {
		t.Fatalf("expected patch.Year to be set to the AniSearch value, got %+v", patch.Year)
	}
	if patch.TitleEN.Set {
		t.Fatalf("expected patch.TitleEN to remain unset (kept), got %+v", patch.TitleEN)
	}

	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", audit.calls)
	}
	payload := audit.entries[0].Payload
	if payload == nil {
		t.Fatalf("expected a non-nil audit payload")
	}
	if _, ok := payload["takeover_filled"]; !ok {
		t.Fatalf("expected the audit payload to record takeover_filled, got %+v", payload)
	}
}

// --- Jellyfin unreachable (no link on the anime) degrades to fill-only --------------------------

func TestAniSearchLink_TakeoverFallsBackToFillOnlyWhenAnimeHasNoJellyfinLink(t *testing.T) {
	currentYear := int16(2020)
	snapshotRepo := &fakeAniSearchTakeoverSnapshotRepo{snapshot: &models.AdminAnimeAniSearchTakeoverSnapshot{
		Year: &currentYear,
		Type: "tv",
	}}

	year := int16(2023)
	fetcher := &fakeAniSearchAnimeFetcher{anime: services.AniSearchAnime{AniSearchID: "6465", Year: &year}}

	// No Source at all -> jellyfinSeriesIDFromAnimeSource returns "" -> Available=false.
	syncSourceRepo := &fakeAniSearchTakeoverSyncSourceRepo{syncSource: &models.AdminAnimeSyncSource{ID: 13, Title: "Fixture Anime"}}

	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	// jellyfinServerURL left empty on purpose -- even if it were reachable, there's no link to
	// compare against, but this also proves the "unconfigured" branch never dials out.
	router := newAniSearchLinkTestRouter(newAniSearchTakeoverTestHandler(link, audit, snapshotRepo, fetcher, syncSourceRepo, ""))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	decoded := decodeAniSearchTakeoverResponse(t, rec.Body.Bytes())
	if decoded.Data.Takeover == nil {
		t.Fatalf("expected a non-nil takeover summary, got %s", rec.Body.String())
	}
	if !decoded.Data.Takeover.JellyfinUnreachable {
		t.Fatalf("expected jellyfin_unreachable=true when the anime has no jellyfin link")
	}

	// year has a current value (2020) and AniSearch differs (2023), but with jellyfin
	// unreachable there is no comparison at all -> must stay "keep", NEVER "replace".
	if len(decoded.Data.Takeover.Replaced) != 0 {
		t.Fatalf("expected nothing to be replaced when jellyfin is unreachable, got %+v", decoded.Data.Takeover.Replaced)
	}
	if reason := keptFieldReason(t, decoded, "year"); !strings.Contains(reason, "geschützt") {
		t.Fatalf("expected year to be kept as protected when jellyfin is unreachable, got %q", reason)
	}
}

// --- AniSearch fetch failure degrades to "no takeover attempted", link still succeeds -----------

func TestAniSearchLink_TakeoverOmittedWhenAniSearchFetchFails(t *testing.T) {
	snapshotRepo := &fakeAniSearchTakeoverSnapshotRepo{snapshot: &models.AdminAnimeAniSearchTakeoverSnapshot{Type: "tv"}}
	fetcher := &fakeAniSearchAnimeFetcher{err: errors.New("fake anisearch fetch failure")}
	syncSourceRepo := &fakeAniSearchTakeoverSyncSourceRepo{syncSource: &models.AdminAnimeSyncSource{ID: 13}}

	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchTakeoverTestHandler(link, audit, snapshotRepo, fetcher, syncSourceRepo, ""))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 even when the anisearch fetch fails (the link itself must still succeed), got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var decoded map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	data, _ := decoded["data"].(map[string]any)
	if _, hasTakeover := data["takeover"]; hasTakeover {
		t.Fatalf("expected no takeover key in the response when the anisearch fetch failed, got %+v", data)
	}
	if link.linkCalls != 1 || link.takeoverPatches[0] != nil {
		t.Fatalf("expected the link write to proceed with a nil takeover patch, got calls=%d patches=%+v", link.linkCalls, link.takeoverPatches)
	}
}

// --- Missing takeover dependencies (e.g. older wiring) never attempt a takeover -----------------

func TestAniSearchLink_TakeoverOmittedWhenDependenciesAreNotWired(t *testing.T) {
	lookup := &fakeAniSearchLinkLookupRepo{}
	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	// Deliberately the Task-1 constructor, which never wires the Task-2 takeover dependencies.
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var decoded map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	data, _ := decoded["data"].(map[string]any)
	if _, hasTakeover := data["takeover"]; hasTakeover {
		t.Fatalf("expected no takeover key when the takeover dependencies are not wired at all, got %+v", data)
	}
}

func assertStringSliceEqualIgnoringOrder(t *testing.T, expected []string, actual []string) {
	t.Helper()
	if len(expected) != len(actual) {
		t.Fatalf("expected %v, got %v", expected, actual)
	}
	seen := make(map[string]bool, len(actual))
	for _, v := range actual {
		seen[v] = true
	}
	for _, v := range expected {
		if !seen[v] {
			t.Fatalf("expected %v to contain %q, got %v", expected, v, actual)
		}
	}
}

