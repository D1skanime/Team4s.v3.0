package models

// AdminJellyfinDiscoveryItem ist eine einzelne Zeile der admin-seitigen
// "Bibliothek durchsuchen"-Liste (GET /admin/jellyfin/discovery, 165-06). Die Feldform
// spiegelt AdminJellyfinIntakeSearchItem (admin_jellyfin_intake.go) für Konsistenz über
// beide Jellyfin-abgeleiteten Admin-Listenflächen, ergänzt um den aufgelösten D-17-Status
// und (D-24) library_context für die Karten-Metazeile "Typ | Bibliothek".
type AdminJellyfinDiscoveryItem struct {
	JellyfinItemID string                      `json:"jellyfin_item_id"`
	Name           string                      `json:"name"`
	ProductionYear *int                        `json:"year,omitempty"`
	Path           *string                     `json:"path,omitempty"`
	LibraryContext *string                     `json:"library_context,omitempty"`
	TypeHint       AdminJellyfinIntakeTypeHint `json:"type_hint"`
	PosterURL      *string                     `json:"poster_url,omitempty"`
	BannerURL      *string                     `json:"banner_url,omitempty"`
	// Status ist einer der DiscoveryStatus*-Werte aus jellyfin_discovery_status.go
	// (existing|ignored|partial|open), aufgelöst über resolveDiscoveryItemStatus (D-17).
	Status          string  `json:"status"`
	ExistingAnimeID *int64  `json:"existing_anime_id,omitempty"`
	ExistingTitle   *string `json:"existing_title,omitempty"`
}

// AdminJellyfinDiscoveryPage ist die cursor-paginierte Antwort-Hülle der Discovery-Liste.
type AdminJellyfinDiscoveryPage struct {
	Items      []AdminJellyfinDiscoveryItem `json:"items"`
	HasMore    bool                         `json:"has_more"`
	NextCursor *string                      `json:"next_cursor,omitempty"`
	// TotalSnapshotCount ist die Größe des vollständigen (ungefilterten) Jellyfin-Snapshots,
	// nicht die Anzahl der auf dieser Seite/mit diesem Filter zurückgegebenen Items.
	TotalSnapshotCount int `json:"total_snapshot_count"`
}
