package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HistGroupMemberRoleRow struct {
	ID                      int64
	HistFansubGroupMemberID int64
	RoleCode                string
	StartedYear             *int
	EndedYear               *int
	Status                  string
	Visibility              string
	ConfirmedBy             *int64
	ConfirmedAt             *time.Time
	SourceNote              *string
	CreatedBy               *int64
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type HistGroupMemberRoleInput struct {
	HistFansubGroupMemberID int64
	RoleCode                string
	StartedYear             *int
	EndedYear               *int
	Status                  string
	Visibility              string
	SourceNote              *string
	CreatedBy               *int64
}

type HistGroupMemberRolePatchInput struct {
	StartedYear **int
	EndedYear   **int
	Status      *string
	Visibility  *string
	SourceNote  **string
}

type HistGroupMemberRolesRepository struct {
	db *pgxpool.Pool
}

func NewHistGroupMemberRolesRepository(db *pgxpool.Pool) *HistGroupMemberRolesRepository {
	return &HistGroupMemberRolesRepository{db: db}
}

// HistGroupMemberRoleDisplayRow is the frontend-facing response type enriched with
// display data joined from hist_fansub_group_members and members.
type HistGroupMemberRoleDisplayRow struct {
	ID                  int64     `json:"id"`
	FansubGroupMemberID int64     `json:"fansub_group_member_id"`
	MemberDisplayName   string    `json:"member_display_name"`
	RoleCode            string    `json:"role_code"`
	RoleLabel           *string   `json:"role_label"`
	StartedYear         *int      `json:"started_year"`
	EndedYear           *int      `json:"ended_year"`
	Note                *string   `json:"note"`
	Status              string    `json:"status"`
	CreatedAt           time.Time `json:"created_at"`
}

// ListByFansubGroup returns all member roles for a fansub group, enriched with display names.
func (r *HistGroupMemberRolesRepository) ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]HistGroupMemberRoleDisplayRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT r.id,
		       r.hist_fansub_group_member_id AS fansub_group_member_id,
		       m.nickname                    AS member_display_name,
		       r.role_code,
		       NULL::text                    AS role_label,
		       r.started_year,
		       r.ended_year,
		       r.source_note                 AS note,
		       r.status,
		       r.created_at
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		WHERE hfgm.fansub_group_id = $1
		ORDER BY COALESCE(r.started_year, 9999), r.id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list hist group member roles by fansub: %w", err)
	}
	defer rows.Close()

	result := make([]HistGroupMemberRoleDisplayRow, 0)
	for rows.Next() {
		var row HistGroupMemberRoleDisplayRow
		if err := rows.Scan(
			&row.ID, &row.FansubGroupMemberID, &row.MemberDisplayName,
			&row.RoleCode, &row.RoleLabel,
			&row.StartedYear, &row.EndedYear, &row.Note,
			&row.Status, &row.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("list hist group member roles by fansub: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list hist group member roles by fansub: iterate: %w", err)
	}
	return result, nil
}

func (r *HistGroupMemberRolesRepository) ListByMember(ctx context.Context, histFansubGroupMemberID int64) ([]HistGroupMemberRoleRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, hist_fansub_group_member_id, role_code, started_year, ended_year,
		       status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at
		FROM hist_group_member_roles
		WHERE hist_fansub_group_member_id = $1
		ORDER BY COALESCE(started_year, 9999), id
	`, histFansubGroupMemberID)
	if err != nil {
		return nil, fmt.Errorf("list hist group member roles: %w", err)
	}
	defer rows.Close()

	result := make([]HistGroupMemberRoleRow, 0)
	for rows.Next() {
		var row HistGroupMemberRoleRow
		if err := rows.Scan(
			&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
			&row.StartedYear, &row.EndedYear,
			&row.Status, &row.Visibility,
			&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
			&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("list hist group member roles: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list hist group member roles: iterate: %w", err)
	}
	return result, nil
}

// ListByMemberID returns group member roles for the given member (used by Me-routes).
func (r *HistGroupMemberRolesRepository) ListByMemberID(ctx context.Context, memberID int64) ([]HistGroupMemberRoleRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT r.id, r.hist_fansub_group_member_id, r.role_code, r.started_year, r.ended_year,
		       r.status, r.visibility, r.confirmed_by, r.confirmed_at, r.source_note, r.created_by, r.created_at, r.updated_at
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		WHERE hfgm.member_id = $1
		ORDER BY COALESCE(r.started_year, 9999), r.id
		LIMIT 50
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("list group member roles by member id: %w", err)
	}
	defer rows.Close()

	result := make([]HistGroupMemberRoleRow, 0)
	for rows.Next() {
		var row HistGroupMemberRoleRow
		if err := rows.Scan(
			&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
			&row.StartedYear, &row.EndedYear,
			&row.Status, &row.Visibility,
			&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
			&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("list group member roles by member id: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list group member roles by member id: iterate: %w", err)
	}
	return result, nil
}

func (r *HistGroupMemberRolesRepository) GetByID(ctx context.Context, id int64) (*HistGroupMemberRoleRow, error) {
	var row HistGroupMemberRoleRow
	err := r.db.QueryRow(ctx, `
		SELECT id, hist_fansub_group_member_id, role_code, started_year, ended_year,
		       status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at
		FROM hist_group_member_roles
		WHERE id = $1
	`, id).Scan(
		&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
		&row.StartedYear, &row.EndedYear,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get hist group member role: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMemberRolesRepository) GetByIDForFansub(ctx context.Context, fansubGroupID int64, id int64) (*HistGroupMemberRoleRow, error) {
	var row HistGroupMemberRoleRow
	err := r.db.QueryRow(ctx, `
		SELECT r.id, r.hist_fansub_group_member_id, r.role_code, r.started_year, r.ended_year,
		       r.status, r.visibility, r.confirmed_by, r.confirmed_at, r.source_note, r.created_by, r.created_at, r.updated_at
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
		WHERE r.id = $1 AND hfgm.fansub_group_id = $2
	`, id, fansubGroupID).Scan(
		&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
		&row.StartedYear, &row.EndedYear,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get hist group member role for fansub: %w", err)
	}
	return &row, nil
}

// RoleDefinitionOption ist der DTO-Rückgabetyp für kuratierte Rollendefinitionen.
// Wird von ListGroupHistoryRoleDefinitions zurückgegeben.
type RoleDefinitionOption struct {
	Code      string `json:"code"`
	LabelDE   string `json:"label_de"`
	SortOrder int    `json:"sort_order"`
}

// groupHistoryDialogRoleWhitelist enthält die vier echten historischen Gruppenrollen.
// Hintergrund (Pitfall 2 / RESEARCH Pattern 4):
//   Migration 0103 markiert App-Rollen (translator, encoder, …) zusätzlich mit
//   dem Kontext "group_history". Ein naives WHERE 'group_history' = ANY(contexts)
//   liefert dadurch auch aktive App-Rollen. Diese Whitelist begrenzt das Ergebnis
//   auf die vier Rollen aus dem 0085-Seed mit echtem group_history-Ursprung.
var groupHistoryDialogRoleWhitelist = []string{
	"founder",
	"fansub_lead",
	"co_leader",
	"project_lead",
	"techadmin",
	"gfxler",
}

// ListGroupHistoryRoleDefinitions gibt die kuratierte Liste der historischen Gruppenrollen
// aus role_definitions zurück (nur Codes aus der expliziten Whitelist).
// Entspricht dem Seed in database/migrations/0085_role_definitions_seed.up.sql.
func (r *HistGroupMemberRolesRepository) ListGroupHistoryRoleDefinitions(ctx context.Context) ([]RoleDefinitionOption, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code, label_de, sort_order
		FROM role_definitions
		WHERE 'group_history' = ANY(contexts)
		  AND code = ANY($1)
		ORDER BY sort_order, code
	`, groupHistoryDialogRoleWhitelist)
	if err != nil {
		return nil, fmt.Errorf("list group history role definitions: %w", err)
	}
	defer rows.Close()

	result := make([]RoleDefinitionOption, 0, len(groupHistoryDialogRoleWhitelist))
	for rows.Next() {
		var opt RoleDefinitionOption
		if err := rows.Scan(&opt.Code, &opt.LabelDE, &opt.SortOrder); err != nil {
			return nil, fmt.Errorf("list group history role definitions: scan: %w", err)
		}
		result = append(result, opt)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list group history role definitions: iterate: %w", err)
	}
	return result, nil
}

func (r *HistGroupMemberRolesRepository) RoleCodeExistsForContext(ctx context.Context, roleCode string, contextName string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM role_definitions WHERE code = $1 AND $2 = ANY(contexts))
	`, roleCode, contextName).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check role code for context: %w", err)
	}
	return exists, nil
}

func (r *HistGroupMemberRolesRepository) Create(ctx context.Context, input HistGroupMemberRoleInput) (*HistGroupMemberRoleRow, error) {
	var row HistGroupMemberRoleRow
	err := r.db.QueryRow(ctx, `
		INSERT INTO hist_group_member_roles
			(hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility, source_note, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, hist_fansub_group_member_id, role_code, started_year, ended_year,
		          status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at
	`, input.HistFansubGroupMemberID, input.RoleCode, input.StartedYear, input.EndedYear,
		input.Status, input.Visibility, input.SourceNote, input.CreatedBy,
	).Scan(
		&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
		&row.StartedYear, &row.EndedYear,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create hist group member role: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMemberRolesRepository) Update(ctx context.Context, fansubGroupID int64, id int64, input HistGroupMemberRolePatchInput) (*HistGroupMemberRoleRow, error) {
	setClauses := make([]string, 0, 6)
	args := make([]any, 0, 7)
	argIdx := 1

	if input.StartedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("started_year = $%d", argIdx))
		args = append(args, *input.StartedYear)
		argIdx++
	}
	if input.EndedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("ended_year = $%d", argIdx))
		args = append(args, *input.EndedYear)
		argIdx++
	}
	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
	}
	if input.Visibility != nil {
		setClauses = append(setClauses, fmt.Sprintf("visibility = $%d", argIdx))
		args = append(args, *input.Visibility)
		argIdx++
	}
	if input.SourceNote != nil {
		setClauses = append(setClauses, fmt.Sprintf("source_note = $%d", argIdx))
		args = append(args, *input.SourceNote)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByIDForFansub(ctx, fansubGroupID, id)
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)
	idxID := argIdx
	argIdx++
	args = append(args, fansubGroupID)

	query := fmt.Sprintf(`
		UPDATE hist_group_member_roles
		SET %s
		WHERE id = $%d
		  AND EXISTS (
		      SELECT 1
		      FROM hist_fansub_group_members hfgm
		      WHERE hfgm.id = hist_group_member_roles.hist_fansub_group_member_id
		        AND hfgm.fansub_group_id = $%d
		  )
		RETURNING id, hist_fansub_group_member_id, role_code, started_year, ended_year,
		          status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at
	`, strings.Join(setClauses, ", "), idxID, argIdx)

	var row HistGroupMemberRoleRow
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&row.ID, &row.HistFansubGroupMemberID, &row.RoleCode,
		&row.StartedYear, &row.EndedYear,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt, &row.SourceNote,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update hist group member role: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMemberRolesRepository) Delete(ctx context.Context, fansubGroupID int64, id int64) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM hist_group_member_roles r
		USING hist_fansub_group_members hfgm
		WHERE r.id = $1
		  AND hfgm.id = r.hist_fansub_group_member_id
		  AND hfgm.fansub_group_id = $2
	`, id, fansubGroupID)
	if err != nil {
		return fmt.Errorf("delete hist group member role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
