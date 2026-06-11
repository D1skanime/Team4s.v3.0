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

// CreateOrUpdate fuehrt einen Upsert fuer eine Anime-Contribution durch.
// Bei einem UNIQUE-Konflikt auf (fansub_group_id, anime_id, member_id, release_version_id)
// werden die bestehenden Felder aktualisiert statt einen Fehler zurueckzugeben. Das vierspaltige
// Target (Phase 67-02, Pitfall 1) stellt sicher, dass ein versions-spezifischer Eintrag NICHT den
// anime-weiten Eintrag (release_version_id IS NULL) desselben Members ueberschreibt.
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
			release_version_id,
			created_by,
			updated_by,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $11, $10, $10, NOW(), NOW())
		ON CONFLICT (fansub_group_id, anime_id, member_id, release_version_id)
		DO UPDATE SET
			status                      = EXCLUDED.status,
			note                        = EXCLUDED.note,
			started_year                = EXCLUDED.started_year,
			ended_year                  = EXCLUDED.ended_year,
			is_public_on_anime_page     = EXCLUDED.is_public_on_anime_page,
			is_public_on_member_profile = EXCLUDED.is_public_on_member_profile,
			updated_by                  = EXCLUDED.updated_by,
			updated_at                  = NOW()
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
		return nil, fmt.Errorf("create or update anime contribution: upsert: %w", err)
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
