package repository

// Sub-Reads fuer ReleaseDetailPublicRepository.GetPublicReleaseDetail (AO4-02),
// ausgelagert aus release_detail_public_repository.go wegen des 450-Zeilen-Limits.
//
// Sichtbarkeits-Gates:
//   - Bilder (release_version_media): v.name='public', rs.code='approved', ma.status='ready'
//     — identisch zu group_release_media_repository.go.
//   - Texte (release_version_notes): visibility='public', status='published', deleted_at IS NULL
//     — Literale aus Migration 0064 (chk_release_version_notes_visibility/_status).
//   - Beteiligte (anime_contributions): is_public_on_anime_page=true, visibility_id -> 'public'
//     — identisch zum Ebene-2-Gate in anime_contributions_public_versions_repository.go.

import (
	"context"
	"fmt"
)

// loadContributors liefert Name+Rolle der oeffentlich sichtbaren Beteiligten einer
// Release-Version, sortiert nach Name. Mehrere Rollen eines Mitglieds werden zu
// einem kommagetrennten role_label zusammengefasst.
func (r *ReleaseDetailPublicRepository) loadContributors(ctx context.Context, releaseVersionID int64) ([]PublicReleaseContributor, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ac.member_id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
			COALESCE(
				STRING_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code), ', ' ORDER BY COALESCE(rd.label_de, acr.role_code)),
				''
			) AS role_label
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		LEFT JOIN visibilities v ON v.id = ac.visibility_id
		WHERE ac.release_version_id = $1
		  AND ac.is_public_on_anime_page = true
		  AND COALESCE(v.name, 'public') = 'public'
		GROUP BY ac.id, ac.member_id, m.nickname, m.display_name
		ORDER BY member_name ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load contributors for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseContributor, 0)
	for rows.Next() {
		var item PublicReleaseContributor
		if err := rows.Scan(&item.MemberID, &item.Name, &item.RoleLabel); err != nil {
			return nil, fmt.Errorf("release detail: scan contributor row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate contributor rows: %w", err)
	}
	return items, nil
}

// countContributors zaehlt die oeffentlich sichtbaren Beteiligten unabhaengig von
// einer eventuell spaeter eingefuehrten Pagination (AO4-03).
func (r *ReleaseDetailPublicRepository) countContributors(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ac.member_id)
		FROM anime_contributions ac
		LEFT JOIN visibilities v ON v.id = ac.visibility_id
		WHERE ac.release_version_id = $1
		  AND ac.is_public_on_anime_page = true
		  AND COALESCE(v.name, 'public') = 'public'
	`, releaseVersionID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("release detail: count contributors for version %d: %w", releaseVersionID, err)
	}
	return count, nil
}

// loadImages liefert oeffentlich sichtbare release_version_media, inkl. category,
// sortiert nach sort_order ASC, id ASC.
func (r *ReleaseDetailPublicRepository) loadImages(ctx context.Context, releaseVersionID int64) ([]PublicReleaseImage, error) {
	rows, err := r.db.Query(ctx, r.imagesQuery(), releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load images for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseImage, 0)
	for rows.Next() {
		var (
			item          PublicReleaseImage
			thumbnailPath *string
			originalPath  *string
		)
		if err := rows.Scan(&item.ID, &item.Category, &item.Caption, &thumbnailPath, &originalPath); err != nil {
			return nil, fmt.Errorf("release detail: scan image row: %w", err)
		}
		if thumbnailPath != nil {
			item.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}
		if originalPath != nil {
			item.OriginalURL = publicMediaURLForPath(*originalPath, r.mediaStorageDir)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate image rows: %w", err)
	}
	return items, nil
}

// countImages zaehlt die oeffentlich sichtbaren Bilder unabhaengig von einer
// eventuell spaeter eingefuehrten Pagination (AO4-03).
func (r *ReleaseDetailPublicRepository) countImages(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE rvm.release_version_id = $1
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
	`, releaseVersionID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("release detail: count images for version %d: %w", releaseVersionID, err)
	}
	return count, nil
}

// imagesQuery ist die gemeinsame Query fuer loadImages; identisches Sichtbarkeits-Gate
// wie group_release_media_repository.go (v.name='public', rs.code='approved', ma.status='ready').
func (r *ReleaseDetailPublicRepository) imagesQuery() string {
	return `
		SELECT
			rvm.id,
			rvm.category,
			rvm.caption,
			COALESCE(mf_thumb.path, '') AS thumbnail_path,
			COALESCE(mf_orig.path, ma.file_path, '') AS original_path
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE rvm.release_version_id = $1
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		ORDER BY rvm.sort_order ASC, rvm.id ASC
	`
}

// loadNotes liefert oeffentlich sichtbare release_version_notes (visibility='public',
// status='published'), sortiert nach sort_order/created_at.
func (r *ReleaseDetailPublicRepository) loadNotes(ctx context.Context, releaseVersionID int64) ([]PublicReleaseNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvn.id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
			COALESCE(cr.label, '') AS role_label,
			rvn.body_html,
			rvn.created_at
		FROM release_version_notes rvn
		JOIN members m ON m.id = rvn.member_id
		LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
		ORDER BY rvn.sort_order ASC, rvn.created_at ASC, rvn.id ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load notes for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseNote, 0)
	for rows.Next() {
		var item PublicReleaseNote
		if err := rows.Scan(&item.ID, &item.MemberName, &item.RoleLabel, &item.BodyHTML, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("release detail: scan note row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate note rows: %w", err)
	}
	return items, nil
}

// countNotes zaehlt die oeffentlich sichtbaren Texte unabhaengig von einer
// eventuell spaeter eingefuehrten Pagination (AO4-03).
func (r *ReleaseDetailPublicRepository) countNotes(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_notes rvn
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
	`, releaseVersionID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("release detail: count notes for version %d: %w", releaseVersionID, err)
	}
	return count, nil
}
