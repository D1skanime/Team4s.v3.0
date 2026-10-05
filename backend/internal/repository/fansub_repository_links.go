package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

var allowedFansubGroupLinkTypes = map[models.FansubGroupLinkType]struct{}{
	models.FansubGroupLinkTypeWebsite: {},
	models.FansubGroupLinkTypeDiscord: {},
	models.FansubGroupLinkTypeTwitter: {},
	models.FansubGroupLinkTypeGitHub:  {},
	models.FansubGroupLinkTypeIRC:     {},
}

func (r *FansubRepository) ListGroupLinks(
	ctx context.Context,
	groupID int64,
) ([]models.FansubGroupLink, error) {
	exists, err := r.fansubGroupExists(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, group_id, link_type, name, url, created_at
		FROM fansub_group_links
		WHERE group_id = $1
		ORDER BY link_type ASC, created_at ASC, id ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("query fansub links for group %d: %w", groupID, err)
	}
	defer rows.Close()

	items := make([]models.FansubGroupLink, 0, 8)
	for rows.Next() {
		item, err := scanFansubGroupLink(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub group links: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) CreateGroupLink(
	ctx context.Context,
	groupID int64,
	input models.FansubGroupLinkCreateInput,
) (*models.FansubGroupLink, error) {
	if err := validateFansubGroupLinkType(input.LinkType); err != nil {
		return nil, err
	}

	var item models.FansubGroupLink
	if err := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_links (group_id, link_type, name, url)
		VALUES ($1, $2, $3, $4)
		RETURNING id, group_id, link_type, name, url, created_at
	`, groupID, input.LinkType, input.Name, input.URL).Scan(
		&item.ID,
		&item.GroupID,
		&item.LinkType,
		&item.Name,
		&item.URL,
		&item.CreatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create fansub group link for group %d: %w", groupID, err)
	}

	if err := r.syncLegacyLinkColumns(ctx, groupID); err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *FansubRepository) UpdateGroupLink(
	ctx context.Context,
	groupID int64,
	linkID int64,
	input models.FansubGroupLinkPatchInput,
) (*models.FansubGroupLink, bool, error) {
	if !input.LinkType.Set && !input.Name.Set && !input.URL.Set {
		return nil, false, fmt.Errorf("update fansub group link %d: no patch fields provided", linkID)
	}

	if input.LinkType.Set {
		if input.LinkType.Value == nil {
			return nil, false, fmt.Errorf("update fansub group link %d: invalid link type", linkID)
		}
		linkType := models.FansubGroupLinkType(strings.TrimSpace(*input.LinkType.Value))
		if err := validateFansubGroupLinkType(linkType); err != nil {
			return nil, false, err
		}
		value := string(linkType)
		input.LinkType.Value = &value
	}
	if input.URL.Set {
		if input.URL.Value == nil {
			return nil, false, fmt.Errorf("update fansub group link %d: invalid url", linkID)
		}
		value := strings.TrimSpace(*input.URL.Value)
		input.URL.Value = &value
	}

	tx, err := r.beginGroupLinkTx(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin update fansub group link %d: %w", linkID, err)
	}
	defer tx.Rollback(ctx)

	var item models.FansubGroupLink
	if err := tx.QueryRow(ctx, `
		SELECT id, group_id, link_type, name, url, created_at
		FROM fansub_group_links
		WHERE id = $1 AND group_id = $2
		FOR UPDATE
	`, linkID, groupID).Scan(
		&item.ID,
		&item.GroupID,
		&item.LinkType,
		&item.Name,
		&item.URL,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, false, ErrNotFound
	} else if err != nil {
		return nil, false, fmt.Errorf("lock fansub group link %d: %w", linkID, err)
	}

	linkType := item.LinkType
	name := item.Name
	url := item.URL
	if input.LinkType.Set {
		linkType = models.FansubGroupLinkType(*input.LinkType.Value)
	}
	if input.Name.Set {
		name = input.Name.Value
	}
	if input.URL.Set {
		url = *input.URL.Value
	}
	if linkType == item.LinkType && equalNullableString(name, item.Name) && url == item.URL {
		if err := tx.Commit(ctx); err != nil {
			return nil, false, fmt.Errorf("commit no-op fansub group link %d: %w", linkID, err)
		}
		return &item, false, nil
	}

	if err := tx.QueryRow(ctx, `
		UPDATE fansub_group_links
		SET link_type = $1, name = $2, url = $3
		WHERE id = $4 AND group_id = $5
		RETURNING id, group_id, link_type, name, url, created_at
	`, linkType, name, url, linkID, groupID).Scan(
		&item.ID, &item.GroupID, &item.LinkType, &item.Name, &item.URL, &item.CreatedAt,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, false, ErrConflict
		}
		return nil, false, fmt.Errorf("update fansub group link %d: %w", linkID, err)
	}
	if err := syncLegacyLinkColumnsWithDB(ctx, tx, groupID); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit update fansub group link %d: %w", linkID, err)
	}
	return &item, true, nil
}

func equalNullableString(left, right *string) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return *left == *right
}

func (r *FansubRepository) DeleteGroupLink(ctx context.Context, groupID int64, linkID int64) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM fansub_group_links
		WHERE id = $1 AND group_id = $2
	`, linkID, groupID)
	if err != nil {
		return fmt.Errorf("delete fansub group link %d: %w", linkID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := r.syncLegacyLinkColumns(ctx, groupID); err != nil {
		return err
	}

	return nil
}

func scanFansubGroupLink(rows fansubRowScanner) (*models.FansubGroupLink, error) {
	var item models.FansubGroupLink
	if err := rows.Scan(
		&item.ID,
		&item.GroupID,
		&item.LinkType,
		&item.Name,
		&item.URL,
		&item.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan fansub group link row: %w", err)
	}

	return &item, nil
}

func validateFansubGroupLinkType(linkType models.FansubGroupLinkType) error {
	if _, ok := allowedFansubGroupLinkTypes[linkType]; !ok {
		return fmt.Errorf("invalid fansub link type %q", linkType)
	}

	return nil
}

func (r *FansubRepository) syncLegacyLinkColumns(ctx context.Context, groupID int64) error {
	return syncLegacyLinkColumnsWithDB(ctx, r.db, groupID)
}

func syncLegacyLinkColumnsWithDB(ctx context.Context, db DBTX, groupID int64) error {
	website, err := firstGroupLinkURLWithDB(ctx, db, groupID, models.FansubGroupLinkTypeWebsite)
	if err != nil {
		return err
	}
	discord, err := firstGroupLinkURLWithDB(ctx, db, groupID, models.FansubGroupLinkTypeDiscord)
	if err != nil {
		return err
	}
	irc, err := firstGroupLinkURLWithDB(ctx, db, groupID, models.FansubGroupLinkTypeIRC)
	if err != nil {
		return err
	}

	if _, err := db.Exec(ctx, `
		UPDATE fansub_groups
		SET website_url = $2,
		    discord_url = $3,
		    irc_url = $4
		WHERE id = $1
	`, groupID, website, discord, irc); err != nil {
		return fmt.Errorf("sync legacy fansub link columns for group %d: %w", groupID, err)
	}

	return nil
}

func (r *FansubRepository) firstGroupLinkURL(
	ctx context.Context,
	groupID int64,
	linkType models.FansubGroupLinkType,
) (*string, error) {
	return firstGroupLinkURLWithDB(ctx, r.db, groupID, linkType)
}

func firstGroupLinkURLWithDB(ctx context.Context, db DBTX, groupID int64, linkType models.FansubGroupLinkType) (*string, error) {
	var url *string
	if err := db.QueryRow(ctx, `
		SELECT url
		FROM fansub_group_links
		WHERE group_id = $1 AND link_type = $2
		ORDER BY created_at ASC, id ASC
		LIMIT 1
	`, groupID, linkType).Scan(&url); errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("query first fansub link url for group %d: %w", groupID, err)
	}

	return url, nil
}
