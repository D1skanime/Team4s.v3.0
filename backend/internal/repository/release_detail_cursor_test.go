package repository

// Tests fuer die AO4-03/AO4-24 Cursor-Pagination-Helfer (release_cursor_pagination.go).
// Kein Live-DB-Test-Rig im Paket (siehe 99-07-SUMMARY.md) — die has_more/next_cursor-
// Semantik ist bewusst als reine Funktion (trimCursorPage) extrahiert, damit sie ohne
// DB getestet werden kann; die Repo-Methoden (GetGroupReleasesCursor,
// ListReleaseVersionImagesCursor, ListReleaseVersionNotesCursor) nutzen exakt diese
// Funktion, ihr Verhalten ist damit ueber diesen Test hinweg abgedeckt.

import (
	"encoding/base64"
	"strconv"
	"testing"
	"time"
)

func TestTrimCursorPage_HasMoreWhenOverfetched(t *testing.T) {
	// limit=2, 3 Elemente geliefert (limit+1 Overfetch) -> has_more=true,
	// Extra-Element wird NICHT ausgeliefert, next_cursor stammt vom letzten
	// verbleibenden Element (dem 2., nicht dem 3.).
	items := []int{10, 20, 30}
	page, nextCursor, hasMore := trimCursorPage(items, 2, func(item int) string {
		return strconv.Itoa(item)
	})

	if !hasMore {
		t.Fatalf("expected has_more=true when overfetched, got false")
	}
	if len(page) != 2 {
		t.Fatalf("expected page trimmed to limit=2, got %d items", len(page))
	}
	if page[0] != 10 || page[1] != 20 {
		t.Fatalf("expected page [10 20], got %v", page)
	}
	if nextCursor == nil {
		t.Fatalf("expected next_cursor to be set, got nil")
	}
	if *nextCursor != strconv.Itoa(20) {
		t.Fatalf("expected next_cursor derived from last kept item (20), got %q", *nextCursor)
	}
}

func TestTrimCursorPage_NoMoreWhenExactlyLimit(t *testing.T) {
	// limit=3, genau 3 Elemente (kein Overfetch) -> has_more=false, next_cursor=nil.
	items := []int{1, 2, 3}
	page, nextCursor, hasMore := trimCursorPage(items, 3, func(item int) string {
		return strconv.Itoa(item)
	})

	if hasMore {
		t.Fatalf("expected has_more=false when items == limit, got true")
	}
	if len(page) != 3 {
		t.Fatalf("expected all 3 items kept, got %d", len(page))
	}
	if nextCursor != nil {
		t.Fatalf("expected next_cursor=nil when has_more=false, got %v", *nextCursor)
	}
}

func TestTrimCursorPage_EmptyList(t *testing.T) {
	// Leere Liste -> has_more=false, next_cursor=null (AO4-03 Akzeptanzkriterium).
	var items []int
	page, nextCursor, hasMore := trimCursorPage(items, 24, func(item int) string {
		return strconv.Itoa(item)
	})

	if hasMore {
		t.Fatalf("expected has_more=false for empty list, got true")
	}
	if nextCursor != nil {
		t.Fatalf("expected next_cursor=nil for empty list, got %v", *nextCursor)
	}
	if len(page) != 0 {
		t.Fatalf("expected empty page, got %d items", len(page))
	}
}

func TestInt32Int64Cursor_RoundTrip(t *testing.T) {
	encoded := encodeInt32Int64Cursor(7, 12345)

	first, second, ok := decodeInt32Int64Cursor(encoded)
	if !ok {
		t.Fatalf("expected decode to succeed for a freshly encoded cursor")
	}
	if first != 7 || second != 12345 {
		t.Fatalf("expected (7, 12345), got (%d, %d)", first, second)
	}
}

func TestTimeInt64Cursor_RoundTrip(t *testing.T) {
	// UTC + feste Nanosekunden, um Monotonic-Clock-Reading-Effekte beim Vergleich
	// auszuschliessen.
	original := time.Date(2026, 7, 8, 10, 30, 0, 123456789, time.UTC)
	encoded := encodeTimeInt64Cursor(original, 42)

	decodedTime, second, ok := decodeTimeInt64Cursor(encoded)
	if !ok {
		t.Fatalf("expected decode to succeed for a freshly encoded cursor")
	}
	if !decodedTime.Equal(original) {
		t.Fatalf("expected decoded time %v to equal original %v", decodedTime, original)
	}
	if second != 42 {
		t.Fatalf("expected second=42, got %d", second)
	}
}

func TestDecodeCursorPair_InvalidOrEmptyStartsAtFirstPage(t *testing.T) {
	// Leerer Cursor -> ok=false (erste Seite).
	if _, _, ok := decodeCursorPair(""); ok {
		t.Fatalf("expected ok=false for empty cursor")
	}
	// Nicht-Base64 -> ok=false.
	if _, _, ok := decodeCursorPair("not valid base64!!"); ok {
		t.Fatalf("expected ok=false for invalid base64 cursor")
	}
	// Gueltiges Base64, aber ohne Trennzeichen -> ok=false.
	noSeparator := base64.URLEncoding.EncodeToString([]byte("no-separator"))
	if _, _, ok := decodeCursorPair(noSeparator); ok {
		t.Fatalf("expected ok=false for a cursor without the '|' separator")
	}

	// Die typisierten Decoder muessen bei ungueltigem Cursor ebenfalls ok=false
	// liefern, statt zu paniken oder Zufallswerte zu liefern.
	if _, _, ok := decodeInt32Int64Cursor(""); ok {
		t.Fatalf("expected decodeInt32Int64Cursor ok=false for empty cursor")
	}
	if _, _, ok := decodeTimeInt64Cursor("not valid base64!!"); ok {
		t.Fatalf("expected decodeTimeInt64Cursor ok=false for invalid cursor")
	}
}
