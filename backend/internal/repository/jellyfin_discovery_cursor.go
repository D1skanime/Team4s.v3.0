package repository

// Discovery-Cursor-Codec (165-01, D-06/D-07/D-25, RESEARCH.md Pitfall 4): Seek-Pagination
// fuer die Jellyfin-Library-Discovery-Liste. Anders als alle bisherigen Cursor-Verwender in
// diesem Paket (siehe release_cursor_pagination.go) seekt Discovery NICHT gegen eine SQL
// ORDER BY-Sequenz, sondern gegen einen gecachten/in-memory Jellyfin-Snapshot, sortiert nach
// (Name, JellyfinItemID). Encode/Decode und die limit+1-Overfetch-Regel werden 1:1 aus
// release_cursor_pagination.go wiederverwendet (encodeCursorPair/decodeCursorPair/
// trimCursorPage/clampCursorLimit) — nur der Seek-Vergleich ist neu.
//
// "Stiller Neustart"-Konvention (identisch zu release_cursor_pagination.go:1-9): ein leerer
// oder ungueltiger Cursor liefert ok=false und der Aufrufer startet bei Seite 1 — kein Fehler.

import "strings"

// DefaultDiscoveryPageLimit ist die Richtwert-Seitengroesse fuer die Discovery-Liste
// (CONTEXT.md "Richtwert 50", Claude's Discretion). Gedeckelt durch das bestehende
// MaxCursorPageLimit (100), wie alle anderen Cursor-Verwender in diesem Paket.
const DefaultDiscoveryPageLimit = 50

// DiscoverySortKeyed wird von jedem Discovery-Snapshot-Item implementiert, das ueber
// SeekDiscoverySnapshot seekbar sein soll. Die Snapshot-Sortierung ist (Name
// case-insensitive, JellyfinItemID) — DiscoverySortKey liefert exakt dieses Schluesselpaar,
// damit spaetere Plaene (165-06) ihren eigenen, reicheren Discovery-Item-Typ ohne Kopie
// dieser Datei wiederverwenden koennen.
type DiscoverySortKeyed interface {
	DiscoverySortKey() (name string, jellyfinItemID string)
}

// jellyfinDiscoverySortKey ist der minimale Snapshot-Item-Typ fuer den Cursor-Seek selbst
// (Tests, sowie fuer Aufrufer, die keinen eigenen reicheren Typ brauchen).
type jellyfinDiscoverySortKey struct {
	Name           string
	JellyfinItemID string
}

// DiscoverySortKey implementiert DiscoverySortKeyed.
func (k jellyfinDiscoverySortKey) DiscoverySortKey() (string, string) {
	return k.Name, k.JellyfinItemID
}

// EncodeDiscoveryCursor kodiert eine Seek-Position (Name, JellyfinItemID) als
// Cursor-String. Wiederverwendet den bestehenden Base64(part1|part2)-Codec
// (encodeCursorPair, release_cursor_pagination.go) — keine neue Kodierung.
func EncodeDiscoveryCursor(name, jellyfinItemID string) string {
	return encodeCursorPair(name, jellyfinItemID)
}

// DecodeDiscoveryCursor dekodiert einen Discovery-Cursor zurueck in (name,
// jellyfinItemID). Ein leerer oder ungueltiger Cursor liefert ok=false und
// Nullwerte (stiller Neustart bei Seite 1, kein Fehler) — identische Konvention
// wie decodeCursorPair.
func DecodeDiscoveryCursor(cursor string) (name, jellyfinItemID string, ok bool) {
	return decodeCursorPair(cursor)
}

// SeekDiscoverySnapshot sucht in einem bereits nach (Name case-insensitive,
// JellyfinItemID) sortierten Snapshot per binaerer Suche die erste Position echt
// nach (afterName, afterItemID) und liefert von dort eine Seite via der
// bestehenden trimCursorPage-limit+1-Overfetch-Regel. afterName=="" &&
// afterItemID=="" bedeutet "Seek von Beginn des Snapshots" (Konvention fuer den
// stillen-Neustart-Fall aus DecodeDiscoveryCursor).
//
// Die binaere Suche macht den Seek zu einem gebundenen O(log n)-Scan ab der
// Resume-Position statt eines vollstaendigen linearen Rescans — bewusst so
// gebaut, weil der reale Snapshot ~2111 Items umfassen kann (D-29).
func SeekDiscoverySnapshot[T DiscoverySortKeyed](
	items []T,
	afterName, afterItemID string,
	limit int,
) (page []T, nextCursor *string, hasMore bool) {
	limit = clampCursorLimit(limit)

	startIdx := SeekDiscoveryStartIndex(items, afterName, afterItemID)

	remaining := items[startIdx:]
	return trimCursorPage(remaining, limit, func(item T) string {
		name, id := item.DiscoverySortKey()
		return EncodeDiscoveryCursor(name, id)
	})
}

// SeekDiscoveryStartIndex liefert den Index des ersten Elements eines bereits nach (Name
// case-insensitive, JellyfinItemID) sortierten Snapshots, dessen Schluessel echt nach
// (afterName, afterItemID) sortiert. afterName=="" && afterItemID=="" bedeutet "Seek von
// Beginn des Snapshots" (0). Exportiert, damit Aufrufer (z. B. buildJellyfinDiscoveryFilteredPage)
// den Seek unabhaengig von der limit+1-Overfetch-Regel aus SeekDiscoverySnapshot wiederverwenden
// koennen, ohne die Bin-Search-Logik zu duplizieren.
func SeekDiscoveryStartIndex[T DiscoverySortKeyed](items []T, afterName, afterItemID string) int {
	if afterName == "" && afterItemID == "" {
		return 0
	}
	afterNameLower := strings.ToLower(afterName)
	return seekDiscoveryStartIndex(items, afterNameLower, afterItemID)
}

// seekDiscoveryStartIndex liefert den Index des ersten Elements, dessen Schluessel
// echt nach (afterNameLower, afterItemID) sortiert (binaere Suche, Snapshot muss
// bereits sortiert sein).
func seekDiscoveryStartIndex[T DiscoverySortKeyed](items []T, afterNameLower, afterItemID string) int {
	lo, hi := 0, len(items)
	for lo < hi {
		mid := (lo + hi) / 2
		name, id := items[mid].DiscoverySortKey()
		if isDiscoveryKeyAfter(strings.ToLower(name), id, afterNameLower, afterItemID) {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo
}

// isDiscoveryKeyAfter vergleicht zwei (Name-lowercase, JellyfinItemID)-Schluesselpaare
// und meldet, ob (nameLower, itemID) echt nach (afterNameLower, afterItemID) liegt.
func isDiscoveryKeyAfter(nameLower, itemID, afterNameLower, afterItemID string) bool {
	if nameLower != afterNameLower {
		return nameLower > afterNameLower
	}
	return itemID > afterItemID
}
