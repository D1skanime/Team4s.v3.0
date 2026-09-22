package handlers

// ListJellyfinDiscovery (165-06, D-06/D-07/D-24/D-29): GET /admin/jellyfin/discovery.
// Composes the Wave-1 building blocks (165-01's snapshot cache/status resolver/cursor,
// 165-02's ignore repository) into the actual Discovery list HTTP endpoint, proving the
// ≤1-DB-query-per-page budget (D-07): exactly one FindExistingAnimeByJellyfinIntakeRefs call
// and one ignore-batch-lookup call per served page, regardless of snapshot size (5 items vs.
// the live-measured ~2111-item Fansubs scale, D-29) or page size.
//
// q (free-text) filtering runs against the full snapshot before sorting/paging (in-memory,
// no DB LIKE query). has_more/next_cursor now reflect genuine remaining matches for the
// requested status filter (offen/bereits_vorhanden/ignoriert/alle): the scan window used to
// collect `limit` filter-matching items may extend beyond `limit` raw snapshot entries, but
// the existence-/ignore-status lookup still runs at exactly one query per field per served
// page (D-07), regardless of how far that scan window reaches.

import (
	"context"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const (
	discoveryFilterOpen     = "offen"
	discoveryFilterExisting = "bereits_vorhanden"
	discoveryFilterIgnored  = "ignoriert"
	discoveryFilterAll      = "alle"
)

// jellyfinDiscoverySnapshotEntry wraps a jellyfinSeriesItem so it implements
// repository.DiscoverySortKeyed (165-01) for SeekDiscoverySnapshot, without copying the seek
// logic into this package.
type jellyfinDiscoverySnapshotEntry struct {
	item jellyfinSeriesItem
}

// DiscoverySortKey implements repository.DiscoverySortKeyed.
func (e jellyfinDiscoverySnapshotEntry) DiscoverySortKey() (string, string) {
	return strings.TrimSpace(e.item.Name), strings.TrimSpace(e.item.ID)
}

// ListJellyfinDiscovery handelt GET /admin/jellyfin/discovery.
func (h *AdminContentHandler) ListJellyfinDiscovery(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if !h.ensureJellyfinConfigured(c) {
		return
	}

	filter := strings.TrimSpace(c.Query("filter"))
	if filter == "" {
		filter = discoveryFilterOpen
	}
	switch filter {
	case discoveryFilterOpen, discoveryFilterExisting, discoveryFilterIgnored, discoveryFilterAll:
	default:
		badRequest(c, "ungültiger filter parameter")
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if len([]rune(query)) > 120 {
		badRequest(c, "ungültiger q parameter")
		return
	}

	limit := repository.DefaultDiscoveryPageLimit
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungültiger limit parameter")
			return
		}
		limit = value
	}
	if limit > repository.MaxCursorPageLimit {
		limit = repository.MaxCursorPageLimit
	}

	refresh := strings.TrimSpace(c.Query("refresh")) == "true"
	afterName, afterItemID, _ := repository.DecodeDiscoveryCursor(strings.TrimSpace(c.Query("cursor")))

	snapshot, err := h.buildJellyfinDiscoverySnapshot(c.Request.Context(), refresh)
	if err != nil {
		log.Printf("admin_content jellyfin_discovery: snapshot fetch failed (user_id=%d): %v", identity.UserID, err)
		message, code, details := classifyJellyfinUpstreamError(err, "jellyfin library discovery snapshot konnte nicht geladen werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return
	}

	entries := buildSortedJellyfinDiscoveryEntries(snapshot, query)
	startIdx := repository.SeekDiscoveryStartIndex(entries, afterName, afterItemID)
	remaining := entries[startIdx:]

	items, nextCursor, hasMore, err := h.buildJellyfinDiscoveryFilteredPage(c.Request.Context(), remaining, filter, limit)
	if err != nil {
		log.Printf("admin_content jellyfin_discovery: status lookup failed (user_id=%d): %v", identity.UserID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Jellyfin-Discovery-Status konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": models.AdminJellyfinDiscoveryPage{
			Items:              items,
			HasMore:            hasMore,
			NextCursor:         nextCursor,
			TotalSnapshotCount: len(snapshot),
		},
	})
}

// buildSortedJellyfinDiscoveryEntries wendet den `q`-Freitextfilter in-memory auf den
// vollstaendigen Snapshot an (kein DB LIKE) und sortiert das Ergebnis nach (Name
// case-insensitive, JellyfinItemID) — der von SeekDiscoverySnapshot vorausgesetzten Ordnung.
func buildSortedJellyfinDiscoveryEntries(snapshot []jellyfinSeriesItem, query string) []jellyfinDiscoverySnapshotEntry {
	lowerQuery := strings.ToLower(strings.TrimSpace(query))

	entries := make([]jellyfinDiscoverySnapshotEntry, 0, len(snapshot))
	for _, item := range snapshot {
		if lowerQuery != "" &&
			!strings.Contains(strings.ToLower(item.Name), lowerQuery) &&
			!strings.Contains(strings.ToLower(item.Path), lowerQuery) {
			continue
		}
		entries = append(entries, jellyfinDiscoverySnapshotEntry{item: item})
	}

	sort.SliceStable(entries, func(i, j int) bool {
		nameI, idI := entries[i].DiscoverySortKey()
		nameJ, idJ := entries[j].DiscoverySortKey()
		lowerI, lowerJ := strings.ToLower(nameI), strings.ToLower(nameJ)
		if lowerI == lowerJ {
			return idI < idJ
		}
		return lowerI < lowerJ
	})

	return entries
}

// buildJellyfinDiscoveryFilteredPage loest fuer das GESAMTE verbleibende (nur suchtext-gefilterte)
// Scan-Fenster `remaining` (nicht nur eine `limit`-grosse Rohseite, D-07-konform trotzdem exakt 1
// Existenz-Query + 1 Ignore-Query fuer dieses Fenster) den Existenz- und Ignore-Status auf und
// sammelt daraus die ersten `limit` Items, die tatsaechlich zu `filter` passen. has_more/next_cursor
// spiegeln damit echte verbleibende, zum Filter passende Treffer wider statt der rohen Restmenge.
func (h *AdminContentHandler) buildJellyfinDiscoveryFilteredPage(
	ctx context.Context,
	remaining []jellyfinDiscoverySnapshotEntry,
	filter string,
	limit int,
) ([]models.AdminJellyfinDiscoveryItem, *string, bool, error) {
	if len(remaining) == 0 {
		return []models.AdminJellyfinDiscoveryItem{}, nil, false, nil
	}

	seriesIDs := make([]string, 0, len(remaining))
	paths := make([]string, 0, len(remaining))
	for _, entry := range remaining {
		if id := strings.TrimSpace(entry.item.ID); id != "" {
			seriesIDs = append(seriesIDs, id)
		}
		if path := strings.TrimSpace(entry.item.Path); path != "" {
			paths = append(paths, path)
		}
	}

	existingMatches, err := h.discoveryExistingMatchRepo.FindExistingAnimeByJellyfinIntakeRefs(ctx, seriesIDs, paths)
	if err != nil {
		return nil, nil, false, err
	}
	existingBySource, existingByFolder := buildExistingJellyfinMatchLookup(existingMatches)

	ignored := map[string]bool{}
	if h.libraryDiscoveryIgnoreRepo != nil {
		ignored, err = h.libraryDiscoveryIgnoreRepo.FindIgnoredLibraryDiscoveryItems(ctx, seriesIDs)
		if err != nil {
			return nil, nil, false, err
		}
	}

	items := make([]models.AdminJellyfinDiscoveryItem, 0, limit)
	var nextCursor *string
	var hasMore bool
	for _, entry := range remaining {
		responseItem := buildAdminJellyfinDiscoveryItem(entry.item, existingBySource, existingByFolder, ignored)
		if !discoveryItemMatchesFilter(responseItem.Status, filter) {
			continue
		}

		if len(items) >= limit {
			hasMore = true
			break
		}

		items = append(items, responseItem)
		name, id := entry.DiscoverySortKey()
		cursor := repository.EncodeDiscoveryCursor(name, id)
		nextCursor = &cursor
	}

	if !hasMore {
		nextCursor = nil
	}

	return items, nextCursor, hasMore, nil
}

// buildAdminJellyfinDiscoveryItem erstellt ein einzelnes Discovery-Listen-Item. Wiederverwendet
// deriveJellyfinPathContexts (D-24 library_context), buildJellyfinIntakeTypeHint,
// buildGroupMediaImageURL und resolveExistingJellyfinIntakeMatch/resolveDiscoveryItemStatus
// verbatim aus der bestehenden Direkt-Suche- bzw. 165-01-Statuslogik — keine Zweitimplementierung.
func buildAdminJellyfinDiscoveryItem(
	item jellyfinSeriesItem,
	existingBySource map[string]repository.ExistingJellyfinAnimeMatch,
	existingByFolder map[string]repository.ExistingJellyfinAnimeMatch,
	ignored map[string]bool,
) models.AdminJellyfinDiscoveryItem {
	seriesID := strings.TrimSpace(item.ID)
	pathPtr := normalizeNullableStringPtr(item.Path)
	_, libraryContext := deriveJellyfinPathContexts(pathPtr)
	typeHint := buildJellyfinIntakeTypeHint(item.Name, pathPtr)

	match := resolveExistingJellyfinIntakeMatch(seriesID, pathPtr, existingBySource, existingByFolder)
	isIgnored := ignored[seriesID]
	// partial (D-15) bleibt hart auf false verdrahtet: Auftraggeber-Entscheidung
	// 2026-09-21 (option-c, 165-11-Checkpoint) stellt die Staffel-Zuordnung auf
	// unbestimmte Zeit zurück (nur 27/2111 Serien betroffen, Staffel-Fetch kostet
	// ~28s pro Reload) — siehe 165-CONTEXT.md D-15. Wird erst in einer künftigen
	// eigenständigen Phase "Mehrstaffel-Ordner" mit echten Daten verdrahtet.
	status := resolveDiscoveryItemStatus(match != nil, isIgnored, false)

	result := models.AdminJellyfinDiscoveryItem{
		JellyfinItemID: seriesID,
		Name:           strings.TrimSpace(item.Name),
		ProductionYear: item.ProductionYear,
		Path:           pathPtr,
		LibraryContext: libraryContext,
		TypeHint:       typeHint,
		PosterURL:      normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "primary", nil)),
		BannerURL:      normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "banner", nil)),
		Status:         status,
	}
	if match != nil {
		result.ExistingAnimeID = &match.AnimeID
		result.ExistingTitle = normalizeNullableStringPtr(match.Title)
	}

	return result
}

// discoveryItemMatchesFilter prueft, ob ein aufgeloester Item-Status zum angeforderten
// `filter`-Query-Parameter passt (D-17).
func discoveryItemMatchesFilter(status, filter string) bool {
	switch filter {
	case discoveryFilterAll:
		return true
	case discoveryFilterExisting:
		return status == DiscoveryStatusExisting
	case discoveryFilterIgnored:
		return status == DiscoveryStatusIgnored
	default: // discoveryFilterOpen
		return status == DiscoveryStatusOpen
	}
}
