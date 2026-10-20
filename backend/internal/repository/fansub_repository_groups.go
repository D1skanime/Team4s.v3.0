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
			founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
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
	if err := r.attachGroupAliases(ctx, items); err != nil {
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
			founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
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
			founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
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
			founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
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
		return nil, fmt.Errorf("update fansub group %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_groups
		SET %s
		WHERE id = $%d
		RETURNING
			id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
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
