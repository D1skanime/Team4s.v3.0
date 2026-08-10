package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ProjectMemberPublicRepository liefert die kombinierte oeffentliche Read-View
// Member × Fansubgruppe × Anime (Phase 122). Rein lesend, keine neue Ownership.
type ProjectMemberPublicRepository struct {
	db *pgxpool.Pool
}

// NewProjectMemberPublicRepository erstellt ein neues ProjectMemberPublicRepository.
func NewProjectMemberPublicRepository(db *pgxpool.Pool) *ProjectMemberPublicRepository {
	return &ProjectMemberPublicRepository{db: db}
}

// --- DTOs ---

// ProjectMemberCounts sind die Summary-Kennzahlen (nur oeffentlich sichtbare Inhalte).
type ProjectMemberCounts struct {
	Roles    int `json:"roles"`
	Notes    int `json:"notes"`
	Media    int `json:"media"`
	Releases int `json:"releases"`
}

// ProjectMemberSummary sind Hero-Daten + Rollen + Counts fuer die Projekt-Member-Seite.
type ProjectMemberSummary struct {
	MemberID          int64    `json:"member_id"`
	MemberSlug        *string  `json:"member_slug"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberAvatarURL   *string  `json:"member_avatar_url"`
	IsVerified        bool     `json:"is_verified"`
	RoleLabels        []string `json:"role_labels"`
	Counts            ProjectMemberCounts `json:"counts"`
}

// ProjectMemberNote ist ein oeffentlicher Textbeitrag des Members im Projekt.
type ProjectMemberNote struct {
	ID                  int64     `json:"id"`
	Title               *string   `json:"title"`
	BodyHTML            string    `json:"body_html"`
	BodyText            string    `json:"body_text"`
	RoleLabel           string    `json:"role_label"`
	EpisodeLabel        string    `json:"episode_label"`
	ReleaseVersionLabel string    `json:"release_version_label"`
	ReleaseVersionID    int64     `json:"release_version_id"`
	CreatedAt           time.Time `json:"created_at"`
}

// ProjectMemberMediaItem ist ein oeffentliches Medium (Uploader = Member, D-06).
// ThumbFilePath/OriginalFilePath sind storage-relative Pfade; der Handler baut daraus die URLs.
type ProjectMemberMediaItem struct {
	RelationID          int64     `json:"-"`
	MediaAssetID        int64     `json:"media_asset_id"`
	Category            string    `json:"category"`
	Caption             *string   `json:"caption"`
	EpisodeLabel        string    `json:"episode_label"`
	ReleaseVersionLabel string    `json:"release_version_label"`
	ReleaseVersionID    int64     `json:"release_version_id"`
	SortOrder           int       `json:"-"`
	CreatedAt           time.Time `json:"created_at"`
	ThumbFilePath       string    `json:"-"`
	OriginalFilePath    string    `json:"-"`
}

// ProjectMemberRelease ist eine Release-Beteiligung (Crew-Historie) des Members.
type ProjectMemberRelease struct {
	ReleaseVersionID int64      `json:"release_version_id"`
	EpisodeLabel     string     `json:"episode_label"`
	VersionLabel     string     `json:"version_label"`
	ConfirmedAt      *time.Time `json:"confirmed_at"`
	RoleLabels       []string   `json:"role_labels"`
	EpisodeSort      int32      `json:"-"`
}

// --- 404-Gate ---

// ResolveMemberRelation loest memberSlug auf und prueft, ob der Member irgendeine fachliche
// Beziehung zu (anime, group) hat. exists=false => Handler liefert 404 (D-10). Eine gueltige
// Beziehung ohne oeffentliche Detailbeitraege bleibt exists=true (Empty-State, kein 404).
func (r *ProjectMemberPublicRepository) ResolveMemberRelation(ctx context.Context, animeID, groupID int64, memberSlug string) (int64, bool, error) {
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT m.id FROM members m
		WHERE `+slugCol+` = $1
		ORDER BY m.id ASC LIMIT 1
	`, strings.TrimSpace(strings.ToLower(memberSlug))).Scan(&memberID)
	if err != nil {
		return 0, false, nil // unbekannter Slug => kein Fund (Handler: 404)
	}

	var exists bool
	err = r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM release_member_roles rmr
			JOIN fansub_releases fr ON fr.id = rmr.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN release_versions rv ON rv.release_id = fr.id
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE rmr.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
			UNION ALL
			SELECT 1 FROM anime_contributions ac
			LEFT JOIN visibilities v ON v.id = ac.visibility_id
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			WHERE ac.member_id = $1 AND ac.anime_id = $2 AND ac.fansub_group_id = $3
			  AND `+projectMemberPublicContributionPredicate+`
		) AS has_relation
	`, memberID, animeID, groupID).Scan(&exists)
	if err != nil {
		return 0, false, fmt.Errorf("project member: resolve relation: %w", err)
	}
	return memberID, exists, nil
}

// --- Summary / Hero / Rollen / Counts ---

// GetSummary liefert Hero-Daten, aggregierte Rollen und die vier Counts (nur oeffentliche Inhalte).
func (r *ProjectMemberPublicRepository) GetSummary(ctx context.Context, animeID, groupID, memberID int64) (*ProjectMemberSummary, error) {
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")

	s := &ProjectMemberSummary{RoleLabels: make([]string, 0)}
	err := r.db.QueryRow(ctx, `
		SELECT
			m.id,
			`+displayCol+` AS display_name,
			`+slugCol+` AS slug,
			NULLIF(TRIM(avatar.file_path), '') AS avatar_url,
			EXISTS(SELECT 1 FROM member_claims mc WHERE mc.member_id = m.id AND mc.claim_status = 'verified') AS is_verified
		FROM members m
		LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
		WHERE m.id = $1
	`, memberID).Scan(&s.MemberID, &s.MemberDisplayName, &s.MemberSlug, &s.MemberAvatarURL, &s.IsVerified)
	if err != nil {
		return nil, fmt.Errorf("project member: summary base: %w", err)
	}

	// Rollen: Union aus release_member_roles (Team) und oeffentlichen anime_contributions (extern).
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT label FROM (
			SELECT cr.label AS label
			FROM release_member_roles rmr
			JOIN contributor_roles cr ON cr.id = rmr.role_id
			JOIN fansub_releases fr ON fr.id = rmr.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN release_versions rv ON rv.release_id = fr.id
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE rmr.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
			UNION
			SELECT COALESCE(rd.label_de, acr.role_code) AS label
			FROM anime_contributions ac
			LEFT JOIN visibilities v ON v.id = ac.visibility_id
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			LEFT JOIN role_definitions rd ON rd.code = acr.role_code
			WHERE ac.member_id = $1 AND ac.anime_id = $2 AND ac.fansub_group_id = $3
			  AND `+projectMemberPublicContributionPredicate+`
			  AND acr.role_code IS NOT NULL
		) labels
		WHERE label IS NOT NULL AND TRIM(label) <> ''
		ORDER BY label
	`, memberID, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("project member: summary roles: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var label string
		if err := rows.Scan(&label); err != nil {
			return nil, fmt.Errorf("project member: summary roles scan: %w", err)
		}
		s.RoleLabels = append(s.RoleLabels, label)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("project member: summary roles iterate: %w", err)
	}
	s.Counts.Roles = len(s.RoleLabels)

	if s.Counts.Notes, err = r.countNotes(ctx, animeID, groupID, memberID); err != nil {
		return nil, err
	}
	if s.Counts.Media, err = r.countMedia(ctx, animeID, groupID, memberID); err != nil {
		return nil, err
	}
	if s.Counts.Releases, err = r.countReleases(ctx, animeID, groupID, memberID); err != nil {
		return nil, err
	}
	return s, nil
}

func (r *ProjectMemberPublicRepository) countNotes(ctx context.Context, animeID, groupID, memberID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_notes rvn
		JOIN release_versions rv ON rv.id = rvn.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rvn.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
		  AND `+projectMemberPublicNotePredicate+`
	`, memberID, animeID, groupID).Scan(&n)
	return n, err
}

func (r *ProjectMemberPublicRepository) countMedia(ctx context.Context, animeID, groupID, memberID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		WITH `+projectMemberUserIDsCTE+`
		SELECT COUNT(*)
		FROM release_version_media rvm
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE rvm.uploaded_by_user_id IN (SELECT uid FROM member_users)
		  AND e.anime_id = $2 AND rvm.fansub_group_id = $3
		  AND `+projectMemberPublicMediaPredicate+`
	`, memberID, animeID, groupID).Scan(&n)
	return n, err
}

func (r *ProjectMemberPublicRepository) countReleases(ctx context.Context, animeID, groupID, memberID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT rv.id)
		FROM release_member_roles rmr
		JOIN fansub_releases fr ON fr.id = rmr.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_versions rv ON rv.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rmr.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
	`, memberID, animeID, groupID).Scan(&n)
	return n, err
}

// --- Cursor-paginierte Collections ---

// ListNotes liefert oeffentliche Textbeitraege des Members (projektweit), neueste zuerst.
func (r *ProjectMemberPublicRepository) ListNotes(ctx context.Context, animeID, groupID, memberID int64, cursor string, limit int) ([]ProjectMemberNote, *string, bool, error) {
	limit = clampCursorLimit(limit)
	seek := ""
	if t, id, ok := decodeTimeInt64Cursor(cursor); ok {
		seek = fmt.Sprintf(" AND (rvn.created_at < '%s' OR (rvn.created_at = '%s' AND rvn.id < %d))",
			t.Format(time.RFC3339Nano), t.Format(time.RFC3339Nano), id)
	}
	q := `
		SELECT rvn.id, rvn.title, rvn.body_html, rvn.body_text,
		       COALESCE(cr.label, '') AS role_label,
		       COALESCE(e.episode_number, '') AS episode_label,
		       COALESCE(rv.version, '') AS version_label,
		       rvn.release_version_id, rvn.created_at
		FROM release_version_notes rvn
		JOIN release_versions rv ON rv.id = rvn.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
		WHERE rvn.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
		  AND ` + projectMemberPublicNotePredicate + seek + `
		ORDER BY rvn.created_at DESC, rvn.id DESC
		LIMIT ` + fmt.Sprintf("%d", limit+1)
	rows, err := r.db.Query(ctx, q, memberID, animeID, groupID)
	if err != nil {
		return nil, nil, false, fmt.Errorf("project member: list notes: %w", err)
	}
	defer rows.Close()
	items := make([]ProjectMemberNote, 0, limit+1)
	for rows.Next() {
		var n ProjectMemberNote
		if err := rows.Scan(&n.ID, &n.Title, &n.BodyHTML, &n.BodyText, &n.RoleLabel,
			&n.EpisodeLabel, &n.ReleaseVersionLabel, &n.ReleaseVersionID, &n.CreatedAt); err != nil {
			return nil, nil, false, fmt.Errorf("project member: notes scan: %w", err)
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, false, fmt.Errorf("project member: notes iterate: %w", err)
	}
	page, next, more := trimCursorPage(items, limit, func(n ProjectMemberNote) string {
		return encodeTimeInt64Cursor(n.CreatedAt, n.ID)
	})
	return page, next, more, nil
}

// ListMedia liefert oeffentliche Medien des Members (Uploader-Zuordnung, D-06), sort_order aufsteigend.
func (r *ProjectMemberPublicRepository) ListMedia(ctx context.Context, animeID, groupID, memberID int64, cursor string, limit int) ([]ProjectMemberMediaItem, *string, bool, error) {
	limit = clampCursorLimit(limit)
	seek := ""
	if so, id, ok := decodeInt32Int64Cursor(cursor); ok {
		seek = fmt.Sprintf(" AND (rvm.sort_order > %d OR (rvm.sort_order = %d AND rvm.id > %d))", so, so, id)
	}
	q := `
		WITH ` + projectMemberUserIDsCTE + `
		SELECT rvm.id, rvm.media_asset_id, rvm.category, rvm.caption,
		       COALESCE(e.episode_number, '') AS episode_label,
		       COALESCE(rv.version, '') AS version_label,
		       rvm.release_version_id, rvm.sort_order, rvm.created_at,
		       COALESCE(mf_thumb.path, ''), COALESCE(mf_orig.path, '')
		FROM release_version_media rvm
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb'
		LEFT JOIN media_files mf_orig  ON mf_orig.media_id  = rvm.media_asset_id AND mf_orig.variant  = 'original'
		WHERE rvm.uploaded_by_user_id IN (SELECT uid FROM member_users)
		  AND e.anime_id = $2 AND rvm.fansub_group_id = $3
		  AND ` + projectMemberPublicMediaPredicate + seek + `
		ORDER BY rvm.sort_order ASC, rvm.id ASC
		LIMIT ` + fmt.Sprintf("%d", limit+1)
	rows, err := r.db.Query(ctx, q, memberID, animeID, groupID)
	if err != nil {
		return nil, nil, false, fmt.Errorf("project member: list media: %w", err)
	}
	defer rows.Close()
	items := make([]ProjectMemberMediaItem, 0, limit+1)
	for rows.Next() {
		var m ProjectMemberMediaItem
		if err := rows.Scan(&m.RelationID, &m.MediaAssetID, &m.Category, &m.Caption,
			&m.EpisodeLabel, &m.ReleaseVersionLabel, &m.ReleaseVersionID, &m.SortOrder, &m.CreatedAt,
			&m.ThumbFilePath, &m.OriginalFilePath); err != nil {
			return nil, nil, false, fmt.Errorf("project member: media scan: %w", err)
		}
		items = append(items, m)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, false, fmt.Errorf("project member: media iterate: %w", err)
	}
	page, next, more := trimCursorPage(items, limit, func(m ProjectMemberMediaItem) string {
		return encodeInt32Int64Cursor(int32(m.SortOrder), m.RelationID)
	})
	return page, next, more, nil
}

// ListReleases liefert die Release-Beteiligung (Crew-Historie) des Members, nach Folge aufsteigend.
func (r *ProjectMemberPublicRepository) ListReleases(ctx context.Context, animeID, groupID, memberID int64, cursor string, limit int) ([]ProjectMemberRelease, *string, bool, error) {
	limit = clampCursorLimit(limit)
	seek := ""
	if es, id, ok := decodeInt32Int64Cursor(cursor); ok {
		seek = fmt.Sprintf(" AND (COALESCE(e.sort_index, 0) > %d OR (COALESCE(e.sort_index, 0) = %d AND rv.id > %d))", es, es, id)
	}
	q := `
		SELECT rv.id AS release_version_id,
		       COALESCE(e.episode_number, '') AS episode_label,
		       COALESCE(rv.version, '') AS version_label,
		       MAX(rmr.created_at) AS confirmed_at,
		       COALESCE(e.sort_index, 0) AS episode_sort,
		       COALESCE(ARRAY_AGG(DISTINCT cr.label) FILTER (WHERE cr.label IS NOT NULL), ARRAY[]::text[]) AS role_labels
		FROM release_member_roles rmr
		JOIN fansub_releases fr ON fr.id = rmr.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_versions rv ON rv.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		WHERE rmr.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3` + seek + `
		GROUP BY rv.id, e.episode_number, rv.version, e.sort_index
		ORDER BY episode_sort ASC, rv.id ASC
		LIMIT ` + fmt.Sprintf("%d", limit+1)
	rows, err := r.db.Query(ctx, q, memberID, animeID, groupID)
	if err != nil {
		return nil, nil, false, fmt.Errorf("project member: list releases: %w", err)
	}
	defer rows.Close()
	items := make([]ProjectMemberRelease, 0, limit+1)
	for rows.Next() {
		var rel ProjectMemberRelease
		if err := rows.Scan(&rel.ReleaseVersionID, &rel.EpisodeLabel, &rel.VersionLabel,
			&rel.ConfirmedAt, &rel.EpisodeSort, &rel.RoleLabels); err != nil {
			return nil, nil, false, fmt.Errorf("project member: releases scan: %w", err)
		}
		if rel.RoleLabels == nil {
			rel.RoleLabels = make([]string, 0)
		}
		items = append(items, rel)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, false, fmt.Errorf("project member: releases iterate: %w", err)
	}
	page, next, more := trimCursorPage(items, limit, func(rel ProjectMemberRelease) string {
		return encodeInt32Int64Cursor(rel.EpisodeSort, rel.ReleaseVersionID)
	})
	return page, next, more, nil
}
