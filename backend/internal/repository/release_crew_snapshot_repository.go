package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

const (
	SnapshotModeInherited   = "inherited"
	SnapshotModeIndependent = "independent"
)

type releaseCrewDBTX interface {
	DBTX
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type ReleaseCrewRow struct {
	ContributionID  int64
	MemberID        int64
	MemberName      string
	MemberAvatarURL *string
	RoleCodes       []string
}

type ReleaseCrewSnapshot struct {
	Mode string
	Rows []ReleaseCrewRow
}

type ReleaseCrewSnapshotChange struct {
	Before []ReleaseCrewRow
	After  []ReleaseCrewRow
}

type ReleaseCrewSnapshotRepository struct {
	db releaseCrewDBTX
}

func NewReleaseCrewSnapshotRepository(db releaseCrewDBTX) *ReleaseCrewSnapshotRepository {
	return &ReleaseCrewSnapshotRepository{db: db}
}

func releaseCrewContextLockValue(releaseVersionID, fansubGroupID int64) string {
	return fmt.Sprintf("release-crew:%d:%d", releaseVersionID, fansubGroupID)
}

func lockReleaseCrewContext(ctx context.Context, db DBTX, releaseVersionID, fansubGroupID int64) error {
	if _, err := db.Exec(ctx, `
		SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))
	`, releaseCrewContextLockValue(releaseVersionID, fansubGroupID)); err != nil {
		return fmt.Errorf("release crew snapshot: lock context: %w", err)
	}
	return nil
}

func normalizeReleaseCrewRows(rows []ReleaseCrewRow) []ReleaseCrewRow {
	rolesByMember := make(map[int64]map[string]struct{}, len(rows))
	for _, row := range rows {
		if row.MemberID <= 0 {
			continue
		}
		if rolesByMember[row.MemberID] == nil {
			rolesByMember[row.MemberID] = make(map[string]struct{})
		}
		for _, role := range row.RoleCodes {
			role = strings.TrimSpace(role)
			if role != "" {
				rolesByMember[row.MemberID][role] = struct{}{}
			}
		}
	}
	memberIDs := make([]int64, 0, len(rolesByMember))
	for memberID := range rolesByMember {
		memberIDs = append(memberIDs, memberID)
	}
	sort.Slice(memberIDs, func(i, j int) bool { return memberIDs[i] < memberIDs[j] })

	normalized := make([]ReleaseCrewRow, 0, len(memberIDs))
	for _, memberID := range memberIDs {
		roleCodes := make([]string, 0, len(rolesByMember[memberID]))
		for role := range rolesByMember[memberID] {
			roleCodes = append(roleCodes, role)
		}
		sort.Strings(roleCodes)
		if len(roleCodes) > 0 {
			normalized = append(normalized, ReleaseCrewRow{MemberID: memberID, RoleCodes: roleCodes})
		}
	}
	return normalized
}

// LoadComplete returns only the persisted confirmed release snapshot. The context row
// makes an empty independent snapshot distinguishable from a missing snapshot.
func (r *ReleaseCrewSnapshotRepository) LoadComplete(
	ctx context.Context,
	releaseVersionID, fansubGroupID int64,
) (*ReleaseCrewSnapshot, error) {
	if r == nil || r.db == nil || releaseVersionID <= 0 || fansubGroupID <= 0 {
		return nil, ErrNotFound
	}
	var mode string
	if err := r.db.QueryRow(ctx, `
		SELECT snapshot_mode
		FROM release_crew_snapshots
		WHERE release_version_id = $1 AND fansub_group_id = $2
	`, releaseVersionID, fansubGroupID).Scan(&mode); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("load release crew snapshot context: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT ac.id, ac.member_id,
		       COALESCE(NULLIF(TRIM(m.display_name), ''), m.nickname),
		       NULLIF(ma.file_path, ''),
		       COALESCE(ARRAY_AGG(acr.role_code ORDER BY acr.role_code)
		           FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[])
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.release_version_id = $1
		  AND ac.fansub_group_id = $2
		  AND ac.status = 'confirmed'
		GROUP BY ac.id, m.display_name, m.nickname, ma.file_path
		ORDER BY COALESCE(NULLIF(TRIM(m.display_name), ''), m.nickname), ac.id
	`, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("load release crew snapshot rows: %w", err)
	}
	defer rows.Close()

	result := &ReleaseCrewSnapshot{Mode: mode, Rows: make([]ReleaseCrewRow, 0)}
	for rows.Next() {
		var row ReleaseCrewRow
		if err := rows.Scan(&row.ContributionID, &row.MemberID, &row.MemberName, &row.MemberAvatarURL, &row.RoleCodes); err != nil {
			return nil, fmt.Errorf("load release crew snapshot rows: scan: %w", err)
		}
		result.Rows = append(result.Rows, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load release crew snapshot rows: iterate: %w", err)
	}
	return result, nil
}

func loadReleaseCrewUnitsInTx(ctx context.Context, tx releaseCrewDBTX, releaseVersionID, fansubGroupID int64) ([]ReleaseCrewRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT ac.member_id, ARRAY_AGG(acr.role_code ORDER BY acr.role_code)
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.release_version_id = $1
		  AND ac.fansub_group_id = $2
		  AND ac.status = 'confirmed'
		GROUP BY ac.member_id
		ORDER BY ac.member_id
	`, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("load release crew units: %w", err)
	}
	defer rows.Close()
	result := make([]ReleaseCrewRow, 0)
	for rows.Next() {
		var row ReleaseCrewRow
		if err := rows.Scan(&row.MemberID, &row.RoleCodes); err != nil {
			return nil, fmt.Errorf("load release crew units: scan: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func replaceReleaseCrewInTx(
	ctx context.Context,
	tx releaseCrewDBTX,
	releaseVersionID, fansubGroupID int64,
	mode string,
	requested []ReleaseCrewRow,
) (*ReleaseCrewSnapshotChange, error) {
	if err := lockReleaseCrewContext(ctx, tx, releaseVersionID, fansubGroupID); err != nil {
		return nil, err
	}
	var animeID int64
	if err := tx.QueryRow(ctx, `
		SELECT ep.anime_id
		FROM release_version_groups rvg
		JOIN release_versions rv ON rv.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE rvg.release_version_id = $1 AND rvg.fansub_group_id = $2
		FOR UPDATE OF rvg
	`, releaseVersionID, fansubGroupID).Scan(&animeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("validate release crew context: %w", err)
	}

	before, err := loadReleaseCrewUnitsInTx(ctx, tx, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	after := normalizeReleaseCrewRows(requested)

	if _, err := tx.Exec(ctx, `
		INSERT INTO release_crew_snapshots (
			release_version_id, fansub_group_id, snapshot_mode, created_at, updated_at
		) VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (release_version_id, fansub_group_id)
		DO UPDATE SET snapshot_mode = EXCLUDED.snapshot_mode, updated_at = NOW()
	`, releaseVersionID, fansubGroupID, mode); err != nil {
		return nil, fmt.Errorf("store release crew snapshot context: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM anime_contributions
		WHERE release_version_id = $1
		  AND fansub_group_id = $2
		  AND status = 'confirmed'
	`, releaseVersionID, fansubGroupID); err != nil {
		return nil, fmt.Errorf("replace release crew: delete confirmed rows: %w", err)
	}

	for _, row := range after {
		var contributionID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO anime_contributions (
				fansub_group_id, anime_id, member_id, status, release_version_id,
				is_public_on_anime_page, is_public_on_member_profile, created_at, updated_at
			)
			SELECT $1, $2, m.id, 'confirmed', $3, true, true, NOW(), NOW()
			FROM members m
			WHERE m.id = $4
			RETURNING id
		`, fansubGroupID, animeID, releaseVersionID, row.MemberID).Scan(&contributionID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) || isForeignKeyViolation(err) {
				return nil, fmt.Errorf("replace release crew: unknown member %d: %w", row.MemberID, ErrNotFound)
			}
			return nil, fmt.Errorf("replace release crew: insert confirmed member: %w", err)
		}
		for _, roleCode := range row.RoleCodes {
			if _, err := tx.Exec(ctx, `
				INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
				VALUES ($1, $2)
			`, contributionID, roleCode); err != nil {
				if isForeignKeyViolation(err) {
					return nil, fmt.Errorf("replace release crew: unknown role %q: %w", roleCode, ErrNotFound)
				}
				return nil, fmt.Errorf("replace release crew: insert role %q: %w", roleCode, err)
			}
		}
	}
	return &ReleaseCrewSnapshotChange{Before: normalizeReleaseCrewRows(before), After: after}, nil
}

// ReplaceInTx stores a complete manually edited snapshot and permanently marks it independent.
func (r *ReleaseCrewSnapshotRepository) ReplaceInTx(
	ctx context.Context,
	tx releaseCrewDBTX,
	releaseVersionID, fansubGroupID int64,
	rows []ReleaseCrewRow,
) (*ReleaseCrewSnapshotChange, error) {
	return replaceReleaseCrewInTx(ctx, tx, releaseVersionID, fansubGroupID, SnapshotModeIndependent, rows)
}

// SeedInheritedInTx stores the current confirmed project crew as a complete inherited snapshot.
func (r *ReleaseCrewSnapshotRepository) SeedInheritedInTx(
	ctx context.Context,
	tx releaseCrewDBTX,
	releaseVersionID, fansubGroupID int64,
) (*ReleaseCrewSnapshotChange, error) {
	var animeID int64
	if err := tx.QueryRow(ctx, `
		SELECT ep.anime_id
		FROM release_version_groups rvg
		JOIN release_versions rv ON rv.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE rvg.release_version_id = $1 AND rvg.fansub_group_id = $2
	`, releaseVersionID, fansubGroupID).Scan(&animeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("seed inherited release crew: resolve anime: %w", err)
	}
	projectRows, err := loadConfirmedProjectCrew(ctx, tx, animeID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	return replaceReleaseCrewInTx(ctx, tx, releaseVersionID, fansubGroupID, SnapshotModeInherited, projectRows)
}

func loadConfirmedProjectCrew(ctx context.Context, tx releaseCrewDBTX, animeID, fansubGroupID int64) ([]ReleaseCrewRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT ac.member_id, ARRAY_AGG(acr.role_code ORDER BY acr.role_code)
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.anime_id = $1
		  AND ac.fansub_group_id = $2
		  AND ac.release_version_id IS NULL
		  AND ac.status = 'confirmed'
		GROUP BY ac.member_id
		ORDER BY ac.member_id
	`, animeID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("load confirmed project crew: %w", err)
	}
	defer rows.Close()
	result := make([]ReleaseCrewRow, 0)
	for rows.Next() {
		var row ReleaseCrewRow
		if err := rows.Scan(&row.MemberID, &row.RoleCodes); err != nil {
			return nil, fmt.Errorf("load confirmed project crew: scan: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

// SyncInheritedForProjectInTx replaces all and only inherited snapshots for one project.
func (r *ReleaseCrewSnapshotRepository) SyncInheritedForProjectInTx(
	ctx context.Context,
	tx releaseCrewDBTX,
	animeID, fansubGroupID int64,
) ([]ReleaseCrewSnapshotChange, error) {
	projectRows, err := loadConfirmedProjectCrew(ctx, tx, animeID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	contextRows, err := tx.Query(ctx, `
		SELECT rcs.release_version_id
		FROM release_crew_snapshots rcs
		JOIN release_versions rv ON rv.id = rcs.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE ep.anime_id = $1
		  AND rcs.fansub_group_id = $2
		  AND rcs.snapshot_mode = 'inherited'
		ORDER BY rcs.release_version_id
	`, animeID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list inherited release crew snapshots: %w", err)
	}
	versionIDs := make([]int64, 0)
	for contextRows.Next() {
		var id int64
		if err := contextRows.Scan(&id); err != nil {
			contextRows.Close()
			return nil, fmt.Errorf("list inherited release crew snapshots: scan: %w", err)
		}
		versionIDs = append(versionIDs, id)
	}
	if err := contextRows.Err(); err != nil {
		contextRows.Close()
		return nil, fmt.Errorf("list inherited release crew snapshots: iterate: %w", err)
	}
	contextRows.Close()

	changes := make([]ReleaseCrewSnapshotChange, 0, len(versionIDs))
	for _, releaseVersionID := range versionIDs {
		change, err := replaceReleaseCrewInTx(
			ctx, tx, releaseVersionID, fansubGroupID, SnapshotModeInherited, projectRows,
		)
		if err != nil {
			return nil, err
		}
		changes = append(changes, *change)
	}
	return changes, nil
}
