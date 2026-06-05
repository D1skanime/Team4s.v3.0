package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MemberMemorialRepository implementiert die DB-Operationen für den Memorial-Setter.
// Schreibt nur members.profile_status — berührt NICHT den app_user-Account (D-13).
type MemberMemorialRepository struct {
	db *pgxpool.Pool
}

// NewMemberMemorialRepository erstellt eine neue MemberMemorialRepository-Instanz.
func NewMemberMemorialRepository(db *pgxpool.Pool) *MemberMemorialRepository {
	return &MemberMemorialRepository{db: db}
}

// GetMemberProfileStatus liest den aktuellen profile_status eines Members.
// Gibt ErrNotFound zurück, wenn der Member nicht existiert.
func (r *MemberMemorialRepository) GetMemberProfileStatus(ctx context.Context, memberID int64) (string, error) {
	var status string
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(profile_status, 'active')
		FROM members
		WHERE id = $1
	`, memberID).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", fmt.Errorf("get member profile_status (id=%d): %w", memberID, err)
	}
	return status, nil
}

// SetMemorialStatus setzt members.profile_status auf 'memorial'.
// Berührt NICHT den app_user-Account (D-13).
func (r *MemberMemorialRepository) SetMemorialStatus(ctx context.Context, memberID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE members
		SET profile_status = 'memorial',
		    updated_at = NOW()
		WHERE id = $1
	`, memberID)
	if err != nil {
		return fmt.Errorf("set memorial status (id=%d): %w", memberID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
