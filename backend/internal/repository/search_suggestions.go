package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

// searchSuggestionsPerGroup begrenzt Autocomplete-Vorschläge je Entität serverseitig
// (D-09 — LIMIT als DoS-Schutz, analog dem LIMIT in admin_content.go ListGenreTokens).
const searchSuggestionsPerGroup = 5

// SearchSuggestions liefert die nach D-05-Rang (exakt → Präfix → Ähnlichkeit)
// sortierten und je Gruppe (Anime/Fansubgruppen) auf searchSuggestionsPerGroup
// begrenzten Autocomplete-Treffer. Die Präfix-Priorisierung ergibt sich aus dem
// bestehenden ORDER-BY-CASE der Such-Queries (search_anime.go / search_fansub.go);
// hier wird lediglich die Seitengröße auf den Gruppen-Cap gesetzt. Die Ausführung
// läuft — wie Search — in EINER Transaktion mit bewusst gesetzter trgm-Schwelle.
func (r *SearchRepository) SearchSuggestions(ctx context.Context, query string) (models.SearchResult, error) {
	var result models.SearchResult

	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return result, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, fmt.Errorf("begin suggestions tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, searchTrgmThresholdSQL); err != nil {
		return result, fmt.Errorf("set trgm threshold: %w", err)
	}

	q := models.SearchQuery{Q: trimmed, Type: "all", Page: 1, PerPage: searchSuggestionsPerGroup}

	animeItems, animeTotal, err := searchAnime(ctx, tx, q)
	if err != nil {
		return result, err
	}
	result.Anime = models.SearchEntityResult{Items: animeItems, Total: animeTotal}

	fansubItems, fansubTotal, err := searchFansub(ctx, tx, q)
	if err != nil {
		return result, err
	}
	result.Fansub = models.SearchEntityResult{Items: fansubItems, Total: fansubTotal}

	if err := tx.Commit(ctx); err != nil {
		return result, fmt.Errorf("commit suggestions tx: %w", err)
	}

	return result, nil
}
