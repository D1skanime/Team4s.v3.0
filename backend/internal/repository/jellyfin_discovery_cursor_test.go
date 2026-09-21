package repository

import (
	"fmt"
	"testing"
)

func TestDiscoveryCursor_RoundTrip(t *testing.T) {
	t.Parallel()

	// Note: names containing "|" are out of scope here — encodeCursorPair/decodeCursorPair
	// (release_cursor_pagination.go) join/split on "|" and are reused verbatim per the plan
	// ("do not write a new base64 scheme"); their existing doc comment already documents this
	// limitation for callers whose parts are not always formatted numbers/timestamps.
	cases := []struct {
		name           string
		jellyfinItemID string
	}{
		{"Naruto", "abc-123"},
		{"", ""},
		{"Ünïcödé Serïé", "üü-id"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cursor := EncodeDiscoveryCursor(tc.name, tc.jellyfinItemID)
			gotName, gotID, ok := DecodeDiscoveryCursor(cursor)
			if !ok {
				t.Fatalf("expected ok=true for round trip of %q/%q", tc.name, tc.jellyfinItemID)
			}
			if gotName != tc.name || gotID != tc.jellyfinItemID {
				t.Fatalf("round trip mismatch: got (%q,%q), want (%q,%q)", gotName, gotID, tc.name, tc.jellyfinItemID)
			}
		})
	}
}

func TestDiscoveryCursor_InvalidCursorSilentRestart(t *testing.T) {
	t.Parallel()

	cases := []string{"", "not-base64!!", "###"}
	for _, cursor := range cases {
		t.Run(cursor, func(t *testing.T) {
			name, id, ok := DecodeDiscoveryCursor(cursor)
			if ok {
				t.Fatalf("expected ok=false for invalid cursor %q", cursor)
			}
			if name != "" || id != "" {
				t.Fatalf("expected zero-value strings for invalid cursor, got (%q,%q)", name, id)
			}
		})
	}
}

// discoverySnapshotFixture builds a snapshot pre-sorted by (Name, JellyfinItemID),
// matching the invariant SeekDiscoverySnapshot assumes.
func discoverySnapshotFixture(n int) []jellyfinDiscoverySortKey {
	items := make([]jellyfinDiscoverySortKey, n)
	for i := 0; i < n; i++ {
		items[i] = jellyfinDiscoverySortKey{
			Name:           fmt.Sprintf("Series %04d", i),
			JellyfinItemID: fmt.Sprintf("item-%04d", i),
		}
	}
	return items
}

func TestDiscoveryCursor_SeekSnapshot(t *testing.T) {
	t.Parallel()

	t.Run("empty snapshot", func(t *testing.T) {
		page, cursor, hasMore := SeekDiscoverySnapshot[jellyfinDiscoverySortKey](nil, "", "", 10)
		if len(page) != 0 || cursor != nil || hasMore {
			t.Fatalf("expected empty page for empty snapshot, got page=%v cursor=%v hasMore=%v", page, cursor, hasMore)
		}
	})

	t.Run("exactly limit items", func(t *testing.T) {
		items := discoverySnapshotFixture(10)
		page, cursor, hasMore := SeekDiscoverySnapshot(items, "", "", 10)
		if len(page) != 10 || hasMore || cursor != nil {
			t.Fatalf("expected exactly 10 items, no more: page=%d hasMore=%v cursor=%v", len(page), hasMore, cursor)
		}
	})

	t.Run("limit+1 items has_more true with cursor on last returned item", func(t *testing.T) {
		items := discoverySnapshotFixture(11)
		page, cursor, hasMore := SeekDiscoverySnapshot(items, "", "", 10)
		if len(page) != 10 || !hasMore || cursor == nil {
			t.Fatalf("expected 10 items + has_more: page=%d hasMore=%v cursor=%v", len(page), hasMore, cursor)
		}
		lastName, lastID := page[len(page)-1].DiscoverySortKey()
		gotName, gotID, ok := DecodeDiscoveryCursor(*cursor)
		if !ok || gotName != lastName || gotID != lastID {
			t.Fatalf("cursor does not encode last returned item: decoded=(%q,%q) ok=%v want=(%q,%q)", gotName, gotID, ok, lastName, lastID)
		}
	})

	t.Run("seek position at very end of snapshot", func(t *testing.T) {
		items := discoverySnapshotFixture(5)
		lastName, lastID := items[len(items)-1].DiscoverySortKey()
		page, cursor, hasMore := SeekDiscoverySnapshot(items, lastName, lastID, 10)
		if len(page) != 0 || cursor != nil || hasMore {
			t.Fatalf("expected empty page seeking from the last item: page=%d cursor=%v hasMore=%v", len(page), cursor, hasMore)
		}
	})

	t.Run("seek from middle returns the correct remainder", func(t *testing.T) {
		items := discoverySnapshotFixture(20)
		afterName, afterID := items[9].DiscoverySortKey()
		page, _, hasMore := SeekDiscoverySnapshot(items, afterName, afterID, 5)
		if len(page) != 5 || !hasMore {
			t.Fatalf("expected 5 items + has_more from the middle: page=%d hasMore=%v", len(page), hasMore)
		}
		gotName, _ := page[0].DiscoverySortKey()
		wantName, _ := items[10].DiscoverySortKey()
		if gotName != wantName {
			t.Fatalf("expected first page item to be item 10, got %q want %q", gotName, wantName)
		}
	})
}

// TestDiscoveryCursor_SeekSnapshotAtScale proves the seek is correct (and a bounded
// scan, not a full rescan) at the live-measured ~2111-item Fansubs Series scale
// (D-29, RESEARCH.md §17d) — not just on the small fixtures above.
func TestDiscoveryCursor_SeekSnapshotAtScale(t *testing.T) {
	t.Parallel()

	const scale = 2111
	items := discoverySnapshotFixture(scale)

	t.Run("from the start", func(t *testing.T) {
		page, _, hasMore := SeekDiscoverySnapshot(items, "", "", 50)
		if len(page) != 50 || !hasMore {
			t.Fatalf("expected 50 items + has_more from start: page=%d hasMore=%v", len(page), hasMore)
		}
		gotName, _ := page[0].DiscoverySortKey()
		wantName, _ := items[0].DiscoverySortKey()
		if gotName != wantName {
			t.Fatalf("expected first item of the snapshot, got %q want %q", gotName, wantName)
		}
	})

	t.Run("from a position near the middle", func(t *testing.T) {
		middle := scale / 2
		afterName, afterID := items[middle].DiscoverySortKey()
		page, _, hasMore := SeekDiscoverySnapshot(items, afterName, afterID, 50)
		if len(page) != 50 || !hasMore {
			t.Fatalf("expected 50 items + has_more from the middle: page=%d hasMore=%v", len(page), hasMore)
		}
		gotName, _ := page[0].DiscoverySortKey()
		wantName, _ := items[middle+1].DiscoverySortKey()
		if gotName != wantName {
			t.Fatalf("expected item right after the seek position, got %q want %q", gotName, wantName)
		}
	})

	t.Run("from a position near the very end", func(t *testing.T) {
		nearEnd := scale - 5
		afterName, afterID := items[nearEnd].DiscoverySortKey()
		page, cursor, hasMore := SeekDiscoverySnapshot(items, afterName, afterID, 50)
		if len(page) != 4 || hasMore || cursor != nil {
			t.Fatalf("expected the remaining 4 items with no more pages: page=%d hasMore=%v cursor=%v", len(page), hasMore, cursor)
		}
	})
}
