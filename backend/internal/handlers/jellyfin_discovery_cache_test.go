package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// fakeDiscoveryCacheStore is an in-memory discoveryCacheStore fake so these tests
// never need a live Redis instance (RESEARCH.md §13/D-19).
type fakeDiscoveryCacheStore struct {
	mu    sync.Mutex
	value string
	ok    bool
}

func newFakeDiscoveryCacheStore() *fakeDiscoveryCacheStore {
	return &fakeDiscoveryCacheStore{}
}

func (s *fakeDiscoveryCacheStore) Get(ctx context.Context, key string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.ok {
		return "", errDiscoveryCacheMiss
	}
	return s.value, nil
}

func (s *fakeDiscoveryCacheStore) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.value = value
	s.ok = true
	return nil
}

func TestJellyfinDiscoveryCache_FilteredBranch_OneRequestPerLibrary(t *testing.T) {
	var mu sync.Mutex
	var recorded []url.Values
	libraryItems := map[string][]map[string]any{
		"lib-a": {{"Id": "a1", "Name": "Series A1", "Path": "/media/a1"}},
		"lib-b": {{"Id": "b1", "Name": "Series B1", "Path": "/media/b1"}},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		recorded = append(recorded, r.URL.Query())
		mu.Unlock()
		items := libraryItems[r.URL.Query().Get("ParentId")]
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	h := &AdminContentHandler{
		jellyfinBaseURL:           server.URL,
		jellyfinAPIKey:            "test-key",
		httpClient:                server.Client(),
		jellyfinAllowedLibraryIDs: []string{"lib-a", "lib-b"},
	}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d (%+v)", len(items), items)
	}
	if len(recorded) != 2 {
		t.Fatalf("expected exactly 2 requests (1 per library), got %d", len(recorded))
	}
	for _, q := range recorded {
		if q.Get("IncludeItemTypes") != "Series,Movie" {
			t.Errorf("wrong IncludeItemTypes: %q", q.Get("IncludeItemTypes"))
		}
		if q.Get("Recursive") != "true" {
			t.Errorf("wrong Recursive: %q", q.Get("Recursive"))
		}
		if q.Get("Fields") != "Path" {
			t.Errorf("wrong Fields: %q", q.Get("Fields"))
		}
		if q.Get("ParentId") == "" {
			t.Errorf("expected ParentId to be set for the filtered branch")
		}
		for _, forbidden := range []string{"SearchTerm", "ProviderIds", "Genres", "Tags", "Overview"} {
			if q.Get(forbidden) != "" {
				t.Errorf("unexpected %s param present: %q", forbidden, q.Get(forbidden))
			}
		}
	}
}

func TestJellyfinDiscoveryCache_GlobalFallbackBranch_D27(t *testing.T) {
	var mu sync.Mutex
	var recorded []url.Values
	fixture := []map[string]any{{"Id": "s1", "Name": "Series One", "Path": "/media/s1"}}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		recorded = append(recorded, r.URL.Query())
		mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": fixture, "TotalRecordCount": len(fixture)})
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}

	got, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 item, got %d", len(got))
	}
	if len(recorded) != 1 {
		t.Fatalf("expected exactly 1 global request when the allowlist is empty, got %d", len(recorded))
	}
	q := recorded[0]
	if q.Get("IncludeItemTypes") != "Series,Movie" || q.Get("Recursive") != "true" || q.Get("Fields") != "Path" {
		t.Fatalf("wrong base params: %v", q)
	}
	if q.Has("ParentId") {
		t.Fatalf("expected zero ParentId occurrences in the global fallback branch, got %q", q.Get("ParentId"))
	}
}

func TestJellyfinDiscoveryCache_DedupAcrossLibraries(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		items := []map[string]any{{"Id": "shared", "Name": "Shared Series", "Path": "/media/shared"}}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	h := &AdminContentHandler{
		jellyfinBaseURL:           server.URL,
		jellyfinAPIKey:            "test-key",
		httpClient:                server.Client(),
		jellyfinAllowedLibraryIDs: []string{"lib-a", "lib-b"},
	}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected the same item id from two libraries to be deduplicated, got %d items", len(items))
	}
}

func TestJellyfinDiscoveryCache_PaginationSafetyNetAtScale(t *testing.T) {
	const total = 2111
	var mu sync.Mutex
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		calls++
		mu.Unlock()

		q := r.URL.Query()
		startIndex, _ := strconv.Atoi(q.Get("StartIndex"))
		limit, _ := strconv.Atoi(q.Get("Limit"))
		if limit != discoverySnapshotPageLimit {
			t.Errorf("unexpected Limit: %d", limit)
		}
		end := startIndex + limit
		if end > total {
			end = total
		}
		items := make([]map[string]any, 0, end-startIndex)
		for i := startIndex; i < end; i++ {
			items = append(items, map[string]any{
				"Id":   fmt.Sprintf("item-%04d", i),
				"Name": fmt.Sprintf("Series %04d", i),
				"Path": fmt.Sprintf("/media/%04d", i),
			})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": total})
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != total {
		t.Fatalf("expected the final snapshot length to equal %d, got %d", total, len(items))
	}
	seen := make(map[string]bool, total)
	for _, item := range items {
		if seen[item.ID] {
			t.Fatalf("duplicate item id in snapshot: %s", item.ID)
		}
		seen[item.ID] = true
	}
	wantCalls := (total + discoverySnapshotPageLimit - 1) / discoverySnapshotPageLimit
	if calls != wantCalls {
		t.Fatalf("expected %d paginated requests advancing StartIndex, got %d", wantCalls, calls)
	}
}

func TestJellyfinDiscoveryCache_CacheHitAndBypass(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		items := []map[string]any{{"Id": fmt.Sprintf("item-%d", calls), "Name": "Series", "Path": "/media/x"}}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	store := newFakeDiscoveryCacheStore()
	h := &AdminContentHandler{
		jellyfinBaseURL: server.URL,
		jellyfinAPIKey:  "test-key",
		httpClient:      server.Client(),
		discoveryCache:  store,
	}

	if _, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false); err != nil {
		t.Fatalf("first call (cache miss): %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected 1 request on cache miss, got %d", calls)
	}

	if _, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false); err != nil {
		t.Fatalf("second call (expected cache hit): %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected 0 additional requests on a cache hit within TTL, got total %d", calls)
	}

	if _, err := h.buildJellyfinDiscoverySnapshot(context.Background(), true); err != nil {
		t.Fatalf("bypass call: %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected exactly 1 additional request on bypass regardless of TTL, got total %d", calls)
	}
}

func TestJellyfinDiscoveryCache_UpstreamFailureReturnsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err == nil {
		t.Fatalf("expected an error on upstream 500, got nil")
	}
	if items != nil {
		t.Fatalf("expected no partial/empty snapshot to be silently returned, got %+v", items)
	}
}

func TestJellyfinDiscoveryCache_UpstreamFailureOnOneLibraryReturnsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("ParentId") == "lib-b" {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		items := []map[string]any{{"Id": "a1", "Name": "Series A1", "Path": "/media/a1"}}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	h := &AdminContentHandler{
		jellyfinBaseURL:           server.URL,
		jellyfinAPIKey:            "test-key",
		httpClient:                server.Client(),
		jellyfinAllowedLibraryIDs: []string{"lib-a", "lib-b"},
	}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err == nil {
		t.Fatalf("expected an error when one of two library requests fails, got nil")
	}
	if items != nil {
		t.Fatalf("expected no partial snapshot from the succeeding library, got %+v", items)
	}
}

// TestJellyfinDiscoveryCache_ConcurrentRebuildsSingleFlight proves GAP-15: N concurrent
// callers hitting an empty/expired cache must collapse into exactly ONE real Jellyfin fetch
// via h.discoverySnapshotGroup (singleflight), not N overlapping ones. The fake server sleeps
// briefly on its first response so the N goroutines genuinely overlap in time instead of
// racing sequentially.
func TestJellyfinDiscoveryCache_ConcurrentRebuildsSingleFlight(t *testing.T) {
	const concurrentCallers = 5
	var calls int32
	fixture := []map[string]any{{"Id": "s1", "Name": "Series One", "Path": "/media/s1"}}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n == 1 {
			// Artificial delay on the first (and, if the fix works, only) response so the
			// other concurrentCallers-1 goroutines are still waiting when it starts.
			time.Sleep(50 * time.Millisecond)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": fixture, "TotalRecordCount": len(fixture)})
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}

	var wg sync.WaitGroup
	results := make([][]jellyfinSeriesItem, concurrentCallers)
	errs := make([]error, concurrentCallers)
	for i := 0; i < concurrentCallers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			results[idx], errs[idx] = h.buildJellyfinDiscoverySnapshot(context.Background(), false)
		}(i)
	}
	wg.Wait()

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("expected exactly 1 upstream fetch for %d concurrent rebuild calls, got %d", concurrentCallers, got)
	}
	for i, err := range errs {
		if err != nil {
			t.Fatalf("caller %d: unexpected error: %v", i, err)
		}
		if len(results[i]) != 1 || results[i][0].ID != "s1" {
			t.Fatalf("caller %d: expected the shared fetch result, got %+v", i, results[i])
		}
	}
}

// TestJellyfinDiscoveryCache_GlobalFallbackExcludesNonAnimeLibraryTypes proves that
// IncludeItemTypes=Series,Movie alone is sufficient to exclude non-anime libraries
// (e.g. the live "Musikvideos" musicvideos-collection library, RESEARCH.md §17a) from
// the global fallback branch — no additional client-side type filter is needed. The
// fake server simulates real Jellyfin-side IncludeItemTypes filtering.
func TestJellyfinDiscoveryCache_GlobalFallbackExcludesNonAnimeLibraryTypes(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedTypes := strings.Split(r.URL.Query().Get("IncludeItemTypes"), ",")
		allowed := make(map[string]bool, len(requestedTypes))
		for _, typ := range requestedTypes {
			allowed[typ] = true
		}
		fixture := []map[string]any{
			{"Id": "series-1", "Name": "Real Series", "Path": "/media/Anime/Serie/Anime.TV.Sub/real", "Type": "Series"},
			{"Id": "mv-1", "Name": "Some AMV", "Path": "/media/Anime/AMV/mv1", "Type": "MusicVideo"},
		}
		items := make([]map[string]any, 0, len(fixture))
		for _, item := range fixture {
			if allowed[item["Type"].(string)] {
				items = append(items, item)
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}

	items, err := h.buildJellyfinDiscoverySnapshot(context.Background(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, item := range items {
		if item.ID == "mv-1" {
			t.Fatalf("MusicVideo-typed fixture item leaked into the Discovery snapshot: %+v", item)
		}
	}
	if len(items) != 1 || items[0].ID != "series-1" {
		t.Fatalf("expected only the Series fixture item to survive, got %+v", items)
	}
}
