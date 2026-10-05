package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// This file holds the generic V2 media-link dispatch infrastructure shared across
// cover/banner/logo/background(+video) asset types (174-19). The three
// *SingularAssetV2 entry points (applyProviderSingularAssetV2, assignManualSingularAssetV2,
// clearSingularAssetV2) and their supporting primitives are called into from the
// type-specific sibling files as same-package functions -- no duplication, no import needed.

type animeAssetLinkSpec struct {
	Slot      string
	MediaType string
	Singular  bool
}

var animeAssetLinkSpecs = map[string]animeAssetLinkSpec{
	"cover":            {Slot: "cover", MediaType: "poster", Singular: true},
	"banner":           {Slot: "banner", MediaType: "banner", Singular: true},
	"logo":             {Slot: "logo", MediaType: "logo", Singular: true},
	"background":       {Slot: "background", MediaType: "background", Singular: false},
	"background_video": {Slot: "background_video", MediaType: "video", Singular: true},
}

func lookupAnimeAssetLinkSpec(slot string) (animeAssetLinkSpec, bool) {
	spec, ok := animeAssetLinkSpecs[strings.TrimSpace(strings.ToLower(slot))]
	return spec, ok
}

func validateAnimeAssetLinkMediaType(spec animeAssetLinkSpec, mediaType string) error {
	if spec.MediaType == strings.TrimSpace(strings.ToLower(mediaType)) {
		return nil
	}
	return ErrAnimeAssetMediaTypeMismatch
}

func (r *AnimeAssetRepository) applyProviderSingularAssetV2(ctx context.Context, animeID int64, mediaType string, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime %s provider v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	if manual, err := hasManualAnimeMediaByType(ctx, tx, animeID, mediaType); err != nil {
		return err
	} else if manual {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if err := removeAnimeMediaLinksByType(ctx, tx, animeID, mediaType); err != nil {
			return err
		}
	} else {
		mediaID, err := ensureProviderAnimeMediaV2(ctx, tx, mediaType, input)
		if err != nil {
			return err
		}
		if err := removeAnimeMediaLinksByType(ctx, tx, animeID, mediaType); err != nil {
			return err
		}
		if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime %s provider v2 tx: %w", mediaType, err)
	}
	return nil
}

func (r *AnimeAssetRepository) assignManualSingularAssetV2(ctx context.Context, animeID int64, mediaRef string, mediaType string) error {
	spec, ok := lookupAnimeAssetLinkSpec(mediaType)
	if !ok || !spec.Singular {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin assign anime %s v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), spec.MediaType)
	if err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, spec.MediaType); err != nil {
		return err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit assign anime %s v2 tx: %w", mediaType, err)
	}
	return nil
}

func (r *AnimeAssetRepository) clearSingularAssetV2(ctx context.Context, animeID int64, mediaType string) error {
	spec, ok := lookupAnimeAssetLinkSpec(mediaType)
	if !ok || !spec.Singular {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin clear anime %s v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, spec.MediaType); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit clear anime %s v2 tx: %w", mediaType, err)
	}
	return nil
}

func loadV2AnimeMediaIDByRef(ctx context.Context, tx pgx.Tx, mediaRef string, mediaType string) (int64, error) {
	trimmedMediaRef := strings.TrimSpace(mediaRef)
	if trimmedMediaRef == "" {
		return 0, ErrNotFound
	}

	var mediaID int64
	var actualMediaType string
	if err := tx.QueryRow(ctx, `
		SELECT ma.id, COALESCE(mt.name, '')
		FROM media_assets ma
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		WHERE ma.id::text = $1
		LIMIT 1
	`, trimmedMediaRef).Scan(&mediaID, &actualMediaType); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("load v2 anime %s media ref %q: %w", mediaType, trimmedMediaRef, err)
	}
	if err := validateAnimeAssetLinkMediaType(animeAssetLinkSpec{MediaType: mediaType}, actualMediaType); err != nil {
		return 0, err
	}

	return mediaID, nil
}

func upsertAnimeMediaLink(ctx context.Context, tx pgx.Tx, animeID int64, mediaID int64, sortOrder int32) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO anime_media (anime_id, media_id, sort_order)
		VALUES ($1, $2, $3)
		ON CONFLICT (anime_id, media_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
	`, animeID, mediaID, sortOrder); err != nil {
		return fmt.Errorf("link anime media anime=%d media=%d: %w", animeID, mediaID, err)
	}
	return nil
}

func removeAnimeMediaLinksByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) error {
	if _, err := tx.Exec(ctx, `
		DELETE FROM anime_media am
		USING media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND mt.name = $2
	`, animeID, mediaType); err != nil {
		return fmt.Errorf("remove anime %s links %d: %w", mediaType, animeID, err)
	}
	return nil
}

func hasManualAnimeMediaByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) (bool, error) {
	var hasManual bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN media_external me ON me.media_id = ma.id
			WHERE am.anime_id = $1
			  AND mt.name = $2
			  AND me.id IS NULL
		)
	`, animeID, mediaType).Scan(&hasManual); err != nil {
		return false, fmt.Errorf("check anime %s manual ownership %d: %w", mediaType, animeID, err)
	}
	return hasManual, nil
}

func ensureProviderAnimeMediaV2(ctx context.Context, tx pgx.Tx, mediaType string, input *models.AnimeProviderAssetInput) (int64, error) {
	if input == nil || strings.TrimSpace(input.URL) == "" {
		return 0, ErrNotFound
	}

	external := buildJellyfinMediaExternal(input.URL)
	if external == nil {
		providerKey := strings.TrimSpace(input.ProviderKey)
		if providerKey == "" {
			providerKey = strings.TrimSpace(input.URL)
		}
		external = &mediaExternalRef{
			Provider:     "jellyfin",
			ExternalID:   providerKey,
			ExternalType: mediaType,
		}
	} else if strings.TrimSpace(input.ProviderKey) != "" {
		external.ExternalID = strings.TrimSpace(input.ProviderKey)
		external.ExternalType = mediaType
	}

	mediaTypeID, err := loadAnimeMediaTypeID(ctx, tx, mediaType)
	if err != nil {
		return 0, err
	}

	var mediaID int64
	format, mimeType := providerAnimeMediaMetadata(mediaType, input.URL)
	if err := tx.QueryRow(ctx, `
		SELECT media_id
		FROM media_external
		WHERE provider = $1 AND external_id = $2 AND external_type = $3
		LIMIT 1
	`, external.Provider, external.ExternalID, external.ExternalType).Scan(&mediaID); errors.Is(err, pgx.ErrNoRows) {
		if err := tx.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, mediaTypeID, strings.TrimSpace(input.URL), mimeType, format).Scan(&mediaID); err != nil {
			return 0, fmt.Errorf("create provider anime %s media: %w", mediaType, err)
		}
	} else if err != nil {
		return 0, fmt.Errorf("load provider anime %s media: %w", mediaType, err)
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE media_assets
			SET media_type_id = $2, file_path = $3, mime_type = $4, format = $5, modified_at = NOW()
			WHERE id = $1
		`, mediaID, mediaTypeID, strings.TrimSpace(input.URL), mimeType, format); err != nil {
			return 0, fmt.Errorf("update provider anime %s media %d: %w", mediaType, mediaID, err)
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO media_external (media_id, provider, external_id, external_type, metadata)
		VALUES ($1, $2, $3, $4, NULL)
		ON CONFLICT (provider, external_id, external_type)
		DO UPDATE SET media_id = EXCLUDED.media_id
	`, mediaID, external.Provider, external.ExternalID, external.ExternalType); err != nil {
		return 0, fmt.Errorf("link provider anime %s media %d: %w", mediaType, mediaID, err)
	}

	return mediaID, nil
}

func providerAnimeMediaMetadata(mediaType string, rawURL string) (format string, mimeType string) {
	if mediaType == "video" {
		return "video", "video/mp4"
	}
	mimeType, imageFormat := inferImageMetadata(rawURL)
	return imageFormat, mimeType
}

func loadAnimeMediaTypeID(ctx context.Context, tx pgx.Tx, mediaType string) (int64, error) {
	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = $1
		LIMIT 1
	`, mediaType).Scan(&mediaTypeID); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("load media type %q: %w", mediaType, err)
	}
	return mediaTypeID, nil
}
