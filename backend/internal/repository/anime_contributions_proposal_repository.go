package repository

// Ausgelagert aus anime_contributions_repository.go für das 450-Zeilen-Limit.
// Enthält alle Datenbankoperationen für Vorschläge und Review-Aktionen (Phase 65).

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ProposalInput enthält die Eingabefelder für einen neuen Contribution-Vorschlag.
type ProposalInput struct {
	FansubGroupMemberID int64
	// MemberID ist die member_id des server-seitig verifizierten Members — Server-Wahrheit,
	// NIE aus dem Request (quick-260707-kut, T-260707kut-01/03). Wird direkt fuer
	// anime_contributions.member_id gebunden statt ueber eine hist-only Subquery abgeleitet.
	MemberID         int64
	RoleCodes        []string // min. 1 Eintrag erforderlich
	Note             *string
	StartedYear      *int
	EndedYear        *int
	ReleaseVersionID *int64 // nil => anime-weit; gesetzt => versions-spezifisch (Phase 67-02)
	AppUserID        int64  // App-User-ID des einreichenden Members (created_by)
}

// GroupProposalRow ist die Rückgabe für ListProposedByGroup — enthält Member- und
// Anime-Kontext für die Review-Queue.
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
// ungültigem FK-Bezug zurück.
func (r *AnimeContributionsRepository) CreateProposal(ctx context.Context, fansubGroupID int64, animeID int64, input ProposalInput) (*AnimeContributionRow, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("vorschlag erstellen: transaktion starten: %w", err)
	}
	defer tx.Rollback(ctx)

	createdBy := input.AppUserID
	if err := r.lockProposalContext(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID); err != nil {
		return nil, err
	}
	conflictingRoles, err := r.findExistingProposalRoles(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID, input.RoleCodes)
	if err != nil {
		return nil, err
	}
	if len(conflictingRoles) > 0 {
		return nil, fmt.Errorf("vorschlag erstellen: rolle bereits vorhanden: %w", ErrConflict)
	}
	// fansub_group_member_id bleibt NULL, wenn kein hist-Anker vorhanden ist (App-Mitglied
	// ohne hist_fansub_group_members-Eintrag, quick-260707-kut). Der Composite-FK
	// fk_anime_contributions_member_group referenziert hist_fansub_group_members(fansub_group_id, id)
	// per MATCH SIMPLE — bei NULL wird der FK nicht geprueft, kein Konflikt.
	var fansubGroupMemberIDParam any = input.FansubGroupMemberID
	if input.FansubGroupMemberID == 0 {
		fansubGroupMemberIDParam = nil
	}
	var newID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO anime_contributions (
			fansub_group_id,
			anime_id,
			fansub_group_member_id,
			member_id,
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
		) VALUES (
			$1,
			$2,
			$3,
			$9,
			'proposed',
			$4,
			$5,
			$6,
			false,
			false,
			$8,
			$7,
			$7,
			NOW(),
			NOW()
		)
		RETURNING id
	`,
		fansubGroupID,
		animeID,
		fansubGroupMemberIDParam,
		input.Note,
		input.StartedYear,
		input.EndedYear,
		createdBy,
		input.ReleaseVersionID,
		input.MemberID,
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
			return nil, fmt.Errorf("vorschlag erstellen: rolle einfügen: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("vorschlag erstellen: commit: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// ListProposedByGroup gibt alle offenen Vorschläge (status='proposed') für eine Gruppe
// zurück, angereichert mit Member-Anzeigename und Anime-Titel.
func (r *AnimeContributionsRepository) ListProposedByGroup(ctx context.Context, fansubGroupID int64) ([]GroupProposalRow, error) {
	// JOIN direkt über ac.member_id (NOT NULL) statt über hist_fansub_group_members —
	// funktioniert fuer hist- und App-Mitglieder-Vorschlaege gleichermassen, sonst
	// verschwinden App-Mitglieder-Vorschlaege (fansub_group_member_id NULL) aus der
	// Review-Queue (T-260707kut-04, quick-260707-kut).
	rows, err := r.db.Query(ctx, `
		SELECT
			ac.id,
			COALESCE(ac.fansub_group_member_id, 0) AS fansub_group_member_id,
			COALESCE(NULLIF(TRIM(m.display_name), ''), m.nickname) AS member_display_name,
			ac.anime_id,
			COALESCE(a.title_de, a.title_en, a.title, '') AS anime_title,
			COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			ac.note,
			ac.created_at
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.status = 'proposed' AND ac.fansub_group_id = $1
		GROUP BY ac.id, m.display_name, m.nickname, a.title_de, a.title_en, a.title
		ORDER BY ac.created_at ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("vorschläge nach gruppe: %w", err)
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
			return nil, fmt.Errorf("vorschläge nach gruppe: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("vorschläge nach gruppe: iterate: %w", err)
	}
	return result, nil
}

// Confirm bestätigt einen Vorschlag: status='confirmed', beide Sichtbarkeitsflags=true,
// confirmed_by=actorAppUserID, confirmed_at=NOW().
// Gibt ErrNotFound zurück wenn kein 'proposed'-Eintrag mit der ID existiert.
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
		return fmt.Errorf("vorschlag bestätigen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("vorschlag bestätigen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}

// Reject lehnt einen Vorschlag ab: status='disputed', review_note=$reviewNote.
// Kein Hard-Delete (Observability-Constraint, D-07).
// Gibt ErrNotFound zurück wenn kein 'proposed'-Eintrag mit der ID existiert.
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

// MemberContributionWithProposalRow, ListByMemberIDWithProposalFields,
// hasAnimeContributionReviewNoteColumn und SelfPublish sind ausgelagert in
// anime_contributions_proposal_member_repository.go (Phase 143, 450-Zeilen-Limit).
