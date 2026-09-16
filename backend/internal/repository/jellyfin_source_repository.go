package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/models"
)

// GetJellyfinSourceBindings uses one batch query and preserves all siblings.
// Item ownership remains external_id; physical identity lives in the namespace.
func (r *EpisodeImportRepository) GetJellyfinSourceBindings(ctx context.Context, itemIDs []string) (map[models.JellyfinSourceKey]models.JellyfinSourceSnapshot, error) {
	result := make(map[models.JellyfinSourceKey]models.JellyfinSourceSnapshot)
	if len(itemIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Query(ctx, `SELECT external_id,metadata->'jellyfin_source' FROM stream_sources
 WHERE provider_type='jellyfin' AND external_id=ANY($1::text[])
 AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source'<>'null'::jsonb`, itemIDs)
	if err != nil {
		return nil, fmt.Errorf("read jellyfin source bindings: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var itemID string
		var raw []byte
		if err := rows.Scan(&itemID, &raw); err != nil {
			return nil, err
		}
		snapshot, err := decodeSelectedJellyfinSource(raw)
		if err != nil {
			return nil, err
		}
		key := models.JellyfinSourceKey{ItemID: itemID, SourceID: snapshot.MediaSourceID}
		if _, exists := result[key]; exists {
			return nil, ErrConflict
		}
		result[key] = *snapshot
	}
	return result, rows.Err()
}

// Advisory locks also protect absent rows. Import callers acquire their full
// source set in sorted order before writing any release graph.
func lockJellyfinSource(ctx context.Context, tx pgx.Tx, sourceID string) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "jellyfin-source:"+sourceID)
	return err
}

func upsertStreamSourceSnapshot(ctx context.Context, tx pgx.Tx, provider, itemID string, streamURL *string, next *models.JellyfinSourceSnapshot) (int64, error) {
	if next == nil {
		var id int64
		err := tx.QueryRow(ctx, `INSERT INTO stream_sources(provider_type,external_id,url) VALUES($1,$2,$3)
  ON CONFLICT(provider_type,external_id) WHERE provider_type<>'jellyfin' OR metadata->'jellyfin_source' IS NULL OR metadata->'jellyfin_source'='null'::jsonb
  DO UPDATE SET url=COALESCE(EXCLUDED.url,stream_sources.url) RETURNING id`, provider, itemID, streamURL).Scan(&id)
		return id, err
	}
	if provider != "jellyfin" || strings.TrimSpace(itemID) == "" || next.Version != 1 || strings.TrimSpace(next.MediaSourceID) == "" {
		return 0, ErrConflict
	}
	if err := lockJellyfinSource(ctx, tx, next.MediaSourceID); err != nil {
		return 0, err
	}
	var id int64
	var owner string
	var raw []byte
	err := tx.QueryRow(ctx, `SELECT id,external_id,metadata->'jellyfin_source' FROM stream_sources
 WHERE provider_type='jellyfin' AND metadata#>>'{jellyfin_source,media_source_id}'=$1
 AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source'<>'null'::jsonb FOR UPDATE`, next.MediaSourceID).Scan(&id, &owner, &raw)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	stored, decodeErr := decodeSelectedJellyfinSource(raw)
	if decodeErr != nil {
		return 0, decodeErr
	}
	if stored != nil && (!sameJellyfinSourceBinding(*stored, *next) || (owner != itemID && normalizeSourcePath(stored.SourcePath) == "")) {
		return 0, ErrConflict
	}
	if id == 0 {
		// An unresolved existing Item may be established only from its linked physical
		// filename evidence. A mismatch is another sibling; ambiguity fails closed.
		var unresolvedID int64
		err = tx.QueryRow(ctx, `SELECT id FROM stream_sources WHERE provider_type='jellyfin' AND external_id=$1
   AND (metadata->'jellyfin_source' IS NULL OR metadata->'jellyfin_source'='null'::jsonb) FOR UPDATE`, itemID).Scan(&unresolvedID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return 0, err
		}
		if err == nil {
			var linked, matching, unknown int
			err = tx.QueryRow(ctx, `SELECT COUNT(*),COUNT(*) FILTER(WHERE rv.filename=$2),COUNT(*) FILTER(WHERE NULLIF(BTRIM(rv.filename),'') IS NULL)
   FROM release_streams rs JOIN release_variants rv ON rv.id=rs.variant_id WHERE rs.stream_source_id=$1`, unresolvedID, path.Base(normalizeSourcePath(next.SourcePath))).Scan(&linked, &matching, &unknown)
			if err != nil {
				return 0, err
			}
			if unknown > 0 || (matching > 0 && matching != linked) {
				return 0, ErrConflict
			}
			if linked > 0 && matching == linked && !next.SourceFileNameUnique {
				return 0, ErrConflict
			}
			if linked == 0 || matching == linked {
				id = unresolvedID
				owner = itemID
			}
		}
	}
	snapshot := *next
	if !snapshot.StreamsComplete {
		if stored == nil || !stored.StreamsComplete {
			return 0, fmt.Errorf("incomplete jellyfin source: %w", ErrConflict)
		}
		snapshot.AudioTracks = stored.AudioTracks
		snapshot.SubtitleTracks = stored.SubtitleTracks
		snapshot.SelectedAudioIndex = stored.SelectedAudioIndex
		snapshot.StreamsComplete = true
	}
	data, err := json.Marshal(snapshot)
	if err != nil {
		return 0, err
	}
	if id == 0 {
		err = tx.QueryRow(ctx, `INSERT INTO stream_sources(provider_type,external_id,url,metadata)
   VALUES('jellyfin',$1,$2,jsonb_build_object('jellyfin_source',$3::jsonb)) RETURNING id`, itemID, streamURL, data).Scan(&id)
		return id, err
	}
	// A verified alias must never rebind the persisted genuine owner or its URL.
	if owner != itemID {
		streamURL = nil
	}
	_, err = tx.Exec(ctx, `UPDATE stream_sources SET url=COALESCE($2,url),
 metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{jellyfin_source}',$3::jsonb,true) WHERE id=$1`, id, streamURL, data)
	return id, err
}

func normalizeSourcePath(raw string) string {
	return strings.ReplaceAll(strings.TrimSpace(raw), "\\", "/")
}
func sameJellyfinSourceBinding(stored, next models.JellyfinSourceSnapshot) bool {
	if stored.MediaSourceID != next.MediaSourceID {
		return false
	}
	oldPath, newPath := normalizeSourcePath(stored.SourcePath), normalizeSourcePath(next.SourcePath)
	return oldPath == newPath
}
