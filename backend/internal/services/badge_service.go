package services

import (
	"context"
	"errors"
	"log"

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

// ComputeAndStoreBadges berechnet alle drei abgeleiteten Badges für den gegebenen Member
// und speichert sie in member_badges. Fehler werden geloggt, aber nicht zurückgegeben —
// die Badge-Berechnung ist kein kritischer Pfad.
func (s *BadgeService) ComputeAndStoreBadges(ctx context.Context, memberID int64) error {
	s.computeFoundingMember(ctx, memberID)
	s.computeHistoricalLeader(ctx, memberID)
	s.computeLongTermMember(ctx, memberID)
	return nil
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
		  AND fgm.joined_year IS NOT NULL
		  AND fgm.joined_year = fg.founded_year
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
		  AND r.role_code IN ('leader', 'founder')
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

// computeLongTermMember vergibt long_term_member, wenn der Member mindestens 5 Jahre Mitglied war
// oder noch aktiv ist.
func (s *BadgeService) computeLongTermMember(ctx context.Context, memberID int64) {
	var rowID int64
	err := s.db.QueryRow(ctx, `
		SELECT id
		FROM hist_fansub_group_members
		WHERE member_id = $1
		  AND (
		      (joined_year IS NOT NULL AND left_year IS NOT NULL AND left_year - joined_year >= 5)
		      OR
		      (joined_year IS NOT NULL AND left_year IS NULL)
		  )
		LIMIT 1
	`, memberID).Scan(&rowID)
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
