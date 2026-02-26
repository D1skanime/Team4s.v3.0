package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FansubRepository struct {
	db *pgxpool.Pool
}

func NewFansubRepository(db *pgxpool.Pool) *FansubRepository {
	return &FansubRepository{db: db}
}

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
			id, slug, name, description, history, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, status, group_type, website_url, discord_url, irc_url, country,
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

	return items, total, nil
}

func (r *FansubRepository) CreateGroup(
	ctx context.Context,
	input models.FansubGroupCreateInput,
) (*models.FansubGroup, error) {
	groupType := input.GroupType
	if groupType == "" {
		groupType = models.FansubGroupTypeGroup
	}

	query := `
		INSERT INTO fansub_groups (
			slug, name, description, history, logo_id, banner_id, logo_url, banner_url, founded_year,
			dissolved_year, status, group_type, website_url, discord_url, irc_url, country
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING
			id, slug, name, description, history, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, status, group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(
		ctx,
		query,
		input.Slug,
		input.Name,
		input.Description,
		input.History,
		input.LogoID,
		input.BannerID,
		input.LogoURL,
		input.BannerURL,
		input.FoundedYear,
		input.DissolvedYear,
		input.Status,
		groupType,
		input.WebsiteURL,
		input.DiscordURL,
		input.IrcURL,
		input.Country,
	).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Description,
		&item.History,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
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

	return &item, nil
}

func (r *FansubRepository) GetGroupByID(ctx context.Context, id int64) (*models.FansubGroup, error) {
	query := `
		SELECT
			id, slug, name, description, history, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, status, group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
		FROM fansub_groups
		WHERE id = $1
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Description,
		&item.History,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
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

	return &item, nil
}

func (r *FansubRepository) GetGroupBySlug(ctx context.Context, slug string) (*models.FansubGroup, error) {
	query := `
		SELECT
			id, slug, name, description, history, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, status, group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
		FROM fansub_groups
		WHERE slug = $1
	`

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, slug).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Description,
		&item.History,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
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
	if input.Description.Set {
		assignments = append(assignments, fmt.Sprintf("description = $%d", argPos))
		args = append(args, input.Description.Value)
		argPos++
	}
	if input.History.Set {
		assignments = append(assignments, fmt.Sprintf("history = $%d", argPos))
		args = append(args, input.History.Value)
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
	if input.GroupType.Set {
		assignments = append(assignments, fmt.Sprintf("group_type = $%d", argPos))
		args = append(args, input.GroupType.Value)
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

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update fansub group %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_groups
		SET %s
		WHERE id = $%d
		RETURNING
			id, slug, name, description, history, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, status, group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, id)

	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Description,
		&item.History,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
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

	return &item, nil
}

func (r *FansubRepository) DeleteGroup(ctx context.Context, id int64) error {
	commandTag, err := r.db.Exec(ctx, `DELETE FROM fansub_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete fansub group %d: %w", id, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) ListAliases(ctx context.Context, fansubID int64) ([]models.FansubAlias, error) {
	exists, err := r.fansubGroupExists(ctx, fansubID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, alias, created_at, updated_at
		FROM fansub_group_aliases
		WHERE fansub_group_id = $1
		ORDER BY alias ASC, id ASC
	`, fansubID)
	if err != nil {
		return nil, fmt.Errorf("query fansub aliases for group %d: %w", fansubID, err)
	}
	defer rows.Close()

	items := make([]models.FansubAlias, 0, 16)
	for rows.Next() {
		var item models.FansubAlias
		if err := rows.Scan(
			&item.ID,
			&item.FansubGroupID,
			&item.Alias,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub alias row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub alias rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) CreateAlias(
	ctx context.Context,
	fansubID int64,
	input models.FansubAliasCreateInput,
) (*models.FansubAlias, error) {
	query := `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
		VALUES ($1, $2, $3)
		RETURNING id, fansub_group_id, alias, created_at, updated_at
	`

	var item models.FansubAlias
	if err := r.db.QueryRow(
		ctx,
		query,
		fansubID,
		input.Alias,
		input.NormalizedAlias,
	).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Alias,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create fansub alias for group %d: %w", fansubID, err)
	}

	return &item, nil
}

func (r *FansubRepository) DeleteAlias(ctx context.Context, fansubID, aliasID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM fansub_group_aliases WHERE id = $1 AND fansub_group_id = $2`,
		aliasID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("delete fansub alias %d: %w", aliasID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) ListAnimeAliasCandidates(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubAliasCandidate, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id, alias
		FROM (
			SELECT afg.fansub_group_id, fg.slug AS alias, 1 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
			WHERE afg.anime_id = $1
			UNION ALL
			SELECT afg.fansub_group_id, fg.name AS alias, 2 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
			WHERE afg.anime_id = $1
			UNION ALL
			SELECT afg.fansub_group_id, fga.alias AS alias, 3 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_group_aliases fga ON fga.fansub_group_id = afg.fansub_group_id
			WHERE afg.anime_id = $1
		) candidates
		WHERE btrim(alias) <> ''
		ORDER BY priority ASC, fansub_group_id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime alias candidates for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.AnimeFansubAliasCandidate, 0, 32)
	for rows.Next() {
		var item models.AnimeFansubAliasCandidate
		if err := rows.Scan(&item.FansubGroupID, &item.Alias); err != nil {
			return nil, fmt.Errorf("scan anime alias candidate row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime alias candidate rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) ListMembers(ctx context.Context, fansubID int64) ([]models.FansubMember, error) {
	exists, err := r.fansubGroupExists(ctx, fansubID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
		FROM fansub_members
		WHERE fansub_group_id = $1
		ORDER BY handle ASC, id ASC
	`, fansubID)
	if err != nil {
		return nil, fmt.Errorf("query fansub members for group %d: %w", fansubID, err)
	}
	defer rows.Close()

	items := make([]models.FansubMember, 0, 16)
	for rows.Next() {
		var item models.FansubMember
		if err := rows.Scan(
			&item.ID,
			&item.FansubGroupID,
			&item.Handle,
			&item.Role,
			&item.SinceYear,
			&item.UntilYear,
			&item.Notes,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub member row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub member rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) CreateMember(
	ctx context.Context,
	fansubID int64,
	input models.FansubMemberCreateInput,
) (*models.FansubMember, error) {
	query := `
		INSERT INTO fansub_members (fansub_group_id, handle, role, since_year, until_year, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
	`

	var item models.FansubMember
	if err := r.db.QueryRow(
		ctx,
		query,
		fansubID,
		input.Handle,
		input.Role,
		input.SinceYear,
		input.UntilYear,
		input.Notes,
	).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Handle,
		&item.Role,
		&item.SinceYear,
		&item.UntilYear,
		&item.Notes,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create fansub member for group %d: %w", fansubID, err)
	}

	return &item, nil
}

func (r *FansubRepository) UpdateMember(
	ctx context.Context,
	fansubID int64,
	memberID int64,
	input models.FansubMemberPatchInput,
) (*models.FansubMember, error) {
	assignments := make([]string, 0, 6)
	args := make([]any, 0, 6)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Handle.Set {
		assignments = append(assignments, fmt.Sprintf("handle = $%d", argPos))
		args = append(args, input.Handle.Value)
		argPos++
	}
	if input.Role.Set {
		assignments = append(assignments, fmt.Sprintf("role = $%d", argPos))
		args = append(args, input.Role.Value)
		argPos++
	}
	if input.SinceYear.Set {
		assignments = append(assignments, fmt.Sprintf("since_year = $%d", argPos))
		args = append(args, input.SinceYear.Value)
		argPos++
	}
	if input.UntilYear.Set {
		assignments = append(assignments, fmt.Sprintf("until_year = $%d", argPos))
		args = append(args, input.UntilYear.Value)
		argPos++
	}
	if input.Notes.Set {
		assignments = append(assignments, fmt.Sprintf("notes = $%d", argPos))
		args = append(args, input.Notes.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update fansub member %d: no patch fields provided", memberID)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_members
		SET %s
		WHERE id = $%d AND fansub_group_id = $%d
		RETURNING id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
	`, strings.Join(assignments, ", "), argPos, argPos+1)
	args = append(args, memberID, fansubID)

	var item models.FansubMember
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Handle,
		&item.Role,
		&item.SinceYear,
		&item.UntilYear,
		&item.Notes,
		&item.CreatedAt,
		&item.UpdatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("update fansub member %d: %w", memberID, err)
	}

	return &item, nil
}

func (r *FansubRepository) DeleteMember(ctx context.Context, fansubID, memberID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM fansub_members WHERE id = $1 AND fansub_group_id = $2`,
		memberID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("delete fansub member %d: %w", memberID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) ListAnimeFansubs(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubRelation, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1
		ORDER BY afg.is_primary DESC, fg.name ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime fansubs for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.AnimeFansubRelation, 0, 8)
	for rows.Next() {
		var item models.AnimeFansubRelation
		var group models.FansubGroupSummary
		if err := rows.Scan(
			&item.AnimeID,
			&item.FansubGroupID,
			&item.IsPrimary,
			&item.Notes,
			&item.CreatedAt,
			&group.ID,
			&group.Slug,
			&group.Name,
			&group.LogoURL,
		); err != nil {
			return nil, fmt.Errorf("scan anime fansub row: %w", err)
		}
		item.FansubGroup = &group
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime fansub rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) AttachAnimeFansub(
	ctx context.Context,
	animeID int64,
	fansubID int64,
	input models.AnimeFansubAttachInput,
) (*models.AnimeFansubRelation, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin attach anime fansub tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if input.IsPrimary {
		if _, err := tx.Exec(ctx, `
			UPDATE anime_fansub_groups
			SET is_primary = false
			WHERE anime_id = $1
		`, animeID); err != nil {
			return nil, fmt.Errorf("reset anime primary fansub %d: %w", animeID, err)
		}
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes) VALUES ($1, $2, $3, $4)`,
		animeID,
		fansubID,
		input.IsPrimary,
		input.Notes,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("insert anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}

	var item models.AnimeFansubRelation
	var group models.FansubGroupSummary
	if err := tx.QueryRow(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND afg.fansub_group_id = $2
	`, animeID, fansubID).Scan(
		&item.AnimeID,
		&item.FansubGroupID,
		&item.IsPrimary,
		&item.Notes,
		&item.CreatedAt,
		&group.ID,
		&group.Slug,
		&group.Name,
		&group.LogoURL,
	); err != nil {
		return nil, fmt.Errorf("load anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	item.FansubGroup = &group

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit attach anime fansub tx: %w", err)
	}

	return &item, nil
}

func (r *FansubRepository) DetachAnimeFansub(ctx context.Context, animeID, fansubID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM anime_fansub_groups WHERE anime_id = $1 AND fansub_group_id = $2`,
		animeID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("detach anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) fansubGroupExists(ctx context.Context, fansubID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`,
		fansubID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check fansub group existence %d: %w", fansubID, err)
	}

	return exists, nil
}

func (r *FansubRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`,
		animeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

func buildFansubGroupWhere(filter models.FansubFilter) (string, []any) {
	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)
	argPos := 1

	if filter.Q != "" {
		conditions = append(
			conditions,
			fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", argPos, argPos),
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

func scanFansubGroup(rows pgx.Rows) (*models.FansubGroup, error) {
	var item models.FansubGroup
	if err := rows.Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.Description,
		&item.History,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
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

// MergeGroups merges multiple source fansub groups into a target group.
// All episode_versions, anime_fansub_groups, and members are migrated.
// Source group slugs become aliases on the target.
// Source groups are then deleted.
func (r *FansubRepository) MergeGroups(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsResult, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified for merge")
	}

	// Check target exists
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	conflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}
	if conflicts > 0 {
		return nil, ErrConflict
	}

	// Start transaction
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin merge tx: %w", err)
	}
	defer tx.Rollback(ctx)

	result := &models.MergeGroupsResult{
		AliasesAdded: make([]string, 0, len(sourceIDs)),
	}

	// 1. Migrate episode_versions
	tag, err := tx.Exec(ctx, `
		UPDATE episode_versions SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate episode versions: %w", err)
	}
	result.VersionsMigrated = int(tag.RowsAffected())

	// 2. Migrate anime_fansub_groups (ignore duplicates)
	tag, err = tx.Exec(ctx, `
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes, created_at)
		SELECT anime_id, $1, false, notes, created_at
		FROM anime_fansub_groups WHERE fansub_group_id = ANY($2)
		ON CONFLICT (anime_id, fansub_group_id) DO NOTHING
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate anime fansub relations: %w", err)
	}
	result.RelationsMigrated = int(tag.RowsAffected())

	// 3. Migrate members (basic handling - no unique constraint)
	tag, err = tx.Exec(ctx, `
		UPDATE fansub_members SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate fansub members: %w", err)
	}
	result.MembersMigrated = int(tag.RowsAffected())

	// 4. Add source slugs as aliases on target
	rows, err := tx.Query(ctx, `
		SELECT slug FROM fansub_groups WHERE id = ANY($1) ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch source slugs: %w", err)
	}
	var slugs []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan source slug: %w", err)
		}
		slugs = append(slugs, slug)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate source slugs: %w", err)
	}

	for _, slug := range slugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
			VALUES ($1, $2, $3)
			ON CONFLICT (normalized_alias) DO NOTHING
		`, targetID, slug, normalized)
		if err != nil {
			return nil, fmt.Errorf("add alias %q: %w", slug, err)
		}
		if tag.RowsAffected() > 0 {
			result.AliasesAdded = append(result.AliasesAdded, slug)
		}
	}

	// 5. Delete source groups (CASCADE handles members and anime_fansub_groups)
	tag, err = tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = ANY($1)`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("delete source groups: %w", err)
	}
	result.MergedCount = int(tag.RowsAffected())

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit merge tx: %w", err)
	}

	return result, nil
}

// normalizeAliasKey returns a lowercase alphanumeric-only version of the alias
func normalizeAliasKey(raw string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(raw) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// ListCollaborationMembers returns all member groups for a collaboration
func (r *FansubRepository) ListCollaborationMembers(
	ctx context.Context,
	collaborationID int64,
) ([]models.CollaborationMember, error) {
	exists, err := r.fansubGroupExists(ctx, collaborationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			fcm.collaboration_id, fcm.member_group_id, fcm.added_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM fansub_collaboration_members fcm
		JOIN fansub_groups fg ON fg.id = fcm.member_group_id
		WHERE fcm.collaboration_id = $1
		ORDER BY fg.name ASC
	`, collaborationID)
	if err != nil {
		return nil, fmt.Errorf("query collaboration members for %d: %w", collaborationID, err)
	}
	defer rows.Close()

	items := make([]models.CollaborationMember, 0, 8)
	for rows.Next() {
		var item models.CollaborationMember
		var group models.FansubGroupSummary
		if err := rows.Scan(
			&item.CollaborationID,
			&item.MemberGroupID,
			&item.AddedAt,
			&group.ID,
			&group.Slug,
			&group.Name,
			&group.LogoURL,
		); err != nil {
			return nil, fmt.Errorf("scan collaboration member row: %w", err)
		}
		item.MemberGroup = &group
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate collaboration member rows: %w", err)
	}

	return items, nil
}

// AddCollaborationMember adds a member group to a collaboration
func (r *FansubRepository) AddCollaborationMember(
	ctx context.Context,
	collaborationID int64,
	memberGroupID int64,
) (*models.CollaborationMember, error) {
	// Insert the relation
	_, err := r.db.Exec(ctx, `
		INSERT INTO fansub_collaboration_members (collaboration_id, member_group_id)
		VALUES ($1, $2)
	`, collaborationID, memberGroupID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("add collaboration member (%d,%d): %w", collaborationID, memberGroupID, err)
	}

	// Load and return the created relation with group info
	var item models.CollaborationMember
	var group models.FansubGroupSummary
	if err := r.db.QueryRow(ctx, `
		SELECT
			fcm.collaboration_id, fcm.member_group_id, fcm.added_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM fansub_collaboration_members fcm
		JOIN fansub_groups fg ON fg.id = fcm.member_group_id
		WHERE fcm.collaboration_id = $1 AND fcm.member_group_id = $2
	`, collaborationID, memberGroupID).Scan(
		&item.CollaborationID,
		&item.MemberGroupID,
		&item.AddedAt,
		&group.ID,
		&group.Slug,
		&group.Name,
		&group.LogoURL,
	); err != nil {
		return nil, fmt.Errorf("load collaboration member (%d,%d): %w", collaborationID, memberGroupID, err)
	}
	item.MemberGroup = &group

	return &item, nil
}

// RemoveCollaborationMember removes a member group from a collaboration
func (r *FansubRepository) RemoveCollaborationMember(
	ctx context.Context,
	collaborationID int64,
	memberGroupID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM fansub_collaboration_members
		WHERE collaboration_id = $1 AND member_group_id = $2
	`, collaborationID, memberGroupID)
	if err != nil {
		return fmt.Errorf("remove collaboration member (%d,%d): %w", collaborationID, memberGroupID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// GetMergePreview returns statistics about what would happen if groups were merged
func (r *FansubRepository) GetMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsPreview, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified")
	}
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	versionConflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}

	result := &models.MergeGroupsPreview{
		MergedCount:    len(sourceIDs),
		AliasesAdded:   make([]string, 0, len(sourceIDs)),
		AliasesSkipped: make([]string, 0, len(sourceIDs)),
		CanMerge:       versionConflicts == 0,
		Conflicts: models.MergePreviewConflicts{
			VersionConflicts:          versionConflicts,
			DuplicateAliases:          make([]string, 0, 8),
			DuplicateMembers:          make([]string, 0, 8),
			DuplicateRelationAnimeIDs: make([]int64, 0, 16),
			DuplicateSlugs:            make([]string, 0, 4),
			DuplicateNames:            make([]string, 0, 4),
		},
	}

	// Count episode versions
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM episode_versions WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.VersionsMigrated); err != nil {
		return nil, fmt.Errorf("count episode versions: %w", err)
	}

	// Count members
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_members WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.MembersMigrated); err != nil {
		return nil, fmt.Errorf("count members: %w", err)
	}

	// Count anime relations
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_fansub_groups WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.RelationsMigrated); err != nil {
		return nil, fmt.Errorf("count relations: %w", err)
	}

	if err := r.populateAliasMergePreview(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeMemberDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeRelationDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeNameSlugCollisions(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}

	return result, nil
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

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM episode_versions WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
		ids,
		func(i int, count int) { items[i].EpisodeVersionsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load episode version counts: %w", err)
	}

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM fansub_members WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
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

func (r *FansubRepository) populateAliasMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	rows, err := r.db.Query(ctx, `
		SELECT slug
		FROM fansub_groups
		WHERE id = ANY($1)
		ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview source groups: %w", err)
	}
	defer rows.Close()

	sourceSlugs := make([]string, 0, len(sourceIDs))
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return fmt.Errorf("scan merge preview source group: %w", err)
		}
		sourceSlugs = append(sourceSlugs, slug)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview source groups: %w", err)
	}

	normalizedInputs := make([]string, 0, len(sourceSlugs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		normalizedInputs = append(normalizedInputs, normalized)
	}

	existingNormalized := make(map[string]struct{}, len(normalizedInputs)+2)
	if len(normalizedInputs) > 0 {
		aliasRows, err := r.db.Query(ctx, `
			SELECT normalized_alias
			FROM fansub_group_aliases
			WHERE normalized_alias = ANY($1)
		`, normalizedInputs)
		if err != nil {
			return fmt.Errorf("query merge preview alias collisions: %w", err)
		}
		for aliasRows.Next() {
			var normalized string
			if err := aliasRows.Scan(&normalized); err != nil {
				aliasRows.Close()
				return fmt.Errorf("scan merge preview alias collision: %w", err)
			}
			existingNormalized[normalized] = struct{}{}
		}
		aliasRows.Close()
		if err := aliasRows.Err(); err != nil {
			return fmt.Errorf("iterate merge preview alias collisions: %w", err)
		}
	}

	acceptedNormalized := make(map[string]struct{}, len(normalizedInputs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := existingNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := acceptedNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		acceptedNormalized[normalized] = struct{}{}
		result.AliasesAdded = append(result.AliasesAdded, slug)
	}

	duplicateAliases := make([]string, 0, len(result.AliasesSkipped))
	seenDuplicateAlias := make(map[string]struct{}, len(result.AliasesSkipped))
	for _, slug := range result.AliasesSkipped {
		if _, exists := seenDuplicateAlias[slug]; exists {
			continue
		}
		seenDuplicateAlias[slug] = struct{}{}
		duplicateAliases = append(duplicateAliases, slug)
	}
	result.Conflicts.DuplicateAliases = duplicateAliases
	result.Conflicts.DuplicateAliasesCount = len(duplicateAliases)

	return nil
}

func (r *FansubRepository) populateMergeMemberDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH duplicate_members AS (
			SELECT
				lower(btrim(handle)) AS handle_key,
				lower(btrim(role)) AS role_key,
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_members
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateMembersCount); err != nil {
		return fmt.Errorf("count merge preview duplicate members: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH duplicate_members AS (
			SELECT
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT display_handle, display_role, duplicate_count
		FROM duplicate_members
		ORDER BY duplicate_count DESC, display_handle ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate members: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var handle string
		var role string
		var count int
		if err := rows.Scan(&handle, &role, &count); err != nil {
			return fmt.Errorf("scan merge preview duplicate member: %w", err)
		}
		result.Conflicts.DuplicateMembers = append(result.Conflicts.DuplicateMembers, fmt.Sprintf("%s (%s) x%d", handle, role, count))
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate members: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeRelationDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT COUNT(*) FROM duplicate_rel
	`, sourceIDs, targetID).Scan(&result.Conflicts.DuplicateRelationsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate relations: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT anime_id
		FROM duplicate_rel
		ORDER BY anime_id ASC
		LIMIT 25
	`, sourceIDs, targetID)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate relations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var animeID int64
		if err := rows.Scan(&animeID); err != nil {
			return fmt.Errorf("scan merge preview duplicate relation: %w", err)
		}
		result.Conflicts.DuplicateRelationAnimeIDs = append(result.Conflicts.DuplicateRelationAnimeIDs, animeID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate relations: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeNameSlugCollisions(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug))
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_slugs
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateSlugsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate slugs: %w", err)
	}

	slugRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug)) AS slug_key, MIN(slug) AS slug_label
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT slug_label
		FROM duplicate_slugs
		ORDER BY slug_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate slugs: %w", err)
	}
	for slugRows.Next() {
		var slug string
		if err := slugRows.Scan(&slug); err != nil {
			slugRows.Close()
			return fmt.Errorf("scan merge preview duplicate slug: %w", err)
		}
		result.Conflicts.DuplicateSlugs = append(result.Conflicts.DuplicateSlugs, slug)
	}
	slugRows.Close()
	if err := slugRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate slugs: %w", err)
	}

	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name))
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_names
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateNamesCount); err != nil {
		return fmt.Errorf("count merge preview duplicate names: %w", err)
	}

	nameRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name)) AS name_key, MIN(name) AS name_label
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT name_label
		FROM duplicate_names
		ORDER BY name_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate names: %w", err)
	}
	for nameRows.Next() {
		var name string
		if err := nameRows.Scan(&name); err != nil {
			nameRows.Close()
			return fmt.Errorf("scan merge preview duplicate name: %w", err)
		}
		result.Conflicts.DuplicateNames = append(result.Conflicts.DuplicateNames, name)
	}
	nameRows.Close()
	if err := nameRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate names: %w", err)
	}

	return nil
}

func (r *FansubRepository) countExistingFansubGroups(ctx context.Context, ids []int64) (int, error) {
	var count int
	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM fansub_groups WHERE id = ANY($1)`,
		ids,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("count existing fansub groups: %w", err)
	}

	return count, nil
}

func (r *FansubRepository) countMergeVersionConflicts(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (int, error) {
	var conflicts int
	if err := r.db.QueryRow(ctx, `
		WITH candidate_versions AS (
			SELECT
				anime_id,
				episode_number,
				COALESCE(video_quality, '') AS video_quality_key,
				COALESCE(subtitle_type, '') AS subtitle_type_key,
				CASE
					WHEN fansub_group_id = ANY($1) THEN $2
					ELSE fansub_group_id
				END AS target_group_id
			FROM episode_versions
			WHERE fansub_group_id = $2 OR fansub_group_id = ANY($1)
		)
		SELECT COUNT(*)
		FROM (
			SELECT 1
			FROM candidate_versions
			GROUP BY anime_id, episode_number, target_group_id, video_quality_key, subtitle_type_key
			HAVING COUNT(*) > 1
		) conflicts
	`, sourceIDs, targetID).Scan(&conflicts); err != nil {
		return 0, fmt.Errorf("count merge conflicts: %w", err)
	}

	return conflicts, nil
}
