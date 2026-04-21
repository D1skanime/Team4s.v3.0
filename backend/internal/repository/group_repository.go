package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
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
		SELECT COUNT(DISTINCT e.id)
		FROM release_version_groups rvg
		JOIN release_versions rev ON rev.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		WHERE e.anime_id = $1
		  AND COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id) = $2
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
		SELECT COUNT(DISTINCT rev.id)
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
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
			rev.id,
			e.id AS episode_id,
			CAST(e.episode_number AS INTEGER) AS episode_number,
			COALESCE(rev.title, e.title) AS title,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			0::BIGINT AS screenshot_count,
			NULL::TEXT AS thumbnail_url
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id AND e.episode_number ~ '^[0-9]+$'
		JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
		LEFT JOIN LATERAL (
			SELECT 1
		) AS release_assets_deferred ON TRUE
		%s
		ORDER BY CAST(e.episode_number AS INTEGER) ASC, rev.id ASC
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
		var episodeID sql.NullInt64
		var screenshotCount int64
		if err := rows.Scan(
			&ep.ID,
			&episodeID,
			&ep.EpisodeNumber,
			&ep.Title,
			&ep.ReleasedAt,
			&screenshotCount,
			&ep.ThumbnailURL,
		); err != nil {
			return nil, 0, fmt.Errorf("scan episode release row: %w", err)
		}
		if episodeID.Valid {
			id := episodeID.Int64
			ep.EpisodeID = &id
		}

		// Set default values for fields not yet in database
		// TODO: These will come from episode_extras table once it exists
		ep.HasOP = false
		ep.HasED = false
		ep.KaraokeCount = 0
		ep.InsertCount = 0
		ep.ScreenshotCount = int32(screenshotCount)

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
		"e.anime_id = $1",
		"COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id) = $2",
	}
	args := []any{animeID, groupID}
	argPos := 3

	// Text search on episode title
	if filter.Q != "" {
		trimmedQuery := strings.TrimSpace(filter.Q)
		if trimmedQuery != "" {
			searchConditions := []string{fmt.Sprintf("COALESCE(rev.title, e.title, '') ILIKE $%d", argPos)}
			args = append(args, "%"+trimmedQuery+"%")
			argPos++

			if episodeNumber, err := strconv.Atoi(trimmedQuery); err == nil && episodeNumber > 0 {
				searchConditions = append(searchConditions, fmt.Sprintf("CAST(e.episode_number AS INTEGER) = $%d", argPos))
				args = append(args, episodeNumber)
				argPos++
			}

			conditions = append(conditions, "("+strings.Join(searchConditions, " OR ")+")")
		}
	}

	if filter.HasOP != nil {
		conditions = append(conditions, buildRegexFilterCondition("COALESCE(rev.title, e.title, '')", opTitleRegex, argPos, *filter.HasOP))
		args = append(args, opTitleRegex)
		argPos++
	}

	if filter.HasED != nil {
		conditions = append(conditions, buildRegexFilterCondition("COALESCE(rev.title, e.title, '')", edTitleRegex, argPos, *filter.HasED))
		args = append(args, edTitleRegex)
		argPos++
	}

	if filter.HasKaraoke != nil {
		conditions = append(conditions, buildRegexFilterCondition("COALESCE(rev.title, e.title, '')", karaokeTitleRegex, argPos, *filter.HasKaraoke))
		args = append(args, karaokeTitleRegex)
		argPos++
	}

	whereSQL := "WHERE " + strings.Join(conditions, " AND ")
	return whereSQL, args
}

const (
	opTitleRegex      = `(^|[^a-z0-9])(op|opening)([^a-z0-9]|$)`
	edTitleRegex      = `(^|[^a-z0-9])(ed|ending)([^a-z0-9]|$)`
	karaokeTitleRegex = `(^|[^a-z0-9])(karaoke|kfx|k-fx|kara)([^a-z0-9]|$)`
)

func buildRegexFilterCondition(field string, pattern string, position int, expected bool) string {
	condition := fmt.Sprintf("COALESCE(%s, '') ~* $%d", field, position)
	if expected {
		return condition
	}
	return "NOT (" + condition + ")"
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
