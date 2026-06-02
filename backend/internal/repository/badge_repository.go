package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ResolveMemberIDForAppUser ermittelt die member_id des App-Users über member_claims.
// Gibt ErrNotFound zurück, wenn kein verifizierter Claim vorhanden ist.
func (r *BadgeRepository) ResolveMemberIDForAppUser(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// MemberBadgeRow repräsentiert eine Zeile aus member_badges.
type MemberBadgeRow struct {
	ID            int64
	MemberID      int64
	BadgeCode     string
	BadgeCategory string
	Visibility    string
	AwardedAt     time.Time
}

// BadgeRepository verwaltet den Datenbankzugriff auf member_badges.
type BadgeRepository struct {
	db *pgxpool.Pool
}

// NewBadgeRepository erstellt einen neuen BadgeRepository.
func NewBadgeRepository(db *pgxpool.Pool) *BadgeRepository {
	return &BadgeRepository{db: db}
}

// UpsertMemberBadge legt ein Badge an oder setzt es bei Konflikt auf 'active' zurück.
// Der UNIQUE-Constraint ist (member_id, badge_code).
func (r *BadgeRepository) UpsertMemberBadge(
	ctx context.Context,
	memberID int64,
	badgeCode string,
	badgeCategory string,
	derivedFromType string,
	derivedFromID int64,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO member_badges
			(member_id, badge_code, badge_category, derived_from_type, derived_from_id, status, visibility, awarded_at)
		VALUES
			($1, $2, $3, $4, $5, 'active', 'public', NOW())
		ON CONFLICT (member_id, badge_code)
		DO UPDATE SET
			status        = 'active',
			awarded_at    = NOW(),
			derived_from_type = EXCLUDED.derived_from_type,
			derived_from_id   = EXCLUDED.derived_from_id
	`, memberID, badgeCode, badgeCategory, derivedFromType, derivedFromID)
	return err
}

// RevokeMemberBadge setzt den Status eines aktiven Badges auf 'revoked'.
// Nur Badges mit status='active' werden berührt; pending- und bereits-revoked-Badges bleiben unverändert.
// Die visibility-Spalte wird bewusst NICHT gesetzt (D-07).
func (r *BadgeRepository) RevokeMemberBadge(ctx context.Context, memberID int64, badgeCode string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE member_badges
		SET status = 'revoked'
		WHERE member_id = $1
		  AND badge_code = $2
		  AND status = 'active'
	`, memberID, badgeCode)
	return err
}

// SetBadgeVisibility setzt die Sichtbarkeit eines Badges, sofern der Member der Eigentümer ist.
// Erlaubte Werte: 'public', 'internal', 'hidden'.
// Gibt ErrNotFound zurück, wenn kein passender Eintrag gefunden wurde (fehlende Ownership oder Badge).
func (r *BadgeRepository) SetBadgeVisibility(
	ctx context.Context,
	badgeID int64,
	memberID int64,
	visibility string,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE member_badges
		SET visibility = $3
		WHERE id = $1 AND member_id = $2
	`, badgeID, memberID, visibility)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetMemberBadges gibt alle nicht-hidden Badges eines Members zurück, sortiert nach awarded_at.
func (r *BadgeRepository) GetMemberBadges(ctx context.Context, memberID int64) ([]MemberBadgeRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, member_id, badge_code, badge_category, visibility, awarded_at
		FROM member_badges
		WHERE member_id = $1 AND visibility != 'hidden'
		ORDER BY awarded_at
	`, memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	defer rows.Close()

	var result []MemberBadgeRow
	for rows.Next() {
		var row MemberBadgeRow
		if err := rows.Scan(
			&row.ID,
			&row.MemberID,
			&row.BadgeCode,
			&row.BadgeCategory,
			&row.Visibility,
			&row.AwardedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}
