package handlers

// Discovery-Snapshot-Cache-Builder (165-01, D-06/D-19/D-27, RESEARCH.md §5/§13/§17).
//
// buildJellyfinDiscoverySnapshot baut den vollstaendigen Jellyfin-Library-Snapshot
// (Series+Movie) fuer die Discovery-Liste auf und spiegelt dabei BEIDE Zweige von
// searchJellyfinSeries (jellyfin_client_series.go:59-103):
//   - h.jellyfinAllowedLibraryIDs leer  -> EIN ungefilterter globaler /Items-Request
//     (kein ParentId). Das ist der Live-Produktions-Default heute (D-27), weil
//     docker-compose.yml JELLYFIN_ALLOWED_LIBRARY_IDS nicht an den Backend-Container
//     durchreicht.
//   - h.jellyfinAllowedLibraryIDs gesetzt -> ein Request je erlaubter Library
//     (ParentId-Filter), dedupliziert ueber alle Libraries.
//
// Beide Zweige teilen sich denselben defensiven StartIndex/Limit-Paginierungs-Loop
// (Sicherheitsnetz gegen eine undokumentierte Jellyfin-seitige Obergrenze auf grossen
// Antworten, RESEARCH.md §17b) und dasselbe schlanke Field-Set (Fields=Path, kein
// SearchTerm, keine Detail-Felder wie ProviderIds/Genres/Tags/Overview — die gehoeren
// ausschliesslich zum Detail-Fetch nach Auswahl, getJellyfinSeriesIntakeDetail).
//
// Das Ergebnis wird ueber ein injectable Interface (discoveryCacheStore, nicht der
// konkrete *redis.Client) mit TTL gecached, damit dieser Builder ohne laufendes Redis
// unit-testbar bleibt.

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	// discoverySnapshotCacheKey ist ein fester, nicht von Nutzereingaben abgeleiteter
	// Cache-Key (kein Cache-Key-Injection-Risiko, siehe Threat Register T-165-01).
	discoverySnapshotCacheKey = "jellyfin:discovery:snapshot:v1"
	// discoverySnapshotCacheTTL [ASSUMED] — RESEARCH.md §13 Assumption A5, aus
	// Messwerten abgeleitete Empfehlung (2,39s Full-Fetch-Latenz), kein im Code
	// vorgefundener Konventionswert.
	discoverySnapshotCacheTTL = 5 * time.Minute
	// discoverySnapshotPageLimit [ASSUMED] — defensiver StartIndex/Limit-Seitenwert
	// fuer den Paginierungs-Loop (RESEARCH.md §17b Sicherheitsnetz gegen eine
	// undokumentierte Jellyfin-Obergrenze auf der ungefilterten globalen Antwort).
	discoverySnapshotPageLimit = 500
)

// errDiscoveryCacheMiss signalisiert, dass discoveryCacheStore.Get keinen Wert fuer den
// angefragten Key hat (z. B. Redis-Nil). Kein Fehlerzustand fuer den Aufrufer — bedeutet
// nur "frisch von Jellyfin holen".
var errDiscoveryCacheMiss = errors.New("jellyfin discovery cache: miss")

// discoveryCacheStore ist die minimale Redis-Oberflaeche, die
// buildJellyfinDiscoverySnapshot braucht. Injectable, damit Tests keine laufende
// Redis-Instanz brauchen (RESEARCH.md §13/D-19).
type discoveryCacheStore interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
}

// jellyfinDiscoverySnapshotResponse ist eine eigene, lokale Antwortstruktur (bewusst
// getrennt von jellyfin_client_series.go's jellyfinSeriesListResponse, die
// TotalRecordCount nicht exponiert) fuer den paginierten Snapshot-Fetch.
type jellyfinDiscoverySnapshotResponse struct {
	Items            []jellyfinSeriesItem `json:"Items"`
	TotalRecordCount int                  `json:"TotalRecordCount"`
}

// buildJellyfinDiscoverySnapshot liefert den vollstaendigen, deduplizierten
// Series+Movie-Snapshot fuer die Discovery-Liste, cache-first (TTL) sofern ein
// discoveryCache konfiguriert ist. bypassCache=true ueberspringt den Cache-Read
// (fuer den "Bibliothek neu laden"-Button, 165-06/165-09), schreibt das frische
// Ergebnis aber trotzdem wieder in den Cache.
//
// Der eigentliche Fetch laeuft ueber h.discoverySnapshotGroup.Do (singleflight, GAP-15):
// eine TTL-Ablauf-Race oder zwei gleichzeitige "Aktualisieren"-Klicks buendeln sich damit in
// genau einen echten Jellyfin-Request statt N ueberlappenden. Alle wartenden Aufrufer teilen
// sich dasselbe Ergebnis (Erfolg oder Fehler).
func (h *AdminContentHandler) buildJellyfinDiscoverySnapshot(ctx context.Context, bypassCache bool) ([]jellyfinSeriesItem, error) {
	if !bypassCache {
		if cached, ok := h.readDiscoverySnapshotCache(ctx); ok {
			return cached, nil
		}
	}

	// context.Background() statt ctx: der geteilte Fetch darf nicht abbrechen, nur weil EIN
	// wartender Aufrufer seinen eigenen Request-Kontext storniert — die anderen gleichzeitigen
	// Aufrufer warten auf dasselbe In-Flight-Ergebnis und muessen es trotzdem bekommen.
	result, err, _ := h.discoverySnapshotGroup.Do(discoverySnapshotCacheKey, func() (any, error) {
		return h.fetchJellyfinDiscoverySnapshot(context.Background())
	})
	if err != nil {
		return nil, err
	}
	items, _ := result.([]jellyfinSeriesItem)

	h.writeDiscoverySnapshotCache(ctx, items)

	return items, nil
}

// readDiscoverySnapshotCache liest und dekodiert den gecachten Snapshot. Jeder
// Fehler (kein Cache konfiguriert, Miss, kaputtes JSON) fuehrt zu ok=false — der
// Aufrufer holt dann frisch von Jellyfin, es gibt keinen Fehlerpfad ueber den Cache.
func (h *AdminContentHandler) readDiscoverySnapshotCache(ctx context.Context) ([]jellyfinSeriesItem, bool) {
	if h.discoveryCache == nil {
		return nil, false
	}
	raw, err := h.discoveryCache.Get(ctx, discoverySnapshotCacheKey)
	if err != nil || raw == "" {
		return nil, false
	}
	var items []jellyfinSeriesItem
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return nil, false
	}
	return items, true
}

// writeDiscoverySnapshotCache schreibt den frischen Snapshot in den TTL-Cache
// (best effort — ein Schreibfehler darf den erfolgreichen Live-Fetch nicht
// scheitern lassen, dieselbe Konvention wie die uebrigen Best-Effort-Writes im Repo).
func (h *AdminContentHandler) writeDiscoverySnapshotCache(ctx context.Context, items []jellyfinSeriesItem) {
	if h.discoveryCache == nil {
		return
	}
	raw, err := json.Marshal(items)
	if err != nil {
		return
	}
	_ = h.discoveryCache.Set(ctx, discoverySnapshotCacheKey, string(raw), discoverySnapshotCacheTTL)
}

// fetchJellyfinDiscoverySnapshot spiegelt beide Zweige von searchJellyfinSeries
// (jellyfin_client_series.go:59-103), erweitert um Movie und defensive
// StartIndex/Limit-Paginierung (D-27).
func (h *AdminContentHandler) fetchJellyfinDiscoverySnapshot(ctx context.Context) ([]jellyfinSeriesItem, error) {
	baseValues := url.Values{}
	baseValues.Set("IncludeItemTypes", "Series,Movie")
	baseValues.Set("Recursive", "true")
	baseValues.Set("Fields", "Path")

	allowedIDs := h.jellyfinAllowedLibraryIDs

	if len(allowedIDs) == 0 {
		// Kein Filter: EIN ungefilterter globaler Request (paginiert). Live-Produktions-
		// Default heute (D-27) — docker-compose.yml reicht JELLYFIN_ALLOWED_LIBRARY_IDS
		// nicht durch, h.jellyfinAllowedLibraryIDs ist zur Laufzeit immer leer.
		return h.fetchJellyfinDiscoveryPages(ctx, baseValues)
	}

	// Gefiltert: ein (paginierter) Request je erlaubter Library, dedupliziert ueber
	// alle Libraries hinweg per Jellyfin-Item-ID (identische Dedup-Disziplin wie
	// searchJellyfinSeries).
	seen := make(map[string]struct{})
	var allItems []jellyfinSeriesItem
	for _, libraryID := range allowedIDs {
		libValues := url.Values{}
		for k, v := range baseValues {
			libValues[k] = v
		}
		libValues.Set("ParentId", libraryID)

		pageItems, err := h.fetchJellyfinDiscoveryPages(ctx, libValues)
		if err != nil {
			return nil, err
		}
		for _, item := range pageItems {
			itemID := strings.TrimSpace(item.ID)
			if itemID == "" {
				continue
			}
			if _, exists := seen[itemID]; exists {
				continue
			}
			seen[itemID] = struct{}{}
			allItems = append(allItems, item)
		}
	}
	return allItems, nil
}

// fetchJellyfinDiscoveryPages fragt einen einzelnen /Items-Filter-Zweig (global oder
// eine Library) vollstaendig ab, mit StartIndex/Limit-Paginierung als Sicherheitsnetz
// gegen eine undokumentierte Jellyfin-Obergrenze auf einer einzelnen Antwort
// (RESEARCH.md §17b). Dedupliziert defensiv auch innerhalb dieses einen Zweigs.
func (h *AdminContentHandler) fetchJellyfinDiscoveryPages(ctx context.Context, baseValues url.Values) ([]jellyfinSeriesItem, error) {
	seen := make(map[string]struct{})
	var allItems []jellyfinSeriesItem
	startIndex := 0

	for {
		values := url.Values{}
		for k, v := range baseValues {
			values[k] = v
		}
		values.Set("Limit", strconv.Itoa(discoverySnapshotPageLimit))
		values.Set("StartIndex", strconv.Itoa(startIndex))

		var payload jellyfinDiscoverySnapshotResponse
		if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
			return nil, err
		}

		pageLen := len(payload.Items)
		for _, item := range payload.Items {
			itemID := strings.TrimSpace(item.ID)
			if itemID == "" {
				continue
			}
			if _, exists := seen[itemID]; exists {
				continue
			}
			seen[itemID] = struct{}{}
			allItems = append(allItems, item)
		}

		if pageLen == 0 {
			break
		}
		startIndex += pageLen
		if pageLen < discoverySnapshotPageLimit {
			break
		}
		if payload.TotalRecordCount > 0 && startIndex >= payload.TotalRecordCount {
			break
		}
	}

	return allItems, nil
}
