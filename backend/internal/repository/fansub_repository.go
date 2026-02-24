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
			id, slug, name, description, history, logo_url, banner_url,
			founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
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

	return items, total, nil
}

func (r *FansubRepository) CreateGroup(
	ctx context.Context,
	input models.FansubGroupCreateInput,
) (*models.FansubGroup, error) {
	query := `
		INSERT INTO fansub_groups (
			slug, name, description, history, logo_url, banner_url, founded_year,
			dissolved_year, status, website_url, discord_url, irc_url, country
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING
			id, slug, name, description, history, logo_url, banner_url,
			founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
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
		&item.Description,
		&item.History,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.Status,
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
			id, slug, name, description, history, logo_url, banner_url,
			founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
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
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.Status,
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
			id, slug, name, description, history, logo_url, banner_url,
			founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
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
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.Status,
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

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update fansub group %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_groups
		SET %s
		WHERE id = $%d
		RETURNING
			id, slug, name, description, history, logo_url, banner_url,
			founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
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
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.Status,
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
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.Status,
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
