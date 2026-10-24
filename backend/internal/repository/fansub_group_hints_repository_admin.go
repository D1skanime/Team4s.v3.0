package repository

// Dieser Teil der FansubGroupHintsRepository-Implementierung bündelt die
// plattform-weite D-11-Prüfung "hat die Zielgruppe aktuell eine aktive Leitung?" und die
// darauf aufbauende Admin-Liste. Ausgelagert aus fansub_group_hints_repository.go, damit
// jene Datei unter dem CLAUDE.md-Limit von 450 Zeilen bleibt (reiner Struktur-Split, keine
// Verhaltensänderung).

import (
	"context"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/permissions"
)

// AdminHintListFilter trägt die optionalen, UND-verknüpften Filter für
// ListWithoutActiveLead. Alle Felder sind optional; ein nil/leerer Wert bedeutet "kein
// Filter".
type AdminHintListFilter struct {
	Status              *string
	TargetFansubGroupID *int64
	From                *time.Time
	To                  *time.Time
	Limit               int
	Offset              int
}

// HasActiveLead beantwortet D-11s sicherheitskritische Frage "hat diese Fansub-Gruppe
// aktuell eine aktive Leitung?" ausschließlich serverseitig aus fansub_group_members/
// fansub_group_member_roles -- niemals aus einem vom Aufrufer übergebenen Feld. Die
// Rolle wird als parametrisierter Query-Wert aus der Konstante permissions.RoleFansubLead
// gebunden (kein rohes Rollencode-String-Literal im Code), damit dieser Wert nicht an zwei
// Stellen auseinanderlaufen kann. Das Ergebnis entscheidet, ob ein Korrektur-Hinweis an
// diese Gruppe beim Leader der Gruppe landet (hat eine aktive Leitung) oder bei der
// Plattform-Admin-Liste (hat keine). ListWithoutActiveLead kodiert absichtlich dieselbe
// Prädikat-Formel (dort als NOT-EXISTS-Subquery direkt in die Listen-SQL eingebaut statt
// pro Zeile HasActiveLead aufzurufen, um ein N+1-Abfragemuster über eine potenziell große
// Ergebnismenge zu vermeiden) -- ändert sich die Formel, müssen beide Stellen zusammen
// angepasst werden.
func (r *FansubGroupHintsRepository) HasActiveLead(ctx context.Context, fansubGroupID int64) (bool, error) {
	var hasLead bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM fansub_group_members fgm
			JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
			WHERE fgm.fansub_group_id = $1
			  AND fgm.status = 'active'
			  AND fgr.role = $2
		)
	`, fansubGroupID, permissions.RoleFansubLead).Scan(&hasLead)
	if err != nil {
		return false, fmt.Errorf("aktive leitung pruefen: %w", err)
	}
	return hasLead, nil
}

// ListWithoutActiveLead gibt NUR Hinweise zurück, deren Zielgruppe aktuell KEINE aktive
// Leitung hat (D-11: diese Entscheidung trifft der Plattform-Admin, nicht der Leader der
// Zielgruppe, weil es dort niemanden mit dieser Rolle gibt). Die "hat keine aktive
// Leitung"-Prüfung ist dieselbe Formel wie HasActiveLead, hier als NOT-EXISTS-Subquery
// direkt in die Listen-SQL eingebaut statt pro Zeile HasActiveLead aufzurufen -- vermeidet
// eine N+1-Abfrage über eine potenziell große Ergebnismenge. Die Rolle wird als
// parametrisierter Query-Wert aus der Konstante permissions.RoleFansubLead gebunden,
// niemals als rohes String-Literal.
func (r *FansubGroupHintsRepository) ListWithoutActiveLead(ctx context.Context, filter AdminHintListFilter) ([]FansubGroupHintRow, int, error) {
	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	args := []any{permissions.RoleFansubLead}
	paramIdx := 2
	whereClauses := []string{`
		NOT EXISTS (
			SELECT 1
			FROM fansub_group_members fgm
			JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
			WHERE fgm.fansub_group_id = h.target_fansub_group_id
			  AND fgm.status = 'active'
			  AND fgr.role = $1
		)
	`}

	if filter.Status != nil && *filter.Status != "" {
		args = append(args, *filter.Status)
		whereClauses = append(whereClauses, fmt.Sprintf("h.status = $%d", paramIdx))
		paramIdx++
	}
	if filter.TargetFansubGroupID != nil && *filter.TargetFansubGroupID > 0 {
		args = append(args, *filter.TargetFansubGroupID)
		whereClauses = append(whereClauses, fmt.Sprintf("h.target_fansub_group_id = $%d", paramIdx))
		paramIdx++
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		whereClauses = append(whereClauses, fmt.Sprintf("h.created_at >= $%d", paramIdx))
		paramIdx++
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		whereClauses = append(whereClauses, fmt.Sprintf("h.created_at <= $%d", paramIdx))
		paramIdx++
	}

	args = append(args, limit, offset)
	limitParam := paramIdx
	offsetParam := paramIdx + 1

	query := fmt.Sprintf(`
		SELECT `+fansubGroupHintSelectCols+`,
			COUNT(*) OVER() AS total_count
		`+fansubGroupHintFromJoins+`
		WHERE %s
		ORDER BY h.created_at DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereClauses, " AND "), limitParam, offsetParam)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("hinweise ohne aktive leitung: %w", err)
	}
	defer rows.Close()

	items := make([]FansubGroupHintRow, 0)
	var total int
	for rows.Next() {
		var row FansubGroupHintRow
		if err := rows.Scan(
			&row.ID,
			&row.SenderAppUserID,
			&row.SenderDisplayName,
			&row.TargetFansubGroupID,
			&row.TargetFansubGroupName,
			&row.RelatedAnimeID,
			&row.RelatedAnimeTitle,
			&row.RelatedReleaseVersionID,
			&row.RelatedReleaseLabel,
			&row.Note,
			&row.Status,
			&row.DecidedBy,
			&row.DecidedAt,
			&row.DecisionNote,
			&row.CreatedAt,
			&row.SenderOwnGroupName,
			&total,
		); err != nil {
			return nil, 0, fmt.Errorf("hinweise ohne aktive leitung: scan: %w", err)
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("hinweise ohne aktive leitung: iterate: %w", err)
	}

	return items, total, nil
}
