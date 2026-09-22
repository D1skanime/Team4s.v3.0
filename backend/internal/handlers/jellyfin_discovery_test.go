package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"sync/atomic"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Fakes ------------------------------------------------------------------------------

// fakeDiscoveryExistingMatchRepo is an in-memory jellyfinDiscoveryExistingMatchRepository
// fake with a call counter, proving the D-07 ≤1-query-per-page budget without a live
// Postgres instance.
type fakeDiscoveryExistingMatchRepo struct {
	matches []repository.ExistingJellyfinAnimeMatch
	calls   int
	err     error
}

func (f *fakeDiscoveryExistingMatchRepo) FindExistingAnimeByJellyfinIntakeRefs(
	_ context.Context,
	_ []string,
	_ []string,
) ([]repository.ExistingJellyfinAnimeMatch, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.matches, nil
}

// fakeLibraryDiscoveryIgnoreRepo is an in-memory libraryDiscoveryIgnoreRepository fake with a
// call counter for FindIgnoredLibraryDiscoveryItems, matching the fakeDiscoveryExistingMatchRepo
// pattern above.
type fakeLibraryDiscoveryIgnoreRepo struct {
	ignoredIDs  map[string]bool
	findCalls   int
	insertCalls int
	removeCalls int
	err         error
}

func (f *fakeLibraryDiscoveryIgnoreRepo) InsertLibraryDiscoveryIgnore(_ context.Context, itemID string, _ *int64) error {
	f.insertCalls++
	if f.err != nil {
		return f.err
	}
	if f.ignoredIDs == nil {
		f.ignoredIDs = map[string]bool{}
	}
	f.ignoredIDs[itemID] = true
	return nil
}

func (f *fakeLibraryDiscoveryIgnoreRepo) RemoveLibraryDiscoveryIgnore(_ context.Context, itemID string) error {
	f.removeCalls++
	if f.err != nil {
		return f.err
	}
	if f.ignoredIDs != nil {
		delete(f.ignoredIDs, itemID)
	}
	return nil
}

func (f *fakeLibraryDiscoveryIgnoreRepo) FindIgnoredLibraryDiscoveryItems(_ context.Context, itemIDs []string) (map[string]bool, error) {
	f.findCalls++
	if f.err != nil {
		return nil, f.err
	}
	result := make(map[string]bool)
	for _, id := range itemIDs {
		if f.ignoredIDs[id] {
			result[id] = true
		}
	}
	return result, nil
}

// --- Test harness helpers ----------------------------------------------------------------

func newDiscoverySnapshotServer(items []map[string]any) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
}

func newCountingDiscoverySnapshotServer(items []map[string]any) (*httptest.Server, *int32) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	return server, &calls
}

// newScaleDiscoverySnapshotServer simulates the live-measured ~2111-item Fansubs scale (D-29),
// respecting StartIndex/Limit pagination exactly like fetchJellyfinDiscoveryPages expects.
func newScaleDiscoverySnapshotServer(total int) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		startIndex, _ := strconv.Atoi(q.Get("StartIndex"))
		limit, _ := strconv.Atoi(q.Get("Limit"))
		end := startIndex + limit
		if end > total {
			end = total
		}
		items := make([]map[string]any, 0)
		if end > startIndex {
			items = make([]map[string]any, 0, end-startIndex)
			for i := startIndex; i < end; i++ {
				items = append(items, map[string]any{
					"Id":   fmt.Sprintf("item-%04d", i),
					"Name": fmt.Sprintf("Series %04d", i),
					"Path": fmt.Sprintf("/media/%04d", i),
				})
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": total})
	}))
}

func newDiscoveryTestHandler(
	serverURL string,
	httpClient *http.Client,
	existingRepo jellyfinDiscoveryExistingMatchRepository,
	ignoreRepo libraryDiscoveryIgnoreRepository,
) *AdminContentHandler {
	return &AdminContentHandler{
		authzRepo:                  stubAdminRoleChecker{allowed: true},
		adminRoleName:              "admin",
		jellyfinBaseURL:            serverURL,
		jellyfinAPIKey:             "test-key",
		httpClient:                 httpClient,
		discoveryExistingMatchRepo: existingRepo,
		libraryDiscoveryIgnoreRepo: ignoreRepo,
	}
}

func newDiscoveryTestRouter(handler *AdminContentHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/admin/jellyfin/discovery", withTestAdminIdentity(), handler.ListJellyfinDiscovery)
	return router
}

type discoveryListResponse struct {
	Data models.AdminJellyfinDiscoveryPage `json:"data"`
}

func performDiscoveryListRequest(t *testing.T, router *gin.Engine, target string) (int, discoveryListResponse) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var body discoveryListResponse
	if rec.Code == http.StatusOK {
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v (body=%s)", err, rec.Body.String())
		}
	}
	return rec.Code, body
}

// --- Test A: offen -------------------------------------------------------------------------

func TestJellyfinDiscovery_OpenStatus(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "s1", "Name": "Unknown Series", "Path": "/media/Anime/Serie/Anime.TV.Sub/Unknown Series"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 1 {
		t.Fatalf("expected 1 item, got %d (%+v)", len(body.Data.Items), body.Data.Items)
	}
	if body.Data.Items[0].Status != DiscoveryStatusOpen {
		t.Fatalf("expected status %q, got %q", DiscoveryStatusOpen, body.Data.Items[0].Status)
	}
}

// --- Test B: bereits vorhanden --------------------------------------------------------------

func TestJellyfinDiscovery_ExistingStatus(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "matched-1", "Name": "Matched Series", "Path": "/media/Anime/Serie/Anime.TV.Sub/Matched Series"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{
		matches: []repository.ExistingJellyfinAnimeMatch{
			{AnimeID: 42, Title: "Matched Series", Source: testStringPtr("jellyfin:matched-1")},
		},
	}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery?filter=alle")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(body.Data.Items))
	}
	item := body.Data.Items[0]
	if item.Status != DiscoveryStatusExisting {
		t.Fatalf("expected status %q, got %q", DiscoveryStatusExisting, item.Status)
	}
	if item.ExistingAnimeID == nil || *item.ExistingAnimeID != 42 {
		t.Fatalf("expected existing_anime_id 42, got %+v", item.ExistingAnimeID)
	}
}

// --- Test C: kein Fuzzy-Match ----------------------------------------------------------------

func TestJellyfinDiscovery_NoFuzzyMatchBetweenSimilarTitles(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "naruto-1", "Name": "Naruto", "Path": "/media/Anime/Serie/Anime.TV.Sub/Naruto"},
		{"Id": "naruto-2", "Name": "Naruto Shippuden", "Path": "/media/Anime/Serie/Anime.TV.Sub/Naruto Shippuden"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 2 {
		t.Fatalf("expected 2 distinct offen items (no fuzzy merge), got %d (%+v)", len(body.Data.Items), body.Data.Items)
	}
	for _, item := range body.Data.Items {
		if item.Status != DiscoveryStatusOpen {
			t.Fatalf("expected status %q for %q, got %q", DiscoveryStatusOpen, item.Name, item.Status)
		}
	}
}

// --- Test D: D-24 library_context -------------------------------------------------------------

func TestJellyfinDiscovery_LibraryContext_D24(t *testing.T) {
	path := "/media/Anime/Serie/Anime.TV.Sub/Naruto"
	server, calls := newCountingDiscoverySnapshotServer([]map[string]any{
		{"Id": "with-path", "Name": "Naruto", "Path": path},
		{"Id": "no-path", "Name": "No Path Series", "Path": ""},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery?filter=alle")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(body.Data.Items))
	}

	expectedParentContext, expectedLibraryContext := deriveJellyfinPathContexts(&path)

	var withPathItem, noPathItem *models.AdminJellyfinDiscoveryItem
	for i := range body.Data.Items {
		switch body.Data.Items[i].JellyfinItemID {
		case "with-path":
			withPathItem = &body.Data.Items[i]
		case "no-path":
			noPathItem = &body.Data.Items[i]
		}
	}
	if withPathItem == nil || noPathItem == nil {
		t.Fatalf("expected both fixture items present, got %+v", body.Data.Items)
	}

	if withPathItem.LibraryContext == nil || expectedLibraryContext == nil || *withPathItem.LibraryContext != *expectedLibraryContext {
		t.Fatalf("expected library_context %v (derived via deriveJellyfinPathContexts), got %v", expectedLibraryContext, withPathItem.LibraryContext)
	}
	if noPathItem.LibraryContext != nil {
		t.Fatalf("expected nil library_context for unparseable/empty path, got %v", *noPathItem.LibraryContext)
	}

	// GAP-03: parent_context must be set alongside library_context for the path-bearing item,
	// and match the FIRST return value of deriveJellyfinPathContexts (e.g. "Anime.TV.Sub" for
	// this fixture path), while staying nil for the item without a path.
	if withPathItem.ParentContext == nil || expectedParentContext == nil || *withPathItem.ParentContext != *expectedParentContext {
		t.Fatalf("expected parent_context %v (derived via deriveJellyfinPathContexts), got %v", expectedParentContext, withPathItem.ParentContext)
	}
	if noPathItem.ParentContext != nil {
		t.Fatalf("expected nil parent_context for unparseable/empty path, got %v", *noPathItem.ParentContext)
	}

	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("expected exactly 1 Jellyfin HTTP call (library_context is derived from the already-fetched Path, no extra request), got %d", got)
	}
}

// --- Test E: Movie sichtbar --------------------------------------------------------------------

func TestJellyfinDiscovery_MovieTypeHintVisible(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "movie-1", "Name": "Some Movie", "Path": "/media/Anime/Movie/Some Movie"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(body.Data.Items))
	}
	item := body.Data.Items[0]
	if item.TypeHint.SuggestedType == nil || *item.TypeHint.SuggestedType != "film" {
		t.Fatalf("expected film type hint, got %+v", item.TypeHint)
	}
}

// --- Test F: Pagination korrekt, kein Fan-out ----------------------------------------------

func TestJellyfinDiscovery_PaginationNoFanOut(t *testing.T) {
	names := []string{"Item A", "Item B", "Item C", "Item D", "Item E"}
	ids := []string{"id-a", "id-b", "id-c", "id-d", "id-e"}
	fixture := make([]map[string]any, 0, len(names))
	for i, name := range names {
		fixture = append(fixture, map[string]any{"Id": ids[i], "Name": name, "Path": "/media/" + ids[i]})
	}
	server := newDiscoverySnapshotServer(fixture)
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code1, page1 := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery?limit=2")
	if code1 != http.StatusOK {
		t.Fatalf("expected 200, got %d", code1)
	}
	if len(page1.Data.Items) != 2 {
		t.Fatalf("expected 2 items on page 1, got %d", len(page1.Data.Items))
	}
	if !page1.Data.HasMore {
		t.Fatalf("expected has_more=true on page 1")
	}
	if page1.Data.NextCursor == nil || *page1.Data.NextCursor == "" {
		t.Fatalf("expected a non-nil next_cursor on page 1")
	}
	if existingRepo.calls != 1 {
		t.Fatalf("expected exactly 1 FindExistingAnimeByJellyfinIntakeRefs call for page 1, got %d", existingRepo.calls)
	}
	if ignoreRepo.findCalls != 1 {
		t.Fatalf("expected exactly 1 ignore-lookup call for page 1, got %d", ignoreRepo.findCalls)
	}

	target2 := "/api/v1/admin/jellyfin/discovery?limit=2&cursor=" + url.QueryEscape(*page1.Data.NextCursor)
	code2, page2 := performDiscoveryListRequest(t, router, target2)
	if code2 != http.StatusOK {
		t.Fatalf("expected 200, got %d", code2)
	}
	if len(page2.Data.Items) != 2 {
		t.Fatalf("expected 2 items on page 2, got %d", len(page2.Data.Items))
	}
	if existingRepo.calls != 2 {
		t.Fatalf("expected exactly 1 additional FindExistingAnimeByJellyfinIntakeRefs call for page 2 (total 2), got %d", existingRepo.calls)
	}
	if ignoreRepo.findCalls != 2 {
		t.Fatalf("expected exactly 1 additional ignore-lookup call for page 2 (total 2), got %d", ignoreRepo.findCalls)
	}

	seen := make(map[string]bool, 4)
	for _, item := range page1.Data.Items {
		seen[item.JellyfinItemID] = true
	}
	for _, item := range page2.Data.Items {
		if seen[item.JellyfinItemID] {
			t.Fatalf("item %q appeared on both page 1 and page 2", item.JellyfinItemID)
		}
	}
}

// --- Test F2: D-29 scale ------------------------------------------------------------------

func TestJellyfinDiscovery_ScalePaginationAndBudget_D29(t *testing.T) {
	const total = 2111
	server := newScaleDiscoverySnapshotServer(total)
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	// Seek to just after item 1999 (0-indexed), landing on item 2000, matching the
	// (Name, JellyfinItemID) sort key the snapshot is sorted/paged by.
	cursor := repository.EncodeDiscoveryCursor("Series 1999", "item-1999")
	target := "/api/v1/admin/jellyfin/discovery?limit=50&cursor=" + url.QueryEscape(cursor)

	code, body := performDiscoveryListRequest(t, router, target)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 50 {
		t.Fatalf("expected exactly 50 items deep in the ~%d-item snapshot, got %d", total, len(body.Data.Items))
	}
	if !body.Data.HasMore {
		t.Fatalf("expected has_more=true (2111 - 2050 = 61 items remain)")
	}
	if body.Data.NextCursor == nil || *body.Data.NextCursor == "" {
		t.Fatalf("expected a non-nil next_cursor")
	}
	if body.Data.TotalSnapshotCount != total {
		t.Fatalf("expected total_snapshot_count=%d, got %d", total, body.Data.TotalSnapshotCount)
	}
	if body.Data.Items[0].JellyfinItemID != "item-2000" {
		t.Fatalf("expected the page to start at item-2000, got %q", body.Data.Items[0].JellyfinItemID)
	}
	if existingRepo.calls != 1 {
		t.Fatalf("expected exactly 1 FindExistingAnimeByJellyfinIntakeRefs call for this page, got %d", existingRepo.calls)
	}
	if ignoreRepo.findCalls != 1 {
		t.Fatalf("expected exactly 1 ignore-lookup call for this page, got %d", ignoreRepo.findCalls)
	}
}

// --- Test filter=ignoriert -----------------------------------------------------------------

func TestJellyfinDiscovery_FilterIgnored(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "ignored-1", "Name": "Ignored Series", "Path": "/media/ignored"},
		{"Id": "open-1", "Name": "Open Series", "Path": "/media/open"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{ignoredIDs: map[string]bool{"ignored-1": true}}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	codeIgnored, ignoredBody := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery?filter=ignoriert")
	if codeIgnored != http.StatusOK {
		t.Fatalf("expected 200, got %d", codeIgnored)
	}
	if len(ignoredBody.Data.Items) != 1 || ignoredBody.Data.Items[0].JellyfinItemID != "ignored-1" {
		t.Fatalf("expected only the ignored item under filter=ignoriert, got %+v", ignoredBody.Data.Items)
	}

	codeOpen, openBody := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery")
	if codeOpen != http.StatusOK {
		t.Fatalf("expected 200, got %d", codeOpen)
	}
	for _, item := range openBody.Data.Items {
		if item.JellyfinItemID == "ignored-1" {
			t.Fatalf("expected the ignored item to be excluded from the default (offen) filter")
		}
	}
	if len(openBody.Data.Items) != 1 || openBody.Data.Items[0].JellyfinItemID != "open-1" {
		t.Fatalf("expected only the open item under the default filter, got %+v", openBody.Data.Items)
	}
}

// --- GAP-02: has_more/next_cursor must reflect genuine filter-matching remainder --------------

// TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches proves that a raw snapshot page that
// contains items excluded by the status filter no longer produces a false-positive has_more=true.
func TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "id-a", "Name": "Series A", "Path": "/media/a"},
		{"Id": "id-b", "Name": "Series B", "Path": "/media/b"},
		{"Id": "id-c", "Name": "Series C", "Path": "/media/c"},
		{"Id": "id-d", "Name": "Series D", "Path": "/media/d"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{
		matches: []repository.ExistingJellyfinAnimeMatch{
			{AnimeID: 1, Title: "Series B", Source: testStringPtr("jellyfin:id-b")},
		},
	}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code, body := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if len(body.Data.Items) != 3 {
		t.Fatalf("expected exactly 3 open items (id-b excluded as existing), got %d: %+v", len(body.Data.Items), body.Data.Items)
	}
	if body.Data.HasMore {
		t.Fatalf("expected has_more=false: the 4th raw item does not match the offen filter")
	}
	if body.Data.NextCursor != nil {
		t.Fatalf("expected next_cursor=nil when has_more=false, got %q", *body.Data.NextCursor)
	}
}

// TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow proves the scan window
// extends past a `limit`-sized raw slice to collect `limit` filter-matching items, and that
// paginating with the resulting cursor never repeats or skips a filter-matching item.
func TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow(t *testing.T) {
	server := newDiscoverySnapshotServer([]map[string]any{
		{"Id": "id-a", "Name": "Series A", "Path": "/media/a"},
		{"Id": "id-b", "Name": "Series B", "Path": "/media/b"},
		{"Id": "id-c", "Name": "Series C", "Path": "/media/c"},
		{"Id": "id-d", "Name": "Series D", "Path": "/media/d"},
		{"Id": "id-e", "Name": "Series E", "Path": "/media/e"},
	})
	defer server.Close()

	existingRepo := &fakeDiscoveryExistingMatchRepo{
		matches: []repository.ExistingJellyfinAnimeMatch{
			{AnimeID: 1, Title: "Series B", Source: testStringPtr("jellyfin:id-b")},
			{AnimeID: 2, Title: "Series D", Source: testStringPtr("jellyfin:id-d")},
		},
	}
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	handler := newDiscoveryTestHandler(server.URL, server.Client(), existingRepo, ignoreRepo)
	router := newDiscoveryTestRouter(handler)

	code1, page1 := performDiscoveryListRequest(t, router, "/api/v1/admin/jellyfin/discovery?limit=2")
	if code1 != http.StatusOK {
		t.Fatalf("expected 200, got %d", code1)
	}
	if len(page1.Data.Items) != 2 {
		t.Fatalf("expected exactly 2 items on page 1, got %d: %+v", len(page1.Data.Items), page1.Data.Items)
	}
	if page1.Data.Items[0].JellyfinItemID != "id-a" || page1.Data.Items[1].JellyfinItemID != "id-c" {
		t.Fatalf("expected page 1 = [id-a, id-c] (id-b skipped as existing), got %+v", page1.Data.Items)
	}
	if !page1.Data.HasMore {
		t.Fatalf("expected has_more=true on page 1 (id-e still remains after id-d is filtered out)")
	}
	if page1.Data.NextCursor == nil || *page1.Data.NextCursor == "" {
		t.Fatalf("expected a non-nil next_cursor on page 1")
	}

	target2 := "/api/v1/admin/jellyfin/discovery?limit=2&cursor=" + url.QueryEscape(*page1.Data.NextCursor)
	code2, page2 := performDiscoveryListRequest(t, router, target2)
	if code2 != http.StatusOK {
		t.Fatalf("expected 200, got %d", code2)
	}
	if len(page2.Data.Items) != 1 || page2.Data.Items[0].JellyfinItemID != "id-e" {
		t.Fatalf("expected page 2 = [id-e], got %+v", page2.Data.Items)
	}
	if page2.Data.HasMore {
		t.Fatalf("expected has_more=false on page 2 (no items remain)")
	}

	seen := make(map[string]bool)
	for _, item := range page1.Data.Items {
		seen[item.JellyfinItemID] = true
	}
	for _, item := range page2.Data.Items {
		if seen[item.JellyfinItemID] {
			t.Fatalf("item %q appeared on both page 1 and page 2", item.JellyfinItemID)
		}
	}
}
