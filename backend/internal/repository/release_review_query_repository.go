package repository

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type releaseReviewQueryDB interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type ReleaseReviewQueueItem struct {
	ID                   string             `json:"id"`
	SourceRevision       int64              `json:"source_revision"`
	ReviewKind           ReviewKind         `json:"type"`
	Category             string             `json:"category,omitempty"`
	Status               ReleaseReviewState `json:"status"`
	FansubGroupID        int64              `json:"fansub_group_id"`
	AnimeID              int64              `json:"anime_id"`
	AnimeTitle           string             `json:"anime_title"`
	EpisodeID            int64              `json:"episode_id"`
	EpisodeNumber        string             `json:"episode_number"`
	ReleaseID            int64              `json:"release_id"`
	ReleaseVersionID     int64              `json:"release_version_id"`
	ReleaseVersion       string             `json:"release_version"`
	SubmitterAppUserID   int64              `json:"submitter_app_user_id"`
	SubmitterMemberID    int64              `json:"submitter_member_id"`
	SubmitterDisplayName string             `json:"submitter_display_name"`
	SubmittedAt          time.Time          `json:"submitted_at"`
	LastActivityAt       time.Time          `json:"last_activity_at"`
	DecidedAt            *time.Time         `json:"decided_at,omitempty"`
}

type ReleaseReviewQueuePage struct {
	Items      []ReleaseReviewQueueItem `json:"items"`
	NextCursor string                   `json:"next_cursor,omitempty"`
}

type ReleaseReviewCategoryCounts struct {
	Screenshot         int64 `json:"screenshot"`
	TypesettingKaraoke int64 `json:"typesetting_karaoke"`
	FunOuttake         int64 `json:"fun_outtake"`
	Other              int64 `json:"other"`
}

type ReleaseReviewQueueCounts struct {
	Text         int64                       `json:"text"`
	Image        int64                       `json:"image"`
	Contribution int64                       `json:"contribution"`
	Categories   ReleaseReviewCategoryCounts `json:"image_categories"`
	// AllowedTypes echoes the request's already-resolved AllowedKinds (set by the
	// handler, never computed here) so the frontend has an honest, capability-derived
	// signal distinct from a zero count (D10, Plan 141-02).
	AllowedTypes []string `json:"allowed_types"`
}

type ReleaseReviewTextContent struct {
	Title    string `json:"title,omitempty"`
	BodyHTML string `json:"body_html"`
}

type ReleaseReviewImageContent struct {
	Caption      string `json:"caption,omitempty"`
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
	OriginalURL  string `json:"original_url"`
}

type ReleaseReviewDetail struct {
	ReleaseReviewQueueItem
	Text           *ReleaseReviewTextContent  `json:"text,omitempty"`
	Image          *ReleaseReviewImageContent `json:"image,omitempty"`
	CanEditRelease bool                       `json:"can_edit_release"`
}

type ReleaseReviewQueryRepository struct {
	db releaseReviewQueryDB
}

func NewReleaseReviewQueryRepository(db releaseReviewQueryDB) *ReleaseReviewQueryRepository {
	return &ReleaseReviewQueryRepository{db: db}
}

func (r *ReleaseReviewQueryRepository) List(
	ctx context.Context,
	options ReleaseReviewQueueOptions,
) (*ReleaseReviewQueuePage, error) {
	if r == nil || r.db == nil || ValidateReleaseReviewQueueOptions(options) != nil {
		return nil, ErrValidation
	}
	options.Scope = normalizeReleaseReviewScope(options.Scope)
	options.Limit = NormalizeReleaseReviewQueueLimit(options.Limit)
	where, args, err := releaseReviewQueuePredicates(options, true)
	if err != nil {
		return nil, err
	}
	args = append(args, options.Limit+1)
	rows, err := r.db.Query(ctx, releaseReviewQueueBaseSQL+`
		SELECT `+releaseReviewQueueColumns+`
		FROM review_sources source
		WHERE `+strings.Join(where, " AND ")+`
		ORDER BY source.submitted_at DESC, source.source_type DESC, source.source_id DESC
		LIMIT $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, fmt.Errorf("list release review queue: %w", err)
	}
	defer rows.Close()

	type queued struct {
		item ReleaseReviewQueueItem
		key  ReleaseReviewSortKey
	}
	found := make([]queued, 0, options.Limit+1)
	for rows.Next() {
		var row queued
		if err := scanReleaseReviewQueueItem(rows, &row.item, &row.key); err != nil {
			return nil, fmt.Errorf("scan release review queue: %w", err)
		}
		found = append(found, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release review queue: %w", err)
	}
	page := &ReleaseReviewQueuePage{Items: make([]ReleaseReviewQueueItem, 0, min(len(found), options.Limit))}
	for index, row := range found {
		if index == options.Limit {
			cursor, encodeErr := EncodeReleaseReviewQueueCursor(options.Scope, found[index-1].key)
			if encodeErr != nil {
				return nil, encodeErr
			}
			page.NextCursor = cursor
			break
		}
		page.Items = append(page.Items, row.item)
	}
	return page, nil
}

func (r *ReleaseReviewQueryRepository) Counts(
	ctx context.Context,
	options ReleaseReviewQueueOptions,
) (*ReleaseReviewQueueCounts, error) {
	if r == nil || r.db == nil || ValidateReleaseReviewQueueOptions(options) != nil {
		return nil, ErrValidation
	}
	options.Scope = normalizeReleaseReviewScope(options.Scope)
	options.Scope.ReviewKind, options.Scope.Category = "", ""
	options.Cursor = ""
	where, args, err := releaseReviewQueuePredicates(options, false)
	if err != nil {
		return nil, err
	}
	result := ReleaseReviewQueueCounts{AllowedTypes: []string{}}
	err = r.db.QueryRow(ctx, releaseReviewQueueBaseSQL+`
		SELECT
			COUNT(*) FILTER (WHERE review_kind = 'text'),
			COUNT(*) FILTER (WHERE review_kind = 'image'),
			0,
			COUNT(*) FILTER (WHERE category = 'screenshot'),
			COUNT(*) FILTER (WHERE category = 'typesetting_karaoke'),
			COUNT(*) FILTER (WHERE category = 'fun_outtake'),
			COUNT(*) FILTER (WHERE category = 'other')
		FROM review_sources source
		WHERE `+strings.Join(where, " AND "), args...).Scan(
		&result.Text, &result.Image, &result.Contribution,
		&result.Categories.Screenshot, &result.Categories.TypesettingKaraoke,
		&result.Categories.FunOuttake, &result.Categories.Other,
	)
	if err != nil {
		return nil, fmt.Errorf("count release review queue: %w", err)
	}
	return &result, nil
}

func (r *ReleaseReviewQueryRepository) Detail(
	ctx context.Context,
	fansubGroupID int64,
	reviewID string,
	allowedKinds []string,
	actorAppUserID int64,
	actorMemberIDs []int64,
) (*ReleaseReviewDetail, error) {
	sourceType, sourceID, err := DecodeReleaseReviewID(reviewID)
	if err != nil || fansubGroupID <= 0 || len(allowedKinds) == 0 {
		return nil, ErrValidation
	}
	found, reviewKind, submitterAppUserID, submitterMemberID, err := releaseReviewExistenceAndIdentity(
		ctx, r.db, fansubGroupID, sourceType, sourceID,
	)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, ErrNotFound
	}
	if !containsReleaseReviewKind(allowedKinds, reviewKind) ||
		submitterAppUserID == actorAppUserID ||
		containsReleaseReviewMemberID(actorMemberIDs, submitterMemberID) {
		return nil, ErrForbidden
	}
	var detail ReleaseReviewDetail
	var key ReleaseReviewSortKey
	var noteTitle, noteHTML, caption, thumbPath, originalPath *string
	targets := releaseReviewQueueScanTargets(&detail.ReleaseReviewQueueItem, &key)
	targets = append(targets, &noteTitle, &noteHTML, &caption, &thumbPath, &originalPath)
	err = r.db.QueryRow(ctx, releaseReviewQueueBaseSQL+`
		SELECT `+releaseReviewQueueColumns+`,
		       source.note_title, source.note_html, source.caption,
		       source.thumbnail_path, source.original_path
		FROM review_sources source
		WHERE source.fansub_group_id = $1
		  AND source.source_type = $2
		  AND source.source_id = $3
		  AND source.review_kind = ANY($4::text[])
	`, fansubGroupID, sourceType, sourceID, allowedKinds).Scan(targets...)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get release review detail: %w", err)
	}
	detail.SubmittedAt = key.SubmittedAt
	detail.ID, err = EncodeReleaseReviewID(key.SourceType, key.SourceID)
	if err != nil {
		return nil, err
	}
	if detail.ReviewKind == ReviewKindText {
		detail.Text = &ReleaseReviewTextContent{Title: stringValue(noteTitle), BodyHTML: stringValue(noteHTML)}
	} else {
		detail.Image = &ReleaseReviewImageContent{
			Caption: stringValue(caption), ThumbnailURL: releaseReviewMediaURL(thumbPath),
			OriginalURL: releaseReviewMediaURL(originalPath),
		}
	}
	return &detail, nil
}

func (r *ReleaseReviewQueryRepository) Next(
	ctx context.Context,
	fansubGroupID int64,
	reviewID string,
	allowedKinds []string,
	actorAppUserID int64,
	actorMemberIDs []int64,
) (*ReleaseReviewQueueItem, error) {
	sourceType, sourceID, err := DecodeReleaseReviewID(reviewID)
	if err != nil {
		return nil, ErrValidation
	}
	found, reviewKind, submitterAppUserID, submitterMemberID, err := releaseReviewExistenceAndIdentity(
		ctx, r.db, fansubGroupID, sourceType, sourceID,
	)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, ErrNotFound
	}
	if !containsReleaseReviewKind(allowedKinds, reviewKind) ||
		submitterAppUserID == actorAppUserID ||
		containsReleaseReviewMemberID(actorMemberIDs, submitterMemberID) {
		return nil, ErrForbidden
	}
	var key ReleaseReviewSortKey
	err = r.db.QueryRow(ctx, releaseReviewQueueBaseSQL+`
		SELECT submitted_at, source_type, source_id
		FROM review_sources
		WHERE fansub_group_id = $1
		  AND source_type = $2
		  AND source_id = $3
		  AND review_kind = ANY($4::text[])
	`, fansubGroupID, sourceType, sourceID, allowedKinds).Scan(&key.SubmittedAt, &key.SourceType, &key.SourceID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load current release review sort key: %w", err)
	}
	scope := ReleaseReviewQueueScope{FansubGroupID: fansubGroupID, View: ReleaseReviewQueueViewOpen}
	cursor, err := EncodeReleaseReviewQueueCursor(scope, key)
	if err != nil {
		return nil, err
	}
	// List's own two-signal self-exclusion predicate (Plan 141-02) is the only thing that
	// can guarantee the resolved "next" item is never the actor's own submission (RQUE-02/
	// D05) -- ActorAppUserID/ActorMemberIDs must flow through, not just be checked against
	// the CURRENT item above.
	page, err := r.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKinds, Cursor: cursor, Limit: 1,
		ActorAppUserID: actorAppUserID, ActorMemberIDs: actorMemberIDs,
	})
	if err != nil || len(page.Items) == 0 {
		return nil, err
	}
	return &page.Items[0], nil
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func releaseReviewMediaURL(path *string) string {
	if path == nil || strings.TrimSpace(*path) == "" {
		return ""
	}
	normalized := filepath.ToSlash(strings.TrimSpace(*path))
	if index := strings.LastIndex(normalized, "/media/"); index >= 0 {
		return normalized[index:]
	}
	if strings.HasPrefix(normalized, "media/") {
		return "/" + normalized
	}
	return ""
}

func scanReleaseReviewQueueItem(
	scanner interface{ Scan(...any) error },
	item *ReleaseReviewQueueItem,
	key *ReleaseReviewSortKey,
) error {
	if err := scanner.Scan(releaseReviewQueueScanTargets(item, key)...); err != nil {
		return err
	}
	item.SubmittedAt = key.SubmittedAt
	id, err := EncodeReleaseReviewID(key.SourceType, key.SourceID)
	if err != nil {
		return err
	}
	item.ID = id
	return nil
}

func releaseReviewQueueScanTargets(item *ReleaseReviewQueueItem, key *ReleaseReviewSortKey) []any {
	return []any{
		&key.SourceType, &key.SourceID, &item.SourceRevision, &item.ReviewKind, &item.Category,
		&item.Status, &item.FansubGroupID, &item.AnimeID, &item.AnimeTitle,
		&item.EpisodeID, &item.EpisodeNumber, &item.ReleaseID, &item.ReleaseVersionID,
		&item.ReleaseVersion, &item.SubmitterAppUserID, &item.SubmitterMemberID,
		&item.SubmitterDisplayName, &key.SubmittedAt, &item.LastActivityAt, &item.DecidedAt,
	}
}

const releaseReviewQueueColumns = `
	source.source_type, source.source_id, source.source_revision, source.review_kind,
	COALESCE(source.category, ''), source.review_state, source.fansub_group_id,
	source.anime_id, source.anime_title, source.episode_id, source.episode_number,
	source.release_id, source.release_version_id, source.release_version,
	source.submitter_app_user_id, source.submitter_member_id, source.submitter_display_name,
	source.submitted_at, source.last_activity_at, source.decided_at`

const releaseReviewQueueBaseSQL = `
	WITH review_sources AS (
		SELECT lifecycle.source_type, lifecycle.source_id, lifecycle.source_revision,
		       lifecycle.review_kind, lifecycle.category, lifecycle.review_state,
		       COALESCE(note.fansub_group_id, media.fansub_group_id) AS fansub_group_id,
		       anime.id AS anime_id, COALESCE(anime.title_de, anime.title_en, anime.title, '') AS anime_title,
		       episode.id AS episode_id, COALESCE(episode.episode_number, '')::text AS episode_number,
		       release.id AS release_id, version.id AS release_version_id, version.version AS release_version,
		       lifecycle.submitter_app_user_id, lifecycle.submitter_member_id,
		       COALESCE(NULLIF(TRIM(member.display_name), ''), member.nickname, '') AS submitter_display_name,
		       lifecycle.submitted_at, lifecycle.last_activity_at, lifecycle.decided_at,
		       note.title AS note_title, note.body_html AS note_html, media.caption,
		       thumb.path AS thumbnail_path, original.path AS original_path,
		       CONCAT_WS(' ', COALESCE(anime.title_de, anime.title_en, anime.title, ''),
		           episode.episode_number::text, version.version,
		           COALESCE(NULLIF(TRIM(member.display_name), ''), member.nickname, '')) AS search_text
		FROM release_review_lifecycle_sources lifecycle
		LEFT JOIN release_version_notes note
		  ON lifecycle.source_type = 'release_version_note' AND note.id = lifecycle.source_id AND note.deleted_at IS NULL
		LEFT JOIN release_version_media media
		  ON lifecycle.source_type = 'release_version_media' AND media.id = lifecycle.source_id AND media.deleted_at IS NULL
		JOIN release_versions version ON version.id = COALESCE(note.release_version_id, media.release_version_id)
		JOIN release_version_groups version_group
		  ON version_group.release_version_id = version.id
		 AND version_group.fansub_group_id = COALESCE(note.fansub_group_id, media.fansub_group_id)
		JOIN fansub_releases release ON release.id = version.release_id
		JOIN episodes episode ON episode.id = release.episode_id
		JOIN anime anime ON anime.id = episode.anime_id
		JOIN members member ON member.id = lifecycle.submitter_member_id
		LEFT JOIN LATERAL (
			SELECT media_file.path
			FROM media_files media_file
			WHERE media_file.media_id = media.media_asset_id
			  AND media_file.variant = 'thumb'
			  AND media_file.status = 'ready'
			ORDER BY media_file.id
			LIMIT 1
		) thumb ON TRUE
		LEFT JOIN LATERAL (
			SELECT media_file.path
			FROM media_files media_file
			WHERE media_file.media_id = media.media_asset_id
			  AND media_file.variant = 'original'
			  AND media_file.status = 'ready'
			ORDER BY media_file.id
			LIMIT 1
		) original ON TRUE
	)`
