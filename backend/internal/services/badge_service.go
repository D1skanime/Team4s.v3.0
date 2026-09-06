package services

import (
	"context"
	"errors"
	"log"
	"strings"

	"team4s.v3/backend/internal/badges"
	"team4s.v3/backend/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BadgeService berechnet und speichert abgeleitete Badges für Members.
type BadgeService struct {
	db   *pgxpool.Pool
	repo *repository.BadgeRepository
}

// NewBadgeService erstellt einen neuen BadgeService.
func NewBadgeService(db *pgxpool.Pool, repo *repository.BadgeRepository) *BadgeService {
	return &BadgeService{
		db:   db,
		repo: repo,
	}
}

// ComputeAndStoreBadges berechnet alle Badges für den gegebenen Member und speichert
// sie in member_badges. Fehler werden geloggt, aber nicht zurückgegeben —
// die Badge-Berechnung ist kein kritischer Pfad.
func (s *BadgeService) ComputeAndStoreBadges(ctx context.Context, memberID int64) error {
	s.computeFoundingMember(ctx, memberID)
	s.computeHistoricalLeader(ctx, memberID)
	s.computeLongTermMember(ctx, memberID)
	s.computeMembershipMilestone(ctx, memberID, "membership_7_years", int(badges.Membership7Years))
	s.computeMembershipMilestone(ctx, memberID, "membership_10_years", int(badges.Membership10Years))
	s.computeFirstContribution(ctx, memberID)
	s.computeProductiveTiers(ctx, memberID)
	s.computeAllRounder(ctx, memberID)
	s.computeVerified(ctx, memberID)
	return nil
}

// computeMembershipMilestone vergibt eine Mitgliedschaftsstufe, sobald eine einzelne
// historische Mitgliedschaft die geforderte Dauer erreicht hat.
func (s *BadgeService) computeMembershipMilestone(ctx context.Context, memberID int64, badgeCode string, years int) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT id
		FROM hist_fansub_group_members
		WHERE member_id = $1
		  AND joined_date IS NOT NULL
		  AND COALESCE(left_date, CURRENT_DATE) >= joined_date + make_interval(years => $2)
		LIMIT 1
	`, memberID, years).Scan(&rowID)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = s.repo.RevokeMemberBadge(ctx, memberID, badgeCode)
		return
	}
	if err != nil {
		log.Printf("badge_service: membership milestone query error (member_id=%d, badge_code=%s): %v", memberID, badgeCode, err)
		return
	}
	if err := s.repo.UpsertMemberBadge(ctx, memberID, badgeCode, "historical_achievement", "hist_fansub_group_member", rowID); err != nil {
		log.Printf("badge_service: upsert membership milestone error (member_id=%d, badge_code=%s): %v", memberID, badgeCode, err)
	}
}

// ComputeAndStoreBadgesByMembership ermittelt die member_id zur gegebenen
// hist_fansub_group_members-ID und berechnet anschließend deren Badges. Wird von
// Rollen-Mutationen genutzt, die nur die Mitgliedschafts-ID kennen. Fehler werden
// geloggt, aber nicht zurückgegeben — die Badge-Berechnung ist kein kritischer Pfad.
func (s *BadgeService) ComputeAndStoreBadgesByMembership(ctx context.Context, histMembershipID int64) error {
	var memberID int64
	err := s.db.QueryRow(ctx, `
		SELECT member_id FROM hist_fansub_group_members WHERE id = $1
	`, histMembershipID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		log.Printf("badge_service: resolve member_id by membership error (membership_id=%d): %v", histMembershipID, err)
		return nil
	}
	return s.ComputeAndStoreBadges(ctx, memberID)
}

// computeFoundingMember vergibt founding_member, wenn der Member im Gründungsjahr der Gruppe beigetreten ist.
func (s *BadgeService) computeFoundingMember(ctx context.Context, memberID int64) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT fgm.id
		FROM hist_fansub_group_members fgm
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		WHERE fgm.member_id = $1
		  AND fgm.joined_date IS NOT NULL
		  AND EXTRACT(YEAR FROM fgm.joined_date)::int = fg.founded_year
		LIMIT 1
	`, memberID).Scan(&rowID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return
		}
		log.Printf("badge_service: founding_member query error (member_id=%d): %v", memberID, err)
		return
	}
	if err := s.repo.UpsertMemberBadge(ctx, memberID, "founding_member", "historical_achievement", "hist_fansub_group_member", rowID); err != nil {
		log.Printf("badge_service: upsert founding_member error (member_id=%d): %v", memberID, err)
	}
}

// computeHistoricalLeader vergibt historical_leader, wenn der Member eine Leader- oder Gründerrolle hatte.
func (s *BadgeService) computeHistoricalLeader(ctx context.Context, memberID int64) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT r.id
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members fgm ON fgm.id = r.hist_fansub_group_member_id
		WHERE fgm.member_id = $1
		  AND r.role_code IN ('fansub_lead', 'founder')
		LIMIT 1
	`, memberID).Scan(&rowID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return
		}
		log.Printf("badge_service: historical_leader query error (member_id=%d): %v", memberID, err)
		return
	}
	if err := s.repo.UpsertMemberBadge(ctx, memberID, "historical_leader", "historical_achievement", "hist_group_member_role", rowID); err != nil {
		log.Printf("badge_service: upsert historical_leader error (member_id=%d): %v", memberID, err)
	}
}

// computeLongTermMember vergibt long_term_member, wenn der Member mindestens
// badges.MembershipLongTermYears Jahre Mitglied war oder noch aktiv ist. Die
// Jahreszahl kommt aus der autoritativen Registry backend/internal/badges (Phase
// 150 D-04) und wird als gebundener make_interval-Parameter uebergeben --
// dieselbe Parametrisierungs-Disziplin wie computeMembershipMilestone's eigenes
// make_interval(years => $2) in derselben Datei, keine String-Interpolation in
// die SQL-INTERVAL-Literale mehr.
func (s *BadgeService) computeLongTermMember(ctx context.Context, memberID int64) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT id
		FROM hist_fansub_group_members
		WHERE member_id = $1
		  AND (
		      (joined_date IS NOT NULL AND left_date IS NOT NULL AND left_date >= joined_date + make_interval(years => $2))
		      OR
		      (joined_date IS NOT NULL AND left_date IS NULL
		       AND CURRENT_DATE >= joined_date + make_interval(years => $2))
		  )
		LIMIT 1
	`, memberID, badges.MembershipLongTermYears).Scan(&rowID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return
		}
		log.Printf("badge_service: long_term_member query error (member_id=%d): %v", memberID, err)
		return
	}
	if err := s.repo.UpsertMemberBadge(ctx, memberID, "long_term_member", "historical_achievement", "hist_fansub_group_member", rowID); err != nil {
		log.Printf("badge_service: upsert long_term_member error (member_id=%d): %v", memberID, err)
	}
}

// computeFirstContribution vergibt first_contribution, wenn der Member mindestens eine bestätigte
// Anime-Contribution hat (D-03, Schwelle: 1). Bei nicht-erfüllter Bedingung wird der Badge entzogen (D-08).
func (s *BadgeService) computeFirstContribution(ctx context.Context, memberID int64) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT ac.id
		FROM anime_contributions ac
		WHERE ac.member_id = $1
		  AND ac.status = 'confirmed'
		LIMIT 1
	`, memberID).Scan(&rowID)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = s.repo.RevokeMemberBadge(ctx, memberID, "first_contribution")
		return
	}
	if err != nil {
		log.Printf("badge_service: first_contribution query error (member_id=%d): %v", memberID, err)
		return
	}
	if err := s.repo.UpsertMemberBadge(ctx, memberID, "first_contribution",
		"historical_achievement", "anime_contribution", rowID); err != nil {
		log.Printf("badge_service: upsert first_contribution error (member_id=%d): %v", memberID, err)
	}
}

// computeProductiveTiers vergibt productive_bronze/silver/gold abhaengig von der Anzahl
// bestaetigter distinct-Anime-Beitraege (D-03, D-05). Die drei Schwellen (10/25/50) kommen
// aus der autoritativen Registry backend/internal/badges (Phase 150 D-02), gefiltert auf die
// "productive_"-Tier-Codes der Progress-Familie -- diese Familie enthaelt zusaetzlich
// "first_contribution" (Schwelle 1), das bleibt ausschliesslich computeFirstContribution's
// eigene Zustaendigkeit und wird hier bewusst uebersprungen. Jede Stufe wird einzeln geprueft
// und bei Nichterfuellung entzogen (D-08).
func (s *BadgeService) computeProductiveTiers(ctx context.Context, memberID int64) {
	var animeCount int64
	err := s.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ac.anime_id)
		FROM anime_contributions ac
		WHERE ac.member_id = $1
		  AND ac.status = 'confirmed'
	`, memberID).Scan(&animeCount)
	if err != nil {
		log.Printf("badge_service: productive tier query error (member_id=%d): %v", memberID, err)
		return
	}
	for _, tier := range badges.Progress.Tiers {
		if !strings.HasPrefix(tier.Code, "productive_") {
			continue
		}
		if animeCount >= tier.Threshold {
			if err := s.repo.UpsertMemberBadge(ctx, memberID, tier.Code,
				"historical_achievement", "anime_contribution", 0); err != nil {
				log.Printf("badge_service: upsert %s error (member_id=%d): %v", tier.Code, memberID, err)
			}
		} else {
			if err := s.repo.RevokeMemberBadge(ctx, memberID, tier.Code); err != nil {
				log.Printf("badge_service: revoke %s error (member_id=%d): %v", tier.Code, memberID, err)
			}
		}
	}
}

// computeAllRounder vergibt all_rounder, wenn der Member mindestens 3 verschiedene Rollen in
// bestätigten Contributions hat (D-03, D-05). Bei Nichterfüllung wird der Badge entzogen (D-08).
func (s *BadgeService) computeAllRounder(ctx context.Context, memberID int64) {
	var roleCount int
	err := s.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT acr.role_code)
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.member_id = $1
		  AND ac.status = 'confirmed'
	`, memberID).Scan(&roleCount)
	if err != nil {
		log.Printf("badge_service: all_rounder query error (member_id=%d): %v", memberID, err)
		return
	}
	if roleCount >= 3 {
		if err := s.repo.UpsertMemberBadge(ctx, memberID, "all_rounder",
			"historical_achievement", "anime_contribution", 0); err != nil {
			log.Printf("badge_service: upsert all_rounder error (member_id=%d): %v", memberID, err)
		}
	} else {
		if err := s.repo.RevokeMemberBadge(ctx, memberID, "all_rounder"); err != nil {
			log.Printf("badge_service: revoke all_rounder error (member_id=%d): %v", memberID, err)
		}
	}
}

// computeVerified vergibt verified, wenn mindestens ein verifi­zierter member_claim vorhanden ist
// (D-03; claim_status='verified'). Bei Nichterfüllung wird der Badge entzogen (D-08).
func (s *BadgeService) computeVerified(ctx context.Context, memberID int64) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM member_claims
			WHERE member_id = $1
			  AND claim_status = 'verified'
		)
	`, memberID).Scan(&exists)
	if err != nil {
		log.Printf("badge_service: verified query error (member_id=%d): %v", memberID, err)
		return
	}
	if exists {
		if err := s.repo.UpsertMemberBadge(ctx, memberID, "verified",
			"platform", "member_claim", 0); err != nil {
			log.Printf("badge_service: upsert verified error (member_id=%d): %v", memberID, err)
		}
	} else {
		if err := s.repo.RevokeMemberBadge(ctx, memberID, "verified"); err != nil {
			log.Printf("badge_service: revoke verified error (member_id=%d): %v", memberID, err)
		}
	}
}
