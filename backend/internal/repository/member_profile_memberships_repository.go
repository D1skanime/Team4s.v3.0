package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

func (r *MemberProfileRepository) loadMemberships(
	ctx context.Context,
	memberID int64,
	appUserID int64,
	includeInternalHistorical bool,
	includeAppMembershipDetails bool,
) ([]models.MemberProfileMembership, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fg.id,
			fg.name,
			fg.slug,
			COALESCE(NULLIF(BTRIM(fg.logo_url), ''), logo_file.path) AS logo_url,
			fg.status,
			EXTRACT(YEAR FROM hgm.joined_date)::int AS joined_year,
			EXTRACT(YEAR FROM hgm.left_date)::int AS left_year,
			CASE WHEN $4 THEN fgm.status ELSE NULL END AS app_member_status,
			CASE WHEN $4 THEN
				COALESCE(
					ARRAY(
						SELECT fgmr.role
						FROM fansub_group_member_roles fgmr
						WHERE fgmr.fansub_group_member_id = fgm.id
						ORDER BY fgmr.role
					),
					ARRAY[]::varchar[]
				)
			ELSE ARRAY[]::varchar[] END AS app_member_roles,
			(hgm.id IS NOT NULL) AS has_historical_link,
			hgm.status AS historical_member_status
		FROM fansub_groups fg
		LEFT JOIN media_assets logo_asset
			ON logo_asset.id = fg.logo_id
		   AND logo_asset.status = 'ready'
		LEFT JOIN LATERAL (
			SELECT mf.path
			FROM media_files mf
			WHERE mf.media_id = logo_asset.id
			  AND mf.status = 'ready'
			ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id ASC
			LIMIT 1
		) logo_file ON true
		LEFT JOIN hist_fansub_group_members hgm
			ON hgm.fansub_group_id = fg.id
		   AND hgm.member_id = $1
		   AND ($3 OR hgm.visibility = 'public')
		LEFT JOIN fansub_group_members fgm
			ON fgm.fansub_group_id = fg.id
		   AND fgm.app_user_id = $2
		WHERE hgm.id IS NOT NULL
		   OR fgm.id IS NOT NULL
		ORDER BY fg.name ASC
	`, memberID, appUserID, includeInternalHistorical, includeAppMembershipDetails)
	if err != nil {
		return nil, fmt.Errorf("load memberships for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileMembership, 0)
	for rows.Next() {
		var item models.MemberProfileMembership
		if err := rows.Scan(
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.FansubGroupSlug,
			&item.LogoURL,
			&item.GroupStatus,
			&item.JoinedYear,
			&item.LeftYear,
			&item.AppMemberStatus,
			&item.AppMemberRoles,
			&item.HasHistoricalLink,
			&item.HistoricalMemberStatus,
		); err != nil {
			return nil, fmt.Errorf("scan membership row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate memberships for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadHistoricalCredits(ctx context.Context, memberID int64) ([]models.MemberProfileCredit, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fg.id,
			fg.name,
			cr.name,
			cr.label,
			COUNT(DISTINCT rmr.release_id)::int
		FROM release_member_roles rmr
		JOIN release_versions rv ON rv.release_id = rmr.release_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		WHERE rmr.member_id = $1
		GROUP BY fg.id, fg.name, cr.name, cr.label
		ORDER BY fg.name ASC, cr.label ASC, cr.name ASC
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load historical credits for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileCredit, 0)
	for rows.Next() {
		var item models.MemberProfileCredit
		if err := rows.Scan(
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.RoleName,
			&item.RoleLabel,
			&item.ReleaseCount,
		); err != nil {
			return nil, fmt.Errorf("scan historical credit row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate historical credits for member %d: %w", memberID, err)
	}
	return items, nil
}
