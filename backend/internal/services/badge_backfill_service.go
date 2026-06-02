package services

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// BadgeBackfillReport fasst die Ergebnisse eines Badge-Backfill-Laufs zusammen.
type BadgeBackfillReport struct {
	MembersProcessed int
	Errors           []string
}

// BadgeBackfillService führt einen vollständigen Badge-Recompute über alle Members durch.
// Genutzt für den CLI-Subbefehl "backfill-badges" in cmd/migrate (D-06).
type BadgeBackfillService struct {
	db           *pgxpool.Pool
	badgeService *BadgeService
}

// NewBadgeBackfillService erstellt einen neuen BadgeBackfillService.
func NewBadgeBackfillService(db *pgxpool.Pool, badgeService *BadgeService) *BadgeBackfillService {
	return &BadgeBackfillService{db: db, badgeService: badgeService}
}

// BackfillAll iteriert alle Members (ORDER BY id) und ruft ComputeAndStoreBadges für jeden auf.
// Einzelne Fehler werden im Report gesammelt und geloggt, der Lauf wird nie abgebrochen.
// rows.Err() wird nach der Iteration geprüft.
func (s *BadgeBackfillService) BackfillAll(ctx context.Context) (*BadgeBackfillReport, error) {
	rows, err := s.db.Query(ctx, `SELECT id FROM members ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("backfill badges: list members: %w", err)
	}
	defer rows.Close()

	report := &BadgeBackfillReport{}
	for rows.Next() {
		var memberID int64
		if err := rows.Scan(&memberID); err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("scan member_id: %v", err))
			continue
		}
		if err := s.badgeService.ComputeAndStoreBadges(ctx, memberID); err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("member_id=%d: %v", memberID, err))
		}
		report.MembersProcessed++
	}
	if err := rows.Err(); err != nil {
		return report, fmt.Errorf("backfill badges: iterate: %w", err)
	}
	return report, nil
}
