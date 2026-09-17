package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"team4s.v3/backend/internal/models"
)

// GetMediaFileByFilename löst gespeicherte Datei-Varianten (z. B. source_original) über
// media_files auf. Diese Dateien werden über dieselbe öffentliche Route
// /api/v1/media/files/<name> ausgeliefert wie die Hauptdatei, stehen aber nicht in
// media_assets.file_path. Der Mime-Typ wird nicht vom Hauptmedium übernommen, weil
// Variante und Hauptdatei unterschiedliche Formate haben können.
func (r *MediaRepository) GetMediaFileByFilename(ctx context.Context, filename string) (*models.MediaAsset, error) {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return nil, ErrNotFound
	}

	var item models.MediaAsset
	if err := r.db.QueryRow(ctx, `
		SELECT mf.media_id, mf.path, ma.created_at
		FROM media_files mf
		JOIN media_assets ma ON ma.id = mf.media_id
		WHERE mf.path = $1
		   OR mf.path LIKE $2
		   OR mf.path LIKE $3
		ORDER BY mf.id DESC
		LIMIT 1
	`, trimmed, "%/"+trimmed, "%\\"+trimmed).Scan(
		&item.ID,
		&item.StoragePath,
		&item.CreatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get media file by filename %q: %w", filename, err)
	}

	item.StoragePath = r.resolveReadableStoragePath(item.StoragePath)
	item.Filename = mediaFilename(item.StoragePath)
	item.PublicURL = r.buildPublicURL(item.Filename)
	return &item, nil
}
