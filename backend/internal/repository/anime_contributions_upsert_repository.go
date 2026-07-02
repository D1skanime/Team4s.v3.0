package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// GetMemberIDForContribution ermittelt die member_id zu einer anime_contribution-ID.
// Gibt ErrNotFound zurück, wenn keine Zeile existiert.
func (r *AnimeContributionsRepository) GetMemberIDForContribution(ctx context.Context, contributionID int64) (int64, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT member_id
		FROM anime_contributions
		WHERE id = $1
	`, contributionID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, fmt.Errorf("get member_id for contribution %d: %w", contributionID, err)
	}
	return memberID, nil
}

func contributionMemberContextLockValue(fansubGroupID int64, animeID int64, memberID int64, releaseVersionID *int64) string {
	releaseKey := "anime"
	if releaseVersionID != nil {
		releaseKey = fmt.Sprintf("release:%d", *releaseVersionID)
	}
	return fmt.Sprintf("anime-contribution-member:%d:%d:%d:%s", fansubGroupID, animeID, memberID, releaseKey)
}

func lockContributionMemberContext(
	ctx context.Context,
	tx pgx.Tx,
	fansubGroupID int64,
	animeID int64,
	memberID int64,
	releaseVersionID *int64,
) error {
	if _, err := tx.Exec(ctx, `
		SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))
	`, contributionMemberContextLockValue(fansubGroupID, animeID, memberID, releaseVersionID)); err != nil {
		return fmt.Errorf("create or update anime contribution: lock context: %w", err)
	}
	return nil
}

func findAdminContributionUpdateTarget(
	ctx context.Context,
	tx pgx.Tx,
	fansubGroupID int64,
	animeID int64,
	input AnimeContributionInput,
) (int64, bool, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		SELECT id
		FROM anime_contributions
		WHERE fansub_group_id = $1
		  AND anime_id = $2
		  AND member_id = $3
		  AND release_version_id IS NOT DISTINCT FROM $4
		  AND status <> 'proposed'
		ORDER BY
		  CASE status
		    WHEN 'confirmed' THEN 0
		    WHEN 'draft' THEN 1
		    WHEN 'hidden' THEN 2
		    WHEN 'disputed' THEN 3
		    ELSE 4
		  END,
		  id
		LIMIT 1
		FOR UPDATE
	`, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("create or update anime contribution: find update target: %w", err)
	}
	return id, true, nil
}

// CreateOrUpdate fuehrt einen adminseitigen Upsert fuer eine Anime-Contribution durch.
// Migration 0111 entfernt bewusst den Row-Unique, damit rollen-spezifische Vorschlaege
// parallel bestehen koennen. Deshalb darf diese Methode kein DB-ON-CONFLICT-Target mehr
// voraussetzen. Stattdessen sperrt sie den Member-/Anime-/Release-Kontext explizit,
// aktualisiert eine vorhandene nicht-offene Contribution oder legt eine neue Zeile an.
// Rollencodes werden dabei atomar ersetzt (DELETE + INSERT in derselben Transaktion).
// Falls input.Status leer ist, wird "draft" als Standardwert verwendet.
func (r *AnimeContributionsRepository) CreateOrUpdate(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
	input AnimeContributionInput,
) (*AnimeContributionDisplayRow, error) {
	if input.Status == "" {
		input.Status = "draft"
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("create or update anime contribution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockContributionMemberContext(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID); err != nil {
		return nil, err
	}

	var newID int64
	targetID, found, err := findAdminContributionUpdateTarget(ctx, tx, fansubGroupID, animeID, input)
	if err != nil {
		return nil, err
	}
	if found {
		newID = targetID
		tag, err := tx.Exec(ctx, `
			UPDATE anime_contributions
			SET
				status                      = $4,
				note                        = $5,
				started_year                = $6,
				ended_year                  = $7,
				is_public_on_anime_page     = $8,
				is_public_on_member_profile = $9,
				updated_by                  = $10,
				updated_at                  = NOW()
			WHERE id = $1
			  AND fansub_group_id = $2
			  AND anime_id = $3
		`,
			newID,
			fansubGroupID,
			animeID,
			input.Status,
			input.Note,
			input.StartedYear,
			input.EndedYear,
			input.IsPublicOnAnimePage,
			input.IsPublicOnMemberProfile,
			input.CreatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("create or update anime contribution: update: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrNotFound
		}
	} else {
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
				release_version_id,
				created_by,
				updated_by,
				created_at,
				updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $11, $10, $10, NOW(), NOW())
			RETURNING id
		`,
			fansubGroupID,
			animeID,
			input.MemberID,
			input.Status,
			input.Note,
			input.StartedYear,
			input.EndedYear,
			input.IsPublicOnAnimePage,
			input.IsPublicOnMemberProfile,
			input.CreatedBy,
			input.ReleaseVersionID,
		).Scan(&newID)
		if err != nil {
			if isForeignKeyViolation(err) {
				return nil, ErrNotFound
			}
			return nil, fmt.Errorf("create or update anime contribution: insert: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM anime_contribution_roles WHERE anime_contribution_id = $1
	`, newID); err != nil {
		return nil, fmt.Errorf("create or update anime contribution: delete roles: %w", err)
	}

	for _, code := range input.RoleCodes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
		`, newID, code); err != nil {
			if isForeignKeyViolation(err) {
				return nil, fmt.Errorf("create or update anime contribution: unknown role_code %q: %w", code, ErrNotFound)
			}
			if isUniqueViolation(err) {
				return nil, fmt.Errorf("create or update anime contribution: duplicate role_code %q: %w", code, ErrConflict)
			}
			return nil, fmt.Errorf("create or update anime contribution: insert role: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create or update anime contribution: commit: %w", err)
	}

	return r.GetByIDWithDisplay(ctx, newID)
}
