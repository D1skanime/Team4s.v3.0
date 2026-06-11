package repository

// Ausgelagert aus anime_contributions_repository.go für das 450-Zeilen-Limit (Phase 82-02).
// Enthält Create- und Update-Methoden für anime_contributions.

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Create inserts a new anime contribution and its role codes in a single transaction.
// Falls input.Status leer ist, wird "draft" als Standardwert verwendet.
func (r *AnimeContributionsRepository) Create(ctx context.Context, fansubGroupID int64, animeID int64, input AnimeContributionInput) (*AnimeContributionRow, error) {
	if input.Status == "" {
		input.Status = "draft"
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("create anime contribution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var newID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO anime_contributions (
			fansub_group_id,
			anime_id,
			member_id,
			status,
			note,
			started_year,
			ended_year,
			is_public_on_anime_page,
			is_public_on_member_profile,
			created_by,
			updated_by,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9, $9, NOW(), NOW())
		RETURNING id
	`,
		fansubGroupID,
		animeID,
		input.MemberID,
		input.Note,
		input.StartedYear,
		input.EndedYear,
		input.IsPublicOnAnimePage,
		input.IsPublicOnMemberProfile,
		input.CreatedBy,
		input.Status,
	).Scan(&newID)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create anime contribution: insert: %w", err)
	}

	for _, code := range input.RoleCodes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
		`, newID, code); err != nil {
			if isForeignKeyViolation(err) {
				return nil, fmt.Errorf("create anime contribution: unknown role_code %q: %w", code, ErrNotFound)
			}
			if isUniqueViolation(err) {
				return nil, fmt.Errorf("create anime contribution: duplicate role_code %q: %w", code, ErrConflict)
			}
			return nil, fmt.Errorf("create anime contribution: insert role: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create anime contribution: commit: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// Update patches an anime contribution. If RoleCodes is set, roles are replaced atomically.
func (r *AnimeContributionsRepository) Update(ctx context.Context, fansubGroupID int64, animeID int64, id int64, input AnimeContributionPatchInput) (*AnimeContributionRow, error) {
	setClauses := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	addArg := func(val any) int {
		args = append(args, val)
		idx := argIdx
		argIdx++
		return idx
	}

	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", addArg(*input.Status)))
	}
	if input.Note != nil {
		setClauses = append(setClauses, fmt.Sprintf("note = $%d", addArg(*input.Note)))
	}
	if input.StartedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("started_year = $%d", addArg(*input.StartedYear)))
	}
	if input.EndedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("ended_year = $%d", addArg(*input.EndedYear)))
	}
	if input.IsPublicOnAnimePage != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_public_on_anime_page = $%d", addArg(*input.IsPublicOnAnimePage)))
	}
	if input.IsPublicOnMemberProfile != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_public_on_member_profile = $%d", addArg(*input.IsPublicOnMemberProfile)))
	}
	if input.ReleaseVersionID != nil {
		// Doppelpointer: *nil => auf NULL setzen, *wert => setzen (D-10).
		setClauses = append(setClauses, fmt.Sprintf("release_version_id = $%d", addArg(*input.ReleaseVersionID)))
	}
	setClauses = append(setClauses, fmt.Sprintf("updated_by = $%d", addArg(input.UpdatedBy)))
	setClauses = append(setClauses, "updated_at = NOW()")

	idxID := addArg(id)
	idxFansubGroupID := addArg(fansubGroupID)
	idxAnimeID := addArg(animeID)

	needsRoleUpdate := input.RoleCodes != nil

	if !needsRoleUpdate && len(setClauses) == 2 {
		// Only updated_by + updated_at — nothing meaningful to update besides roles
		return r.GetByIDForFansubAnime(ctx, fansubGroupID, animeID, id)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("update anime contribution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if len(setClauses) > 2 || input.UpdatedBy != nil {
		query := fmt.Sprintf(
			"UPDATE anime_contributions SET %s WHERE id = $%d AND fansub_group_id = $%d AND anime_id = $%d",
			strings.Join(setClauses, ", "),
			idxID,
			idxFansubGroupID,
			idxAnimeID,
		)
		tag, err := tx.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("update anime contribution: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrNotFound
		}
	}

	if needsRoleUpdate {
		tag, err := tx.Exec(ctx, `
			DELETE FROM anime_contribution_roles acr
			USING anime_contributions ac
			WHERE acr.anime_contribution_id = ac.id
			  AND ac.id = $1
			  AND ac.fansub_group_id = $2
			  AND ac.anime_id = $3
		`, id, fansubGroupID, animeID)
		if err != nil {
			return nil, fmt.Errorf("update anime contribution: delete roles: %w", err)
		}
		if tag.RowsAffected() == 0 {
			if _, err := r.GetByIDForFansubAnime(ctx, fansubGroupID, animeID, id); err != nil {
				return nil, err
			}
		}
		for _, code := range *input.RoleCodes {
			if _, err := tx.Exec(ctx, `
				INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
				SELECT ac.id, $2
				FROM anime_contributions ac
				WHERE ac.id = $1 AND ac.fansub_group_id = $3 AND ac.anime_id = $4
			`, id, code, fansubGroupID, animeID); err != nil {
				if isForeignKeyViolation(err) {
					return nil, fmt.Errorf("update anime contribution: unknown role_code %q: %w", code, ErrNotFound)
				}
				if isUniqueViolation(err) {
					return nil, fmt.Errorf("update anime contribution: duplicate role_code %q: %w", code, ErrConflict)
				}
				return nil, fmt.Errorf("update anime contribution: insert role: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("update anime contribution: commit: %w", err)
	}

	return r.GetByIDForFansubAnime(ctx, fansubGroupID, animeID, id)
}
