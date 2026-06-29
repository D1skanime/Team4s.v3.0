package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type MemberProjectReleaseVersionRow struct {
	ReleaseVersionID   int64    `json:"release_version_id"`
	EpisodeNumber      string   `json:"episode_number"`
	EpisodeTitle       *string  `json:"episode_title"`
	EpisodeSortIndex   *int     `json:"episode_sort_index"`
	Version            string   `json:"version"`
	Title              *string  `json:"title"`
	RoleCodes          []string `json:"role_codes"`
	RoleLabels         []string `json:"role_labels"`
	HasOwnContribution bool     `json:"has_own_contribution"`
	HasOwnNotes        bool     `json:"has_own_notes"`
	HasOwnMedia        bool     `json:"has_own_media"`
}

type MemberProjectDetailRow struct {
	AnimeID         int64                            `json:"anime_id"`
	AnimeTitle      string                           `json:"anime_title"`
	FansubGroupID   int64                            `json:"fansub_group_id"`
	FansubGroupName string                           `json:"fansub_group_name"`
	BackdropURL     *string                          `json:"backdrop_url"`
	RoleCodes       []string                         `json:"role_codes"`
	RoleLabels      []string                         `json:"role_labels"`
	ReleaseVersions []MemberProjectReleaseVersionRow `json:"release_versions"`
}

func (r *AnimeContributionsRepository) GetMemberProjectDetail(
	ctx context.Context,
	memberID int64,
	appUserID int64,
	animeID int64,
	fansubGroupID int64,
) (*MemberProjectDetailRow, error) {
	var project MemberProjectDetailRow
	var backdropPath *string

	err := r.db.QueryRow(ctx, `
		WITH own_roles AS (
			SELECT DISTINCT acr.role_code, COALESCE(rd.label_de, acr.role_code) AS role_label
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			LEFT JOIN role_definitions rd ON rd.code = acr.role_code
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.anime_id = $2
			  AND ac.fansub_group_id = $3
			  AND ac.status = 'confirmed'
		),
		background AS (
			SELECT COALESCE(mf.path, ma.file_path) AS path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN LATERAL (
				SELECT path
				FROM media_files
				WHERE media_id = ma.id
				ORDER BY CASE WHEN variant = 'original' THEN 0 ELSE 1 END, id ASC
				LIMIT 1
			) mf ON true
			WHERE am.anime_id = $2
			  AND mt.name = 'background'
			ORDER BY am.sort_order ASC, ma.id ASC
			OFFSET 1
			LIMIT 1
		)
		SELECT
			a.id,
			COALESCE(a.title_de, a.title_en, a.title, ''),
			fg.id,
			COALESCE(fg.name, ''),
			(SELECT path FROM background),
			COALESCE(ARRAY_AGG(DISTINCT own_roles.role_code ORDER BY own_roles.role_code) FILTER (WHERE own_roles.role_code IS NOT NULL), ARRAY[]::text[]),
			COALESCE(ARRAY_AGG(DISTINCT own_roles.role_label ORDER BY own_roles.role_label) FILTER (WHERE own_roles.role_label IS NOT NULL), ARRAY[]::text[])
		FROM anime a
		JOIN fansub_groups fg ON fg.id = $3
		JOIN own_roles ON true
		WHERE a.id = $2
		GROUP BY a.id, a.title_de, a.title_en, a.title, fg.id, fg.name
	`, memberID, animeID, fansubGroupID).Scan(
		&project.AnimeID,
		&project.AnimeTitle,
		&project.FansubGroupID,
		&project.FansubGroupName,
		&backdropPath,
		&project.RoleCodes,
		&project.RoleLabels,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get member project detail header: %w", err)
	}
	if backdropPath != nil {
		if url := r.publicURLForPath(*backdropPath); url != "" {
			project.BackdropURL = &url
		}
	}

	releases, err := r.listMemberProjectReleaseVersions(ctx, memberID, appUserID, animeID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	project.ReleaseVersions = releases
	return &project, nil
}

func (r *AnimeContributionsRepository) listMemberProjectReleaseVersions(
	ctx context.Context,
	memberID int64,
	appUserID int64,
	animeID int64,
	fansubGroupID int64,
) ([]MemberProjectReleaseVersionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rv.id,
			COALESCE(ep.episode_number, ''),
			ep.title,
			ep.sort_index,
			COALESCE(NULLIF(rv.version, ''), CONCAT('#', rv.id::text)),
			NULLIF(rv.title, ''),
			COALESCE(own.role_codes, ARRAY[]::text[]),
			COALESCE(own.role_labels, ARRAY[]::text[]),
			COALESCE(own.has_own_contribution, false),
			EXISTS (
				SELECT 1
				FROM release_version_notes rvn
				WHERE rvn.release_version_id = rv.id
				  AND rvn.member_id = $1
				  AND rvn.deleted_at IS NULL
			) AS has_own_notes,
			EXISTS (
				SELECT 1
				FROM release_version_media rvm
				WHERE rvm.release_version_id = rv.id
				  AND rvm.uploaded_by_user_id = $2
				  AND rvm.deleted_at IS NULL
			) AS has_own_media
		FROM release_versions rv
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		LEFT JOIN LATERAL (
			SELECT
				COALESCE(ARRAY_AGG(DISTINCT acr.role_code ORDER BY acr.role_code), ARRAY[]::text[]) AS role_codes,
				COALESCE(ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code) ORDER BY COALESCE(rd.label_de, acr.role_code)), ARRAY[]::text[]) AS role_labels,
				COUNT(ac.id) > 0 AS has_own_contribution
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			LEFT JOIN role_definitions rd ON rd.code = acr.role_code
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.anime_id = $3
			  AND ac.fansub_group_id = $4
			  AND ac.status = 'confirmed'
			  AND (ac.release_version_id = rv.id OR ac.release_version_id IS NULL)
		) own ON true
		WHERE ep.anime_id = $3
		  AND rvg.fansub_group_id = $4
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, rv.version, rv.id
	`, memberID, appUserID, animeID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list member project release versions anime=%d fansub=%d: %w", animeID, fansubGroupID, err)
	}
	defer rows.Close()

	result := make([]MemberProjectReleaseVersionRow, 0)
	for rows.Next() {
		var row MemberProjectReleaseVersionRow
		if err := rows.Scan(
			&row.ReleaseVersionID,
			&row.EpisodeNumber,
			&row.EpisodeTitle,
			&row.EpisodeSortIndex,
			&row.Version,
			&row.Title,
			&row.RoleCodes,
			&row.RoleLabels,
			&row.HasOwnContribution,
			&row.HasOwnNotes,
			&row.HasOwnMedia,
		); err != nil {
			return nil, fmt.Errorf("scan member project release version: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member project release versions: %w", err)
	}
	return result, nil
}
