package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

const (
	adminAnimeMutationKindCreate      = "anime.create"
	adminAnimeMutationKindUpdate      = "anime.update"
	adminAnimeMutationKindCoverRemove = "anime.cover.remove"
)

type adminAnimeAuditEntry struct {
	AnimeID        int64
	ActorUserID    int64
	MutationKind   string
	RequestPayload []byte
}

func buildAdminAnimeAuditEntryForCreate(
	actorUserID int64,
	animeID int64,
	input models.AdminAnimeCreateInput,
) (adminAnimeAuditEntry, error) {
	payload, err := json.Marshal(map[string]any{
		"title":        input.Title,
		"title_de":     input.TitleDE,
		"title_en":     input.TitleEN,
		"type":         input.Type,
		"content_type": input.ContentType,
		"status":       input.Status,
		"year":         input.Year,
		"max_episodes": input.MaxEpisodes,
		"genre":        input.Genre,
		"description":  input.Description,
		"cover_image":  input.CoverImage,
	})
	if err != nil {
		return adminAnimeAuditEntry{}, fmt.Errorf("marshal anime create audit payload: %w", err)
	}

	return adminAnimeAuditEntry{
		AnimeID:        animeID,
		ActorUserID:    actorUserID,
		MutationKind:   adminAnimeMutationKindCreate,
		RequestPayload: payload,
	}, nil
}

func buildAdminAnimeAuditEntryForPatch(
	actorUserID int64,
	animeID int64,
	input models.AdminAnimePatchInput,
) (adminAnimeAuditEntry, error) {
	payload, err := json.Marshal(map[string]any{
		"title":        optionalStringJSONValue(input.Title),
		"title_de":     optionalStringJSONValue(input.TitleDE),
		"title_en":     optionalStringJSONValue(input.TitleEN),
		"type":         optionalStringJSONValue(input.Type),
		"content_type": optionalStringJSONValue(input.ContentType),
		"status":       optionalStringJSONValue(input.Status),
		"year":         optionalInt16JSONValue(input.Year),
		"max_episodes": optionalInt16JSONValue(input.MaxEpisodes),
		"genre":        optionalStringJSONValue(input.Genre),
		"description":  optionalStringJSONValue(input.Description),
		"cover_image":  optionalStringJSONValue(input.CoverImage),
	})
	if err != nil {
		return adminAnimeAuditEntry{}, fmt.Errorf("marshal anime patch audit payload: %w", err)
	}

	return adminAnimeAuditEntry{
		AnimeID:        animeID,
		ActorUserID:    actorUserID,
		MutationKind:   resolveAdminAnimePatchMutationKind(input),
		RequestPayload: payload,
	}, nil
}

func resolveAdminAnimePatchMutationKind(input models.AdminAnimePatchInput) string {
	if input.CoverImage.Set && input.CoverImage.Value == nil {
		return adminAnimeMutationKindCoverRemove
	}

	return adminAnimeMutationKindUpdate
}

func insertAdminAnimeAuditEntry(ctx context.Context, tx pgx.Tx, entry adminAnimeAuditEntry) error {
	if entry.ActorUserID <= 0 {
		return fmt.Errorf("insert anime audit entry anime=%d: actor user id is required", entry.AnimeID)
	}

	if _, err := tx.Exec(
		ctx,
		`
		INSERT INTO admin_anime_mutation_audit (anime_id, actor_user_id, mutation_kind, request_payload)
		VALUES ($1, $2, $3, $4)
		`,
		entry.AnimeID,
		entry.ActorUserID,
		entry.MutationKind,
		entry.RequestPayload,
	); err != nil {
		return fmt.Errorf("insert anime audit entry anime=%d kind=%s: %w", entry.AnimeID, entry.MutationKind, err)
	}

	return nil
}

func optionalStringJSONValue(value models.OptionalString) any {
	if !value.Set {
		return nil
	}
	if value.Value == nil {
		return nil
	}

	return *value.Value
}

func optionalInt16JSONValue(value models.OptionalInt16) any {
	if !value.Set {
		return nil
	}
	if value.Value == nil {
		return nil
	}

	return *value.Value
}
