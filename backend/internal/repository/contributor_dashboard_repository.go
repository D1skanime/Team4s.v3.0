package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ContributorDashboardRepository struct {
	db *pgxpool.Pool
}

func NewContributorDashboardRepository(db *pgxpool.Pool) *ContributorDashboardRepository {
	return &ContributorDashboardRepository{db: db}
}

func (r *ContributorDashboardRepository) ListContributorGroups(
	ctx context.Context,
	input models.ContributorGroupQueryInput,
) ([]models.ContributorGroupOverview, error) {
	if input.AppUserID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		WITH actor_member AS (
			SELECT id
			FROM members
			WHERE user_id = $2
			ORDER BY id ASC
			LIMIT 1
		),
		visible_groups AS (
			SELECT fg.id
			FROM fansub_groups fg
			WHERE $3

			UNION

			SELECT fgm.fansub_group_id
			FROM fansub_group_members fgm
			WHERE fgm.app_user_id = $1

			UNION

			SELECT gm.group_id
			FROM group_members gm
			JOIN actor_member am ON am.id = gm.member_id
		)
		SELECT
			fg.id,
			fg.slug,
			fg.name,
			fg.status,
			'group' AS group_type,
			fg.logo_url,
			fg.banner_url,
			COALESCE(NULLIF(m.nickname, ''), au.display_name, '') AS fansub_name,
			CASE
				WHEN $3 THEN 'platform_admin'
				WHEN fgm.id IS NOT NULL THEN 'app_member'
				WHEN gm.id IS NOT NULL THEN 'historical'
				ELSE 'none'
			END AS membership_status,
			fgm.status AS app_member_status,
			COALESCE(
				ARRAY(
					SELECT fgmr.role
					FROM fansub_group_member_roles fgmr
					WHERE fgmr.fansub_group_member_id = fgm.id
					ORDER BY fgmr.role
				),
				ARRAY[]::varchar[]
			) AS app_member_roles,
			EXTRACT(YEAR FROM gm.joined_date)::int AS joined_year,
			EXTRACT(YEAR FROM gm.left_date)::int AS left_year,
			fgm.created_at AS active_from,
			CASE WHEN fgm.status = 'disabled' THEN fgm.updated_at ELSE NULL END AS active_until,
			(gm.id IS NOT NULL) AS has_historical_link,
			(
				SELECT COUNT(DISTINCT afg.anime_id)
				FROM anime_fansub_groups afg
				WHERE afg.fansub_group_id = fg.id
			)::int AS anime_count,
			(
				SELECT COUNT(DISTINCT rv.release_id)
				FROM release_versions rv
				JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
				WHERE rvg.fansub_group_id = fg.id
			)::int AS release_count,
			(
				SELECT COUNT(DISTINCT rvg.release_version_id)
				FROM release_version_groups rvg
				WHERE rvg.fansub_group_id = fg.id
			)::int AS release_version_count,
			(
				SELECT COUNT(*)
				FROM fansub_group_media fgm_media
				WHERE fgm_media.group_id = fg.id
			)::int
				+ CASE WHEN fg.logo_id IS NOT NULL THEN 1 ELSE 0 END
				+ CASE WHEN fg.banner_id IS NOT NULL THEN 1 ELSE 0 END AS group_media_count
		FROM visible_groups vg
		JOIN fansub_groups fg ON fg.id = vg.id
		LEFT JOIN app_users au ON au.id = $1
		LEFT JOIN actor_member am ON true
		LEFT JOIN members m ON m.id = am.id
		LEFT JOIN fansub_group_members fgm
			ON fgm.fansub_group_id = fg.id
		   AND fgm.app_user_id = $1
		LEFT JOIN group_members gm
			ON gm.group_id = fg.id
		   AND gm.member_id = am.id
		ORDER BY LOWER(fg.name), fg.id
	`, input.AppUserID, legacyUserIDValue(input.LegacyUserID), input.IsPlatformAdmin)
	if err != nil {
		return nil, fmt.Errorf("list contributor groups app_user=%d: %w", input.AppUserID, err)
	}
	defer rows.Close()

	items := make([]models.ContributorGroupOverview, 0)
	for rows.Next() {
		item, err := scanContributorGroupOverview(rows)
		if err != nil {
			return nil, fmt.Errorf("list contributor groups app_user=%d: %w", input.AppUserID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list contributor groups app_user=%d: %w", input.AppUserID, err)
	}
	return items, nil
}

func (r *ContributorDashboardRepository) GetContributorGroupDetail(
	ctx context.Context,
	input models.ContributorGroupQueryInput,
	fansubGroupID int64,
) (*models.ContributorGroupDetail, error) {
	if input.AppUserID <= 0 || fansubGroupID <= 0 {
		return nil, ErrNotFound
	}

	groups, err := r.ListContributorGroups(ctx, input)
	if err != nil {
		return nil, err
	}

	var group *models.ContributorGroupOverview
	for i := range groups {
		if groups[i].ID == fansubGroupID {
			group = &groups[i]
			break
		}
	}
	if group == nil {
		return nil, ErrNotFound
	}

	anime, err := r.listContributorGroupAnime(ctx, fansubGroupID)
	if err != nil {
		return nil, err
	}
	contributions, err := r.listContributorContributions(ctx, legacyUserIDValue(input.LegacyUserID), fansubGroupID)
	if err != nil {
		return nil, err
	}

	return &models.ContributorGroupDetail{
		Group:         *group,
		Anime:         anime,
		Contributions: contributions,
	}, nil
}

func (r *ContributorDashboardRepository) listContributorGroupAnime(
	ctx context.Context,
	fansubGroupID int64,
) ([]models.ContributorAnimeSummary, error) {
	rows, err := r.db.Query(ctx, `
		WITH scoped_versions AS (
			SELECT
				fr.id AS release_id,
				rv.id AS release_version_id,
				rv.version,
				rv.release_date,
				variant.duration_seconds,
				ep.id AS episode_id,
				COALESCE(ep.episode_number, '') AS episode_number,
				ep.title AS episode_title,
				a.id AS anime_id,
				a.title AS anime_title,
				EXISTS (
					SELECT 1
					FROM release_theme_assets rta
					WHERE rta.release_id = fr.id
				) AS has_theme_assets,
				(
					SELECT COUNT(*)
					FROM release_version_media rvm
					WHERE rvm.release_version_id = rv.id
					  AND rvm.deleted_at IS NULL
				)::int AS media_count,
				(
					SELECT COUNT(DISTINCT rvg_all.fansub_group_id)
					FROM release_version_groups rvg_all
					WHERE rvg_all.release_version_id = rv.id
				) > 1 AS is_coop
			FROM release_version_groups rvg
			JOIN release_versions rv ON rv.id = rvg.release_version_id
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes ep ON ep.id = fr.episode_id
			JOIN anime a ON a.id = ep.anime_id
			LEFT JOIN LATERAL (
				SELECT duration_seconds
				FROM release_variants rvar
				WHERE rvar.release_version_id = rv.id
				ORDER BY rvar.duration_seconds IS NOT NULL DESC, rvar.id ASC
				LIMIT 1
			) variant ON true
			WHERE rvg.fansub_group_id = $1
		),
		scoped_anime AS (
			SELECT DISTINCT a.id
			FROM anime a
			JOIN anime_fansub_groups afg
				ON afg.anime_id = a.id
			   AND afg.fansub_group_id = $1

			UNION

			SELECT DISTINCT anime_id
			FROM scoped_versions
		)
		SELECT
			a.id,
			a.title,
			COALESCE(at.name, a.type::text) AS anime_type,
			COALESCE(
				NULLIF(BTRIM(a.banner_resolved_url), ''),
				banner.file_path,
				background.file_path,
				NULLIF(BTRIM(a.cover_resolved_url), ''),
				NULLIF(BTRIM(a.cover_image), ''),
				poster.file_path,
				''
			) AS header_image,
			COALESCE(
				NULLIF(BTRIM(a.cover_resolved_url), ''),
				NULLIF(BTRIM(a.cover_image), ''),
				poster.file_path
			) AS cover_image,
			(
				SELECT COUNT(DISTINCT sv.release_id)
				FROM scoped_versions sv
				WHERE sv.anime_id = a.id
			)::int AS release_count,
			(
				SELECT COUNT(DISTINCT sv.release_version_id)
				FROM scoped_versions sv
				WHERE sv.anime_id = a.id
			)::int AS release_version_count
		FROM scoped_anime sa
		JOIN anime a ON a.id = sa.id
		LEFT JOIN anime_types at ON at.id = a.anime_type_id
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'banner'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) banner ON true
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'background'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) background ON true
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = a.id
			  AND mt.name = 'poster'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) poster ON true
		ORDER BY LOWER(a.title), a.id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list contributor group anime group=%d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	anime := make([]models.ContributorAnimeSummary, 0)
	for rows.Next() {
		var item models.ContributorAnimeSummary
		var headerImage string
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Type,
			&headerImage,
			&item.CoverImage,
			&item.ReleaseCount,
			&item.ReleaseVersionCount,
		); err != nil {
			return nil, fmt.Errorf("scan contributor group anime group=%d: %w", fansubGroupID, err)
		}
		item.HeaderImage = optionalString(headerImage)
		item.Releases = []models.ContributorReleaseVersionSummary{}
		anime = append(anime, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate contributor group anime group=%d: %w", fansubGroupID, err)
	}

	releases, err := r.listContributorGroupReleaseVersions(ctx, fansubGroupID)
	if err != nil {
		return nil, err
	}
	byAnimeID := make(map[int64][]models.ContributorReleaseVersionSummary, len(anime))
	for _, release := range releases {
		byAnimeID[release.AnimeID] = append(byAnimeID[release.AnimeID], release)
	}
	for i := range anime {
		anime[i].Releases = byAnimeID[anime[i].ID]
		if anime[i].Releases == nil {
			anime[i].Releases = []models.ContributorReleaseVersionSummary{}
		}
	}

	return anime, nil
}

func (r *ContributorDashboardRepository) listContributorGroupReleaseVersions(
	ctx context.Context,
	fansubGroupID int64,
) ([]models.ContributorReleaseVersionSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fr.id,
			rv.id,
			rv.version,
			a.id,
			a.title,
			ep.id,
			COALESCE(ep.episode_number, ''),
			ep.title,
			rv.release_date,
			variant.duration_seconds,
			(
				SELECT COUNT(*)
				FROM release_version_media rvm
				WHERE rvm.release_version_id = rv.id
				  AND rvm.deleted_at IS NULL
			)::int AS media_count,
			EXISTS (
				SELECT 1
				FROM release_theme_assets rta
				WHERE rta.release_id = fr.id
			) AS has_theme_assets,
			(
				SELECT COUNT(DISTINCT rvg_all.fansub_group_id)
				FROM release_version_groups rvg_all
				WHERE rvg_all.release_version_id = rv.id
			) > 1 AS is_coop
		FROM release_version_groups rvg
		JOIN release_versions rv ON rv.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		LEFT JOIN LATERAL (
			SELECT duration_seconds
			FROM release_variants rvar
			WHERE rvar.release_version_id = rv.id
			ORDER BY rvar.duration_seconds IS NOT NULL DESC, rvar.id ASC
			LIMIT 1
		) variant ON true
		WHERE rvg.fansub_group_id = $1
		ORDER BY LOWER(a.title), COALESCE(ep.sort_index, 2147483647), ep.id, fr.id, rv.id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list contributor release versions group=%d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]models.ContributorReleaseVersionSummary, 0)
	for rows.Next() {
		var item models.ContributorReleaseVersionSummary
		if err := rows.Scan(
			&item.ReleaseID,
			&item.ReleaseVersionID,
			&item.Version,
			&item.AnimeID,
			&item.AnimeTitle,
			&item.EpisodeID,
			&item.EpisodeNumber,
			&item.EpisodeTitle,
			&item.ReleaseDate,
			&item.DurationSeconds,
			&item.MediaCount,
			&item.HasThemeAssets,
			&item.IsCoop,
		); err != nil {
			return nil, fmt.Errorf("scan contributor release versions group=%d: %w", fansubGroupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate contributor release versions group=%d: %w", fansubGroupID, err)
	}
	return items, nil
}

func (r *ContributorDashboardRepository) listContributorContributions(
	ctx context.Context,
	legacyUserID int64,
	fansubGroupID int64,
) ([]models.ContributorContributionSummary, error) {
	if legacyUserID <= 0 || fansubGroupID <= 0 {
		return []models.ContributorContributionSummary{}, nil
	}

	rows, err := r.db.Query(ctx, `
		WITH actor_member AS (
			SELECT id
			FROM members
			WHERE user_id = $1
			ORDER BY id ASC
			LIMIT 1
		)
		SELECT
			fg.id,
			fg.name,
			cr.name,
			cr.label,
			COUNT(DISTINCT rmr.release_id)::int
		FROM actor_member am
		JOIN release_member_roles rmr ON rmr.member_id = am.id
		JOIN release_versions rv ON rv.release_id = rmr.release_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		WHERE fg.id = $2
		GROUP BY fg.id, fg.name, cr.name, cr.label
		ORDER BY cr.label ASC, cr.name ASC
	`, legacyUserID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list contributor contributions group=%d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]models.ContributorContributionSummary, 0)
	for rows.Next() {
		var item models.ContributorContributionSummary
		if err := rows.Scan(
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.RoleName,
			&item.RoleLabel,
			&item.ReleaseCount,
		); err != nil {
			return nil, fmt.Errorf("scan contributor contributions group=%d: %w", fansubGroupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate contributor contributions group=%d: %w", fansubGroupID, err)
	}
	return items, nil
}

type contributorGroupScanner interface {
	Scan(dest ...any) error
}

func scanContributorGroupOverview(scanner contributorGroupScanner) (models.ContributorGroupOverview, error) {
	var item models.ContributorGroupOverview
	if err := scanner.Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Status,
		&item.GroupType,
		&item.LogoURL,
		&item.BannerURL,
		&item.FansubName,
		&item.MembershipStatus,
		&item.AppMemberStatus,
		&item.AppMemberRoles,
		&item.JoinedYear,
		&item.LeftYear,
		&item.ActiveFrom,
		&item.ActiveUntil,
		&item.HasHistoricalLink,
		&item.AnimeCount,
		&item.ReleaseCount,
		&item.ReleaseVersionCount,
		&item.GroupMediaCount,
	); err != nil {
		return item, err
	}
	item.AppMemberRoles = normalizeDistinctStrings(item.AppMemberRoles)
	return item, nil
}

func legacyUserIDValue(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func optionalString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
