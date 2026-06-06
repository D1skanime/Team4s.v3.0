package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DomainProjectionRepository struct {
	db *pgxpool.Pool
}

func NewDomainProjectionRepository(db *pgxpool.Pool) *DomainProjectionRepository {
	return &DomainProjectionRepository{db: db}
}

type DomainProjectionResponse struct {
	Members      []DomainProjectionMemberRow      `json:"members"`
	Historical   []DomainProjectionHistoricalRow  `json:"historical"`
	Contributors []DomainProjectionContributorRow `json:"contributors"`
}

type DomainProjectionMemberRow struct {
	ID                int64    `json:"id"`
	MemberID          *int64   `json:"member_id"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	Roles             []string `json:"roles"`
	RoleLabels        []string `json:"role_labels"`
	Status            string   `json:"status"`
	ProfileStatus     string   `json:"profile_status"`
	Claimed           bool     `json:"claimed"`
}

type DomainProjectionHistoricalRow struct {
	ID                int64    `json:"id"`
	MemberID          int64    `json:"member_id"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	Roles             []string `json:"roles"`
	RoleLabels        []string `json:"role_labels"`
	JoinedYear        *int     `json:"joined_year"`
	LeftYear          *int     `json:"left_year"`
	Status            string   `json:"status"`
	ProfileStatus     string   `json:"profile_status"`
	Claimed           bool     `json:"claimed"`
}

type DomainProjectionContributorRow struct {
	ID                int64    `json:"id"`
	AnimeID           int64    `json:"anime_id"`
	AnimeTitle        string   `json:"anime_title"`
	MemberID          int64    `json:"member_id"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	Roles             []string `json:"roles"`
	RoleLabels        []string `json:"role_labels"`
	StartedYear       *int     `json:"started_year"`
	EndedYear         *int     `json:"ended_year"`
	Status            string   `json:"status"`
	DisputeState      string   `json:"dispute_state"`
	Visibility        string   `json:"visibility"`
	ReviewStatus      string   `json:"review_status"`
}

const domainProjectionMemberDisplayExpr = `COALESCE(NULLIF(TRIM(%s.nickname), ''), NULLIF(TRIM(%s.display_name), ''), 'Mitglied')`

func (r *DomainProjectionRepository) GetFansubGroupDomainProjection(ctx context.Context, groupID int64) (*DomainProjectionResponse, error) {
	resp := &DomainProjectionResponse{
		Members:      []DomainProjectionMemberRow{},
		Historical:   []DomainProjectionHistoricalRow{},
		Contributors: []DomainProjectionContributorRow{},
	}

	members, err := r.listProjectionMembers(ctx, groupID)
	if err != nil {
		return nil, err
	}
	historical, err := r.listProjectionHistorical(ctx, groupID)
	if err != nil {
		return nil, err
	}
	contributors, err := r.listProjectionContributors(ctx, groupID)
	if err != nil {
		return nil, err
	}

	resp.Members = members
	resp.Historical = historical
	resp.Contributors = contributors
	return resp, nil
}

func (r *DomainProjectionRepository) listProjectionMembers(ctx context.Context, groupID int64) ([]DomainProjectionMemberRow, error) {
	displayCol := fmt.Sprintf(domainProjectionMemberDisplayExpr, "m", "m")
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")

	rows, err := r.db.Query(ctx, `
		SELECT
			fgm.id,
			m.id AS member_id,
			COALESCE(`+displayCol+`, NULLIF(au.display_name, ''), 'Mitglied') AS member_display_name,
			`+slugCol+` AS member_slug,
			COALESCE(ARRAY_AGG(fgmr.role::text) FILTER (WHERE fgmr.role IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, fgmr.role::text)) FILTER (WHERE fgmr.role IS NOT NULL), ARRAY[]::text[]) AS role_labels,
			fgm.status,
			COALESCE(m.profile_status, 'active') AS profile_status,
			EXISTS (
				SELECT 1
				FROM member_claims mc
				WHERE mc.member_id = m.id
				  AND mc.claim_status = 'verified'
			) AS claimed
		FROM fansub_group_members fgm
		JOIN app_users au ON au.id = fgm.app_user_id
		LEFT JOIN members m ON m.user_id = au.legacy_user_id
		LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
		LEFT JOIN role_definitions rd ON rd.code = fgmr.role
		WHERE fgm.fansub_group_id = $1
		  AND fgm.status = 'active'
		  AND m.id IS NOT NULL
		  AND m.profile_visibility = 'public'
		GROUP BY fgm.id, m.id, m.display_name, m.nickname, m.profile_status, au.display_name, fgm.status
		ORDER BY member_display_name, fgm.id
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("domain projection: members: %w", err)
	}
	defer rows.Close()

	result := []DomainProjectionMemberRow{}
	for rows.Next() {
		var row DomainProjectionMemberRow
		if err := rows.Scan(
			&row.ID,
			&row.MemberID,
			&row.MemberDisplayName,
			&row.MemberSlug,
			&row.Roles,
			&row.RoleLabels,
			&row.Status,
			&row.ProfileStatus,
			&row.Claimed,
		); err != nil {
			return nil, fmt.Errorf("domain projection: members scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("domain projection: members iterate: %w", err)
	}
	return result, nil
}

func (r *DomainProjectionRepository) listProjectionHistorical(ctx context.Context, groupID int64) ([]DomainProjectionHistoricalRow, error) {
	displayCol := fmt.Sprintf(domainProjectionMemberDisplayExpr, "m", "m")
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")

	rows, err := r.db.Query(ctx, `
		SELECT
			hfgm.id,
			hfgm.member_id,
			`+displayCol+` AS member_display_name,
			`+slugCol+` AS member_slug,
			COALESCE(ARRAY_AGG(hgmr.role_code) FILTER (WHERE hgmr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, hgmr.role_code)) FILTER (WHERE hgmr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels,
			hfgm.joined_year,
			hfgm.left_year,
			hfgm.status,
			m.profile_status,
			EXISTS (
				SELECT 1
				FROM member_claims mc
				WHERE mc.member_id = hfgm.member_id
				  AND mc.claim_status = 'verified'
			) AS claimed
		FROM hist_fansub_group_members hfgm
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN hist_group_member_roles hgmr ON hgmr.hist_fansub_group_member_id = hfgm.id
			AND hgmr.visibility = 'public'
		LEFT JOIN role_definitions rd ON rd.code = hgmr.role_code
		WHERE hfgm.fansub_group_id = $1
		  AND hfgm.status IN ('historical', 'confirmed')
		  AND hfgm.visibility = 'public'
		  AND m.profile_visibility = 'public'
		GROUP BY hfgm.id, hfgm.member_id, m.display_name, m.nickname, m.profile_status, hfgm.joined_year, hfgm.left_year, hfgm.status
		ORDER BY COALESCE(hfgm.joined_year, 9999), member_display_name, hfgm.id
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("domain projection: historical: %w", err)
	}
	defer rows.Close()

	result := []DomainProjectionHistoricalRow{}
	for rows.Next() {
		var row DomainProjectionHistoricalRow
		if err := rows.Scan(
			&row.ID,
			&row.MemberID,
			&row.MemberDisplayName,
			&row.MemberSlug,
			&row.Roles,
			&row.RoleLabels,
			&row.JoinedYear,
			&row.LeftYear,
			&row.Status,
			&row.ProfileStatus,
			&row.Claimed,
		); err != nil {
			return nil, fmt.Errorf("domain projection: historical scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("domain projection: historical iterate: %w", err)
	}
	return result, nil
}

func (r *DomainProjectionRepository) listProjectionContributors(ctx context.Context, groupID int64) ([]DomainProjectionContributorRow, error) {
	displayCol := fmt.Sprintf(domainProjectionMemberDisplayExpr, "m", "m")
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")

	rows, err := r.db.Query(ctx, `
		SELECT
			ac.id,
			ac.anime_id,
			a.title AS anime_title,
			hfgm.member_id,
			`+displayCol+` AS member_display_name,
			`+slugCol+` AS member_slug,
			COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels,
			ac.started_year,
			ac.ended_year,
			ac.status,
			ac.dispute_state,
			COALESCE(v.name, 'public') AS visibility,
			COALESCE(rs.code, 'approved') AS review_status
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		LEFT JOIN visibilities v ON v.id = ac.visibility_id
		LEFT JOIN review_statuses rs ON rs.id = ac.review_status_id
		WHERE ac.fansub_group_id = $1
		  AND ac.is_public_on_anime_page = true
		  AND hfgm.visibility = 'public'
		  AND m.profile_visibility = 'public'
		  AND COALESCE(v.name, 'public') = 'public'
		GROUP BY ac.id, ac.anime_id, a.title, hfgm.member_id, m.display_name, m.nickname, ac.started_year, ac.ended_year, ac.status, ac.dispute_state, v.name, rs.code
		ORDER BY a.title, COALESCE(ac.started_year, 9999), member_display_name, ac.id
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("domain projection: contributors: %w", err)
	}
	defer rows.Close()

	result := []DomainProjectionContributorRow{}
	for rows.Next() {
		var row DomainProjectionContributorRow
		if err := rows.Scan(
			&row.ID,
			&row.AnimeID,
			&row.AnimeTitle,
			&row.MemberID,
			&row.MemberDisplayName,
			&row.MemberSlug,
			&row.Roles,
			&row.RoleLabels,
			&row.StartedYear,
			&row.EndedYear,
			&row.Status,
			&row.DisputeState,
			&row.Visibility,
			&row.ReviewStatus,
		); err != nil {
			return nil, fmt.Errorf("domain projection: contributors scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("domain projection: contributors iterate: %w", err)
	}
	return result, nil
}
