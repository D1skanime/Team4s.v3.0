package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// 189-08 Task 1: split out of fansub_repository_groups.go (pure import-path
// move, zero behavior change) -- fansub_repository_groups.go had grown past
// the 450-line project limit. This file holds the read-side hydration
// helpers used by ListGroups/CreateGroup/GetGroupByID/GetGroupBySlug/
// UpdateGroup to attach counts, links, and aliases onto already-scanned
// models.FansubGroup rows.

func (r *FansubRepository) attachGroupCounts(ctx context.Context, items []models.FansubGroup) error {
	if len(items) == 0 {
		return nil
	}

	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM anime_fansub_groups WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
		ids,
		func(i int, count int) { items[i].AnimeRelationsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load anime relation counts: %w", err)
	}

	// ProjectsCount mirrors listPublicFansubProjects's WHERE clause exactly
	// (a.status <> 'disabled'), unlike AnimeRelationsCount above which counts
	// all anime_fansub_groups rows with no anime.status filter at all. Keep
	// this filter in sync with listPublicFansubProjects or the directory's
	// "Anime-Projekte" figure will silently diverge from the detail page's.
	if err := r.populateCountMap(
		ctx,
		`
		SELECT afg.fansub_group_id AS group_id, COUNT(*)
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		WHERE afg.fansub_group_id = ANY($1)
		  AND a.status <> 'disabled'
		GROUP BY afg.fansub_group_id
		`,
		ids,
		func(i int, count int) { items[i].ProjectsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load project counts: %w", err)
	}

	if err := r.populateCountMap(
		ctx,
		`
		SELECT group_id, COUNT(*)
		FROM (
			SELECT fansub_group_id AS group_id
			FROM release_version_groups
			WHERE fansub_group_id = ANY($1)
		) grouped
		GROUP BY group_id
		`,
		ids,
		func(i int, count int) { items[i].ReleaseVersionsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load episode version counts: %w", err)
	}

	// MembersCount mirrors countVisibleTeamMembers (FansubTeamSection.tsx): active
	// fansub_group_members (no profile_visibility row filter, so private/unclaimed
	// active members still count, matching listProjectionMembers) PLUS publicly
	// visible historical hist_fansub_group_members rows (matching
	// listProjectionHistorical). Groups with no visible members keep 0.
	if err := r.populateCountMap(
		ctx,
		`
		SELECT group_id, COUNT(*)
		FROM (
			SELECT fgm.fansub_group_id AS group_id
			FROM fansub_group_members fgm
			JOIN app_users au ON au.id = fgm.app_user_id
			WHERE fgm.fansub_group_id = ANY($1)
			  AND fgm.status = 'active'
			UNION ALL
			SELECT hfgm.fansub_group_id AS group_id
			FROM hist_fansub_group_members hfgm
			WHERE hfgm.fansub_group_id = ANY($1)
			  AND hfgm.status IN ('historical', 'confirmed')
			  AND hfgm.visibility = 'public'
		) combined
		GROUP BY group_id
		`,
		ids,
		func(i int, count int) { items[i].MembersCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load member counts: %w", err)
	}

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM fansub_group_aliases WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
		ids,
		func(i int, count int) { items[i].AliasesCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load alias counts: %w", err)
	}

	return nil
}

func (r *FansubRepository) attachGroupLinks(ctx context.Context, items []models.FansubGroup) error {
	if len(items) == 0 {
		return nil
	}

	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, group_id, link_type, name, url, created_at
		FROM fansub_group_links
		WHERE group_id = ANY($1)
		ORDER BY link_type ASC, created_at ASC, id ASC
	`, ids)
	if err != nil {
		return fmt.Errorf("query fansub group links: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		item, err := scanFansubGroupLink(rows)
		if err != nil {
			return err
		}
		index, ok := indexByID[item.GroupID]
		if ok {
			items[index].Links = append(items[index].Links, *item)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate fansub group links: %w", err)
	}

	for i := range items {
		applyLegacyLinkProjection(&items[i])
	}

	return nil
}

// attachGroupAliases loads every alias string stored for the given groups
// in a single bulk-by-ID query (mirrors attachGroupLinks's shape exactly)
// and appends each alias onto the matching items[i].Aliases slice, ordered
// alphabetically. Groups with zero aliases keep Aliases as nil, not an
// error.
func (r *FansubRepository) attachGroupAliases(ctx context.Context, items []models.FansubGroup) error {
	if len(items) == 0 {
		return nil
	}

	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id, alias
		FROM fansub_group_aliases
		WHERE fansub_group_id = ANY($1)
		ORDER BY alias ASC
	`, ids)
	if err != nil {
		return fmt.Errorf("query fansub group aliases: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int64
		var alias string
		if err := rows.Scan(&groupID, &alias); err != nil {
			return fmt.Errorf("scan fansub group alias row: %w", err)
		}
		index, ok := indexByID[groupID]
		if ok {
			items[index].Aliases = append(items[index].Aliases, alias)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate fansub group alias rows: %w", err)
	}

	return nil
}

func (r *FansubRepository) hydrateFansubGroup(ctx context.Context, item *models.FansubGroup) error {
	if item == nil {
		return nil
	}

	groups := []models.FansubGroup{*item}
	if err := r.attachGroupCounts(ctx, groups); err != nil {
		return err
	}
	if err := r.attachGroupLinks(ctx, groups); err != nil {
		return err
	}
	if err := r.attachGroupAliases(ctx, groups); err != nil {
		return err
	}
	*item = groups[0]

	return nil
}

func (r *FansubRepository) populateCountMap(
	ctx context.Context,
	query string,
	ids []int64,
	assign func(index int, count int),
	indexByID map[int64]int,
) error {
	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int64
		var count int
		if err := rows.Scan(&groupID, &count); err != nil {
			return fmt.Errorf("scan group count row: %w", err)
		}
		index, ok := indexByID[groupID]
		if ok {
			assign(index, count)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate group count rows: %w", err)
	}

	return nil
}

func applyLegacyLinkProjection(item *models.FansubGroup) {
	if item == nil {
		return
	}

	if url := firstLinkURL(item.Links, models.FansubGroupLinkTypeWebsite); url != nil {
		item.WebsiteURL = url
	}
	if url := firstLinkURL(item.Links, models.FansubGroupLinkTypeDiscord); url != nil {
		item.DiscordURL = url
	}
	if url := firstLinkURL(item.Links, models.FansubGroupLinkTypeIRC); url != nil {
		item.IrcURL = url
	}
}

func firstLinkURL(links []models.FansubGroupLink, linkType models.FansubGroupLinkType) *string {
	for i := range links {
		if links[i].LinkType != linkType {
			continue
		}
		url := links[i].URL
		return &url
	}

	return nil
}
