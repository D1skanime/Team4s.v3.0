package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

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
