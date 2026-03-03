package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GroupRepository struct {
	db *pgxpool.Pool
}

func NewGroupRepository(db *pgxpool.Pool) *GroupRepository {
	return &GroupRepository{db: db}
}

// GetGroupDetail retrieves detailed information about a fansub group's work on an anime
func (r *GroupRepository) GetGroupDetail(
	ctx context.Context,
	animeID int64,
	groupID int64,
) (*models.GroupDetail, error) {
	query := `
		SELECT
			afg.anime_id,
			afg.fansub_group_id,
			afg.notes,
			afg.created_at,
			fg.id,
			fg.slug,
			fg.name,
			fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND afg.fansub_group_id = $2
	`

	var detail models.GroupDetail
	var fansub models.FansubGroupWithLogo
	err := r.db.QueryRow(ctx, query, animeID, groupID).Scan(
		&detail.AnimeID,
		&detail.FansubID,
		&detail.Story,
		&detail.CreatedAt,
		&fansub.ID,
		&fansub.Slug,
		&fansub.Name,
		&fansub.LogoURL,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get group detail (%d,%d): %w", animeID, groupID, err)
	}

	detail.ID = detail.FansubID
	detail.Fansub = fansub

	// Get stats
	stats, err := r.getGroupStats(ctx, animeID, groupID)
	if err != nil {
		return nil, err
	}
	detail.Stats = *stats

	// Period is nullable and not stored directly in anime_fansub_groups
	// We could derive it from release dates, but for now leave it nil
	detail.Period = nil

	return &detail, nil
}

// getGroupStats retrieves statistics about a group's work on an anime
func (r *GroupRepository) getGroupStats(
	ctx context.Context,
	animeID int64,
	groupID int64,
) (*models.GroupStats, error) {
	var stats models.GroupStats

	// Count members (global group member count)
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM fansub_members
		WHERE fansub_group_id = $1
	`, groupID).Scan(&stats.MemberCount)
	if err != nil {
		return nil, fmt.Errorf("count group members %d: %w", groupID, err)
	}

	// Count episodes for this anime
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT episode_number)
		FROM episode_versions
		WHERE anime_id = $1 AND fansub_group_id = $2
	`, animeID, groupID).Scan(&stats.EpisodeCount)
	if err != nil {
		return nil, fmt.Errorf("count group episodes (%d,%d): %w", animeID, groupID, err)
	}

	return &stats, nil
}

// GetGroupReleases retrieves paginated episode releases for a group's work on an anime
func (r *GroupRepository) GetGroupReleases(
	ctx context.Context,
	animeID int64,
	groupID int64,
	filter models.GroupReleasesFilter,
) (*models.GroupReleasesData, int64, error) {
	// Get group detail
	detail, err := r.GetGroupDetail(ctx, animeID, groupID)
	if err != nil {
		return nil, 0, err
	}

	// Build WHERE clause for filters
	whereSQL, args := r.buildReleasesWhere(animeID, groupID, filter)

	// Count total episodes matching filter
	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT ev.id)
		FROM episode_versions ev
		%s
	`, whereSQL)

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count group releases (%d,%d): %w", animeID, groupID, err)
	}

	// Build paginated query
	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (filter.Page - 1) * filter.PerPage

	listQuery := fmt.Sprintf(`
		SELECT
			ev.id,
			ev.episode_number,
			ev.title,
			ev.release_date
		FROM episode_versions ev
		%s
		ORDER BY ev.episode_number ASC, ev.id ASC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitPos, offsetPos)

	rows, err := r.db.Query(ctx, listQuery, append(args, filter.PerPage, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("query group releases (%d,%d): %w", animeID, groupID, err)
	}
	defer rows.Close()

	episodes := make([]models.EpisodeReleaseSummary, 0, filter.PerPage)
	for rows.Next() {
		var ep models.EpisodeReleaseSummary
		if err := rows.Scan(
			&ep.ID,
			&ep.EpisodeNumber,
			&ep.Title,
			&ep.ReleasedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan episode release row: %w", err)
		}

		// Set default values for fields not yet in database
		// TODO: These will come from episode_extras table once it exists
		ep.HasOP = false
		ep.HasED = false
		ep.KaraokeCount = 0
		ep.InsertCount = 0
		ep.ScreenshotCount = 0
		ep.ThumbnailURL = nil

		episodes = append(episodes, ep)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate group release rows: %w", err)
	}

	// Get other groups that worked on this anime
	otherGroups, err := r.getOtherGroups(ctx, animeID, groupID)
	if err != nil {
		return nil, 0, err
	}

	result := &models.GroupReleasesData{
		Group:       *detail,
		Episodes:    episodes,
		OtherGroups: otherGroups,
	}

	return result, total, nil
}

// buildReleasesWhere constructs the WHERE clause for releases query
func (r *GroupRepository) buildReleasesWhere(
	animeID int64,
	groupID int64,
	filter models.GroupReleasesFilter,
) (string, []any) {
	conditions := []string{
		"ev.anime_id = $1",
		"ev.fansub_group_id = $2",
	}
	args := []any{animeID, groupID}
	argPos := 3

	// Text search on episode title
	if filter.Q != "" {
		conditions = append(conditions, fmt.Sprintf("ev.title ILIKE $%d", argPos))
		args = append(args, "%"+filter.Q+"%")
		argPos++
	}

	// NOTE: has_op, has_ed, and has_karaoke filters require episode_extras table
	// which doesn't exist yet. These filters are ignored for now.
	// Once episode_extras is implemented, add joins like:
	// LEFT JOIN episode_extras ee ON ee.episode_version_id = ev.id
	// and filter conditions:
	// if filter.HasOP != nil {
	//     conditions = append(conditions, fmt.Sprintf("ee.has_op = $%d", argPos))
	//     args = append(args, *filter.HasOP)
	//     argPos++
	// }

	whereSQL := "WHERE " + strings.Join(conditions, " AND ")
	return whereSQL, args
}

// getOtherGroups retrieves other fansub groups that worked on this anime
func (r *GroupRepository) getOtherGroups(
	ctx context.Context,
	animeID int64,
	excludeGroupID int64,
) ([]models.FansubGroupSummary, error) {
	query := `
		SELECT
			fg.id,
			fg.slug,
			fg.name,
			fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND afg.fansub_group_id != $2
		ORDER BY afg.is_primary DESC, fg.name ASC
	`

	rows, err := r.db.Query(ctx, query, animeID, excludeGroupID)
	if err != nil {
		return nil, fmt.Errorf("query other groups for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	groups := make([]models.FansubGroupSummary, 0, 8)
	for rows.Next() {
		var group models.FansubGroupSummary
		if err := rows.Scan(&group.ID, &group.Slug, &group.Name, &group.LogoURL); err != nil {
			return nil, fmt.Errorf("scan other group row: %w", err)
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate other group rows: %w", err)
	}

	return groups, nil
}
