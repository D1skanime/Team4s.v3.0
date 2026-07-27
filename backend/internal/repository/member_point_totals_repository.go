package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// memberRankingPageSize ist die feste Seitengroesse fuer die Punkte-Rangliste.
const memberRankingPageSize = 50

// MemberPointRankingRow repraesentiert einen Member mit seiner persistierten
// Netto-Gesamtpunktzahl im Ranking. JSON-Struct-Tags sind Pflicht (snake_case),
// da diese Row direkt ueber c.JSON serialisiert wird (Plan 109-03).
type MemberPointRankingRow struct {
	MemberID    int64   `json:"member_id"`
	DisplayName string  `json:"display_name"`
	Slug        *string `json:"slug"`
	TotalPoints int64   `json:"total_points"`
}

// MemberPointTotalsRepository ist ein reines Lese-Repository ueber die per
// Migrations-Trigger (0139) fortgeschriebene Tabelle member_point_totals.
// Es enthaelt keine Schreibmethode -- die Summe wird ausschliesslich vom
// AFTER-INSERT-Trigger auf point_ledger_entries gepflegt (D-05/D-06).
type MemberPointTotalsRepository struct {
	db *pgxpool.Pool
}

// NewMemberPointTotalsRepository erstellt einen neuen MemberPointTotalsRepository.
func NewMemberPointTotalsRepository(db *pgxpool.Pool) *MemberPointTotalsRepository {
	return &MemberPointTotalsRepository{db: db}
}

// ListRanking liefert Members mit mindestens einer Buchung, absteigend nach
// total_points sortiert mit stabilem member_id-ASC-Tie-Break (D-01). Nur
// Members mit profile_visibility='public' erscheinen (T-109-02). page wird
// auf [1, 1000] geklemmt (T-109-01); LIMIT/OFFSET werden ausschliesslich als
// pgx-Parameter uebergeben.
func (r *MemberPointTotalsRepository) ListRanking(ctx context.Context, page int) ([]MemberPointRankingRow, int, error) {
	if page < 1 {
		page = 1
	}
	if page > 1000 {
		page = 1000
	}
	offset := (page - 1) * memberRankingPageSize

	var total int
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM member_point_totals mpt
		JOIN members m ON m.id = mpt.member_id
		WHERE m.profile_visibility = 'public'
	`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("member point ranking: count: %w", err)
	}

	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT m.id, %s AS display_name, %s AS slug, mpt.total_points
		FROM member_point_totals mpt
		JOIN members m ON m.id = mpt.member_id
		WHERE m.profile_visibility = 'public'
		ORDER BY mpt.total_points DESC, m.id ASC
		LIMIT $1 OFFSET $2
	`, displayCol, slugCol), memberRankingPageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("member point ranking: query: %w", err)
	}
	defer rows.Close()

	result := []MemberPointRankingRow{}
	for rows.Next() {
		var row MemberPointRankingRow
		if err := rows.Scan(&row.MemberID, &row.DisplayName, &row.Slug, &row.TotalPoints); err != nil {
			return nil, 0, fmt.Errorf("member point ranking: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("member point ranking: iterate: %w", err)
	}

	return result, total, nil
}
