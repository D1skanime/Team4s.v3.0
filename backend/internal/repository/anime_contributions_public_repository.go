package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// animeContributionsPublicRepository extends AnimeContributionsRepository with public-facing queries.
// It lives in a separate file to keep each file under 450 lines.

type animeContributionsPublicRepository struct {
	db *pgxpool.Pool
}

const publicContributionSelect = `
	SELECT
		COALESCE(m.display_name, '') AS member_display_name,
		COALESCE(m.slug, '') AS member_slug,
		COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
		ac.started_year,
		ac.ended_year,
		(ac.status = 'confirmed') AS is_verified
	FROM anime_contributions ac
	JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
	JOIN members m ON m.id = hfgm.member_id
	LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
`

func scanPublicRows(db *pgxpool.Pool, ctx context.Context, query string, args ...any) ([]PublicContributionRow, error) {
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]PublicContributionRow, 0)
	for rows.Next() {
		var row PublicContributionRow
		if err := rows.Scan(
			&row.MemberDisplayName,
			&row.MemberSlug,
			&row.RoleCodes,
			&row.StartedYear,
			&row.EndedYear,
			&row.IsVerified,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// ListPublicByAnime returns publicly visible contributions for a given anime.
// Only contributions with is_public_on_anime_page = true and member visibility = 'public' are returned.
func (r *AnimeContributionsRepository) ListPublicByAnime(ctx context.Context, animeID int64) ([]PublicContributionRow, error) {
	query := publicContributionSelect + `
	WHERE ac.anime_id = $1
	  AND ac.is_public_on_anime_page = true
	  AND hfgm.visibility = 'public'
	GROUP BY m.display_name, m.slug, ac.started_year, ac.ended_year, ac.status
	ORDER BY COALESCE(ac.started_year, 9999), m.display_name
	LIMIT 50
	`
	result, err := scanPublicRows(r.db, ctx, query, animeID)
	if err != nil {
		return nil, fmt.Errorf("list public contributions by anime: %w", err)
	}
	return result, nil
}

// ListPublicByFansub returns publicly visible contributions for a given fansub group.
// Only contributions with is_public_on_anime_page = true and member visibility = 'public' are returned.
func (r *AnimeContributionsRepository) ListPublicByFansub(ctx context.Context, fansubGroupID int64) ([]PublicContributionRow, error) {
	query := publicContributionSelect + `
	WHERE ac.fansub_group_id = $1
	  AND ac.is_public_on_anime_page = true
	  AND hfgm.visibility = 'public'
	GROUP BY m.display_name, m.slug, ac.started_year, ac.ended_year, ac.status
	ORDER BY COALESCE(ac.started_year, 9999), m.display_name
	LIMIT 50
	`
	result, err := scanPublicRows(r.db, ctx, query, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list public contributions by fansub: %w", err)
	}
	return result, nil
}

// ListPublicByMemberSlug returns publicly visible contributions for a given member slug.
// Only contributions with is_public_on_member_profile = true are returned.
func (r *AnimeContributionsRepository) ListPublicByMemberSlug(ctx context.Context, memberSlug string) ([]PublicContributionRow, error) {
	query := publicContributionSelect + `
	WHERE m.slug = $1
	  AND ac.is_public_on_member_profile = true
	GROUP BY m.display_name, m.slug, ac.started_year, ac.ended_year, ac.status
	ORDER BY COALESCE(ac.started_year, 9999), m.display_name
	LIMIT 50
	`
	result, err := scanPublicRows(r.db, ctx, query, memberSlug)
	if err != nil {
		return nil, fmt.Errorf("list public contributions by member slug: %w", err)
	}
	return result, nil
}
