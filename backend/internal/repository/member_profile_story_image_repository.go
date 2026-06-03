package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// InsertStoryImageAsset schreibt einen neuen media_assets-Eintrag mit owner_member_id.
// Gibt die neue ID zurueck.
func (r *MemberProfileRepository) InsertStoryImageAsset(
	ctx context.Context,
	input models.StoryImageUploadInput,
) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO media_assets (file_path, mime_type, format, status, owner_member_id, created_at)
		VALUES ($1, $2, 'image', 'ready', $3, NOW())
		RETURNING id
	`, input.FilePath, input.MimeType, input.OwnerMemberID).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert story image asset for member %d: %w", input.OwnerMemberID, err)
	}
	return id, nil
}

// GetStoryImageAssetsByMember laedt alle media_assets mit owner_member_id == memberID.
// Wird fuer den Referenz-Diff in Cleanup-on-Save verwendet.
func (r *MemberProfileRepository) GetStoryImageAssetsByMember(
	ctx context.Context,
	memberID int64,
) ([]models.StoryImageAssetRef, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, file_path, owner_member_id
		FROM media_assets
		WHERE owner_member_id = $1
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("get story image assets for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.StoryImageAssetRef, 0)
	for rows.Next() {
		var item models.StoryImageAssetRef
		if err := rows.Scan(&item.ID, &item.FilePath, &item.OwnerMemberID); err != nil {
			return nil, fmt.Errorf("scan story image asset row for member %d: %w", memberID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate story image assets for member %d: %w", memberID, err)
	}
	return items, nil
}

// DeleteStoryImageAsset loescht eine media_assets-Zeile nach ID.
// Der owner_member_id-Check im Query stellt sicher, dass nur eigene Assets geloescht werden (IDOR-Schutz).
func (r *MemberProfileRepository) DeleteStoryImageAsset(
	ctx context.Context,
	assetID int64,
	ownerMemberID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM media_assets
		WHERE id = $1 AND owner_member_id = $2
	`, assetID, ownerMemberID)
	if err != nil {
		return fmt.Errorf("delete story image asset %d for member %d: %w", assetID, ownerMemberID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
