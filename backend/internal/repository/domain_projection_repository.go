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
	ID                   int64    `json:"id"`
	MemberID             *int64   `json:"member_id"`
	MemberDisplayName    string   `json:"member_display_name"`
	MemberSlug           *string  `json:"member_slug"`
	MemberAvatarURL      *string  `json:"member_avatar_url"`
	MemberSlogan         *string  `json:"member_slogan"`
	Roles                []string `json:"roles"`
	RoleLabels           []string `json:"role_labels"`
	HistoricalRoleLabels []string `json:"historical_role_labels"`
	Status               string   `json:"status"`
	ProfileStatus        string   `json:"profile_status"`
	Claimed              bool     `json:"claimed"`
}

type DomainProjectionHistoricalRow struct {
	ID                int64    `json:"id"`
	MemberID          int64    `json:"member_id"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	MemberAvatarURL   *string  `json:"member_avatar_url"`
	MemberSlogan      *string  `json:"member_slogan"`
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

	resp.Members = members
	resp.Historical = historical
	return resp, nil
}

func (r *DomainProjectionRepository) listProjectionMembers(ctx context.Context, groupID int64) ([]DomainProjectionMemberRow, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			fgm.id,
			m.id AS member_id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), NULLIF(TRIM(au.display_name), ''), 'Mitglied') AS member_display_name,
			CASE
				WHEN m.id IS NOT NULL AND m.profile_visibility = 'public' THEN m.public_slug
				ELSE NULL
			END AS member_slug,
			CASE
				WHEN m.id IS NOT NULL AND m.profile_visibility = 'public' THEN avatar.file_path
				ELSE NULL
			END AS member_avatar_url,
			NULLIF(m.slogan, '') AS member_slogan,
			COALESCE(ARRAY_AGG(fgmr.role::text) FILTER (WHERE fgmr.role IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, fgmr.role::text)) FILTER (
				WHERE fgmr.role IS NOT NULL
				  AND NOT (fgmr.role::text = ANY(COALESCE(history.role_codes, ARRAY[]::text[])))
			), ARRAY[]::text[]) AS role_labels,
			COALESCE(history.role_labels, ARRAY[]::text[]) AS historical_role_labels,
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
		-- #23: app_user<->member link lives in member_claims (verified), NOT members.user_id
		-- (NULL for app-registered members). Join via the verified claim so public member
		-- profiles resolve/link on the public group page.
		LEFT JOIN member_claims mc_link ON mc_link.app_user_id = au.id AND mc_link.claim_status = 'verified'
		LEFT JOIN members m ON m.id = mc_link.member_id
		LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
		LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
		LEFT JOIN role_definitions rd ON rd.code = fgmr.role
		LEFT JOIN LATERAL (
			SELECT
				COALESCE(ARRAY_AGG(CONCAT(COALESCE(history_definition.label_de, history_role.role_code), ' ', CHR(183), ' ', TO_CHAR(history_role.started_date, 'YYYY'), ' - ', TO_CHAR(history_role.ended_date, 'YYYY')) ORDER BY history_role.started_date, history_role.id), ARRAY[]::text[]) AS role_labels,
				COALESCE(ARRAY_AGG(history_role.role_code ORDER BY history_role.started_date, history_role.id), ARRAY[]::text[]) AS role_codes
			FROM hist_fansub_group_members history_member
			JOIN hist_group_member_roles history_role ON history_role.hist_fansub_group_member_id = history_member.id
			LEFT JOIN role_definitions history_definition ON history_definition.code = history_role.role_code
			WHERE history_member.fansub_group_id = fgm.fansub_group_id
			  AND history_member.member_id = m.id
			  AND history_member.visibility = 'public'
			  AND history_role.visibility = 'public'
			  AND history_role.started_date IS NOT NULL
			  AND history_role.ended_date IS NOT NULL
		) history ON TRUE
		WHERE fgm.fansub_group_id = $1
		  AND fgm.status = 'active'
		GROUP BY fgm.id, m.id, m.display_name, m.nickname, m.profile_visibility, m.profile_status, m.slogan, avatar.file_path, au.display_name, fgm.status, history.role_labels, history.role_codes
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
			&row.MemberAvatarURL,
			&row.MemberSlogan,
			&row.Roles,
			&row.RoleLabels,
			&row.HistoricalRoleLabels,
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

	rows, err := r.db.Query(ctx, `
		SELECT
			hfgm.id,
			hfgm.member_id,
			`+displayCol+` AS member_display_name,
			CASE
				WHEN m.profile_visibility = 'public' THEN m.public_slug
				ELSE NULL
			END AS member_slug,
			CASE
				WHEN m.profile_visibility = 'public' THEN avatar.file_path
				ELSE NULL
			END AS member_avatar_url,
			NULLIF(m.slogan, '') AS member_slogan,
			COALESCE(ARRAY_AGG(hgmr.role_code) FILTER (WHERE hgmr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, hgmr.role_code)) FILTER (WHERE hgmr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels,
			EXTRACT(YEAR FROM hfgm.joined_date)::int AS joined_year,
			EXTRACT(YEAR FROM hfgm.left_date)::int AS left_year,
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
		LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
		LEFT JOIN hist_group_member_roles hgmr ON hgmr.hist_fansub_group_member_id = hfgm.id
			AND hgmr.visibility = 'public'
		LEFT JOIN role_definitions rd ON rd.code = hgmr.role_code
		WHERE hfgm.fansub_group_id = $1
		  AND hfgm.status IN ('historical', 'confirmed')
		  AND hfgm.visibility = 'public'
		  AND NOT EXISTS (
			SELECT 1
			FROM fansub_group_members active_member
			JOIN member_claims active_claim ON active_claim.app_user_id = active_member.app_user_id
				AND active_claim.claim_status = 'verified'
			WHERE active_member.fansub_group_id = hfgm.fansub_group_id
			  AND active_member.status = 'active'
			  AND active_claim.member_id = hfgm.member_id
		  )
		GROUP BY hfgm.id, hfgm.member_id, m.id, m.display_name, m.nickname, m.profile_visibility, m.profile_status, m.slogan, avatar.file_path, hfgm.joined_date, hfgm.left_date, hfgm.status
		ORDER BY COALESCE(hfgm.joined_date, '9999-01-01'::date), member_display_name, hfgm.id
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
			&row.MemberAvatarURL,
			&row.MemberSlogan,
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

