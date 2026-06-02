package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// archivePageSize ist die feste Seitengroesse fuer die Archiv-Suche.
const archivePageSize = 20

// ArchiveSearchFilters enthaelt die optionalen UND-verknuepften Suchfilter.
type ArchiveSearchFilters struct {
	RoleCode      string
	FansubGroupID int64
	YearFrom      int
	YearUntil     int
}

// ArchiveMemberRow repraesentiert einen oeffentlichen Member im Suchergebnis.
type ArchiveMemberRow struct {
	ID          int64    `json:"id"`
	Nickname    string   `json:"nickname"`
	DisplayName string   `json:"display_name"`
	Slug        *string  `json:"slug"`
	AvatarPath  *string  `json:"avatar_path"`
	IsVerified  bool     `json:"is_verified"`
	TopRoles    []string `json:"top_roles"`
	Groups      []string `json:"groups"`
}

// ArchiveSearchResult enthaelt die paginierte Suchantwort.
type ArchiveSearchResult struct {
	Members []ArchiveMemberRow
	Total   int
}

// MemberArchiveRepository stellt Methoden fuer die oeffentliche Archiv-Suche bereit.
type MemberArchiveRepository struct {
	db *pgxpool.Pool
}

// NewMemberArchiveRepository erstellt einen neuen MemberArchiveRepository.
func NewMemberArchiveRepository(db *pgxpool.Pool) *MemberArchiveRepository {
	return &MemberArchiveRepository{db: db}
}

// SearchMembers gibt oeffentliche Member paginiert zurueck.
// Sicherheitsgrenze: Nur Member mit profile_visibility='public',
// is_public_on_member_profile=true und hfgm.visibility='public' erscheinen.
// Alle Filter sind optional und werden als UND-Bedingungen angewendet.
// Alle Nutzereingaben werden als pgx-Parameter uebergeben — keine String-Interpolation.
func (r *MemberArchiveRepository) SearchMembers(
	ctx context.Context,
	filters ArchiveSearchFilters,
	page int,
) (*ArchiveSearchResult, error) {
	// Bounds-Check: Seite >= 1 und <= 1000 (T-68-03-02)
	if page < 1 {
		page = 1
	}
	if page > 1000 {
		page = 1000
	}
	offset := (page - 1) * archivePageSize

	// --- Query-Builder: Basis-WHERE-Klauseln und optionale Filter ---
	// Die drei Sichtbarkeits-Bedingungen sind immer aktiv (T-68-03-01).
	// Parameterindex wird dynamisch hochgezaehlt.
	args := []any{}
	paramIdx := 1

	// Basis-WHERE (immer gesetzt):
	// m.profile_visibility = 'public'
	// ac.is_public_on_member_profile = true
	// hfgm.visibility = 'public'
	// ac.status = 'confirmed'
	// Diese Bedingungen sind direkte SQL-Literals — kein Nutzereingabe-Risiko.

	// Optionale Filter (T-68-03-03: parameterized):
	var filterClauses []string

	// Rolle-Filter (EXISTS-Subquery — sicherer als JOIN fuer DISTINCT-Semantik)
	if filters.RoleCode != "" {
		args = append(args, filters.RoleCode)
		filterClauses = append(filterClauses, fmt.Sprintf(`
  AND EXISTS (
      SELECT 1
      FROM anime_contribution_roles acr2
      JOIN anime_contributions ac2 ON ac2.id = acr2.anime_contribution_id
      JOIN hist_fansub_group_members hfgm2 ON hfgm2.id = ac2.fansub_group_member_id
      WHERE hfgm2.member_id = m.id
        AND ac2.is_public_on_member_profile = true
        AND ac2.status = 'confirmed'
        AND acr2.role_code = $%d
  )`, paramIdx))
		paramIdx++
	}

	// Zeitraum-Filter (von)
	if filters.YearFrom > 0 {
		args = append(args, filters.YearFrom)
		filterClauses = append(filterClauses, fmt.Sprintf(`
  AND COALESCE(ac.started_year, ac.ended_year, 9999) >= $%d`, paramIdx))
		paramIdx++
	}

	// Zeitraum-Filter (bis)
	if filters.YearUntil > 0 {
		args = append(args, filters.YearUntil)
		filterClauses = append(filterClauses, fmt.Sprintf(`
  AND COALESCE(ac.ended_year, ac.started_year, 0) <= $%d`, paramIdx))
		paramIdx++
	}

	// Gruppen-Filter
	if filters.FansubGroupID > 0 {
		args = append(args, filters.FansubGroupID)
		filterClauses = append(filterClauses, fmt.Sprintf(`
  AND hfgm.fansub_group_id = $%d`, paramIdx))
		paramIdx++
	}

	extraWhere := strings.Join(filterClauses, "")

	// --- COUNT-Query fuer Total ---
	countSQL := fmt.Sprintf(`
SELECT COUNT(DISTINCT m.id)
FROM members m
JOIN hist_fansub_group_members hfgm ON hfgm.member_id = m.id
    AND hfgm.visibility = 'public'
JOIN anime_contributions ac ON ac.fansub_group_member_id = hfgm.id
    AND ac.is_public_on_member_profile = true
    AND ac.status = 'confirmed'
WHERE m.profile_visibility = 'public'
%s
`, extraWhere)

	var total int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("member_archive: count query: %w", err)
	}

	if total == 0 {
		return &ArchiveSearchResult{Members: []ArchiveMemberRow{}, Total: 0}, nil
	}

	// --- Haupt-Query: Member-Zeilen ---
	// LIMIT und OFFSET sind Ganzzahlen — keine SQL-Injection-Gefahr.
	// Trotzdem als pgx-Parameter uebergeben (best practice, T-68-03-02).
	mainArgs := append(args, archivePageSize, offset)
	limitParam := paramIdx
	offsetParam := paramIdx + 1

	mainSQL := fmt.Sprintf(`
SELECT DISTINCT ON (m.id)
    m.id,
    m.nickname,
    %s AS display_name,
    %s AS slug,
    avatar.file_path AS avatar_path,
    EXISTS(
        SELECT 1 FROM member_claims mc
        WHERE mc.member_id = m.id AND mc.claim_status = 'verified'
    ) AS is_verified
FROM members m
JOIN hist_fansub_group_members hfgm ON hfgm.member_id = m.id
    AND hfgm.visibility = 'public'
JOIN anime_contributions ac ON ac.fansub_group_member_id = hfgm.id
    AND ac.is_public_on_member_profile = true
    AND ac.status = 'confirmed'
LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
WHERE m.profile_visibility = 'public'
%s
ORDER BY m.id ASC
LIMIT $%d OFFSET $%d
`,
		fmt.Sprintf(memberDisplayExpr, "m", "m"),
		fmt.Sprintf(memberSlugExpr, "m.nickname"),
		extraWhere,
		limitParam,
		offsetParam,
	)

	rows, err := r.db.Query(ctx, mainSQL, mainArgs...)
	if err != nil {
		return nil, fmt.Errorf("member_archive: main query: %w", err)
	}
	defer rows.Close()

	members := []ArchiveMemberRow{}
	memberIDs := []int64{}

	for rows.Next() {
		var row ArchiveMemberRow
		if err := rows.Scan(
			&row.ID,
			&row.Nickname,
			&row.DisplayName,
			&row.Slug,
			&row.AvatarPath,
			&row.IsVerified,
		); err != nil {
			return nil, fmt.Errorf("member_archive: scan row: %w", err)
		}
		row.TopRoles = []string{}
		row.Groups = []string{}
		members = append(members, row)
		memberIDs = append(memberIDs, row.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("member_archive: iterate rows: %w", err)
	}

	if len(members) == 0 {
		return &ArchiveSearchResult{Members: []ArchiveMemberRow{}, Total: total}, nil
	}

	// --- Rollen und Gruppen pro Member (Batch-Queries) ---
	// TopRoles: bis zu 5 distinct role_codes pro Member aus bestaetigten public Contributions.
	rolesSQL := `
SELECT DISTINCT ON (hfgm.member_id, acr.role_code)
    hfgm.member_id,
    acr.role_code
FROM anime_contribution_roles acr
JOIN anime_contributions ac ON ac.id = acr.anime_contribution_id
    AND ac.is_public_on_member_profile = true
    AND ac.status = 'confirmed'
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
    AND hfgm.visibility = 'public'
WHERE hfgm.member_id = ANY($1)
ORDER BY hfgm.member_id, acr.role_code
`
	roleRows, err := r.db.Query(ctx, rolesSQL, memberIDs)
	if err != nil {
		return nil, fmt.Errorf("member_archive: roles query: %w", err)
	}
	defer roleRows.Close()

	rolesMap := make(map[int64][]string)
	for roleRows.Next() {
		var memberID int64
		var roleCode string
		if err := roleRows.Scan(&memberID, &roleCode); err != nil {
			return nil, fmt.Errorf("member_archive: scan role: %w", err)
		}
		if len(rolesMap[memberID]) < 5 {
			rolesMap[memberID] = append(rolesMap[memberID], roleCode)
		}
	}
	if err := roleRows.Err(); err != nil {
		return nil, fmt.Errorf("member_archive: iterate roles: %w", err)
	}

	// Groups: bis zu 3 Gruppennahmen pro Member aus public Memberships.
	groupsSQL := `
SELECT DISTINCT ON (hfgm.member_id, fg.name)
    hfgm.member_id,
    fg.name
FROM hist_fansub_group_members hfgm
JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id
WHERE hfgm.member_id = ANY($1)
  AND hfgm.visibility = 'public'
ORDER BY hfgm.member_id, fg.name
`
	groupRows, err := r.db.Query(ctx, groupsSQL, memberIDs)
	if err != nil {
		return nil, fmt.Errorf("member_archive: groups query: %w", err)
	}
	defer groupRows.Close()

	groupsMap := make(map[int64][]string)
	for groupRows.Next() {
		var memberID int64
		var groupName string
		if err := groupRows.Scan(&memberID, &groupName); err != nil {
			return nil, fmt.Errorf("member_archive: scan group: %w", err)
		}
		if len(groupsMap[memberID]) < 3 {
			groupsMap[memberID] = append(groupsMap[memberID], groupName)
		}
	}
	if err := groupRows.Err(); err != nil {
		return nil, fmt.Errorf("member_archive: iterate groups: %w", err)
	}

	// Rollen und Gruppen in Member-Rows einfuegen.
	for i := range members {
		if roles, ok := rolesMap[members[i].ID]; ok {
			members[i].TopRoles = roles
		}
		if groups, ok := groupsMap[members[i].ID]; ok {
			members[i].Groups = groups
		}
	}

	return &ArchiveSearchResult{Members: members, Total: total}, nil
}
