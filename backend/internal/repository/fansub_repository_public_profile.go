package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// GetPublicProfileBySlug returns the public profile payload for /fansubs/[slug].
//
// This uses a public-specific load path (getPublicGroupBase +
// attachPublicReleaseVersionsCount) instead of the shared GetGroupBySlug/
// hydrateFansubGroup path: the public page only ever reads
// ReleaseVersionsCount out of the five counts hydrateFansubGroup computes, and
// it needs exactly one fansub_group_links query, not two (hydrateFansubGroup's
// attachGroupLinks plus this function's own ListGroupLinks call). See
// 152-RESEARCH.md Pitfall 1: applyLegacyLinkProjection MUST still run after the
// single ListGroupLinks call below, or group.website_url/discord_url/irc_url go
// stale relative to fansub_group_links.
func (r *FansubRepository) GetPublicProfileBySlug(ctx context.Context, slug string) (*models.PublicFansubProfileResponse, error) {
	group, err := r.getPublicGroupBase(ctx, slug)
	if err != nil {
		return nil, err
	}

	if err := r.attachPublicReleaseVersionsCount(ctx, group); err != nil {
		return nil, err
	}

	stories, err := r.listPublicFansubStories(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	projects, err := r.listPublicFansubProjects(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	history, err := r.listPublicFansubHistory(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	media, err := r.listPublicFansubMedia(ctx, group.ID, group.LogoID, group.BannerID)
	if err != nil {
		return nil, err
	}

	links, err := r.ListGroupLinks(ctx, group.ID)
	if err != nil {
		return nil, err
	}
	group.Links = links
	applyLegacyLinkProjection(group)

	resp := &models.PublicFansubProfileResponse{
		Group:          *group,
		Stories:        stories,
		Projects:       projects,
		History:        history,
		Media:          media,
		CommunityLinks: links,
	}

	return resp, nil
}

// getPublicGroupBase loads the same base row as GetGroupBySlug but skips
// hydrateFansubGroup (which attaches five counts and a links query the public
// profile does not need). It leaves all four unused counts and Links at their
// zero values -- callers that need the full admin-hydrated group must keep
// using GetGroupBySlug/GetGroupByID instead.
//
// logo_url/banner_url prefer the group's own 'display' media_files variant
// (D-02) over the stored column when one exists, via two LEFT JOIN LATERALs
// keyed on the row's own logo_id/banner_id -- the same already-authorized FKs
// the stored URL already resolved from. SVG logos (no display row ever
// generated, per 173-04) and pre-backfill groups fall back to the unchanged
// stored column.
func (r *FansubRepository) getPublicGroupBase(ctx context.Context, slug string) (*models.FansubGroup, error) {
	query := `
		SELECT
			id, slug, name, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url, irc_url, country,
			created_at, updated_at,
			logo_display.path AS logo_display_path,
			banner_display.path AS banner_display_path
		FROM fansub_groups
		LEFT JOIN LATERAL (
			SELECT path FROM media_files
			WHERE media_id = fansub_groups.logo_id AND variant = 'display' AND status = 'ready'
			ORDER BY id ASC LIMIT 1
		) logo_display ON true
		LEFT JOIN LATERAL (
			SELECT path FROM media_files
			WHERE media_id = fansub_groups.banner_id AND variant = 'display' AND status = 'ready'
			ORDER BY id ASC LIMIT 1
		) banner_display ON true
		WHERE slug = $1
	`

	var item models.FansubGroup
	var logoDisplayPath, bannerDisplayPath *string
	if err := r.db.QueryRow(ctx, query, slug).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.LogoID,
		&item.BannerID,
		&item.LogoURL,
		&item.BannerURL,
		&item.FoundedYear,
		&item.DissolvedYear,
		&item.ClosedYear,
		&item.Status,
		&item.GroupType,
		&item.WebsiteURL,
		&item.DiscordURL,
		&item.IrcURL,
		&item.Country,
		&item.CreatedAt,
		&item.UpdatedAt,
		&logoDisplayPath,
		&bannerDisplayPath,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get fansub group %q: %w", slug, err)
	}

	if logoDisplayPath != nil {
		if resolved := publicMediaURLForPath(*logoDisplayPath, r.mediaStorageDir); resolved != nil {
			item.LogoURL = resolved
		}
	}
	if bannerDisplayPath != nil {
		if resolved := publicMediaURLForPath(*bannerDisplayPath, r.mediaStorageDir); resolved != nil {
			item.BannerURL = resolved
		}
	}

	return &item, nil
}

// attachPublicReleaseVersionsCount computes only ReleaseVersionsCount -- the
// single count field the public profile actually reads -- reusing the exact
// SQL attachGroupCounts uses for that field, via the same populateCountMap
// helper and single-element slice-wrap pattern hydrateFansubGroup uses.
func (r *FansubRepository) attachPublicReleaseVersionsCount(ctx context.Context, group *models.FansubGroup) error {
	if group == nil {
		return nil
	}

	items := []models.FansubGroup{*group}
	indexByID := map[int64]int{items[0].ID: 0}

	if err := r.populateCountMap(
		ctx,
		`
		SELECT group_id, COUNT(*)
		FROM (
			SELECT fansub_group_id AS group_id
			FROM release_version_groups
			WHERE fansub_group_id = ANY($1)
		) grouped
		GROUP BY group_id
		`,
		[]int64{items[0].ID},
		func(i int, count int) { items[i].ReleaseVersionsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load episode version counts: %w", err)
	}

	*group = items[0]

	return nil
}

func (r *FansubRepository) listPublicFansubStories(ctx context.Context, groupID int64) ([]models.PublicFansubStory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, body_html, body_text, COALESCE(updated_at, created_at)::text
		FROM fansub_group_notes
		WHERE fansub_group_id = $1
		  AND visibility = 'public'
		  AND status = 'published'
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, id ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("list public fansub stories for group %d: %w", groupID, err)
	}
	defer rows.Close()

	stories := make([]models.PublicFansubStory, 0)
	for rows.Next() {
		var story models.PublicFansubStory
		if err := rows.Scan(
			&story.ID,
			&story.Title,
			&story.BodyHTML,
			&story.BodyText,
			&story.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan public fansub story row: %w", err)
		}
		stories = append(stories, story)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public fansub stories for group %d: %w", groupID, err)
	}
	return stories, nil
}

func (r *FansubRepository) listPublicFansubProjects(ctx context.Context, groupID int64) ([]models.PublicFansubProject, error) {
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT
			a.id,
			%s AS anime_slug,
			a.title,
			a.type::text,
			a.status::text,
			a.year,
			a.cover_image,
			a.max_episodes,
			%s AS banner_url
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		%s
		WHERE afg.fansub_group_id = $1
		  AND a.status <> 'disabled'
		ORDER BY a.title ASC, a.id ASC
	`, publicAnimeSlugSQL("a"), publicProjectBannerSelectSQL, publicProjectBannerJoinSQL), groupID)
	if err != nil {
		return nil, fmt.Errorf("list public fansub projects for group %d: %w", groupID, err)
	}
	defer rows.Close()

	projects := make([]models.PublicFansubProject, 0)
	for rows.Next() {
		var project models.PublicFansubProject
		var bannerPath *string
		if err := rows.Scan(
			&project.ID,
			&project.AnimeSlug,
			&project.Title,
			&project.Type,
			&project.Status,
			&project.Year,
			&project.CoverImage,
			&project.MaxEpisodes,
			&bannerPath,
		); err != nil {
			return nil, fmt.Errorf("scan public fansub project row: %w", err)
		}
		if bannerPath != nil {
			project.BannerURL = publicMediaURLForPath(*bannerPath, r.mediaStorageDir)
		}
		projects = append(projects, project)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public fansub projects for group %d: %w", groupID, err)
	}
	return projects, nil
}

func publicAnimeSlugSQL(animeAlias string) string {
	return fmt.Sprintf(`COALESCE(
		NULLIF(BTRIM(%[1]s.slug), ''),
		NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(BTRIM(%[1]s.title), '''', '', 'g'), '[^[:alnum:]]+', '-', 'g'))), ''),
		CONCAT('anime-', %[1]s.id::text)
	)`, animeAlias)
}

func (r *FansubRepository) listPublicFansubHistory(ctx context.Context, groupID int64) ([]models.PublicFansubHistory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, year, event_type, title, note, status
		FROM fansub_group_history
		WHERE fansub_group_id = $1
		  AND status = 'confirmed'
		ORDER BY COALESCE(year, 9999), id ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("list public fansub history for group %d: %w", groupID, err)
	}
	defer rows.Close()

	history := make([]models.PublicFansubHistory, 0)
	for rows.Next() {
		var item models.PublicFansubHistory
		if err := rows.Scan(
			&item.ID,
			&item.Year,
			&item.EventType,
			&item.Title,
			&item.Note,
			&item.Status,
		); err != nil {
			return nil, fmt.Errorf("scan public fansub history row: %w", err)
		}
		history = append(history, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public fansub history for group %d: %w", groupID, err)
	}
	return history, nil
}

func (r *FansubRepository) listPublicFansubMedia(ctx context.Context, groupID int64, logoID *int64, bannerID *int64) ([]models.PublicFansubMediaItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ma.id,
			COALESCE(mt.name, ma.mime_type, 'group_media') AS media_type,
			ma.caption,
			ma.mime_type,
			COALESCE(mf_thumb.path, mf_orig.path, ma.file_path) AS thumbnail_path,
			COALESCE(mf_orig.path, mf_thumb.path, ma.file_path) AS original_path,
			COALESCE(mf_display.path, mf_orig.path, mf_thumb.path, ma.file_path) AS display_path,
			fgm.title,
			fgm.description,
			fgm.category
		FROM fansub_group_media fgm
		JOIN media_assets ma ON ma.id = fgm.media_id
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display' AND mf_display.status = 'ready'
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE fgm.group_id = $1
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		  AND fgm.deleted_at IS NULL
		  AND ($2::bigint IS NULL OR ma.id <> $2)
		  AND ($3::bigint IS NULL OR ma.id <> $3)
		ORDER BY fgm.sort_order ASC, ma.created_at ASC, ma.id ASC
	`, groupID, logoID, bannerID)
	if err != nil {
		return nil, fmt.Errorf("list public fansub media for group %d: %w", groupID, err)
	}
	defer rows.Close()

	media := make([]models.PublicFansubMediaItem, 0)
	for rows.Next() {
		var (
			item          models.PublicFansubMediaItem
			thumbnailPath *string
			originalPath  *string
			displayPath   *string
		)
		if err := rows.Scan(
			&item.ID,
			&item.MediaType,
			&item.Caption,
			&item.MimeType,
			&thumbnailPath,
			&originalPath,
			&displayPath,
			&item.Title,
			&item.Description,
			&item.Category,
		); err != nil {
			return nil, fmt.Errorf("scan public fansub media row: %w", err)
		}
		if thumbnailPath != nil {
			item.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}
		if originalPath != nil {
			item.OriginalURL = publicMediaURLForPath(*originalPath, r.mediaStorageDir)
		}
		if displayPath != nil {
			item.DisplayURL = publicMediaURLForPath(*displayPath, r.mediaStorageDir)
		}
		media = append(media, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public fansub media for group %d: %w", groupID, err)
	}
	return media, nil
}
