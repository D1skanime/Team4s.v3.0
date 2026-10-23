package repository

// FansubGroupHintsRepository persistiert Hinweise, die ein Mitglied an eine EIGENE ODER
// FREMDE Fansub-Gruppe schickt (Migration 0187): entweder ein Korrektur-Hinweis zu einem
// Projekt-Eintrag oder eine Anfrage auf Mitgliedschaft mit optionalem Rollenwunsch. Anders
// als beim regulären Beitrags-Vorschlag (anime_contributions_proposal_repository.go) gibt
// es hier bewusst KEINEN Ownership-Check wie MemberBelongsToFansub: ein Hinweis darf an
// jede Gruppe gehen, nicht nur an die eigene — das ist der fachliche Kernunterschied. Die
// Dopplungssperre (höchstens ein offener Hinweis pro Person+Zielgruppe+Thema) wird nicht
// hier im Go-Code geprüft, sondern ausschließlich über den Partial-Unique-Index
// `uq_fansub_group_hints_open_topic` der Migration — vermeidet eine
// SELECT-dann-INSERT-Race (TOCTOU) bei gleichzeitigen Anfragen.

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"team4s.v3/backend/internal/permissions"
)

// FansubGroupHintRow ist die angereicherte Lesesicht auf eine fansub_group_hints-Zeile,
// inklusive Anzeige-Kontext (Absendername, Zielgruppenname, Projekttitel, Rollenlabel), der
// von den Review-Oberflächen (Leader- und Plattform-Admin-Liste) benötigt wird.
type FansubGroupHintRow struct {
	ID                     int64      `json:"id"`
	SenderAppUserID        int64      `json:"sender_app_user_id"`
	SenderDisplayName      string     `json:"sender_display_name"`
	TargetFansubGroupID    int64      `json:"target_fansub_group_id"`
	TargetFansubGroupName  string     `json:"target_fansub_group_name"`
	HintType               string     `json:"hint_type"`
	RelatedAnimeID         *int64     `json:"related_anime_id"`
	RelatedAnimeTitle      *string    `json:"related_anime_title"`
	RequestedRoleCode      *string    `json:"requested_role_code"`
	RequestedRoleLabel     *string    `json:"requested_role_label"`
	Note                   *string    `json:"note"`
	Status                 string     `json:"status"`
	DecidedBy              *int64     `json:"decided_by"`
	DecidedAt              *time.Time `json:"decided_at"`
	DecisionNote           *string    `json:"decision_note"`
	CreatedAt              time.Time  `json:"created_at"`
	// SenderOwnGroupName ist der UI-Kontext "Mitglied bei: {Gruppe}" — best-effort über
	// eine verifizierte member_claims-Mitgliedschaft des Absenders ermittelt. Bleibt NULL,
	// wenn der Absender keine verifizierte Mitgliedschaft hat oder mehrdeutig mehreren
	// Gruppen zugeordnet ist; dieses Feld darf niemals einen Fehler auslösen, da es reiner
	// Zusatzkontext und keine Entscheidungsgrundlage ist.
	SenderOwnGroupName *string `json:"sender_own_group_name"`
}

// HintInput enthält die Eingabefelder für einen neuen Hinweis. SenderAppUserID stammt
// immer aus der verifizierten Identität des Aufrufers (niemals aus dem Request-Body) —
// das wird vom aufrufenden Handler sichergestellt, nicht hier. RelatedReleaseVersionID
// ist bewusst NICHT Teil dieses Typs: die Migration reserviert die Spalte für eine
// spätere, feinere Release-Versions-Korrektur, die diese Phase nicht anbietet.
type HintInput struct {
	SenderAppUserID     int64
	TargetFansubGroupID int64
	HintType            string
	RelatedAnimeID      *int64
	RequestedRoleCode   *string
	Note                *string
}

// AdminHintListFilter trägt die optionalen, UND-verknüpften Filter für
// ListForFansubLeadRole. Alle Felder sind optional; ein nil/leerer Wert bedeutet "kein
// Filter".
type AdminHintListFilter struct {
	Status              *string
	TargetFansubGroupID *int64
	From                *time.Time
	To                  *time.Time
	Limit               int
	Offset              int
}

// FansubGroupHintsRepository bündelt alle Datenbankzugriffe auf fansub_group_hints.
type FansubGroupHintsRepository struct {
	db *pgxpool.Pool
}

// NewFansubGroupHintsRepository erzeugt ein neues FansubGroupHintsRepository.
func NewFansubGroupHintsRepository(db *pgxpool.Pool) *FansubGroupHintsRepository {
	return &FansubGroupHintsRepository{db: db}
}

const fansubGroupHintSelectCols = `
	h.id,
	h.sender_app_user_id,
	COALESCE(NULLIF(au.display_name, ''), au.email, ''),
	h.target_fansub_group_id,
	COALESCE(fg.name, ''),
	h.hint_type,
	h.related_anime_id,
	a.title,
	h.requested_role_code,
	rd.label_de,
	h.note,
	h.status,
	h.decided_by,
	h.decided_at,
	h.decision_note,
	h.created_at,
	(
		SELECT fg2.name
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN (
			SELECT member_id, fansub_group_id FROM hist_fansub_group_members
			UNION
			SELECT member_id, fansub_group_id FROM fansub_group_members WHERE member_id IS NOT NULL
		) grp ON grp.member_id = m.id
		JOIN fansub_groups fg2 ON fg2.id = grp.fansub_group_id
		WHERE mc.app_user_id = h.sender_app_user_id AND mc.claim_status = 'verified'
		ORDER BY grp.fansub_group_id
		LIMIT 1
	) AS sender_own_group_name
`

const fansubGroupHintFromJoins = `
	FROM fansub_group_hints h
	JOIN app_users au ON au.id = h.sender_app_user_id
	JOIN fansub_groups fg ON fg.id = h.target_fansub_group_id
	LEFT JOIN anime a ON a.id = h.related_anime_id
	LEFT JOIN role_definitions rd ON rd.code = h.requested_role_code
`

func scanFansubGroupHintRow(row pgx.Row) (*FansubGroupHintRow, error) {
	var r FansubGroupHintRow
	if err := row.Scan(
		&r.ID,
		&r.SenderAppUserID,
		&r.SenderDisplayName,
		&r.TargetFansubGroupID,
		&r.TargetFansubGroupName,
		&r.HintType,
		&r.RelatedAnimeID,
		&r.RelatedAnimeTitle,
		&r.RequestedRoleCode,
		&r.RequestedRoleLabel,
		&r.Note,
		&r.Status,
		&r.DecidedBy,
		&r.DecidedAt,
		&r.DecisionNote,
		&r.CreatedAt,
		&r.SenderOwnGroupName,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateHint legt einen neuen Hinweis an (status='open'). Gibt ErrConflict zurück, wenn
// bereits ein offener Hinweis zum selben Thema existiert (erzwungen über den
// Partial-Unique-Index der Migration, nicht über eine SELECT-dann-INSERT-Prüfung hier),
// und ErrNotFound bei ungültiger Zielgruppen-/Anime-/Rollen-Referenz.
//
// Bewusst KEIN Ownership-Check wie AnimeContributionsRepository.MemberBelongsToFansub:
// ein Hinweis ist eine reine Information an eine Gruppe, keine Behauptung tatsächlicher
// Mitwirkung — ein Mitglied darf deshalb an JEDE Fansub-Gruppe einen Hinweis schicken,
// nicht nur an die eigene(n). Der Ownership-Check bleibt unverändert beim regulären
// Beitrags-Vorschlag (anime_contributions_proposal_repository.go), der eine tatsächliche
// Mitwirkung in der Zielgruppe behauptet und deshalb weiterhin Mitgliedschaft voraussetzt.
func (r *FansubGroupHintsRepository) CreateHint(ctx context.Context, input HintInput) (*FansubGroupHintRow, error) {
	var newID int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_hints (
			sender_app_user_id,
			target_fansub_group_id,
			hint_type,
			related_anime_id,
			requested_role_code,
			note
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`,
		input.SenderAppUserID,
		input.TargetFansubGroupID,
		input.HintType,
		input.RelatedAnimeID,
		input.RequestedRoleCode,
		input.Note,
	).Scan(&newID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("hinweis erstellen: bereits ein offener Hinweis zu diesem Thema vorhanden: %w", ErrConflict)
		}
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("hinweis erstellen: Referenz nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("hinweis erstellen: insert: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// GetByID gibt einen einzelnen Hinweis inklusive Anzeige-Kontext zurück.
func (r *FansubGroupHintsRepository) GetByID(ctx context.Context, id int64) (*FansubGroupHintRow, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+fansubGroupHintSelectCols+`
		`+fansubGroupHintFromJoins+`
		WHERE h.id = $1
	`, id)
	result, err := scanFansubGroupHintRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("hinweis laden: %w", err)
	}
	return result, nil
}

// ListByTargetGroup gibt alle Hinweise an eine Zielgruppe zurück, über ALLE Status hinweg
// (offen + bestätigt + abgelehnt), sortiert nach Erstelldatum. Die Liste filtert
// absichtlich nicht serverseitig auf status='open' — das Frontend entscheidet per
// Toggle "Nur offene anzeigen" (analog zu ContributionsReviewSection.tsx), welche
// Teilmenge angezeigt wird.
func (r *FansubGroupHintsRepository) ListByTargetGroup(ctx context.Context, targetGroupID int64) ([]FansubGroupHintRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+fansubGroupHintSelectCols+`
		`+fansubGroupHintFromJoins+`
		WHERE h.target_fansub_group_id = $1
		ORDER BY h.created_at ASC
	`, targetGroupID)
	if err != nil {
		return nil, fmt.Errorf("hinweise nach zielgruppe: %w", err)
	}
	defer rows.Close()

	result := make([]FansubGroupHintRow, 0)
	for rows.Next() {
		row, err := scanFansubGroupHintRow(rows)
		if err != nil {
			return nil, fmt.Errorf("hinweise nach zielgruppe: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("hinweise nach zielgruppe: iterate: %w", err)
	}
	return result, nil
}

// ListForFansubLeadRole gibt NUR Mitgliedschaftsanfragen mit explizitem Rollenwunsch
// 'fansub_lead' zurück (D-01: diese Entscheidung trifft der Plattform-Admin, nicht der
// Leader der Zielgruppe). Der Rollencode wird als parametrisierter Query-Wert aus der
// Konstante permissions.RoleFansubLead gebunden — niemals als rohes String-Literal, damit
// dieser Wert nicht an zwei Stellen (Konstante und Literal) auseinanderlaufen kann.
func (r *FansubGroupHintsRepository) ListForFansubLeadRole(ctx context.Context, filter AdminHintListFilter) ([]FansubGroupHintRow, int, error) {
	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	args := []any{permissions.RoleFansubLead}
	paramIdx := 2
	whereClauses := []string{"h.requested_role_code = $1"}

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
		return nil, 0, fmt.Errorf("hinweise fuer fansub-lead-rolle: %w", err)
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
			&row.HintType,
			&row.RelatedAnimeID,
			&row.RelatedAnimeTitle,
			&row.RequestedRoleCode,
			&row.RequestedRoleLabel,
			&row.Note,
			&row.Status,
			&row.DecidedBy,
			&row.DecidedAt,
			&row.DecisionNote,
			&row.CreatedAt,
			&row.SenderOwnGroupName,
			&total,
		); err != nil {
			return nil, 0, fmt.Errorf("hinweise fuer fansub-lead-rolle: scan: %w", err)
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("hinweise fuer fansub-lead-rolle: iterate: %w", err)
	}

	return items, total, nil
}

// Confirm bestätigt einen offenen Hinweis: status='acknowledged', decided_by/decided_at
// gesetzt. Setzt bewusst KEINE Mitgliedschaft und keine Rollen-/Projektzuweisung als
// Seiteneffekt (D-03: der Hinweis ist reine Information — der Leader bzw. Plattform-Admin
// entscheidet separat über die bestehenden Zuweisungswege, ob und wie er reagiert). Gibt
// ErrNotFound zurück, wenn kein offener Hinweis mit der ID existiert (kein stiller No-Op
// bei bereits entschiedenen Hinweisen).
func (r *FansubGroupHintsRepository) Confirm(ctx context.Context, hintID int64, actorAppUserID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_hints
		SET status = 'acknowledged', decided_by = $2, decided_at = NOW()
		WHERE id = $1 AND status = 'open'
	`, hintID, actorAppUserID)
	if err != nil {
		return fmt.Errorf("hinweis bestätigen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hinweis bestätigen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}

// Reject lehnt einen offenen Hinweis ab: status='rejected', optionale decision_note,
// decided_by/decided_at gesetzt. Gibt ErrNotFound zurück, wenn kein offener Hinweis mit
// der ID existiert.
func (r *FansubGroupHintsRepository) Reject(ctx context.Context, hintID int64, actorAppUserID int64, decisionNote *string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_hints
		SET status = 'rejected', decision_note = $3, decided_by = $2, decided_at = NOW()
		WHERE id = $1 AND status = 'open'
	`, hintID, actorAppUserID, decisionNote)
	if err != nil {
		return fmt.Errorf("hinweis ablehnen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hinweis ablehnen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}
