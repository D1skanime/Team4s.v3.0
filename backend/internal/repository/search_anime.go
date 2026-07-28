package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// searchTrgmThresholdSQL setzt die pg_trgm-Ähnlichkeitsschwelle BEWUSST auf 0.30
// (nicht vom Session-Default abhängig, D-04). Wird von search_repository.go EINMAL
// pro Suchtransaktion via SET LOCAL ausgeführt, damit der %-Operator in
// search_anime.go / search_fansub.go deterministisch und index-nutzend arbeitet.
const searchTrgmThresholdSQL = "SET LOCAL pg_trgm.similarity_threshold = 0.30"

// searchQuerier abstrahiert *pgxpool.Pool und pgx.Tx, damit die Suchausführung
// innerhalb EINER Transaktion (mit SET LOCAL pg_trgm.similarity_threshold) laufen kann.
type searchQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// buildSearchAnimeQuery komponiert WHERE + ORDER-BY für die Anime-Suche.
// Alle q-/Filterwerte werden als $n-Bind-Parameter zurückgegeben — NIE interpoliert.
// Matching läuft indexgestützt über f_unaccent()+pg_trgm (statt der abgelösten
// ungeindexten Teilstring-Suche); Ranking als deterministische ORDER-BY-CASE-Stufen
// gemäß D-05 (Popularität nur als letzte Tie-Break-Ebene).
func buildSearchAnimeQuery(f models.SearchQuery) (whereSQL string, orderSQL string, args []any) {
	conditions := make([]string, 0, 8)
	args = make([]any, 0, 8)
	argPos := 1

	var qPos int
	if f.Q != "" {
		qPos = argPos
		args = append(args, f.Q)
		argPos++
		// Match: Haupttitel (trgm), Slug-Präfix, alle anime_titles-Typen (trgm),
		// tsvector-Volltext sowie Genre/Tag (trgm). Der %-Operator nutzt die
		// funktionalen GIN-Indizes aus Plan 115-02 dank bewusst gesetzter Schwelle.
		conditions = append(conditions, fmt.Sprintf(`(
			f_unaccent(anime.title) %% f_unaccent($%[1]d)
			OR lower(anime.slug) LIKE lower($%[1]d) || '%%'
			OR EXISTS (
				SELECT 1 FROM anime_titles at
				WHERE at.anime_id = anime.id
				  AND f_unaccent(at.title) %% f_unaccent($%[1]d)
			)
			OR anime.search_tsv @@ plainto_tsquery('simple', f_unaccent($%[1]d))
			OR EXISTS (
				SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
				WHERE ag.anime_id = anime.id AND f_unaccent(g.name) %% f_unaccent($%[1]d)
			)
			OR EXISTS (
				SELECT 1 FROM anime_tags atg JOIN tags t ON t.id = atg.tag_id
				WHERE atg.anime_id = anime.id AND f_unaccent(t.name) %% f_unaccent($%[1]d)
			)
		)`, qPos))
	}

	// D-11 Sichtbarkeit: expliziter status= überschreibt; sonst disabled ausblenden,
	// außer bei Admin-Identität (IncludeDisabled).
	if f.Status != nil && *f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("anime.status = $%d", argPos))
		args = append(args, *f.Status)
		argPos++
	} else if !f.IncludeDisabled {
		conditions = append(conditions, "anime.status <> 'disabled'")
	}

	// D-06 Filter (nur gesetzte anhängen).
	if f.Format != nil && *f.Format != "" {
		conditions = append(conditions, fmt.Sprintf("anime.type = $%d", argPos))
		args = append(args, *f.Format)
		argPos++
	}
	if f.YearFrom != nil {
		conditions = append(conditions, fmt.Sprintf("anime.year >= $%d", argPos))
		args = append(args, *f.YearFrom)
		argPos++
	}
	if f.YearTo != nil {
		conditions = append(conditions, fmt.Sprintf("anime.year <= $%d", argPos))
		args = append(args, *f.YearTo)
		argPos++
	}
	if f.Genre != nil && *f.Genre != "" {
		conditions = append(conditions, fmt.Sprintf(
			`EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
				WHERE ag.anime_id = anime.id AND lower(g.name) = lower($%d))`, argPos))
		args = append(args, *f.Genre)
		argPos++
	}
	if f.Tag != nil && *f.Tag != "" {
		conditions = append(conditions, fmt.Sprintf(
			`EXISTS (SELECT 1 FROM anime_tags atg JOIN tags t ON t.id = atg.tag_id
				WHERE atg.anime_id = anime.id AND lower(t.name) = lower($%d))`, argPos))
		args = append(args, *f.Tag)
		argPos++
	}
	if f.FansubGroup != nil {
		conditions = append(conditions, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM anime_fansub_groups afg WHERE afg.anime_id = anime.id AND afg.fansub_group_id = $%d)",
			argPos))
		args = append(args, *f.FansubGroup)
		argPos++
	}

	if len(conditions) > 0 {
		whereSQL = " WHERE " + strings.Join(conditions, " AND ")
	}

	orderSQL = buildSearchAnimeOrder(f, qPos)
	return whereSQL, orderSQL, args
}

// buildSearchAnimeOrder liefert die D-05-Rangstufen als ORDER-BY-CASE.
// Stufen: (0) exakter Haupttitel, (1) exakter alt. Titel, (2) Präfix, (3) trgm-
// Ähnlichkeit, (4) Genre/Tag-Treffer, (5) tsvector/Volltext, (6) Rest. Danach
// ts_rank; Popularität (view_count) NUR als letzte Tie-Break-Ebene vor dem
// alphabetischen Titel. Ein exakter Treffer wird so NIE durch Popularität verdrängt.
func buildSearchAnimeOrder(f models.SearchQuery, qPos int) string {
	if f.Q == "" {
		return "display_title ASC"
	}
	return fmt.Sprintf(`
		CASE
			WHEN lower(f_unaccent(anime.title)) = lower(f_unaccent($%[1]d)) THEN 0
			WHEN EXISTS (SELECT 1 FROM anime_titles at WHERE at.anime_id = anime.id AND lower(f_unaccent(at.title)) = lower(f_unaccent($%[1]d))) THEN 1
			WHEN lower(f_unaccent(anime.title)) LIKE lower(f_unaccent($%[1]d)) || '%%' THEN 2
			WHEN f_unaccent(anime.title) %% f_unaccent($%[1]d) THEN 3
			WHEN EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.anime_id = anime.id AND f_unaccent(g.name) %% f_unaccent($%[1]d))
			  OR EXISTS (SELECT 1 FROM anime_tags atg JOIN tags t ON t.id = atg.tag_id WHERE atg.anime_id = anime.id AND f_unaccent(t.name) %% f_unaccent($%[1]d)) THEN 4
			WHEN anime.search_tsv @@ plainto_tsquery('simple', f_unaccent($%[1]d)) THEN 5
			ELSE 6
		END ASC,
		ts_rank(anime.search_tsv, plainto_tsquery('simple', f_unaccent($%[1]d))) DESC,
		COALESCE(anime.view_count, 0) DESC,
		display_title ASC`, qPos)
}

// searchAnime führt Count + paginierte Trefferliste für Anime aus.
// Erwartet einen searchQuerier, in dessen Transaktion bereits
// SET LOCAL pg_trgm.similarity_threshold = 0.30 gesetzt wurde.
func searchAnime(ctx context.Context, q searchQuerier, f models.SearchQuery) ([]models.SearchResultItem, int64, error) {
	whereSQL, orderSQL, args := buildSearchAnimeQuery(f)

	var total int64
	countSQL := "SELECT COUNT(*) FROM anime" + whereSQL
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count search anime: %w", err)
	}

	displayTitle := primaryNormalizedTitleSQL("anime.id", "anime.title")
	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (f.Page - 1) * f.PerPage

	listSQL := fmt.Sprintf(`
		SELECT anime.id, anime.slug, %s AS display_title, anime.type, anime.status, anime.year, anime.cover_image
		FROM anime
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, displayTitle, whereSQL, orderSQL, limitPos, offsetPos)

	listArgs := append(append([]any{}, args...), f.PerPage, offset)
	rows, err := q.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query search anime: %w", err)
	}
	defer rows.Close()

	items := make([]models.SearchResultItem, 0, f.PerPage)
	for rows.Next() {
		item := models.SearchResultItem{Type: "anime"}
		var format, status, cover *string
		if err := rows.Scan(
			&item.ID,
			&item.Slug,
			&item.Title,
			&format,
			&status,
			&item.Year,
			&cover,
		); err != nil {
			return nil, 0, fmt.Errorf("scan search anime row: %w", err)
		}
		item.Format = format
		item.Status = status
		item.ImageURL = cover
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate search anime rows: %w", err)
	}

	return items, total, nil
}
