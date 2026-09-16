package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// upsertNormalizedReleaseStream stellt sicher, dass pro Variant + Stream-Typ
// genau ein sprachloser Episode-Stream existiert. Hintergrund: der bestehende
// UNIQUE-Index mit NULL-Spalten verhindert keine Duplikate.
func upsertNormalizedReleaseStream(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	streamTypeID int64,
	streamSourceID int64,
	jellyfinItemID string,
) error {
	var existingID int64
	err := tx.QueryRow(ctx, `
		SELECT rs.id
		FROM release_streams rs
		LEFT JOIN stream_sources ss ON ss.id=rs.stream_source_id
		WHERE rs.variant_id = $1
		  AND stream_type_id = $2
		  AND audio_language_id IS NULL
		  AND subtitle_language_id IS NULL
		ORDER BY CASE WHEN ss.provider_type='jellyfin' THEN 0 ELSE 1 END, rs.id
		LIMIT 1
		FOR UPDATE OF rs
	`, variantID, streamTypeID).Scan(&existingID)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("lookup normalized release stream variant=%d: %w", variantID, err)
	}

	if err == pgx.ErrNoRows {
		if _, insertErr := tx.Exec(ctx, `
			INSERT INTO release_streams (variant_id, stream_type_id, stream_source_id, jellyfin_item_id, modified_at, updated_at)
			VALUES ($1, $2, $3, COALESCE((SELECT external_id FROM stream_sources WHERE id=$3 AND provider_type='jellyfin'),NULLIF($4,'')), NOW(), NOW())
		`, variantID, streamTypeID, streamSourceID, jellyfinItemID); insertErr != nil {
			return fmt.Errorf("insert normalized release stream variant=%d: %w", variantID, insertErr)
		}
		return nil
	}

	if _, updateErr := tx.Exec(ctx, `
		UPDATE release_streams
		SET stream_source_id = $1,
		    jellyfin_item_id = COALESCE((SELECT external_id FROM stream_sources WHERE id=$1 AND provider_type='jellyfin'),NULLIF($2,'')),
		    modified_at = NOW(),
		    updated_at = NOW()
		WHERE id = $3
	`, streamSourceID, jellyfinItemID, existingID); updateErr != nil {
		return fmt.Errorf("update normalized release stream variant=%d id=%d: %w", variantID, existingID, updateErr)
	}

	if _, deleteErr := tx.Exec(ctx, `
		DELETE FROM release_streams
		WHERE variant_id = $1
		  AND stream_type_id = $2
		  AND audio_language_id IS NULL
		  AND subtitle_language_id IS NULL
		  AND id <> $3
	`, variantID, streamTypeID, existingID); deleteErr != nil {
		return fmt.Errorf("dedupe normalized release stream variant=%d keep=%d: %w", variantID, existingID, deleteErr)
	}

	return nil
}
