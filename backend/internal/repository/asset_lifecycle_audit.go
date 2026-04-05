package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/models"
)

const adminAnimeMutationKindAssetLifecycleProvision = "anime.asset_lifecycle.provision"

func buildAssetLifecycleMutationKind(action string) string {
	switch action {
	case "provision":
		return adminAnimeMutationKindAssetLifecycleProvision
	default:
		return "anime.asset_lifecycle." + action
	}
}

func buildAssetLifecycleAuditPayload(entry models.AssetLifecycleAuditEntry) ([]byte, error) {
	return json.Marshal(map[string]any{
		"entity_type": entry.EntityType,
		"entity_id":   entry.EntityID,
		"asset_type":  entry.AssetType,
		"action":      entry.Action,
		"outcome":     entry.Outcome,
		"details":     entry.Details,
	})
}

func (r *AssetLifecycleRepository) RecordAssetLifecycleEvent(
	ctx context.Context,
	entry models.AssetLifecycleAuditEntry,
) error {
	if entry.ActorUserID <= 0 {
		return fmt.Errorf("record asset lifecycle event: actor user id is required")
	}
	if normalizeAssetLifecycleEntityType(entry.EntityType) != "anime" {
		return fmt.Errorf("record asset lifecycle event: unsupported entity type %q", entry.EntityType)
	}

	payload, err := buildAssetLifecycleAuditPayload(entry)
	if err != nil {
		return fmt.Errorf("record asset lifecycle event: marshal payload: %w", err)
	}

	_, err = r.db.Exec(
		ctx,
		`
		INSERT INTO admin_anime_mutation_audit (anime_id, actor_user_id, mutation_kind, request_payload)
		VALUES ($1, $2, $3, $4)
		`,
		entry.EntityID,
		entry.ActorUserID,
		buildAssetLifecycleMutationKind(entry.Action),
		payload,
	)
	if err != nil {
		return fmt.Errorf("record asset lifecycle event anime=%d action=%s: %w", entry.EntityID, entry.Action, err)
	}
	return nil
}
