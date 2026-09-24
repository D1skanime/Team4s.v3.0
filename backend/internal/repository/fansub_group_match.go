package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"team4s.v3/backend/internal/models"
)

// fansubGroupMatchQuerier is a narrow interface (same shape as search_fansub.go's
// searchQuerier) so resolveFansubGroupMatches/suggestSimilarFansubGroups work against
// either *pgxpool.Pool directly or a pgx.Tx.
type fansubGroupMatchQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// fansubGroupSuggestionMaxLimit caps the number of trigram "did you mean" suggestions
// returned per unresolved candidate, per the UI-SPEC's "max 3 chips" (D-03).
const fansubGroupSuggestionMaxLimit = 3

// buildFansubGroupBatchMatchQuery returns the SQL for resolveFansubGroupMatches: ONE
// query that resolves every candidate in $1::text[] against fansub_groups.kuerzel/.name/
// .slug and fansub_group_aliases.normalized_alias, using the byte-exact production
// normalization expression regexp_replace(lower(f_unaccent(col)), '[^a-z0-9]+', '', 'g')
// (Pitfall 3) so the planner stays index-friendly. Tier precedence is
// kuerzel > alias > name > slug; a candidate with zero or more than one match within the
// winning tier is excluded entirely (ambiguous/no-match is the caller's problem to
// classify, not this query's).
func buildFansubGroupBatchMatchQuery() string {
	return `
WITH candidates AS (
	SELECT c.row_ord, c.raw_group
	FROM unnest($1::text[]) WITH ORDINALITY AS c(raw_group, row_ord)
),
kuerzel_hits AS (
	SELECT
		candidates.row_ord,
		candidates.raw_group,
		fansub_groups.id AS group_id,
		fansub_groups.name AS group_name,
		fansub_groups.slug AS group_slug,
		COUNT(*) OVER (PARTITION BY candidates.row_ord) AS hit_count
	FROM candidates
	JOIN fansub_groups
		ON fansub_groups.normalized_kuerzel = regexp_replace(lower(f_unaccent(candidates.raw_group)), '[^a-z0-9]+', '', 'g')
),
kuerzel_resolved AS (
	SELECT row_ord, raw_group, group_id, group_name, group_slug
	FROM kuerzel_hits
	WHERE hit_count = 1
),
alias_hits AS (
	SELECT
		candidates.row_ord,
		candidates.raw_group,
		fansub_groups.id AS group_id,
		fansub_groups.name AS group_name,
		fansub_groups.slug AS group_slug,
		fansub_group_aliases.id AS alias_id,
		fansub_group_aliases.alias AS alias_text,
		COUNT(*) OVER (PARTITION BY candidates.row_ord) AS hit_count
	FROM candidates
	JOIN fansub_group_aliases
		ON fansub_group_aliases.normalized_alias = regexp_replace(lower(f_unaccent(candidates.raw_group)), '[^a-z0-9]+', '', 'g')
	JOIN fansub_groups ON fansub_groups.id = fansub_group_aliases.fansub_group_id
	WHERE candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
),
alias_resolved AS (
	SELECT row_ord, raw_group, group_id, group_name, group_slug, alias_id, alias_text
	FROM alias_hits
	WHERE hit_count = 1
),
name_hits AS (
	SELECT
		candidates.row_ord,
		candidates.raw_group,
		fansub_groups.id AS group_id,
		fansub_groups.name AS group_name,
		fansub_groups.slug AS group_slug,
		COUNT(*) OVER (PARTITION BY candidates.row_ord) AS hit_count
	FROM candidates
	JOIN fansub_groups
		ON regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g')
		 = regexp_replace(lower(f_unaccent(candidates.raw_group)), '[^a-z0-9]+', '', 'g')
	WHERE candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
	  AND candidates.row_ord NOT IN (SELECT row_ord FROM alias_resolved)
),
name_resolved AS (
	SELECT row_ord, raw_group, group_id, group_name, group_slug
	FROM name_hits
	WHERE hit_count = 1
),
slug_hits AS (
	SELECT
		candidates.row_ord,
		candidates.raw_group,
		fansub_groups.id AS group_id,
		fansub_groups.name AS group_name,
		fansub_groups.slug AS group_slug,
		COUNT(*) OVER (PARTITION BY candidates.row_ord) AS hit_count
	FROM candidates
	JOIN fansub_groups
		ON regexp_replace(lower(f_unaccent(fansub_groups.slug)), '[^a-z0-9]+', '', 'g')
		 = regexp_replace(lower(f_unaccent(candidates.raw_group)), '[^a-z0-9]+', '', 'g')
	WHERE candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
	  AND candidates.row_ord NOT IN (SELECT row_ord FROM alias_resolved)
	  AND candidates.row_ord NOT IN (SELECT row_ord FROM name_resolved)
),
slug_resolved AS (
	SELECT row_ord, raw_group, group_id, group_name, group_slug
	FROM slug_hits
	WHERE hit_count = 1
)
SELECT row_ord, raw_group, group_id, group_name, group_slug, 'kuerzel' AS matched_via, NULL::bigint AS alias_id, NULL::text AS alias_text
FROM kuerzel_resolved
UNION ALL
SELECT row_ord, raw_group, group_id, group_name, group_slug, 'alias' AS matched_via, alias_id, alias_text
FROM alias_resolved
UNION ALL
SELECT row_ord, raw_group, group_id, group_name, group_slug, 'name' AS matched_via, NULL::bigint AS alias_id, NULL::text AS alias_text
FROM name_resolved
UNION ALL
SELECT row_ord, raw_group, group_id, group_name, group_slug, 'slug' AS matched_via, NULL::bigint AS alias_id, NULL::text AS alias_text
FROM slug_resolved
ORDER BY row_ord`
}

// buildFansubGroupSuggestionQuery returns the SQL for suggestSimilarFansubGroups: a
// SEPARATE, smaller trigram "did you mean" query (D-03), kept apart from the exact-match
// path so the equality-driven lookup above stays index-friendly (RESEARCH.md Section 4.1).
func buildFansubGroupSuggestionQuery() string {
	return `
SELECT fansub_groups.id, fansub_groups.name, fansub_groups.slug
FROM fansub_groups
WHERE f_unaccent(fansub_groups.name) % f_unaccent($1)
ORDER BY similarity(f_unaccent(fansub_groups.name), f_unaccent($1)) DESC
LIMIT $2`
}

// resolveFansubGroupMatches resolves an arbitrary-length batch of filename-derived
// candidate group strings against fansub_groups/fansub_group_aliases in exactly ONE SQL
// round trip, regardless of how many candidates are passed (D-08/D-20). Empty candidates
// are skipped before binding. Returns one FansubGroupMatch per candidate that resolved to
// exactly one group in its winning tier; ambiguous or unresolved candidates are simply
// absent from the result.
func resolveFansubGroupMatches(ctx context.Context, q fansubGroupMatchQuerier, candidates []string) ([]models.FansubGroupMatch, error) {
	filtered := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		filtered = append(filtered, candidate)
	}
	if len(filtered) == 0 {
		return nil, nil
	}

	rows, err := q.Query(ctx, buildFansubGroupBatchMatchQuery(), filtered)
	if err != nil {
		return nil, fmt.Errorf("query fansub group batch matches: %w", err)
	}
	defer rows.Close()

	matches := make([]models.FansubGroupMatch, 0, len(filtered))
	for rows.Next() {
		var (
			match    models.FansubGroupMatch
			aliasID  *int64
			aliasTxt *string
		)
		if err := rows.Scan(
			&match.RowOrdinal,
			&match.RawCandidate,
			&match.GroupID,
			&match.GroupName,
			&match.GroupSlug,
			&match.MatchedVia,
			&aliasID,
			&aliasTxt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub group batch match row: %w", err)
		}
		if match.MatchedVia == "alias" {
			match.MatchedAliasID = aliasID
			match.MatchedAlias = aliasTxt
		}
		matches = append(matches, match)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub group batch match rows: %w", err)
	}
	return matches, nil
}

// suggestSimilarFansubGroups returns up to limit (capped at fansubGroupSuggestionMaxLimit
// regardless of the caller-supplied value) trigram "did you mean" suggestions for a single
// unresolved candidate (D-03). Never auto-applied -- suggestion-only.
func suggestSimilarFansubGroups(ctx context.Context, q fansubGroupMatchQuerier, candidate string, limit int) ([]models.FansubGroupSuggestion, error) {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return nil, nil
	}
	if limit <= 0 || limit > fansubGroupSuggestionMaxLimit {
		limit = fansubGroupSuggestionMaxLimit
	}

	rows, err := q.Query(ctx, buildFansubGroupSuggestionQuery(), candidate, limit)
	if err != nil {
		return nil, fmt.Errorf("query fansub group suggestions: %w", err)
	}
	defer rows.Close()

	suggestions := make([]models.FansubGroupSuggestion, 0, limit)
	for rows.Next() {
		var suggestion models.FansubGroupSuggestion
		if err := rows.Scan(&suggestion.GroupID, &suggestion.GroupName, &suggestion.GroupSlug); err != nil {
			return nil, fmt.Errorf("scan fansub group suggestion row: %w", err)
		}
		suggestion.RawCandidate = candidate
		suggestions = append(suggestions, suggestion)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub group suggestion rows: %w", err)
	}
	return suggestions, nil
}
