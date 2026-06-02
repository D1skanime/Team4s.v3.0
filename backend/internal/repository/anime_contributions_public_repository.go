package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// memberSlugExpr derives a URL slug from members.nickname.
// LOWER(TRIM-dashes(REGEXP_REPLACE non-alphanumeric -> '-')); empty -> NULL via NULLIF.
// %s is replaced by the qualified nickname column (e.g. "m.nickname").
const memberSlugExpr = `NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(%s), '[^a-z0-9]+', '-', 'gi'))), '')`

// memberDisplayExpr resolves the member display name.
// %s is replaced by the table alias (e.g. "m").
const memberDisplayExpr = `COALESCE(NULLIF(TRIM(%s.display_name), ''), %s.nickname)`

// --- Public DTOs (snake_case JSON tags match frontend/src/types/contributions.ts) ---

// PublicContributorRow represents a single public contributor within a group on an anime page.
type PublicContributorRow struct {
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	Roles             []string `json:"roles"`
	RoleLabels        []string `json:"role_labels"`
	StartedYear       *int     `json:"started_year"`
	EndedYear         *int     `json:"ended_year"`
	IsVerified        bool     `json:"is_verified"`
}

// PublicAnimeContributionGroup groups public contributors of one fansub group on an anime page.
type PublicAnimeContributionGroup struct {
	FansubGroupID          int64                  `json:"fansub_group_id"`
	FansubGroupName        string                 `json:"fansub_group_name"`
	FansubGroupSlug        string                 `json:"fansub_group_slug"`
	ActiveFromYear         *int                   `json:"active_from_year"`
	ActiveUntilYear        *int                   `json:"active_until_year"`
	Contributors           []PublicContributorRow `json:"contributors"`
	HiddenContributorCount int                    `json:"hidden_contributor_count"`
}

// PublicAnimeContributionsResponse is the response for GET /anime/:id/contributions.
type PublicAnimeContributionsResponse struct {
	Groups []PublicAnimeContributionGroup `json:"groups"`
}

// PublicFansubLeaderEntry is one entry in a fansub group's public leader timeline.
type PublicFansubLeaderEntry struct {
	MemberDisplayName string  `json:"member_display_name"`
	MemberSlug        *string `json:"member_slug"`
	RoleCode          string  `json:"role_code"`
	RoleLabel         string  `json:"role_label"`
	StartedYear       *int    `json:"started_year"`
	EndedYear         *int    `json:"ended_year"`
	Status            string  `json:"status"`
}

// PublicGroupContributionsResponse is the response for GET /fansubs/:id/contributions.
type PublicGroupContributionsResponse struct {
	LeaderTimeline []PublicFansubLeaderEntry `json:"leader_timeline"`
	AnimeCount     int                       `json:"anime_count"`
	MemberCount    int                       `json:"member_count"`
}

// PublicMemberRoleEntry is one entry in a member's public role timeline.
type PublicMemberRoleEntry struct {
	FansubGroupName string  `json:"fansub_group_name"`
	FansubGroupSlug string  `json:"fansub_group_slug"`
	RoleCode        string  `json:"role_code"`
	RoleLabel       string  `json:"role_label"`
	Context         string  `json:"context"`
	AnimeTitle      *string `json:"anime_title"`
	AnimeID         *int64  `json:"anime_id"`
	StartedYear     *int    `json:"started_year"`
	EndedYear       *int    `json:"ended_year"`
	Status          string  `json:"status"`
}

// PublicMemberContributionsResponse is the response for GET /members/:slug/contributions.
type PublicMemberContributionsResponse struct {
	RoleTimeline []PublicMemberRoleEntry `json:"role_timeline"`
	HasUnverified bool                   `json:"has_unverified"`
}

// --- (A) GET /anime/:id/contributions ---

// GetPublicAnimeContributions returns grouped public contributors for an anime.
// Only contributors with ac.is_public_on_anime_page=true AND hfgm.visibility='public' are public.
// Groups with no public contributor are omitted. Each group also reports the count of distinct
// hidden contributing members on this anime.
func (r *AnimeContributionsRepository) GetPublicAnimeContributions(ctx context.Context, animeID int64) (*PublicAnimeContributionsResponse, error) {
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")

	query := `
		SELECT
			fg.id AS fansub_group_id,
			fg.name AS fansub_group_name,
			fg.slug AS fansub_group_slug,
			` + displayCol + ` AS member_display_name,
			` + slugCol + ` AS member_slug,
			ac.started_year,
			ac.ended_year,
			(ac.status = 'confirmed') AS is_verified,
			COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.anime_id = $1
		  AND ac.is_public_on_anime_page = true
		  AND hfgm.visibility = 'public'
		GROUP BY ac.id, fg.id, fg.name, fg.slug, m.display_name, m.nickname, ac.started_year, ac.ended_year, ac.status
		ORDER BY fg.name, COALESCE(ac.started_year, 9999), member_display_name
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return nil, fmt.Errorf("public anime contributions: %w", err)
	}
	defer rows.Close()

	groupIndex := make(map[int64]int)
	groups := make([]PublicAnimeContributionGroup, 0)

	for rows.Next() {
		var (
			fgID      int64
			fgName    string
			fgSlug    string
			contrib   PublicContributorRow
		)
		if err := rows.Scan(
			&fgID, &fgName, &fgSlug,
			&contrib.MemberDisplayName, &contrib.MemberSlug,
			&contrib.StartedYear, &contrib.EndedYear, &contrib.IsVerified,
			&contrib.Roles, &contrib.RoleLabels,
		); err != nil {
			return nil, fmt.Errorf("public anime contributions: scan: %w", err)
		}

		idx, ok := groupIndex[fgID]
		if !ok {
			groups = append(groups, PublicAnimeContributionGroup{
				FansubGroupID:   fgID,
				FansubGroupName: fgName,
				FansubGroupSlug: fgSlug,
				Contributors:    make([]PublicContributorRow, 0),
			})
			idx = len(groups) - 1
			groupIndex[fgID] = idx
		}
		g := &groups[idx]
		g.Contributors = append(g.Contributors, contrib)
		g.ActiveFromYear = minYearPtr(g.ActiveFromYear, contrib.StartedYear)
		g.ActiveUntilYear = maxYearPtr(g.ActiveUntilYear, contrib.EndedYear)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("public anime contributions: iterate: %w", err)
	}

	if err := r.attachHiddenCounts(ctx, animeID, groups, groupIndex); err != nil {
		return nil, err
	}

	return &PublicAnimeContributionsResponse{Groups: groups}, nil
}

// attachHiddenCounts computes, per fansub group on the given anime, the number of distinct
// contributing members that are NOT public, and attaches the count to matching groups.
func (r *AnimeContributionsRepository) attachHiddenCounts(ctx context.Context, animeID int64, groups []PublicAnimeContributionGroup, groupIndex map[int64]int) error {
	rows, err := r.db.Query(ctx, `
		SELECT ac.fansub_group_id, COUNT(DISTINCT hfgm.member_id) AS hidden_count
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE ac.anime_id = $1
		  AND (ac.is_public_on_anime_page = false OR hfgm.visibility <> 'public')
		GROUP BY ac.fansub_group_id
	`, animeID)
	if err != nil {
		return fmt.Errorf("public anime contributions: hidden counts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var fgID int64
		var hidden int
		if err := rows.Scan(&fgID, &hidden); err != nil {
			return fmt.Errorf("public anime contributions: hidden counts scan: %w", err)
		}
		if idx, ok := groupIndex[fgID]; ok {
			groups[idx].HiddenContributorCount = hidden
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("public anime contributions: hidden counts iterate: %w", err)
	}
	return nil
}

// --- (B) GET /fansubs/:id/contributions ---

// GetPublicGroupContributions returns a fansub group's public leader timeline plus aggregate counts.
func (r *AnimeContributionsRepository) GetPublicGroupContributions(ctx context.Context, fansubGroupID int64) (*PublicGroupContributionsResponse, error) {
	resp := &PublicGroupContributionsResponse{
		LeaderTimeline: make([]PublicFansubLeaderEntry, 0),
	}

	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")

	leaderQuery := `
		SELECT
			` + displayCol + ` AS member_display_name,
			` + slugCol + ` AS member_slug,
			r.role_code,
			COALESCE(rd.label_de, r.role_code) AS role_label,
			r.started_year,
			r.ended_year,
			r.status
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN role_definitions rd ON rd.code = r.role_code
		WHERE hfgm.fansub_group_id = $1
		  AND r.role_code IN ('leader', 'founder')
		  AND r.visibility = 'public'
		ORDER BY COALESCE(r.started_year, 9999), member_display_name
	`
	rows, err := r.db.Query(ctx, leaderQuery, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("public group contributions: leaders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e PublicFansubLeaderEntry
		if err := rows.Scan(
			&e.MemberDisplayName, &e.MemberSlug, &e.RoleCode,
			&e.RoleLabel, &e.StartedYear, &e.EndedYear, &e.Status,
		); err != nil {
			return nil, fmt.Errorf("public group contributions: leaders scan: %w", err)
		}
		resp.LeaderTimeline = append(resp.LeaderTimeline, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("public group contributions: leaders iterate: %w", err)
	}

	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT anime_id)
		FROM anime_contributions
		WHERE fansub_group_id = $1 AND is_public_on_anime_page = true
	`, fansubGroupID).Scan(&resp.AnimeCount); err != nil {
		return nil, fmt.Errorf("public group contributions: anime count: %w", err)
	}

	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT member_id)
		FROM hist_fansub_group_members
		WHERE fansub_group_id = $1 AND visibility = 'public'
	`, fansubGroupID).Scan(&resp.MemberCount); err != nil {
		return nil, fmt.Errorf("public group contributions: member count: %w", err)
	}

	return resp, nil
}

// --- (C) GET /members/:slug/contributions ---

// GetPublicMemberContributions returns a member's public role timeline (group history + anime
// contributions) resolved by the derived member slug. Returns an empty timeline (HTTP 200) when
// no member matches the slug.
func (r *AnimeContributionsRepository) GetPublicMemberContributions(ctx context.Context, memberSlug string) (*PublicMemberContributionsResponse, error) {
	resp := &PublicMemberContributionsResponse{
		RoleTimeline:  make([]PublicMemberRoleEntry, 0),
		HasUnverified: false,
	}

	resolveExpr := `LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(nickname), '[^a-z0-9]+', '-', 'gi')))`
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT id FROM members
		WHERE `+resolveExpr+` = $1
		LIMIT 1
	`, memberSlug).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return resp, nil
		}
		return nil, fmt.Errorf("public member contributions: resolve slug: %w", err)
	}

	timelineQuery := `
		SELECT
			fg.name AS fansub_group_name,
			fg.slug AS fansub_group_slug,
			r.role_code,
			COALESCE(rd.label_de, r.role_code) AS role_label,
			'group_history'::text AS context,
			NULL::text AS anime_title,
			NULL::bigint AS anime_id,
			r.started_year,
			r.ended_year,
			r.status
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id
		LEFT JOIN role_definitions rd ON rd.code = r.role_code
		WHERE hfgm.member_id = $1 AND r.visibility = 'public'

		UNION ALL

		SELECT
			fg.name AS fansub_group_name,
			fg.slug AS fansub_group_slug,
			acr.role_code,
			COALESCE(rd.label_de, acr.role_code) AS role_label,
			'anime_contribution'::text AS context,
			a.title AS anime_title,
			a.id AS anime_id,
			ac.started_year,
			ac.ended_year,
			ac.status
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN anime a ON a.id = ac.anime_id
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE hfgm.member_id = $1 AND ac.is_public_on_member_profile = true

		ORDER BY COALESCE(started_year, 9999)
	`
	rows, err := r.db.Query(ctx, timelineQuery, memberID)
	if err != nil {
		return nil, fmt.Errorf("public member contributions: timeline: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e PublicMemberRoleEntry
		if err := rows.Scan(
			&e.FansubGroupName, &e.FansubGroupSlug, &e.RoleCode, &e.RoleLabel,
			&e.Context, &e.AnimeTitle, &e.AnimeID,
			&e.StartedYear, &e.EndedYear, &e.Status,
		); err != nil {
			return nil, fmt.Errorf("public member contributions: timeline scan: %w", err)
		}
		if e.Status != "confirmed" {
			resp.HasUnverified = true
		}
		resp.RoleTimeline = append(resp.RoleTimeline, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("public member contributions: timeline iterate: %w", err)
	}

	return resp, nil
}

// --- helpers ---

func minYearPtr(cur, candidate *int) *int {
	if candidate == nil {
		return cur
	}
	if cur == nil || *candidate < *cur {
		v := *candidate
		return &v
	}
	return cur
}

func maxYearPtr(cur, candidate *int) *int {
	if candidate == nil {
		return cur
	}
	if cur == nil || *candidate > *cur {
		v := *candidate
		return &v
	}
	return cur
}
