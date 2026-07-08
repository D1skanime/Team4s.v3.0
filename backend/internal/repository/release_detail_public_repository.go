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
