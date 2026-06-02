package repository

// Ausgelagert aus anime_contributions_repository.go fuer das 450-Zeilen-Limit.
// Enthaelt alle Datenbankoperationen fuer Vorschlaege und Review-Aktionen (Phase 65).

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ProposalInput enthaelt die Eingabefelder fuer einen neuen Contribution-Vorschlag.
type ProposalInput struct {
	FansubGroupMemberID int64
	RoleCodes           []string // min. 1 Eintrag erforderlich
	Note                *string
	StartedYear         *int
	EndedYear           *int
	ReleaseVersionID    *int64 // nil => anime-weit; gesetzt => versions-spezifisch (Phase 67-02)
	AppUserID           int64  // App-User-ID des einreichenden Members (created_by)
}

// GroupProposalRow ist die Rueckgabe fuer ListProposedByGroup — enthält Member- und
// Anime-Kontext fuer die Review-Queue.
type GroupProposalRow struct {
	ID                  int64     `json:"id"`
	FansubGroupMemberID int64     `json:"fansub_group_member_id"`
	MemberDisplayName   string    `json:"member_display_name"`
	AnimeID             int64     `json:"anime_id"`
	AnimeTitle          string    `json:"anime_title"`
	RoleCodes           []string  `json:"role_codes"`
	Note                *string   `json:"note"`
	CreatedAt           time.Time `json:"created_at"`
}

// CreateProposal legt einen neuen Contribution-Vorschlag an (status='proposed',
// is_public_on_*=false, created_by=input.AppUserID).
// Gibt ErrConflict bei Duplikat (gleicher Member+Anime+Gruppe), ErrNotFound bei
// ungueltigem FK-Bezug zurueck.
func (r *AnimeContributionsRepository) CreateProposal(ctx context.Context, fansubGroupID int64, animeID int64, input ProposalInput) (*AnimeContributionRow, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("vorschlag erstellen: transaktion starten: %w", err)
	}
	defer tx.Rollback(ctx)

	createdBy := input.AppUserID
	var newID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO anime_contributions (
			fansub_group_id,
			anime_id,
			fansub_group_member_id,
			status,
			note,
			started_year,
			ended_year,
			is_public_on_anime_page,
			is_public_on_member_profile,
			release_version_id,
			created_by,
			updated_by,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, 'proposed', $4, $5, $6, false, false, $8, $7, $7, NOW(), NOW())
		RETURNING id
	`,
		fansubGroupID,
		animeID,
		input.FansubGroupMemberID,
		input.Note,
		input.StartedYear,
		input.EndedYear,
		createdBy,
		input.ReleaseVersionID,
	).Scan(&newID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("vorschlag erstellen: Beitrag bereits vorhanden: %w", ErrConflict)
		}
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("vorschlag erstellen: Referenz nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("vorschlag erstellen: insert: %w", err)
	}

	for _, code := range input.RoleCodes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
		`, newID, code); err != nil {
			if isForeignKeyViolation(err) {
				return nil, fmt.Errorf("vorschlag erstellen: unbekannte Rolle %q: %w", code, ErrNotFound)
			}
			if isUniqueViolation(err) {
				return nil, fmt.Errorf("vorschlag erstellen: doppelte Rolle %q: %w", code, ErrConflict)
			}
			return nil, fmt.Errorf("vorschlag erstellen: rolle einfuegen: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("vorschlag erstellen: commit: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// ListProposedByGroup gibt alle offenen Vorschlaege (status='proposed') fuer eine Gruppe
// zurueck, angereichert mit Member-Anzeigename und Anime-Titel.
func (r *AnimeContributionsRepository) ListProposedByGroup(ctx context.Context, fansubGroupID int64) ([]GroupProposalRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ac.id,
			ac.fansub_group_member_id,
			COALESCE(NULLIF(TRIM(hfgm.display_name), ''), m.nickname) AS member_display_name,
			ac.anime_id,
			COALESCE(a.title_de, a.title_romaji, a.title_en, '') AS anime_title,
			COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			ac.note,
			ac.created_at
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.status = 'proposed' AND ac.fansub_group_id = $1
		GROUP BY ac.id, hfgm.display_name, m.nickname, a.title_de, a.title_romaji, a.title_en
		ORDER BY ac.created_at ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("vorschlaege nach gruppe: %w", err)
	}
	defer rows.Close()

	result := make([]GroupProposalRow, 0)
	for rows.Next() {
		var row GroupProposalRow
		if err := rows.Scan(
			&row.ID,
			&row.FansubGroupMemberID,
			&row.MemberDisplayName,
			&row.AnimeID,
			&row.AnimeTitle,
			&row.RoleCodes,
			&row.Note,
			&row.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("vorschlaege nach gruppe: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("vorschlaege nach gruppe: iterate: %w", err)
	}
	return result, nil
}

// Confirm bestaetigt einen Vorschlag: status='confirmed', beide Sichtbarkeitsflags=true,
// confirmed_by=actorAppUserID, confirmed_at=NOW().
// Gibt ErrNotFound zurueck wenn kein 'proposed'-Eintrag mit der ID existiert.
func (r *AnimeContributionsRepository) Confirm(ctx context.Context, contributionID int64, actorAppUserID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_contributions
		SET
			status = 'confirmed',
			is_public_on_anime_page = true,
			is_public_on_member_profile = true,
			confirmed_by = $2,
			confirmed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND status = 'proposed'
	`, contributionID, actorAppUserID)
	if err != nil {
		return fmt.Errorf("vorschlag bestaetigen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("vorschlag bestaetigen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}

// Reject lehnt einen Vorschlag ab: status='disputed', review_note=$reviewNote.
// Kein Hard-Delete (Observability-Constraint, D-07).
// Gibt ErrNotFound zurueck wenn kein 'proposed'-Eintrag mit der ID existiert.
func (r *AnimeContributionsRepository) Reject(ctx context.Context, contributionID int64, actorAppUserID int64, reviewNote *string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_contributions
		SET
			status = 'disputed',
			review_note = $2,
			updated_at = NOW()
		WHERE id = $1 AND status = 'proposed'
	`, contributionID, reviewNote)
	if err != nil {
		return fmt.Errorf("vorschlag ablehnen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("vorschlag ablehnen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}

// MemberContributionWithProposalRow erweitert AnimeContributionRow um proposal-spezifische
// Felder fuer die Member-Dashboard-Ansicht. CanSelfPublish und ReviewNote werden in der
// Member-Listen-Query on-read berechnet — sie gehoeren NICHT zu animeContributionSelectCols.
type MemberContributionWithProposalRow struct {
	AnimeContributionRow
	CanSelfPublish bool    `json:"can_self_publish"`
	ReviewNote     *string `json:"review_note"`
}

// ListByMemberIDWithProposalFields gibt Contributions fuer einen Member zurueck,
// angereichert um CanSelfPublish (berechnet on-read: status='proposed' UND
// created_at+90d < NOW()) und ReviewNote.
func (r *AnimeContributionsRepository) ListByMemberIDWithProposalFields(ctx context.Context, memberID int64) ([]MemberContributionWithProposalRow, error) {
	reviewNoteExpr := "ac.review_note"
	hasReviewNote, err := r.hasAnimeContributionReviewNoteColumn(ctx)
	if err != nil {
		return nil, err
	}
	if !hasReviewNote {
		reviewNoteExpr = "NULL::text AS review_note"
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			`+animeContributionSelectCols+`,
			(ac.status = 'proposed' AND ac.created_at + INTERVAL '90 days' < NOW()) AS can_self_publish,
			`+reviewNoteExpr+`
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE hfgm.member_id = $1
		GROUP BY ac.id
		ORDER BY ac.created_at DESC
		LIMIT 50
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("contributions mit vorschlagsfeldern: %w", err)
	}
	defer rows.Close()

	result := make([]MemberContributionWithProposalRow, 0)
	for rows.Next() {
		var row MemberContributionWithProposalRow
		if err := rows.Scan(
			&row.ID,
			&row.FansubGroupID,
			&row.AnimeID,
			&row.FansubGroupMemberID,
			&row.Status,
			&row.Note,
			&row.StartedYear,
			&row.EndedYear,
			&row.IsPublicOnAnimePage,
			&row.IsPublicOnMemberProfile,
			&row.ReleaseVersionID,
			&row.ConfirmedBy,
			&row.ConfirmedAt,
			&row.CreatedBy,
			&row.CreatedAt,
			&row.UpdatedBy,
			&row.UpdatedAt,
			&row.RoleCodes,
			&row.RoleLabels,
			&row.CanSelfPublish,
			&row.ReviewNote,
		); err != nil {
			return nil, fmt.Errorf("contributions mit vorschlagsfeldern: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("contributions mit vorschlagsfeldern: iterate: %w", err)
	}
	return result, nil
}

func (r *AnimeContributionsRepository) hasAnimeContributionReviewNoteColumn(ctx context.Context) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'anime_contributions'
			  AND column_name = 'review_note'
		)
	`).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect anime_contributions.review_note column: %w", err)
	}
	return exists, nil
}

// SelfPublish ermoeglicht einem Member, einen eigenen Vorschlag nach Ablauf der 90-Tage-Frist
// selbst oeffentlich zu schalten. Status bleibt 'proposed' (NICHT 'confirmed'), da der
// Eintrag weiterhin als unverified/(historisch) erscheinen soll (D-11, D-15).
//
// Prueft serverseitig: status='proposed' AND created_at + 90 Tage < NOW().
// Bedingung nicht erfuellt → ErrConflict. Eintrag nicht gefunden → ErrNotFound.
func (r *AnimeContributionsRepository) SelfPublish(ctx context.Context, contributionID int64, appUserID int64) error {
	// 90-Tage-Check: serverseitig, nicht via Frontend-Gate (T-65-01-01).
	var checkID int64
	err := r.db.QueryRow(ctx, `
		SELECT id
		FROM anime_contributions
		WHERE id = $1
		  AND status = 'proposed'
		  AND created_at + INTERVAL '90 days' < NOW()
	`, contributionID).Scan(&checkID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Entweder existiert der Eintrag nicht, hat falschen Status oder
			// die 90 Tage sind noch nicht abgelaufen.
			return fmt.Errorf("selbst veroeffentlichen: 90-Tage-Frist nicht abgelaufen oder Eintrag nicht gefunden: %w", ErrConflict)
		}
		return fmt.Errorf("selbst veroeffentlichen: 90-Tage-Check: %w", err)
	}

	// Status bleibt 'proposed' — nur Sichtbarkeitsflags + confirmed_by setzen.
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_contributions
		SET
			is_public_on_anime_page = true,
			is_public_on_member_profile = true,
			confirmed_by = $2,
			confirmed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND status = 'proposed'
	`, contributionID, appUserID)
	if err != nil {
		return fmt.Errorf("selbst veroeffentlichen: update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("selbst veroeffentlichen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}
