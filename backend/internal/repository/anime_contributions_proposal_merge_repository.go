package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type proposalMergeTarget struct {
	ID          int64
	Status      string
	Note        *string
	StartedYear *int
	EndedYear   *int
}

// findProposalMergeTarget sperrt einen bestehenden Beitrag fuer denselben
// Gruppe/Anime/Member/Release-Kontext, damit weitere Rollen atomar ergaenzt werden koennen.
func (r *AnimeContributionsRepository) findProposalMergeTarget(
	ctx context.Context,
	tx pgx.Tx,
	fansubGroupID int64,
	animeID int64,
	fansubGroupMemberID int64,
	releaseVersionID *int64,
) (*proposalMergeTarget, error) {
	var target proposalMergeTarget
	err := tx.QueryRow(ctx, `
		SELECT id, status, note, started_year, ended_year
		FROM anime_contributions
		WHERE fansub_group_id = $1
		  AND anime_id = $2
		  AND fansub_group_member_id = $3
		  AND release_version_id IS NOT DISTINCT FROM $4
		FOR UPDATE
	`, fansubGroupID, animeID, fansubGroupMemberID, releaseVersionID).Scan(
		&target.ID,
		&target.Status,
		&target.Note,
		&target.StartedYear,
		&target.EndedYear,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("vorschlag erweitern: vorhandenen beitrag suchen: %w", err)
	}
	return &target, nil
}

func (r *AnimeContributionsRepository) mergeProposalRoles(
	ctx context.Context,
	tx pgx.Tx,
	target *proposalMergeTarget,
	input ProposalInput,
) error {
	rows, err := tx.Query(ctx, `
		SELECT role_code
		FROM anime_contribution_roles
		WHERE anime_contribution_id = $1
	`, target.ID)
	if err != nil {
		return fmt.Errorf("vorschlag erweitern: rollen laden: %w", err)
	}
	defer rows.Close()

	existingRoles := make(map[string]bool)
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return fmt.Errorf("vorschlag erweitern: rolle scannen: %w", err)
		}
		existingRoles[code] = true
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("vorschlag erweitern: rollen iterieren: %w", err)
	}

	missingRoles := make([]string, 0)
	seenRoles := make(map[string]bool, len(existingRoles)+len(input.RoleCodes))
	for code := range existingRoles {
		seenRoles[code] = true
	}
	for _, code := range input.RoleCodes {
		if seenRoles[code] {
			continue
		}
		missingRoles = append(missingRoles, code)
		seenRoles[code] = true
	}

	if len(missingRoles) > 0 && target.Status != "draft" && target.Status != "proposed" {
		return fmt.Errorf("vorschlag erweitern: bestaetigter beitrag braucht separaten aenderungsflow: %w", ErrConflict)
	}

	for _, code := range missingRoles {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, target.ID, code); err != nil {
			if isForeignKeyViolation(err) {
				return fmt.Errorf("vorschlag erweitern: unbekannte rolle %q: %w", code, ErrNotFound)
			}
			return fmt.Errorf("vorschlag erweitern: rolle einfuegen: %w", err)
		}
	}

	noteToAppend := input.Note
	if len(missingRoles) == 0 {
		noteToAppend = nil
	}
	if _, err := tx.Exec(ctx, `
		UPDATE anime_contributions
		SET
			status = CASE WHEN status = 'draft' THEN 'proposed' ELSE status END,
			note = CASE
				WHEN $2::text IS NULL OR TRIM($2::text) = '' THEN note
				WHEN note IS NULL OR TRIM(note) = '' THEN $2::text
				ELSE note || E'\n\n' || $2::text
			END,
			started_year = CASE
				WHEN $3::int IS NULL THEN started_year
				WHEN started_year IS NULL THEN $3::int
				WHEN $3::int < started_year THEN $3::int
				ELSE started_year
			END,
			ended_year = CASE
				WHEN $4::int IS NULL THEN ended_year
				WHEN ended_year IS NULL THEN $4::int
				WHEN $4::int > ended_year THEN $4::int
				ELSE ended_year
			END,
			updated_by = $5,
			updated_at = NOW()
		WHERE id = $1
	`, target.ID, noteToAppend, input.StartedYear, input.EndedYear, input.AppUserID); err != nil {
		return fmt.Errorf("vorschlag erweitern: beitrag aktualisieren: %w", err)
	}

	return nil
}
