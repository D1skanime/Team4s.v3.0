package repository

// Cursor-Pagination-Helfer (AO4-03/AO4-24): Seek-basierte Nachlade-Pagination
// ausschliesslich fuer die drei nachladenden Listen (Release-Liste, Bildergalerie,
// Textliste). Additiv — bestehende Offset-Reads (GetGroupReleases, loadImages,
// loadNotes) bleiben unveraendert. Ein ungueltiger oder leerer Cursor startet
// bei der ersten Seite (kein Fehler, kein 400), passend zur "stiller Neustart"-
// Entscheidung aus dem Plan.

import (
	"encoding/base64"
	"strconv"
	"strings"
	"time"
)

const (
	// DefaultCursorPageLimit ist die Default-Seitengroesse, wenn der Client keinen
	// (oder einen ungueltigen) limit-Parameter setzt.
	DefaultCursorPageLimit = 24
	// MaxCursorPageLimit deckelt limit gegen Missbrauch (grosse Payloads/DoS).
	MaxCursorPageLimit = 100
)

// clampCursorLimit erzwingt 0 < limit <= MaxCursorPageLimit; Werte <= 0 fallen auf
// DefaultCursorPageLimit zurueck.
func clampCursorLimit(limit int) int {
	if limit <= 0 {
		return DefaultCursorPageLimit
	}
	if limit > MaxCursorPageLimit {
		return MaxCursorPageLimit
	}
	return limit
}

// trimCursorPage wendet die limit+1-Overfetch-Regel an: Werden (wie von den Repo-
// Methoden per "LIMIT limit+1" bewusst ueberfetched) mehr als limit Elemente
// geliefert, ist has_more=true, das Extra-Element wird abgeschnitten und
// next_cursor wird aus dem letzten verbleibenden Element gebildet (via cursorFn).
// Eine leere oder <= limit grosse Eingabe liefert has_more=false, next_cursor=nil.
func trimCursorPage[T any](items []T, limit int, cursorFn func(item T) string) (page []T, nextCursor *string, hasMore bool) {
	page = items
	if len(page) > limit {
		hasMore = true
		page = page[:limit]
	}
	if hasMore && len(page) > 0 {
		c := cursorFn(page[len(page)-1])
		nextCursor = &c
	}
	return page, nextCursor, hasMore
}

// --- Encode/Decode ---

// encodeCursorPair kodiert zwei formatierte Schluesselteile als Base64(part1|part2).
// "|" ist als Trennzeichen sicher, da part1/part2 stets aus formatierten
// Zahlen/Zeitstempeln bestehen, nie aus roher Nutzereingabe.
func encodeCursorPair(part1, part2 string) string {
	return base64.URLEncoding.EncodeToString([]byte(part1 + "|" + part2))
}

// decodeCursorPair dekodiert einen Cursor zurueck in seine zwei Teile. Ein leerer
// oder ungueltiger Cursor liefert ok=false (Aufrufer startet dann bei Seite 1).
func decodeCursorPair(cursor string) (part1, part2 string, ok bool) {
	if cursor == "" {
		return "", "", false
	}
	raw, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return "", "", false
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

// encodeInt32Int64Cursor kodiert einen (int32,int64)-Schluessel, genutzt fuer die
// Release-Liste (episode_number, rev.id) und die Bildergalerie (sort_order, id).
func encodeInt32Int64Cursor(first int32, second int64) string {
	return encodeCursorPair(strconv.FormatInt(int64(first), 10), strconv.FormatInt(second, 10))
}

// decodeInt32Int64Cursor dekodiert einen (int32,int64)-Cursor.
func decodeInt32Int64Cursor(cursor string) (first int32, second int64, ok bool) {
	p1, p2, ok := decodeCursorPair(cursor)
	if !ok {
		return 0, 0, false
	}
	f, err := strconv.ParseInt(p1, 10, 32)
	if err != nil {
		return 0, 0, false
	}
	s, err := strconv.ParseInt(p2, 10, 64)
	if err != nil {
		return 0, 0, false
	}
	return int32(f), s, true
}

// encodeTimeInt64Cursor kodiert einen (time.Time,int64)-Schluessel, genutzt fuer die
// Textliste (created_at, id). Die Zeit wird als RFC3339Nano-String kodiert (praezise
// und stabil sortierbar, unabhaengig von DB-Treiber-Zeitzonen-Darstellung).
func encodeTimeInt64Cursor(t time.Time, second int64) string {
	return encodeCursorPair(t.Format(time.RFC3339Nano), strconv.FormatInt(second, 10))
}

// decodeTimeInt64Cursor dekodiert einen (time.Time,int64)-Cursor.
func decodeTimeInt64Cursor(cursor string) (t time.Time, second int64, ok bool) {
	p1, p2, ok := decodeCursorPair(cursor)
	if !ok {
		return time.Time{}, 0, false
	}
	parsed, err := time.Parse(time.RFC3339Nano, p1)
	if err != nil {
		return time.Time{}, 0, false
	}
	s, err := strconv.ParseInt(p2, 10, 64)
	if err != nil {
		return time.Time{}, 0, false
	}
	return parsed, s, true
}
