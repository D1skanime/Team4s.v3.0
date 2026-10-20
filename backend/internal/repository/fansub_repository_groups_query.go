package repository

import (
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

// 189-08 Task 1: split out of fansub_repository_groups.go (pure import-path
// move, zero behavior change) -- fansub_repository_groups.go had grown past
// the 450-line project limit. This file holds the group WHERE-clause builder
// and the shared row-scan helpers used by ListGroups/CreateGroup/etc.
// fansubRowScanner is ALSO used by fansub_repository_links.go's
// scanFansubGroupLink (same package, intentional shared interface).

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
