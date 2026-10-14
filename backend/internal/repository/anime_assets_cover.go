package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AnimeAssetRepository) AssignManualCover(ctx context.Context, animeID int64, mediaID string) error {
	return r.assignManualCoverV2(ctx, animeID, mediaID)
}

func (r *AnimeAssetRepository) ClearCover(ctx context.Context, animeID int64) error {
	_, err := r.ClearCoverWithResult(ctx, animeID)
	return err
}

func (r *AnimeAssetRepository) ClearCoverWithResult(
	ctx context.Context,
	animeID int64,
) (*models.AnimeAssetRemovalResult, error) {
	return r.clearCoverV2(ctx, animeID)
}

func (r *AnimeAssetRepository) assignManualCoverV2(ctx context.Context, animeID int64, mediaRef string) error {
	trimmedMediaRef := strings.TrimSpace(mediaRef)
	if trimmedMediaRef == "" {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin assign anime cover v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return err
	}
	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, trimmedMediaRef, "poster")
	if err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "poster"); err != nil {
		return err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
		return err
	}
	if err := syncLegacyAnimeCoverImageV2(ctx, tx, animeID, mediaID, schema); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit assign anime cover v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) clearCoverV2(
	ctx context.Context,
	animeID int64,
) (*models.AnimeAssetRemovalResult, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin clear anime cover v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return nil, err
	}
	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}
	result, err := removeAnimePosterAssetsV2(ctx, tx, animeID, schema)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit clear anime cover v2 tx: %w", err)
	}
	return result, nil
}

func removeAnimePosterAssetsV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	schema animeV2SchemaInfo,
) (*models.AnimeAssetRemovalResult, error) {
	// 173-05 Task 0 (Regressionsfix): "original zuerst" statt "display zuerst" -- der hier
	// aufgeloeste Pfad fliesst in result.RemovedPaths und (ueber syncLegacyAnimeCoverImageV2) in
	// die Legacy-Spalte anime.cover_image, gegen die resolveOrphanedLocalCoverImageV2 per exaktem
	// String-Vergleich media_assets.file_path = cover_image prueft. media_assets.file_path
	// speichert IMMER den Original-Pfad (nie den display-Pfad), daher haette eine
	// Display-Praeferenz hier cover_image staendig als "verwaist" fehlklassifiziert und zu
	// faelschlicher Loeschung gefuehrt. Display-Praeferenz bleibt ausschliesslich in
	// Public-Lesepfaden (z. B. getResolvedAssetsV2) erhalten.
	rows, err := tx.Query(ctx, `
		SELECT
			ma.id,
			COALESCE(mf.path, ma.file_path) AS resolved_path
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN LATERAL (
			SELECT path
			FROM media_files
			WHERE media_id = ma.id
			ORDER BY
				CASE WHEN variant = 'original' THEN 0 WHEN variant = 'display' THEN 1 ELSE 2 END,
				id ASC
			LIMIT 1
		) mf ON true
		WHERE am.anime_id = $1
		  AND mt.name = 'poster'
		ORDER BY am.sort_order ASC, ma.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime poster assets %d: %w", animeID, err)
	}
	defer rows.Close()

	type posterAsset struct {
		mediaID int64
		path    string
	}
	assets := make([]posterAsset, 0)
	for rows.Next() {
		var item posterAsset
		if err := rows.Scan(&item.mediaID, &item.path); err != nil {
			return nil, fmt.Errorf("scan anime poster asset %d: %w", animeID, err)
		}
		assets = append(assets, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime poster assets %d: %w", animeID, err)
	}

	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "poster"); err != nil {
		return nil, err
	}
	if schema.HasCoverImage {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET cover_image = NULL, updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return nil, fmt.Errorf("clear legacy anime cover image %d: %w", animeID, err)
		}
	}

	result := &models.AnimeAssetRemovalResult{RemovedPaths: make([]string, 0, len(assets))}
	for _, asset := range assets {
		var stillReferenced bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1
				FROM anime_media
				WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM episode_media WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM fansub_group_media WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM release_media WHERE media_id = $1
			)
		`, asset.mediaID).Scan(&stillReferenced); err != nil {
			return nil, fmt.Errorf("check poster media references anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if stillReferenced {
			continue
		}

		if _, err := tx.Exec(ctx, `DELETE FROM media_external WHERE media_id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media external anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media files anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media asset anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}

		if strings.TrimSpace(asset.path) != "" {
			result.RemovedPaths = append(result.RemovedPaths, strings.TrimSpace(asset.path))
		}
	}

	return result, nil
}

func syncLegacyAnimeCoverImageV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	mediaID int64,
	schema animeV2SchemaInfo,
) error {
	if !schema.HasCoverImage {
		return nil
	}

	// 173-05 Task 0 (Regressionsfix): "original zuerst", s. ausfuehrlichen Kommentar in
	// removeAnimePosterAssetsV2 -- dieselbe Begruendung gilt hier, da beide Funktionen dieselbe
	// Legacy-Spalte anime.cover_image gegen media_assets.file_path (immer Original-Pfad) abgleichen.
	var coverPath string
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(mf.path, ma.file_path)
		FROM media_assets ma
		LEFT JOIN LATERAL (
			SELECT path
			FROM media_files
			WHERE media_id = ma.id
			ORDER BY
				CASE WHEN variant = 'original' THEN 0 WHEN variant = 'display' THEN 1 ELSE 2 END,
				id ASC
			LIMIT 1
		) mf ON true
		WHERE ma.id = $1
	`, mediaID).Scan(&coverPath); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("load legacy anime cover image path %d: %w", mediaID, err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE anime
		SET cover_image = $2, updated_at = NOW()
		WHERE id = $1
	`, animeID, strings.TrimSpace(coverPath)); err != nil {
		return fmt.Errorf("sync legacy anime cover image %d: %w", animeID, err)
	}

	return nil
}

func (r *AnimeAssetRepository) ApplyProviderCover(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime cover provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentSource *string
	if err := tx.QueryRow(ctx, `
		SELECT cover_source
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&currentSource); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime cover row %d: %w", animeID, err)
	}

	if strings.TrimSpace(derefString(currentSource)) == string(models.AnimeAssetOwnershipManual) {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = NULL,
				cover_resolved_url = NULL,
				cover_provider_key = NULL,
				cover_image = NULL,
				updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return fmt.Errorf("clear provider anime cover %d: %w", animeID, err)
		}
	} else {
		trimmedURL := strings.TrimSpace(input.URL)
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = 'provider',
				cover_resolved_url = $2,
				cover_provider_key = $3,
				cover_image = $2,
				updated_at = NOW()
			WHERE id = $1
		`, animeID, trimmedURL, strings.TrimSpace(input.ProviderKey)); err != nil {
			return fmt.Errorf("apply provider anime cover %d: %w", animeID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime cover provider tx: %w", err)
	}
	return nil
}
