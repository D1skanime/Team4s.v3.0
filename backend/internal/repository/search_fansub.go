package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

// buildSearchFansubQuery komponiert WHERE + ORDER-BY für die Fansub-Suche.
//
// D-04-Determinismus: Der Suchterm wird VOR dem Binden mit derselben Funktion
// normalisiert, die auch fansub_group_aliases.normalized_alias erzeugt
// (normalizeAliasKey — same package). qNorm wird als eigener $n-Bind-Parameter
// übergeben (NIE interpoliert). Die Spalten-Seite spiegelt den identischen
// Ausdruck via regexp_replace(lower(f_unaccent(<col>)), '[^a-z0-9]+', '', 'g'),
// sodass "team-4s"/"team 4s"/"T4S" die Gruppe "Team4s" deterministisch treffen —
// nicht per trgm-Zufall. Der trgm-%-Pfad bleibt nur für echte Tippfehler.
//
// D-11(1): KEIN impliziter Statusausschluss — aufgelöste (dissolved) Gruppen
// erscheinen; Status wird nur bei explizitem status=-Param gefiltert.
func buildSearchFansubQuery(f models.SearchQuery) (whereSQL string, orderSQL string, args []any) {
	conditions := make([]string, 0, 4)
	args = make([]any, 0, 4)
	argPos := 1

	var qPos, qNormPos int
	if f.Q != "" {
		qPos = argPos
		args = append(args, f.Q)
		argPos++
		qNormPos = argPos
		args = append(args, normalizeAliasKey(f.Q))
		argPos++

		conditions = append(conditions, fmt.Sprintf(`(
			f_unaccent(fansub_groups.name) %% f_unaccent($%[1]d)
			OR lower(fansub_groups.slug) LIKE lower($%[1]d) || '%%'
			OR regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g') = $%[2]d
			OR regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g') LIKE $%[2]d || '%%'
			OR regexp_replace(lower(f_unaccent(fansub_groups.slug)), '[^a-z0-9]+', '', 'g') = $%[2]d
			OR EXISTS (
				SELECT 1 FROM fansub_group_aliases fga
				WHERE fga.fansub_group_id = fansub_groups.id
				  AND (
					fga.normalized_alias = $%[2]d
					OR f_unaccent(fga.normalized_alias) %% f_unaccent($%[1]d)
				  )
			)
			OR fansub_groups.search_tsv @@ plainto_tsquery('simple', f_unaccent($%[1]d))
		)`, qPos, qNormPos))
	}

	// D-11(1): dissolved wird NICHT herausgefiltert. Nur expliziter status= filtert.
	if f.Status != nil && *f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("fansub_groups.status = $%d", argPos))
		args = append(args, *f.Status)
		argPos++
	}

	if len(conditions) > 0 {
		whereSQL = " WHERE " + strings.Join(conditions, " AND ")
	}

	orderSQL = buildSearchFansubOrder(f, qPos, qNormPos)
	return whereSQL, orderSQL, args
}

// buildSearchFansubOrder liefert die D-05-Rangstufen als ORDER-BY-CASE:
// (0) exaktes Kürzel = exakte normalisierte Gleichheit (Alias-normalized_alias ODER
// normalisierter Name), (1) exakter Name, (2) exakter Slug, (3) alt./früherer Name
// (weitere Aliase, trgm-normalisiert), (4) Teiltreffer Name (trgm), (5) Rest.
// Beschreibung entfällt in v1 (Open Question 4). Danach ts_rank; kein Popularitäts-
// signal für Fansub, Tie-Break alphabetisch.
func buildSearchFansubOrder(f models.SearchQuery, qPos, qNormPos int) string {
	if f.Q == "" {
		return "fansub_groups.name ASC"
	}
	return fmt.Sprintf(`
		CASE
			WHEN EXISTS (SELECT 1 FROM fansub_group_aliases fga WHERE fga.fansub_group_id = fansub_groups.id AND fga.normalized_alias = $%[2]d)
			  OR regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g') = $%[2]d THEN 0
			WHEN lower(f_unaccent(fansub_groups.name)) = lower(f_unaccent($%[1]d)) THEN 1
			WHEN lower(fansub_groups.slug) = lower($%[1]d) THEN 2
			WHEN EXISTS (SELECT 1 FROM fansub_group_aliases fga WHERE fga.fansub_group_id = fansub_groups.id AND f_unaccent(fga.normalized_alias) %% f_unaccent($%[1]d)) THEN 3
			WHEN f_unaccent(fansub_groups.name) %% f_unaccent($%[1]d) THEN 4
			ELSE 5
		END ASC,
		ts_rank(fansub_groups.search_tsv, plainto_tsquery('simple', f_unaccent($%[1]d))) DESC,
		fansub_groups.name ASC`, qPos, qNormPos)
}

// searchFansub führt Count + paginierte Trefferliste für Fansubgruppen aus.
// Erwartet einen searchQuerier, in dessen Transaktion bereits
// SET LOCAL pg_trgm.similarity_threshold gesetzt wurde.
func searchFansub(ctx context.Context, q searchQuerier, f models.SearchQuery) ([]models.SearchResultItem, int64, error) {
	whereSQL, orderSQL, args := buildSearchFansubQuery(f)

	var total int64
	countSQL := "SELECT COUNT(*) FROM fansub_groups" + whereSQL
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count search fansub: %w", err)
	}

	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (f.Page - 1) * f.PerPage

	listSQL := fmt.Sprintf(`
		SELECT fansub_groups.id, fansub_groups.slug, fansub_groups.name,
		       fansub_groups.status, fansub_groups.group_type, fansub_groups.founded_year
		FROM fansub_groups
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderSQL, limitPos, offsetPos)

	listArgs := append(append([]any{}, args...), f.PerPage, offset)
	rows, err := q.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query search fansub: %w", err)
	}
	defer rows.Close()

	items := make([]models.SearchResultItem, 0, f.PerPage)
	for rows.Next() {
		item := models.SearchResultItem{Type: "fansub"}
		var status, groupType *string
		if err := rows.Scan(
			&item.ID,
			&item.Slug,
			&item.Title,
			&status,
			&groupType,
			&item.Year,
		); err != nil {
			return nil, 0, fmt.Errorf("scan search fansub row: %w", err)
		}
		item.Status = status
		item.Format = groupType
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate search fansub rows: %w", err)
	}

	return items, total, nil
}
