package handlers

import "testing"

// TestCollectJellyfinFolderOptions_MultipleFoldersMainFirstAnisearchExcluded
// proves Test 1: given a main source plus a second jellyfin: source_links
// entry and an unrelated anisearch: entry, exactly the two jellyfin folders
// are returned, main first, with the anisearch entry excluded.
func TestCollectJellyfinFolderOptions_MultipleFoldersMainFirstAnisearchExcluded(t *testing.T) {
	t.Parallel()

	source := "jellyfin:abc"
	sourceLinks := []string{"jellyfin:abc", "jellyfin:def", "anisearch:999"}

	got := collectJellyfinFolderOptions(&source, sourceLinks, &source)

	if len(got) != 2 {
		t.Fatalf("expected 2 folder options, got %d: %+v", len(got), got)
	}
	if got[0].JellyfinItemID != "abc" || !got[0].IsMain {
		t.Fatalf("expected main folder abc first, got %+v", got[0])
	}
	if got[1].JellyfinItemID != "def" || got[1].IsMain {
		t.Fatalf("expected secondary folder def not marked main, got %+v", got[1])
	}
}

// TestCollectJellyfinFolderOptions_SingleFolderDeduplicatesSourceLinksDuplicate
// proves Test 2: today's regular single-folder case, where syncAnimeSourceLinks
// duplicates the main folder into source_links (RESEARCH.md §12), must not
// produce a duplicate entry.
func TestCollectJellyfinFolderOptions_SingleFolderDeduplicatesSourceLinksDuplicate(t *testing.T) {
	t.Parallel()

	source := "jellyfin:abc"
	sourceLinks := []string{"jellyfin:abc"}

	got := collectJellyfinFolderOptions(&source, sourceLinks, &source)

	if len(got) != 1 {
		t.Fatalf("expected exactly 1 deduplicated folder option, got %d: %+v", len(got), got)
	}
	if got[0].JellyfinItemID != "abc" || !got[0].IsMain {
		t.Fatalf("expected single main folder abc, got %+v", got[0])
	}
}
