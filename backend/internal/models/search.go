package models

import "context"

// SearchQuery bündelt die validierten Parameter der globalen Suche. Optionale
// Filter werden als Zeiger geführt (analog AdminAnimeFilter), damit "nicht gesetzt"
// eindeutig von "leerer Wert" unterscheidbar ist. Alle Werte fließen ausschließlich
// als $n-Bind-Parameter in die SQL-Schicht (nie String-interpoliert).
type SearchQuery struct {
	Q               string
	Type            string // "all" | "anime" | "fansub"
	YearFrom        *int16
	YearTo          *int16
	Genre           *string
	Tag             *string
	Format          *string // anime.type (Movie/TV/OVA …)
	Status          *string
	FansubGroup     *int64
	Page            int
	PerPage         int
	Sort            string
	IncludeDisabled bool // nur mit Admin-Identität true (D-11 Sichtbarkeit)
}

// SearchResultItem ist ein typ-diskriminierter Treffer (anime|fansub) mit einer
// gemeinsamen, schmalen Anzeigeform. Nullbare Spalten sind Zeiger.
type SearchResultItem struct {
	Type     string  `json:"type"` // "anime" | "fansub"
	ID       int64   `json:"id"`
	Slug     string  `json:"slug"`
	Title    string  `json:"title"`
	Subtitle *string `json:"subtitle,omitempty"`
	Year     *int16  `json:"year,omitempty"`
	Format   *string `json:"format,omitempty"` // anime.type bzw. fansub group_type
	Status   *string `json:"status,omitempty"`
	ImageURL *string `json:"image_url,omitempty"`
}

// SearchSuggestion ist ein leichter Autocomplete-Eintrag.
type SearchSuggestion struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	Slug  string `json:"slug,omitempty"`
}

// SearchEntityResult trägt Items + Total je Entitätstyp. Die Seiten-Metadaten
// (total/page/per_page/total_pages) baut der Handler-Envelope aus dem bestehenden
// Modell zusammen — hier bewusst NICHT neu definiert (Wiederverwendung).
type SearchEntityResult struct {
	Items []SearchResultItem `json:"items"`
	Total int64              `json:"total"`
}

// SearchResult aggregiert die Trefferlisten je durchsuchter Entität.
type SearchResult struct {
	Anime  SearchEntityResult `json:"anime"`
	Fansub SearchEntityResult `json:"fansub"`
}

// SearchProvider ist das schmale, dokumentierte Andockinterface (D-02). Erste und
// aktuell EINZIGE Implementierung ist der Postgres-Provider (repository.SearchRepository).
// Bewusst KEIN Factory/Registry/Multi-Provider-Switch — der Interface-Kontrakt bleibt
// der einzige Erweiterungspunkt, an dem ein späterer externer Provider (z. B.
// Meilisearch, D-10 / Plan 115-08) andocken kann, falls sich der Bedarf nachweist.
type SearchProvider interface {
	Search(ctx context.Context, query SearchQuery) (SearchResult, error)
	Suggest(ctx context.Context, query string) ([]SearchSuggestion, error)
}
