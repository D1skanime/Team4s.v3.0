package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DashboardStats contains overview statistics for the admin dashboard
type DashboardStats struct {
	// Totals
	TotalUsers    int64 `json:"total_users"`
	TotalAnime    int64 `json:"total_anime"`
	TotalEpisodes int64 `json:"total_episodes"`
	TotalComments int64 `json:"total_comments"`
	TotalRatings  int64 `json:"total_ratings"`

	// Recent activity (last 7 days)
	NewUsers    int64 `json:"new_users"`
	NewComments int64 `json:"new_comments"`
	NewRatings  int64 `json:"new_ratings"`

	// Engagement
	ActiveUsers int64 `json:"active_users"` // Users with activity in last 30 days

	// Content breakdown
	AnimeByStatus AnimeStatusCounts `json:"anime_by_status"`
}

// AnimeStatusCounts contains counts by anime status
type AnimeStatusCounts struct {
	Airing    int64 `json:"airing"`
	Completed int64 `json:"completed"`
	Upcoming  int64 `json:"upcoming"`
	Unknown   int64 `json:"unknown"`
}

// RecentActivity represents a recent activity item
type RecentActivity struct {
	Type      string    `json:"type"`       // "comment", "rating", "user"
	UserID    int64     `json:"user_id"`
	Username  string    `json:"username"`
	AnimeID   *int64    `json:"anime_id,omitempty"`
	AnimeTitle *string  `json:"anime_title,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// AdminRepository handles admin-related database queries
type AdminRepository struct {
	db *pgxpool.Pool
}

// NewAdminRepository creates a new admin repository
func NewAdminRepository(db *pgxpool.Pool) *AdminRepository {
	return &AdminRepository{db: db}
}

// GetDashboardStats returns dashboard statistics
func (r *AdminRepository) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Get total counts in parallel using a single query for efficiency
	countQuery := `
		SELECT
			(SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
			(SELECT COUNT(*) FROM anime) as total_anime,
			(SELECT COUNT(*) FROM episodes) as total_episodes,
			(SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL) as total_comments,
			(SELECT COUNT(*) FROM ratings) as total_ratings
	`
	err := r.db.QueryRow(ctx, countQuery).Scan(
		&stats.TotalUsers,
		&stats.TotalAnime,
		&stats.TotalEpisodes,
		&stats.TotalComments,
		&stats.TotalRatings,
	)
	if err != nil {
		return nil, fmt.Errorf("get total counts: %w", err)
	}

	// Get recent activity (last 7 days)
	recentQuery := `
		SELECT
			(SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users,
			(SELECT COUNT(*) FROM comments WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL) as new_comments,
			(SELECT COUNT(*) FROM ratings WHERE created_at > NOW() - INTERVAL '7 days') as new_ratings
	`
	err = r.db.QueryRow(ctx, recentQuery).Scan(
		&stats.NewUsers,
		&stats.NewComments,
		&stats.NewRatings,
	)
	if err != nil {
		return nil, fmt.Errorf("get recent activity: %w", err)
	}

	// Get active users (users with any activity in last 30 days)
	activeQuery := `
		SELECT COUNT(DISTINCT user_id) FROM (
			SELECT user_id FROM comments WHERE created_at > NOW() - INTERVAL '30 days'
			UNION
			SELECT user_id FROM ratings WHERE created_at > NOW() - INTERVAL '30 days'
			UNION
			SELECT user_id FROM watchlist WHERE updated_at > NOW() - INTERVAL '30 days'
		) active
	`
	err = r.db.QueryRow(ctx, activeQuery).Scan(&stats.ActiveUsers)
	if err != nil {
		return nil, fmt.Errorf("get active users: %w", err)
	}

	// Get anime by status
	statusQuery := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'airing') as airing,
			COUNT(*) FILTER (WHERE status = 'completed') as completed,
			COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
			COUNT(*) FILTER (WHERE status NOT IN ('airing', 'completed', 'upcoming') OR status IS NULL) as unknown
		FROM anime
	`
	err = r.db.QueryRow(ctx, statusQuery).Scan(
		&stats.AnimeByStatus.Airing,
		&stats.AnimeByStatus.Completed,
		&stats.AnimeByStatus.Upcoming,
		&stats.AnimeByStatus.Unknown,
	)
	if err != nil {
		return nil, fmt.Errorf("get anime by status: %w", err)
	}

	return stats, nil
}

// GetRecentActivity returns recent activity items
func (r *AdminRepository) GetRecentActivity(ctx context.Context, limit int) ([]RecentActivity, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	query := `
		SELECT type, user_id, username, anime_id, anime_title, created_at FROM (
			-- Recent comments
			SELECT
				'comment' as type,
				c.user_id,
				u.username,
				c.anime_id,
				a.title as anime_title,
				c.created_at
			FROM comments c
			JOIN users u ON u.id = c.user_id
			JOIN anime a ON a.id = c.anime_id
			WHERE c.deleted_at IS NULL
			ORDER BY c.created_at DESC
			LIMIT $1

			UNION ALL

			-- Recent ratings
			SELECT
				'rating' as type,
				r.user_id,
				u.username,
				r.anime_id,
				a.title as anime_title,
				r.created_at
			FROM ratings r
			JOIN users u ON u.id = r.user_id
			JOIN anime a ON a.id = r.anime_id
			ORDER BY r.created_at DESC
			LIMIT $1

			UNION ALL

			-- Recent users
			SELECT
				'user' as type,
				u.id as user_id,
				u.username,
				NULL::bigint as anime_id,
				NULL::text as anime_title,
				u.created_at
			FROM users u
			ORDER BY u.created_at DESC
			LIMIT $1
		) combined
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("get recent activity: %w", err)
	}
	defer rows.Close()

	var activities []RecentActivity
	for rows.Next() {
		var a RecentActivity
		err := rows.Scan(&a.Type, &a.UserID, &a.Username, &a.AnimeID, &a.AnimeTitle, &a.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan activity: %w", err)
		}
		activities = append(activities, a)
	}

	if activities == nil {
		activities = []RecentActivity{}
	}

	return activities, nil
}
