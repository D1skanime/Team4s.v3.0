package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"team4s.v3/backend/internal/models"
)

// AdminUserContributionsFilter trägt die optionalen, UND-verknüpften Filter
// für die neue gruppierte/paginierte ListUserContributions-Abfrage (Plan
// 139-03, D02-D14). AppUserID ist Pflicht — der kanonische Anker bleibt der
// verified member_claims-Datensatz (unverändert gegenüber der alten Query).
// Alle anderen Felder sind optional; ein nil/Zero-Wert bedeutet "kein Filter".
type AdminUserContributionsFilter struct {
	AppUserID      int64
	AnimeID        *int64
	FansubGroupID  *int64
	RoleCode       *string
	OnlyDeviations bool
	From           *time.Time
	To             *time.Time
	Limit          int
	Offset         int
}

// listUserContributionsGrouped implementiert D02-D10: serverseitige Gruppierung
// nach (anime_id, fansub_group_id), Standard-Bereichs-Zusammenfassung über
// episodes.sort_index (niemals interne IDs), semantischer Override-Diff
// gegen den Projektstandard (nicht snapshot_mode) und Paginierung auf
// Projekt-Block-Ebene (nie auf Rohzeilen). Alles in EINEM Round-Trip (plus
// der separaten, datenvolumen-unabhängigen FilterOptions-Abfrage weiter
// unten — QUAL-06 erlaubt das explizit für O(1)-Lookups).
func (r *AdminUsersRepository) listUserContributionsGrouped(
	ctx context.Context,
	filter AdminUserContributionsFilter,
) (*models.AdminUserContributionsPage, error) {
	empty := &models.AdminUserContributionsPage{
		Data:          []models.AdminContributionProjectBlock{},
		Meta:          models.AdminListMeta{Limit: filter.Limit, Offset: filter.Offset},
		FilterOptions: models.AdminContributionFilterOptions{Animes: []models.AdminFilterOption{}, Groups: []models.AdminFilterOption{}},
	}

	// member_id des Users über verified claim ermitteln (kanonischer Anker,
	// unverändert gegenüber der alten Query).
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT mc.member_id FROM member_claims mc
		WHERE mc.app_user_id = $1 AND mc.claim_status = 'verified'
		ORDER BY mc.id LIMIT 1
	`, filter.AppUserID).Scan(&memberID)
	if errors.Is(err, pgx.ErrNoRows) {
		limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)
		empty.Meta.Limit = limit
		empty.Meta.Offset = offset
		return empty, nil
	}
	if err != nil {
		return nil, fmt.Errorf("list user contributions grouped: resolve member: %w", err)
	}

	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	rows, err := r.db.Query(ctx, adminUserContributionsGroupedQuery,
		memberID,
		filter.AnimeID,
		filter.FansubGroupID,
		filter.RoleCode,
		filter.From,
		filter.To,
		filter.OnlyDeviations,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list user contributions grouped: %w", err)
	}
	defer rows.Close()

	result := &models.AdminUserContributionsPage{
		Data: []models.AdminContributionProjectBlock{},
		Meta: models.AdminListMeta{Limit: limit, Offset: offset},
	}
	var total int
	for rows.Next() {
		var block models.AdminContributionProjectBlock
		var standardRoleCodes []string
		var standardContributorLabels []string
		var rangeEntriesJSON []byte
		if err := rows.Scan(
			&block.AnimeID,
			&block.AnimeTitle,
			&block.FansubGroupID,
			&block.FansubGroupName,
			&standardRoleCodes,
			&standardContributorLabels,
			&rangeEntriesJSON,
			&total,
		); err != nil {
			return nil, fmt.Errorf("list user contributions grouped: scan: %w", err)
		}
		block.ProjectStandard = models.AdminContributionStandardSummary{
			RoleCodes:         standardRoleCodes,
			ContributorLabels: standardContributorLabels,
		}
		var entries []models.AdminContributionRangeEntry
		if len(rangeEntriesJSON) > 0 {
			if err := json.Unmarshal(rangeEntriesJSON, &entries); err != nil {
				return nil, fmt.Errorf("list user contributions grouped: decode range entries: %w", err)
			}
		}
		block.RangeEntries = entries
		result.Data = append(result.Data, block)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list user contributions grouped: iterate: %w", err)
	}
	result.Meta.Total = total

	filterOptions, err := r.loadUserContributionFilterOptions(ctx, memberID)
	if err != nil {
		return nil, fmt.Errorf("list user contributions grouped: filter options: %w", err)
	}
	result.FilterOptions = *filterOptions

	return result, nil
}

// loadUserContributionFilterOptions lädt die verfügbaren Anime-/Gruppen-Filter,
// beschränkt auf die Beitragshistorie DIESES Users (niemals der gesamte
// Katalog) — unabhängig von den aktuell gewählten Filtern, damit ein Admin
// zwischen Filtern wechseln kann. O(1) bezüglich der Datenmenge (ein
// zusätzlicher Round-Trip, keine Pro-Zeile-Abfrage, QUAL-06-konform).
func (r *AdminUsersRepository) loadUserContributionFilterOptions(
	ctx context.Context,
	memberID int64,
) (*models.AdminContributionFilterOptions, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ac.anime_id, a.title, ac.fansub_group_id, fg.name
		FROM anime_contributions ac
		JOIN anime a ON a.id = ac.anime_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		WHERE ac.member_id = $1
		ORDER BY a.title, fg.name
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load filter options: %w", err)
	}
	defer rows.Close()

	animeSeen := map[int64]bool{}
	groupSeen := map[int64]bool{}
	options := &models.AdminContributionFilterOptions{
		Animes: []models.AdminFilterOption{},
		Groups: []models.AdminFilterOption{},
	}
	for rows.Next() {
		var animeID, groupID int64
		var animeTitle, groupName string
		if err := rows.Scan(&animeID, &animeTitle, &groupID, &groupName); err != nil {
			return nil, fmt.Errorf("load filter options: scan: %w", err)
		}
		if !animeSeen[animeID] {
			animeSeen[animeID] = true
			options.Animes = append(options.Animes, models.AdminFilterOption{ID: animeID, Name: animeTitle})
		}
		if !groupSeen[groupID] {
			groupSeen[groupID] = true
			options.Groups = append(options.Groups, models.AdminFilterOption{ID: groupID, Name: groupName})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load filter options: iterate: %w", err)
	}
	return options, nil
}

// adminUserContributionsGroupedQuery ist die Kernabfrage für D02-D10.
//
// Aufbau:
//  1. base: gefilterte, pro anime_contributions-Zeile aggregierte Rollen
//     (server-seitige Filter VOR der Gruppierung, D10; nur $N-Platzhalter,
//     nie String-Konkatenation, T-139-04).
//  2. standards: die (höchstens eine) release_version_id-IS-NULL-Zeile pro
//     (anime_id, fansub_group_id) — der Projektstandard (D03).
//  3. version_rows/diffed: für jede release_version_id-Zeile ein SEMANTISCHER
//     Diff (Rollen-Set-Vergleich) gegen den Projektstandard — niemals
//     snapshot_mode als Override-Beweis (D04/D05, F-03).
//  4. ranged_flags/ranged: Gap-and-Island-Fensterfunktion über
//     episodes.sort_index (niemals interne IDs, D07) — echte Abweichungen
//     brechen den Bereich und bleiben einzeln sichtbar (D06).
//  5. range_entries/projects/project_blocks: ein Eintrag pro
//     (anime_id, fansub_group_id)-Block (D02), inkl. Projektstandard-Zeile
//     auch dann, wenn (noch) keine Release-Version-Zeilen existieren.
//  6. filtered_blocks/paged: COUNT(*) OVER() auf den GRUPPIERTEN Blöcken
//     (D09), Paginierung auf Block-Ebene (D08) — nie auf Rohzeilen.
const adminUserContributionsGroupedQuery = `
WITH base AS (
    SELECT
        ac.id AS contribution_id,
        ac.anime_id,
        a.title AS anime_title,
        ac.fansub_group_id,
        fg.name AS fansub_group_name,
        ac.release_version_id,
        COALESCE(
            ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL),
            ARRAY[]::text[]
        ) AS role_codes,
        rv.version AS release_version_label,
        ep.episode_number,
        ep.sort_index
    FROM anime_contributions ac
    JOIN anime a ON a.id = ac.anime_id
    JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
    LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
    LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
    LEFT JOIN fansub_releases fr ON fr.id = rv.release_id
    LEFT JOIN episodes ep ON ep.id = fr.episode_id
    WHERE ac.member_id = $1
      AND ($2::bigint IS NULL OR ac.anime_id = $2)
      AND ($3::bigint IS NULL OR ac.fansub_group_id = $3)
      AND ($4::text IS NULL OR EXISTS (
          SELECT 1 FROM anime_contribution_roles acr2
          WHERE acr2.anime_contribution_id = ac.id AND acr2.role_code = $4
      ))
      AND ($5::timestamptz IS NULL OR ac.created_at >= $5)
      AND ($6::timestamptz IS NULL OR ac.created_at <= $6)
    GROUP BY ac.id, ac.anime_id, a.title, ac.fansub_group_id, fg.name,
             ac.release_version_id, rv.version, ep.episode_number, ep.sort_index
),
standards AS (
    SELECT anime_id, fansub_group_id, role_codes AS standard_role_codes
    FROM base
    WHERE release_version_id IS NULL
),
projects AS (
    SELECT DISTINCT anime_id, anime_title, fansub_group_id, fansub_group_name FROM base
),
version_rows AS (
    SELECT
        b.contribution_id, b.anime_id, b.anime_title, b.fansub_group_id, b.fansub_group_name,
        b.release_version_id, b.role_codes, b.release_version_label, b.episode_number, b.sort_index,
        ARRAY(
            SELECT unnest(b.role_codes)
            EXCEPT
            SELECT unnest(COALESCE(s.standard_role_codes, ARRAY[]::text[]))
        ) AS extra_roles,
        ARRAY(
            SELECT unnest(COALESCE(s.standard_role_codes, ARRAY[]::text[]))
            EXCEPT
            SELECT unnest(b.role_codes)
        ) AS missing_roles
    FROM base b
    LEFT JOIN standards s ON s.anime_id = b.anime_id AND s.fansub_group_id = b.fansub_group_id
    WHERE b.release_version_id IS NOT NULL
),
diffed AS (
    SELECT *,
        (cardinality(extra_roles) > 0 OR cardinality(missing_roles) > 0) AS is_deviation
    FROM version_rows
),
ranged_flags AS (
    SELECT *,
        CASE
            WHEN is_deviation THEN true
            WHEN LAG(is_deviation) OVER w IS DISTINCT FROM false THEN true
            WHEN sort_index IS DISTINCT FROM (LAG(sort_index) OVER w + 1) THEN true
            ELSE false
        END AS starts_new_range
    FROM diffed
    WINDOW w AS (PARTITION BY anime_id, fansub_group_id ORDER BY sort_index NULLS LAST, contribution_id)
),
ranged AS (
    SELECT *,
        SUM(CASE WHEN starts_new_range THEN 1 ELSE 0 END)
            OVER (PARTITION BY anime_id, fansub_group_id ORDER BY sort_index NULLS LAST, contribution_id) AS range_group
    FROM ranged_flags
),
range_entries AS (
    SELECT
        anime_id, fansub_group_id, range_group,
        MIN(sort_index) AS min_sort,
        (ARRAY_AGG(COALESCE(NULLIF(release_version_label, ''), episode_number, '?') ORDER BY sort_index ASC NULLS LAST))[1] AS from_label,
        (ARRAY_AGG(COALESCE(NULLIF(release_version_label, ''), episode_number, '?') ORDER BY sort_index DESC NULLS FIRST))[1] AS to_label,
        bool_or(is_deviation) AS is_deviation,
        MIN(role_codes) AS entry_role_codes,
        MIN(extra_roles) AS entry_extra_roles,
        MIN(missing_roles) AS entry_missing_roles
    FROM ranged
    GROUP BY anime_id, fansub_group_id, range_group
),
project_blocks AS (
    SELECT
        p.anime_id,
        p.anime_title,
        p.fansub_group_id,
        p.fansub_group_name,
        COALESCE(st.standard_role_codes, ARRAY[]::text[]) AS project_standard_role_codes,
        COALESCE(
            (SELECT ARRAY_AGG(rd.label_de ORDER BY rd.sort_order)
             FROM role_definitions rd
             WHERE rd.code = ANY(COALESCE(st.standard_role_codes, ARRAY[]::text[]))),
            ARRAY[]::text[]
        ) AS project_standard_contributor_labels,
        COALESCE(bool_or(re.is_deviation), false) AS has_deviation,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'from_label', re.from_label,
                    'to_label', re.to_label,
                    'is_deviation', re.is_deviation,
                    'deviation_detail',
                        CASE WHEN re.is_deviation THEN
                            NULLIF(trim(BOTH ' ' FROM
                                CASE WHEN cardinality(re.entry_extra_roles) > 0
                                    THEN 'zusätzliche Rolle(n): ' || array_to_string(re.entry_extra_roles, ', ') || '. '
                                    ELSE '' END ||
                                CASE WHEN cardinality(re.entry_missing_roles) > 0
                                    THEN 'fehlende Rolle(n): ' || array_to_string(re.entry_missing_roles, ', ')
                                    ELSE '' END
                            ), '')
                        ELSE NULL END,
                    'role_codes', to_jsonb(re.entry_role_codes)
                ) ORDER BY re.min_sort
            ) FILTER (WHERE re.range_group IS NOT NULL),
            '[]'::jsonb
        ) AS range_entries_json
    FROM projects p
    LEFT JOIN standards st ON st.anime_id = p.anime_id AND st.fansub_group_id = p.fansub_group_id
    LEFT JOIN range_entries re ON re.anime_id = p.anime_id AND re.fansub_group_id = p.fansub_group_id
    GROUP BY p.anime_id, p.anime_title, p.fansub_group_id, p.fansub_group_name, st.standard_role_codes
),
filtered_blocks AS (
    SELECT * FROM project_blocks
    WHERE ($7 = false OR has_deviation = true)
),
paged AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered_blocks
    ORDER BY anime_title, fansub_group_name
    LIMIT $8 OFFSET $9
)
SELECT
    anime_id, anime_title, fansub_group_id, fansub_group_name,
    project_standard_role_codes, project_standard_contributor_labels,
    range_entries_json, total_count
FROM paged
`
