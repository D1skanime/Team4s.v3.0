package repository

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"

	"team4s.v3/backend/internal/models"
)

// PublicEpisodeOptions belongs to the opt-in public projection only.
type PublicEpisodeOptions struct {
	Limit  int
	Cursor string
	// Fansub is the raw, unresolved fansub group slug from the request ("" = "Alle").
	// It is the cursor-scope identity (D-06): comparing raw slugs, not resolved
	// group ids, lets Validate/normalized reject a cross-filter cursor with zero
	// DB round trips, before the caller ever resolves the slug to a group id.
	Fansub string
	// GroupID is the resolved fansub_group_id bound as SQL $6 (nil = "Alle").
	// Callers resolve Fansub -> GroupID themselves (after Validate succeeds) and
	// set this field; it plays no role in cursor-scope validation.
	GroupID *int64
}
type publicEpisodeCursor struct {
	Version       int    `json:"v"`
	AnimeID       int64  `json:"a"`
	Fansub        string `json:"g"` // "" = "Alle"; raw slug identity, not a resolved group id (see PublicEpisodeOptions.Fansub)
	EpisodeNumber int32  `json:"n"`
	EpisodeID     int64  `json:"e"`
	VariantID     int64  `json:"i"`
}

func (o PublicEpisodeOptions) Validate(animeID int64) error {
	_, _, err := o.normalized(animeID)
	return err
}

func (o PublicEpisodeOptions) normalized(animeID int64) (int, publicEpisodeCursor, error) {
	limit := o.Limit
	if limit == 0 {
		limit = DefaultCursorPageLimit
	}
	if animeID <= 0 || limit < 1 || limit > MaxCursorPageLimit {
		return 0, publicEpisodeCursor{}, ErrValidation
	}
	var cursor publicEpisodeCursor
	if o.Cursor == "" {
		return limit, cursor, nil
	}
	if len(o.Cursor) > 512 {
		return 0, cursor, ErrValidation
	}
	raw, err := base64.RawURLEncoding.Strict().DecodeString(o.Cursor)
	if err != nil {
		return 0, cursor, ErrValidation
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&cursor) != nil || decoder.Decode(new(any)) != io.EOF || cursor.Version != 2 || cursor.AnimeID != animeID || cursor.Fansub != o.Fansub || cursor.EpisodeNumber <= 0 || cursor.EpisodeID <= 0 || cursor.VariantID < 0 {
		return 0, cursor, ErrValidation
	}
	// Canonical serialization also rejects missing/duplicate fields and alternate encodings.
	canonical, _ := json.Marshal(cursor)
	if !bytes.Equal(raw, canonical) {
		return 0, cursor, ErrValidation
	}
	return limit, cursor, nil
}

// Window metadata is computed before seeking/limiting. The lateral variant relation
// yields one neutral row when an episode has no variants, including mixed inventory.
// Group aggregation happens after LIMIT and cannot multiply atomic page rows.
const publicEpisodeQuery = `
WITH inventory AS (
 SELECT e.id AS episode_id, e.episode_number::INTEGER AS episode_number, e.title AS episode_title,
  COALESCE(eft.name,'unknown') AS filler_type, COALESCE(et.name,'episode') AS episode_type,
  v.id AS variant_id, v.release_version_id, v.title, v.release_version,
  v.video_quality, v.subtitle_type, v.release_date, v.container, v.video_codec,
  COUNT(v.id) OVER (PARTITION BY e.id)::INTEGER AS version_count,
  MIN(v.id) OVER (PARTITION BY e.id) AS default_version_id
 FROM episodes e
 LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id
 LEFT JOIN episode_types et ON et.id = e.episode_type_id
 JOIN LATERAL (
  SELECT rv.id, rev.id AS release_version_id, COALESCE(rev.title,e.title) AS title,
   NULLIF(BTRIM(rev.version),'') AS release_version,
   COALESCE(rv.video_quality,rv.resolution) AS video_quality, rv.subtitle_type,
   rv.container, rv.video_codec,
   COALESCE(rev.release_date,fr.release_date) AS release_date
  FROM fansub_releases fr
  JOIN release_versions rev ON rev.release_id=fr.id
  JOIN release_variants rv ON rv.release_version_id=rev.id
  WHERE fr.episode_id=e.id
   AND EXISTS (
    SELECT 1 FROM release_version_groups rvg
    WHERE rvg.release_version_id = rev.id
     AND ($6::BIGINT IS NULL OR rvg.fansub_group_id = $6::BIGINT)
   )
 ) v ON TRUE
 WHERE e.anime_id=$1 AND CASE WHEN e.episode_number ~ '^[0-9]+$'
  THEN e.episode_number::NUMERIC BETWEEN 1 AND 2147483647 ELSE FALSE END
), total AS (
 SELECT COUNT(DISTINCT episode_id) AS n FROM inventory
), page AS (
 SELECT * FROM inventory
 WHERE (episode_number,episode_id,COALESCE(variant_id,0)) > ($2::INTEGER,$3::BIGINT,$4::BIGINT)
 ORDER BY episode_number,episode_id,COALESCE(variant_id,0)
 LIMIT $5
)
SELECT p.episode_id,p.episode_number,p.episode_title,p.filler_type,p.episode_type,p.version_count,p.default_version_id,
 p.variant_id,p.release_version_id,p.title,p.release_version,p.video_quality,p.subtitle_type,p.release_date,
 p.container,p.video_codec,
 COALESCE(g.groups,'[]'::json), total.n
FROM page p
LEFT JOIN LATERAL (
 SELECT json_agg(json_build_object('id',fg.id,'slug',fg.slug,'name',fg.name,
   'logo_url',NULLIF(TRIM(COALESCE(logo.file_path, fg.logo_url)), ''))
  ORDER BY fg.name,fg.id) AS groups
 FROM release_version_groups rvg JOIN fansub_groups fg ON fg.id=rvg.fansub_group_id
 LEFT JOIN media_assets logo ON logo.id=fg.logo_id
 WHERE rvg.release_version_id=p.release_version_id
) g ON TRUE
CROSS JOIN total
ORDER BY p.episode_number,p.episode_id,COALESCE(p.variant_id,0)`

type publicEpisodeRow struct {
	episode          models.PublicGroupedEpisode
	variant          models.PublicEpisodeVersion
	variantID        *int64
	releaseVersionID *int64
	episodeCount     int64
}

func (r *EpisodeVersionRepository) ListPublicGroupedByAnimeID(ctx context.Context, animeID int64, options PublicEpisodeOptions) (*models.PublicGroupedEpisodesData, error) {
	limit, cursor, err := options.normalized(animeID)
	if err != nil {
		return nil, err
	}
	exists, err := NewAnimeRepository(r.db).ExistsVisible(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}
	rows, err := r.db.Query(ctx, publicEpisodeQuery, animeID, cursor.EpisodeNumber, cursor.EpisodeID, cursor.VariantID, limit+1, options.GroupID)
	if err != nil {
		return nil, fmt.Errorf("query public episodes anime=%d: %w", animeID, err)
	}
	defer rows.Close()
	items := make([]publicEpisodeRow, 0, limit+1)
	for rows.Next() {
		var item publicEpisodeRow
		var groups []byte
		e, v := &item.episode, &item.variant
		if err := rows.Scan(&e.EpisodeID, &e.EpisodeNumber, &e.EpisodeTitle, &e.FillerType, &e.EpisodeType, &e.VersionCount, &e.DefaultVersionID,
			&item.variantID, &item.releaseVersionID, &v.Title, &v.ReleaseVersion, &v.VideoQuality, &v.SubtitleType, &v.ReleaseDate,
			&v.Container, &v.VideoCodec, &groups, &item.episodeCount); err != nil {
			return nil, fmt.Errorf("scan public episode: %w", err)
		}
		if item.variantID != nil {
			v.ID = *item.variantID
			v.VariantID = *item.variantID
			v.ReleaseVersionID = *item.releaseVersionID
			v.AnimeID = animeID
			v.EpisodeNumber = e.EpisodeNumber
			if err := json.Unmarshal(groups, &v.FansubGroups); err != nil {
				return nil, fmt.Errorf("decode public episode groups: %w", err)
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read public episodes: %w", err)
	}
	page, next, more := trimCursorPage(items, limit, func(item publicEpisodeRow) string {
		c := publicEpisodeCursor{Version: 2, AnimeID: animeID, Fansub: options.Fansub, EpisodeNumber: item.episode.EpisodeNumber, EpisodeID: item.episode.EpisodeID, VariantID: item.variant.ID}
		raw, _ := json.Marshal(c)
		return base64.RawURLEncoding.EncodeToString(raw)
	})
	var episodeCount int64
	if len(items) > 0 {
		episodeCount = items[0].episodeCount
	}
	releaseVersionIDs := make([]int64, 0, len(page))
	seenReleaseVersionID := make(map[int64]bool, len(page))
	for _, item := range page {
		if item.releaseVersionID != nil && !seenReleaseVersionID[*item.releaseVersionID] {
			seenReleaseVersionID[*item.releaseVersionID] = true
			releaseVersionIDs = append(releaseVersionIDs, *item.releaseVersionID)
		}
	}
	flags, err := resolvePublicEpisodeFlags(ctx, r.db, releaseVersionIDs)
	if err != nil {
		return nil, fmt.Errorf("resolve public episode flags anime=%d: %w", animeID, err)
	}
	result := &models.PublicGroupedEpisodesData{AnimeID: animeID, Episodes: make([]models.PublicGroupedEpisode, 0), EpisodeCount: episodeCount, Pagination: models.PublicEpisodePagination{HasMore: more, NextCursor: next, RowLimit: limit}}
	for _, item := range page {
		if len(result.Episodes) == 0 || result.Episodes[len(result.Episodes)-1].EpisodeID != item.episode.EpisodeID {
			item.episode.Versions = make([]models.PublicEpisodeVersion, 0)
			result.Episodes = append(result.Episodes, item.episode)
		}
		if item.variantID != nil {
			if item.releaseVersionID != nil {
				if f, ok := flags[*item.releaseVersionID]; ok {
					item.variant.HasImages = f.HasImages
					item.variant.HasNotes = f.HasNotes
					item.variant.HasKaraoke = f.HasKaraoke
				}
			}
			e := &result.Episodes[len(result.Episodes)-1]
			e.Versions = append(e.Versions, item.variant)
		}
	}
	return result, nil
}
