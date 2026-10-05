package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// 174-19: split out of anime_assets_background.go to keep both files under the
// project's 450-line modularity ceiling (CLAUDE.md). This file holds the
// provider-reconciliation plan builder and supporting types for the (plural)
// background slot, used by both the legacy and V2 ApplyProviderBackgrounds paths
// in anime_assets_background.go.

type storedAnimeBackgroundAsset struct {
	ID          int64
	Source      string
	ProviderKey *string
	SortOrder   int32
}

type animeProviderBackgroundUpdate struct {
	ID  int64
	URL string
}

type animeProviderBackgroundInsert struct {
	URL         string
	ProviderKey string
	SortOrder   int32
}

type animeProviderBackgroundPlan struct {
	Updates   []animeProviderBackgroundUpdate
	Inserts   []animeProviderBackgroundInsert
	DeleteIDs []int64
}

func reconcileAnimeProviderBackgrounds(
	existing []storedAnimeBackgroundAsset,
	incoming []models.AnimeProviderAssetInput,
) animeProviderBackgroundPlan {
	plan := animeProviderBackgroundPlan{
		Updates:   make([]animeProviderBackgroundUpdate, 0),
		Inserts:   make([]animeProviderBackgroundInsert, 0),
		DeleteIDs: make([]int64, 0),
	}

	existingByKey := make(map[string]storedAnimeBackgroundAsset)
	maxSort := int32(-1)
	for _, item := range existing {
		if item.SortOrder > maxSort {
			maxSort = item.SortOrder
		}
		if strings.TrimSpace(item.Source) != string(models.AnimeAssetOwnershipProvider) {
			continue
		}
		key := strings.TrimSpace(derefString(item.ProviderKey))
		if key == "" {
			plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
			continue
		}
		existingByKey[key] = item
	}

	seen := make(map[string]struct{})
	for _, candidate := range incoming {
		key := strings.TrimSpace(candidate.ProviderKey)
		urlValue := strings.TrimSpace(candidate.URL)
		if key == "" || urlValue == "" {
			continue
		}
		seen[key] = struct{}{}

		if existingItem, ok := existingByKey[key]; ok {
			plan.Updates = append(plan.Updates, animeProviderBackgroundUpdate{
				ID:  existingItem.ID,
				URL: urlValue,
			})
			continue
		}

		maxSort++
		plan.Inserts = append(plan.Inserts, animeProviderBackgroundInsert{
			URL:         urlValue,
			ProviderKey: key,
			SortOrder:   maxSort,
		})
	}

	for key, item := range existingByKey {
		if _, ok := seen[key]; ok {
			continue
		}
		plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
	}

	return plan
}

// upsertBackgroundMediaExternal speichert die Provider-Herkunft eines Background-Assets
// in media_external. providerKey hat das Format "source:external_id" (z.B. "tmdb:12345").
// Wenn kein Doppelpunkt gefunden wird, wird der gesamte Wert als external_id mit
// provider="unknown" gespeichert.
func upsertBackgroundMediaExternal(ctx context.Context, tx pgx.Tx, mediaID int64, providerKey string) error {
	provider := "unknown"
	externalID := providerKey
	if idx := strings.Index(providerKey, ":"); idx > 0 {
		provider = providerKey[:idx]
		externalID = providerKey[idx+1:]
	}

	_, err := tx.Exec(ctx, `
		INSERT INTO media_external (media_id, provider, external_id, external_type, metadata)
		VALUES ($1, $2, $3, 'background', NULL)
		ON CONFLICT (provider, external_id, external_type)
		DO UPDATE SET media_id = EXCLUDED.media_id
	`, mediaID, provider, externalID)
	if err != nil {
		return fmt.Errorf("upsert background media external media=%d provider=%s: %w", mediaID, provider, err)
	}
	return nil
}
