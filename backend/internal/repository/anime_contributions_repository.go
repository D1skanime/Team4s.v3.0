package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeContributionRow represents a full anime contribution record with associated role codes.
type AnimeContributionRow struct {
	ID                      int64      `json:"id"`
	FansubGroupID           int64      `json:"fansub_group_id"`
	AnimeID                 int64      `json:"anime_id"`
	FansubGroupMemberID     int64      `json:"fansub_group_member_id"`
	Status                  string     `json:"status"`
	Note                    *string    `json:"note"`
	StartedYear             *int       `json:"started_year"`
	EndedYear               *int       `json:"ended_year"`
	IsPublicOnAnimePage     bool       `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool       `json:"is_public_on_member_profile"`
	ConfirmedBy             *int64     `json:"confirmed_by"`
	ConfirmedAt             *time.Time `json:"confirmed_at"`
	CreatedBy               *int64     `json:"created_by"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedBy               *int64     `json:"updated_by"`
	UpdatedAt               time.Time  `json:"updated_at"`
	RoleCodes               []string   `json:"role_codes"`
	RoleLabels              []string   `json:"role_labels"`
}

// AnimeContributionInput holds the data required to create a new anime contribution.
type AnimeContributionInput struct {
	FansubGroupMemberID     int64
	RoleCodes               []string
	Status                  string // "draft" | "proposed" | "confirmed" | "disputed" | "hidden"; leer => "draft"
	StartedYear             *int
	EndedYear               *int
	Note                    *string
	IsPublicOnAnimePage     bool
	IsPublicOnMemberProfile bool
	CreatedBy               *int64
}

// AnimeContributionPatchInput holds optional fields for patching an existing anime contribution.
// Pointer-to-pointer fields represent nullable values: nil = do not update, non-nil = update (inner pointer may be nil to set NULL).
type AnimeContributionPatchInput struct {
	RoleCodes               *[]string
	StartedYear             **int
	EndedYear               **int
	Note                    **string
	IsPublicOnAnimePage     *bool
	IsPublicOnMemberProfile *bool
	Status                  *string
	UpdatedBy               *int64
}

// AnimeContributionDisplayRow is the frontend-facing response type for anime_contributions,
// enriched with the member display name via JOIN.
type AnimeContributionDisplayRow struct {
	ID                      int64     `json:"id"`
	FansubGroupMemberID     int64     `json:"fansub_group_member_id"`
	MemberDisplayName       string    `json:"member_display_name"`
	AnimeID                 int64     `json:"anime_id"`
	RoleCodes               []string  `json:"role_codes"`
	StartedYear             *int      `json:"started_year"`
	EndedYear               *int      `json:"ended_year"`
	Note                    *string   `json:"note"`
	IsPublicOnAnimePage     bool      `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool      `json:"is_public_on_member_profile"`
	Status                  string    `json:"status"`
	CreatedAt               time.Time `json:"created_at"`
}

// AnimeContributionsRepository handles persistence for anime_contributions and anime_contribution_roles.
type AnimeContributionsRepository struct {
	db *pgxpool.Pool
}

// NewAnimeContributionsRepository returns a new AnimeContributionsRepository.
func NewAnimeContributionsRepository(db *pgxpool.Pool) *AnimeContributionsRepository {
	return &AnimeContributionsRepository{db: db}
}

// MemberBelongsToFansub returns true when the hist_fansub_group_member with the given id
// belongs to the given fansub group. Used to prevent cross-group contribution writes.
func (r *AnimeContributionsRepository) MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM hist_fansub_group_members
			WHERE id = $1 AND fansub_group_id = $2
		)
	`, memberID, fansubGroupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("member belongs to fansub check: %w", err)
	}
	return exists, nil
}

const animeContributionDisplayCols = `
	ac.id,
	ac.fansub_group_member_id,
	m.nickname AS member_display_name,
	ac.anime_id,
	ac.started_year,
	ac.ended_year,
	ac.note,
	ac.is_public_on_anime_page,
	ac.is_public_on_member_profile,
	ac.status,
	ac.created_at,
	COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes
`

func scanAnimeContributionDisplayRow(row pgx.Row) (*AnimeContributionDisplayRow, error) {
	var r AnimeContributionDisplayRow
	if err := row.Scan(
		&r.ID, &r.FansubGroupMemberID, &r.MemberDisplayName,
		&r.AnimeID, &r.StartedYear, &r.EndedYear, &r.Note,
		&r.IsPublicOnAnimePage, &r.IsPublicOnMemberProfile,
		&r.Status, &r.CreatedAt, &r.RoleCodes,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

// ListByFansubAndAnimeWithDisplay returns contributions for a fansub group and anime,
// enriched with the member display name.
func (r *AnimeContributionsRepository) ListByFansubAndAnimeWithDisplay(ctx context.Context, fansubGroupID int64, animeID int64) ([]AnimeContributionDisplayRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+animeContributionDisplayCols+`
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.fansub_group_id = $1 AND ac.anime_id = $2
		GROUP BY ac.id, m.nickname
		ORDER BY ac.created_at
	`, fansubGroupID, animeID)
	if err != nil {
		return nil, fmt.Errorf("list anime contributions with display: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeContributionDisplayRow, 0)
	for rows.Next() {
		row, err := scanAnimeContributionDisplayRow(rows)
		if err != nil {
			return nil, fmt.Errorf("list anime contributions with display: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list anime contributions with display: iterate: %w", err)
	}
	return result, nil
}

// GetByIDWithDisplay returns a single anime contribution enriched with the member display name.
func (r *AnimeContributionsRepository) GetByIDWithDisplay(ctx context.Context, id int64) (*AnimeContributionDisplayRow, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+animeContributionDisplayCols+`
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.id = $1
		GROUP BY ac.id, m.nickname
	`, id)
	result, err := scanAnimeContributionDisplayRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get anime contribution with display: %w", err)
	}
	return result, nil
}

const animeContributionSelectCols = `
	ac.id,
	ac.fansub_group_id,
	ac.anime_id,
	ac.fansub_group_member_id,
	ac.status,
	ac.note,
	ac.started_year,
	ac.ended_year,
	ac.is_public_on_anime_page,
	ac.is_public_on_member_profile,
	ac.confirmed_by,
	ac.confirmed_at,
	ac.created_by,
	ac.created_at,
	ac.updated_by,
	ac.updated_at,
	COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
	COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels
`

func scanAnimeContributionRow(row pgx.Row) (*AnimeContributionRow, error) {
	var r AnimeContributionRow
	if err := row.Scan(
		&r.ID,
		&r.FansubGroupID,
		&r.AnimeID,
		&r.FansubGroupMemberID,
		&r.Status,
		&r.Note,
		&r.StartedYear,
		&r.EndedYear,
		&r.IsPublicOnAnimePage,
		&r.IsPublicOnMemberProfile,
		&r.ConfirmedBy,
		&r.ConfirmedAt,
		&r.CreatedBy,
		&r.CreatedAt,
		&r.UpdatedBy,
		&r.UpdatedAt,
		&r.RoleCodes,
		&r.RoleLabels,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

// ListByFansubAndAnime returns all contributions for a given fansub group and anime.
func (r *AnimeContributionsRepository) ListByFansubAndAnime(ctx context.Context, fansubGroupID int64, animeID int64) ([]AnimeContributionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+animeContributionSelectCols+`
		FROM anime_contributions ac
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.fansub_group_id = $1 AND ac.anime_id = $2
		GROUP BY ac.id
		ORDER BY ac.created_at
	`, fansubGroupID, animeID)
	if err != nil {
		return nil, fmt.Errorf("list anime contributions by fansub and anime: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeContributionRow, 0)
	for rows.Next() {
		row, err := scanAnimeContributionRow(rows)
		if err != nil {
			return nil, fmt.Errorf("list anime contributions by fansub and anime: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list anime contributions by fansub and anime: iterate: %w", err)
	}
	return result, nil
}

// GetByID returns a single anime contribution by its primary key.
func (r *AnimeContributionsRepository) GetByID(ctx context.Context, id int64) (*AnimeContributionRow, error) {
	return r.getByIDWithQuerier(ctx, r.db, id)
}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func (r *AnimeContributionsRepository) getByIDWithQuerier(ctx context.Context, q querier, id int64) (*AnimeContributionRow, error) {
	row := q.QueryRow(ctx, `
		SELECT `+animeContributionSelectCols+`
		FROM anime_contributions ac
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.id = $1
		GROUP BY ac.id
	`, id)
	result, err := scanAnimeContributionRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get anime contribution by id: %w", err)
	}
	return result, nil
}

// Create inserts a new anime contribution and its role codes in a single transaction.
// Falls input.Status leer ist, wird "draft" als Standardwert verwendet.
func (r *AnimeContributionsRepository) Create(ctx context.Context, fansubGroupID int64, animeID int64, input AnimeContributionInput) (*AnimeContributionRow, error) {
	if input.Status == "" {
		input.Status = "draft"
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("create anime contribution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

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
			created_by,
			updated_by,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9, $9, NOW(), NOW())
		RETURNING id
	`,
		fansubGroupID,
		animeID,
		input.FansubGroupMemberID,
		input.Note,
		input.StartedYear,
		input.EndedYear,
		input.IsPublicOnAnimePage,
		input.IsPublicOnMemberProfile,
		input.CreatedBy,
		input.Status,
	).Scan(&newID)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create anime contribution: insert: %w", err)
	}

	for _, code := range input.RoleCodes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
		`, newID, code); err != nil {
			if isForeignKeyViolation(err) {
				return nil, fmt.Errorf("create anime contribution: unknown role_code %q: %w", code, ErrNotFound)
			}
			if isUniqueViolation(err) {
				return nil, fmt.Errorf("create anime contribution: duplicate role_code %q: %w", code, ErrConflict)
			}
			return nil, fmt.Errorf("create anime contribution: insert role: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create anime contribution: commit: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// Update patches an anime contribution. If RoleCodes is set, roles are replaced atomically.
func (r *AnimeContributionsRepository) Update(ctx context.Context, id int64, input AnimeContributionPatchInput) (*AnimeContributionRow, error) {
	setClauses := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	addArg := func(val any) int {
		args = append(args, val)
		idx := argIdx
		argIdx++
		return idx
	}

	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", addArg(*input.Status)))
	}
	if input.Note != nil {
		setClauses = append(setClauses, fmt.Sprintf("note = $%d", addArg(*input.Note)))
	}
	if input.StartedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("started_year = $%d", addArg(*input.StartedYear)))
	}
	if input.EndedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("ended_year = $%d", addArg(*input.EndedYear)))
	}
	if input.IsPublicOnAnimePage != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_public_on_anime_page = $%d", addArg(*input.IsPublicOnAnimePage)))
	}
	if input.IsPublicOnMemberProfile != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_public_on_member_profile = $%d", addArg(*input.IsPublicOnMemberProfile)))
	}
	setClauses = append(setClauses, fmt.Sprintf("updated_by = $%d", addArg(input.UpdatedBy)))
	setClauses = append(setClauses, "updated_at = NOW()")

	idxID := addArg(id)

	needsRoleUpdate := input.RoleCodes != nil

	if !needsRoleUpdate && len(setClauses) == 2 {
		// Only updated_by + updated_at — nothing meaningful to update besides roles
		return r.GetByID(ctx, id)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("update anime contribution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if len(setClauses) > 2 || input.UpdatedBy != nil {
		query := fmt.Sprintf("UPDATE anime_contributions SET %s WHERE id = $%d", strings.Join(setClauses, ", "), idxID)
		tag, err := tx.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("update anime contribution: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrNotFound
		}
	}

	if needsRoleUpdate {
		if _, err := tx.Exec(ctx, `
			DELETE FROM anime_contribution_roles WHERE anime_contribution_id = $1
		`, id); err != nil {
			return nil, fmt.Errorf("update anime contribution: delete roles: %w", err)
		}
		for _, code := range *input.RoleCodes {
			if _, err := tx.Exec(ctx, `
				INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
				VALUES ($1, $2)
			`, id, code); err != nil {
				if isForeignKeyViolation(err) {
					return nil, fmt.Errorf("update anime contribution: unknown role_code %q: %w", code, ErrNotFound)
				}
				if isUniqueViolation(err) {
					return nil, fmt.Errorf("update anime contribution: duplicate role_code %q: %w", code, ErrConflict)
				}
				return nil, fmt.Errorf("update anime contribution: insert role: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("update anime contribution: commit: %w", err)
	}

	return r.GetByID(ctx, id)
}

// ListByMemberID und Delete sind in anime_contributions_member_repository.go ausgelagert.
