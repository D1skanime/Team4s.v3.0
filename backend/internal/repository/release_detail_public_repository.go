package repository

// ReleaseDetailPublicRepository liefert das aggregierte oeffentliche Release-Detail
// (AO4-02): Kopf-Kennzahlen, Beteiligte, Bilder und Texte fuer genau eine
// release_version_id. Aggregationseinheit ist release_versions (NICHT fansub_releases).
// Sub-Reads (Beteiligte/Bilder/Texte) sind wegen des 450-Zeilen-Limits nach
// release_detail_public_repository_helpers.go ausgelagert.

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ReleaseDetailPublicRepository kapselt den aggregierenden Public-Release-Read.
type ReleaseDetailPublicRepository struct {
	db              *pgxpool.Pool
	mediaStorageDir string
}

// NewReleaseDetailPublicRepository erstellt ein neues ReleaseDetailPublicRepository.
// mediaStorageDir wird fuer die URL-Auflösung von Bild-Thumbnails/Originalen verwendet.
func NewReleaseDetailPublicRepository(db *pgxpool.Pool, mediaStorageDir string) *ReleaseDetailPublicRepository {
	return &ReleaseDetailPublicRepository{db: db, mediaStorageDir: mediaStorageDir}
}

// --- DTOs ---

// PublicReleaseContributor ist ein oeffentlich sichtbarer Beteiligter einer Release-Version.
type PublicReleaseContributor struct {
	MemberID  int64  `json:"member_id"`
	Name      string `json:"name"`
	RoleLabel string `json:"role_label"`
}

// PublicReleaseImage ist ein oeffentlich sichtbares Bild einer Release-Version.
type PublicReleaseImage struct {
	ID           int64   `json:"id"`
	Category     string  `json:"category"`
	ThumbnailURL *string `json:"thumbnail_url"`
	OriginalURL  *string `json:"original_url"`
	Caption      *string `json:"caption"`
}

// PublicReleaseNote ist ein oeffentlich sichtbarer Textbeitrag einer Release-Version.
type PublicReleaseNote struct {
	ID         int64     `json:"id"`
	MemberName string    `json:"member_name"`
	RoleLabel  string    `json:"role_label"`
	BodyHTML   string    `json:"body_html"`
	CreatedAt  time.Time `json:"created_at"`
}

// PublicReleaseDetail ist das aggregierte Antwort-DTO fuer
// GET /anime/:id/group/:groupId/releases/:releaseVersionId.
// Slices sind niemals nil (leerer Slice bei keinen sichtbaren Daten, D-15-Muster).
type PublicReleaseDetail struct {
	ReleaseVersionID  int64                      `json:"release_version_id"`
	EpisodeNumber     string                     `json:"episode_number"`
	Title             string                     `json:"title"`
	ReleaseDate       *time.Time                 `json:"release_date"`
	ImagesCount       int64                      `json:"images_count"`
	NotesCount        int64                      `json:"notes_count"`
	ContributorsCount int64                      `json:"contributors_count"`
	Contributors      []PublicReleaseContributor `json:"contributors"`
	Images            []PublicReleaseImage       `json:"images"`
	Notes             []PublicReleaseNote        `json:"notes"`
}

// releaseDetailHeader haelt die Kopf-Daten einer Release-Version (Schritt 1+2).
type releaseDetailHeader struct {
	ReleaseVersionID int64
	EpisodeNumber    string
	Title            string
	ReleaseDate      *time.Time
}

// GetPublicReleaseDetail liefert das aggregierte, oeffentlich gegatete Release-Detail
// fuer eine release_version_id, gescoped auf animeID+groupID (Ownership-Check).
// Gibt ErrNotFound zurueck, wenn die Version nicht existiert oder nicht zu
// animeID+groupID gehoert.
func (r *ReleaseDetailPublicRepository) GetPublicReleaseDetail(
	ctx context.Context,
	animeID int64,
	groupID int64,
	releaseVersionID int64,
) (*PublicReleaseDetail, error) {
	header, err := r.loadReleaseHeader(ctx, animeID, groupID, releaseVersionID)
	if err != nil {
		return nil, err
	}

	contributors, err := r.loadContributors(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}
	contributorsCount, err := r.countContributors(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}

	images, err := r.loadImages(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}
	imagesCount, err := r.countImages(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}

	notes, err := r.loadNotes(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}
	notesCount, err := r.countNotes(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}

	return &PublicReleaseDetail{
		ReleaseVersionID:  header.ReleaseVersionID,
		EpisodeNumber:     header.EpisodeNumber,
		Title:             header.Title,
		ReleaseDate:       header.ReleaseDate,
		ImagesCount:       imagesCount,
		NotesCount:        notesCount,
		ContributorsCount: contributorsCount,
		Contributors:      contributors,
		Images:            images,
		Notes:             notes,
	}, nil
}

// loadReleaseHeader prueft Ownership (release_version gehoert zu animeID+groupID via
// release_version_groups + fansub_releases + episodes) und liefert die Kopf-Daten.
func (r *ReleaseDetailPublicRepository) loadReleaseHeader(
	ctx context.Context,
	animeID int64,
	groupID int64,
	releaseVersionID int64,
) (*releaseDetailHeader, error) {
	var header releaseDetailHeader
	err := r.db.QueryRow(ctx, `
		SELECT
			rv.id,
			COALESCE(e.episode_number, ''),
			COALESCE(NULLIF(rv.title, ''), e.title) AS title,
			COALESCE(rv.release_date, fr.release_date) AS release_date
		FROM release_versions rv
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rv.id = $1
		  AND e.anime_id = $2
		  AND rvg.fansub_group_id = $3
		LIMIT 1
	`, releaseVersionID, animeID, groupID).Scan(
		&header.ReleaseVersionID,
		&header.EpisodeNumber,
		&header.Title,
		&header.ReleaseDate,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("release detail: load header (anime=%d group=%d version=%d): %w", animeID, groupID, releaseVersionID, err)
	}
	return &header, nil
}

// --- Cursor-Pagination (AO4-03/AO4-24) ---
//
// Die folgenden zwei Methoden sind additive Seek-Pagination-Varianten fuer die
// Bildergalerie und die Textliste einer Release-Version, genutzt vom Infinite-
// Scroll/"Mehr laden" der kuenftigen Release-Detailseite (AO4-18/AO4-19). Sie
// laden absichtlich NICHT vollstaendig (anders als loadImages/loadNotes) und
// nehmen bewusst keinen animeID/groupID-Ownership-Check vor — die initiale volle
// Detailseite (GetPublicReleaseDetail) validiert Ownership bereits vor dem ersten
// Nachladen. Gleiches Sichtbarkeits-Gate wie loadImages/loadNotes.

// ReleaseImagesCursorPage ist das Ergebnis der Seek-Pagination fuer die
// vollstaendige Bildergalerie einer Release-Version.
type ReleaseImagesCursorPage struct {
	Items      []PublicReleaseImage `json:"items"`
	NextCursor *string              `json:"next_cursor"`
	HasMore    bool                 `json:"has_more"`
}

// ReleaseNotesCursorPage ist das Ergebnis der Seek-Pagination fuer die
// vollstaendige Textliste einer Release-Version.
type ReleaseNotesCursorPage struct {
	Items      []PublicReleaseNote `json:"items"`
	NextCursor *string             `json:"next_cursor"`
	HasMore    bool                `json:"has_more"`
}

// ListReleaseVersionImagesCursor liefert eine Seek-paginierte Seite der oeffentlich
// sichtbaren Bilder einer Release-Version, additiv neben loadImages (welches
// vollstaendig laedt). Gleiches Sichtbarkeits-Gate wie imagesQuery(). Seek-
// Schluessel: (sort_order, id) — identisch zur ORDER BY-Reihenfolge.
func (r *ReleaseDetailPublicRepository) ListReleaseVersionImagesCursor(
	ctx context.Context,
	releaseVersionID int64,
	cursor string,
	limit int,
) (*ReleaseImagesCursorPage, error) {
	limit = clampCursorLimit(limit)

	args := []any{releaseVersionID}
	seekSQL := ""
	if sortOrder, id, ok := decodeInt32Int64Cursor(cursor); ok {
		seekSQL = "AND (rvm.sort_order, rvm.id) > ($2, $3)"
		args = append(args, sortOrder, id)
	}

	query := fmt.Sprintf(`
		SELECT
			rvm.id,
			rvm.category,
			rvm.caption,
			COALESCE(mf_thumb.path, '') AS thumbnail_path,
			COALESCE(mf_orig.path, ma.file_path, '') AS original_path,
			rvm.sort_order
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
		  %s
		ORDER BY rvm.sort_order ASC, rvm.id ASC
		LIMIT %d
	`, seekSQL, limit+1)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("release detail: query images cursor for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	type imageCursorRow struct {
		image     PublicReleaseImage
		sortOrder int32
	}
	rowsOut := make([]imageCursorRow, 0, limit+1)
	for rows.Next() {
		var (
			row           imageCursorRow
			thumbnailPath *string
			originalPath  *string
		)
		if err := rows.Scan(&row.image.ID, &row.image.Category, &row.image.Caption, &thumbnailPath, &originalPath, &row.sortOrder); err != nil {
			return nil, fmt.Errorf("release detail: scan image cursor row: %w", err)
		}
		if thumbnailPath != nil {
			row.image.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}
		if originalPath != nil {
			row.image.OriginalURL = publicMediaURLForPath(*originalPath, r.mediaStorageDir)
		}
		rowsOut = append(rowsOut, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate image cursor rows: %w", err)
	}

	page, nextCursor, hasMore := trimCursorPage(rowsOut, limit, func(row imageCursorRow) string {
		return encodeInt32Int64Cursor(row.sortOrder, row.image.ID)
	})

	images := make([]PublicReleaseImage, 0, len(page))
	for _, row := range page {
		images = append(images, row.image)
	}

	return &ReleaseImagesCursorPage{
		Items:      images,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

// ListReleaseVersionNotesCursor liefert eine Seek-paginierte Seite der oeffentlich
// sichtbaren Textbeitraege einer Release-Version, additiv neben loadNotes (welches
// vollstaendig laedt). Gleiches Sichtbarkeits-Gate wie loadNotes. Seek-Schluessel:
// (created_at, id) — eindeutig gewaehlt statt (sort_order, id), da sort_order fuer
// Texte nicht zuverlaessig gepflegt ist (Claude's Discretion, AO4-Kontext erlaubt
// beide Paare explizit).
func (r *ReleaseDetailPublicRepository) ListReleaseVersionNotesCursor(
	ctx context.Context,
	releaseVersionID int64,
	cursor string,
	limit int,
) (*ReleaseNotesCursorPage, error) {
	limit = clampCursorLimit(limit)

	args := []any{releaseVersionID}
	seekSQL := ""
	if createdAt, id, ok := decodeTimeInt64Cursor(cursor); ok {
		seekSQL = "AND (rvn.created_at, rvn.id) > ($2, $3)"
		args = append(args, createdAt, id)
	}

	query := fmt.Sprintf(`
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
		  %s
		ORDER BY rvn.created_at ASC, rvn.id ASC
		LIMIT %d
	`, seekSQL, limit+1)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("release detail: query notes cursor for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseNote, 0, limit+1)
	for rows.Next() {
		var item PublicReleaseNote
		if err := rows.Scan(&item.ID, &item.MemberName, &item.RoleLabel, &item.BodyHTML, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("release detail: scan note cursor row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate note cursor rows: %w", err)
	}

	page, nextCursor, hasMore := trimCursorPage(items, limit, func(item PublicReleaseNote) string {
		return encodeTimeInt64Cursor(item.CreatedAt, item.ID)
	})

	return &ReleaseNotesCursorPage{
		Items:      page,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}
