package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SearchRepository ist die EINZIGE (Postgres-)Implementierung von
// models.SearchProvider. Kein Factory/Registry/Multi-Provider-Switch (D-02).
type SearchRepository struct {
	db *pgxpool.Pool
}

// NewSearchRepository konstruiert das Such-Repository (Muster wie AnimeRepository).
func NewSearchRepository(db *pgxpool.Pool) *SearchRepository {
	return &SearchRepository{db: db}
}

// Compile-time-Assertion: SearchRepository erfüllt den SearchProvider-Kontrakt.
var _ models.SearchProvider = (*SearchRepository)(nil)

// searchesAnime/searchesFansub entscheiden anhand des Typ-Diskriminators, welche
// Entitäten durchsucht werden ("" und "all" decken beide ab).
func searchesAnime(t string) bool  { return t == "" || t == "all" || t == "anime" }
func searchesFansub(t string) bool { return t == "" || t == "all" || t == "fansub" }

// Search dispatcht nach Query.Type und aggregiert Items + Total je Entität.
// Die gesamte Ausführung läuft in EINER Transaktion, in der zuerst die bewusste
// pg_trgm-Ähnlichkeitsschwelle via SET LOCAL gesetzt wird (D-04), damit der
// %-Operator deterministisch und index-nutzend arbeitet.
func (r *SearchRepository) Search(ctx context.Context, query models.SearchQuery) (models.SearchResult, error) {
	var result models.SearchResult

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, fmt.Errorf("begin search tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, searchTrgmThresholdSQL); err != nil {
		return result, fmt.Errorf("set trgm threshold: %w", err)
	}

	if searchesAnime(query.Type) {
		items, total, err := searchAnime(ctx, tx, query)
		if err != nil {
			return result, err
		}
		result.Anime = models.SearchEntityResult{Items: items, Total: total}
	}

	if searchesFansub(query.Type) {
		items, total, err := searchFansub(ctx, tx, query)
		if err != nil {
			return result, err
		}
		result.Fansub = models.SearchEntityResult{Items: items, Total: total}
	}

	if err := tx.Commit(ctx); err != nil {
		return result, fmt.Errorf("commit search tx: %w", err)
	}

	return result, nil
}

// Suggest liefert eine schmale Autocomplete-Liste (Präfix-Treffer über beide
// Entitäten). Nutzt dieselbe Transaktion + bewusste trgm-Schwelle wie Search.
func (r *SearchRepository) Suggest(ctx context.Context, query string) ([]models.SearchSuggestion, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return []models.SearchSuggestion{}, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin suggest tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, searchTrgmThresholdSQL); err != nil {
		return nil, fmt.Errorf("set trgm threshold: %w", err)
	}

	// Kompakte Wiederverwendung der Match-/Ranking-Komposition mit kleiner Seite.
	q := models.SearchQuery{Q: trimmed, Type: "all", Page: 1, PerPage: 10}

	suggestions := make([]models.SearchSuggestion, 0, 20)

	animeItems, _, err := searchAnime(ctx, tx, q)
	if err != nil {
		return nil, err
	}
	for _, item := range animeItems {
		suggestions = append(suggestions, models.SearchSuggestion{
			Type:  "anime",
			Value: item.Title,
			Slug:  item.Slug,
		})
	}

	fansubItems, _, err := searchFansub(ctx, tx, q)
	if err != nil {
		return nil, err
	}
	for _, item := range fansubItems {
		suggestions = append(suggestions, models.SearchSuggestion{
			Type:  "fansub",
			Value: item.Title,
			Slug:  item.Slug,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit suggest tx: %w", err)
	}

	return suggestions, nil
}
