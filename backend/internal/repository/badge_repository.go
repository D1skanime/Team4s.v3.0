package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"team4s.v3/backend/internal/badges"
	"team4s.v3/backend/internal/models"

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
// CurrentThreshold (Phase 150, Plan 150-07/D-30, siebte Fundstelle) ist der
// Registry-Schwellenwert der eigenen Stufe eines role_volume_<roleCode>_<tier>-Badge-Codes
// (z.B. 320 fuer "role_volume_translator_gold"), nil fuer jeden anderen Badge-Code -- siehe
// roleVolumeThresholdForBadgeCode fuer die Berechnung und deren Grounding-Hinweis.
type MemberBadgeRow struct {
	ID               int64
	MemberID         int64
	BadgeCode        string
	BadgeCategory    string
	Visibility       string
	AwardedAt        time.Time
	CurrentThreshold *int64
}

// roleVolumeThresholdForBadgeCode liefert den Registry-Schwellenwert der eigenen Stufe eines
// role_volume_<roleCode>_<tier>-Badge-Codes (z.B. "role_volume_translator_gold" -> 320), oder
// nil fuer jeden anderen Badge-Code. Tier-Suffixe werden ueber einen bekannten Endungs-Scan
// erkannt (nicht per naivem split("_")), weil Rollencodes selbst Unterstriche enthalten koennen
// (z.B. "quality_checker", "raw_provider", "project_lead") -- spiegelt den Ansatz des Frontends
// (resolveRoleVolumePresentation in memberBadgeFamilies.ts). Ein unbekanntes/unerwartetes
// Tier-Suffix liefert defensiv nil statt zu panicen.
//
// Grounding (D-30, Plan 150-07): zum Zeitpunkt dieser Aenderung schreibt kein Codepfad im
// Backend einen role_volume_-praefixierten Badge-Code in member_badges --
// services/badge_service.go's ComputeAndStoreBadges persistiert ausschliesslich
// founding_member/historical_leader/long_term_member/membership_7_years/membership_10_years/
// first_contribution/productive_bronze|silver|gold/all_rounder/verified. Rollen-Volumen-Badges
// sind bislang eine rein live berechnete Projektion des OEFFENTLICHEN Profil-Endpunkts
// (loadPublicBadges/loadRoleVolumeBadges), nicht von GetMemberBadges. Dieses Feld existiert
// trotzdem vollstaendig und korrekt, damit MemberBadge's Contract nach D-30's Vorgabe ohne
// Ausnahme korrekt bleibt -- unabhaengig von der aktuellen Erreichbarkeit in Produktion.
func roleVolumeThresholdForBadgeCode(badgeCode string) *int64 {
	const prefix = "role_volume_"
	if !strings.HasPrefix(badgeCode, prefix) {
		return nil
	}
	withoutPrefix := strings.TrimPrefix(badgeCode, prefix)
	for _, tier := range badges.RoleVolume.Tiers {
		if strings.HasSuffix(withoutPrefix, "_"+tier.Code) {
			threshold := tier.Threshold
			return &threshold
		}
	}
	return nil
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

// GetPublicMemberBadges gibt ausschließlich öffentlich sichtbare aktive Badges eines Members zurück.
// SQL-Guard: visibility='public' AND status='active' — interne/versteckte Badges erscheinen nie (Badges-13, T-74-01-INFO).
// Sortierung nach awarded_at aufsteigend.
func (r *BadgeRepository) GetPublicMemberBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, badge_code, badge_category
		FROM member_badges
		WHERE member_id=$1 AND status='active' AND visibility='public'
		ORDER BY awarded_at
	`, memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	defer rows.Close()

	var result []models.PublicMemberBadge
	for rows.Next() {
		var b models.PublicMemberBadge
		if err := rows.Scan(&b.ID, &b.BadgeCode, &b.BadgeCategory); err != nil {
			return nil, err
		}
		result = append(result, b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// GetMemberBadges gibt alle aktiven Badges eines Members zurück, sortiert nach awarded_at.
func (r *BadgeRepository) GetMemberBadges(ctx context.Context, memberID int64) ([]MemberBadgeRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, member_id, badge_code, badge_category, visibility, awarded_at
		FROM member_badges
		WHERE member_id = $1 AND status = 'active'
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
		row.CurrentThreshold = roleVolumeThresholdForBadgeCode(row.BadgeCode)
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}
