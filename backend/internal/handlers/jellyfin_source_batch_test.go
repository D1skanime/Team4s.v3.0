package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestJellyfinSourceBatch_RequestCountsAndOwnership(t *testing.T) {
	for _, count := range []int{0, 1, 27, 100, 101, 201} {
		t.Run(strconv.Itoa(count), func(t *testing.T) {
			calls := 0
			allIDs := make([]string, count)
			for i := range allIDs {
				allIDs[i] = fmt.Sprintf("item-%03d", i)
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				q := r.URL.Query()
				if r.URL.Path != "/Items" || q.Get("Fields") != "MediaSources,MediaStreams,Path,ParentId" || q.Has("api_key") || r.Header.Get("Authorization") != `MediaBrowser Token="test-key"` {
					t.Errorf("wrong request: %s", r.URL.RequestURI())
				}
				ids := strings.Split(q.Get("Ids"), ",")
				if len(ids) > 100 || q.Get("Limit") != strconv.Itoa(len(ids)) || q.Get("EnableUserData") != "false" {
					t.Errorf("unbounded batch: %d", len(ids))
				}
				items := make([]map[string]any, 0, len(ids))
				for _, id := range ids {
					items = append(items, map[string]any{"Id": id, "SeriesId": "series-a", "ParentId": "season-a", "Type": "Episode", "Path": "/fixture/" + id + ".mkv", "MediaSources": []map[string]any{{"Id": "source-" + id, "Path": "/fixture/" + id + ".mkv", "Container": "mkv", "MediaStreams": []any{}}}})
				}
				slices.Reverse(items)
				json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
			}))
			defer server.Close()
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			requestIDs := slices.Clone(allIDs)
			if count > 0 {
				requestIDs = append(requestIDs, allIDs[0], " "+allIDs[0]+" ")
			}
			items, err := h.getJellyfinSourceItems(context.Background(), requestIDs)
			if err != nil || len(items) != count || calls != (count+99)/100 {
				t.Fatalf("count=%d items=%d calls=%d err=%v", count, len(items), calls, err)
			}
			for _, id := range allIDs {
				item, ok := items[id]
				if !ok || item.ID != id || item.SeriesID != "series-a" || item.ParentID != "season-a" || item.Type != "Episode" {
					t.Fatalf("ownership/identity lost: %+v", item)
				}
				resolved, err := resolveJellyfinMediaSource(item, nil)
				if err != nil || resolved.Snapshot.MediaSourceID != "source-"+id || !resolved.Snapshot.StreamsComplete {
					t.Fatalf("nested DTO incomplete: %+v %v", resolved, err)
				}
			}
			calls = 0
			f := &FansubHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			other, err := f.getJellyfinSourceItems(context.Background(), requestIDs)
			if err != nil || !reflect.DeepEqual(items, other) || calls != (count+99)/100 {
				t.Fatalf("fansub seam differs: calls=%d %v", calls, err)
			}
		})
	}
}

func TestJellyfinSourceBatch_RejectsInexactResults(t *testing.T) {
	for _, tt := range []struct{ name, body, kind string }{
		{"missing", `{"Items":[{"Id":"a"}],"TotalRecordCount":1}`, "missing"},
		{"duplicate", `{"Items":[{"Id":"a"},{"Id":"a"}],"TotalRecordCount":2}`, "duplicate"},
		{"extra", `{"Items":[{"Id":"a"},{"Id":"b"},{"Id":"other"}],"TotalRecordCount":3}`, "unexpected"},
		{"wrong", `{"Items":[{"Id":"other"}],"TotalRecordCount":1}`, "unexpected"},
		{"blank", `{"Items":[{"Id":""}],"TotalRecordCount":1}`, "unexpected"},
		{"inconsistent total", `{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":3}`, "incomplete"},
		{"negative total", `{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":-1}`, "incomplete"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; fmt.Fprint(w, tt.body) }))
			defer server.Close()
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			items, err := h.getJellyfinSourceItems(context.Background(), []string{"a", "b"})
			var diagnostic *jellyfinSourceBatchError
			if !errors.As(err, &diagnostic) || diagnostic.Kind != tt.kind || items != nil || calls != 1 {
				t.Fatalf("partial/inexact success: %+v %v calls=%d", items, err, calls)
			}
		})
	}
}

func TestJellyfinSourceBatch_ValidationAndCancellation(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; fmt.Fprint(w, `{"Items":[]}`) }))
	defer server.Close()
	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	for _, ids := range [][]string{{""}, {"a,b"}, {"a", " "}} {
		if _, err := h.getJellyfinSourceItems(context.Background(), ids); err == nil {
			t.Fatalf("invalid selection accepted: %q", ids)
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := h.getJellyfinSourceItems(ctx, []string{"a"}); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancellation lost: %v", err)
	}
	if calls != 0 {
		t.Fatalf("invalid/cancelled request reached server: %d", calls)
	}
}

func TestJellyfinSourceBatch_CancelsBetweenChunks(t *testing.T) {
	calls := 0
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		ids := strings.Split(r.URL.Query().Get("Ids"), ",")
		items := make([]jellyfinEpisodeItem, len(ids))
		for i, id := range ids {
			items[i].ID = id
		}
		json.NewEncoder(w).Encode(jellyfinEpisodeListResponse{Items: items})
		cancel()
	}))
	defer server.Close()
	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	ids := make([]string, 101)
	for i := range ids {
		ids[i] = fmt.Sprint(i)
	}
	items, err := h.getJellyfinSourceItems(ctx, ids)
	if err == nil || items != nil || calls != 1 {
		t.Fatalf("continued canceled selection: %d calls, %v", calls, err)
	}
}

func TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery(t *testing.T) {
	payload := read11eyesSourceFixture(t, "11eyes-series")
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.URL.Path != "/Shows/series/Episodes" || r.URL.Query().Get("Fields") != "MediaSources,MediaStreams,Path,ParentId" {
			t.Errorf("unexpected discovery: %s", r.URL.RequestURI())
		}
		json.NewEncoder(w).Encode(payload)
	}))
	defer server.Close()
	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	items, err := h.listJellyfinEpisodes(context.Background(), "series")
	if err != nil || len(items) != 27 || calls != 1 {
		t.Fatalf("collection: %d calls, %d items, %v", calls, len(items), err)
	}
	for _, item := range items {
		source, err := resolveJellyfinMediaSource(item, nil)
		if err != nil || source.Snapshot.SourcePath != item.Path || !source.Snapshot.StreamsComplete {
			t.Fatalf("source fields lost: %+v %v", source, err)
		}
	}
}

func TestJellyfinSourceBatch_EpisodeCollectionCompleteness(t *testing.T) {
	tests := []struct {
		name  string
		pages []string
		fail  bool
	}{
		{"paged", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":2}`, `{"Items":[{"Id":"b"}],"TotalRecordCount":2}`}, false},
		{"absent total", []string{`{"Items":[{"Id":"a"}]}`}, false},
		{"duplicate", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":2}`, `{"Items":[{"Id":"a"}],"TotalRecordCount":2}`}, true},
		{"empty partial", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":2}`, `{"Items":[],"TotalRecordCount":2}`}, true},
		{"total changed", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":2}`, `{"Items":[{"Id":"b"}],"TotalRecordCount":3}`}, true},
		{"total disappears", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":2}`, `{"Items":[{"Id":"b"}]}`}, true},
		{"exceeds total", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":0}`}, true},
		{"negative total", []string{`{"Items":[],"TotalRecordCount":-1}`}, true},
		{"missing ID", []string{`{"Items":[{}],"TotalRecordCount":1}`}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				index := calls
				calls++
				if index >= len(tt.pages) {
					t.Error("unbounded pagination")
					http.Error(w, "extra", 500)
					return
				}
				if index > 0 && r.URL.Query().Get("StartIndex") != strconv.Itoa(index) {
					t.Errorf("wrong offset: %s", r.URL.RawQuery)
				}
				fmt.Fprint(w, tt.pages[index])
			}))
			defer server.Close()
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			items, err := h.listJellyfinEpisodes(context.Background(), "series")
			if (err != nil) != tt.fail || (tt.fail && items != nil) || calls != len(tt.pages) {
				t.Fatalf("items=%+v calls=%d err=%v", items, calls, err)
			}
		})
	}
}

func TestJellyfinEpisodeDuration_UsesSelectedSourceAndExactItem(t *testing.T) {
	for _, tt := range []struct {
		name, raw string
		stored    *models.JellyfinSourceSnapshot
		seconds   int32
		fail      bool
	}{
		{"own", jellyfinCoherentSourceFixture, nil, 10, false},
		{"stored alternative", jellyfinCoherentSourceFixture, &models.JellyfinSourceSnapshot{MediaSourceID: "b"}, 20, false},
		{"lost stored", jellyfinCoherentSourceFixture, &models.JellyfinSourceSnapshot{MediaSourceID: "gone"}, 0, true},
		{"wrong item", `{"Id":"other","RunTimeTicks":100000000,"MediaSources":[{"Id":"source","RunTimeTicks":100000000}]}`, nil, 0, true},
		{"top-level only", `{"Id":"item","RunTimeTicks":100000000,"MediaSources":[{"Id":"source","MediaStreams":[]}]}`, nil, 0, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.URL.Query().Get("Ids") != "item" || strings.Contains(r.URL.Query().Get("Fields"), "RunTimeTicks") {
					t.Error("wrong duration query")
				}
				fmt.Fprintf(w, `{"Items":[%s],"TotalRecordCount":1}`, tt.raw)
			}))
			defer server.Close()
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			got, err := h.getJellyfinSourceDurationSeconds(context.Background(), "item", tt.stored)
			if (err != nil) != tt.fail || calls != 1 {
				t.Fatalf("duration error=%v calls=%d", err, calls)
			}
			if tt.seconds == 0 {
				if got != nil {
					t.Fatalf("invented duration=%d", *got)
				}
			} else if got == nil || *got != tt.seconds {
				t.Fatalf("duration=%v want=%d", got, tt.seconds)
			}
		})
	}
}

func TestJellyfinSourceBatch_UsesExistingNormalizedDecoder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=windows-1252")
		fmt.Fprint(w, "{\"Items\":[{\"Id\":\"a\",\"Name\":\"Kr\xe4fte\"}],\"TotalRecordCount\":1}")
	}))
	defer server.Close()
	h := &FansubHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	got, err := h.getJellyfinSourceItems(context.Background(), []string{"a"})
	if err != nil || got["a"].Name != "Kräfte" {
		t.Fatalf("decoder drift: %+v %v", got, err)
	}
}

func TestJellyfinSourceBatch_ServerFailure(t *testing.T) {
	for _, status := range []int{http.StatusNotFound, http.StatusUnauthorized, http.StatusInternalServerError} {
		t.Run(strconv.Itoa(status), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(status) }))
			defer server.Close()
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
			if items, err := h.getJellyfinSourceItems(context.Background(), []string{"a"}); err == nil || items != nil {
				t.Fatalf("HTTP %d accepted: %+v %v", status, items, err)
			}
		})
	}
}

// Compile-time proof the shared JSON decoder retains its existing signature.
var _ func(context.Context, string, url.Values, any) (int, error) = (*AdminContentHandler)(nil).fetchJellyfinJSON

func TestJellyfinSourceBatch_ChapterFieldsOptInOnly(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		fields := jellyfinSourceFields
		if calls == 1 {
			fields += ",Chapters"
		}
		if r.URL.Query().Get("Fields") != fields || r.URL.Query().Get("Ids") != "item" {
			t.Errorf("unexpected exact-item request: %s", r.URL.RequestURI())
		}
		fmt.Fprint(w, `{"Items":[{"Id":"item","Chapters":[]}],"TotalRecordCount":1}`)
	}))
	defer server.Close()
	items, err := fetchJellyfinSourceBatch(context.Background(), server.Client(), server.URL, "key", []string{"item"}, true)
	if err != nil || items["item"].Chapters == nil {
		t.Fatalf("chapter field missing: %v", err)
	}
	_, err = fetchJellyfinSourceBatch(context.Background(), server.Client(), server.URL, "key", []string{"item"})
	if err != nil || calls != 2 {
		t.Fatalf("request count=%d error=%v", calls, err)
	}
}
