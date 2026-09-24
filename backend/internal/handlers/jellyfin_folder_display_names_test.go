package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestHydrateJellyfinFolderDisplayNames_SingleFolderNoRemoteCall(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("jellyfin server must not be called for a single folder (D-14)")
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	folders := []models.JellyfinFolderOption{{JellyfinItemID: "item-main", IsMain: true}}

	got := h.hydrateJellyfinFolderDisplayNames(context.Background(), folders, nil)

	if len(got) != 1 || got[0].JellyfinItemID != "item-main" || got[0].FolderDisplayName != nil || got[0].FolderPath != nil {
		t.Fatalf("expected unchanged single folder, got %+v", got)
	}
}

func TestHydrateJellyfinFolderDisplayNames_MultipleFoldersOneBatchedCall(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		items := []map[string]any{
			{"Id": "item-main", "Name": "Main Folder", "Path": "/media/Show/Main"},
			{"Id": "item-extra-1", "Name": "Extras", "Path": "/media/Show/Extras"},
			{"Id": "item-extra-2", "Name": "OVA", "Path": "/media/Show/OVA"},
		}
		json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": len(items)})
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	folders := []models.JellyfinFolderOption{
		{JellyfinItemID: "item-main", IsMain: true},
		{JellyfinItemID: "item-extra-1"},
		{JellyfinItemID: "item-extra-2"},
	}

	got := h.hydrateJellyfinFolderDisplayNames(context.Background(), folders, nil)

	if calls != 1 {
		t.Fatalf("expected exactly 1 batched request, got %d", calls)
	}
	for _, folder := range got {
		if folder.FolderDisplayName == nil || *folder.FolderDisplayName == "" {
			t.Fatalf("expected FolderDisplayName populated for %s, got %+v", folder.JellyfinItemID, folder)
		}
		if folder.FolderPath == nil || *folder.FolderPath == "" {
			t.Fatalf("expected FolderPath populated for %s, got %+v", folder.JellyfinItemID, folder)
		}
	}
}

func TestHydrateJellyfinFolderDisplayNames_JellyfinErrorFailsOpen(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test-key", httpClient: server.Client()}
	mainPath := "/local/known/path"
	folders := []models.JellyfinFolderOption{
		{JellyfinItemID: "item-main", IsMain: true},
		{JellyfinItemID: "item-extra-1"},
		{JellyfinItemID: "item-extra-2"},
	}

	got := h.hydrateJellyfinFolderDisplayNames(context.Background(), folders, &mainPath)

	if len(got) != 3 {
		t.Fatalf("expected 3 folders unchanged in count, got %d", len(got))
	}
	if got[0].FolderDisplayName != nil {
		t.Fatalf("expected no display name on jellyfin error, got %+v", got[0])
	}
	if got[0].FolderPath == nil || *got[0].FolderPath != mainPath {
		t.Fatalf("expected main folder to keep local baseline path %q, got %+v", mainPath, got[0])
	}
	if got[1].FolderDisplayName != nil || got[1].FolderPath != nil {
		t.Fatalf("expected extra folder to stay bare on jellyfin error, got %+v", got[1])
	}
	if got[2].FolderDisplayName != nil || got[2].FolderPath != nil {
		t.Fatalf("expected extra folder to stay bare on jellyfin error, got %+v", got[2])
	}
}
