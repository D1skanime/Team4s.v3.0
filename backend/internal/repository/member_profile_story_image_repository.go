package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"team4s.v3/backend/internal/models"
)

// InsertStoryImageAsset schreibt einen neuen media_assets-Eintrag mit owner_member_id
// (file_path = Anzeige-Datei, unveraenderte Feldbedeutung von FilePath). Wenn
// input.OriginalFilePath gesetzt ist (NEUE Uploads ab Phase 173-06, D-15), wird zusaetzlich
// eine media_files variant='original'-Zeile mit dem echten 1:1-Original angelegt -- beide
// Inserts laufen in EINER Transaktion, damit niemals eine Anzeige-Datei ohne verzeichnetes
// Original (oder umgekehrt) in der DB landet. Bestehende (Vor-Phase) Story-Bild-Zeilen haben
// kein media_files-Kind und bleiben von diesem Codepfad komplett unberuehrt (D-15: "ein
// echtes Original existiert fuer sie nicht mehr" -- 173-07s Backfill-CLI ergaenzt fuer sie
// stattdessen eine 'display'-Zeile, die ihre vorhandene Datei wiederverwendet).
// Gibt die neue ID zurueck.
func (r *MemberProfileRepository) InsertStoryImageAsset(
	ctx context.Context,
	input models.StoryImageUploadInput,
) (int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, fmt.Errorf("begin insert story image asset tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO media_assets (file_path, mime_type, format, status, owner_member_id, created_at)
		VALUES ($1, $2, 'image', 'ready', $3, NOW())
		RETURNING id
	`, input.FilePath, input.MimeType, input.OwnerMemberID).Scan(&id); err != nil {
		return 0, fmt.Errorf("insert story image asset for member %d: %w", input.OwnerMemberID, err)
	}

	if strings.TrimSpace(input.OriginalFilePath) != "" {
		if _, err := tx.Exec(ctx, `
			INSERT INTO media_files (media_id, variant, path, width, height, size)
			VALUES ($1, 'original', $2, $3, $4, $5)
		`, id, input.OriginalFilePath, input.OriginalWidth, input.OriginalHeight, input.OriginalSizeBytes); err != nil {
			return 0, fmt.Errorf("insert story image original media file for asset %d: %w", id, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit insert story image asset tx: %w", err)
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

// GetStoryImageAssetByID laedt ein einzelnes Story-Bild-Asset nach ID.
// Beschraenkt auf Story-Assets (owner_member_id IS NOT NULL), damit der oeffentliche
// Resolver keine beliebigen media_assets ausliefert. ErrNotFound wenn nicht vorhanden.
func (r *MemberProfileRepository) GetStoryImageAssetByID(
	ctx context.Context,
	assetID int64,
) (*models.StoryImageAssetRef, error) {
	var item models.StoryImageAssetRef
	err := r.db.QueryRow(ctx, `
		SELECT id, file_path, owner_member_id
		FROM media_assets
		WHERE id = $1 AND owner_member_id IS NOT NULL
	`, assetID).Scan(&item.ID, &item.FilePath, &item.OwnerMemberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get story image asset %d: %w", assetID, err)
	}
	return &item, nil
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
