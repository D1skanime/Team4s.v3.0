package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *FansubRepository) ListGroups(
	ctx context.Context,
	filter models.FansubFilter,
) ([]models.FansubGroup, int64, error) {
	whereSQL, args := buildFansubGroupWhere(filter)

	countQuery := "SELECT COUNT(*) FROM fansub_groups" + whereSQL
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count fansub groups: %w", err)
	}

	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (filter.Page - 1) * filter.PerPage

	listQuery := fmt.Sprintf(`
		SELECT
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
		FROM fansub_groups
		%s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitPos, offsetPos)

	rows, err := r.db.Query(ctx, listQuery, append(args, filter.PerPage, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("query fansub groups: %w", err)
	}
	defer rows.Close()

	items := make([]models.FansubGroup, 0, filter.PerPage)
	for rows.Next() {
		item, err := scanFansubGroup(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate fansub groups: %w", err)
	}

	if err := r.attachGroupCounts(ctx, items); err != nil {
		return nil, 0, err
	}
	if err := r.attachGroupLinks(ctx, items); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *FansubRepository) CreateGroup(
	ctx context.Context,
	input models.FansubGroupCreateInput,
) (*models.FansubGroup, error) {
	// GAP-05 parity with UpdateGroup (176-EXTRA Scope Addition 2): a non-empty
	// Kürzel must be cross-checked against every OTHER group's Kürzel/Alias
	// before insert. excludeGroupID is 0 here because the new group has no id
	// yet -- fansub_groups.id is a BIGSERIAL starting at 1, so "<> 0" never
	// excludes a real row.
	var normalizedKuerzel *string
	if input.Kuerzel != nil {
		normalizedValue := normalizeAliasKey(*input.Kuerzel)
		if normalizedValue != "" {
			owner, err := r.findFansubKuerzelOrAliasOwner(ctx, normalizedValue, 0)
			if err != nil {
				return nil, err
			}
			if owner != nil {
				return nil, &ConflictOwnerError{OwnerGroupID: owner.ID, OwnerGroupName: owner.Name}
			}
			normalizedKuerzel = &normalizedValue
		}
	}

	query := `
		INSERT INTO fansub_groups (
			slug, name, kuerzel, normalized_kuerzel, logo_id, banner_id, logo_url, banner_url, founded_year,
			dissolved_year, status, website_url, discord_url, irc_url, country
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(
		ctx,
		query,
		input.Slug,
		input.Name,
		input.Kuerzel,
		normalizedKuerzel,
		input.LogoID,
		input.BannerID,
		input.LogoURL,
		input.BannerURL,
		input.FoundedYear,
		input.DissolvedYear,
		input.Status,
		input.WebsiteURL,
		input.DiscordURL,
		input.IrcURL,
		input.Country,
	).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Kuerzel,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create fansub group: %w", err)
	}

	if err := r.hydrateFansubGroup(ctx, &item); err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *FansubRepository) GetGroupByID(ctx context.Context, id int64) (*models.FansubGroup, error) {
	query := `
		SELECT
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
		FROM fansub_groups
		WHERE id = $1
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Kuerzel,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get fansub group %d: %w", id, err)
	}

	if err := r.hydrateFansubGroup(ctx, &item); err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *FansubRepository) GetGroupBySlug(ctx context.Context, slug string) (*models.FansubGroup, error) {
	query := `
		SELECT
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
		FROM fansub_groups
		WHERE slug = $1
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, slug).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Kuerzel,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get fansub group %q: %w", slug, err)
	}

	if err := r.hydrateFansubGroup(ctx, &item); err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *FansubRepository) UpdateGroup(
	ctx context.Context,
	id int64,
	input models.FansubGroupPatchInput,
) (*models.FansubGroup, error) {
	assignments := make([]string, 0, 14)
	args := make([]any, 0, 14)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Slug.Set {
		assignments = append(assignments, fmt.Sprintf("slug = $%d", argPos))
		args = append(args, input.Slug.Value)
		argPos++
	}
	if input.Name.Set {
		assignments = append(assignments, fmt.Sprintf("name = $%d", argPos))
		args = append(args, input.Name.Value)
		argPos++
	}
	if input.LogoID.Set {
		assignments = append(assignments, fmt.Sprintf("logo_id = $%d", argPos))
		args = append(args, input.LogoID.Value)
		argPos++
	}
	if input.BannerID.Set {
		assignments = append(assignments, fmt.Sprintf("banner_id = $%d", argPos))
		args = append(args, input.BannerID.Value)
		argPos++
	}
	if input.LogoURL.Set {
		assignments = append(assignments, fmt.Sprintf("logo_url = $%d", argPos))
		args = append(args, input.LogoURL.Value)
		argPos++
	}
	if input.BannerURL.Set {
		assignments = append(assignments, fmt.Sprintf("banner_url = $%d", argPos))
		args = append(args, input.BannerURL.Value)
		argPos++
	}
	if input.FoundedYear.Set {
		assignments = append(assignments, fmt.Sprintf("founded_year = $%d", argPos))
		args = append(args, input.FoundedYear.Value)
		argPos++
	}
	if input.DissolvedYear.Set {
		assignments = append(assignments, fmt.Sprintf("dissolved_year = $%d", argPos))
		args = append(args, input.DissolvedYear.Value)
		argPos++
	}
	if input.Status.Set {
		assignments = append(assignments, fmt.Sprintf("status = $%d", argPos))
		args = append(args, input.Status.Value)
		argPos++
	}
	if input.WebsiteURL.Set {
		assignments = append(assignments, fmt.Sprintf("website_url = $%d", argPos))
		args = append(args, input.WebsiteURL.Value)
		argPos++
	}
	if input.DiscordURL.Set {
		assignments = append(assignments, fmt.Sprintf("discord_url = $%d", argPos))
		args = append(args, input.DiscordURL.Value)
		argPos++
	}
	if input.IrcURL.Set {
		assignments = append(assignments, fmt.Sprintf("irc_url = $%d", argPos))
		args = append(args, input.IrcURL.Value)
		argPos++
	}
	if input.Country.Set {
		assignments = append(assignments, fmt.Sprintf("country = $%d", argPos))
		args = append(args, input.Country.Value)
		argPos++
	}
	if input.Kuerzel.Set {
		var normalized *string
		if input.Kuerzel.Value != nil {
			normalizedValue := normalizeAliasKey(*input.Kuerzel.Value)
			if normalizedValue != "" {
				owner, err := r.findFansubKuerzelOrAliasOwner(ctx, normalizedValue, id)
				if err != nil {
					return nil, err
				}
				if owner != nil {
					return nil, &ConflictOwnerError{OwnerGroupID: owner.ID, OwnerGroupName: owner.Name}
				}
				normalized = &normalizedValue
			}
		}
		assignments = append(assignments, fmt.Sprintf("kuerzel = $%d", argPos))
		args = append(args, input.Kuerzel.Value)
		argPos++
		assignments = append(assignments, fmt.Sprintf("normalized_kuerzel = $%d", argPos))
		args = append(args, normalized)
		argPos++
	}

	if len(assignments) == 1 {
		if input.GroupType.Set {
			return r.GetGroupByID(ctx, id)
		}
		return nil, fmt.Errorf("update fansub group %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_groups
		SET %s
		WHERE id = $%d
		RETURNING
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, id)

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Kuerzel,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("update fansub group %d: %w", id, err)
	}

	if err := r.hydrateFansubGroup(ctx, &item); err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *FansubRepository) DeleteGroup(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin delete fansub group tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Historical members and contributions intentionally use RESTRICT FKs.
	// Admin group deletion is the explicit cleanup boundary for those records.
	if _, err := tx.Exec(ctx, `DELETE FROM anime_contributions WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d contributions: %w", id, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM hist_fansub_group_members WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d historical members: %w", id, err)
	}

	commandTag, err := tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete fansub group %d: %w", id, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete fansub group tx: %w", err)
	}

	return nil
}

func buildFansubGroupWhere(filter models.FansubFilter) (string, []any) {
	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)
	argPos := 1

	if filter.Q != "" {
		conditions = append(
			conditions,
			fmt.Sprintf(
				`(
					name ILIKE $%[1]d
					OR slug ILIKE $%[1]d
					OR EXISTS (
						SELECT 1
						FROM fansub_group_aliases fga
						WHERE fga.fansub_group_id = fansub_groups.id
						  AND fga.alias ILIKE $%[1]d
					)
				)`,
				argPos,
			),
		)
		args = append(args, "%"+filter.Q+"%")
		argPos++
	}

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, filter.Status)
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}

type fansubRowScanner interface {
	Scan(dest ...any) error
}

func scanFansubGroup(rows fansubRowScanner) (*models.FansubGroup, error) {
	var item models.FansubGroup
	if err := rows.Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Kuerzel,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan fansub group row: %w", err)
	}

	return &item, nil
}

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
