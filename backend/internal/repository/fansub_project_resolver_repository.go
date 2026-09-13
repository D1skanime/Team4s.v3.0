package repository

// FansubProjectResolverRepository (P155-01, P155-02) is split out of
// fansub_repository.go because that file is already 2462 lines -- 5x the
// CLAUDE.md 450-line ceiling -- and belongs fachlich in the fansub-slugs
// neighborhood per 155-CONTEXT.md. It resolves `groupSlug + animeSlug` to
// the narrow numeric identity (groupID/animeID/canonical anime_slug) a
// pretty route needs, WITHOUT loading the full public fansub profile
// (GetPublicProfileBySlug's fixed ~8-query set), and lists a bounded,
// unsorted sibling-project navigation set for the same group. Both queries
// reuse fansub_repository.go's publicAnimeSlugSQL helper and its
// `a.status <> 'disabled'` predicate rather than re-deriving them.

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FansubProjectResolverRepository resolves fansub-slugs project identity and
// a narrow sibling-project navigation list.
type FansubProjectResolverRepository struct {
	db              *pgxpool.Pool
	mediaStorageDir string
}

// NewFansubProjectResolverRepository constructs a FansubProjectResolverRepository.
func NewFansubProjectResolverRepository(db *pgxpool.Pool, mediaStorageDir ...string) *FansubProjectResolverRepository {
	storageDir := ""
	if len(mediaStorageDir) > 0 {
		storageDir = mediaStorageDir[0]
	}
	return &FansubProjectResolverRepository{db: db, mediaStorageDir: storageDir}
}

// ResolvedFansubProject is the narrow identity a pretty route needs to
// continue loading project detail -- deliberately NOT the full
// PublicFansubProject/PublicFansubProfileResponse shape.
type ResolvedFansubProject struct {
	GroupID    int64   `json:"group_id"`
	AnimeID    int64   `json:"anime_id"`
	AnimeSlug  string  `json:"anime_slug"`
	BannerURL  *string `json:"banner_url"`
	CoverImage *string `json:"cover_image"`
}

// ProjectNavigationItem is the narrow sibling-project projection consumed by
// the frontend's existing buildFansubProjectNavigation comparator, which
// only ever reads .id, .title, .anime_slug (fansubProjectNavigation.ts).
type ProjectNavigationItem struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	AnimeSlug string `json:"anime_slug"`
}

// ResolveProject resolves groupSlug+animeSlug to the project's numeric
// identity with a single parameterized query, joining fansub_groups to
// anime_fansub_groups to anime and filtering on the same anime-slug
// expression and non-disabled predicate listPublicFansubProjects uses. An
// unknown groupSlug and a known groupSlug with an unknown animeSlug both
// collapse to the same ErrNotFound -- this layer intentionally does not
// distinguish the two negative branches (T-155-01).
func (r *FansubProjectResolverRepository) ResolveProject(ctx context.Context, groupSlug string, animeSlug string) (*ResolvedFansubProject, error) {
	query := fmt.Sprintf(`
		SELECT afg.fansub_group_id, a.id, %s AS anime_slug, a.cover_image, %s AS banner_url
		FROM fansub_groups fg
		JOIN anime_fansub_groups afg ON afg.fansub_group_id = fg.id
		JOIN anime a ON a.id = afg.anime_id
		%s
		WHERE fg.slug = $1
		  AND %s = $2
		  AND a.status <> 'disabled'
	`, publicAnimeSlugSQL("a"), publicProjectBannerSelectSQL, publicProjectBannerJoinSQL, publicAnimeSlugSQL("a"))

	var resolved ResolvedFansubProject
	var bannerPath *string
	err := r.db.QueryRow(ctx, query, groupSlug, animeSlug).Scan(
		&resolved.GroupID,
		&resolved.AnimeID,
		&resolved.AnimeSlug,
		&resolved.CoverImage,
		&bannerPath,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("resolve fansub project (group=%q, anime=%q): %w", groupSlug, animeSlug, err)
	}

	if bannerPath != nil {
		resolved.BannerURL = publicMediaURLForPath(*bannerPath, r.mediaStorageDir)
	}
	return &resolved, nil
}

// ListProjectNavigationProjects lists a bounded, unordered sibling-project
// set for a resolved group -- the same fansub_group_id/status predicate
// listPublicFansubProjects uses, but selecting only id/title/anime_slug.
// The frontend's buildFansubProjectNavigation re-sorts with its own German
// localeCompare comparator; this method intentionally does not ORDER BY
// (locked decision: no port of that sort into SQL). Always returns a
// non-nil (possibly empty) slice.
func (r *FansubProjectResolverRepository) ListProjectNavigationProjects(ctx context.Context, groupID int64) ([]ProjectNavigationItem, error) {
	query := fmt.Sprintf(`
		SELECT a.id, a.title, %s AS anime_slug
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		WHERE afg.fansub_group_id = $1
		  AND a.status <> 'disabled'
	`, publicAnimeSlugSQL("a"))

	rows, err := r.db.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("list project navigation projects for group %d: %w", groupID, err)
	}
	defer rows.Close()

	items := make([]ProjectNavigationItem, 0)
	for rows.Next() {
		var item ProjectNavigationItem
		if err := rows.Scan(&item.ID, &item.Title, &item.AnimeSlug); err != nil {
			return nil, fmt.Errorf("scan project navigation item for group %d: %w", groupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate project navigation items for group %d: %w", groupID, err)
	}

	return items, nil
}
