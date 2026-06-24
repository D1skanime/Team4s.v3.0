package repository

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// --- Typen für Gruppenmedien-Review (Phase 78) ---

// FansubGroupMediaReviewRow enthält einen Medieneintrag mit Sichtbarkeit/Reviewstatus
// für den Review-Tab. Wird von ListFansubGroupMediaForReview befüllt.
type FansubGroupMediaReviewRow struct {
	MediaAssetID    int64
	PreviewURL      string
	Visibility      *string // nil wenn nicht gesetzt; API-seitiger Wert (intern/oeffentlich)
	ReviewStatus    *string // nil wenn nicht gesetzt; API-seitiger Wert (in_pruefung/...)
	Title           *string
	Description     *string
	AltText         *string
	Category        string
	SortOrder       int
	UploadedByName  *string
	CreatedAt       time.Time
	UpdatedAt       *time.Time
	OwnerType       string
	OwnerID         int64
	OwnerConsistent bool // true wenn Medium korrekt zur Gruppe gehört
}

// FansubMediaReviewPatch enthält die zu ändernden Felder.
// Ausschließlich Visibility und ReviewStatus — kein owner_type/owner_id (D-05).
type FansubMediaReviewPatch struct {
	Visibility   *string // nil = nicht ändern
	ReviewStatus *string // nil = nicht ändern
}

// --- Mapping-Tabellen: API-Wert ↔ DB-Lookup-Code ---

// visibilityAPIToDB mappt kanonische API-Werte auf die DB-Namen in der visibilities-Tabelle.
type FansubGroupMediaMetadataPatch struct {
	Title          *string
	TitleSet       bool
	Description    *string
	DescriptionSet bool
	AltText        *string
	AltTextSet     bool
	Category       *string
	SortOrder      *int
}

func (p FansubGroupMediaMetadataPatch) IsEmpty() bool {
	return !p.TitleSet && !p.DescriptionSet && !p.AltTextSet && p.Category == nil && p.SortOrder == nil
}

var visibilityAPIToDB = map[string]string{
	"intern":      "private",
	"oeffentlich": "public",
}

// visibilityDBToAPI mappt DB-Namen zurück auf kanonische API-Werte.
var visibilityDBToAPI = map[string]string{
	"private":    "intern",
	"public":     "oeffentlich",
	"registered": "oeffentlich", // Fallback: registriert → öffentlich (lesende Darstellung)
	"fansubber":  "intern",      // Fallback: fansubber → intern
	"staff":      "intern",      // Fallback: staff → intern
}

// reviewStatusAPIToDB mappt kanonische API-Werte auf die DB-Codes in der review_statuses-Tabelle.
var reviewStatusAPIToDB = map[string]string{
	"in_pruefung": "in_review",
	"freigegeben": "approved",
	"abgelehnt":   "rejected",
	"archiviert":  "archived",
	"entfernt":    "removed",
}

// reviewStatusDBToAPI mappt DB-Codes zurück auf kanonische API-Werte.
var reviewStatusDBToAPI = map[string]string{
	"in_review": "in_pruefung",
	"approved":  "freigegeben",
	"rejected":  "abgelehnt",
	"archived":  "archiviert",
	"removed":   "entfernt",
}

type MediaRepository struct {
	db            *pgxpool.Pool
	publicBaseURL string
	storageDir    string
}

func NewMediaRepository(db *pgxpool.Pool, publicBaseURL string, storageDir ...string) *MediaRepository {
	dir := ""
	if len(storageDir) > 0 {
		dir = strings.TrimSpace(storageDir[0])
	}
	return &MediaRepository{
		db:            db,
		publicBaseURL: strings.TrimRight(strings.TrimSpace(publicBaseURL), "/"),
		storageDir:    dir,
	}
}

func (r *MediaRepository) CreateMediaAsset(
	ctx context.Context,
	input models.MediaAssetCreateInput,
) (*models.MediaAsset, error) {
	filename := strings.TrimSpace(input.Filename)
	storagePath := strings.TrimSpace(input.StoragePath)
	if filename == "" {
		filename = filepath.Base(storagePath)
	}
	if storagePath == "" || filename == "" {
		return nil, fmt.Errorf("create media asset: filename und storage path sind erforderlich")
	}

	mediaTypeName, err := mediaTypeNameForKind(input.Kind, input.MimeType)
	if err != nil {
		return nil, err
	}

	var mediaTypeID int64
	if err := r.db.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = $1
		LIMIT 1
	`, mediaTypeName).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("create media asset: load media type %q: %w", mediaTypeName, err)
	}

	publicURL := r.buildPublicURL(filename)
	var item models.MediaAsset
	if input.VisibilityCode != nil && input.ReviewStatusCode != nil {
		// Sub-SELECT-INSERT: visibility_id und review_status_id per Lookup-Tabellen aufgelöst (Lock K)
		if err := r.db.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format,
				visibility_id, review_status_id, created_at)
			VALUES ($1, $2, $3, $4,
				(SELECT id FROM visibilities WHERE name = $5 LIMIT 1),
				(SELECT id FROM review_statuses WHERE code = $6 LIMIT 1),
				NOW())
			RETURNING id, file_path, mime_type, created_at
		`, mediaTypeID, storagePath, input.MimeType, mediaFormatForKind(input.Kind),
			*input.VisibilityCode, *input.ReviewStatusCode).Scan(
			&item.ID,
			&item.StoragePath,
			&item.MimeType,
			&item.CreatedAt,
		); err != nil {
			if isUniqueViolation(err) {
				return nil, ErrConflict
			}
			return nil, fmt.Errorf("create media asset: %w", err)
		}
	} else {
		if err := r.db.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format, created_at)
			VALUES ($1, $2, $3, $4, NOW())
			RETURNING id, file_path, mime_type, created_at
		`, mediaTypeID, storagePath, input.MimeType, mediaFormatForKind(input.Kind)).Scan(
			&item.ID,
			&item.StoragePath,
			&item.MimeType,
			&item.CreatedAt,
		); err != nil {
			if isUniqueViolation(err) {
				return nil, ErrConflict
			}
			return nil, fmt.Errorf("create media asset: %w", err)
		}
	}

	item.Filename = filename
	item.PublicURL = publicURL
	item.SizeBytes = input.SizeBytes
	item.Width = input.Width
	item.Height = input.Height

	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByID(ctx context.Context, mediaID int64) (*models.MediaAsset, error) {
	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, file_path, mime_type, created_at
		FROM media_assets
		WHERE id = $1
	`, mediaID).Scan(
		&item.ID,
		&item.StoragePath,
		&item.MimeType,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset %d: %w", mediaID, err)
	}

	item.StoragePath = r.resolveReadableStoragePath(item.StoragePath)
	item.Filename = mediaFilename(item.StoragePath)
	item.PublicURL = r.buildPublicURL(item.Filename)
	return &item, nil
}

func (r *MediaRepository) GetMediaAssetByFilename(ctx context.Context, filename string) (*models.MediaAsset, error) {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return nil, ErrNotFound
	}

	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT id, file_path, mime_type, created_at
		FROM media_assets
		WHERE file_path = $1
		   OR file_path LIKE $2
		   OR file_path LIKE $3
		ORDER BY id DESC
		LIMIT 1
	`, trimmed, "%/"+trimmed, "%\\"+trimmed).Scan(
		&item.ID,
		&item.StoragePath,
		&item.MimeType,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media asset by filename %q: %w", filename, err)
	}

	item.StoragePath = r.resolveReadableStoragePath(item.StoragePath)
	item.Filename = mediaFilename(item.StoragePath)
	item.PublicURL = r.buildPublicURL(item.Filename)
	return &item, nil
}

func (r *MediaRepository) DeleteMediaAsset(ctx context.Context, mediaID int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, mediaID)
	if err != nil {
		return fmt.Errorf("delete media asset %d: %w", mediaID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// InsertMediaFile legt einen media_files-Eintrag fuer ein per CreateMediaAsset
// erstelltes Asset an. width und height werden als 0 gesetzt (fuer Video-Assets).
// Wird verwendet wenn kein MediaUploadRepository verfuegbar ist.
func (r *MediaRepository) InsertMediaFile(
	ctx context.Context,
	mediaID int64,
	variant string,
	path string,
	size int64,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO media_files (media_id, variant, path, width, height, size)
		VALUES ($1, $2, $3, 0, 0, $4)
	`, mediaID, variant, path, size)
	if err != nil {
		return fmt.Errorf("insert media file for asset %d: %w", mediaID, err)
	}
	return nil
}

func (r *MediaRepository) ListMediaFilePaths(ctx context.Context, mediaID int64) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1
	`, mediaID)
	if err != nil {
		return nil, fmt.Errorf("list media file paths for asset %d: %w", mediaID, err)
	}
	defer rows.Close()

	paths := make([]string, 0)
	for rows.Next() {
		var rawPath string
		if err := rows.Scan(&rawPath); err != nil {
			return nil, fmt.Errorf("scan media file path for asset %d: %w", mediaID, err)
		}
		if trimmed := strings.TrimSpace(rawPath); trimmed != "" {
			paths = append(paths, r.resolveReadableStoragePath(trimmed))
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate media file paths for asset %d: %w", mediaID, err)
	}
	return paths, nil
}

func (r *MediaRepository) GetMediaFileVariantURL(ctx context.Context, mediaID int64, variant string) (*string, error) {
	trimmedVariant := strings.TrimSpace(variant)
	if mediaID <= 0 || trimmedVariant == "" {
		return nil, ErrNotFound
	}

	var filePath string
	if err := r.db.QueryRow(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1 AND variant = $2
		ORDER BY id DESC
		LIMIT 1
	`, mediaID, trimmedVariant).Scan(&filePath); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media file variant url (media_id=%d, variant=%q): %w", mediaID, trimmedVariant, err)
	}

	url := r.buildPublicURL(mediaFilename(filePath))
	if strings.TrimSpace(url) == "" {
		return nil, ErrNotFound
	}
	return &url, nil
}

func (r *MediaRepository) IsMediaAssetReferenced(ctx context.Context, mediaID int64) (bool, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM fansub_groups
		WHERE logo_id = $1 OR banner_id = $1
	`, mediaID).Scan(&count); err != nil {
		return false, fmt.Errorf("count media references %d: %w", mediaID, err)
	}
	return count > 0, nil
}

func (r *MediaRepository) AssignFansubMedia(
	ctx context.Context,
	fansubID int64,
	kind models.MediaKind,
	mediaID int64,
	publicURL string,
) (*int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin assign fansub media tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var prevLogoID *int64
	var prevBannerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT logo_id, banner_id
		FROM fansub_groups
		WHERE id = $1
		FOR UPDATE
	`, fansubID).Scan(&prevLogoID, &prevBannerID); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("lock fansub %d for media assign: %w", fansubID, err)
	}

	trimmedURL := publicURL
	switch kind {
	case models.MediaKindLogo:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET logo_id = $1, logo_url = $2, updated_at = NOW()
			WHERE id = $3
		`, mediaID, trimmedURL, fansubID); err != nil {
			return nil, fmt.Errorf("assign logo media for fansub %d: %w", fansubID, err)
		}
	case models.MediaKindBanner:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET banner_id = $1, banner_url = $2, updated_at = NOW()
			WHERE id = $3
		`, mediaID, trimmedURL, fansubID); err != nil {
			return nil, fmt.Errorf("assign banner media for fansub %d: %w", fansubID, err)
		}
	default:
		return nil, fmt.Errorf("unsupported media kind %q", kind)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit assign fansub media tx: %w", err)
	}

	if kind == models.MediaKindLogo {
		return prevLogoID, nil
	}
	return prevBannerID, nil
}

func (r *MediaRepository) ClearFansubMedia(
	ctx context.Context,
	fansubID int64,
	kind models.MediaKind,
) (*int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin clear fansub media tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var prevLogoID *int64
	var prevBannerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT logo_id, banner_id
		FROM fansub_groups
		WHERE id = $1
		FOR UPDATE
	`, fansubID).Scan(&prevLogoID, &prevBannerID); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("lock fansub %d for media clear: %w", fansubID, err)
	}

	switch kind {
	case models.MediaKindLogo:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET logo_id = NULL, logo_url = NULL, updated_at = NOW()
			WHERE id = $1
		`, fansubID); err != nil {
			return nil, fmt.Errorf("clear logo media for fansub %d: %w", fansubID, err)
		}
	case models.MediaKindBanner:
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_groups
			SET banner_id = NULL, banner_url = NULL, updated_at = NOW()
			WHERE id = $1
		`, fansubID); err != nil {
			return nil, fmt.Errorf("clear banner media for fansub %d: %w", fansubID, err)
		}
	default:
		return nil, fmt.Errorf("unsupported media kind %q", kind)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit clear fansub media tx: %w", err)
	}

	if kind == models.MediaKindLogo {
		return prevLogoID, nil
	}
	return prevBannerID, nil
}

func (r *MediaRepository) buildPublicURL(filename string) string {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return ""
	}
	if r.publicBaseURL == "" {
		return "/api/v1/media/files/" + url.PathEscape(trimmed)
	}
	return r.publicBaseURL + "/api/v1/media/files/" + url.PathEscape(trimmed)
}

func (r *MediaRepository) resolveReadableStoragePath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if _, err := os.Stat(trimmed); err == nil {
		return trimmed
	}
	filename := mediaFilename(trimmed)
	if filename == "" || strings.TrimSpace(r.storageDir) == "" {
		return trimmed
	}
	candidate := filepath.Join(r.storageDir, filename)
	if _, err := os.Stat(candidate); err == nil {
		return candidate
	}
	return trimmed
}

func mediaFilename(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	return path.Base(normalized)
}

func mediaTypeNameForKind(kind models.MediaKind, mimeType string) (string, error) {
	switch kind {
	case models.MediaKindLogo:
		return "logo", nil
	case models.MediaKindBanner:
		return "banner", nil
	case models.MediaKindThemeVideo:
		return "video", nil
	case models.MediaKindSegmentAsset:
		return "video", nil
	case models.MediaKindImage:
		return "image", nil
	default:
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(mimeType)), "video/") {
			return "video", nil
		}
		return "", fmt.Errorf("create media asset: unsupported media kind %q", kind)
	}
}

func mediaFormatForKind(kind models.MediaKind) string {
	switch kind {
	case models.MediaKindThemeVideo, models.MediaKindSegmentAsset:
		return "video"
	default:
		return "image"
	}
}

// --- Gruppenmedien-Review-Methoden (Phase 78) ---

// ListFansubGroupMediaForReview liest alle Medienassets einer Fansub-Gruppe mit
// Sichtbarkeit/Reviewstatus für den Review-Tab. Scoped strikt auf fansubGroupID (IDOR-Schutz D-04).
// Gibt die Werte als API-seitige kanonische Strings zurück (intern/oeffentlich, in_pruefung/...).
func (r *MediaRepository) ListFansubGroupMediaForReview(ctx context.Context, fansubGroupID int64) ([]FansubGroupMediaReviewRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ma.id          AS media_asset_id,
			ma.file_path   AS file_path,
			v.name         AS visibility_name,
			rs.code        AS review_status_code,
			fgm.title      AS title,
			fgm.description AS description,
			fgm.alt_text   AS alt_text,
			fgm.category   AS category,
			fgm.sort_order AS sort_order,
			u.username     AS uploaded_by_name,
			fgm.created_at AS created_at,
			fgm.updated_at AS updated_at,
			'fansub_group' AS owner_type,
			fgm.group_id   AS owner_id
		FROM fansub_group_media fgm
		JOIN media_assets ma ON ma.id = fgm.media_id
		JOIN fansub_groups fg ON fg.id = fgm.group_id
		LEFT JOIN visibilities v ON v.id = ma.visibility_id
		LEFT JOIN review_statuses rs ON rs.id = ma.review_status_id
		LEFT JOIN users u ON u.id = fgm.uploaded_by_user_id
		WHERE fgm.group_id = $1
		  AND fgm.deleted_at IS NULL
		  AND (fg.logo_id IS NULL OR ma.id <> fg.logo_id)
		  AND (fg.banner_id IS NULL OR ma.id <> fg.banner_id)
		ORDER BY fgm.sort_order ASC, fgm.created_at DESC, ma.id DESC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list fansub group media for review (group_id=%d): %w", fansubGroupID, err)
	}
	defer rows.Close()

	var result []FansubGroupMediaReviewRow
	for rows.Next() {
		var row FansubGroupMediaReviewRow
		var filePath string
		var visibilityName *string
		var reviewStatusCode *string

		if err := rows.Scan(
			&row.MediaAssetID,
			&filePath,
			&visibilityName,
			&reviewStatusCode,
			&row.Title,
			&row.Description,
			&row.AltText,
			&row.Category,
			&row.SortOrder,
			&row.UploadedByName,
			&row.CreatedAt,
			&row.UpdatedAt,
			&row.OwnerType,
			&row.OwnerID,
		); err != nil {
			return nil, fmt.Errorf("scan fansub group media review row: %w", err)
		}

		row.PreviewURL = r.buildPublicURL(mediaFilename(filePath))
		row.OwnerConsistent = (row.OwnerID == fansubGroupID)

		// DB-Werte auf kanonische API-Werte mappen
		if visibilityName != nil {
			if apiVal, ok := visibilityDBToAPI[*visibilityName]; ok {
				row.Visibility = &apiVal
			} else {
				row.Visibility = visibilityName
			}
		}
		if reviewStatusCode != nil {
			if apiVal, ok := reviewStatusDBToAPI[*reviewStatusCode]; ok {
				row.ReviewStatus = &apiVal
			} else {
				row.ReviewStatus = reviewStatusCode
			}
		}

		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub group media review rows: %w", err)
	}
	return result, nil
}

// UpdateFansubMediaReview setzt ausschließlich Sichtbarkeit und/oder Reviewstatus
// eines Mediums über die media_assets-Tabelle. Die JOIN-Bedingung mit fansub_group_media
// erzwingt die fansubID-Zugehörigkeit (IDOR-Schutz T-78-08).
// Ändert NIEMALS owner_type oder owner_id (D-05).
func (r *MediaRepository) UpdateFansubMediaReview(ctx context.Context, fansubGroupID, mediaID int64, patch FansubMediaReviewPatch) error {
	if patch.Visibility == nil && patch.ReviewStatus == nil {
		// Kein Update nötig — kein Error, kein DB-Call
		return nil
	}

	// Sichtbarkeit: API-Wert → DB-ID via Subquery
	// Reviewstatus: API-Wert → DB-ID via Subquery
	// JOIN mit fansub_group_media stellt sicher, dass das Medium zur Gruppe gehört.
	// KEINE Änderung von owner_type/owner_id.

	if patch.Visibility != nil && patch.ReviewStatus != nil {
		dbVis, ok := visibilityAPIToDB[*patch.Visibility]
		if !ok {
			return fmt.Errorf("ungültiger Sichtbarkeitswert: %q", *patch.Visibility)
		}
		dbStatus, ok := reviewStatusAPIToDB[*patch.ReviewStatus]
		if !ok {
			return fmt.Errorf("ungültiger Prüfstatus: %q", *patch.ReviewStatus)
		}
		tag, err := r.db.Exec(ctx, `
			UPDATE media_assets ma
			SET
				visibility_id    = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1),
				review_status_id = (SELECT id FROM review_statuses WHERE code = $2 LIMIT 1)
			WHERE ma.id = $3
			  AND EXISTS (
				SELECT 1 FROM fansub_group_media fgm
				WHERE fgm.media_id = ma.id AND fgm.group_id = $4
			  )
		`, dbVis, dbStatus, mediaID, fansubGroupID)
		if err != nil {
			return fmt.Errorf("update fansub group media review (vis+status, media_id=%d, group_id=%d): %w", mediaID, fansubGroupID, err)
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return nil
	}

	if patch.Visibility != nil {
		dbVis, ok := visibilityAPIToDB[*patch.Visibility]
		if !ok {
			return fmt.Errorf("ungültiger Sichtbarkeitswert: %q", *patch.Visibility)
		}
		tag, err := r.db.Exec(ctx, `
			UPDATE media_assets ma
			SET visibility_id = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1)
			WHERE ma.id = $2
			  AND EXISTS (
				SELECT 1 FROM fansub_group_media fgm
				WHERE fgm.media_id = ma.id AND fgm.group_id = $3
			  )
		`, dbVis, mediaID, fansubGroupID)
		if err != nil {
			return fmt.Errorf("update fansub group media visibility (media_id=%d, group_id=%d): %w", mediaID, fansubGroupID, err)
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return nil
	}

	// Nur ReviewStatus
	dbStatus, ok := reviewStatusAPIToDB[*patch.ReviewStatus]
	if !ok {
		return fmt.Errorf("ungültiger Prüfstatus: %q", *patch.ReviewStatus)
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE media_assets ma
		SET review_status_id = (SELECT id FROM review_statuses WHERE code = $1 LIMIT 1)
		WHERE ma.id = $2
		  AND EXISTS (
			SELECT 1 FROM fansub_group_media fgm
			WHERE fgm.media_id = ma.id AND fgm.group_id = $3
		  )
	`, dbStatus, mediaID, fansubGroupID)
	if err != nil {
		return fmt.Errorf("update fansub group media review_status (media_id=%d, group_id=%d): %w", mediaID, fansubGroupID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetFansubMediaOwner gibt zurück, welcher Gruppe das Medium (media_asset) gehört.
// Wird für Cross-Group-Tamper-Prüfung (T-78-03) verwendet.
// Gibt ErrNotFound zurück wenn das Medium keiner Fansub-Gruppe zugeordnet ist.
func (r *MediaRepository) GetFansubMediaOwner(ctx context.Context, mediaID int64) (int64, error) {
	var groupID int64
	err := r.db.QueryRow(ctx, `
		SELECT group_id
		FROM fansub_group_media
		WHERE media_id = $1
		LIMIT 1
	`, mediaID).Scan(&groupID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("get fansub media owner (media_id=%d): %w", mediaID, err)
	}
	return groupID, nil
}

func (r *MediaRepository) FansubGroupExistsForMedia(ctx context.Context, fansubGroupID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`, fansubGroupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check fansub group exists %d: %w", fansubGroupID, err)
	}
	return exists, nil
}

func (r *MediaRepository) GetMaxFansubGroupMediaSortOrder(ctx context.Context, fansubGroupID int64) (int, error) {
	var maxOrder int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(sort_order), 0)
		FROM fansub_group_media
		WHERE group_id = $1 AND deleted_at IS NULL
	`, fansubGroupID).Scan(&maxOrder)
	if err != nil {
		return 0, fmt.Errorf("get max fansub group media sort_order %d: %w", fansubGroupID, err)
	}
	return maxOrder, nil
}

type FansubGroupMediaCreateInput struct {
	FansubGroupID    int64
	MediaAssetID     int64
	Category         string
	SortOrder        int
	UploadedByUserID *int64
}

func (r *MediaRepository) CreateFansubGroupMediaAsset(ctx context.Context, tx pgx.Tx, input FansubGroupMediaCreateInput) error {
	var uploadedByUserID interface{}
	if input.UploadedByUserID != nil {
		uploadedByUserID = *input.UploadedByUserID
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO fansub_group_media
			(group_id, media_id, category, sort_order, uploaded_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE id = $5), NOW())
	`, input.FansubGroupID, input.MediaAssetID, input.Category, input.SortOrder, uploadedByUserID)
	if err != nil {
		return fmt.Errorf("create fansub_group_media (group_id=%d, media_id=%d): %w", input.FansubGroupID, input.MediaAssetID, err)
	}
	return nil
}

func (r *MediaRepository) UpdateFansubGroupMediaMetadata(ctx context.Context, fansubGroupID, mediaID int64, patch FansubGroupMediaMetadataPatch) error {
	if patch.IsEmpty() {
		return nil
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_media
		SET
			title = CASE WHEN $3 THEN $4 ELSE title END,
			description = CASE WHEN $5 THEN $6 ELSE description END,
			alt_text = CASE WHEN $7 THEN $8 ELSE alt_text END,
			category = COALESCE($9, category),
			sort_order = COALESCE($10, sort_order),
			updated_at = NOW()
		WHERE group_id = $1
		  AND media_id = $2
		  AND deleted_at IS NULL
	`, fansubGroupID, mediaID,
		patch.TitleSet, patch.Title,
		patch.DescriptionSet, patch.Description,
		patch.AltTextSet, patch.AltText,
		patch.Category, patch.SortOrder,
	)
	if err != nil {
		return fmt.Errorf("update fansub_group_media metadata (group_id=%d, media_id=%d): %w", fansubGroupID, mediaID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MediaRepository) SoftDeleteFansubGroupMedia(ctx context.Context, fansubGroupID, mediaID int64, deletedByUserID *int64) error {
	var deletedBy interface{}
	if deletedByUserID != nil {
		deletedBy = *deletedByUserID
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_media
		SET deleted_at = NOW(),
		    deleted_by_user_id = (SELECT id FROM users WHERE id = $3),
		    updated_at = NOW()
		WHERE group_id = $1
		  AND media_id = $2
		  AND deleted_at IS NULL
	`, fansubGroupID, mediaID, deletedBy)
	if err != nil {
		return fmt.Errorf("soft delete fansub_group_media (group_id=%d, media_id=%d): %w", fansubGroupID, mediaID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Release-Version-Medien-Review-Methoden (Phase 78) ---

// UpdateReleaseVersionMediaReview setzt ausschließlich Sichtbarkeit und/oder Reviewstatus
// eines Release-Version-Mediums über die media_assets-Tabelle.
// Die EXISTS-Subquery auf release_version_media stellt die Zugehörigkeit zur Release-Version sicher (IDOR-Schutz).
// Ändert NIEMALS owner_type oder owner_id (D-05, Lock G).
// CR-01: nimmt die laufende Transaktion entgegen, damit der Review-Write atomar mit
// dem release_version_media-Patch committet/rollt (kein Teil-Commit bei Fehler).
func (r *MediaRepository) UpdateReleaseVersionMediaReview(ctx context.Context, tx pgx.Tx, relationID int64, patch FansubMediaReviewPatch) error {
	if patch.Visibility == nil && patch.ReviewStatus == nil {
		return nil
	}

	if patch.Visibility != nil && patch.ReviewStatus != nil {
		dbVis, ok := visibilityAPIToDB[*patch.Visibility]
		if !ok {
			return fmt.Errorf("ungültiger Sichtbarkeitswert: %q", *patch.Visibility)
		}
		dbStatus, ok := reviewStatusAPIToDB[*patch.ReviewStatus]
		if !ok {
			return fmt.Errorf("ungültiger Prüfstatus: %q", *patch.ReviewStatus)
		}
		tag, err := tx.Exec(ctx, `
			UPDATE media_assets ma
			SET
				visibility_id    = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1),
				review_status_id = (SELECT id FROM review_statuses WHERE code = $2 LIMIT 1)
			WHERE ma.id = (
				SELECT rvm.media_asset_id
				FROM release_version_media rvm
				WHERE rvm.id = $3 AND rvm.deleted_at IS NULL
				LIMIT 1
			)
		`, dbVis, dbStatus, relationID)
		if err != nil {
			return fmt.Errorf("update release_version_media review (vis+status, relation_id=%d): %w", relationID, err)
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return nil
	}

	if patch.Visibility != nil {
		dbVis, ok := visibilityAPIToDB[*patch.Visibility]
		if !ok {
			return fmt.Errorf("ungültiger Sichtbarkeitswert: %q", *patch.Visibility)
		}
		tag, err := tx.Exec(ctx, `
			UPDATE media_assets ma
			SET visibility_id = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1)
			WHERE ma.id = (
				SELECT rvm.media_asset_id
				FROM release_version_media rvm
				WHERE rvm.id = $2 AND rvm.deleted_at IS NULL
				LIMIT 1
			)
		`, dbVis, relationID)
		if err != nil {
			return fmt.Errorf("update release_version_media visibility (relation_id=%d): %w", relationID, err)
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return nil
	}

	// Nur ReviewStatus
	dbStatus, ok := reviewStatusAPIToDB[*patch.ReviewStatus]
	if !ok {
		return fmt.Errorf("ungültiger Prüfstatus: %q", *patch.ReviewStatus)
	}
	tag, err := tx.Exec(ctx, `
		UPDATE media_assets ma
		SET review_status_id = (SELECT id FROM review_statuses WHERE code = $1 LIMIT 1)
		WHERE ma.id = (
			SELECT rvm.media_asset_id
			FROM release_version_media rvm
			WHERE rvm.id = $2 AND rvm.deleted_at IS NULL
			LIMIT 1
		)
	`, dbStatus, relationID)
	if err != nil {
		return fmt.Errorf("update release_version_media review_status (relation_id=%d): %w", relationID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
