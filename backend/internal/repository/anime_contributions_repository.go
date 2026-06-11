package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeContributionRow, AnimeContributionInput und AnimeContributionPatchInput
// sind nach anime_contributions_inputs.go ausgelagert (450-Zeilen-Limit, Phase 67-02 W1).

// AnimeContributionDisplayRow is the frontend-facing response type for anime_contributions,
// enriched with the member display name via JOIN.
type AnimeContributionDisplayRow struct {
	ID                      int64     `json:"id"`
	MemberID                int64     `json:"member_id"`
	MemberDisplayName       string    `json:"member_display_name"`
	MemberAvatarURL         *string   `json:"member_avatar_url,omitempty"`
	AnimeID                 int64     `json:"anime_id"`
	RoleCodes               []string  `json:"role_codes"`
	StartedYear             *int      `json:"started_year"`
	EndedYear               *int      `json:"ended_year"`
	Note                    *string   `json:"note"`
	IsPublicOnAnimePage     bool      `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool      `json:"is_public_on_member_profile"`
	Status                  string    `json:"status"`
	CreatedAt               time.Time `json:"created_at"`
	memberAvatarPath        string
}

// AnimeContributionsRepository handles persistence for anime_contributions and anime_contribution_roles.
type AnimeContributionsRepository struct {
	db                 *pgxpool.Pool
	mediaPublicBaseURL string
}

// NewAnimeContributionsRepository returns a new AnimeContributionsRepository.
func NewAnimeContributionsRepository(db *pgxpool.Pool) *AnimeContributionsRepository {
	return &AnimeContributionsRepository{db: db}
}

func (r *AnimeContributionsRepository) WithMediaPublicBaseURL(baseURL string) *AnimeContributionsRepository {
	r.mediaPublicBaseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	return r
}

// MemberBelongsToFansub returns true when the member (identified by members.id) belongs
// to the given fansub group, either as a historical member or as an app member.
// Used to prevent cross-group contribution writes (T-82-02-02, T-82-02-03).
func (r *AnimeContributionsRepository) MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM hist_fansub_group_members
			WHERE member_id = $1 AND fansub_group_id = $2
			UNION ALL
			SELECT 1 FROM fansub_group_members
			WHERE member_id = $1 AND fansub_group_id = $2
		)
	`, memberID, fansubGroupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("member belongs to fansub check: %w", err)
	}
	return exists, nil
}

const animeContributionDisplayCols = `
	ac.id,
	ac.member_id,
	m.nickname AS member_display_name,
	COALESCE(member_avatar.file_path, '') AS member_avatar_path,
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
		&r.ID, &r.MemberID, &r.MemberDisplayName,
		&r.memberAvatarPath,
		&r.AnimeID, &r.StartedYear, &r.EndedYear, &r.Note,
		&r.IsPublicOnAnimePage, &r.IsPublicOnMemberProfile,
		&r.Status, &r.CreatedAt, &r.RoleCodes,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

func (r *AnimeContributionsRepository) enrichAnimeContributionDisplayRow(row *AnimeContributionDisplayRow) {
	if row == nil {
		return
	}
	if avatarURL := r.publicURLForPath(row.memberAvatarPath); avatarURL != "" {
		row.MemberAvatarURL = &avatarURL
	}
}

func (r *AnimeContributionsRepository) publicURLForPath(filePath string) string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	if strings.HasPrefix(normalized, "/app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "/app/media/")
	} else if strings.HasPrefix(normalized, "app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "app/media/")
	} else if strings.HasPrefix(normalized, "media/") {
		trimmed = "/" + normalized
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return r.mediaPublicBaseURL + trimmed
}

// ListByFansubAndAnimeWithDisplay returns contributions for a fansub group and anime,
// enriched with the member display name.
func (r *AnimeContributionsRepository) ListByFansubAndAnimeWithDisplay(ctx context.Context, fansubGroupID int64, animeID int64) ([]AnimeContributionDisplayRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+animeContributionDisplayCols+`
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.fansub_group_id = $1 AND ac.anime_id = $2
		GROUP BY ac.id, m.nickname, member_avatar.file_path
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
		r.enrichAnimeContributionDisplayRow(row)
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
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.id = $1
		GROUP BY ac.id, m.nickname, member_avatar.file_path
	`, id)
	result, err := scanAnimeContributionDisplayRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get anime contribution with display: %w", err)
	}
	r.enrichAnimeContributionDisplayRow(result)
	return result, nil
}

const animeContributionSelectCols = `
	ac.id,
	ac.fansub_group_id,
	ac.anime_id,
	ac.member_id,
	ac.status,
	ac.note,
	ac.started_year,
	ac.ended_year,
	ac.is_public_on_anime_page,
	ac.is_public_on_member_profile,
	ac.release_version_id,
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
		&r.MemberID,
		&r.Status,
		&r.Note,
		&r.StartedYear,
		&r.EndedYear,
		&r.IsPublicOnAnimePage,
		&r.IsPublicOnMemberProfile,
		&r.ReleaseVersionID,
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

func (r *AnimeContributionsRepository) GetByIDForFansubAnime(ctx context.Context, fansubGroupID int64, animeID int64, id int64) (*AnimeContributionRow, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+animeContributionSelectCols+`
		FROM anime_contributions ac
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.id = $1 AND ac.fansub_group_id = $2 AND ac.anime_id = $3
		GROUP BY ac.id
	`, id, fansubGroupID, animeID)
	result, err := scanAnimeContributionRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get anime contribution by fansub and anime: %w", err)
	}
	return result, nil
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

// Create, Update sind in anime_contributions_write_repository.go ausgelagert (450-Zeilen-Limit, Phase 82-02).
// ListByMemberID und Delete sind in anime_contributions_member_repository.go ausgelagert.
